import {
  ALL_CASHFLOW_ROWS,
  ALL_PNL_INPUT_ROWS,
  BMC_FIELDS,
  CASHFLOW_PERIODS,
  CUSTOMER_ARCHETYPE_FIELDS,
  FINAL_IDEA_STEP_INDEX,
  IDEA_STEPS,
  MOAT_FIELDS,
  TAM_FIELDS,
} from '@/lib/mission-control/idea-steps'

export const IDEA_STEP_ASSIGNMENTS = [
  { slug: 'cx-analyst', name: 'CX Analyst', team: 'Marketing' },
  { slug: 'research', name: 'Research', team: 'Product' },
  { slug: 'product-lead', name: 'Product Lead', team: 'Product' },
  { slug: 'research', name: 'Research', team: 'Product' },
  { slug: 'product-lead', name: 'Product Lead', team: 'Product' },
  { slug: 'finance-analyst', name: 'Finance Analyst', team: 'Product' },
  { slug: 'finance-analyst', name: 'Finance Analyst', team: 'Product' },
  { slug: 'research', name: 'Research', team: 'Product' },
  { slug: 'research', name: 'Research', team: 'Product' },
  { slug: 'hermes', name: 'Hermes', team: 'Command' },
] as const

export type IdeaStepAssignment = (typeof IDEA_STEP_ASSIGNMENTS)[number]

const META_KEYS = new Set([
  'assigned_agent_slug',
  'assigned_agent_name',
  'generated_at',
  'generated_by',
  'generated_by_name',
  'generation_provider',
  'generation_model',
])

export function getIdeaStepAssignment(step: number): IdeaStepAssignment {
  return IDEA_STEP_ASSIGNMENTS[step] || IDEA_STEP_ASSIGNMENTS[0]
}

export function getStructuredFieldKeys(step: number) {
  switch (IDEA_STEPS[step]?.kind) {
    case 'customer-archetype':
      return CUSTOMER_ARCHETYPE_FIELDS.map((field) => field.key)
    case 'bmc':
      return BMC_FIELDS.map((field) => field.key)
    case 'pnl':
      return ALL_PNL_INPUT_ROWS.map((field) => field.key)
    case 'cashflow':
      return ALL_CASHFLOW_ROWS.flatMap((field) => CASHFLOW_PERIODS.map((period) => `${field.key}__${period}`))
    case 'tam':
      return TAM_FIELDS.map((field) => field.key)
    case 'moat':
      return MOAT_FIELDS.map((field) => field.key)
    default:
      return []
  }
}

export function getFieldLabelMap(step: number) {
  switch (IDEA_STEPS[step]?.kind) {
    case 'customer-archetype':
      return Object.fromEntries(CUSTOMER_ARCHETYPE_FIELDS.map((field) => [field.key, field.label]))
    case 'bmc':
      return Object.fromEntries(BMC_FIELDS.map((field) => [field.key, field.label]))
    case 'pnl':
      return Object.fromEntries(ALL_PNL_INPUT_ROWS.map((field) => [field.key, field.label]))
    case 'cashflow':
      return Object.fromEntries(
        ALL_CASHFLOW_ROWS.flatMap((field) =>
          CASHFLOW_PERIODS.map((period) => [`${field.key}__${period}`, `${field.label} · ${period}`])
        )
      )
    case 'tam':
      return Object.fromEntries(TAM_FIELDS.map((field) => [field.key, field.label]))
    case 'moat':
      return Object.fromEntries(MOAT_FIELDS.map((field) => [field.key, field.label]))
    default:
      return {}
  }
}

export function normalizeGeneratedStepPayload(step: number, raw: Record<string, unknown> | null | undefined) {
  const base = (raw || {}) as Record<string, unknown>
  const allowedKeys = new Set(['content', ...getStructuredFieldKeys(step)])
  const normalized: Record<string, string> = {}

  for (const key of Object.keys(base)) {
    if (!allowedKeys.has(key)) continue
    const value = base[key]
    if (value == null) {
      normalized[key] = ''
      continue
    }
    normalized[key] = typeof value === 'string' ? value.trim() : String(value)
  }

  for (const key of getStructuredFieldKeys(step)) {
    normalized[key] = normalized[key] || ''
  }

  normalized.content = (normalized.content || '').trim()

  if (!normalized.content) {
    normalized.content = buildStructuredSummary(step, normalized)
  }

  return normalized
}

export function normalizeIdeaStepData(step: number, raw: Record<string, unknown> | null | undefined) {
  const assignment = getIdeaStepAssignment(step)
  const data = (raw || {}) as Record<string, unknown>

  const legacyAware = applyLegacyAliases(step, data)
  const normalizedStructured = normalizeGeneratedStepPayload(step, legacyAware)

  return {
    ...legacyAware,
    ...normalizedStructured,
    assigned_agent_slug: (legacyAware.assigned_agent_slug as string) || assignment.slug,
    assigned_agent_name: (legacyAware.assigned_agent_name as string) || assignment.name,
  }
}

export function normalizeIdeaStepPayloadForSave(
  step: number,
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined
) {
  const existingData = (existing || {}) as Record<string, unknown>
  const incomingData = (incoming || {}) as Record<string, unknown>
  const merged = {
    ...existingData,
    ...incomingData,
  }

  const aliasAware = applyLegacyAliases(step, merged)
  const normalizedStructured = normalizeGeneratedStepPayload(step, aliasAware)
  const metadata = pickMetaFields(existingData, incomingData)

  return {
    ...normalizedStructured,
    ...metadata,
  }
}

export function isIdeaStepComplete(step: number, raw: Record<string, unknown> | null | undefined) {
  const normalized = normalizeIdeaStepPayloadForSave(step, raw, raw)
  const structuredKeys = getStructuredFieldKeys(step)

  if (structuredKeys.length > 0) {
    return structuredKeys.some((key) => {
      const value = normalized[key]
      return typeof value === 'string' && value.trim().length > 0
    })
  }

  return typeof normalized.content === 'string' && normalized.content.trim().length > 0
}

function applyLegacyAliases(step: number, raw: Record<string, unknown>) {
  if (IDEA_STEPS[step]?.kind !== 'bmc') {
    return raw
  }

  const aliases: Record<string, string> = {
    'Socios Clave': 'key_partners',
    'Actividades Clave': 'key_activities',
    'Propuesta de Valor': 'value_proposition',
    'Recursos Clave': 'key_resources',
    'Relaciones con Clientes': 'customer_relationships',
    'Segmentos de Clientes': 'customer_segments',
    'Estructura de Costos': 'cost_structure',
    Canales: 'channels',
    'Flujos de Ingresos': 'revenue_streams',
  }

  const normalized = { ...raw }
  for (const [legacyKey, nextKey] of Object.entries(aliases)) {
    if (!normalized[nextKey] && typeof normalized[legacyKey] === 'string') {
      normalized[nextKey] = normalized[legacyKey]
    }
  }

  return normalized
}

function buildStructuredSummary(step: number, data: Record<string, string>) {
  const labels = getFieldLabelMap(step)

  return Object.entries(data)
    .filter(([key, value]) => key !== 'content' && !META_KEYS.has(key) && value.trim())
    .map(([key, value]) => `- ${labels[key] || key}: ${value.trim()}`)
    .join('\n')
}

function pickMetaFields(...records: Record<string, unknown>[]) {
  const metadata: Record<string, unknown> = {}

  for (const record of records) {
    for (const key of META_KEYS) {
      if (record[key] !== undefined) {
        metadata[key] = record[key]
      }
    }
  }

  return metadata
}

export function getIdeaFinalStepIndex() {
  return FINAL_IDEA_STEP_INDEX
}
