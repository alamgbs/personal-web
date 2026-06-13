import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import type { AgentRow } from '@/lib/mission-control/agents'

const execFileAsync = promisify(execFile)

type ArtifactKind = 'prd' | 'planning' | 'sprint-review'

type ProjectArtifactContext = {
  name: string
  slug: string
  description: string | null
  ideaTitle?: string | null
  ideaSummary?: string | null
  stepData?: Record<string, unknown> | null
  prdMarkdown?: string | null
  planningMarkdown?: string | null
  sprintNumber?: number | null
  sprintGoal?: string | null
  completedTasks?: Array<{ title: string; assignee_slug: string | null; artifact_markdown?: string | null }>
}

export async function generateProjectArtifactWithHermes(params: {
  artifact: ArtifactKind
  agent: Pick<AgentRow, 'name' | 'slug' | 'team' | 'role' | 'soul_short' | 'skills' | 'responsibilities' | 'llm_model'>
  project: ProjectArtifactContext
}) {
  const artifactLabel = getArtifactLabel(params.artifact)
  const prompt = [
    `Eres ${params.agent.name} dentro de Mission Control.`,
    `Tu rol: ${params.agent.role}.`,
    params.agent.team ? `Equipo: ${params.agent.team}.` : null,
    params.agent.soul_short ? `Soul: ${params.agent.soul_short}` : null,
    params.agent.skills?.length ? `Skills: ${params.agent.skills.join(', ')}.` : null,
    params.agent.responsibilities?.length ? `Responsabilidades: ${params.agent.responsibilities.join(', ')}.` : null,
    '',
    `Necesitas generar el artefacto "${artifactLabel}" para el proyecto "${params.project.name}" (${params.project.slug}).`,
    params.project.description ? `Descripción del proyecto: ${params.project.description}` : null,
    params.project.ideaTitle ? `Idea origen: ${params.project.ideaTitle}` : null,
    params.project.ideaSummary ? `Resumen de la idea: ${params.project.ideaSummary}` : null,
    params.project.stepData ? `Contexto del análisis de idea:\n${flattenIdeaStepData(params.project.stepData)}` : null,
    params.project.prdMarkdown ? `PRD disponible:\n${params.project.prdMarkdown}` : null,
    params.project.planningMarkdown ? `Planning disponible:\n${params.project.planningMarkdown}` : null,
    params.project.sprintNumber ? `Sprint actual: ${params.project.sprintNumber}` : null,
    params.project.sprintGoal ? `Objetivo del sprint: ${params.project.sprintGoal}` : null,
    params.project.completedTasks?.length
      ? `Tareas completadas del sprint:\n${params.project.completedTasks
          .map((task, index) => `${index + 1}. ${task.title} · ${task.assignee_slug || 'sin assignee'}\n${task.artifact_markdown || 'Sin artefacto adjunto.'}`)
          .join('\n\n')}`
      : null,
    '',
    artifactInstructions(params.artifact),
    '',
    'Formato obligatorio de salida:',
    '- Responde solo en español.',
    '- No hables de ti mismo ni menciones que eres una IA.',
    '- Entrega markdown ejecutivo, claro y accionable.',
    '- Usa subtítulos y bullets.',
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
    throw new Error(stderr?.trim() || `Hermes no devolvió contenido para ${artifactLabel}.`)
  }

  return {
    content,
    model: params.agent.llm_model || 'default',
    provider: 'default',
    generated_at: new Date().toISOString(),
  }
}

function getArtifactLabel(artifact: ArtifactKind) {
  switch (artifact) {
    case 'prd':
      return 'PRD'
    case 'planning':
      return 'Planning de ejecución'
    case 'sprint-review':
      return 'Sprint review'
    default:
      return 'Artefacto'
  }
}

function artifactInstructions(artifact: ArtifactKind) {
  switch (artifact) {
    case 'prd':
      return [
        'Objetivo del artefacto:',
        '- Redacta un PRD listo para revisión del owner.',
        '- Debe incluir contexto, problema, objetivos, alcance, user stories, criterios de aceptación, riesgos, dependencias, métricas y definición de done.',
      ].join('\n')
    case 'planning':
      return [
        'Objetivo del artefacto:',
        '- Genera un planning de delivery listo para revisión del owner.',
        '- Debe incluir workstreams, secuencia recomendada, roles responsables, riesgos, dependencias, plan de sprint 1 y criterios para cerrar el sprint review.',
      ].join('\n')
    case 'sprint-review':
      return [
        'Objetivo del artefacto:',
        '- Consolida un sprint review ejecutivo.',
        '- Resume entregables completados, riesgos abiertos, decisiones tomadas, criterios pendientes y recomendación de aprobar o pedir cambios.',
      ].join('\n')
    default:
      return 'Genera un artefacto útil para Mission Control.'
  }
}

function flattenIdeaStepData(stepData: Record<string, unknown>) {
  return Object.entries(stepData)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([step, value]) => {
      const record = (value || {}) as Record<string, unknown>
      const content = typeof record.content === 'string' ? record.content.trim() : ''
      const extras = Object.entries(record)
        .filter(([key, fieldValue]) => key !== 'content' && typeof fieldValue === 'string' && fieldValue.trim())
        .map(([key, fieldValue]) => `- ${key}: ${String(fieldValue).trim()}`)
        .join('\n')

      return [`Paso ${Number(step) + 1}`, content, extras].filter(Boolean).join('\n')
    })
    .join('\n\n')
}

function extractHermesContent(stdout: string) {
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('session_id:'))
    .join('\n')
    .trim()
}
