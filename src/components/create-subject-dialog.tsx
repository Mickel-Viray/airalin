'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createSubject } from '@/app/(dashboard)/dashboard/actions'

export function CreateSubjectDialog({ 
  triggerVariant = 'default' 
}: { 
  triggerVariant?: 'default' | 'empty' 
}) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    const title = formData.get('title') as string
    const description = formData.get('description') as string

    const result = await createSubject(title, description)

    setIsLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false) // Close modal on success
    }
  }

  return (
    <>
      {/* We trigger the dialog manually using onClick, avoiding nested buttons */}
      <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700">
        {triggerVariant !== 'empty' && <Plus className="h-4 w-4 mr-2" />}
        {triggerVariant === 'empty' ? 'Create Subject' : 'New Subject'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create a new subject</DialogTitle>
            <DialogDescription>
              Add a module or class to organize your study materials.
            </DialogDescription>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4 mt-4">
            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="title">Subject Title</Label>
              <Input id="title" name="title" placeholder="e.g. Embedded Systems" required disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Microcontrollers and IoT integration..." 
                disabled={isLoading}
                rows={3}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Subject'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}