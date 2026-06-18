import test from 'node:test'
import assert from 'node:assert/strict'

import { deleteIdeaGraph, type IdeaDeletionAdapter } from '../src/lib/mission-control/idea-deletion'

function createAdapter() {
  const calls: string[] = []

  const adapter: IdeaDeletionAdapter = {
    async getIdea(ideaId) {
      calls.push(`getIdea:${ideaId}`)
      return {
        id: ideaId,
        promotedProjectId: 'project-promoted',
      }
    },
    async getProjectsBySourceIdea(ideaId) {
      calls.push(`getProjectsBySourceIdea:${ideaId}`)
      return ['project-promoted', 'project-secondary']
    },
    async clearQuickIdeaProjectRefs(projectIds) {
      calls.push(`clearQuickIdeaProjectRefs:${projectIds.join(',')}`)
    },
    async clearQuickIdeaIdeaRefs(ideaId) {
      calls.push(`clearQuickIdeaIdeaRefs:${ideaId}`)
    },
    async clearBusinessIdeaProjectRefs(projectIds) {
      calls.push(`clearBusinessIdeaProjectRefs:${projectIds.join(',')}`)
    },
    async deleteBacklogItems(projectIds) {
      calls.push(`deleteBacklogItems:${projectIds.join(',')}`)
    },
    async deleteProjectSprints(projectIds) {
      calls.push(`deleteProjectSprints:${projectIds.join(',')}`)
    },
    async deleteProjects(projectIds) {
      calls.push(`deleteProjects:${projectIds.join(',')}`)
    },
    async deleteIdea(ideaId) {
      calls.push(`deleteIdea:${ideaId}`)
    },
  }

  return { adapter, calls }
}

test('deleteIdeaGraph removes related projects and dependents before deleting the idea', async () => {
  const { adapter, calls } = createAdapter()

  await deleteIdeaGraph(adapter, 'idea-123')

  assert.deepEqual(calls, [
    'getIdea:idea-123',
    'getProjectsBySourceIdea:idea-123',
    'clearQuickIdeaProjectRefs:project-promoted,project-secondary',
    'clearQuickIdeaIdeaRefs:idea-123',
    'clearBusinessIdeaProjectRefs:project-promoted,project-secondary',
    'deleteBacklogItems:project-promoted,project-secondary',
    'deleteProjectSprints:project-promoted,project-secondary',
    'deleteProjects:project-promoted,project-secondary',
    'deleteIdea:idea-123',
  ])
})

test('deleteIdeaGraph still deletes the idea when it has no related projects', async () => {
  const calls: string[] = []

  const adapter: IdeaDeletionAdapter = {
    async getIdea(ideaId) {
      calls.push(`getIdea:${ideaId}`)
      return {
        id: ideaId,
        promotedProjectId: null,
      }
    },
    async getProjectsBySourceIdea(ideaId) {
      calls.push(`getProjectsBySourceIdea:${ideaId}`)
      return []
    },
    async clearQuickIdeaProjectRefs() {
      calls.push('clearQuickIdeaProjectRefs')
    },
    async clearQuickIdeaIdeaRefs(ideaId) {
      calls.push(`clearQuickIdeaIdeaRefs:${ideaId}`)
    },
    async clearBusinessIdeaProjectRefs() {
      calls.push('clearBusinessIdeaProjectRefs')
    },
    async deleteBacklogItems() {
      calls.push('deleteBacklogItems')
    },
    async deleteProjectSprints() {
      calls.push('deleteProjectSprints')
    },
    async deleteProjects() {
      calls.push('deleteProjects')
    },
    async deleteIdea(ideaId) {
      calls.push(`deleteIdea:${ideaId}`)
    },
  }

  await deleteIdeaGraph(adapter, 'idea-empty')

  assert.deepEqual(calls, [
    'getIdea:idea-empty',
    'getProjectsBySourceIdea:idea-empty',
    'clearQuickIdeaIdeaRefs:idea-empty',
    'deleteIdea:idea-empty',
  ])
})
