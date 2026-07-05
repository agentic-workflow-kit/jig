import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';
import { composeReferenceRun, ProviderSelectionError } from '../src/bootstrap.js';
import { SubstrateAuthorizationError } from '../src/substrate.js';
import type { ConfigDoc, PlanInstance } from '../src/types.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-bootstrap',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Story 1' }],
  },
};

const config: ConfigDoc = {
  runner: { mode: 'local-dry-run', recordDir: 'runs' },
  drivers: {
    agent: 'scripted-stub',
    executionHost: 'local',
  },
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        return sourceFiles(path);
      }
      return path.endsWith('.ts') ? [path] : [];
    })
    .sort();
}

function initializeMainBranchRepo(dir: string): void {
  execFileSync('git', ['init', '--initial-branch=main'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Bootstrap Test'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'bootstrap-test@example.com'], { cwd: dir });
  writeFileSync(join(dir, 'README.md'), '# bootstrap test\n');
  execFileSync('git', ['add', 'README.md'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: dir });
}

test('P5-AC-3: composition root wires default run through the four internal ports', async () => {
  const composed = await composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: {
      storyId: 'STORY-1',
      outcome: 'success',
      evidence: { result: 'passed' },
    },
  });

  assert.strictEqual(composed.planInstance, planInstance);
  assert.strictEqual((await composed.agent.execute(planInstance.plan.stories[0])).storyId, 'STORY-1');
  assert.strictEqual((await composed.executionHost.describe()).driverId, 'reference-host');
  assert.strictEqual(
    (await composed.forge.land({ storyId: 'STORY-1', action: 'push' })).family,
    'runner-action.skipped-on-dry-run',
  );
  assert.deepStrictEqual((await composed.workSource.candidates())[0]?.provenance, {
    origin: {
      sourceSystem: 'local-plan',
      candidateId: 'plan-bootstrap',
    },
    jigValidated: true,
  });
});

test('P5-AC-5: composition root validates pass-through work-source candidates through plan intake', async () => {
  await assert.rejects(
    () =>
      composeReferenceRun({
        planInstance: {
          plan: {
            id: 'plan-invalid',
            version: 'unknown-version',
            stories: [{ id: 'STORY-1', title: 'Story 1' }],
          },
        },
        config,
        scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
      }),
    /Invalid plan: unknown version "unknown-version"/,
  );
});

test('P5-AC-3: only the composition root imports reference provider adapters', () => {
  const files = sourceFiles(join(process.cwd(), 'packages/jig-sdk/src')).filter(
    (file) => file !== join(process.cwd(), 'packages/jig-sdk/src/bootstrap.ts'),
  );

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /providers\/reference/);
  }
});

test('composition fail-closed: unknown driver selection gives usage guidance', async () => {
  await assert.rejects(
    () =>
      composeReferenceRun({
        planInstance,
        config: {
          ...config,
          drivers: {
            agent: 'real-agent',
            executionHost: 'local',
          },
        },
        scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
      }),
    (error: unknown) =>
      error instanceof ProviderSelectionError &&
      /Unsupported driver selection "agent=real-agent"/.test(error.message) &&
      /Supported drivers:/.test(error.message),
  );
});

test('P7-AC-1: unknown forge driver selection fails closed', async () => {
  await assert.rejects(
    () =>
      composeReferenceRun({
        planInstance,
        config: {
          ...config,
          drivers: {
            forge: 'gitlab',
          },
        },
        scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
      }),
    (error: unknown) =>
      error instanceof ProviderSelectionError &&
      /Unsupported driver selection "forge=gitlab"/.test(error.message) &&
      /forge=reference\|github/.test(error.message),
  );
});

test('P05 MERGE-5: github forge composition outside a git worktree withholds safeBranch but preserves push-permission posture', async () => {
  const originalCwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'jig-bootstrap-no-git-'));

  try {
    process.chdir(tempDir);
    const composed = await composeReferenceRun({
      planInstance,
      config: {
        ...config,
        drivers: {
          agent: 'scripted-stub',
          executionHost: 'local',
          forge: 'github',
        },
      },
      scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
    });

    assert.deepStrictEqual(composed.blockSurface, {
      safeBranch: undefined,
      canPush: true,
    });
  } finally {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('P05 MERGE-5: github forge composition refuses main as a safe block-surfacing branch', async () => {
  const originalCwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'jig-bootstrap-main-'));

  try {
    initializeMainBranchRepo(tempDir);
    process.chdir(tempDir);
    const composed = await composeReferenceRun({
      planInstance,
      config: {
        ...config,
        drivers: {
          agent: 'scripted-stub',
          executionHost: 'local',
          forge: 'github',
        },
      },
      scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
    });

    assert.deepStrictEqual(composed.blockSurface, {
      safeBranch: undefined,
      canPush: true,
    });
  } finally {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('P8-AC-1: github-issues work-source driver is opt-in and selected through the composition root', async () => {
  const composed = await composeReferenceRun({
    planInstance,
    config: {
      ...config,
      drivers: {
        agent: 'scripted-stub',
        executionHost: 'local',
        workSource: 'github-issues',
      },
    },
    scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
    workSourceTransport: {
      fetchCandidates: async () => [
        {
          sourceSystem: 'github-issues',
          identifier: '123',
          planInstance,
        },
      ],
    },
  });

  assert.deepStrictEqual((await composed.workSource.candidates())[0]?.provenance, {
    origin: {
      sourceSystem: 'github-issues',
      candidateId: '123',
    },
    jigValidated: true,
  });
});

test('P8-AC-1: unknown work-source driver selection fails closed', async () => {
  await assert.rejects(
    () =>
      composeReferenceRun({
        planInstance,
        config: {
          ...config,
          drivers: {
            workSource: 'jira',
          },
        },
        scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
      }),
    (error: unknown) =>
      error instanceof ProviderSelectionError &&
      /Unsupported driver selection "workSource=jira"/.test(error.message) &&
      /workSource=reference\|github-issues/.test(error.message),
  );
});

test('P03-AC-1: default real Codex manifest declares the version, schema, and app-server argv', async () => {
  const composed = await composeReferenceRun({
    planInstance,
    config: {
      ...config,
      drivers: {
        agent: 'codex',
        executionHost: 'local',
      },
    },
    scriptedOutput: {},
    codexSession: {
      run: async (story) => ({
        status: 'completed',
        workerResult: { storyId: story.id, outcome: 'success', evidence: { result: 'passed' } },
      }),
    },
  });

  assert.deepStrictEqual(composed.substrateManifest?.tuple.argv, [
    ['codex', '--version'],
    ['codex', 'app-server', '--listen', 'stdio://'],
    ['codex', 'app-server', 'generate-json-schema', '--out', join(tmpdir(), 'jig-codex-schema')],
  ]);
});

test('P04-AC-1: real execution host selection composes from configuration without a test-only probe', async () => {
  if (process.platform !== 'darwin') {
    await assert.rejects(
      () =>
        composeReferenceRun({
          planInstance,
          config: {
            ...config,
            drivers: {
              agent: 'scripted-stub',
              executionHost: 'real',
            },
          },
          scriptedOutput: {},
        }),
      (error: unknown) => error instanceof ProviderSelectionError && /supported only on macOS/.test(error.message),
    );
    return;
  }

  const composed = await composeReferenceRun({
    planInstance,
    config: {
      ...config,
      drivers: {
        agent: 'scripted-stub',
        executionHost: 'real',
      },
    },
    scriptedOutput: {},
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

  const attestation = composed.executionHost.describe().capabilityAttestations[0];
  assert.ok(attestation);
  assert.strictEqual(attestation.driverId, 'real-host');
  assert.strictEqual(attestation.containmentMechanism, 'process-group');
  assert.strictEqual(attestation.reportedIsolationStrength, 'weak');
  assert.strictEqual(attestation.provenIsolationStrength, 'weak');
});

test('P04-AC-4: real host substrate manifest enforcement refuses an out-of-tuple probe request', async () => {
  if (process.platform !== 'darwin') {
    return;
  }

  await assert.rejects(
    () =>
      composeReferenceRun({
        planInstance,
        config: {
          ...config,
          drivers: {
            executionHost: 'real',
          },
        },
        scriptedOutput: {},
        realHostProbeFactory: () => ({
          substrateRequests: [{ kind: 'argv', value: ['probe', 'launch'] }],
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
        substrateManifest: {
          id: 'broken-real-host-substrate',
          runtimes: ['node'],
          argv: [],
          credentials: [],
          egress: [],
        },
      }),
    (error: unknown) => error instanceof SubstrateAuthorizationError && /substrate-escalation/.test(error.message),
  );
});
