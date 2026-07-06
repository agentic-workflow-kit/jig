import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'vitest';
import { writeIntegritySidecar } from '../src/integrity.js';
import { createJigSession, InspectRunError } from '../src/sdk.js';
import type { ConfigDoc, PlanInstance, PolicyDoc, RunEvent } from '../src/types.js';
import { captureWorkspaceFingerprint } from '../src/workspace.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-sdk-session',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'SDK story' }],
  },
};

const config: ConfigDoc = {
  runner: {
    mode: 'local-dry-run',
    recordDir: 'runs',
  },
};

const policy: PolicyDoc = {
  version: 'policy-v0',
  policy: {
    id: 'policy-sdk-session',
    rules: {
      allowLocalDryRun: true,
    },
  },
};

let originalCwd: string;
let workDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), 'jig-sdk-session-'));
  process.chdir(workDir);
  process.env.JIG_RECORDS_INTEGRITY_KEY = 'sdk-test-integrity-key';
  process.env.JIG_RECORDS_INTEGRITY_KEY_ID = 'sdk-test-key';
});

afterEach(() => {
  delete process.env.JIG_RECORDS_INTEGRITY_KEY;
  delete process.env.JIG_RECORDS_INTEGRITY_KEY_ID;
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
});

function scriptedOutput(outcome: 'success' | 'failure' = 'success'): Record<string, unknown> {
  return {
    storyId: 'STORY-1',
    outcome,
    evidence: {
      result: outcome === 'success' ? 'passed' : 'failed',
    },
  };
}

function firstRunDir(): string {
  const [runName] = readdirSync(join(workDir, 'runs'));
  assert.ok(runName, 'expected one run directory');
  return join(workDir, 'runs', runName);
}

function phase4LaunchHeader(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    family: 'run.started',
    actor: 'runner',
    timestamp: '2026-07-03T09:00:00.000Z',
    runId: 'run-sdk-watch',
    planId: 'plan-sdk-session',
    mode: 'local-dry-run',
    binding: {
      policyRef: 'policy-sdk-session',
      configRef: 'mode=local-dry-run;recordDir=runs',
      workspace: {
        repoRoot: workDir,
        head: '0123456789abcdef0123456789abcdef01234567',
        changeSetHash: 'workspace-clean',
      },
    },
    posture: { record: 'safe-for-owner-record', export: 'redacted' },
    planSnapshot: { ref: 'plan.snapshot.json' },
    policySnapshot: { ref: 'policy.snapshot.json' },
    ...overrides,
  };
}

function stringifyJsonl(events: RunEvent[]): string {
  return `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
}

function writeObservationRun(name = 'observation-run'): string {
  const runDir = join(workDir, name);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'evidence.modeled',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
        result: 'passed',
        changedFiles: ['src/sdk.ts'],
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:03.000Z',
        storyId: 'STORY-1',
        changedFiles: ['src/sdk.ts'],
      },
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:04.000Z',
        storyId: 'STORY-2',
      },
      {
        family: 'story.parked',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:05.000Z',
        storyId: 'STORY-2',
        reason: 'owner-decision-required',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:06.000Z',
        reason: 'unattended-park',
        checkpoint: 'after:STORY-2.parked',
        unstarted: [],
      },
    ]),
  );
  return runDir;
}

function writeCompletedRun(name = 'completed-run', events: RunEvent[] = []): string {
  const runDir = join(workDir, name);
  mkdirSync(runDir, { recursive: true });
  const runEvents =
    events.length > 0
      ? events
      : [
          phase4LaunchHeader({ runId: 'run-sdk-export', planId: 'plan-sdk-session' }),
          {
            family: 'story.started',
            actor: 'runner',
            timestamp: '2026-07-03T09:00:01.000Z',
            storyId: 'STORY-1',
          },
          {
            family: 'evidence.modeled',
            actor: 'runner',
            timestamp: '2026-07-03T09:00:02.000Z',
            storyId: 'STORY-1',
            result: { status: 'passed' },
          },
          {
            family: 'story.done',
            actor: 'runner',
            timestamp: '2026-07-03T09:00:03.000Z',
            storyId: 'STORY-1',
          },
          {
            family: 'run.completed',
            actor: 'runner',
            timestamp: '2026-07-03T09:00:04.000Z',
          },
        ];
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(runEvents));
  return runDir;
}

function initGitWorkspace(cwd: string): void {
  execFileSync('git', ['init'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'jig test'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'jig-test@example.invalid'], { cwd, stdio: 'ignore' });
  writeFileSync(join(cwd, 'tracked.txt'), 'tracked\n');
  execFileSync('git', ['add', 'tracked.txt'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'init'], { cwd, stdio: 'ignore' });
}

function initializeGitBranch(branch = 'phase-5'): void {
  execFileSync('git', ['init', '--initial-branch=main'], { cwd: workDir });
  execFileSync('git', ['config', 'user.name', 'Jig SDK Test'], { cwd: workDir });
  execFileSync('git', ['config', 'user.email', 'jig-sdk-test@example.com'], { cwd: workDir });
  writeFileSync(join(workDir, 'README.md'), '# jig-sdk-session\n');
  execFileSync('git', ['add', 'README.md'], { cwd: workDir });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: workDir });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workDir }).toString().trim();
  mkdirSync(join(workDir, '.git', 'refs', 'heads'), { recursive: true });
  writeFileSync(join(workDir, '.git', 'refs', 'heads', branch), `${head}\n`);
  writeFileSync(join(workDir, '.git', 'HEAD'), `ref: refs/heads/${branch}\n`);
}

test('preview returns the SDK operator projection', async () => {
  const session = createJigSession({
    realHostProbeFactory: () => ({
      run: async () => ({
        reportedIsolationStrength: 'weak',
        observedAt: '2026-07-06T09:00:00.000Z',
        freshnessWindowMs: 60_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'weak',
      }),
    }),
  });
  const preview = await session.operator.preview({
    planInstance,
    config: {},
    policy: {},
  });

  assert.deepStrictEqual(preview, {
    posture: 'run.previewed',
    planId: 'plan-sdk-session',
    policyId: 'unknown-policy',
    mode: undefined,
    stories: [{ id: 'STORY-1', title: 'SDK story' }],
  });
});

test('P06-AC-1: preview validates bound owner configuration when track artifacts are present', async () => {
  const session = createJigSession();
  const preview = await session.operator.preview({
    planInstance,
    config: {
      ...config,
      track: {
        id: 'TRACK-P06',
        workProfile: {
          version: 'work-profile-v0',
          workProfile: {
            id: 'work-profile-p06',
            model: 'gpt-5',
            effort: 'high',
          },
        },
      },
    },
    policy,
  });

  assert.strictEqual(preview.posture, 'run.previewed');
  assert.strictEqual(preview.policyId, 'policy-sdk-session');
});

test('start writes a successful run and inspect replays authoritative events', async () => {
  const session = createJigSession({
    realHostProbeFactory: () => ({
      run: async () => ({
        reportedIsolationStrength: 'weak',
        observedAt: '2026-07-06T09:00:00.000Z',
        freshnessWindowMs: 60_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'weak',
      }),
    }),
  });
  const status = await session.operator.start({
    planInstance,
    config,
    policy,
    scriptedOutput: scriptedOutput(),
  });

  assert.strictEqual(status, 'success');

  const inspection = await session.operator.inspect({ runDir: firstRunDir() });
  assert.strictEqual(inspection.kind, 'projection');
  assert.strictEqual(inspection.projection.status, 'success');
  assert.strictEqual(inspection.projection.planId, 'plan-sdk-session');
});

test('P10-AC-1: export writes a redacted audit artifact for a completed run', async () => {
  const runDir = writeCompletedRun();
  const session = createJigSession();
  const result = await session.operator.export({ runDir });

  assert.strictEqual(result.status, 'exported');
  assert.ok(result.artifactPath);
  assert.ok(result.artifactSha256);
  assert.ok(existsSync(result.artifactPath));
  assert.ok(existsSync(result.auditEventPath));

  const artifact = JSON.parse(readFileSync(result.artifactPath, 'utf8')) as {
    format: string;
    manifest: {
      runId: string;
      lifecycleState: string;
      status: string;
      exportedEventCount: number;
      withheldEventCount: number;
    };
    events: Array<{ event: { family: string } }>;
    withheldEvents: unknown[];
    source: { integrity: { status: string } };
  };
  assert.strictEqual(artifact.format, 'jig.audit-export.v0');
  assert.strictEqual(artifact.manifest.runId, 'run-sdk-export');
  assert.strictEqual(artifact.manifest.lifecycleState, 'completed');
  assert.strictEqual(artifact.manifest.status, 'success');
  assert.strictEqual(artifact.manifest.exportedEventCount, 5);
  assert.strictEqual(artifact.manifest.withheldEventCount, 0);
  assert.deepStrictEqual(
    artifact.events.map((entry) => entry.event.family),
    ['run.started', 'story.started', 'evidence.modeled', 'story.done', 'run.completed'],
  );
  assert.deepStrictEqual(artifact.withheldEvents, []);
  assert.strictEqual(artifact.source.integrity.status, 'not-applicable');

  const audit = readFileSync(result.auditEventPath, 'utf8');
  assert.match(audit, /"family":"export\.prepared"/);
  assert.match(audit, /"runId":"run-sdk-export"/);
});

test('P10-AC-4: re-export creates a new artifact without mutating the previous export', async () => {
  const runDir = writeCompletedRun();
  const session = createJigSession();
  const first = await session.operator.export({ runDir });
  assert.ok(first.artifactPath);
  const firstContent = readFileSync(first.artifactPath, 'utf8');

  const second = await session.operator.export({ runDir });
  assert.strictEqual(second.status, 'exported');
  assert.ok(second.artifactPath);
  assert.notStrictEqual(second.artifactPath, first.artifactPath);
  assert.strictEqual(readFileSync(first.artifactPath, 'utf8'), firstContent);
});

test('P10-AC-2: export visibly withholds events with unsupported export posture', async () => {
  const runDir = writeCompletedRun('withheld-run', [
    phase4LaunchHeader({ runId: 'run-sdk-withheld', planId: 'plan-sdk-session' }),
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:01.000Z',
      storyId: 'STORY-1',
      posture: { record: 'safe-for-owner-record', export: 'owner-only' },
    } as unknown as RunEvent,
    {
      family: 'story.done',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:02.000Z',
      storyId: 'STORY-1',
    },
    {
      family: 'run.completed',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:03.000Z',
    },
  ]);
  const result = await createJigSession().operator.export({ runDir });
  assert.strictEqual(result.status, 'exported');
  assert.ok(result.artifactPath);
  const artifact = JSON.parse(readFileSync(result.artifactPath, 'utf8')) as {
    manifest: { exportedEventCount: number; withheldEventCount: number };
    withheldEvents: Array<{ line: number; family: string; reason: string }>;
  };

  assert.strictEqual(artifact.manifest.exportedEventCount, 3);
  assert.strictEqual(artifact.manifest.withheldEventCount, 1);
  assert.deepStrictEqual(artifact.withheldEvents, [
    {
      line: 2,
      family: 'story.started',
      reason: 'unsupported-export-posture:owner-only',
    },
  ]);
});

test('P10-AC-5: export refuses a live run and records an export denial audit event', async () => {
  const runDir = join(workDir, 'live-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl([phase4LaunchHeader({ runId: 'run-sdk-live' })]));

  const result = await createJigSession().operator.export({ runDir });

  assert.strictEqual(result.status, 'refused');
  assert.strictEqual(result.reason, 'run-not-finished:started');
  assert.ok(!result.artifactPath);
  assert.match(readFileSync(result.auditEventPath, 'utf8'), /"family":"export\.denied"/);
});

test('P10-AC-3: export refuses a tampered run when an integrity sidecar exists', async () => {
  const runDir = writeCompletedRun('tampered-run', [
    phase4LaunchHeader({
      runId: 'run-sdk-tampered',
      binding: {
        policyRef: 'policy-sdk-session',
        configRef: 'mode=local-dry-run;recordDir=runs',
        workspace: captureWorkspaceFingerprint(workDir),
        drivers: {
          agent: 'scripted',
          executionHost: 'reference',
          forge: 'reference',
          workSource: 'reference',
        },
      },
    }),
    {
      family: 'run.completed',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:01.000Z',
    },
  ]);
  writeIntegritySidecar(runDir);
  writeFileSync(join(runDir, 'events.jsonl'), `${readFileSync(join(runDir, 'events.jsonl'), 'utf8').trimEnd()}\n `);

  const result = await createJigSession().operator.export({ runDir });

  assert.strictEqual(result.status, 'refused');
  assert.match(result.reason ?? '', /integrity-artifact-mismatch/);
  assert.match(readFileSync(result.auditEventPath, 'utf8'), /"family":"export\.denied"/);
});

test('P10 coverage: export validates run directory inputs before writing audit events', async () => {
  const session = createJigSession();
  await assert.rejects(() => session.operator.export({ runDir: join(workDir, 'missing-run') }), /does not exist/);

  const runDir = join(workDir, 'missing-events-run');
  mkdirSync(runDir, { recursive: true });
  await assert.rejects(() => session.operator.export({ runDir }), /Missing authoritative events\.jsonl/);
});

test('P10 coverage: export records projection drift when replay cannot reconstruct the run', async () => {
  const runDir = join(workDir, 'projection-drift-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), `${JSON.stringify({ family: 'story.done', storyId: 'STORY-1' })}\n`);

  const result = await createJigSession().operator.export({ runDir });

  assert.strictEqual(result.status, 'refused');
  assert.match(result.reason ?? '', /projection-drift/);
  assert.match(readFileSync(result.auditEventPath, 'utf8'), /"family":"export\.denied"/);
});

test('P10 coverage: export ignores an unreadable run.json cache for reference runs', async () => {
  const runDir = writeCompletedRun('bad-cache-run');
  writeFileSync(join(runDir, 'run.json'), '{not-json');

  const result = await createJigSession().operator.export({ runDir });

  assert.strictEqual(result.status, 'exported');
  assert.ok(result.artifactPath);
  const artifact = JSON.parse(readFileSync(result.artifactPath, 'utf8')) as {
    source: { integrity: { status: string } };
  };
  assert.strictEqual(artifact.source.integrity.status, 'not-applicable');
});

test('P10 coverage: export visibly withholds missing and ambiguous event export posture', async () => {
  const runDir = writeCompletedRun('ambiguous-posture-run', [
    phase4LaunchHeader({ runId: 'run-sdk-ambiguous', planId: 'plan-sdk-session' }),
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:01.000Z',
      storyId: 'STORY-1',
      posture: { record: 'safe-for-owner-record', export: 1 },
    } as unknown as RunEvent,
    {
      family: 'evidence.modeled',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:02.000Z',
      storyId: 'STORY-1',
      apiKey: '',
    } as unknown as RunEvent,
    {
      family: 'story.done',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:03.000Z',
      storyId: 'STORY-1',
    },
    {
      family: 'run.completed',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:04.000Z',
    },
  ]);

  const result = await createJigSession().operator.export({ runDir });
  assert.strictEqual(result.status, 'exported');
  assert.ok(result.artifactPath);
  const artifact = JSON.parse(readFileSync(result.artifactPath, 'utf8')) as {
    withheldEvents: Array<{ line: number; family: string; reason: string }>;
  };

  assert.deepStrictEqual(artifact.withheldEvents, [
    {
      line: 2,
      family: 'story.started',
      reason: 'missing-export-posture',
    },
    {
      line: 3,
      family: 'evidence.modeled',
      reason: 'redaction-export-posture-ambiguous: could not classify sensitive value "events[2].apiKey"',
    },
  ]);
});

test('P10 review: export redacts event-derived projection diagnostics', async () => {
  const runDir = writeCompletedRun('projection-redaction-run', [
    phase4LaunchHeader({ runId: 'run-sdk-projection-redaction', planId: 'plan-sdk-session' }),
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
      diagnostics: {
        apiKey: 'secret-value',
        error: 'failed with diagnostic',
      } as never,
    },
    {
      family: 'run.stopped',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:03.000Z',
      reason: 'work-item-blocked',
      checkpoint: 'after:STORY-1',
      unstarted: [],
    },
  ]);

  const result = await createJigSession().operator.export({ runDir });
  assert.strictEqual(result.status, 'exported');
  assert.ok(result.artifactPath);
  const artifact = JSON.parse(readFileSync(result.artifactPath, 'utf8')) as {
    projection: { stories: { 'STORY-1': { diagnostics: { apiKey?: string; error?: string } } } };
    events: Array<{ event: { diagnostics?: { apiKey?: string; error?: string } } }>;
  };

  assert.strictEqual(artifact.projection.stories['STORY-1'].diagnostics.apiKey, '[REDACTED]');
  assert.strictEqual(artifact.projection.stories['STORY-1'].diagnostics.error, 'failed with diagnostic');
  const blockedEvent = artifact.events.find((entry) => entry.event.diagnostics);
  assert.strictEqual(blockedEvent?.event.diagnostics?.apiKey, '[REDACTED]');
});

test('P10 review: export refuses when projection redaction is ambiguous', async () => {
  const runDir = writeCompletedRun('projection-ambiguity-run', [
    phase4LaunchHeader({ runId: 'run-sdk-projection-ambiguity', planId: 'plan-sdk-session' }),
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
      diagnostics: {
        apiKey: '',
      } as never,
    },
    {
      family: 'run.stopped',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:03.000Z',
      reason: 'work-item-blocked',
      checkpoint: 'after:STORY-1',
      unstarted: [],
    },
  ]);

  const result = await createJigSession().operator.export({ runDir });

  assert.strictEqual(result.status, 'refused');
  assert.match(result.reason ?? '', /projection\.stories\.STORY-1\.diagnostics\.apiKey/);
  assert.match(readFileSync(result.auditEventPath, 'utf8'), /"family":"export\.denied"/);
});

test('P10 review: export sanitizes run ids before composing artifact paths', async () => {
  const outputDir = join(workDir, 'path-safe-exports');
  const runDir = writeCompletedRun('path-safe-run', [
    phase4LaunchHeader({ runId: '../escaped', planId: 'plan-sdk-session' }),
    {
      family: 'run.completed',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:01.000Z',
    },
  ]);

  const result = await createJigSession().operator.export({ runDir, outputDir });

  assert.strictEqual(result.status, 'exported');
  assert.ok(result.artifactPath);
  assert.strictEqual(dirname(result.artifactPath), outputDir);
  assert.match(result.artifactPath, /_escaped-audit-export-/);
  assert.ok(!existsSync(join(workDir, 'escaped')));
});

test('P07-AC-4: start runs declared workspace setup only when freshness check is stale', async () => {
  const marker = join(workDir, 'run-setup-marker');
  const session = createJigSession();
  const configWithSetup: ConfigDoc = {
    ...config,
    track: {
      id: 'TRACK-P07',
      workProfile: {
        version: 'work-profile-v0',
        workProfile: {
          id: 'work-profile-p07',
          model: 'gpt-5',
          effort: 'high',
          setup: {
            command: `touch ${marker}`,
            freshnessCheck: `test -f ${marker}`,
          },
        },
      },
    },
  };

  await session.operator.start({
    planInstance,
    config: configWithSetup,
    policy,
    scriptedOutput: scriptedOutput(),
  });

  assert.ok(existsSync(marker));
  unlinkSync(marker);
  writeFileSync(marker, 'fresh\n');
  const before = readFileSync(marker, 'utf8');

  await session.operator.start({
    planInstance,
    config: configWithSetup,
    policy,
    scriptedOutput: scriptedOutput(),
  });

  assert.strictEqual(readFileSync(marker, 'utf8'), before);
});

test('P07 review: start validates plan intake before workspace setup side effects', async () => {
  const marker = join(workDir, 'invalid-plan-setup-marker');
  const session = createJigSession();

  await assert.rejects(
    () =>
      session.operator.start({
        planInstance: {
          plan: {
            id: 'invalid-plan',
            version: 'unknown-version',
            stories: [{ id: 'STORY-1', title: 'Invalid story' }],
          },
        },
        config: {
          ...config,
          track: {
            id: 'TRACK-P07',
            workProfile: {
              version: 'work-profile-v0',
              workProfile: {
                id: 'work-profile-p07',
                model: 'gpt-5',
                effort: 'high',
                setup: {
                  command: `touch ${marker}`,
                },
              },
            },
          },
        },
        policy,
        scriptedOutput: scriptedOutput(),
      }),
    /Invalid plan: unknown version/,
  );

  assert.ok(!existsSync(marker));
});

test('start fails closed when work-source intake admits no valid candidates', async () => {
  const session = createJigSession({
    workSourceTransport: {
      fetchCandidates: async () => [
        {
          sourceSystem: 'github-issues',
          identifier: '201',
          planInstance: {
            plan: {
              id: 'invalid-plan',
              version: 'unknown-version',
              stories: [{ id: 'STORY-1', title: 'Invalid' }],
            },
          },
        },
      ],
    },
  });

  await assert.rejects(
    () =>
      session.operator.start({
        planInstance,
        config: {
          ...config,
          drivers: {
            workSource: 'github-issues',
          },
        },
        policy,
        scriptedOutput: scriptedOutput(),
      }),
    /No validated work-source candidate available/,
  );
});

test('start supports the real-host path and still preserves the session boundary', async () => {
  if (process.platform !== 'darwin') {
    await assert.rejects(
      () =>
        createJigSession().operator.start({
          planInstance,
          config: {
            ...config,
            drivers: {
              executionHost: 'real',
            },
          },
          policy,
          scriptedOutput: scriptedOutput(),
        }),
      /supported only on macOS/,
    );
    return;
  }

  const session = createJigSession({
    realHostProbeFactory: () => ({
      run: async () => ({
        reportedIsolationStrength: 'weak',
        observedAt: '2026-07-06T09:00:00.000Z',
        freshnessWindowMs: 60_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'weak',
      }),
    }),
  });

  const status = await session.operator.start({
    planInstance,
    config: {
      ...config,
      drivers: {
        executionHost: 'real',
      },
    },
    policy,
    scriptedOutput: scriptedOutput(),
  });

  assert.strictEqual(status, 'success');
});

test('P04-AC-3: compose-time real-host substrate rejection is recorded as a diagnosable stopped run', async () => {
  const blockedPlan: PlanInstance = {
    plan: {
      id: 'plan-sdk-compose-substrate-stop',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'STORY-1', title: 'Blocked before execution' },
        { id: 'STORY-2', title: 'Never started' },
      ],
    },
  };
  const session = createJigSession({
    substrateManifest: {
      id: 'real-driver-substrate',
      runtimes: ['node'],
      argv: [],
      credentials: [],
      egress: [],
    },
    realHostProbeFactory: () => ({
      substrateRequests: [{ kind: 'argv', value: ['node', 'unexpected-probe'] }],
      run: async () => {
        assert.fail('compose-time substrate rejection should prevent probe execution');
      },
    }),
  });

  const status = await session.operator.start({
    planInstance: blockedPlan,
    config: {
      ...config,
      drivers: {
        executionHost: 'real',
      },
    },
    policy,
    scriptedOutput: scriptedOutput(),
  });

  assert.strictEqual(status, 'failure');

  const runDir = firstRunDir();
  assert.ok(existsSync(join(runDir, 'events.jsonl')));
  assert.ok(existsSync(join(runDir, 'run.json')));

  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map(
      (line) =>
        JSON.parse(line) as {
          family: string;
          storyId?: string;
          reason?: string;
          checkpoint?: string;
          unstarted?: string[];
          diagnostics?: { error?: string };
          substrateManifest?: { path?: string };
        },
    );
  assert.strictEqual(events[0]?.family, 'run.started');
  assert.ok(events[0]?.substrateManifest?.path);
  assert.ok(existsSync(events[0]?.substrateManifest?.path ?? ''));
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' &&
        event.storyId === 'STORY-1' &&
        event.reason === 'substrate-escalation' &&
        /substrate-escalation/.test(event.diagnostics?.error ?? ''),
    ),
  );
  const stopped = events.find((event) => event.family === 'run.stopped');
  assert.ok(stopped);
  assert.strictEqual(stopped.reason, 'work-item-blocked');
  assert.strictEqual(stopped.checkpoint, 'after:STORY-1');
  assert.deepStrictEqual(stopped.unstarted, ['STORY-2']);

  const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as { run: { status: string } };
  assert.strictEqual(runRecord.run.status, 'failure');

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'projection');
  assert.strictEqual(inspection.projection.status, 'failure');
});

test('P04-AC-4: the real-host run path allocates isolated per-story workspaces', async () => {
  if (process.platform !== 'darwin') {
    return;
  }

  const isolatedPlan: PlanInstance = {
    plan: {
      id: 'plan-sdk-session-real-host-isolation',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'STORY-1', title: 'first' },
        { id: 'STORY-2', title: 'second' },
      ],
    },
  };
  const seenWorkspacePaths: string[] = [];
  const session = createJigSession({
    realHostProbeFactory: () => ({
      run: async () => ({
        reportedIsolationStrength: 'weak',
        observedAt: '2026-07-06T09:00:00.000Z',
        freshnessWindowMs: 60_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'weak',
      }),
    }),
    codexSession: {
      run: async (story) => {
        const workspace = story.workspace as { path?: string } | undefined;
        seenWorkspacePaths.push(workspace?.path ?? 'missing');
        return {
          status: 'completed' as const,
          workerResult: {
            storyId: story.id,
            outcome: 'success',
            evidence: { result: 'passed' },
          },
        };
      },
    },
  });

  const status = await session.operator.start({
    planInstance: isolatedPlan,
    config: {
      ...config,
      drivers: {
        agent: 'codex',
        executionHost: 'real',
      },
    },
    policy,
    scriptedOutput: scriptedOutput(),
  });

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(seenWorkspacePaths.map((path) => path.slice(path.indexOf('/.jig-workspaces/'))).sort(), [
    '/.jig-workspaces/STORY-1',
    '/.jig-workspaces/STORY-2',
  ]);
});

test('P05 MERGE-5: start surfaces blocked stories through the normal SDK runner path when github forge wiring is enabled', async () => {
  initializeGitBranch('phase-5-block-surface');

  const calls: string[] = [];
  const session = createJigSession({
    forgeTransport: {
      push: async () => {
        throw new Error('push should not run for a blocked story');
      },
      openPullRequest: async () => {
        throw new Error('open-pr should not run for a blocked story');
      },
      mergePullRequest: async () => {
        throw new Error('merge should not run for a blocked story');
      },
      readHead: async (request) => ({
        targetRef: request.targetRef,
        targetHead: 'unused-head',
      }),
      openOrUpdatePullRequestForBlock: async (request) => {
        calls.push(`block-pr:${request.safeBranch}:${request.canPush}`);
        return {
          targetRef: `refs/heads/${request.safeBranch}`,
          targetHead: 'blocked-pr-head',
          prNumber: 15,
          prUrl: 'https://github.example/pull/15',
        };
      },
      postBlockStatus: async (request) => {
        calls.push(`block-status:${request.safeBranch}:${request.canPush}`);
        return {
          targetRef: `refs/heads/${request.safeBranch}`,
          targetHead: 'blocked-status-head',
        };
      },
      postBlockComment: async (request) => {
        calls.push(`block-comment:${request.safeBranch}:${request.canPush}:${request.failureReasons[0]}`);
        return {
          targetRef: `refs/heads/${request.safeBranch}`,
          targetHead: 'blocked-comment-head',
        };
      },
    },
  });

  const status = await session.operator.start({
    planInstance,
    config: {
      ...config,
      drivers: {
        forge: 'github',
      },
    },
    policy,
    scriptedOutput: scriptedOutput('failure'),
  });

  assert.strictEqual(status, 'failure');
  assert.deepStrictEqual(calls, [
    'block-pr:phase-5-block-surface:true',
    'block-status:phase-5-block-surface:true',
    'block-comment:phase-5-block-surface:true:worker-reported-failure',
  ]);

  const events = readFileSync(join(firstRunDir(), 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as { family: string; storyId?: string });
  assert.ok(events.find((event) => event.family === 'runner-action.opened-pr' && event.storyId === 'STORY-1'));
  assert.ok(events.find((event) => event.family === 'runner-action.posted-status' && event.storyId === 'STORY-1'));
  assert.ok(events.find((event) => event.family === 'runner-action.posted-comment' && event.storyId === 'STORY-1'));
});

test('inspect ignores an unreadable run.json cache when events remain authoritative', async () => {
  const session = createJigSession();
  await session.operator.start({
    planInstance,
    config,
    policy,
    scriptedOutput: scriptedOutput(),
  });

  const runDir = firstRunDir();
  writeFileSync(join(runDir, 'run.json'), '{not-json');

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'projection');
  assert.match(inspection.cacheParseError ?? '', /run\.json cache unreadable and ignored/);
});

test('inspect falls back to legacy mode when only run.json exists', async () => {
  const session = createJigSession();
  await session.operator.start({
    planInstance,
    config,
    policy,
    scriptedOutput: scriptedOutput(),
  });

  const runDir = firstRunDir();
  unlinkSync(join(runDir, 'events.jsonl'));

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'legacy');
  assert.strictEqual(inspection.runRecord.run.status, 'success');
});

test('inspect refuses an empty authoritative events stream instead of guessing at integrity bindings', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'empty-events-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), '');

  await assert.rejects(() => session.operator.inspect({ runDir }), /Failed to inspect authoritative events\.jsonl/);
});

test('inspect falls back to legacy mode when authoritative events are missing launch metadata', async () => {
  const session = createJigSession();
  await session.operator.start({
    planInstance,
    config,
    policy,
    scriptedOutput: scriptedOutput(),
  });

  const runDir = firstRunDir();
  const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as { run: { id: string } };
  writeFileSync(
    join(runDir, 'events.jsonl'),
    `${JSON.stringify({
      family: 'run.started',
      actor: 'runner',
      timestamp: '2026-07-03T09:00:00.000Z',
      runId: runRecord.run.id,
      planId: 'plan-sdk-session',
    })}\n`,
  );

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'legacy');
});

test('inspect adds resume diagnostics for changed-basis stopped runs', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'stopped-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    `${[
      {
        family: 'run.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.000Z',
        runId: 'run-sdk-stopped',
        planId: 'plan-sdk-session',
        mode: 'local-dry-run',
        binding: {
          policyRef: 'policy-sdk-session',
          configRef: 'mode=local-dry-run;recordDir=runs',
          workspace: {
            kind: 'unavailable',
            reason: 'not-a-git-worktree',
            detail: 'workspace fingerprint unavailable outside a git worktree',
          },
        },
        posture: { record: 'safe-for-owner-record', export: 'redacted' },
        planSnapshot: { ref: 'plan.snapshot.json' },
        policySnapshot: { ref: 'policy.snapshot.json' },
      },
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.500Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.750Z',
        storyId: 'STORY-1',
        reason: 'worker-reported-failure',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        reason: 'work-item-blocked',
        checkpoint: 'after:STORY-1',
        unstarted: ['STORY-2'],
      },
    ]
      .map((event) => JSON.stringify(event))
      .join('\n')}\n`,
  );

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'projection');
  assert.strictEqual(inspection.resumeDiagnostics[0]?.code, 'resume-blocked-workspace-mismatch');
});

test('inspect adds resume diagnostics for a real changed-basis git workspace', async () => {
  initGitWorkspace(workDir);
  const session = createJigSession();
  const runDir = join(workDir, 'git-stopped-run');
  mkdirSync(runDir, { recursive: true });
  const workspace = captureWorkspaceFingerprint(process.cwd());
  assert.ok('repoRoot' in workspace);
  writeFileSync(
    join(runDir, 'events.jsonl'),
    `${[
      {
        family: 'run.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.000Z',
        runId: 'run-sdk-git-stopped',
        planId: 'plan-sdk-session',
        mode: 'local-dry-run',
        binding: {
          policyRef: 'policy-sdk-session',
          configRef: 'mode=local-dry-run;recordDir=runs',
          workspace: { ...workspace, changeSetHash: 'different-hash' },
        },
        posture: { record: 'safe-for-owner-record', export: 'redacted' },
        planSnapshot: { ref: 'plan.snapshot.json' },
        policySnapshot: { ref: 'policy.snapshot.json' },
      },
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.500Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:00.750Z',
        storyId: 'STORY-1',
        reason: 'worker-reported-failure',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        reason: 'work-item-blocked',
        checkpoint: 'after:STORY-1',
        unstarted: [],
      },
    ]
      .map((event) => JSON.stringify(event))
      .join('\n')}\n`,
  );

  const inspection = await session.operator.inspect({ runDir });
  assert.strictEqual(inspection.kind, 'projection');
  assert.strictEqual(inspection.resumeDiagnostics[0]?.code, 'resume-blocked-missing-approval');
});

test('inspect leaves resume diagnostics empty when a stopped git workspace is still continuous', async () => {
  initGitWorkspace(workDir);
  const session = createJigSession();
  const runDir = mkdtempSync(join(tmpdir(), 'jig-sdk-continuous-run-'));
  const workspace = captureWorkspaceFingerprint(process.cwd());
  assert.ok('repoRoot' in workspace);
  try {
    writeFileSync(
      join(runDir, 'events.jsonl'),
      `${[
        {
          family: 'run.started',
          actor: 'runner',
          timestamp: '2026-07-03T09:00:00.000Z',
          runId: 'run-sdk-git-continuous',
          planId: 'plan-sdk-session',
          mode: 'local-dry-run',
          binding: {
            policyRef: 'policy-sdk-session',
            configRef: 'mode=local-dry-run;recordDir=runs',
            workspace,
          },
          posture: { record: 'safe-for-owner-record', export: 'redacted' },
          planSnapshot: { ref: 'plan.snapshot.json' },
          policySnapshot: { ref: 'policy.snapshot.json' },
        },
        {
          family: 'story.started',
          actor: 'runner',
          timestamp: '2026-07-03T09:00:00.500Z',
          storyId: 'STORY-1',
        },
        {
          family: 'story.blocked',
          actor: 'runner',
          timestamp: '2026-07-03T09:00:00.750Z',
          storyId: 'STORY-1',
          reason: 'worker-reported-failure',
        },
        {
          family: 'run.stopped',
          actor: 'runner',
          timestamp: '2026-07-03T09:00:01.000Z',
          reason: 'work-item-blocked',
          checkpoint: 'after:STORY-1',
          unstarted: [],
        },
      ]
        .map((event) => JSON.stringify(event))
        .join('\n')}\n`,
    );

    const inspection = await session.operator.inspect({ runDir });
    assert.strictEqual(inspection.kind, 'projection');
    assert.deepStrictEqual(inspection.resumeDiagnostics, []);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test('inspect fails closed for missing directories', async () => {
  const session = createJigSession();

  await assert.rejects(
    () => session.operator.inspect({ runDir: join(workDir, 'missing-run') }),
    /Run directory ".*missing-run" does not exist/,
  );
});

test('inspect fails closed when a run directory has neither events nor run.json', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'empty-run');
  mkdirSync(runDir, { recursive: true });

  await assert.rejects(() => session.operator.inspect({ runDir }), /Neither events\.jsonl nor run\.json found/);
});

test('inspect fails closed when authoritative events are present but empty', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'empty-events-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), '');

  await assert.rejects(() => session.operator.inspect({ runDir }), /Failed to inspect authoritative events\.jsonl/);
});

test('inspect surfaces a parse failure when only an invalid run.json is present', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'broken-legacy');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'run.json'), '{not-json');

  await assert.rejects(() => session.operator.inspect({ runDir }), /Failed to parse run\.json/);
});

test('inspect throws InspectRunError when authoritative events are malformed', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'malformed-events');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'events.jsonl'), '{"bad-json"\n');

  await assert.rejects(
    () => session.operator.inspect({ runDir }),
    (error: unknown) => error instanceof InspectRunError,
  );
});

test('P08-AC-1/4: operator watch projects run state and notice queue', async () => {
  const session = createJigSession();
  const watch = await session.operator.watch({ runDir: writeObservationRun() });

  assert.strictEqual(watch.signal, 'parked');
  assert.deepStrictEqual(
    watch.groups.done.map((story) => story.storyId),
    ['STORY-1'],
  );
  assert.deepStrictEqual(
    watch.groups.parked.map((story) => story.storyId),
    ['STORY-2'],
  );
  assert.strictEqual(watch.notices[0]?.id, 'unattended-park');
  assert.strictEqual(watch.notices[0]?.state, 'open');
});

test('P08-AC-1/4: operator watch ignores corrupt optional run.json cache', async () => {
  const session = createJigSession();
  const runDir = writeObservationRun('observation-run-with-corrupt-cache');
  writeFileSync(join(runDir, 'run.json'), '{not-json');

  const watch = await session.operator.watch({ runDir });

  assert.strictEqual(watch.signal, 'parked');
  assert.deepStrictEqual(
    watch.groups.waiting.map((story) => story.storyId),
    [],
  );
});

test('P08-AC-3/4: operator askWhy cites the recorded story cause', async () => {
  const session = createJigSession();
  const result = await session.operator.askWhy({ runDir: writeObservationRun(), storyId: 'STORY-2' });

  assert.strictEqual(result.subject, 'STORY-2');
  assert.match(result.answer, /parked waiting for owner attention/);
  assert.ok(result.citations.some((citation) => citation.family === 'story.parked' && citation.line === 6));
});

test('P08-AC-2/4: operator acknowledgeNotice appends owner notice state', async () => {
  const session = createJigSession();
  const runDir = writeObservationRun();

  const result = await session.operator.acknowledgeNotice({ runDir, noticeId: 'unattended-park' });

  assert.strictEqual(result.notice.state, 'acknowledged');
  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(events.some((event) => event.family === 'notice.acknowledged' && event.actor === 'owner'));
});

test('P08-AC-2/4: operator snoozeNotice validates timestamps and persists state', async () => {
  const session = createJigSession();
  const runDir = writeObservationRun();

  await assert.rejects(
    () => session.operator.snoozeNotice({ runDir, noticeId: 'unattended-park', until: 'not-a-date' }),
    /Invalid --until timestamp/,
  );

  const result = await session.operator.snoozeNotice({
    runDir,
    noticeId: 'unattended-park',
    until: '2026-07-03T12:00:00.000Z',
  });
  assert.strictEqual(result.notice.state, 'snoozed');
  assert.strictEqual(result.notice.snoozedUntil, '2026-07-03T12:00:00.000Z');
});

test('P08-AC-2/4: notice actions fail closed for unknown notices', async () => {
  const session = createJigSession();
  const runDir = writeObservationRun();

  await assert.rejects(
    () => session.operator.acknowledgeNotice({ runDir, noticeId: 'missing-notice' }),
    /Notice "missing-notice" is not open for this run/,
  );
});

test('P08-AC-2/4: notice acknowledgement extends records integrity sidecar when present', async () => {
  const session = createJigSession();
  const runDir = writeObservationRun('integrity-observation-run');
  writeIntegritySidecar(runDir);

  const beforeLineCount = JSON.parse(readFileSync(join(runDir, 'integrity.json'), 'utf8')).eventLog.lineCount;
  await session.operator.acknowledgeNotice({ runDir, noticeId: 'unattended-park' });
  const afterLineCount = JSON.parse(readFileSync(join(runDir, 'integrity.json'), 'utf8')).eventLog.lineCount;

  assert.strictEqual(afterLineCount, beforeLineCount + 1);
});

test('P08-AC-2/4: notice acknowledgement refuses broken records integrity', async () => {
  const session = createJigSession();
  const runDir = writeObservationRun('broken-integrity-observation-run');
  writeIntegritySidecar(runDir);
  writeFileSync(join(runDir, 'events.jsonl'), `${readFileSync(join(runDir, 'events.jsonl'), 'utf8')}not-json\n`);

  await assert.rejects(
    () => session.operator.acknowledgeNotice({ runDir, noticeId: 'unattended-park' }),
    (error: unknown) => error instanceof InspectRunError && /Refusing to append notice action/.test(error.message),
  );
});

test('P08-AC-4: watch fails closed for missing events logs', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'missing-events-observation-run');
  mkdirSync(runDir, { recursive: true });

  await assert.rejects(() => session.operator.watch({ runDir }), /Missing authoritative events\.jsonl/);
});

test('P09-AC-1/2: operator decide records one routed owner decision and refuses duplicates', async () => {
  const session = createJigSession();
  const runDir = writeObservationRun();

  const result = await session.operator.decide({
    runDir,
    outcome: 'override',
    reason: 'owner accepts local risk',
  });

  assert.deepStrictEqual(result, {
    runDir,
    outcome: 'override',
    storyId: 'STORY-2',
    reason: 'owner accepts local risk',
  });

  const duplicate = await session.operator.decide({ runDir, outcome: 'approve' });
  assert.strictEqual(duplicate.outcome, 'refused');
  assert.strictEqual(duplicate.reason, 'decision-already-recorded');

  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'owner-decision.recorded' &&
        event.actor === 'owner' &&
        event.storyId === 'STORY-2' &&
        event.outcome === 'override',
    ),
  );
  assert.ok(
    events.find((event) => event.family === 'owner-decision.refused' && event.reason === 'decision-already-recorded'),
  );
});

test('P09-AC-1/2: operator decide honors explicit routed stories and hand-off targets', async () => {
  const session = createJigSession();

  const approveRun = writeObservationRun('explicit-story-approve-run');
  const approved = await session.operator.decide({
    runDir: approveRun,
    outcome: 'approve',
    storyId: 'STORY-2',
  });
  assert.strictEqual(approved.outcome, 'approve');
  assert.strictEqual(approved.storyId, 'STORY-2');

  const rejectRun = writeObservationRun('reject-run');
  const rejected = await session.operator.decide({ runDir: rejectRun, outcome: 'reject' });
  assert.strictEqual(rejected.outcome, 'reject');
  const duplicateReject = await session.operator.decide({ runDir: rejectRun, outcome: 'approve' });
  assert.strictEqual(duplicateReject.outcome, 'refused');
  assert.strictEqual(duplicateReject.reason, 'decision-already-recorded');

  const handoffRun = writeObservationRun('handoff-run');
  const handedOff = await session.operator.decide({
    runDir: handoffRun,
    outcome: 'hand-off',
    handedOffTo: 'platform-owner',
  });
  assert.strictEqual(handedOff.outcome, 'hand-off');
  const duplicateHandOff = await session.operator.decide({ runDir: handoffRun, outcome: 'approve' });
  assert.strictEqual(duplicateHandOff.outcome, 'refused');
  assert.strictEqual(duplicateHandOff.reason, 'decision-already-recorded');

  const events = readFileSync(join(handoffRun, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'owner-decision.recorded' &&
        event.outcome === 'hand-off' &&
        event.handedOffTo === 'platform-owner',
    ),
  );
});

test('P09-AC-1/2: operator decide carries parked request identifiers into decision records', async () => {
  const session = createJigSession();
  const runDir = writeObservationRun('parked-request-decision-run');
  const lines = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  const parked = lines.find((event) => event.family === 'story.parked');
  assert.ok(parked);
  parked.requestId = 'REQ-2';
  parked.requestKind = 'edit-files';
  writeFileSync(join(runDir, 'events.jsonl'), stringifyJsonl(lines));

  await session.operator.decide({ runDir, outcome: 'approve' });

  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'owner-decision.recorded' && event.requestId === 'REQ-2' && event.requestKind === 'edit-files',
    ),
  );
});

test('P09-AC-1/2: operator decide refuses missing hand-off targets and out-of-scope stories', async () => {
  const session = createJigSession();

  const missingTargetRun = writeObservationRun('missing-handoff-target-run');
  const missingTarget = await session.operator.decide({ runDir: missingTargetRun, outcome: 'hand-off' });
  assert.strictEqual(missingTarget.outcome, 'refused');
  assert.strictEqual(missingTarget.reason, 'missing-hand-off-target');

  const outOfScopeRun = writeObservationRun('out-of-scope-decision-run');
  const outOfScope = await session.operator.decide({
    runDir: outOfScopeRun,
    outcome: 'approve',
    storyId: 'STORY-404',
  });
  assert.strictEqual(outOfScope.outcome, 'refused');
  assert.strictEqual(outOfScope.reason, 'decision-outside-routed-scope');
});

test('P09-AC-3: operator decide records refusals when no routed decision exists', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'completed-decision-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
      },
    ]),
  );

  const result = await session.operator.decide({ runDir, outcome: 'approve' });

  assert.strictEqual(result.outcome, 'refused');
  assert.strictEqual(result.reason, 'no-routed-decision');
});

// A live run: STORY-2 is parked on a routed request and no terminal run.stopped exists yet.
function writeLiveParkedRun(name = 'live-parked-run'): string {
  const runDir = join(workDir, name);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:03.000Z',
        storyId: 'STORY-2',
      },
      {
        family: 'authorization.routed',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:04.000Z',
        storyId: 'STORY-2',
        requestId: 'REQ-2',
        requestKind: 'edit-files',
        basis: ['fence-routed'],
      },
      {
        family: 'story.parked',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:05.000Z',
        storyId: 'STORY-2',
        requestId: 'REQ-2',
        reason: 'owner-decision-required',
      },
    ]),
  );
  return runDir;
}

test('P09-F2: decide routes a live parked run instead of refusing', async () => {
  const session = createJigSession();
  const runDir = writeLiveParkedRun();

  const result = await session.operator.decide({ runDir, outcome: 'approve' });

  assert.deepStrictEqual(result, {
    runDir,
    outcome: 'approve',
    storyId: 'STORY-2',
    reason: undefined,
  });

  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  const decision = events.find((event) => event.family === 'owner-decision.recorded');
  assert.ok(decision);
  assert.strictEqual(decision.actor, 'owner');
  assert.strictEqual(decision.storyId, 'STORY-2');
  assert.strictEqual(decision.outcome, 'approve');
  assert.strictEqual(decision.requestId, 'REQ-2');
  // The park event omits the request kind; the routed record supplies it so the out-of-band
  // decision record matches the interactive record shape.
  assert.strictEqual(decision.requestKind, 'edit-files');
  assert.ok(!events.find((event) => event.family === 'owner-decision.refused'));
});

test('P09-F2: live decide records reject and hand-off outcomes with their targets', async () => {
  const session = createJigSession();

  const rejectRun = writeLiveParkedRun('live-reject-run');
  const rejected = await session.operator.decide({ runDir: rejectRun, outcome: 'reject' });
  assert.strictEqual(rejected.outcome, 'reject');
  assert.strictEqual(rejected.storyId, 'STORY-2');

  const handoffRun = writeLiveParkedRun('live-handoff-run');
  const handedOff = await session.operator.decide({
    runDir: handoffRun,
    outcome: 'hand-off',
    handedOffTo: 'platform-owner',
  });
  assert.strictEqual(handedOff.outcome, 'hand-off');
  const events = readFileSync(join(handoffRun, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'owner-decision.recorded' &&
        event.outcome === 'hand-off' &&
        event.handedOffTo === 'platform-owner',
    ),
  );
});

test('P09-F2: duplicate live decide refuses decision-already-recorded', async () => {
  const session = createJigSession();
  const runDir = writeLiveParkedRun('live-duplicate-run');

  await session.operator.decide({ runDir, outcome: 'approve' });
  const duplicate = await session.operator.decide({ runDir, outcome: 'reject' });

  assert.strictEqual(duplicate.outcome, 'refused');
  assert.strictEqual(duplicate.reason, 'decision-already-recorded');
});

test('P09-F2: live decide refuses out-of-scope stories and missing hand-off targets', async () => {
  const session = createJigSession();

  const outOfScopeRun = writeLiveParkedRun('live-out-of-scope-run');
  const outOfScope = await session.operator.decide({
    runDir: outOfScopeRun,
    outcome: 'approve',
    storyId: 'STORY-404',
  });
  assert.strictEqual(outOfScope.outcome, 'refused');
  assert.strictEqual(outOfScope.reason, 'decision-outside-routed-scope');

  const missingTargetRun = writeLiveParkedRun('live-missing-target-run');
  const missingTarget = await session.operator.decide({ runDir: missingTargetRun, outcome: 'hand-off' });
  assert.strictEqual(missingTarget.outcome, 'refused');
  assert.strictEqual(missingTarget.reason, 'missing-hand-off-target');
});

test('P09-F2/AC-3: live decide against a run with no parked story still refuses no-routed-decision', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'live-unparked-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
    ]),
  );

  const result = await session.operator.decide({ runDir, outcome: 'approve' });

  assert.strictEqual(result.outcome, 'refused');
  assert.strictEqual(result.reason, 'no-routed-decision');
});

test('P09-AC-1/2: operator decide extends records integrity sidecar when present', async () => {
  const session = createJigSession();
  const runDir = writeObservationRun('integrity-decision-run');
  writeIntegritySidecar(runDir);

  const beforeLineCount = JSON.parse(readFileSync(join(runDir, 'integrity.json'), 'utf8')).eventLog.lineCount;
  await session.operator.decide({ runDir, outcome: 'approve' });
  const afterLineCount = JSON.parse(readFileSync(join(runDir, 'integrity.json'), 'utf8')).eventLog.lineCount;

  assert.strictEqual(afterLineCount, beforeLineCount + 1);
});

test('P09-AC-1/4: control actions refuse broken records integrity', async () => {
  const session = createJigSession();
  const decisionRun = writeObservationRun('broken-integrity-decision-run');
  writeIntegritySidecar(decisionRun);
  writeFileSync(
    join(decisionRun, 'events.jsonl'),
    `${readFileSync(join(decisionRun, 'events.jsonl'), 'utf8')}not-json\n`,
  );

  await assert.rejects(
    () => session.operator.decide({ runDir: decisionRun, outcome: 'approve' }),
    (error: unknown) => error instanceof InspectRunError && /Refusing to append owner decision/.test(error.message),
  );

  const stopRun = writeObservationRun('broken-integrity-stop-run');
  writeIntegritySidecar(stopRun);
  writeFileSync(join(stopRun, 'events.jsonl'), `${readFileSync(join(stopRun, 'events.jsonl'), 'utf8')}not-json\n`);

  await assert.rejects(
    () => session.operator.stop({ runDir: stopRun }),
    (error: unknown) => error instanceof InspectRunError && /Refusing to append operator action/.test(error.message),
  );
});

test('P09-AC-4: operator stop requests a coordinated stop for live runs', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'active-stoppable-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'evidence.modeled',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
        result: 'passed',
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:03.000Z',
        storyId: 'STORY-1',
      },
    ]),
  );

  const requested = await session.operator.stop({ runDir, reason: 'owner-requested-pause' });

  assert.deepStrictEqual(requested, {
    runDir,
    status: 'requested',
    checkpoint: 'after:STORY-1',
    reason: 'owner-requested-pause',
  });
  const watch = await session.operator.watch({ runDir });
  assert.strictEqual(watch.lifecycleState, 'started');
  const events = readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
  assert.ok(events.find((event) => event.family === 'operator-action.requested' && event.action === 'stop'));
});

test('P09-AC-4: operator stop requests a coordinated stop for resumed runs', async () => {
  const session = createJigSession();
  const runDir = join(workDir, 'resumed-stoppable-run');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.parked',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:02.000Z',
        storyId: 'STORY-1',
        reason: 'owner-decision-required',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:03.000Z',
        reason: 'unattended-park',
        checkpoint: 'after:STORY-1.parked',
      },
      {
        family: 'run.resumed',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:04.000Z',
        checkpoint: 'after:STORY-1.parked',
      },
    ]),
  );

  const requested = await session.operator.stop({ runDir });

  assert.strictEqual(requested.status, 'requested');
  assert.strictEqual(requested.checkpoint, 'after:STORY-1.parked');
  assert.strictEqual(requested.reason, 'operator-stop');
});

test('P09-AC-4: operator stop refuses runs without a safe checkpoint or already terminal runs', async () => {
  const session = createJigSession();
  const unsafeRun = join(workDir, 'active-unsafe-run');
  mkdirSync(unsafeRun, { recursive: true });
  writeFileSync(
    join(unsafeRun, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
        storyId: 'STORY-1',
      },
    ]),
  );

  const unsafe = await session.operator.stop({ runDir: unsafeRun });
  assert.strictEqual(unsafe.status, 'requested');
  assert.strictEqual(unsafe.reason, 'operator-stop');

  const terminal = await session.operator.stop({ runDir: writeObservationRun('already-stopped-run') });
  assert.strictEqual(terminal.status, 'refused');
  assert.strictEqual(terminal.reason, 'run-already-stopped');

  const completedRun = join(workDir, 'already-completed-run');
  mkdirSync(completedRun, { recursive: true });
  writeFileSync(
    join(completedRun, 'events.jsonl'),
    stringifyJsonl([
      phase4LaunchHeader(),
      {
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-03T09:00:01.000Z',
      },
    ]),
  );

  const completed = await session.operator.stop({ runDir: completedRun });
  assert.strictEqual(completed.status, 'refused');
  assert.strictEqual(completed.reason, 'run-already-completed');
});
