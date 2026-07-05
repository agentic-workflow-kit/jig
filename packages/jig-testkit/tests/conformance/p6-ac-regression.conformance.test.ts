import assert from 'node:assert';
import type { AgentPort, CapabilityAttestation, ExecutionHostPort } from '@agentic-workflow-kit/jig-sdk';
import { test } from 'vitest';
import {
  assertProviderConformance,
  evaluateProviderConformanceVerdicts,
  ProviderConformanceError,
  type ProviderManifest,
} from '../../src/index.js';
import { approveSubstrateManifest, manifest, referenceSubject } from './helpers.js';

const referenceManifest: ProviderManifest = manifest(['filesystem-edit']);

async function composedSubject() {
  return referenceSubject();
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
        manifest: referenceManifest,
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
        manifest: referenceManifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('host-isolation-overstated'),
  );
});

test('P6-AC-2: a self-report-only isolation claim is classified explicitly', async () => {
  const composed = await composedSubject();

  const verdicts = await evaluateProviderConformanceVerdicts({
    ...composed,
    executionHost: {
      describe: () => ({
        driverId: 'lying-host',
        runContext: 'local',
        isolationStrength: 'strong',
        capabilityAttestations: [
          {
            driverId: 'lying-host',
            capability: 'filesystem-edit',
            runContext: 'local',
            freshness: 'fresh',
            positive: true,
            reportedIsolationStrength: 'strong',
          },
        ],
      }),
    },
    manifest: referenceManifest,
  });

  assert.deepStrictEqual(verdicts, [
    {
      finding: 'host-isolation-self-report-only',
      basis: 'self-report-only',
    },
  ]);
});

test('P04-AC-5: the proven real-host path carries no self-report-only conformance finding', async () => {
  const composed = await composedSubject();
  const executionHost: ExecutionHostPort = {
    describe: () => ({
      driverId: 'real-host',
      runContext: 'local-real-host',
      isolationStrength: 'weak',
      capabilityAttestations: [
        {
          driverId: 'real-host',
          capability: 'filesystem-edit',
          runContext: 'local-real-host',
          freshness: 'fresh',
          positive: true,
          reportedIsolationStrength: 'weak',
          provenIsolationStrength: 'weak',
          provenBy: 'exercised-confinement-proof',
          containmentMechanism: 'process-group',
        },
      ],
    }),
  };

  const verdicts = await evaluateProviderConformanceVerdicts({
    ...composed,
    executionHost,
    manifest: referenceManifest,
  });

  assert.deepStrictEqual(verdicts, []);
});

test('P6-AC-2: a positive-only isolation claim is classified as self-report-only', async () => {
  const composed = await composedSubject();

  const verdicts = await evaluateProviderConformanceVerdicts({
    ...composed,
    executionHost: {
      describe: () => ({
        driverId: 'positive-only-host',
        runContext: 'local',
        isolationStrength: 'strong',
        capabilityAttestations: [
          {
            driverId: 'positive-only-host',
            capability: 'filesystem-edit',
            runContext: 'local',
            freshness: 'fresh',
            positive: true,
          },
        ],
      }),
    },
    manifest: referenceManifest,
  });

  assert.deepStrictEqual(verdicts, [
    {
      finding: 'host-isolation-self-report-only',
      basis: 'self-report-only',
    },
  ]);
});

test('P6-AC-2: a top-level-only isolation claim is classified as self-report-only', async () => {
  const composed = await composedSubject();

  const verdicts = await evaluateProviderConformanceVerdicts({
    ...composed,
    executionHost: {
      describe: () => ({
        driverId: 'top-level-only-host',
        runContext: 'local',
        isolationStrength: 'strong',
        capabilityAttestations: [],
      }),
    },
    manifest: referenceManifest,
  });

  assert.deepStrictEqual(verdicts, [
    {
      finding: 'host-isolation-self-report-only',
      basis: 'self-report-only',
    },
  ]);
});

test('P6-AC-6: a substrate-escalation adapter is rejected', async () => {
  const composed = await composedSubject();

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        manifest: referenceManifest,
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

test('P6-AC-6: an approved substrate request does not produce a false-positive verdict', async () => {
  const composed = await composedSubject();

  const verdicts = await evaluateProviderConformanceVerdicts({
    ...composed,
    manifest: referenceManifest,
    approvedSubstrateManifest: approveSubstrateManifest({
      id: 'codex-real-driver',
      runtimes: ['node'],
      argv: [['codex', 'exec']],
      credentials: ['CODEX_API_KEY'],
      egress: ['https://example.com'],
    }),
    substrateRequests: [{ kind: 'egress', value: 'https://example.com' }],
  });

  assert.deepStrictEqual(verdicts, []);
});

test('P6-AC-2: isolation comparisons handle none and missing strengths without false positives', async () => {
  const composed = await composedSubject();

  const verdicts = await evaluateProviderConformanceVerdicts({
    ...composed,
    executionHost: {
      describe: () => ({
        driverId: 'minimal-host',
        runContext: 'local',
        isolationStrength: 'none',
        capabilityAttestations: [
          {
            driverId: 'minimal-host',
            capability: 'filesystem-edit',
            runContext: 'local',
            freshness: 'fresh',
            positive: false,
            provenIsolationStrength: 'none',
          },
        ],
      }),
    },
    manifest: referenceManifest,
    resumeAttestation: {
      launch: {
        driverId: 'launch-host',
        capability: 'filesystem-edit',
        runContext: 'launch',
        freshness: 'fresh',
        positive: true,
        provenIsolationStrength: 'weak',
      },
      current: {
        driverId: 'current-host',
        capability: 'filesystem-edit',
        runContext: 'resume',
        freshness: 'fresh',
        positive: true,
      },
    },
  });

  assert.deepStrictEqual(verdicts, []);
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
        manifest: referenceManifest,
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
