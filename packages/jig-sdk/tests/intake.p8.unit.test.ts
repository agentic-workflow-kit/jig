import assert from 'node:assert';
import { test } from 'vitest';
import {
  intakeCandidates,
  unwrapValidatedCandidate,
  validateCandidate,
  validatePlanForScheduling,
  WORK_SOURCE_INTAKE_BYPASS_REASON,
} from '../src/intake.js';
import type { CandidateWorkItem, WorkSourcePort } from '../src/ports.js';
import type { PlanInstance } from '../src/types.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-p8-intake',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Intake story' }],
  },
};

function candidate(provenance: unknown): CandidateWorkItem {
  return {
    planInstance,
    provenance: provenance as CandidateWorkItem['provenance'],
  };
}

test('P8-AC-3: intakeCandidates rejects candidates with collapsed or missing provenance before minting a validated wrapper', async () => {
  const workSource: WorkSourcePort = {
    candidates: () => [
      candidate('jig-validated'),
      candidate({
        jigValidated: true,
      }),
      candidate({
        origin: {
          sourceSystem: 'github-issues',
          candidateId: '',
        },
        jigValidated: true,
      }),
      candidate([]),
    ],
  };

  const intake = await intakeCandidates(workSource);

  assert.deepStrictEqual(intake.admitted, []);
  assert.strictEqual(intake.rejected.length, 4);
  assert.ok(
    intake.rejected.every(
      (rejection) =>
        rejection.event.family === 'authorization.denied' &&
        rejection.event.reason === WORK_SOURCE_INTAKE_BYPASS_REASON &&
        /Invalid candidate provenance/.test(rejection.error),
    ),
  );
});

test('P8-AC-3: validateCandidate refuses a bare jig-validated literal at the intake chokepoint', () => {
  assert.throws(() => validateCandidate(candidate('jig-validated')), /Invalid candidate provenance/);
});

test('P8-AC-1/P8-AC-2: post-mint mutation cannot change the validated payload scheduled by the wrapper', () => {
  const original: PlanInstance = {
    plan: {
      id: 'plan-p8-immutable',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'STORY-1', title: 'Immutable story' }],
    },
  };
  const validated = validatePlanForScheduling(original);
  const expected = structuredClone(unwrapValidatedCandidate(validated));

  original.plan.version = 'mutated-after-validation';
  original.plan.stories = [];
  try {
    unwrapValidatedCandidate(validated).plan.stories = [];
  } catch (err) {
    assert.ok(err instanceof TypeError);
  }

  assert.deepStrictEqual(unwrapValidatedCandidate(validated), expected);
});
