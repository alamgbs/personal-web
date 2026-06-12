'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createAgent(formData: FormData) {
  const supabase = await createClient()

  const skills = (formData.get('skills') as string)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const responsibilities = (formData.get('responsibilities') as string)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const parentId = formData.get('parent_id') as string
  const data: Record<string, unknown> = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    role: formData.get('role') as string,
    team: formData.get('team') as string,
    soul: formData.get('soul') as string,
    skills,
    responsibilities,
    model: formData.get('model') as string,
    avatar_emoji: formData.get('avatar_emoji') as string,
    status: 'active',
  }

  if (parentId) data.parent_id = parentId

  const { error } = await supabase.from('agents').insert(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mission-control/agentes')
  return { success: true }
}

export async function updateAgent(id: string, data: Record<string, unknown>) {
  const supabase = await createClient()

  const { error } = await supabase.from('agents').update(data).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mission-control/agentes')
  return { success: true }
}

export async function deleteAgent(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('agents')
    .update({ status: 'inactive' })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mission-control/agentes')
  return { success: true }
}
