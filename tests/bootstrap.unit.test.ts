import assert from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';
import { composeReferenceRun, ProviderSelectionError } from '../src/bootstrap.js';
import type { ConfigDoc, PlanInstance } from '../src/types.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-bootstrap',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Story 1' }],
  },
};

const config: ConfigDoc = {
  runner: { mode: 'local-dry-run', recordDir: 'runs' },
  drivers: {
    agent: 'scripted-stub',
    executionHost: 'local',
  },
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        return sourceFiles(path);
      }
      return path.endsWith('.ts') ? [path] : [];
    })
    .sort();
}

test('P5-AC-3: composition root wires default run through the four internal ports', async () => {
  const composed = await composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: {
      storyId: 'STORY-1',
      outcome: 'success',
      evidence: { result: 'passed' },
    },
  });

  assert.strictEqual(composed.planInstance, planInstance);
  assert.strictEqual((await composed.agent.execute(planInstance.plan.stories[0])).storyId, 'STORY-1');
  assert.strictEqual((await composed.executionHost.describe()).driverId, 'reference-host');
  assert.strictEqual(
    (await composed.forge.land({ storyId: 'STORY-1', action: 'push' })).family,
    'runner-action.skipped-on-dry-run',
  );
  assert.strictEqual((await composed.workSource.candidates())[0]?.provenance, 'jig-validated');
});

test('P5-AC-5: composition root validates pass-through work-source candidates through plan intake', async () => {
  await assert.rejects(
    () =>
      composeReferenceRun({
        planInstance: {
          plan: {
            id: 'plan-invalid',
            version: 'unknown-version',
            stories: [{ id: 'STORY-1', title: 'Story 1' }],
          },
        },
        config,
        scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
      }),
    /Invalid plan: unknown version "unknown-version"/,
  );
});

test('P5-AC-3: only the composition root imports reference provider adapters', () => {
  const files = sourceFiles(join(process.cwd(), 'src')).filter(
    (file) => file !== join(process.cwd(), 'src/bootstrap.ts'),
  );

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /providers\/reference/);
  }
});

test('composition fail-closed: unknown driver selection gives usage guidance', async () => {
  await assert.rejects(
    () =>
      composeReferenceRun({
        planInstance,
        config: {
          ...config,
          drivers: {
            agent: 'real-agent',
            executionHost: 'local',
          },
        },
        scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
      }),
    (error: unknown) =>
      error instanceof ProviderSelectionError &&
      /Unsupported driver selection "agent=real-agent"/.test(error.message) &&
      /Supported drivers:/.test(error.message),
  );
});

test('P7-AC-1: unknown forge driver selection fails closed', async () => {
  await assert.rejects(
    () =>
      composeReferenceRun({
        planInstance,
        config: {
          ...config,
          drivers: {
            forge: 'gitlab',
          },
        },
        scriptedOutput: { storyId: 'STORY-1', outcome: 'success', evidence: { result: 'passed' } },
      }),
    (error: unknown) =>
      error instanceof ProviderSelectionError &&
      /Unsupported driver selection "forge=gitlab"/.test(error.message) &&
      /forge=reference\|github/.test(error.message),
  );
});
