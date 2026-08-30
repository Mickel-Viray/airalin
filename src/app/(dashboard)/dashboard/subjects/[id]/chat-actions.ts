'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateEmbedding } from '@/lib/rag'

export async function createConversation(subjectId: string, moduleId?: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  let title = 'General Subject Chat'
  if (moduleId) {
    const { data: mod } = await supabase
      .from('modules')
      .select('file_name')
      .eq('id', moduleId)
      .single()
    if (mod) title = `Chat: ${mod.file_name}`
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      subject_id: subjectId,
      module_id: moduleId || null,
      title
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, conversationId: data.id }
}

export async function deleteConversation(conversationId: string, subjectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/subjects/${subjectId}/chat`)
  return { success: true }
}

export async function sendChatMessage(
  conversationId: string,
  subjectId: string,
  userMessage: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 1. Verify conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*, subjects(title)')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (convErr || !conv) return { error: 'Conversation not found.' }

    // 2. RAG Retrieval via Vector Search
    const queryVector = await generateEmbedding(userMessage.trim())

    const { data: matchedChunks } = await supabase.rpc(
      'match_document_chunks',
      {
        query_embedding: queryVector,
        match_threshold: 0.15,
        match_count: 5,
        filter_user_id: user.id,
        filter_subject_id: subjectId,
        filter_module_id: conv.module_id || null,
      }
    )

    let contextText = ''
    let sourceList: { document_name: string; chunk_index: number }[] = []

    if (matchedChunks && matchedChunks.length > 0) {
      contextText = matchedChunks
        .map((c: any) => `[Source: ${c.document_name} | Section ${c.chunk_index}]\n${c.content}`)
        .join('\n\n---\n\n')

      // Extract unique sources actually used
      const uniqueMap = new Map<string, { document_name: string; chunk_index: number }>()
      for (const chunk of matchedChunks) {
        const key = `${chunk.document_name}-${chunk.chunk_index}`
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            document_name: chunk.document_name,
            chunk_index: chunk.chunk_index
          })
        }
      }
      sourceList = Array.from(uniqueMap.values())
    } else {
      // Fallback if vector scores are low
      const { data: fallbackMods } = await supabase
        .from('modules')
        .select('file_name, ai_review')
        .eq('subject_id', subjectId)
        .not('ai_review', 'is', null)

      if (fallbackMods && fallbackMods.length > 0) {
        contextText = fallbackMods
          .map(m => `[Document: ${m.file_name}]\n${m.ai_review}`)
          .join('\n\n---\n\n')

        sourceList = fallbackMods.map(m => ({
          document_name: m.file_name,
          chunk_index: 1
        }))
      }
    }

    // 3. Save User Message
    const { error: userMsgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'user',
        content: userMessage.trim()
      })

    if (userMsgErr) throw userMsgErr

    // 4. Fetch recent conversation history
    const { data: history } = await supabase
      .from('messages')
      .select('sender, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10)

    const formattedHistory = (history || [])
      .map(m => `${m.sender === 'user' ? 'Student' : 'AI Tutor'}: ${m.content}`)
      .join('\n')

    // 5. Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const systemPrompt = `
      You are an expert, supportive AI Study Tutor helping a student understand their coursework.

      CORE INSTRUCTIONS:
      1. Prioritize information from the "Uploaded Course Knowledge" context below. If the student's question relates to these materials, base your primary explanation on those facts, terms, and findings.
      2. If the question asks for broader concepts, examples, analogies, or foundational theory related to the topic, explain them accurately and clearly using academic standards.
      3. Do NOT make false claims about what is written in the student's uploaded document. If an explanation comes from general academic knowledge rather than directly from their file, clarify naturally.
      4. Format responses cleanly using bold terms, numbered steps, or bullet points.

      Uploaded Course Knowledge Context:
      ${contextText || '(No specific module text provided)'}

      Recent Conversation:
      ${formattedHistory}

      Student: ${userMessage}
      AI Tutor:
    `

    const result = await model.generateContent(systemPrompt)
    const aiReply = result.response.text()

    // 6. Save AI Message with authenticated sources
    const { error: aiMsgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'assistant',
        content: aiReply,
        sources: sourceList
      })

    if (aiMsgErr) throw aiMsgErr

    // Auto-update conversation title if it's the first exchange
    if (conv.title === 'New Conversation' || conv.title === 'General Subject Chat') {
      const summaryTitle = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '')
      await supabase
        .from('conversations')
        .update({ title: summaryTitle })
        .eq('id', conversationId)
    }

    revalidatePath(`/dashboard/subjects/${subjectId}/chat/${conversationId}`)
    return { success: true, reply: aiReply, sources: sourceList }
  } catch (err: any) {
    console.error('Chat error:', err)
    return { error: err.message || 'Failed to generate response' }
  }
}