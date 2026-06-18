import { existsSync } from 'node:fs'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  computeBacklogRuntime,
  type BacklogItemRuntimeRow,
  type DependencyRow,
} from '@/lib/mission-control/backlog-runtime-core'
import { IDEA_STEPS } from '@/lib/mission-control/idea-steps'
import { getIdeaStepAssignment } from '@/lib/mission-control/ideas'
import { getRuntimeProfile } from '@/lib/mission-control/agents'

type MissionControlWorkItemStatus = 'queued' | 'claimed' | 'running' | 'completed' | 'needs_feedback' | 'failed' | 'cancelled'
type BacklogExecutableStatus = 'backlog' | 'claimed' | 'running' | 'in_progress' | 'done' | 'review' | 'failed' | 'blocked'
type ProjectArtifactKind = 'prd' | 'planning' | 'sprint-review'

type MissionControlWorkItemRow = {
  id: string
  source_type: 'business_idea_step' | 'project_artifact' | 'backlog_item_bridge'
  source_id: string
  source_step_index: number | null
  idempotency_key: string
  assignee_slug: string
  profile_name: string | null
  skill_names: string[] | null
  status: MissionControlWorkItemStatus
  priority: 'low' | 'normal' | 'high' | 'urgent'
  input_json: Record<string, unknown> | null
  claimed_by: string | null
  claimed_at: string | null
  started_at: string | null
  heartbeat_at: string | null
  completed_at: string | null
  attempt_count: number | null
  last_error: string | null
  created_at: string
  updated_at: string
}

type BacklogItemRow = BacklogItemRuntimeRow & {
  status: BacklogExecutableStatus | string | null
  runtime_profile_name: string | null
  runtime_status: string | null
  claimed_by: string | null
  claimed_at: string | null
  started_at: string | null
  heartbeat_at: string | null
  completed_at: string | null
  attempt_count: number | null
  last_error: string | null
  created_at: string
  updated_at: string
}

type AgentRow = {
  slug: string
  name: string | null
  role: string | null
  team: string | null
  soul_short: string | null
  skills: string[] | null
  responsibilities: string[] | null
  llm_model: string | null
  runtime_profile_name: string | null
  runtime_status: string | null
}

type IdeaRow = {
  id: string
  title: string
  summary: string | null
  slug: string | null
  step_data: Record<string, unknown> | null
  current_step: number | null
  workflow_stage: string | null
  automation_status: string | null
  automation_run_count: number | null
}

type ProjectRow = {
  id: string
  name: string
  slug: string
  description: string | null
  prd_markdown: string | null
  planning_markdown: string | null
  current_sprint_number: number | null
  delivery_status: string | null
  execution_status: string | null
  prd_status: string | null
  sprint_review_status: string | null
}

type ProjectSprintRow = {
  id: string
  goal: string | null
  sprint_number: number
}

type QueueSummary = {
  mission_control_work_items: {
    reclaimed: number
    selected: number
    executed: number
    noop: boolean
    candidates_considered: number
  }
  backlog_items: {
    reclaimed: number
    selected: number
    noop: boolean
    candidates_considered: number
  }
}

type SelectionRecord = {
  kind: 'mission_control_work_item' | 'backlog_item'
  id: string
  title: string
  assignee_slug: string | null
  profile_name: string | null
  priority: string | null
  stage: string | null
  source_type?: string | null
  sprint_number?: number | null
}

type ReclaimRecord = {
  kind: 'mission_control_work_item' | 'backlog_item'
  id: string
  previous_status: string | null
  reason: 'stale_claim'
}

type CandidateSelection = {
  selections: SelectionRecord[]
  candidatesConsidered: number
}

type ExecutionRecord = {
  id: string
  source_type: MissionControlWorkItemRow['source_type']
  final_status: 'completed' | 'needs_feedback' | 'failed' | 'cancelled'
  profile_name: string | null
  skill_names: string[]
  artifact_preview: string | null
  error: string | null
}

type DispatcherReport = {
  worker_name: string
  started_at: string
  stale_after_minutes: number
  noop: boolean
  summary: QueueSummary
  selections: SelectionRecord[]
  reclaims: ReclaimRecord[]
  executions: ExecutionRecord[]
}

const DEFAULT_STALE_AFTER_MINUTES = 30
const MAX_MC_SELECTIONS = 6
const MAX_BACKLOG_SELECTIONS = 6
const MAX_MARKDOWN_PREVIEW_LENGTH = 240
const WORKER_NAME = process.env.MC_RUNTIME_DISPATCHER_NAME?.trim() || 'hermes'
const execFileAsync = promisify(execFile)
const HERMES_BIN_CANDIDATES = [process.env.HERMES_CLI_PATH, '/usr/local/lib/hermes-agent/venv/bin/hermes', 'hermes'].filter(Boolean) as string[]

function nowIso() {
  return new Date().toISOString()
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function buildStaleCutoffIso(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function truncate(text: string | null | undefined, maxLength = MAX_MARKDOWN_PREVIEW_LENGTH) {
  const value = String(text || '').trim()
  if (!value) return null
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as Record<string, unknown>
  return value as Record<string, unknown>
}

function recordString(value: Record<string, unknown>, key: string) {
  const candidate = value[key]
  return typeof candidate === 'string' ? candidate : null
}

function recordNumber(value: Record<string, unknown>, key: string) {
  const candidate = value[key]
  return typeof candidate === 'number' ? candidate : null
}

function resolveHermesBinary() {
  for (const candidate of HERMES_BIN_CANDIDATES) {
    if (!candidate) continue
    if (candidate.includes('/') || candidate.includes('\\')) {
      if (existsSync(candidate)) return candidate
      continue
    }
    return candidate
  }
  return 'hermes'
}

function extractHermesContent(stdout: string) {
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('session_id:'))
    .join('\n')
    .trim()
}

function getProjectArtifactLabel(artifact: ProjectArtifactKind) {
  switch (artifact) {
    case 'prd':
      return 'PRD'
    case 'planning':
      return 'Planning de ejecución'
    case 'sprint-review':
      return 'Sprint review'
    default:
      return 'Artefacto'
  }
}

function flattenIdeaStepData(stepData: Record<string, unknown>) {
  return Object.entries(stepData)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([step, value]) => {
      const record = asRecord(value)
      const content = typeof record.content === 'string' ? record.content.trim() : ''
      const extras = Object.entries(record)
        .filter(([key, fieldValue]) => key !== 'content' && typeof fieldValue === 'string' && fieldValue.trim())
        .map(([key, fieldValue]) => `- ${key}: ${String(fieldValue).trim()}`)
        .join('\n')
      return [`Paso ${Number(step) + 1}`, content, extras].filter(Boolean).join('\n')
    })
    .join('\n\n')
}

async function reclaimStaleMissionControlWorkItems(staleAfterMinutes: number) {
  const supabase = createAdminClient()
  const cutoff = buildStaleCutoffIso(staleAfterMinutes)

  const { data: staleRows, error } = await supabase
    .from('mission_control_work_items')
    .select('id, status, heartbeat_at, claimed_at, claimed_by')
    .in('status', ['claimed', 'running'])
    .or(`heartbeat_at.lt.${cutoff},and(heartbeat_at.is.null,claimed_at.lt.${cutoff})`)

  if (error) {
    throw new Error(`Failed to list stale mission_control_work_items: ${error.message}`)
  }

  const rows = (staleRows || []) as Array<Pick<MissionControlWorkItemRow, 'id' | 'status' | 'claimed_by'>>
  if (rows.length === 0) return [] as ReclaimRecord[]

  const reclaimed: ReclaimRecord[] = []
  for (const row of rows) {
    const { data, error: rpcError } = await supabase.rpc('mc_requeue_work_item', {
      p_work_item_id: row.id,
      p_worker_name: row.claimed_by || WORKER_NAME,
      p_last_error: `requeued by dispatcher after stale claim (> ${staleAfterMinutes}m without heartbeat)`,
    })

    if (rpcError) {
      throw new Error(`Failed to reclaim mission_control_work_item ${row.id}: ${rpcError.message}`)
    }

    if (data) {
      reclaimed.push({
        kind: 'mission_control_work_item',
        id: row.id,
        previous_status: row.status,
        reason: 'stale_claim',
      })
    }
  }

  return reclaimed
}

async function claimNextMissionControlWorkItems(limit: number): Promise<CandidateSelection> {
  const supabase = createAdminClient()
  const selections: SelectionRecord[] = []
  let candidatesConsidered = 0

  for (let index = 0; index < limit; index += 1) {
    const { data, error } = await supabase.rpc('mc_claim_work_item', {
      p_worker_name: WORKER_NAME,
      p_profile_name: null,
      p_source_types: null,
      p_allowed_assignee_slugs: null,
      p_max_attempts: null,
    })

    if (error) {
      throw new Error(`Failed to claim next mission_control_work_item: ${error.message}`)
    }

    if (!data) break

    candidatesConsidered += 1
    const row = data as MissionControlWorkItemRow
    selections.push({
      kind: 'mission_control_work_item',
      id: row.id,
      title: row.idempotency_key,
      assignee_slug: row.assignee_slug,
      profile_name: row.profile_name,
      priority: row.priority,
      stage: row.source_step_index == null ? null : String(row.source_step_index),
      source_type: row.source_type,
    })
  }

  return { selections, candidatesConsidered }
}

async function reclaimStaleBacklogItems(staleAfterMinutes: number) {
  const supabase = createAdminClient()
  const cutoff = buildStaleCutoffIso(staleAfterMinutes)

  const { data: staleRows, error } = await supabase
    .from('backlog_items')
    .select('id, status')
    .in('status', ['claimed', 'running'])
    .or(`heartbeat_at.lt.${cutoff},and(heartbeat_at.is.null,claimed_at.lt.${cutoff})`)

  if (error) {
    throw new Error(`Failed to list stale backlog_items: ${error.message}`)
  }

  const rows = staleRows || []
  if (rows.length === 0) return [] as ReclaimRecord[]

  const reclaimed: ReclaimRecord[] = []
  for (const row of rows) {
    const { error: updateError } = await supabase
      .from('backlog_items')
      .update({
        status: 'backlog',
        claimed_by: null,
        claimed_at: null,
        started_at: null,
        heartbeat_at: null,
        completed_at: null,
        last_error: `requeued by dispatcher after stale claim (> ${staleAfterMinutes}m without heartbeat)`,
        updated_at: nowIso(),
      })
      .eq('id', row.id)
      .in('status', ['claimed', 'running'])

    if (updateError) {
      throw new Error(`Failed to reclaim backlog_item ${row.id}: ${updateError.message}`)
    }

    reclaimed.push({
      kind: 'backlog_item',
      id: row.id,
      previous_status: row.status,
      reason: 'stale_claim',
    })
  }

  return reclaimed
}

async function listExecutableBacklogCandidates() {
  const supabase = createAdminClient()

  const { data: items, error: itemsError } = await supabase
    .from('backlog_items')
    .select(`
      id,
      project_id,
      sprint_number,
      title,
      description,
      status,
      priority,
      type,
      assignee_slug,
      review_owner_slug,
      tags,
      position,
      stage,
      required_skills,
      artifact_markdown,
      execution_mode,
      claimed_by,
      claimed_at,
      started_at,
      heartbeat_at,
      completed_at,
      attempt_count,
      last_error,
      created_at,
      updated_at
    `)
    .eq('status', 'backlog')
    .order('position', { ascending: true })
    .limit(100)

  if (itemsError) {
    throw new Error(`Failed to list backlog_items: ${itemsError.message}`)
  }

  const rows = (items || []) as BacklogItemRow[]
  if (rows.length === 0) {
    return { executable: [] as Array<BacklogItemRow & { assignee_profile: string | null }>, considered: 0 }
  }

  const { data: dependencies, error: dependenciesError } = await supabase
    .from('backlog_item_dependencies')
    .select('backlog_item_id, depends_on_backlog_item_id')
    .in('backlog_item_id', rows.map((item) => item.id))

  if (dependenciesError) {
    throw new Error(`Failed to list backlog_item_dependencies: ${dependenciesError.message}`)
  }

  const assigneeSlugs = Array.from(
    new Set(rows.map((item) => item.assignee_slug).filter((slug): slug is string => Boolean(slug)))
  )

  const { data: agents, error: agentsError } = assigneeSlugs.length
    ? await supabase
        .from('agents')
        .select('slug, runtime_profile_name, runtime_status')
        .in('slug', assigneeSlugs)
    : { data: [], error: null }

  if (agentsError) {
    throw new Error(`Failed to list agent runtimes: ${agentsError.message}`)
  }

  const agentMap = new Map((agents || []).map((agent) => [agent.slug, agent]))
  const normalized = rows.map((item) => {
    const agent = item.assignee_slug ? agentMap.get(item.assignee_slug) : null
    return {
      ...item,
      runtime_profile_name: agent?.runtime_profile_name || null,
      runtime_status: agent?.runtime_status || null,
    }
  }) as BacklogItemRow[]

  const runtime = computeBacklogRuntime(normalized, (dependencies || []) as DependencyRow[])
  const executableById = new Set(runtime.filter((item) => item.is_executable).map((item) => item.id))
  const executable = normalized
    .filter((item) => executableById.has(item.id))
    .map((item) => ({
      ...item,
      assignee_profile: item.runtime_profile_name,
    }))
    .sort((a, b) => {
      const aPosition = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER
      const bPosition = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER
      if (aPosition !== bPosition) return aPosition - bPosition
      return a.title.localeCompare(b.title)
    })

  return { executable, considered: runtime.length }
}

async function claimBacklogItems(limit: number) {
  const supabase = createAdminClient()
  const { executable, considered } = await listExecutableBacklogCandidates()
  const selections: SelectionRecord[] = []

  for (const item of executable.slice(0, limit)) {
    const currentAttemptCount = item.attempt_count || 0
    const claimedAt = nowIso()
    const { data, error } = await supabase
      .from('backlog_items')
      .update({
        status: 'running',
        claimed_by: WORKER_NAME,
        claimed_at: claimedAt,
        started_at: item.started_at || claimedAt,
        heartbeat_at: claimedAt,
        completed_at: null,
        attempt_count: currentAttemptCount + 1,
        last_error: null,
        updated_at: claimedAt,
      })
      .eq('id', item.id)
      .eq('status', 'backlog')
      .select('id, title, assignee_slug, stage, sprint_number, priority')
      .single()

    if (error) {
      throw new Error(`Failed to claim backlog_item ${item.id}: ${error.message}`)
    }

    if (!data) continue

    selections.push({
      kind: 'backlog_item',
      id: data.id,
      title: data.title,
      assignee_slug: data.assignee_slug,
      profile_name: item.assignee_profile,
      priority: data.priority,
      stage: data.stage,
      sprint_number: data.sprint_number,
    })
  }

  return { selections, considered }
}

async function fetchAgentsBySlugs(slugs: string[]) {
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)))
  if (uniqueSlugs.length === 0) return new Map<string, AgentRow>()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('agents')
    .select('slug, name, role, team, soul_short, skills, responsibilities, llm_model, runtime_profile_name, runtime_status')
    .in('slug', uniqueSlugs)

  if (error) {
    throw new Error(`Failed to load agents for dispatcher execution: ${error.message}`)
  }

  return new Map(((data || []) as AgentRow[]).map((agent) => [agent.slug, agent]))
}

async function fetchMissionControlWorkItems(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return [] as MissionControlWorkItemRow[]

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('mission_control_work_items')
    .select('id, source_type, source_id, source_step_index, idempotency_key, assignee_slug, profile_name, skill_names, status, priority, input_json, claimed_by, claimed_at, started_at, heartbeat_at, completed_at, attempt_count, last_error, created_at, updated_at')
    .in('id', uniqueIds)
    .eq('claimed_by', WORKER_NAME)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load claimed mission_control_work_items: ${error.message}`)
  }

  return (data || []) as MissionControlWorkItemRow[]
}

async function fetchIdeasByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, IdeaRow>()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('business_ideas')
    .select('id, title, summary, slug, step_data, current_step, workflow_stage, automation_status, automation_run_count')
    .in('id', uniqueIds)

  if (error) {
    throw new Error(`Failed to load business ideas for dispatcher execution: ${error.message}`)
  }

  return new Map(((data || []) as IdeaRow[]).map((idea) => [idea.id, idea]))
}

async function fetchProjectsByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, ProjectRow>()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, slug, description, prd_markdown, planning_markdown, current_sprint_number, delivery_status, execution_status, prd_status, sprint_review_status')
    .in('id', uniqueIds)

  if (error) {
    throw new Error(`Failed to load projects for dispatcher execution: ${error.message}`)
  }

  return new Map(((data || []) as ProjectRow[]).map((project) => [project.id, project]))
}

async function fetchIdeasByPromotedProjectIds(projectIds: string[]) {
  const uniqueProjectIds = Array.from(new Set(projectIds.filter(Boolean)))
  if (uniqueProjectIds.length === 0) return new Map<string, IdeaRow>()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('business_ideas')
    .select('id, title, summary, slug, step_data, current_step, workflow_stage, automation_status, automation_run_count, promoted_project_id')
    .in('promoted_project_id', uniqueProjectIds)

  if (error) {
    throw new Error(`Failed to load business ideas by promoted project id: ${error.message}`)
  }

  return new Map(((data || []) as Array<IdeaRow & { promoted_project_id: string | null }>).map((idea) => [String(idea.promoted_project_id), idea]))
}

async function fetchProjectSprints(projectIds: string[], sprintNumbers: number[]) {
  const uniqueProjectIds = Array.from(new Set(projectIds.filter(Boolean)))
  const uniqueSprintNumbers = Array.from(new Set(sprintNumbers.filter((value): value is number => Number.isFinite(value))))
  if (uniqueProjectIds.length === 0 || uniqueSprintNumbers.length === 0) return new Map<string, ProjectSprintRow>()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('project_sprints')
    .select('id, project_id, sprint_number, goal')
    .in('project_id', uniqueProjectIds)
    .in('sprint_number', uniqueSprintNumbers)

  if (error) {
    throw new Error(`Failed to load project sprints for dispatcher execution: ${error.message}`)
  }

  return new Map(
    ((data || []) as Array<ProjectSprintRow & { project_id: string }>).map((row) => [`${row.project_id}:${row.sprint_number}`, row])
  )
}

async function dependencyOutputs(backlogItemId: string) {
  const supabase = createAdminClient()
  const { data: deps, error: depError } = await supabase
    .from('backlog_item_dependencies')
    .select('depends_on_backlog_item_id')
    .eq('backlog_item_id', backlogItemId)

  if (depError || !deps || deps.length === 0) return [] as Array<Record<string, unknown>>

  const ids = deps.map((dep) => dep.depends_on_backlog_item_id)
  const { data: items, error } = await supabase
    .from('backlog_items')
    .select('title, assignee_slug, artifact_markdown, status')
    .in('id', ids)

  if (error || !items) return [] as Array<Record<string, unknown>>

  return items.filter((item) => item.status === 'done') as Array<Record<string, unknown>>
}

function buildProjectArtifactPrompt(params: {
  artifact: ProjectArtifactKind
  agent: AgentRow
  project: ProjectRow
  idea?: IdeaRow | null
  sprint?: ProjectSprintRow | null
  completedTasks?: Array<{ title: string; assignee_slug: string | null; artifact_markdown?: string | null }>
}) {
  return [
    `Eres ${params.agent.name || params.agent.slug} dentro de Mission Control.`,
    params.agent.role ? `Tu rol: ${params.agent.role}.` : null,
    params.agent.team ? `Equipo: ${params.agent.team}.` : null,
    params.agent.soul_short ? `Soul: ${params.agent.soul_short}` : null,
    params.agent.skills?.length ? `Skills: ${params.agent.skills.join(', ')}.` : null,
    params.agent.responsibilities?.length ? `Responsabilidades: ${params.agent.responsibilities.join(', ')}.` : null,
    '',
    `Necesitas generar el artefacto "${getProjectArtifactLabel(params.artifact)}" para el proyecto "${params.project.name}" (${params.project.slug}).`,
    params.project.description ? `Descripción del proyecto: ${params.project.description}` : null,
    params.idea?.title ? `Idea origen: ${params.idea.title}` : null,
    params.idea?.summary ? `Resumen de la idea: ${params.idea.summary}` : null,
    params.idea?.step_data ? `Contexto del análisis de idea:\n${flattenIdeaStepData(params.idea.step_data)}` : null,
    params.project.prd_markdown ? `PRD disponible:\n${params.project.prd_markdown}` : null,
    params.project.planning_markdown ? `Planning disponible:\n${params.project.planning_markdown}` : null,
    params.sprint?.sprint_number ? `Sprint actual: ${params.sprint.sprint_number}` : null,
    params.sprint?.goal ? `Objetivo del sprint: ${params.sprint.goal}` : null,
    params.completedTasks?.length
      ? `Tareas completadas del sprint:\n${params.completedTasks
          .map((task, index) => `${index + 1}. ${task.title} · ${task.assignee_slug || 'sin assignee'}\n${task.artifact_markdown || 'Sin artefacto adjunto.'}`)
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
        : [
            'Objetivo del artefacto:',
            '- Consolida un sprint review ejecutivo.',
            '- Resume entregables completados, riesgos abiertos, decisiones tomadas, criterios pendientes y recomendación de aprobar o pedir cambios.',
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
}

function buildIdeaStepPrompt(params: {
  agent: AgentRow
  idea: IdeaRow
  step: number
  inputJson: Record<string, unknown>
}) {
  const assignment = getIdeaStepAssignment(params.step)
  const stepDefinition = IDEA_STEPS[params.step]
  const stepData = params.idea.step_data || {}
  const priorContext = Object.entries(stepData)
    .filter(([key]) => Number(key) < params.step)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([key, value]) => {
      const stepIndex = Number(key)
      const label = IDEA_STEPS[stepIndex]?.label || `Paso ${stepIndex + 1}`
      const record = asRecord(value)
      const content = typeof record.content === 'string' ? record.content.trim() : ''
      return `Paso ${stepIndex + 1} — ${label}\n${content || 'Sin contenido previo.'}`
    })
    .join('\n\n')

  const currentStepData = asRecord(stepData[params.step.toString()])
  const currentDraft = typeof currentStepData.content === 'string' ? currentStepData.content.trim() : ''
  const pendingFeedback = typeof currentStepData.pending_feedback === 'string'
    ? currentStepData.pending_feedback.trim()
    : typeof params.inputJson.pending_feedback === 'string'
      ? String(params.inputJson.pending_feedback).trim()
      : ''

  return [
    `Eres ${params.agent.name || params.agent.slug} dentro de Mission Control.`,
    params.agent.role ? `Tu rol: ${params.agent.role}.` : null,
    params.agent.team ? `Equipo: ${params.agent.team}.` : null,
    params.agent.soul_short ? `Soul: ${params.agent.soul_short}` : null,
    params.agent.skills?.length ? `Skills: ${params.agent.skills.join(', ')}.` : null,
    params.agent.responsibilities?.length ? `Responsabilidades: ${params.agent.responsibilities.join(', ')}.` : null,
    '',
    'Objetivo:',
    `Genera el análisis del paso ${params.step + 1}/${IDEA_STEPS.length} para la idea de negocio "${params.idea.title}".`,
    params.idea.summary ? `Resumen de la idea: ${params.idea.summary}` : 'Resumen de la idea: no provisto.',
    '',
    `Paso actual: ${stepDefinition?.label || `Paso ${params.step + 1}`}`,
    stepDefinition?.hint ? `Hint: ${stepDefinition.hint}` : null,
    stepDefinition?.questions?.length
      ? `Preguntas guía:\n${stepDefinition.questions.map((question: string, index: number) => `${index + 1}. ${question}`).join('\n')}`
      : null,
    `Agente asignado esperado: ${assignment.name} (${assignment.slug}).`,
    priorContext ? `Contexto ya resuelto:\n${priorContext}` : 'Contexto ya resuelto: este es el primer paso.',
    currentDraft ? `Borrador actual del paso a revisar:\n${currentDraft}` : 'Borrador actual del paso: no existe uno previo o debe generarse desde cero.',
    pendingFeedback
      ? `Feedback explícito del usuario para este paso (debes incorporarlo de forma prioritaria):\n${pendingFeedback}`
      : 'Feedback explícito del usuario para este paso: no provisto.',
    '',
    'Reglas obligatorias:',
    '- Responde solo en español.',
    '- No hables de ti mismo ni menciones que eres una IA.',
    '- Devuelve markdown ejecutivo, claro y accionable.',
    '- Usa subtítulos y bullets.',
    '- Si existe feedback explícito del usuario para este paso, úsalo como instrucción prioritaria para corregir y rehacer el draft.',
    '- Debe quedar listo para revisión de producto, no como borrador vacío.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildBacklogTaskPrompt(params: {
  agent: AgentRow
  project: ProjectRow
  backlogItem: BacklogItemRow
  dependencies: Array<Record<string, unknown>>
  idea?: IdeaRow | null
}) {
  return [
    `Eres ${params.agent.name || params.agent.slug} dentro de Mission Control.`,
    params.agent.role ? `Tu rol: ${params.agent.role}.` : null,
    params.agent.team ? `Equipo: ${params.agent.team}.` : null,
    params.agent.soul_short ? `Soul: ${params.agent.soul_short}` : null,
    params.agent.skills?.length ? `Skills: ${params.agent.skills.join(', ')}.` : null,
    params.agent.responsibilities?.length ? `Responsabilidades: ${params.agent.responsibilities.join(', ')}.` : null,
    '',
    `Necesitas entregar el artefacto de la tarea "${params.backlogItem.title}" para el proyecto "${params.project.name}" (${params.project.slug}).`,
    params.backlogItem.description ? `Descripción de la tarea:\n${params.backlogItem.description}` : null,
    params.project.description ? `Descripción del proyecto: ${params.project.description}` : null,
    params.idea?.title ? `Idea origen: ${params.idea.title}` : null,
    params.idea?.summary ? `Resumen de la idea: ${params.idea.summary}` : null,
    params.project.prd_markdown ? `PRD disponible:\n${params.project.prd_markdown}` : null,
    params.project.planning_markdown ? `Planning disponible:\n${params.project.planning_markdown}` : null,
    params.backlogItem.sprint_number ? `Sprint actual: ${params.backlogItem.sprint_number}` : null,
    params.dependencies.length
      ? `Artefactos previos completados:\n${params.dependencies
          .map((task, index) => `${index + 1}. ${String(task.title || '')} · ${String(task.assignee_slug || 'sin assignee')}\n${String(task.artifact_markdown || 'Sin artefacto adjunto.')}`)
          .join('\n\n')}`
      : null,
    '',
    'Objetivo del artefacto:',
    '- Entrega el resultado concreto de la tarea asignada.',
    '- Incluye decisión tomada, entregables producidos, riesgos abiertos, dependencias siguientes y checklist breve de verificación.',
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
}

async function runHermesChild(params: { profileName: string | null; skillNames: string[]; prompt: string }) {
  const args = ['chat', '-q', params.prompt, '-Q', '--toolsets', 'web', '--source', 'tool']
  const disabledProfiles = new Set(['mc-cx-analyst'])
  if (params.profileName && !disabledProfiles.has(params.profileName)) {
    args.push('-p', params.profileName)
  }
  if (params.skillNames.length) {
    args.push('--skills', params.skillNames.join(','))
  }

  try {
    const { stdout, stderr } = await execFileAsync(resolveHermesBinary(), args, {
      cwd: process.cwd(),
      timeout: 240000,
      maxBuffer: 1024 * 1024,
    })
    const content = extractHermesContent(stdout)
    if (!content) {
      throw new Error(stderr?.trim() || 'Hermes no devolvió contenido.')
    }
    return { content }
  } catch (error) {
    if (error && typeof error === 'object' && 'stdout' in error) {
      const child = error as { stdout?: string; stderr?: string; message?: string }
      const content = extractHermesContent(child.stdout || '')
      if (content) return { content }
      throw new Error((child.stderr || child.message || 'Hermes child run failed').trim())
    }
    throw error instanceof Error ? error : new Error(String(error))
  }
}

async function completeMissionControlWorkItem(params: {
  workItemId: string
  finalStatus: 'completed' | 'needs_feedback' | 'failed' | 'cancelled'
  outputMarkdown?: string | null
  outputJson?: Record<string, unknown> | null
  lastError?: string | null
}) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('mc_complete_work_item', {
    p_work_item_id: params.workItemId,
    p_worker_name: WORKER_NAME,
    p_final_status: params.finalStatus,
    p_output_markdown: params.outputMarkdown ?? null,
    p_output_json: params.outputJson ?? null,
    p_last_error: params.lastError ?? null,
  })

  if (error) {
    throw new Error(`Failed to complete mission_control_work_item ${params.workItemId}: ${error.message}`)
  }

  return data as MissionControlWorkItemRow | null
}

async function failMissionControlWorkItem(workItemId: string, error: string) {
  return completeMissionControlWorkItem({
    workItemId,
    finalStatus: 'failed',
    lastError: error,
    outputJson: { error },
  })
}

async function finalizeIdeaStepWorkItem(params: {
  workItem: MissionControlWorkItemRow
  idea: IdeaRow
  agent: AgentRow
  markdown: string
  step: number
  generatedAt: string
}) {
  const supabase = createAdminClient()
  const stepKey = params.step.toString()
  const existingStepData = params.idea.step_data || {}
  const currentStepData = asRecord(existingStepData[stepKey])
  const updatedStepData = {
    ...existingStepData,
    [stepKey]: {
      ...currentStepData,
      content: params.markdown,
      assigned_agent_slug: params.workItem.assignee_slug,
      assigned_agent_name: params.agent.name || params.workItem.assignee_slug,
      assigned_profile_name: params.workItem.profile_name,
      assigned_skill_names: params.workItem.skill_names || [],
      generated_at: params.generatedAt,
      generated_by: params.agent.slug,
      generated_by_name: params.agent.name || params.agent.slug,
      generation_provider: 'default',
      generation_model: params.agent.llm_model || 'default',
    },
  }

  const automationRunCount = (params.idea.automation_run_count || 0) + 1

  const { error: ideaError } = await supabase
    .from('business_ideas')
    .update({
      step_data: updatedStepData,
      current_step: params.step,
      workflow_stage: 'idea_review',
      automation_status: 'needs_feedback',
      automation_completed_at: params.generatedAt,
      review_requested_at: params.generatedAt,
      last_automation_error: null,
      automation_run_count: automationRunCount,
    })
    .eq('id', params.idea.id)

  if (ideaError) {
    throw new Error(`Failed to persist idea step output for ${params.idea.id}: ${ideaError.message}`)
  }

  await completeMissionControlWorkItem({
    workItemId: params.workItem.id,
    finalStatus: 'needs_feedback',
    outputMarkdown: params.markdown,
    outputJson: {
      step: params.step,
      workflow_stage: 'idea_review',
      automation_status: 'needs_feedback',
      generated_at: params.generatedAt,
      assignee_slug: params.workItem.assignee_slug,
      profile_name: params.workItem.profile_name,
      skill_names: params.workItem.skill_names || [],
    },
  })
}

async function finalizeProjectArtifactWorkItem(params: {
  workItem: MissionControlWorkItemRow
  project: ProjectRow
  idea: IdeaRow | null
  artifact: ProjectArtifactKind
  markdown: string
  generatedAt: string
}) {
  const supabase = createAdminClient()

  if (params.artifact === 'prd') {
    const { error: projectError } = await supabase
      .from('projects')
      .update({
        prd_markdown: params.markdown,
        prd_generated_at: params.generatedAt,
        prd_generated_by: params.workItem.assignee_slug,
        prd_status: 'draft',
        execution_status: 'prd_review',
        delivery_status: 'waiting_prd_approval',
        updated_at: params.generatedAt,
      })
      .eq('id', params.project.id)

    if (projectError) {
      throw new Error(`Failed to persist PRD artifact for project ${params.project.id}: ${projectError.message}`)
    }

    if (params.idea) {
      const { error: ideaError } = await supabase
        .from('business_ideas')
        .update({
          promoted_project_id: params.project.id,
          status: 'in_development',
          workflow_stage: 'prd_review',
          automation_status: 'needs_feedback',
          automation_completed_at: params.generatedAt,
          review_requested_at: params.generatedAt,
          last_automation_error: null,
        })
        .eq('id', params.idea.id)

      if (ideaError) {
        throw new Error(`Failed to update originating idea ${params.idea.id}: ${ideaError.message}`)
      }
    }

    await completeMissionControlWorkItem({
      workItemId: params.workItem.id,
      finalStatus: 'needs_feedback',
      outputMarkdown: params.markdown,
      outputJson: {
        artifact: params.artifact,
        project_id: params.project.id,
        workflow_stage: 'prd_review',
        automation_status: 'needs_feedback',
        generated_at: params.generatedAt,
      },
    })
    return
  }

  if (params.artifact === 'planning') {
    const { error: projectError } = await supabase
      .from('projects')
      .update({
        planning_markdown: params.markdown,
        planning_generated_at: params.generatedAt,
        planning_generated_by: params.workItem.assignee_slug,
        execution_status: 'planning_review',
        delivery_status: 'planning_review',
        updated_at: params.generatedAt,
      })
      .eq('id', params.project.id)

    if (projectError) {
      throw new Error(`Failed to persist planning artifact for project ${params.project.id}: ${projectError.message}`)
    }

    const planningTasks = [
      {
        project_id: params.project.id,
        title: `Sprint 0 plan · ${params.project.name}`,
        description: params.markdown,
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
        project_id: params.project.id,
        title: `UX concept · ${params.project.name}`,
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
        project_id: params.project.id,
        title: `Validation memo · ${params.project.name}`,
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
      .eq('project_id', params.project.id)

    if (existingItemsError) {
      throw new Error(`Failed to check existing planning backlog items for project ${params.project.id}: ${existingItemsError.message}`)
    }

    const existingTitles = new Set((existingItems || []).map((item) => item.title))
    const itemsToInsert = planningTasks.filter((item) => !existingTitles.has(item.title))
    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('backlog_items').insert(itemsToInsert)
      if (insertError) {
        throw new Error(`Failed to seed planning backlog items for project ${params.project.id}: ${insertError.message}`)
      }
    }

    if (params.idea) {
      const { error: ideaError } = await supabase
        .from('business_ideas')
        .update({
          workflow_stage: 'planning_review',
          automation_status: 'needs_feedback',
          automation_completed_at: params.generatedAt,
          review_requested_at: params.generatedAt,
          last_automation_error: null,
        })
        .eq('id', params.idea.id)

      if (ideaError) {
        throw new Error(`Failed to update idea ${params.idea.id} after planning generation: ${ideaError.message}`)
      }
    }

    await completeMissionControlWorkItem({
      workItemId: params.workItem.id,
      finalStatus: 'needs_feedback',
      outputMarkdown: params.markdown,
      outputJson: {
        artifact: params.artifact,
        project_id: params.project.id,
        workflow_stage: 'planning_review',
        automation_status: 'needs_feedback',
        generated_at: params.generatedAt,
      },
    })
    return
  }

  const sprintNumber = params.project.current_sprint_number || 1
  const sprintKey = `${params.project.id}:${sprintNumber}`
  const sprintMap = await fetchProjectSprints([params.project.id], [sprintNumber])
  const sprint = sprintMap.get(sprintKey)
  if (!sprint) {
    throw new Error(`Sprint ${sprintNumber} not found for project ${params.project.id}`)
  }

  const { error: sprintError } = await supabase
    .from('project_sprints')
    .update({
      status: 'in_review',
      review_markdown: params.markdown,
      completed_at: params.generatedAt,
      updated_at: params.generatedAt,
    })
    .eq('project_id', params.project.id)
    .eq('sprint_number', sprintNumber)

  if (sprintError) {
    throw new Error(`Failed to persist sprint review for project ${params.project.id}: ${sprintError.message}`)
  }

  const { error: projectError } = await supabase
    .from('projects')
    .update({
      execution_status: 'sprint_review',
      sprint_review_status: 'ready',
      sprint_review_notes: params.markdown,
      updated_at: params.generatedAt,
    })
    .eq('id', params.project.id)

  if (projectError) {
    throw new Error(`Failed to update sprint review status for project ${params.project.id}: ${projectError.message}`)
  }

  if (params.idea) {
    const { error: ideaError } = await supabase
      .from('business_ideas')
      .update({
        workflow_stage: 'sprint_review',
        automation_status: 'needs_feedback',
        automation_completed_at: params.generatedAt,
        review_requested_at: params.generatedAt,
      })
      .eq('id', params.idea.id)

    if (ideaError) {
      throw new Error(`Failed to update idea ${params.idea.id} after sprint review: ${ideaError.message}`)
    }
  }

  await completeMissionControlWorkItem({
    workItemId: params.workItem.id,
    finalStatus: 'needs_feedback',
    outputMarkdown: params.markdown,
    outputJson: {
      artifact: params.artifact,
      project_id: params.project.id,
      workflow_stage: 'sprint_review',
      automation_status: 'needs_feedback',
      generated_at: params.generatedAt,
    },
  })
}

async function runMissionControlRuntimeDispatcher() {
  const staleAfterMinutes = parsePositiveInt(process.env.MC_RUNTIME_STALE_AFTER_MINUTES, DEFAULT_STALE_AFTER_MINUTES)
  const startedAt = nowIso()

  const missionControlReclaims = await reclaimStaleMissionControlWorkItems(staleAfterMinutes)
  const backlogReclaims = await reclaimStaleBacklogItems(staleAfterMinutes)
  const {
    selections: missionControlSelections,
    candidatesConsidered: missionControlCandidatesConsidered,
  } = await claimNextMissionControlWorkItems(MAX_MC_SELECTIONS)
  const { selections: backlogSelections, considered: backlogCandidatesConsidered } = await claimBacklogItems(MAX_BACKLOG_SELECTIONS)

  const missionControlItems = await fetchMissionControlWorkItems(missionControlSelections.map((selection) => selection.id))
  const agentMap = await fetchAgentsBySlugs(missionControlItems.map((item) => item.assignee_slug))
  const ideaMap = await fetchIdeasByIds(
    missionControlItems.filter((item) => item.source_type === 'business_idea_step').map((item) => item.source_id)
  )
  const projectIds = missionControlItems
    .filter((item) => item.source_type === 'project_artifact' || item.source_type === 'backlog_item_bridge')
    .map((item) => item.source_id)
  const projectMap = await fetchProjectsByIds(projectIds)
  const ideaByProjectMap = await fetchIdeasByPromotedProjectIds(projectIds)

  const executions: ExecutionRecord[] = []
  for (const item of missionControlItems) {
    const agent = agentMap.get(item.assignee_slug)
    if (!agent) {
      const error = `Missing agent runtime configuration for assignee ${item.assignee_slug}`
      await failMissionControlWorkItem(item.id, error)
      executions.push({
        id: item.id,
        source_type: item.source_type,
        final_status: 'failed',
        profile_name: item.profile_name,
        skill_names: item.skill_names || [],
        artifact_preview: null,
        error,
      })
      continue
    }

    const fallbackSkills = agent.skills && agent.skills.length ? agent.skills : ['mission-control-workflows']
    const skillNames = item.skill_names && item.skill_names.length ? item.skill_names : fallbackSkills
    const profileName = item.profile_name || getRuntimeProfile(agent)

    try {
      if (item.source_type === 'business_idea_step') {
        const idea = ideaMap.get(item.source_id)
        if (!idea) throw new Error(`Missing business idea ${item.source_id} for work item ${item.id}`)
        const step = item.source_step_index ?? recordNumber(item.input_json || {}, 'step') ?? idea.current_step ?? 0
        const prompt = buildIdeaStepPrompt({
          agent,
          idea,
          step,
          inputJson: item.input_json || {},
        })
        const run = await runHermesChild({ profileName, skillNames, prompt })
        const generatedAt = nowIso()
        await finalizeIdeaStepWorkItem({
          workItem: item,
          idea,
          agent,
          markdown: run.content,
          step,
          generatedAt,
        })
        executions.push({
          id: item.id,
          source_type: item.source_type,
          final_status: 'needs_feedback',
          profile_name: profileName,
          skill_names: skillNames,
          artifact_preview: truncate(run.content),
          error: null,
        })
        continue
      }

      if (item.source_type === 'project_artifact') {
        const project = projectMap.get(item.source_id)
        if (!project) throw new Error(`Missing project ${item.source_id} for work item ${item.id}`)
        const inputJson = item.input_json || {}
        const artifact = (recordString(inputJson, 'artifact') as ProjectArtifactKind | null) || (item.idempotency_key.endsWith(':planning') ? 'planning' : item.idempotency_key.endsWith(':sprint-review') ? 'sprint-review' : 'prd')
        const idea = ideaByProjectMap.get(project.id) || null
        const sprintNumber = artifact === 'sprint-review' ? project.current_sprint_number || 1 : null
        const sprintMap = sprintNumber ? await fetchProjectSprints([project.id], [sprintNumber]) : new Map<string, ProjectSprintRow>()
        const sprint = sprintNumber ? sprintMap.get(`${project.id}:${sprintNumber}`) || null : null
        const completedTasks = artifact === 'sprint-review'
          ? ((await createAdminClient()
              .from('backlog_items')
              .select('title, assignee_slug, artifact_markdown')
              .eq('project_id', project.id)
              .eq('sprint_number', sprintNumber || 1))
              .data || []) as Array<{ title: string; assignee_slug: string | null; artifact_markdown?: string | null }>
          : []
        const prompt = buildProjectArtifactPrompt({ artifact, agent, project, idea, sprint, completedTasks })
        const run = await runHermesChild({ profileName, skillNames, prompt })
        const generatedAt = nowIso()
        await finalizeProjectArtifactWorkItem({
          workItem: item,
          project,
          idea,
          artifact,
          markdown: run.content,
          generatedAt,
        })
        executions.push({
          id: item.id,
          source_type: item.source_type,
          final_status: 'needs_feedback',
          profile_name: profileName,
          skill_names: skillNames,
          artifact_preview: truncate(run.content),
          error: null,
        })
        continue
      }

      const project = projectMap.get(item.source_id)
      if (!project) throw new Error(`Missing project ${item.source_id} for backlog bridge work item ${item.id}`)
      const idea = ideaByProjectMap.get(project.id) || null
      const backlogRecord = asRecord(item.input_json?.backlog_item)
      if (!recordString(backlogRecord, 'id')) {
        throw new Error(`Mission control backlog bridge work item ${item.id} is missing backlog_item payload`)
      }
      const backlogItem = backlogRecord as unknown as BacklogItemRow
      const dependencies = await dependencyOutputs(backlogItem.id)
      const prompt = buildBacklogTaskPrompt({ agent, project, backlogItem, dependencies, idea })
      const run = await runHermesChild({ profileName, skillNames, prompt })
      await completeMissionControlWorkItem({
        workItemId: item.id,
        finalStatus: 'completed',
        outputMarkdown: run.content,
        outputJson: {
          backlog_item_id: backlogItem.id,
          project_id: project.id,
          generated_at: nowIso(),
          profile_name: profileName,
          skill_names: skillNames,
        },
      })
      executions.push({
        id: item.id,
        source_type: item.source_type,
        final_status: 'completed',
        profile_name: profileName,
        skill_names: skillNames,
        artifact_preview: truncate(run.content),
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await failMissionControlWorkItem(item.id, message)
      executions.push({
        id: item.id,
        source_type: item.source_type,
        final_status: 'failed',
        profile_name: profileName,
        skill_names: skillNames,
        artifact_preview: null,
        error: message,
      })
    }
  }

  const report: DispatcherReport = {
    worker_name: WORKER_NAME,
    started_at: startedAt,
    stale_after_minutes: staleAfterMinutes,
    noop: missionControlSelections.length === 0 && backlogSelections.length === 0,
    summary: {
      mission_control_work_items: {
        reclaimed: missionControlReclaims.length,
        selected: missionControlSelections.length,
        executed: executions.length,
        noop: missionControlSelections.length === 0,
        candidates_considered: missionControlCandidatesConsidered,
      },
      backlog_items: {
        reclaimed: backlogReclaims.length,
        selected: backlogSelections.length,
        noop: backlogSelections.length === 0,
        candidates_considered: backlogCandidatesConsidered,
      },
    },
    selections: [...missionControlSelections, ...backlogSelections],
    reclaims: [...missionControlReclaims, ...backlogReclaims],
    executions,
  }

  return report
}

async function main() {
  const report = await runMissionControlRuntimeDispatcher()
  if (report.noop) {
    return
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
