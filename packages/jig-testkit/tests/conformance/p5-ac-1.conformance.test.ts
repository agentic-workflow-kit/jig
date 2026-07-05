import assert from 'node:assert';
import type { ExecutionHostPort, WorkSourcePort } from '@agentic-workflow-kit/jig-sdk';
import { test } from 'vitest';
import { assertProviderConformance, ProviderConformanceError, type ProviderManifest } from '../../src/index.js';
import { manifest, referenceSubject } from './helpers.js';

const referenceManifest: ProviderManifest = manifest(['filesystem-edit']);

test('P5-AC-1: reference adapters pass the reusable conformance suite', async () => {
  await assertProviderConformance({
    ...referenceSubject(),
    manifest: referenceManifest,
    requestedCapabilities: ['filesystem-edit'],
  });
});

test('P5-AC-1: broken agent exposing a privileged method fails closed', async () => {
  const composed = referenceSubject();
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
  const composed = referenceSubject();
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
  const composed = referenceSubject();

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
  const composed = referenceSubject();
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
        provenance: {
          origin: {
            sourceSystem: 'local-plan',
            candidateId: 'plan-invalid-work-source',
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
        workSource: brokenWorkSource,
        manifest: referenceManifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('work-source-plan-intake-bypass'),
  );
});
