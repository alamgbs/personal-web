import test from 'node:test'
import assert from 'node:assert/strict'

import { canQueueIdeaStep, getNextPendingIdeaStep } from '../src/lib/mission-control/workflow'

test('fresh idea state queues step 0 and exposes it as next pending step', () => {
  const approvals = {}

  assert.equal(getNextPendingIdeaStep(approvals), 0)
  assert.equal(canQueueIdeaStep(approvals, 0), true)
  assert.equal(canQueueIdeaStep(approvals, 1), false)
})

test('approving step N makes N+1 queueable while keeping later steps blocked', () => {
  const approvals = {
    '0': '2026-06-18T00:00:00.000Z',
    '1': '2026-06-18T00:05:00.000Z',
  }

  assert.equal(getNextPendingIdeaStep(approvals), 2)
  assert.equal(canQueueIdeaStep(approvals, 2), true)
  assert.equal(canQueueIdeaStep(approvals, 3), false)
})

test('rerun payload preservation keeps pending_feedback alongside edited step data', async () => {
  const { normalizeIdeaStepPayloadForSave } = await import('../src/lib/mission-control/ideas')

  const result = normalizeIdeaStepPayloadForSave(
    1,
    {
      content: 'Versión anterior.',
      pending_feedback: 'Mantener foco en dolores del buyer.',
      generated_by: 'cx-analyst',
    },
    {
      content: 'Nueva versión.',
      frustrations: 'Proceso manual con validaciones lentas.',
    }
  )

  assert.equal(result.pending_feedback, 'Mantener foco en dolores del buyer.')
  assert.equal(result.generated_by, 'cx-analyst')
  assert.equal(result.content, 'Nueva versión.')
  assert.equal(result.frustrations, 'Proceso manual con validaciones lentas.')
})
