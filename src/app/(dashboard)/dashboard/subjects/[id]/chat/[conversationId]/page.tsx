import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ChatBox } from '@/components/chat-box'
import { ChatSidebar } from '@/components/chat-sidebar'

export default async function ConversationPage({
  params,
}: {
  params: { id: string; conversationId: string }
}) {
  const supabase = await createClient()
  const { id, conversationId } = await params

  // 1. Fetch Subject details
  const { data: subject } = await supabase
    .from('subjects')
    .select('title')
    .eq('id', id)
    .single()

  if (!subject) notFound()

  // 2. Fetch all conversations for the sidebar history
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .eq('subject_id', id)
    .order('created_at', { ascending: false })

  // 3. Fetch messages including the new 'sources' column
  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender, content, sources, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <Link
        href={`/dashboard/subjects/${id}`}
        className="text-sm text-slate-500 hover:text-slate-900 flex items-center w-fit"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Subject
      </Link>

      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Study Tutor</h1>
        <p className="text-slate-500 mt-1">Subject: {subject.title}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-4">
          <ChatSidebar
            subjectId={id}
            currentConversationId={conversationId}
            conversations={conversations || []}
          />
        </div>
        <div className="md:col-span-8">
          <ChatBox
            conversationId={conversationId}
            subjectId={id}
            initialMessages={(messages as any) || []}
          />
        </div>
      </div>
    </div>
  )
}