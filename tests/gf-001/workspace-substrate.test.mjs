import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function runTurboWithSummary(args, cwd) {
  const nodeBinDir = join(repoRoot, 'node_modules', '.bin');
  const runsDir = join(cwd, '.turbo', 'runs');
  let beforeFiles = [];
  try {
    beforeFiles = readdirSync(runsDir);
  } catch {}

  let error = null;
  try {
    execFileSync(turboBin, [...args, '--summarize'], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${nodeBinDir}:${process.env.PATH}`, TURBO_TELEMETRY_DISABLED: '1' },
    });
  } catch (err) {
    error = err;
  }

  const afterFiles = readdirSync(runsDir);
  const newFile = afterFiles.find((f) => !beforeFiles.includes(f)) || afterFiles[afterFiles.length - 1];
  const summaryJson = JSON.parse(readFileSync(join(runsDir, newFile), 'utf8'));

  return { summary: summaryJson, error };
}

test('GF-001: Cold run executes all required fixture build tasks', () => {
  const wsDir = createTestWorkspace();
  try {
    const { summary } = runTurboWithSummary(['run', 'build'], wsDir);
    const taskMap = new Map(summary.tasks.map((t) => [t.taskId, t]));

    for (const pkg of ['pkg-a', 'pkg-b', 'pkg-c']) {
      const taskId = `@gf-001-fixture/${pkg}#build`;
      const task = taskMap.get(taskId);
      assert.ok(task, `Task ${taskId} should be present in run summary`);
      assert.equal(task.cache.status, 'MISS', `Task ${taskId} should be cache MISS on cold run`);
      assert.equal(task.execution.exitCode, 0, `Task ${taskId} should execute successfully (exit code 0)`);
    }
  } finally {
    rmSync(wsDir, { recursive: true, force: true });
  }
});

test('GF-001: Warm unchanged run utilizes Turbo cache hits', () => {
  const wsDir = createTestWorkspace();
  try {
    // Populate cache across runs
    runTurboWithSummary(['run', 'build'], wsDir);
    runTurboWithSummary(['run', 'build'], wsDir);

    // Warm run
    const { summary } = runTurboWithSummary(['run', 'build'], wsDir);
    const taskMap = new Map(summary.tasks.map((t) => [t.taskId, t]));

    for (const pkg of ['pkg-a', 'pkg-b', 'pkg-c']) {
      const taskId = `@gf-001-fixture/${pkg}#build`;
      const task = taskMap.get(taskId);
      assert.ok(task, `Task ${taskId} should be present in run summary`);
      assert.equal(task.cache.status, 'HIT', `Task ${taskId} should be cache HIT on warm run`);
      assert.equal(task.execution.exitCode, 0, `Task ${taskId} should return success (exit code 0)`);
    }
  } finally {
    rmSync(wsDir, { recursive: true, force: true });
  }
});

test('GF-001: Change to producer re-runs dependent graph while unrelated lane remains cached', () => {
  const wsDir = createTestWorkspace();
  try {
    // 1. Cold/warm runs
    runTurboWithSummary(['run', 'build'], wsDir);
    runTurboWithSummary(['run', 'build'], wsDir);

    // 2. Modify producer pkg-a
    const pkgAFile = join(wsDir, 'packages', 'pkg-a', 'src', 'index.ts');
    const content = readFileSync(pkgAFile, 'utf8');
    writeFileSync(pkgAFile, `${content}\n// Trigger change\nexport const v = 2;\n`);

    // 3. Re-run turbo
    const { summary } = runTurboWithSummary(['run', 'build'], wsDir);
    const taskMap = new Map(summary.tasks.map((t) => [t.taskId, t]));

    const pkgA = taskMap.get('@gf-001-fixture/pkg-a#build');
    const pkgB = taskMap.get('@gf-001-fixture/pkg-b#build');
    const pkgC = taskMap.get('@gf-001-fixture/pkg-c#build');

    assert.ok(pkgA && pkgB && pkgC, 'All 3 package tasks should be in summary');
    assert.equal(pkgA.cache.status, 'MISS', 'Producer pkg-a should re-run (cache MISS)');
    assert.equal(pkgB.cache.status, 'MISS', 'Dependent pkg-b should re-run (cache MISS)');
    assert.equal(pkgC.cache.status, 'HIT', 'Unrelated independent lane pkg-c should remain cached (cache HIT)');
  } finally {
    rmSync(wsDir, { recursive: true, force: true });
  }
});

test('GF-001: Failure isolation ensures failing lane does not pass or corrupt unrelated lanes', () => {
  const wsDir = createTestWorkspace();
  try {
    // Populate cache for working packages
    runTurboWithSummary(['run', 'build'], wsDir);
    runTurboWithSummary(['run', 'build'], wsDir);

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

    const { summary, error } = runTurboWithSummary(['run', 'build'], wsDir);
    assert.ok(error !== null, 'Overall turbo run should fail when a task fails');

    const taskMap = new Map(summary.tasks.map((t) => [t.taskId, t]));
    const failTask = taskMap.get('@gf-001-fixture/pkg-fail#build');
    const independentTask = taskMap.get('@gf-001-fixture/pkg-c#build');

    assert.ok(failTask, 'Failing task should be recorded in summary');
    assert.notEqual(failTask.execution.exitCode, 0, 'Failing task must have non-zero exit code');

    assert.ok(independentTask, 'Independent lane pkg-c task should be recorded in summary');
    assert.equal(independentTask.execution.exitCode, 0, 'Independent lane pkg-c task must succeed (exit code 0)');
    assert.equal(independentTask.cache.status, 'HIT', 'Independent lane pkg-c task must retain its own cached result');
  } finally {
    rmSync(wsDir, { recursive: true, force: true });
  }
});
