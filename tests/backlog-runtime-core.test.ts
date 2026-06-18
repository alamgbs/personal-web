import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSprintDependencyRows,
  computeBacklogRuntime,
} from '../src/lib/mission-control/backlog-runtime-core'

test('computeBacklogRuntime marks only fully-routable backlog items as executable', () => {
  const items = [
    {
      id: 'breakdown',
      project_id: 'p1',
      sprint_number: 1,
      title: 'Breakdown',
      description: null,
      status: 'done',
      priority: 'high',
      type: 'task',
      assignee_slug: 'product-owner',
      review_owner_slug: 'product-lead',
      tags: ['sprint'],
      position: 10,
      stage: 'execution',
      required_skills: ['prioritization'],
      artifact_markdown: null,
      execution_mode: 'mixed',
      runtime_profile_name: 'mc-product-owner',
      runtime_status: 'active',
    },
    {
      id: 'frontend',
      project_id: 'p1',
      sprint_number: 1,
      title: 'Frontend MVP',
      description: null,
      status: 'backlog',
      priority: 'high',
      type: 'feature',
      assignee_slug: 'front-dev',
      review_owner_slug: 'dev-lead',
      tags: ['frontend'],
      position: 11,
      stage: 'execution',
      required_skills: ['react'],
      artifact_markdown: null,
      execution_mode: 'build',
      runtime_profile_name: 'mc-front-dev',
      runtime_status: 'active',
    },
    {
      id: 'security',
      project_id: 'p1',
      sprint_number: 1,
      title: 'Security gate',
      description: null,
      status: 'backlog',
      priority: 'medium',
      type: 'task',
      assignee_slug: 'security-dev',
      review_owner_slug: 'dev-lead',
      tags: ['security'],
      position: 12,
      stage: 'review',
      required_skills: ['security review'],
      artifact_markdown: null,
      execution_mode: 'review',
      runtime_profile_name: null,
      runtime_status: 'disabled',
    },
  ]

  const runtime = computeBacklogRuntime(items, [
    { backlog_item_id: 'frontend', depends_on_backlog_item_id: 'breakdown' },
    { backlog_item_id: 'security', depends_on_backlog_item_id: 'frontend' },
  ])

  const frontend = runtime.find((item) => item.id === 'frontend')
  const security = runtime.find((item) => item.id === 'security')

  assert.ok(frontend)
  assert.equal(frontend.is_executable, true)
  assert.equal(frontend.runtime_status, 'active')
  assert.deepEqual(frontend.readiness_issues, [])
  assert.deepEqual(frontend.blocked_by, [])
  assert.equal(frontend.dependency_completed_count, 1)

  assert.ok(security)
  assert.equal(security.is_executable, false)
  assert.deepEqual(security.blocked_by, ['frontend'])
  assert.deepEqual(security.readiness_issues.sort(), ['blocked_by_dependencies', 'inactive_runtime', 'missing_runtime_profile'])
})

test('computeBacklogRuntime normalizes invalid stage/mode values and flags human assignees', () => {
  const [item] = computeBacklogRuntime([
    {
      id: 'prd',
      project_id: 'p2',
      sprint_number: null,
      title: 'PRD',
      description: null,
      status: 'review',
      priority: 'medium',
      type: 'task',
      assignee_slug: 'alam',
      review_owner_slug: 'alam',
      tags: [],
      position: 1,
      stage: 'delivery',
      required_skills: null,
      artifact_markdown: null,
      execution_mode: 'manual',
      runtime_profile_name: null,
      runtime_status: 'human',
    },
  ], [])

  assert.equal(item.stage, 'execution')
  assert.equal(item.execution_mode, 'build')
  assert.equal(item.runtime_status, 'human')
  assert.equal(item.is_executable, false)
  assert.deepEqual(item.readiness_issues.sort(), ['human_assignee', 'missing_runtime_profile', 'status_not_backlog'])
  assert.deepEqual(item.required_skills, [])
})

test('buildSprintDependencyRows returns the canonical sprint DAG without duplicates', () => {
  const rows = buildSprintDependencyRows({
    breakdownId: 'a',
    frontendId: 'b',
    backendId: 'c',
    securityId: 'd',
  })

  assert.deepEqual(rows, [
    { backlog_item_id: 'b', depends_on_backlog_item_id: 'a' },
    { backlog_item_id: 'c', depends_on_backlog_item_id: 'a' },
    { backlog_item_id: 'd', depends_on_backlog_item_id: 'b' },
    { backlog_item_id: 'd', depends_on_backlog_item_id: 'c' },
  ])
})
