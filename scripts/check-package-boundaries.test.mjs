import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { validatePackageBoundaries } from './check-package-boundaries.mjs';

const repoRoot = resolve(import.meta.dirname, '..');

function withFixture(mutate) {
  const root = mkdtempSync(join(tmpdir(), 'package-boundary-test-'));
  let failure;
  let result;
  try {
    cpSync(join(repoRoot, 'tests/fixtures/workspace'), join(root, 'tests/fixtures/workspace'), {
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

function withCodec(mutate) {
  return withFixture((root) => {
    const codecRoot = join(root, 'packages', 'codec');
    cpSync(join(repoRoot, 'packages', 'codec'), codecRoot, { recursive: true, verbatimSymlinks: true });
    rmSync(join(codecRoot, 'dist'), { recursive: true, force: true });
    rmSync(join(codecRoot, 'tsconfig.tsbuildinfo'), { force: true });
    mutate(root);
  });
}

function withPurePackages(mutate) {
  return withFixture((root) => {
    for (const packageName of ['codec', 'runtime-contracts', 'conformance', 'authority-kernel']) {
      const destination = join(root, 'packages', packageName);
      cpSync(join(repoRoot, 'packages', packageName), destination, { recursive: true, verbatimSymlinks: true });
      rmSync(join(destination, 'dist'), { recursive: true, force: true });
      rmSync(join(destination, 'tsconfig.tsbuildinfo'), { force: true });
    }
    mutate(root);
  });
}

test('validatePackageBoundaries passes on the exact approved fixture', () => {
  assert.deepEqual(validatePackageBoundaries(repoRoot), []);
});

test('rejects product source roots and extra runtime packages', () => {
  const sourceErrors = withFixture((root) => mkdirSync(join(root, 'src'), { recursive: true }));
  assert.ok(sourceErrors.some((error) => error.includes('root src/')));
  const packageErrors = withFixture((root) => {
    mkdirSync(join(root, 'packages', 'runtime'), { recursive: true });
    writeFileSync(join(root, 'packages', 'runtime', 'package.json'), '{"name":"runtime"}\n');
  });
  assert.ok(
    packageErrors.some((error) =>
      error.includes('pure codec, private runtime-contracts, private conformance, and private authority-kernel'),
    ),
  );
});

test('rejects codec dependencies and non-declared imports', () => {
  const dependencyErrors = withCodec((root) =>
    writeFileSync(
      join(root, 'packages', 'codec', 'package.json'),
      '{"name":"@agentic-workflow-kit/jig-codec","private":true,"dependencies":{"example":"1.0.0"}}\n',
    ),
  );
  assert.ok(dependencyErrors.some((error) => error.includes('dependency-free pure boundary')));
  const importErrors = withCodec((root) =>
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      "import { readFileSync } from 'node:fs';\nexport const codec = readFileSync;\n",
    ),
  );
  assert.ok(importErrors.some((error) => error.includes('declared pure package dependencies')));
});

test('rejects effectful imports and prohibited exported surfaces without scanning comments or strings', () => {
  const importErrors = withPurePackages((root) =>
    writeFileSync(
      join(root, 'packages', 'conformance', 'src', 'index.ts'),
      "import { readFileSync } from 'node:fs';\nexport const conformance = readFileSync;\n",
    ),
  );
  assert.ok(importErrors.some((error) => error.includes('conformance must import only')));
  const reexportErrors = withPurePackages((root) =>
    writeFileSync(
      join(root, 'packages', 'conformance', 'src', 'index.ts'),
      `${readFileSync(join(root, 'packages', 'conformance', 'src', 'index.ts'), 'utf8')}\nexport { readFileSync } from 'node:fs';\n`,
    ),
  );
  assert.ok(reexportErrors.some((error) => error.includes('conformance must import only')));
  const dynamicImportErrors = withPurePackages((root) =>
    writeFileSync(
      join(root, 'packages', 'conformance', 'src', 'index.ts'),
      `${readFileSync(join(root, 'packages', 'conformance', 'src', 'index.ts'), 'utf8')}\nexport const load = () => import('node:fs');\n`,
    ),
  );
  assert.ok(dynamicImportErrors.some((error) => error.includes('conformance must import only')));
  const exportErrors = withPurePackages((root) =>
    writeFileSync(
      join(root, 'packages', 'authority-kernel', 'src', 'index.ts'),
      "import { parseIdentity } from '@agentic-workflow-kit/jig-codec';\n// provider and dispatch appear only in this comment.\nexport const dispatchAdapter = parseIdentity;\n",
    ),
  );
  assert.ok(
    exportErrors.some((error) => error.includes('authority-kernel must not expose a prohibited capability surface')),
  );
  const inertErrors = withPurePackages((root) =>
    writeFileSync(
      join(root, 'packages', 'authority-kernel', 'src', 'index.ts'),
      "import { parseIdentity } from '@agentic-workflow-kit/jig-codec';\nconst note = 'provider dispatch adapter credential';\nexport const kernel = parseIdentity;\n",
    ),
  );
  assert.equal(
    inertErrors.some((error) => error.includes('must not expose a prohibited capability surface')),
    false,
  );
});

test('rejects unbound prohibited ambient capability reads without rejecting local bindings', () => {
  const ambientErrors = withPurePackages((root) =>
    writeFileSync(
      join(root, 'packages', 'authority-kernel', 'src', 'index.ts'),
      `${readFileSync(join(root, 'packages', 'authority-kernel', 'src', 'index.ts'), 'utf8')}\nexport const observedAt = Date.now();\nexport const hostProcess = globalThis.process;\n`,
    ),
  );
  assert.ok(
    ambientErrors.some((error) => error.includes('authority-kernel must not read prohibited ambient capability: Date')),
  );
  assert.ok(
    ambientErrors.some((error) =>
      error.includes('authority-kernel must not read prohibited ambient capability: globalThis'),
    ),
  );

  const locallyBoundErrors = withPurePackages((root) =>
    writeFileSync(
      join(root, 'packages', 'authority-kernel', 'src', 'index.ts'),
      "import { parseIdentity } from '@agentic-workflow-kit/jig-codec';\nconst Date = { now: () => 0 };\nconst globalThis = { process: null };\nexport const observedAt = Date.now();\nexport const hostProcess = globalThis.process;\nexport const kernel = parseIdentity;\n",
    ),
  );
  assert.equal(
    locallyBoundErrors.some((error) => error.includes('must not read prohibited ambient capability')),
    false,
  );
});

test('fails closed when a pure package source entry point is missing', () => {
  const errors = withPurePackages((root) => rmSync(join(root, 'packages', 'authority-kernel', 'src', 'index.ts')));
  assert.ok(errors.some((error) => error.includes('authority-kernel source entry point is missing')));
});

test('rejects runtime-capable package entrypoints and lifecycle scripts', () => {
  const errors = withFixture((root) => {
    const manifest = join(root, 'tests/fixtures/workspace/packages/pkg-a/package.json');
    writeFileSync(
      manifest,
      '{"name":"@workspace-fixture/pkg-a","private":true,"bin":"cli.mjs","scripts":{"start":"node src/index.ts"}}\n',
    );
  });
  assert.ok(
    errors.some((error) => error.includes('bounded content') || error.includes('runtime or publishing surface')),
  );
});

test('rejects a source implementation hidden behind an allowed index path', () => {
  const errors = withFixture((root) =>
    writeFileSync(join(root, 'tests/fixtures/workspace/packages/pkg-a/src/index.ts'), 'export const provider = {};\n'),
  );
  assert.ok(errors.some((error) => error.includes('bounded content')));
});

test('rejects tracked-file substitutions with symlinks', () => {
  const errors = withFixture((root) => {
    const target = join(root, 'tests/fixtures/workspace/packages/pkg-c/src/index.ts');
    rmSync(target);
    symlinkSync('../../pkg-a/src/index.ts', target);
  });
  assert.ok(errors.some((error) => error.includes('regular non-symlink file')));
});

test('rejects fixture workspace membership and solution-reference graph drift', () => {
  const errors = withFixture((root) =>
    writeFileSync(join(root, 'tests/fixtures/workspace/tsconfig.json'), '{"files":[],"references":[]}\n'),
  );
  assert.ok(
    errors.some((error) => error.includes('bounded content') || error.includes('solution TypeScript references')),
  );
});

test('rejects even a lockfile-only fixture dependency drift', () => {
  const errors = withFixture((root) =>
    writeFileSync(
      join(root, 'tests/fixtures/workspace/pnpm-lock.yaml'),
      "lockfileVersion: '9.0'\n\nimporters:\n\n  .: {}\n",
    ),
  );
  assert.ok(errors.some((error) => error.includes('fixture file set') || error.includes('bounded content')));
});

test('rejects forbidden dependency direction and non-workspace binding', () => {
  const errors = withFixture((root) =>
    writeFileSync(
      join(root, 'tests/fixtures/workspace/packages/pkg-b/package.json'),
      '{"name":"@workspace-fixture/pkg-b","private":true,"dependencies":{"@workspace-fixture/pkg-a":"^1.0.0"}}\n',
    ),
  );
  assert.ok(errors.some((error) => error.includes('bounded content')));
});
