import Link from 'next/link'
import { ArrowLeft, Award, BarChart3, CheckCircle2, Flame, Target, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

type SubjectStat = {
  subjectId: string
  title: string
  attemptsCount: number
  totalScore: number
  bestScore: number
}

type FlattenedAttempt = {
  id: string
  score_percentage: number
  total_questions: number
  correct_answers: number
  created_at: string
  quizId: string
  quizTitle: string
  difficulty: string
  subjectId: string
  subjectTitle: string
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Fetch all subjects belonging to the user
  const { data: rawSubjects } = await supabase
    .from('subjects')
    .select('id, title')
    .eq('user_id', user.id)

  // 2. Fetch all user quizzes (where total_questions lives) along with attempts and subject relation
  const { data: rawQuizzes, error: quizErr } = await supabase
    .from('quizzes')
    .select(`
      id,
      title,
      difficulty,
      total_questions,
      subject_id,
      subjects (
        id,
        title
      ),
      quiz_attempts (
        id,
        score_percentage,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (quizErr) {
    console.error('Error fetching quiz analytics:', quizErr)
  }

  // 3. Extract and flatten all quiz attempts
  const attempts: FlattenedAttempt[] = []
  const quizzes = rawQuizzes || []

  quizzes.forEach((q: any) => {
    const subTitle = q.subjects?.title || 'General Subject'
    const totalQ = Number(q.total_questions) || 0
    const attList = q.quiz_attempts || []

    attList.forEach((att: any) => {
      const scorePct = Number(att.score_percentage) || 0
      const correctCount = Math.round((scorePct / 100) * totalQ)

      attempts.push({
        id: att.id,
        score_percentage: scorePct,
        total_questions: totalQ,
        correct_answers: correctCount,
        created_at: att.created_at,
        quizId: q.id,
        quizTitle: q.title,
        difficulty: q.difficulty,
        subjectId: q.subject_id,
        subjectTitle: subTitle,
      })
    })
  })

  // Sort newest attempts first
  attempts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // KPI Calculations
  const totalAttempts = attempts.length
  const totalQuestionsAnswered = attempts.reduce((acc, curr) => acc + curr.total_questions, 0)
  const totalCorrectAnswers = attempts.reduce((acc, curr) => acc + curr.correct_answers, 0)
  const averageScore = totalAttempts > 0
    ? Math.round(attempts.reduce((acc, curr) => acc + curr.score_percentage, 0) / totalAttempts)
    : 0
  const highestScore = totalAttempts > 0
    ? Math.max(...attempts.map(a => a.score_percentage))
    : 0

  // 4. Map Subject Mastery Breakdown
  const subjects = rawSubjects || []
  const subjectStats: SubjectStat[] = subjects.map((sub) => {
    const subAttempts = attempts.filter((a) => a.subjectId === sub.id)
    const count = subAttempts.length
    const totalScore = subAttempts.reduce((acc, curr) => acc + curr.score_percentage, 0)
    const best = count > 0 ? Math.max(...subAttempts.map((a) => a.score_percentage)) : 0

    return {
      subjectId: sub.id,
      title: sub.title,
      attemptsCount: count,
      totalScore: totalScore,
      bestScore: best,
    }
  })

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Navigation & Header */}
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-slate-900 flex items-center w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Learning Analytics</h1>
            <p className="text-slate-500 mt-1">Track your practice test performance, mastery trends, and review history.</p>
          </div>
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Score</p>
            <p className="text-2xl font-bold text-slate-900">{averageScore}%</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Highest Score</p>
            <p className="text-2xl font-bold text-slate-900">{highestScore}%</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Quizzes Completed</p>
            <p className="text-2xl font-bold text-slate-900">{totalAttempts}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Correct Answers</p>
            <p className="text-2xl font-bold text-slate-900">
              {totalCorrectAnswers} <span className="text-sm font-normal text-slate-400">/ {totalQuestionsAnswered}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Subject Performance Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Performance by Subject
        </h2>

        {subjectStats.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-sm">
            No subjects created yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjectStats.map((sub) => {
              const subAvg = sub.attemptsCount > 0 ? Math.round(sub.totalScore / sub.attemptsCount) : 0
              return (
                <div key={sub.subjectId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 truncate">{sub.title}</h3>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {sub.attemptsCount} {sub.attemptsCount === 1 ? 'Attempt' : 'Attempts'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500">Subject Mastery</span>
                      <span className={subAvg >= 80 ? 'text-emerald-600 font-bold' : subAvg >= 60 ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                        {sub.attemptsCount > 0 ? `${subAvg}%` : 'Not tested'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          subAvg >= 80 ? 'bg-emerald-500' : subAvg >= 60 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${sub.attemptsCount > 0 ? subAvg : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between text-xs text-slate-500">
                    <span>Best Score: <strong className="text-slate-800">{sub.attemptsCount > 0 ? `${sub.bestScore}%` : 'N/A'}</strong></span>
                    <Link href={`/dashboard/subjects/${sub.subjectId}`} className="text-blue-600 hover:underline font-medium">
                      View Subject →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Quiz Activity Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-500" />
          Recent Quiz Attempts
        </h2>

        {attempts.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-sm">
            No quiz attempts recorded yet. Generate and complete a quiz to see your test logs.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Quiz / Subject</th>
                    <th className="px-6 py-3.5">Difficulty</th>
                    <th className="px-6 py-3.5">Questions</th>
                    <th className="px-6 py-3.5">Score</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempts.map((att) => {
                    const score = att.score_percentage
                    const isPassed = score >= 70

                    return (
                      <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{att.quizTitle}</div>
                          <div className="text-xs text-slate-500">{att.subjectTitle}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {att.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {att.correct_answers} / {att.total_questions}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {score}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(att.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/dashboard/subjects/${att.subjectId}/quiz/${att.quizId}`}>
                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs">
                              Retake
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}