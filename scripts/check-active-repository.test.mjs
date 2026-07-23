import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { validateActiveRepository } from './check-active-repository.mjs';

const repoRoot = resolve(import.meta.dirname, '..');

function isNotGitDir(src) {
  const rel = src.slice(repoRoot.length);
  return rel !== '/.git' && !rel.startsWith('/.git/');
}

function withTempRepo(run) {
  const tempDir = mkdtempSync(join(tmpdir(), 'active-repo-test-'));
  try {
    cpSync(repoRoot, tempDir, { recursive: true, filter: isNotGitDir });
    execFileSync('git', ['init', '-q'], { cwd: tempDir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tempDir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempDir });
    execFileSync('git', ['add', '.'], { cwd: tempDir });
    execFileSync('git', ['commit', '-q', '-m', 'Initial commit'], { cwd: tempDir });
    try {
      execFileSync(
        'git',
        [
          'fetch',
          '-q',
          repoRoot,
          'refs/tags/archive/jig-v0-pre-greenfield-2026-07-18:refs/tags/archive/jig-v0-pre-greenfield-2026-07-18',
        ],
        { cwd: tempDir },
      );
    } catch {}
    run(tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

test('validateActiveRepository passes on current active repository', () => {
  const errors = validateActiveRepository(repoRoot);
  assert.equal(errors.length, 0, `Expected 0 structure check errors, got: ${errors.join(', ')}`);
});

test('validateActiveRepository fails when an unlisted file is added to test fixture workspace', () => {
  withTempRepo((tempDir) => {
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
  });
});

test('validateActiveRepository fails when check.yml uses mutable action tags', () => {
  withTempRepo((tempDir) => {
    const workflowPath = join(tempDir, '.github', 'workflows', 'check.yml');
    writeFileSync(
      workflowPath,
      'name: check\non:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v7\n',
    );

    const errors = validateActiveRepository(tempDir);
    assert.ok(
      errors.some((e) => e.includes('exact immutable SHA') || e.includes('strictly match')),
      `Expected error for mutable action tag, got: ${errors.join(', ')}`,
    );
  });
});

test('validateActiveRepository fails when check.yml contains an extra job', () => {
  withTempRepo((tempDir) => {
    const workflowPath = join(tempDir, '.github', 'workflows', 'check.yml');
    const content = readFileSync(workflowPath, 'utf8');
    writeFileSync(
      workflowPath,
      `${content}\n  extra:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo extra\n`,
    );

    const errors = validateActiveRepository(tempDir);
    assert.ok(
      errors.some((e) => e.includes('strictly match the approved GF-001 workflow contract')),
      `Expected error for extra job in check.yml, got: ${errors.join(', ')}`,
    );
  });
});

test('validateActiveRepository fails when check.yml contains an extra step', () => {
  withTempRepo((tempDir) => {
    const workflowPath = join(tempDir, '.github', 'workflows', 'check.yml');
    const content = readFileSync(workflowPath, 'utf8');
    writeFileSync(
      workflowPath,
      content.replace(
        '- name: check\n        run: pnpm check',
        '- name: check\n        run: pnpm check\n\n      - name: Extra step\n        run: echo extra',
      ),
    );

    const errors = validateActiveRepository(tempDir);
    assert.ok(
      errors.some((e) => e.includes('strictly match the approved GF-001 workflow contract')),
      `Expected error for extra step in check.yml, got: ${errors.join(', ')}`,
    );
  });
});

test('validateActiveRepository fails when check.yml action inputs are changed', () => {
  withTempRepo((tempDir) => {
    const workflowPath = join(tempDir, '.github', 'workflows', 'check.yml');
    const content = readFileSync(workflowPath, 'utf8');
    writeFileSync(workflowPath, content.replace('node-version: 22.13.0', 'node-version: 18.0.0'));

    const errors = validateActiveRepository(tempDir);
    assert.ok(
      errors.some((e) => e.includes('strictly match the approved GF-001 workflow contract')),
      `Expected error for changed action input in check.yml, got: ${errors.join(', ')}`,
    );
  });
});

test('validateActiveRepository fails when check.yml runner or triggers are changed', () => {
  withTempRepo((tempDir) => {
    const workflowPath = join(tempDir, '.github', 'workflows', 'check.yml');
    const content = readFileSync(workflowPath, 'utf8');
    writeFileSync(workflowPath, content.replace('runs-on: ubuntu-latest', 'runs-on: macos-latest'));

    const errors = validateActiveRepository(tempDir);
    assert.ok(
      errors.some((e) => e.includes('strictly match the approved GF-001 workflow contract')),
      `Expected error for changed runner in check.yml, got: ${errors.join(', ')}`,
    );
  });
});
