'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Loader2, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { submitQuizAttempt, getQuizAttemptResults } from '@/app/(dashboard)/dashboard/subjects/[id]/quiz-submit-actions'

type QuestionItem = {
  id: string
  question_text: string
  question_type: string
  options: string[] | null
}

export function QuizRunner({
  quizId,
  subjectId,
  quizTitle,
  difficulty,
  questions
}: {
  quizId: string
  subjectId: string
  quizTitle: string
  difficulty: string
  questions: QuestionItem[]
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [resultsData, setResultsData] = useState<any | null>(null)

  const currentQ = questions[currentIndex]
  const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim().length > 0).length
  const progressPercent = Math.round((answeredCount / questions.length) * 100)

  function handleSelectOption(option: string) {
    setAnswers(prev => ({ ...prev, [currentQ.id]: option }))
  }

  function handleIdentificationInput(val: string) {
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }))
  }

  async function handleFinalSubmit() {
    setIsSubmitting(true)
    setShowConfirm(false)
    const toastId = toast.loading("Evaluating your answers...")

    const res = await submitQuizAttempt(quizId, answers)
    if (res.error) {
      toast.error(`Submission failed: ${res.error}`, { id: toastId })
      setIsSubmitting(false)
      return
    }

    // Retrieve scored result with full explanations
    const detailed = await getQuizAttemptResults(res.attemptId!)
    if (detailed.error || !detailed.attempt) {
      toast.error("Failed to load results breakdown", { id: toastId })
    } else {
      toast.success("Quiz evaluated!", { id: toastId })
      setResultsData(detailed)
    }

    setIsSubmitting(false)
  }

  // --- RESULTS VIEW ---
  if (resultsData) {
    const { attempt, answers: detailedAnswers } = resultsData
    const score = Number(attempt.score_percentage)
    const passed = score >= 70

    return (
      <div className="space-y-8 max-w-3xl mx-auto pb-16">
        <Link 
          href={`/dashboard/subjects/${subjectId}`}
          className="text-sm text-slate-500 hover:text-slate-900 flex items-center w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Subject
        </Link>

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
          <h2 className="text-3xl font-bold text-slate-900">{quizTitle}</h2>
          <p className="text-sm text-slate-600 mt-1">Difficulty: {difficulty}</p>

          <div className="mt-6 flex items-center justify-center gap-8">
            <div>
              <div className="text-4xl font-extrabold text-slate-900">{score}%</div>
              <div className="text-xs uppercase font-medium text-slate-500 mt-1">Final Score</div>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div>
              <div className="text-4xl font-extrabold text-emerald-600">{attempt.total_correct}</div>
              <div className="text-xs uppercase font-medium text-slate-500 mt-1">Correct</div>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div>
              <div className="text-4xl font-extrabold text-rose-600">{attempt.total_incorrect}</div>
              <div className="text-xs uppercase font-medium text-slate-500 mt-1">Incorrect</div>
            </div>
          </div>
        </div>

        {/* Detailed Questions & Explanations Breakdown */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Review & Explanations</h3>

          {detailedAnswers.map((item: any, idx: number) => {
            const q = item.quiz_questions
            const isCorrect = item.is_correct

            return (
              <div 
                key={item.id} 
                className={`p-6 rounded-xl border bg-white shadow-sm space-y-4 ${
                  isCorrect ? 'border-emerald-200' : 'border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Question {idx + 1}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isCorrect ? 'Correct' : 'Needs Review'}
                    </span>
                  </div>
                </div>

                <p className="text-base text-slate-800 font-medium">{q.question_text}</p>

                <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-28 shrink-0">Your Answer:</span>
                    <span className={`font-medium ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {item.user_answer || '(No answer provided)'}
                    </span>
                  </div>

                  {!isCorrect && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-28 shrink-0">Correct Answer:</span>
                      <span className="font-semibold text-emerald-700">{q.correct_answer}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Explanation: </span>
                  {q.explanation}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-center pt-4">
          <Link href={`/dashboard/subjects/${subjectId}`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Return to Subject
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // --- EXAM RUNNER VIEW ---
  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{quizTitle}</h2>
          <p className="text-sm text-slate-500">Difficulty: {difficulty}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-700">
            {answeredCount} of {questions.length} answered
          </div>
          <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-blue-600 h-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Question Navigation Palette */}
      <div className="flex flex-wrap gap-2 pt-2">
        {questions.map((q, idx) => {
          const isAnswered = !!answers[q.id]?.trim()
          const isCurrent = idx === currentIndex
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-9 w-9 text-xs font-semibold rounded-lg border transition-all ${
                isCurrent 
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm' 
                  : isAnswered 
                    ? 'border-slate-300 bg-slate-100 text-slate-800' 
                    : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
              }`}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>

      {/* Active Question Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6 mt-4">
        <div className="flex items-center justify-between text-xs uppercase font-semibold text-slate-400 tracking-wider">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className="capitalize">{currentQ.question_type.replace('_', ' ')}</span>
        </div>

        <p className="text-xl font-medium text-slate-900 leading-relaxed">
          {currentQ.question_text}
        </p>

        {/* Options / Input based on question type */}
        {currentQ.options && currentQ.options.length > 0 ? (
          <div className="space-y-3 pt-2">
            {currentQ.options.map((opt, oIdx) => {
              const selected = answers[currentQ.id] === opt
              return (
                <div
                  key={oIdx}
                  onClick={() => handleSelectOption(opt)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    selected
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                    selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                  }`}>
                    {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <span>{opt}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="pt-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Type your exact answer:
            </label>
            <input
              type="text"
              value={answers[currentQ.id] || ''}
              onChange={e => handleIdentificationInput(e.target.value)}
              placeholder="Enter identification answer..."
              className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
            />
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {currentIndex < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => setShowConfirm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Quiz
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal before Submit */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <h3 className="text-lg font-bold">Submit Your Quiz?</h3>
            </div>
            
            <p className="text-sm text-slate-600">
              You have answered <span className="font-semibold text-slate-900">{answeredCount}</span> of{' '}
              <span className="font-semibold text-slate-900">{questions.length}</span> questions. 
              {answeredCount < questions.length && ' Unanswered questions will be marked incorrect.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
                Review Answers
              </Button>
              <Button onClick={handleFinalSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isSubmitting ? 'Evaluating...' : 'Confirm & Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}