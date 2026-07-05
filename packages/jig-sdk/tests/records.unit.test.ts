import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test, vi } from 'vitest';
import { bindOwnerConfiguration } from '../src/owner-configuration.js';
import { RecordManager } from '../src/records.js';
import type { ConfigDoc, Plan, PolicyDoc, RunRecord } from '../src/types.js';
import { captureWorkspaceFingerprint } from '../src/workspace.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempRecordDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'jig-records-'));
  cleanupDirs.push(dir);
  return dir;
}

function plan(): Plan {
  return {
    id: 'plan-v1.2',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Story one' }],
  };
}

function config(recordDir: string): ConfigDoc {
  return {
    runner: {
      mode: 'local-dry-run',
      recordDir,
    },
    drivers: {
      agent: 'scripted-stub',
      executionHost: 'local',
    },
  };
}

const policy: PolicyDoc = {
  version: 'policy-v0',
  policy: {
    id: 'local-dry-run-policy',
    rules: {
      allowLocalDryRun: true,
    },
  },
};

function readSingleRun(recordDir: string): RunRecord {
  const [runDir] = readdirSync(recordDir);
  assert.ok(runDir, 'expected one run directory');
  return JSON.parse(readFileSync(join(recordDir, runDir, 'run.json'), 'utf8')) as RunRecord;
}

function readSingleRunDir(recordDir: string): string {
  const [runDir] = readdirSync(recordDir);
  assert.ok(runDir, 'expected one run directory');
  return join(recordDir, runDir);
}

function initGitRepo(): string {
  const repoDir = mkdtempSync(join(tmpdir(), 'jig-workspace-'));
  cleanupDirs.push(repoDir);

  execFileSync('git', ['init', '-b', 'main'], { cwd: repoDir });
  execFileSync('git', ['config', 'user.name', 'Jig Tests'], { cwd: repoDir });
  execFileSync('git', ['config', 'user.email', 'jig-tests@example.com'], { cwd: repoDir });
  writeFileSync(join(repoDir, 'tracked.txt'), 'clean\n');
  execFileSync('git', ['add', 'tracked.txt'], { cwd: repoDir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: repoDir });

  return repoDir;
}

test('PR-AC-2: run.json id differs from plan id and carries attempt', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();

  manager.init(plan(), config(recordDir), policy);
  manager.recordEvent({ family: 'run.started' });
  await manager.finalize('success');

  const record = readSingleRun(recordDir);
  assert.notStrictEqual(record.run.id, 'plan-v1.2');
  assert.match(record.run.id, /^run-plan-v1\.2-\d+-/);
  assert.strictEqual(record.run.planId, 'plan-v1.2');
  assert.strictEqual(record.run.attempt, 1);
});

test('PR-AC-9: same-millisecond runs do not share a run directory', async () => {
  const recordDir = tempRecordDir();
  vi.spyOn(Date, 'now').mockReturnValue(1719900000000);

  const first = new RecordManager();
  first.init(plan(), config(recordDir), policy);
  first.recordEvent({ family: 'run.started' });
  await first.finalize('success');

  const second = new RecordManager();
  second.init(plan(), config(recordDir), policy);
  second.recordEvent({ family: 'run.started' });
  await second.finalize('success');

  const runDirs = readdirSync(recordDir).sort();
  assert.strictEqual(runDirs.length, 2);
  assert.notStrictEqual(runDirs[0], runDirs[1]);
});

test('PR-AC-3: every event carries actor and run.json carries binding', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();

  manager.init(plan(), config(recordDir), policy);
  manager.recordEvent({ family: 'run.started' });
  manager.recordEvent({ family: 'story.started', storyId: 'STORY-1' });
  await manager.finalize('success');

  const record = readSingleRun(recordDir);
  assert.deepStrictEqual(
    record.events.map((event) => event.actor),
    ['runner', 'runner'],
  );
  assert.deepStrictEqual(record.run.binding, {
    policyRef: 'local-dry-run-policy',
    configRef: `mode=local-dry-run;recordDir=${recordDir}`,
    workspace: record.run.binding.workspace,
  });
  assert.ok('kind' in record.run.binding.workspace);
  assert.strictEqual(record.run.binding.workspace.kind, 'git');
});

test('P4-AC-4: init writes plan and policy snapshots and first events.jsonl line is an enriched run.started header', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();

  manager.init(plan(), config(recordDir), policy);
  manager.recordEvent({ family: 'run.started' });
  manager.recordEvent({ family: 'story.started', storyId: 'STORY-1' });
  await manager.finalize('success');

  const runDir = readSingleRunDir(recordDir);
  const record = readSingleRun(recordDir);
  const planSnapshot = JSON.parse(readFileSync(join(runDir, 'plan.snapshot.json'), 'utf8')) as Plan;
  const policySnapshot = JSON.parse(readFileSync(join(runDir, 'policy.snapshot.json'), 'utf8')) as PolicyDoc;
  const [firstLine] = readFileSync(join(runDir, 'events.jsonl'), 'utf8').trim().split('\n');
  const launchHeader = JSON.parse(firstLine) as Record<string, unknown>;

  assert.deepStrictEqual(planSnapshot, plan());
  assert.deepStrictEqual(policySnapshot, policy);
  assert.deepStrictEqual(launchHeader, {
    family: 'run.started',
    runId: record.run.id,
    planId: plan().id,
    mode: 'local-dry-run',
    binding: record.run.binding,
    posture: record.run.posture,
    planSnapshot: record.run.planSnapshot,
    policySnapshot: record.run.policySnapshot,
    actor: 'runner',
    timestamp: launchHeader.timestamp,
  });
  assert.match(String(launchHeader.timestamp), /^\d{4}-\d{2}-\d{2}T/);
  assert.strictEqual(record.events[0]?.family, 'run.started');
});

test('P4-AC-4: record manager defaults sparse optional binding fields without losing launch header shape', async () => {
  const recordDir = tempRecordDir();
  const previousCwd = process.cwd();
  const manager = new RecordManager();

  try {
    process.chdir(recordDir);
    manager.init(plan(), { runner: {}, drivers: {} }, { policy: {} });
    manager.recordEvent({ family: 'story.started', storyId: 'STORY-1' });
    await manager.finalize('success');
  } finally {
    process.chdir(previousCwd);
  }

  const runDir = join(recordDir, 'runs');
  const record = readSingleRun(runDir);
  assert.strictEqual(record.run.mode, undefined);
  assert.strictEqual(record.run.binding.policyRef, 'unknown-policy');
  assert.strictEqual(record.run.binding.configRef, 'mode=unknown-mode;recordDir=runs');
  assert.strictEqual(record.events[0]?.family, 'run.started');
  assert.strictEqual(record.events[1]?.family, 'story.started');
});

test('P4-AC-6: workspace fingerprint hash changes across materially different dirty tracked and staged changes', () => {
  const repoDir = initGitRepo();
  const clean = captureWorkspaceFingerprint(repoDir);

  writeFileSync(join(repoDir, 'tracked.txt'), 'dirty-one\n');
  const trackedDirty = captureWorkspaceFingerprint(repoDir);

  writeFileSync(join(repoDir, 'tracked.txt'), 'dirty-two\n');
  execFileSync('git', ['add', 'tracked.txt'], { cwd: repoDir });
  const stagedDirty = captureWorkspaceFingerprint(repoDir);

  assert.ok('kind' in clean);
  assert.strictEqual(clean.kind, 'git');
  assert.strictEqual(clean.changeSetHash, 'git-tree-clean');
  assert.ok('kind' in trackedDirty);
  assert.ok('kind' in stagedDirty);
  assert.strictEqual(trackedDirty.kind, 'git');
  assert.strictEqual(stagedDirty.kind, 'git');
  assert.strictEqual(trackedDirty.repoRoot, stagedDirty.repoRoot);
  assert.strictEqual(trackedDirty.head, stagedDirty.head);
  assert.notStrictEqual(trackedDirty.changeSetHash, stagedDirty.changeSetHash);
});

test('P4-AC-6: non-git contexts fail closed and diagnosably instead of claiming continuity', () => {
  const nonGitDir = mkdtempSync(join(tmpdir(), 'jig-not-git-'));
  cleanupDirs.push(nonGitDir);

  const fingerprint = captureWorkspaceFingerprint(nonGitDir);

  assert.deepStrictEqual(fingerprint, {
    kind: 'unavailable',
    reason: 'not-a-git-worktree',
    detail: 'workspace fingerprint unavailable outside a git worktree',
  });
});

test('P4-AC-6: workspace fingerprint exposes git command failures without claiming continuity', () => {
  const unbornRepoDir = mkdtempSync(join(tmpdir(), 'jig-unborn-git-'));
  cleanupDirs.push(unbornRepoDir);
  execFileSync('git', ['init', '-b', 'main'], { cwd: unbornRepoDir });

  assert.deepStrictEqual(captureWorkspaceFingerprint(unbornRepoDir), {
    kind: 'unavailable',
    reason: 'git-command-failed',
    detail:
      "fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.\nUse '--' to separate paths from revisions, like this:\n'git <command> [<revision>...] -- [<file>...]'",
  });

  const missingDir = join(tmpdir(), `jig-missing-${Date.now()}`);
  const missing = captureWorkspaceFingerprint(missingDir);
  assert.ok('kind' in missing);
  assert.strictEqual(missing.kind, 'unavailable');
  if (missing.kind === 'unavailable') {
    assert.strictEqual(missing.reason, 'git-unavailable');
    assert.match(missing.detail, /git could not be executed|ENOENT/i);
  }
});

test('PR-AC-4: run summary preserves historical story.skipped aliases', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  manager.init(plan(), config(recordDir), policy);
  manager.recordEvent({
    family: 'story.skipped',
    storyId: 'STORY-2',
    reason: 'run stopped after failure',
  });
  await manager.finalize('failure');

  const output = (logSpy.mock.calls as unknown[][]).map((call) => call.join(' ')).join('\n');
  assert.match(output, /- STORY-2: skipped \(run stopped after failure\)/);
});

test('P06-AC-1: record manager snapshots work profile, repo floors, and effective policy when owner configuration is bound', async () => {
  const recordDir = tempRecordDir();
  const cfg = {
    ...config(recordDir),
    track: {
      id: 'TRACK-P06-RECORDS',
      workProfile: {
        version: 'work-profile-v0',
        workProfile: {
          id: 'work-profile-records',
          model: 'gpt-5',
          effort: 'high',
        },
      },
      repoPolicyFloors: {
        version: 'repo-policy-floors-v0',
        repoPolicyFloors: {
          id: 'repo-floor-records',
          rules: {
            gatingPosture: 'manual',
          },
        },
      },
    },
  } satisfies ConfigDoc;
  const trackPolicy: PolicyDoc = {
    version: 'policy-v0',
    policy: {
      id: 'policy-p06-records',
      rules: {
        allowLocalDryRun: true,
        gatingPosture: 'assisted',
      },
    },
  };
  const ownerConfiguration = bindOwnerConfiguration(cfg, trackPolicy);
  const manager = new RecordManager();

  manager.init(plan(), cfg, trackPolicy, ownerConfiguration);
  manager.recordEvent({ family: 'run.started' });
  await manager.finalize('success');

  const runDir = readSingleRunDir(recordDir);
  const record = readSingleRun(recordDir);
  assert.strictEqual(record.run.binding.trackRef, 'TRACK-P06-RECORDS');
  assert.strictEqual(record.run.binding.workProfileRef, 'work-profile-records');
  assert.strictEqual(record.run.binding.repoPolicyFloorsRef, 'repo-floor-records');
  assert.ok(record.run.workProfileSnapshot?.path);
  assert.ok(record.run.repoPolicyFloorsSnapshot?.path);
  assert.ok(record.run.effectivePolicySnapshot?.path);
  assert.deepStrictEqual(
    JSON.parse(readFileSync(join(runDir, 'effective-policy.snapshot.json'), 'utf8')).policy.basis.tightenedByRepoFloors,
    ['gatingPosture'],
  );
});
