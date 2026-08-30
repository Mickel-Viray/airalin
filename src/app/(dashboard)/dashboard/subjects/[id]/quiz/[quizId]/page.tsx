import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { QuizRunner } from '@/components/quiz-runner'
import { ExportQuizButton } from '@/components/export-quiz-button'

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }> | { id: string; quizId: string }
}) {
  const supabase = await createClient()
  const resolvedParams = await params
  const { id, quizId } = resolvedParams

  // 1. Verify User Session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Fetch Subject
  const { data: subject } = await supabase
    .from('subjects')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!subject) notFound()

  // 3. Fetch Quiz with Questions
  const { data: quiz } = await supabase
    .from('quizzes')
    .select(`
      id,
      title,
      difficulty,
      total_questions,
      quiz_questions (
        id,
        question_text,
        question_type,
        options,
        correct_answer,
        explanation
      )
    `)
    .eq('id', quizId)
    .eq('subject_id', id)
    .eq('user_id', user.id)
    .single()

  if (!quiz) notFound()

  // 4. Parse Questions safely
  const rawQuestions = (quiz.quiz_questions as any) || []
  const parsedQuestions = rawQuestions.map((q: any) => ({
    id: q.id,
    question_text: q.question_text,
    question_type: q.question_type || (q.options ? 'multiple_choice' : 'identification'),
    options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || null),
    correct_answer: q.correct_answer || '',
    explanation: q.explanation || '',
  }))

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 print:p-0 print:m-0 print:max-w-none">
      {/* Top Header Actions - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <Link
          href={`/dashboard/subjects/${id}`}
          className="text-sm text-slate-500 hover:text-slate-900 flex items-center w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Subject
        </Link>
      </div>

      {/* Interactive Quiz Runner */}
      <div className="print:hidden">
        <QuizRunner
          quizId={quiz.id}
          subjectId={id}
          quizTitle={quiz.title}
          difficulty={quiz.difficulty}
          questions={parsedQuestions}
        />
      </div>

      {/* Printable Exam Sheet (Visible only when printing or saving as PDF) */}
      <div className="hidden print:block space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
          <p className="text-sm text-slate-600 mt-1">
            Course: {subject.title} • Difficulty: {quiz.difficulty} • Total Questions: {parsedQuestions.length}
          </p>
        </div>

        <div className="space-y-6">
          {parsedQuestions.map((q: any, idx: number) => (
            <div key={q.id} className="space-y-2">
              <p className="font-semibold text-sm text-slate-900">
                {idx + 1}. {q.question_text}
              </p>
              {q.options && q.options.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 pl-4 text-xs text-slate-700">
                  {q.options.map((opt: string, oIdx: number) => (
                    <div key={oIdx} className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border border-slate-400 rounded-sm inline-block shrink-0" />
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pl-4 pt-1">
                  <div className="h-8 border-b border-dashed border-slate-300 w-3/4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}