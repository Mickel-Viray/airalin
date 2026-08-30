'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Bot, User, Loader2, Sparkles, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { sendChatMessage } from '@/app/(dashboard)/dashboard/subjects/[id]/chat-actions'

type SourceItem = {
  document_name: string
  chunk_index: number
}

type Message = {
  id: string
  sender: 'user' | 'assistant'
  content: string
  sources?: SourceItem[]
  created_at: string
}

export function ChatBox({
  conversationId,
  subjectId,
  initialMessages,
}: {
  conversationId: string
  subjectId: string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userPrompt = input.trim()
    setInput('')

    // 1. Optimistic user message
    const tempUserMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: userPrompt,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])
    setIsLoading(true)

    // 2. Dispatch Server Action
    const res = await sendChatMessage(conversationId, subjectId, userPrompt)

    if (res?.error) {
      toast.error(res.error)
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
    } else if (res?.reply) {
      // 3. Append AI reply with citations
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        content: res.reply,
        sources: res.sources || [],
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
      router.refresh()
    }

    setIsLoading(false)
  }

  return (
    <div className="flex flex-col h-[75vh] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Ask Your AI Study Tutor</h3>
            <p className="text-sm max-w-sm">
              Ask questions, request simpler explanations, or clarify difficult concepts from your uploaded modules.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.sender === 'user'
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 max-w-[80%]">
                  <div
                    className={`rounded-2xl px-5 py-3.5 text-sm ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Visual Source References Badges */}
                  {!isUser && m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 px-1">
                      <span className="text-[11px] font-medium text-slate-400">Sources:</span>
                      {m.sources.map((src, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium"
                        >
                          <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{src.document_name}</span>
                          <span className="text-slate-400">• Sec {src.chunk_index}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            )
          })
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start items-center text-slate-500 text-sm">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-slate-100 px-4 py-2.5 rounded-2xl flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Searching module sections & drafting response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t bg-slate-50 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your study materials..."
          disabled={isLoading}
          className="flex-1 h-11 px-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="h-11 px-5 bg-blue-600 hover:bg-blue-700 rounded-xl"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}