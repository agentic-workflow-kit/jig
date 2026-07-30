import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { validateRuntimeTopology } from '../bin/check-runtime-topology.mjs';

const rootDir = resolve(import.meta.dirname, '../../..');

function withCopy(mutate) {
  const tempDir = mkdtempSync(join(tmpdir(), 'runtime-topology-test-'));
  try {
    cpSync(join(rootDir, 'packages'), join(tempDir, 'packages'), { recursive: true });
    cpSync(
      join(rootDir, 'packages/runtime-contracts/tests/fixtures'),
      join(tempDir, 'packages/runtime-contracts/tests/fixtures'),
      { recursive: true },
    );
    mutate(tempDir);
    return validateRuntimeTopology(tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

test('runtime topology topology guard accepts the fixed oracle', () =>
  assert.deepEqual(validateRuntimeTopology(rootDir), []));

test('runtime topology topology guard rejects every forbidden capability edge', () => {
  const errors = withCopy((root) => {
    const path = join(root, 'packages/runtime-contracts/src/index.ts');
    writeFileSync(path, `${readFileSync(path, 'utf8')}\nimport { readFileSync } from 'node:fs';\n`);
  });
  assert.ok(errors.some((error) => error.includes('provider, transport, process, or effect')));
});

test('runtime topology topology guard rejects oracle permutation', () => {
  const errors = withCopy((root) => {
    const path = join(root, 'packages/runtime-contracts/tests/fixtures/runtime-topology.json');
    const fixture = JSON.parse(readFileSync(path, 'utf8'));
    fixture.ports = [...fixture.ports].reverse();
    writeFileSync(path, `${JSON.stringify(fixture)}\n`);
  });
  assert.ok(errors.some((error) => error.includes('immutable topology oracle')));
});
