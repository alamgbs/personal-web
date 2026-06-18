import {
  ALL_CASHFLOW_ROWS,
  ALL_PNL_INPUT_ROWS,
  BMC_FIELDS,
  CASHFLOW_PERIODS,
  CUSTOMER_ARCHETYPE_FIELDS,
  CUSTOMER_JOURNEY_FIELDS,
  FINAL_IDEA_STEP_INDEX,
  GO_NO_GO_FIELDS,
  IDEA_STEPS,
  MOAT_FIELDS,
  PROBLEM_DEFINITION_FIELDS,
  TAM_FIELDS,
} from '@/lib/mission-control/idea-steps'
import { upgradeLegacyIdeaStepPayload } from '@/lib/mission-control/idea-step-migration'

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

const DEFAULT_PROFILE_BY_SLUG: Record<string, string> = {
  hermes: 'mc-hermes',
  'product-lead': 'mc-product-lead',
  research: 'mc-research',
  'finance-analyst': 'mc-finance-analyst',
  'cx-analyst': 'mc-cx-analyst',
}

const DEFAULT_SKILLS_BY_SLUG: Record<string, readonly string[]> = {
  hermes: ['mission-control-workflows', 'hermes-agent'],
  'product-lead': ['mission-control-workflows'],
  research: ['mission-control-workflows'],
  'finance-analyst': ['mission-control-workflows'],
  'cx-analyst': ['mission-control-workflows'],
}

export type IdeaStepAssignment = (typeof IDEA_STEP_ASSIGNMENTS)[number] & {
  profile: string | null
  skillName: string | null
  skillNames: string[]
}

const META_KEYS = new Set([
  'assigned_agent_slug',
  'assigned_agent_name',
  'assigned_profile_name',
  'assigned_skill_name',
  'assigned_skill_names',
  'pending_feedback',
  'generated_at',
  'generated_by',
  'generated_by_name',
  'generation_provider',
  'generation_model',
])

export function getIdeaStepAssignment(step: number): IdeaStepAssignment {
  const assignment = IDEA_STEP_ASSIGNMENTS[step] || IDEA_STEP_ASSIGNMENTS[0]
  const skillNames = [...(DEFAULT_SKILLS_BY_SLUG[assignment.slug] || ['mission-control-workflows'])]

  return {
    ...assignment,
    profile: DEFAULT_PROFILE_BY_SLUG[assignment.slug] || null,
    skillName: skillNames[0] || null,
    skillNames,
  }
}

export function getStructuredFieldKeys(step: number) {
  switch (IDEA_STEPS[step]?.kind) {
    case 'problem-definition':
      return PROBLEM_DEFINITION_FIELDS.map((field) => field.key)
    case 'customer-archetype':
      return CUSTOMER_ARCHETYPE_FIELDS.map((field) => field.key)
    case 'customer-journey':
      return CUSTOMER_JOURNEY_FIELDS.map((field) => field.key)
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
    case 'go-no-go':
      return GO_NO_GO_FIELDS.map((field) => field.key)
    default:
      return []
  }
}

export function getFieldLabelMap(step: number) {
  switch (IDEA_STEPS[step]?.kind) {
    case 'problem-definition':
      return Object.fromEntries(PROBLEM_DEFINITION_FIELDS.map((field) => [field.key, field.label]))
    case 'customer-archetype':
      return Object.fromEntries(CUSTOMER_ARCHETYPE_FIELDS.map((field) => [field.key, field.label]))
    case 'customer-journey':
      return Object.fromEntries(CUSTOMER_JOURNEY_FIELDS.map((field) => [field.key, field.label]))
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
    case 'go-no-go':
      return Object.fromEntries(GO_NO_GO_FIELDS.map((field) => [field.key, field.label]))
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

export function getMissingStructuredFields(step: number, raw: Record<string, unknown> | null | undefined) {
  const normalized = normalizeGeneratedStepPayload(step, raw)

  return getStructuredFieldKeys(step).filter((key) => {
    const value = normalized[key]
    return typeof value !== 'string' || !value.trim()
  })
}

export function normalizeIdeaStepData(step: number, raw: Record<string, unknown> | null | undefined) {
  const assignment = getIdeaStepAssignment(step)
  const data = upgradeLegacyIdeaStepPayload(step, (raw || {}) as Record<string, unknown>)

  const legacyAware = applyLegacyAliases(step, data)
  const normalizedStructured = normalizeGeneratedStepPayload(step, legacyAware)

  return {
    ...legacyAware,
    ...normalizedStructured,
    assigned_agent_slug: (legacyAware.assigned_agent_slug as string) || assignment.slug,
    assigned_agent_name: (legacyAware.assigned_agent_name as string) || assignment.name,
    assigned_profile_name: (legacyAware.assigned_profile_name as string) || assignment.profile,
    assigned_skill_name: (legacyAware.assigned_skill_name as string) || assignment.skillName,
    assigned_skill_names: normalizeSkillNames(
      legacyAware.assigned_skill_names,
      assignment.skillNames,
      legacyAware.assigned_skill_name as string | undefined,
      assignment.skillName
    ),
  }
}

export function normalizeIdeaStepPayloadForSave(
  step: number,
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined
) {
  const existingData = upgradeLegacyIdeaStepPayload(step, (existing || {}) as Record<string, unknown>)
  const incomingData = upgradeLegacyIdeaStepPayload(step, (incoming || {}) as Record<string, unknown>)
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

function normalizeSkillNames(
  value: unknown,
  fallback: readonly string[],
  singular?: string | null,
  fallbackSingular?: string | null
) {
  if (Array.isArray(value)) {
    const normalized = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    if (normalized.length > 0) return normalized
  }

  if (typeof singular === 'string' && singular.trim()) {
    return [singular.trim()]
  }

  if (fallback.length > 0) {
    return [...fallback]
  }

  if (typeof fallbackSingular === 'string' && fallbackSingular.trim()) {
    return [fallbackSingular.trim()]
  }

  return []
}

export function isIdeaStepComplete(step: number, raw: Record<string, unknown> | null | undefined) {
  const normalized = normalizeIdeaStepPayloadForSave(step, raw, raw)
  const structuredKeys = getStructuredFieldKeys(step)

  if (structuredKeys.length > 0) {
    return structuredKeys.every((key) => {
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
