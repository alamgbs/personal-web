'use client'

import { useState } from 'react'
import { createBusinessIdea } from '@/app/actions/ideas'

type Idea = {
  id: string
  title: string
  slug: string
  summary: string | null
  status: string | null
  current_step: number | null
  step_data: Record<string, unknown> | null
  step_approvals: Record<string, unknown> | null
}

type Props = {
  ideas: Idea[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--color-text-faint)',
  in_analysis: 'var(--color-acid)',
  approved: '#4ade80',
  rejected: 'var(--color-coral)',
  in_development: '#60a5fa',
}

const STATUS_BG: Record<string, string> = {
  draft: 'rgba(107,103,98,0.1)',
  in_analysis: 'rgba(214,255,63,0.1)',
  approved: 'rgba(74,222,128,0.1)',
  rejected: 'rgba(255,106,61,0.1)',
  in_development: 'rgba(96,165,250,0.1)',
}

export function IdeaList({ ideas, selectedId, onSelect }: Props) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateIdea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await createBusinessIdea(fd)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setShowNewForm(false)
      ;(e.target as HTMLFormElement).reset()
    }
  }

  return (
    <div style={{
      width: '288px',
      flexShrink: 0,
      borderRight: '1px solid var(--color-border)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-acid)',
            marginBottom: '2px',
          }}>
            IDEAS
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-faint)' }}>
            {ideas.length} ideas
          </div>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: showNewForm ? 'rgba(214,255,63,0.1)' : 'transparent',
            border: '1px solid var(--color-acid)',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
            color: 'var(--color-acid)',
          }}
        >
          + Nueva
        </button>
      </div>

      {/* New idea form */}
      {showNewForm && (
        <form
          onSubmit={handleCreateIdea}
          style={{
            padding: '1rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'var(--color-surface-2)',
          }}
        >
          <div>
            <label style={labelStyle}>Título</label>
            <input
              name="title"
              required
              placeholder="Nombre de la idea..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Resumen breve</label>
            <textarea
              name="summary"
              rows={2}
              placeholder="¿De qué trata? (1-2 frases)"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          {error && (
            <div style={{ color: 'var(--color-coral)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              ✗ {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowNewForm(false)} style={cancelStyle}>✕</button>
            <button type="submit" disabled={loading} style={submitStyle}>
              {loading ? '...' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      {/* Ideas list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
        {ideas.length === 0 ? (
          <div style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            color: 'var(--color-text-faint)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            lineHeight: 1.6,
          }}>
            No hay ideas aún.<br />Crea la primera.
          </div>
        ) : (
          ideas.map((idea) => {
            const step = idea.current_step ?? 0
            const status = idea.status || 'draft'
            const isSelected = idea.id === selectedId

            return (
              <button
                key={idea.id}
                onClick={() => onSelect(idea.id)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: isSelected ? 'var(--color-surface-2)' : 'transparent',
                  border: 'none',
                  borderLeft: isSelected ? '2px solid var(--color-acid)' : '2px solid transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-text)',
                  fontWeight: isSelected ? 500 : 400,
                  lineHeight: 1.3,
                }}>
                  {idea.title}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: STATUS_BG[status] || STATUS_BG.draft,
                    color: STATUS_COLORS[status] || STATUS_COLORS.draft,
                  }}>
                    {status.replace('_', ' ')}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--color-text-faint)',
                  }}>
                    paso {step}/8
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{
                  height: '2px',
                  background: 'var(--color-surface-3)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(step / 8) * 100}%`,
                    background: 'var(--color-acid)',
                    borderRadius: '2px',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text-faint)',
  marginBottom: '3px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-surface-1)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  padding: '6px 8px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)',
  fontSize: '12px',
}

const submitStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'var(--color-acid)',
  color: 'var(--color-bg)',
  border: 'none',
  borderRadius: '4px',
  padding: '5px 12px',
  cursor: 'pointer',
  fontWeight: 700,
}

const cancelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  background: 'transparent',
  color: 'var(--color-text-faint)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  padding: '5px 10px',
  cursor: 'pointer',
}
