'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrainCircuit, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { generateQuiz } from '@/app/(dashboard)/dashboard/subjects/[id]/quiz-actions'

type ModuleItem = {
  id: string
  file_name: string
  ai_review: string | null
}

export function CreateQuizDialog({
  subjectId,
  modules,
}: {
  subjectId: string
  modules: ModuleItem[]
}) {
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(
    modules.filter(m => !!m.ai_review).map(m => m.id)
  )
  const [difficulty, setDifficulty] = useState('Medium')
  const [numQuestions, setNumQuestions] = useState(5)
  const [questionType, setQuestionType] = useState('multiple_choice')

  const availableModules = modules.filter(m => !!m.ai_review)

  function toggleModule(id: string) {
    setSelectedModuleIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    )
  }

  function selectAllModules() {
    setSelectedModuleIds(availableModules.map(m => m.id))
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      toast.error("Please enter a quiz title")
      return
    }

    if (selectedModuleIds.length === 0) {
      toast.error("Please select at least one module with an existing AI study guide")
      return
    }

    setIsGenerating(true)
    const toastId = toast.loading("Synthesizing learning materials and generating exam questions...")

    const result = await generateQuiz({
      subjectId,
      moduleIds: selectedModuleIds,
      title: title.trim(),
      difficulty,
      numQuestions,
      questionType,
    })

    if (result.error) {
      toast.error(`Failed: ${result.error}`, { id: toastId })
      setIsGenerating(false)
    } else {
      toast.success("Quiz created successfully!", { id: toastId })
      setOpen(false)
      setIsGenerating(false)
      router.push(`/dashboard/subjects/${subjectId}/quiz/${result.quizId}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center text-sm font-medium transition-colors border border-blue-200 text-blue-600 hover:bg-blue-50 h-9 px-4 py-2 rounded-md">
        <Sparkles className="h-4 w-4 mr-2" />
        Generate Quiz
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleGenerate}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-blue-600" />
              Generate Interactive Quiz
            </DialogTitle>
            <DialogDescription>
              Create an AI-evaluated practice exam based strictly on your uploaded materials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-900">Quiz Title</label>
              <input
                type="text"
                placeholder="e.g. Midterm Comprehensive Quiz"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Target Modules Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-900">Source Modules</label>
                <button
                  type="button"
                  onClick={selectAllModules}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Select All
                </button>
              </div>

              {availableModules.length === 0 ? (
                <div className="p-3 text-xs bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                  No modules have generated AI reviewers yet. Please generate a study guide for at least one module first.
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1 bg-slate-50/50">
                  {availableModules.map(mod => (
                    <label
                      key={mod.id}
                      className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-slate-100 cursor-pointer text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModuleIds.includes(mod.id)}
                        onChange={() => toggleModule(mod.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{mod.file_name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Difficulty & Number of Questions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-900">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="Easy">Easy (Recall & Basics)</option>
                  <option value="Medium">Medium (Application)</option>
                  <option value="Hard">Hard (Analysis & Deep Concepts)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-900">Questions</label>
                <select
                  value={numQuestions}
                  onChange={e => setNumQuestions(Number(e.target.value))}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                </select>
              </div>
            </div>

            {/* Question Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-900">Question Format</label>
              <select
                value={questionType}
                onChange={e => setQuestionType(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="identification">Identification (Direct Entry)</option>
              </select>
            </div>
          </div>

          <DialogFooter>
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
              disabled={isGenerating || availableModules.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isGenerating ? 'Synthesizing...' : 'Create Quiz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}