import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'vitest';
import { createJigSession, InspectRunError } from '../src/sdk.js';
import type { ConfigDoc, PlanInstance, PolicyDoc } from '../src/types.js';
import { captureWorkspaceFingerprint } from '../src/workspace.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-sdk-session',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'SDK story' }],
  },
};

const config: ConfigDoc = {
  runner: {
    mode: 'local-dry-run',
    recordDir: 'runs',
  },
};

const policy: PolicyDoc = {
  policy: {
    id: 'policy-sdk-session',
    rules: {
      allowLocalDryRun: true,
    },
  },
};

let originalCwd: string;
let workDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), 'jig-sdk-session-'));
  process.chdir(workDir);
  process.env.JIG_RECORDS_INTEGRITY_KEY = 'sdk-test-integrity-key';
  process.env.JIG_RECORDS_INTEGRITY_KEY_ID = 'sdk-test-key';
});

afterEach(() => {
  delete process.env.JIG_RECORDS_INTEGRITY_KEY;
  delete process.env.JIG_RECORDS_INTEGRITY_KEY_ID;
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
});

function scriptedOutput(outcome: 'success' | 'failure' = 'success'): Record<string, unknown> {
  return {
    storyId: 'STORY-1',
    outcome,
    evidence: {
      result: outcome === 'success' ? 'passed' : 'failed',
    },
  };
}

function firstRunDir(): string {
  const [runName] = readdirSync(join(workDir, 'runs'));
  assert.ok(runName, 'expected one run directory');
  return join(workDir, 'runs', runName);
}

function initGitWorkspace(cwd: string): void {
  execFileSync('git', ['init'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'jig test'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'jig-test@example.invalid'], { cwd, stdio: 'ignore' });
  writeFileSync(join(cwd, 'tracked.txt'), 'tracked\n');
  execFileSync('git', ['add', 'tracked.txt'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'init'], { cwd, stdio: 'ignore' });
}

test('preview returns the SDK operator projection', async () => {
  const session = createJigSession({
    realHostProbeFactory: () => ({
      run: async () => ({
        reportedIsolationStrength: 'weak',
        observedAt: '2026-07-06T09:00:00.000Z',
        freshnessWindowMs: 60_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'weak',
      }),
    }),
  });
  const preview = await session.operator.preview({
    planInstance,
    config: {},
    policy: {},
  });

  assert.deepStrictEqual(preview, {
    posture: 'run.previewed',
    planId: 'plan-sdk-session',
    policyId: 'unknown-policy',
    mode: undefined,
    stories: [{ id: 'STORY-1', title: 'SDK story' }],
  });
});

test('start writes a successful run and inspect replays authoritative events', async () => {
  const session = createJigSession({
    realHostProbeFactory: () => ({
      run: async () => ({
        reportedIsolationStrength: 'weak',
        observedAt: '2026-07-06T09:00:00.000Z',
        freshnessWindowMs: 60_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'weak',
      }),
    }),
  });
  const status = await session.operator.start({
    planInstance,
    config,
    policy,
    scriptedOutput: scriptedOutput(),
  });

  assert.strictEqual(status, 'success');

  const inspection = await session.operator.inspect({ runDir: firstRunDir() });
  assert.strictEqual(inspection.kind, 'projection');
  assert.strictEqual(inspection.projection.status, 'success');
  assert.strictEqual(inspection.projection.planId, 'plan-sdk-session');
});

test('start fails closed when work-source intake admits no valid candidates', async () => {
  const session = createJigSession({
    workSourceTransport: {
      fetchCandidates: async () => [
        {
          sourceSystem: 'github-issues',
          identifier: '201',
          planInstance: {
            plan: {
              id: 'invalid-plan',
              version: 'unknown-version',
              stories: [{ id: 'STORY-1', title: 'Invalid' }],
            },
          },
        },
      ],
    },
  });

  await assert.rejects(
    () =>
      session.operator.start({
        planInstance,
        config: {
          ...config,
          drivers: {
            workSource: 'github-issues',
          },
        },
        policy,
        scriptedOutput: scriptedOutput(),
      }),
    /No validated work-source candidate available/,
  );
});

test('start supports the real-host path and still preserves the session boundary', async () => {
  if (process.platform !== 'darwin') {
    await assert.rejects(
      () =>
        createJigSession().operator.start({
          planInstance,
          config: {
            ...config,
            drivers: {
              executionHost: 'real',
            },
          },
          policy,
          scriptedOutput: scriptedOutput(),
        }),
      /supported only on macOS/,
    );
    return;
  }

  const session = createJigSession({
    realHostProbeFactory: () => ({
      run: async () => ({
        reportedIsolationStrength: 'weak',
        observedAt: '2026-07-06T09:00:00.000Z',
        freshnessWindowMs: 60_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'weak',
      }),
    }),
  });

  const status = await session.operator.start({
    planInstance,
    config: {
      ...config,
      drivers: {
        executionHost: 'real',
      },
    },
    policy,
    scriptedOutput: scriptedOutput(),
  });

  assert.strictEqual(status, 'success');
});

test('P04-AC-3: compose-time real-host substrate rejection is recorded as a diagnosable stopped run', async () => {
  const blockedPlan: PlanInstance = {
    plan: {
      id: 'plan-sdk-compose-substrate-stop',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'STORY-1', title: 'Blocked before execution' },
        { id: 'STORY-2', title: 'Never started' },
      ],
    },
  };
  const session = createJigSession({
    substrateManifest: {
      id: 'real-driver-substrate',
      runtimes: ['node'],
      argv: [],
      credentials: [],
      egress: [],
    },
    realHostProbeFactory: () => ({
      substrateRequests: [{ kind: 'argv', value: ['node', 'unexpected-probe'] }],
      run: async () => {
        assert.fail('compose-time substrate rejection should prevent probe execution');
      },
    }),
  });

  const status = await session.operator.start({
    planInstance: blockedPlan,
    config: {
      ...config,
      drivers: {
        executionHost: 'real',
      },
    },
    policy,
    scriptedOutput: scriptedOutput(),
  });

  assert.strictEqual(status, 'failure');

  const runDir = firstRunDir();
  assert.ok(existsSync(join(runDir, 'events.jsonl')));
  assert.ok(existsSync(join(runDir, 'run.json')));

  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map(
      (line) =>
        JSON.parse(line) as {
          family: string;
          storyId?: string;
          reason?: string;
          checkpoint?: string;
          unstarted?: string[];
          diagnostics?: { error?: string };
          substrateManifest?: { path?: string };
        },
    );
  assert.strictEqual(events[0]?.family, 'run.started');
  assert.ok(events[0]?.substrateManifest?.path);
  assert.ok(existsSync(events[0]?.substrateManifest?.path ?? ''));
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' &&
        event.storyId === 'STORY-1' &&
        event.reason === 'substrate-escalation' &&
        /substrate-escalation/.test(event.diagnostics?.error ?? ''),
    ),
  );
  const stopped = events.find((event) => event.family === 'run.stopped');
  assert.ok(stopped);
  assert.strictEqual(stopped.reason, 'work-item-blocked');
  assert.strictEqual(stopped.checkpoint, 'after:STORY-1');
  assert.deepStrictEqual(stopped.unstarted, ['STORY-2']);

  const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as { run: { status: string } };
  assert.strictEqual(runRecord.run.status, 'failure');

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'projection');
  assert.strictEqual(inspection.projection.status, 'failure');
});

test('P04-AC-4: the real-host run path allocates isolated per-story workspaces', async () => {
  if (process.platform !== 'darwin') {
    return;
  }

  const isolatedPlan: PlanInstance = {
    plan: {
      id: 'plan-sdk-session-real-host-isolation',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'STORY-1', title: 'first' },
        { id: 'STORY-2', title: 'second' },
      ],
    },
  };
  const seenWorkspacePaths: string[] = [];
  const session = createJigSession({
    realHostProbeFactory: () => ({
      run: async () => ({
        reportedIsolationStrength: 'weak',
        observedAt: '2026-07-06T09:00:00.000Z',
        freshnessWindowMs: 60_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'weak',
      }),
    }),
    codexSession: {
      run: async (story) => {
        const workspace = story.workspace as { path?: string } | undefined;
        seenWorkspacePaths.push(workspace?.path ?? 'missing');
        return {
          status: 'completed' as const,
          workerResult: {
            storyId: story.id,
            outcome: 'success',
            evidence: { result: 'passed' },
          },
        };
      },
    },
  });

  const status = await session.operator.start({
    planInstance: isolatedPlan,
    config: {
      ...config,
      drivers: {
        agent: 'codex',
        executionHost: 'real',
      },
    },
    policy,
    scriptedOutput: scriptedOutput(),
  });

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(seenWorkspacePaths.map((path) => path.slice(path.indexOf('/.jig-workspaces/'))).sort(), [
    '/.jig-workspaces/STORY-1',
    '/.jig-workspaces/STORY-2',
  ]);
});

test('inspect ignores an unreadable run.json cache when events remain authoritative', async () => {
  const session = createJigSession();
  await session.operator.start({
    planInstance,
    config,
    policy,
    scriptedOutput: scriptedOutput(),
  });

  const runDir = firstRunDir();
  writeFileSync(join(runDir, 'run.json'), '{not-json');

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'projection');
  assert.match(inspection.cacheParseError ?? '', /run\.json cache unreadable and ignored/);
});

test('inspect falls back to legacy mode when only run.json exists', async () => {
  const session = createJigSession();
  await session.operator.start({
    planInstance,
    config,
    policy,
    scriptedOutput: scriptedOutput(),
  });

  const runDir = firstRunDir();
  unlinkSync(join(runDir, 'events.jsonl'));

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'legacy');
  assert.strictEqual(inspection.runRecord.run.status, 'success');
});

test('inspect falls back to legacy mode when authoritative events are missing launch metadata', async () => {
  const session = createJigSession();
  await session.operator.start({
    planInstance,
    config,
    policy,
    scriptedOutput: scriptedOutput(),
  });

  const runDir = firstRunDir();
  const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as { run: { id: string } };
  writeFileSync(
    join(runDir, 'events.jsonl'),
    `${JSON.stringify({
      family: 'run.started',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:00.000Z',
      runId: runRecord.run.id,
      planId: 'plan-sdk-session',
    })}\n`,
  );

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'legacy');
});

test('inspect adds resume diagnostics for changed-basis stopped runs', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'stopped-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    `${[
      {
        family: 'run.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.000Z',
        runId: 'run-sdk-stopped',
        planId: 'plan-sdk-session',
        mode: 'local-dry-run',
        binding: {
          policyRef: 'policy-sdk-session',
          configRef: 'mode=local-dry-run;recordDir=runs',
          workspace: {
            kind: 'unavailable',
            reason: 'not-a-git-worktree',
            detail: 'workspace fingerprint unavailable outside a git worktree',
          },
        },
        posture: { record: 'safe-for-owner-record', export: 'redacted' },
        planSnapshot: { ref: 'plan.snapshot.json' },
        policySnapshot: { ref: 'policy.snapshot.json' },
      },
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.500Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.750Z',
        storyId: 'STORY-1',
        reason: 'worker-reported-failure',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        reason: 'work-item-blocked',
        checkpoint: 'after:STORY-1',
        unstarted: ['STORY-2'],
      },
    ]
      .map((event) => JSON.stringify(event))
      .join('\n')}\n`,
  );

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'projection');
  assert.strictEqual(inspection.resumeDiagnostics[0]?.code, 'resume-blocked-workspace-mismatch');
});

test('inspect adds resume diagnostics for a real changed-basis git workspace', async () => {
  initGitWorkspace(workDir);
  const session = createJigSession();
  const runDir = join(workDir, 'git-stopped-run');
  mkdirSync(runDir, { recursive: true });
  const workspace = captureWorkspaceFingerprint(process.cwd());
  assert.ok('repoRoot' in workspace);
  writeFileSync(
    join(runDir, 'events.jsonl'),
    `${[
      {
        family: 'run.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.000Z',
        runId: 'run-sdk-git-stopped',
        planId: 'plan-sdk-session',
        mode: 'local-dry-run',
        binding: {
          policyRef: 'policy-sdk-session',
          configRef: 'mode=local-dry-run;recordDir=runs',
          workspace: { ...workspace, changeSetHash: 'different-hash' },
        },
        posture: { record: 'safe-for-owner-record', export: 'redacted' },
        planSnapshot: { ref: 'plan.snapshot.json' },
        policySnapshot: { ref: 'policy.snapshot.json' },
      },
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.500Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.750Z',
        storyId: 'STORY-1',
        reason: 'worker-reported-failure',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        reason: 'work-item-blocked',
        checkpoint: 'after:STORY-1',
        unstarted: [],
      },
    ]
      .map((event) => JSON.stringify(event))
      .join('\n')}\n`,
  );

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'projection');
  assert.strictEqual(inspection.resumeDiagnostics[0]?.code, 'resume-blocked-missing-approval');
});

test('inspect leaves resume diagnostics empty when a stopped git workspace is still continuous', async () => {
  initGitWorkspace(workDir);
  const session = createJigSession();
  const runDir = mkdtempSync(join(tmpdir(), 'jig-sdk-continuous-run-'));
  const workspace = captureWorkspaceFingerprint(process.cwd());
  assert.ok('repoRoot' in workspace);
  try {
    writeFileSync(
      join(runDir, 'events.jsonl'),
      `${[
        {
          family: 'run.started',
          actor: 'runner',
          timestamp: '2026-07-03T09:00:00.000Z',
          runId: 'run-sdk-git-continuous',
          planId: 'plan-sdk-session',
          mode: 'local-dry-run',
          binding: {
            policyRef: 'policy-sdk-session',
            configRef: 'mode=local-dry-run;recordDir=runs',
            workspace,
          },
          posture: { record: 'safe-for-owner-record', export: 'redacted' },
          planSnapshot: { ref: 'plan.snapshot.json' },
          policySnapshot: { ref: 'policy.snapshot.json' },
        },
        {
          family: 'story.started',
          actor: 'runner',
          timestamp: '2026-07-03T09:00:00.500Z',
          storyId: 'STORY-1',
        },
        {
          family: 'story.blocked',
          actor: 'runner',
          timestamp: '2026-07-03T09:00:00.750Z',
          storyId: 'STORY-1',
          reason: 'worker-reported-failure',
        },
        {
          family: 'run.stopped',
          actor: 'runner',
          timestamp: '2026-07-03T09:00:01.000Z',
          reason: 'work-item-blocked',
          checkpoint: 'after:STORY-1',
          unstarted: [],
        },
      ]
        .map((event) => JSON.stringify(event))
        .join('\n')}\n`,
    );

    const inspection = await session.operator.inspect({ runDir });
    assert.strictEqual(inspection.kind, 'projection');
    assert.deepStrictEqual(inspection.resumeDiagnostics, []);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test('inspect fails closed for missing directories', async () => {
  const session = createJigSession();

  await assert.rejects(
    () => session.operator.inspect({ runDir: join(workDir, 'missing-run') }),
    /Run directory ".*missing-run" does not exist/,
  );
});

test('inspect fails closed when a run directory has neither events nor run.json', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'empty-run');
  mkdirSync(runDir, { recursive: true });

  await assert.rejects(() => session.operator.inspect({ runDir }), /Neither events\.jsonl nor run\.json found/);
});

test('inspect fails closed when authoritative events are present but empty', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'empty-events-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), '');

  await assert.rejects(() => session.operator.inspect({ runDir }), /Failed to inspect authoritative events\.jsonl/);
});

test('inspect surfaces a parse failure when only an invalid run.json is present', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'broken-legacy');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'run.json'), '{not-json');

  await assert.rejects(() => session.operator.inspect({ runDir }), /Failed to parse run\.json/);
});

test('inspect throws InspectRunError when authoritative events are malformed', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'malformed-events');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), '{"bad-json"\n');

  await assert.rejects(
    () => session.operator.inspect({ runDir }),
    (error: unknown) => error instanceof InspectRunError,
  );
});
