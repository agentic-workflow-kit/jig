import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { validatePackageBoundaries } from './check-package-boundaries.mjs';

const repoRoot = resolve(import.meta.dirname, '..');

function withFixture(mutate) {
  const root = mkdtempSync(join(tmpdir(), 'gf001-boundary-test-'));
  let failure;
  let result;
  try {
    cpSync(join(repoRoot, 'tests/fixtures/gf-001-workspace'), join(root, 'tests/fixtures/gf-001-workspace'), {
      recursive: true,
      verbatimSymlinks: true,
    });
    mutate(root);
    result = validatePackageBoundaries(root);
  } catch (error) {
    failure = error;
  }
  try {
    rmSync(root, { recursive: true, maxRetries: 5, retryDelay: 50 });
  } catch (cleanupError) {
    throw failure ? new AggregateError([failure, cleanupError], 'boundary test and cleanup failed') : cleanupError;
  }
  if (failure) throw failure;
  return result;
}

test('validatePackageBoundaries passes on the exact approved fixture', () => {
  assert.deepEqual(validatePackageBoundaries(repoRoot), []);
});

test('rejects product source roots', () => {
  const errors = withFixture((root) => mkdirSync(join(root, 'packages'), { recursive: true }));
  assert.ok(errors.some((error) => error.includes('root packages/')));
});

test('rejects runtime-capable package entrypoints and lifecycle scripts', () => {
  const errors = withFixture((root) => {
    const manifest = join(root, 'tests/fixtures/gf-001-workspace/packages/pkg-a/package.json');
    writeFileSync(
      manifest,
      '{"name":"@gf-001-fixture/pkg-a","private":true,"bin":"cli.mjs","scripts":{"start":"node src/index.ts"}}\n',
    );
  });
  assert.ok(
    errors.some((error) => error.includes('bounded content') || error.includes('runtime or publishing surface')),
  );
});

test('rejects a source implementation hidden behind an allowed index path', () => {
  const errors = withFixture((root) =>
    writeFileSync(
      join(root, 'tests/fixtures/gf-001-workspace/packages/pkg-a/src/index.ts'),
      'export const provider = {};\n',
    ),
  );
  assert.ok(errors.some((error) => error.includes('bounded content')));
});

test('rejects tracked-file substitutions with symlinks', () => {
  const errors = withFixture((root) => {
    const target = join(root, 'tests/fixtures/gf-001-workspace/packages/pkg-c/src/index.ts');
    rmSync(target);
    symlinkSync('../../pkg-a/src/index.ts', target);
  });
  assert.ok(errors.some((error) => error.includes('regular non-symlink file')));
});

test('rejects fixture workspace membership and solution-reference graph drift', () => {
  const errors = withFixture((root) =>
    writeFileSync(join(root, 'tests/fixtures/gf-001-workspace/tsconfig.json'), '{"files":[],"references":[]}\n'),
  );
  assert.ok(
    errors.some((error) => error.includes('bounded content') || error.includes('solution TypeScript references')),
  );
});

test('rejects forbidden dependency direction and non-workspace binding', () => {
  const errors = withFixture((root) =>
    writeFileSync(
      join(root, 'tests/fixtures/gf-001-workspace/packages/pkg-b/package.json'),
      '{"name":"@gf-001-fixture/pkg-b","private":true,"dependencies":{"@gf-001-fixture/pkg-a":"^1.0.0"}}\n',
    ),
  );
  assert.ok(errors.some((error) => error.includes('bounded content')));
});
