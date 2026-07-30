import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { validateActiveRepository } from '../bin/check-active-repository.mjs';

const repoRoot = resolve(import.meta.dirname, '../../..');
const requiredFiles = ['package.json', 'pnpm-workspace.yaml', 'turbo.json', '.github/workflows/check.yml'];

function withRepository(mutate) {
  const root = mkdtempSync(join(tmpdir(), 'repository-structure-test-'));
  try {
    for (const path of requiredFiles) {
      mkdirSync(join(root, path, '..'), { recursive: true });
      cpSync(join(repoRoot, path), join(root, path));
    }
    mutate(root);
    return validateActiveRepository(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('accepts the active repository structure', () => {
  assert.deepEqual(validateActiveRepository(repoRoot), []);
});

test('allows benign repository files outside the active runtime surface', () => {
  const errors = withRepository((root) => writeFileSync(join(root, 'NOTES.md'), '# Local notes\n'));
  assert.deepEqual(errors, []);
});

test('requires product packages in the actual workspace package list', () => {
  const errors = withRepository((root) => {
    const workspacePath = join(root, 'pnpm-workspace.yaml');
    writeFileSync(workspacePath, readFileSync(workspacePath, 'utf8').replace('  - "packages/*"', '  # packages/*'));
  });
  assert.ok(errors.includes('pnpm workspace must include packages/*'));
});

test('rejects malformed required configuration and forbidden root product surfaces', () => {
  const malformed = withRepository((root) => writeFileSync(join(root, 'turbo.json'), '{\n'));
  assert.ok(malformed.includes('required repository JSON is malformed: turbo.json'));

  const forbidden = withRepository((root) => mkdirSync(join(root, 'src'), { recursive: true }));
  assert.ok(forbidden.includes('forbidden active root surface exists: src'));
});

test('rejects unsafe CI and a mutable root package boundary', () => {
  const errors = withRepository((root) => {
    const workflowPath = join(root, '.github/workflows/check.yml');
    writeFileSync(
      workflowPath,
      readFileSync(workflowPath, 'utf8')
        .replace('persist-credentials: false', 'persist-credentials: true')
        .replace(/actions\/checkout@[a-f0-9]{40}/, 'actions/checkout@v4'),
    );
    const manifestPath = join(root, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.private = false;
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
  });
  assert.ok(errors.includes('root package must remain private'));
  assert.ok(errors.includes('CI checkout must disable credential persistence'));
  assert.ok(errors.some((error) => error.includes('CI action must use an immutable commit')));
});
