import assert from 'node:assert';
import { test } from 'vitest';
import { composeReferenceRun } from '../../src/bootstrap.js';
import {
  assertProviderConformance,
  ProviderConformanceError,
  type ProviderManifest,
} from '../../src/conformance/provider-conformance.js';
import type { AgentPort, ForgePort } from '../../src/ports.js';
import type { ConfigDoc, PlanInstance, RunEvent } from '../../src/types.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-p7-conformance',
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
  capabilities: ['filesystem-edit', 'github-forge'],
};

async function composedSubject() {
  return await composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
  });
}

test('P7-AC-1: an agent-reachable Forge adapter is rejected', async () => {
  const composed = await composedSubject();

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        agent: {
          ...composed.agent,
          land: async () => undefined,
        } as AgentPort,
        manifest,
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('agent-privileged-method:land'),
  );
});

test('P7-AC-2: an unknown-action Forge adapter is rejected', async () => {
  const composed = await composedSubject();
  const acceptingForge: ForgePort = {
    land: () => ({
      family: 'runner-action.pushed',
      storyId: 'CONFORMANCE',
    }),
  };

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        forge: acceptingForge,
        manifest,
        forgeAdversarialChecks: {
          unknownAction: true,
        },
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('forge-unknown-action-accepted'),
  );
});

test('P7-AC-3: a resume-double-apply Forge adapter is rejected', async () => {
  const composed = await composedSubject();
  const duplicateEffects: RunEvent[] = [
    {
      family: 'runner-action.pushed',
      storyId: 'STORY-1',
      targetRef: 'refs/heads/phase-7',
      targetHead: 'head-1',
    },
    {
      family: 'runner-action.pushed',
      storyId: 'STORY-1',
      targetRef: 'refs/heads/phase-7',
      targetHead: 'head-1',
    },
  ];

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        manifest,
        forgeAdversarialChecks: {
          landingEvents: duplicateEffects,
        },
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('forge-resume-double-apply'),
  );
});

test('P7-AC-4: an unredacted-credential Forge adapter is rejected', async () => {
  const composed = await composedSubject();
  const landingEvents: RunEvent[] = [
    {
      family: 'runner-action.pushed',
      storyId: 'STORY-1',
      targetRef: 'refs/heads/phase-7',
      targetHead: 'head-1',
      diagnostics: {
        stdout: 'pushed with ghp_phase7_secret',
      },
    },
  ];

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        manifest,
        forgeAdversarialChecks: {
          landingEvents,
          redaction: {
            enabled: true,
            secrets: {
              GITHUB_TOKEN: 'ghp_phase7_secret',
            },
          },
        },
      }),
    (error: unknown) =>
      error instanceof ProviderConformanceError && error.findings.includes('forge-unredacted-credential'),
  );
});
