import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Plan, PolicyDoc, RunEvent, RunRecord } from '@agentic-workflow-kit/jig-sdk';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createOwnerDecisionSource, run } from '../src/cli.js';

interface GitWorkspaceFingerprint {
  kind: 'git';
  repoRoot: string;
  head: string;
  changeSetHash: string;
}

interface UnavailableWorkspaceFingerprint {
  kind: 'unavailable';
  reason: 'git-command-failed' | 'not-a-git-worktree' | 'git-unavailable';
  detail: string;
}

type WorkspaceFingerprint = GitWorkspaceFingerprint | UnavailableWorkspaceFingerprint;

const CLEAN_WORKSPACE_CHANGESET_SENTINEL = 'git-tree-clean';
const INTEGRITY_KEY_ENV = 'JIG_RECORDS_INTEGRITY_KEY';
const INTEGRITY_KEY_ID_ENV = 'JIG_RECORDS_INTEGRITY_KEY_ID';

function runGit(cwd: string, args: string[]) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error) {
    return { ok: false as const, stderr: result.error.message };
  }
  if (result.status !== 0) {
    return { ok: false as const, stderr: (result.stderr ?? '').trim() };
  }
  return { ok: true as const, stdout: (result.stdout ?? '').trimEnd() };
}

function captureWorkspaceFingerprint(cwd: string): WorkspaceFingerprint {
  const rootResult = runGit(cwd, ['rev-parse', '--show-toplevel']);
  if (!rootResult.ok) {
    return { kind: 'unavailable', reason: 'git-command-failed', detail: rootResult.stderr };
  }

  const headResult = runGit(cwd, ['rev-parse', 'HEAD']);
  if (!headResult.ok) {
    return { kind: 'unavailable', reason: 'git-command-failed', detail: headResult.stderr };
  }

  const statusResult = runGit(cwd, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (!statusResult.ok) {
    return { kind: 'unavailable', reason: 'git-command-failed', detail: statusResult.stderr };
  }

  const worktreeDiffResult = runGit(cwd, ['diff', '--no-ext-diff', '--binary', '--']);
  if (!worktreeDiffResult.ok) {
    return { kind: 'unavailable', reason: 'git-command-failed', detail: worktreeDiffResult.stderr };
  }

  const stagedDiffResult = runGit(cwd, ['diff', '--cached', '--no-ext-diff', '--binary', '--']);
  if (!stagedDiffResult.ok) {
    return { kind: 'unavailable', reason: 'git-command-failed', detail: stagedDiffResult.stderr };
  }

  const status = statusResult.stdout;
  const worktreeDiff = worktreeDiffResult.stdout;
  const stagedDiff = stagedDiffResult.stdout;
  const changeSetHash =
    status === '' && worktreeDiff === '' && stagedDiff === ''
      ? CLEAN_WORKSPACE_CHANGESET_SENTINEL
      : createHash('sha256')
          .update(`status\n${status}\n--worktree-diff--\n${worktreeDiff}\n--staged-diff--\n${stagedDiff}`)
          .digest('hex');

  return {
    kind: 'git',
    repoRoot: rootResult.stdout,
    head: headResult.stdout,
    changeSetHash,
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function writeIntegritySidecar(runDir: string): void {
  const key = process.env[INTEGRITY_KEY_ENV];
  if (!key) {
    throw new Error(`${INTEGRITY_KEY_ENV} is required`);
  }
  const keyId = process.env[INTEGRITY_KEY_ID_ENV] || `env:${INTEGRITY_KEY_ENV}`;
  const eventsJsonl = readFileSync(join(runDir, 'events.jsonl'), 'utf8');
  const lines = eventsJsonl.trimEnd().split('\n');
  let previous = Buffer.alloc(0);
  for (const line of lines) {
    previous = createHash('sha256')
      .update(Buffer.concat([previous, Buffer.from(line, 'utf8')]))
      .digest();
  }
  const payload = {
    version: 1,
    algorithms: {
      artifactDigest: 'sha256',
      eventLogChain: 'sha256(prev || line)',
      hmac: 'hmac-sha256',
    },
    keyId,
    artifacts: {
      'run.started': {
        path: 'events.jsonl:1',
        sha256: createHash('sha256')
          .update(lines[0] ?? '')
          .digest('hex'),
      },
      'plan.snapshot.json': {
        path: join(runDir, 'plan.snapshot.json'),
        sha256: createHash('sha256')
          .update(readFileSync(join(runDir, 'plan.snapshot.json')))
          .digest('hex'),
      },
      'policy.snapshot.json': {
        path: join(runDir, 'policy.snapshot.json'),
        sha256: createHash('sha256')
          .update(readFileSync(join(runDir, 'policy.snapshot.json')))
          .digest('hex'),
      },
    },
    eventLog: {
      path: 'events.jsonl',
      lineCount: lines.length,
      chainHead: previous.toString('hex'),
    },
  };
  const sidecar = {
    ...payload,
    hmac: createHmac('sha256', Buffer.from(key, 'utf8')).update(stableStringify(payload)).digest('hex'),
  };
  writeFileSync(join(runDir, 'integrity.json'), JSON.stringify(sidecar, null, 2));
}

// vitest's v8 coverage provider does not attribute coverage from execSync subprocesses
// (unlike c8's NODE_V8_COVERAGE inheritance), and those subprocesses execute compiled
// dist/ JS outside `coverage.include` regardless. This file exercises cli.ts (and, by
// extension, records.ts) in-process so the 90/90/90/90 gate reflects real coverage
// instead of relying on coverage.exclude as a last resort.

class ProcessExitSentinel extends Error {
  readonly code: number | undefined;
  constructor(code?: number) {
    super(`process.exit(${code ?? ''}) called`);
    this.name = 'ProcessExitSentinel';
    this.code = code;
  }
}

let exitSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let originalArgv: string[];
let originalCwd: string;
let workDir: string;

beforeEach(() => {
  originalArgv = process.argv;
  originalCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), 'jig-cli-unit-'));
  process.chdir(workDir);

  exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new ProcessExitSentinel(code);
  }) as never);
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.JIG_RECORDS_INTEGRITY_KEY;
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
  process.argv = originalArgv;
  exitSpy.mockRestore();
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

function setArgv(...args: string[]): void {
  process.argv = ['node', 'bin/jig.js', ...args];
}

function fixture(name: string): string {
  return join(originalCwd, 'tests/fixtures/m5b-local-mvp', name);
}

function loggedLines(): string {
  return (logSpy.mock.calls as unknown[][]).map((call) => call.join(' ')).join('\n');
}

function erroredLines(): string {
  return (errorSpy.mock.calls as unknown[][]).map((call) => call.join(' ')).join('\n');
}

function phase4LaunchHeader(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    family: 'run.started',
    actor: 'runner',
    timestamp: '2026-07-03T09:00:00.000Z',
    runId: 'run-plan-phase4-cli-uuid',
    planId: 'plan-phase4-cli',
    mode: 'local-dry-run',
    binding: {
      policyRef: 'policy:local-dry-run',
      configRef: 'mode=local-dry-run;recordDir=runs',
      workspace: {
        repoRoot: '/tmp/jig-cli',
        head: '0123456789abcdef0123456789abcdef01234567',
        changeSetHash: 'workspace-clean',
      },
    },
    posture: {
      record: 'safe-for-owner-record',
      export: 'redacted',
    },
    planSnapshot: { ref: 'plan.snapshot.json' },
    policySnapshot: { ref: 'policy.snapshot.json' },
    ...overrides,
  };
}

function stringifyJsonl(events: RunEvent[]): string {
  return `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function assertGitWorkspace(workspace: WorkspaceFingerprint): asserts workspace is GitWorkspaceFingerprint {
  if (!('kind' in workspace) || workspace.kind !== 'git') {
    assert.fail('changed-basis inspection test requires a git workspace');
  }
}

function resumePlan(): Plan {
  return {
    id: 'plan-phase4-cli',
    version: 'execution-plan-shape-v0',
    stories: [
      { id: 'STORY-1', title: 'blocked' },
      { id: 'STORY-2', title: 'remaining' },
    ],
  };
}

function resumePolicy(overrides: PolicyDoc = {}): PolicyDoc {
  return {
    version: overrides.version ?? 'policy-v0',
    policy: {
      id: 'policy:local-dry-run',
      ...overrides.policy,
      rules: {
        allowLocalDryRun: true,
        ...overrides.policy?.rules,
      },
    },
  };
}

function writeStoppedResumeRun(policy = resumePolicy()): string {
  const runDir = join(workDir, 'resume-run');
  mkdirSync(runDir, { recursive: true });
  writeJson(join(runDir, 'plan.snapshot.json'), resumePlan());
  writeJson(join(runDir, 'policy.snapshot.json'), policy);
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader({
        binding: {
          policyRef: 'policy:local-dry-run',
          configRef: 'mode=local-dry-run;recordDir=runs',
          workspace: captureWorkspaceFingerprint(originalCwd),
        },
      }),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
        reason: 'worker-reported-failure',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:03.000Z',
        reason: 'work-item-blocked',
        checkpoint: 'after:STORY-1',
        unstarted: ['STORY-2'],
      },
    ]),
  );
  return runDir;
}

function addReferenceDriverBindingAndIntegrity(runDir: string): void {
  process.env.JIG_RECORDS_INTEGRITY_KEY = 'phase-9-cli-key';
  const eventsPath = join(runDir, 'events.jsonl');
  const lines = readFileSync(eventsPath, 'utf8').trimEnd().split('\n');
  const launch = JSON.parse(lines[0] ?? '{}') as RunEvent;
  lines[0] = JSON.stringify({
    ...launch,
    binding: {
      ...launch.binding,
      drivers: {
        agent: 'reference',
        executionHost: 'reference',
        forge: 'reference',
        workSource: 'reference',
      },
    },
  });
  writeFileSync(eventsPath, `${lines.join('\n')}\n`);
  writeIntegritySidecar(runDir);
}

function writeResumeOutput(outcome: 'success' | 'failure' = 'success'): string {
  const outputPath = join(workDir, `resume-output-${outcome}.json`);
  writeJson(outputPath, {
    stories: [
      {
        storyId: 'STORY-2',
        outcome,
        evidence: { result: outcome === 'success' ? 'passed' : 'failed' },
      },
    ],
  });
  return outputPath;
}

function stoppedProjectionEvents(): RunEvent[] {
  return [
    phase4LaunchHeader(),
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:01.000Z',
      storyId: 'STORY-1',
    },
    {
      family: 'evidence.modeled',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:02.000Z',
      storyId: 'STORY-1',
      result: 'passed',
      changedFiles: ['src/cli.ts'],
    },
    {
      family: 'story.done',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:03.000Z',
      storyId: 'STORY-1',
      changedFiles: ['src/cli.ts'],
    },
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:04.000Z',
      storyId: 'STORY-2',
    },
    {
      family: 'authorization.requested',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:05.000Z',
      storyId: 'STORY-2',
      requestId: 'REQ-2',
      requestKind: 'edit-rule-governing-file',
    },
    {
      family: 'authorization.routed',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:06.000Z',
      storyId: 'STORY-2',
      requestId: 'REQ-2',
      requestKind: 'edit-rule-governing-file',
      basis: ['GUARD-2', 'rule-governing-surface'],
    },
    {
      family: 'story.parked',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:07.000Z',
      storyId: 'STORY-2',
      requestId: 'REQ-2',
      reason: 'owner-decision-required',
    },
    {
      family: 'run.stopped',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:08.000Z',
      reason: 'unattended-park',
      checkpoint: 'after:STORY-2.parked',
      unstarted: ['STORY-3'],
    },
  ];
}

test('run(): no command prints usage and exits 1', async () => {
  setArgv();
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Usage:/);
});

test('run(): unknown command prints usage and exits 1', async () => {
  setArgv('bogus');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Usage:/);
});

test('run(): "preview" with no plan path prints usage and exits 1', async () => {
  setArgv('preview');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /jig preview <plan>/);
});

test('run(): "preview" without required bindings fails closed with usage', async () => {
  setArgv('preview', fixture('minimal-plan.json'), '--config', fixture('local-config.json'));
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /--policy <policy>/);
});

test('run(): "preview" validation error includes path and reason', async () => {
  setArgv(
    'preview',
    fixture('invalid-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
  );
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(
    erroredLines(),
    /Plan validation failed for ".*invalid-plan\.json": Invalid plan: unknown version "unknown-version"/,
  );
});

test('P07-AC-1/5: setup command emits owner-readable artifacts from headless flags', async () => {
  const setupDir = join(workDir, 'track-setup');
  setArgv('setup', setupDir, '--track', 'TRACK-P07', '--template', 'assisted-local', '--posture', 'reference-scripted');

  await run();

  expect(exitSpy).not.toHaveBeenCalled();
  const output = loggedLines();
  assert.match(output, /--- Jig Setup ---/);
  assert.match(output, /Status: created/);
  assert.match(output, /Assisted gating/);
  assert.ok(existsSync(join(setupDir, 'jig.config.json')));
  assert.ok(existsSync(join(setupDir, 'policy.json')));
});

test('P07-AC-5: setup command accepts an answers file and flags can override it', async () => {
  const setupDir = join(workDir, 'answers-setup');
  const answersPath = join(workDir, 'setup-answers.json');
  writeJson(answersPath, {
    trackId: 'TRACK-P07',
    template: 'assisted-local',
    providerPosture: 'real-local',
  });
  setArgv('setup', setupDir, '--answers', answersPath, '--posture', 'reference-scripted');

  await run();

  const config = JSON.parse(readFileSync(join(setupDir, 'jig.config.json'), 'utf8')) as {
    drivers: { agent: string };
  };
  assert.strictEqual(config.drivers.agent, 'scripted-stub');
});

test('P07-AC-4: setup command reports freshness action', async () => {
  const setupDir = join(workDir, 'fresh-setup');
  const marker = join(workDir, 'setup-ran');
  setArgv(
    'setup',
    setupDir,
    '--track',
    'TRACK-P07',
    '--setup-command',
    `touch ${marker}`,
    '--freshness-check',
    'test -f never-fresh',
  );

  await run();

  assert.match(loggedLines(), /Setup Command: ran-stale/);
  assert.ok(existsSync(marker));
});

test('run(): "setup" validation errors are owner-readable', async () => {
  setArgv('setup', join(workDir, 'bad-setup'), '--track', 'TRACK-P07', '--posture', 'unknown');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Invalid setup\.providerPosture/);
});

test('run(): "setup" without output directory prints usage and exits 1', async () => {
  setArgv('setup');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /jig setup <output-directory>/);
});

test('P3-AC-1: preview reports bound plan, policy, and would-run story set without records', async () => {
  setArgv(
    'preview',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
  );

  await run();

  expect(exitSpy).not.toHaveBeenCalled();
  const output = loggedLines();
  assert.match(output, /--- Run Preview ---/);
  assert.match(output, /Posture: run.previewed/);
  assert.match(output, /Plan ID: plan-minimal-local/);
  assert.match(output, /Policy ID: local-dry-run-policy/);
  assert.match(output, /Would-run stories:/);
  assert.match(output, /- STORY-1: Minimal Story/);
  assert.ok(!existsSync(join(workDir, 'runs')));
});

test('P3-AC-1: preview omits mode when config runner is sparse', async () => {
  const configPath = join(workDir, 'sparse-config.json');
  const policyPath = join(workDir, 'sparse-policy.json');
  writeJson(configPath, { runner: {}, drivers: {} });
  writeJson(policyPath, { version: 'policy-v0', policy: { id: 'sparse-policy', rules: { allowLocalDryRun: true } } });
  setArgv('preview', fixture('minimal-plan.json'), '--config', configPath, '--policy', policyPath);

  await run();

  const output = loggedLines();
  assert.match(output, /Policy ID: sparse-policy/);
  assert.doesNotMatch(output, /Mode:/);
});

test('P3-AC-1: run after preview is unaffected by prior preview', async () => {
  setArgv(
    'preview',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
  );
  await run();
  assert.ok(!existsSync(join(workDir, 'runs')));

  logSpy.mockClear();
  setArgv(
    'run',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
    '--scripted-output',
    fixture('scripted-worker-success.json'),
  );

  await run();

  const runs = readdirSync(join(workDir, 'runs'));
  assert.strictEqual(runs.length, 1);
  assert.match(loggedLines(), /Final Status: success/);
});

test('P3-AC-4: owner decision source is disabled when stdin is non-interactive', () => {
  assert.strictEqual(createOwnerDecisionSource({ interactive: false }), null);
});

test('P3-AC-4: owner decision source approves and rejects through injected prompt', async () => {
  const approveSource = createOwnerDecisionSource({ interactive: true, ask: async () => 'approve' });
  assert.ok(approveSource);
  await expect(approveSource.decide({ id: 'REQ-1', kind: 'edit-files' }, { id: 'STORY-1' })).resolves.toBe('approve');

  const rejectSource = createOwnerDecisionSource({ interactive: true, ask: async () => 'no' });
  assert.ok(rejectSource);
  await expect(rejectSource.decide({}, {})).resolves.toBe('reject');

  assert.ok(createOwnerDecisionSource({ interactive: true }));
});

test('P09-AC-5: owner decision source supports override and hand-off vocabulary', async () => {
  const shortApproveSource = createOwnerDecisionSource({ interactive: true, ask: async () => 'y' });
  assert.ok(shortApproveSource);
  await expect(shortApproveSource.decide({ id: 'REQ-y', kind: 'edit-files' }, { id: 'STORY-y' })).resolves.toBe(
    'approve',
  );

  const longApproveSource = createOwnerDecisionSource({ interactive: true, ask: async () => 'yes' });
  assert.ok(longApproveSource);
  await expect(longApproveSource.decide({ id: 'REQ-yes', kind: 'edit-files' }, { id: 'STORY-yes' })).resolves.toBe(
    'approve',
  );

  const overrideSource = createOwnerDecisionSource({ interactive: true, ask: async () => 'override' });
  assert.ok(overrideSource);
  await expect(overrideSource.decide({ id: 'REQ-2', kind: 'edit-files' }, { id: 'STORY-2' })).resolves.toBe('override');

  const handoffAnswers = ['hand-off', 'platform-owner'];
  const handoffSource = createOwnerDecisionSource({ interactive: true, ask: async () => handoffAnswers.shift() ?? '' });
  assert.ok(handoffSource);
  await expect(handoffSource.decide({ id: 'REQ-3', kind: 'edit-files' }, { id: 'STORY-3' })).resolves.toEqual({
    outcome: 'hand-off',
    handedOffTo: 'platform-owner',
  });

  const compactHandoffAnswers = ['handoff', 'ops-owner'];
  const compactHandoffSource = createOwnerDecisionSource({
    interactive: true,
    ask: async () => compactHandoffAnswers.shift() ?? '',
  });
  assert.ok(compactHandoffSource);
  await expect(compactHandoffSource.decide({ id: 'REQ-4', kind: 'edit-files' }, { id: 'STORY-4' })).resolves.toEqual({
    outcome: 'hand-off',
    handedOffTo: 'ops-owner',
  });

  const spacedHandoffAnswers = ['hand off', 'delivery-owner'];
  const spacedHandoffSource = createOwnerDecisionSource({
    interactive: true,
    ask: async () => spacedHandoffAnswers.shift() ?? '',
  });
  assert.ok(spacedHandoffSource);
  await expect(spacedHandoffSource.decide({ id: 'REQ-5', kind: 'edit-files' }, { id: 'STORY-5' })).resolves.toEqual({
    outcome: 'hand-off',
    handedOffTo: 'delivery-owner',
  });

  const blankHandoffAnswers = ['hand-off', ''];
  const blankHandoffSource = createOwnerDecisionSource({
    interactive: true,
    ask: async () => blankHandoffAnswers.shift() ?? '',
  });
  assert.ok(blankHandoffSource);
  await expect(blankHandoffSource.decide({ id: 'REQ-6', kind: 'edit-files' }, { id: 'STORY-6' })).resolves.toBe(
    'reject',
  );
});

test('run(): "run" with no plan path prints usage and exits 1', async () => {
  setArgv('run');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Usage:/);
});

test('PR-AC-7: run without --config fails closed with usage guidance', async () => {
  setArgv(
    'run',
    fixture('minimal-plan.json'),
    '--policy',
    fixture('local-policy.json'),
    '--scripted-output',
    fixture('scripted-worker-success.json'),
  );
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /--config <config>/);
});

test('PR-AC-7: run without --policy fails closed with usage guidance', async () => {
  setArgv(
    'run',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--scripted-output',
    fixture('scripted-worker-success.json'),
  );
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /--policy <policy>/);
});

test('PR-AC-7: run without --scripted-output fails closed with usage guidance', async () => {
  setArgv(
    'run',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
  );
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /--scripted-output <output>/);
});

test('run(): "inspect" with no directory prints usage and exits 1', async () => {
  setArgv('inspect');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Usage:/);
});

test('run(): "resume" without --scripted-output fails closed with usage guidance', async () => {
  setArgv('resume', 'runs/run-existing');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /jig resume <run-directory> --scripted-output <output>/);
});

test('run(): "resume" with no run directory prints usage and exits 1', async () => {
  setArgv('resume');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /jig resume <run-directory>/);
});

test('run(): "inspect" on a missing directory exits 1 with an error', async () => {
  setArgv('inspect', 'does-not-exist');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Error: Run directory "does-not-exist" does not exist/);
});

test('run(): "inspect" on a directory without events.jsonl or run.json exits 1 with an error', async () => {
  const runDir = join(workDir, 'no-run-json');
  mkdirSync(runDir, { recursive: true });

  setArgv('inspect', runDir);
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Error: Neither events\.jsonl nor run\.json found in/);
});

test('run(): "inspect" on a corrupt run.json exits 1 with a parse error', async () => {
  const runDir = join(workDir, 'corrupt-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'run.json'), '{ not valid json');

  setArgv('inspect', runDir);
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Error: Failed to parse run\.json/);
});

test('P4-AC-4: inspect replays events.jsonl when run.json is absent', async () => {
  const runDir = join(workDir, 'events-only-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /Run ID: run-plan-phase4-cli-uuid/);
  assert.match(output, /Plan ID: plan-phase4-cli/);
  assert.match(output, /Final Status: failure/);
  assert.match(output, /- STORY-1: done/);
  assert.match(output, /- STORY-2: parked \(owner-decision-required\)/);
});

test('P4-AC-4: inspect renders stop cause, projected notice, checkpoint, and changed files from projection', async () => {
  const runDir = join(workDir, 'events-only-stopped-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /Stop Cause: unattended-park/);
  assert.match(output, /Safe Resume Checkpoint: after:STORY-2\.parked/);
  assert.match(output, /Projected Notices:/);
  assert.match(output, /unattended-park: run stopped at an unattended parked story/);
  assert.match(output, /Changed files: src\/cli\.ts/);
});

test('P4-AC-4: inspect renders projected story diagnostics', async () => {
  const runDir = join(workDir, 'events-only-diagnostics-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
        diagnostics: {
          exitCode: 2,
          error: 'diagnostic warning',
          stdout: 'diagnostic line\nmore detail',
        },
      },
      {
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:03.000Z',
      },
    ]),
  );

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /- STORY-1: done/);
  assert.match(output, /Diagnostics:/);
  assert.match(output, /exitCode: 2/);
  assert.match(output, /error: diagnostic warning/);
  assert.match(output, /stdout: diagnostic line\.\.\./);
});

test('P4-AC-4: inspect renders a clean completed projection without stop or notice sections', async () => {
  const runDir = join(workDir, 'events-only-completed-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader({
        binding: {
          policyRef: 'policy:local-dry-run',
          configRef: 'mode=local-dry-run;recordDir=runs',
          workspace: captureWorkspaceFingerprint(originalCwd),
        },
      }),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'evidence.modeled',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
        result: 'passed',
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:03.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:04.000Z',
      },
    ]),
  );

  setArgv('inspect', runDir);
  await run();

  const output = loggedLines();
  assert.match(output, /Final Status: success/);
  assert.doesNotMatch(output, /Stop Cause:/);
  assert.doesNotMatch(output, /Projected Notices:/);
  assert.doesNotMatch(output, /Changed files:/);
});

test('P4-AC-4: inspect renders projection summary reason and sparse blocked diagnostics', async () => {
  const deniedRunDir = join(workDir, 'events-denied-run');
  mkdirSync(deniedRunDir, { recursive: true });
  writeFileSync(
    join(deniedRunDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'authorization.denied',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        reason: 'policy denied before stories',
      },
    ]),
  );
  setArgv('inspect', deniedRunDir);
  await run();
  assert.match(loggedLines(), /Reason: policy denied before stories/);

  logSpy.mockClear();
  const blockedRunDir = join(workDir, 'events-blocked-diagnostics-run');
  mkdirSync(blockedRunDir, { recursive: true });
  writeFileSync(
    join(blockedRunDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
        diagnostics: {
          exitCode: 2,
          error: 'blocked without reason',
          stdout: 'line one\nline two',
        },
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:03.000Z',
        reason: 'work-item-blocked',
        checkpoint: 'after:STORY-1',
        unstarted: [],
      },
    ]),
  );

  setArgv('inspect', blockedRunDir);
  await run();

  const output = loggedLines();
  assert.match(output, /- STORY-1: blocked$/m);
  assert.match(output, /exitCode: 2/);
  assert.match(output, /error: blocked without reason/);
  assert.match(output, /stdout: line one\.\.\./);
});

test('P4-AC-4: inspect fails closed on a defective replay log even if run.json exists', async () => {
  const runDir = join(workDir, 'defective-events-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
    ]),
  );
  writeFileSync(
    join(runDir, 'run.json'),
    JSON.stringify(
      {
        run: {
          id: 'run-plan-phase4-cli-uuid',
          attempt: 1,
          status: 'failure',
          planId: 'plan-phase4-cli',
          mode: 'local-dry-run',
          binding: {
            policyRef: 'policy:local-dry-run',
            configRef: 'mode=local-dry-run;recordDir=runs',
            workspace: {
              repoRoot: '/tmp/jig-cli',
              head: '0123456789abcdef0123456789abcdef01234567',
              changeSetHash: 'workspace-clean',
            },
          },
        },
        events: [],
      } satisfies RunRecord,
      null,
      2,
    ),
  );

  setArgv('inspect', runDir);
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Error: Failed to inspect authoritative events\.jsonl:/);
  assert.match(erroredLines(), /Illegal replay transition/);
});

test('P4-AC-4: inspect falls back to legacy run.json for old incomplete launch headers', async () => {
  const runDir = join(workDir, 'legacy-fallback-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([{ family: 'run.started', actor: 'runner', runId: 'legacy' }]),
  );
  writeJson(join(runDir, 'run.json'), {
    run: {
      id: 'legacy-run',
      attempt: 1,
      status: 'success',
      planId: 'legacy-plan',
      mode: 'local-dry-run',
      binding: {
        policyRef: 'legacy-policy',
        configRef: 'legacy-config',
        workspace: {
          repoRoot: '/tmp/legacy',
          head: 'legacy-head',
          changeSetHash: 'legacy-hash',
        },
      },
    },
    events: [{ family: 'story.done', storyId: 'STORY-1', changedFiles: ['legacy.txt'] }],
  } satisfies RunRecord);

  setArgv('inspect', runDir);
  await run();

  const output = loggedLines();
  assert.match(output, /Run ID: legacy-run/);
  assert.match(output, /- STORY-1: done/);
  assert.match(output, /Changed files: legacy\.txt/);
});

test('P4-AC-4: inspect reports unreadable run.json cache as a projection diagnostic', async () => {
  const runDir = join(workDir, 'events-with-corrupt-cache-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));
  writeFileSync(join(runDir, 'run.json'), '{ not valid json');

  setArgv('inspect', runDir);
  await run();

  assert.match(loggedLines(), /run\.json-cache-unreadable: run\.json cache unreadable and ignored/);
});

test('P9-AC-3: inspect surfaces integrity breaks while still rendering derivable records', async () => {
  const runDir = writeStoppedResumeRun();
  addReferenceDriverBindingAndIntegrity(runDir);
  writeJson(join(runDir, 'plan.snapshot.json'), { ...resumePlan(), id: 'tampered-plan' });

  setArgv('inspect', runDir);
  await run();

  const output = loggedLines();
  assert.match(output, /Run ID: run-plan-phase4-cli-uuid/);
  assert.match(output, /Integrity Notices:/);
  assert.match(output, /integrity-artifact-mismatch:/);
  assert.match(output, /plan\.snapshot\.json/);
});

test('P9-AC-3: inspect surfaces integrity breaks even when projection fails', async () => {
  const runDir = writeStoppedResumeRun();
  addReferenceDriverBindingAndIntegrity(runDir);
  const eventsPath = join(runDir, 'events.jsonl');
  const lines = readFileSync(eventsPath, 'utf8').trimEnd().split('\n');
  lines[1] = '{ not valid json';
  writeFileSync(eventsPath, `${lines.join('\n')}\n`);

  setArgv('inspect', runDir);
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);

  const output = erroredLines();
  assert.match(output, /Integrity Notice: integrity-artifact-mismatch:/);
  assert.match(output, /events\.jsonl/);
  assert.match(output, /Failed to inspect authoritative events\.jsonl: Malformed events\.jsonl line 2/);
});

test('P9-AC-3: inspect surfaces changed-basis missing re-approval', async () => {
  const runDir = writeStoppedResumeRun();
  process.chdir(originalCwd);
  const eventsPath = join(runDir, 'events.jsonl');
  const lines = readFileSync(eventsPath, 'utf8').trimEnd().split('\n');
  const launch = JSON.parse(lines[0] ?? '{}') as RunEvent;
  const workspace = captureWorkspaceFingerprint(originalCwd);
  assertGitWorkspace(workspace);
  lines[0] = JSON.stringify({
    ...launch,
    binding: {
      ...launch.binding,
      workspace: {
        ...workspace,
        changeSetHash: `${workspace.changeSetHash}-changed`,
      },
    },
  });
  writeFileSync(eventsPath, `${lines.join('\n')}\n`);
  addReferenceDriverBindingAndIntegrity(runDir);

  setArgv('inspect', runDir);
  await run();

  const output = loggedLines();
  assert.match(output, /Diagnostics:/);
  assert.match(output, /resume-blocked-missing-approval:/);
  assert.match(output, /fresh owner approval is required before resume/);
});

test('P4-AC-1: resume succeeds from the launch snapshots and writes a resumed record', async () => {
  const runDir = writeStoppedResumeRun();
  process.chdir(originalCwd);

  setArgv('resume', runDir, '--scripted-output', writeResumeOutput());
  await run();

  expect(exitSpy).not.toHaveBeenCalled();
  const output = loggedLines();
  assert.match(output, /Final Status: success/);
  const record = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as RunRecord;
  assert.ok(record.events.find((event) => event.family === 'run.resumed'));
  assert.strictEqual(record.run.policySnapshot?.ref, 'policy.snapshot.json');
});

test('P4-AC-1: resume returns failure status through CLI without rebinding', async () => {
  const runDir = writeStoppedResumeRun();
  process.chdir(originalCwd);

  setArgv('resume', runDir, '--scripted-output', writeResumeOutput('failure'));
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);

  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(loggedLines(), /Final Status: failure/);
});

test('P4-AC-1: resume refusal is printed without generic error prefix', async () => {
  const runDir = writeStoppedResumeRun();
  process.chdir(originalCwd);
  const configPath = join(workDir, 'other-config.json');
  writeJson(configPath, {
    runner: { mode: 'local-dry-run', recordDir: 'other-runs' },
    drivers: { agent: 'scripted-stub', executionHost: 'local' },
  });

  setArgv('resume', runDir, '--scripted-output', writeResumeOutput(), '--config', configPath);
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);

  assert.match(erroredLines(), /^resume-blocked-binding-mismatch:/);
  assert.doesNotMatch(erroredLines(), /^Error:/);
});

test('run(): happy-path run with --config/--policy/--scripted-output flags succeeds', async () => {
  setArgv(
    'run',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
    '--scripted-output',
    fixture('scripted-with-files.json'),
  );

  await run();

  expect(exitSpy).not.toHaveBeenCalled();
  const output = loggedLines();
  assert.match(output, /Final Status: success/);
  assert.match(output, /- STORY-1: done/);

  const runDirMatch = output.match(/Records Directory: (runs\/run-plan-minimal-local-\d+-[^\s]+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');
  const runDir = join(workDir, runDirMatch[1]);
  assert.ok(existsSync(join(runDir, 'run.json')));
  assert.ok(existsSync(join(runDir, 'events.jsonl')));

  const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as RunRecord;
  assert.strictEqual(runRecord.run.status, 'success');

  // The changed-files line only prints in inspect output, not the run summary.
  logSpy.mockClear();
  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  assert.match(loggedLines(), /Changed files: src\/cli\.js, src\/records\.js/);
});

test('run(): denied run in-process exits 1, records the denial, and inspect shows the reason', async () => {
  // Explicit --config/--scripted-output: the CLI's relative defaults cannot resolve from
  // this test's tmpdir cwd, and the denial must be reached, not a default-path load error.
  setArgv(
    'run',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy-denied.json'),
    '--scripted-output',
    fixture('scripted-worker-success.json'),
  );

  // process.exit(1) after a failure status is inside handleRun's try block, so the throwing
  // sentinel is caught by handleRun's own catch, which logs `Error: <sentinel message>` and
  // calls process.exit(1) again (throwing again). The record file is written by finalize()
  // before that first exit call, so inspect can still read it afterward.
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);

  const output = loggedLines();
  assert.match(output, /Final Status: failure/);
  assert.match(output, /Reason: Policy denial: allowLocalDryRun is not true/);

  const runDirMatch = output.match(/Records Directory: (runs\/run-plan-minimal-local-\d+-[^\s]+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');
  const runDir = join(workDir, runDirMatch[1]);

  logSpy.mockClear();
  errorSpy.mockClear();
  exitSpy.mockClear();

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /--- Run Inspection ---/);
  assert.match(inspectOutput, /Final Status: failure/);
  assert.match(inspectOutput, /Reason: Policy denial: allowLocalDryRun is not true/);
});

test('PR-AC-4: failure run in-process exits 1 with diagnostics, and inspect shows blocked reason', async () => {
  setArgv(
    'run',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
    '--scripted-output',
    fixture('scripted-worker-failure.json'),
  );

  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);

  const output = loggedLines();
  assert.match(output, /Final Status: failure/);
  assert.match(output, /- STORY-1: blocked \(worker-reported-failure\)/);

  const runDirMatch = output.match(/Records Directory: (runs\/run-plan-minimal-local-\d+-[^\s]+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');
  const runDir = runDirMatch[1];

  logSpy.mockClear();
  errorSpy.mockClear();
  exitSpy.mockClear();

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /--- Run Inspection ---/);
  assert.match(inspectOutput, /Final Status: failure/);
  assert.match(inspectOutput, /- STORY-1: blocked \(worker-reported-failure\)/);
  assert.match(inspectOutput, /Diagnostics:/);
  assert.match(inspectOutput, /exitCode: 1/);
  assert.match(inspectOutput, /error: Simulated worker failure/);
  assert.match(inspectOutput, /stdout: Running checks\.\.\./);
});

test('PR-AC-4: failure blocks dependent and records independent item only in run.stopped unstarted', async () => {
  setArgv(
    'run',
    fixture('multi-item-plan-failure-blocks-dependent.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
    '--scripted-output',
    fixture('scripted-worker-multi-failure-story-1.json'),
  );

  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);

  const output = loggedLines();
  assert.match(output, /Final Status: failure/);
  assert.match(output, /- STORY-1: blocked \(worker-reported-failure\)/);
  assert.match(output, /- STORY-2: blocked \(blocked by STORY-1\)/);
  assert.doesNotMatch(output, /STORY-3: skipped/);

  const runDirMatch = output.match(/Records Directory: (runs\/run-multi-item-failure-\d+-[^\s]+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');

  logSpy.mockClear();
  errorSpy.mockClear();
  exitSpy.mockClear();

  setArgv('inspect', runDirMatch[1]);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /- STORY-1: blocked \(worker-reported-failure\)/);
  assert.match(inspectOutput, /- STORY-2: blocked \(blocked by STORY-1\)/);
  assert.doesNotMatch(inspectOutput, /STORY-3: skipped/);
});

test('run(): inspect renders a sparse record: no mode, diagnostics without optional fields', async () => {
  const runDir = join(workDir, 'sparse-run-dir');
  mkdirSync(runDir, { recursive: true });
  const sparseRecord = {
    run: { id: 'plan-sparse', status: 'failure', planId: 'plan-sparse' },
    events: [{ family: 'story.blocked', storyId: 'STORY-1', reason: 'worker-reported-failure', diagnostics: {} }],
  };
  writeFileSync(join(runDir, 'run.json'), JSON.stringify(sparseRecord, null, 2));

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /- STORY-1: blocked \(worker-reported-failure\)/);
  assert.match(inspectOutput, /Diagnostics:/);
  assert.doesNotMatch(inspectOutput, /Mode:/);
  assert.doesNotMatch(inspectOutput, /exitCode:/);
  assert.doesNotMatch(inspectOutput, /error:/);
  assert.doesNotMatch(inspectOutput, /stdout:/);
});

test('run(): inspect renders legacy run-scope authorization denial when no item outcomes exist', async () => {
  const runDir = join(workDir, 'legacy-denial-run-dir');
  mkdirSync(runDir, { recursive: true });
  const deniedRecord = {
    run: { id: 'old-denied-run', status: 'failure', planId: 'old-denied-plan' },
    events: [{ family: 'authorization.denied', reason: 'policy denied before stories' }],
  };
  writeFileSync(join(runDir, 'run.json'), JSON.stringify(deniedRecord, null, 2));

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  assert.match(loggedLines(), /Reason: policy denied before stories/);
});

test('run(): inspect tolerates legacy run records without item outcomes or denial reasons', async () => {
  const runDir = join(workDir, 'legacy-empty-run-dir');
  mkdirSync(runDir, { recursive: true });
  const record = {
    run: { id: 'old-empty-run', status: 'success', planId: 'old-empty-plan' },
    events: [],
  };
  writeFileSync(join(runDir, 'run.json'), JSON.stringify(record, null, 2));

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /Final Status: success/);
  assert.doesNotMatch(output, /Reason:/);
});

test('run(): inspect tolerates legacy failed run records without authorization denial reasons', async () => {
  const runDir = join(workDir, 'legacy-failed-empty-run-dir');
  mkdirSync(runDir, { recursive: true });
  const record = {
    run: { id: 'old-failed-empty-run', status: 'failure', planId: 'old-failed-empty-plan' },
    events: [],
  };
  writeFileSync(join(runDir, 'run.json'), JSON.stringify(record, null, 2));

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /Final Status: failure/);
  assert.doesNotMatch(output, /Reason:/);
});

test('run(): inspect renders legacy blocked-by, skipped, and changed-file details', async () => {
  const runDir = join(workDir, 'legacy-item-detail-run');
  mkdirSync(runDir, { recursive: true });
  const record = {
    run: { id: 'run-legacy-item-detail', status: 'failure', planId: 'plan-phase4-cli', mode: 'local-dry-run' },
    events: [
      { family: 'story.blocked', storyId: 'STORY-1', blockedBy: 'STORY-0', changedFiles: ['src/blocked.ts'] },
      { family: 'story.skipped', storyId: 'STORY-2', reason: 'run stopped after failure' },
    ],
  };
  writeFileSync(join(runDir, 'run.json'), JSON.stringify(record, null, 2));

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /- STORY-1: blocked \(blocked by STORY-0\)/);
  assert.match(output, /Changed files: src\/blocked\.ts/);
  assert.match(output, /- STORY-2: skipped \(run stopped after failure\)/);
});

test('PR-AC-4: inspect preserves historical story.failed and story.skipped aliases', async () => {
  const runDir = join(workDir, 'historical-run-dir');
  mkdirSync(runDir, { recursive: true });
  const historicalRecord = {
    run: { id: 'old-run', status: 'failure', planId: 'old-plan' },
    events: [
      {
        family: 'story.failed',
        storyId: 'STORY-1',
        diagnostics: {
          exitCode: 1,
          error: 'old failure',
          stdout: 'first line\nsecond line',
        },
      },
      {
        family: 'story.skipped',
        storyId: 'STORY-2',
        reason: 'run stopped after failure',
      },
    ],
  };
  writeFileSync(join(runDir, 'run.json'), JSON.stringify(historicalRecord, null, 2));

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /- STORY-1: failed/);
  assert.match(inspectOutput, /Diagnostics:/);
  assert.match(inspectOutput, /exitCode: 1/);
  assert.match(inspectOutput, /error: old failure/);
  assert.match(inspectOutput, /stdout: first line\.\.\./);
  assert.match(inspectOutput, /- STORY-2: skipped \(run stopped after failure\)/);
});

test('run(): invalid plan path surfaces the validation error and exits 1', async () => {
  setArgv(
    'run',
    fixture('invalid-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
    '--scripted-output',
    fixture('scripted-worker-success.json'),
  );
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(
    erroredLines(),
    /Plan validation failed for ".*invalid-plan\.json": Invalid plan: unknown version "unknown-version"/,
  );
});

test('P08-AC-1/2: watch renders liveness groups and notice queue from records', async () => {
  const runDir = join(workDir, 'watch-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));

  setArgv('watch', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /--- Run Watch ---/);
  assert.match(output, /Signal: parked/);
  assert.match(output, /Done:\n {2}- STORY-1: done/);
  assert.match(output, /Parked:\n {2}- STORY-2: parked \(owner-decision-required\)/);
  assert.match(output, /Notices:/);
  assert.match(output, /unattended-park: urgent\/open/);
  assert.match(output, /Next: review the parked authorization request and resume or stop the run/);
});

test('P08-AC-1: watch renders active runs without notices', async () => {
  const runDir = join(workDir, 'watch-active-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl([phase4LaunchHeader()]));

  setArgv('watch', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /Signal: idle/);
  assert.doesNotMatch(output, /Notices:/);
});

test('P08-AC-3: ask-why cites recorded events for parked story explanations', async () => {
  const runDir = join(workDir, 'why-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));

  setArgv('ask-why', runDir, '--story', 'STORY-2');
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /Subject: STORY-2/);
  assert.match(output, /parked waiting for owner attention/);
  assert.match(output, /line 8: story\.parked reason=owner-decision-required/);
});

test('P08-AC-3: ask-why renders active runs without citations', async () => {
  const runDir = join(workDir, 'why-active-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl([phase4LaunchHeader()]));

  setArgv('ask-why', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /The run is started; no terminal run record is present yet/);
  assert.doesNotMatch(output, /Citations:/);
});

test('P08-AC-3: ask-why explains stopped runs without an explicit stop reason', async () => {
  const runDir = join(workDir, 'why-stopped-fallback-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:03.000Z',
        checkpoint: 'after:STORY-1',
      },
    ]),
  );

  setArgv('ask-why', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  assert.match(loggedLines(), /because unknown-stop-cause/);
});

test('P10-F10: custom-dir export remains attributable from inspect and run-level ask-why', async () => {
  const runDir = join(workDir, 'custom-export-attribution-run-dir');
  const outputDir = join(workDir, 'custom-export-audit-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));

  setArgv('export', runDir, '--output-dir', outputDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const customAudit = readFileSync(join(outputDir, 'export-audit.jsonl'), 'utf8');
  const canonicalAudit = readFileSync(join(runDir, 'exports', 'export-audit.jsonl'), 'utf8');
  assert.match(customAudit, /"family":"export\.prepared"/);
  assert.strictEqual(canonicalAudit, customAudit);

  logSpy.mockClear();
  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /Latest Export Attempt:/);
  assert.match(inspectOutput, /export\.prepared at /);
  assert.match(inspectOutput, /Artifact: .*custom-export-audit-dir.*audit-export.*\.json/);
  assert.match(inspectOutput, /SHA-256: /);

  logSpy.mockClear();
  setArgv('ask-why', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const whyOutput = loggedLines();
  assert.match(whyOutput, /This run was exported at /);
  assert.match(whyOutput, /exports\/export-audit\.jsonl:line 1: export\.prepared/);
  assert.match(whyOutput, /artifact=.*custom-export-audit-dir.*audit-export.*\.json/);
});

test('P10 review: malformed export audit sidecar becomes an inspect diagnostic and does not break ask-why', async () => {
  const runDir = join(workDir, 'malformed-export-audit-cli-run-dir');
  mkdirSync(join(runDir, 'exports'), { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));
  writeFileSync(join(runDir, 'exports', 'export-audit.jsonl'), '{"family":"export.prepared"\n');

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /export-audit-unreadable: export audit sidecar unreadable and ignored/);

  logSpy.mockClear();
  setArgv('ask-why', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  const whyOutput = loggedLines();
  assert.match(whyOutput, /The run stopped at after:STORY-2\.parked/);
  assert.doesNotMatch(whyOutput, /exports\/export-audit\.jsonl/);
});

test('P08-AC-3: ask-why surfaces operator errors', async () => {
  setArgv('ask-why', join(workDir, 'missing-why-run'));
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Run directory ".*missing-why-run" does not exist/);
});

test('P08-AC-2/4: notice acknowledge appends a durable owner event and watch reflects it', async () => {
  const runDir = join(workDir, 'notice-ack-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));

  setArgv('notice-ack', runDir, 'unattended-park');
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  assert.match(loggedLines(), /unattended-park: urgent\/acknowledged/);

  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(
    events.some(
      (event) =>
        event.family === 'notice.acknowledged' && event.actor === 'owner' && event.noticeId === 'unattended-park',
    ),
  );

  logSpy.mockClear();
  setArgv('watch', runDir);
  await run();
  assert.match(loggedLines(), /unattended-park: urgent\/acknowledged/);
});

test('P08-AC-2/4: notice snooze appends a durable owner event and watch reflects it', async () => {
  const runDir = join(workDir, 'notice-snooze-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));

  setArgv('notice-snooze', runDir, 'unattended-park', '--until', '2026-07-03T12:00:00.000Z');
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /unattended-park: urgent\/snoozed until 2026-07-03T12:00:00.000Z/);
  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(
    events.some(
      (event) =>
        event.family === 'notice.snoozed' &&
        event.actor === 'owner' &&
        event.noticeId === 'unattended-park' &&
        event.snoozedUntil === '2026-07-03T12:00:00.000Z',
    ),
  );
});

test('run(): P08 observation commands validate required arguments', async () => {
  for (const args of [
    ['watch'],
    ['ask-why'],
    ['notice-ack'],
    ['notice-ack', 'runs/run-existing'],
    ['notice-snooze'],
    ['notice-snooze', 'runs/run-existing', 'unattended-park'],
  ]) {
    setArgv(...args);
    await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
    expect(exitSpy).toHaveBeenCalledWith(1);
    assert.match(erroredLines(), /Usage:/);
    exitSpy.mockClear();
    errorSpy.mockClear();
  }
});

test('run(): P08 observation commands surface operator errors', async () => {
  setArgv('watch', join(workDir, 'missing-watch-run'));
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Run directory ".*missing-watch-run" does not exist/);

  exitSpy.mockClear();
  errorSpy.mockClear();

  const runDir = join(workDir, 'unknown-notice-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));
  setArgv('notice-ack', runDir, 'missing-notice');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Notice "missing-notice" is not open for this run/);

  exitSpy.mockClear();
  errorSpy.mockClear();

  setArgv('notice-snooze', runDir, 'unattended-park', '--until', 'not-a-date');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Invalid --until timestamp/);
});

test('P10-AC-1/4: export renders a write-once artifact and audit event', async () => {
  const runDir = join(workDir, 'export-run-dir');
  const outputDir = join(workDir, 'custom-exports');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));

  setArgv('export', runDir, '--output-dir', outputDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /--- Run Export ---/);
  assert.match(output, /Status: exported/);
  assert.match(output, /Audit Event:/);
  assert.match(output, /Artifact:/);
  assert.match(output, /SHA-256:/);

  const artifacts = readdirSync(outputDir).filter((entry) => entry.endsWith('.json') && entry !== 'export-audit.jsonl');
  assert.strictEqual(artifacts.length, 1);
  const artifact = JSON.parse(readFileSync(join(outputDir, artifacts[0] as string), 'utf8')) as {
    format: string;
    manifest: { lifecycleState: string; status: string };
  };
  assert.strictEqual(artifact.format, 'jig.audit-export.v0');
  assert.strictEqual(artifact.manifest.lifecycleState, 'stopped');
  assert.strictEqual(artifact.manifest.status, 'failure');
  assert.match(readFileSync(join(outputDir, 'export-audit.jsonl'), 'utf8'), /"family":"export\.prepared"/);
});

test('run(): export validates required arguments', async () => {
  setArgv('export');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Usage:/);
});

test('P09-AC-1/2: decide appends a durable owner decision and renders the result', async () => {
  const runDir = join(workDir, 'decide-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));

  setArgv('decide', runDir, '--outcome', 'hand-off', '--to', 'platform-owner', '--reason', 'needs platform review');
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /--- Owner Decision ---/);
  assert.match(output, /Outcome: hand-off/);
  assert.match(output, /Story: STORY-2/);
  assert.match(output, /Reason: needs platform review/);

  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(
    events.some(
      (event) =>
        event.family === 'owner-decision.recorded' &&
        event.actor === 'owner' &&
        event.storyId === 'STORY-2' &&
        event.outcome === 'hand-off' &&
        event.handedOffTo === 'platform-owner',
    ),
  );
});

test('P09-AC-1/2: decide accepts an explicit story without optional reason or hand-off target', async () => {
  const runDir = join(workDir, 'decide-explicit-story-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(stoppedProjectionEvents()));

  setArgv('decide', runDir, '--outcome', 'approve', '--story', 'STORY-2');
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /Outcome: approve/);
  assert.match(output, /Story: STORY-2/);
  assert.doesNotMatch(output, /Reason:/);
});

test('P09-AC-3: decide renders refusals without an attached story', async () => {
  const runDir = join(workDir, 'decide-refused-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
      },
    ]),
  );

  setArgv('decide', runDir, '--outcome', 'approve');
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /Outcome: refused/);
  assert.match(output, /Reason: no-routed-decision/);
  assert.doesNotMatch(output, /Story:/);
});

test('P09-AC-4: stop requests a coordinated stop and renders the request', async () => {
  const runDir = join(workDir, 'stop-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
      },
    ]),
  );

  setArgv('stop', runDir, '--reason', 'operator-pause');
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const output = loggedLines();
  assert.match(output, /--- Run Stop ---/);
  assert.match(output, /Status: requested/);
  assert.match(output, /Checkpoint: after:STORY-1/);
  assert.match(output, /Reason: operator-pause/);
});

test('P09-AC-4: stop can use the default operator-stop reason', async () => {
  const runDir = join(workDir, 'stop-default-reason-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
      },
    ]),
  );

  setArgv('stop', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  assert.match(loggedLines(), /Reason: operator-stop/);
});

test('run(): P09 control commands validate required arguments', async () => {
  for (const args of [
    ['decide'],
    ['decide', 'runs/run-existing'],
    ['decide', 'runs/run-existing', '--outcome', 'maybe'],
    ['stop'],
  ]) {
    setArgv(...args);
    await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
    expect(exitSpy).toHaveBeenCalledWith(1);
    assert.match(erroredLines(), /Usage:/);
    exitSpy.mockClear();
    errorSpy.mockClear();
  }
});

test('run(): P09 control commands surface operator errors', async () => {
  setArgv('decide', join(workDir, 'missing-decision-run'), '--outcome', 'approve');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Run directory ".*missing-decision-run" does not exist/);

  exitSpy.mockClear();
  errorSpy.mockClear();

  setArgv('stop', join(workDir, 'missing-stop-run'));
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Run directory ".*missing-stop-run" does not exist/);
});
