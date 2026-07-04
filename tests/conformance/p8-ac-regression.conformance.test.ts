import assert from 'node:assert';
import { test } from 'vitest';
import { composeReferenceRun } from '../../src/bootstrap.js';
import {
  assertProviderConformance,
  evaluateProviderConformance,
  ProviderConformanceError,
  type ProviderManifest,
} from '../../src/conformance/provider-conformance.js';
import type { WorkSourcePort } from '../../src/ports.js';
import type { ConfigDoc, PlanInstance } from '../../src/types.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-p8-conformance',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Conformance story' }],
  },
};

const config: ConfigDoc = {
  runner: { mode: 'local-dry-run', recordDir: 'runs' },
  drivers: {
    agent: 'scripted-stub',
    executionHost: 'local',
  },
};

const manifest: ProviderManifest = {
  id: 'reference-adapters',
  network: 'none',
  credentials: 'none',
  capabilities: ['filesystem-edit'],
};

async function composedSubject() {
  return await composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
  });
}

test('P8-AC-1: a plan-intake-bypass work-source adapter is rejected', async () => {
  const composed = await composedSubject();
  const bypassingWorkSource: WorkSourcePort = {
    candidates: () => [
      {
        planInstance: {
          plan: {
            id: 'plan-p8-invalid',
            version: 'unknown-version',
            stories: [{ id: 'STORY-1', title: 'Invalid' }],
          },
        },
        provenance: {
          origin: {
            sourceSystem: 'github-issues',
            candidateId: '201',
          },
          jigValidated: true,
        },
      },
    ],
  };

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        workSource: bypassingWorkSource,
        manifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('work-source-plan-intake-bypass'),
  );
});

test('P8-AC-2: direct-run-resume-bypass conformance case is refused and recorded', async () => {
  const composed = await composedSubject();

  const findings = await evaluateProviderConformance({
    ...composed,
    manifest,
    workSourceAdversarialChecks: {
      directRunResumeBypass: true,
    },
  });

  assert.strictEqual(findings.includes('work-source-direct-harness-bypass-accepted'), false);
});

test('P8-AC-3: a collapsed-provenance work-source adapter is rejected', async () => {
  const composed = await composedSubject();
  const collapsedWorkSource: WorkSourcePort = {
    candidates: () => [
      {
        planInstance,
        provenance: 'jig-validated' as never,
      },
    ],
  };

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        workSource: collapsedWorkSource,
        manifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('work-source-provenance-collapsed'),
  );
});
