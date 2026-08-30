'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteModuleRecord } from '@/app/(dashboard)/dashboard/subjects/[id]/actions'
import { toast } from "sonner";

export function DeleteModuleButton({ 
  moduleId, 
  subjectId, 
  filePath 
}: { 
  moduleId: string, 
  subjectId: string, 
  filePath: string 
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this module?')) return
    
    setIsDeleting(true)
    const toastId = toast.loading("Deleting module...")
    const result = await deleteModuleRecord(moduleId, subjectId, filePath)
    
    if (result?.error) {
      toast.error(`Failed to delete: ${result.error}`, { id: toastId })
    } else {
      toast.success("Module deleted successfully", { id: toastId })
    }
    
    setIsDeleting(false)
  }

  return (
    <Button 
      onClick={handleDelete}
      disabled={isDeleting}
      variant="ghost" 
      size="icon" 
      className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
      title="Delete module"
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  )
}