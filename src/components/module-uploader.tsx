'use client'

import { useState, useRef } from 'react'
import { UploadCloud, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { addModuleRecord } from '@/app/(dashboard)/dashboard/subjects/[id]/actions'
import { toast } from 'sonner'

export function ModuleUploader({ subjectId }: { subjectId: string }) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function processUpload(file: File) {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF documents are supported.')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds the 15MB limit.')
      return
    }

    setIsUploading(true)
    const toastId = toast.loading('Uploading module PDF...')

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const uniquePath = `${subjectId}/${Date.now()}_${sanitizedName}`

      // 1. Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('modules')
        .upload(uniquePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadErr) throw uploadErr

      // 2. Add database record
      const res = await addModuleRecord(subjectId, file.name, uniquePath)
      if (res?.error) {
        throw new Error(res.error)
      }

      toast.success('Module uploaded successfully!', { id: toastId })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to upload module', { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processUpload(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!isUploading) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (isUploading) return

    const file = e.dataTransfer.files?.[0]
    if (file) processUpload(file)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
        isDragging
          ? 'border-blue-500 bg-blue-50/70 ring-4 ring-blue-500/10 scale-[1.01]'
          : 'border-slate-200 bg-white hover:bg-slate-50/60'
      }`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        className="hidden"
        disabled={isUploading}
      />

      <div
        className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
          isDragging ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600'
        }`}
      >
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <UploadCloud className="h-6 w-6" />
        )}
      </div>

      <h4 className="text-base font-semibold text-slate-900 mb-1">
        {isUploading
          ? 'Uploading & Processing...'
          : isDragging
          ? 'Drop your PDF here'
          : 'Upload your PDF module'}
      </h4>

      <p className="text-xs text-slate-500 mb-4 max-w-xs">
        {isDragging
          ? 'Release to start upload'
          : 'Drag & drop your PDF here, or click to browse (up to 15MB).'}
      </p>

      <Button
        type="button"
        disabled={isUploading}
        onClick={(e) => {
          e.stopPropagation()
          fileInputRef.current?.click()
        }}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isUploading ? 'Uploading...' : 'Select File'}
      </Button>
    </div>
  )
}