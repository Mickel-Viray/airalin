import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createConversation } from '@/app/(dashboard)/dashboard/subjects/[id]/chat-actions'

export default async function ChatIndexPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { id } = await params

  // Check if there is an existing conversation
  const { data: latest } = await supabase
    .from('conversations')
    .select('id')
    .eq('subject_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (latest) {
    redirect(`/dashboard/subjects/${id}/chat/${latest.id}`)
  }

  // Otherwise create a new one and redirect
  const res = await createConversation(id)
  if (res.conversationId) {
    redirect(`/dashboard/subjects/${id}/chat/${res.conversationId}`)
  }

  redirect(`/dashboard/subjects/${id}`)
}