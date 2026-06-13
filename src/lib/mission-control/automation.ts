import 'server-only'

import { revalidatePath } from 'next/cache'
import { createPrivilegedServerClient } from '@/lib/supabase/admin'
import { generateIdeaStepWithHermes } from '@/lib/mission-control/idea-agent-runtime'
import { IDEA_STEPS } from '@/lib/mission-control/idea-steps'
import { getIdeaStepAssignment, isIdeaStepComplete } from '@/lib/mission-control/ideas'
import { generateProjectArtifactWithHermes } from '@/lib/mission-control/project-agent-runtime'
import { isIdeaReadyForReview } from '@/lib/mission-control/workflow'

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
  const approvals = (idea.step_approvals as JsonRecord) || {}

  try {
    for (const step of IDEA_STEPS.map((_, index) => index)) {
      if (approvals[step.toString()]) {
        continue
      }

      const existing = stepData[step.toString()] as JsonRecord | undefined
      if (isIdeaStepComplete(existing)) {
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

      stepData = {
        ...stepData,
        [step.toString()]: {
          ...(existing || {}),
          content: generated.content,
          assigned_agent_slug: assignment.slug,
          assigned_agent_name: assignment.name,
          generated_at: generated.generated_at,
          generated_by: agent.slug,
          generated_by_name: agent.name,
          generation_provider: generated.provider,
          generation_model: generated.model,
        },
      }

      const { error: stepUpdateError } = await supabase
        .from('business_ideas')
        .update({
          step_data: stepData,
          current_step: step,
          status: 'in_analysis',
          workflow_stage: 'idea_pipeline',
          automation_status: 'running',
          last_automation_error: null,
        })
        .eq('id', ideaId)

      if (stepUpdateError) {
        throw new Error(stepUpdateError.message)
      }
    }

    const readyForReview = isIdeaReadyForReview(stepData)
    const { error: finalizeError } = await supabase
      .from('business_ideas')
      .update({
        step_data: stepData,
        current_step: readyForReview ? 8 : idea.current_step || 0,
        workflow_stage: readyForReview ? 'idea_review' : 'idea_pipeline',
        automation_status: readyForReview ? 'needs_feedback' : 'completed',
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

export async function queueIdeaPipelineAutomation(
  ideaId: string,
  overrides: Partial<Pick<IdeaRow, 'current_step'>> = {}
) {
  const supabase = await createPrivilegedServerClient()

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
  }

  if (typeof overrides.current_step === 'number') {
    updatePayload.current_step = overrides.current_step
  }

  const { error } = await supabase.from('business_ideas').update(updatePayload).eq('id', ideaId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/mission-control/ideas')
  return { success: true, queued: true, workflow_stage: 'idea_pipeline' as const }
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
  const supabase = await createPrivilegedServerClient()
  const idea = await fetchIdea(ideaId)

  if (!idea) {
    throw new Error('Idea no encontrada.')
  }

  const project = await ensureProjectForIdea(ideaId)

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('name, slug, team, role, soul_short, skills, responsibilities, llm_model')
    .eq('slug', 'product-lead')
    .single()

  if (agentError || !agent) {
    throw new Error(agentError?.message || 'No se encontró Product Lead.')
  }

  await supabase
    .from('projects')
    .update({ execution_status: 'pending_prd', updated_at: new Date().toISOString() })
    .eq('id', project.id)

  const generated = await generateProjectArtifactWithHermes({
    artifact: 'prd',
    agent,
    project: {
      name: project.name,
      slug: project.slug,
      description: project.description,
      ideaTitle: idea.title,
      ideaSummary: idea.summary,
      stepData: (idea.step_data as JsonRecord) || {},
    },
  })

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({
      prd_markdown: generated.content,
      prd_generated_at: generated.generated_at,
      prd_generated_by: agent.slug,
      prd_status: 'pending',
      execution_status: 'prd_review',
      notification_target: idea.notification_target,
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)

  if (projectUpdateError) {
    throw new Error(projectUpdateError.message)
  }

  const { error: backlogUpdateError } = await supabase
    .from('backlog_items')
    .update({
      description: generated.content,
      artifact_markdown: generated.content,
      stage: 'prd',
      execution_mode: 'planning',
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', project.id)
    .eq('title', `PRD · ${project.name}`)

  if (backlogUpdateError) {
    throw new Error(backlogUpdateError.message)
  }

  await supabase
    .from('business_ideas')
    .update({
      status: 'in_development',
      workflow_stage: 'prd_review',
      automation_status: 'needs_feedback',
      review_requested_at: new Date().toISOString(),
      automation_completed_at: new Date().toISOString(),
      last_automation_error: null,
    })
    .eq('id', idea.id)

  revalidatePath('/mission-control/ideas')
  revalidatePath('/mission-control/proyectos')
  revalidatePath(`/mission-control/proyectos/${project.slug}`)
  return { success: true, projectId: project.id }
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
  ]

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
  ]

  const { data: existingItems, error: existingItemsError } = await supabase
    .from('backlog_items')
    .select('title')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)

  if (existingItemsError) {
    throw new Error(existingItemsError.message)
  }

  const existingTitles = new Set((existingItems || []).map((item) => item.title))
  const tasksToInsert = sprintTasks.filter((item) => !existingTitles.has(item.title))

  if (tasksToInsert.length > 0) {
    const { error: insertTasksError } = await supabase.from('backlog_items').insert(tasksToInsert)
    if (insertTasksError) {
      throw new Error(insertTasksError.message)
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
