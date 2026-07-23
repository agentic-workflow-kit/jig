import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validatePackageBoundaries } from './check-package-boundaries.mjs';

function createTempWorkspace(setup) {
  const dir = join(tmpdir(), `gf001-boundary-test-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  try {
    setup(dir);
    return validatePackageBoundaries(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('validatePackageBoundaries passes on valid repository', () => {
  const errors = validatePackageBoundaries();
  assert.equal(errors.length, 0, `Expected 0 errors, got: ${errors.join(', ')}`);
});

test('validatePackageBoundaries fails if root packages/ exists', () => {
  const errors = createTempWorkspace((dir) => {
    mkdirSync(join(dir, 'packages'), { recursive: true });
  });
  assert.ok(errors.some((e) => e.includes('root packages/ directory is forbidden')));
});

test('validatePackageBoundaries fails if root src/ exists', () => {
  const errors = createTempWorkspace((dir) => {
    mkdirSync(join(dir, 'src'), { recursive: true });
  });
  assert.ok(errors.some((e) => e.includes('root src/ product source directory is forbidden')));
});

test('validatePackageBoundaries fails if a workspace package is non-private', () => {
  const errors = createTempWorkspace((dir) => {
    const pkgDir = join(dir, 'tests', 'fixtures', 'gf-001-workspace', 'packages', 'pkg-pub');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@gf-001-fixture/pkg-pub',
        version: '0.0.0',
        private: false,
      }),
    );
  });
  assert.ok(errors.some((e) => e.includes('must set "private": true')));
});

test('validatePackageBoundaries fails if package depends on unknown workspace package', () => {
  const errors = createTempWorkspace((dir) => {
    const pkgDir = join(dir, 'tests', 'fixtures', 'gf-001-workspace', 'packages', 'pkg-bad');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@gf-001-fixture/pkg-bad',
        version: '0.0.0',
        private: true,
        dependencies: { '@gf-001-fixture/unknown': 'workspace:*' },
      }),
    );
  });
  assert.ok(errors.some((e) => e.includes('depends on unknown workspace package')));
});

test('validatePackageBoundaries fails if package contains forbidden provider/adapter/credential files', () => {
  const errors = createTempWorkspace((dir) => {
    const pkgDir = join(dir, 'tests', 'fixtures', 'gf-001-workspace', 'packages', 'pkg-forbidden');
    const srcDir = join(pkgDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@gf-001-fixture/pkg-forbidden',
        version: '0.0.0',
        private: true,
      }),
    );
    writeFileSync(join(srcDir, 'provider.ts'), 'export const provider = {};');
  });
  assert.ok(errors.some((e) => e.includes('forbidden runtime concept file')));
});
