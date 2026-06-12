import { createClient } from '@/lib/supabase/server'
import { AgentOrgChart } from '@/components/mission-control/AgentOrgChart'
import { AddAgentForm } from '@/components/mission-control/AddAgentForm'

export const metadata = { title: 'Agentes · Mission Control' }

export default async function AgentesPage() {
  const supabase = await createClient()

  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching agents:', error)
  }

  const agentList = agents || []

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg)',
      padding: '2rem',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-acid)',
          display: 'block',
          marginBottom: '6px',
        }}>
          MISSION CONTROL
        </span>
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--font-heading)',
          fontSize: '2rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--color-text)',
        }}>
          Agentes
        </h1>
        <p style={{
          margin: '6px 0 0',
          fontSize: '14px',
          color: 'var(--color-text-faint)',
          fontFamily: 'var(--font-body)',
        }}>
          Organigrama del sistema
        </p>
      </div>

      {/* Section A: Org Chart */}
      <section style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-acid)',
          marginBottom: '1.25rem',
        }}>
          ORGANIGRAMA
        </div>
        <AgentOrgChart agents={agentList} />
      </section>

      {/* Section B: Agent List */}
      <section style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-acid)',
          marginBottom: '1rem',
        }}>
          LISTA DE AGENTES
        </div>

        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Avatar', 'Nombre', 'Rol', 'Equipo', 'Modelo', 'Estado'].map((col) => (
                <th key={col} style={{
                  textAlign: 'left',
                  padding: '6px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-faint)',
                  fontWeight: 400,
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agentList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '1.5rem 12px', color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center' }}>
                  No hay agentes aún. Crea el primero abajo.
                </td>
              </tr>
            ) : (
              agentList.map((agent) => (
                <tr
                  key={agent.id}
                  style={{ borderBottom: '1px solid rgba(42,42,38,0.5)' }}
                >
                  <td style={{ padding: '8px 12px', fontSize: '18px' }}>{agent.avatar_emoji || '🤖'}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--color-text)', fontWeight: 500 }}>{agent.name}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{agent.role}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--color-text-faint)', fontSize: '12px' }}>{agent.team || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {agent.model && (
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-acid)',
                        background: 'rgba(214,255,63,0.08)',
                        borderRadius: '3px',
                        padding: '2px 7px',
                        letterSpacing: '0.06em',
                      }}>
                        {agent.model}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: agent.status === 'active' ? 'var(--color-acid)' : 'var(--color-text-faint)',
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: agent.status === 'active' ? 'var(--color-acid)' : 'var(--color-text-faint)',
                        display: 'inline-block',
                      }} />
                      {agent.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Section C: Add Agent Form */}
      <section style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-acid)',
          marginBottom: '0.5rem',
        }}>
          GESTIÓN
        </div>
        <AddAgentForm agents={agentList} />
      </section>
    </div>
  )
}
