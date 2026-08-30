'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { chunkText, generateEmbedding } from '@/lib/rag'

export async function generateAIReviewer(moduleId: string, subjectId: string, filePath: string) {
  try {
    const supabase = await createClient()

    // 0. Verify authenticated session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized: Authentication required.')

    // 1. Authorization: Verify the subject belongs to the user
    const { data: subject, error: subErr } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('user_id', user.id)
      .single()

    if (subErr || !subject) {
      throw new Error('Unauthorized: Subject does not belong to you.')
    }

    // 2. Authorization: Verify module belongs to this user-owned subject
    const { data: moduleData, error: modErr } = await supabase
      .from('modules')
      .select('file_name, file_path, subject_id')
      .eq('id', moduleId)
      .eq('subject_id', subjectId)
      .single()

    if (modErr || !moduleData) {
      throw new Error('Unauthorized: Module record not found or inaccessible.')
    }

    // 3. Prevent path traversal or unauthorized file path access
    const expectedPath = moduleData.file_path
    if (filePath !== expectedPath) {
      throw new Error('Security Error: Invalid file path specified.')
    }

    // 4. Download the PDF file securely from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('modules')
      .download(expectedPath)

    if (downloadError || !fileData) throw new Error('Failed to retrieve PDF file.')

    // 5. Package and send to Gemini
    const arrayBuffer = await fileData.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const pdfPart = {
      inlineData: {
        data: base64Data,
        mimeType: 'application/pdf',
      },
    }

    const prompt = `
      You are an expert academic tutor. I will provide you with a college module document. 
      Please create a comprehensive study reviewer based ONLY on this document.
      
      STRICT FORMATTING RULES:
      1. Use clean Markdown (headings, bold text, bullet points).
      2. DO NOT use ASCII art, text-based diagrams, or code blocks for diagrams. Convert all frameworks or processes into standard numbered lists.
      3. Use Markdown tables for comparing metrics, criteria, or definitions.
      4. Include a "Practice Questions" section at the end. For multiple-choice questions, you MUST place each option (A, B, C, D) on a completely new line using a bullet point.

      Format the output beautifully for a student studying for an exam.
    `

    const result = await model.generateContent([prompt, pdfPart])
    const aiReview = result.response.text()

    // 6. Save reviewer to module record
    const { error: updateError } = await supabase
      .from('modules')
      .update({ ai_review: aiReview })
      .eq('id', moduleId)
      .eq('subject_id', subjectId)

    if (updateError) throw updateError

    // 7. RAG Pipeline: Clear existing chunks for this module and index new ones
    await supabase.from('document_chunks').delete().eq('module_id', moduleId).eq('user_id', user.id)

    const chunks = chunkText(`Document Title: ${moduleData.file_name}\n\n${aiReview}`)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await generateEmbedding(chunk)

      await supabase.from('document_chunks').insert({
        user_id: user.id,
        subject_id: subjectId,
        module_id: moduleId,
        document_name: moduleData.file_name,
        chunk_index: i + 1,
        content: chunk,
        embedding: embedding,
      })
    }

    revalidatePath(`/dashboard/subjects/${subjectId}`)
    return { success: true }
  } catch (error: any) {
    console.error('AI Generation Error:', error)
    return { error: error.message || 'Failed to generate review' }
  }
}