import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test, vi } from 'vitest';

// exportRun's projection try/catch normalizes the caught value with
// `error instanceof Error ? error.message : String(error)` before building the refusal reason.
// Every real projectRunEvents failure path throws a ProjectionError (an Error subclass), so the
// `String(error)` fallback is defense-in-depth against a caller that violates that contract. It
// is only reachable by making projectRunEvents itself throw a non-Error value, which requires
// mocking the projection module rather than crafting a real fixture.
vi.mock('../src/projection.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/projection.js')>();
  return {
    ...actual,
    projectRunEvents: () => {
      throw 'not-an-error-instance';
    },
  };
});

const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
  vi.resetModules();
});

test('export: a non-Error thrown during projection is still normalized into a string refusal reason', async () => {
  const { exportRun } = await import('../src/export.js');
  const runDir = mkdtempSync(join(tmpdir(), 'jig-export-non-error-'));
  cleanupDirs.push(runDir);
  writeFileSync(join(runDir, 'events.jsonl'), '{"family":"run.started"}\n');

  const result = exportRun({ runDir });

  assert.strictEqual(result.status, 'refused');
  assert.strictEqual(result.reason, 'projection-drift: not-an-error-instance');
});
