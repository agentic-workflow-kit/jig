import assert from 'node:assert';
import { test } from 'vitest';
import { composeReferenceRun } from '../../src/bootstrap.js';
import {
  assertProviderConformance,
  ProviderConformanceError,
  type ProviderManifest,
} from '../../src/conformance/provider-conformance.js';
import type { AgentPort, CapabilityAttestation } from '../../src/ports.js';
import { approveSubstrateManifest } from '../../src/substrate.js';
import type { ConfigDoc, PlanInstance } from '../../src/types.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-p6-conformance',
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

test('P6-AC-1: a forbidden-method adapter is rejected', async () => {
  const composed = await composedSubject();

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        agent: {
          ...composed.agent,
          shellCommand: async () => undefined,
        } as AgentPort,
        manifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('agent-privileged-method:shellCommand'),
  );
});

test('P6-AC-2: an overstated-isolation adapter is rejected', async () => {
  const composed = await composedSubject();

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        executionHost: {
          describe: () => ({
            driverId: 'adversarial-host',
            runContext: 'local',
            isolationStrength: 'strong',
            capabilityAttestations: [
              {
                driverId: 'adversarial-host',
                capability: 'filesystem-edit',
                runContext: 'local',
                freshness: 'fresh',
                positive: true,
                reportedIsolationStrength: 'strong',
                provenIsolationStrength: 'weak',
              },
            ],
          }),
        },
        manifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('host-isolation-overstated'),
  );
});

test('P6-AC-6: a substrate-escalation adapter is rejected', async () => {
  const composed = await composedSubject();

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        manifest,
        approvedSubstrateManifest: approveSubstrateManifest({
          id: 'codex-real-driver',
          runtimes: ['node'],
          argv: [['codex', 'exec']],
          credentials: ['CODEX_API_KEY'],
          egress: [],
        }),
        substrateRequests: [{ kind: 'egress', value: 'https://example.com' }],
      }),
    (error: unknown) => error instanceof ProviderConformanceError && error.findings.includes('substrate-escalation'),
  );
});

test('P6-AC-5: a drifted-attestation adapter is rejected', async () => {
  const composed = await composedSubject();
  const launch: CapabilityAttestation = {
    driverId: 'real-host',
    capability: 'filesystem-edit',
    runContext: 'launch',
    freshness: 'fresh',
    positive: true,
    reportedIsolationStrength: 'weak',
    provenIsolationStrength: 'weak',
  };

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        manifest,
        resumeAttestation: {
          launch,
          current: {
            ...launch,
            reportedIsolationStrength: 'strong',
            provenIsolationStrength: 'strong',
          },
        },
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('resume-attestation-drift'),
  );
});
