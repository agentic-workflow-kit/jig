import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test, vi } from 'vitest';
import { RecordManager } from '../src/records.js';
import type { ConfigDoc, Plan, PolicyDoc, RunRecord } from '../src/types.js';

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
  });
});
