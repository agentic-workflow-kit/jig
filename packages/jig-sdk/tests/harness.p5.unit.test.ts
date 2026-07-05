import assert from 'node:assert';
import { test } from 'vitest';
import { LocalHarness } from '../src/harness.js';
import { validatePlanForScheduling } from '../src/intake.js';
import type { CapabilityAttestation, ForgePort, LandingRequest } from '../src/ports.js';
import type { PlanInstance, PolicyDoc, RecordSink, ResumePlan, RunEvent } from '../src/types.js';

const plan: PlanInstance = {
  plan: {
    id: 'plan-p5-harness',
    version: 'execution-plan-shape-v0',
    stories: [
      {
        id: 'STORY-1',
        title: 'P5 story',
        scope: ['src/**'],
        authority: { requests: ['edit-files'] },
      },
    ],
  },
};

const policy: PolicyDoc = {
  policy: {
    id: 'policy-p5',
    rules: {
      allowLocalDryRun: true,
      capabilityIsolation: {
        'filesystem-edit': 'strong',
      },
    },
  },
};

const freshStrongProof: CapabilityAttestation = {
  driverId: 'reference-host',
  capability: 'filesystem-edit',
  runContext: 'local-dry-run',
  freshness: 'fresh',
  positive: true,
  reportedIsolationStrength: 'strong',
  provenIsolationStrength: 'strong',
  provenBy: 'exercised-confinement-proof',
};

function recordCollector(): { sink: RecordSink; events: RunEvent[] } {
  const events: RunEvent[] = [];
  return {
    events,
    sink: {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  };
}

test('P5-AC-2: runner threads capability attestation into the Fence', async () => {
  const { sink, events } = recordCollector();
  const worker = {
    execute: async () => ({
      outcome: 'success',
      requests: [
        {
          id: 'REQ-edit',
          kind: 'edit-files',
          paths: ['src/harness.ts'],
          capability: 'filesystem-edit',
        },
      ],
      evidence: { result: 'passed' },
    }),
  };

  const harness = new LocalHarness(worker, sink, null, {
    capabilityAttestation: {
      ...freshStrongProof,
      reportedIsolationStrength: 'strong',
      provenIsolationStrength: 'weak',
    },
  });

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.routed' &&
        event.requestId === 'REQ-edit' &&
        Array.isArray(event.basis) &&
        event.basis.includes('isolation-strength-overstated'),
    ),
  );
});

test('P5-AC-4: runner invokes ForgePort for landing and preserves the dry-run skip record', async () => {
  const { sink, events } = recordCollector();
  const landingRequests: LandingRequest[] = [];
  const forge: ForgePort = {
    land: (request) => {
      landingRequests.push(request);
      return {
        family: 'runner-action.skipped-on-dry-run',
        storyId: request.storyId,
        action: request.action,
        reason: request.reason ?? 'dry-run',
      };
    },
  };
  const worker = {
    execute: async () => ({
      outcome: 'success',
      evidence: { result: 'passed' },
    }),
  };

  const harness = new LocalHarness(worker, sink, null, {
    capabilityAttestation: freshStrongProof,
    forge,
  });

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(landingRequests, [
    {
      storyId: 'STORY-1',
      action: 'push',
      reason: 'dry-run',
    },
  ]);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'runner-action.skipped-on-dry-run' &&
        event.storyId === 'STORY-1' &&
        event.action === 'push|open-pr|merge' &&
        event.reason === 'dry-run',
    ),
  );
});

test('P5-AC-4: runner maps ForgePort output instead of recording provider lifecycle events', async () => {
  const { sink, events } = recordCollector();
  const forge: ForgePort = {
    land: () => ({
      family: 'story.done',
      storyId: 'PROVIDER-SMUGGLED',
      changedFiles: ['provider-owned.ts'],
    }),
  };
  const worker = {
    execute: async () => ({
      outcome: 'success',
      evidence: { result: 'passed' },
    }),
  };
  const harness = new LocalHarness(worker, sink, null, {
    capabilityAttestation: freshStrongProof,
    forge,
  });

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

  assert.strictEqual(status, 'success');
  assert.strictEqual(events.filter((event) => event.family === 'story.done').length, 1);
  assert.ok(!events.find((event) => event.storyId === 'PROVIDER-SMUGGLED'));
  assert.ok(events.find((event) => event.family === 'runner-action.skipped-on-dry-run' && event.storyId === 'STORY-1'));
});

test('P5-AC-4: resume does not re-invoke landing for an already completed story', async () => {
  const { sink } = recordCollector();
  const landingRequests: LandingRequest[] = [];
  const forge: ForgePort = {
    land: (request) => {
      landingRequests.push(request);
      return {
        family: 'runner-action.skipped-on-dry-run',
        storyId: request.storyId,
        action: request.action,
        reason: request.reason ?? 'dry-run',
      };
    },
  };
  const worker = {
    execute: async () => {
      assert.fail('completed story should not be re-executed during resume');
    },
  };
  const resumePlan: ResumePlan = {
    runId: 'run-existing',
    checkpoint: 'after:STORY-1',
    stopCause: 'work-item-blocked',
    completedStoryIds: ['STORY-1'],
    blockedStoryIds: [],
    parkedStoryId: null,
    unstartedStoryIds: [],
  };
  const harness = new LocalHarness(worker, sink, null, {
    capabilityAttestation: freshStrongProof,
    forge,
  });

  const status = await harness.resume(validatePlanForScheduling(plan), policy, resumePlan);

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(landingRequests, []);
});
