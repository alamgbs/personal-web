'use client'

import { useState } from 'react'
import { createBacklogItem, updateBacklogItemStatus } from '@/app/actions/projects'

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

type Props = {
  projectId: string
  items: BacklogItem[]
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'var(--color-coral)',
  high: 'var(--color-acid)',
  medium: '#9b988e',
  low: 'var(--color-text-faint)',
}

const STATUS_FILTERS = ['all', 'backlog', 'in_progress', 'done']

const TYPE_COLORS: Record<string, string> = {
  feature: 'rgba(214,255,63,0.15)',
  bug: 'rgba(255,106,61,0.15)',
  task: 'rgba(232,228,220,0.08)',
  chore: 'rgba(155,152,142,0.15)',
}

export function ProjectBacklog({ projectId, items }: Props) {
  const [filter, setFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter)

  async function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.append('project_id', projectId)
    const result = await createBacklogItem(fd)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setShowAddForm(false)
      ;(e.target as HTMLFormElement).reset()
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id)
    await updateBacklogItemStatus(id, status)
    setUpdatingId(null)
  }

  const counts = {
    backlog: items.filter((i) => i.status === 'backlog').length,
    in_progress: items.filter((i) => i.status === 'in_progress').length,
    done: items.filter((i) => i.status === 'done').length,
  }

  return (
    <div style={{ paddingTop: '1rem' }}>
      {/* Status counts */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-faint)' }}>
            <span style={{ color: 'var(--color-text)' }}>{v}</span> {k.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem' }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: '3px',
              border: '1px solid',
              cursor: 'pointer',
              borderColor: filter === s ? 'var(--color-acid)' : 'var(--color-border)',
              background: filter === s ? 'rgba(214,255,63,0.08)' : 'transparent',
              color: filter === s ? 'var(--color-acid)' : 'var(--color-text-faint)',
              transition: 'all 0.15s',
            }}
          >
            {s === 'all' ? 'Todos' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem' }}>
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center', padding: '1rem' }}>
            Sin items en esta categoría
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '5px',
                opacity: updatingId === item.id ? 0.5 : 1,
              }}
            >
              {/* Drag handle (visual only) */}
              <span style={{ color: 'var(--color-text-faint)', fontSize: '12px', cursor: 'grab', userSelect: 'none' }}>⠿</span>

              {/* Priority dot */}
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                flexShrink: 0,
                background: PRIORITY_COLORS[item.priority || 'medium'] || PRIORITY_COLORS.medium,
              }} />

              {/* Title */}
              <span style={{
                flex: 1,
                fontSize: '13px',
                color: item.status === 'done' ? 'var(--color-text-faint)' : 'var(--color-text)',
                textDecoration: item.status === 'done' ? 'line-through' : 'none',
              }}>
                {item.title}
              </span>

              {/* Type badge */}
              {item.type && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: TYPE_COLORS[item.type] || TYPE_COLORS.task,
                  color: 'var(--color-text-faint)',
                  border: '1px solid var(--color-border)',
                }}>
                  {item.type}
                </span>
              )}

              {/* Assignee */}
              {item.assignee_slug && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-faint)' }}>
                  @{item.assignee_slug}
                </span>
              )}

              {/* Status selector */}
              <select
                value={item.status || 'backlog'}
                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  background: 'var(--color-surface-3)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  color: 'var(--color-text-faint)',
                  cursor: 'pointer',
                }}
              >
                <option value="backlog">backlog</option>
                <option value="in_progress">in progress</option>
                <option value="done">done</option>
              </select>
            </div>
          ))
        )}
      </div>

      {/* Add item */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'transparent',
            border: '1px dashed var(--color-border)',
            borderRadius: '4px',
            padding: '6px 12px',
            color: 'var(--color-text-faint)',
            cursor: 'pointer',
          }}
        >
          + Agregar item
        </button>
      ) : (
        <form
          onSubmit={handleAddItem}
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
          }}
        >
          <div style={{ gridColumn: '1 / -1' }}>
            <input
              name="title"
              required
              placeholder="Título del item..."
              style={{
                width: '100%',
                background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                padding: '6px 10px',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
              }}
            />
          </div>

          <select
            name="priority"
            style={miniSelectStyle}
          >
            <option value="low">low</option>
            <option value="medium" defaultValue="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>

          <select name="type" style={miniSelectStyle}>
            <option value="task">task</option>
            <option value="feature">feature</option>
            <option value="bug">bug</option>
            <option value="chore">chore</option>
          </select>

          <div style={{ gridColumn: '1 / -1' }}>
            <textarea
              name="description"
              rows={2}
              placeholder="Descripción (opcional)..."
              style={{
                width: '100%',
                background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                padding: '6px 10px',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                resize: 'vertical',
              }}
            />
          </div>

          {error && (
            <div style={{ gridColumn: '1 / -1', color: 'var(--color-coral)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              ✗ {error}
            </div>
          )}

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowAddForm(false)} style={miniCancelStyle}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={miniSubmitStyle}>
              {loading ? '...' : 'Agregar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

const miniSelectStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  background: 'var(--color-surface-3)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  padding: '5px 8px',
  color: 'var(--color-text)',
}

const miniSubmitStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'var(--color-acid)',
  color: 'var(--color-bg)',
  border: 'none',
  borderRadius: '4px',
  padding: '6px 14px',
  cursor: 'pointer',
  fontWeight: 700,
}

const miniCancelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'transparent',
  color: 'var(--color-text-faint)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  padding: '6px 14px',
  cursor: 'pointer',
}
