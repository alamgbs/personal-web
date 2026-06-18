import 'server-only'

import { revalidatePath } from 'next/cache'
import { buildSprintDependencyRows } from '@/lib/mission-control/backlog-runtime'
import { createPrivilegedServerClient } from '@/lib/supabase/admin'
import { generateIdeaStepWithHermes } from '@/lib/mission-control/idea-agent-runtime'
import { FINAL_IDEA_STEP_INDEX, IDEA_STEPS } from '@/lib/mission-control/idea-steps'
import {
  getIdeaStepAssignment,
  isIdeaStepComplete,
  normalizeIdeaStepData,
} from '@/lib/mission-control/ideas'
import { generateProjectArtifactWithHermes } from '@/lib/mission-control/project-agent-runtime'
import { canQueueIdeaStep, getNextPendingIdeaStep, isIdeaReadyForReview } from '@/lib/mission-control/workflow'

type JsonRecord = Record<string, unknown>

type IdeaRow = {
  id: string
  title: string
  slug: string
  summary: string | null
  status: string | null
  current_step: number | null
  step_data: JsonRecord | null
  step_approvals: JsonRecord | null
  promoted_project_id: string | null
  notification_target: string | null
  workflow_stage: string | null
  automation_status: string | null
  automation_run_count: number | null
  automation_requested_at?: string | null
  automation_completed_at?: string | null
  last_automation_error?: string | null
}

type ProjectRow = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string | null
  prd_status: string | null
  prd_markdown: string | null
  planning_markdown: string | null
  current_sprint_number: number | null
  execution_status: string | null
  notification_target: string | null
  source_idea_id: string | null
}

type WorkItemPriority = 'low' | 'normal' | 'high' | 'urgent'

type WorkItemStatus = 'queued' | 'claimed' | 'running' | 'completed' | 'needs_feedback' | 'failed' | 'cancelled'

type WorkItemSourceType = 'business_idea_step' | 'project_artifact' | 'backlog_item_bridge'

type WorkItemRow = {
  id: string
  source_type: WorkItemSourceType
  source_id: string
  source_step_index: number | null
  idempotency_key: string
  assignee_slug: string
  profile_name: string | null
  skill_names: string[] | null
  status: WorkItemStatus
  priority: WorkItemPriority
  input_json: JsonRecord | null
}

function asJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as JsonRecord
}

function buildIdeaStepIdempotencyKey(ideaId: string, step: number) {
  return `business_idea_step:${ideaId}:${step}`
}

function buildProjectArtifactIdempotencyKey(projectId: string, artifact: string) {
  return `project_artifact:${projectId}:${artifact}`
}

async function upsertWorkItem(params: {
  sourceType: WorkItemSourceType
  sourceId: string
  sourceStepIndex?: number | null
  idempotencyKey: string
  assigneeSlug: string
  profileName?: string | null
  skillNames?: string[]
  priority?: WorkItemPriority
  status?: WorkItemStatus
  inputJson?: JsonRecord
  outputJson?: JsonRecord | null
  outputMarkdown?: string | null
  claimedBy?: string | null
  claimedAt?: string | null
  startedAt?: string | null
  heartbeatAt?: string | null
  completedAt?: string | null
  lastError?: string | null
}) {
  const supabase = await createPrivilegedServerClient()
  const status = params.status || 'queued'
  const isTerminal = ['completed', 'needs_feedback', 'failed', 'cancelled'].includes(status)
  const payload = {
    source_type: params.sourceType,
    source_id: params.sourceId,
    source_step_index: params.sourceStepIndex ?? null,
    idempotency_key: params.idempotencyKey,
    assignee_slug: params.assigneeSlug,
    profile_name: params.profileName ?? null,
    skill_names: params.skillNames?.length ? params.skillNames : ['mission-control-workflows'],
    status,
    priority: params.priority || 'normal',
    input_json: params.inputJson || {},
    output_json: params.outputJson ?? null,
    output_markdown: params.outputMarkdown ?? null,
    claimed_by: params.claimedBy ?? null,
    claimed_at: params.claimedAt ?? null,
    started_at: params.startedAt ?? null,
    heartbeat_at: params.heartbeatAt ?? null,
    completed_at: params.completedAt ?? (isTerminal ? new Date().toISOString() : null),
    last_error: params.lastError ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('mission_control_work_items')
    .upsert(payload, { onConflict: 'idempotency_key' })
    .select('id, source_type, source_id, source_step_index, idempotency_key, assignee_slug, profile_name, skill_names, status, priority, input_json')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo encolar el Mission Control work item.')
  }

  return data as WorkItemRow
}

async function upsertIdeaStepWorkItem(params: {
  idea: IdeaRow
  step: number
  assignment: ReturnType<typeof getIdeaStepAssignment>
  stepData: JsonRecord
  status: WorkItemStatus
  outputJson?: JsonRecord | null
  outputMarkdown?: string | null
}) {
  return upsertWorkItem({
    sourceType: 'business_idea_step',
    sourceId: params.idea.id,
    sourceStepIndex: params.step,
    idempotencyKey: buildIdeaStepIdempotencyKey(params.idea.id, params.step),
    assigneeSlug: params.assignment.slug,
    profileName: params.assignment.profile,
    skillNames: params.assignment.skillNames,
    priority: params.step === FINAL_IDEA_STEP_INDEX ? 'high' : 'normal',
    status: params.status,
    inputJson: {
      action: 'generate_step',
      idea_id: params.idea.id,
      idea_title: params.idea.title,
      idea_summary: params.idea.summary,
      step: params.step,
      step_label: IDEA_STEPS[params.step]?.label || `Paso ${params.step + 1}`,
      assigned_agent_slug: params.assignment.slug,
      assigned_agent_name: params.assignment.name,
      assigned_profile_name: params.assignment.profile,
      assigned_skill_name: params.assignment.skillName,
      assigned_skill_names: params.assignment.skillNames,
      step_payload: asJsonRecord(params.stepData[params.step.toString()]),
    },
    outputJson: params.outputJson ?? null,
    outputMarkdown: params.outputMarkdown ?? null,
  })
}

export async function runIdeaPipelineAutomation(ideaId: string) {
  const supabase = await createPrivilegedServerClient()
  const idea = await fetchIdea(ideaId)

  if (!idea) {
    throw new Error('Idea no encontrada.')
  }

  await supabase
    .from('business_ideas')
    .update({
      workflow_stage: 'idea_pipeline',
      automation_status: 'running',
      automation_run_count: (idea.automation_run_count || 0) + 1,
      last_automation_error: null,
    })
    .eq('id', ideaId)

  let stepData = (idea.step_data as JsonRecord) || {}
  let approvals = (idea.step_approvals as JsonRecord) || {}

  try {
    for (const step of IDEA_STEPS.map((_, index) => index)) {
      if (approvals[step.toString()]) {
        continue
      }

      const existing = stepData[step.toString()] as JsonRecord | undefined
      if (isIdeaStepComplete(step, existing)) {
        if (!approvals[step.toString()]) {
          break
        }
        continue
      }

      const assignment = getIdeaStepAssignment(step)
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('name, slug, team, role, soul_short, skills, responsibilities, llm_model')
        .eq('slug', assignment.slug)
        .single()

      if (agentError || !agent) {
        throw new Error(agentError?.message || `No se encontró el agente ${assignment.slug}.`)
      }

      const generated = await generateIdeaStepWithHermes({
        agent,
        idea: {
          title: idea.title,
          summary: idea.summary,
          step,
          stepData,
        },
      })

      const mergedStep = normalizeIdeaStepData(step, {
        ...(existing || {}),
        ...generated.stepData,
        assigned_agent_slug: assignment.slug,
        assigned_agent_name: assignment.name,
        assigned_profile_name: assignment.profile,
        assigned_skill_name: assignment.skillName,
        assigned_skill_names: assignment.skillNames,
        generated_at: generated.generated_at,
        generated_by: agent.slug,
        generated_by_name: agent.name,
        generation_provider: generated.provider,
        generation_model: generated.model,
      })

      stepData = {
        ...stepData,
        [step.toString()]: mergedStep,
      }

      await upsertIdeaStepWorkItem({
        idea,
        step,
        assignment,
        stepData,
        status: 'needs_feedback',
        outputJson: mergedStep,
        outputMarkdown: generated.content,
      })

      approvals = {
        ...approvals,
        [step.toString()]: null,
      }

      const { error: stepUpdateError } = await supabase
        .from('business_ideas')
        .update({
          step_data: stepData,
          current_step: step,
          status: 'in_analysis',
          workflow_stage: 'idea_pipeline',
          automation_status: 'needs_feedback',
          automation_requested_at: idea.automation_requested_at || new Date().toISOString(),
          automation_completed_at: new Date().toISOString(),
          review_requested_at: null,
          last_automation_error: null,
        })
        .eq('id', ideaId)

      if (stepUpdateError) {
        throw new Error(stepUpdateError.message)
      }
    }

    const readyForReview = isIdeaReadyForReview(stepData)
    const pendingStep = IDEA_STEPS.findIndex((_, index) => !approvals[index.toString()])
    const currentStep = pendingStep === -1 ? FINAL_IDEA_STEP_INDEX : pendingStep
    const workflowStage = readyForReview ? 'idea_review' : 'idea_pipeline'
    const { error: finalizeError } = await supabase
      .from('business_ideas')
      .update({
        step_data: stepData,
        current_step: currentStep,
        workflow_stage: workflowStage,
        automation_status: 'needs_feedback',
        review_requested_at: readyForReview ? new Date().toISOString() : null,
        automation_completed_at: new Date().toISOString(),
        last_automation_error: null,
      })
      .eq('id', ideaId)

    if (finalizeError) {
      throw new Error(finalizeError.message)
    }

    revalidatePath('/mission-control/ideas')
    return { success: true, workflow_stage: readyForReview ? 'idea_review' : 'idea_pipeline' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar el pipeline automático.'
    await supabase
      .from('business_ideas')
      .update({
        automation_status: 'failed',
        last_automation_error: message,
      })
      .eq('id', ideaId)

    revalidatePath('/mission-control/ideas')
    throw error
  }
}

export async function runIdeaStepAutomation(ideaId: string, step: number) {
  const supabase = await createPrivilegedServerClient()
  const idea = await fetchIdea(ideaId)

  if (!idea) {
    throw new Error('Idea no encontrada.')
  }

  if (!IDEA_STEPS[step]) {
    throw new Error(`Paso inválido: ${step}`)
  }

  const currentStepData = (idea.step_data as JsonRecord) || {}
  const currentApprovals = (idea.step_approvals as JsonRecord) || {}
  const existing = currentStepData[step.toString()] as JsonRecord | undefined
  const assignment = getIdeaStepAssignment(step)

  if (step > 0 && !currentApprovals[(step - 1).toString()]) {
    throw new Error(`No se puede generar el paso ${step + 1} antes de aprobar el paso ${step}.`)
  }

  await supabase
    .from('business_ideas')
    .update({
      current_step: step,
      workflow_stage: 'idea_pipeline',
      automation_status: 'running',
      automation_run_count: (idea.automation_run_count || 0) + 1,
      last_automation_error: null,
    })
    .eq('id', ideaId)

  try {
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('name, slug, team, role, soul_short, skills, responsibilities, llm_model')
      .eq('slug', assignment.slug)
      .single()

    if (agentError || !agent) {
      throw new Error(agentError?.message || `No se encontró el agente ${assignment.slug}.`)
    }

    const generated = await generateIdeaStepWithHermes({
      agent,
      idea: {
        title: idea.title,
        summary: idea.summary,
        step,
        stepData: currentStepData,
      },
    })

    const mergedStep = normalizeIdeaStepData(step, {
      ...(existing || {}),
      ...generated.stepData,
      assigned_agent_slug: assignment.slug,
      assigned_agent_name: assignment.name,
      assigned_profile_name: assignment.profile,
      assigned_skill_name: assignment.skillName,
      assigned_skill_names: assignment.skillNames,
      generated_at: generated.generated_at,
      generated_by: agent.slug,
      generated_by_name: agent.name,
      generation_provider: generated.provider,
      generation_model: generated.model,
    })

    const stepData = {
      ...currentStepData,
      [step.toString()]: mergedStep,
    }

    await upsertIdeaStepWorkItem({
      idea,
      step,
      assignment,
      stepData,
      status: 'needs_feedback',
      outputJson: mergedStep,
      outputMarkdown: generated.content,
    })

    const readyForReview = isIdeaReadyForReview(stepData)
    const { error: updateError } = await supabase
      .from('business_ideas')
      .update({
        step_data: stepData,
        current_step: step,
        status: 'in_analysis',
        workflow_stage: readyForReview ? 'idea_review' : 'idea_pipeline',
        automation_status: 'needs_feedback',
        review_requested_at: readyForReview ? new Date().toISOString() : null,
        automation_completed_at: new Date().toISOString(),
        last_automation_error: null,
      })
      .eq('id', ideaId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    revalidatePath('/mission-control/ideas')
    return { success: true, workflow_stage: readyForReview ? 'idea_review' : 'idea_pipeline' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo re-generar el paso automático.'
    await supabase
      .from('business_ideas')
      .update({
        automation_status: 'failed',
        last_automation_error: message,
      })
      .eq('id', ideaId)

    revalidatePath('/mission-control/ideas')
    throw error
  }
}

export async function queueIdeaPipelineAutomation(
  ideaId: string,
  overrides: Partial<Pick<IdeaRow, 'current_step'>> = {}
) {
  const supabase = await createPrivilegedServerClient()
  const idea = await fetchIdea(ideaId)

  if (!idea) {
    throw new Error('Idea no encontrada.')
  }

  const requestedStep = typeof overrides.current_step === 'number' ? overrides.current_step : null
  const approvals = (idea.step_approvals as JsonRecord) || {}
  const nextPendingStep = getNextPendingIdeaStep(approvals)
  const step = requestedStep ?? nextPendingStep ?? idea.current_step ?? 0

  if (!canQueueIdeaStep(approvals, step)) {
    throw new Error(`No se puede encolar el paso ${step + 1} sin aprobar antes el paso previo.`)
  }

  if (requestedStep === null && nextPendingStep === null) {
    throw new Error('No hay pasos pendientes para encolar en esta idea.')
  }

  const updatePayload: {
    workflow_stage: string
    automation_status: string
    automation_requested_at: string
    automation_completed_at: null
    review_requested_at: null
    last_automation_error: null
    current_step?: number
  } = {
    workflow_stage: 'idea_pipeline',
    automation_status: 'queued',
    automation_requested_at: new Date().toISOString(),
    automation_completed_at: null,
    review_requested_at: null,
    last_automation_error: null,
    current_step: step,
  }

  const { error } = await supabase.from('business_ideas').update(updatePayload).eq('id', ideaId)

  if (error) {
    throw new Error(error.message)
  }

  const assignment = getIdeaStepAssignment(step)
  const currentStepData = ((idea.step_data as JsonRecord) || {})[step.toString()] as JsonRecord | undefined

  const workItem = await upsertWorkItem({
    sourceType: 'business_idea_step',
    sourceId: ideaId,
    sourceStepIndex: step,
    idempotencyKey: buildIdeaStepIdempotencyKey(ideaId, step),
    assigneeSlug: assignment.slug,
    profileName: assignment.profile,
    skillNames: assignment.skillNames,
    priority: step === 0 ? 'high' : 'normal',
    inputJson: {
      action: 'generate_step',
      idea_id: ideaId,
      step,
      assigned_agent_slug: assignment.slug,
      assigned_agent_name: assignment.name,
      assigned_profile_name: assignment.profile,
      assigned_skill_names: assignment.skillNames,
      pending_feedback: typeof currentStepData?.pending_feedback === 'string' ? currentStepData.pending_feedback : null,
      rerun: typeof overrides.current_step === 'number',
    },
  })

  revalidatePath('/mission-control/ideas')
  return {
    success: true,
    queued: true,
    workflow_stage: 'idea_pipeline' as const,
    work_item_id: workItem.id,
    queued_step: step,
  }
}

export async function ensureProjectForIdea(ideaId: string) {
  const supabase = await createPrivilegedServerClient()
  const idea = await fetchIdea(ideaId)

  if (!idea) {
    throw new Error('Idea no encontrada.')
  }

  if (idea.promoted_project_id) {
    const { data: existingProject } = await supabase
      .from('projects')
      .select('*')
      .eq('id', idea.promoted_project_id)
      .single()

    if (existingProject) {
      return existingProject as ProjectRow
    }
  }

  const projectSlug = `${idea.slug}-mc`
  const projectDescription = [
    idea.summary,
    '',
    'Origin: business idea promoted from Mission Control analysis wizard.',
    'Current phase: PRD generation pending owner review.',
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
      tech_stack: ['openai-codex', 'mission-control', 'development'],
      github_repo: null,
      url: null,
      source_idea_id: idea.id,
      notification_target: idea.notification_target,
      execution_status: 'pending_prd',
      delivery_status: 'waiting_prd',
    })
    .select('*')
    .single()

  if (projectError || !project) {
    throw new Error(projectError?.message || 'No se pudo crear el proyecto.')
  }

  const { data: existingItems } = await supabase
    .from('backlog_items')
    .select('title')
    .eq('project_id', project.id)

  const existingTitles = new Set((existingItems || []).map((item) => item.title))
  const prdTitle = `PRD · ${idea.title}`

  if (!existingTitles.has(prdTitle)) {
    const { error: backlogError } = await supabase.from('backlog_items').insert({
      project_id: project.id,
      title: prdTitle,
      description: `Create the first PRD draft based on the approved business analysis.\n\nIdea summary:\n${idea.summary || 'No summary provided.'}`,
      status: 'backlog',
      priority: 'high',
      type: 'feature',
      assignee_slug: 'product-lead',
      review_owner_slug: 'alam',
      tags: ['prd', 'product', 'idea-handoff'],
      required_skills: ['product strategy', 'prd authoring', 'acceptance criteria'],
      execution_mode: 'planning',
      stage: 'prd',
      position: 0,
    })

    if (backlogError) {
      throw new Error(backlogError.message)
    }
  }

  const { error: updateIdeaError } = await supabase
    .from('business_ideas')
    .update({
      status: 'approved',
      promoted_project_id: project.id,
      workflow_stage: 'prd_generation',
      automation_status: 'queued',
      approved_for_prd_at: new Date().toISOString(),
      automation_requested_at: new Date().toISOString(),
      last_automation_error: null,
    })
    .eq('id', idea.id)

  if (updateIdeaError) {
    throw new Error(updateIdeaError.message)
  }

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  return project as ProjectRow
}

export async function generateProjectPrd(ideaId: string) {
  const project = await ensureProjectForIdea(ideaId)

  const workItem = await upsertWorkItem({
    sourceType: 'project_artifact',
    sourceId: project.id,
    idempotencyKey: buildProjectArtifactIdempotencyKey(project.id, 'prd'),
    assigneeSlug: 'product-lead',
    profileName: 'mc-product-lead',
    skillNames: ['mission-control-workflows'],
    priority: 'high',
    inputJson: {
      action: 'generate_prd',
      project_id: project.id,
      idea_id: ideaId,
      artifact: 'prd',
    },
  })

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  revalidatePath(`/mission-control/proyectos/${project.slug}`)
  return { success: true, projectId: project.id, work_item_id: workItem.id, queued: true }
}

export async function generateProjectPlanning(projectId: string) {
  const supabase = await createPrivilegedServerClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new Error(projectError?.message || 'Proyecto no encontrado.')
  }

  const { data: idea } = await supabase
    .from('business_ideas')
    .select('*')
    .eq('promoted_project_id', project.id)
    .single()

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('name, slug, team, role, soul_short, skills, responsibilities, llm_model')
    .eq('slug', 'hermes')
    .single()

  if (agentError || !agent) {
    throw new Error(agentError?.message || 'No se encontró Hermes.')
  }

  await supabase
    .from('projects')
    .update({ execution_status: 'planning_generation', updated_at: new Date().toISOString() })
    .eq('id', project.id)

  const generated = await generateProjectArtifactWithHermes({
    artifact: 'planning',
    agent,
    project: {
      name: project.name,
      slug: project.slug,
      description: project.description,
      ideaTitle: idea?.title || null,
      ideaSummary: idea?.summary || null,
      stepData: (idea?.step_data as JsonRecord) || {},
      prdMarkdown: project.prd_markdown,
    },
  })

  const { error: updateProjectError } = await supabase
    .from('projects')
    .update({
      planning_markdown: generated.content,
      planning_generated_at: generated.generated_at,
      planning_generated_by: agent.slug,
      execution_status: 'planning_review',
      delivery_status: 'planning',
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)

  if (updateProjectError) {
    throw new Error(updateProjectError.message)
  }

  const planningItems = [
    {
      project_id: project.id,
      title: `Sprint 0 plan · ${project.name}`,
      description: generated.content,
      status: 'backlog',
      priority: 'high',
      type: 'task',
      assignee_slug: 'dev-lead',
      review_owner_slug: 'alam',
      tags: ['sprint-0', 'delivery-plan', 'dev'],
      required_skills: ['delivery planning', 'technical scoping', 'risk sequencing'],
      execution_mode: 'planning',
      stage: 'planning',
      position: 1,
    },
    {
      project_id: project.id,
      title: `UX concept · ${project.name}`,
      description: 'UX/UI aterriza journeys, pantallas y constraints del MVP a partir del PRD aprobado y el planning consolidado.',
      status: 'backlog',
      priority: 'medium',
      type: 'task',
      assignee_slug: 'ux-ui',
      review_owner_slug: 'product-lead',
      tags: ['ux', 'journey', 'mvp'],
      required_skills: ['wireframing', 'journey mapping', 'interaction design'],
      execution_mode: 'planning',
      stage: 'planning',
      position: 2,
    },
    {
      project_id: project.id,
      title: `Validation memo · ${project.name}`,
      description: 'Research arma memo de benchmark, riesgos y métricas a vigilar durante sprint planning.',
      status: 'backlog',
      priority: 'medium',
      type: 'task',
      assignee_slug: 'research',
      review_owner_slug: 'product-lead',
      tags: ['research', 'validation', 'market'],
      required_skills: ['benchmarking', 'market validation', 'risk framing'],
      execution_mode: 'planning',
      stage: 'planning',
      position: 3,
    },
  ] satisfies Array<{
    project_id: string
    title: string
    description: string
    status: string
    priority: string
    type: string
    assignee_slug: string
    review_owner_slug: string
    tags: string[]
    required_skills: string[]
    execution_mode: string
    stage: string
    position: number
  }>

  const { data: existingItems, error: existingItemsError } = await supabase
    .from('backlog_items')
    .select('title')
    .eq('project_id', project.id)

  if (existingItemsError) {
    throw new Error(existingItemsError.message)
  }

  const existingTitles = new Set((existingItems || []).map((item) => item.title))
  const itemsToInsert = planningItems.filter((item) => !existingTitles.has(item.title))

  if (itemsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('backlog_items').insert(itemsToInsert)
    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  if (idea?.id) {
    await supabase
      .from('business_ideas')
      .update({
        workflow_stage: 'planning_review',
        automation_status: 'needs_feedback',
        review_requested_at: new Date().toISOString(),
        automation_completed_at: new Date().toISOString(),
      })
      .eq('id', idea.id)
  }

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  revalidatePath(`/mission-control/proyectos/${project.slug}`)
  return { success: true }
}

export async function approvePlanningAndSeedSprint(projectId: string) {
  const supabase = await createPrivilegedServerClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new Error(projectError?.message || 'Proyecto no encontrado.')
  }

  const sprintNumber = Math.max(1, (project.current_sprint_number || 0) + (project.current_sprint_number ? 0 : 1))

  const { data: sprintRows, error: sprintLookupError } = await supabase
    .from('project_sprints')
    .select('id')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)

  if (sprintLookupError) {
    throw new Error(sprintLookupError.message)
  }

  if (!sprintRows || sprintRows.length === 0) {
    const { error: createSprintError } = await supabase.from('project_sprints').insert({
      project_id: project.id,
      sprint_number: sprintNumber,
      title: `Sprint ${sprintNumber} · ${project.name}`,
      goal: `Construir el primer vertical funcional de ${project.name}`,
      status: 'planned',
      summary_markdown: project.planning_markdown,
    })

    if (createSprintError) {
      throw new Error(createSprintError.message)
    }
  }

  const sprintTasks = [
    {
      project_id: project.id,
      sprint_number: sprintNumber,
      title: `Sprint ${sprintNumber} · Product breakdown · ${project.name}`,
      description: 'Product Owner traduce el planning aprobado a backlog ejecutable con historias, prioridades y acceptance criteria.',
      status: 'backlog',
      priority: 'high',
      type: 'task',
      assignee_slug: 'product-owner',
      review_owner_slug: 'product-lead',
      tags: ['sprint', 'product', 'backlog'],
      required_skills: ['backlog management', 'acceptance criteria', 'prioritization'],
      execution_mode: 'mixed',
      stage: 'execution',
      position: 10,
    },
    {
      project_id: project.id,
      sprint_number: sprintNumber,
      title: `Sprint ${sprintNumber} · Frontend MVP · ${project.name}`,
      description: 'Front Dev construye la capa de experiencia visible del MVP según PRD, UX concept y planning aprobado.',
      status: 'backlog',
      priority: 'high',
      type: 'feature',
      assignee_slug: 'front-dev',
      review_owner_slug: 'dev-lead',
      tags: ['frontend', 'mvp', 'sprint'],
      required_skills: ['react', 'frontend architecture', 'ui delivery'],
      execution_mode: 'build',
      stage: 'execution',
      position: 11,
    },
    {
      project_id: project.id,
      sprint_number: sprintNumber,
      title: `Sprint ${sprintNumber} · Backend core · ${project.name}`,
      description: 'Back Dev implementa servicios core, datos y automatizaciones mínimas para soportar el MVP.',
      status: 'backlog',
      priority: 'high',
      type: 'feature',
      assignee_slug: 'back-dev',
      review_owner_slug: 'dev-lead',
      tags: ['backend', 'api', 'sprint'],
      required_skills: ['apis', 'database design', 'automation'],
      execution_mode: 'build',
      stage: 'execution',
      position: 12,
    },
    {
      project_id: project.id,
      sprint_number: sprintNumber,
      title: `Sprint ${sprintNumber} · Security gate · ${project.name}`,
      description: 'Security Dev revisa amenazas, autenticación, protección de datos y criterios de release del sprint.',
      status: 'backlog',
      priority: 'medium',
      type: 'task',
      assignee_slug: 'security-dev',
      review_owner_slug: 'dev-lead',
      tags: ['security', 'review', 'sprint'],
      required_skills: ['security review', 'data protection', 'risk analysis'],
      execution_mode: 'review',
      stage: 'review',
      position: 13,
    },
  ] satisfies Array<{
    project_id: string
    sprint_number: number
    title: string
    description: string
    status: string
    priority: string
    type: string
    assignee_slug: string
    review_owner_slug: string
    tags: string[]
    required_skills: string[]
    execution_mode: string
    stage: string
    position: number
  }>

  const { data: existingItems, error: existingItemsError } = await supabase
    .from('backlog_items')
    .select('id, title')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)

  if (existingItemsError) {
    throw new Error(existingItemsError.message)
  }

  const existingTitles = new Set((existingItems || []).map((item) => item.title))
  const tasksToInsert = sprintTasks.filter((item) => !existingTitles.has(item.title))

  if (tasksToInsert.length > 0) {
    const { error: insertTasksError } = await supabase
      .from('backlog_items')
      .insert(tasksToInsert)
    if (insertTasksError) {
      throw new Error(insertTasksError.message)
    }
  }

  const { data: sprintBacklogItems, error: sprintBacklogItemsError } = await supabase
    .from('backlog_items')
    .select('id, title')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)

  if (sprintBacklogItemsError) {
    throw new Error(sprintBacklogItemsError.message)
  }

  const taskIdByTitle = new Map((sprintBacklogItems || []).map((item) => [item.title, item.id]))
  const dependenciesToUpsert = buildSprintDependencyRows({
    breakdownId: taskIdByTitle.get(`Sprint ${sprintNumber} · Product breakdown · ${project.name}`),
    frontendId: taskIdByTitle.get(`Sprint ${sprintNumber} · Frontend MVP · ${project.name}`),
    backendId: taskIdByTitle.get(`Sprint ${sprintNumber} · Backend core · ${project.name}`),
    securityId: taskIdByTitle.get(`Sprint ${sprintNumber} · Security gate · ${project.name}`),
  })

  if (dependenciesToUpsert.length > 0) {
    const { error: dependencyUpsertError } = await supabase
      .from('backlog_item_dependencies')
      .upsert(dependenciesToUpsert, {
        onConflict: 'backlog_item_id,depends_on_backlog_item_id',
        ignoreDuplicates: true,
      })

    if (dependencyUpsertError) {
      throw new Error(dependencyUpsertError.message)
    }
  }

  const { error: updateProjectError } = await supabase
    .from('projects')
    .update({
      planning_approved_at: new Date().toISOString(),
      current_sprint_number: sprintNumber,
      execution_status: 'sprint_ready',
      delivery_status: 'sprint_ready',
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)

  if (updateProjectError) {
    throw new Error(updateProjectError.message)
  }

  const { data: idea } = await supabase
    .from('business_ideas')
    .select('id')
    .eq('promoted_project_id', project.id)
    .single()

  if (idea?.id) {
    await supabase
      .from('business_ideas')
      .update({
        workflow_stage: 'sprint_execution',
        automation_status: 'completed',
      })
      .eq('id', idea.id)
  }

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  revalidatePath(`/mission-control/proyectos/${project.slug}`)
  return { success: true, sprintNumber }
}

export async function startProjectSprint(projectId: string) {
  const supabase = await createPrivilegedServerClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, slug, current_sprint_number')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new Error(projectError?.message || 'Proyecto no encontrado.')
  }

  const sprintNumber = project.current_sprint_number || 1

  const { error: sprintError } = await supabase
    .from('project_sprints')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)

  if (sprintError) {
    throw new Error(sprintError.message)
  }

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({
      execution_status: 'sprint_in_progress',
      sprint_review_status: 'not_started',
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)

  if (projectUpdateError) {
    throw new Error(projectUpdateError.message)
  }

  revalidatePath(`/mission-control/proyectos/${project.slug}`)
  revalidatePath('/mission-control/proyectos')
  return { success: true }
}

export async function requestProjectSprintReview(projectId: string) {
  const supabase = await createPrivilegedServerClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new Error(projectError?.message || 'Proyecto no encontrado.')
  }

  const sprintNumber = project.current_sprint_number || 1
  const { data: sprintItems, error: sprintItemsError } = await supabase
    .from('backlog_items')
    .select('id, title, assignee_slug, status, artifact_markdown')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)

  if (sprintItemsError) {
    throw new Error(sprintItemsError.message)
  }

  const pending = (sprintItems || []).filter((item) => item.status !== 'done')
  if (pending.length > 0) {
    throw new Error('Todavía hay tareas del sprint sin completar. Mueve todas a done antes de pedir sprint review.')
  }

  const { data: sprintAgent, error: sprintAgentError } = await supabase
    .from('agents')
    .select('name, slug, team, role, soul_short, skills, responsibilities, llm_model')
    .eq('slug', 'hermes')
    .single()

  if (sprintAgentError || !sprintAgent) {
    throw new Error(sprintAgentError?.message || 'No se encontró Hermes.')
  }

  const { data: sprintRow, error: sprintRowError } = await supabase
    .from('project_sprints')
    .select('*')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)
    .single()

  if (sprintRowError || !sprintRow) {
    throw new Error(sprintRowError?.message || 'Sprint no encontrado.')
  }

  const generated = await generateProjectArtifactWithHermes({
    artifact: 'sprint-review',
    agent: sprintAgent,
    project: {
      name: project.name,
      slug: project.slug,
      description: project.description,
      prdMarkdown: project.prd_markdown,
      planningMarkdown: project.planning_markdown,
      sprintNumber,
      sprintGoal: sprintRow.goal,
      completedTasks: (sprintItems || []).map((item) => ({
        title: item.title,
        assignee_slug: item.assignee_slug,
        artifact_markdown: item.artifact_markdown,
      })),
    },
  })

  const { error: sprintUpdateError } = await supabase
    .from('project_sprints')
    .update({
      status: 'in_review',
      review_markdown: generated.content,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)

  if (sprintUpdateError) {
    throw new Error(sprintUpdateError.message)
  }

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({
      execution_status: 'sprint_review',
      sprint_review_status: 'ready',
      sprint_review_notes: generated.content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)

  if (projectUpdateError) {
    throw new Error(projectUpdateError.message)
  }

  const { data: idea } = await supabase
    .from('business_ideas')
    .select('id')
    .eq('promoted_project_id', project.id)
    .single()

  if (idea?.id) {
    await supabase
      .from('business_ideas')
      .update({
        workflow_stage: 'sprint_review',
        automation_status: 'needs_feedback',
        review_requested_at: new Date().toISOString(),
      })
      .eq('id', idea.id)
  }

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  revalidatePath(`/mission-control/proyectos/${project.slug}`)
  return { success: true }
}

export async function approveProjectSprintReview(projectId: string) {
  const supabase = await createPrivilegedServerClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new Error(projectError?.message || 'Proyecto no encontrado.')
  }

  const sprintNumber = project.current_sprint_number || 1

  const { error: sprintUpdateError } = await supabase
    .from('project_sprints')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)

  if (sprintUpdateError) {
    throw new Error(sprintUpdateError.message)
  }

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({
      execution_status: 'done',
      sprint_review_status: 'approved',
      delivery_status: 'done',
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)

  if (projectUpdateError) {
    throw new Error(projectUpdateError.message)
  }

  const { data: idea } = await supabase
    .from('business_ideas')
    .select('id')
    .eq('promoted_project_id', project.id)
    .single()

  if (idea?.id) {
    await supabase
      .from('business_ideas')
      .update({
        workflow_stage: 'done',
        automation_status: 'completed',
      })
      .eq('id', idea.id)
  }

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  revalidatePath(`/mission-control/proyectos/${project.slug}`)
  return { success: true }
}

async function fetchIdea(ideaId: string) {
  const supabase = await createPrivilegedServerClient()
  const { data: idea, error } = await supabase
    .from('business_ideas')
    .select('*')
    .eq('id', ideaId)
    .single()

  if (error || !idea) {
    return null
  }

  return idea as IdeaRow
}
