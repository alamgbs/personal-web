'use client'

import { useState, useEffect } from 'react'
import {
  approveStep,
  generateIdeaAgentPipeline,
  generateIdeaStepDraft,
  promoteToBacklog,
  saveStepData,
} from '@/app/actions/ideas'
import { IDEA_STEPS } from '@/lib/mission-control/idea-steps'
import { getIdeaStepAssignment, normalizeIdeaStepData } from '@/lib/mission-control/ideas'
import {
  getAutomationStatusLabel,
  getAutomationTone,
  getCompletedIdeaStepCount,
  getIdeaWorkflowStageLabel,
  getWorkflowTone,
} from '@/lib/mission-control/workflow'

type Idea = {
  id: string
  title: string
  slug: string
  summary: string | null
  status: string | null
  current_step: number | null
  step_data: Record<string, unknown> | null
  step_approvals: Record<string, unknown> | null
  promoted_project_id?: string | null
  workflow_stage?: string | null
  automation_status?: string | null
  notification_target?: string | null
}

type Props = {
  idea: Idea
}

const STEPS = IDEA_STEPS

const BMC_BLOCKS = [
  ['Socios Clave', 'Actividades Clave', 'Propuesta de Valor'],
  ['Recursos Clave', 'Relaciones con Clientes', 'Segmentos de Clientes'],
  ['Estructura de Costos', 'Canales', 'Flujos de Ingresos'],
]

const PL_ROWS = ['Ingresos', 'COGS', 'Margen Bruto', 'OpEx Total', 'EBITDA', 'Resultado Neto']
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function StepContent({
  step,
  stepDef,
  savedData,
  onSave,
  saving,
}: {
  step: number
  stepDef: typeof STEPS[number]
  savedData: Record<string, unknown> | null
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const initialContent = (savedData as Record<string, string>)?.content || ''

  if (stepDef.isBMC) {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const data: Record<string, string> = { content: (fd.get('content') as string) || '' }
          BMC_BLOCKS.flat().forEach((block) => {
            data[block] = (fd.get(block) as string) || ''
          })
          onSave(data)
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {BMC_BLOCKS.flat().map((block) => (
            <div key={block} style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '10px',
            }}>
              <label style={bmcLabelStyle}>{block}</label>
              <textarea
                name={block}
                defaultValue={initialVals[block] || ''}
                rows={4}
                placeholder={`Describe ${block.toLowerCase()}...`}
                style={textareaStyle}
              />
            </div>
          ))}
        </div>
        {btnRow(saving)}
      </form>
    )
  }

  if (stepDef.isPL) {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const data: Record<string, string> = { content: (fd.get('content') as string) || '' }
          PL_ROWS.forEach((row) => { data[row] = (fd.get(row) as string) || '' })
          onSave(data)
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-faint)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Concepto</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-faint)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Año 1 (USD)</th>
            </tr>
          </thead>
          <tbody>
            {PL_ROWS.map((row) => (
              <tr key={row} style={{ borderBottom: '1px solid rgba(42,42,38,0.5)' }}>
                <td style={{ padding: '6px 8px', color: 'var(--color-text)' }}>{row}</td>
                <td style={{ padding: '4px 8px' }}>
                  <input
                    name={row}
                    type="text"
                    defaultValue={initialVals[row] || ''}
                    placeholder="0"
                    style={{
                      width: '100%',
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '3px',
                      padding: '4px 8px',
                      color: 'var(--color-acid)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      textAlign: 'right',
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {btnRow(saving)}
      </form>
    )
  }

  if (stepDef.isCashFlow) {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const data: Record<string, string> = { content: (fd.get('content') as string) || '' }
          MONTHS.forEach((m) => {
            data[`in_${m}`] = (fd.get(`in_${m}`) as string) || ''
            data[`out_${m}`] = (fd.get(`out_${m}`) as string) || ''
          })
          onSave(data)
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '11px', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={cfHeaderStyle}>Concepto</th>
                {MONTHS.map((m) => (
                  <th key={m} style={cfHeaderStyle}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['Ingresos', 'Egresos'].map((label, ri) => (
                <tr key={label} style={{ borderBottom: '1px solid rgba(42,42,38,0.5)' }}>
                  <td style={{ padding: '5px 8px', color: label === 'Ingresos' ? 'var(--color-acid)' : 'var(--color-coral)', fontSize: '11px' }}>{label}</td>
                  {MONTHS.map((m) => {
                    const key = `${ri === 0 ? 'in' : 'out'}_${m}`
                    return (
                      <td key={m} style={{ padding: '3px 4px' }}>
                        <input
                          name={key}
                          type="text"
                          defaultValue={initialVals[key] || ''}
                          placeholder="0"
                          style={{
                            width: '60px',
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '3px',
                            padding: '3px 5px',
                            color: ri === 0 ? 'var(--color-acid)' : 'var(--color-coral)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            textAlign: 'right',
                          }}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {btnRow(saving)}
      </form>
    )
  }

  if (stepDef.isTAM) {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave({
            content: (fd.get('content') as string) || '',
            tam: fd.get('tam'),
            tam_num: fd.get('tam_num'),
            sam: fd.get('sam'),
            sam_num: fd.get('sam_num'),
            som: fd.get('som'),
            som_num: fd.get('som_num'),
            methodology: fd.get('methodology'),
          })
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        {[
          { key: 'tam', label: 'TAM — Total Addressable Market', color: 'var(--color-acid)' },
          { key: 'sam', label: 'SAM — Serviceable Addressable Market', color: 'var(--color-coral)' },
          { key: 'som', label: 'SOM — Serviceable Obtainable Market', color: '#60a5fa' },
        ].map(({ key, label, color }) => (
          <div key={key} style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '8px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '10px',
          }}>
            <div>
              <label style={{ ...bmcLabelStyle, color }}>{label}</label>
              <textarea
                name={key}
                defaultValue={initialVals[key] || ''}
                rows={2}
                placeholder="Describe la metodología de estimación..."
                style={textareaStyle}
              />
            </div>
            <div>
              <label style={bmcLabelStyle}>USD</label>
              <input
                name={`${key}_num`}
                type="text"
                defaultValue={initialVals[`${key}_num`] || ''}
                placeholder="$0M"
                style={{
                  width: '90px',
                  background: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              />
            </div>
          </div>
        ))}

        <div>
          <label style={bmcLabelStyle}>Metodología de Sizing</label>
          <textarea
            name="methodology"
            defaultValue={initialVals['methodology'] || ''}
            rows={3}
            placeholder="¿Cómo calculaste estos números? Fuentes, supuestos, enfoque top-down o bottom-up?"
            style={textareaStyle}
          />
        </div>

        {btnRow(saving)}
      </form>
    )
  }

  // Default: text step with guided questions
  const initialVal = initialContent
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onSave({ content: fd.get('content') as string })
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      {/* Guiding questions */}
      {stepDef.questions.length > 0 && (
        <div style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          padding: '10px 12px',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-acid)', marginBottom: '8px' }}>
            PREGUNTAS GUÍA
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {stepDef.questions.map((q, i) => (
              <li key={i} style={{ display: 'flex', gap: '6px', fontSize: '12px', color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--color-acid)', fontFamily: 'var(--font-mono)', fontSize: '10px', marginTop: '2px', flexShrink: 0 }}>{i + 1}.</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      <textarea
        name="content"
        defaultValue={initialVal}
        rows={10}
        placeholder={`Desarrolla el paso: ${stepDef.label}\n\n${stepDef.questions[0] || ''}`}
        style={{
          ...textareaStyle,
          minHeight: '220px',
        }}
      />

      {btnRow(saving)}
    </form>
  )
}

function AgentDraftField({ defaultValue, stepLabel }: { defaultValue: string; stepLabel: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={bmcLabelStyle}>Draft del agente para {stepLabel}</label>
      <textarea
        name="content"
        defaultValue={defaultValue}
        rows={8}
        placeholder={`Análisis del agente para ${stepLabel}...`}
        style={{
          ...textareaStyle,
          minHeight: '180px',
        }}
      />
    </div>
  )
}

function btnRow(saving: boolean) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <button
        type="submit"
        disabled={saving}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          background: 'var(--color-surface-3)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          padding: '7px 16px',
          cursor: 'pointer',
        }}
      >
        {saving ? 'Guardando...' : '💾 Guardar borrador'}
      </button>
    </div>
  )
}

export function IdeaWizard({ idea }: Props) {
  const [activeStep, setActiveStep] = useState(idea.current_step ?? 0)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [runningAgent, setRunningAgent] = useState(false)
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Reset when idea changes
  useEffect(() => {
    setActiveStep(idea.current_step ?? 0)
    setError(null)
    setSuccess(null)
  }, [idea.id, idea.current_step])

  const stepData = idea.step_data || {}
  const stepApprovals = idea.step_approvals || {}
  const assignment = getIdeaStepAssignment(activeStep)
  const currentStepData = normalizeIdeaStepData(
    activeStep,
    stepData[activeStep.toString()] as Record<string, unknown> | null
  ) as Record<string, unknown> | null
  const currentStepMeta = (currentStepData || {}) as Record<string, unknown>

  async function handleSave(data: Record<string, unknown>) {
    setSaving(true)
    setError(null)
    const result = await saveStepData(idea.id, activeStep, data)
    setSaving(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess('Guardado')
      setTimeout(() => setSuccess(null), 2000)
    }
  }

  async function handleRunAssignedAgent() {
    setRunningAgent(true)
    setError(null)
    setSuccess(null)
    const result = await generateIdeaStepDraft(idea.id, activeStep)
    setRunningAgent(false)
    const agentError = result && 'error' in result ? result.error : null
    if (agentError) {
      setError(agentError)
      return
    }

    setSuccess(`${assignment.name} completó el borrador del paso ${activeStep + 1}.`)
    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleRunIdeaPipeline() {
    setRunningPipeline(true)
    setError(null)
    setSuccess(null)
    const result = await generateIdeaAgentPipeline(idea.id)
    setRunningPipeline(false)
    const pipelineError = result && 'error' in result ? result.error : null
    if (pipelineError) {
      setError(pipelineError)
      return
    }

    setSuccess(
      result?.generated_steps
        ? `Se ejecutaron ${result.generated_steps} pasos pendientes del pipeline.`
        : 'La idea ya tenía todos los pasos con contenido.'
    )
    setTimeout(() => setSuccess(null), 4000)
  }

  async function handleApprove() {
    setApproving(true)
    setError(null)
    const result = await approveStep(idea.id, activeStep)
    setApproving(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(`Paso ${activeStep + 1} aprobado`)
      if (activeStep < 8) setActiveStep(activeStep + 1)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  async function handlePromoteToBacklog() {
    setPromoting(true)
    setError(null)
    const result = await promoteToBacklog(idea.id)
    setPromoting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess('Proyecto creado. Mission Control generará el PRD automáticamente.')
    }
  }

  const isStepApproved = (step: number) => !!stepApprovals[step.toString()]
  const isStepLocked = (step: number) => step > 0 && !isStepApproved(step - 1)

  const status = idea.status || 'draft'
  const workflowTone = getWorkflowTone(idea.workflow_stage)
  const automationTone = getAutomationTone(idea.automation_status)
  const completedSteps = getCompletedIdeaStepCount(idea.step_data)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Idea header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface-1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <h2 style={{
              margin: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: '1.4rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              letterSpacing: '-0.02em',
            }}>
              {idea.title}
            </h2>
            {idea.summary && (
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-faint)' }}>
                {idea.summary}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              <span style={{ ...workflowPillStyle, color: workflowTone.color, background: workflowTone.background }}>
                {getIdeaWorkflowStageLabel(idea.workflow_stage)}
              </span>
              <span style={{ ...workflowPillStyle, color: automationTone.color, background: automationTone.background }}>
                {getAutomationStatusLabel(idea.automation_status)}
              </span>
              {idea.notification_target && (
                <span style={workflowMutedPillStyle}>
                  notify → {idea.notification_target}
                </span>
              )}
            </div>
            {idea.promoted_project_id && (
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                Proyecto creado y sincronizado con el flujo de PRD/planning.
              </p>
            )}
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: '4px',
            background: statusBg(status),
            color: statusColor(status),
            flexShrink: 0,
            marginLeft: '16px',
          }}>
            {status.replace('_', ' ')}
          </span>
        </div>

        {/* Steps progress bar */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {STEPS.map((s, i) => {
            const approved = isStepApproved(i)
            const isActive = i === activeStep
            const locked = isStepLocked(i)
            return (
              <button
                key={i}
                onClick={() => !locked && setActiveStep(i)}
                disabled={locked}
                title={s.label}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  border: 'none',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  background: approved
                    ? 'var(--color-acid)'
                    : isActive
                    ? 'rgba(214,255,63,0.4)'
                    : locked
                    ? 'var(--color-surface-3)'
                    : 'var(--color-border)',
                  transition: 'background 0.2s',
                  padding: 0,
                }}
              />
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-acid)' }}>
            Paso {activeStep + 1}/9 — {STEPS[activeStep]?.label}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-faint)' }}>
            {Object.keys(stepApprovals).length}/9 aprobados · {completedSteps}/9 drafts completos
          </span>
        </div>
      </div>

      {/* Step content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {/* Step label */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-acid)',
            }}>
              PASO {activeStep + 1} — {STEPS[activeStep]?.label}
            </span>
            {isStepApproved(activeStep) && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.08em',
                color: '#4ade80',
                background: 'rgba(74,222,128,0.1)',
                borderRadius: '4px',
                padding: '3px 8px',
              }}>
                ✓ Aprobado {new Date(stepApprovals[activeStep.toString()] as string).toLocaleDateString('es-MX')}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-faint)' }}>
            {STEPS[activeStep]?.hint}
          </p>
          <div
            style={{
              marginTop: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-text-faint)',
              border: '1px solid var(--color-border)',
              borderRadius: '999px',
              padding: '5px 10px',
              background: 'var(--color-surface-2)',
            }}
          >
            <span style={{ color: 'var(--color-acid)' }}>Assigned</span>
            <span>{assignment.name}</span>
            <span style={{ color: 'var(--color-border)' }}>·</span>
            <span>@{assignment.slug}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={handleRunAssignedAgent}
              disabled={runningAgent || isStepLocked(activeStep)}
              style={secondaryActionButtonStyle}
            >
              {runningAgent ? 'Ejecutando agente...' : `▶ Ejecutar ${assignment.name}`}
            </button>
            <button
              type="button"
              onClick={handleRunIdeaPipeline}
              disabled={runningPipeline}
              style={secondaryGhostButtonStyle}
            >
              {runningPipeline ? 'Corriendo pipeline...' : '▶ Ejecutar pipeline completo'}
            </button>
          </div>

          {Boolean(currentStepMeta.generated_at) && (
            <div style={{ marginTop: '0.85rem', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-faint)' }}>
              Último draft: {String(currentStepMeta.generated_by_name || currentStepMeta.assigned_agent_name || assignment.name)} · {String(currentStepMeta.generation_model || 'modelo no especificado')} · {new Date(String(currentStepMeta.generated_at)).toLocaleString('es-MX')}
            </div>
          )}
        </div>

        {isStepLocked(activeStep) ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--color-text-faint)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            background: 'var(--color-surface-2)',
            border: '1px dashed var(--color-border)',
            borderRadius: '8px',
          }}>
            🔒 Este paso está bloqueado.<br />
            Aprueba el paso {activeStep - 1} para desbloquearlo.
          </div>
        ) : (
          <StepContent
            step={activeStep}
            stepDef={STEPS[activeStep]}
            savedData={currentStepData || null}
            onSave={handleSave}
            saving={saving}
          />
        )}

        {/* Feedback */}
        {error && (
          <div style={{ marginTop: '1rem', color: 'var(--color-coral)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            ✗ {error}
          </div>
        )}
        {success && (
          <div style={{ marginTop: '1rem', color: '#4ade80', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            ✓ {success}
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface-1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <button
          onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
          disabled={activeStep === 0}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'transparent',
            color: activeStep === 0 ? 'var(--color-border)' : 'var(--color-text-faint)',
            border: `1px solid ${activeStep === 0 ? 'var(--color-border)' : 'var(--color-border)'}`,
            borderRadius: '4px',
            padding: '7px 14px',
            cursor: activeStep === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          ← Paso anterior
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* If last step (8), show promote button */}
          {activeStep === 8 && isStepApproved(8) && status !== 'in_development' && (
            <button
              onClick={handlePromoteToBacklog}
              disabled={promoting}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'var(--color-coral)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '7px 16px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              {promoting ? '...' : '🚀 Crear proyecto + tarea PRD'}
            </button>
          )}

          {!isStepApproved(activeStep) && !isStepLocked(activeStep) && (
            <button
              onClick={handleApprove}
              disabled={approving}
              style={approveStyle}
            >
              {approving ? 'Aprobando...' : activeStep === 8 ? '✓ Aprobar Go/No-Go' : '✓ Aprobar y continuar →'}
            </button>
          )}

          {isStepApproved(activeStep) && activeStep < 8 && (
            <button
              onClick={() => setActiveStep((s) => Math.min(8, s + 1))}
              style={nextStyle}
            >
              Siguiente paso →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function statusColor(s: string) {
  const m: Record<string, string> = {
    draft: 'var(--color-text-faint)',
    in_analysis: 'var(--color-acid)',
    approved: '#4ade80',
    rejected: 'var(--color-coral)',
    in_development: '#60a5fa',
  }
  return m[s] || m.draft
}

function statusBg(s: string) {
  const m: Record<string, string> = {
    draft: 'rgba(107,103,98,0.1)',
    in_analysis: 'rgba(214,255,63,0.1)',
    approved: 'rgba(74,222,128,0.1)',
    rejected: 'rgba(255,106,61,0.1)',
    in_development: 'rgba(96,165,250,0.1)',
  }
  return m[s] || m.draft
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  padding: '10px 12px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  lineHeight: 1.6,
  resize: 'vertical',
}

const bmcLabelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--color-acid)',
  marginBottom: '6px',
}

const cfHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '5px 4px',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-faint)',
  fontWeight: 400,
  whiteSpace: 'nowrap',
}

const approveStyle: React.CSSProperties = {
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

const secondaryActionButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  background: 'rgba(214,255,63,0.12)',
  color: 'var(--color-acid)',
  border: '1px solid var(--color-acid)',
  borderRadius: '6px',
  padding: '8px 14px',
  cursor: 'pointer',
}

const secondaryGhostButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  background: 'transparent',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  padding: '8px 14px',
  cursor: 'pointer',
}

const workflowPillStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderRadius: '999px',
  padding: '3px 8px',
}

const workflowMutedPillStyle: React.CSSProperties = {
  ...workflowPillStyle,
  color: 'var(--color-text-faint)',
  background: 'rgba(107,103,98,0.12)',
}

const nextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'transparent',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  padding: '7px 16px',
  cursor: 'pointer',
}
