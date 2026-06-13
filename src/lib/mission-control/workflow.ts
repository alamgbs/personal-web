import { TOTAL_IDEA_STEPS } from '@/lib/mission-control/idea-steps'

export const IDEA_WORKFLOW_STAGES = [
  'idea_pipeline',
  'idea_review',
  'prd_generation',
  'prd_review',
  'planning_generation',
  'planning_review',
  'sprint_execution',
  'sprint_review',
  'done',
] as const

export const AUTOMATION_STATUSES = ['queued', 'running', 'completed', 'needs_feedback', 'blocked', 'failed'] as const
export const PROJECT_EXECUTION_STATUSES = [
  'pending_prd',
  'prd_review',
  'planning_generation',
  'planning_review',
  'sprint_ready',
  'sprint_in_progress',
  'sprint_review',
  'done',
  'blocked',
] as const

export type IdeaWorkflowStage = (typeof IDEA_WORKFLOW_STAGES)[number]
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number]
export type ProjectExecutionStatus = (typeof PROJECT_EXECUTION_STATUSES)[number]

export function getIdeaWorkflowStageLabel(stage: string | null | undefined) {
  const labels: Record<string, string> = {
    idea_pipeline: 'Idea pipeline',
    idea_review: 'Idea review',
    prd_generation: 'PRD generation',
    prd_review: 'PRD review',
    planning_generation: 'Planning generation',
    planning_review: 'Planning review',
    sprint_execution: 'Sprint execution',
    sprint_review: 'Sprint review',
    done: 'Done',
  }

  return labels[stage || ''] || 'Idea pipeline'
}

export function getAutomationStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    queued: 'Queued',
    running: 'Running',
    completed: 'Completed',
    needs_feedback: 'Needs feedback',
    blocked: 'Blocked',
    failed: 'Failed',
  }

  return labels[status || ''] || 'Queued'
}

export function getProjectExecutionStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    pending_prd: 'Pending PRD',
    prd_review: 'PRD review',
    planning_generation: 'Planning generation',
    planning_review: 'Planning review',
    sprint_ready: 'Sprint ready',
    sprint_in_progress: 'Sprint in progress',
    sprint_review: 'Sprint review',
    done: 'Done',
    blocked: 'Blocked',
  }

  return labels[status || ''] || 'Pending PRD'
}

export function getWorkflowTone(stage: string | null | undefined) {
  const stageName = stage || 'idea_pipeline'

  if (stageName === 'done') {
    return { color: '#4ade80', background: 'rgba(74,222,128,0.12)' }
  }

  if (stageName.includes('review')) {
    return { color: '#60a5fa', background: 'rgba(96,165,250,0.12)' }
  }

  if (stageName.includes('planning') || stageName.includes('sprint')) {
    return { color: 'var(--color-coral)', background: 'rgba(255,106,61,0.12)' }
  }

  return { color: 'var(--color-acid)', background: 'rgba(214,255,63,0.12)' }
}

export function getAutomationTone(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return { color: '#4ade80', background: 'rgba(74,222,128,0.12)' }
    case 'running':
      return { color: 'var(--color-acid)', background: 'rgba(214,255,63,0.12)' }
    case 'needs_feedback':
      return { color: '#60a5fa', background: 'rgba(96,165,250,0.12)' }
    case 'blocked':
    case 'failed':
      return { color: 'var(--color-coral)', background: 'rgba(255,106,61,0.12)' }
    default:
      return { color: 'var(--color-text-faint)', background: 'rgba(107,103,98,0.12)' }
  }
}

export function getCompletedIdeaStepCount(stepData: Record<string, unknown> | null | undefined) {
  if (!stepData) return 0

  return Object.values(stepData).filter((value) => {
    if (!value || typeof value !== 'object') return false
    const record = value as Record<string, unknown>
    if (typeof record.content === 'string' && record.content.trim()) return true
    return Object.values(record).some((field) => typeof field === 'string' && field.trim())
  }).length
}

export function isIdeaReadyForReview(stepData: Record<string, unknown> | null | undefined) {
  return getCompletedIdeaStepCount(stepData) >= TOTAL_IDEA_STEPS
}
