'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function submitQuizAttempt(quizId: string, answers: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Fetch all questions and correct answers for this quiz
  const { data: questions, error: qError } = await supabase
    .from('quiz_questions')
    .select('id, correct_answer')
    .eq('quiz_id', quizId)

  if (qError || !questions) return { error: 'Failed to evaluate quiz.' }

  let totalCorrect = 0
  const answerInserts = []

  // 2. Evaluate each answer securely on the server (preventing cheating via client inspection)
  for (const q of questions) {
    const studentAnswer = answers[q.id] || ''
    // Clean comparison (ignoring case or whitespace variations)
    const isCorrect = studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
    
    if (isCorrect) totalCorrect++

    answerInserts.push({
      question_id: q.id,
      user_answer: studentAnswer,
      is_correct: isCorrect
    })
  }

  const totalQuestions = questions.length
  const scorePercentage = Number(((totalCorrect / totalQuestions) * 100).toFixed(2))
  const totalIncorrect = totalQuestions - totalCorrect

  // 3. Create the Quiz Attempt record
  const { data: attemptData, error: attemptError } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      score_percentage: scorePercentage,
      total_correct: totalCorrect,
      total_incorrect: totalIncorrect,
      completed_at: new Date().toISOString()
    })
    .select()
    .single()

  if (attemptError) return { error: attemptError.message }

  // 4. Link individual answers to this attempt
  const finalAnswerInserts = answerInserts.map(a => ({
    attempt_id: attemptData.id,
    ...a
  }))

  const { error: ansInsertError } = await supabase
    .from('quiz_answers')
    .insert(finalAnswerInserts)

  if (ansInsertError) return { error: ansInsertError.message }

  revalidatePath(`/dashboard/subjects`)
  return { success: true, attemptId: attemptData.id }
}

export async function getQuizAttemptResults(attemptId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Fetch attempt record
  const { data: attempt, error: attemptErr } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes(title, difficulty, total_questions)')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .single()

  if (attemptErr || !attempt) return { error: 'Attempt not found.' }

  // Fetch user answers joined with questions & explanations
  const { data: answers, error: ansErr } = await supabase
    .from('quiz_answers')
    .select(`
      id,
      user_answer,
      is_correct,
      quiz_questions (
        id,
        question_text,
        question_type,
        options,
        correct_answer,
        explanation
      )
    `)
    .eq('attempt_id', attemptId)

  if (ansErr || !answers) return { error: 'Failed to fetch detailed results.' }

  return { success: true, attempt, answers }
}