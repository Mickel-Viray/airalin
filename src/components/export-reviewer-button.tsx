'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileDown, Printer } from 'lucide-react'
import { toast } from 'sonner'

export function ExportReviewerButton({
  fileName,
  subjectTitle,
  content,
}: {
  fileName: string
  subjectTitle: string
  content: string
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

  function handleDownloadMarkdown() {
    try {
      const header = `# Study Reviewer: ${fileName}\n**Subject:** ${subjectTitle}\n**Exported:** ${new Date().toLocaleDateString()}\n\n---\n\n`
      const fullText = header + content
      const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName.replace(/\.pdf$/i, '')}_Reviewer.md`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Downloaded Markdown reviewer!')
      setOpen(false)
    } catch {
      toast.error('Failed to export Markdown')
    }
  }

  function handlePrintPDF() {
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
        Export Study Pack
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="w-full flex items-center px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
          >
            <FileDown className="h-4 w-4 mr-2 text-indigo-500" />
            Download Markdown (.md)
          </button>
          <button
            type="button"
            onClick={handlePrintPDF}
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