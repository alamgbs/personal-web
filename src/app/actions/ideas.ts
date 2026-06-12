'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createQuickIdea(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const type = (formData.get('type') as string) || 'dev'

  if (!title?.trim()) {
    return { error: 'Title is required.' }
  }

  const { error } = await supabase.from('quick_ideas').insert({
    title: title.trim(),
    type,
    status: 'inbox',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mission-control')
  return { success: true }
}

export async function updateQuickIdeaStatus(id: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('quick_ideas')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/mission-control')
  return { success: true }
}

export async function createBusinessIdea(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { error } = await supabase.from('business_ideas').insert({
    title,
    slug,
    summary: formData.get('summary') as string,
    status: 'draft',
    current_step: 0,
    step_data: {},
    step_approvals: {},
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mission-control/ideas')
  return { success: true }
}

export async function saveStepData(ideaId: string, step: number, data: Record<string, unknown>) {
  const supabase = await createClient()

  // Fetch current step_data
  const { data: idea, error: fetchError } = await supabase
    .from('business_ideas')
    .select('step_data')
    .eq('id', ideaId)
    .single()

  if (fetchError) return { error: fetchError.message }

  const currentStepData = (idea?.step_data as Record<string, unknown>) || {}
  const updated = { ...currentStepData, [step.toString()]: data }

  const { error } = await supabase
    .from('business_ideas')
    .update({
      step_data: updated,
      status: 'in_analysis',
    })
    .eq('id', ideaId)

  if (error) return { error: error.message }

  revalidatePath('/mission-control/ideas')
  return { success: true }
}

export async function approveStep(ideaId: string, step: number) {
  const supabase = await createClient()

  const { data: idea, error: fetchError } = await supabase
    .from('business_ideas')
    .select('step_approvals, current_step')
    .eq('id', ideaId)
    .single()

  if (fetchError) return { error: fetchError.message }

  const currentApprovals = (idea?.step_approvals as Record<string, unknown>) || {}
  const updatedApprovals = {
    ...currentApprovals,
    [step.toString()]: new Date().toISOString(),
  }

  const nextStep = step < 8 ? step + 1 : step

  const { error } = await supabase
    .from('business_ideas')
    .update({
      step_approvals: updatedApprovals,
      current_step: nextStep,
    })
    .eq('id', ideaId)

  if (error) return { error: error.message }

  revalidatePath('/mission-control/ideas')
  return { success: true }
}

export async function promoteToBacklog(ideaId: string) {
  const supabase = await createClient()

  const { data: idea, error: fetchError } = await supabase
    .from('business_ideas')
    .select('title, summary')
    .eq('id', ideaId)
    .single()

  if (fetchError) return { error: fetchError.message }

  // Create a backlog item without project_id (null means it's a new idea for a project)
  const { error: backlogError } = await supabase.from('backlog_items').insert({
    title: `[Idea] ${idea.title}`,
    description: idea.summary,
    status: 'backlog',
    priority: 'high',
    type: 'feature',
    tags: ['idea', 'business'],
    position: 0,
  })

  if (backlogError) return { error: backlogError.message }

  const { error } = await supabase
    .from('business_ideas')
    .update({ status: 'in_development' })
    .eq('id', ideaId)

  if (error) return { error: error.message }

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  return { success: true }
}
