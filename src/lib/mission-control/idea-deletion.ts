export type IdeaDeletionRecord = {
  id: string
  promotedProjectId: string | null
}

export type IdeaDeletionAdapter = {
  getIdea: (ideaId: string) => Promise<IdeaDeletionRecord | null>
  getProjectsBySourceIdea: (ideaId: string) => Promise<string[]>
  clearQuickIdeaProjectRefs: (projectIds: string[]) => Promise<void>
  clearQuickIdeaIdeaRefs: (ideaId: string) => Promise<void>
  clearBusinessIdeaProjectRefs: (projectIds: string[]) => Promise<void>
  deleteBacklogItems: (projectIds: string[]) => Promise<void>
  deleteProjectSprints: (projectIds: string[]) => Promise<void>
  deleteProjects: (projectIds: string[]) => Promise<void>
  deleteIdea: (ideaId: string) => Promise<void>
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

export async function deleteIdeaGraph(adapter: IdeaDeletionAdapter, ideaId: string) {
  const idea = await adapter.getIdea(ideaId)

  if (!idea) {
    throw new Error('Idea no encontrada.')
  }

  const sourceProjectIds = await adapter.getProjectsBySourceIdea(ideaId)
  const relatedProjectIds = unique([idea.promotedProjectId, ...sourceProjectIds])

  if (relatedProjectIds.length > 0) {
    await adapter.clearQuickIdeaProjectRefs(relatedProjectIds)
  }

  await adapter.clearQuickIdeaIdeaRefs(ideaId)

  if (relatedProjectIds.length > 0) {
    await adapter.clearBusinessIdeaProjectRefs(relatedProjectIds)
    await adapter.deleteBacklogItems(relatedProjectIds)
    await adapter.deleteProjectSprints(relatedProjectIds)
    await adapter.deleteProjects(relatedProjectIds)
  }

  await adapter.deleteIdea(ideaId)
}
