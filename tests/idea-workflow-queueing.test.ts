import test from 'node:test'
import assert from 'node:assert/strict'

import { TOTAL_IDEA_STEPS } from '../src/lib/mission-control/idea-steps'
import {
  canQueueIdeaStep,
  getNextPendingIdeaStep,
  isIdeaStepApproved,
} from '../src/lib/mission-control/workflow'

test('getNextPendingIdeaStep resolves step 0 for a fresh idea and null when all steps are approved', () => {
  assert.equal(getNextPendingIdeaStep({}), 0)

  const allApproved = Object.fromEntries(
    Array.from({ length: TOTAL_IDEA_STEPS }, (_, step) => [step.toString(), `approved-${step}`])
  )

  assert.equal(getNextPendingIdeaStep(allApproved), null)
})

test('getNextPendingIdeaStep returns the first missing approval in sequence', () => {
  const approvals = {
    '0': 'approved-0',
    '1': 'approved-1',
    '3': 'approved-3',
  }

  assert.equal(getNextPendingIdeaStep(approvals), 2)
})

test('canQueueIdeaStep only allows step 0 or a step whose previous step is approved', () => {
  const approvals = {
    '0': 'approved-0',
    '1': 'approved-1',
  }

  assert.equal(canQueueIdeaStep({}, 0), true)
  assert.equal(canQueueIdeaStep({}, 1), false)
  assert.equal(canQueueIdeaStep(approvals, 2), true)
  assert.equal(canQueueIdeaStep(approvals, 3), false)
})

test('isIdeaStepApproved reads approval presence by step index', () => {
  const approvals = {
    '2': 'approved-2',
  }

  assert.equal(isIdeaStepApproved(approvals, 2), true)
  assert.equal(isIdeaStepApproved(approvals, 1), false)
})
