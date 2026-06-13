import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import {
  ALL_CASHFLOW_ROWS,
  ALL_PNL_INPUT_ROWS,
  BMC_FIELDS,
  CASHFLOW_PERIODS,
  CUSTOMER_ARCHETYPE_FIELDS,
  IDEA_STEPS,
  MOAT_FIELDS,
  TAM_FIELDS,
  TOTAL_IDEA_STEPS,
} from '@/lib/mission-control/idea-steps'
import { normalizeGeneratedStepPayload } from '@/lib/mission-control/ideas'
import type { AgentRow } from '@/lib/mission-control/agents'

const execFileAsync = promisify(execFile)

export type IdeaGenerationContext = {
  title: string
  summary: string | null
  step: number
  stepData: Record<string, unknown>
}

export async function generateIdeaStepWithHermes(params: {
  agent: Pick<AgentRow, 'name' | 'slug' | 'team' | 'role' | 'soul_short' | 'skills' | 'responsibilities' | 'llm_model'>
  idea: IdeaGenerationContext
}) {
  const stepDefinition = IDEA_STEPS[params.idea.step]
  if (!stepDefinition) {
    throw new Error(`Invalid idea step index: ${params.idea.step}`)
  }

  const priorContext = Object.entries(params.idea.stepData)
    .filter(([key]) => Number(key) < params.idea.step)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([key, value]) => {
      const stepIndex = Number(key)
      const label = IDEA_STEPS[stepIndex]?.label || `Paso ${stepIndex + 1}`
      const content = extractContent(value)
      return `Paso ${stepIndex + 1} — ${label}\n${content || 'Sin contenido previo.'}`
    })
    .join('\n\n')

  const schema = buildJsonSchemaHint(params.idea.step)
  const stepSpecificGuidance = buildStepSpecificGuidance(params.idea.step)

  const prompt = [
    `Eres ${params.agent.name} dentro de Mission Control.`,
    `Tu rol: ${params.agent.role}.`,
    params.agent.team ? `Equipo: ${params.agent.team}.` : null,
    params.agent.soul_short ? `Soul: ${params.agent.soul_short}` : null,
    params.agent.skills?.length ? `Skills: ${params.agent.skills.join(', ')}.` : null,
    params.agent.responsibilities?.length ? `Responsabilidades: ${params.agent.responsibilities.join(', ')}.` : null,
    '',
    'Objetivo:',
    `Genera el análisis del paso ${params.idea.step + 1}/${TOTAL_IDEA_STEPS} para la idea de negocio "${params.idea.title}".`,
    params.idea.summary ? `Resumen de la idea: ${params.idea.summary}` : 'Resumen de la idea: no provisto.',
    '',
    `Paso actual: ${stepDefinition.label}`,
    `Hint: ${stepDefinition.hint}`,
    stepDefinition.questions.length
      ? `Preguntas guía:\n${stepDefinition.questions.map((question, index) => `${index + 1}. ${question}`).join('\n')}`
      : 'Preguntas guía: usa criterio experto para completar este paso con suficiente sustancia para aprobación ejecutiva.',
    '',
    priorContext ? `Contexto ya resuelto:\n${priorContext}` : 'Contexto ya resuelto: este es el primer paso.',
    '',
    'Reglas obligatorias:',
    '- Responde solo en español.',
    '- No hables de ti mismo ni menciones que eres una IA.',
    '- Usa TODOS los campos dedicados del paso cuando existan; no concentres la respuesta en un solo bloque de texto.',
    '- Si un campo requiere números o supuestos, complétalos con estimaciones razonables y explícitas.',
    '- Devuelve ÚNICAMENTE un objeto JSON válido. Sin markdown, sin fences, sin texto extra antes o después.',
    '- El JSON debe incluir siempre la clave "content" con una síntesis ejecutiva breve del paso.',
    '- Todas las demás claves del JSON deben coincidir exactamente con el esquema provisto.',
    stepSpecificGuidance,
    '',
    'Esquema JSON obligatorio:',
    schema,
  ]
    .filter(Boolean)
    .join('\n')

  const args = [
    'chat',
    '-q',
    prompt,
    '-Q',
    '--toolsets',
    'web',
    '--ignore-rules',
    '--skills',
    'mission-control-workflows,mission-control-agent-design',
    '--source',
    'tool',
  ]

  const { stdout, stderr } = await execFileAsync('hermes', args, {
    cwd: process.cwd(),
    timeout: 240000,
    maxBuffer: 1024 * 1024,
  })

  const parsed = extractHermesJson(stdout)
  const stepData = normalizeGeneratedStepPayload(params.idea.step, parsed)

  if (!stepData.content && !Object.values(stepData).some((value) => value.trim())) {
    throw new Error(stderr?.trim() || 'Hermes no devolvió contenido estructurado para este paso.')
  }

  return {
    content: stepData.content,
    stepData,
    model: params.agent.llm_model || 'default',
    provider: 'default',
    generated_at: new Date().toISOString(),
  }
}

function buildJsonSchemaHint(step: number) {
  switch (IDEA_STEPS[step]?.kind) {
    case 'customer-archetype':
      return JSON.stringify(
        {
          content: 'Síntesis ejecutiva del arquetipo y por qué es el early user correcto.',
          ...Object.fromEntries(CUSTOMER_ARCHETYPE_FIELDS.map((field) => [field.key, field.label])),
        },
        null,
        2
      )
    case 'bmc':
      return JSON.stringify(
        {
          content: 'Síntesis del modelo de negocio y sus tensiones principales.',
          ...Object.fromEntries(BMC_FIELDS.map((field) => [field.key, field.label])),
        },
        null,
        2
      )
    case 'pnl':
      return JSON.stringify(
        {
          content: 'Lectura ejecutiva del P&L: motor de ingresos, estructura de costos y rentabilidad.',
          ...Object.fromEntries(ALL_PNL_INPUT_ROWS.map((field) => [field.key, 'Monto anual en USD, sin comas si es posible'])),
        },
        null,
        2
      )
    case 'cashflow':
      return JSON.stringify(
        {
          content: 'Lectura ejecutiva del cashflow y de la curva de caja.',
          ...Object.fromEntries(
            ALL_CASHFLOW_ROWS.flatMap((field) =>
              CASHFLOW_PERIODS.map((period) => [`${field.key}__${period}`, `${field.label} para ${period} en USD`])
            )
          ),
        },
        null,
        2
      )
    case 'tam':
      return JSON.stringify(
        {
          content: 'Síntesis del sizing y su credibilidad.',
          ...Object.fromEntries(TAM_FIELDS.map((field) => [field.key, field.label])),
        },
        null,
        2
      )
    case 'moat':
      return JSON.stringify(
        {
          content: 'Síntesis del moat actual y del plan para fortalecerlo.',
          ...Object.fromEntries(MOAT_FIELDS.map((field) => [field.key, field.label])),
        },
        null,
        2
      )
    default:
      return JSON.stringify(
        {
          content: 'Respuesta completa del paso en markdown simple convertido a texto plano.',
        },
        null,
        2
      )
  }
}

function buildStepSpecificGuidance(step: number) {
  switch (IDEA_STEPS[step]?.kind) {
    case 'customer-archetype':
      return '- Hazlo hiperconcreto: marcas, hábitos, media, ejercicio, trabajo, experiencia y comportamiento de compra.'
    case 'bmc':
      return '- Completa los 9 bloques del BMC con contenido accionable. No repitas la misma idea en todos los campos.'
    case 'pnl':
      return '- Usa la tabla de ingresos/costos/opex como estructura real del P&L. Los números deben ser internamente consistentes.'
    case 'cashflow':
      return '- Usa los periodos M1-M6, Q3-Q10, Y5 y Y10. Completa composición de ingresos y egresos, no solo totales.'
    case 'tam':
      return '- Explica método top-down o bottom-up y mantén coherencia entre TAM, SAM y SOM.'
    case 'moat':
      return '- Evalúa switching costs, datos, comunidad, distribución, lock-in, marca y economías de escala con honestidad estratégica.'
    default:
      return '- Entrega una síntesis lista para revisión ejecutiva, concreta y accionable.'
  }
}

function extractContent(value: unknown) {
  if (!value || typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  if (typeof record.content === 'string' && record.content.trim()) {
    return record.content.trim()
  }

  return Object.entries(record)
    .filter(
      ([key, fieldValue]) =>
        ![
          'assigned_agent_slug',
          'assigned_agent_name',
          'generated_at',
          'generated_by',
          'generated_by_name',
          'generation_provider',
          'generation_model',
        ].includes(key) && typeof fieldValue === 'string' && fieldValue.trim()
    )
    .map(([key, fieldValue]) => `- ${key}: ${String(fieldValue).trim()}`)
    .join('\n')
}

function extractHermesJson(stdout: string) {
  const clean = stdout
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('session_id:'))
    .join('\n')
    .trim()

  const fenced = clean.match(/```json\s*([\s\S]*?)```/i) || clean.match(/```\s*([\s\S]*?)```/)
  const candidate = fenced?.[1]?.trim() || extractJsonObject(clean)

  if (!candidate) {
    throw new Error('Hermes no devolvió un JSON parseable para este paso.')
  }

  try {
    return JSON.parse(candidate) as Record<string, unknown>
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'JSON inválido devuelto por Hermes.')
  }
}

function extractJsonObject(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}
