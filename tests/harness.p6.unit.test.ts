import assert from 'node:assert';
import { test } from 'vitest';
import { createInMemoryStoryWorkspaceIsolation, LocalHarness } from '../src/harness.js';
import type { PlanInstance, PolicyDoc, RecordSink, RunEvent, Story } from '../src/types.js';

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

  const status = await harness.run(plan, {}, policy);

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
        { id: 'STORY-1', title: 'duplicate' },
      ],
    },
  };
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
      workspaceIsolation: createInMemoryStoryWorkspaceIsolation('/tmp/jig-workspaces'),
    },
  );

  const status = await harness.run(plan, {}, policy);

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
