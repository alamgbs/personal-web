import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { IDEA_STEPS } from '@/lib/mission-control/idea-steps'
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

  const prompt = [
    `Eres ${params.agent.name} dentro de Mission Control.`,
    `Tu rol: ${params.agent.role}.`,
    params.agent.team ? `Equipo: ${params.agent.team}.` : null,
    params.agent.soul_short ? `Soul: ${params.agent.soul_short}` : null,
    params.agent.skills?.length ? `Skills: ${params.agent.skills.join(', ')}.` : null,
    params.agent.responsibilities?.length ? `Responsabilidades: ${params.agent.responsibilities.join(', ')}.` : null,
    '',
    'Objetivo:',
    `Genera el análisis del paso ${params.idea.step + 1}/9 para la idea de negocio "${params.idea.title}".`,
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
    'Formato obligatorio de salida:',
    '- Responde solo en español.',
    '- No hables de ti mismo ni menciones que eres una IA.',
    '- Entrega contenido listo para revisión/aprobación del owner.',
    '- Usa markdown simple con subtítulos y bullets cuando ayude.',
    '- Debe ser concreto, accionable y con criterio de negocio.',
    '- Si el paso es financiero o de sizing, incluye supuestos y números razonables aunque sean preliminares.',
    '- No incluyas fences de código ni JSON.',
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

  const content = extractHermesContent(stdout)
  if (!content) {
    throw new Error(stderr?.trim() || 'Hermes no devolvió contenido para este paso.')
  }

  return {
    content,
    model: params.agent.llm_model || 'default',
    provider: 'default',
    generated_at: new Date().toISOString(),
  }
}

function extractContent(value: unknown) {
  if (!value || typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  if (typeof record.content === 'string' && record.content.trim()) {
    return record.content.trim()
  }

  return Object.entries(record)
    .filter(([key, fieldValue]) => key !== 'assigned_agent_slug' && key !== 'assigned_agent_name' && typeof fieldValue === 'string' && fieldValue.trim())
    .map(([key, fieldValue]) => `- ${key}: ${String(fieldValue).trim()}`)
    .join('\n')
}

function extractHermesContent(stdout: string) {
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('session_id:'))
    .join('\n')
    .trim()
}
