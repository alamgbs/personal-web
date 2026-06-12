'use client'

import { useState } from 'react'
import { createAgent } from '@/app/actions/agents'

type Agent = {
  id: string
  name: string
  slug: string
  role: string
  team: string
  soul: string | null
  skills: string[] | null
  model: string | null
  parent_id: string | null
  responsibilities: string[] | null
  status: string | null
  avatar_emoji: string | null
}

type Props = {
  agents: Agent[]
}

const TEAMS = ['Marketing', 'Producto', 'Desarrollo']
const ROLES = ['owner', 'orchestrator', 'team_lead', 'specialist', 'analyst', 'engineer']
const MODELS = ['gpt-4o', 'gpt-4o-mini', 'claude-opus-4-5', 'claude-sonnet-4-5', 'gemini-2.0-flash', 'hermes-3']

export function AddAgentForm({ agents }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await createAgent(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setOpen(false)
      ;(e.target as HTMLFormElement).reset()
    }
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
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
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {open ? '− Cerrar' : '+ Agregar Agente'}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: '1rem',
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
          }}
        >
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-acid)' }}>
              NUEVO AGENTE
            </span>
          </div>

          {inputField('name', 'Nombre', 'Hermes')}
          {inputField('slug', 'Slug', 'hermes')}
          
          <div>
            <label style={labelStyle}>Rol</label>
            <select name="role" required style={selectStyle}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Team</label>
            <select name="team" style={selectStyle}>
              <option value="">Sin equipo</option>
              {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Modelo IA</label>
            <select name="model" style={selectStyle}>
              {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Avatar Emoji</label>
            <input name="avatar_emoji" placeholder="🤖" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Parent (Reporta a)</label>
            <select name="parent_id" style={selectStyle}>
              <option value="">Ninguno</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {inputField('skills', 'Skills (coma-separadas)', 'copywriting, SEO, analytics')}

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Responsibilities (coma-separadas)</label>
            <input name="responsibilities" placeholder="Gestionar redes sociales, Crear contenido" style={inputStyle} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Soul / System Prompt</label>
            <textarea
              name="soul"
              rows={3}
              placeholder="Eres un agente especializado en..."
              style={{
                ...inputStyle,
                resize: 'vertical',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            />
          </div>

          {error && (
            <div style={{ gridColumn: '1 / -1', color: 'var(--color-coral)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              ✗ {error}
            </div>
          )}

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setOpen(false)} style={cancelBtnStyle}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={submitBtnStyle}>
              {loading ? 'Guardando...' : 'Crear Agente'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function inputField(name: string, label: string, placeholder: string) {
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
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
}

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
