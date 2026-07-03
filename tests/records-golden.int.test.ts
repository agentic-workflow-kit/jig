import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { composeReferenceRun } from '../src/bootstrap.js';
import { LocalHarness } from '../src/harness.js';
import { RecordManager } from '../src/records.js';
import type { ConfigDoc, PlanInstance, PolicyDoc, RunRecord } from '../src/types.js';

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

function normalizeWorkspace(workspace: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!workspace) {
    return workspace;
  }

  if (workspace.kind === 'git') {
    return {
      ...workspace,
      repoRoot: '<WORKSPACE>',
      head: '<WORKSPACE_HEAD>',
      changeSetHash: '<WORKSPACE_HASH>',
    };
  }

  return workspace;
}

function normalizePlanSnapshot(planSnapshot: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!planSnapshot) {
    return planSnapshot;
  }

  return {
    ...planSnapshot,
    ref: '<PLAN_SNAPSHOT_REF>',
    path: '<PLAN_SNAPSHOT_PATH>',
  };
}

function normalizePolicySnapshot(
  policySnapshot: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!policySnapshot) {
    return policySnapshot;
  }

  return {
    ...policySnapshot,
    ref: '<POLICY_SNAPSHOT_REF>',
    path: '<POLICY_SNAPSHOT_PATH>',
  };
}

function normalizeRecord(record: RunRecord): RunRecord {
  return {
    run: {
      ...record.run,
      id: '<RUN_ID>',
      binding: {
        ...record.run.binding,
        configRef: record.run.binding.configRef.replace(/recordDir=.*/, 'recordDir=<RECORD_DIR>'),
        workspace: normalizeWorkspace(
          record.run.binding.workspace as unknown as Record<string, unknown> | undefined,
        ) as unknown as RunRecord['run']['binding']['workspace'],
      },
      planSnapshot: normalizePlanSnapshot(
        record.run.planSnapshot as unknown as Record<string, unknown> | undefined,
      ) as RunRecord['run']['planSnapshot'],
      policySnapshot: normalizePolicySnapshot(
        record.run.policySnapshot as unknown as Record<string, unknown> | undefined,
      ) as RunRecord['run']['policySnapshot'],
    },
    events: record.events.map((event) => ({
      ...event,
      ...(event.family === 'run.started'
        ? (() => {
            const binding = ((event.binding ?? {}) as Record<string, unknown>) || {};

            return {
              runId: '<RUN_ID>',
              binding: {
                ...binding,
                configRef:
                  typeof binding.configRef === 'string'
                    ? binding.configRef.replace(/recordDir=.*/, 'recordDir=<RECORD_DIR>')
                    : binding.configRef,
                workspace: normalizeWorkspace(binding.workspace as Record<string, unknown> | undefined),
              },
              planSnapshot: normalizePlanSnapshot(event.planSnapshot as unknown as Record<string, unknown> | undefined),
              policySnapshot: normalizePolicySnapshot(
                event.policySnapshot as unknown as Record<string, unknown> | undefined,
              ),
            };
          })()
        : {}),
      timestamp: event.timestamp ? '<TIMESTAMP>' : event.timestamp,
    })),
  } as RunRecord;
}

async function runFixture(planName: string, scriptedOutputName: string): Promise<RunRecord> {
  const recordDir = mkdtempSync(join(tmpdir(), 'jig-golden-'));
  cleanupDirs.push(recordDir);

  const config = loadFixture<ConfigDoc>('local-config.json');
  const policyName = planName === 'canonical-triad-plan.json' ? 'local-policy-assisted.json' : 'local-policy.json';
  const policy = loadFixture<PolicyDoc>(policyName);
  const plan = loadFixture<PlanInstance>(planName);
  const scriptedOutput = loadFixture<Record<string, unknown>>(scriptedOutputName);
  const configWithRecordDir = {
    ...config,
    runner: {
      ...config.runner,
      recordDir,
    },
  };
  const composed = await composeReferenceRun({
    planInstance: plan,
    config: configWithRecordDir,
    scriptedOutput,
  });
  const [candidate] = await composed.workSource.candidates();
  assert.ok(candidate, 'expected a validated work-source candidate');
  const harness = new LocalHarness(composed.agent, new RecordManager(), null, {
    capabilityAttestation: composed.capabilityAttestation,
    forge: composed.forge,
  });

  await harness.run(candidate.planInstance, configWithRecordDir, policy);

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
  {
    name: 'P3-AC-5: canonical triad golden run record matches normalized output',
    plan: 'canonical-triad-plan.json',
    scriptedOutput: 'scripted-worker-canonical-triad.json',
    golden: 'golden-run-record-canonical-triad.json',
  },
];

for (const scenario of goldenScenarios) {
  test(scenario.name, async () => {
    const actual = normalizeRecord(await runFixture(scenario.plan, scenario.scriptedOutput));
    const expected = normalizeRecord(loadFixture<RunRecord>(scenario.golden));
    assert.deepStrictEqual(actual, expected);
  });
}

test('P6-AC-1: default wiring reproduces the Phase-0..4 goldens byte-identically', async () => {
  for (const scenario of goldenScenarios) {
    const actual = normalizeRecord(await runFixture(scenario.plan, scenario.scriptedOutput));
    const expected = normalizeRecord(loadFixture<RunRecord>(scenario.golden));
    assert.deepStrictEqual(actual, expected);
  }
});

test('PR-AC-6: no committed golden record fixture is unread by tests', () => {
  const expectedGoldens = goldenScenarios.map((scenario) => scenario.golden).sort();
  const actualGoldens = readdirSync(fixtureDir)
    .filter((name) => name.startsWith('golden-') && name.endsWith('.json'))
    .sort();
  assert.deepStrictEqual(actualGoldens, expectedGoldens);
});
