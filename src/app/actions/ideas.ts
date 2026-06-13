'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { IDEA_STEPS } from '@/lib/mission-control/idea-steps'
import { getIdeaStepAssignment, isIdeaStepComplete } from '@/lib/mission-control/ideas'
import { generateProjectPrd, queueIdeaPipelineAutomation } from '@/lib/mission-control/automation'
import { isIdeaReadyForReview } from '@/lib/mission-control/workflow'

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

  const title = (formData.get('title') as string)?.trim()
  const summary = (formData.get('summary') as string)?.trim() || null
  const notificationTarget = (formData.get('notification_target') as string)?.trim() || null
  const intakeSource = (formData.get('intake_source') as string)?.trim() || 'manual'
  const intakeChannel = (formData.get('intake_channel') as string)?.trim() || null
  const autoStart = formData.get('auto_start') !== 'false'

  if (!title) {
    return { error: 'Title is required.' }
  }

  const slugBase = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const slug = `${slugBase || 'idea'}-${Date.now().toString().slice(-6)}`

  const { data: idea, error } = await supabase
    .from('business_ideas')
    .insert({
      title,
      slug,
      summary,
      status: 'in_analysis',
      current_step: 0,
      step_data: {},
      step_approvals: {},
      intake_source: intakeSource,
      intake_channel: intakeChannel,
      notification_target: notificationTarget,
      workflow_stage: 'idea_pipeline',
      automation_status: autoStart ? 'queued' : 'blocked',
      automation_requested_at: autoStart ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !idea) {
    return { error: error?.message || 'No se pudo crear la idea.' }
  }

  if (autoStart) {
    try {
      await queueIdeaPipelineAutomation(idea.id)
    } catch (automationError) {
      return {
        error:
          automationError instanceof Error
            ? automationError.message
            : 'La idea se creó, pero falló el encolado inicial.',
      }
    }
  }

  revalidatePath('/mission-control/ideas')
  return { success: true, idea_id: idea.id }
}

export async function saveStepData(ideaId: string, step: number, data: Record<string, unknown>) {
  const supabase = await createClient()

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

  const workflowStage = isIdeaReadyForReview(updated) ? 'idea_review' : 'idea_pipeline'
  const automationStatus = isIdeaReadyForReview(updated) ? 'needs_feedback' : 'running'

  const { error } = await supabase
    .from('business_ideas')
    .update({
      step_data: updated,
      status: 'in_analysis',
      workflow_stage: workflowStage,
      automation_status: automationStatus,
      review_requested_at: workflowStage === 'idea_review' ? new Date().toISOString() : null,
      last_automation_error: null,
    })
    .eq('id', ideaId)

  if (error) return { error: error.message }

  revalidatePath('/mission-control/ideas')
  return { success: true }
}

export async function generateIdeaStepDraft(ideaId: string, step: number) {
  const supabase = await createClient()

  const { error: queueError } = await supabase
    .from('business_ideas')
    .update({
      current_step: step,
      workflow_stage: 'idea_pipeline',
      automation_status: 'queued',
      automation_requested_at: new Date().toISOString(),
      last_automation_error: null,
    })
    .eq('id', ideaId)

  if (queueError) {
    return { error: queueError.message }
  }

  try {
    await queueIdeaPipelineAutomation(ideaId, { current_step: step })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se pudo encolar el draft del paso.',
    }
  }

  revalidatePath('/mission-control/ideas')
  return {
    success: true,
    queued: true,
    queued_step: step,
    step_label: IDEA_STEPS[step]?.label || `Paso ${step + 1}`,
  }
}

export async function generateIdeaAgentPipeline(ideaId: string) {
  const supabase = await createClient()

  const { error: queueError } = await supabase
    .from('business_ideas')
    .update({
      workflow_stage: 'idea_pipeline',
      automation_status: 'queued',
      automation_requested_at: new Date().toISOString(),
      last_automation_error: null,
    })
    .eq('id', ideaId)

  if (queueError) {
    return { error: queueError.message }
  }

  try {
    const result = await queueIdeaPipelineAutomation(ideaId)
    return { success: true, generated_steps: 9, queued: true, workflow_stage: result.workflow_stage }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se pudo encolar el pipeline de idea.',
    }
  }
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
    return { error: 'Este paso está vacío. Espera a que la automatización complete el draft antes de aprobarlo.' }
  }

  const currentApprovals = (idea?.step_approvals as Record<string, unknown>) || {}
  const updatedApprovals = {
    ...currentApprovals,
    [step.toString()]: new Date().toISOString(),
  }

  const nextStep = step < 8 ? step + 1 : step
  const isFinalStep = step === 8

  const { error } = await supabase
    .from('business_ideas')
    .update({
      step_approvals: updatedApprovals,
      current_step: nextStep,
      status: isFinalStep ? 'approved' : 'in_analysis',
      workflow_stage: isFinalStep ? 'prd_generation' : 'idea_pipeline',
      automation_status: isFinalStep ? 'queued' : 'needs_feedback',
      approved_for_prd_at: isFinalStep ? new Date().toISOString() : null,
      automation_requested_at: isFinalStep ? new Date().toISOString() : null,
      last_automation_error: null,
    })
    .eq('id', ideaId)

  if (error) return { error: error.message }

  if (isFinalStep) {
    try {
      await generateProjectPrd(ideaId)
    } catch (automationError) {
      return {
        error:
          automationError instanceof Error
            ? automationError.message
            : 'El paso fue aprobado, pero falló la generación automática del PRD.',
      }
    }
  }

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  return { success: true, workflow_stage: isFinalStep ? 'prd_generation' : 'idea_pipeline' }
}

export async function promoteToBacklog(ideaId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('business_ideas')
    .update({
      status: 'approved',
      workflow_stage: 'prd_generation',
      automation_status: 'queued',
      approved_for_prd_at: new Date().toISOString(),
      automation_requested_at: new Date().toISOString(),
      last_automation_error: null,
    })
    .eq('id', ideaId)

  if (error) {
    return { error: error.message }
  }

  try {
    await generateProjectPrd(ideaId)
  } catch (automationError) {
    return {
      error:
        automationError instanceof Error
          ? automationError.message
          : 'La idea se promovió, pero falló la generación automática del PRD.',
    }
  }

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  return { success: true }
}
