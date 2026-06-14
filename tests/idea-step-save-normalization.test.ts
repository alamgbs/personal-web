import test from 'node:test'
import assert from 'node:assert/strict'

import { getMissingStructuredFields, normalizeIdeaStepPayloadForSave } from '../src/lib/mission-control/ideas.ts'

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
