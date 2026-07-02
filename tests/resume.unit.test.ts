import assert from 'node:assert';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'vitest';
import { ResumeRefusal, resumeRun } from '../src/resume.js';
import type { GitWorkspaceFingerprint, Plan, RunEvent, WorkspaceFingerprint } from '../src/types.js';
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
        redaction: 'safe-for-owner-record',
        export: 'redacted',
      },
      planSnapshotRef: 'plan.snapshot.json',
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

function writeStoppedRun(events = stoppedEvents()): void {
  writeFileSync(join(runDir, 'plan.snapshot.json'), JSON.stringify(plan(), null, 2));
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

test('P4-AC-4: resume refuses a defective projection before appending events', async () => {
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'plan.snapshot.json'), JSON.stringify(plan(), null, 2));
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
