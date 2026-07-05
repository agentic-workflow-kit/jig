import assert from 'node:assert';
import type { WorkSourcePort } from '@agentic-workflow-kit/jig-sdk';
import { test } from 'vitest';
import {
  assertProviderConformance,
  evaluateProviderConformance,
  ProviderConformanceError,
  type ProviderManifest,
} from '../../src/index.js';
import { manifest, planInstance, referenceSubject } from './helpers.js';

const referenceManifest: ProviderManifest = manifest(['filesystem-edit']);

async function composedSubject() {
  return referenceSubject();
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
        manifest: referenceManifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('work-source-plan-intake-bypass'),
  );
});

test('P8-AC-2: direct-run-resume-bypass conformance case is refused and recorded', async () => {
  const composed = await composedSubject();

  const findings = await evaluateProviderConformance({
    ...composed,
    manifest: referenceManifest,
    workSourceAdversarialChecks: {
      directRunResumeBypass: true,
    },
  });

  assert.strictEqual(findings.includes('work-source-direct-harness-bypass-accepted'), false);
});

test('P8-AC-2: a raw but structurally valid bypass candidate is still rejected by the harness', async () => {
  const composed = await composedSubject();

  const findings = await evaluateProviderConformance({
    ...composed,
    manifest: referenceManifest,
    workSourceAdversarialChecks: {
      directRunResumeBypass: true,
      bypassPlanInstance: planInstance('plan-p8-valid-bypass'),
    },
  });

  assert.strictEqual(findings.includes('work-source-direct-harness-bypass-accepted'), false);
});

test('P8-AC-2: an invalid direct-run-resume bypass candidate is flagged', async () => {
  const composed = await composedSubject();

  const findings = await evaluateProviderConformance({
    ...composed,
    manifest: referenceManifest,
    workSourceAdversarialChecks: {
      directRunResumeBypass: true,
      bypassPlanInstance: {
        plan: {
          id: 'plan-p8-invalid-bypass',
          version: 'unknown-version',
          stories: [{ id: 'STORY-1', title: 'Invalid' }],
        },
      },
    },
  });

  assert.strictEqual(findings.includes('work-source-direct-harness-bypass-accepted'), true);
});

test('P8-AC-3: a collapsed-provenance work-source adapter is rejected', async () => {
  const composed = await composedSubject();
  const collapsedWorkSource: WorkSourcePort = {
    candidates: () => [
      {
        planInstance: planInstance('plan-p8-conformance'),
        provenance: 'jig-validated' as never,
      },
    ],
  };

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        workSource: collapsedWorkSource,
        manifest: referenceManifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('work-source-provenance-collapsed'),
  );
});
