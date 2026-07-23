import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';
import { validateActiveRepository } from './check-active-repository.mjs';

const repoRoot = resolve(import.meta.dirname, '..');
const excluded = new Set(['.git', 'node_modules', '.turbo', 'artifacts', 'dist', '.pnpm-store']);

function copyFilter(source) {
  const rel = relative(repoRoot, source);
  return !rel.split('/').some((part) => excluded.has(part));
}

function withTempRepo(mutate) {
  const tempDir = mkdtempSync(join(tmpdir(), 'active-repo-test-'));
  let failure;
  let result;
  try {
    cpSync(repoRoot, tempDir, { recursive: true, filter: copyFilter, verbatimSymlinks: true });
    for (const args of [
      ['init', '-q'],
      ['config', 'user.name', 'Test'],
      ['config', 'user.email', 'test@example.invalid'],
      ['add', '.'],
      ['commit', '-q', '-m', 'Initial'],
      [
        'fetch',
        '-q',
        repoRoot,
        'refs/tags/archive/jig-v0-pre-greenfield-2026-07-18:refs/tags/archive/jig-v0-pre-greenfield-2026-07-18',
      ],
    ])
      execFileSync('git', args, { cwd: tempDir });
    mutate(tempDir);
    result = validateActiveRepository(tempDir);
  } catch (error) {
    failure = error;
  }
  try {
    rmSync(tempDir, { recursive: true, maxRetries: 5, retryDelay: 50 });
  } catch (cleanupError) {
    throw failure ? new AggregateError([failure, cleanupError], 'structure test and cleanup failed') : cleanupError;
  }
  if (failure) throw failure;
  return result;
}

test('validateActiveRepository passes on the active GF-001 contract', () => {
  assert.deepEqual(validateActiveRepository(repoRoot), []);
});

test('rejects root manifest, local Node line, and pnpm safety drift', () => {
  const manifestErrors = withTempRepo((root) =>
    writeFileSync(
      join(root, 'package.json'),
      readFileSync(join(root, 'package.json'), 'utf8').replace('"private": true', '"private": false'),
    ),
  );
  assert.ok(manifestErrors.some((error) => error.includes('activated GF-001 manifest')));
  const nodeErrors = withTempRepo((root) => writeFileSync(join(root, '.nvmrc'), '22\n'));
  assert.ok(nodeErrors.some((error) => error.includes('local Node 26')));
  const pnpmErrors = withTempRepo((root) => writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: []\n'));
  assert.ok(pnpmErrors.some((error) => error.includes('supply-chain safety')));
});

test('rejects active Turbo graph drift and exact configuration symlinks', () => {
  const graphErrors = withTempRepo((root) => writeFileSync(join(root, 'turbo.json'), '{}\n'));
  assert.ok(graphErrors.some((error) => error.includes('canonical active GF-001 task')));
  const symlinkErrors = withTempRepo((root) => {
    const config = join(root, 'turbo.json');
    rmSync(config);
    symlinkSync('tsconfig.json', config);
  });
  assert.ok(symlinkErrors.some((error) => error.includes('regular non-symlink')));
});

test('rejects mutable Actions, credential persistence, and extra workflow behavior', () => {
  const mutableErrors = withTempRepo((root) => {
    const path = join(root, '.github/workflows/check.yml');
    writeFileSync(path, readFileSync(path, 'utf8').replace(/actions\/checkout@[0-9a-f]{40}/, 'actions/checkout@v4'));
  });
  assert.ok(mutableErrors.some((error) => error.includes('least-privilege')));
  const credentialErrors = withTempRepo((root) => {
    const path = join(root, '.github/workflows/check.yml');
    writeFileSync(path, readFileSync(path, 'utf8').replace('persist-credentials: false', 'persist-credentials: true'));
  });
  assert.ok(credentialErrors.some((error) => error.includes('least-privilege')));
  const extraErrors = withTempRepo((root) => {
    const path = join(root, '.github/workflows/check.yml');
    writeFileSync(path, `${readFileSync(path, 'utf8')}\n      - name: bypass\n        run: true\n`);
  });
  assert.ok(extraErrors.some((error) => error.includes('least-privilege')));
});

test('rejects unlisted fixture files and an absent archive anchor', () => {
  const fixtureErrors = withTempRepo((root) =>
    writeFileSync(join(root, 'tests/fixtures/gf-001-workspace/packages/pkg-a/src/runtime.ts'), 'export {};\n'),
  );
  assert.ok(
    fixtureErrors.some((error) => error.includes('unexpected active path') || error.includes('fixture file set')),
  );
  const missingAnchor = mkdtempSync(join(tmpdir(), 'missing-archive-test-'));
  let failure;
  try {
    cpSync(repoRoot, missingAnchor, { recursive: true, filter: copyFilter, verbatimSymlinks: true });
    for (const args of [
      ['init', '-q'],
      ['config', 'user.name', 'Test'],
      ['config', 'user.email', 'test@example.invalid'],
      ['add', '.'],
      ['commit', '-q', '-m', 'Initial'],
    ])
      execFileSync('git', args, { cwd: missingAnchor });
    const errors = validateActiveRepository(missingAnchor);
    assert.ok(errors.some((error) => error.includes('archive ref or representative recovery path')));
  } catch (error) {
    failure = error;
  }
  try {
    rmSync(missingAnchor, { recursive: true, maxRetries: 5, retryDelay: 50 });
  } catch (cleanupError) {
    throw failure ? new AggregateError([failure, cleanupError], 'archive mutation and cleanup failed') : cleanupError;
  }
  if (failure) throw failure;
});
