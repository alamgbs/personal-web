'use client'

import { useState } from 'react'
import { createProject } from '@/app/actions/projects'

export function AddProjectForm() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await createProject(fd)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setOpen(false)
      ;(e.target as HTMLFormElement).reset()
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-acid)',
          background: 'transparent',
          border: '1px solid var(--color-acid)',
          borderRadius: '4px',
          padding: '6px 14px',
          cursor: 'pointer',
        }}
      >
        {open ? '− Cerrar' : '+ Nuevo Proyecto'}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: '1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
          }}
        >
          {field('name', 'Nombre del proyecto', 'Mi Proyecto')}
          {field('slug', 'Slug', 'mi-proyecto')}
          
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Descripción</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Descripción breve del proyecto..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {field('github_repo', 'GitHub Repo URL', 'https://github.com/...')}
          {field('url', 'URL del proyecto', 'https://...')}
          {field('tech_stack', 'Tech Stack (coma-separado)', 'Next.js, Supabase, TypeScript')}

          <div>
            <label style={labelStyle}>Status</label>
            <select name="status" style={selectStyle}>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="completed">completed</option>
              <option value="archived">archived</option>
            </select>
          </div>

          {error && (
            <div style={{ gridColumn: '1 / -1', color: 'var(--color-coral)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              ✗ {error}
            </div>
          )}

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setOpen(false)} style={cancelBtnStyle}>Cancelar</button>
            <button type="submit" disabled={loading} style={submitBtnStyle}>
              {loading ? 'Guardando...' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function field(name: string, label: string, placeholder: string) {
  return (
    <div key={name}>
      <label style={labelStyle}>{label}</label>
      <input name={name} placeholder={placeholder} style={inputStyle} />
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--color-text-faint)',
  marginBottom: '4px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  padding: '6px 10px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
}

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' }

const submitBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'var(--color-acid)',
  color: 'var(--color-bg)',
  border: 'none',
  borderRadius: '4px',
  padding: '7px 16px',
  cursor: 'pointer',
  fontWeight: 700,
}

const cancelBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'transparent',
  color: 'var(--color-text-faint)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  padding: '7px 16px',
  cursor: 'pointer',
}
