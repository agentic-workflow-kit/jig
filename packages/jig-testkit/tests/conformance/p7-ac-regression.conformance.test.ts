import assert from 'node:assert';
import type { AgentPort, ForgePort, RunEvent } from '@agentic-workflow-kit/jig-sdk';
import { test } from 'vitest';
import { assertProviderConformance, ProviderConformanceError, type ProviderManifest } from '../../src/index.js';
import { landingEvent, manifest, referenceSubject } from './helpers.js';

const referenceManifest: ProviderManifest = manifest(['filesystem-edit', 'github-forge']);

async function composedSubject() {
  return referenceSubject();
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
        manifest: referenceManifest,
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
        manifest: referenceManifest,
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
        manifest: referenceManifest,
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
  const landingEvents: RunEvent[] = [landingEvent({ diagnostics: { stdout: 'pushed with ghp_phase7_secret' } })];

  await assert.rejects(
    () =>
      assertProviderConformance({
        ...composed,
        manifest: referenceManifest,
        forgeAdversarialChecks: {
          landingEvents,
          redaction: {
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
