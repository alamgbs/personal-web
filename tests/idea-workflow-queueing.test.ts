import test from 'node:test'
import assert from 'node:assert/strict'

import { CUSTOMER_ARCHETYPE_FIELDS, PROBLEM_DEFINITION_FIELDS, TOTAL_IDEA_STEPS } from '../src/lib/mission-control/idea-steps'
import {
  canQueueAutomatedIdeaStep,
  canQueueIdeaStep,
  getNextIncompleteIdeaStep,
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

test('automated idea progression advances to the first incomplete step without requiring intermediate approvals', () => {
  const completedProblemStep = Object.fromEntries(
    PROBLEM_DEFINITION_FIELDS.map((field) => [field.key, `Completo: ${field.label}`])
  )
  const completedArchetypeStep = Object.fromEntries(
    CUSTOMER_ARCHETYPE_FIELDS.map((field) => [field.key, `Completo: ${field.label}`])
  )
  const stepData = {
    '0': completedProblemStep,
    '1': completedArchetypeStep,
  }

  assert.equal(getNextIncompleteIdeaStep(stepData), 2)
  assert.equal(canQueueAutomatedIdeaStep(stepData, 2), true)
  assert.equal(canQueueIdeaStep({}, 2), false)
})

test('automated idea progression blocks only when the previous step has no completed draft', () => {
  const completedProblemStep = Object.fromEntries(
    PROBLEM_DEFINITION_FIELDS.map((field) => [field.key, `Completo: ${field.label}`])
  )
  const stepData = {
    '0': completedProblemStep,
  }

  assert.equal(canQueueAutomatedIdeaStep(stepData, 0), true)
  assert.equal(canQueueAutomatedIdeaStep(stepData, 1), true)
  assert.equal(canQueueAutomatedIdeaStep(stepData, 2), false)
})
