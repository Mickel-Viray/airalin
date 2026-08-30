'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Sparkles, Loader2, BookOpen, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { generateStudyPlan } from '@/app/(dashboard)/dashboard/study-plan/plan-actions'

type SubjectOption = {
  id: string
  title: string
}

export function CreateStudyPlanDialog({
  subjects,
  defaultSubjectId,
}: {
  subjects: SubjectOption[]
  defaultSubjectId?: string
}) {
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState(defaultSubjectId || (subjects[0]?.id || ''))
  const [examDate, setExamDate] = useState('')
  const [dailyMinutes, setDailyMinutes] = useState('60')
  const [knowledgeLevel, setKnowledgeLevel] = useState('Intermediate')
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId) {
      toast.error('Please select a subject')
      return
    }
    if (!examDate) {
      toast.error('Please select your exam date')
      return
    }

    setIsGenerating(true)
    const toastId = toast.loading('AI is analyzing weak topics and designing your daily study schedule...')

    const res = await generateStudyPlan({
      subjectId,
      examDate,
      dailyTimeMinutes: parseInt(dailyMinutes, 10),
      knowledgeLevel,
    })

    if (res?.error) {
      toast.error(res.error, { id: toastId })
      setIsGenerating(false)
    } else {
      toast.success('Study plan created successfully!', { id: toastId })
      setIsGenerating(false)
      setOpen(false)
      router.push('/dashboard/study-plan')
    }
  }

  // Calculate default min date (tomorrow)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDateStr = tomorrow.toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center text-sm font-medium transition-colors border border-blue-200 text-blue-600 hover:bg-blue-50 h-9 px-4 py-2 rounded-md">
        <Calendar className="h-4 w-4 mr-2" />
        Create Study Plan
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Study Plan Generator
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Configure your exam timeline and target habits. The AI will factor in your weak topics from past quizzes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Subject Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              Target Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              Exam Date
            </label>
            <input
              type="date"
              min={minDateStr}
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          {/* Daily Study Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              Available Time Per Day
            </label>
            <select
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="30">30 Minutes / day</option>
              <option value="45">45 Minutes / day</option>
              <option value="60">1 Hour / day</option>
              <option value="90">1.5 Hours / day</option>
              <option value="120">2 Hours / day</option>
              <option value="180">3 Hours / day</option>
            </select>
          </div>

          {/* Knowledge Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              Current Knowledge Level
            </label>
            <select
              value={knowledgeLevel}
              onChange={(e) => setKnowledgeLevel(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Beginner">Beginner (Starting from scratch)</option>
              <option value="Intermediate">Intermediate (Familiar with core concepts)</option>
              <option value="Advanced">Advanced (Final review & practice tests)</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isGenerating || !subjectId || !examDate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                'Generate Plan'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}