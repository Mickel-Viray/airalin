import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getQuizAttemptResults } from '@/app/(dashboard)/dashboard/subjects/[id]/quiz-submit-actions'
import { ExportQuizButton } from '@/components/export-quiz-button'

export default async function QuizResultReviewPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string; attemptId: string }> | { id: string; quizId: string; attemptId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id: subjectId, quizId, attemptId } = await params

  // 1. Fetch Attempt breakdown
  const detailed = await getQuizAttemptResults(attemptId)
  if (detailed.error || !detailed.attempt) notFound()

  const { attempt, answers: detailedAnswers } = detailed
  const score = Number(attempt.score_percentage)
  const passed = score >= 70

  // 2. Fetch Quiz Title
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('title, difficulty')
    .eq('id', quizId)
    .single()

  const parsedQuestions = (detailedAnswers || []).map((item: any) => {
    const q = item.quiz_questions || {}
    return {
      id: q.id || item.id,
      question_text: q.question_text || '',
      options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []),
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
    }
  })

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-16">
      <div className="flex items-center justify-between border-b pb-4 print:hidden">
      <Link
        href={`/dashboard/subjects/${subjectId}`}
        className="text-sm text-slate-500 hover:text-slate-900 flex items-center w-fit"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Subject
      </Link>
      <ExportQuizButton
          quizTitle={quiz?.title || 'Quiz'}
          subjectTitle={(quiz as any)?.subjects?.title || 'Subject'}
          difficulty={quiz?.difficulty || 'Medium'}
          questions={parsedQuestions}
        />
      </div>
      {/* Score Header Card */}
      <div className={`p-8 rounded-2xl border text-center ${
        passed ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
      }`}>
        <div className="inline-flex p-3 rounded-full mb-3 bg-white shadow-sm">
          {passed ? (
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          ) : (
            <XCircle className="h-10 w-10 text-rose-600" />
          )}
        </div>
        <h2 className="text-3xl font-bold text-slate-900">{quiz?.title || 'Quiz Review'}</h2>
        <p className="text-sm text-slate-600 mt-1">Difficulty: {quiz?.difficulty || 'N/A'}</p>

        <div className="mt-6 flex items-center justify-center gap-8">
          <div>
            <div className="text-4xl font-extrabold text-slate-900">{score}%</div>
            <div className="text-xs uppercase font-medium text-slate-500 mt-1">Final Score</div>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <div className="text-4xl font-extrabold text-emerald-600">{attempt.total_correct ?? '-'}</div>
            <div className="text-xs uppercase font-medium text-slate-500 mt-1">Correct</div>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <div className="text-4xl font-extrabold text-rose-600">{attempt.total_incorrect ?? '-'}</div>
            <div className="text-xs uppercase font-medium text-slate-500 mt-1">Incorrect</div>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/dashboard/subjects/${subjectId}/quiz/${quizId}`}>
            <Button variant="outline" size="sm" className="bg-white">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retake Quiz
            </Button>
          </Link>
        </div>
      </div>

      {/* Answers & Explanations Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Answer Breakdown & Explanations</h3>

        {detailedAnswers?.map((item: any, idx: number) => {
          const q = item.quiz_questions || item
          const isCorrect = item.is_correct

          return (
            <div
              key={item.id || idx}
              className={`p-6 rounded-2xl border bg-white shadow-sm space-y-3 ${
                isCorrect ? 'border-emerald-200' : 'border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-500">Question {idx + 1}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isCorrect ? 'Correct' : 'Needs Review'}
                </span>
              </div>

              <p className="text-sm font-medium text-slate-900">{q.question_text}</p>

              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 w-24 shrink-0">Your Answer:</span>
                  <span className={`font-semibold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {item.user_answer || '(No answer provided)'}
                  </span>
                </div>
                {!isCorrect && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-24 shrink-0">Correct Answer:</span>
                    <span className="font-bold text-emerald-700">{q.correct_answer}</span>
                  </div>
                )}
              </div>

              {q.explanation && (
                <div className="border-t pt-2.5 text-xs text-slate-600">
                  <span className="font-bold text-slate-900">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}