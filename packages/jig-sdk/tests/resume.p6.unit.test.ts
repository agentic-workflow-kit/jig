import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'vitest';
import { authorizeRequest } from '../src/authorization.js';
import { composeReferenceRun } from '../src/bootstrap.js';
import type { CapabilityAttestation } from '../src/ports.js';
import { resumeRun } from '../src/resume.js';
import type { Plan, PolicyDoc, RunEvent } from '../src/types.js';
import { captureWorkspaceFingerprint } from '../src/workspace.js';

let runDir: string;

beforeEach(() => {
  runDir = mkdtempSync(join(tmpdir(), 'jig-resume-p6-'));
});

afterEach(() => {
  rmSync(runDir, { recursive: true, force: true });
});

const launchAttestation: CapabilityAttestation = {
  driverId: 'real-host',
  capability: 'filesystem-edit',
  runContext: 'launch-real-host',
  freshness: 'fresh',
  positive: true,
  reportedIsolationStrength: 'weak',
  provenIsolationStrength: 'weak',
};

const plan: Plan = {
  id: 'plan-p6-resume',
  version: 'execution-plan-shape-v0',
  stories: [
    { id: 'STORY-1', title: 'blocked first' },
    {
      id: 'STORY-2',
      title: 'resumed edit',
      scope: ['src/**'],
      authority: { requests: ['edit-files'] },
    },
  ],
};

const policy: PolicyDoc = {
  version: 'policy-v0',
  policy: {
    id: 'policy-p6-resume',
    rules: {
      allowLocalDryRun: true,
      capabilityIsolation: {
        'filesystem-edit': 'strong',
      },
    },
  },
};

function writeStoppedRun(attestationSnapshotPath = join(runDir, 'attestation.snapshot.json')): void {
  const attestationPath = join(runDir, 'attestation.snapshot.json');
  writeFileSync(join(runDir, 'plan.snapshot.json'), JSON.stringify(plan, null, 2));
  writeFileSync(join(runDir, 'policy.snapshot.json'), JSON.stringify(policy, null, 2));
  writeFileSync(attestationPath, JSON.stringify(launchAttestation, null, 2));
  const events: RunEvent[] = [
    {
      family: 'run.started',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:00.000Z',
      runId: 'run-p6-resume',
      planId: plan.id,
      mode: 'local-dry-run',
      binding: {
        policyRef: 'policy-p6-resume',
        configRef: 'mode=local-dry-run;recordDir=runs',
        workspace: captureWorkspaceFingerprint(process.cwd()),
      },
      posture: {
        record: 'safe-for-owner-record',
        export: 'redacted',
      },
      planSnapshot: { ref: 'plan.snapshot.json' },
      policySnapshot: { ref: 'policy.snapshot.json' },
      attestationSnapshot: { ref: 'attestation.snapshot.json', path: attestationSnapshotPath },
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
  writeFileSync(join(runDir, 'events.jsonl'), `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
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
            requests: [
              {
                id: 'REQ-edit',
                kind: 'edit-files',
                paths: ['src/resume.ts'],
                capability: 'filesystem-edit',
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
  return outputPath;
}

test('P6-AC-5: the launch attestation is persisted and recovered on resume', async () => {
  writeStoppedRun();

  const status = await resumeRun({ runDir, scriptedOutputPath: writeScriptedOutput() });

  assert.strictEqual(status, 'failure');
  const run = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as {
    run: { attestationSnapshot?: { ref?: string } };
  };
  assert.strictEqual(run.run.attestationSnapshot?.ref, 'attestation.snapshot.json');
});

test('P6-AC-5: a drifted-host resume is adjudicated against the launch attestation, not the re-derived one', async () => {
  writeStoppedRun();
  const driftedComposed = await composeReferenceRun({
    planInstance: { plan },
    config: { drivers: {} },
    scriptedOutput: {
      stories: [
        {
          storyId: 'STORY-2',
          outcome: 'success',
          evidence: { result: 'passed' },
        },
      ],
    },
  });
  assert.strictEqual(driftedComposed.capabilityAttestation.reportedIsolationStrength, 'strong');
  assert.strictEqual(driftedComposed.capabilityAttestation.provenIsolationStrength, 'strong');
  assert.strictEqual(driftedComposed.capabilityAttestation.provenBy, undefined);
  const wouldGrantIfFreshPermissiveHostWereUsed = authorizeRequest(
    {
      id: 'REQ-edit',
      kind: 'edit-files',
      paths: ['src/resume.ts'],
      capability: 'filesystem-edit',
    },
    plan.stories[1],
    policy,
    {
      ...driftedComposed.capabilityAttestation,
      driverId: 'real-host',
      provenBy: 'exercised-confinement-proof',
    },
  );
  assert.strictEqual(wouldGrantIfFreshPermissiveHostWereUsed.outcome, 'grant');

  await resumeRun({ runDir, scriptedOutputPath: writeScriptedOutput() });

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
        event.basis.includes('containment-unproven'),
    ),
  );
});

test('P6-AC-5: resume loads the launch attestation from the supplied runDir instead of the recorded path', async () => {
  writeStoppedRun('/old/location/attestation.snapshot.json');

  const status = await resumeRun({ runDir, scriptedOutputPath: writeScriptedOutput() });

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
        event.basis.includes('containment-unproven'),
    ),
  );
});
