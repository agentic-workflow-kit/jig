import assert from 'node:assert';
import { test } from 'vitest';
import { LocalHarness } from '../src/harness.js';
import { validatePlanForScheduling } from '../src/intake.js';
import { SubstrateAuthorizationError } from '../src/substrate.js';
import type { PlanInstance, PolicyDoc, ResumePlan, RunEvent } from '../src/types.js';

const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };

function planWith(...stories: PlanInstance['plan']['stories']): PlanInstance {
  return { plan: { id: 'p1', version: 'execution-plan-shape-v0', stories } };
}

function baseResumePlan(overrides: Partial<ResumePlan>): ResumePlan {
  return {
    runId: 'run-1',
    checkpoint: 'after:s0',
    stopCause: 'work-item-blocked',
    completedStoryIds: [],
    blockedStoryIds: [],
    parkedStoryId: null,
    unstartedStoryIds: [],
    ...overrides,
  };
}

test('resume: parked owner-override decision is a durable owner-approval basis, not owner-override on resume path', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async (story: { id: string }) => ({
        storyId: story.id,
        outcome: 'success',
        evidence: { result: 'passed' },
      }),
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  );
  const resumePlan = baseResumePlan({
    stopCause: 'unattended-park',
    parkedStoryId: 's1',
    unstartedStoryIds: ['s1'],
    parkedRequest: { requestId: 'REQ-1', requestKind: 'edit-files' },
    parkedDecision: { outcome: 'override', requestId: 'REQ-1', requestKind: 'edit-files' },
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'parked' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.granted' &&
        Array.isArray(event.basis) &&
        event.basis.includes('owner-override'),
    ),
  );
  assert.ok(events.find((event) => event.family === 'story.done' && event.storyId === 's1'));
});

test('resume: parked story with no durable decision and no owner-decision source fails closed as unattended-park', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('undecided parked work must not execute without an owner-decision source');
      },
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    null,
  );
  const resumePlan = baseResumePlan({
    stopCause: 'unattended-park',
    parkedStoryId: 's1',
    unstartedStoryIds: ['s1'],
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'parked' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'run.stopped' && event.reason === 'unattended-park' && event.checkpoint === 'after:s1.parked',
    ),
  );
});

test('resume: interactive owner-decision source approves a parked story with no durable decision recorded', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async (story: { id: string }) => ({
        storyId: story.id,
        outcome: 'success',
        evidence: { result: 'passed' },
      }),
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    { decide: async () => 'approve' },
  );
  const resumePlan = baseResumePlan({
    stopCause: 'unattended-park',
    parkedStoryId: 's1',
    unstartedStoryIds: ['s1'],
    parkedRequest: { requestId: 'REQ-1', requestKind: 'edit-files' },
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'parked' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.granted' &&
        Array.isArray(event.basis) &&
        event.basis.includes('owner-approval') &&
        event.requestId === 'REQ-1',
    ),
  );
});

test('resume: interactive owner-decision source rejects a parked story with no durable decision recorded', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('rejected parked work must not execute');
      },
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    { decide: async () => 'reject' },
  );
  const resumePlan = baseResumePlan({
    stopCause: 'unattended-park',
    parkedStoryId: 's1',
    unstartedStoryIds: ['s1'],
    parkedRequest: { requestId: 'REQ-1', requestKind: 'edit-files' },
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'parked' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.denied' &&
        Array.isArray(event.basis) &&
        event.basis.includes('owner-rejection') &&
        event.requestId === 'REQ-1',
    ),
  );
  assert.ok(events.find((event) => event.family === 'story.blocked' && event.reason === 'owner-rejection'));
});

test('resume: interactive owner-decision source hands off a parked story with no durable decision recorded', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('handed-off parked work must not execute');
      },
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    { decide: async () => ({ outcome: 'hand-off', handedOffTo: 'platform-owner' }) },
  );
  const resumePlan = baseResumePlan({
    stopCause: 'unattended-park',
    parkedStoryId: 's1',
    unstartedStoryIds: ['s1'],
    parkedRequest: { requestId: 'REQ-1', requestKind: 'edit-files' },
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'parked' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.routed' &&
        Array.isArray(event.basis) &&
        event.basis.includes('owner-hand-off') &&
        event.handedOffTo === 'platform-owner',
    ),
  );
  assert.ok(events.find((event) => event.family === 'run.stopped' && event.checkpoint === 'after:s1.parked'));
});

test('resume: pending landing with no verifyLanding port fails closed as landing-verification-unavailable', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    { execute: async () => ({ outcome: 'success', evidence: { result: 'passed' } }) },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  );
  const resumePlan = baseResumePlan({
    stopCause: 'work-item-blocked',
    completedStoryIds: [],
    pendingLandings: [
      {
        storyId: 's1',
        action: 'push',
        landingKind: 'push',
        targetRef: 'refs/heads/main',
        targetHead: 'abc123',
        mergeability: 'held-by-review',
      },
    ],
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'held' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' &&
        event.storyId === 's1' &&
        event.reason === 'landing-verification-unavailable',
    ),
  );
});

test('resume: pending landing whose verified head mismatches the Forge head fails closed as landing-head-mismatch', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    { execute: async () => ({ outcome: 'success', evidence: { result: 'passed' } }) },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    null,
    {
      forge: {
        land: () => ({ family: 'runner-action.skipped-on-dry-run' }),
        verifyLanding: async () => ({
          status: 'mismatched',
          targetRef: 'refs/heads/main',
          expectedHead: 'expected-sha',
          actualHead: 'actual-sha',
        }),
      },
    },
  );
  const resumePlan = baseResumePlan({
    pendingLandings: [
      {
        storyId: 's1',
        action: 'push',
        landingKind: 'push',
        targetRef: 'refs/heads/main',
        targetHead: 'expected-sha',
        mergeability: 'held-by-review',
      },
    ],
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'held' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  const blocked = events.find((event) => event.family === 'story.blocked' && event.storyId === 's1');
  assert.strictEqual(blocked?.reason, 'landing-head-mismatch');
  assert.strictEqual((blocked?.diagnostics as { actualHead?: string } | undefined)?.actualHead, 'actual-sha');
});

test('resume: pending landing retry succeeds when the Forge confirms a matched head', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    { execute: async () => ({ outcome: 'success', evidence: { result: 'passed' } }) },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    null,
    {
      forge: {
        land: () => ({ family: 'runner-action.pushed', storyId: 's1' }),
        verifyLanding: async () => ({ status: 'matched', targetRef: 'refs/heads/main', targetHead: 'sha-1' }),
      },
    },
  );
  const resumePlan = baseResumePlan({
    pendingLandings: [
      {
        storyId: 's1',
        action: 'push',
        landingKind: 'push',
        targetRef: 'refs/heads/main',
        targetHead: 'sha-1',
        mergeability: 'held-by-review',
      },
    ],
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'held' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'success');
  assert.ok(events.find((event) => event.family === 'runner-action.pushed' && event.storyId === 's1'));
  assert.ok(!events.find((event) => event.family === 'story.blocked'));
});

test('resume: pending landing retry that throws during land() fails closed as landing-retry-failed', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    { execute: async () => ({ outcome: 'success', evidence: { result: 'passed' } }) },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    null,
    {
      forge: {
        land: () => {
          throw new Error('forge unavailable');
        },
        verifyLanding: async () => ({ status: 'matched', targetRef: 'refs/heads/main', targetHead: 'sha-1' }),
      },
    },
  );
  const resumePlan = baseResumePlan({
    pendingLandings: [
      {
        storyId: 's1',
        action: 'push',
        landingKind: 'push',
        targetRef: 'refs/heads/main',
        targetHead: 'sha-1',
        mergeability: 'held-by-review',
      },
    ],
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'held' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  const blocked = events.find((event) => event.family === 'story.blocked' && event.storyId === 's1');
  assert.strictEqual(blocked?.reason, 'landing-retry-failed');
  assert.strictEqual((blocked?.diagnostics as { error?: string } | undefined)?.error, 'forge unavailable');
});

test('resume: repeated-landing noop with no verifyLanding port fails closed as landing-verification-unavailable', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    { execute: async () => assert.fail('completed story must not re-execute') },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  );
  const resumePlan = baseResumePlan({
    completedStoryIds: ['s1'],
    priorLandings: [
      { storyId: 's1', action: 'push', landingKind: 'push', targetRef: 'refs/heads/main', targetHead: 'sha-1' },
    ],
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'completed' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' &&
        event.storyId === 's1' &&
        event.reason === 'landing-verification-unavailable',
    ),
  );
});

test('resume: repeated-landing noop records a skipped-repeated-effect event when the head still matches', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    { execute: async () => assert.fail('completed story must not re-execute') },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    null,
    {
      forge: {
        land: () => ({ family: 'runner-action.pushed' }),
        verifyLanding: async () => ({ status: 'matched', targetRef: 'refs/heads/main', targetHead: 'sha-1' }),
      },
    },
  );
  const resumePlan = baseResumePlan({
    completedStoryIds: ['s1'],
    priorLandings: [
      { storyId: 's1', action: 'push', landingKind: 'push', targetRef: 'refs/heads/main', targetHead: 'sha-1' },
    ],
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'completed' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'runner-action.skipped-repeated-effect' &&
        event.storyId === 's1' &&
        event.reason === 'already-landed',
    ),
  );
});

test('resume: repeated-landing noop surfaces a mismatch and blocks resumption', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    { execute: async () => assert.fail('completed story must not re-execute') },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    null,
    {
      forge: {
        land: () => ({ family: 'runner-action.pushed' }),
        verifyLanding: async () => ({
          status: 'mismatched',
          targetRef: 'refs/heads/main',
          expectedHead: 'sha-1',
          actualHead: 'sha-2',
        }),
      },
    },
  );
  const resumePlan = baseResumePlan({
    completedStoryIds: ['s1'],
    priorLandings: [
      { storyId: 's1', action: 'push', landingKind: 'push', targetRef: 'refs/heads/main', targetHead: 'sha-1' },
    ],
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'completed' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  assert.ok(events.find((event) => event.family === 'story.blocked' && event.reason === 'landing-head-mismatch'));
});

test('resume: a story already closed with a non-success run status is skipped without re-verification', async () => {
  const events: RunEvent[] = [];
  const verifyCalls: string[] = [];
  const harness = new LocalHarness(
    {
      execute: async (story: { id: string }) => {
        if (story.id === 'first') {
          return { storyId: story.id, outcome: 'failure', evidence: { result: 'failed' } };
        }
        return { storyId: story.id, outcome: 'success', evidence: { result: 'passed' } };
      },
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    null,
    {
      forge: {
        land: () => ({ family: 'runner-action.pushed' }),
        verifyLanding: async (request) => {
          verifyCalls.push(request.storyId);
          return { status: 'matched', targetRef: request.targetRef, targetHead: request.targetHead };
        },
      },
    },
  );
  const resumePlan = baseResumePlan({
    completedStoryIds: ['already-done'],
    priorLandings: [
      {
        storyId: 'already-done',
        action: 'push',
        landingKind: 'push',
        targetRef: 'refs/heads/main',
        targetHead: 'sha-1',
      },
    ],
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 'first', title: 'first' }, { id: 'already-done', title: 'already done' })),
    { policy: { rules: { allowLocalDryRun: true, blockResolution: 'continue-independent-work' } } },
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  assert.strictEqual(
    verifyCalls.length,
    0,
    'a run already failed before the checkpoint must not re-verify prior landings',
  );
});

test('resume: a still-blocked dependency stays blocked without re-emitting story.blocked once already closed', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    { execute: async () => assert.fail('blocked-by-dependency story must not execute') },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  );
  const resumePlan = baseResumePlan({
    blockedStoryIds: ['upstream', 'downstream'],
  });

  const status = await harness.resume(
    validatePlanForScheduling(
      planWith(
        { id: 'upstream', title: 'upstream' },
        { id: 'downstream', title: 'downstream', dependsOn: ['upstream'] },
      ),
    ),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'success');
  assert.ok(!events.find((event) => event.family === 'story.blocked'));
});

test('resume: worker throwing SubstrateAuthorizationError fails closed as substrate-escalation', async () => {
  const events: RunEvent[] = [];
  const substrateError = new SubstrateAuthorizationError({ kind: 'egress', value: 'https://example.com' });
  const harness = new LocalHarness(
    {
      execute: async () => {
        throw substrateError;
      },
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  );

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'first' })),
    policy,
    baseResumePlan({}),
  );

  assert.strictEqual(status, 'failure');
  const blocked = events.find((event) => event.family === 'story.blocked' && event.storyId === 's1');
  assert.strictEqual(blocked?.reason, 'substrate-escalation');
  assert.strictEqual((blocked?.diagnostics as { error?: string } | undefined)?.error, substrateError.message);
});

test('resume: an out-of-band stop request consumed mid-run marks remaining stories unstarted', async () => {
  const events: RunEvent[] = [];
  let firstStoryDone = false;
  const harness = new LocalHarness(
    {
      execute: async (story: { id: string }) => {
        if (story.id === 's1') {
          firstStoryDone = true;
        }
        return { storyId: story.id, outcome: 'success', evidence: { result: 'passed' } };
      },
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      readEvents: () => [
        ...events,
        ...(firstStoryDone
          ? [
              {
                family: 'operator-action.requested',
                actor: 'owner',
                action: 'stop',
                reason: 'owner-requested-pause',
              } as RunEvent,
            ]
          : []),
      ],
      finalize: async () => {},
    },
  );

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'first' }, { id: 's2', title: 'second' })),
    policy,
    baseResumePlan({}),
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'run.stopped' && event.reason === 'owner-requested-pause' && event.unstarted?.includes('s2'),
    ),
  );
});

test('resume: a durable parked rejection without its own requestId/requestKind falls back to the parked request', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('rejected parked work must not execute');
      },
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  );
  const resumePlan = baseResumePlan({
    stopCause: 'unattended-park',
    parkedStoryId: 's1',
    unstartedStoryIds: ['s1'],
    parkedRequest: { requestId: 'REQ-fallback', requestKind: 'edit-files' },
    // Deliberately omit requestId/requestKind on the durable decision itself so the harness must
    // fall back to the accompanying parkedRequest for both fields.
    parkedDecision: { outcome: 'reject' },
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'parked' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.denied' &&
        event.requestId === 'REQ-fallback' &&
        event.requestKind === 'edit-files',
    ),
  );
});

test('resume: a durable parked override without its own requestId/requestKind falls back to the parked request', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async (story: { id: string }) => ({
        storyId: story.id,
        outcome: 'success',
        evidence: { result: 'passed' },
      }),
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  );
  const resumePlan = baseResumePlan({
    stopCause: 'unattended-park',
    parkedStoryId: 's1',
    unstartedStoryIds: ['s1'],
    parkedRequest: { requestId: 'REQ-fallback-2', requestKind: 'edit-files' },
    parkedDecision: { outcome: 'override' },
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'parked' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.granted' &&
        event.requestId === 'REQ-fallback-2' &&
        event.requestKind === 'edit-files' &&
        Array.isArray(event.basis) &&
        event.basis.includes('owner-override'),
    ),
  );
});

test('resume: an interactive owner-decision source overriding a parked story grants with an owner-override basis', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async (story: { id: string }) => ({
        storyId: story.id,
        outcome: 'success',
        evidence: { result: 'passed' },
      }),
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    { decide: async () => 'override' },
  );
  const resumePlan = baseResumePlan({
    stopCause: 'unattended-park',
    parkedStoryId: 's1',
    unstartedStoryIds: ['s1'],
    parkedRequest: { requestId: 'REQ-1', requestKind: 'edit-files' },
  });

  const status = await harness.resume(
    validatePlanForScheduling(planWith({ id: 's1', title: 'parked' })),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.granted' &&
        Array.isArray(event.basis) &&
        event.basis.includes('owner-override'),
    ),
  );
});

test('resume: a story blocked transitively by the still-parked story records story.blocked freshly when not already closed', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    { execute: async () => assert.fail('a transitively-blocked story must not execute') },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  );
  const resumePlan = baseResumePlan({
    stopCause: 'unattended-park',
    parkedStoryId: 'upstream',
    unstartedStoryIds: ['upstream', 'downstream'],
    parkedRequest: { requestId: 'REQ-1', requestKind: 'edit-files' },
  });

  const status = await harness.resume(
    validatePlanForScheduling(
      planWith(
        { id: 'upstream', title: 'still parked' },
        { id: 'downstream', title: 'downstream', dependsOn: ['upstream'] },
      ),
    ),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) => event.family === 'story.blocked' && event.storyId === 'downstream' && event.blockedBy === 'upstream',
    ),
  );
});

const guard2Policy: PolicyDoc = {
  policy: { id: 'policy-guard2', rules: { allowLocalDryRun: true, ruleGoverningSurfaces: ['policies/**'] } },
};

test('guard-2 reapproval: changed files touching a rule-governing surface with no owner-decision source park the story', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'success',
        changedFiles: ['policies/local.json'],
        evidence: { result: 'passed' },
      }),
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  );
  const plan = planWith({ id: 's1', title: 'touches policy' });

  const status = await harness.run(validatePlanForScheduling(plan), {}, guard2Policy);

  assert.strictEqual(status, 'failure');
  assert.ok(events.find((event) => event.family === 'story.parked' && event.reason === 'guard-2-reapproval-required'));
  assert.ok(
    events.find(
      (event) =>
        event.family === 'run.stopped' && event.reason === 'unattended-park' && event.checkpoint === 'after:s1.parked',
    ),
  );
});

test('guard-2 reapproval: an owner-decision source rejecting the reapproval blocks the story with guard-2-reapproval-rejected', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'success',
        changedFiles: ['policies/local.json'],
        evidence: { result: 'passed' },
      }),
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    { decide: async () => 'reject' },
  );
  const plan = planWith({ id: 's1', title: 'touches policy' });

  const status = await harness.run(validatePlanForScheduling(plan), {}, guard2Policy);

  assert.strictEqual(status, 'failure');
  assert.ok(events.find((event) => event.family === 'story.blocked' && event.reason === 'guard-2-reapproval-rejected'));
});

test('guard-2 reapproval: an owner-decision source handing off the reapproval parks the story', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'success',
        changedFiles: ['policies/local.json'],
        evidence: { result: 'passed' },
      }),
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    { decide: async () => ({ outcome: 'hand-off', handedOffTo: 'platform-owner' }) },
  );
  const plan = planWith({ id: 's1', title: 'touches policy' });

  const status = await harness.run(validatePlanForScheduling(plan), {}, guard2Policy);

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'run.stopped' && event.reason === 'unattended-park' && event.checkpoint === 'after:s1.parked',
    ),
  );
});

test('guard-2 reapproval: an owner-decision source approving the reapproval lets the story complete', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'success',
        changedFiles: ['policies/local.json'],
        evidence: { result: 'passed' },
      }),
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    { decide: async () => 'approve' },
  );
  const plan = planWith({ id: 's1', title: 'touches policy' });

  const status = await harness.run(validatePlanForScheduling(plan), {}, guard2Policy);

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.granted' &&
        event.requestId === 'REQ-guard2-s1' &&
        Array.isArray(event.basis) &&
        event.basis.includes('owner-approval'),
    ),
  );
  assert.ok(events.find((event) => event.family === 'story.done' && event.storyId === 's1'));
});

test('resume: a story blocked because its dependency is the still-parked story (not the blockedStoryIds set) is recognized', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    { execute: async () => assert.fail('a story depending on the still-parked story must not execute') },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
    null,
  );
  // parkedStoryId stays parked (no durable decision, no owner-decision source), so "downstream"
  // depending on it must resolve via the `depId === resumePlan.parkedStoryId` arm of the
  // blockedBy lookup rather than the blockedStoryIds-membership arm.
  const resumePlan = baseResumePlan({
    stopCause: 'unattended-park',
    parkedStoryId: 'upstream',
    unstartedStoryIds: ['upstream', 'downstream'],
  });

  const status = await harness.resume(
    validatePlanForScheduling(
      planWith(
        { id: 'upstream', title: 'still parked' },
        { id: 'downstream', title: 'downstream', dependsOn: ['upstream'] },
      ),
    ),
    policy,
    resumePlan,
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) => event.family === 'story.blocked' && event.storyId === 'downstream' && event.blockedBy === 'upstream',
    ),
  );
});
