import * as fs from 'node:fs'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

type Json = Record<string, unknown>
type Agent = {
  slug: string
  name: string
  role: string
  team: string | null
  soul: string | null
  soul_short: string | null
  skills: string[] | null
  responsibilities: string[] | null
  llm_model: string | null
  cost_tier: string | null
  runtime_profile_name: string | null
  honcho_ai_peer: string | null
  runtime_status: string | null
}

type BacklogItem = {
  id: string
  project_id: string
  sprint_number: number | null
  title: string
  description: string | null
  stage: string | null
  assignee_slug: string | null
  status: string | null
  artifact_markdown: string | null
  started_at?: string | null
}

type ProjectContext = {
  name: string
  slug: string
  description: string | null
  ideaTitle?: string | null
  ideaSummary?: string | null
  stepData?: Record<string, unknown> | null
  prdMarkdown?: string | null
  planningMarkdown?: string | null
  sprintNumber?: number | null
  sprintGoal?: string | null
  completedTasks?: Array<{ title: string; assignee_slug: string | null; artifact_markdown?: string | null }>
}

const execFileAsync = promisify(execFile)
const MAX_TASKS = 6
const PROJECT_ID = 'jmpkhkpdlnltrnhvhkdx'

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

function nowIso() {
  return new Date().toISOString()
}

function getArtifactLabel(artifact: 'prd' | 'planning' | 'sprint-review' | 'task') {
  switch (artifact) {
    case 'prd':
      return 'PRD'
    case 'planning':
      return 'Planning de ejecución'
    case 'sprint-review':
      return 'Sprint review'
    case 'task':
    default:
      return 'Entregable de tarea'
  }
}

function flattenIdeaStepData(stepData: Record<string, unknown>) {
  return Object.entries(stepData)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([step, value]) => {
      const record = (value || {}) as Record<string, unknown>
      const content = typeof record.content === 'string' ? record.content.trim() : ''
      const extras = Object.entries(record)
        .filter(([key, fieldValue]) => key !== 'content' && typeof fieldValue === 'string' && fieldValue.trim())
        .map(([key, fieldValue]) => `- ${key}: ${String(fieldValue).trim()}`)
        .join('\n')
      return [`Paso ${Number(step) + 1}`, content, extras].filter(Boolean).join('\n')
    })
    .join('\n\n')
}

function extractHermesContent(stdout: string) {
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('session_id:'))
    .join('\n')
    .trim()
}

async function generateArtifact(params: {
  artifact: 'prd' | 'planning' | 'sprint-review' | 'task'
  agent: Agent
  project: ProjectContext
  taskTitle?: string
  taskDescription?: string | null
  dependencies?: Array<Record<string, unknown>>
}) {
  const artifactLabel = getArtifactLabel(params.artifact)
  const prompt = [
    `Eres ${params.agent.name} dentro de Mission Control.`,
    `Tu rol: ${params.agent.role}.`,
    params.agent.team ? `Equipo: ${params.agent.team}.` : null,
    params.agent.soul_short ? `Soul: ${params.agent.soul_short}` : null,
    params.agent.skills?.length ? `Skills: ${params.agent.skills.join(', ')}.` : null,
    '',
    `Necesitas generar el artefacto "${artifactLabel}" para el proyecto "${params.project.name}" (${params.project.slug}).`,
    params.taskTitle ? `Tarea asignada: ${params.taskTitle}.` : null,
    params.taskDescription ? `Descripción de la tarea:\n${params.taskDescription}` : null,
    params.project.description ? `Descripción del proyecto: ${params.project.description}` : null,
    params.project.ideaTitle ? `Idea origen: ${params.project.ideaTitle}` : null,
    params.project.ideaSummary ? `Resumen de la idea: ${params.project.ideaSummary}` : null,
    params.project.stepData ? `Contexto del análisis de idea:\n${flattenIdeaStepData(params.project.stepData)}` : null,
    params.project.prdMarkdown ? `PRD disponible:\n${params.project.prdMarkdown}` : null,
    params.project.planningMarkdown ? `Planning disponible:\n${params.project.planningMarkdown}` : null,
    params.project.sprintNumber ? `Sprint actual: ${params.project.sprintNumber}` : null,
    params.project.sprintGoal ? `Objetivo del sprint: ${params.project.sprintGoal}` : null,
    params.dependencies?.length
      ? `Artefactos previos completados:\n${params.dependencies
          .map((task, index) => `${index + 1}. ${String(task.title || '')} · ${String(task.assignee_slug || 'sin assignee')}\n${String(task.artifact_markdown || 'Sin artefacto adjunto.')}`)
          .join('\n\n')}`
      : null,
    '',
    params.artifact === 'prd'
      ? [
          'Objetivo del artefacto:',
          '- Redacta un PRD listo para revisión del owner.',
          '- Debe incluir contexto, problema, objetivos, alcance, user stories, criterios de aceptación, riesgos, dependencias, métricas y definición de done.',
        ].join('\n')
      : params.artifact === 'planning'
        ? [
            'Objetivo del artefacto:',
            '- Genera un planning de delivery listo para revisión del owner.',
            '- Debe incluir workstreams, secuencia recomendada, roles responsables, riesgos, dependencias, plan de sprint 1 y criterios para cerrar el sprint review.',
          ].join('\n')
        : params.artifact === 'sprint-review'
          ? [
              'Objetivo del artefacto:',
              '- Consolida un sprint review ejecutivo.',
              '- Resume entregables completados, riesgos abiertos, decisiones tomadas, criterios pendientes y recomendación de aprobar o pedir cambios.',
            ].join('\n')
          : [
              'Objetivo del artefacto:',
              '- Entrega el resultado concreto de la tarea asignada.',
              '- Incluye decisión tomada, entregables producidos, riesgos abiertos, dependencias siguientes y checklist breve de verificación.',
            ].join('\n'),
    '',
    'Formato obligatorio de salida:',
    '- Responde solo en español.',
    '- No hables de ti mismo ni menciones que eres una IA.',
    '- Entrega markdown ejecutivo, claro y accionable.',
    '- Usa subtítulos y bullets.',
    '- No incluyas fences de código ni JSON.',
  ]
    .filter(Boolean)
    .join('\n')

  const args = ['chat', '-q', prompt, '-Q', '--toolsets', 'web', '--skills', 'mission-control-workflows,hermes-agent', '--source', 'tool']
  const { stdout, stderr } = await execFileAsync('hermes', args, {
    cwd: process.cwd(),
    timeout: 240000,
    maxBuffer: 1024 * 1024,
  })
  const content = extractHermesContent(stdout)
  if (!content) throw new Error(stderr?.trim() || `Hermes no devolvió contenido para ${artifactLabel}.`)
  return content
}

const env = loadEnv('/root/projects/alam/personal-web/.env.local')
const url = assert(env.NEXT_PUBLIC_SUPABASE_URL, 'Missing NEXT_PUBLIC_SUPABASE_URL')
const serviceRole = assert(env.SUPABASE_SERVICE_ROLE_KEY, 'Missing SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })

const report: {
  actions: Array<Record<string, unknown>>
  awaitingApproval: Array<Record<string, unknown>>
  sprintReviewsReady: Array<Record<string, unknown>>
  errors: Array<Record<string, unknown>>
} = { actions: [], awaitingApproval: [], sprintReviewsReady: [], errors: [] }

async function fetchAgent(slug: string): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .select('slug, name, role, team, soul, soul_short, skills, responsibilities, llm_model, cost_tier, runtime_profile_name, honcho_ai_peer, runtime_status')
    .eq('slug', slug)
    .single()
  if (error || !data) throw new Error(error?.message || `Missing agent ${slug}`)
  return data as Agent
}

async function getIdeaByProject(projectId: string) {
  const { data, error } = await supabase
    .from('business_ideas')
    .select('*')
    .eq('promoted_project_id', projectId)
    .limit(1)
  if (error) throw error
  return (data?.[0] as Record<string, unknown> | undefined) || null
}

async function ensureProjectAndPrdItem(idea: Record<string, unknown>) {
  let project = null as Record<string, unknown> | null
  const promoted = idea.promoted_project_id as string | null
  if (promoted) {
    const { data } = await supabase.from('projects').select('*').eq('id', promoted).single()
    if (data) project = data as Record<string, unknown>
  }
  let createdProject = false
  if (!project) {
    const suffix = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(8, 14)
    const base = String(idea.title || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'project'
    const slug = `${base}-${suffix}`
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: idea.title,
        slug,
        description: idea.summary || idea.title,
        status: 'active',
        source_idea_id: idea.id,
        notification_target: idea.notification_target,
        prd_status: 'pending',
        delivery_status: 'waiting_prd',
        execution_status: 'pending_prd',
      })
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message || 'Failed to create project')
    project = data as Record<string, unknown>
    createdProject = true
    await supabase.from('business_ideas').update({ promoted_project_id: project.id }).eq('id', idea.id)
  }
  const prdTitle = `PRD · ${project.name}`
  let { data: items, error: itemError } = await supabase.from('backlog_items').select('*').eq('project_id', project.id).eq('title', prdTitle)
  if (itemError) throw itemError
  if (!items || items.length === 0) {
    const { error } = await supabase.from('backlog_items').insert({
      project_id: project.id,
      title: prdTitle,
      description: `Create the first PRD draft based on the approved business analysis.\n\nIdea summary:\n${idea.summary || 'No summary provided.'}`,
      status: 'backlog',
      priority: 'high',
      type: 'feature',
      assignee_slug: 'product-lead',
      review_owner_slug: 'alam',
      execution_mode: 'planning',
      stage: 'prd',
    })
    if (error) throw error
    ;({ data: items, error: itemError } = await supabase.from('backlog_items').select('*').eq('project_id', project.id).eq('title', prdTitle))
    if (itemError) throw itemError
  }
  return { project: assert(project, 'project missing'), prdItem: assert(items?.[0] as BacklogItem | undefined, 'prd item missing'), createdProject }
}

async function claimItem(item: BacklogItem) {
  const t = nowIso()
  const currentAttempts = (item as unknown as { attempt_count?: number | null }).attempt_count || 0
  await supabase
    .from('backlog_items')
    .update({
      status: 'claimed',
      claimed_by: 'hermes',
      claimed_at: t,
      attempt_count: currentAttempts + 1,
      last_error: null,
      updated_at: t,
    })
    .eq('id', item.id)
    .eq('status', 'backlog')
  const { data, error } = await supabase.from('backlog_items').select('*').eq('id', item.id).single()
  if (error || !data || data.status !== 'claimed') return null
  await supabase
    .from('backlog_items')
    .update({ status: 'running', started_at: data.started_at || t, heartbeat_at: t, updated_at: t })
    .eq('id', item.id)
  const refreshed = await supabase.from('backlog_items').select('*').eq('id', item.id).single()
  if (refreshed.error || !refreshed.data) return null
  return refreshed.data as BacklogItem
}

async function markSuccess(itemId: string, artifact: string, status: 'review' | 'done') {
  const t = nowIso()
  const { error } = await supabase
    .from('backlog_items')
    .update({ status, artifact_markdown: artifact, completed_at: t, updated_at: t, last_error: null, heartbeat_at: t })
    .eq('id', itemId)
  if (error) throw error
}

async function markFailure(itemId: string, message: string) {
  const t = nowIso()
  await supabase
    .from('backlog_items')
    .update({ status: 'failed', last_error: message.slice(0, 280), claimed_by: null, heartbeat_at: t, updated_at: t })
    .eq('id', itemId)
}

async function dependencyOutputs(itemId: string) {
  const { data: deps, error: depError } = await supabase
    .from('backlog_item_dependencies')
    .select('depends_on_item_id')
    .eq('backlog_item_id', itemId)
  if (depError || !deps || deps.length === 0) return [] as Array<Record<string, unknown>>
  const ids = deps.map((d) => d.depends_on_item_id)
  const { data: items, error } = await supabase
    .from('backlog_items')
    .select('title, assignee_slug, artifact_markdown, status')
    .in('id', ids)
  if (error || !items) return [] as Array<Record<string, unknown>>
  return items.filter((item) => item.status === 'done') as Array<Record<string, unknown>>
}

async function readyPlanningTasks() {
  const { data, error } = await supabase
    .from('backlog_items')
    .select('*, projects!inner(id, name, slug, description, prd_markdown, planning_markdown, execution_status)')
    .eq('status', 'backlog')
    .eq('stage', 'planning')
    .eq('projects.execution_status', 'planning_review')
    .limit(MAX_TASKS)
  if (error) throw error
  const ready: Array<{ item: BacklogItem; project: Record<string, unknown> }> = []
  for (const row of data || []) {
    const { data: deps, error: depError } = await supabase
      .from('backlog_item_dependencies')
      .select('depends_on_item_id, backlog_items!inner(status)')
      .eq('backlog_item_id', row.id)
    if (depError) throw depError
    const blocked = (deps || []).some((dep) => {
      const related = dep.backlog_items as { status?: string } | { status?: string }[] | null
      const first = Array.isArray(related) ? related[0] : related
      return first?.status !== 'done'
    })
    if (!blocked) ready.push({ item: row as BacklogItem, project: row.projects as unknown as Record<string, unknown> })
  }
  return ready.slice(0, MAX_TASKS)
}

async function readySprintTasks() {
  const { data, error } = await supabase
    .from('backlog_items')
    .select('*, projects!inner(id, name, slug, description, prd_markdown, planning_markdown, execution_status, current_sprint_number)')
    .eq('status', 'backlog')
    .in('stage', ['execution', 'security', 'review'])
    .eq('projects.execution_status', 'sprint_in_progress')
    .limit(MAX_TASKS)
  if (error) throw error
  const ready: Array<{ item: BacklogItem; project: Record<string, unknown> }> = []
  for (const row of data || []) {
    const project = row.projects as unknown as Record<string, unknown>
    if (row.sprint_number !== project.current_sprint_number) continue
    const { data: deps, error: depError } = await supabase
      .from('backlog_item_dependencies')
      .select('depends_on_item_id, backlog_items!inner(status)')
      .eq('backlog_item_id', row.id)
    if (depError) throw depError
    const blocked = (deps || []).some((dep) => {
      const related = dep.backlog_items as { status?: string } | { status?: string }[] | null
      const first = Array.isArray(related) ? related[0] : related
      return first?.status !== 'done'
    })
    if (!blocked) ready.push({ item: row as BacklogItem, project })
  }
  return ready.slice(0, MAX_TASKS)
}

async function executeAssignedItem(item: BacklogItem, project: Record<string, unknown>, finalStatus: 'review' | 'done') {
  const claimed = await claimItem(item)
  if (!claimed) return false
  try {
    const agent = await fetchAgent(assert(claimed.assignee_slug, `Item ${claimed.id} missing assignee`))
    const deps = await dependencyOutputs(claimed.id)
    const artifactType = claimed.stage === 'prd' ? 'prd' : claimed.stage === 'planning' ? 'task' : 'task'
    const generated = await generateArtifact({
      artifact: artifactType,
      agent,
      taskTitle: claimed.title,
      taskDescription: claimed.description,
      dependencies: deps,
      project: {
        name: String(project.name),
        slug: String(project.slug),
        description: (project.description as string | null) || null,
        prdMarkdown: (project.prd_markdown as string | null) || null,
        planningMarkdown: (project.planning_markdown as string | null) || null,
        sprintNumber: (claimed.sprint_number as number | null) || null,
      },
    })
    await markSuccess(claimed.id, generated, finalStatus)
    report.actions.push({ project: project.name, task: claimed.title, agent: agent.slug, stage: claimed.stage })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    await markFailure(claimed.id, message)
    report.errors.push({ task: item.title, error: message })
    return false
  }
}

async function maybePrepareSprintReview(project: Record<string, unknown>) {
  const sprintNumber = Number(project.current_sprint_number || 1)
  const { data: items, error: itemError } = await supabase
    .from('backlog_items')
    .select('id, title, assignee_slug, status, artifact_markdown')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)
  if (itemError) throw itemError
  if (!items || items.length === 0 || items.some((item) => item.status !== 'done')) return false
  const { data: sprint, error: sprintError } = await supabase
    .from('project_sprints')
    .select('*')
    .eq('project_id', project.id)
    .eq('sprint_number', sprintNumber)
    .single()
  if (sprintError || !sprint) throw new Error(sprintError?.message || 'Sprint missing')
  const hermes = await fetchAgent('hermes')
  const generated = await generateArtifact({
    artifact: 'sprint-review',
    agent: hermes,
    project: {
      name: String(project.name),
      slug: String(project.slug),
      description: (project.description as string | null) || null,
      prdMarkdown: (project.prd_markdown as string | null) || null,
      planningMarkdown: (project.planning_markdown as string | null) || null,
      sprintNumber,
      sprintGoal: (sprint.goal as string | null) || null,
      completedTasks: (items || []).map((item) => ({ title: item.title, assignee_slug: item.assignee_slug, artifact_markdown: item.artifact_markdown })),
    },
  })
  const t = nowIso()
  await supabase.from('project_sprints').update({ status: 'in_review', review_markdown: generated, completed_at: t, updated_at: t }).eq('project_id', project.id).eq('sprint_number', sprintNumber)
  await supabase.from('projects').update({ execution_status: 'sprint_review', sprint_review_status: 'ready', delivery_status: 'sprint_review', sprint_review_notes: generated, updated_at: t }).eq('id', project.id)
  const idea = await getIdeaByProject(String(project.id))
  if (idea) {
    await supabase.from('business_ideas').update({ workflow_stage: 'sprint_review', automation_status: 'needs_feedback', review_requested_at: t }).eq('id', idea.id)
  }
  report.actions.push({ project: project.name, task: `Sprint review · ${project.name}`, agent: 'hermes', stage: 'sprint-review' })
  report.sprintReviewsReady.push({ project: project.name, sprint: sprintNumber })
  return true
}

async function main() {
  const { data: projectProbe, error: projectProbeError } = await supabase.from('projects').select('id').eq('id', PROJECT_ID).limit(1)
  if (projectProbeError) throw projectProbeError
  if (!projectProbe || projectProbe.length === 0) throw new Error(`Project ${PROJECT_ID} not found or inaccessible`)

  let processed = 0

  const { data: prdIdeas, error: prdIdeaError } = await supabase
    .from('business_ideas')
    .select('*')
    .eq('status', 'approved')
    .eq('workflow_stage', 'prd_generation')
    .in('automation_status', ['queued', 'running', 'failed'])
  if (prdIdeaError) throw prdIdeaError
  for (const idea of prdIdeas || []) {
    if (processed >= MAX_TASKS) break
    try {
      const { project, prdItem, createdProject } = await ensureProjectAndPrdItem(idea as Record<string, unknown>)
      const ok = await executeAssignedItem(prdItem, project, 'review')
      if (!ok) continue
      const item = await supabase.from('backlog_items').select('artifact_markdown').eq('id', prdItem.id).single()
      const artifact = item.data?.artifact_markdown || ''
      const t = nowIso()
      await supabase.from('projects').update({ prd_markdown: artifact, prd_status: 'draft', prd_generated_at: t, prd_generated_by: 'product-lead', execution_status: 'prd_review', delivery_status: 'waiting_prd_approval', updated_at: t }).eq('id', project.id)
      await supabase.from('business_ideas').update({ promoted_project_id: project.id, status: 'in_development', workflow_stage: 'prd_review', automation_status: 'needs_feedback', review_requested_at: t }).eq('id', idea.id)
      report.actions.push({ project: project.name, task: 'Project promoted for PRD', createdProject, agent: 'hermes', stage: 'promotion' })
      report.awaitingApproval.push({ project: project.name, type: 'PRD' })
      processed += 1
    } catch (error) {
      report.errors.push({ idea: idea.title, error: error instanceof Error ? error.message : String(error) })
    }
  }

  if (processed < MAX_TASKS) {
    const { data: planningProjects, error } = await supabase.from('projects').select('*').eq('prd_status', 'approved').eq('execution_status', 'planning_generation')
    if (error) throw error
    for (const project of planningProjects || []) {
      if (processed >= MAX_TASKS) break
      try {
        const idea = await getIdeaByProject(String(project.id))
        const hermes = await fetchAgent('hermes')
        const generated = await generateArtifact({
          artifact: 'planning',
          agent: hermes,
          project: {
            name: String(project.name),
            slug: String(project.slug),
            description: (project.description as string | null) || null,
            ideaTitle: (idea?.title as string | null) || null,
            ideaSummary: (idea?.summary as string | null) || null,
            stepData: (idea?.step_data as Json | null) || null,
            prdMarkdown: (project.prd_markdown as string | null) || null,
          },
        })
        const t = nowIso()
        await supabase.from('projects').update({ planning_markdown: generated, planning_generated_at: t, planning_generated_by: 'hermes', execution_status: 'planning_review', delivery_status: 'planning_review', updated_at: t }).eq('id', project.id)
        const tasks = [
          { title: `Sprint 0 plan · ${project.name}`, assignee_slug: 'dev-lead', review_owner_slug: 'alam', description: generated, priority: 'high' },
          { title: `UX concept · ${project.name}`, assignee_slug: 'ux-ui', review_owner_slug: 'product-lead', description: 'UX/UI aterriza journeys, pantallas y constraints del MVP a partir del PRD aprobado y el planning consolidado.', priority: 'medium' },
          { title: `Validation memo · ${project.name}`, assignee_slug: 'research', review_owner_slug: 'product-lead', description: 'Research arma memo de benchmark, riesgos y métricas a vigilar durante sprint planning.', priority: 'medium' },
        ]
        const { data: existingItems } = await supabase.from('backlog_items').select('title').eq('project_id', project.id)
        const titleSet = new Set((existingItems || []).map((item) => item.title))
        for (const [index, task] of tasks.entries()) {
          if (titleSet.has(task.title)) continue
          await supabase.from('backlog_items').insert({
            project_id: project.id,
            title: task.title,
            description: task.description,
            status: 'backlog',
            priority: task.priority,
            type: 'task',
            assignee_slug: task.assignee_slug,
            review_owner_slug: task.review_owner_slug,
            execution_mode: 'planning',
            stage: 'planning',
            position: index + 1,
          })
        }
        if (idea) {
          await supabase.from('business_ideas').update({ workflow_stage: 'planning_review', automation_status: 'needs_feedback', review_requested_at: t }).eq('id', idea.id)
        }
        report.actions.push({ project: project.name, task: `Planning · ${project.name}`, agent: 'hermes', stage: 'planning' })
        report.awaitingApproval.push({ project: project.name, type: 'planning' })
        processed += 1
      } catch (error) {
        report.errors.push({ project: project.name, error: error instanceof Error ? error.message : String(error) })
      }
    }
  }

  if (processed < MAX_TASKS) {
    const planningTasks = await readyPlanningTasks()
    for (const entry of planningTasks) {
      if (processed >= MAX_TASKS) break
      const ok = await executeAssignedItem(entry.item, entry.project, 'done')
      if (ok) processed += 1
    }
  }

  if (processed < MAX_TASKS) {
    const { data: sprintReadyProjects, error } = await supabase.from('projects').select('*').eq('execution_status', 'sprint_ready').gte('current_sprint_number', 1)
    if (error) throw error
    for (const project of sprintReadyProjects || []) {
      if (processed >= MAX_TASKS) break
      const sprintNumber = Number(project.current_sprint_number || 1)
      const t = nowIso()
      await supabase.from('project_sprints').update({ status: 'in_progress', started_at: t, updated_at: t }).eq('project_id', project.id).eq('sprint_number', sprintNumber)
      await supabase.from('projects').update({ execution_status: 'sprint_in_progress', delivery_status: 'sprint_execution', updated_at: t }).eq('id', project.id)
      const idea = await getIdeaByProject(String(project.id))
      if (idea) {
        await supabase.from('business_ideas').update({ workflow_stage: 'sprint_execution', automation_status: 'running' }).eq('id', idea.id)
      }
      report.actions.push({ project: project.name, task: `Sprint ${sprintNumber} started`, agent: 'hermes', stage: 'sprint-start' })
      processed += 1
    }
  }

  if (processed < MAX_TASKS) {
    const sprintTasks = await readySprintTasks()
    for (const entry of sprintTasks) {
      if (processed >= MAX_TASKS) break
      const ok = await executeAssignedItem(entry.item, entry.project, 'done')
      if (ok) processed += 1
    }
  }

  if (processed < MAX_TASKS) {
    const { data: activeProjects, error } = await supabase.from('projects').select('*').eq('execution_status', 'sprint_in_progress')
    if (error) throw error
    for (const project of activeProjects || []) {
      if (processed >= MAX_TASKS) break
      const ok = await maybePrepareSprintReview(project as Record<string, unknown>)
      if (ok) processed += 1
    }
  }

  if (report.actions.length === 0) {
    console.log('NOOP')
    return
  }
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
