'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export type StudyPlanItem = {
  day_number: number
  date_label: string
  topic: string
  activity: string
  duration_minutes: number
  review_material: string
  module_id?: string | null
  practice_quiz: string
  completed: boolean
}


export async function generateStudyPlan(formData: {
  subjectId: string
  examDate: string
  dailyTimeMinutes: number
  knowledgeLevel: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { subjectId, examDate, dailyTimeMinutes, knowledgeLevel } = formData

    // 1. Fetch Subject Info
    const { data: subject, error: subErr } = await supabase
      .from('subjects')
      .select('id, title, description')
      .eq('id', subjectId)
      .single()

    if (subErr || !subject) return { error: 'Subject not found.' }

    // 2. Fetch Available Modules
    const { data: modules } = await supabase
      .from('modules')
      .select('id, file_name, ai_review')
      .eq('subject_id', subjectId)

    // 3. Fetch Historical Quiz Performance to identify weak topics
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        difficulty,
        quiz_attempts (
          score_percentage,
          created_at
        )
      `)
      .eq('subject_id', subjectId)
      .eq('user_id', user.id)

    // Extract weak topics where recent score < 75%
    const weakTopics: string[] = []
    ;(quizzes || []).forEach((q: any) => {
      const attempts = q.quiz_attempts || []
      if (attempts.length > 0) {
        const latest = attempts[attempts.length - 1]
        if (latest.score_percentage < 75) {
          weakTopics.push(`Quiz: "${q.title}" (Last Score: ${latest.score_percentage}%)`)
        }
      }
    })

    // 4. Calculate total days available until exam
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(examDate)
    targetDate.setHours(0, 0, 0, 0)

    const diffTime = targetDate.getTime() - today.getTime()
    const daysUntilExam = Math.max(1, Math.min(30, Math.ceil(diffTime / (1000 * 60 * 60 * 24))))

    // 5. Compile Module Context summary
    const moduleContextList = (modules || []).map(m => `ID: "${m.id}", Name: "${m.file_name}"`).join('\n')

    // 6. Generate Plan using Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const prompt = `
      You are an expert academic curriculum designer. Create a customized ${daysUntilExam}-day study plan leading up to an exam for the subject "${subject.title}".

      STUDENT PROFILE:
      - Subject: ${subject.title}
      - Target Exam Date: ${examDate} (${daysUntilExam} study days allocated)
      - Available Daily Time: ${dailyTimeMinutes} minutes per day
      - Current Knowledge Level: ${knowledgeLevel}
      - Available Uploaded Modules: ${moduleContextList}
      - Detected Weak Topics / Needs Review: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'None detected yet. Distribute focus evenly.'}

      STRICT JSON OUTPUT REQUIREMENT:
      Return ONLY a raw JSON array matching this exact schema for all ${daysUntilExam} days:
      [
        {
          "day_number": 1,
          "date_label": "Day 1",
          "topic": "Core topic name",
          "activity": "Specific recommended study activity",
          "duration_minutes": ${dailyTimeMinutes},
          "review_material": "Name of relevant module",
          "module_id": "${modules && modules.length > 0 ? modules[0].id : ''}",
          "practice_quiz": "Recommended quiz focus",
          "completed": false
        }
      ]
    `

    const result = await model.generateContent(prompt)
    let rawText = result.response.text().trim()

    // Clean markdown code fence if present
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const planItems: StudyPlanItem[] = JSON.parse(rawText)

    // 7. Archive any existing active plans for this subject
    await supabase
      .from('study_plans')
      .update({ status: 'archived' })
      .eq('user_id', user.id)
      .eq('subject_id', subjectId)
      .eq('status', 'active')

    // 8. Insert new active plan
    const { data: newPlan, error: insertErr } = await supabase
      .from('study_plans')
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        exam_date: examDate,
        daily_time_minutes: dailyTimeMinutes,
        knowledge_level: knowledgeLevel,
        status: 'active',
        plan_data: planItems,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/study-plan')
    return { success: true, planId: newPlan.id }
  } catch (error: any) {
    console.error('Study Plan Error:', error)
    return { error: error.message || 'Failed to generate study plan' }
  }
}

export async function togglePlanItemCompleted(planId: string, dayNumber: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: plan, error: fetchErr } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('id', planId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !plan) return { error: 'Study plan not found' }

  const items: StudyPlanItem[] = plan.plan_data || []
  const updatedItems = items.map(item => {
    if (item.day_number === dayNumber) {
      return { ...item, completed: !item.completed }
    }
    return item
  })

  const { error: updateErr } = await supabase
    .from('study_plans')
    .update({ plan_data: updatedItems })
    .eq('id', planId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/study-plan')
  return { success: true }
}

export async function deleteStudyPlan(planId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('study_plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/study-plan')
  return { success: true }
}