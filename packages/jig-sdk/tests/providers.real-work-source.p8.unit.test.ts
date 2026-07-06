import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { composeReferenceRun } from '../src/bootstrap.js';
import { LocalHarness } from '../src/harness.js';
import { intakeCandidates, validatePlanForScheduling, WORK_SOURCE_INTAKE_BYPASS_REASON } from '../src/intake.js';
import { createGitHubIssuesWorkSource } from '../src/providers/real/work-source.js';
import { RecordManager } from '../src/records.js';
import type { ConfigDoc, PlanInstance, PolicyDoc, RecordSink, ResumePlan, RunEvent, RunRecord } from '../src/types.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  delete process.env.JIG_RECORDS_INTEGRITY_KEY;
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const plan: PlanInstance = {
  plan: {
    id: 'plan-p8-real-work-source',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'P8 story' }],
  },
};

const policy: PolicyDoc = {
  policy: {
    id: 'policy-p8',
    rules: {
      allowLocalDryRun: true,
    },
  },
};

const config: ConfigDoc = {
  runner: {
    mode: 'local-dry-run',
  },
  drivers: {
    agent: 'scripted-stub',
    executionHost: 'local',
    workSource: 'github-issues',
  },
};

function recordCollector(): { sink: RecordSink; events: RunEvent[] } {
  const events: RunEvent[] = [];
  return {
    events,
    sink: {
      init: () => {},
      recordEvent: (event) => events.push(event as RunEvent),
      finalize: async () => {},
    },
  };
}

function resumePlan(): ResumePlan {
  return {
    runId: 'run-p8-existing',
    checkpoint: 'after:STORY-1',
    stopCause: 'work-item-blocked',
    completedStoryIds: [],
    blockedStoryIds: [],
    parkedStoryId: null,
    unstartedStoryIds: [],
  };
}

test("P8-AC-1: a real importer's candidate reaches scheduling only after PlanValidator", async () => {
  let executed = false;
  const composed = await composeReferenceRun({
    planInstance: plan,
    config,
    scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
    workSourceTransport: {
      fetchCandidates: async () => [
        {
          sourceSystem: 'github-issues',
          identifier: '101',
          planInstance: plan,
        },
      ],
    },
  });
  const intake = await intakeCandidates(composed.workSource);
  const [candidate] = intake.admitted;
  assert.ok(candidate);
  assert.deepStrictEqual(intake.rejected, []);
  const { sink, events } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async () => {
        executed = true;
        return { outcome: 'success', evidence: { result: 'passed' } };
      },
    },
    sink,
  );

  assert.strictEqual(await harness.run(candidate, config, policy), 'success');
  assert.strictEqual(executed, true);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'run.started' &&
        (event.workSourceCandidate as { candidateId?: string } | undefined)?.candidateId === '101',
    ),
  );
});

test('P8-AC-1: a candidate that fails validation is rejected or held and never scheduled', async () => {
  const workSource = createGitHubIssuesWorkSource({
    transport: {
      fetchCandidates: async () => [
        {
          sourceSystem: 'github-issues',
          identifier: '102',
          planInstance: {
            plan: {
              id: 'plan-invalid-p8',
              version: 'unknown-version',
              stories: [{ id: 'STORY-1', title: 'Invalid' }],
            },
          },
        },
      ],
    },
  });

  const intake = await intakeCandidates(workSource);

  assert.deepStrictEqual(intake.admitted, []);
  assert.strictEqual(intake.rejected.length, 1);
  assert.strictEqual(intake.rejected[0]?.event.family, 'authorization.denied');
  assert.strictEqual(intake.rejected[0]?.event.reason, WORK_SOURCE_INTAKE_BYPASS_REASON);
});

test('P8-AC-1: run and resume both route the candidate through the validated-wrapper chokepoint', async () => {
  const workSource = createGitHubIssuesWorkSource({
    transport: {
      fetchCandidates: async () => [
        {
          sourceSystem: 'github-issues',
          identifier: '103',
          planInstance: plan,
        },
      ],
    },
  });
  const [candidate] = (await intakeCandidates(workSource)).admitted;
  assert.ok(candidate);
  const run = recordCollector();
  const resume = recordCollector();

  const runHarness = new LocalHarness(
    { execute: async () => ({ outcome: 'success', evidence: { result: 'passed' } }) },
    run.sink,
  );
  const resumeHarness = new LocalHarness(
    { execute: async () => ({ outcome: 'success', evidence: { result: 'passed' } }) },
    resume.sink,
  );

  assert.strictEqual(await runHarness.run(candidate, config, policy), 'success');
  assert.strictEqual(await resumeHarness.resume(candidate, policy, resumePlan()), 'success');
  assert.strictEqual(
    run.events.some((event) => event.reason === WORK_SOURCE_INTAKE_BYPASS_REASON),
    false,
  );
  assert.strictEqual(
    resume.events.some((event) => event.reason === WORK_SOURCE_INTAKE_BYPASS_REASON),
    false,
  );
});

test('P8-AC-2: a direct harness.run/harness.resume call with a raw/any/deserialized marker-less candidate is refused fail-closed at runtime and recorded', async () => {
  const raw = JSON.parse(JSON.stringify(plan)) as PlanInstance;
  const runEvents: RunEvent[] = [];
  const resumeEvents: RunEvent[] = [];
  const runHarness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('raw plan must not execute');
      },
    },
    {
      init: () => {},
      recordEvent: (event) => runEvents.push(event as RunEvent),
      finalize: async () => {},
    },
  );
  const resumeHarness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('raw plan must not execute');
      },
    },
    {
      init: () => {},
      recordEvent: (event) => resumeEvents.push(event as RunEvent),
      finalize: async () => {},
    },
  );

  function assertRawPlanIsTypeError(): void {
    // @ts-expect-error P8-AC-2 compile-time guard: typed callers cannot pass a raw PlanInstance.
    void runHarness.run(plan, config, policy);
  }
  void assertRawPlanIsTypeError;

  const runStatus = await (
    runHarness.run as unknown as (
      candidate: unknown,
      config: ConfigDoc,
      policy: PolicyDoc,
    ) => Promise<'success' | 'failure'>
  )(raw, config, policy);
  const resumeStatus = await (
    resumeHarness.resume as unknown as (
      candidate: unknown,
      policy: PolicyDoc,
      resumePlan: ResumePlan,
    ) => Promise<'success' | 'failure'>
  )(raw, policy, resumePlan());

  assert.strictEqual(runStatus, 'failure');
  assert.strictEqual(resumeStatus, 'failure');
  assert.ok(
    runEvents.find(
      (event) => event.family === 'authorization.denied' && event.reason === WORK_SOURCE_INTAKE_BYPASS_REASON,
    ),
  );
  assert.ok(
    resumeEvents.find(
      (event) => event.family === 'authorization.denied' && event.reason === WORK_SOURCE_INTAKE_BYPASS_REASON,
    ),
  );
});

test('P8-AC-2: the bypass attempt is recorded through the rejected/denied family', async () => {
  const events: RunEvent[] = [];
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('raw plan must not execute');
      },
    },
    {
      init: () => {},
      recordEvent: (event) => events.push(event as RunEvent),
      finalize: async () => {},
    },
  );

  const status = await (
    harness.run as unknown as (
      candidate: unknown,
      config: ConfigDoc,
      policy: PolicyDoc,
    ) => Promise<'success' | 'failure'>
  )(plan, config, policy);

  assert.strictEqual(status, 'failure');
  assert.ok(events.find((event) => event.family === 'authorization.denied'));
  assert.strictEqual(
    events.some((event) => event.family === 'work-source.bypass'),
    false,
  );
});

test('P8-AC-3: the per-candidate origin is legible in the run record', async () => {
  const recordDir = mkdtempSync(join(tmpdir(), 'jig-p8-origin-'));
  cleanupDirs.push(recordDir);
  const workSource = createGitHubIssuesWorkSource({
    transport: {
      fetchCandidates: async () => [
        {
          sourceSystem: 'github-issues',
          identifier: '104',
          planInstance: plan,
        },
      ],
    },
  });
  const [candidate] = (await intakeCandidates(workSource)).admitted;
  assert.ok(candidate);
  const harness = new LocalHarness(
    { execute: async () => ({ outcome: 'success', evidence: { result: 'passed' } }) },
    new RecordManager(),
  );
  process.env.JIG_RECORDS_INTEGRITY_KEY = 'p8-origin-integrity-key';

  assert.strictEqual(
    await harness.run(candidate, { ...config, runner: { mode: 'local-dry-run', recordDir } }, policy),
    'success',
  );
  const [runName] = readdirSync(recordDir);
  assert.ok(runName);
  const record = JSON.parse(readFileSync(join(recordDir, runName, 'run.json'), 'utf8')) as RunRecord;
  const launch = record.events.find((event) => event.family === 'run.started');
  assert.deepStrictEqual(launch?.workSourceCandidate, {
    sourceSystem: 'github-issues',
    candidateId: '104',
    jigValidated: true,
  });
});

test('P8-AC-3: two candidates pulled through the same tracker/driver are distinguishable by their recorded origin identifier', async () => {
  const workSource = createGitHubIssuesWorkSource({
    transport: {
      fetchCandidates: async () => [
        {
          sourceSystem: 'github-issues',
          identifier: '105',
          planInstance: {
            plan: {
              ...plan.plan,
              id: 'plan-p8-origin-105',
            },
          },
        },
        {
          sourceSystem: 'github-issues',
          identifier: '106',
          planInstance: {
            plan: {
              ...plan.plan,
              id: 'plan-p8-origin-106',
            },
          },
        },
      ],
    },
  });
  const intake = await intakeCandidates(workSource);
  const recordedCandidateIds: string[] = [];
  for (const candidate of intake.admitted) {
    const { sink, events } = recordCollector();
    const harness = new LocalHarness(
      { execute: async () => ({ outcome: 'success', evidence: { result: 'passed' } }) },
      sink,
    );

    assert.strictEqual(await harness.run(candidate, config, policy), 'success');
    const launch = events.find((event) => event.family === 'run.started');
    const origin = launch?.workSourceCandidate as { candidateId?: string; sourceSystem?: string } | undefined;
    assert.strictEqual(origin?.sourceSystem, 'github-issues');
    if (origin?.candidateId) {
      recordedCandidateIds.push(origin.candidateId);
    }
  }

  assert.deepStrictEqual(recordedCandidateIds, ['105', '106']);
});

test("P8-AC-3: provenance is not collapsed to the single 'jig-validated' literal", async () => {
  const workSource = createGitHubIssuesWorkSource({
    transport: {
      fetchCandidates: async () => [
        {
          sourceSystem: 'github-issues',
          identifier: '107',
          planInstance: plan,
        },
      ],
    },
  });
  const [candidate] = await workSource.candidates();
  assert.ok(candidate);

  assert.notStrictEqual(candidate.provenance, 'jig-validated');
  assert.deepStrictEqual(candidate.provenance.origin, {
    sourceSystem: 'github-issues',
    candidateId: '107',
  });
});

test('P05/P8: malformed GitHub issue plan bodies refuse with actionable guidance', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => [
        {
          number: 108,
          body: 'not valid json',
        },
      ],
    }) as unknown as Response) as typeof fetch;

  try {
    const workSource = createGitHubIssuesWorkSource({
      env: {
        JIG_GITHUB_ISSUES_REPOSITORY: 'agentic-workflow-kit/jig-smoke-target',
      },
    });

    await assert.rejects(
      () => Promise.resolve(workSource.candidates()),
      /top-level "plan" field, optionally inside a ```json fenced block/,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('P8-AC-1: constructing the work source without an explicit env falls back to process.env without eagerly reading it', () => {
  // Constructing (not invoking .candidates()) exercises the constructor's own transport/env
  // wiring without making a real network call, keeping this hermetic while still covering the
  // "no explicit env" fallback to process.env distinct from the "no explicit transport" fallback.
  assert.doesNotThrow(() => createGitHubIssuesWorkSource());
});

test('P8-AC-2: an attempt to route a candidate to scheduling bypassing PlanValidator fails closed', async () => {
  const { sink, events } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async () => {
        assert.fail('raw plan must not execute');
      },
    },
    sink,
  );

  const status = await (
    harness.run as unknown as (
      candidate: unknown,
      config: ConfigDoc,
      policy: PolicyDoc,
    ) => Promise<'success' | 'failure'>
  )(validatePlanForScheduling(plan).planInstance, config, policy);

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) => event.family === 'authorization.denied' && event.reason === WORK_SOURCE_INTAKE_BYPASS_REASON,
    ),
  );
});
