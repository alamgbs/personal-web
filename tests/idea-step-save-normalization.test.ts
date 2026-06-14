import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeIdeaStepPayloadForSave } from '../src/lib/mission-control/ideas.ts'

test('normalizeIdeaStepPayloadForSave preserves pending_feedback metadata for customer archetype reruns', () => {
  const result = normalizeIdeaStepPayloadForSave(
    0,
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
