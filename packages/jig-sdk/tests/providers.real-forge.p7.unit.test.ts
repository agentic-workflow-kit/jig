import assert from 'node:assert';
import { test } from 'vitest';
import { LocalHarness } from '../src/harness.js';
import { validatePlanForScheduling } from '../src/intake.js';
import type { AgentPort, ForgePort, LandingAction, LandingRequest } from '../src/ports.js';
import type { RunProjection } from '../src/projection.js';
import {
  type CommandExecutor,
  createGitHubCommandTransport,
  createGitHubForge,
  type GitHubForgeEffect,
  type GitHubForgeTransport,
} from '../src/providers/real/forge.js';
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

function commandExecutor(respond: (file: string, args: string[], callIndex: number) => string): {
  calls: Array<{ file: string; args: string[] }>;
  execute: CommandExecutor;
} {
  const calls: Array<{ file: string; args: string[] }> = [];
  return {
    calls,
    execute: async (file, args) => {
      calls.push({ file, args });
      return {
        stdout: respond(file, args, calls.length - 1),
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

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

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

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

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

test('P7-AC-1: command transport creates an open-pr without --json and reads PR fields with gh pr view', async () => {
  const { calls, execute } = commandExecutor((file, args) => {
    if (file === 'git' && args.join(' ') === 'rev-parse --abbrev-ref HEAD') return 'phase-7\n';
    if (file === 'git' && args.join(' ') === 'rev-parse HEAD') return 'head-before-pr\n';
    if (file === 'gh' && args.join(' ') === 'pr create --fill') return 'https://github.example/pull/7\n';
    if (
      file === 'gh' &&
      args.join(' ') === 'pr view https://github.example/pull/7 --json number,url,headRefName,headRefOid,baseRefName'
    ) {
      return JSON.stringify({
        number: 7,
        url: 'https://github.example/pull/7',
        headRefName: 'phase-7',
        headRefOid: 'head-after-pr',
      });
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const outcome = await createGitHubCommandTransport(execute).openPullRequest({
    storyId: 'STORY-1',
    action: 'open-pr',
  });

  assert.deepStrictEqual(
    calls.map((call) => [call.file, call.args]),
    [
      ['git', ['rev-parse', '--abbrev-ref', 'HEAD']],
      ['git', ['rev-parse', 'HEAD']],
      ['gh', ['pr', 'create', '--fill']],
      [
        'gh',
        ['pr', 'view', 'https://github.example/pull/7', '--json', 'number,url,headRefName,headRefOid,baseRefName'],
      ],
    ],
  );
  assert.strictEqual(outcome.targetRef, 'refs/heads/phase-7');
  assert.strictEqual(outcome.targetHead, 'head-after-pr');
  assert.strictEqual(outcome.prUrl, 'https://github.example/pull/7');
});

test('P7-AC-5: command transport creates a block PR without --json and reads PR fields with gh pr view', async () => {
  const { calls, execute } = commandExecutor((file, args) => {
    if (file === 'git' && args.join(' ') === 'rev-parse HEAD') return 'block-head-before-pr\n';
    if (file === 'git' && args.join(' ') === 'push origin HEAD:phase-7') return '';
    if (file === 'gh' && args.join(' ') === 'pr view phase-7 --json number,url,headRefName,headRefOid,baseRefName') {
      throw new Error('no existing PR');
    }
    if (file === 'gh' && args.join(' ') === 'pr create --fill --head phase-7') {
      return 'https://github.example/pull/8\n';
    }
    if (
      file === 'gh' &&
      args.join(' ') === 'pr view https://github.example/pull/8 --json number,url,headRefName,headRefOid,baseRefName'
    ) {
      return JSON.stringify({
        number: 8,
        url: 'https://github.example/pull/8',
        headRefName: 'phase-7',
        headRefOid: 'block-head-after-pr',
      });
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const outcome = await createGitHubCommandTransport(execute).openOrUpdatePullRequestForBlock({
    storyId: 'STORY-1',
    reason: 'worker-reported-failure',
    failureReasons: ['worker-reported-failure'],
    safeBranch: 'phase-7',
    canPush: true,
  });

  assert.deepStrictEqual(
    calls.map((call) => [call.file, call.args]),
    [
      ['git', ['rev-parse', 'HEAD']],
      ['git', ['push', 'origin', 'HEAD:phase-7']],
      ['gh', ['pr', 'view', 'phase-7', '--json', 'number,url,headRefName,headRefOid,baseRefName']],
      ['gh', ['pr', 'create', '--fill', '--head', 'phase-7']],
      [
        'gh',
        ['pr', 'view', 'https://github.example/pull/8', '--json', 'number,url,headRefName,headRefOid,baseRefName'],
      ],
    ],
  );
  assert.strictEqual(outcome.targetRef, 'refs/heads/phase-7');
  assert.strictEqual(outcome.targetHead, 'block-head-after-pr');
});

test('P7-AC-3: command transport records merge landing against the post-merge base ref and head', async () => {
  const { calls, execute } = commandExecutor((file, args) => {
    if (file === 'gh' && args.join(' ') === 'pr view --json number,url,headRefName,headRefOid,baseRefName') {
      return JSON.stringify({
        number: 7,
        url: 'https://github.example/pull/7',
        baseRefName: 'main',
        headRefName: 'phase-7',
        headRefOid: 'head-before-merge',
      });
    }
    if (file === 'gh' && args.join(' ') === 'pr merge --squash --delete-branch=false') return '';
    if (file === 'git' && args.join(' ') === 'ls-remote --heads origin refs/heads/main') {
      return 'base-head-after-merge refs/heads/main\n';
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const outcome = await createGitHubCommandTransport(execute).mergePullRequest({
    storyId: 'STORY-1',
    action: 'merge',
  });

  assert.deepStrictEqual(
    calls.map((call) => [call.file, call.args]),
    [
      ['gh', ['pr', 'view', '--json', 'number,url,headRefName,headRefOid,baseRefName']],
      ['gh', ['pr', 'merge', '--squash', '--delete-branch=false']],
      ['git', ['ls-remote', '--heads', 'origin', 'refs/heads/main']],
    ],
  );
  assert.strictEqual(outcome.targetRef, 'refs/heads/main');
  assert.strictEqual(outcome.targetHead, 'base-head-after-merge');
});

test('P05 MERGE-4: command transport classifies merge-queue holds as done-not-landed against the exact PR head', async () => {
  const { calls, execute } = commandExecutor((file, args) => {
    if (file === 'gh' && args.join(' ') === 'pr view --json number,url,headRefName,headRefOid,baseRefName') {
      return JSON.stringify({
        number: 7,
        url: 'https://github.example/pull/7',
        baseRefName: 'main',
        headRefName: 'phase-7',
        headRefOid: 'pr-head-before-queue',
      });
    }
    if (file === 'gh' && args.join(' ') === 'pr merge --squash --delete-branch=false') {
      return 'Pull request queued for merge in the merge queue.\n';
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const outcome = await createGitHubCommandTransport(execute).mergePullRequest({
    storyId: 'STORY-1',
    action: 'merge',
  });

  assert.deepStrictEqual(
    calls.map((call) => [call.file, call.args]),
    [
      ['gh', ['pr', 'view', '--json', 'number,url,headRefName,headRefOid,baseRefName']],
      ['gh', ['pr', 'merge', '--squash', '--delete-branch=false']],
    ],
  );
  assert.strictEqual(outcome.targetRef, 'refs/heads/phase-7');
  assert.strictEqual(outcome.targetHead, 'pr-head-before-queue');
  assert.strictEqual(outcome.mergeability, 'held-by-merge-queue');
});

test('P05 MERGE-4: command transport classifies branch-protection holds and falls back to the local head when PR head fields are absent', async () => {
  const { calls, execute } = commandExecutor((file, args) => {
    if (file === 'gh' && args.join(' ') === 'pr view --json number,url,headRefName,headRefOid,baseRefName') {
      return JSON.stringify({
        number: 9,
        url: 'https://github.example/pull/9',
        baseRefName: 'main',
      });
    }
    if (file === 'git' && args.join(' ') === 'rev-parse --abbrev-ref HEAD') return 'phase-9\n';
    if (file === 'git' && args.join(' ') === 'rev-parse HEAD') return 'local-head-for-review-hold\n';
    if (file === 'gh' && args.join(' ') === 'pr merge --squash --delete-branch=false') {
      throw new Error('protected branch update failed: required review required before merge');
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const outcome = await createGitHubCommandTransport(execute).mergePullRequest({
    storyId: 'STORY-1',
    action: 'merge',
  });

  assert.deepStrictEqual(
    calls.map((call) => [call.file, call.args]),
    [
      ['gh', ['pr', 'view', '--json', 'number,url,headRefName,headRefOid,baseRefName']],
      ['git', ['rev-parse', '--abbrev-ref', 'HEAD']],
      ['git', ['rev-parse', 'HEAD']],
      ['gh', ['pr', 'merge', '--squash', '--delete-branch=false']],
    ],
  );
  assert.strictEqual(outcome.targetRef, 'refs/heads/phase-9');
  assert.strictEqual(outcome.targetHead, 'local-head-for-review-hold');
  assert.strictEqual(outcome.mergeability, 'held-by-review');
});

test('P05 MERGE-4: command transport classifies merge conflicts as held done-not-landed instead of a hard merge failure', async () => {
  const { execute } = commandExecutor((file, args) => {
    if (file === 'gh' && args.join(' ') === 'pr view --json number,url,headRefName,headRefOid,baseRefName') {
      return JSON.stringify({
        number: 10,
        url: 'https://github.example/pull/10',
        baseRefName: 'main',
        headRefName: 'phase-10',
        headRefOid: 'conflict-head',
      });
    }
    if (file === 'gh' && args.join(' ') === 'pr merge --squash --delete-branch=false') {
      throw new Error('Pull request cannot be merged cleanly because of a merge conflict');
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const outcome = await createGitHubCommandTransport(execute).mergePullRequest({
    storyId: 'STORY-1',
    action: 'merge',
  });

  assert.strictEqual(outcome.targetRef, 'refs/heads/phase-10');
  assert.strictEqual(outcome.targetHead, 'conflict-head');
  assert.strictEqual(outcome.mergeability, 'held-by-conflict');
});

test('P7-AC-1: command transport pushes HEAD to the current branch without live GitHub', async () => {
  const { calls, execute } = commandExecutor((file, args) => {
    if (file === 'git' && args.join(' ') === 'rev-parse --abbrev-ref HEAD') return 'phase-7\n';
    if (file === 'git' && args.join(' ') === 'rev-parse HEAD') return 'push-head\n';
    if (file === 'git' && args.join(' ') === 'push origin HEAD:phase-7') return '';
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const outcome = await createGitHubCommandTransport(execute).push({
    storyId: 'STORY-1',
    action: 'push',
  });

  assert.deepStrictEqual(
    calls.map((call) => [call.file, call.args]),
    [
      ['git', ['rev-parse', '--abbrev-ref', 'HEAD']],
      ['git', ['rev-parse', 'HEAD']],
      ['git', ['push', 'origin', 'HEAD:phase-7']],
    ],
  );
  assert.strictEqual(outcome.targetRef, 'refs/heads/phase-7');
  assert.strictEqual(outcome.targetHead, 'push-head');
});

test('P7-AC-3: command transport readHead re-reads the requested target ref from the authoritative hosted remote', async () => {
  const { calls, execute } = commandExecutor((file, args) => {
    if (file === 'git' && args.join(' ') === 'ls-remote --heads origin refs/heads/main') {
      return 'main-head refs/heads/main\n';
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const outcome = await createGitHubCommandTransport(execute).readHead({
    targetRef: 'refs/heads/main',
  });

  assert.deepStrictEqual(
    calls.map((call) => [call.file, call.args]),
    [['git', ['ls-remote', '--heads', 'origin', 'refs/heads/main']]],
  );
  assert.strictEqual(outcome.targetRef, 'refs/heads/main');
  assert.strictEqual(outcome.targetHead, 'main-head');
});

test('P7-AC-3: command transport verifyLanding ignores a stale matching local ref and uses the hosted remote head', async () => {
  const { calls, execute } = commandExecutor((file, args) => {
    if (file === 'git' && args.join(' ') === 'ls-remote --heads origin refs/heads/main') {
      return 'remote-new-head refs/heads/main\n';
    }
    if (file === 'git' && args.join(' ') === 'rev-parse refs/heads/main') {
      return 'local-stale-head\n';
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const forge = createGitHubForge({ transport: createGitHubCommandTransport(execute) });
  assert.ok(forge.verifyLanding, 'expected GitHub forge to expose verifyLanding');
  const verification = await forge.verifyLanding({
    storyId: 'STORY-1',
    action: 'merge',
    landingKind: 'merge',
    targetRef: 'refs/heads/main',
    targetHead: 'local-stale-head',
  });

  assert.deepStrictEqual(
    calls.map((call) => [call.file, call.args]),
    [['git', ['ls-remote', '--heads', 'origin', 'refs/heads/main']]],
  );
  assert.deepStrictEqual(verification, {
    status: 'mismatched',
    targetRef: 'refs/heads/main',
    expectedHead: 'local-stale-head',
    actualHead: 'remote-new-head',
  });
});

test('P7-AC-3: command transport refuses a merge landing when the PR base ref is unavailable', async () => {
  const { execute } = commandExecutor((file, args) => {
    if (file === 'gh' && args.join(' ') === 'pr view --json number,url,headRefName,headRefOid,baseRefName') {
      return JSON.stringify({ number: 7, url: 'https://github.example/pull/7' });
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  await assert.rejects(
    createGitHubCommandTransport(execute).mergePullRequest({
      storyId: 'STORY-1',
      action: 'merge',
    }),
    /forge-transport-missing-base-ref/,
  );
});

test('P7-AC-5: command transport updates an existing block PR and posts status and comment hermetically', async () => {
  const { calls, execute } = commandExecutor((file, args) => {
    if (file === 'git' && args.join(' ') === 'rev-parse --abbrev-ref HEAD') return 'phase-7\n';
    if (file === 'git' && args.join(' ') === 'rev-parse HEAD') return 'block-head\n';
    if (file === 'git' && args.join(' ') === 'push origin HEAD:phase-7') return '';
    if (file === 'gh' && args.join(' ') === 'pr view phase-7 --json number,url,headRefName,headRefOid,baseRefName') {
      return JSON.stringify({
        number: 8,
        url: 'https://github.example/pull/8',
        headRefName: 'phase-7',
        headRefOid: 'block-pr-head',
      });
    }
    if (
      file === 'gh' &&
      args.join(' ') ===
        'api repos/:owner/:repo/statuses/block-head -f state=failure -f context=jig/block -f description=worker-reported-failure'
    ) {
      return '';
    }
    if (file === 'gh' && args.join(' ') === 'pr comment phase-7 --body worker-reported-failure\ntests failed') {
      return '';
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });
  const transport = createGitHubCommandTransport(execute);
  const request = {
    storyId: 'STORY-1',
    reason: 'worker-reported-failure',
    failureReasons: ['worker-reported-failure', 'tests failed'],
    canPush: true,
  };

  const pr = await transport.openOrUpdatePullRequestForBlock(request);
  const status = await transport.postBlockStatus(request);
  const comment = await transport.postBlockComment(request);

  assert.deepStrictEqual(
    calls.map((call) => [call.file, call.args]),
    [
      ['git', ['rev-parse', '--abbrev-ref', 'HEAD']],
      ['git', ['rev-parse', 'HEAD']],
      ['git', ['push', 'origin', 'HEAD:phase-7']],
      ['gh', ['pr', 'view', 'phase-7', '--json', 'number,url,headRefName,headRefOid,baseRefName']],
      ['git', ['rev-parse', '--abbrev-ref', 'HEAD']],
      ['git', ['rev-parse', 'HEAD']],
      [
        'gh',
        [
          'api',
          'repos/:owner/:repo/statuses/block-head',
          '-f',
          'state=failure',
          '-f',
          'context=jig/block',
          '-f',
          'description=worker-reported-failure',
        ],
      ],
      ['git', ['rev-parse', '--abbrev-ref', 'HEAD']],
      ['git', ['rev-parse', 'HEAD']],
      ['gh', ['pr', 'comment', 'phase-7', '--body', 'worker-reported-failure\ntests failed']],
    ],
  );
  assert.strictEqual(pr.targetRef, 'refs/heads/phase-7');
  assert.strictEqual(pr.targetHead, 'block-pr-head');
  assert.strictEqual(status.targetRef, 'refs/heads/phase-7');
  assert.strictEqual(comment.targetHead, 'block-head');
});

test('P7-AC-1: command transport falls back to local branch and head when PR view omits optional fields', async () => {
  const { calls, execute } = commandExecutor((file, args) => {
    if (file === 'git' && args.join(' ') === 'rev-parse --abbrev-ref HEAD') return 'phase-7\n';
    if (file === 'git' && args.join(' ') === 'rev-parse HEAD') return 'local-head\n';
    if (file === 'gh' && args.join(' ') === 'pr create --fill') return '\n';
    if (file === 'gh' && args.join(' ') === 'pr view phase-7 --json number,url,headRefName,headRefOid,baseRefName') {
      return JSON.stringify({});
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  const outcome = await createGitHubCommandTransport(execute).openPullRequest({
    storyId: 'STORY-1',
    action: 'open-pr',
  });

  assert.deepStrictEqual(calls.at(-1), {
    file: 'gh',
    args: ['pr', 'view', 'phase-7', '--json', 'number,url,headRefName,headRefOid,baseRefName'],
  });
  assert.strictEqual(outcome.targetRef, 'refs/heads/phase-7');
  assert.strictEqual(outcome.targetHead, 'local-head');
  assert.strictEqual(outcome.prNumber, undefined);
  assert.strictEqual(outcome.prUrl, undefined);
});

test('P7-AC-1: command transport reports invalid gh JSON as an explicit transport failure', async () => {
  const { execute } = commandExecutor((file, args) => {
    if (file === 'git' && args.join(' ') === 'rev-parse --abbrev-ref HEAD') return 'phase-7\n';
    if (file === 'git' && args.join(' ') === 'rev-parse HEAD') return 'local-head\n';
    if (file === 'gh' && args.join(' ') === 'pr create --fill') return 'https://github.example/pull/7\n';
    if (
      file === 'gh' &&
      args.join(' ') === 'pr view https://github.example/pull/7 --json number,url,headRefName,headRefOid,baseRefName'
    ) {
      return 'not-json';
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  });

  await assert.rejects(
    createGitHubCommandTransport(execute).openPullRequest({
      storyId: 'STORY-1',
      action: 'open-pr',
    }),
    /forge-transport-invalid-json/,
  );
});

test('P7-AC-2: an unknown action fails closed', async () => {
  const forge = createGitHubForge({ transport: fakeTransport([]) });

  await assert.rejects(async () => {
    await forge.land({ storyId: 'STORY-1', action: 'delete-branch' as never });
  }, /forge-unknown-action/);
});

test('P05 MERGE-4: a held merge records done-not-landed instead of forcing merge failure', async () => {
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
      forge: createGitHubForge({
        transport: {
          ...fakeTransport([]),
          mergePullRequest: async () => ({
            targetRef: 'refs/heads/phase-7',
            targetHead: 'merge-held-head',
            prNumber: 7,
            prUrl: 'https://github.example/pull/7',
            mergeability: 'held-by-review',
          }),
        },
      }),
      landingAction: 'merge',
    },
  );

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.done' &&
        event.storyId === 'STORY-1' &&
        event.mergeability === 'held-by-review' &&
        event.targetHead === 'merge-held-head',
    ),
  );
  assert.strictEqual(
    events.some((event) => event.family === 'runner-action.merged'),
    false,
  );
});

test('P05 MERGE-5: base branch policy refusal is classified as review-held before conflict wording', async () => {
  const execute: CommandExecutor = async (file, args) => {
    if (file === 'gh' && args.join(' ') === 'pr view --json number,url,headRefName,headRefOid,baseRefName') {
      return {
        stdout: JSON.stringify({
          number: 18,
          url: 'https://github.example/pull/18',
          headRefName: 'phase-7',
          headRefOid: 'held-head',
          baseRefName: 'main',
        }),
      };
    }

    if (file === 'gh' && args.join(' ') === 'pr merge --squash --delete-branch=false') {
      throw new Error(
        [
          'Command failed: gh pr merge --squash --delete-branch=false',
          'X Pull request agentic-workflow-kit/jig-smoke-target#18 is not mergeable: the base branch policy prohibits the merge.',
          'To have the pull request merged after all the requirements have been met, add the `--auto` flag.',
        ].join('\n'),
      );
    }

    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  };

  const outcome = await createGitHubCommandTransport(execute).mergePullRequest({
    storyId: 'STORY-1',
    action: 'merge',
  });

  assert.strictEqual(outcome.mergeability, 'held-by-review');
  assert.strictEqual(outcome.targetHead, 'held-head');
});

test('P05 MERGE-5: approving-review GraphQL refusal is classified as review-held', async () => {
  const execute: CommandExecutor = async (file, args) => {
    if (file === 'gh' && args.join(' ') === 'pr view --json number,url,headRefName,headRefOid,baseRefName') {
      return {
        stdout: JSON.stringify({
          number: 19,
          url: 'https://github.example/pull/19',
          headRefName: 'phase-7',
          headRefOid: 'review-held-head',
          baseRefName: 'main',
        }),
      };
    }

    if (file === 'gh' && args.join(' ') === 'pr merge --squash --delete-branch=false') {
      throw new Error(
        [
          'Command failed: gh pr merge --squash --delete-branch=false',
          'GraphQL: At least 1 approving review is required by reviewers with write access. (mergePullRequest)',
        ].join('\n'),
      );
    }

    throw new Error(`unexpected command: ${file} ${args.join(' ')}`);
  };

  const outcome = await createGitHubCommandTransport(execute).mergePullRequest({
    storyId: 'STORY-1',
    action: 'merge',
  });

  assert.strictEqual(outcome.mergeability, 'held-by-review');
  assert.strictEqual(outcome.targetHead, 'review-held-head');
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

  const status = await harness.resume(validatePlanForScheduling(twoStoryPlan), policy, resumePlan);

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

  const status = await harness.resume(validatePlanForScheduling(twoStoryPlan), policy, resumePlan);

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

test('P05 MERGE-4: a held merge retries on resume when the recorded head still matches', async () => {
  const calls: string[] = [];
  const resumePlan: ResumePlan = {
    runId: 'run-held-merge',
    checkpoint: 'after:STORY-1',
    stopCause: 'work-item-blocked',
    completedStoryIds: [],
    blockedStoryIds: [],
    pendingLandings: [
      {
        storyId: 'STORY-1',
        action: 'merge',
        landingKind: 'merge',
        targetRef: 'refs/heads/phase-7',
        targetHead: 'merge-held-head',
        mergeability: 'held-by-review',
      },
    ],
    parkedStoryId: null,
    unstartedStoryIds: [],
  };
  const { sink, events } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('held merge retry should not re-run worker execution');
      },
    },
    sink,
    null,
    {
      forge: createGitHubForge({ transport: fakeTransport(calls, 'merge-held-head') }),
    },
  );

  const status = await harness.resume(validatePlanForScheduling(plan), policy, resumePlan);

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(calls, ['read-head:refs/heads/phase-7', 'merge:STORY-1']);
  assert.ok(events.find((event) => event.family === 'runner-action.merged' && event.storyId === 'STORY-1'));
});

test('P05 MERGE-4: resume stops retrying later pending landings after the first mismatch', async () => {
  const calls: string[] = [];
  const resumePlan: ResumePlan = {
    runId: 'run-held-merge-mismatch',
    checkpoint: 'after:STORY-1',
    stopCause: 'work-item-blocked',
    completedStoryIds: [],
    blockedStoryIds: [],
    pendingLandings: [
      {
        storyId: 'STORY-1',
        action: 'merge',
        landingKind: 'merge',
        targetRef: 'refs/heads/phase-7',
        targetHead: 'stale-head',
        mergeability: 'held-by-review',
      },
      {
        storyId: 'STORY-2',
        action: 'merge',
        landingKind: 'merge',
        targetRef: 'refs/heads/phase-8',
        targetHead: 'second-held-head',
        mergeability: 'held-by-review',
      },
    ],
    parkedStoryId: null,
    unstartedStoryIds: [],
  };
  const { sink, events } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('pending landing retries should not re-run worker execution');
      },
    },
    sink,
    null,
    {
      forge: createGitHubForge({
        transport: {
          ...fakeTransport(calls, 'fresh-head'),
          readHead: async (request) => {
            calls.push(`read-head:${request.targetRef}`);
            if (request.targetRef === 'refs/heads/phase-7') {
              return {
                targetRef: request.targetRef,
                targetHead: 'fresh-head',
              };
            }
            return {
              targetRef: request.targetRef,
              targetHead: 'second-held-head',
            };
          },
          mergePullRequest: async (request) => {
            calls.push(`merge:${request.storyId}`);
            return {
              targetRef: 'refs/heads/main',
              targetHead: 'merged-head',
            };
          },
        },
      }),
    },
  );

  const status = await harness.resume(validatePlanForScheduling(twoStoryPlan), policy, resumePlan);

  assert.strictEqual(status, 'failure');
  assert.deepStrictEqual(calls, ['read-head:refs/heads/phase-7']);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' && event.storyId === 'STORY-1' && event.reason === 'landing-head-mismatch',
    ),
  );
  assert.strictEqual(
    events.some((event) => event.family === 'runner-action.merged' && event.storyId === 'STORY-2'),
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

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

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

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

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

test('P7-AC-5: a block surfacing failure records a diagnostic fallback and still finalizes the stopped run', async () => {
  const events: RunEvent[] = [];
  let finalizedStatus: string | undefined;
  const forge: ForgePort = {
    land: () => ({
      family: 'runner-action.skipped-on-dry-run',
    }),
    surfaceBlock: async () => {
      throw new Error('gh pr comment failed');
    },
  };
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'failure',
        evidence: { result: 'passed' },
        error: 'tests failed',
      }),
    },
    {
      init: () => {},
      recordEvent: (event: RunEvent) => events.push(event),
      finalize: async (status) => {
        finalizedStatus = status;
      },
    },
    null,
    {
      forge,
      blockSurface: {
        safeBranch: 'phase-7',
        canPush: true,
      },
    },
  );

  const status = await harness.run(validatePlanForScheduling(plan), {}, policy);

  assert.strictEqual(status, 'failure');
  assert.strictEqual(finalizedStatus, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' && event.storyId === 'STORY-1' && event.reason === 'worker-reported-failure',
    ),
  );
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' &&
        event.storyId === 'STORY-1' &&
        event.reason === 'pr-surfacing-failed' &&
        event.diagnostics?.error === 'gh pr comment failed' &&
        event.diagnostics?.originalReason === 'worker-reported-failure',
    ),
  );
  assert.ok(events.find((event) => event.family === 'run.stopped' && event.checkpoint === 'after:STORY-1'));
});
