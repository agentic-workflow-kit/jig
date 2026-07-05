import assert from 'node:assert';
import { test } from 'vitest';
import { composeReferenceRun } from '../src/bootstrap.js';
import { type CodexAgentSession, createCodexAgent } from '../src/providers/real/agent.js';
import { approveSubstrateManifest, SubstrateAuthorizationError } from '../src/substrate.js';
import type { ConfigDoc, PlanInstance } from '../src/types.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-real-agent',
    version: 'execution-plan-shape-v0',
    stories: [
      {
        id: 'STORY-1',
        title: 'Real edit',
      },
    ],
  },
};

const realAgentConfig: ConfigDoc = {
  runner: { mode: 'local-dry-run', recordDir: 'runs' },
  drivers: {
    agent: 'codex',
  },
};

test('P6-AC-1: a real agent driver via the composition root performs real edits recorded as observed evidence', async () => {
  const session: CodexAgentSession = {
    run: async (story) => ({
      status: 'completed',
      workerResult: {
        storyId: story.id,
        outcome: 'success',
        changedFiles: ['src/real-edit.ts'],
        evidence: { result: 'passed' },
      },
      observedEvidence: {
        driver: 'codex',
        check: 'passed',
      },
    }),
  };
  const composed = await composeReferenceRun({
    planInstance,
    config: realAgentConfig,
    scriptedOutput: {},
    codexSession: session,
  });

  const result = await composed.agent.execute(planInstance.plan.stories[0]);

  assert.deepStrictEqual(result.changedFiles, ['src/real-edit.ts']);
  assert.deepStrictEqual(result.evidence?.observed, { driver: 'codex', check: 'passed' });
});

test('P6-AC-1: the 6a real-agent wiring attests at most weak', async () => {
  const composed = await composeReferenceRun({
    planInstance,
    config: realAgentConfig,
    scriptedOutput: {},
    codexSession: {
      run: async (story) => ({
        status: 'completed',
        workerResult: { storyId: story.id, outcome: 'success', evidence: { result: 'passed' } },
      }),
    },
  });

  assert.strictEqual(composed.capabilityAttestation.reportedIsolationStrength, 'weak');
  assert.strictEqual(composed.capabilityAttestation.provenIsolationStrength, 'weak');
});

test('P6-AC-1: denied or unavailable capability parks through the normal Fence request path', async () => {
  const agent = createCodexAgent({
    session: {
      run: async () => ({
        status: 'capability-denied',
        request: {
          id: 'REQ-denied',
          kind: 'edit-files',
          paths: ['src/file.ts'],
          capability: 'filesystem-edit',
        },
        observedEvidence: { advisory: 'guardian-denied' },
      }),
    },
  });

  const result = await agent.execute(planInstance.plan.stories[0]);

  assert.strictEqual(result.outcome, 'interrupted');
  assert.strictEqual(result.requests?.[0]?.id, 'REQ-denied');
  assert.deepStrictEqual(result.evidence?.observed, { advisory: 'guardian-denied' });
});

test('P6-AC-6: real agent substrate escalation is refused before returning evidence', async () => {
  const agent = createCodexAgent({
    substrateManifest: approveSubstrateManifest({
      id: 'codex-real-driver',
      runtimes: ['node'],
      argv: [['codex', 'exec']],
      credentials: ['CODEX_API_KEY'],
      egress: [],
    }),
    session: {
      run: async (story) => ({
        status: 'completed',
        workerResult: {
          storyId: story.id,
          outcome: 'success',
          evidence: { result: 'passed' },
        },
        substrateRequests: [{ kind: 'credential', value: 'GITHUB_TOKEN' }],
      }),
    },
  });

  await assert.rejects(() => agent.execute(planInstance.plan.stories[0]), SubstrateAuthorizationError);
});
