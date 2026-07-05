import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'vitest';
import { resumeRun } from '../src/resume.js';
import type { Plan, PolicyDoc, RunEvent } from '../src/types.js';
import { captureWorkspaceFingerprint } from '../src/workspace.js';

let runDir: string;

beforeEach(() => {
  runDir = mkdtempSync(join(tmpdir(), 'jig-resume-owner-config-'));
});

afterEach(() => {
  rmSync(runDir, { recursive: true, force: true });
});

const plan: Plan = {
  id: 'plan-p06-resume-owner-config',
  version: 'execution-plan-shape-v0',
  stories: [
    {
      id: 'BLOCKED',
      title: 'seed blocked story',
    },
    {
      id: 'STORY-1',
      title: 'manual re-gated story',
      scope: ['src/**'],
      authority: { requests: ['edit-files'] },
    },
  ],
};

const trackPolicy: PolicyDoc = {
  version: 'policy-v0',
  policy: {
    id: 'policy-p06-track',
    rules: {
      allowLocalDryRun: true,
      gatingPosture: 'assisted',
    },
  },
};

const effectivePolicy: PolicyDoc = {
  version: 'effective-policy-v0',
  policy: {
    id: 'policy-p06-track',
    basis: {
      trackPolicyRef: 'policy-p06-track',
      repoPolicyFloorsRef: 'repo-floor-p06',
      trackRef: 'TRACK-P06',
      tightenedByRepoFloors: ['gatingPosture'],
      enforcedDimensions: [
        'allowLocalDryRun',
        'gatingPosture',
        'mergeSpectrum',
        'concurrencyCeiling',
        'blockResolution',
        'ruleGoverningSurfaces',
        'capabilityIsolation',
      ],
      inertDimensions: [
        { dimension: 'retryBudget', followUp: 'retry-execution-engine' },
        { dimension: 'requiredReviews', followUp: 'required-review-evidence' },
        { dimension: 'escalationRules', followUp: 'doorbell-escalation-policy-surface' },
      ],
    },
    rules: {
      allowLocalDryRun: true,
      gatingPosture: 'manual',
    },
  },
};

function writeStoppedRun(): void {
  writeFileSync(join(runDir, 'plan.snapshot.json'), JSON.stringify(plan, null, 2));
  writeFileSync(join(runDir, 'policy.snapshot.json'), JSON.stringify(trackPolicy, null, 2));
  writeFileSync(join(runDir, 'effective-policy.snapshot.json'), JSON.stringify(effectivePolicy, null, 2));
  writeFileSync(
    join(runDir, 'work-profile.snapshot.json'),
    JSON.stringify(
      {
        version: 'work-profile-v0',
        workProfile: {
          id: 'work-profile-p06',
          model: 'gpt-5',
          effort: 'high',
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(runDir, 'repo-policy-floors.snapshot.json'),
    JSON.stringify(
      {
        version: 'repo-policy-floors-v0',
        repoPolicyFloors: {
          id: 'repo-floor-p06',
          rules: {
            gatingPosture: 'manual',
          },
        },
      },
      null,
      2,
    ),
  );
  const workspace = captureWorkspaceFingerprint(process.cwd());
  const events: RunEvent[] = [
    {
      family: 'run.started',
      actor: 'runner',
      timestamp: '2026-07-06T00:00:00.000Z',
      runId: 'run-p06-resume-owner-config',
      planId: plan.id,
      mode: 'local-dry-run',
      binding: {
        policyRef: 'policy-p06-track',
        configRef: 'mode=local-dry-run;recordDir=runs',
        workspace,
        trackRef: 'TRACK-P06',
        workProfileRef: 'work-profile-p06',
        repoPolicyFloorsRef: 'repo-floor-p06',
      },
      posture: {
        record: 'safe-for-owner-record',
        export: 'redacted',
      },
      planSnapshot: { ref: 'plan.snapshot.json' },
      policySnapshot: { ref: 'policy.snapshot.json' },
      workProfileSnapshot: { ref: 'work-profile.snapshot.json', path: join(runDir, 'work-profile.snapshot.json') },
      repoPolicyFloorsSnapshot: {
        ref: 'repo-policy-floors.snapshot.json',
        path: join(runDir, 'repo-policy-floors.snapshot.json'),
      },
      effectivePolicySnapshot: {
        ref: 'effective-policy.snapshot.json',
        path: join(runDir, 'effective-policy.snapshot.json'),
      },
    },
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-06T00:00:00.250Z',
      storyId: 'BLOCKED',
    },
    {
      family: 'story.blocked',
      actor: 'runner',
      timestamp: '2026-07-06T00:00:00.500Z',
      storyId: 'BLOCKED',
      reason: 'worker-reported-failure',
    },
    {
      family: 'run.stopped',
      actor: 'runner',
      timestamp: '2026-07-06T00:00:01.000Z',
      reason: 'work-item-blocked',
      checkpoint: 'after:BLOCKED',
      unstarted: ['STORY-1'],
    },
  ];
  writeFileSync(join(runDir, 'events.jsonl'), `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
}

function writeScriptedOutput(): string {
  const path = join(runDir, 'scripted-output.json');
  writeFileSync(
    path,
    JSON.stringify(
      {
        stories: [
          {
            storyId: 'STORY-1',
            outcome: 'success',
            requests: [
              {
                id: 'REQ-edit',
                kind: 'edit-files',
                paths: ['src/resume.ts'],
              },
            ],
            evidence: { result: 'passed' },
          },
        ],
      },
      null,
      2,
    ),
  );
  return path;
}

function rewriteLaunchEvent(mutate: (event: RunEvent & { family: 'run.started' }) => RunEvent): void {
  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  const [launchEvent, ...rest] = events;
  assert.ok(launchEvent?.family === 'run.started');
  const typedLaunchEvent = launchEvent as RunEvent & { family: 'run.started' };
  writeFileSync(
    join(runDir, 'events.jsonl'),
    `${[JSON.stringify(mutate(typedLaunchEvent)), ...rest.map((event) => JSON.stringify(event))].join('\n')}\n`,
  );
}

test('P06-AC-1: resume reconstructs the effective floor-merged policy basis from records and honors it', async () => {
  writeStoppedRun();

  const status = await resumeRun({
    runDir,
    scriptedOutputPath: writeScriptedOutput(),
  });

  assert.strictEqual(status, 'failure');
  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.routed' &&
        event.requestId === 'REQ-edit' &&
        Array.isArray(event.basis) &&
        event.basis.includes('CFG-10:manual-review-required'),
    ),
  );
});

test('P06-AC-1: resume refuses when a recorded floor-merged launch is missing the effective-policy snapshot', async () => {
  writeStoppedRun();
  rmSync(join(runDir, 'effective-policy.snapshot.json'));

  await assert.rejects(
    () =>
      resumeRun({
        runDir,
        scriptedOutputPath: writeScriptedOutput(),
      }),
    /missing effective-policy snapshot/i,
  );
});

test('P06-AC-1: resume refuses when launch bindings reference owner snapshots without an effective-policy snapshot binding', async () => {
  writeStoppedRun();
  rewriteLaunchEvent(({ effectivePolicySnapshot, ...launchEvent }) => launchEvent);

  await assert.rejects(
    () =>
      resumeRun({
        runDir,
        scriptedOutputPath: writeScriptedOutput(),
      }),
    /trackRef requires an effective-policy snapshot binding; resume record is incomplete/i,
  );
});

test('P06-AC-1: resume refuses when owner-configuration binding refs exist without snapshot refs', async () => {
  writeStoppedRun();
  rewriteLaunchEvent(
    ({ workProfileSnapshot, repoPolicyFloorsSnapshot, effectivePolicySnapshot, ...launchEvent }) => launchEvent,
  );

  await assert.rejects(
    () =>
      resumeRun({
        runDir,
        scriptedOutputPath: writeScriptedOutput(),
      }),
    /workProfileRef requires a work-profile snapshot binding; resume record is incomplete/i,
  );
});

test('P06-AC-1: resume refuses an effective-policy snapshot with the wrong document version', async () => {
  writeStoppedRun();
  writeFileSync(
    join(runDir, 'effective-policy.snapshot.json'),
    JSON.stringify({ ...effectivePolicy, version: 'effective-policy-v9' }, null, 2),
  );

  await assert.rejects(
    () =>
      resumeRun({
        runDir,
        scriptedOutputPath: writeScriptedOutput(),
      }),
    /effective-policy snapshot must declare version "effective-policy-v0"/i,
  );
});
