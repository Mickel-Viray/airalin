'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateFlashcards(moduleId: string, subjectId: string) {
  try {
    const supabase = await createClient()

    // 1. Fetch the existing AI review from the database
    const { data: module, error: fetchError } = await supabase
      .from('modules')
      .select('ai_review')
      .eq('id', moduleId)
      .single()

    if (fetchError || !module?.ai_review) throw new Error('Could not find study guide to create flashcards from.')

    // 2. Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const aiModel = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    // 3. Prompt Gemini to output strict JSON based on the study guide
    const prompt = `
      You are an expert academic tutor. Based on the following study guide, create exactly 10 highly effective flashcards.
      Return ONLY a raw JSON array of objects. Do not include markdown blocks like \`\`\`json.
      Each object must have a "front" property (the question or term) and a "back" property (the answer or definition).
      
      Study Guide:
      ${module.ai_review}
    `
    
    const result = await aiModel.generateContent(prompt)
    let jsonText = result.response.text()
    
    // Clean up the response just in case Gemini includes markdown formatting
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim()
    const flashcardsArray = JSON.parse(jsonText)

    // 4. Save the JSON array to our database
    const { error: updateError } = await supabase
      .from('modules')
      .update({ flashcards: flashcardsArray })
      .eq('id', moduleId)

    if (updateError) throw updateError

    revalidatePath(`/dashboard/subjects/${subjectId}/review/${moduleId}`)
    return { success: true }

  } catch (error: any) {
    console.error("Flashcard Generation Error:", error)
    return { error: error.message || 'Failed to generate flashcards' }
  }
}