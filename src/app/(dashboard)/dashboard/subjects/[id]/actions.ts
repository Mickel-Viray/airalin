'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addModuleRecord(
  subjectId: string,
  fileName: string,
  filePath: string
) {
  try {
    const supabase = await createClient()

    // 1. Verify User Session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized: Authentication required.' }

    // 2. Verify Subject Ownership
    const { data: subject, error: subErr } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('user_id', user.id)
      .single()

    if (subErr || !subject) return { error: 'Unauthorized: Subject not found or inaccessible.' }

    // 3. Sanitize File Name
    const sanitizedOriginalName = fileName.replace(/[^a-zA-Z0-9._ -]/g, '_')

    // 4. Insert Module Record with user_id included
    const { data, error: dbError } = await supabase
      .from('modules')
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        file_name: sanitizedOriginalName,
        file_path: filePath,
      })
      .select()
      .single()

    if (dbError) return { error: dbError.message }

    revalidatePath(`/dashboard/subjects/${subjectId}`)
    return { success: true, module: data }
  } catch (err: any) {
    return { error: err.message || 'Failed to add module record' }
  }
}

export async function deleteModuleRecord(
  moduleId: string,
  subjectId: string,
  filePath: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 1. Verify Subject Ownership
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('user_id', user.id)
      .single()

    if (!subject) return { error: 'Unauthorized: Subject not found.' }

    // 2. Delete DB Record
    const { error: dbError } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId)
      .eq('subject_id', subjectId)
      .eq('user_id', user.id)

    if (dbError) return { error: dbError.message }

    // 3. Clean up Supabase Storage and associated Vector Chunks
    if (filePath) {
      await supabase.storage.from('modules').remove([filePath])
    }

    await supabase
      .from('document_chunks')
      .delete()
      .eq('module_id', moduleId)
      .eq('user_id', user.id)

    revalidatePath(`/dashboard/subjects/${subjectId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to delete module' }
  }
}

// Aliases for compatibility
export const uploadModule = addModuleRecord
export const deleteModule = deleteModuleRecord