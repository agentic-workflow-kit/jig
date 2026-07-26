import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { validateActiveRepository } from './check-active-repository.mjs';

const repoRoot = resolve(import.meta.dirname, '..');
const excluded = new Set(['.git', 'node_modules', '.turbo', 'artifacts', 'dist', '.pnpm-store']);

function copyFilter(source) {
  const rel = relative(repoRoot, source);
  return !rel.split('/').some((part) => excluded.has(part));
}

function withTempRepo(mutate, { includeArchive = true } = {}) {
  const tempDir = mkdtempSync(join(tmpdir(), 'active-repo-test-'));
  let failure;
  let result;
  try {
    cpSync(repoRoot, tempDir, {
      recursive: true,
      filter: copyFilter,
      verbatimSymlinks: true,
    });
    for (const args of [
      ['init', '-q'],
      ['config', 'user.name', 'Test'],
      ['config', 'user.email', 'test@example.invalid'],
      ['config', 'gc.auto', '0'],
      ['config', 'maintenance.auto', 'false'],
      ['add', '.'],
      ['commit', '-q', '-m', 'Initial'],
    ])
      execFileSync('git', args, { cwd: tempDir });
    if (includeArchive)
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
    mutate(tempDir);
    result = validateActiveRepository(tempDir);
  } catch (error) {
    failure = error;
  }
  try {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  } catch (cleanupError) {
    throw failure ? new AggregateError([failure, cleanupError], 'structure test and cleanup failed') : cleanupError;
  }
  if (failure) throw failure;
  return result;
}

function snapshotFiles(paths) {
  return new Map(
    paths.map((path) => [path, existsSync(join(repoRoot, path)) ? readFileSync(join(repoRoot, path)) : null]),
  );
}

function restoreFiles(snapshot) {
  for (const [path, bytes] of snapshot) {
    const absolutePath = join(repoRoot, path);
    if (bytes === null) rmSync(absolutePath, { force: true });
    else writeFileSync(absolutePath, bytes);
  }
}

test('validateActiveRepository passes on the active GF-001/GF-002 contract', () => {
  assert.deepEqual(validateActiveRepository(repoRoot), []);
});

test('rejects root manifest, local Node line, and pnpm safety drift', () => {
  const manifestErrors = withTempRepo((root) =>
    writeFileSync(
      join(root, 'package.json'),
      readFileSync(join(root, 'package.json'), 'utf8').replace('"private": true', '"private": false'),
    ),
  );
  assert.ok(manifestErrors.some((error) => error.includes('package.json must exactly preserve')));
  const nodeErrors = withTempRepo((root) => writeFileSync(join(root, '.nvmrc'), '22\n'));
  assert.ok(nodeErrors.some((error) => error.includes('local Node 26')));
  const pnpmErrors = withTempRepo((root) => writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: []\n'));
  assert.ok(pnpmErrors.some((error) => error.includes('supply-chain safety')));
});

test('rejects active Turbo graph drift and every approved-file symlink substitution', () => {
  const graphErrors = withTempRepo((root) => writeFileSync(join(root, 'turbo.json'), '{}\n'));
  assert.ok(graphErrors.some((error) => error.includes('canonical active GF-001 task')));
  const symlinkErrors = withTempRepo((root) => {
    const config = join(root, 'turbo.json');
    rmSync(config);
    symlinkSync('tsconfig.json', config);
  });
  assert.ok(symlinkErrors.some((error) => error.includes('regular non-symlink')));
  const scriptSymlinkErrors = withTempRepo((root) => {
    const script = join(root, 'scripts', 'dev-setup.sh');
    rmSync(script);
    symlinkSync('worktree-new.sh', script);
  });
  assert.ok(scriptSymlinkErrors.some((error) => error.includes('regular non-symlink')));
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
  const missingAnchorErrors = withTempRepo(() => {}, { includeArchive: false });
  assert.ok(missingAnchorErrors.some((error) => error.includes('archive ref or representative recovery path')));
});

test('requires the exact GF-005 kernel, root wiring, and retained evidence surface', () => {
  const missingKernelErrors = withTempRepo((root) => rmSync(join(root, 'packages/authority-kernel/src/index.ts')));
  assert.ok(missingKernelErrors.some((error) => error.includes('required active path is missing')));
  const unlistedSiblingErrors = withTempRepo((root) =>
    writeFileSync(join(root, 'tests/gf-005/unlisted-sibling.test.mjs'), 'export {};\n'),
  );
  assert.ok(unlistedSiblingErrors.some((error) => error.includes('unexpected active path')));
  const privateErrors = withTempRepo((root) =>
    writeFileSync(
      join(root, 'packages/authority-kernel/package.json'),
      readFileSync(join(root, 'packages/authority-kernel/package.json'), 'utf8').replace(
        '"private": true',
        '"private": false',
      ),
    ),
  );
  assert.ok(privateErrors.some((error) => error.includes('GF-005 authority-kernel manifest')));
  const dependencyErrors = withTempRepo((root) =>
    writeFileSync(
      join(root, 'packages/authority-kernel/package.json'),
      readFileSync(join(root, 'packages/authority-kernel/package.json'), 'utf8').replace(
        '"@agentic-workflow-kit/jig-codec": "workspace:*"',
        '"@agentic-workflow-kit/jig-codec": "workspace:*", "node:fs": "workspace:*"',
      ),
    ),
  );
  assert.ok(dependencyErrors.some((error) => error.includes('GF-005 authority-kernel manifest')));
  const exportErrors = withTempRepo((root) =>
    writeFileSync(
      join(root, 'packages/authority-kernel/package.json'),
      readFileSync(join(root, 'packages/authority-kernel/package.json'), 'utf8').replace(
        '"exports": "./dist/index.js"',
        '"exports": "./src/index.ts"',
      ),
    ),
  );
  assert.ok(exportErrors.some((error) => error.includes('GF-005 authority-kernel manifest')));
  const rootTestErrors = withTempRepo((root) =>
    writeFileSync(
      join(root, 'package.json'),
      readFileSync(join(root, 'package.json'), 'utf8').replace(' && node scripts/run-gf-005-tests.mjs', ''),
    ),
  );
  assert.ok(rootTestErrors.some((error) => error.includes('package.json must exactly preserve')));
  const rootEvidenceErrors = withTempRepo((root) =>
    writeFileSync(
      join(root, 'package.json'),
      readFileSync(join(root, 'package.json'), 'utf8').replace(' && node scripts/finalize-gf-005-evidence.mjs', ''),
    ),
  );
  assert.ok(rootEvidenceErrors.some((error) => error.includes('package.json must exactly preserve')));
  const workflowErrors = withTempRepo((root) => {
    const path = join(root, '.github/workflows/check.yml');
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace('            artifacts/gf-005/finalization-receipt.json\n', ''),
    );
  });
  assert.ok(workflowErrors.some((error) => error.includes('GF-005 evidence retention')));
});

test('requires GF-002 evidence finalization after every other Phase 0 evidence producer', () => {
  const expectedEvidenceWrite =
    'node scripts/run-gf-001-tests.mjs && node scripts/write-gf-001-evidence.mjs && node scripts/finalize-gf-003-evidence.mjs && node scripts/finalize-gf-004-evidence.mjs && node scripts/finalize-gf-005-evidence.mjs && node scripts/finalize-gf-002-evidence.mjs';
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts['evidence:write'], expectedEvidenceWrite);

  const orderingErrors = withTempRepo((root) => {
    const path = join(root, 'package.json');
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace(
        'node scripts/finalize-gf-005-evidence.mjs && node scripts/finalize-gf-002-evidence.mjs',
        'node scripts/finalize-gf-002-evidence.mjs && node scripts/finalize-gf-005-evidence.mjs',
      ),
    );
  });
  assert.ok(orderingErrors.some((error) => error.includes('package.json must exactly preserve')));

  const runnerErrors = withTempRepo((root) => {
    const path = join(root, 'package.json');
    writeFileSync(path, readFileSync(path, 'utf8').replace('node scripts/run-gf-001-tests.mjs && ', ''));
  });
  assert.ok(runnerErrors.some((error) => error.includes('package.json must exactly preserve')));
});

test('nested verification runs every artifact-producing story runner without rewriting retained bytes', () => {
  const paths = [
    'artifacts/gf-001/evidence.json',
    'artifacts/gf-001/fixture-evidence.json',
    'artifacts/gf-001/fixture-results.json',
    'artifacts/gf-002/results.json',
    'artifacts/gf-003/results.json',
  ];
  const original = snapshotFiles(paths);
  const { NODE_TEST_CONTEXT: _testContext, ...environment } = process.env;
  try {
    for (const path of paths) {
      const absolutePath = join(repoRoot, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, `nested-verification-sentinel:${path}\n`);
    }
    const baseline = new Map(paths.map((path) => [path, readFileSync(join(repoRoot, path))]));
    const result = spawnSync(process.execPath, ['scripts/run-phase-0-verification-tests.mjs'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: environment,
    });
    assert.equal(result.status, 0, `Phase 0 verification runner failed: ${result.stderr}`);
    for (const [path, bytes] of baseline) assert.deepEqual(readFileSync(join(repoRoot, path)), bytes, path);
  } finally {
    restoreFiles(original);
  }
});

test('requires every embedded full-check finalizer to enable nested verification', () => {
  const errors = withTempRepo((root) => {
    const path = join(root, 'scripts', 'finalize-gf-003-evidence.mjs');
    writeFileSync(path, readFileSync(path, 'utf8').replace('JIG_NESTED_VERIFICATION', 'NESTED_VERIFICATION_REMOVED'));
  });
  assert.ok(errors.some((error) => error.includes('embedded full-check finalizer must set JIG_NESTED_VERIFICATION')));
});

test('requires check to use the non-writing Phase 0 verification runner', () => {
  const errors = withTempRepo((root) => {
    const path = join(root, 'package.json');
    writeFileSync(path, readFileSync(path, 'utf8').replace(' && pnpm verification:test', ' && pnpm test'));
  });
  assert.ok(errors.some((error) => error.includes('package.json must exactly preserve')));
});
