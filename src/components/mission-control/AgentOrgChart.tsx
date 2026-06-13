'use client'

import { useMemo, useState } from 'react'
import { getAgentModel, getCostTierLabel, getSoulPreview, type AgentRow } from '@/lib/mission-control/agents'

type Props = {
  agents: AgentRow[]
}

type AgentGroup = {
  lead: AgentRow
  members: AgentRow[]
}

function AgentCard({
  agent,
  onClick,
}: {
  agent: AgentRow
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '10px 12px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        minWidth: '180px',
        transition: 'border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-acid)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>{agent.avatar_emoji || '🤖'}</span>
        <div>
          <div
            style={{
              color: 'var(--color-text)',
              fontSize: '13px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
            }}
          >
            {agent.name}
          </div>
          <div
            style={{
              color: 'var(--color-text-faint)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {agent.role}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <span style={pillStyle}>{getCostTierLabel(agent)}</span>
        <span style={pillStyle}>{getAgentModel(agent)}</span>
      </div>
    </button>
  )
}

function SlideOver({ agent, onClose }: { agent: AgentRow; onClose: () => void }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 40,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '420px',
          background: 'var(--color-surface-2)',
          borderLeft: '1px solid var(--color-border)',
          zIndex: 50,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '32px' }}>{agent.avatar_emoji || '🤖'}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontFamily: 'var(--font-heading)' }}>
                {agent.name}
              </h3>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-text-faint)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {agent.role} · {agent.team || 'No team'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-faint)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span style={detailPillStyle}>{getCostTierLabel(agent)}</span>
          <span style={detailPillStyle}>{getAgentModel(agent)}</span>
          <span style={detailPillStyle}>{agent.status || 'active'}</span>
        </div>

        <div>
          <div style={sectionLabel}>Soul corta</div>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: 'var(--color-text)',
              lineHeight: 1.6,
            }}
          >
            {getSoulPreview(agent)}
          </p>
        </div>

        <div>
          <div style={sectionLabel}>Primary skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(agent.skills || []).map((skill) => (
              <span key={skill} style={detailPillStyle}>
                {skill}
              </span>
            ))}
          </div>
        </div>

        {agent.soul && agent.soul !== agent.soul_short && (
          <div>
            <div style={sectionLabel}>Soul extendida</div>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-text)',
                lineHeight: 1.6,
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '10px 12px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {agent.soul}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-acid)',
  marginBottom: '6px',
}

const pillStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.08em',
  color: 'var(--color-acid)',
  background: 'rgba(214,255,63,0.08)',
  borderRadius: '999px',
  padding: '2px 6px',
  textTransform: 'uppercase',
}

const detailPillStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text)',
  background: 'var(--color-surface-3)',
  border: '1px solid var(--color-border)',
  borderRadius: '999px',
  padding: '4px 8px',
}

export function AgentOrgChart({ agents }: Props) {
  const [selected, setSelected] = useState<AgentRow | null>(null)

  const { owner, orchestrator, groups } = useMemo(() => {
    const owner = agents.find((agent) => agent.slug === 'alam') || null
    const orchestrator = agents.find((agent) => agent.slug === 'hermes') || null

    if (!orchestrator) {
      return { owner, orchestrator, groups: [] as AgentGroup[] }
    }

    const leadAgents = agents.filter((agent) => agent.parent_id === orchestrator.id)
    const groups = leadAgents.map((lead) => ({
      lead,
      members: agents.filter((agent) => agent.parent_id === lead.id),
    }))

    return { owner, orchestrator, groups }
  }, [agents])

  const lineStyle: React.CSSProperties = {
    width: '1px',
    height: '24px',
    background: 'var(--color-border)',
    margin: '0 auto',
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
      {owner && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '220px' }}>
              <AgentCard agent={owner} onClick={() => setSelected(owner)} />
            </div>
          </div>
          <div style={lineStyle} />
        </>
      )}

      {orchestrator && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '220px' }}>
              <AgentCard agent={orchestrator} onClick={() => setSelected(orchestrator)} />
            </div>
          </div>
          {groups.length > 0 && <div style={lineStyle} />}
        </>
      )}

      {groups.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${groups.length}, minmax(180px, 1fr))`,
            gap: '1.5rem',
            maxWidth: '980px',
            margin: '0 auto',
          }}
        >
          {groups.map(({ lead, members }) => (
            <div key={lead.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-acid)',
                  marginBottom: '4px',
                  borderBottom: '1px solid rgba(214,255,63,0.2)',
                  paddingBottom: '4px',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                {lead.team}
              </div>
              <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />
              <div style={{ width: '100%' }}>
                <AgentCard agent={lead} onClick={() => setSelected(lead)} />
              </div>
              {members.length > 0 && (
                <>
                  <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                    {members.map((member) => (
                      <AgentCard key={member.id} agent={member} onClick={() => setSelected(member)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && <SlideOver agent={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
