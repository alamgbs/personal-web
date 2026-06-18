'use client'

import { useMemo, useState, useTransition } from 'react'
import { updateAgentRuntime } from '@/app/actions/agents'
import {
  AGENT_PROVIDER,
  CODEX_MODEL_OPTIONS,
  COST_TIER_OPTIONS,
  getAgentModel,
  getCostTierLabel,
  getDefaultCodexModelForTier,
  getHonchoPeer,
  getLastVerifiedAt,
  getRuntimeProfile,
  getRuntimeSkills,
  getRuntimeStatusLabel,
  getRuntimeToolsets,
  getSoulPreview,
  type AgentRow,
} from '@/lib/mission-control/agents'

type Props = {
  agents: AgentRow[]
}

type DraftState = Record<
  string,
  {
    cost_tier: string
    llm_model: string
    soul_short: string
  }
>

function buildDrafts(agents: AgentRow[]): DraftState {
  return Object.fromEntries(
    agents.map((agent) => [
      agent.id,
      {
        cost_tier: agent.cost_tier || '',
        llm_model: agent.llm_model || agent.model || getDefaultCodexModelForTier(agent.cost_tier) || '',
        soul_short: agent.soul_short || agent.soul || '',
      },
    ])
  )
}

export function AgentRosterTable({ agents }: Props) {
  const computedDrafts = useMemo(() => buildDrafts(agents), [agents])
  const [drafts, setDrafts] = useState<DraftState>(computedDrafts)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateDraft(id: string, patch: Partial<DraftState[string]>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }))
  }

  function applyTierDefault(id: string) {
    const tier = drafts[id]?.cost_tier || null
    const defaultModel = getDefaultCodexModelForTier(tier)
    if (!defaultModel) return
    updateDraft(id, { llm_model: defaultModel })
  }

  function saveAgent(agent: AgentRow) {
    const draft = drafts[agent.id]
    if (!draft) return

    setSavingId(agent.id)
    setMessage(null)
    setError(null)

    startTransition(async () => {
      const result = await updateAgentRuntime({
        id: agent.id,
        cost_tier: draft.cost_tier || null,
        llm_model: draft.llm_model || null,
        soul_short: draft.soul_short || null,
      })

      setSavingId(null)

      if (result?.error) {
        setError(result.error)
        return
      }

      setMessage(`${agent.name} actualizado en runtime Codex.`)
    })
  }

  return (
    <>
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
            Provider operativo actual: <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{AGENT_PROVIDER}</span>. Edita soul corta, cost tier y modelo inline; el runtime registry se muestra como referencia operativa.
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
          Tier defaults: C9-C10 → gpt-5 · C6-C8 → gpt-5-mini · C1-C5 → gpt-5-nano
        </div>
      </div>

      {(message || error) && (
        <div
          style={{
            marginBottom: '0.85rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: error ? 'var(--color-coral)' : '#4ade80',
          }}
        >
          {error ? `✗ ${error}` : `✓ ${message}`}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            minWidth: '1900px',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {[
                'Avatar',
                'Nombre',
                'Rol',
                'Team',
                'Runtime status',
                'Profile',
                'Honcho peer',
                'Last verified',
                'Runtime type',
                'Toolsets',
                'Skills runtime',
                'Soul corta',
                'Primary skills',
                'Cost',
                'LLM model',
                'Estado',
                'Acción',
              ].map((col) => (
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
            {agents.length === 0 ? (
              <tr>
                <td
                  colSpan={17}
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
              agents.map((agent) => {
                const draft = drafts[agent.id] || computedDrafts[agent.id] || {
                  cost_tier: agent.cost_tier || '',
                  llm_model: getAgentModel(agent) === '—' ? '' : getAgentModel(agent),
                  soul_short: getSoulPreview(agent) === '—' ? '' : getSoulPreview(agent),
                }
                const isHuman = agent.slug === 'alam'
                const isSaving = savingId === agent.id && isPending
                const runtimeStatus = getRuntimeStatusLabel(agent)
                const runtimeStatusIsActive = runtimeStatus === 'active' || runtimeStatus === 'human'

                return (
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
                          color: runtimeStatusIsActive ? 'var(--color-acid)' : 'var(--color-text-faint)',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: runtimeStatusIsActive ? 'var(--color-acid)' : 'var(--color-text-faint)',
                            display: 'inline-block',
                          }}
                        />
                        {runtimeStatus}
                      </span>
                    </td>
                    <td style={monoCellStyle}>{getRuntimeProfile(agent)}</td>
                    <td style={monoCellStyle}>{getHonchoPeer(agent)}</td>
                    <td style={monoCellStyle}>{getLastVerifiedAt(agent)}</td>
                    <td style={monoCellStyle}>{agent.runtime_type || '—'}</td>
                    <td style={monoCellStyle}>{getRuntimeToolsets(agent)}</td>
                    <td style={monoCellStyle}>{getRuntimeSkills(agent)}</td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', minWidth: '320px' }}>
                      <textarea
                        value={draft.soul_short}
                        onChange={(e) => updateDraft(agent.id, { soul_short: e.target.value })}
                        rows={4}
                        style={{
                          width: '100%',
                          background: 'var(--color-surface-2)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '12px',
                          lineHeight: 1.5,
                          resize: 'vertical',
                        }}
                      />
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
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', minWidth: '110px' }}>
                      {isHuman ? (
                        <span style={readOnlyPillStyle}>HUMAN</span>
                      ) : (
                        <select
                          value={draft.cost_tier}
                          onChange={(e) => {
                            const nextTier = e.target.value
                            updateDraft(agent.id, {
                              cost_tier: nextTier,
                              llm_model: getDefaultCodexModelForTier(nextTier) || draft.llm_model,
                            })
                          }}
                          style={selectStyle}
                        >
                          <option value="">—</option>
                          {COST_TIER_OPTIONS.map((tier) => (
                            <option key={tier} value={tier}>
                              {tier}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', minWidth: '190px' }}>
                      {isHuman ? (
                        <span style={readOnlyPillStyle}>none</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <select
                            value={draft.llm_model}
                            onChange={(e) => updateDraft(agent.id, { llm_model: e.target.value })}
                            style={selectStyle}
                          >
                            <option value="">—</option>
                            {CODEX_MODEL_OPTIONS.map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => applyTierDefault(agent.id)} style={tinyButtonStyle}>
                            aplicar default tier
                          </button>
                        </div>
                      )}
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
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', minWidth: '120px' }}>
                      <button
                        type="button"
                        onClick={() => saveAgent(agent)}
                        disabled={isSaving}
                        style={saveButtonStyle}
                      >
                        {isSaving ? 'guardando...' : 'guardar'}
                      </button>
                      <div
                        style={{
                          marginTop: '6px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          color: 'var(--color-text-faint)',
                        }}
                      >
                        {isHuman ? 'owner humano' : `${draft.cost_tier || getCostTierLabel(agent)} · ${draft.llm_model || getAgentModel(agent)}`}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

const monoCellStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'top',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-faint)',
  lineHeight: 1.6,
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  padding: '6px 8px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
}

const tinyButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '5px 6px',
  borderRadius: '4px',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text-faint)',
  cursor: 'pointer',
}

const saveButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '7px 10px',
  borderRadius: '5px',
  border: '1px solid var(--color-acid)',
  background: 'rgba(214,255,63,0.08)',
  color: 'var(--color-acid)',
  cursor: 'pointer',
}

const readOnlyPillStyle: React.CSSProperties = {
  display: 'inline-block',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text-faint)',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '999px',
  padding: '5px 8px',
}
