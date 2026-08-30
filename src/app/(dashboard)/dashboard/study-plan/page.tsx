import Link from 'next/link'
import { ArrowLeft, Calendar, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreateStudyPlanDialog } from '@/components/create-study-plan-dialog'
import { StudyPlanView } from '@/components/study-plan-view'

export default async function StudyPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. Fetch user subjects for the dialog
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, title')
    .eq('user_id', user.id)

  // 2. Fetch current active plan
  const { data: activePlan } = await supabase
    .from('study_plans')
    .select(`
      id,
      subject_id,
      exam_date,
      daily_time_minutes,
      knowledge_level,
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
    .single()

  const subjectList = subjects || []
  const planSubjectTitle = (activePlan?.subjects as any)?.title || 'Subject Plan'

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Navigation & Header */}
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-slate-900 flex items-center w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Study Planner</h1>
            <p className="text-slate-500 mt-1">AI-scheduled daily preparation tailored to your exam deadline and weak areas.</p>
          </div>
          {subjectList.length > 0 && (
            <CreateStudyPlanDialog subjects={subjectList} />
          )}
        </div>
      </div>

      {/* Main Content */}
      {!activePlan ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No active study plan</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Set your target exam date and daily study time to generate an automated review roadmap.
          </p>
          {subjectList.length > 0 && (
            <div className="pt-2">
              <CreateStudyPlanDialog subjects={subjectList} />
            </div>
          )}
        </div>
      ) : (
        <StudyPlanView
          plan={activePlan as any}
          subjectTitle={planSubjectTitle}
        />
      )}
    </div>
  )
}