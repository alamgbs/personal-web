'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  approveStep,
  deleteBusinessIdea,
  generateIdeaAgentPipeline,
  generateIdeaStepDraft,
  getIdeaStepRuntimeSnapshot,
  promoteToBacklog,
  saveStepData,
} from '@/app/actions/ideas'
import {
  BENCHMARK_COLUMNS,
  BENCHMARK_COMPETITOR_ROWS,
  BENCHMARK_FIELDS,
  BMC_FIELDS,
  COST_PRICING_FIELDS,
  CUSTOMER_ARCHETYPE_FIELDS,
  CUSTOMER_JOURNEY_FIELDS,
  CUSTOMER_JOURNEY_STAGE_FIELDS,
  CUSTOMER_JOURNEY_STAGES,
  FINAL_IDEA_STEP_INDEX,
  GO_NO_GO_FIELDS,
  IDEA_STEPS,
  MOAT_FIELDS,
  PNL_COMPUTED_ROWS,
  PNL_INPUT_GROUPS,
  PROBLEM_DEFINITION_FIELDS,
  TAM_FIELDS,
  TOTAL_IDEA_STEPS,
} from '@/lib/mission-control/idea-steps'
import { getIdeaStepAssignment, isIdeaStepComplete, normalizeIdeaStepData } from '@/lib/mission-control/ideas'
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

type StepRuntimeSnapshot = {
  id?: string
  assignee_slug?: string | null
  profile_name?: string | null
  skill_names?: string[]
  status?: string | null
  attempt_count?: number | null
  max_attempts?: number | null
  last_error?: string | null
  claimed_at?: string | null
  started_at?: string | null
  heartbeat_at?: string | null
  completed_at?: string | null
  updated_at?: string | null
}

const STEPS = IDEA_STEPS

function StepContent({
  stepDef,
  savedData,
  onSave,
  saving,
  formRef,
}: {
  stepDef: typeof STEPS[number]
  savedData: Record<string, unknown> | null
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
  formRef: { current: HTMLFormElement | null }
}) {
  const initialContent = (savedData as Record<string, string>)?.content || ''
  const initialFeedback = (savedData as Record<string, string>)?.pending_feedback || ''

  if (stepDef.kind === 'problem-definition') {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave(buildTextFieldPayload(fd, PROBLEM_DEFINITION_FIELDS))
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <FeedbackField defaultValue={initialFeedback} />
        <ConciseHint text="Mantén cada campo en 3-4 bullets o un párrafo corto. El último campo debe pasar la prueba de la abuela." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          {PROBLEM_DEFINITION_FIELDS.map((field) => (
            <div key={field.key} style={structuredCardStyle}>
              <label style={bmcLabelStyle}>{field.label}</label>
              <textarea
                name={field.key}
                defaultValue={initialVals[field.key] || ''}
                rows={field.key === 'grandmother_value_statement' ? 4 : 3}
                placeholder={field.placeholder || `Describe ${field.label.toLowerCase()}...`}
                style={textareaStyle}
              />
            </div>
          ))}
        </div>
        {btnRow(saving)}
      </form>
    )
  }

  if (stepDef.kind === 'customer-archetype') {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave(buildTextFieldPayload(fd, CUSTOMER_ARCHETYPE_FIELDS))
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <FeedbackField defaultValue={initialFeedback} />
        <ConciseHint text="Piensa en una persona real dentro de la empresa. Cada campo debe ser específico y breve." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          {CUSTOMER_ARCHETYPE_FIELDS.map((field) => (
            <div key={field.key} style={structuredCardStyle}>
              <label style={bmcLabelStyle}>{field.label}</label>
              <textarea
                name={field.key}
                defaultValue={initialVals[field.key] || ''}
                rows={3}
                placeholder={field.placeholder || `Describe ${field.label.toLowerCase()}...`}
                style={textareaStyle}
              />
            </div>
          ))}
        </div>
        {btnRow(saving)}
      </form>
    )
  }

  if (stepDef.kind === 'customer-journey') {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave(buildTextFieldPayload(fd, CUSTOMER_JOURNEY_FIELDS))
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <FeedbackField defaultValue={initialFeedback} />
        <ConciseHint text="Completa el diagrama de izquierda a derecha. Cada celda debe ser breve: 3 bullets o un párrafo corto." />
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${CUSTOMER_JOURNEY_STAGES.length}, minmax(240px, 1fr))`, gap: '10px', minWidth: `${CUSTOMER_JOURNEY_STAGES.length * 240}px` }}>
            {CUSTOMER_JOURNEY_STAGES.map((stage) => (
              <div key={stage.key} style={{ ...structuredCardStyle, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ color: 'var(--color-acid)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {stage.label}
                </div>
                {CUSTOMER_JOURNEY_STAGE_FIELDS.map((field) => {
                  const key = `${stage.key}_${field.suffix}`
                  return (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={bmcLabelStyle}>{field.label}</label>
                      <textarea
                        name={key}
                        defaultValue={initialVals[key] || ''}
                        rows={field.suffix === 'sentiment' ? 2 : 3}
                        placeholder={field.placeholder}
                        style={textareaStyle}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        {btnRow(saving)}
      </form>
    )
  }

  if (stepDef.kind === 'bmc') {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave(buildTextFieldPayload(fd, BMC_FIELDS))
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <FeedbackField defaultValue={initialFeedback} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {BMC_FIELDS.map((field) => (
            <div key={field.key} style={structuredCardStyle}>
              <label style={bmcLabelStyle}>{field.label}</label>
              <textarea
                name={field.key}
                defaultValue={initialVals[field.key] || ''}
                rows={4}
                placeholder={field.placeholder || `Describe ${field.label.toLowerCase()}...`}
                style={textareaStyle}
              />
            </div>
          ))}
        </div>
        {btnRow(saving)}
      </form>
    )
  }

  if (stepDef.kind === 'benchmark') {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave(buildTextFieldPayload(fd, BENCHMARK_FIELDS))
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <FeedbackField defaultValue={initialFeedback} />
        <ConciseHint text="Incluye competidores directos exactos y alternativas indirectas. Si precio, usuarios o fecha de fundación no son públicos, completa la celda con 'No público' + una señal proxy o estimación razonada." />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '11px', minWidth: '1480px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={benchmarkHeaderStyle}>Competidor / alternativa</th>
                {BENCHMARK_COLUMNS.map((column) => (
                  <th key={column.suffix} style={benchmarkHeaderStyle}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BENCHMARK_COMPETITOR_ROWS.map((row) => (
                <tr key={row.key} style={{ borderBottom: '1px solid rgba(42,42,38,0.5)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--color-acid)', whiteSpace: 'nowrap' }}>{row.label}</td>
                  {BENCHMARK_COLUMNS.map((column) => {
                    const key = `${row.key}_${column.suffix}`
                    return (
                      <td key={key} style={{ padding: '4px 6px', verticalAlign: 'top' }}>
                        <textarea
                          name={key}
                          defaultValue={initialVals[key] || ''}
                          rows={column.suffix === 'features' || column.suffix === 'edge_or_gap' ? 4 : 3}
                          placeholder={column.placeholder}
                          style={{
                            ...textareaStyle,
                            minHeight: column.suffix === 'features' || column.suffix === 'edge_or_gap' ? '104px' : '84px',
                            color: getToneColor(column.tone),
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

  if (stepDef.kind === 'pnl') {
    const initialVals = (savedData as Record<string, string>) || {}
    const totals = computePnlTotals(initialVals)
    return (
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave(buildTextFieldPayload(fd, PNL_INPUT_GROUPS.flatMap((group) => group.rows)))
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <FeedbackField defaultValue={initialFeedback} />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-faint)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Concepto</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-faint)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Año 1 (USD)</th>
            </tr>
          </thead>
          <tbody>
            {PNL_INPUT_GROUPS.map((group) => (
              <>
                <tr key={`${group.label}-header`} style={{ borderBottom: '1px solid rgba(42,42,38,0.5)' }}>
                  <td colSpan={2} style={{ padding: '8px', color: 'var(--color-acid)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{group.label}</td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.key} style={{ borderBottom: '1px solid rgba(42,42,38,0.5)' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--color-text)' }}>{row.label}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <input
                        name={row.key}
                        type="text"
                        defaultValue={initialVals[row.key] || ''}
                        placeholder="0"
                        style={{
                          width: '100%',
                          background: 'var(--color-surface-2)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '3px',
                          padding: '4px 8px',
                          color: getToneColor(row.tone),
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          textAlign: 'right',
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </>
            ))}
            {PNL_COMPUTED_ROWS.map((row) => (
              <tr key={row.key} style={{ borderBottom: '1px solid rgba(42,42,38,0.5)' }}>
                <td style={{ padding: '6px 8px', color: 'var(--color-text-faint)' }}>{row.label}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--color-text)', fontWeight: 700 }}>
                  {formatMoney(totals[row.key] || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {btnRow(saving)}
      </form>
    )
  }

  if (stepDef.kind === 'cashflow') {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave(buildTextFieldPayload(fd, COST_PRICING_FIELDS))
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <FeedbackField defaultValue={initialFeedback} />
        <ConciseHint text="No hacer cashflow período por período salvo instrucción explícita. El foco es bootstrap: costos reales, pricing, margen, break-even y validaciones financieras." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {COST_PRICING_FIELDS.map((field) => (
            <div key={field.key} style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '10px',
            }}>
              <label style={{ ...bmcLabelStyle, color: getToneColor(field.tone) }}>{field.label}</label>
              <textarea
                name={field.key}
                defaultValue={initialVals[field.key] || ''}
                rows={field.key === 'bootstrap_assumptions' || field.key === 'pricing_model' ? 4 : 3}
                placeholder={field.placeholder || 'Completa con una estimación breve y accionable...'}
                style={textareaStyle}
              />
            </div>
          ))}
        </div>
        {btnRow(saving)}
      </form>
    )
  }

  if (stepDef.kind === 'tam') {
    const initialVals = (savedData as Record<string, string>) || {}
    const narrativeFields = TAM_FIELDS.filter((field) => !field.key.endsWith('_num') && field.key !== 'methodology')
    return (
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave(buildTextFieldPayload(fd, TAM_FIELDS))
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <FeedbackField defaultValue={initialFeedback} />
        {narrativeFields.map((field) => {
          const amountKey = `${field.key}_num`
          return (
            <div key={field.key} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '8px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '10px',
            }}>
              <div>
                <label style={{ ...bmcLabelStyle, color: getToneColor(field.tone) }}>{field.label}</label>
                <textarea
                  name={field.key}
                  defaultValue={initialVals[field.key] || ''}
                  rows={2}
                  placeholder={field.placeholder || 'Describe la metodología de estimación...'}
                  style={textareaStyle}
                />
              </div>
              <div>
                <label style={bmcLabelStyle}>USD</label>
                <input
                  name={amountKey}
                  type="text"
                  defaultValue={initialVals[amountKey] || ''}
                  placeholder="$0M"
                  style={{
                    width: '90px',
                    background: 'var(--color-surface-1)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    color: getToneColor(field.tone),
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>
          )
        })}

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

  if (stepDef.kind === 'moat') {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave(buildTextFieldPayload(fd, MOAT_FIELDS))
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <FeedbackField defaultValue={initialFeedback} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          {MOAT_FIELDS.map((field) => (
            <div key={field.key} style={structuredCardStyle}>
              <label style={bmcLabelStyle}>{field.label}</label>
              <textarea
                name={field.key}
                defaultValue={initialVals[field.key] || ''}
                rows={3}
                placeholder={field.placeholder || `Describe ${field.label.toLowerCase()}...`}
                style={textareaStyle}
              />
            </div>
          ))}
        </div>
        {btnRow(saving)}
      </form>
    )
  }

  if (stepDef.kind === 'go-no-go') {
    const initialVals = (savedData as Record<string, string>) || {}
    return (
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave(buildTextFieldPayload(fd, GO_NO_GO_FIELDS))
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <AgentDraftField defaultValue={initialContent} stepLabel={stepDef.label} />
        <FeedbackField defaultValue={initialFeedback} />
        <ConciseHint text="El veredicto debe ser explícito y el resto del paso debe ser accionable y breve." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          {GO_NO_GO_FIELDS.map((field) => (
            <div key={field.key} style={structuredCardStyle}>
              <label style={bmcLabelStyle}>{field.label}</label>
              <textarea
                name={field.key}
                defaultValue={initialVals[field.key] || ''}
                rows={field.key === 'verdict' ? 2 : 3}
                placeholder={field.placeholder || `Describe ${field.label.toLowerCase()}...`}
                style={textareaStyle}
              />
            </div>
          ))}
        </div>
        {btnRow(saving)}
      </form>
    )
  }

  // Default: text step with guided questions
  const initialVal = initialContent
  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onSave(buildDefaultStepPayload(fd))
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

      <FeedbackField defaultValue={initialFeedback} />

      {btnRow(saving)}
    </form>
  )
}

function buildTextFieldPayload(formData: FormData, fields: Array<{ key: string }>) {
  const payload: Record<string, string> = {
    content: String(formData.get('content') || ''),
    pending_feedback: String(formData.get('pending_feedback') || ''),
  }

  for (const field of fields) {
    payload[field.key] = String(formData.get(field.key) || '')
  }

  return payload
}

function buildDefaultStepPayload(formData: FormData) {
  return {
    content: String(formData.get('content') || ''),
    pending_feedback: String(formData.get('pending_feedback') || ''),
  }
}

function buildStepPayloadForKind(stepKind: (typeof STEPS)[number]['kind'], formData: FormData) {
  switch (stepKind) {
    case 'problem-definition':
      return buildTextFieldPayload(formData, PROBLEM_DEFINITION_FIELDS)
    case 'customer-archetype':
      return buildTextFieldPayload(formData, CUSTOMER_ARCHETYPE_FIELDS)
    case 'customer-journey':
      return buildTextFieldPayload(formData, CUSTOMER_JOURNEY_FIELDS)
    case 'bmc':
      return buildTextFieldPayload(formData, BMC_FIELDS)
    case 'benchmark':
      return buildTextFieldPayload(formData, BENCHMARK_FIELDS)
    case 'pnl':
      return buildTextFieldPayload(formData, PNL_INPUT_GROUPS.flatMap((group) => group.rows))
    case 'cashflow':
      return buildTextFieldPayload(formData, COST_PRICING_FIELDS)
    case 'tam':
      return buildTextFieldPayload(formData, TAM_FIELDS)
    case 'moat':
      return buildTextFieldPayload(formData, MOAT_FIELDS)
    case 'go-no-go':
      return buildTextFieldPayload(formData, GO_NO_GO_FIELDS)
    default:
      return buildDefaultStepPayload(formData)
  }
}

function parseMoney(value: string | number | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0

  const normalized = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function computePnlTotals(values: Record<string, string>) {
  const totals = {
    total_revenue: 0,
    total_cogs: 0,
    gross_profit: 0,
    total_opex: 0,
    ebitda: 0,
    net_income: 0,
  }

  for (const group of PNL_INPUT_GROUPS) {
    for (const row of group.rows) {
      const amount = parseMoney(values[row.key])
      if (group.label === 'Ingresos') totals.total_revenue += amount
      if (group.label === 'Costo directo') totals.total_cogs += amount
      if (group.label === 'Gasto operativo') totals.total_opex += amount
      if (row.key === 'taxes') totals.net_income -= amount
    }
  }

  totals.gross_profit = totals.total_revenue - totals.total_cogs
  totals.ebitda = totals.gross_profit - totals.total_opex
  totals.net_income += totals.ebitda

  return totals
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function getToneColor(tone: 'default' | 'acid' | 'coral' | 'blue' | undefined) {
  switch (tone) {
    case 'acid':
      return 'var(--color-acid)'
    case 'coral':
      return 'var(--color-coral)'
    case 'blue':
      return '#60a5fa'
    default:
      return 'var(--color-text)'
  }
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

function FeedbackField({ defaultValue }: { defaultValue: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={bmcLabelStyle}>Feedback para reprocesar este paso</label>
      <textarea
        name="pending_feedback"
        defaultValue={defaultValue}
        rows={5}
        placeholder="Qué debe corregir o rehacer el agente en la próxima corrida..."
        style={{
          ...textareaStyle,
          minHeight: '120px',
          borderColor: 'rgba(214,255,63,0.25)',
        }}
      />
    </div>
  )
}

function ConciseHint({ text }: { text: string }) {
  return (
    <div
      style={{
        background: 'rgba(214,255,63,0.06)',
        border: '1px solid rgba(214,255,63,0.18)',
        borderRadius: '6px',
        padding: '8px 10px',
        color: 'var(--color-text-faint)',
        fontSize: '11px',
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: 'var(--color-acid)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '8px' }}>
        Guía de concisión
      </strong>
      {text}
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
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [runningAgent, setRunningAgent] = useState(false)
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [loadingRuntime, setLoadingRuntime] = useState(false)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [runtimeByStep, setRuntimeByStep] = useState<Record<string, StepRuntimeSnapshot>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const stepFormRef = useRef<HTMLFormElement | null>(null)

  const stepData = idea.step_data || {}
  const stepApprovals = idea.step_approvals || {}
  const assignment = getIdeaStepAssignment(activeStep)
  const currentStepData = normalizeIdeaStepData(
    activeStep,
    stepData[activeStep.toString()] as Record<string, unknown> | null
  ) as Record<string, unknown> | null
  const currentStepMeta = (currentStepData || {}) as Record<string, unknown>
  const currentRuntime = runtimeByStep[activeStep.toString()] || null

  const refreshRuntimeSnapshot = useCallback(async () => {
    setLoadingRuntime(true)
    setRuntimeError(null)
    const result = await getIdeaStepRuntimeSnapshot(idea.id)
    setLoadingRuntime(false)

    if (result?.error) {
      setRuntimeError(result.error)
      return
    }

    setRuntimeByStep(((result?.runtimeByStep as Record<string, StepRuntimeSnapshot> | undefined) || {}))
  }, [idea.id])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshRuntimeSnapshot()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [refreshRuntimeSnapshot])

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
    const draftPayload = stepFormRef.current
      ? buildStepPayloadForKind(STEPS[activeStep].kind, new FormData(stepFormRef.current))
      : undefined
    const result = await generateIdeaStepDraft(idea.id, activeStep, draftPayload)
    setRunningAgent(false)
    const agentError = result && 'error' in result ? result.error : null
    if (agentError) {
      setError(agentError)
      return
    }

    setSuccess(`${assignment.name} inició el reproceso del paso ${activeStep + 1}. Refresca en unos minutos para ver el nuevo draft.`)
    void refreshRuntimeSnapshot()
    setTimeout(() => setSuccess(null), 4000)
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
    void refreshRuntimeSnapshot()
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
      if (activeStep < FINAL_IDEA_STEP_INDEX) setActiveStep(activeStep + 1)
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

  async function handleDeleteIdea() {
    setDeleting(true)
    setError(null)
    setSuccess(null)
    const result = await deleteBusinessIdea(idea.id)
    setDeleting(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    setConfirmDeleteOpen(false)
    setSuccess('Idea eliminada junto con sus elementos relacionados.')
  }

  const isStepApproved = (step: number) => !!stepApprovals[step.toString()]
  const isStepComplete = (step: number) => {
    const record = stepData[step.toString()] as Record<string, unknown> | undefined
    return isIdeaStepComplete(step, record)
  }
  const isStepLocked = (step: number) => step > 0 && !isStepComplete(step - 1)

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '16px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setSuccess(null)
                setConfirmDeleteOpen(true)
              }}
              disabled={deleting}
              style={dangerGhostButtonStyle}
            >
              {deleting ? 'Eliminando...' : 'Eliminar idea'}
            </button>
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
            }}>
              {status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Steps progress bar */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {STEPS.map((s, i) => {
            const approved = isStepApproved(i)
            const completed = isStepComplete(i)
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
                    : completed
                    ? 'rgba(214,255,63,0.65)'
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
            Paso {activeStep + 1}/{TOTAL_IDEA_STEPS} — {STEPS[activeStep]?.label}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-faint)' }}>
            {Object.keys(stepApprovals).length}/{TOTAL_IDEA_STEPS} aprobados · {completedSteps}/{TOTAL_IDEA_STEPS} drafts completos
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

          <div style={{ ...runtimeCardStyle, marginTop: '0.9rem' }}>
            <div style={runtimeHeaderStyle}>
              <span style={runtimeTitleStyle}>Runtime observability</span>
              <button
                type="button"
                onClick={() => void refreshRuntimeSnapshot()}
                disabled={loadingRuntime}
                style={runtimeRefreshButtonStyle}
              >
                {loadingRuntime ? 'Actualizando…' : 'Actualizar runtime'}
              </button>
            </div>

            <div style={runtimeGridStyle}>
              <RuntimeDatum label="Assigned agent" value={String(currentStepMeta.assigned_agent_name || assignment.name)} hint={`@${String(currentStepMeta.assigned_agent_slug || assignment.slug)}`} />
              <RuntimeDatum label="Profile" value={String(currentRuntime?.profile_name || currentStepMeta.assigned_profile_name || assignment.profile || '—')} />
              <RuntimeDatum
                label="Skill"
                value={Array.isArray(currentRuntime?.skill_names) && currentRuntime?.skill_names.length
                  ? currentRuntime.skill_names.join(', ')
                  : Array.isArray(currentStepMeta.assigned_skill_names) && currentStepMeta.assigned_skill_names.length
                  ? currentStepMeta.assigned_skill_names.map((skill) => String(skill)).join(', ')
                  : String(currentStepMeta.assigned_skill_name || assignment.skillName || '—')}
              />
              <RuntimeDatum label="Status" value={String(currentRuntime?.status || 'sin work item')} tone={runtimeStatusTone(currentRuntime?.status)} />
              <RuntimeDatum
                label="Attempts"
                value={typeof currentRuntime?.attempt_count === 'number'
                  ? `${currentRuntime.attempt_count}${typeof currentRuntime?.max_attempts === 'number' ? `/${currentRuntime.max_attempts}` : ''}`
                  : '—'}
              />
              <RuntimeDatum
                label="Heartbeat"
                value={formatRuntimeDate(currentRuntime?.heartbeat_at || currentRuntime?.updated_at || currentRuntime?.started_at)}
              />
            </div>

            {currentRuntime?.last_error ? (
              <div style={runtimeErrorBoxStyle}>
                <span style={{ color: '#ff6a3d' }}>Last error</span>
                <span>{currentRuntime.last_error}</span>
              </div>
            ) : runtimeError ? (
              <div style={runtimeErrorBoxStyle}>
                <span style={{ color: '#ff6a3d' }}>Runtime snapshot error</span>
                <span>{runtimeError}</span>
              </div>
            ) : null}
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
            Completa el paso {activeStep} para desbloquearlo.
          </div>
        ) : (
          <StepContent
            stepDef={STEPS[activeStep]}
            savedData={currentStepData || null}
            onSave={handleSave}
            saving={saving}
            formRef={stepFormRef}
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
          {/* If final step, show promote button */}
          {activeStep === FINAL_IDEA_STEP_INDEX && isStepApproved(FINAL_IDEA_STEP_INDEX) && status !== 'in_development' && (
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

          {activeStep === FINAL_IDEA_STEP_INDEX && !isStepApproved(activeStep) && !isStepLocked(activeStep) && (
            <button
              onClick={handleApprove}
              disabled={approving}
              style={approveStyle}
            >
              {approving ? 'Aprobando...' : '✓ Aprobar Go/No-Go'}
            </button>
          )}

          {isStepComplete(activeStep) && activeStep < FINAL_IDEA_STEP_INDEX && (
            <button
              onClick={() => setActiveStep((s) => Math.min(FINAL_IDEA_STEP_INDEX, s + 1))}
              style={nextStyle}
            >
              Siguiente paso →
            </button>
          )}
        </div>
      </div>

      {confirmDeleteOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-coral)', marginBottom: '8px' }}>
              Confirmación
            </div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: 'var(--color-text)' }}>
              ¿Estás seguro?
            </h3>
            <p style={{ margin: '10px 0 0', color: 'var(--color-text-faint)', fontSize: '13px', lineHeight: 1.6 }}>
              Esto eliminará la idea y todo lo relacionado: proyecto promovido, backlog, sprints y referencias vinculadas.
            </p>
            <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,106,61,0.08)', border: '1px solid rgba(255,106,61,0.2)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text)' }}>
              {idea.title}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
                style={modalCancelButtonStyle}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteIdea}
                disabled={deleting}
                style={modalDeleteButtonStyle}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar todo'}
              </button>
            </div>
          </div>
        </div>
      )}
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

function formatRuntimeDate(value: string | null | undefined) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('es-MX')
}

function runtimeStatusTone(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return '#4ade80'
    case 'running':
      return 'var(--color-acid)'
    case 'claimed':
    case 'queued':
      return '#60a5fa'
    case 'failed':
    case 'cancelled':
      return 'var(--color-coral)'
    case 'needs_feedback':
      return '#fbbf24'
    default:
      return 'var(--color-text-faint)'
  }
}

function RuntimeDatum({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: string
}) {
  return (
    <div style={runtimeDatumStyle}>
      <div style={runtimeDatumLabelStyle}>{label}</div>
      <div style={{ ...runtimeDatumValueStyle, color: tone || 'var(--color-text)' }}>{value}</div>
      {hint ? <div style={runtimeDatumHintStyle}>{hint}</div> : null}
    </div>
  )
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

const structuredCardStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  padding: '10px',
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

const benchmarkHeaderStyle: React.CSSProperties = {
  ...cfHeaderStyle,
  padding: '7px 6px',
  color: 'var(--color-acid)',
  verticalAlign: 'bottom',
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

const runtimeCardStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  background: 'rgba(17,17,16,0.9)',
  padding: '12px',
}

const runtimeHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '12px',
}

const runtimeTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-acid)',
}

const runtimeRefreshButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  background: 'transparent',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: '999px',
  padding: '5px 10px',
  cursor: 'pointer',
}

const runtimeGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '10px',
}

const runtimeDatumStyle: React.CSSProperties = {
  border: '1px solid rgba(232,230,223,0.08)',
  borderRadius: '8px',
  background: 'rgba(12,12,10,0.55)',
  padding: '10px',
  minHeight: '72px',
}

const runtimeDatumLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--color-text-faint)',
  marginBottom: '6px',
}

const runtimeDatumValueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  lineHeight: 1.4,
}

const runtimeDatumHintStyle: React.CSSProperties = {
  marginTop: '6px',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-faint)',
}

const runtimeErrorBoxStyle: React.CSSProperties = {
  marginTop: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,106,61,0.25)',
  background: 'rgba(255,106,61,0.08)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text)',
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

const dangerGhostButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'rgba(255,106,61,0.08)',
  color: 'var(--color-coral)',
  border: '1px solid rgba(255,106,61,0.35)',
  borderRadius: '6px',
  padding: '7px 12px',
  cursor: 'pointer',
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(12,12,10,0.78)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  zIndex: 50,
}

const modalCardStyle: React.CSSProperties = {
  width: 'min(460px, 100%)',
  background: 'var(--color-surface-1)',
  border: '1px solid var(--color-border)',
  borderRadius: '14px',
  boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
  padding: '22px',
}

const modalCancelButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'transparent',
  color: 'var(--color-text-faint)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  padding: '8px 14px',
  cursor: 'pointer',
}

const modalDeleteButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'var(--color-coral)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 14px',
  cursor: 'pointer',
  fontWeight: 700,
}
