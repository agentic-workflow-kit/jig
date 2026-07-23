import assert from 'node:assert/strict';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { validatePackageBoundaries } from './check-package-boundaries.mjs';

const repoRoot = resolve(import.meta.dirname, '..');

function createTempWorkspace(setup) {
  const dir = join(tmpdir(), `gf001-boundary-test-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  try {
    setup(dir);
    return validatePackageBoundaries(dir);
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    } catch {}
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
    cpSync(
      join(repoRoot, 'tests', 'fixtures', 'gf-001-workspace'),
      join(dir, 'tests', 'fixtures', 'gf-001-workspace'),
      { recursive: true },
    );
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

test('validatePackageBoundaries fails if package declares forbidden internal edge or reverse dependency', () => {
  const errors = createTempWorkspace((dir) => {
    cpSync(
      join(repoRoot, 'tests', 'fixtures', 'gf-001-workspace'),
      join(dir, 'tests', 'fixtures', 'gf-001-workspace'),
      { recursive: true },
    );
    const pkgAPath = join(dir, 'tests', 'fixtures', 'gf-001-workspace', 'packages', 'pkg-a', 'package.json');
    const pkgAJson = {
      name: '@gf-001-fixture/pkg-a',
      version: '0.0.0',
      private: true,
      type: 'module',
      dependencies: { '@gf-001-fixture/pkg-b': 'workspace:*' },
    };
    writeFileSync(pkgAPath, JSON.stringify(pkgAJson, null, 2));
  });
  assert.ok(errors.some((e) => e.includes('declares forbidden dependency @gf-001-fixture/pkg-b')));
});

test('validatePackageBoundaries fails if package declares forbidden edge in optionalDependencies', () => {
  const errors = createTempWorkspace((dir) => {
    cpSync(
      join(repoRoot, 'tests', 'fixtures', 'gf-001-workspace'),
      join(dir, 'tests', 'fixtures', 'gf-001-workspace'),
      { recursive: true },
    );
    const pkgCPath = join(dir, 'tests', 'fixtures', 'gf-001-workspace', 'packages', 'pkg-c', 'package.json');
    const pkgCJson = {
      name: '@gf-001-fixture/pkg-c',
      version: '0.0.0',
      private: true,
      type: 'module',
      optionalDependencies: { '@gf-001-fixture/pkg-a': 'workspace:*' },
    };
    writeFileSync(pkgCPath, JSON.stringify(pkgCJson, null, 2));
  });
  assert.ok(
    errors.some((e) => e.includes('declares forbidden dependency @gf-001-fixture/pkg-a in optionalDependencies')),
  );
});

test('validatePackageBoundaries fails if dependency does not use exact workspace:* protocol', () => {
  const errors = createTempWorkspace((dir) => {
    cpSync(
      join(repoRoot, 'tests', 'fixtures', 'gf-001-workspace'),
      join(dir, 'tests', 'fixtures', 'gf-001-workspace'),
      { recursive: true },
    );
    const pkgBPath = join(dir, 'tests', 'fixtures', 'gf-001-workspace', 'packages', 'pkg-b', 'package.json');
    const pkgBJson = {
      name: '@gf-001-fixture/pkg-b',
      version: '0.0.0',
      private: true,
      type: 'module',
      dependencies: { '@gf-001-fixture/pkg-a': '^1.0.0' },
    };
    writeFileSync(pkgBPath, JSON.stringify(pkgBJson, null, 2));
  });
  assert.ok(errors.some((e) => e.includes('must use exact "workspace:*" protocol')));
});

test('validatePackageBoundaries fails if package declares external dependency', () => {
  const errors = createTempWorkspace((dir) => {
    cpSync(
      join(repoRoot, 'tests', 'fixtures', 'gf-001-workspace'),
      join(dir, 'tests', 'fixtures', 'gf-001-workspace'),
      { recursive: true },
    );
    const pkgCPath = join(dir, 'tests', 'fixtures', 'gf-001-workspace', 'packages', 'pkg-c', 'package.json');
    const pkgCJson = {
      name: '@gf-001-fixture/pkg-c',
      version: '0.0.0',
      private: true,
      type: 'module',
      dependencies: { lodash: '^4.17.21' },
    };
    writeFileSync(pkgCPath, JSON.stringify(pkgCJson, null, 2));
  });
  assert.ok(errors.some((e) => e.includes('declares forbidden dependency lodash')));
});

test('validatePackageBoundaries fails if dependency and tsconfig project reference mismatch', () => {
  const errors = createTempWorkspace((dir) => {
    cpSync(
      join(repoRoot, 'tests', 'fixtures', 'gf-001-workspace'),
      join(dir, 'tests', 'fixtures', 'gf-001-workspace'),
      { recursive: true },
    );
    const pkgBTsconfig = join(dir, 'tests', 'fixtures', 'gf-001-workspace', 'packages', 'pkg-b', 'tsconfig.json');
    writeFileSync(
      pkgBTsconfig,
      JSON.stringify({
        extends: '../../tsconfig.base.json',
        compilerOptions: { outDir: 'dist', rootDir: 'src' },
        references: [],
      }),
    );
  });
  assert.ok(errors.some((e) => e.includes('tsconfig missing required project reference ../pkg-a')));
});

test('validatePackageBoundaries fails if package contains forbidden provider/adapter/credential files', () => {
  const errors = createTempWorkspace((dir) => {
    cpSync(
      join(repoRoot, 'tests', 'fixtures', 'gf-001-workspace'),
      join(dir, 'tests', 'fixtures', 'gf-001-workspace'),
      { recursive: true },
    );
    const srcDir = join(dir, 'tests', 'fixtures', 'gf-001-workspace', 'packages', 'pkg-a', 'src');
    writeFileSync(join(srcDir, 'provider.ts'), 'export const provider = {};');
  });
  assert.ok(errors.some((e) => e.includes('forbidden runtime concept file')));
});
