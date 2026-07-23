import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { validateRuntimeTopology } from './check-runtime-topology.mjs';

const rootDir = resolve(import.meta.dirname, '..');

function withCopy(mutate) {
  const tempDir = mkdtempSync(join(tmpdir(), 'gf003-topology-test-'));
  try {
    cpSync(join(rootDir, 'packages'), join(tempDir, 'packages'), { recursive: true });
    cpSync(join(rootDir, 'tests/fixtures/gf-003'), join(tempDir, 'tests/fixtures/gf-003'), { recursive: true });
    mutate(tempDir);
    return validateRuntimeTopology(tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

test('GF-003 topology guard accepts the fixed oracle', () => assert.deepEqual(validateRuntimeTopology(rootDir), []));

test('GF-003 topology guard rejects every forbidden capability edge', () => {
  const errors = withCopy((root) => {
    const path = join(root, 'packages/runtime-contracts/src/index.ts');
    writeFileSync(path, `${readFileSync(path, 'utf8')}\nimport { readFileSync } from 'node:fs';\n`);
  });
  assert.ok(errors.some((error) => error.includes('provider, transport, process, or effect')));
});

test('GF-003 topology guard rejects oracle permutation', () => {
  const errors = withCopy((root) => {
    const path = join(root, 'tests/fixtures/gf-003/topology.json');
    const fixture = JSON.parse(readFileSync(path, 'utf8'));
    fixture.ports = [...fixture.ports].reverse();
    writeFileSync(path, `${JSON.stringify(fixture)}\n`);
  });
  assert.ok(errors.some((error) => error.includes('immutable topology oracle')));
});
