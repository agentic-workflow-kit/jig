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

test('validateActiveRepository passes on the active package contract', () => {
  assert.deepEqual(validateActiveRepository(repoRoot), []);
});

test('rejects evidence writing when it is reachable from the check script', () => {
  const errors = withTempRepo((root) => {
    const path = join(root, 'package.json');
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace('pnpm test"\n  },', 'pnpm test && pnpm evidence:write"\n  },'),
    );
  });
  assert.ok(errors.includes('check script transitively resolves to an evidence-writing command'));
});

test('rejects artifact output when it is reachable from the check script', () => {
  const errors = withTempRepo((root) => {
    const path = join(root, 'package.json');
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace('pnpm test"\n  },', 'pnpm test > artifacts/check.log"\n  },'),
    );
  });
  assert.ok(errors.includes('check script transitively resolves to a command that writes under artifacts/'));
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
  assert.ok(graphErrors.some((error) => error.includes('canonical active workspace task')));
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
    writeFileSync(join(root, 'tests/fixtures/workspace/packages/pkg-a/src/runtime.ts'), 'export {};\n'),
  );
  assert.ok(
    fixtureErrors.some((error) => error.includes('unexpected active path') || error.includes('fixture file set')),
  );
  const missingAnchorErrors = withTempRepo(() => {}, { includeArchive: false });
  assert.ok(missingAnchorErrors.some((error) => error.includes('archive ref or representative recovery path')));
});

test('requires the exact authority kernel, root wiring, and generic evidence surface', () => {
  const missingKernelErrors = withTempRepo((root) => rmSync(join(root, 'packages/authority-kernel/src/index.ts')));
  assert.ok(missingKernelErrors.some((error) => error.includes('required active path is missing')));
  const unlistedSiblingErrors = withTempRepo((root) =>
    writeFileSync(join(root, 'tests/authority-kernel/unlisted-sibling.test.mjs'), 'export {};\n'),
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
  assert.ok(privateErrors.some((error) => error.includes('authority kernel authority-kernel manifest')));
  const dependencyErrors = withTempRepo((root) =>
    writeFileSync(
      join(root, 'packages/authority-kernel/package.json'),
      readFileSync(join(root, 'packages/authority-kernel/package.json'), 'utf8').replace(
        '"@agentic-workflow-kit/jig-codec": "workspace:*"',
        '"@agentic-workflow-kit/jig-codec": "workspace:*", "node:fs": "workspace:*"',
      ),
    ),
  );
  assert.ok(dependencyErrors.some((error) => error.includes('authority kernel authority-kernel manifest')));
  const exportErrors = withTempRepo((root) =>
    writeFileSync(
      join(root, 'packages/authority-kernel/package.json'),
      readFileSync(join(root, 'packages/authority-kernel/package.json'), 'utf8').replace(
        '"exports": "./dist/index.js"',
        '"exports": "./src/index.ts"',
      ),
    ),
  );
  assert.ok(exportErrors.some((error) => error.includes('authority kernel authority-kernel manifest')));
  const rootEvidenceErrors = withTempRepo((root) => {
    const path = join(root, 'package.json');
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace('node scripts/write-evidence.mjs phase-0', 'node scripts/write-evidence.mjs'),
    );
  });
  assert.ok(rootEvidenceErrors.some((error) => error.includes('package.json must exactly preserve')));
  const workflowErrors = withTempRepo((root) => {
    const path = join(root, '.github/workflows/check.yml');
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace('          path: artifacts/\n', '          path: artifacts/evidence.json\n'),
    );
  });
  assert.ok(workflowErrors.some((error) => error.includes('evidence-retention contract')));
});
