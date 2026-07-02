import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { LocalHarness } from '../src/harness.js';
import { RecordManager } from '../src/records.js';
import type { ConfigDoc, PlanInstance, PolicyDoc, RunRecord } from '../src/types.js';
import { ScriptedWorker } from '../src/worker.js';

const fixtureDir = join(process.cwd(), 'tests/fixtures/m5b-local-mvp');
const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf8')) as T;
}

function normalizeRecord(record: RunRecord): RunRecord {
  return {
    run: {
      ...record.run,
      id: '<RUN_ID>',
    },
    events: record.events.map((event) => ({
      ...event,
      timestamp: event.timestamp ? '<TIMESTAMP>' : event.timestamp,
    })),
  };
}

async function runFixture(planName: string, scriptedOutputName: string): Promise<RunRecord> {
  const recordDir = mkdtempSync(join(tmpdir(), 'jig-golden-'));
  cleanupDirs.push(recordDir);

  const config = loadFixture<ConfigDoc>('local-config.json');
  const policy = loadFixture<PolicyDoc>('local-policy.json');
  const plan = loadFixture<PlanInstance>(planName);
  const scriptedOutput = loadFixture<Record<string, unknown>>(scriptedOutputName);
  const harness = new LocalHarness(new ScriptedWorker(scriptedOutput), new RecordManager());

  await harness.run(
    plan,
    {
      ...config,
      runner: {
        ...config.runner,
        recordDir,
      },
    },
    policy,
  );

  const [runDir] = readdirSync(recordDir);
  assert.ok(runDir, 'expected a generated run directory');
  return JSON.parse(readFileSync(join(recordDir, runDir, 'run.json'), 'utf8')) as RunRecord;
}

const goldenScenarios = [
  {
    name: 'PR-AC-6: golden success run record matches normalized output',
    plan: 'minimal-plan.json',
    scriptedOutput: 'scripted-worker-success.json',
    golden: 'golden-run-record-success.json',
  },
  {
    name: 'PR-AC-6: golden multi-success run record matches normalized output',
    plan: 'multi-item-plan-success.json',
    scriptedOutput: 'scripted-worker-multi-success.json',
    golden: 'golden-run-record-multi-success.json',
  },
  {
    name: 'PR-AC-6: golden dependent-blocked run record matches normalized output',
    plan: 'multi-item-plan-failure-blocks-dependent.json',
    scriptedOutput: 'scripted-worker-multi-failure-story-1.json',
    golden: 'golden-run-record-dependent-blocked.json',
  },
];

for (const scenario of goldenScenarios) {
  test(scenario.name, async () => {
    const actual = normalizeRecord(await runFixture(scenario.plan, scenario.scriptedOutput));
    const expected = normalizeRecord(loadFixture<RunRecord>(scenario.golden));
    assert.deepStrictEqual(actual, expected);
  });
}

test('PR-AC-6: no committed golden record fixture is unread by tests', () => {
  const expectedGoldens = goldenScenarios.map((scenario) => scenario.golden).sort();
  const actualGoldens = readdirSync(fixtureDir)
    .filter((name) => name.startsWith('golden-') && name.endsWith('.json'))
    .sort();
  assert.deepStrictEqual(actualGoldens, expectedGoldens);
});
