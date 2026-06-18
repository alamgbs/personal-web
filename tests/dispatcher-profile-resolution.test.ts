import test from 'node:test'
import assert from 'node:assert/strict'

import { computeBacklogRuntime } from '../src/lib/mission-control/backlog-runtime-core'
import { getRuntimeSkills } from '../src/lib/mission-control/agents'

test('computeBacklogRuntime trims runtime profile names and skill labels before marking work executable', () => {
  const [item] = computeBacklogRuntime(
    [
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
        position: 10,
        stage: 'execution',
        required_skills: [' react ', '', 'ui delivery  '],
        artifact_markdown: null,
        execution_mode: 'build',
        runtime_profile_name: '  mc-front-dev  ',
        runtime_status: 'active',
      },
    ],
    []
  )

  assert.equal(item.assignee_profile, 'mc-front-dev')
  assert.deepEqual(item.required_skills, ['react', 'ui delivery'])
  assert.equal(item.is_executable, true)
  assert.deepEqual(item.readiness_issues, [])
})

test('getRuntimeSkills renders trimmed runtime skill labels and hides blank values', () => {
  assert.equal(getRuntimeSkills({ default_skills: [' mission-control-workflows ', '', 'kanban-worker  '] }), 'mission-control-workflows, kanban-worker')
  assert.equal(getRuntimeSkills({ default_skills: [] }), '—')
  assert.equal(getRuntimeSkills({ default_skills: null }), '—')
})
