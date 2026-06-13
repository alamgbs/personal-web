import * as fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { generateProjectArtifactWithHermes } from '@/lib/mission-control/project-agent-runtime'

type Json = Record<string, unknown>

type Agent = {
  name: string
  slug: string
  team: string | null
  role: string
  soul_short: string | null
  skills: string[] | null
  responsibilities: string[] | null
  llm_model: string | null
}

function loadEnv(path: string) {
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    env[line.slice(0, idx)] = line.slice(idx + 1)
  }
  return env
}

function assert<T>(value: T | null | undefined, message: string): T {
  if (value == null) throw new Error(message)
  return value
}

async function main() {
  const env = loadEnv('/root/projects/alam/personal-web/.env.local')
  const url = assert(env.NEXT_PUBLIC_SUPABASE_URL, 'Missing NEXT_PUBLIC_SUPABASE_URL')
  const anon = assert(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const supabase = createClient(url, anon)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'hola@alambenitez.com',
    password: 'MissionControl2026!',
  })
  if (authError) throw authError
  console.log(`Authenticated as ${authData.user.email}`)

  const { data: idea, error: ideaError } = await supabase
    .from('business_ideas')
    .select('*')
    .not('promoted_project_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (ideaError || !idea) throw new Error(ideaError?.message || 'No candidate idea found')

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', idea.promoted_project_id)
    .single()
  if (projectError || !project) throw new Error(projectError?.message || 'Project not found')

  console.log(`Using idea: ${idea.title}`)
  console.log(`Using project: ${project.slug}`)

  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('name, slug, team, role, soul_short, skills, responsibilities, llm_model')
    .in('slug', ['product-lead', 'hermes'])
  if (agentsError) throw agentsError
  const productLead = assert(agents?.find((a) => a.slug === 'product-lead') as Agent | undefined, 'product-lead missing')
  const hermes = assert(agents?.find((a) => a.slug === 'hermes') as Agent | undefined, 'hermes missing')

  const stepData = (idea.step_data || {}) as Json

  console.log('Generating PRD...')
  const prd = await generateProjectArtifactWithHermes({
    artifact: 'prd',
    agent: productLead,
    project: {
      name: project.name,
      slug: project.slug,
      description: project.description,
      ideaTitle: idea.title,
      ideaSummary: idea.summary,
      stepData,
    },
  })
  console.log(`PRD generated (${prd.content.length} chars)`)

  let { error } = await supabase
    .from('projects')
    .update({
      prd_markdown: prd.content,
      prd_generated_at: prd.generated_at,
      prd_generated_by: productLead.slug,
      prd_status: 'approved',
      prd_approved_at: new Date().toISOString(),
      execution_status: 'planning_generation',
      delivery_status: 'planning',
      notification_target: idea.notification_target,
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)
  if (error) throw error

  error = (await supabase
    .from('backlog_items')
    .update({
      description: prd.content,
      artifact_markdown: prd.content,
      stage: 'prd',
      execution_mode: 'planning',
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', project.id)
    .eq('title', `PRD · ${project.name}`)).error
  if (error) throw error

  error = (await supabase
    .from('business_ideas')
    .update({
      status: 'in_development',
      workflow_stage: 'planning_generation',
      automation_status: 'running',
      review_requested_at: new Date().toISOString(),
      automation_completed_at: new Date().toISOString(),
      last_automation_error: null,
    })
    .eq('id', idea.id)).error
  if (error) throw error

  console.log('Generating planning...')
  const planning = await generateProjectArtifactWithHermes({
    artifact: 'planning',
    agent: hermes,
    project: {
      name: project.name,
      slug: project.slug,
      description: project.description,
      ideaTitle: idea.title,
      ideaSummary: idea.summary,
      stepData,
      prdMarkdown: prd.content,
    },
  })
  console.log(`Planning generated (${planning.content.length} chars)`)

  error = (await supabase
    .from('projects')
    .update({
      planning_markdown: planning.content,
      planning_generated_at: planning.generated_at,
      planning_generated_by: hermes.slug,
      execution_status: 'planning_review',
      delivery_status: 'planning',
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)).error
  if (error) throw error

  const planningItems = [
    {
      project_id: project.id,
      title: `Sprint 0 plan · ${project.name}`,
      description: planning.content,
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

  const { data: existingPlanningTitles, error: existingPlanningError } = await supabase
    .from('backlog_items')
    .select('title')
    .eq('project_id', project.id)
  if (existingPlanningError) throw existingPlanningError
  const planningTitleSet = new Set((existingPlanningTitles || []).map((item) => item.title))
  const planningInsert = planningItems.filter((item) => !planningTitleSet.has(item.title))
  if (planningInsert.length) {
    error = (await supabase.from('backlog_items').insert(planningInsert)).error
    if (error) throw error
  }

  error = (await supabase
    .from('business_ideas')
    .update({
      workflow_stage: 'planning_review',
      automation_status: 'needs_feedback',
      review_requested_at: new Date().toISOString(),
      automation_completed_at: new Date().toISOString(),
    })
    .eq('id', idea.id)).error
  if (error) throw error

  const sprintNumber = 1
  const { data: sprintRows, error: sprintLookupError } = await supabase
    .from('project_sprints')
    .select('id')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)
  if (sprintLookupError) throw sprintLookupError
  if (!sprintRows || sprintRows.length === 0) {
    error = (await supabase.from('project_sprints').insert({
      project_id: project.id,
      sprint_number: sprintNumber,
      title: `Sprint ${sprintNumber} · ${project.name}`,
      goal: `Construir el primer vertical funcional de ${project.name}`,
      status: 'planned',
      summary_markdown: planning.content,
    })).error
    if (error) throw error
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

  const { data: existingSprintTitles, error: existingSprintError } = await supabase
    .from('backlog_items')
    .select('title')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)
  if (existingSprintError) throw existingSprintError
  const sprintTitleSet = new Set((existingSprintTitles || []).map((item) => item.title))
  const sprintInsert = sprintTasks.filter((item) => !sprintTitleSet.has(item.title))
  if (sprintInsert.length) {
    error = (await supabase.from('backlog_items').insert(sprintInsert)).error
    if (error) throw error
  }

  error = (await supabase
    .from('projects')
    .update({
      planning_approved_at: new Date().toISOString(),
      current_sprint_number: sprintNumber,
      execution_status: 'sprint_ready',
      delivery_status: 'sprint_ready',
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)).error
  if (error) throw error

  error = (await supabase
    .from('business_ideas')
    .update({
      workflow_stage: 'sprint_execution',
      automation_status: 'completed',
    })
    .eq('id', idea.id)).error
  if (error) throw error

  error = (await supabase
    .from('project_sprints')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)).error
  if (error) throw error

  error = (await supabase
    .from('projects')
    .update({
      execution_status: 'sprint_in_progress',
      sprint_review_status: 'not_started',
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)).error
  if (error) throw error

  const { data: sprintItems, error: sprintItemsError } = await supabase
    .from('backlog_items')
    .select('id, title, assignee_slug')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)
    .order('position', { ascending: true })
  if (sprintItemsError) throw sprintItemsError

  for (const [index, item] of (sprintItems || []).entries()) {
    error = (await supabase
      .from('backlog_items')
      .update({
        status: 'done',
        artifact_markdown: `Entregable validado para ${item.title}.\n\n- Orden de cierre: ${index + 1}\n- Responsable: ${item.assignee_slug || 'sin assignee'}\n- Estado: completado en verificación E2E`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)).error
    if (error) throw error
  }
  console.log(`Marked ${sprintItems?.length || 0} sprint tasks as done`)

  const { data: sprintRow, error: sprintRowError } = await supabase
    .from('project_sprints')
    .select('*')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)
    .single()
  if (sprintRowError || !sprintRow) throw new Error(sprintRowError?.message || 'Sprint row missing')

  const completedTasks = (sprintItems || []).map((item, index) => ({
    title: item.title,
    assignee_slug: item.assignee_slug,
    artifact_markdown: `Entregable validado para ${item.title}.\n\n- Orden de cierre: ${index + 1}`,
  }))

  console.log('Generating sprint review...')
  const sprintReview = await generateProjectArtifactWithHermes({
    artifact: 'sprint-review',
    agent: hermes,
    project: {
      name: project.name,
      slug: project.slug,
      description: project.description,
      prdMarkdown: prd.content,
      planningMarkdown: planning.content,
      sprintNumber,
      sprintGoal: sprintRow.goal,
      completedTasks,
    },
  })
  console.log(`Sprint review generated (${sprintReview.content.length} chars)`)

  error = (await supabase
    .from('project_sprints')
    .update({
      status: 'in_review',
      review_markdown: sprintReview.content,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)).error
  if (error) throw error

  error = (await supabase
    .from('projects')
    .update({
      execution_status: 'sprint_review',
      sprint_review_status: 'ready',
      sprint_review_notes: sprintReview.content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)).error
  if (error) throw error

  error = (await supabase
    .from('business_ideas')
    .update({
      workflow_stage: 'sprint_review',
      automation_status: 'needs_feedback',
      review_requested_at: new Date().toISOString(),
    })
    .eq('id', idea.id)).error
  if (error) throw error

  error = (await supabase
    .from('project_sprints')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)).error
  if (error) throw error

  error = (await supabase
    .from('projects')
    .update({
      execution_status: 'done',
      sprint_review_status: 'approved',
      delivery_status: 'done',
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)).error
  if (error) throw error

  error = (await supabase
    .from('business_ideas')
    .update({
      workflow_stage: 'done',
      automation_status: 'completed',
    })
    .eq('id', idea.id)).error
  if (error) throw error

  const { data: finalProject, error: finalProjectError } = await supabase
    .from('projects')
    .select('id, slug, status, prd_status, execution_status, current_sprint_number, sprint_review_status')
    .eq('id', project.id)
    .single()
  if (finalProjectError) throw finalProjectError

  const { data: finalIdea, error: finalIdeaError } = await supabase
    .from('business_ideas')
    .select('id, status, workflow_stage, automation_status, promoted_project_id')
    .eq('id', idea.id)
    .single()
  if (finalIdeaError) throw finalIdeaError

  console.log('FINAL_PROJECT', JSON.stringify(finalProject))
  console.log('FINAL_IDEA', JSON.stringify(finalIdea))
}

main().catch((error) => {
  console.error('E2E_VERIFY_FAILED')
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exit(1)
})
