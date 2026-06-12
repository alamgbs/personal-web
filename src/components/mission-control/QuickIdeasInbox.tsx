'use client'

import { useRef } from 'react'
import { createQuickIdea } from '@/app/actions/ideas'

type QuickIdea = {
  id: string
  title: string
  type: string | null
  status: string
}

type Props = {
  ideas: QuickIdea[]
}

const COLUMNS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'todo', label: 'Todo' },
  { key: 'doing', label: 'Doing' },
]

function TypeBadge({ type }: { type: string | null }) {
  const isDev = type === 'dev' || type === 'development'
  const isBiz = type === 'business'

  if (isDev) {
    return (
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--color-acid)',
          border: '1px solid var(--color-acid)',
          borderRadius: '3px',
          padding: '1px 5px',
          opacity: 0.8,
        }}
      >
        dev
      </span>
    )
  }
  if (isBiz) {
    return (
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--color-coral)',
          border: '1px solid var(--color-coral)',
          borderRadius: '3px',
          padding: '1px 5px',
          opacity: 0.8,
        }}
      >
        biz
      </span>
    )
  }
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--color-text-faint)',
        border: '1px solid var(--color-border)',
        borderRadius: '3px',
        padding: '1px 5px',
      }}
    >
      {type ?? '—'}
    </span>
  )
}

export function QuickIdeasInbox({ ideas }: Props) {
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    await createQuickIdea(formData)
    formRef.current?.reset()
  }

  return (
    <div>
      {/* Kanban columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        {COLUMNS.map((col) => {
          const items = ideas.filter((i) => i.status === col.key)
          return (
            <div key={col.key}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-faint)',
                  marginBottom: '6px',
                  paddingBottom: '4px',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                {col.label}
                <span
                  style={{
                    marginLeft: '6px',
                    color: 'var(--color-text-faint)',
                    opacity: 0.6,
                  }}
                >
                  {items.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {items.length === 0 ? (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-text-faint)',
                      opacity: 0.4,
                      fontStyle: 'italic',
                      padding: '4px 0',
                    }}
                  >
                    Empty
                  </div>
                ) : (
                  items.map((idea) => (
                    <div
                      key={idea.id}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text)',
                          lineHeight: 1.3,
                        }}
                      >
                        {idea.title}
                      </span>
                      <TypeBadge type={idea.type} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add idea form */}
      <form
        ref={formRef}
        action={handleSubmit}
        style={{
          display: 'flex',
          gap: '6px',
          paddingTop: '10px',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <input
          name="title"
          placeholder="Nueva idea…"
          required
          style={{
            flex: 1,
            padding: '6px 10px',
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--color-text)',
            outline: 'none',
          }}
        />
        <select
          name="type"
          defaultValue="dev"
          style={{
            padding: '6px 8px',
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-faint)',
            outline: 'none',
          }}
        >
          <option value="dev">dev</option>
          <option value="business">biz</option>
          <option value="other">other</option>
        </select>
        <button
          type="submit"
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--color-acid)',
            border: 'none',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--color-bg)',
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          +
        </button>
      </form>
    </div>
  )
}
