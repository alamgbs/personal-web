'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { deleteIdeaGraph } from '@/lib/mission-control/idea-deletion'
import { FINAL_IDEA_STEP_INDEX, IDEA_STEPS, TOTAL_IDEA_STEPS } from '@/lib/mission-control/idea-steps'
import {
  getIdeaStepAssignment,
  isIdeaStepComplete,
  normalizeIdeaStepPayloadForSave,
} from '@/lib/mission-control/ideas'
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
      automation_status: 'queued',
      automation_requested_at: new Date().toISOString(),
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
  const existingStep = (currentStepData[step.toString()] as Record<string, unknown> | undefined) || {}
  const normalizedStepPayload = normalizeIdeaStepPayloadForSave(step, existingStep, data)
  const assignment = getIdeaStepAssignment(step)
  const updated = {
    ...currentStepData,
    [step.toString()]: {
      ...normalizedStepPayload,
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
    return { success: true, generated_steps: TOTAL_IDEA_STEPS, queued: true, workflow_stage: result.workflow_stage }
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
  if (!isIdeaStepComplete(step, stepData)) {
    return { error: 'Este paso está vacío. Espera a que la automatización complete el draft antes de aprobarlo.' }
  }

  const currentApprovals = (idea?.step_approvals as Record<string, unknown>) || {}
  const updatedApprovals = {
    ...currentApprovals,
    [step.toString()]: new Date().toISOString(),
  }

  const nextStep = step < FINAL_IDEA_STEP_INDEX ? step + 1 : step
  const isFinalStep = step === FINAL_IDEA_STEP_INDEX

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

  const { data: idea, error: fetchError } = await supabase
    .from('business_ideas')
    .select('step_approvals, promoted_project_id')
    .eq('id', ideaId)
    .single()

  if (fetchError) {
    return { error: fetchError.message }
  }

  const approvals = (idea?.step_approvals as Record<string, unknown>) || {}
  if (!approvals[FINAL_IDEA_STEP_INDEX.toString()]) {
    return { error: 'Aprueba primero el paso final de Go / No-Go antes de crear el proyecto.' }
  }

  if (idea?.promoted_project_id) {
    return { success: true, already_promoted: true }
  }

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

export async function deleteBusinessIdea(ideaId: string) {
  const supabase = await createClient()

  try {
    await deleteIdeaGraph(
      {
        async getIdea(id) {
          const { data, error } = await supabase
            .from('business_ideas')
            .select('id, promoted_project_id')
            .eq('id', id)
            .single()

          if (error) throw new Error(error.message)

          return data
            ? {
                id: data.id,
                promotedProjectId: data.promoted_project_id,
              }
            : null
        },
        async getProjectsBySourceIdea(id) {
          const { data, error } = await supabase
            .from('projects')
            .select('id')
            .eq('source_idea_id', id)

          if (error) throw new Error(error.message)

          return (data || []).map((project) => project.id)
        },
        async clearQuickIdeaProjectRefs(projectIds) {
          const { error } = await supabase
            .from('quick_ideas')
            .update({ promoted_to_project_id: null, updated_at: new Date().toISOString() })
            .in('promoted_to_project_id', projectIds)

          if (error) throw new Error(error.message)
        },
        async clearQuickIdeaIdeaRefs(id) {
          const { error } = await supabase
            .from('quick_ideas')
            .update({ promoted_to_idea_id: null, updated_at: new Date().toISOString() })
            .eq('promoted_to_idea_id', id)

          if (error) throw new Error(error.message)
        },
        async clearBusinessIdeaProjectRefs(projectIds) {
          const { error } = await supabase
            .from('business_ideas')
            .update({ promoted_project_id: null, updated_at: new Date().toISOString() })
            .in('promoted_project_id', projectIds)

          if (error) throw new Error(error.message)
        },
        async deleteBacklogItems(projectIds) {
          const { error } = await supabase
            .from('backlog_items')
            .delete()
            .in('project_id', projectIds)

          if (error) throw new Error(error.message)
        },
        async deleteProjectSprints(projectIds) {
          const { error } = await supabase
            .from('project_sprints')
            .delete()
            .in('project_id', projectIds)

          if (error) throw new Error(error.message)
        },
        async deleteProjects(projectIds) {
          const { error } = await supabase
            .from('projects')
            .delete()
            .in('id', projectIds)

          if (error) throw new Error(error.message)
        },
        async deleteIdea(id) {
          const { error } = await supabase
            .from('business_ideas')
            .delete()
            .eq('id', id)

          if (error) throw new Error(error.message)
        },
      },
      ideaId
    )
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se pudo eliminar la idea.',
    }
  }

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  return { success: true }
}
