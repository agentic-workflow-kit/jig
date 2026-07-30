import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { validatePackageBoundaries } from '../bin/check-package-boundaries.mjs';

const repoRoot = resolve(import.meta.dirname, '../../..');

function withPackages(mutate) {
  const root = mkdtempSync(join(tmpdir(), 'package-boundary-test-'));
  try {
    cpSync(join(repoRoot, 'packages'), join(root, 'packages'), { recursive: true });
    mutate(root);
    return validatePackageBoundaries(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function editManifest(root, packageName, edit) {
  const path = join(root, 'packages', packageName, 'package.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  edit(manifest);
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

test('accepts the current private package boundaries', () => {
  assert.deepEqual(validatePackageBoundaries(repoRoot), []);
});

test('ignores generated TypeScript build metadata', () => {
  const errors = withPackages((root) =>
    writeFileSync(join(root, 'packages', 'codec', 'tsconfig.tsbuildinfo'), 'generated\n'),
  );
  assert.deepEqual(errors, []);
});

test('requires every compiled package to own the standard validation tasks', () => {
  const errors = withPackages((root) =>
    editManifest(root, 'codec', (manifest) => {
      delete manifest.scripts.build;
      delete manifest.scripts.lint;
      delete manifest.scripts.test;
    }),
  );
  assert.ok(errors.some((error) => error.includes('must declare build, lint, and test scripts')));
});

test('rejects public, runnable, and externally dependent packages', () => {
  const errors = withPackages((root) =>
    editManifest(root, 'codec', (manifest) => {
      manifest.private = false;
      manifest.bin = './dist/cli.js';
      manifest.scripts.start = 'node dist/index.js';
      manifest.dependencies = { example: '1.0.0' };
    }),
  );
  assert.ok(errors.some((error) => error.includes('must remain private')));
  assert.ok(errors.some((error) => error.includes('runtime or publishing entrypoint')));
  assert.ok(errors.some((error) => error.includes('start or package lifecycle script')));
  assert.ok(errors.some((error) => error.includes('production dependencies must be private workspace packages')));
});

test('rejects forbidden imports and ambient runtime capabilities', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'authority-kernel', 'src', 'index.ts'),
      "import { readFileSync } from 'node:fs';\nexport const run = () => fetch(String(readFileSync));\n",
    ),
  );
  assert.ok(errors.some((error) => error.includes('imports a non-workspace capability')));
  assert.ok(errors.some((error) => error.includes('forbidden ambient runtime capability')));
});

test('rejects forbidden dependency direction in an established package', () => {
  const errors = withPackages((root) =>
    editManifest(root, 'authority-kernel', (manifest) => {
      manifest.dependencies['@agentic-workflow-kit/jig-runtime-contracts'] = 'workspace:*';
    }),
  );
  assert.ok(errors.some((error) => error.includes('forbidden dependency direction')));
});

test('rejects a Jig package without an explicit dependency policy', () => {
  const errors = withPackages((root) =>
    editManifest(root, 'codec', (manifest) => {
      manifest.name = '@agentic-workflow-kit/jig-codecc';
    }),
  );
  assert.ok(errors.some((error) => error.includes('has no dependency-direction policy')));
});

test('allows package-local relative imports', () => {
  const errors = withPackages((root) => {
    writeFileSync(join(root, 'packages', 'codec', 'src', 'helper.ts'), 'export const helper = 1;\n');
    writeFileSync(join(root, 'packages', 'codec', 'src', 'index.ts'), "export { helper } from './helper.js';\n");
  });
  assert.deepEqual(errors, []);
});
