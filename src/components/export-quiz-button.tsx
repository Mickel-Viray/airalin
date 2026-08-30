'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileDown, Printer } from 'lucide-react'
import { toast } from 'sonner'

type QuestionItem = {
  id: string
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string
}

export function ExportQuizButton({
  quizTitle,
  subjectTitle,
  difficulty,
  questions,
}: {
  quizTitle: string
  subjectTitle: string
  difficulty: string
  questions: QuestionItem[]
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleDownloadMarkdown(includeAnswers: boolean) {
    try {
      let doc = `# Practice Exam: ${quizTitle}\n`
      doc += `**Subject:** ${subjectTitle} | **Difficulty:** ${difficulty} | **Questions:** ${questions.length}\n`
      doc += `**Generated:** ${new Date().toLocaleDateString()}\n\n---\n\n`

      // Questions
      doc += `## Questions\n\n`
      questions.forEach((q, idx) => {
        doc += `### ${idx + 1}. ${q.question_text}\n`
        q.options.forEach((opt) => {
          doc += `- [ ] ${opt}\n`
        })
        doc += `\n`
      })

      // Answer Key
      if (includeAnswers) {
        doc += `---\n\n## Answer Key & Explanations\n\n`
        questions.forEach((q, idx) => {
          doc += `**${idx + 1}. Correct Answer:** ${q.correct_answer}\n\n`
          doc += `*Explanation:* ${q.explanation}\n\n`
        })
      }

      const blob = new Blob([doc], { type: 'text/markdown;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `${quizTitle.replace(/\s+/g, '_')}_${includeAnswers ? 'with_Answers' : 'Exam'}.md`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(includeAnswers ? 'Downloaded Exam with Answer Key!' : 'Downloaded Practice Exam!')
      setOpen(false)
    } catch {
      toast.error('Failed to export exam')
    }
  }

  function handlePrint() {
    setOpen(false)
    window.print()
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center text-sm font-medium transition-colors border border-slate-200 bg-white hover:bg-slate-50 h-9 px-3.5 py-2 rounded-xl text-slate-700 shadow-sm"
      >
        <Download className="h-4 w-4 mr-2 text-blue-600" />
        Export Quiz Pack
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={() => handleDownloadMarkdown(false)}
            className="w-full flex items-center px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
          >
            <FileDown className="h-4 w-4 mr-2 text-blue-500" />
            Exam Sheet Only (.md)
          </button>
          <button
            type="button"
            onClick={() => handleDownloadMarkdown(true)}
            className="w-full flex items-center px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
          >
            <FileDown className="h-4 w-4 mr-2 text-indigo-500" />
            Exam + Answer Key (.md)
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="w-full flex items-center px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
          >
            <Printer className="h-4 w-4 mr-2 text-emerald-500" />
            Print / Save as PDF
          </button>
        </div>
      )}
    </div>
  )
}