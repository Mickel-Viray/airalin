'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createSubject(title: string, description: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      user_id: user.id,
      title,
      description
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Refreshes the dashboard page so the new subject appears instantly
  revalidatePath('/dashboard')
  return { success: true , subjectId: data.id}
}