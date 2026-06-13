'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDefaultCodexModelForTier } from '@/lib/mission-control/agents'

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

export async function updateAgentRuntime(input: {
  id: string
  cost_tier: string | null
  llm_model: string | null
  soul_short: string | null
}) {
  const supabase = await createClient()

  const costTier = input.cost_tier?.trim() || null
  const soulShort = input.soul_short?.trim() || null
  const explicitModel = input.llm_model?.trim() || null
  const llmModel = explicitModel || getDefaultCodexModelForTier(costTier)

  const { error } = await supabase
    .from('agents')
    .update({
      cost_tier: costTier,
      soul_short: soulShort,
      llm_model: llmModel,
      model: llmModel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)

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
