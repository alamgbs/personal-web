import { createClient } from '@/lib/supabase/server'
import { AgentOrgChart } from '@/components/mission-control/AgentOrgChart'
import { AgentRosterTable } from '@/components/mission-control/AgentRosterTable'
import {
  getLastVerifiedAt,
  getRuntimeStatusLabel,
  sortAgents,
  type AgentRow,
} from '@/lib/mission-control/agents'

export const metadata = { title: 'Agentes · Mission Control' }

export default async function AgentesPage() {
  const supabase = await createClient()

  const { data: agents, error } = await supabase
    .from('agents')
    .select(
      'id, name, slug, role, team, soul, soul_short, skills, model, llm_model, cost_tier, parent_id, responsibilities, status, avatar_emoji, runtime_profile_name, honcho_ai_peer, runtime_type, default_toolsets, default_skills, provider, memory_provider, runtime_status, last_verified_at'
    )

  if (error) {
    console.error('Error fetching agents:', error)
  }

  const agentList = sortAgents((agents || []) as AgentRow[])
  const activeCount = agentList.filter((agent) => agent.status === 'active').length
  const premiumCount = agentList.filter((agent) => ['C10', 'C9'].includes(agent.cost_tier || '')).length
  const runtimeReadyCount = agentList.filter((agent) => getRuntimeStatusLabel(agent) === 'active').length
  const recentlyVerifiedCount = agentList.filter((agent) => Boolean(agent.last_verified_at)).length

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
          primary skills, cost tier, llm_model editable y una asignación explícita hacia
          su runtime Hermes persistente.
        </p>
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {[
          { label: 'Agentes', value: String(agentList.length) },
          { label: 'Activos', value: String(activeCount) },
          { label: 'Premium C9–C10', value: String(premiumCount) },
          { label: 'Runtime ready', value: String(runtimeReadyCount) },
          { label: 'Runtime verificados', value: String(recentlyVerifiedCount) },
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
        <AgentRosterTable agents={agentList} />
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
          Mission Control ya puede leer desde Supabase el vínculo agente→perfil con
          runtime status, profile name, peer de Honcho, provider, defaults operativos y
          timestamp de última verificación. Esto deja el roster listo para enrutar trabajo
          hacia perfiles Hermes reales sin redefinir la estructura del equipo.
          Últimos checks visibles: {recentlyVerifiedCount > 0 ? getLastVerifiedAt(agentList.filter((agent) => agent.last_verified_at).sort((a, b) => new Date(b.last_verified_at || 0).getTime() - new Date(a.last_verified_at || 0).getTime())[0]) : 'sin verificaciones registradas'}.
        </p>
      </section>
    </div>
  )
}
