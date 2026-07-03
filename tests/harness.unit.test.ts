import assert from 'node:assert';
import { test } from 'vitest';
import { LocalHarness } from '../src/harness.js';
import type { PlanInstance, PolicyDoc, ResumePlan, RunEvent } from '../src/types.js';

test('LocalHarness sequential execution success', async () => {
  const worker = {
    execute: async () => ({
      outcome: 'success',
      evidence: { result: 'passed' },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'success');
});

test('LocalHarness sequential execution failure', async () => {
  const worker = {
    execute: async () => ({
      outcome: 'failure',
      evidence: { result: 'failed' },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');
});

test('LocalHarness sequential execution catch worker error', async () => {
  const worker = {
    execute: async () => {
      throw new Error('Worker exploded');
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');
});

test('LocalHarness enforces allowLocalDryRun policy', async () => {
  const worker = {
    execute: async () => {
      assert.fail('Worker should not be called');
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { id: 'pol1', rules: { allowLocalDryRun: false } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');
});

test('LocalHarness handles multi-item success', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({
      outcome: 'success',
      evidence: { result: 'passed' },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 's1', title: 't1', dependsOn: [] },
        { id: 's2', title: 't2', dependsOn: ['s1'] },
      ],
    },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'success');

  const doneEvents = events.filter((e) => e.family === 'story.done');
  assert.strictEqual(doneEvents.length, 2);
  assert.strictEqual(doneEvents[0].storyId, 's1');
  assert.strictEqual(doneEvents[1].storyId, 's2');
});

test('PR-AC-4: LocalHarness blocks failed and dependent stories and records unstarted items', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async (story: { id: string }) => {
      if (story.id === 's1') return { outcome: 'failure', evidence: { result: 'failed' } };
      return { outcome: 'success' };
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 's1', title: 't1', dependsOn: [] },
        { id: 's2', title: 't2', dependsOn: ['s1'] },
        { id: 's3', title: 't3', dependsOn: [] },
      ],
    },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');

  assert.ok(
    events.find((e) => e.family === 'story.blocked' && e.storyId === 's1' && e.reason === 'worker-reported-failure'),
  );
  assert.ok(events.find((e) => e.family === 'story.blocked' && e.storyId === 's2' && e.blockedBy === 's1'));
  assert.ok(!events.find((e) => e.family === 'story.skipped' && e.storyId === 's3'));
  assert.ok(events.find((e) => e.family === 'run.stopped' && e.checkpoint === 'after:s1'));
  const stoppedEvent = events.find((e) => e.family === 'run.stopped');
  assert.deepStrictEqual(stoppedEvent?.unstarted, ['s3']);
});

test('PR-AC-1: missing evidence is blocked with evidence-gate-failed', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({ outcome: 'success' }), // Missing evidence
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');

  const blockedEvent = events.find((e) => e.family === 'story.blocked');
  assert.ok(blockedEvent);
  assert.strictEqual(blockedEvent.reason, 'evidence-gate-failed');
  assert.match(blockedEvent.diagnostics?.error ?? '', /missing required evidence/);
});

test('PR-AC-1: missing evidence result is blocked with evidence-gate-failed', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({ outcome: 'success', evidence: {} }), // Missing evidence.result
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');

  const blockedEvent = events.find((e) => e.family === 'story.blocked');
  assert.ok(blockedEvent);
  assert.strictEqual(blockedEvent.reason, 'evidence-gate-failed');
  assert.match(blockedEvent.diagnostics?.error ?? '', /missing required evidence/);
});

test('PR-AC-1: success outcome with null evidence result is blocked', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({ outcome: 'success', evidence: { result: null } }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');

  const blockedEvent = events.find((e) => e.family === 'story.blocked');
  assert.ok(blockedEvent);
  assert.strictEqual(blockedEvent.reason, 'evidence-gate-failed');
  assert.deepStrictEqual(blockedEvent.diagnostics?.evidenceResult, null);
  assert.ok(!events.find((e) => e.family === 'story.done'));
});

test('PR-AC-1: success outcome with failed evidence result is blocked', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({ outcome: 'success', evidence: { result: 'failed' } }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');

  const blockedEvent = events.find((e) => e.family === 'story.blocked');
  assert.ok(blockedEvent);
  assert.strictEqual(blockedEvent.reason, 'evidence-gate-failed');
  assert.strictEqual(blockedEvent.diagnostics?.evidenceResult, 'failed');
  assert.ok(!events.find((e) => e.family === 'story.done'));
});

test('PR-AC-4: worker execution error records story.blocked with reason', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => {
      throw new Error('Worker exploded');
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');

  const blockedEvent = events.find((e) => e.family === 'story.blocked');
  assert.ok(blockedEvent);
  assert.strictEqual(blockedEvent.reason, 'worker-execution-error');
  assert.match(blockedEvent.diagnostics?.error ?? '', /Worker exploded/);
});

test('PR-AC-4: non-Error worker throw records string diagnostics', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: () => Promise.reject('plain failure'),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');

  const blockedEvent = events.find((e) => e.family === 'story.blocked');
  assert.ok(blockedEvent);
  assert.strictEqual(blockedEvent.diagnostics?.error, 'plain failure');
});

test('PR-AC-4: policy denial records authorization.denied at run scope', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => {
      assert.fail('Worker should not be called');
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: false } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'failure');

  assert.ok(events.find((e) => e.family === 'authorization.denied' && !e.storyId));
  assert.ok(!events.find((e) => e.family === 'run.denied'));
});

test('PR-AC-5: dry-run evidence is recorded as evidence.modeled', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({ outcome: 'success', evidence: { result: 'passed' } }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, 'success');

  assert.ok(events.find((e) => e.family === 'evidence.modeled' && e.result === 'passed'));
  assert.ok(!events.find((e) => e.family === 'evidence.observed'));
});

test('P3-AC-2: declared low-risk request is granted and recorded', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({
      outcome: 'success',
      requests: [{ id: 'REQ-edit', kind: 'edit-files', paths: ['src/cli.ts'] }],
      evidence: { result: 'passed' },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 's1', title: 't1', scope: ['src/**'], authority: { requests: ['edit-files'] } }],
    },
  };
  const policy: PolicyDoc = { policy: { id: 'policy:assisted-v0', rules: { allowLocalDryRun: true } } };

  const status = await harness.run(plan, {}, policy);

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find((e) => e.family === 'authorization.requested' && e.storyId === 's1' && e.requestId === 'REQ-edit'),
  );
  assert.ok(
    events.find(
      (e) =>
        e.family === 'authorization.granted' &&
        e.storyId === 's1' &&
        e.requestId === 'REQ-edit' &&
        Array.isArray(e.basis) &&
        e.basis.includes('CFG-10:reversible'),
    ),
  );
});

test('P3-AC-3: out-of-scope request is denied fail-closed and blocks the story', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({
      outcome: 'success',
      requests: [{ id: 'REQ-outside', kind: 'edit-files', paths: ['docs/product/jig.md'] }],
      evidence: { result: 'passed' },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 's1', title: 't1', scope: ['src/**'], authority: { requests: ['edit-files'] } }],
    },
  };
  const policy: PolicyDoc = { policy: { id: 'policy:assisted-v0', rules: { allowLocalDryRun: true } } };

  const status = await harness.run(plan, {}, policy);

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find((e) => e.family === 'authorization.denied' && e.storyId === 's1' && e.requestId === 'REQ-outside'),
  );
  assert.ok(
    events.find((e) => e.family === 'story.blocked' && e.storyId === 's1' && e.reason === 'authorization-denied'),
  );
  assert.ok(!events.find((e) => e.family === 'evidence.modeled'));
});

test('P3-AC-4: owner approval is recorded narrowly and story proceeds', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({
      outcome: 'success',
      requests: [{ id: 'REQ-rule', kind: 'edit-rule-governing-file', paths: ['policies/local.json'] }],
      evidence: { result: 'passed' },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager, { decide: async () => 'approve' });
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 's1', title: 't1', scope: ['policies/**'], authority: { requests: ['edit-rule-governing-file'] } },
      ],
    },
  };
  const policy: PolicyDoc = {
    policy: { id: 'policy:assisted-v0', rules: { allowLocalDryRun: true, ruleGoverningSurfaces: ['policies/**'] } },
  };

  const status = await harness.run(plan, {}, policy);

  assert.strictEqual(status, 'success');
  assert.ok(events.find((e) => e.family === 'authorization.routed' && e.storyId === 's1'));
  assert.ok(events.find((e) => e.family === 'story.parked' && e.storyId === 's1'));
  assert.ok(
    events.find(
      (e) =>
        e.family === 'authorization.granted' &&
        e.storyId === 's1' &&
        e.requestId === 'REQ-rule' &&
        Array.isArray(e.basis) &&
        e.basis.includes('owner-approval'),
    ),
  );
  assert.ok(events.find((e) => e.family === 'story.done' && e.storyId === 's1'));
});

test('P3-AC-4: owner rejection is recorded and blocks the story', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({
      outcome: 'success',
      requests: [{ id: 'REQ-rule', kind: 'edit-rule-governing-file', paths: ['policies/local.json'] }],
      evidence: { result: 'passed' },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager, { decide: async () => 'reject' });
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 's1', title: 't1', scope: ['policies/**'], authority: { requests: ['edit-rule-governing-file'] } },
      ],
    },
  };
  const policy: PolicyDoc = {
    policy: { id: 'policy:assisted-v0', rules: { allowLocalDryRun: true, ruleGoverningSurfaces: ['policies/**'] } },
  };

  const status = await harness.run(plan, {}, policy);

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (e) =>
        e.family === 'authorization.denied' &&
        e.storyId === 's1' &&
        e.requestId === 'REQ-rule' &&
        Array.isArray(e.basis) &&
        e.basis.includes('owner-rejection'),
    ),
  );
  assert.ok(events.find((e) => e.family === 'story.blocked' && e.storyId === 's1' && e.reason === 'owner-rejection'));
});

test('P3-AC-4: unattended routed request parks and stops the run', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => ({
      outcome: 'success',
      requests: [{ id: 'REQ-rule', kind: 'edit-rule-governing-file', paths: ['policies/local.json'] }],
      evidence: { result: 'passed' },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 's1', title: 't1', scope: ['policies/**'], authority: { requests: ['edit-rule-governing-file'] } },
      ],
    },
  };
  const policy: PolicyDoc = {
    policy: { id: 'policy:assisted-v0', rules: { allowLocalDryRun: true, ruleGoverningSurfaces: ['policies/**'] } },
  };

  const status = await harness.run(plan, {}, policy);

  assert.strictEqual(status, 'failure');
  assert.ok(events.find((e) => e.family === 'authorization.routed' && e.storyId === 's1'));
  assert.ok(events.find((e) => e.family === 'story.parked' && e.storyId === 's1'));
  assert.ok(
    events.find(
      (e) => e.family === 'run.stopped' && e.reason === 'unattended-park' && e.checkpoint === 'after:s1.parked',
    ),
  );
});

test('P3-AC-4: unattended parked stories block dependent stories', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async (story: { id: string }) => {
      if (story.id === 's2') {
        assert.fail(`Worker should not execute ${story.id}`);
      }

      if (story.id === 's3') {
        return {
          outcome: 'success',
          evidence: { result: 'passed' },
        };
      }

      return {
        outcome: 'success',
        requests: [{ id: 'REQ-rule', kind: 'edit-rule-governing-file', paths: ['policies/local.json'] }],
        evidence: { result: 'passed' },
      };
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 's1', title: 't1', scope: ['policies/**'], authority: { requests: ['edit-rule-governing-file'] } },
        { id: 's2', title: 't2', dependsOn: ['s1'], scope: ['src/**'], authority: { requests: ['edit-files'] } },
        { id: 's3', title: 't3', scope: ['src/**'], authority: { requests: ['edit-files'] } },
      ],
    },
  };
  const policy: PolicyDoc = {
    policy: { id: 'policy:assisted-v0', rules: { allowLocalDryRun: true, ruleGoverningSurfaces: ['policies/**'] } },
  };

  const status = await harness.run(plan, {}, policy);

  assert.strictEqual(status, 'failure');
  assert.ok(events.find((e) => e.family === 'story.parked' && e.storyId === 's1'));
  assert.ok(events.find((e) => e.family === 'story.blocked' && e.storyId === 's2' && e.blockedBy === 's1'));
  assert.ok(!events.find((e) => e.family === 'story.started' && e.storyId === 's2'));
  assert.ok(events.find((e) => e.family === 'story.done' && e.storyId === 's3'));
  assert.ok(events.find((e) => e.family === 'run.stopped' && e.reason === 'unattended-park'));
  assert.deepStrictEqual(events.find((e) => e.family === 'run.stopped')?.unstarted, []);
});

test('P4-AC-1: resume from work-item-blocked frees independent unstarted work', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async (story: { id: string }) => {
      assert.strictEqual(story.id, 's3');
      return {
        outcome: 'success',
        evidence: { result: 'passed' },
        changedFiles: ['src/resume.ts'],
      };
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 's1', title: 't1' },
        { id: 's2', title: 't2', dependsOn: ['s1'] },
        { id: 's3', title: 't3' },
      ],
    },
  };
  const resumePlan: ResumePlan = {
    runId: 'run-p1-existing',
    checkpoint: 'after:s1',
    stopCause: 'work-item-blocked',
    completedStoryIds: [],
    blockedStoryIds: ['s1', 's2'],
    parkedStoryId: null,
    unstartedStoryIds: ['s3'],
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };

  const status = await harness.resume(plan, policy, resumePlan);

  assert.strictEqual(status, 'success');
  assert.ok(events.find((e) => e.family === 'run.resumed' && e.runId === 'run-p1-existing'));
  assert.ok(!events.find((e) => e.family === 'story.started' && e.storyId === 's1'));
  assert.ok(!events.find((e) => e.family === 'story.started' && e.storyId === 's2'));
  assert.ok(events.find((e) => e.family === 'story.done' && e.storyId === 's3'));
  assert.ok(events.find((e) => e.family === 'run.completed'));
});

test('P4-AC-1: resume denies immediately when durable launch policy disallows local dry run', async () => {
  const events: RunEvent[] = [];
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('policy denial must stop before worker execution');
      },
    },
    recordManager,
  );
  const plan: PlanInstance = {
    plan: { id: 'p1', version: 'execution-plan-shape-v0', stories: [{ id: 's1', title: 't1' }] },
  };
  const resumePlan: ResumePlan = {
    runId: 'run-p1-existing',
    checkpoint: 'after:s1',
    stopCause: 'work-item-blocked',
    completedStoryIds: [],
    blockedStoryIds: [],
    parkedStoryId: null,
    unstartedStoryIds: ['s1'],
  };

  const status = await harness.resume(plan, { policy: { rules: { allowLocalDryRun: false } } }, resumePlan);

  assert.strictEqual(status, 'failure');
  assert.ok(events.find((e) => e.family === 'authorization.denied' && e.reason?.includes('allowLocalDryRun')));
});

test('P4-AC-2: resume does not duplicate terminal stories or dry-run actions', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async (story: { id: string }) => {
      assert.strictEqual(story.id, 's2');
      return {
        outcome: 'success',
        evidence: { result: 'passed' },
      };
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 's1', title: 'already done' },
        { id: 's2', title: 'remaining' },
      ],
    },
  };
  const resumePlan: ResumePlan = {
    runId: 'run-p1-existing',
    checkpoint: 'after:s1',
    stopCause: 'work-item-blocked',
    completedStoryIds: ['s1'],
    blockedStoryIds: [],
    parkedStoryId: null,
    unstartedStoryIds: ['s2'],
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };

  const status = await harness.resume(plan, policy, resumePlan);

  assert.strictEqual(status, 'success');
  assert.strictEqual(events.filter((e) => e.family === 'story.done' && e.storyId === 's1').length, 0);
  assert.strictEqual(
    events.filter((e) => e.family === 'runner-action.skipped-on-dry-run' && e.storyId === 's1').length,
    0,
  );
  assert.strictEqual(events.filter((e) => e.family === 'run.started').length, 0);
  assert.ok(events.find((e) => e.family === 'story.done' && e.storyId === 's2'));
});

test('P4-AC-1: non-interactive parked resume re-stops but lets independent work progress', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async (story: { id: string }) => {
      assert.strictEqual(story.id, 's3');
      return {
        outcome: 'success',
        evidence: { result: 'passed' },
      };
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 's1', title: 'parked' },
        { id: 's2', title: 'dependent', dependsOn: ['s1'] },
        { id: 's3', title: 'independent' },
      ],
    },
  };
  const resumePlan: ResumePlan = {
    runId: 'run-p1-existing',
    checkpoint: 'after:s1.parked',
    stopCause: 'unattended-park',
    completedStoryIds: [],
    blockedStoryIds: ['s2'],
    parkedStoryId: 's1',
    unstartedStoryIds: ['s3'],
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };

  const status = await harness.resume(plan, policy, resumePlan);

  assert.strictEqual(status, 'failure');
  assert.ok(events.find((e) => e.family === 'run.resumed'));
  assert.ok(events.find((e) => e.family === 'story.done' && e.storyId === 's3'));
  assert.strictEqual(events.filter((e) => e.family === 'story.parked' && e.storyId === 's1').length, 0);
  assert.ok(
    events.find(
      (e) => e.family === 'run.stopped' && e.reason === 'unattended-park' && e.checkpoint === 'after:s1.parked',
    ),
  );
});

test('P4-AC-1: parked resume owner approval resumes the parked story without duplicating story.started', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async (story: { id: string }) => {
      assert.strictEqual(story.id, 's1');
      return {
        outcome: 'success',
        evidence: { result: 'passed' },
      };
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager, {
    decide: async () => 'approve',
  });
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 's1', title: 'parked' }],
    },
  };
  const resumePlan: ResumePlan = {
    runId: 'run-p1-existing',
    checkpoint: 'after:s1.parked',
    stopCause: 'unattended-park',
    completedStoryIds: [],
    blockedStoryIds: [],
    parkedStoryId: 's1',
    unstartedStoryIds: ['s1'],
    parkedRequest: { requestId: 'REQ-1', requestKind: 'edit-files' },
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };

  const status = await harness.resume(plan, policy, resumePlan);

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find(
      (e) =>
        e.family === 'authorization.granted' &&
        e.storyId === 's1' &&
        e.requestId === 'REQ-1' &&
        e.requestKind === 'edit-files',
    ),
  );
  assert.strictEqual(events.filter((e) => e.family === 'story.started' && e.storyId === 's1').length, 0);
  assert.ok(events.find((e) => e.family === 'story.done' && e.storyId === 's1'));
  assert.ok(events.find((e) => e.family === 'run.completed'));
});

test('P4-AC-1: parked resume owner rejection blocks the parked story and preserves later work as unstarted', async () => {
  const events: RunEvent[] = [];
  const worker = {
    execute: async () => {
      assert.fail('owner rejection must stop before executing stories');
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e: RunEvent) => events.push(e),
    finalize: async () => {},
  };
  const harness = new LocalHarness(worker, recordManager, {
    decide: async () => 'reject',
  });
  const plan: PlanInstance = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 's1', title: 'parked' },
        { id: 's2', title: 'later independent' },
      ],
    },
  };
  const resumePlan: ResumePlan = {
    runId: 'run-p1-existing',
    checkpoint: 'after:s1.parked',
    stopCause: 'unattended-park',
    completedStoryIds: [],
    blockedStoryIds: [],
    parkedStoryId: 's1',
    unstartedStoryIds: ['s1', 's2'],
    parkedRequest: {},
  };
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };

  const status = await harness.resume(plan, policy, resumePlan);

  assert.strictEqual(status, 'failure');
  assert.ok(events.find((e) => e.family === 'authorization.denied' && e.storyId === 's1'));
  assert.ok(events.find((e) => e.family === 'story.blocked' && e.storyId === 's1' && e.reason === 'owner-rejection'));
  assert.ok(events.find((e) => e.family === 'run.stopped' && e.unstarted?.includes('s2')));
});

test('P3/P4: harness records grant, deny, routed approval, missing evidence, and failed evidence branches', async () => {
  const policy: PolicyDoc = { policy: { rules: { allowLocalDryRun: true } } };

  async function runOne(
    story: PlanInstance['plan']['stories'][number],
    result: Record<string, unknown>,
    ownerDecision?: 'approve' | 'reject',
  ): Promise<RunEvent[]> {
    const events: RunEvent[] = [];
    const harness = new LocalHarness(
      {
        execute: async () => result,
      },
      {
        init: () => {},
        recordEvent: (e: RunEvent) => events.push(e),
        finalize: async () => {},
      },
      ownerDecision
        ? {
            decide: async () => ownerDecision,
          }
        : null,
    );
    await harness.run(
      {
        plan: {
          id: `p-${story.id}`,
          version: 'execution-plan-shape-v0',
          stories: [story],
        },
      },
      {},
      policy,
    );
    return events;
  }

  const granted = await runOne(
    {
      id: 'grant',
      title: 'grant',
      scope: ['src/**'],
      authority: { requests: ['edit-files'] },
    },
    {
      outcome: 'success',
      requests: [{ id: 'REQ-grant', kind: 'edit-files', paths: ['src/a.ts'] }],
      evidence: { result: 'passed' },
    },
  );
  assert.ok(granted.find((e) => e.family === 'authorization.granted' && e.requestId === 'REQ-grant'));

  const denied = await runOne(
    {
      id: 'deny',
      title: 'deny',
      scope: ['src/**'],
      authority: { requests: ['edit-files'] },
    },
    {
      outcome: 'success',
      requests: [{ id: 'REQ-deny', kind: 'edit-files', paths: ['docs/a.md'] }],
      evidence: { result: 'passed' },
    },
  );
  assert.ok(denied.find((e) => e.family === 'authorization.denied' && e.requestId === 'REQ-deny'));

  const routedApproved = await runOne(
    { id: 'route-approve', title: 'route approve' },
    {
      outcome: 'success',
      requests: [{ id: 'REQ-route', kind: 'edit-files', privileged: true }],
      evidence: { result: 'passed' },
    },
    'approve',
  );
  assert.ok(routedApproved.find((e) => e.family === 'authorization.granted' && e.requestId === 'REQ-route'));

  const routedRejected = await runOne(
    { id: 'route-reject', title: 'route reject' },
    {
      outcome: 'success',
      requests: [{ id: 'REQ-route-reject', kind: 'edit-files', privileged: true }],
      evidence: { result: 'passed' },
    },
    'reject',
  );
  assert.ok(routedRejected.find((e) => e.family === 'story.blocked' && e.reason === 'owner-rejection'));

  const missingEvidence = await runOne({ id: 'missing-evidence', title: 'missing evidence' }, { outcome: 'success' });
  assert.ok(missingEvidence.find((e) => e.family === 'story.blocked' && e.reason === 'evidence-gate-failed'));

  const failedEvidence = await runOne(
    { id: 'failed-evidence', title: 'failed evidence' },
    { outcome: 'success', evidence: { result: 'failed' } },
  );
  assert.ok(failedEvidence.find((e) => e.family === 'story.blocked' && e.diagnostics?.evidenceResult === 'failed'));
});
