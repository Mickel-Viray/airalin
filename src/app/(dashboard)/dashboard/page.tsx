import Link from 'next/link'
import {
  BookOpen,
  FileText,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Target,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  Brain,
  Layers,
  HelpCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreateSubjectDialog } from '@/components/create-subject-dialog'

type SubjectWithModules = {
  id: string
  title: string
  description: string | null
  created_at: string
  modules: { id: string; file_name: string; ai_review: string | null }[]
}

type QuizWithAttempts = {
  id: string
  title: string
  difficulty: string
  total_questions: number
  subject_id: string
  subjects: { id: string; title: string } | null
  quiz_attempts: {
    id: string
    score_percentage: number
    created_at: string
  }[]
}

type FlattenedAttempt = {
  id: string
  quizId: string
  quizTitle: string
  subjectId: string
  subjectTitle: string
  difficulty: string
  score_percentage: number
  total_questions: number
  created_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Verify authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Fetch User Subjects with nested Modules
  const { data: rawSubjects } = await supabase
    .from('subjects')
    .select(`
      id,
      title,
      description,
      created_at,
      modules (
        id,
        file_name,
        ai_review
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const subjects: SubjectWithModules[] = (rawSubjects as any) || []

  // 3. Fetch User Quizzes with Attempts and Subject Relation
  const { data: rawQuizzes } = await supabase
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

  const quizzes: QuizWithAttempts[] = (rawQuizzes as any) || []

  // 4. Fetch Active Study Plan
  const { data: activePlan } = await supabase
    .from('study_plans')
    .select(`
      id,
      subject_id,
      exam_date,
      daily_time_minutes,
      knowledge_level,
      status,
      plan_data,
      subjects (
        id,
        title
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ==================== REAL DATA COMPUTATIONS ====================

  // Aggregate Modules count
  const totalModulesCount = subjects.reduce((sum, s) => sum + (s.modules?.length || 0), 0)

  // Flatten and sort all quiz attempts
  const allAttempts: FlattenedAttempt[] = []
  quizzes.forEach((q) => {
    const subTitle = q.subjects?.title || 'General'
    const attempts = q.quiz_attempts || []

    attempts.forEach((att) => {
      allAttempts.push({
        id: att.id,
        quizId: q.id,
        quizTitle: q.title,
        subjectId: q.subject_id,
        subjectTitle: subTitle,
        difficulty: q.difficulty,
        score_percentage: Number(att.score_percentage) || 0,
        total_questions: Number(q.total_questions) || 0,
        created_at: att.created_at,
      })
    })
  })

  allAttempts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Overall Quiz Average & KPI Stats
  const totalAttemptsCount = allAttempts.length
  const quizAverage =
    totalAttemptsCount > 0
      ? Math.round(allAttempts.reduce((sum, a) => sum + a.score_percentage, 0) / totalAttemptsCount)
      : 0

  // Strong Topics (latest quiz score >= 80%) & Weak Topics (latest quiz score < 75%)
  const strongTopics: { quizTitle: string; subjectTitle: string; score: number; quizId: string; subjectId: string }[] = []
  const weakTopics: { quizTitle: string; subjectTitle: string; score: number; quizId: string; subjectId: string }[] = []

  quizzes.forEach((q) => {
    const atts = q.quiz_attempts || []
    if (atts.length > 0) {
      // Sort to get the latest attempt
      const sorted = [...atts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const latestScore = Number(sorted[0].score_percentage) || 0
      const entry = {
        quizTitle: q.title,
        subjectTitle: q.subjects?.title || 'General',
        score: latestScore,
        quizId: q.id,
        subjectId: q.subject_id,
      }

      if (latestScore >= 80) {
        strongTopics.push(entry)
      } else if (latestScore < 75) {
        weakTopics.push(entry)
      }
    }
  })

  // Active Study Plan Metrics
  const planItems: any[] = activePlan?.plan_data || []
  const completedPlanItems = planItems.filter((i) => i.completed).length
  const totalPlanItems = planItems.length
  const planProgressPercent =
    totalPlanItems > 0 ? Math.round((completedPlanItems / totalPlanItems) * 100) : 0
  const nextPendingTask = planItems.find((i) => !i.completed)

  const daysUntilExam = activePlan
    ? Math.max(
        0,
        Math.ceil(
          (new Date(activePlan.exam_date).getTime() - new Date().setHours(0, 0, 0, 0)) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Learning Center</h1>
          <p className="text-slate-500 mt-1">
            Overview of your study materials, active roadmap, and mastery metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dashboard/study-plan">
            <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50">
              <Calendar className="h-4 w-4 mr-2 text-blue-600" />
              Study Planner
            </Button>
          </Link>
          <Link href="/dashboard/analytics">
            <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50">
              <BarChart3 className="h-4 w-4 mr-2 text-indigo-600" />
              Analytics
            </Button>
          </Link>
          <CreateSubjectDialog />
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Courses & Notes</p>
            <p className="text-2xl font-bold text-slate-900">
              {subjects.length} <span className="text-xs font-normal text-slate-400">({totalModulesCount} {totalModulesCount === 1 ? 'module' : 'modules'})</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Quiz Average</p>
            <p className="text-2xl font-bold text-slate-900">
              {totalAttemptsCount > 0 ? `${quizAverage}%` : 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tests Completed</p>
            <p className="text-2xl font-bold text-slate-900">{totalAttemptsCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Plan Progress</p>
            <p className="text-2xl font-bold text-slate-900">
              {activePlan ? `${planProgressPercent}%` : 'No Plan'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Study Plan Spotlight Banner */}
      {activePlan ? (
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white p-6 rounded-2xl border border-blue-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider">
                  Active Exam Roadmap
                </span>
                <span className="text-xs font-medium text-slate-600">
                  {daysUntilExam === 0 ? 'Exam is Today!' : `${daysUntilExam} days remaining`}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {(activePlan.subjects as any)?.title || 'Subject Study Plan'}
              </h3>
            </div>

            <Link href="/dashboard/study-plan">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs">
                Open Full Schedule
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 items-center">
            <div className="space-y-1.5 md:col-span-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Completed Tasks</span>
                <span>
                  {completedPlanItems} / {totalPlanItems} Days ({planProgressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${planProgressPercent}%` }}
                />
              </div>
            </div>

            {nextPendingTask && (
              <div className="md:col-span-2 bg-white/80 p-3 rounded-xl border border-blue-100 flex items-start gap-3">
                <span className="text-[11px] font-bold uppercase text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded shrink-0 mt-0.5">
                  Next Task
                </span>
                <div className="text-xs text-slate-700">
                  <strong className="text-slate-900">Day {nextPendingTask.day_number}: {nextPendingTask.topic}</strong>
                  <p className="text-slate-500 line-clamp-1 mt-0.5">{nextPendingTask.activity}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Need an Exam Preparation Plan?
            </h3>
            <p className="text-xs text-slate-500">
              Set your target exam date to generate an AI-customized daily study roadmap factoring in your quiz weak spots.
            </p>
          </div>
          <Link href="/dashboard/study-plan">
            <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 text-xs shrink-0">
              Create Study Plan
            </Button>
          </Link>
        </div>
      )}

      {/* Strong vs Weak Mastery Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strong Topics Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Strong Mastery Topics (≥80%)
          </h3>

          {strongTopics.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Complete practice quizzes with scores of 80% or higher to list strong topics.
            </p>
          ) : (
            <div className="space-y-2">
              {strongTopics.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs"
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-900">{item.quizTitle}</span>
                    <span className="text-slate-500 ml-1.5">({item.subjectTitle})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold shrink-0">
                    {item.score}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weak Topics Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Topics Needing Review (&lt;75%)
          </h3>

          {weakTopics.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No weak topics detected. Great job keeping your quiz performance high!
            </p>
          ) : (
            <div className="space-y-2">
              {weakTopics.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs"
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-900">{item.quizTitle}</span>
                    <span className="text-slate-500 ml-1.5">({item.subjectTitle})</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold">
                      {item.score}%
                    </span>
                    <Link
                      href={`/dashboard/subjects/${item.subjectId}/quiz/${item.quizId}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Retake →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Your Subjects
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {subjects.length} {subjects.length === 1 ? 'Course' : 'Courses'}
          </span>
        </div>

        {subjects.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No subjects created yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Create your first subject and upload PDFs to unlock AI study reviewers and practice quizzes.
            </p>
            <div className="pt-2">
              <CreateSubjectDialog />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((sub) => {
              const moduleCount = sub.modules?.length || 0
              const subQuizzes = quizzes.filter((q) => q.subject_id === sub.id)
              const subAttempts = allAttempts.filter((a) => a.subjectId === sub.id)
              const subAvg =
                subAttempts.length > 0
                  ? Math.round(
                      subAttempts.reduce((sum, a) => sum + a.score_percentage, 0) / subAttempts.length
                    )
                  : null

              return (
                <Link
                  key={sub.id}
                  href={`/dashboard/subjects/${sub.id}`}
                  className="group block p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    {subAvg !== null && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        Avg: {subAvg}%
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {sub.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {sub.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      {moduleCount} {moduleCount === 1 ? 'Module' : 'Modules'}
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                      {subQuizzes.length} {subQuizzes.length === 1 ? 'Quiz' : 'Quizzes'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Quiz Activity History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-600" />
            Recent Quiz History
          </h2>
          <Link href="/dashboard/analytics" className="text-xs text-blue-600 hover:underline font-semibold">
            View All Analytics →
          </Link>
        </div>

        {allAttempts.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-sm">
            No quiz attempts recorded yet.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Quiz / Subject</th>
                    <th className="px-6 py-3 ">Difficulty</th>
                    <th className="px-6 py-3 ">Score</th>
                    <th className="px-6 py-3 ">Date</th>
                    <th className="px-6 py-3 text-center">View</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allAttempts.slice(0, 5).map((att) => {
                    const isPassed = att.score_percentage >= 70
                    return (
                      <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{att.quizTitle}</div>
                          <div className="text-xs text-slate-500">{att.subjectTitle}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {att.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {att.score_percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(att.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        {/* Column 5: Under "VIEW" */}
                        <td className="px-6 py-4 text-center">
                          <Link href={`/dashboard/subjects/${att.subjectId}/quiz/${att.quizId}/results/${att.id}`}>
                            <Button size="sm" variant="outline" className="text-slate-700 hover:text-blue-600 text-xs">
                              Review
                            </Button>
                          </Link>
                        </td>

                        {/* Column 6: Under "ACTION" */}
                        <td className="px-6 py-4 text-center">
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