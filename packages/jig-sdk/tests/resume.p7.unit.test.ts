import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'vitest';
import type { GitHubForgeTransport } from '../src/providers/real/forge.js';
import { resumeRun } from '../src/resume.js';
import type { ConfigDoc, Plan, PolicyDoc, RunEvent, RunRecord } from '../src/types.js';
import { captureWorkspaceFingerprint } from '../src/workspace.js';

let runDir: string;

beforeEach(() => {
  runDir = mkdtempSync(join(tmpdir(), 'jig-resume-p7-'));
});

afterEach(() => {
  rmSync(runDir, { recursive: true, force: true });
});

const plan: Plan = {
  id: 'plan-p7-resume',
  version: 'execution-plan-shape-v0',
  stories: [
    { id: 'STORY-1', title: 'landed before stop' },
    { id: 'STORY-2', title: 'blocked checkpoint' },
  ],
};

const policy: PolicyDoc = {
  version: 'policy-v0',
  policy: {
    id: 'policy-p7-resume',
    rules: {
      allowLocalDryRun: true,
    },
  },
};

const resumeConfig: ConfigDoc = {
  runner: {
    mode: 'local-dry-run',
    recordDir: 'runs',
  },
  drivers: {
    forge: 'github',
  },
};

function stringifyJsonl(events: RunEvent[]): string {
  return `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
}

function writeConfig(): string {
  const configPath = join(runDir, 'config.json');
  writeFileSync(configPath, JSON.stringify(resumeConfig, null, 2));
  return configPath;
}

function writeScriptedOutput(value: unknown = { stories: [] }): string {
  const scriptedOutputPath = join(runDir, 'scripted-output.json');
  writeFileSync(scriptedOutputPath, JSON.stringify(value, null, 2));
  return scriptedOutputPath;
}

function readEvents(): RunEvent[] {
  return readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
}

function writeRun(events: RunEvent[], planSnapshot = plan): void {
  writeFileSync(join(runDir, 'plan.snapshot.json'), JSON.stringify(planSnapshot, null, 2));
  writeFileSync(join(runDir, 'policy.snapshot.json'), JSON.stringify(policy, null, 2));
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(events));
}

function stoppedAfterPriorLanding(targetHead = 'landed-head'): RunEvent[] {
  return [
    {
      family: 'run.started',
      actor: 'runner',
      timestamp: '2026-07-04T09:00:00.000Z',
      runId: 'run-p7-resume',
      planId: plan.id,
      mode: 'local-dry-run',
      binding: {
        policyRef: 'policy-p7-resume',
        configRef: 'mode=local-dry-run;recordDir=runs',
        workspace: captureWorkspaceFingerprint(process.cwd()),
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
      timestamp: '2026-07-04T09:00:01.000Z',
      storyId: 'STORY-1',
    },
    {
      family: 'evidence.modeled',
      actor: 'runner',
      timestamp: '2026-07-04T09:00:02.000Z',
      storyId: 'STORY-1',
      result: 'passed',
    },
    {
      family: 'story.done',
      actor: 'runner',
      timestamp: '2026-07-04T09:00:03.000Z',
      storyId: 'STORY-1',
    },
    {
      family: 'runner-action.pushed',
      actor: 'runner',
      timestamp: '2026-07-04T09:00:04.000Z',
      storyId: 'STORY-1',
      action: 'push',
      landingKind: 'push',
      targetRef: 'refs/heads/phase-7',
      targetHead,
    },
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-04T09:00:05.000Z',
      storyId: 'STORY-2',
    },
    {
      family: 'story.blocked',
      actor: 'runner',
      timestamp: '2026-07-04T09:00:06.000Z',
      storyId: 'STORY-2',
      reason: 'worker-reported-failure',
    },
    {
      family: 'run.stopped',
      actor: 'runner',
      timestamp: '2026-07-04T09:00:07.000Z',
      reason: 'work-item-blocked',
      checkpoint: 'after:STORY-2',
      unstarted: [],
    },
  ];
}

function stoppedBeforeResumeLanding(): RunEvent[] {
  return [
    {
      family: 'run.started',
      actor: 'runner',
      timestamp: '2026-07-04T09:00:00.000Z',
      runId: 'run-p7-resume-redaction',
      planId: plan.id,
      mode: 'local-dry-run',
      binding: {
        policyRef: 'policy-p7-resume',
        configRef: 'mode=local-dry-run;recordDir=runs',
        workspace: captureWorkspaceFingerprint(process.cwd()),
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
      timestamp: '2026-07-04T09:00:01.000Z',
      storyId: 'STORY-1',
    },
    {
      family: 'story.blocked',
      actor: 'runner',
      timestamp: '2026-07-04T09:00:02.000Z',
      storyId: 'STORY-1',
      reason: 'worker-reported-failure',
    },
    {
      family: 'run.stopped',
      actor: 'runner',
      timestamp: '2026-07-04T09:00:03.000Z',
      reason: 'work-item-blocked',
      checkpoint: 'after:STORY-1',
      unstarted: ['STORY-2'],
    },
  ];
}

function fakeTransport(calls: string[], currentHead: string, diagnosticSecret?: string): GitHubForgeTransport {
  return {
    push: async (request) => {
      calls.push(`push:${request.storyId}`);
      return {
        targetRef: 'refs/heads/phase-7',
        targetHead: currentHead,
        diagnostics: diagnosticSecret ? { stdout: `pushed with ${diagnosticSecret}` } : undefined,
      };
    },
    openPullRequest: async (request) => {
      calls.push(`open-pr:${request.storyId}`);
      return {
        targetRef: 'refs/heads/phase-7',
        targetHead: currentHead,
      };
    },
    mergePullRequest: async (request) => {
      calls.push(`merge:${request.storyId}`);
      return {
        targetRef: 'refs/heads/main',
        targetHead: currentHead,
      };
    },
    readHead: async (request) => {
      calls.push(`read-head:${request.targetRef}`);
      return {
        targetRef: request.targetRef,
        targetHead: currentHead,
      };
    },
    openOrUpdatePullRequestForBlock: async () => ({
      targetRef: 'refs/heads/phase-7',
      targetHead: currentHead,
    }),
    postBlockStatus: async () => ({
      targetRef: 'refs/heads/phase-7',
      targetHead: currentHead,
    }),
    postBlockComment: async () => ({
      targetRef: 'refs/heads/phase-7',
      targetHead: currentHead,
    }),
  };
}

test('P7-AC-3: resumeRun recomposes the real forge and records a repeated landing no-op from records', async () => {
  const calls: string[] = [];
  writeRun(stoppedAfterPriorLanding('landed-head'));

  const status = await resumeRun({
    runDir,
    scriptedOutputPath: writeScriptedOutput(),
    configPath: writeConfig(),
    forgeTransport: fakeTransport(calls, 'landed-head'),
  });

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(calls, ['read-head:refs/heads/phase-7']);
  const events = readEvents();
  assert.ok(
    events.find(
      (event) =>
        event.family === 'runner-action.skipped-repeated-effect' &&
        event.storyId === 'STORY-1' &&
        event.targetHead === 'landed-head',
    ),
  );
  assert.strictEqual(
    events.some((event) => event.reason === 'landing-verification-unavailable'),
    false,
  );
});

test('P7-AC-3: resumeRun refuses a changed landing head instead of duplicating or blindly no-op-ing', async () => {
  const calls: string[] = [];
  writeRun(stoppedAfterPriorLanding('old-head'));

  const status = await resumeRun({
    runDir,
    scriptedOutputPath: writeScriptedOutput(),
    configPath: writeConfig(),
    forgeTransport: fakeTransport(calls, 'new-head'),
  });

  assert.strictEqual(status, 'failure');
  assert.deepStrictEqual(calls, ['read-head:refs/heads/phase-7']);
  const events = readEvents();
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
    events.some((event) => event.family === 'runner-action.pushed' && event.targetHead === 'new-head'),
    false,
  );
  assert.strictEqual(
    events.some((event) => event.reason === 'landing-verification-unavailable'),
    false,
  );
});

test('P7-AC-4: resumeRun redacts landing-path credentials in resumed landing records', async () => {
  const secret = 'ghp_resume_secret';
  const calls: string[] = [];
  writeRun(stoppedBeforeResumeLanding());

  const status = await resumeRun({
    runDir,
    scriptedOutputPath: writeScriptedOutput({
      stories: [
        {
          storyId: 'STORY-2',
          outcome: 'success',
          evidence: { result: 'passed' },
        },
      ],
    }),
    configPath: writeConfig(),
    forgeTransport: fakeTransport(calls, 'resume-head', secret),
    redaction: {
      secrets: {
        GITHUB_TOKEN: secret,
      },
    },
  });

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(calls, ['push:STORY-2']);
  const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as RunRecord;
  const serialized = JSON.stringify(runRecord);
  assert.strictEqual(serialized.includes(secret), false);
  assert.strictEqual(serialized.includes('[REDACTED]'), true);
  assert.ok(
    runRecord.events.find(
      (event) =>
        event.family === 'runner-action.pushed' && event.storyId === 'STORY-2' && event.targetHead === 'resume-head',
    ),
  );
});
