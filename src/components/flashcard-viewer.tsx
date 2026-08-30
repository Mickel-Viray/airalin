'use client'

import { useState } from 'react'
import { BrainCircuit, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { generateFlashcards } from '@/app/(dashboard)/dashboard/subjects/[id]/flashcard-actions'

type Flashcard = {
  front: string
  back: string
}

export function FlashcardViewer({ 
  moduleId, 
  subjectId, 
  initialFlashcards 
}: { 
  moduleId: string
  subjectId: string
  initialFlashcards: Flashcard[] | null
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    const toastId = toast.loading("Extracting key concepts into flashcards...")
    
    const result = await generateFlashcards(moduleId, subjectId)
    
    if (result?.error) {
      toast.error(result.error, { id: toastId })
    } else {
      toast.success("Flashcards ready!", { id: toastId })
    }
    
    setIsGenerating(false)
  }

  function handleNext() {
    setIsFlipped(false)
    setCurrentIndex((prev) => (initialFlashcards && prev < initialFlashcards.length - 1 ? prev + 1 : prev))
  }

  function handlePrev() {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }

  if (!initialFlashcards || initialFlashcards.length === 0) {
    return (
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center">
        <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <BrainCircuit className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready for a pop quiz?</h3>
        <p className="text-slate-500 text-sm mb-6 max-w-sm">
          Generate interactive flashcards automatically extracted from your study guide.
        </p>
        <Button onClick={handleGenerate} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isGenerating ? 'Generating...' : 'Generate Flashcards'}
        </Button>
      </div>
    )
  }

  const currentCard = initialFlashcards[currentIndex]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Flashcards</h3>
        <span className="text-sm font-medium text-slate-500">
          Card {currentIndex + 1} of {initialFlashcards.length}
        </span>
      </div>

      {/* The Flashcard */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="cursor-pointer min-h-[400px] w-full bg-white border border-slate-200 shadow-sm rounded-2xl p-8 flex items-center justify-center text-center transition-all hover:shadow-md relative overflow-hidden group"
      >
        <div className="absolute top-6 right-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {isFlipped ? 'Answer' : 'Question'}
        </div>
        <p className={`text-2xl md:text-3xl font-medium ${isFlipped ? 'text-blue-700' : 'text-slate-900'}`}>
          {isFlipped ? currentCard.back : currentCard.front}
        </p>
        <div className="absolute bottom-6 text-sm text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Click anywhere to flip
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button variant="outline" onClick={handleNext} disabled={currentIndex === initialFlashcards.length - 1}>
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}