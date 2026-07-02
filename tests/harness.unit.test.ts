import assert from 'node:assert';
import { test } from 'vitest';
import { LocalHarness } from '../src/harness.js';
import type { PlanInstance, PolicyDoc, RunEvent } from '../src/types.js';

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
