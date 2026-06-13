import { createClient } from '@/lib/supabase/server'
import { AgentOrgChart } from '@/components/mission-control/AgentOrgChart'
import {
  getAgentModel,
  getCostTierLabel,
  getSoulPreview,
  sortAgents,
  type AgentRow,
} from '@/lib/mission-control/agents'

export const metadata = { title: 'Agentes · Mission Control' }

export default async function AgentesPage() {
  const supabase = await createClient()

  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, slug, role, team, soul, soul_short, skills, model, llm_model, cost_tier, parent_id, responsibilities, status, avatar_emoji')

  if (error) {
    console.error('Error fetching agents:', error)
  }

  const agentList = sortAgents((agents || []) as AgentRow[])
  const activeCount = agentList.filter((agent) => agent.status === 'active').length
  const premiumCount = agentList.filter((agent) => ['C10', 'C9'].includes(agent.cost_tier || '')).length

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg)',
        padding: '2rem',
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-acid)',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          MISSION CONTROL
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-heading)',
            fontSize: '2rem',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--color-text)',
          }}
        >
          Agentes
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: '14px',
            color: 'var(--color-text-faint)',
            fontFamily: 'var(--font-body)',
            maxWidth: '860px',
          }}
        >
          Roster canónico del sistema. Cada agente tiene identidad estable, soul corta,
          primary skills, cost tier y un llm_model editable para evolucionar con el tiempo.
        </p>
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {[
          { label: 'Agentes', value: String(agentList.length) },
          { label: 'Activos', value: String(activeCount) },
          { label: 'Premium C9–C10', value: String(premiumCount) },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '1rem 1.1rem',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-text-faint)',
                marginBottom: '0.45rem',
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.75rem',
                color: 'var(--color-text)',
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </section>

      <section
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-acid)',
            marginBottom: '1.25rem',
          }}
        >
          ORGANIGRAMA CANÓNICO
        </div>
        <AgentOrgChart agents={agentList} />
      </section>

      <section
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            alignItems: 'flex-end',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-acid)',
                marginBottom: '0.35rem',
              }}
            >
              TABLA MAESTRA
            </div>
            <p
              style={{
                margin: 0,
                color: 'var(--color-text-faint)',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
              }}
            >
              Fuente de verdad para roster, skills primarias, costo relativo y primer modelo sugerido.
            </p>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-text-faint)',
            }}
          >
            Editable a futuro vía llm_model
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              minWidth: '1100px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Avatar', 'Nombre', 'Rol', 'Team', 'Soul corta', 'Primary skills', 'Cost', 'LLM model', 'Estado'].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-faint)',
                      fontWeight: 400,
                      verticalAlign: 'top',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentList.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: '1.5rem 12px',
                      color: 'var(--color-text-faint)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      textAlign: 'center',
                    }}
                  >
                    No hay agentes cargados en Supabase.
                  </td>
                </tr>
              ) : (
                agentList.map((agent) => (
                  <tr key={agent.id} style={{ borderBottom: '1px solid rgba(42,42,38,0.5)' }}>
                    <td style={{ padding: '10px 12px', fontSize: '18px', verticalAlign: 'top' }}>
                      {agent.avatar_emoji || '🤖'}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <div style={{ color: 'var(--color-text)', fontWeight: 500 }}>{agent.name}</div>
                      <div
                        style={{
                          color: 'var(--color-text-faint)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          letterSpacing: '0.08em',
                          marginTop: '4px',
                        }}
                      >
                        {agent.slug}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--color-text-faint)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        verticalAlign: 'top',
                      }}
                    >
                      {agent.role}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-faint)', fontSize: '12px', verticalAlign: 'top' }}>
                      {agent.team || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text)', maxWidth: '280px', verticalAlign: 'top', lineHeight: 1.5 }}>
                      {getSoulPreview(agent)}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '260px' }}>
                        {(agent.skills || []).map((skill) => (
                          <span
                            key={skill}
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              letterSpacing: '0.06em',
                              color: 'var(--color-text)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '999px',
                              padding: '3px 7px',
                              background: 'var(--color-surface-2)',
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: 'var(--color-acid)',
                          background: 'rgba(214,255,63,0.08)',
                          borderRadius: '4px',
                          padding: '4px 8px',
                        }}
                      >
                        {getCostTierLabel(agent)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--color-acid)',
                          background: 'rgba(214,255,63,0.08)',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          display: 'inline-block',
                        }}
                      >
                        {getAgentModel(agent)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: agent.status === 'active' ? 'var(--color-acid)' : 'var(--color-text-faint)',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: agent.status === 'active' ? 'var(--color-acid)' : 'var(--color-text-faint)',
                            display: 'inline-block',
                          }}
                        />
                        {agent.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-acid)',
            marginBottom: '0.4rem',
          }}
        >
          Runtime note
        </div>
        <p style={{ margin: 0, color: 'var(--color-text-faint)', fontSize: '13px', lineHeight: 1.6 }}>
          Por ahora Mission Control respeta la tabla canónica cargada en Supabase. El campo
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)', margin: '0 0.3ch' }}>
            llm_model
          </span>
          queda listo para cambiar proveedores o modelos más adelante sin redefinir el roster.
        </p>
      </section>
    </div>
  )
}
