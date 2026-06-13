'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function splitCsv(value: FormDataEntryValue | null) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function createAgent(formData: FormData) {
  const supabase = await createClient()

  const parentId = String(formData.get('parent_id') || '')
  const llmModel = String(formData.get('llm_model') || '')
  const soulShort = String(formData.get('soul_short') || '')
  const fullSoul = String(formData.get('soul') || soulShort)

  const data: Record<string, unknown> = {
    name: String(formData.get('name') || ''),
    slug: String(formData.get('slug') || ''),
    role: String(formData.get('role') || ''),
    team: String(formData.get('team') || '') || null,
    soul_short: soulShort || null,
    soul: fullSoul || null,
    skills: splitCsv(formData.get('skills')),
    responsibilities: splitCsv(formData.get('responsibilities')),
    llm_model: llmModel || null,
    model: llmModel || null,
    cost_tier: String(formData.get('cost_tier') || '') || null,
    avatar_emoji: String(formData.get('avatar_emoji') || '') || null,
    status: String(formData.get('status') || 'active'),
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
