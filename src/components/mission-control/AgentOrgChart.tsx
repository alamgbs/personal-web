'use client'

import { useState } from 'react'

type Agent = {
  id: string
  name: string
  slug: string
  role: string
  team: string | null
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

function AgentCard({
  agent,
  onClick,
}: {
  agent: Agent | null
  onClick?: () => void
  placeholder?: boolean
}) {
  if (!agent) {
    return (
      <button
        onClick={onClick}
        style={{
          background: 'transparent',
          border: '1px dashed var(--color-border)',
          borderRadius: '8px',
          padding: '12px',
          cursor: 'pointer',
          color: 'var(--color-text-faint)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          width: '100%',
          minWidth: '140px',
        }}
      >
        + Add Agent
      </button>
    )
  }

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
        minWidth: '140px',
        transition: 'border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-acid)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '20px' }}>{agent.avatar_emoji || '🤖'}</span>
        <div>
          <div style={{ color: 'var(--color-text)', fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
            {agent.name}
          </div>
          <div style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {agent.role}
          </div>
        </div>
      </div>
      {agent.model && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.08em',
          color: 'var(--color-acid)',
          background: 'rgba(214,255,63,0.08)',
          borderRadius: '3px',
          padding: '2px 6px',
          alignSelf: 'flex-start',
          textTransform: 'uppercase',
        }}>
          {agent.model}
        </div>
      )}
    </button>
  )
}

function SlideOver({ agent, onClose }: { agent: Agent; onClose: () => void }) {
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
              <h3 style={{ margin: 0, fontSize: '18px', fontFamily: 'var(--font-heading)' }}>{agent.name}</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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

        {agent.model && (
          <div>
            <div style={sectionLabel}>Modelo</div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-acid)',
              background: 'rgba(214,255,63,0.08)',
              borderRadius: '4px',
              padding: '4px 10px',
            }}>
              {agent.model}
            </span>
          </div>
        )}

        {agent.soul && (
          <div>
            <div style={sectionLabel}>Soul / System Prompt</div>
            <p style={{
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
            }}>
              {agent.soul}
            </p>
          </div>
        )}

        {agent.skills && agent.skills.length > 0 && (
          <div>
            <div style={sectionLabel}>Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {agent.skills.map((skill) => (
                <span
                  key={skill}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text)',
                    background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '3px',
                    padding: '3px 8px',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {agent.responsibilities && agent.responsibilities.length > 0 && (
          <div>
            <div style={sectionLabel}>Responsabilidades</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {agent.responsibilities.map((r, i) => (
                <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-acid)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginTop: '2px' }}>→</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{r}</span>
                </li>
              ))}
            </ul>
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

export function AgentOrgChart({ agents }: Props) {
  const [selected, setSelected] = useState<Agent | null>(null)

  const owner = agents.find((a) => a.role === 'owner')
  const orchestrator = agents.find((a) => a.role === 'orchestrator')

  const teamLeads = TEAMS.reduce<Record<string, Agent | null>>((acc, team) => {
    acc[team] = agents.find((a) => a.team === team && a.role === 'team_lead') || null
    return acc
  }, {})

  const teamMembers = TEAMS.reduce<Record<string, Agent[]>>((acc, team) => {
    acc[team] = agents.filter((a) => a.team === team && a.role !== 'team_lead')
    return acc
  }, {})

  const lineStyle: React.CSSProperties = {
    width: '1px',
    height: '24px',
    background: 'var(--color-border)',
    margin: '0 auto',
  }

  const hLineStyle: React.CSSProperties = {
    height: '1px',
    background: 'var(--color-border)',
    flex: 1,
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
      {/* Owner */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0' }}>
        <div style={{ width: '180px' }}>
          {owner ? (
            <AgentCard agent={owner} onClick={() => setSelected(owner)} />
          ) : (
            <AgentCard agent={null} placeholder />
          )}
        </div>
      </div>

      {/* Line */}
      <div style={lineStyle} />

      {/* Orchestrator */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '180px' }}>
          {orchestrator ? (
            <AgentCard agent={orchestrator} onClick={() => setSelected(orchestrator)} />
          ) : (
            <AgentCard agent={null} placeholder />
          )}
        </div>
      </div>

      {/* Line + horizontal branch */}
      <div style={lineStyle} />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <div style={hLineStyle} />
        <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />
        <div style={hLineStyle} />
      </div>

      {/* Teams */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
        {TEAMS.map((team) => {
          const lead = teamLeads[team]
          const members = teamMembers[team]
          return (
            <div key={team} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              {/* Team label */}
              <div style={{
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
              }}>
                {team}
              </div>
              {/* Drop line */}
              <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />
              {/* Lead */}
              <div style={{ width: '100%' }}>
                <AgentCard
                  agent={lead}
                  onClick={lead ? () => setSelected(lead) : undefined}
                  placeholder={!lead}
                />
              </div>
              {/* Members */}
              {members.length > 0 && (
                <>
                  <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                    {members.map((m) => (
                      <AgentCard key={m.id} agent={m} onClick={() => setSelected(m)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {selected && <SlideOver agent={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
