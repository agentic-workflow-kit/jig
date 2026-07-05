import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import type { CapabilityAttestation } from '../src/ports.js';
import { RecordManager } from '../src/records.js';
import { approveSubstrateManifest } from '../src/substrate.js';
import type { ConfigDoc, Plan, PolicyDoc, RunEvent } from '../src/types.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('P6-AC-5: launch attestation and substrate manifest are persisted with the launch binding', async () => {
  const recordDir = mkdtempSync(join(tmpdir(), 'jig-records-p6-'));
  cleanupDirs.push(recordDir);
  const plan: Plan = {
    id: 'plan-p6-records',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'records' }],
  };
  const config: ConfigDoc = {
    runner: {
      mode: 'local-dry-run',
      recordDir,
    },
  };
  const policy: PolicyDoc = {
    policy: {
      id: 'policy-p6-records',
      rules: { allowLocalDryRun: true },
    },
  };
  const launchAttestation: CapabilityAttestation = {
    driverId: 'real-host',
    capability: 'filesystem-edit',
    runContext: 'local-real-host',
    freshness: 'fresh',
    positive: true,
    reportedIsolationStrength: 'strong',
    provenIsolationStrength: 'strong',
  };
  const manager = new RecordManager({
    launchAttestation,
    substrateManifest: approveSubstrateManifest({
      id: 'codex-real-driver',
      runtimes: ['node'],
      argv: [['codex', 'exec']],
      credentials: ['CODEX_API_KEY'],
      egress: [],
    }),
  });

  manager.init(plan, config, policy);
  manager.recordEvent({ family: 'run.started' });
  await manager.finalize('success');

  const [runName] = readdirSync(recordDir);
  assert.ok(runName);
  const runDir = join(recordDir, runName);
  const [launchLine] = readFileSync(join(runDir, 'events.jsonl'), 'utf8').trim().split('\n');
  const launch = JSON.parse(launchLine) as RunEvent;
  assert.ok(launch.attestationSnapshot?.path);
  assert.ok(launch.substrateManifest?.path);
  assert.deepStrictEqual(
    JSON.parse(readFileSync(join(runDir, 'attestation.snapshot.json'), 'utf8')),
    launchAttestation,
  );
  assert.ok(JSON.parse(readFileSync(join(runDir, 'substrate.manifest.json'), 'utf8')).hash);
});
