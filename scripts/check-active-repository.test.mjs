import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { validateActiveRepository } from './check-active-repository.mjs';

const repoRoot = resolve(import.meta.dirname, '..');

test('validateActiveRepository passes on current active repository', () => {
  const errors = validateActiveRepository(repoRoot);
  assert.equal(errors.length, 0, `Expected 0 structure check errors, got: ${errors.join(', ')}`);
});

test('validateActiveRepository fails when an unlisted file is added to test fixture workspace', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'active-repo-test-'));
  try {
    // Copy active repo into tempDir
    cpSync(repoRoot, tempDir, { recursive: true });
    // Initialize git repo in tempDir and create archive ref
    execFileSync('git', ['init'], { cwd: tempDir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tempDir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempDir });
    execFileSync('git', ['add', '.'], { cwd: tempDir });
    execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: tempDir });

    // Add forbidden runtime file in test fixture
    const unexpectedFile = join(
      tempDir,
      'tests',
      'fixtures',
      'gf-001-workspace',
      'packages',
      'pkg-a',
      'src',
      'provider.ts',
    );
    writeFileSync(unexpectedFile, 'export const p = 1;\n');
    execFileSync('git', ['add', unexpectedFile], { cwd: tempDir });

    const errors = validateActiveRepository(tempDir);
    assert.ok(
      errors.some((e) => e.includes('unexpected active path')),
      `Expected error for unexpected active path, got: ${errors.join(', ')}`,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('validateActiveRepository fails when check.yml uses mutable action tags', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'active-repo-test-'));
  try {
    cpSync(repoRoot, tempDir, { recursive: true });
    const workflowPath = join(tempDir, '.github', 'workflows', 'check.yml');
    writeFileSync(
      workflowPath,
      'name: check\non:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v7\n',
    );

    const errors = validateActiveRepository(tempDir);
    assert.ok(
      errors.some((e) => e.includes('exact immutable SHA')),
      `Expected error for mutable action tag, got: ${errors.join(', ')}`,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
