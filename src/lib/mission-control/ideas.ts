export const IDEA_STEP_ASSIGNMENTS = [
  { slug: 'cx-analyst', name: 'CX Analyst', team: 'Marketing' },
  { slug: 'research', name: 'Research', team: 'Product' },
  { slug: 'product-lead', name: 'Product Lead', team: 'Product' },
  { slug: 'research', name: 'Research', team: 'Product' },
  { slug: 'product-lead', name: 'Product Lead', team: 'Product' },
  { slug: 'finance-analyst', name: 'Finance Analyst', team: 'Product' },
  { slug: 'finance-analyst', name: 'Finance Analyst', team: 'Product' },
  { slug: 'research', name: 'Research', team: 'Product' },
  { slug: 'hermes', name: 'Hermes', team: 'Command' },
] as const

export type IdeaStepAssignment = (typeof IDEA_STEP_ASSIGNMENTS)[number]

export function getIdeaStepAssignment(step: number): IdeaStepAssignment {
  return IDEA_STEP_ASSIGNMENTS[step] || IDEA_STEP_ASSIGNMENTS[0]
}

export function normalizeIdeaStepData(step: number, raw: Record<string, unknown> | null | undefined) {
  const assignment = getIdeaStepAssignment(step)
  const data = (raw || {}) as Record<string, unknown>

  if (typeof data.content === 'string' && data.content.trim()) {
    return {
      ...data,
      assigned_agent_slug: (data.assigned_agent_slug as string) || assignment.slug,
      assigned_agent_name: (data.assigned_agent_name as string) || assignment.name,
    }
  }

  const fallbackKeys = Object.keys(data).filter((key) => {
    const value = data[key]
    return typeof value === 'string' && value.trim().length > 0
  })

  if (fallbackKeys.length === 0) {
    return {
      ...data,
      assigned_agent_slug: (data.assigned_agent_slug as string) || assignment.slug,
      assigned_agent_name: (data.assigned_agent_name as string) || assignment.name,
      content: '',
    }
  }

  const content = fallbackKeys
    .map((key) => `- ${key}: ${String(data[key]).trim()}`)
    .join('\n')

  return {
    ...data,
    assigned_agent_slug: (data.assigned_agent_slug as string) || assignment.slug,
    assigned_agent_name: (data.assigned_agent_name as string) || assignment.name,
    content,
  }
}

export function isIdeaStepComplete(raw: Record<string, unknown> | null | undefined) {
  const data = (raw || {}) as Record<string, unknown>

  if (typeof data.content === 'string' && data.content.trim().length > 0) {
    return true
  }

  return Object.values(data).some((value) => typeof value === 'string' && value.trim().length > 0)
}
