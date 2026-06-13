'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { approveProjectPrd, moveBacklogItem } from '@/app/actions/projects'

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
  delivery_status: string | null
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

export function ProjectKanbanBoard({ project, items }: Props) {
  const [localItems, setLocalItems] = useState(items)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setLocalItems(items)
  }, [items])

  const grouped = useMemo(() => {
    const sorted = [...localItems].sort((a, b) => (a.position || 0) - (b.position || 0))
    return {
      backlog: sorted.filter((item) => (item.status || 'backlog') === 'backlog'),
      in_progress: sorted.filter((item) => item.status === 'in_progress'),
      done: sorted.filter((item) => item.status === 'done'),
    }
  }, [localItems])

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

  function handleApprovePrd() {
    setError(null)
    setFeedback(null)
    startTransition(async () => {
      const result = await approveProjectPrd(project.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      setFeedback('PRD aprobado. Se generaron las tareas de planificación posteriores.')
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
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-acid)', marginBottom: '6px' }}>
            Mission Control
          </div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--color-text)' }}>{project.name}</h1>
          {project.description && (
            <p style={{ maxWidth: '900px', color: 'var(--color-text-faint)', fontSize: '14px', lineHeight: 1.6, marginTop: '8px' }}>
              {project.description}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gap: '10px', minWidth: '280px' }}>
          <div style={metaCardStyle}>
            <div style={metaLabelStyle}>PRD Status</div>
            <div style={metaValueStyle}>{project.prd_status || 'pending'}</div>
          </div>
          <div style={metaCardStyle}>
            <div style={metaLabelStyle}>Delivery Status</div>
            <div style={metaValueStyle}>{project.delivery_status || 'waiting_prd'}</div>
          </div>
          {project.prd_status !== 'approved' && (
            <button onClick={handleApprovePrd} disabled={isPending} style={approveButtonStyle}>
              {isPending ? 'Procesando...' : 'Aprobar PRD y generar plan'}
            </button>
          )}
        </div>
      </div>

      {(feedback || error) && (
        <div style={{ marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '11px', color: error ? 'var(--color-coral)' : '#4ade80' }}>
          {error ? `✗ ${error}` : `✓ ${feedback}`}
        </div>
      )}

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
                      {item.type && <span style={pillStyle}>{item.type}</span>}
                      {(item.tags || []).slice(0, 3).map((tag) => (
                        <span key={tag} style={pillStyle}>{tag}</span>
                      ))}
                    </div>
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

function priorityColor(priority: string | null) {
  if (priority === 'high' || priority === 'critical') return 'var(--color-coral)'
  if (priority === 'medium') return 'var(--color-acid)'
  return 'var(--color-text-faint)'
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
