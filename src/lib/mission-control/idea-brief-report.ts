import {
  BENCHMARK_FIELDS,
  BMC_FIELDS,
  COST_PRICING_FIELDS,
  CUSTOMER_ARCHETYPE_FIELDS,
  CUSTOMER_JOURNEY_FIELDS,
  FINAL_IDEA_STEP_INDEX,
  GO_NO_GO_FIELDS,
  IDEA_STEPS,
  MOAT_FIELDS,
  PNL_COMPUTED_ROWS,
  PNL_INPUT_GROUPS,
  PROBLEM_DEFINITION_FIELDS,
  TAM_FIELDS,
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

export type IdeaBriefSection = {
  stepIndex: number
  label: string
  hint: string
  owner?: string | null
  agentDraft?: string | null
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

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).filter(Boolean).join('\n')
  }

  if (typeof value === 'object') {
    return Object.entries(value as JsonRecord)
      .map(([key, nestedValue]) => {
        const rendered = stringifyValue(nestedValue)
        return rendered ? `${humanizeKey(key)}: ${rendered}` : ''
      })
      .filter(Boolean)
      .join('\n')
  }

  return String(value).trim()
}

function humanizeKey(key: string) {
  return key
    .replace(/__/g, ' · ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function parseMoney(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const normalized = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function appendKnownFields(fields: IdeaBriefField[], data: JsonRecord, definitions: Array<{ key: string; label: string; tone?: IdeaBriefField['emphasis'] }>) {
  for (const definition of definitions) {
    const value = stringifyValue(data[definition.key])
    if (!value) continue
    fields.push({ label: definition.label, value, emphasis: definition.tone })
  }
}

function appendPnlFields(fields: IdeaBriefField[], data: JsonRecord) {
  for (const group of PNL_INPUT_GROUPS) {
    const groupRows = group.rows
      .map((row) => ({ label: row.label, value: stringifyValue(data[row.key]), emphasis: row.tone }))
      .filter((row) => row.value)

    if (groupRows.length === 0) continue
    fields.push({ label: group.label, value: groupRows.map((row) => `${row.label}: ${row.value}`).join('\n'), emphasis: 'acid' })
  }

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

  fields.push({
    label: 'Resumen financiero calculado',
    value: PNL_COMPUTED_ROWS.map((row) => `${row.label}: ${formatMoney(totals[row.key])}`).join('\n'),
    emphasis: 'blue',
  })
}

function appendCostPricingFields(fields: IdeaBriefField[], data: JsonRecord) {
  appendKnownFields(fields, data, COST_PRICING_FIELDS)
}

function getKnownFieldsForStep(stepIndex: number, data: JsonRecord): IdeaBriefField[] {
  const step = IDEA_STEPS[stepIndex]
  const fields: IdeaBriefField[] = []

  switch (step?.kind) {
    case 'problem-definition':
      appendKnownFields(fields, data, PROBLEM_DEFINITION_FIELDS)
      break
    case 'customer-archetype':
      appendKnownFields(fields, data, CUSTOMER_ARCHETYPE_FIELDS)
      break
    case 'customer-journey':
      appendKnownFields(fields, data, CUSTOMER_JOURNEY_FIELDS)
      break
    case 'bmc':
      appendKnownFields(fields, data, BMC_FIELDS)
      break
    case 'benchmark':
      appendKnownFields(fields, data, BENCHMARK_FIELDS)
      break
    case 'pnl':
      appendPnlFields(fields, data)
      break
    case 'cashflow':
      appendCostPricingFields(fields, data)
      break
    case 'tam':
      appendKnownFields(fields, data, TAM_FIELDS)
      break
    case 'moat':
      appendKnownFields(fields, data, MOAT_FIELDS)
      break
    case 'go-no-go':
      appendKnownFields(fields, data, GO_NO_GO_FIELDS)
      break
    default:
      break
  }

  const knownKeys = new Set(fields.map((field) => field.label))
  for (const [key, value] of Object.entries(data)) {
    if (METADATA_KEYS.has(key)) continue
    const rendered = stringifyValue(value)
    if (!rendered) continue
    const label = humanizeKey(key)
    if (knownKeys.has(label)) continue
    fields.push({ label, value: rendered })
  }

  return fields
}

export function buildIdeaBriefReport(input: IdeaBriefInput): IdeaBriefReport {
  const rawStepData = input.stepData || {}
  const approvals = input.stepApprovals || {}
  const sections = IDEA_STEPS.map((step, index) => {
    const data = normalizeIdeaStepData(index, rawStepData[index.toString()] as JsonRecord | null) as JsonRecord
    const agentDraft = stringifyValue(data.content) || null
    const owner = stringifyValue(data.assigned_agent_name || data.generated_by_name || data.assigned_agent_slug) || null

    return {
      stepIndex: index,
      label: step.label,
      hint: step.hint,
      owner,
      agentDraft,
      fields: getKnownFieldsForStep(index, data),
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
}

export function buildIdeaBriefFilename(input: Pick<IdeaBriefInput, 'title' | 'slug'>) {
  const base = (input.slug || input.title || 'idea-brief')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)

  return `${base || 'idea-brief'}-final-brief.pdf`
}
