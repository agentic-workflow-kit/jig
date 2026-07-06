import assert from 'node:assert';
import { test } from 'vitest';
import { createInMemoryStoryWorkspaceIsolation, LocalHarness } from '../src/harness.js';
import { validatePlanForScheduling } from '../src/intake.js';
import type { PlanInstance, PolicyDoc, RecordSink, RunEvent, Story } from '../src/types.js';

function recordCollector(): { sink: RecordSink; events: RunEvent[] } {
  const events: RunEvent[] = [];
  return {
    events,
    sink: {
      init: () => {},
      recordEvent: (event) => events.push(event as RunEvent),
      finalize: async () => {},
    },
  };
}

function concurrentPolicy(rules: NonNullable<PolicyDoc['policy']>['rules'] = {}): PolicyDoc {
  return {
    policy: {
      id: 'policy-concurrent-batch',
      rules: {
        allowLocalDryRun: true,
        concurrencyCeiling: 2,
        ...rules,
      },
    },
  };
}

// Note: harness.ts's own findDuplicateStoryId (guarding the concurrent-batch path) is
// defense-in-depth that is not independently reachable through the public API: intake's
// PlanValidator already rejects duplicate story ids before a ValidatedCandidate can exist
// (see packages/jig-sdk/src/plan-validator.ts's seenStoryIds check), and ValidatedCandidate's
// brand symbol is module-private, so no caller can construct one that bypasses that check.

test('concurrent batch: a mid-batch failure under continue-independent-work still runs the next batch', async () => {
  const { sink, events } = recordCollector();
  const executed: string[] = [];
  const harness = new LocalHarness(
    {
      execute: async (story: Story) => {
        executed.push(story.id);
        if (story.id === 'S2') {
          return { storyId: story.id, outcome: 'failure', evidence: { result: 'failed' } };
        }
        return { storyId: story.id, outcome: 'success', evidence: { result: 'passed' } };
      },
    },
    sink,
    null,
    { workspaceIsolation: createInMemoryStoryWorkspaceIsolation('/tmp/jig-concurrent-fail') },
  );
  const plan: PlanInstance = {
    plan: {
      id: 'plan-concurrent-fail',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'S1', title: 'first' },
        { id: 'S2', title: 'second' },
        { id: 'S3', title: 'third' },
      ],
    },
  };

  const status = await harness.run(
    validatePlanForScheduling(plan),
    {},
    concurrentPolicy({ blockResolution: 'continue-independent-work' }),
  );

  assert.strictEqual(status, 'failure');
  assert.ok(executed.includes('S3'), 'the batch after the failure must still run under continue-independent-work');
  assert.ok(events.find((event) => event.family === 'story.blocked' && event.storyId === 'S2'));
});

test('concurrent batch: a mid-batch failure under quarantine-replan (default) marks the remaining batches unstarted', async () => {
  const { sink, events } = recordCollector();
  const executed: string[] = [];
  const harness = new LocalHarness(
    {
      execute: async (story: Story) => {
        executed.push(story.id);
        if (story.id === 'S2') {
          return { storyId: story.id, outcome: 'failure', evidence: { result: 'failed' } };
        }
        return { storyId: story.id, outcome: 'success', evidence: { result: 'passed' } };
      },
    },
    sink,
    null,
    { workspaceIsolation: createInMemoryStoryWorkspaceIsolation('/tmp/jig-concurrent-quarantine') },
  );
  const plan: PlanInstance = {
    plan: {
      id: 'plan-concurrent-quarantine',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'S1', title: 'first' },
        { id: 'S2', title: 'second' },
        { id: 'S3', title: 'third' },
      ],
    },
  };

  const status = await harness.run(validatePlanForScheduling(plan), {}, concurrentPolicy());

  assert.strictEqual(status, 'failure');
  assert.ok(!executed.includes('S3'), 'the quarantine-replan default must not start the next batch after a failure');
  assert.ok(events.find((event) => event.family === 'run.stopped' && event.unstarted?.includes('S3')));
});

test('concurrent batch: an unattended park inside a batch stops remaining batches and records the park checkpoint', async () => {
  const { sink, events } = recordCollector();
  const executed: string[] = [];
  const harness = new LocalHarness(
    {
      execute: async (story: Story) => {
        executed.push(story.id);
        if (story.id === 'S1') {
          return {
            storyId: story.id,
            outcome: 'success',
            requests: [{ id: 'REQ-route', kind: 'run-checks' }],
            evidence: { result: 'passed' },
          };
        }
        return { storyId: story.id, outcome: 'success', evidence: { result: 'passed' } };
      },
    },
    sink,
    null,
    { workspaceIsolation: createInMemoryStoryWorkspaceIsolation('/tmp/jig-concurrent-park') },
  );
  const plan: PlanInstance = {
    plan: {
      id: 'plan-concurrent-park',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'S1', title: 'parks', authority: { requests: [] } },
        { id: 'S2', title: 'second' },
        { id: 'S3', title: 'third' },
      ],
    },
  };

  const status = await harness.run(validatePlanForScheduling(plan), {}, concurrentPolicy());

  assert.strictEqual(status, 'failure');
  assert.ok(!executed.includes('S3'), 'batches after an unattended park must not start');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'run.stopped' && event.reason === 'unattended-park' && event.checkpoint === 'after:S1.parked',
    ),
  );
});

test('concurrent batch: an out-of-band stop request consumed after a successful batch halts remaining batches', async () => {
  const { events } = recordCollector();
  let stopRequested = false;
  const liveEvents: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async (story: Story) => {
        if (story.id === 'S2') {
          stopRequested = true;
        }
        return { storyId: story.id, outcome: 'success', evidence: { result: 'passed' } };
      },
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => {
        liveEvents.push(event);
        events.push(event);
      },
      readEvents: () => [
        ...liveEvents,
        ...(stopRequested
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
    null,
    { workspaceIsolation: createInMemoryStoryWorkspaceIsolation('/tmp/jig-concurrent-stop') },
  );
  const plan: PlanInstance = {
    plan: {
      id: 'plan-concurrent-stop',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'S1', title: 'first' },
        { id: 'S2', title: 'second' },
        { id: 'S3', title: 'third' },
        { id: 'S4', title: 'fourth' },
      ],
    },
  };

  const status = await harness.run(validatePlanForScheduling(plan), {}, concurrentPolicy());

  assert.strictEqual(status, 'failure');
  assert.ok(
    liveEvents.find(
      (event) =>
        event.family === 'run.stopped' && event.reason === 'owner-requested-pause' && event.unstarted?.includes('S4'),
    ),
  );
});
