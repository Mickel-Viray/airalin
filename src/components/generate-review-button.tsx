'use client'

import { useState } from 'react'
import { BrainCircuit, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateAIReviewer } from '@/app/(dashboard)/dashboard/subjects/[id]/generate-action'
import Link from 'next/link'
import { toast } from "sonner";

export function GenerateReviewButton({ 
  moduleId, 
  subjectId, 
  filePath, 
  hasReview 
}: { 
  moduleId: string, 
  subjectId: string, 
  filePath: string,
  hasReview: boolean
}) {
  const [isGenerating, setIsGenerating] = useState(false)

  if (hasReview) {
    return (
      <Link href={`/dashboard/subjects/${subjectId}/review/${moduleId}`}>
        <Button variant="outline" size="sm" className="shrink-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
          <BrainCircuit className="h-4 w-4 mr-2" />
          View Reviewer
        </Button>
      </Link>
    )
  }

  async function handleGenerate() {
    setIsGenerating(true)

    const toastId = toast.loading("Analyzing document and generating review...")
    
    const result = await generateAIReviewer(moduleId, subjectId, filePath)
    
    // If the server action returns an error, show it to the user
    if (result?.error) {
      toast.error(`Generation failed: ${result.error}`, { id: toastId })
    } else {
      toast.success("AI reviewer generated successfully!", { id: toastId })
    }
    
    setIsGenerating(false)
  }

  return (
    <Button 
      onClick={handleGenerate}
      disabled={isGenerating}
      variant="outline" 
      size="sm" 
      className="shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <BrainCircuit className="h-4 w-4 mr-2" />
      )}
      {isGenerating ? 'Analyzing...' : 'Generate AI Reviewer'}
    </Button>
  )
}