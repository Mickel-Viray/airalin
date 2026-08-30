'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createConversation, deleteConversation } from '@/app/(dashboard)/dashboard/subjects/[id]/chat-actions'

type Conversation = {
  id: string
  title: string
  created_at: string
}

export function ChatSidebar({
  subjectId,
  currentConversationId,
  conversations,
}: {
  subjectId: string
  currentConversationId?: string
  conversations: Conversation[]
}) {
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  async function handleNewChat() {
    setIsCreating(true)
    const res = await createConversation(subjectId)
    if (res.error) {
      toast.error(res.error)
    } else {
      router.push(`/dashboard/subjects/${subjectId}/chat/${res.conversationId}`)
    }
    setIsCreating(false)
  }

  async function handleDelete(e: React.MouseEvent, convId: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return

    const res = await deleteConversation(convId, subjectId)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Conversation removed')
      if (convId === currentConversationId) {
        router.push(`/dashboard/subjects/${subjectId}/chat`)
      }
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col h-[75vh]">
      <Button
        onClick={handleNewChat}
        disabled={isCreating}
        className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
      >
        {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
        New Chat
      </Button>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No chat history yet.</p>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === currentConversationId
            return (
              <Link
                key={c.id}
                href={`/dashboard/subjects/${subjectId}/chat/${c.id}`}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
                  <span className="truncate">{c.title}</span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}