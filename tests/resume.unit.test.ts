import assert from 'node:assert';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'vitest';
import { LocalHarness } from '../src/harness.js';
import { validatePlanForScheduling } from '../src/intake.js';
import type { RunProjection } from '../src/projection.js';
import { RecordManager } from '../src/records.js';
import { buildResumePlan, ResumeRefusal, resumeRun } from '../src/resume.js';
import type {
  ConfigDoc,
  GitWorkspaceFingerprint,
  Plan,
  PolicyDoc,
  RunEvent,
  WorkspaceFingerprint,
} from '../src/types.js';
import { ScriptedWorker } from '../src/worker.js';
import { captureWorkspaceFingerprint } from '../src/workspace.js';

let runDir: string;

beforeEach(() => {
  runDir = mkdtempSync(join(tmpdir(), 'jig-resume-unit-'));
});

afterEach(() => {
  rmSync(runDir, { recursive: true, force: true });
});

function plan(): Plan {
  return {
    id: 'plan-resume',
    version: 'execution-plan-shape-v0',
    stories: [
      { id: 'STORY-1', title: 'blocked first' },
      { id: 'STORY-2', title: 'independent second' },
    ],
  };
}

function launchPolicy(overrides: PolicyDoc = {}): PolicyDoc {
  return {
    policy: {
      id: 'local-dry-run-policy',
      ...overrides.policy,
      rules: {
        allowLocalDryRun: true,
        ...overrides.policy?.rules,
      },
    },
  };
}

function stringifyJsonl(events: RunEvent[]): string {
  return `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
}

function assertGitWorkspace(workspace: WorkspaceFingerprint): asserts workspace is GitWorkspaceFingerprint {
  if (!('kind' in workspace) || workspace.kind !== 'git') {
    assert.fail('workspace mismatch test requires a git workspace');
  }
}

function stoppedEvents(workspace = captureWorkspaceFingerprint(process.cwd())): RunEvent[] {
  return [
    {
      family: 'run.started',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:00.000Z',
      runId: 'run-plan-resume-existing',
      planId: 'plan-resume',
      mode: 'local-dry-run',
      binding: {
        policyRef: 'local-dry-run-policy',
        configRef: 'mode=local-dry-run;recordDir=runs',
        workspace,
      },
      posture: {
        record: 'safe-for-owner-record',
        export: 'redacted',
      },
      planSnapshot: { ref: 'plan.snapshot.json' },
      policySnapshot: { ref: 'policy.snapshot.json' },
    },
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
  ];
}

function writeStoppedRun(events = stoppedEvents(), planSnapshot = plan(), policySnapshot = launchPolicy()): void {
  writeFileSync(join(runDir, 'plan.snapshot.json'), JSON.stringify(planSnapshot, null, 2));
  writeFileSync(join(runDir, 'policy.snapshot.json'), JSON.stringify(policySnapshot, null, 2));
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(events));
}

function writeScriptedOutput(): string {
  const outputPath = join(runDir, 'scripted-output.json');
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        stories: [
          {
            storyId: 'STORY-2',
            outcome: 'success',
            evidence: { result: 'passed' },
          },
        ],
      },
      null,
      2,
    ),
  );
  return outputPath;
}

function writeJson(name: string, value: unknown): string {
  const path = join(runDir, name);
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
}

function readRunEvents(): RunEvent[] {
  return readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
}

test('P4-AC-1: resume appends run.resumed and continues in the same run directory', async () => {
  writeStoppedRun();
  const scriptedOutputPath = writeScriptedOutput();

  const status = await resumeRun({ runDir, scriptedOutputPath });

  assert.strictEqual(status, 'success');
  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.strictEqual(events.filter((event) => event.family === 'run.started').length, 1);
  assert.ok(events.find((event) => event.family === 'run.resumed' && event.runId === 'run-plan-resume-existing'));
  assert.ok(events.find((event) => event.family === 'story.done' && event.storyId === 'STORY-2'));
  assert.ok(events.find((event) => event.family === 'run.completed'));

  const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as {
    run: { id: string; attempt: number };
  };
  assert.strictEqual(runRecord.run.id, 'run-plan-resume-existing');
  assert.strictEqual(runRecord.run.attempt, 1);
});

test('P4-AC-1: real RecordManager run output resumes through resumeRun without fixture aliases', async () => {
  const recordBaseDir = join(runDir, 'records');
  const config: ConfigDoc = {
    runner: {
      mode: 'local-dry-run',
      recordDir: recordBaseDir,
    },
    drivers: {
      agent: 'scripted-stub',
      executionHost: 'local',
    },
  };
  const planSnapshot: Plan = {
    id: 'plan-real-resume',
    version: 'execution-plan-shape-v0',
    stories: [
      { id: 'STORY-1', title: 'fails first' },
      { id: 'STORY-2', title: 'continues after resume' },
    ],
  };
  const policy = launchPolicy();
  const harness = new LocalHarness(
    new ScriptedWorker({
      stories: [
        {
          storyId: 'STORY-1',
          outcome: 'failure',
          evidence: { result: 'failed' },
          error: 'first stop',
        },
      ],
    }),
    new RecordManager(),
  );

  assert.strictEqual(await harness.run(validatePlanForScheduling({ plan: planSnapshot }), config, policy), 'failure');
  const [runName] = readdirSync(recordBaseDir);
  assert.ok(runName);
  const realRunDir = join(recordBaseDir, runName);
  const [launchLine] = readFileSync(join(realRunDir, 'events.jsonl'), 'utf8').trim().split('\n');
  const launch = JSON.parse(launchLine) as RunEvent;
  assert.ok(launch.planSnapshot);
  assert.ok(launch.policySnapshot);
  assert.strictEqual(launch.planSnapshotRef, undefined);
  assert.strictEqual(launch.policySnapshotRef, undefined);
  assert.deepStrictEqual(launch.posture, {
    record: 'safe-for-owner-record',
    export: 'redacted',
  });

  const scriptedOutputPath = join(runDir, 'real-resume-output.json');
  writeFileSync(
    scriptedOutputPath,
    JSON.stringify(
      {
        stories: [
          {
            storyId: 'STORY-2',
            outcome: 'success',
            evidence: { result: 'passed' },
          },
        ],
      },
      null,
      2,
    ),
  );

  assert.strictEqual(await resumeRun({ runDir: realRunDir, scriptedOutputPath }), 'success');
  const events = readFileSync(join(realRunDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(events.find((event) => event.family === 'run.resumed'));
  assert.ok(events.find((event) => event.family === 'story.done' && event.storyId === 'STORY-2'));
});

test('P4-AC-1: resume accepts matching verification bindings without rebinding the launch policy', async () => {
  const policy = launchPolicy();
  writeStoppedRun(stoppedEvents(), plan(), policy);
  const scriptedOutputPath = writeScriptedOutput();
  const configPath = writeJson('config.json', {
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: { agent: 'scripted-stub', executionHost: 'local' },
  });
  const policyPath = writeJson('policy.json', policy);
  const planPath = writeJson('plan.json', { plan: plan() });

  const status = await resumeRun({ runDir, scriptedOutputPath, configPath, policyPath, planPath });

  assert.strictEqual(status, 'success');
  const record = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as {
    run: { binding: { policyRef: string }; policySnapshot?: { ref?: string } };
  };
  assert.strictEqual(record.run.binding.policyRef, 'local-dry-run-policy');
  assert.strictEqual(record.run.policySnapshot?.ref, 'policy.snapshot.json');
});

test('P4-AC-1: resume with mismatched verification policy is refused without appending events', async () => {
  writeStoppedRun();
  const scriptedOutputPath = writeScriptedOutput();
  const policyPath = join(runDir, 'other-policy.json');
  writeFileSync(policyPath, JSON.stringify({ policy: { id: 'other-policy', rules: { allowLocalDryRun: true } } }));
  const before = readFileSync(join(runDir, 'events.jsonl'), 'utf8');

  await assert.rejects(
    () => resumeRun({ runDir, scriptedOutputPath, policyPath }),
    (error: unknown) => error instanceof ResumeRefusal && error.reason === 'resume-blocked-binding-mismatch',
  );

  assert.strictEqual(readFileSync(join(runDir, 'events.jsonl'), 'utf8'), before);
});

test('P4-AC-1: resume with mismatched verification config or plan is refused without appending events', async () => {
  writeStoppedRun();
  const scriptedOutputPath = writeScriptedOutput();
  const configPath = writeJson('config.json', {
    runner: { mode: 'local-dry-run', recordDir: 'other-runs' },
    drivers: { agent: 'scripted-stub', executionHost: 'local' },
  });
  const planPath = writeJson('plan.json', {
    plan: {
      ...plan(),
      stories: [{ id: 'STORY-9', title: 'different story' }],
    },
  });
  const before = readFileSync(join(runDir, 'events.jsonl'), 'utf8');

  await assert.rejects(
    () => resumeRun({ runDir, scriptedOutputPath, configPath }),
    (error: unknown) => error instanceof ResumeRefusal && error.reason === 'resume-blocked-binding-mismatch',
  );
  await assert.rejects(
    () => resumeRun({ runDir, scriptedOutputPath, planPath }),
    (error: unknown) => error instanceof ResumeRefusal && error.reason === 'resume-blocked-binding-mismatch',
  );

  assert.strictEqual(readFileSync(join(runDir, 'events.jsonl'), 'utf8'), before);
});

test('P4-AC-3: resume refuses missing or mismatched durable policy snapshots before executing', async () => {
  writeStoppedRun();
  const scriptedOutputPath = writeScriptedOutput();

  rmSync(join(runDir, 'policy.snapshot.json'));
  await assert.rejects(
    () => resumeRun({ runDir, scriptedOutputPath }),
    (error: unknown) =>
      error instanceof ResumeRefusal &&
      error.reason === 'resume-blocked-binding-mismatch' &&
      /missing policy snapshot/.test(error.message),
  );

  writeStoppedRun(stoppedEvents(), plan(), { policy: { id: 'other-policy', rules: { allowLocalDryRun: true } } });
  await assert.rejects(
    () => resumeRun({ runDir, scriptedOutputPath }),
    /policy snapshot id "other-policy" does not match launch binding "local-dry-run-policy"/,
  );

  writeStoppedRun(stoppedEvents(), plan(), { policy: { rules: { allowLocalDryRun: true } } });
  await assert.rejects(
    () => resumeRun({ runDir, scriptedOutputPath }),
    /policy snapshot id "unknown-policy" does not match launch binding "local-dry-run-policy"/,
  );
});

test('P4-AC-1: resume refuses missing events or plan snapshot before appending events', async () => {
  await assert.rejects(() => resumeRun({ runDir, scriptedOutputPath: writeScriptedOutput() }), /Missing authoritative/);

  writeStoppedRun();
  rmSync(join(runDir, 'plan.snapshot.json'));

  await assert.rejects(
    () => resumeRun({ runDir, scriptedOutputPath: writeScriptedOutput() }),
    (error: unknown) =>
      error instanceof ResumeRefusal &&
      error.reason === 'resume-blocked-binding-mismatch' &&
      /missing plan snapshot/.test(error.message),
  );
});

test('P4-AC-3: resumed rule-governing work is routed under durable launch policy snapshot', async () => {
  const policy = launchPolicy({
    policy: {
      id: 'local-dry-run-policy',
      rules: {
        allowLocalDryRun: true,
        ruleGoverningSurfaces: ['policies/**'],
      },
    },
  });
  const planSnapshot: Plan = {
    id: 'plan-resume',
    version: 'execution-plan-shape-v0',
    stories: [
      { id: 'STORY-1', title: 'blocked first' },
      {
        id: 'STORY-2',
        title: 'rule governing resumed work',
        scope: ['policies/**'],
        authority: {
          requests: ['edit-files'],
        },
      },
    ],
  };
  writeStoppedRun(stoppedEvents(), planSnapshot, policy);
  const scriptedOutputPath = join(runDir, 'scripted-output.json');
  writeFileSync(
    scriptedOutputPath,
    JSON.stringify(
      {
        stories: [
          {
            storyId: 'STORY-2',
            outcome: 'success',
            requests: [{ id: 'REQ-policy', kind: 'edit-files', paths: ['policies/local.json'] }],
            evidence: { result: 'passed' },
          },
        ],
      },
      null,
      2,
    ),
  );

  const status = await resumeRun({ runDir, scriptedOutputPath });

  assert.strictEqual(status, 'failure');
  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.routed' &&
        event.storyId === 'STORY-2' &&
        event.requestId === 'REQ-policy' &&
        Array.isArray(event.basis) &&
        event.basis.includes('GUARD-2'),
    ),
  );
  assert.ok(!events.find((event) => event.family === 'authorization.granted' && event.requestId === 'REQ-policy'));
  assert.ok(events.find((event) => event.family === 'story.parked' && event.storyId === 'STORY-2'));
});

test('P4-AC-2: resumed allowed request is granted through the resume execution path', async () => {
  const planSnapshot: Plan = {
    id: 'plan-resume',
    version: 'execution-plan-shape-v0',
    stories: [
      { id: 'STORY-1', title: 'blocked first' },
      {
        id: 'STORY-2',
        title: 'allowed edit after resume',
        scope: ['src/**'],
        authority: {
          requests: ['edit-files'],
        },
      },
    ],
  };
  writeStoppedRun(stoppedEvents(), planSnapshot);
  const scriptedOutputPath = writeJson('scripted-output.json', {
    stories: [
      {
        storyId: 'STORY-2',
        outcome: 'success',
        requests: [{ id: 'REQ-allowed', kind: 'edit-files', paths: ['src/resume.ts'] }],
        evidence: { result: 'passed' },
      },
    ],
  });

  const status = await resumeRun({ runDir, scriptedOutputPath });

  assert.strictEqual(status, 'success');
  const events = readRunEvents();
  assert.ok(events.find((event) => event.family === 'authorization.granted' && event.requestId === 'REQ-allowed'));
  assert.ok(events.find((event) => event.family === 'story.done' && event.storyId === 'STORY-2'));
});

test('P4-AC-2: resumed denied request blocks through the resume execution path', async () => {
  const planSnapshot: Plan = {
    id: 'plan-resume',
    version: 'execution-plan-shape-v0',
    stories: [
      { id: 'STORY-1', title: 'blocked first' },
      {
        id: 'STORY-2',
        title: 'denied edit after resume',
        scope: ['src/**'],
        authority: {
          requests: ['edit-files'],
        },
      },
    ],
  };
  writeStoppedRun(stoppedEvents(), planSnapshot);
  const scriptedOutputPath = writeJson('scripted-output.json', {
    stories: [
      {
        storyId: 'STORY-2',
        outcome: 'success',
        requests: [{ id: 'REQ-denied', kind: 'edit-files', paths: ['docs/adr.md'] }],
        evidence: { result: 'passed' },
      },
    ],
  });

  const status = await resumeRun({ runDir, scriptedOutputPath });

  assert.strictEqual(status, 'failure');
  const events = readRunEvents();
  assert.ok(events.find((event) => event.family === 'authorization.denied' && event.requestId === 'REQ-denied'));
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' && event.storyId === 'STORY-2' && event.reason === 'authorization-denied',
    ),
  );
});

test('P4-AC-6: resume with a changed workspace fingerprint is refused without appending events', async () => {
  const workspace = captureWorkspaceFingerprint(process.cwd());
  assertGitWorkspace(workspace);
  writeStoppedRun(
    stoppedEvents({
      ...workspace,
      changeSetHash: `${workspace.changeSetHash}-different`,
    }),
  );
  const scriptedOutputPath = writeScriptedOutput();
  const before = readFileSync(join(runDir, 'events.jsonl'), 'utf8');

  await assert.rejects(
    () => resumeRun({ runDir, scriptedOutputPath }),
    (error: unknown) => error instanceof ResumeRefusal && error.reason === 'resume-blocked-workspace-mismatch',
  );

  assert.strictEqual(readFileSync(join(runDir, 'events.jsonl'), 'utf8'), before);
});

test('P4-AC-6: resume refuses unavailable workspace fingerprints instead of claiming continuity', async () => {
  writeStoppedRun(
    stoppedEvents({
      kind: 'unavailable',
      reason: 'not-a-git-worktree',
      detail: 'workspace fingerprint unavailable outside a git worktree',
    }),
  );
  const scriptedOutputPath = writeScriptedOutput();
  const before = readFileSync(join(runDir, 'events.jsonl'), 'utf8');

  await assert.rejects(
    () => resumeRun({ runDir, scriptedOutputPath }),
    (error: unknown) => error instanceof ResumeRefusal && error.reason === 'resume-blocked-workspace-mismatch',
  );

  assert.strictEqual(readFileSync(join(runDir, 'events.jsonl'), 'utf8'), before);
});

test('P4-AC-4: resume refuses a defective projection before appending events', async () => {
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'plan.snapshot.json'), JSON.stringify(plan(), null, 2));
  writeFileSync(join(runDir, 'policy.snapshot.json'), JSON.stringify(launchPolicy(), null, 2));
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      stoppedEvents()[0],
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
    ]),
  );
  const scriptedOutputPath = writeScriptedOutput();
  const before = readFileSync(join(runDir, 'events.jsonl'), 'utf8');

  await assert.rejects(() => resumeRun({ runDir, scriptedOutputPath }), /Illegal replay transition/);

  assert.strictEqual(readFileSync(join(runDir, 'events.jsonl'), 'utf8'), before);
});

test('P4-AC-1: ResumePlan is a narrow projection-to-harness handoff with parked request context', () => {
  const projection: RunProjection = {
    runId: 'run-existing',
    planId: 'plan-resume',
    mode: 'local-dry-run',
    binding: {
      policyRef: 'local-dry-run-policy',
      configRef: 'mode=local-dry-run;recordDir=runs',
      workspace: {
        repoRoot: '/tmp/jig',
        head: 'abc',
        changeSetHash: 'clean',
      },
    },
    workspace: {
      repoRoot: '/tmp/jig',
      head: 'abc',
      changeSetHash: 'clean',
    },
    posture: {
      record: 'safe-for-owner-record',
      export: 'redacted',
    },
    planSnapshotRef: 'plan.snapshot.json',
    policySnapshotRef: 'policy.snapshot.json',
    status: 'failure',
    lifecycleState: 'stopped',
    stopCause: 'unattended-park',
    safeCheckpoint: 'after:STORY-2.parked',
    unstartedStoryIds: ['STORY-3'],
    stories: {
      'STORY-1': { storyId: 'STORY-1', state: 'done', changedFiles: [], lastEventFamily: 'story.done' },
      'STORY-2': { storyId: 'STORY-2', state: 'parked', changedFiles: [], lastEventFamily: 'story.parked' },
      'STORY-4': { storyId: 'STORY-4', state: 'blocked', changedFiles: [], lastEventFamily: 'story.blocked' },
    },
    changedFiles: [],
    diagnostics: [],
    notices: [],
    eventCount: 4,
  };
  const resumePlan = buildResumePlan(projection, [
    {
      family: 'story.parked',
      actor: 'runner',
      storyId: 'STORY-2',
      requestId: 'REQ-2',
      requestKind: 'edit-files',
    },
  ]);

  assert.deepStrictEqual(resumePlan, {
    runId: 'run-existing',
    checkpoint: 'after:STORY-2.parked',
    stopCause: 'unattended-park',
    completedStoryIds: ['STORY-1'],
    blockedStoryIds: ['STORY-4'],
    parkedStoryId: 'STORY-2',
    unstartedStoryIds: ['STORY-3'],
    parkedRequest: {
      requestId: 'REQ-2',
      requestKind: 'edit-files',
    },
  });

  assert.throws(
    () =>
      buildResumePlan(
        {
          ...projection,
          lifecycleState: 'completed',
          safeCheckpoint: undefined,
          stopCause: undefined,
        },
        [],
      ),
    /Cannot resume/,
  );
});

test('P4-AC-1: ResumePlan omits parked request when checkpoint is not backed by a parked event', () => {
  const projection: RunProjection = {
    runId: 'run-existing',
    planId: 'plan-resume',
    mode: 'local-dry-run',
    binding: {
      policyRef: 'local-dry-run-policy',
      configRef: 'mode=local-dry-run;recordDir=runs',
      workspace: {
        repoRoot: '/tmp/jig',
        head: 'abc',
        changeSetHash: 'clean',
      },
    },
    workspace: {
      repoRoot: '/tmp/jig',
      head: 'abc',
      changeSetHash: 'clean',
    },
    posture: {
      record: 'safe-for-owner-record',
      export: 'redacted',
    },
    planSnapshotRef: 'plan.snapshot.json',
    policySnapshotRef: 'policy.snapshot.json',
    status: 'failure',
    lifecycleState: 'stopped',
    stopCause: 'work-item-blocked',
    safeCheckpoint: 'after:STORY-1',
    unstartedStoryIds: ['STORY-2'],
    stories: {
      'STORY-1': { storyId: 'STORY-1', state: 'blocked', changedFiles: [], lastEventFamily: 'story.blocked' },
    },
    changedFiles: [],
    diagnostics: [],
    notices: [],
    eventCount: 3,
  };

  assert.deepStrictEqual(buildResumePlan(projection, []), {
    runId: 'run-existing',
    checkpoint: 'after:STORY-1',
    stopCause: 'work-item-blocked',
    completedStoryIds: [],
    blockedStoryIds: ['STORY-1'],
    parkedStoryId: null,
    unstartedStoryIds: ['STORY-2'],
    parkedRequest: undefined,
  });

  assert.deepStrictEqual(
    buildResumePlan(
      {
        ...projection,
        safeCheckpoint: 'after:STORY-2.parked',
        stories: {
          'STORY-2': { storyId: 'STORY-2', state: 'parked', changedFiles: [], lastEventFamily: 'story.parked' },
        },
      },
      [],
    ).parkedRequest,
    undefined,
  );
});
