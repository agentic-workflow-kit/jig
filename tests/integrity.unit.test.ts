import assert from 'node:assert';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { INTEGRITY_FILE, verifyIntegritySidecar } from '../src/integrity.js';
import { RecordManager } from '../src/records.js';
import type { ConfigDoc, Plan, PolicyDoc, RunEvent, RunRecord } from '../src/types.js';

const cleanupDirs: string[] = [];
const integrityKey = 'phase-9-test-key';

afterEach(() => {
  delete process.env.JIG_RECORDS_INTEGRITY_KEY;
  delete process.env.JIG_RECORDS_INTEGRITY_KEY_ID;
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempRecordDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'jig-integrity-'));
  cleanupDirs.push(dir);
  return dir;
}

function plan(): Plan {
  return {
    id: 'plan-integrity',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Story one' }],
  };
}

function policy(): PolicyDoc {
  return {
    policy: {
      id: 'policy-integrity',
      rules: {
        allowLocalDryRun: true,
      },
    },
  };
}

function config(recordDir: string, drivers: ConfigDoc['drivers']): ConfigDoc {
  return {
    runner: {
      mode: 'local-dry-run',
      recordDir,
    },
    drivers,
  };
}

async function runWithConfig(
  configDoc: ConfigDoc,
): Promise<{ runDir: string; record: RunRecord; eventsJsonl: string }> {
  const manager = new RecordManager();
  manager.init(plan(), configDoc, policy());
  manager.recordEvent({ family: 'run.started' });
  manager.recordEvent({ family: 'story.started', storyId: 'STORY-1' });
  manager.recordEvent({ family: 'story.done', storyId: 'STORY-1', changedFiles: ['src/integrity.ts'] });
  await manager.finalize('success');

  const [runName] = readdirSync(configDoc.runner?.recordDir ?? 'runs');
  assert.ok(runName);
  const runDir = join(configDoc.runner?.recordDir ?? 'runs', runName);
  return {
    runDir,
    record: JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as RunRecord,
    eventsJsonl: readFileSync(join(runDir, 'events.jsonl'), 'utf8'),
  };
}

test('P9-AC-1: real-driver wiring materializes a sidecar and additive binding.drivers without serializing the key', async () => {
  process.env.JIG_RECORDS_INTEGRITY_KEY = integrityKey;
  process.env.JIG_RECORDS_INTEGRITY_KEY_ID = 'test-key-id';
  const recordDir = tempRecordDir();
  const { runDir, record, eventsJsonl } = await runWithConfig(
    config(recordDir, {
      agent: 'scripted-stub',
      executionHost: 'local',
      forge: 'github',
      workSource: 'reference',
    }),
  );
  const [launchLine] = eventsJsonl.trim().split('\n');
  const launch = JSON.parse(launchLine ?? '{}') as RunEvent;

  assert.ok(existsSync(join(runDir, INTEGRITY_FILE)));
  assert.strictEqual(existsSync(join(runDir, 'drivers.snapshot.json')), false);
  assert.deepStrictEqual(record.run.binding.drivers, {
    agent: 'scripted-stub',
    executionHost: 'local',
    forge: 'github',
    workSource: 'reference',
  });
  assert.deepStrictEqual(launch.binding?.drivers, record.run.binding.drivers);
  assert.doesNotMatch(readFileSync(join(runDir, INTEGRITY_FILE), 'utf8'), new RegExp(integrityKey));
  assert.doesNotMatch(eventsJsonl, /hmac|sha256|phase-9-test-key/);
  assert.strictEqual(verifyIntegritySidecar(runDir, { expected: true }).status, 'verified');
});

test('P9-AC-1: default wiring omits the sidecar and binding.drivers so golden records stay byte-identical', async () => {
  const recordDir = tempRecordDir();
  const { runDir, record, eventsJsonl } = await runWithConfig(
    config(recordDir, {
      agent: 'scripted-stub',
      executionHost: 'local',
    }),
  );
  const [launchLine] = eventsJsonl.trim().split('\n');
  const launch = JSON.parse(launchLine ?? '{}') as RunEvent;

  assert.strictEqual(existsSync(join(runDir, INTEGRITY_FILE)), false);
  assert.strictEqual(record.run.binding.drivers, undefined);
  assert.strictEqual(launch.binding?.drivers, undefined);
  assert.strictEqual(verifyIntegritySidecar(runDir).status, 'not-applicable');
});

test('P9-AC-1: edited snapshots and sidecars are detected by recompute-and-compare', async () => {
  process.env.JIG_RECORDS_INTEGRITY_KEY = integrityKey;
  const recordDir = tempRecordDir();
  const { runDir } = await runWithConfig(
    config(recordDir, {
      agent: 'scripted-stub',
      executionHost: 'local',
      forge: 'github',
    }),
  );

  writeFileSync(join(runDir, 'plan.snapshot.json'), JSON.stringify({ ...plan(), id: 'tampered' }, null, 2));
  const tamperedSnapshot = verifyIntegritySidecar(runDir, { expected: true });
  assert.strictEqual(tamperedSnapshot.status, 'broken');
  assert.ok(tamperedSnapshot.status === 'broken' && tamperedSnapshot.artifacts.includes('plan.snapshot.json'));

  const sidecarPath = join(runDir, INTEGRITY_FILE);
  writeFileSync(sidecarPath, readFileSync(sidecarPath, 'utf8').replace(/"hmac": "[^"]+"/, '"hmac": "00"'));
  const tamperedSidecar = verifyIntegritySidecar(runDir, { expected: true });
  assert.strictEqual(tamperedSidecar.status, 'broken');
});

test('P9-AC-1: malformed sidecar hmac is a diagnosable integrity break', async () => {
  process.env.JIG_RECORDS_INTEGRITY_KEY = integrityKey;
  const recordDir = tempRecordDir();
  const { runDir } = await runWithConfig(
    config(recordDir, {
      agent: 'scripted-stub',
      executionHost: 'local',
      forge: 'github',
    }),
  );

  const sidecarPath = join(runDir, INTEGRITY_FILE);
  const sidecar = JSON.parse(readFileSync(sidecarPath, 'utf8')) as Record<string, unknown>;
  delete sidecar.hmac;
  writeFileSync(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`);
  const verification = verifyIntegritySidecar(runDir, { expected: true });

  assert.strictEqual(verification.status, 'broken');
  assert.ok(verification.status === 'broken' && verification.code === 'integrity-hmac-mismatch');
});

test('P9-AC-3: missing env key is diagnosable when integrity is expected', async () => {
  process.env.JIG_RECORDS_INTEGRITY_KEY = integrityKey;
  const recordDir = tempRecordDir();
  const { runDir } = await runWithConfig(
    config(recordDir, {
      agent: 'scripted-stub',
      executionHost: 'local',
      forge: 'github',
    }),
  );

  delete process.env.JIG_RECORDS_INTEGRITY_KEY;
  const verification = verifyIntegritySidecar(runDir, { expected: true });

  assert.strictEqual(verification.status, 'broken');
  assert.ok(verification.status === 'broken' && verification.code === 'integrity-key-missing');
});
