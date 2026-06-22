import {
  BENCHMARK_COMPETITOR_ROWS,
  BENCHMARK_FIELDS,
  BMC_FIELDS,
  COST_PRICING_FIELDS,
  CUSTOMER_ARCHETYPE_FIELDS,
  CUSTOMER_JOURNEY_FIELDS,
  CUSTOMER_JOURNEY_STAGES,
  FINAL_IDEA_STEP_INDEX,
  GO_NO_GO_FIELDS,
  IDEA_STEPS,
  MOAT_FIELDS,
  PNL_COMPUTED_ROWS,
  PNL_INPUT_GROUPS,
  PROBLEM_DEFINITION_FIELDS,
  TAM_FIELDS,
  type IdeaFieldDefinition,
  type IdeaStepKind,
} from '@/lib/mission-control/idea-steps'
import { normalizeIdeaStepData } from '@/lib/mission-control/ideas'

type JsonRecord = Record<string, unknown>

export type IdeaBriefInput = {
  id: string
  title: string
  slug?: string | null
  summary?: string | null
  stepData: JsonRecord | null
  stepApprovals?: JsonRecord | null
  approvedAt?: string | null
}

export type IdeaBriefField = {
  label: string
  value: string
  emphasis?: 'default' | 'acid' | 'coral' | 'blue'
}

export type IdeaBriefMetric = {
  label: string
  value: string
  detail?: string
  emphasis?: IdeaBriefField['emphasis']
}

export type IdeaBriefChartSpec =
  | { type: 'severity-matrix'; x: number; y: number; label: string; xLabel: string; yLabel: string }
  | { type: 'journey-timeline'; stages: Array<{ label: string; sentiment: number | null; note: string }> }
  | { type: 'bmc-grid'; cells: Array<{ label: string; value: string; emphasis?: IdeaBriefField['emphasis'] }> }
  | { type: 'comparison-matrix'; competitors: Array<{ name: string; type: string; edge: string }> }
  | { type: 'waterfall'; items: Array<{ label: string; value: number; display: string; emphasis?: IdeaBriefField['emphasis'] }> }
  | { type: 'financial-bars'; items: Array<{ label: string; value: number; display: string; emphasis?: IdeaBriefField['emphasis'] }> }
  | { type: 'margin-stack'; items: Array<{ label: string; value: string; emphasis?: IdeaBriefField['emphasis'] }> }
  | { type: 'scorecard'; items: Array<{ label: string; score: number | null; note: string; emphasis?: IdeaBriefField['emphasis'] }> }
  | { type: 'decision-matrix'; risk: number; upside: number; label: string }

export type IdeaBriefSection = {
  stepIndex: number
  label: string
  hint: string
  kind: IdeaStepKind
  owner?: string | null
  agentDraft?: string | null
  executiveSummary: string[]
  metrics: IdeaBriefMetric[]
  chart?: IdeaBriefChartSpec | null
  fields: IdeaBriefField[]
}

export type IdeaBriefReport = {
  title: string
  summary: string | null
  verdict: string | null
  rationale: string | null
  approvedAt: string | null
  completedSteps: number
  totalSteps: number
  executiveHighlights: IdeaBriefMetric[]
  sections: IdeaBriefSection[]
}

const METADATA_KEYS = new Set([
  'content',
  'pending_feedback',
  'assigned_agent_slug',
  'assigned_agent_name',
  'assigned_profile_name',
  'assigned_skill_name',
  'assigned_skill_names',
  'generated_at',
  'generated_by',
  'generated_by_name',
  'generation_provider',
  'generation_model',
  'reviewed_at',
  'reviewed_by',
  'final_brief_daily_brief_attempted_at',
  'final_brief_daily_brief_sent_at',
  'final_brief_daily_brief_filename',
  'final_brief_daily_brief_bytes',
  'final_brief_daily_brief_status',
  'final_brief_daily_brief_error',
])

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function humanizeKey(key: string) {
  return key
    .replace(/__/g, ' · ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function compactText(value: string) {
  return value
    .replace(/\[object Object\]/g, '')
    .replace(/(^|\n)\s*[,;]+\s*(?=\n|$)/g, '\n')
    .replace(/,{2,}/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function stringifyObject(value: JsonRecord) {
  return Object.entries(value)
    .map(([key, nestedValue]) => {
      const rendered = stringifyValue(nestedValue)
      return rendered ? `${humanizeKey(key)}: ${rendered}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

export function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return compactText(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return compactText(
      value
        .map((item) => {
          const rendered = stringifyValue(item)
          return rendered ? `• ${rendered.replace(/\n/g, '\n  ')}` : ''
        })
        .filter(Boolean)
        .join('\n')
    )
  }

  if (typeof value === 'object') {
    return compactText(stringifyObject(value as JsonRecord))
  }

  return compactText(String(value))
}

function parseMoney(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const lower = value.toLowerCase()
  const token = value.match(/-?\$?\s*\d[\d.,]*/)?.[0]
  if (!token) return 0
  const raw = token.replace(/[$\s]/g, '')
  const commaCount = (raw.match(/,/g) || []).length
  const dotCount = (raw.match(/\./g) || []).length
  let normalized = raw

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = raw.lastIndexOf(',')
    const lastDot = raw.lastIndexOf('.')
    normalized = lastComma > lastDot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '')
  } else if (commaCount > 1) {
    normalized = raw.replace(/,/g, '')
  } else if (dotCount > 1) {
    normalized = raw.replace(/\./g, '')
  } else if (commaCount === 1) {
    const [, decimals = ''] = raw.split(',')
    normalized = decimals.length === 3 ? raw.replace(/,/g, '') : raw.replace(',', '.')
  } else if (dotCount === 1) {
    const [, decimals = ''] = raw.split('.')
    normalized = decimals.length === 3 ? raw.replace(/\./g, '') : raw
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return 0
  if (/\b(bn|billones|billion)\b/.test(lower)) return parsed * 1_000_000_000
  if (/\b(mm|millones|million)\b/.test(lower)) return parsed * 1_000_000
  if (/\b(k|mil|thousand)\b/.test(lower)) return parsed * 1_000
  return parsed
}

function parseScore(value: unknown, fallback = 5) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(10, value))
  const rendered = stringifyValue(value)
  const match = rendered.match(/\b(10|[0-9])(?:\s*\/\s*10)?\b/)
  if (!match) return fallback
  return Math.max(0, Math.min(10, Number(match[1])))
}

function parseFrequencyScore(value: unknown) {
  const rendered = stringifyValue(value).toLowerCase()
  if (!rendered) return 5
  if (/diari|cada dia|todos los dias|mensual.*cierre|fin de mes/.test(rendered)) return 8
  if (/seman|weekly/.test(rendered)) return 6
  if (/mensual|monthly/.test(rendered)) return 5
  if (/trimes|quarter/.test(rendered)) return 3
  return parseScore(rendered, 6)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function firstLine(value: unknown, max = 92) {
  const rendered = stringifyValue(value).split('\n').find(Boolean) || ''
  if (rendered.length <= max) return rendered
  return `${rendered.slice(0, max - 1).trim()}…`
}

function summaryBullets(content: string | null, fields: IdeaBriefField[]) {
  const source = content || fields.map((field) => `${field.label}: ${field.value}`).join('. ')
  return source
    .split(/(?:\n+|(?<=\.)\s+)/)
    .map((item) => item.replace(/^[-•\d.)\s]+/, '').trim())
    .filter((item) => item.length > 24 && !item.includes('[object Object]'))
    .slice(0, 3)
}

function appendKnownFields(
  fields: IdeaBriefField[],
  data: JsonRecord,
  definitions: Array<{ key: string; label: string; tone?: IdeaBriefField['emphasis'] }>
) {
  const knownKeys = new Set<string>()
  for (const definition of definitions) {
    knownKeys.add(definition.key)
    const value = stringifyValue(data[definition.key])
    if (!value) continue
    fields.push({ label: definition.label, value, emphasis: definition.tone })
  }
  return knownKeys
}

function computePnlTotals(data: JsonRecord) {
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
      const amount = parseMoney(data[row.key])
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

function appendPnlFields(fields: IdeaBriefField[], data: JsonRecord) {
  const knownKeys = new Set<string>()
  for (const group of PNL_INPUT_GROUPS) {
    const groupRows = group.rows
      .map((row) => {
        knownKeys.add(row.key)
        return { label: row.label, value: stringifyValue(data[row.key]), emphasis: row.tone }
      })
      .filter((row) => row.value)

    if (groupRows.length === 0) continue
    fields.push({ label: group.label, value: groupRows.map((row) => `${row.label}: ${row.value}`).join('\n'), emphasis: 'acid' })
  }

  const totals = computePnlTotals(data)
  fields.push({
    label: 'Resumen financiero calculado',
    value: PNL_COMPUTED_ROWS.map((row) => `${row.label}: ${formatMoney(totals[row.key])}`).join('\n'),
    emphasis: 'blue',
  })
  return knownKeys
}

function definitionsForKind(kind: IdeaStepKind): IdeaFieldDefinition[] {
  switch (kind) {
    case 'problem-definition':
      return PROBLEM_DEFINITION_FIELDS
    case 'customer-archetype':
      return CUSTOMER_ARCHETYPE_FIELDS
    case 'customer-journey':
      return CUSTOMER_JOURNEY_FIELDS
    case 'bmc':
      return BMC_FIELDS
    case 'benchmark':
      return BENCHMARK_FIELDS
    case 'cashflow':
      return COST_PRICING_FIELDS
    case 'tam':
      return TAM_FIELDS
    case 'moat':
      return MOAT_FIELDS
    case 'go-no-go':
      return GO_NO_GO_FIELDS
    default:
      return []
  }
}

function getKnownFieldsForStep(stepIndex: number, data: JsonRecord): IdeaBriefField[] {
  const step = IDEA_STEPS[stepIndex]
  const fields: IdeaBriefField[] = []
  let knownKeys = new Set<string>()

  if (step?.kind === 'pnl') {
    knownKeys = appendPnlFields(fields, data)
  } else {
    knownKeys = appendKnownFields(fields, data, definitionsForKind(step.kind))
  }

  const knownLabels = new Set(fields.map((field) => normalizeLabel(field.label)))
  for (const definition of definitionsForKind(step.kind)) {
    knownLabels.add(normalizeLabel(definition.label))
    knownLabels.add(normalizeLabel(humanizeKey(definition.key)))
  }

  for (const [key, value] of Object.entries(data)) {
    if (METADATA_KEYS.has(key) || knownKeys.has(key)) continue
    const rendered = stringifyValue(value)
    if (!rendered) continue
    const label = humanizeKey(key)
    if (knownLabels.has(normalizeLabel(label))) continue
    fields.push({ label, value: rendered })
  }

  return fields
}

function formatCompactMoney(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`
  return formatMoney(value)
}

function moneyLabel(value: unknown, max = 22) {
  const rendered = firstLine(value, max)
  if (!rendered) return ''
  const amount = parseMoney(rendered)
  if (amount > 0) return formatCompactMoney(amount)
  return rendered
}

function buildMetrics(kind: IdeaStepKind, data: JsonRecord, fields: IdeaBriefField[]): IdeaBriefMetric[] {
  switch (kind) {
    case 'problem-definition':
      return [
        { label: 'Intensidad', value: `${parseScore(data.intensity)}/10`, detail: firstLine(data.intensity), emphasis: 'coral' },
        { label: 'Frecuencia', value: firstLine(data.frequency, 34) || 'Por validar', emphasis: 'acid' },
        { label: 'Costo visible', value: firstLine(data.cost, 44) || 'No estimado', emphasis: 'blue' },
      ]
    case 'customer-archetype':
      return [
        { label: 'Early user', value: firstLine(data.persona_name, 42) || 'Arquetipo pendiente', emphasis: 'acid' },
        { label: 'Rol', value: firstLine(data.job_role, 42) || 'No especificado' },
        { label: 'Trigger', value: firstLine(data.buying_triggers, 48) || 'Por validar', emphasis: 'coral' },
      ]
    case 'tam':
      return [
        { label: 'TAM', value: moneyLabel(data.tam_num) || 'N/D', detail: firstLine(data.tam, 54), emphasis: 'acid' },
        { label: 'SAM', value: moneyLabel(data.sam_num) || 'N/D', detail: firstLine(data.sam, 54), emphasis: 'coral' },
        { label: 'SOM', value: moneyLabel(data.som_num) || 'N/D', detail: firstLine(data.som, 54), emphasis: 'blue' },
      ]
    case 'pnl': {
      const totals = computePnlTotals(data)
      return [
        { label: 'Ingresos', value: formatMoney(totals.total_revenue), emphasis: 'acid' },
        { label: 'Margen bruto', value: formatMoney(totals.gross_profit), emphasis: 'blue' },
        { label: 'EBITDA', value: formatMoney(totals.ebitda), emphasis: totals.ebitda < 0 ? 'coral' : 'acid' },
      ]
    }
    case 'cashflow':
      return [
        { label: 'Pricing', value: firstLine(data.pricing_model, 48) || 'Pendiente', emphasis: 'acid' },
        { label: 'Precio', value: firstLine(data.estimated_price, 34) || 'Por validar', emphasis: 'blue' },
        { label: 'Break-even', value: firstLine(data.break_even_threshold, 42) || 'Por modelar', emphasis: 'coral' },
      ]
    case 'moat':
      return [
        { label: 'Moat score', value: `${parseScore(data.moat_score)}/10`, detail: firstLine(data.moat_score), emphasis: 'acid' },
        { label: 'Lock-in', value: firstLine(data.customer_embeddedness, 42) || 'Débil hoy', emphasis: 'blue' },
        { label: 'Hueco', value: firstLine(data.weak_points, 42) || 'Por auditar', emphasis: 'coral' },
      ]
    case 'go-no-go':
      return [
        { label: 'Decisión', value: firstLine(data.verdict, 42) || 'Sin veredicto', emphasis: 'coral' },
        { label: 'Hipótesis críticas', value: firstLine(data.critical_hypotheses, 48) || 'No listadas', emphasis: 'blue' },
        { label: 'Kill criteria', value: firstLine(data.kill_criteria, 42) || 'Pendiente', emphasis: 'coral' },
      ]
    default:
      return fields.slice(0, 3).map((field) => ({ label: field.label, value: firstLine(field.value, 52), emphasis: field.emphasis }))
  }
}

function chartForSection(kind: IdeaStepKind, data: JsonRecord, fields: IdeaBriefField[]): IdeaBriefChartSpec | null {
  switch (kind) {
    case 'problem-definition':
      return {
        type: 'severity-matrix',
        x: parseFrequencyScore(data.frequency),
        y: parseScore(data.intensity, 7),
        label: firstLine(data.persona_scope, 38) || 'Early user',
        xLabel: 'Frecuencia',
        yLabel: 'Dolor / costo',
      }
    case 'customer-journey':
      return {
        type: 'journey-timeline',
        stages: CUSTOMER_JOURNEY_STAGES.map((stage) => ({
          label: stage.label,
          sentiment: stringifyValue(data[`${stage.key}_sentiment`]) ? parseScore(data[`${stage.key}_sentiment`]) : null,
          note: firstLine(data[`${stage.key}_solution`] || data[`${stage.key}_customer_need`], 58),
        })),
      }
    case 'bmc':
      return {
        type: 'bmc-grid',
        cells: BMC_FIELDS.map((definition) => ({
          label: definition.label,
          value: firstLine(data[definition.key], 84) || '—',
          emphasis: definition.tone,
        })),
      }
    case 'benchmark': {
      const competitors = BENCHMARK_COMPETITOR_ROWS.map((row) => ({
        name: firstLine(data[`${row.key}_name`], 32),
        type: firstLine(data[`${row.key}_type`], 28),
        edge: firstLine(data[`${row.key}_edge_or_gap`], 74),
      })).filter((competitor) => competitor.name || competitor.edge)
      return competitors.length ? { type: 'comparison-matrix', competitors } : null
    }
    case 'tam': {
      const items = [
        { label: 'TAM', value: parseMoney(stringifyValue(data.tam_num)), display: moneyLabel(data.tam_num) || 'N/D', emphasis: 'acid' as const },
        { label: 'SAM', value: parseMoney(stringifyValue(data.sam_num)), display: moneyLabel(data.sam_num) || 'N/D', emphasis: 'coral' as const },
        { label: 'SOM', value: parseMoney(stringifyValue(data.som_num)), display: moneyLabel(data.som_num) || 'N/D', emphasis: 'blue' as const },
      ]
      return { type: 'waterfall', items }
    }
    case 'pnl': {
      const totals = computePnlTotals(data)
      return {
        type: 'financial-bars',
        items: [
          { label: 'Revenue', value: totals.total_revenue, display: formatMoney(totals.total_revenue), emphasis: 'acid' },
          { label: 'COGS', value: totals.total_cogs, display: formatMoney(totals.total_cogs), emphasis: 'coral' },
          { label: 'Gross profit', value: totals.gross_profit, display: formatMoney(totals.gross_profit), emphasis: 'blue' },
          { label: 'OpEx', value: totals.total_opex, display: formatMoney(totals.total_opex), emphasis: 'coral' },
          { label: 'EBITDA', value: totals.ebitda, display: formatMoney(totals.ebitda), emphasis: totals.ebitda < 0 ? 'coral' : 'acid' },
        ],
      }
    }
    case 'cashflow': {
      const hasCostPricingShape = COST_PRICING_FIELDS.some((field) => stringifyValue(data[field.key]))
      if (!hasCostPricingShape) return null
      return {
        type: 'margin-stack',
        items: [
          { label: 'Precio', value: firstLine(data.estimated_price, 42) || 'Por validar', emphasis: 'acid' },
          { label: 'Variable', value: firstLine(data.variable_unit_costs, 42) || 'Por medir', emphasis: 'coral' },
          { label: 'Fijo', value: firstLine(data.fixed_monthly_costs, 42) || 'Por presupuestar', emphasis: 'blue' },
          { label: 'Margen', value: firstLine(data.gross_margin, 42) || 'Por modelar', emphasis: 'acid' },
        ],
      }
    }
    case 'moat':
      return {
        type: 'scorecard',
        items: [
          { label: 'Switching', score: parseScore(data.switching_costs), note: firstLine(data.switching_costs, 54), emphasis: 'blue' },
          { label: 'Datos', score: parseScore(data.data_advantage), note: firstLine(data.data_advantage, 54), emphasis: 'acid' },
          { label: 'Embedded', score: parseScore(data.customer_embeddedness), note: firstLine(data.customer_embeddedness, 54), emphasis: 'blue' },
          { label: 'Distribución', score: parseScore(data.distribution_edge), note: firstLine(data.distribution_edge, 54), emphasis: 'coral' },
          { label: 'Moat total', score: parseScore(data.moat_score), note: firstLine(data.moat_score, 54), emphasis: 'acid' },
        ],
      }
    case 'go-no-go':
      return {
        type: 'decision-matrix',
        risk: parseScore(data.major_risks, 6),
        upside: /go/i.test(stringifyValue(data.verdict)) ? 7 : 4,
        label: firstLine(data.verdict, 28) || 'Decisión',
      }
    default:
      return fields.length ? null : null
  }
}

function buildExecutiveHighlights(sections: IdeaBriefSection[], finalData: JsonRecord): IdeaBriefMetric[] {
  const problem = sections.find((section) => section.kind === 'problem-definition')
  const tam = sections.find((section) => section.kind === 'tam')
  const pnl = sections.find((section) => section.kind === 'pnl')
  const moat = sections.find((section) => section.kind === 'moat')

  return [
    { label: 'Decisión', value: firstLine(finalData.verdict, 42) || 'Pendiente', detail: firstLine(finalData.decision_rationale, 74), emphasis: 'coral' },
    { label: 'Dolor', value: problem?.metrics[0]?.value || 'N/D', detail: problem?.metrics[2]?.value, emphasis: 'acid' },
    { label: 'Mercado', value: tam?.metrics[2]?.value || tam?.metrics[0]?.value || 'N/D', detail: 'SOM / oportunidad inicial', emphasis: 'blue' },
    { label: 'Economía', value: pnl?.metrics[2]?.value || 'N/D', detail: 'EBITDA estimado', emphasis: 'acid' },
    { label: 'Moat', value: moat?.metrics[0]?.value || 'N/D', detail: moat?.metrics[1]?.value, emphasis: 'blue' },
  ]
}

export function buildIdeaBriefReport(input: IdeaBriefInput): IdeaBriefReport {
  const rawStepData = input.stepData || {}
  const approvals = input.stepApprovals || {}
  const sections = IDEA_STEPS.map((step, index) => {
    const data = normalizeIdeaStepData(index, rawStepData[index.toString()] as JsonRecord | null) as JsonRecord
    const agentDraft = stringifyValue(data.content) || null
    const owner = stringifyValue(data.assigned_agent_name || data.generated_by_name || data.assigned_agent_slug) || null
    const fields = getKnownFieldsForStep(index, data)
    const metrics = buildMetrics(step.kind, data, fields).filter((metric) => metric.value)

    return {
      stepIndex: index,
      label: step.label,
      hint: step.hint,
      kind: step.kind,
      owner,
      agentDraft,
      executiveSummary: summaryBullets(agentDraft, fields),
      metrics,
      chart: chartForSection(step.kind, data, fields),
      fields,
    }
  })

  const finalData = normalizeIdeaStepData(
    FINAL_IDEA_STEP_INDEX,
    rawStepData[FINAL_IDEA_STEP_INDEX.toString()] as JsonRecord | null
  ) as JsonRecord

  return {
    title: input.title,
    summary: input.summary || null,
    verdict: stringifyValue(finalData.verdict) || stringifyValue(finalData.content) || null,
    rationale: stringifyValue(finalData.decision_rationale) || null,
    approvedAt: input.approvedAt || stringifyValue(approvals[FINAL_IDEA_STEP_INDEX.toString()]) || null,
    completedSteps: sections.filter((section) => section.agentDraft || section.fields.length > 0).length,
    totalSteps: IDEA_STEPS.length,
    executiveHighlights: buildExecutiveHighlights(sections, finalData),
    sections,
  }
}

export function buildIdeaBriefDiscordMessage(report: IdeaBriefReport) {
  const verdict = report.verdict ? `\n**Veredicto Hermes:** ${report.verdict}` : ''
  const summary = report.summary ? `\n${report.summary}` : ''

  return [
    `📎 **Idea lista para evaluación** — ${report.title}`,
    summary,
    verdict,
    `\nIncluye ${report.completedSteps}/${report.totalSteps} pasos del wizard y el Go/No-Go final en PDF. Revisalo antes de aprobar en Mission Control.`,
  ]
    .filter(Boolean)
    .join('')
    .slice(0, 1900)
}

export function buildIdeaBriefFilename(input: Pick<IdeaBriefInput, 'title' | 'slug'>) {
  const base = (input.slug || input.title || 'idea-brief')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)

  return `${base || 'idea-brief'}-final-brief.pdf`
}
