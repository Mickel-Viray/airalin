'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateQuiz({
  subjectId,
  moduleIds,
  title,
  difficulty,
  numQuestions,
  questionType
}: {
  subjectId: string
  moduleIds: string[]
  title: string
  difficulty: string
  numQuestions: number
  questionType: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 1. Fetch text content from the selected modules
    const { data: modules, error: modError } = await supabase
      .from('modules')
      .select('file_name, ai_review, file_path')
      .in('id', moduleIds)

    if (modError || !modules || modules.length === 0) {
      throw new Error('Failed to fetch source materials for the quiz.')
    }

    // Combine the AI reviews of the selected modules as our source text
    const combinedSourceText = modules
      .map((m) => `Document: ${m.file_name}\n\n${m.ai_review}`)
      .join('\n\n--- NEXT DOCUMENT ---\n\n')

    // 2. Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    // 3. Craft a precise prompt forcing strict JSON output
    const prompt = `
      You are an expert academic professor. Based strictly on the provided study materials, generate an exam quiz.
      
      Parameters:
      - Number of questions: ${numQuestions}
      - Difficulty: ${difficulty}
      - Question type: ${questionType} (Options: multiple_choice, true_false, identification)
      
      CRITICAL INSTRUCTIONS:
      1. Return ONLY a raw JSON array. Do not wrap it in markdown code blocks like \`\`\`json.
      2. Each object in the array must have these exact properties:
         - "question_text" (string): The question.
         - "question_type" (string): "${questionType}"
         - "options" (array of strings, optional): If multiple_choice, provide 4 choices (e.g., ["A) ...", "B) ...", "C) ...", "D) ..."]). If true_false, provide ["True", "False"]. If identification, set to null.
         - "correct_answer" (string): The exact correct answer string matching one of the options or the correct text.
         - "explanation" (string): A short, clear explanation of why this answer is correct based on the source text.
      
      Source Materials:
      ${combinedSourceText.substring(0, 100000)}
    `

    const result = await model.generateContent(prompt)
    let jsonText = result.response.text()
    
    // Clean up markdown wrappers if Gemini includes them
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim()
    const questionsArray = JSON.parse(jsonText)

    // 4. Insert the main Quiz record into Supabase
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        target_modules: moduleIds,
        title,
        difficulty,
        total_questions: questionsArray.length
      })
      .select()
      .single()

    if (quizError) throw quizError

    // 5. Insert all generated questions linked to this quiz
    const questionInserts = questionsArray.map((q: any) => ({
      quiz_id: quizData.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options || null,
      correct_answer: q.correct_answer,
      explanation: q.explanation
    }))

    const { error: qInsertError } = await supabase
      .from('quiz_questions')
      .insert(questionInserts)

    if (qInsertError) throw qInsertError

    revalidatePath(`/dashboard/subjects/${subjectId}`)
    return { success: true, quizId: quizData.id }

  } catch (err: any) {
    console.error('Quiz Generation Error:', err)

    if (err?.message?.includes('429') || err?.message?.includes('quota')) {
      return { error: 'AI request limit reached. Please wait a moment or check your API quota.' }
    }

    return { error: err.message || 'Failed to generate quiz' }
  }
}