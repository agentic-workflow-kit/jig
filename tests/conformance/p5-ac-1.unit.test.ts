import assert from 'node:assert';
import { test } from 'vitest';
import { composeReferenceRun } from '../../src/bootstrap.js';
import {
  assertProviderConformance,
  ProviderConformanceError,
  type ProviderManifest,
} from '../../src/conformance/provider-conformance.js';
import type { ExecutionHostPort, WorkSourcePort } from '../../src/ports.js';
import type { ConfigDoc, PlanInstance } from '../../src/types.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-conformance',
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

const referenceManifest: ProviderManifest = {
  id: 'reference-adapters',
  network: 'none',
  credentials: 'none',
  capabilities: ['filesystem-edit'],
};

test('P5-AC-1: reference adapters pass the reusable conformance suite', async () => {
  const composed = await composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
  });

  await assertProviderConformance({
    ...composed,
    manifest: referenceManifest,
    requestedCapabilities: ['filesystem-edit'],
  });
});

test('P5-AC-1: broken agent exposing a privileged method fails closed', async () => {
  const composed = await composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
  });
  const brokenAgent = {
    ...composed.agent,
    merge: async () => undefined,
  };

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        agent: brokenAgent,
        manifest: referenceManifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('agent-privileged-method:merge'),
  );
});

test('P5-AC-1: broken host overstating isolation fails closed', async () => {
  const composed = await composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
  });
  const brokenHost: ExecutionHostPort = {
    describe: () => ({
      driverId: 'broken-host',
      runContext: 'local-dry-run',
      isolationStrength: 'strong',
      capabilityAttestations: [
        {
          driverId: 'broken-host',
          capability: 'filesystem-edit',
          runContext: 'local-dry-run',
          freshness: 'fresh',
          positive: true,
          reportedIsolationStrength: 'strong',
          provenIsolationStrength: 'weak',
        },
      ],
    }),
  };

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        executionHost: brokenHost,
        manifest: referenceManifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('host-isolation-overstated'),
  );
});

test('P5-AC-1: adapter acting beyond its manifest is rejected', async () => {
  const composed = await composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
  });

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        manifest: referenceManifest,
        requestedCapabilities: ['credential-access'],
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('manifest-capability-overreach'),
  );
});

test('P5-AC-1: broken work source bypassing plan intake fails closed', async () => {
  const composed = await composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
  });
  const brokenWorkSource: WorkSourcePort = {
    candidates: () => [
      {
        planInstance: {
          plan: {
            id: 'plan-invalid-work-source',
            version: 'unknown-version',
            stories: [{ id: 'STORY-1', title: 'Invalid candidate' }],
          },
        },
        provenance: 'jig-validated',
      },
    ],
  };

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        workSource: brokenWorkSource,
        manifest: referenceManifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('work-source-plan-intake-bypass'),
  );
});
