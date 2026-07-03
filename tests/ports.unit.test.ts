import assert from 'node:assert';
import { test } from 'vitest';
import type { AgentPort, ExecutionHostPort, ForgePort, WorkSourcePort } from '../src/ports.js';
import type { Story, WorkerResult } from '../src/types.js';

test('P5-AC-3: AgentPort exposes only request/observe execution semantics', () => {
  const agent: AgentPort = {
    execute: async (story: Story): Promise<WorkerResult> => ({
      storyId: story.id,
      outcome: 'success',
      evidence: { result: 'passed' },
    }),
  };

  assert.deepStrictEqual(Object.keys(agent), ['execute']);
});

test('P5-AC-3: provider ports keep host, forge, and source responsibilities separate', async () => {
  const executionHost: ExecutionHostPort = {
    describe: () => ({
      driverId: 'reference-host',
      runContext: 'run-ports',
      isolationStrength: 'none',
      capabilityAttestations: [],
    }),
  };
  const forge: ForgePort = {
    land: (request) => ({
      family: 'runner-action.skipped-on-dry-run',
      storyId: request.storyId,
      action: request.action,
      reason: 'dry-run',
    }),
  };
  const workSource: WorkSourcePort = {
    candidates: async () => [
      {
        planInstance: {
          plan: {
            id: 'plan-ports',
            version: 'execution-plan-shape-v0',
            stories: [{ id: 'STORY-1', title: 'Story 1' }],
          },
        },
        provenance: 'jig-validated',
      },
    ],
  };

  assert.deepStrictEqual(Object.keys(executionHost), ['describe']);
  assert.deepStrictEqual(Object.keys(forge), ['land']);
  assert.deepStrictEqual(Object.keys(workSource), ['candidates']);
  assert.strictEqual((await executionHost.describe()).runContext, 'run-ports');
  assert.strictEqual(
    (await forge.land({ storyId: 'STORY-1', action: 'push|open-pr|merge' })).family,
    'runner-action.skipped-on-dry-run',
  );
  assert.strictEqual((await workSource.candidates())[0]?.provenance, 'jig-validated');
});
