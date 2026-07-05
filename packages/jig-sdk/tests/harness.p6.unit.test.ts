import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { createInMemoryStoryWorkspaceIsolation, LocalHarness } from '../src/harness.js';
import { validatePlanForScheduling } from '../src/intake.js';
import { projectRunEvents } from '../src/projection.js';
import { RecordManager } from '../src/records.js';
import type { PlanInstance, PolicyDoc, RecordSink, RunEvent, Story } from '../src/types.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const policy: PolicyDoc = {
  policy: {
    id: 'policy-p6-harness',
    rules: {
      allowLocalDryRun: true,
    },
  },
};

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

test('P6-AC-4: two independent stories run in parallel in isolated workspaces without corruption', async () => {
  const { sink } = recordCollector();
  const seenWorkspaces: string[] = [];
  const plan: PlanInstance = {
    plan: {
      id: 'plan-p6-isolation',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'STORY-1', title: 'first' },
        { id: 'STORY-2', title: 'second' },
      ],
    },
  };
  const harness = new LocalHarness(
    {
      execute: async (story: Story) => {
        const workspace = story.workspace as { path: string } | undefined;
        assert.ok(workspace);
        seenWorkspaces.push(workspace.path);
        return {
          storyId: story.id,
          outcome: 'success',
          changedFiles: [`${workspace.path}/result.txt`],
          evidence: { result: 'passed' },
        };
      },
    },
    sink,
    null,
    {
      workspaceIsolation: createInMemoryStoryWorkspaceIsolation('/tmp/jig-workspaces'),
    },
  );

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(seenWorkspaces.sort(), ['/tmp/jig-workspaces/STORY-1', '/tmp/jig-workspaces/STORY-2']);
});

test('P6-AC-4: a duplicate launch of the same task is refused with workspace-collision', async () => {
  const { sink, events } = recordCollector();
  const plan: PlanInstance = {
    plan: {
      id: 'plan-p6-collision',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'STORY-1', title: 'first' },
        { id: 'STORY-2', title: 'second' },
      ],
    },
  };
  let allocationCount = 0;
  const harness = new LocalHarness(
    {
      execute: async (story) => ({
        storyId: story.id,
        outcome: 'success',
        evidence: { result: 'passed' },
      }),
    },
    sink,
    null,
    {
      workspaceIsolation: {
        allocate: (story) => {
          allocationCount += 1;
          if (allocationCount === 2) {
            return {
              failureToken: 'workspace-collision',
              path: '/tmp/jig-workspaces/STORY-1',
            };
          }

          return {
            storyId: story.id,
            path: `/tmp/jig-workspaces/${story.id}`,
          };
        },
      },
    },
  );

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' &&
        event.reason === 'workspace-collision' &&
        event.diagnostics?.failureToken === 'workspace-collision',
    ),
  );
});

test('P6-AC-4: parallel unattended-park records run.stopped with unattended-park', async () => {
  const { sink, events } = recordCollector();
  const plan: PlanInstance = {
    plan: {
      id: 'plan-p6-parallel-park',
      version: 'execution-plan-shape-v0',
      stories: [
        {
          id: 'STORY-1',
          title: 'parks',
          authority: { requests: [] },
        },
        { id: 'STORY-2', title: 'succeeds' },
      ],
    },
  };
  const harness = new LocalHarness(
    {
      execute: async (story) => {
        if (story.id === 'STORY-1') {
          return {
            storyId: story.id,
            outcome: 'success',
            requests: [{ id: 'REQ-route', kind: 'run-checks' }],
            evidence: { result: 'passed' },
          };
        }

        return {
          storyId: story.id,
          outcome: 'success',
          evidence: { result: 'passed' },
        };
      },
    },
    sink,
    null,
    {
      workspaceIsolation: createInMemoryStoryWorkspaceIsolation('/tmp/jig-workspaces'),
    },
  );

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'run.stopped' &&
        event.reason === 'unattended-park' &&
        event.checkpoint === 'after:STORY-1.parked',
    ),
  );
});

test('P6-AC-4: duplicate-launch workspace-collision events replay cleanly through projection', async () => {
  const recordDir = mkdtempSync(join(tmpdir(), 'jig-p6-collision-'));
  cleanupDirs.push(recordDir);
  const plan: PlanInstance = {
    plan: {
      id: 'plan-p6-collision-projection',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'STORY-1', title: 'first' },
        { id: 'STORY-2', title: 'second' },
      ],
    },
  };
  let allocationCount = 0;
  const harness = new LocalHarness(
    {
      execute: async (story) => ({
        storyId: story.id,
        outcome: 'success',
        evidence: { result: 'passed' },
      }),
    },
    new RecordManager(),
    null,
    {
      workspaceIsolation: {
        allocate: (story) => {
          allocationCount += 1;
          if (allocationCount === 2) {
            return {
              failureToken: 'workspace-collision',
              path: '/tmp/jig-workspaces/STORY-1',
            };
          }

          return {
            storyId: story.id,
            path: `/tmp/jig-workspaces/${story.id}`,
          };
        },
      },
    },
  );

  const status = await harness.run(
    validatePlanForScheduling(plan),
    { runner: { mode: 'local-dry-run', recordDir } },
    policy,
  );

  assert.strictEqual(status, 'failure');
  const [runName] = readdirSync(recordDir);
  assert.ok(runName);
  const eventsJsonl = readFileSync(join(recordDir, runName, 'events.jsonl'), 'utf8');
  const startedEvents = eventsJsonl
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent)
    .filter((event) => event.family === 'story.started' && event.storyId === 'STORY-2');
  assert.strictEqual(startedEvents.length, 0);
  const projection = projectRunEvents({ eventsJsonl });
  assert.strictEqual(projection.stories['STORY-2']?.reason, 'workspace-collision');
});
