'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, BookOpen, HelpCircle, Trash2, Calendar, Target, Sparkles, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { StudyPlanItem, togglePlanItemCompleted, deleteStudyPlan } from '@/app/(dashboard)/dashboard/study-plan/plan-actions'

export function StudyPlanView({
  plan,
  subjectTitle,
}: {
  plan: {
    id: string
    subject_id?: string
    exam_date: string
    daily_time_minutes: number
    knowledge_level: string
    plan_data: StudyPlanItem[]
  }
  subjectTitle: string
}) {
  const [items, setItems] = useState<StudyPlanItem[]>(plan.plan_data || [])
  const [isUpdating, setIsUpdating] = useState(false)

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const subjectId = plan.subject_id

  async function handleToggle(dayNumber: number) {
    setItems(prev =>
      prev.map(i => (i.day_number === dayNumber ? { ...i, completed: !i.completed } : i))
    )

    const res = await togglePlanItemCompleted(plan.id, dayNumber)
    if (res.error) {
      toast.error(res.error)
      setItems(prev =>
        prev.map(i => (i.day_number === dayNumber ? { ...i, completed: !i.completed } : i))
      )
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this study plan?')) return
    setIsUpdating(true)
    const res = await deleteStudyPlan(plan.id)
    if (res.error) {
      toast.error(res.error)
      setIsUpdating(false)
    } else {
      toast.success('Study plan removed')
      window.location.reload()
    }
  }

  return (
    <div className="space-y-6">
      {/* Plan Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              Active Study Plan
            </span>
            <span className="text-xs text-slate-500 font-medium">
              • {plan.knowledge_level} Level
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{subjectTitle}</h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-600" />
              Exam Date: {new Date(plan.exam_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              {plan.daily_time_minutes} mins / day
            </span>
            <span className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-emerald-600" />
              {completedCount} of {totalCount} Days Completed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="w-36 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Overall Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
            disabled={isUpdating}
            className="text-rose-600 hover:bg-rose-50 border-rose-200 h-9 w-9 rounded-xl shrink-0"
            title="Delete Plan"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Daily Schedule Roadmap */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          Daily Schedule Roadmap
        </h3>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.day_number}
              onClick={() => handleToggle(item.day_number)}
              className={`cursor-pointer p-5 rounded-2xl border transition-all select-none ${
                item.completed
                  ? 'bg-slate-50/80 border-slate-200 opacity-70'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              {/* Header: Checkbox, Title & Duration */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                  >
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300 hover:text-slate-400" />
                    )}
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      Day {item.day_number}
                    </span>
                    <h4
                      className={`text-sm font-semibold transition-colors ${
                        item.completed ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {item.topic}
                    </h4>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs shrink-0">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  {item.duration_minutes}m
                </span>
              </div>

              {/* Activity Description */}
              <div className="pl-8 pt-2.5">
                <p className={`text-xs leading-relaxed ${item.completed ? 'text-slate-400' : 'text-slate-600'}`}>
                  {item.activity}
                </p>
              </div>

              {/* Action Buttons */}
              {(item.review_material || item.practice_quiz) && (
                <div className="pl-8 pt-3 flex flex-wrap items-center gap-2.5 text-xs">
                  {item.review_material && (
                    <Link
                      href={
                        item.module_id && subjectId
                          ? `/dashboard/subjects/${subjectId}/review/${item.module_id}`
                          : subjectId
                          ? `/dashboard/subjects/${subjectId}`
                          : '/dashboard'
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-medium transition-colors group"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span>Review Material</span>
                      <ExternalLink className="h-3 w-3 text-blue-400 group-hover:text-blue-600" />
                    </Link>
                  )}

                  {item.practice_quiz && subjectId && (
                    <Link
                      href={`/dashboard/subjects/${subjectId}/chat`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-medium transition-colors group"
                    >
                      <HelpCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Practice with AI Tutor</span>
                      <ExternalLink className="h-3 w-3 text-amber-500 group-hover:text-amber-700" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}