'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getIdeaStepAssignment, isIdeaStepComplete } from '@/lib/mission-control/ideas'

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
  const assignment = getIdeaStepAssignment(step)
  const updated = {
    ...currentStepData,
    [step.toString()]: {
      ...data,
      assigned_agent_slug: assignment.slug,
      assigned_agent_name: assignment.name,
    },
  }

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
    .select('step_approvals, current_step, step_data')
    .eq('id', ideaId)
    .single()

  if (fetchError) return { error: fetchError.message }

  const stepData = ((idea?.step_data as Record<string, unknown>) || {})[step.toString()] as Record<string, unknown> | undefined
  if (!isIdeaStepComplete(stepData)) {
    return { error: 'Este paso está vacío. Completa el análisis del agente asignado antes de aprobarlo.' }
  }

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
    .select('id, title, slug, summary, status, promoted_project_id, step_data')
    .eq('id', ideaId)
    .single()

  if (fetchError) return { error: fetchError.message }

  if (idea.promoted_project_id) {
    return { success: true, project_id: idea.promoted_project_id }
  }

  const stepData = (idea.step_data as Record<string, unknown>) || {}
  const projectSlug = `${idea.slug}-mc`
  const projectDescription = [
    idea.summary,
    '',
    'Origin: business idea promoted from Mission Control analysis wizard.',
    'Current phase: PRD + sprint breakdown seed generated automatically.',
  ]
    .filter(Boolean)
    .join('\n')

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: idea.title,
      slug: projectSlug,
      description: projectDescription,
      status: 'active',
      tech_stack: ['openai-codex', 'mission-control', 'tbd'],
      github_repo: null,
      url: null,
    })
    .select('id')
    .single()

  if (projectError) return { error: projectError.message }

  const stepSummary = JSON.stringify(stepData)
  const { error: backlogError } = await supabase.from('backlog_items').insert({
    project_id: project.id,
    title: `PRD · ${idea.title}`,
    description: `Create the first PRD draft based on the approved business analysis.\n\nIdea summary:\n${idea.summary || 'No summary provided.'}\n\nStep data snapshot:\n${stepSummary}`,
    status: 'backlog',
    priority: 'high',
    type: 'feature',
    assignee_slug: 'product-lead',
    tags: ['prd', 'product', 'idea-handoff'],
    position: 0,
  })

  if (backlogError) return { error: backlogError.message }

  const { error } = await supabase
    .from('business_ideas')
    .update({ status: 'in_development', promoted_project_id: project.id })
    .eq('id', ideaId)

  if (error) return { error: error.message }

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  return { success: true, project_id: project.id }
}
