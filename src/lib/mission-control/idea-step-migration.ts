import {
  ALL_CASHFLOW_ROWS,
  ALL_PNL_INPUT_ROWS,
  BMC_FIELDS,
  CASHFLOW_PERIODS,
  CUSTOMER_ARCHETYPE_FIELDS,
  CUSTOMER_JOURNEY_FIELDS,
  GO_NO_GO_FIELDS,
  IDEA_STEPS,
  MOAT_FIELDS,
  PROBLEM_DEFINITION_FIELDS,
  TAM_FIELDS,
  type IdeaStepKind,
} from './idea-steps'

const META_KEYS = new Set([
  'content',
  'pending_feedback',
  'assigned_agent_slug',
  'assigned_agent_name',
  'generated_at',
  'generated_by',
  'generated_by_name',
  'generation_provider',
  'generation_model',
  'reviewed_at',
  'reviewed_by',
  'review_verdict',
  'review_summary',
  'review_risks',
  'review_next_step',
])

const LEGACY_MONTH_TO_PERIOD: Record<string, string> = {
  Ene: 'M1',
  Feb: 'M2',
  Mar: 'M3',
  Abr: 'M4',
  May: 'M5',
  Jun: 'M6',
}

const LEGACY_QUARTER_TO_PERIOD: Array<{ months: string[]; period: string }> = [
  { months: ['Jul', 'Ago', 'Sep'], period: 'Q3' },
  { months: ['Oct', 'Nov', 'Dic'], period: 'Q4' },
]

export type IdeaRecordMigrationInput = {
  current_step: number | null
  step_data: Record<string, unknown> | null
  step_approvals: Record<string, unknown> | null
}

export type IdeaRecordMigrationResult = {
  changed: boolean
  current_step: number | null
  step_data: Record<string, unknown>
  step_approvals: Record<string, unknown>
}

export function migrateIdeaRecordShape(input: IdeaRecordMigrationInput): IdeaRecordMigrationResult {
  const stepData = { ...((input.step_data as Record<string, unknown>) || {}) }
  const stepApprovals = { ...((input.step_approvals as Record<string, unknown>) || {}) }
  let currentStep = input.current_step ?? 0

  const before = JSON.stringify({
    current_step: currentStep,
    step_data: stepData,
    step_approvals: stepApprovals,
  })

  const shiftedCurrentStep = shiftLegacyFinalStep(stepData, stepApprovals, currentStep)
  currentStep = shiftedCurrentStep

  const remapped = remapLegacyStepOrder(stepData, stepApprovals, currentStep)
  currentStep = remapped.currentStep

  for (const [stepKey, rawValue] of Object.entries(stepData)) {
    const step = Number(stepKey)
    if (!Number.isInteger(step)) continue

    const upgraded = upgradeLegacyIdeaStepPayload(step, rawValue as Record<string, unknown> | null | undefined)
    stepData[stepKey] = upgraded
  }

  const after = JSON.stringify({
    current_step: currentStep,
    step_data: stepData,
    step_approvals: stepApprovals,
  })

  return {
    changed: before !== after,
    current_step: currentStep,
    step_data: stepData,
    step_approvals: stepApprovals,
  }
}

export function upgradeLegacyIdeaStepPayload(step: number, raw: Record<string, unknown> | null | undefined) {
  const payload = { ...((raw as Record<string, unknown>) || {}) }
  const structuredKeys = getStructuredFieldKeys(step)

  if (!structuredKeys.length) {
    return payload
  }

  const preserved = pickPreservedFields(payload)
  const parsed = parseLegacyStructuredFields(step, payload) as Record<string, unknown>

  const normalizedStructured: Record<string, string> = Object.fromEntries(
    structuredKeys.map((key) => {
      const existingValue = normalizeText(payload[key])
      const parsedValue = normalizeText(parsed[key])
      return [key, existingValue || parsedValue]
    })
  )

  const hasStructuredValues = Object.values(normalizedStructured).some((value) => value.length > 0)
  if (!hasStructuredValues) {
    const fallback = buildStructuredFallback(step, payload)
    if (fallback) {
      return {
        ...preserved,
        ...fallback,
      }
    }

    return payload
  }

  return {
    ...preserved,
    ...normalizedStructured,
  }
}

export function isLegacyGoNoGoContent(content: string) {
  const normalized = normalizeText(content).toLowerCase()
  if (!normalized) return false

  return [
    'go / no-go',
    'go/no-go',
    'go no-go',
    'go / no go',
    'go/no go',
    'go no go',
    'recomendación preliminar',
    'decisión ejecutiva',
    'criterio de éxito a 6 meses',
    'supuestos críticos a validar primero',
  ].some((needle) => normalized.includes(needle))
}

function shiftLegacyFinalStep(
  stepData: Record<string, unknown>,
  stepApprovals: Record<string, unknown>,
  currentStep: number
) {
  const legacyFinal = asRecord(stepData['8'])
  const currentFinal = asRecord(stepData['9'])
  const legacyContent = normalizeText(legacyFinal.content)
  const currentContent = normalizeText(currentFinal.content)

  if (!isLegacyGoNoGoContent(legacyContent)) {
    return currentStep
  }

  const finalPayload = Object.keys(currentFinal).length > 0 ? currentFinal : legacyFinal
  stepData['9'] = finalPayload

  if (!currentContent || currentContent === legacyContent) {
    stepData['8'] = {}
  }

  if (stepApprovals['8'] && !stepApprovals['9']) {
    stepApprovals['9'] = stepApprovals['8']
    delete stepApprovals['8']
  }

  return currentStep === 8 ? 9 : currentStep
}

function remapLegacyStepOrder(
  stepData: Record<string, unknown>,
  stepApprovals: Record<string, unknown>,
  currentStep: number
) {
  const hasLegacyShape = currentStep > 8 || Object.prototype.hasOwnProperty.call(stepData, '9')
  if (!hasLegacyShape) {
    return { currentStep }
  }

  const oldProblem = asRecord(stepData['2'])
  const oldPainPoints = asRecord(stepData['3'])
  const mergedProblem = mergeLegacyProblemAndPainPointSteps(oldProblem, oldPainPoints)

  const remappedStepData: Record<string, unknown> = {
    '0': mergedProblem,
    '1': asRecord(stepData['0']),
    '2': asRecord(stepData['1']),
    '3': asRecord(stepData['4']),
    '4': asRecord(stepData['7']),
    '5': asRecord(stepData['5']),
    '6': asRecord(stepData['6']),
    '7': asRecord(stepData['8']),
    '8': asRecord(stepData['9']),
  }

  const remappedApprovals: Record<string, unknown> = {
    ...(stepApprovals['0'] || stepApprovals['1'] || stepApprovals['2'] || stepApprovals['3'] || stepApprovals['4'] || stepApprovals['5'] || stepApprovals['6'] || stepApprovals['7'] || stepApprovals['8'] || stepApprovals['9']
      ? {
          '0': stepApprovals['2'] || stepApprovals['3'],
          '1': stepApprovals['0'],
          '2': stepApprovals['1'],
          '3': stepApprovals['4'],
          '4': stepApprovals['7'],
          '5': stepApprovals['5'],
          '6': stepApprovals['6'],
          '7': stepApprovals['8'],
          '8': stepApprovals['9'],
        }
      : {}),
  }

  for (const key of Object.keys(stepData)) delete stepData[key]
  for (const [key, value] of Object.entries(remappedStepData)) {
    if (value && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length === 0) continue
    stepData[key] = value
  }

  for (const key of Object.keys(stepApprovals)) delete stepApprovals[key]
  for (const [key, value] of Object.entries(remappedApprovals)) {
    if (value !== undefined) {
      stepApprovals[key] = value
    }
  }

  return {
    currentStep: mapLegacyCurrentStep(currentStep),
  }
}

function mapLegacyCurrentStep(currentStep: number) {
  switch (currentStep) {
    case 0:
      return 1
    case 1:
      return 2
    case 2:
    case 3:
      return 0
    case 4:
      return 3
    case 5:
      return 5
    case 6:
      return 6
    case 7:
      return 4
    case 8:
      return 7
    case 9:
      return 8
    default:
      return Math.min(currentStep, 8)
  }
}

function mergeLegacyProblemAndPainPointSteps(
  problemStep: Record<string, unknown>,
  painPointStep: Record<string, unknown>
) {
  const problemContent = normalizeText(problemStep.content)
  const painContent = normalizeText(painPointStep.content)
  const mergedContent = joinParagraphs(problemContent, painContent)

  return {
    ...pickPreservedFields(problemStep),
    ...pickPreservedFields(painPointStep),
    content: mergedContent,
    persona_scope: firstNonEmpty(extractLeadingSentence(problemContent), extractLeadingSentence(painContent)),
    critical_symptom: firstNonEmpty(extractSection(problemContent, /síntoma crítico|problema central|síntoma/i, '###'), extractLeadingBulletBlock(problemContent)),
    problem_trigger: firstNonEmpty(extractSection(problemContent, /cuando|trigger|disparador/i, '###'), extractSection(painContent, /cuando|trigger|disparador/i, '###')),
    current_solution: firstNonEmpty(extractSection(problemContent, /qué hace hoy|solución actual|workaround/i, '###'), extractSection(painContent, /qué hace hoy|solución actual|workaround/i, '###')),
    frequency: extractInlineMatch(mergedContent, /(frecuencia[^\n:]*:\s*[^\n]+)/i),
    intensity: extractInlineMatch(mergedContent, /(intensidad[^\n:]*:\s*[^\n]+)/i),
    cost: firstNonEmpty(extractSection(problemContent, /costo|impacto|consecuencia/i, '###'), extractSection(painContent, /costo|impacto|consecuencia/i, '###')),
    root_causes: firstNonEmpty(extractSection(problemContent, /causas|anatomía|raíz/i, '###'), extractSection(painContent, /causas|anatomía|raíz/i, '###')),
    pain_points: firstNonEmpty(extractLeadingBulletBlock(painContent), painContent),
    problem_statement: firstNonEmpty(extractInlineMatch(mergedContent, /(problem statement[^\n:]*:\s*[^\n]+)/i), extractLeadingSentence(problemContent)),
    grandmother_value_statement: '',
  }
}

function parseLegacyStructuredFields(step: number, payload: Record<string, unknown>) {
  const content = normalizeText(payload.content)
  const kind = IDEA_STEPS[step]?.kind

  switch (kind) {
    case 'problem-definition':
      return parseProblemDefinition(content)
    case 'customer-archetype':
      return parseCustomerArchetype(content)
    case 'customer-journey':
      return parseCustomerJourney(content)
    case 'bmc':
      return parseBusinessModelCanvas(content, payload)
    case 'pnl':
      return parsePnl(content, payload)
    case 'cashflow':
      return parseCashflow(content, payload)
    case 'tam':
      return parseTam(content)
    case 'moat':
      return parseMoat(content)
    case 'go-no-go':
      return parseGoNoGo(content)
    default:
      return {}
  }
}

function parseProblemDefinition(content: string) {
  if (!content) return {}

  return {
    persona_scope: extractLeadingSentence(content),
    critical_symptom: firstNonEmpty(extractSection(content, /síntoma crítico|problema central|síntoma/i, '###'), extractLeadingBulletBlock(content)),
    problem_trigger: extractSection(content, /cuando|trigger|disparador/i, '###'),
    current_solution: extractSection(content, /qué hace hoy|solución actual|workaround/i, '###'),
    frequency: extractInlineMatch(content, /(frecuencia[^\n:]*:\s*[^\n]+)/i),
    intensity: extractInlineMatch(content, /(intensidad[^\n:]*:\s*[^\n]+)/i),
    cost: extractSection(content, /costo|impacto|consecuencia/i, '###'),
    root_causes: extractSection(content, /causas|anatomía|raíz/i, '###'),
    pain_points: extractSection(content, /pain points|dolores|fricciones/i, '###'),
    problem_statement: firstNonEmpty(extractInlineMatch(content, /(problem statement[^\n:]*:\s*[^\n]+)/i), extractLeadingSentence(content)),
    grandmother_value_statement: extractSection(content, /prueba de la abuela|value statement|propuesta de valor/i, '###'),
  }
}

function parseCustomerArchetype(content: string) {
  if (!content) return {}

  const primaryPersona =
    extractHeadingBody(content, /###\s+1\.\s+(.+)/i) ||
    extractHeadingBody(content, /###\s+Buyer[^\n]*/i) ||
    extractHeadingBody(content, /###\s+(.+)/i)

  const firstPersonaTitle =
    extractHeadingTitle(content, /###\s+1\.\s+(.+)/i) || extractHeadingTitle(content, /###\s+(.+)/i)

  const jobsFuncionales = extractSection(content, /###\s+Jobs funcionales/i, '###')
  const jobsEmocionales = extractSection(content, /###\s+Jobs emocionales/i, '###')
  const jobsSociales = extractSection(content, /###\s+Jobs sociales\/organizacionales/i, '###')
  const buyingSignals = extractSection(content, /##\s+6\)\s+Señales de prioridad alta/i, '##')
  const objections = extractSection(content, /##\s+5\)\s+Objeciones previsibles/i, '##')
  const executiveRead =
    extractSection(content, /##\s+8\)\s+Lectura ejecutiva/i, '##') ||
    extractSection(content, /##\s+7\)\s+Priorización recomendada de segmentos/i, '##')

  return {
    persona_name: firstPersonaTitle,
    job_role: firstPersonaTitle,
    goals: joinParagraphs(extractBoldField(primaryPersona, 'Objetivo'), jobsFuncionales),
    frustrations: joinParagraphs(extractBoldField(primaryPersona, 'Dolor actual'), objections),
    motivations: joinParagraphs(jobsEmocionales, jobsSociales),
    buying_triggers: buyingSignals,
    adoption_barriers: objections,
    early_user_thesis: executiveRead,
  }
}

function parseCustomerJourney(content: string) {
  if (!content) return {}

  const stageAliasMap: Record<string, RegExp> = {
    discovery: /descubrimiento|awareness|conciencia/i,
    consideration: /consideración|evaluation|evaluaci[oó]n/i,
    purchase: /compra|purchase|decisi[oó]n/i,
    onboarding: /onboarding|activaci[oó]n|implementaci[oó]n/i,
    usage: /uso|adopci[oó]n|operaci[oó]n recurrente/i,
    advocacy: /retenci[oó]n|defensa|advocacy|expansi[oó]n/i,
  }

  const extracted: Record<string, string> = {}

  for (const field of CUSTOMER_JOURNEY_FIELDS) {
    const [stageKey, suffix] = field.key.split(/_(.+)/)
    const section = extractSection(content, stageAliasMap[stageKey] || /.^/, '###')
    if (!section) continue

    switch (suffix) {
      case 'customer_need':
        extracted[field.key] = firstNonEmpty(extractInlineMatch(section, /(necesidad[^\n:]*:\s*[^\n]+)/i), extractLeadingBulletBlock(section), extractLeadingSentence(section))
        break
      case 'touchpoints':
        extracted[field.key] = extractInlineMatch(section, /(touchpoints?[^\n:]*:\s*[^\n]+)/i)
        break
      case 'opinion':
        extracted[field.key] = firstNonEmpty(extractInlineMatch(section, /(opini[oó]n[^\n:]*:\s*[^\n]+)/i), extractQuotedSentence(section))
        break
      case 'sentiment':
        extracted[field.key] = extractInlineMatch(section, /(sentimient[^\n:]*:\s*[^\n]+)/i)
        break
      case 'solution':
        extracted[field.key] = firstNonEmpty(extractInlineMatch(section, /(soluci[oó]n[^\n:]*:\s*[^\n]+)/i), extractSection(section, /soluci[oó]n|next step|acción/i, '###'))
        break
      default:
        break
    }
  }

  return extracted
}

function parseBusinessModelCanvas(content: string, payload: Record<string, unknown>) {
  const aliases: Record<string, string> = {
    key_partners: normalizeText(payload['Socios Clave']),
    key_activities: normalizeText(payload['Actividades Clave']),
    value_proposition: normalizeText(payload['Propuesta de Valor']),
    key_resources: normalizeText(payload['Recursos Clave']),
    customer_relationships: normalizeText(payload['Relaciones con Clientes']),
    customer_segments: normalizeText(payload['Segmentos de Clientes']),
    cost_structure: normalizeText(payload['Estructura de Costos']),
    channels: normalizeText(payload['Canales']),
    revenue_streams: normalizeText(payload['Flujos de Ingresos']),
  }

  return {
    key_partners: aliases.key_partners || extractSection(content, /##\s+7\.\s+Socios clave/i, '##'),
    key_activities: aliases.key_activities || extractSection(content, /##\s+5\.\s+Actividades clave/i, '##'),
    value_proposition: aliases.value_proposition || extractSection(content, /##\s+1\.\s+Propuesta de valor/i, '##'),
    key_resources: aliases.key_resources || extractSection(content, /##\s+6\.\s+Recursos clave/i, '##'),
    customer_relationships:
      aliases.customer_relationships || extractSection(content, /##\s+4\.\s+Relación con clientes/i, '##'),
    customer_segments: aliases.customer_segments || extractSection(content, /##\s+2\.\s+Segmentos de clientes/i, '##'),
    cost_structure: aliases.cost_structure || extractSection(content, /##\s+8\.\s+Estructura de costos/i, '##'),
    channels: aliases.channels || extractSection(content, /##\s+3\.\s+Canales/i, '##'),
    revenue_streams: aliases.revenue_streams || extractSection(content, /##\s+9\.\s+Fuentes de ingresos/i, '##'),
  }
}

function parsePnl(content: string, payload: Record<string, unknown>) {
  const revenue = normalizeText(payload['Ingresos']) || extractTableRowValue(content, 'Ingresos')
  const cogs = normalizeText(payload['COGS']) || extractTableRowValue(content, 'Costo de ventas / entrega')
  const opex = normalizeText(payload['OpEx Total']) || extractTableRowValue(content, 'Opex')
  const netIncome = normalizeText(payload['Resultado Neto']) || extractTableRowValue(content, 'Resultado operativo')
  const ebitda = normalizeText(payload['EBITDA'])
  const grossProfit = normalizeText(payload['Margen Bruto'])

  return {
    revenue_subscription: revenue,
    revenue_other: joinParagraphs(
      extractSection(content, /###\s+1\)\s+Ingresos recurrentes fijos/i, '###'),
      extractSection(content, /###\s+2\)\s+Ingresos variables por consulta/i, '###')
    ),
    cogs_delivery: cogs,
    opex_team: opex,
    opex_product_engineering: joinParagraphs(
      extractSection(content, /####\s+Costos operativos \/ Opex/i, '###'),
      extractSection(content, /####\s+Costos directos \/ COGS/i, '###')
    ),
    taxes: '',
    ...(grossProfit ? { gross_profit_legacy: grossProfit } : {}),
    ...(ebitda ? { ebitda_legacy: ebitda } : {}),
    ...(netIncome ? { net_income_legacy: netIncome } : {}),
  }
}

function parseCashflow(content: string, payload: Record<string, unknown>) {
  const mapped: Record<string, string> = {}

  for (const [legacyMonth, period] of Object.entries(LEGACY_MONTH_TO_PERIOD)) {
    const inflow = normalizeText(payload[`in_${legacyMonth}`])
    const outflow = normalizeText(payload[`out_${legacyMonth}`])

    if (inflow) {
      mapped[`in_recurring__${period}`] = inflow
    }
    if (outflow) {
      mapped[`out_payroll__${period}`] = outflow
    }
  }

  for (const quarter of LEGACY_QUARTER_TO_PERIOD) {
    const inflowValues = quarter.months.map((month) => normalizeText(payload[`in_${month}`])).filter(Boolean)
    const outflowValues = quarter.months.map((month) => normalizeText(payload[`out_${month}`])).filter(Boolean)

    if (inflowValues.length) {
      mapped[`in_recurring__${quarter.period}`] = inflowValues.join(' + ')
    }
    if (outflowValues.length) {
      mapped[`out_payroll__${quarter.period}`] = outflowValues.join(' + ')
    }
  }

  if (Object.keys(mapped).length) {
    return mapped
  }

  return {
    in_other__M1: extractSection(content, /###\s+Tesis de flujo de caja a 12 meses/i, '###'),
    out_other__M1: extractSection(content, /###\s+Escenarios de tensión/i, '###'),
  }
}

function parseTam(content: string) {
  const methodology = joinParagraphs(
    extractSection(content, /###\s+Enfoque de estimación/i, '###'),
    extractSection(content, /###\s+Supuestos de trabajo/i, '###')
  )
  const tam = extractSection(content, /###\s+TAM\s+—\s+Mercado Total Atendible/i, '###')
  const sam = extractSection(content, /###\s+SAM\s+—\s+Mercado Servible/i, '###')
  const som = extractSection(content, /###\s+SOM\s+—\s+Mercado Obtenible/i, '###')

  return {
    tam,
    tam_num: extractMoneySnippet(tam),
    sam,
    sam_num: extractMoneySnippet(sam),
    som,
    som_num: extractMoneySnippet(som),
    methodology,
  }
}

function parseMoat(content: string) {
  if (!content) return {}

  return {
    switching_costs: extractBulletGroup(content, /switching cost/i),
    data_advantage: extractBulletGroup(content, /datos propios|data/i),
    customer_embeddedness: extractBulletGroup(content, /embedded|lock-?in/i),
    network_effects: extractBulletGroup(content, /red|comunidad|network/i),
    brand_trust: extractBulletGroup(content, /marca|confianza|brand/i),
    distribution_edge: extractBulletGroup(content, /distribuci[oó]n/i),
    economies_of_scale: extractBulletGroup(content, /escala/i),
    speed_learning: extractBulletGroup(content, /aprendizaje|learning/i),
    weak_points: extractSection(content, /huecos|debilidades|weak/i, '###'),
    moat_building_plan: extractSection(content, /plan/i, '###'),
    moat_score: extractScore(content),
  }
}

function parseGoNoGo(content: string) {
  if (!content) return {}

  return {
    verdict: firstNonEmpty(extractInlineMatch(content, /(go(?:\s*condicionado)?|no-?go)/i), extractHeadingTitle(content, /#\s+(.+)/i)),
    decision_rationale: firstNonEmpty(extractSection(content, /recomendación|decisión|rationale/i, '##'), extractLeadingBulletBlock(content)),
    critical_hypotheses: extractSection(content, /hipótesis/i, '##'),
    validation_experiments: extractSection(content, /experimento|validación/i, '##'),
    success_metrics: extractSection(content, /métricas|criterio de éxito/i, '##'),
    major_risks: extractSection(content, /riesgos|no-go/i, '##'),
    timeline: extractSection(content, /timeline|mes 1|mes 2|mes 3/i, '##'),
    kill_criteria: extractSection(content, /kill criteria|frenar|detener/i, '##'),
  }
}

function pickPreservedFields(payload: Record<string, unknown>) {
  const preserved: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    if (META_KEYS.has(key) || key.startsWith('review_')) {
      preserved[key] = typeof value === 'string' ? value.trim() : value
    }
  }

  return preserved
}

function getStructuredFieldKeys(step: number) {
  const kind = IDEA_STEPS[step]?.kind
  return getStructuredFieldKeysByKind(kind)
}

function buildStructuredFallback(step: number, payload: Record<string, unknown>) {
  const kind = IDEA_STEPS[step]?.kind
  const content = normalizeText(payload.content)
  if (!content) return null

  const fallbackKeyByKind: Partial<Record<IdeaStepKind, string>> = {
    'problem-definition': 'problem_statement',
    'customer-archetype': 'early_user_thesis',
    'customer-journey': 'discovery_customer_need',
    bmc: 'value_proposition',
    pnl: 'revenue_other',
    cashflow: 'in_other__M1',
    tam: 'methodology',
    moat: 'moat_building_plan',
    'go-no-go': 'decision_rationale',
  }

  const keys = getStructuredFieldKeysByKind(kind)
  const fallbackKey = kind ? fallbackKeyByKind[kind] : undefined
  if (!keys.length || !fallbackKey) return null

  return Object.fromEntries(keys.map((key) => [key, key === fallbackKey ? content : '']))
}

function getStructuredFieldKeysByKind(kind: IdeaStepKind | undefined) {
  switch (kind) {
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

function extractSection(content: string, headingRegex: RegExp, level: '##' | '###' = '##') {
  if (!content) return ''

  const stopPattern = level === '###' ? '(?=\\n###\\s|\\n##\\s|$)' : '(?=\\n##\\s|$)'
  const match = content.match(new RegExp(`${headingRegex.source}[\\s\\S]*?${stopPattern}`, 'i'))
  if (!match) return ''

  const section = match[0]
    .replace(new RegExp(`^${headingRegex.source}\\s*`, 'i'), '')
    .replace(/^[-*]\s*/gm, '- ')
    .trim()

  return section
}

function extractHeadingBody(content: string, headingRegex: RegExp) {
  if (!content) return ''
  const match = content.match(new RegExp(`${headingRegex.source}[\s\S]*?(?=\n###\s|\n##\s|$)`, 'i'))
  if (!match) return ''
  return match[0].replace(new RegExp(`^${headingRegex.source}\s*`, 'i'), '').trim()
}

function extractHeadingTitle(content: string, headingRegex: RegExp) {
  const match = content.match(headingRegex)
  return match?.[1]?.trim() || ''
}

function extractBoldField(content: string, label: string) {
  if (!content) return ''
  const escaped = escapeRegex(label)
  const match = content.match(new RegExp(`\*\*${escaped}:\*\*\s*([^\n]+)`, 'i'))
  return match?.[1]?.trim() || ''
}

function extractTableRowValue(content: string, label: string) {
  if (!content) return ''

  const normalizedLabel = label.trim().toLowerCase()

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue

    const cells = trimmed
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean)

    if (cells.length < 2) continue
    if (cells[0].toLowerCase() !== normalizedLabel) continue

    return cells[1] || ''
  }

  return ''
}

function extractMoneySnippet(content: string) {
  if (!content) return ''
  const match = content.match(/USD\s*[\d.,]+\s*[kKmM]?(?:\s*(?:a|–|-)\s*USD?\s*[\d.,]+\s*[kKmM]?)?(?:\s*ARR)?/i)
  return match?.[0]?.trim() || ''
}

function extractBulletGroup(content: string, labelRegex: RegExp) {
  if (!content) return ''

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => labelRegex.test(line))

  return lines.join('\n')
}

function extractScore(content: string) {
  if (!content) return ''
  const match = content.match(/(\d+(?:[.,]\d+)?)\s*\/\s*10/i)
  return match?.[0] || ''
}

function extractInlineMatch(content: string, regex: RegExp) {
  const match = content.match(regex)
  return match?.[1]?.trim() || match?.[0]?.trim() || ''
}

function extractLeadingSentence(content: string) {
  if (!content) return ''
  const match = content.trim().match(/^([^.!?\n]+[.!?]?)/)
  return match?.[1]?.trim() || ''
}

function extractLeadingBulletBlock(content: string) {
  if (!content) return ''
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .slice(0, 4)
    .join('\n')
}

function extractQuotedSentence(content: string) {
  if (!content) return ''
  const match = content.match(/[“"]([^”"]+)[”"]/)
  return match?.[1]?.trim() || ''
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? ({ ...(value as Record<string, unknown>) }) : {}
}

function normalizeText(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function joinParagraphs(...parts: Array<string | undefined>) {
  return parts
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join('\n\n')
}

function firstNonEmpty(...parts: Array<string | undefined>) {
  return parts.map((part) => normalizeText(part)).find(Boolean) || ''
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
