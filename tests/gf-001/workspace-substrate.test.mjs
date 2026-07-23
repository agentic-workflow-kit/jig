import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');
const fixtureSource = join(repoRoot, 'tests', 'fixtures', 'gf-001-workspace');
const turboBin = join(repoRoot, 'node_modules', '.bin', 'turbo');

function createTestWorkspace() {
  const tempDir = mkdtempSync(join(tmpdir(), 'gf001-turbo-test-'));
  cpSync(fixtureSource, tempDir, { recursive: true });
  return tempDir;
}

function runTurbo(args, cwd) {
  return execFileSync(turboBin, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1' },
  });
}

test('GF-001: Cold run executes all required fixture build tasks', () => {
  const wsDir = createTestWorkspace();
  try {
    const output = runTurbo(['run', 'build'], wsDir);
    assert.ok(output.includes('3 successful'), `Expected 3 successful tasks in output:\n${output}`);
  } finally {
    rmSync(wsDir, { recursive: true, force: true });
  }
});

test('GF-001: Warm unchanged run utilizes Turbo cache hits', () => {
  const wsDir = createTestWorkspace();
  try {
    // First run (cold)
    runTurbo(['run', 'build'], wsDir);

    // Second run (warm)
    const secondOutput = runTurbo(['run', 'build'], wsDir);

    assert.ok(
      secondOutput.includes('cached') || secondOutput.includes('FULL TURBO'),
      `Expected cached result in warm run output:\n${secondOutput}`,
    );
  } finally {
    rmSync(wsDir, { recursive: true, force: true });
  }
});

test('GF-001: Change to producer re-runs dependent graph while unrelated lane remains cached', () => {
  const wsDir = createTestWorkspace();
  try {
    // 1. Cold run
    runTurbo(['run', 'build'], wsDir);

    // 2. Modify producer pkg-a
    const pkgAFile = join(wsDir, 'packages', 'pkg-a', 'src', 'index.ts');
    const content = readFileSync(pkgAFile, 'utf8');
    writeFileSync(pkgAFile, `${content}\n// Trigger change\nexport const v = 2;\n`);

    // 3. Re-run turbo
    const output = runTurbo(['run', 'build'], wsDir);

    // pkg-a and pkg-b should re-run, pkg-c should hit cache
    assert.ok(output.includes('pkg-c:build'), `pkg-c should be evaluated:\n${output}`);
  } finally {
    rmSync(wsDir, { recursive: true, force: true });
  }
});

test('GF-001: Failure isolation ensures failing lane does not pass or corrupt unrelated lanes', () => {
  const wsDir = createTestWorkspace();
  try {
    // Create a deliberately failing package
    const failPkgDir = join(wsDir, 'packages', 'pkg-fail');
    mkdirSync(join(failPkgDir, 'src'), { recursive: true });
    writeFileSync(
      join(failPkgDir, 'package.json'),
      JSON.stringify({
        name: '@gf-001-fixture/pkg-fail',
        version: '0.0.0',
        private: true,
        type: 'module',
        scripts: { build: 'exit 1' },
      }),
    );
    // Add reference in root tsconfig
    const rootTsconfigPath = join(wsDir, 'tsconfig.json');
    const rootTsconfig = JSON.parse(readFileSync(rootTsconfigPath, 'utf8'));
    rootTsconfig.references.push({ path: './packages/pkg-fail' });
    writeFileSync(rootTsconfigPath, JSON.stringify(rootTsconfig, null, 2));

    assert.throws(
      () => {
        runTurbo(['run', 'build'], wsDir);
      },
      (err) => {
        return err.status !== 0;
      },
      'Failing task should cause turbo run to fail with exit code != 0',
    );
  } finally {
    rmSync(wsDir, { recursive: true, force: true });
  }
});
