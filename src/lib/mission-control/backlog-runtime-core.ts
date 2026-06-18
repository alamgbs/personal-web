export type BacklogExecutionStage = 'prd' | 'planning' | 'execution' | 'review' | 'security'
export type BacklogExecutionMode = 'planning' | 'build' | 'review' | 'mixed'
export type BacklogExecutionStatus = 'backlog' | 'claimed' | 'running' | 'in_progress' | 'done' | 'review' | 'failed' | 'blocked'
export type BacklogRuntimeStatus = 'active' | 'disabled' | 'missing_profile' | 'human' | null
export type BacklogReadinessIssue =
  | 'status_not_backlog'
  | 'missing_assignee'
  | 'missing_runtime_profile'
  | 'inactive_runtime'
  | 'human_assignee'
  | 'blocked_by_dependencies'

export type DependencyRow = {
  backlog_item_id: string
  depends_on_backlog_item_id: string
}

export type BacklogItemRuntimeRow = {
  id: string
  project_id: string | null
  sprint_number: number | null
  title: string
  description: string | null
  status: string | null
  priority: string | null
  type: string | null
  assignee_slug: string | null
  review_owner_slug: string | null
  tags: string[] | null
  position: number | null
  stage: string | null
  required_skills: string[] | null
  artifact_markdown: string | null
  execution_mode: string | null
  runtime_profile_name?: string | null
  runtime_status?: string | null
  claimed_by?: string | null
  claimed_at?: string | null
  started_at?: string | null
  heartbeat_at?: string | null
  completed_at?: string | null
  attempt_count?: number | null
  last_error?: string | null
}

export type BacklogDependency = DependencyRow

export type BacklogItemRuntime = BacklogItemRuntimeRow & {
  stage: BacklogExecutionStage
  execution_mode: BacklogExecutionMode
  status: BacklogExecutionStatus | string
  required_skills: string[]
  is_executable: boolean
  blocked_by: string[]
  dependency_ids: string[]
  dependency_count: number
  dependency_completed_count: number
  assignee_profile: string | null
  runtime_status: BacklogRuntimeStatus
  readiness_issues: BacklogReadinessIssue[]
  claim_status: 'idle' | 'claimed' | 'running' | 'completed' | 'failed'
}

export type SprintDependencyIds = {
  breakdownId?: string | null
  frontendId?: string | null
  backendId?: string | null
  securityId?: string | null
}

const EXECUTABLE_ITEM_STATUSES = new Set<BacklogExecutionStatus>(['backlog'])
const COMPLETED_DEPENDENCY_STATUSES = new Set<BacklogExecutionStatus>(['done'])
const VALID_STAGES = new Set<BacklogExecutionStage>(['prd', 'planning', 'execution', 'review', 'security'])
const VALID_EXECUTION_MODES = new Set<BacklogExecutionMode>(['planning', 'build', 'review', 'mixed'])
const ACTIVE_RUNTIME_STATUS = 'active'

function normalizeStage(value: string | null | undefined): BacklogExecutionStage {
  if (value && VALID_STAGES.has(value as BacklogExecutionStage)) return value as BacklogExecutionStage
  return 'execution'
}

function normalizeExecutionMode(value: string | null | undefined): BacklogExecutionMode {
  if (value && VALID_EXECUTION_MODES.has(value as BacklogExecutionMode)) return value as BacklogExecutionMode
  return 'build'
}

function normalizeSkills(value: string[] | null | undefined) {
  return Array.isArray(value)
    ? value.map((skill) => String(skill || '').trim()).filter(Boolean)
    : []
}

function normalizeRuntimeProfileName(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeRuntimeStatus(value: unknown): BacklogRuntimeStatus {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (normalized === 'active' || normalized === 'disabled' || normalized === 'missing_profile' || normalized === 'human') {
    return normalized
  }
  return null
}

function dependencyMap(rows: DependencyRow[]) {
  const map = new Map<string, string[]>()
  for (const row of rows) {
    const bucket = map.get(row.backlog_item_id) || []
    bucket.push(row.depends_on_backlog_item_id)
    map.set(row.backlog_item_id, bucket)
  }
  return map
}

export function isExecutableBacklogStatus(status: string | null | undefined) {
  return EXECUTABLE_ITEM_STATUSES.has((status || 'backlog') as BacklogExecutionStatus)
}

export function isCompletedDependencyStatus(status: string | null | undefined) {
  return COMPLETED_DEPENDENCY_STATUSES.has((status || '') as BacklogExecutionStatus)
}

export function buildSprintDependencyRows(ids: SprintDependencyIds): BacklogDependency[] {
  const rows = [
    ids.breakdownId && ids.frontendId
      ? { backlog_item_id: ids.frontendId, depends_on_backlog_item_id: ids.breakdownId }
      : null,
    ids.breakdownId && ids.backendId
      ? { backlog_item_id: ids.backendId, depends_on_backlog_item_id: ids.breakdownId }
      : null,
    ids.frontendId && ids.securityId
      ? { backlog_item_id: ids.securityId, depends_on_backlog_item_id: ids.frontendId }
      : null,
    ids.backendId && ids.securityId
      ? { backlog_item_id: ids.securityId, depends_on_backlog_item_id: ids.backendId }
      : null,
  ].filter((row): row is BacklogDependency => row !== null)

  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = `${row.backlog_item_id}:${row.depends_on_backlog_item_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function computeBacklogRuntime(items: BacklogItemRuntimeRow[], dependencies: DependencyRow[]) {
  const byId = new Map(items.map((item) => [item.id, item]))
  const depsByItem = dependencyMap(dependencies)

  return items.map<BacklogItemRuntime>((item) => {
    const dependencyIds = depsByItem.get(item.id) || []
    const blockedBy = dependencyIds.filter((dependencyId) => {
      const dependency = byId.get(dependencyId)
      if (!dependency) return true
      return !isCompletedDependencyStatus(dependency.status)
    })
    const completedDependencies = dependencyIds.filter((dependencyId) => {
      const dependency = byId.get(dependencyId)
      return dependency ? isCompletedDependencyStatus(dependency.status) : false
    })
    const runtimeProfileName = normalizeRuntimeProfileName(item.runtime_profile_name)
    const runtimeStatus = normalizeRuntimeStatus(item.runtime_status)
    const readinessIssues: BacklogReadinessIssue[] = []
    const claimStatus = item.completed_at
      ? item.last_error
        ? 'failed'
        : 'completed'
      : item.started_at
        ? 'running'
        : item.claimed_at
          ? 'claimed'
          : 'idle'

    if (!isExecutableBacklogStatus(item.status)) readinessIssues.push('status_not_backlog')
    if (!item.assignee_slug) readinessIssues.push('missing_assignee')
    if (!runtimeProfileName) readinessIssues.push('missing_runtime_profile')
    if (runtimeStatus === 'human') {
      readinessIssues.push('human_assignee')
    } else if (runtimeStatus !== null && runtimeStatus !== ACTIVE_RUNTIME_STATUS) {
      readinessIssues.push('inactive_runtime')
    }
    if (blockedBy.length > 0) readinessIssues.push('blocked_by_dependencies')

    return {
      ...item,
      stage: normalizeStage(item.stage),
      execution_mode: normalizeExecutionMode(item.execution_mode),
      status: item.status || 'backlog',
      required_skills: normalizeSkills(item.required_skills),
      dependency_ids: dependencyIds,
      dependency_count: dependencyIds.length,
      dependency_completed_count: completedDependencies.length,
      blocked_by: blockedBy,
      assignee_profile: runtimeProfileName,
      runtime_status: runtimeStatus,
      readiness_issues: readinessIssues,
      is_executable: readinessIssues.length === 0,
      claim_status: claimStatus,
    }
  })
}
