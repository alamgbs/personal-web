import { existsSync } from 'node:fs'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
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
  TOTAL_IDEA_STEPS,
} from '@/lib/mission-control/idea-steps'
import { getFieldLabelMap, getMissingStructuredFields, normalizeGeneratedStepPayload } from '@/lib/mission-control/ideas'
import type { AgentRow } from '@/lib/mission-control/agents'

const execFileAsync = promisify(execFile)
const HERMES_BIN_CANDIDATES = [process.env.HERMES_CLI_PATH, '/usr/local/lib/hermes-agent/venv/bin/hermes', 'hermes'].filter(
  Boolean
) as string[]
const MAX_GENERATION_ATTEMPTS = 2

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

  const currentStepData = (params.idea.stepData[params.idea.step.toString()] as Record<string, unknown> | undefined) || {}
  const currentDraft = extractContent(currentStepData)
  const pendingFeedback = typeof currentStepData.pending_feedback === 'string' ? currentStepData.pending_feedback.trim() : ''

  const schema = buildJsonSchemaHint(params.idea.step)
  const stepSpecificGuidance = buildStepSpecificGuidance(params.idea.step)
  let previousAttemptNote = ''

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
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
      'Marco metodológico: usa un nivel de profundidad tipo Moonshot/ITTI (KAPI 2026): respuestas específicas, estructuradas, cuantificadas y listas para discusión ejecutiva.',
      stepDefinition.questions.length
        ? `Preguntas guía:\n${stepDefinition.questions.map((question, index) => `${index + 1}. ${question}`).join('\n')}`
        : 'Preguntas guía: usa criterio experto para completar este paso con suficiente sustancia para aprobación ejecutiva.',
      '',
      priorContext ? `Contexto ya resuelto:\n${priorContext}` : 'Contexto ya resuelto: este es el primer paso.',
      currentDraft ? `Borrador actual del paso a revisar:\n${currentDraft}` : 'Borrador actual del paso: no existe uno previo o debe generarse desde cero.',
      pendingFeedback
        ? `Feedback explícito del usuario para este paso (debes incorporarlo de forma prioritaria):\n${pendingFeedback}`
        : 'Feedback explícito del usuario para este paso: no provisto.',
      previousAttemptNote || null,
      '',
      'Reglas obligatorias:',
      '- Responde solo en español.',
      '- No hables de ti mismo ni menciones que eres una IA.',
      '- Usa TODOS los campos dedicados del paso cuando existan; no concentres la respuesta en un solo bloque de texto.',
      '- Si existe feedback explícito del usuario para este paso, úsalo como instrucción prioritaria para corregir y rehacer el draft.',
      '- Si un campo requiere números o supuestos, complétalos con estimaciones razonables y explícitas.',
      '- Mantén cada campo conciso: idealmente 3-4 bullets o un párrafo corto; evita bloques largos.',
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

    const { stdout, stderr } = await execFileAsync(resolveHermesBinary(), args, {
      cwd: process.cwd(),
      timeout: 240000,
      maxBuffer: 1024 * 1024,
    })

    const parsed = extractHermesJson(stdout)
    const stepData = normalizeGeneratedStepPayload(params.idea.step, parsed)

    if (!stepData.content && !Object.values(stepData).some((value) => value.trim())) {
      throw new Error(stderr?.trim() || 'Hermes no devolvió contenido estructurado para este paso.')
    }

    const missingFields = getMissingStructuredFields(params.idea.step, stepData)
    if (!missingFields.length) {
      return {
        content: stepData.content,
        stepData,
        model: params.agent.llm_model || 'default',
        provider: 'default',
        generated_at: new Date().toISOString(),
      }
    }

    if (attempt === MAX_GENERATION_ATTEMPTS) {
      throw new Error(buildMissingFieldsError(params.idea.step, missingFields))
    }

    previousAttemptNote = [
      'La respuesta anterior fue rechazada por incompleta.',
      buildMissingFieldsError(params.idea.step, missingFields),
      'Rehaz el JSON completo, manteniendo consistencia con el draft y rellenando TODOS esos campos faltantes.',
    ].join('\n')
  }

  throw new Error('No se pudo generar un payload válido para este paso.')
}

function buildJsonSchemaHint(step: number) {
  switch (IDEA_STEPS[step]?.kind) {
    case 'problem-definition':
      return JSON.stringify(
        {
          content: 'Síntesis ejecutiva del problema y de la propuesta de valor.',
          ...Object.fromEntries(PROBLEM_DEFINITION_FIELDS.map((field) => [field.key, field.label])),
        },
        null,
        2
      )
    case 'customer-archetype':
      return JSON.stringify(
        {
          content: 'Síntesis ejecutiva del arquetipo y por qué es el early user correcto.',
          ...Object.fromEntries(CUSTOMER_ARCHETYPE_FIELDS.map((field) => [field.key, field.label])),
        },
        null,
        2
      )
    case 'customer-journey':
      return JSON.stringify(
        {
          content: 'Síntesis del journey completo y del principal cuello de botella.',
          ...Object.fromEntries(CUSTOMER_JOURNEY_FIELDS.map((field) => [field.key, field.label])),
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
    case 'go-no-go':
      return JSON.stringify(
        {
          content: 'Decisión final y lectura ejecutiva del go/no-go.',
          ...Object.fromEntries(GO_NO_GO_FIELDS.map((field) => [field.key, field.label])),
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
    case 'problem-definition':
      return [
        '- Completa la anatomía del problema: síntoma, trigger, workaround actual, frecuencia, intensidad y costo.',
        '- Los pain points deben estar priorizados y conectados con consecuencias concretas.',
        '- El campo grandmother_value_statement debe pasar la prueba de la abuela: simple, sin jerga y entendible en 15 segundos.',
      ].join('\n')
    case 'customer-archetype':
      return [
        '- Completa todos los campos del arquetipo con señales observables, no generalidades.',
        '- Incluye JTBD, pains, gains, hábitos, canales y una cita que sonaría real en entrevista.',
        '- Prioriza un segmento accesible, con dolor intenso y capacidad de pago.',
      ].join('\n')
    case 'customer-journey':
      return [
        '- Recorre el journey de izquierda a derecha y completa TODAS las etapas.',
        '- En cada etapa documenta necesidad, touchpoints, opinión, sentimiento y solución concreta.',
        '- Mantén cada celda breve: 3 bullets o un párrafo corto; evita repetir la misma frase en todas las etapas.',
      ].join('\n')
    case 'bmc':
      return [
        '- Completa los 9 bloques del BMC con contenido accionable y mutuamente consistente.',
        '- Evita repetir la misma frase en múltiples campos: cada bloque debe agregar una pieza distinta del modelo.',
        '- Haz explícita la lógica de captura de valor: quién paga, por qué, por qué canal y con qué estructura de costos.',
      ].join('\n')
    case 'pnl':
      return [
        '- Usa la tabla de ingresos/costos/opex como estructura real del P&L.',
        '- Los números deben ser internamente consistentes con margen de contribución, EBITDA, CAC y LTV.',
        '- No dejes cifras sueltas: cada supuesto debe tener una lógica breve detrás.',
      ].join('\n')
    case 'cashflow':
      return [
        '- Usa los periodos M1-M6, Q3-Q10, Y5 y Y10.',
        '- Completa composición de ingresos y egresos, no solo totales agregados.',
        '- Piensa como operador financiero: diferencia caja vs rentabilidad, burn vs runway y timing de cobros/pagos.',
      ].join('\n')
    case 'tam':
      return [
        '- Explica si el sizing es top-down, bottom-up o híbrido.',
        '- Mantén coherencia entre TAM, SAM y SOM; cada reducción debe justificarse.',
        '- Evita números inflados: prioriza credibilidad y foco sobre grandilocuencia.',
      ].join('\n')
    case 'moat':
      return [
        '- Evalúa switching costs, datos, comunidad, distribución, lock-in, marca y economías de escala con honestidad estratégica.',
        '- Responde qué tendría que superar un competidor capitalizado para quitar esta ventaja.',
        '- Diferencia claramente el moat actual del moat que todavía debe construirse.',
      ].join('\n')
    case 'go-no-go':
      return [
        '- El veredicto debe ser explícito: Go, Go condicionado o No-Go.',
        '- Las hipótesis, experimentos y métricas deben ser accionables y no vanidosas.',
        '- Define kill criteria claros: qué evidencia detendría la idea.',
      ].join('\n')
    default:
      return [
        '- Entrega una síntesis concreta, accionable y lista para revisión ejecutiva.',
        '- Cuantifica frecuencia, intensidad, costo, hipótesis o criterios de éxito cuando aplique.',
        '- Evita copy genérico: prioriza observables, decisiones y trade-offs.',
      ].join('\n')
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

function resolveHermesBinary() {
  for (const candidate of HERMES_BIN_CANDIDATES) {
    if (candidate === 'hermes') return candidate
    if (existsSync(candidate)) return candidate
  }

  throw new Error(`No se encontró el binario de Hermes. Candidates: ${HERMES_BIN_CANDIDATES.join(', ')}`)
}

function buildMissingFieldsError(step: number, missingFields: string[]) {
  const labels = getFieldLabelMap(step)
  const formatted = missingFields.map((field) => labels[field] || field)
  return `El agente devolvió un payload incompleto. Faltan campos obligatorios: ${formatted.join(', ')}`
}
