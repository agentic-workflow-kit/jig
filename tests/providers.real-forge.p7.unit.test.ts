import assert from 'node:assert';
import { test } from 'vitest';
import { LocalHarness } from '../src/harness.js';
import type { AgentPort, ForgePort, LandingAction, LandingRequest } from '../src/ports.js';
import type { RunProjection } from '../src/projection.js';
import { createGitHubForge, type GitHubForgeEffect, type GitHubForgeTransport } from '../src/providers/real/forge.js';
import { buildResumePlan } from '../src/resume.js';
import type { PlanInstance, PolicyDoc, RecordSink, ResumePlan, RunEvent } from '../src/types.js';

const plan: PlanInstance = {
  plan: {
    id: 'plan-p7-real-forge',
    version: 'execution-plan-shape-v0',
    stories: [
      {
        id: 'STORY-1',
        title: 'P7 story',
        scope: ['src/**'],
      },
    ],
  },
};

const twoStoryPlan: PlanInstance = {
  plan: {
    id: 'plan-p7-real-forge-resume',
    version: 'execution-plan-shape-v0',
    stories: [
      { id: 'STORY-1', title: 'Already landed' },
      { id: 'STORY-2', title: 'Already blocked' },
    ],
  },
};

const policy: PolicyDoc = {
  policy: {
    id: 'policy-p7',
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
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async () => {},
    },
  };
}

function effectFor(action: LandingAction): GitHubForgeEffect {
  return {
    targetRef: action === 'merge' ? 'refs/heads/main' : 'refs/heads/phase-7',
    targetHead: `${action}-head`,
    prNumber: action === 'push' ? undefined : 7,
    prUrl: action === 'push' ? undefined : 'https://github.example/pull/7',
  };
}

function fakeTransport(calls: string[], currentHead = 'push-head'): GitHubForgeTransport {
  return {
    push: async (request: LandingRequest) => {
      calls.push(`push:${request.storyId}`);
      return effectFor('push');
    },
    openPullRequest: async (request: LandingRequest) => {
      calls.push(`open-pr:${request.storyId}`);
      return effectFor('open-pr');
    },
    mergePullRequest: async (request: LandingRequest) => {
      calls.push(`merge:${request.storyId}`);
      return effectFor('merge');
    },
    readHead: async (request) => {
      calls.push(`read-head:${request.targetRef}`);
      return {
        targetRef: request.targetRef,
        targetHead: currentHead,
      };
    },
    openOrUpdatePullRequestForBlock: async (request) => {
      calls.push(`block-pr:${request.storyId}`);
      return {
        targetRef: `refs/heads/${request.safeBranch ?? 'phase-7'}`,
        targetHead: 'blocked-head',
        prNumber: 7,
        prUrl: 'https://github.example/pull/7',
      };
    },
    postBlockStatus: async (request) => {
      calls.push(`block-status:${request.storyId}`);
      return {
        targetRef: `refs/heads/${request.safeBranch ?? 'phase-7'}`,
        targetHead: 'blocked-head',
      };
    },
    postBlockComment: async (request) => {
      calls.push(`block-comment:${request.failureReasons.join(',')}`);
      return {
        targetRef: `refs/heads/${request.safeBranch ?? 'phase-7'}`,
        targetHead: 'blocked-head',
      };
    },
  };
}

test('P7-AC-1: the runner drives ForgePort.land() at done → landed and a real push/PR/merge effect occurs', async () => {
  const calls: string[] = [];
  const { sink, events } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'success',
        evidence: { result: 'passed' },
      }),
    },
    sink,
    null,
    {
      forge: createGitHubForge({ transport: fakeTransport(calls) }),
      landingAction: 'push',
    },
  );

  const status = await harness.run(plan, {}, policy);

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(calls, ['push:STORY-1']);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'runner-action.pushed' &&
        event.storyId === 'STORY-1' &&
        event.action === 'push' &&
        event.targetRef === 'refs/heads/phase-7' &&
        event.targetHead === 'push-head',
    ),
  );
});

test('P7-AC-1: the AgentPort exposes no landing path', () => {
  const agent: AgentPort = {
    execute: async () => ({
      outcome: 'success',
      evidence: { result: 'passed' },
    }),
  };

  assert.deepStrictEqual(Object.keys(agent), ['execute']);
  assert.strictEqual('land' in agent, false);
  assert.strictEqual('push' in agent, false);
  assert.strictEqual('merge' in agent, false);
});

test('P7-AC-1: landing stays skipped-on-dry-run under dry-run wiring', async () => {
  const { sink, events } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'success',
        evidence: { result: 'passed' },
      }),
    },
    sink,
  );

  const status = await harness.run(plan, {}, policy);

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'runner-action.skipped-on-dry-run' &&
        event.storyId === 'STORY-1' &&
        event.action === 'push|open-pr|merge',
    ),
  );
});

test('P7-AC-2: the real adapter discriminates the action union push/open-pr/merge', async () => {
  const calls: string[] = [];
  const forge = createGitHubForge({ transport: fakeTransport(calls) });

  const pushed = await forge.land({ storyId: 'STORY-1', action: 'push' });
  const opened = await forge.land({ storyId: 'STORY-1', action: 'open-pr' });
  const merged = await forge.land({ storyId: 'STORY-1', action: 'merge' });

  assert.deepStrictEqual(calls, ['push:STORY-1', 'open-pr:STORY-1', 'merge:STORY-1']);
  assert.strictEqual(pushed.family, 'runner-action.pushed');
  assert.strictEqual(opened.family, 'runner-action.opened-pr');
  assert.strictEqual(merged.family, 'runner-action.merged');
});

test('P7-AC-2: an unknown action fails closed', async () => {
  const forge = createGitHubForge({ transport: fakeTransport([]) });

  await assert.rejects(async () => {
    await forge.land({ storyId: 'STORY-1', action: 'delete-branch' as never });
  }, /forge-unknown-action/);
});

test('P7-AC-3: a land-then-relaunch is recognized from the records and is a recorded no-op', async () => {
  const calls: string[] = [];
  const priorEvents: RunEvent[] = [
    {
      family: 'runner-action.pushed',
      actor: 'runner',
      storyId: 'STORY-1',
      action: 'push',
      landingKind: 'push',
      targetRef: 'refs/heads/phase-7',
      targetHead: 'push-head',
    },
  ];
  const projection = {
    runId: 'run-existing',
    lifecycleState: 'stopped',
    stopCause: 'work-item-blocked',
    safeCheckpoint: 'after:STORY-2',
    unstartedStoryIds: [],
    stories: {
      'STORY-1': { storyId: 'STORY-1', state: 'done' },
      'STORY-2': { storyId: 'STORY-2', state: 'blocked' },
    },
  } as unknown as RunProjection;
  const resumePlan = buildResumePlan(projection, priorEvents);
  const { sink, events } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('already closed stories should not re-execute during resume');
      },
    },
    sink,
    null,
    {
      forge: createGitHubForge({ transport: fakeTransport(calls, 'push-head') }),
    },
  );

  const status = await harness.resume(twoStoryPlan, policy, resumePlan);

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(calls, ['read-head:refs/heads/phase-7']);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'runner-action.skipped-repeated-effect' &&
        event.storyId === 'STORY-1' &&
        event.targetHead === 'push-head',
    ),
  );
});

test('P7-AC-3: a re-run against a changed head refuses to land rather than duplicating or blindly no-op-ing', async () => {
  const calls: string[] = [];
  const resumePlan: ResumePlan = {
    runId: 'run-existing',
    checkpoint: 'after:STORY-2',
    stopCause: 'work-item-blocked',
    completedStoryIds: ['STORY-1'],
    blockedStoryIds: ['STORY-2'],
    priorLandings: [
      {
        storyId: 'STORY-1',
        action: 'push',
        landingKind: 'push',
        targetRef: 'refs/heads/phase-7',
        targetHead: 'old-head',
      },
    ],
    parkedStoryId: null,
    unstartedStoryIds: [],
  };
  const { sink, events } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('head mismatch should stop before work re-executes');
      },
    },
    sink,
    null,
    {
      forge: createGitHubForge({ transport: fakeTransport(calls, 'new-head') }),
    },
  );

  const status = await harness.resume(twoStoryPlan, policy, resumePlan);

  assert.strictEqual(status, 'failure');
  assert.deepStrictEqual(calls, ['read-head:refs/heads/phase-7']);
  assert.ok(
    events.find((event) => {
      const diagnostics = event.diagnostics as { actualHead?: string } | undefined;
      return (
        event.family === 'story.blocked' &&
        event.storyId === 'STORY-1' &&
        event.reason === 'landing-head-mismatch' &&
        diagnostics?.actualHead === 'new-head'
      );
    }),
  );
  assert.strictEqual(
    events.some((event) => event.family === 'runner-action.pushed'),
    false,
  );
});

test('P7-AC-5: a blocked run with a safe branch and permission surfaces status and a failure-reason PR comment', async () => {
  const calls: string[] = [];
  const { sink, events } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'failure',
        evidence: { result: 'passed' },
        error: 'tests failed',
      }),
    },
    sink,
    null,
    {
      forge: createGitHubForge({ transport: fakeTransport(calls) }),
      blockSurface: {
        safeBranch: 'phase-7',
        canPush: true,
      },
    },
  );

  const status = await harness.run(plan, {}, policy);

  assert.strictEqual(status, 'failure');
  assert.ok(calls.includes('block-pr:STORY-1'));
  assert.ok(calls.includes('block-status:STORY-1'));
  assert.ok(calls.includes('block-comment:worker-reported-failure,tests failed'));
  assert.ok(events.find((event) => event.family === 'runner-action.posted-status' && event.storyId === 'STORY-1'));
  assert.ok(
    events.find(
      (event) =>
        event.family === 'runner-action.posted-comment' &&
        event.storyId === 'STORY-1' &&
        Array.isArray(event.failureReasons) &&
        event.failureReasons.includes('tests failed'),
    ),
  );
});

test('P7-AC-5: a blocked run with no safe branch falls back to the durable Records path rather than dropping the block', async () => {
  const calls: string[] = [];
  const { sink, events } = recordCollector();
  const forge: ForgePort = createGitHubForge({ transport: fakeTransport(calls) });
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'failure',
        evidence: { result: 'passed' },
        error: 'tests failed',
      }),
    },
    sink,
    null,
    {
      forge,
      blockSurface: {
        canPush: true,
      },
    },
  );

  const status = await harness.run(plan, {}, policy);

  assert.strictEqual(status, 'failure');
  assert.deepStrictEqual(calls, []);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' && event.storyId === 'STORY-1' && event.reason === 'worker-reported-failure',
    ),
  );
  assert.strictEqual(
    events.some((event) => event.family === 'runner-action.posted-comment'),
    false,
  );
});
