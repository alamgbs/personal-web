import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getIdeaStepAssignment,
  getMissingStructuredFields,
  normalizeIdeaStepData,
  normalizeIdeaStepPayloadForSave,
} from '../src/lib/mission-control/ideas'

test('normalizeIdeaStepPayloadForSave preserves pending_feedback metadata for customer archetype reruns', () => {
  const result = normalizeIdeaStepPayloadForSave(
    1,
    {
      content: 'Arquetipo inicial.',
      persona_name: 'Compliance teams',
      pending_feedback: 'Versión vieja',
      generated_by: 'cx-analyst',
    },
    {
      persona_name: 'Líder de compliance tributario en fintech paraguaya',
      frustrations: 'Necesita validar RUC en onboarding y pagos sin fricción operativa.',
      pending_feedback: 'Rehacer con enfoque full Customer Archetype y no solo scraping.',
    }
  )

  assert.equal(
    result.pending_feedback,
    'Rehacer con enfoque full Customer Archetype y no solo scraping.'
  )
  assert.equal(result.generated_by, 'cx-analyst')
  assert.equal(result.persona_name, 'Líder de compliance tributario en fintech paraguaya')
  assert.equal(result.frustrations, 'Necesita validar RUC en onboarding y pagos sin fricción operativa.')
})

test('getMissingStructuredFields detects incomplete structured step payloads', () => {
  const missing = getMissingStructuredFields(1, {
    content: 'Resumen ejecutivo.',
    persona_name: 'Analista de crédito corporate',
    job_role: 'Analista comercial',
    motivations: 'Reducir riesgo y mejorar ROI de campañas.',
  })

  assert.ok(missing.includes('age_range'))
  assert.ok(missing.includes('early_user_thesis'))
  assert.ok(!missing.includes('persona_name'))
})

test('getIdeaStepAssignment resolves runtime profile and skill defaults for each wizard owner', () => {
  assert.deepEqual(getIdeaStepAssignment(0), {
    slug: 'cx-analyst',
    name: 'CX Analyst',
    team: 'Marketing',
    profile: 'mc-cx-analyst',
    skillName: 'mission-control-workflows',
    skillNames: ['mission-control-workflows'],
  })

  assert.deepEqual(getIdeaStepAssignment(9), {
    slug: 'hermes',
    name: 'Hermes',
    team: 'Command',
    profile: 'mc-hermes',
    skillName: 'mission-control-workflows',
    skillNames: ['mission-control-workflows', 'hermes-agent'],
  })
})

test('normalizeIdeaStepData backfills assigned profile and skill metadata from assignment defaults', () => {
  const result = normalizeIdeaStepData(0, {
    content: 'Arquetipo resumido.',
    persona_name: 'Head de compliance fintech',
    job_role: 'Líder de compliance',
    age_range: '35-45',
    context: 'Opera onboarding y monitoreo KYC.',
    motivations: 'Reducir fraude y fricción.',
    frustrations: 'Validaciones manuales y lentas.',
    channel_habit: 'Slack, WhatsApp y dashboards internos.',
    buy_trigger: 'Pico de rechazos en onboarding.',
    trust_signal: 'Casos locales y precisión verificable.',
    early_user_thesis: 'Compraría un piloto si acelera aprobaciones.',
  })

  assert.equal(result.assigned_agent_slug, 'cx-analyst')
  assert.equal(result.assigned_profile_name, 'mc-cx-analyst')
  assert.equal(result.assigned_skill_name, 'mission-control-workflows')
  assert.deepEqual(result.assigned_skill_names, ['mission-control-workflows'])
})

test('normalizeIdeaStepData upgrades legacy singular skill metadata into assigned_skill_names', () => {
  const result = normalizeIdeaStepData(9, {
    content: 'Go condicionado al foco del MVP.',
    verdict: 'Go condicionado',
    decision_rationale: 'Mercado con dolor real y ventana regulatoria favorable.',
    critical_hypotheses: 'Los equipos de compliance pagarán por velocidad y precisión.',
    validation_experiments: 'Piloto con dos fintechs y benchmark contra proceso manual.',
    success_metrics: 'Reducir tiempo de validación y aumentar aprobación inicial.',
    major_risks: 'Distribución lenta y riesgo regulatorio.',
    timeline: '90 días para validar hipótesis y conversión.',
    kill_criteria: 'CAC inviable o baja adopción del piloto.',
    assigned_skill_name: 'hermes-agent',
  })

  assert.equal(result.assigned_profile_name, 'mc-hermes')
  assert.deepEqual(result.assigned_skill_names, ['hermes-agent'])
})
