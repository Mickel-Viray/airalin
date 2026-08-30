import Link from 'next/link'
import { ArrowLeft, BookOpen, FileText, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FlashcardViewer } from '@/components/flashcard-viewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExportReviewerButton } from '@/components/export-reviewer-button'

export default async function ReviewerPage({
  params,
}: {
  params: { id: string; moduleId: string }
}) {
  const supabase = await createClient()
  const { id, moduleId } = await params

  // 1. Verify User Session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Fetch Subject
  const { data: subject } = await supabase
    .from('subjects')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!subject) notFound()

  // 3. Fetch Module Data (including flashcards & AI review)
  const { data: moduleData } = await supabase
    .from('modules')
    .select('id, file_name, ai_review, flashcards, created_at')
    .eq('id', moduleId)
    .eq('subject_id', id)
    .single()

  if (!moduleData || !moduleData.ai_review) {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 print:p-0 print:m-0 print:max-w-none">
      {/* Top Header Actions - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <Link
          href={`/dashboard/subjects/${id}`}
          className="text-sm text-slate-500 hover:text-slate-900 flex items-center w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Subject
        </Link>
        <ExportReviewerButton
          fileName={moduleData.file_name}
          subjectTitle={subject.title}
          content={moduleData.ai_review}
        />
      </div>

      {/* Document Title Header */}
      <div className="border-b pb-4 space-y-1 print:border-none">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 w-fit px-3 py-1 rounded-full print:border print:border-slate-300">
          <BookOpen className="h-3.5 w-3.5" />
          {subject.title}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 pt-1">
          {moduleData.file_name}
        </h1>
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Generated AI Study Guide • {new Date(moduleData.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Tabbed Interface: Reading Mode vs Flashcard Mode */}
      <Tabs defaultValue="guide" className="w-full mt-6">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-8 print:hidden">
          <TabsTrigger value="guide" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Reading Mode
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Flashcard Mode
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Full Study Guide / Reading Mode */}
        <TabsContent value="guide" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
          <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-2xl font-bold mt-8 mb-4 text-slate-900" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-bold mt-8 mb-4 text-slate-900 border-b pb-2" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-lg font-bold mt-6 mb-3 text-slate-900" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="mb-4 leading-relaxed text-slate-700" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-700" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal pl-6 mb-4 space-y-2 text-slate-700" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-slate-900" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-6 rounded-lg border border-slate-200">
                    <table className="w-full text-left border-collapse" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th className="border-b-2 border-slate-200 bg-slate-50 py-3 px-4 font-semibold text-slate-900" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="border-b border-slate-100 py-3 px-4 text-slate-700" {...props} />
                ),
              }}
            >
              {moduleData.ai_review}
            </ReactMarkdown>
          </div>
        </TabsContent>

        {/* Tab 2: Interactive Flashcards Mode */}
        <TabsContent value="flashcards" className="focus-visible:outline-none focus-visible:ring-0 mt-0 print:hidden">
          <div className="max-w-4xl mx-auto">
            <FlashcardViewer
              moduleId={moduleData.id}
              subjectId={id}
              initialFlashcards={moduleData.flashcards}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}