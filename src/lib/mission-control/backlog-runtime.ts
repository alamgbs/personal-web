import 'server-only'

import { createPrivilegedServerClient } from '@/lib/supabase/admin'
import {
  computeBacklogRuntime,
  type BacklogDependency,
  type BacklogItemRuntimeRow,
  type DependencyRow,
} from '@/lib/mission-control/backlog-runtime-core'

export type {
  BacklogDependency,
  BacklogExecutionMode,
  BacklogExecutionStage,
  BacklogExecutionStatus,
  BacklogItemRuntime,
  BacklogItemRuntimeRow,
  BacklogReadinessIssue,
  BacklogRuntimeStatus,
  DependencyRow,
} from '@/lib/mission-control/backlog-runtime-core'

export {
  buildSprintDependencyRows,
  computeBacklogRuntime,
  isCompletedDependencyStatus,
  isExecutableBacklogStatus,
} from '@/lib/mission-control/backlog-runtime-core'

export async function listProjectBacklogRuntime(projectId: string) {
  const supabase = await createPrivilegedServerClient()

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
      last_error
    `)
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const { data: dependencies, error: dependencyError } =
    (items || []).length === 0
      ? { data: [], error: null }
      : await supabase
          .from('backlog_item_dependencies')
          .select('backlog_item_id, depends_on_backlog_item_id')
          .in('backlog_item_id', (items || []).map((item) => item.id))

  if (dependencyError) {
    throw new Error(dependencyError.message)
  }

  const assigneeSlugs = Array.from(
    new Set(
      (items || [])
        .map((item) => item.assignee_slug)
        .filter((slug): slug is string => typeof slug === 'string' && slug.trim().length > 0)
    )
  )

  const { data: agents, error: agentsError } =
    assigneeSlugs.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('agents')
          .select('slug, runtime_profile_name, runtime_status')
          .in('slug', assigneeSlugs)

  if (agentsError) {
    throw new Error(agentsError.message)
  }

  const agentBySlug = new Map(
    (agents || []).map((agent) => [agent.slug, agent])
  )

  const normalizedItems = (items || []).map((item) => {
    const agent = item.assignee_slug ? agentBySlug.get(item.assignee_slug) : null
    return {
      ...item,
      runtime_profile_name: agent?.runtime_profile_name || null,
      runtime_status: agent?.runtime_status || null,
    }
  }) as BacklogItemRuntimeRow[]

  return computeBacklogRuntime(normalizedItems, (dependencies || []) as DependencyRow[])
}

export async function listProjectBacklogDependencies(projectId: string): Promise<BacklogDependency[]> {
  const supabase = await createPrivilegedServerClient()
  const { data: items, error: itemsError } = await supabase.from('backlog_items').select('id').eq('project_id', projectId)

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const ids = (items || []).map((item) => item.id)
  if (ids.length === 0) return []

  const { data: dependencies, error } = await supabase
    .from('backlog_item_dependencies')
    .select('backlog_item_id, depends_on_backlog_item_id')
    .in('backlog_item_id', ids)

  if (error) {
    throw new Error(error.message)
  }

  return (dependencies || []) as BacklogDependency[]
}
