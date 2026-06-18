'use client'

import type React from 'react'
import Link from 'next/link'
import { useMemo, useOptimistic, useState, useTransition } from 'react'
import {
  approveProjectPlanning,
  approveProjectPrd,
  approveProjectSprint,
  beginProjectSprint,
  moveBacklogItem,
  submitProjectSprintReview,
} from '@/app/actions/projects'
import {
  getBacklogStageLabel,
  getProjectExecutionStatusLabel,
  getWorkflowTone,
} from '@/lib/mission-control/workflow'

type BacklogItem = {
  id: string
  project_id: string | null
  title: string
  description: string | null
  status: string | null
  priority: string | null
  type: string | null
  assignee_slug: string | null
  tags: string[] | null
  position: number | null
  sprint_number?: number | null
  stage?: string | null
  required_skills?: string[] | null
  artifact_markdown?: string | null
  execution_mode?: string | null
  dependency_ids?: string[]
  dependency_count?: number
  dependency_completed_count?: number
  blocked_by?: string[]
  is_executable?: boolean
  assignee_profile?: string | null
  runtime_status?: string | null
  readiness_issues?: string[]
  claimed_by?: string | null
  claimed_at?: string | null
  started_at?: string | null
  heartbeat_at?: string | null
  completed_at?: string | null
  attempt_count?: number | null
  last_error?: string | null
  claim_status?: 'idle' | 'claimed' | 'running' | 'completed' | 'failed'
}

type Project = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string | null
  github_repo: string | null
  url: string | null
  tech_stack: string[] | null
  prd_status: string | null
  prd_markdown?: string | null
  planning_markdown?: string | null
  delivery_status: string | null
  execution_status?: string | null
  sprint_review_status?: string | null
  sprint_review_notes?: string | null
  current_sprint_number?: number | null
  prd_approved_at: string | null
}

type Props = {
  project: Project
  items: BacklogItem[]
}

const COLUMNS = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
] as const

const READINESS_LABELS: Record<string, string> = {
  status_not_backlog: 'status not backlog',
  missing_assignee: 'missing assignee',
  missing_runtime_profile: 'missing runtime profile',
  inactive_runtime: 'inactive runtime',
  human_assignee: 'human owner',
  blocked_by_dependencies: 'waiting on deps',
}

export function ProjectKanbanBoard({ project, items }: Props) {
  const [localItems, setLocalItems] = useOptimistic(items, (_currentItems, nextItems: BacklogItem[]) => nextItems)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const grouped = useMemo(() => {
    const sorted = [...localItems].sort((a, b) => (a.position || 0) - (b.position || 0))
    return {
      backlog: sorted.filter((item) => (item.status || 'backlog') === 'backlog'),
      in_progress: sorted.filter((item) => item.status === 'in_progress'),
      done: sorted.filter((item) => item.status === 'done'),
    }
  }, [localItems])

  const currentSprintNumber = project.current_sprint_number || 1
  const sprintItems = localItems.filter((item) => (item.sprint_number || null) === currentSprintNumber)
  const sprintDoneCount = sprintItems.filter((item) => item.status === 'done').length
  const workflowTone = getWorkflowTone(project.execution_status || 'idea_pipeline')

  function handleDrop(targetStatus: string) {
    if (!draggingId) return
    const moved = localItems.find((item) => item.id === draggingId)
    if (!moved) return

    const nextColumn = [...localItems.filter((item) => item.id !== draggingId && (item.status || 'backlog') === targetStatus)]
    const nextPosition = nextColumn.length
    const optimistic = localItems.map((item) =>
      item.id === draggingId ? { ...item, status: targetStatus, position: nextPosition } : item
    )

    setLocalItems(optimistic)
    setDraggingId(null)
    setError(null)
    setFeedback(`Movido a ${targetStatus.replace('_', ' ')}`)

    startTransition(async () => {
      const result = await moveBacklogItem({
        id: moved.id,
        projectSlug: project.slug,
        status: targetStatus,
        position: nextPosition,
      })

      if (result?.error) {
        setError(result.error)
        setLocalItems(items)
        setFeedback(null)
      }
    })
  }

  function runAction(action: () => Promise<{ error?: string; [key: string]: unknown } | undefined>, successMessage: string) {
    setError(null)
    setFeedback(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) {
        setError(result.error)
        return
      }
      setFeedback(successMessage)
    })
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/mission-control/proyectos"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-text-faint)',
            textDecoration: 'none',
          }}
        >
          ← Volver a proyectos
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ maxWidth: '960px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-acid)', marginBottom: '6px' }}>
            Mission Control
          </div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--color-text)' }}>{project.name}</h1>
          {project.description && (
            <p style={{ maxWidth: '900px', color: 'var(--color-text-faint)', fontSize: '14px', lineHeight: 1.6, marginTop: '8px' }}>
              {project.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            <span style={{ ...statusPillStyle, color: workflowTone.color, background: workflowTone.background }}>
              {getProjectExecutionStatusLabel(project.execution_status)}
            </span>
            <span style={statusMutedPillStyle}>PRD {project.prd_status || 'pending'}</span>
            <span style={statusMutedPillStyle}>Delivery {project.delivery_status || 'waiting_prd'}</span>
            <span style={statusMutedPillStyle}>Sprint {project.current_sprint_number || 1}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '10px', minWidth: '320px', flex: '0 0 320px' }}>
          <div style={metaCardStyle}>
            <div style={metaLabelStyle}>PRD Status</div>
            <div style={metaValueStyle}>{project.prd_status || 'pending'}</div>
          </div>
          <div style={metaCardStyle}>
            <div style={metaLabelStyle}>Execution</div>
            <div style={metaValueStyle}>{getProjectExecutionStatusLabel(project.execution_status)}</div>
          </div>
          <div style={metaCardStyle}>
            <div style={metaLabelStyle}>Sprint Progress</div>
            <div style={metaValueStyle}>{sprintItems.length ? `${sprintDoneCount}/${sprintItems.length}` : '0/0'}</div>
          </div>
        </div>
      </div>

      {(feedback || error) && (
        <div style={{ marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '11px', color: error ? 'var(--color-coral)' : '#4ade80' }}>
          {error ? `✗ ${error}` : `✓ ${feedback}`}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <section style={artifactCardStyle}>
          <div style={artifactHeaderStyle}>
            <div>
              <div style={metaLabelStyle}>PRD</div>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '12px' }}>Draft generado automáticamente luego de aprobar la idea.</div>
            </div>
            {project.prd_status !== 'approved' && (
              <button
                onClick={() => runAction(() => approveProjectPrd(project.id), 'PRD aprobado. Se generó el planning del proyecto.')}
                disabled={isPending || !project.prd_markdown}
                style={approveButtonStyle}
              >
                {isPending ? 'Procesando...' : 'Aprobar PRD y generar planning'}
              </button>
            )}
          </div>
          <div style={artifactBodyStyle}>
            {project.prd_markdown?.trim() ? (
              <pre style={markdownPreStyle}>{project.prd_markdown}</pre>
            ) : (
              <EmptyArtifact text="Mission Control todavía está generando el PRD o aún no se promovió la idea." />
            )}
          </div>
        </section>

        <section style={artifactCardStyle}>
          <div style={artifactHeaderStyle}>
            <div>
              <div style={metaLabelStyle}>Planning</div>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '12px' }}>Secuencia, workstreams y preparación del sprint 1.</div>
            </div>
            {project.planning_markdown?.trim() && project.execution_status !== 'sprint_ready' && project.execution_status !== 'sprint_in_progress' && project.execution_status !== 'sprint_review' && project.execution_status !== 'done' && (
              <button
                onClick={() => runAction(() => approveProjectPlanning(project.id), 'Planning aprobado. Sprint 1 creado y listo para ejecución.')}
                disabled={isPending}
                style={approveButtonStyle}
              >
                {isPending ? 'Procesando...' : 'Aprobar planning y sembrar sprint'}
              </button>
            )}
          </div>
          <div style={artifactBodyStyle}>
            {project.planning_markdown?.trim() ? (
              <pre style={markdownPreStyle}>{project.planning_markdown}</pre>
            ) : (
              <EmptyArtifact text="El planning aparecerá acá apenas el owner apruebe el PRD." />
            )}
          </div>
        </section>
      </div>

      <section style={{ ...artifactCardStyle, marginBottom: '1rem' }}>
        <div style={artifactHeaderStyle}>
          <div>
            <div style={metaLabelStyle}>Sprint control</div>
            <div style={{ color: 'var(--color-text-faint)', fontSize: '12px' }}>Gate final del flujo: ejecutar, revisar y aprobar el sprint.</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {project.execution_status === 'sprint_ready' && (
              <button
                onClick={() => runAction(() => beginProjectSprint(project.id), 'Sprint iniciado. Ya podés mover tareas en el kanban.')}
                disabled={isPending}
                style={approveButtonStyle}
              >
                {isPending ? 'Procesando...' : 'Iniciar sprint'}
              </button>
            )}
            {project.execution_status === 'sprint_in_progress' && (
              <button
                onClick={() => runAction(() => submitProjectSprintReview(project.id), 'Sprint review preparado. Listo para aprobación final.')}
                disabled={isPending}
                style={approveButtonStyle}
              >
                {isPending ? 'Procesando...' : 'Enviar sprint a review'}
              </button>
            )}
            {project.execution_status === 'sprint_review' && (
              <button
                onClick={() => runAction(() => approveProjectSprint(project.id), 'Sprint aprobado. Proyecto marcado como done.')}
                disabled={isPending}
                style={approveButtonStyle}
              >
                {isPending ? 'Procesando...' : 'Aprobar sprint review'}
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={artifactBodyStyle}>
            <div style={metaLabelStyle}>Estado actual</div>
            <div style={{ color: 'var(--color-text)', fontSize: '14px', marginBottom: '12px' }}>
              {getProjectExecutionStatusLabel(project.execution_status)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={statusMutedPillStyle}>Sprint #{currentSprintNumber}</span>
              <span style={statusMutedPillStyle}>Items {sprintDoneCount}/{sprintItems.length}</span>
              {project.sprint_review_status && <span style={statusMutedPillStyle}>Review {project.sprint_review_status}</span>}
            </div>
          </div>
          <div style={artifactBodyStyle}>
            <div style={metaLabelStyle}>Sprint review</div>
            {project.sprint_review_notes?.trim() ? (
              <pre style={markdownPreStyle}>{project.sprint_review_notes}</pre>
            ) : (
              <EmptyArtifact text="El resumen del sprint review se generará cuando todas las tareas del sprint estén en done." />
            )}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem', alignItems: 'start' }}>
        {COLUMNS.map((column) => {
          const columnItems = grouped[column.key]
          return (
            <div
              key={column.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(column.key)}
              style={{
                minHeight: '65dvh',
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem', alignItems: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-acid)' }}>
                  {column.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-faint)' }}>{columnItems.length}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {columnItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggingId(item.id)}
                    onDragEnd={() => setDraggingId(null)}
                    style={{
                      padding: '0.9rem',
                      borderRadius: '8px',
                      border: draggingId === item.id ? '1px solid var(--color-acid)' : '1px solid var(--color-border)',
                      background: 'var(--color-surface-2)',
                      cursor: 'grab',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ color: 'var(--color-text)', fontSize: '13px', lineHeight: 1.4 }}>{item.title}</div>
                      <span style={{ ...pillStyle, color: priorityColor(item.priority), borderColor: priorityColor(item.priority) }}>
                        {item.priority || 'medium'}
                      </span>
                    </div>
                    {item.description && (
                      <p style={{ margin: '0 0 10px', color: 'var(--color-text-faint)', fontSize: '12px', lineHeight: 1.5 }}>
                        {item.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {item.assignee_slug && <span style={pillStyle}>@{item.assignee_slug}</span>}
                      {item.assignee_profile && <span style={pillStyle}>profile:{item.assignee_profile}</span>}
                      {item.runtime_status && <span style={pillStyle}>runtime:{item.runtime_status}</span>}
                      {item.claim_status && <span style={pillStyle}>claim:{item.claim_status}</span>}
                      {item.type && <span style={pillStyle}>{item.type}</span>}
                      {item.stage && <span style={pillStyle}>{getBacklogStageLabel(item.stage)}</span>}
                      {item.execution_mode && <span style={pillStyle}>{item.execution_mode}</span>}
                      {item.sprint_number && <span style={pillStyle}>sprint {item.sprint_number}</span>}
                      {(item.tags || []).slice(0, 3).map((tag) => (
                        <span key={tag} style={pillStyle}>{tag}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {item.required_skills?.slice(0, 5).map((skill) => (
                        <span key={skill} style={pillStyle}>skill:{skill}</span>
                      ))}
                      {typeof item.dependency_count === 'number' && (
                        <span style={pillStyle}>deps {item.dependency_completed_count || 0}/{item.dependency_count}</span>
                      )}
                      {item.is_executable === true && <span style={{ ...pillStyle, color: 'var(--color-acid)', borderColor: 'var(--color-acid)' }}>ready</span>}
                      {item.is_executable === false && <span style={{ ...pillStyle, color: 'var(--color-coral)', borderColor: 'var(--color-coral)' }}>blocked</span>}
                    </div>
                    {(item.blocked_by?.length || item.readiness_issues?.length || item.claimed_by || item.artifact_markdown?.trim() || item.last_error) ? (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 106, 61, 0.25)',
                          background: 'rgba(255, 106, 61, 0.06)',
                          display: 'grid',
                          gap: '8px',
                        }}
                      >
                        {item.blocked_by?.length ? (
                          <div>
                            <div style={blockerLabelStyle}>Dependency blockers</div>
                            <div style={blockerValueStyle}>{item.blocked_by.map((dependencyId) => truncateId(dependencyId)).join(' · ')}</div>
                          </div>
                        ) : null}
                        {item.readiness_issues?.length ? (
                          <div>
                            <div style={blockerLabelStyle}>Executable signals</div>
                            <div style={blockerValueStyle}>{item.readiness_issues.map((issue) => READINESS_LABELS[issue] || issue).join(' · ')}</div>
                          </div>
                        ) : null}
                        {item.claimed_by ? (
                          <div>
                            <div style={blockerLabelStyle}>Claim status</div>
                            <div style={blockerValueStyle}>
                              {[
                                item.claimed_by ? `worker ${item.claimed_by}` : null,
                                item.attempt_count ? `attempt ${item.attempt_count}` : null,
                                item.claimed_at ? `claimed ${formatCompactDate(item.claimed_at)}` : null,
                                item.started_at ? `started ${formatCompactDate(item.started_at)}` : null,
                                item.heartbeat_at ? `heartbeat ${formatCompactDate(item.heartbeat_at)}` : null,
                                item.completed_at ? `completed ${formatCompactDate(item.completed_at)}` : null,
                              ].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        ) : null}
                        {item.last_error ? (
                          <div>
                            <div style={blockerLabelStyle}>Last error</div>
                            <div style={blockerValueStyle}>{item.last_error}</div>
                          </div>
                        ) : null}
                        {item.artifact_markdown?.trim() ? (
                          <div>
                            <div style={blockerLabelStyle}>Artifact</div>
                            <pre style={artifactPreviewStyle}>{truncateText(item.artifact_markdown.trim(), 420)}</pre>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
                {columnItems.length === 0 && (
                  <div style={{ padding: '1rem', borderRadius: '8px', border: '1px dashed var(--color-border)', color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'center' }}>
                    Soltá tareas acá
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyArtifact({ text }: { text: string }) {
  return (
    <div style={{ padding: '1rem', borderRadius: '8px', border: '1px dashed var(--color-border)', color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7 }}>
      {text}
    </div>
  )
}

function priorityColor(priority: string | null) {
  if (priority === 'high' || priority === 'critical') return 'var(--color-coral)'
  if (priority === 'medium') return 'var(--color-acid)'
  return 'var(--color-text-faint)'
}

function truncateId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value
}

function formatCompactDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}…` : value
}

const metaCardStyle: React.CSSProperties = {
  background: 'var(--color-surface-1)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  padding: '0.9rem 1rem',
}

const metaLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--color-text-faint)',
  marginBottom: '4px',
}

const metaValueStyle: React.CSSProperties = {
  color: 'var(--color-text)',
  fontFamily: 'var(--font-heading)',
  fontSize: '1.1rem',
}

const blockerLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-coral)',
  marginBottom: '4px',
}

const blockerValueStyle: React.CSSProperties = {
  color: 'var(--color-text)',
  fontSize: '12px',
  lineHeight: 1.5,
}

const artifactCardStyle: React.CSSProperties = {
  background: 'var(--color-surface-1)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  padding: '1rem',
}

const artifactHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '0.85rem',
  flexWrap: 'wrap',
}

const artifactBodyStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  padding: '1rem',
  minHeight: '200px',
}

const artifactPreviewStyle: React.CSSProperties = {
  margin: 0,
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid rgba(214, 255, 63, 0.16)',
  background: 'rgba(214, 255, 63, 0.05)',
  color: 'var(--color-text)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: 'var(--font-body)',
  fontSize: '12px',
  lineHeight: 1.55,
}

const markdownPreStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: 'pre-wrap',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  lineHeight: 1.7,
}

const pillStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text-faint)',
  border: '1px solid var(--color-border)',
  borderRadius: '999px',
  padding: '3px 7px',
}

const statusPillStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderRadius: '999px',
  padding: '4px 8px',
}

const statusMutedPillStyle: React.CSSProperties = {
  ...statusPillStyle,
  color: 'var(--color-text-faint)',
  background: 'rgba(107,103,98,0.12)',
}

const approveButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  border: '1px solid var(--color-acid)',
  borderRadius: '6px',
  background: 'rgba(214,255,63,0.08)',
  color: 'var(--color-acid)',
  padding: '10px 12px',
  cursor: 'pointer',
}
