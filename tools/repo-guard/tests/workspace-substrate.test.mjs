import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../../..');
// Turbo is the repository-level tool; TypeScript is declared by the packages that compile, so the
// fixture toolchain is assembled from both bin directories the workspace install produces.
const rootBin = join(repoRoot, 'node_modules', '.bin');
const guardBin = resolve(import.meta.dirname, '..', 'node_modules', '.bin');
const fixtureSource = join(import.meta.dirname, 'fixtures', 'workspace');
const sourceDigest = digestTree(fixtureSource);

function digestTree(root, current = root) {
  const hash = createHash('sha256');
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = join(directory, entry.name);
      const name = relative(root, path);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`fixture source must not contain symlinks: ${name}`);
      if (stat.isDirectory()) {
        hash.update(`directory:${name}\0`);
        visit(path);
      } else if (stat.isFile()) {
        hash.update(`file:${name}\0${readFileSync(path)}\0`);
      } else throw new Error(`fixture source has unsupported file type: ${name}`);
    }
  }
  visit(current);
  return hash.digest('hex');
}

function sanitizedEnvironment(home) {
  const corepackHome = process.env.COREPACK_HOME ?? join(process.env.HOME ?? home, '.cache', 'node', 'corepack');
  return {
    PATH: `${rootBin}:${guardBin}:${process.env.PATH ?? ''}`,
    HOME: home,
    TMPDIR: tmpdir(),
    LANG: 'C',
    LC_ALL: 'C',
    CI: 'true',
    TURBO_TELEMETRY_DISABLED: '1',
    TURBO_REMOTE_CACHE_DISABLED: '1',
    npm_config_userconfig: join(home, '.npmrc'),
    npm_config_globalconfig: join(home, 'global-npmrc'),
    COREPACK_HOME: corepackHome,
    COREPACK_ENABLE_NETWORK: '0',
  };
}

function run(command, args, cwd, env) {
  try {
    return {
      output: execFileSync(command, args, { cwd, encoding: 'utf8', env, timeout: 30_000, killSignal: 'SIGKILL' }),
      error: null,
    };
  } catch (error) {
    return { output: `${error.stdout ?? ''}${error.stderr ?? ''}`, error };
  }
}

function initializeFixtureHistory(workspace) {
  for (const [args, options] of [
    [['init', '-q'], {}],
    [['config', 'user.name', 'workspace fixture'], {}],
    [['config', 'user.email', 'workspace@example.invalid'], {}],
    [['add', '.'], {}],
    [['commit', '-q', '-m', 'fixture base'], {}],
  ])
    execFileSync('git', args, { cwd: workspace, encoding: 'utf8', ...options });
}

function runTurboWithSummary(args, workspace, env) {
  const runsDir = join(workspace, '.turbo', 'runs');
  const before = existsSync(runsDir) ? new Set(readdirSync(runsDir)) : new Set();
  const turbo = join(rootBin, 'turbo');
  const result = run(turbo, [...args, '--summarize', '--cache-dir=.turbo/cache'], workspace, env);
  const after = readdirSync(runsDir).sort();
  const newSummary = after.find((file) => !before.has(file)) ?? after.at(-1);
  assert.ok(newSummary, 'Turbo must emit a machine-readable run summary');
  const rawSummary = readFileSync(join(runsDir, newSummary), 'utf8');
  return {
    ...result,
    rawSummary,
    rawSummarySha256: createHash('sha256').update(rawSummary).digest('hex'),
    summary: JSON.parse(rawSummary),
  };
}

function task(summary, packageName) {
  const expected = `@workspace-fixture/${packageName}#build`;
  const value = summary.tasks.find((entry) => entry.taskId === expected);
  assert.ok(value, `summary must contain ${expected}`);
  return value;
}

function assertExecutedSuccess(summary, packageName, expectedCache) {
  const entry = task(summary, packageName);
  assert.equal(entry.cache.status, expectedCache, `${packageName} cache status`);
  assert.equal(entry.execution.exitCode, 0, `${packageName} must execute successfully`);
  assert.equal(
    entry.taskId,
    `@workspace-fixture/${packageName}#build`,
    `${packageName} evidence must remain subject-bound`,
  );
}

function withWorkspace(runCase) {
  const workspace = mkdtempSync(join(tmpdir(), 'workspace-turbo-test-'));
  let failure;
  try {
    cpSync(fixtureSource, workspace, { recursive: true, verbatimSymlinks: true });
    writeFileSync(join(workspace, 'turbo.json'), readFileSync(join(repoRoot, 'turbo.json')));
    const home = join(workspace, '.home');
    const env = sanitizedEnvironment(home);
    assert.equal(existsSync(join(workspace, 'node_modules')), false, 'cold fixture must not inherit an install state');
    assert.equal(
      existsSync(join(rootBin, 'turbo')),
      true,
      'the frozen root install must provide the exact Turbo binary',
    );
    assert.equal(
      existsSync(join(guardBin, 'tsc')),
      true,
      'the frozen workspace install must provide the exact cataloged TypeScript binary',
    );
    const install = run('pnpm', ['install', '--frozen-lockfile', '--offline', '--ignore-scripts'], workspace, env);
    assert.equal(install.error, null, `fixture install must be frozen, offline, and script-free: ${install.output}`);
    initializeFixtureHistory(workspace);
    runCase({ workspace, env });
    assert.equal(digestTree(fixtureSource), sourceDigest, 'fixture source inputs must remain unchanged after the test');
    for (const forbidden of ['node_modules', '.turbo', 'dist', 'tsconfig.tsbuildinfo'])
      assert.equal(
        existsSync(join(fixtureSource, forbidden)),
        false,
        `fixture source must not retain generated ${forbidden}`,
      );
  } catch (error) {
    failure = error;
  }
  try {
    rmSync(workspace, { recursive: true, maxRetries: 5, retryDelay: 50 });
  } catch (cleanupError) {
    throw failure
      ? new AggregateError([failure, cleanupError], 'workspace fixture test and cleanup failed')
      : cleanupError;
  }
  if (failure) throw failure;
}

test('workspace: cold isolated cache executes the canonical active task graph', { concurrency: false }, () => {
  withWorkspace(({ workspace, env }) => {
    const result = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.equal(result.error, null, `cold Turbo run must succeed: ${result.output}`);
    for (const packageName of ['pkg-a', 'pkg-b', 'pkg-c']) assertExecutedSuccess(result.summary, packageName, 'MISS');
  });
});

test('workspace: unchanged isolated warm run hits only local cache', { concurrency: false }, () => {
  withWorkspace(({ workspace, env }) => {
    const cold = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.equal(cold.error, null, cold.output);
    const warm = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.equal(warm.error, null, warm.output);
    for (const packageName of ['pkg-a', 'pkg-b', 'pkg-c']) assertExecutedSuccess(warm.summary, packageName, 'HIT');
  });
});

test('workspace: reproducible Git-history affected selection runs only the changed producer and its dependent', {
  concurrency: false,
}, () => {
  withWorkspace(({ workspace, env }) => {
    const seed = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.equal(seed.error, null, seed.output);
    const producer = join(workspace, 'packages/pkg-a/src/index.ts');
    writeFileSync(producer, `${readFileSync(producer, 'utf8')}\nexport const revision = 2;\n`);
    execFileSync('git', ['add', producer], { cwd: workspace });
    execFileSync('git', ['commit', '-q', '-m', 'change producer'], { cwd: workspace });
    const affected = runTurboWithSummary(['run', 'build', '--filter=...[HEAD^]'], workspace, env);
    assert.equal(affected.error, null, affected.output);
    assertExecutedSuccess(affected.summary, 'pkg-a', 'MISS');
    assertExecutedSuccess(affected.summary, 'pkg-b', 'MISS');
    assert.deepEqual(
      affected.summary.tasks.map((entry) => entry.taskId).sort(),
      ['@workspace-fixture/pkg-a#build', '@workspace-fixture/pkg-b#build'],
      'affected-only selection must exclude the unrelated pkg-c lane',
    );
  });
});

test('workspace: shared compiler configuration invalidates every warm task and cannot restore stale output', {
  concurrency: false,
}, () => {
  withWorkspace(({ workspace, env }) => {
    const cold = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.equal(cold.error, null, cold.output);
    const warm = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.equal(warm.error, null, warm.output);
    const compilerConfig = join(workspace, 'tsconfig.base.json');
    writeFileSync(
      compilerConfig,
      readFileSync(compilerConfig, 'utf8').replace('"target": "ES2022"', '"target": "ES2021"'),
    );
    const changed = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.equal(changed.error, null, changed.output);
    for (const packageName of ['pkg-a', 'pkg-b', 'pkg-c']) assertExecutedSuccess(changed.summary, packageName, 'MISS');
  });
});

test('workspace: uncached failure isolates a successful unrelated lane while preserving aggregate failure', {
  concurrency: false,
}, () => {
  withWorkspace(({ workspace, env }) => {
    const producer = join(workspace, 'packages/pkg-a/src/index.ts');
    writeFileSync(producer, `${readFileSync(producer, 'utf8')}\nconst impossible: string = 7;\n`);
    const failed = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.notEqual(failed.error, null, 'aggregate Turbo command failure must not be ignored');
    const failedTask = task(failed.summary, 'pkg-a');
    assert.notEqual(failedTask.execution.exitCode, 0, 'intended lane must have failed');
    const independent = task(failed.summary, 'pkg-c');
    assert.equal(
      independent.cache.status,
      'MISS',
      'uncached unrelated lane must execute, not merely restore a prior result',
    );
    assert.equal(independent.execution.exitCode, 0, 'unrelated lane must succeed');
    assert.equal(
      independent.taskId,
      '@workspace-fixture/pkg-c#build',
      'unrelated success evidence must remain subject-bound',
    );
  });
});

test('workspace: a package script change invalidates that package cache entry', { concurrency: false }, () => {
  withWorkspace(({ workspace, env }) => {
    const cold = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.equal(cold.error, null, cold.output);
    const warm = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.equal(warm.error, null, warm.output);
    const manifest = join(workspace, 'packages/pkg-c/package.json');
    writeFileSync(manifest, readFileSync(manifest, 'utf8').replace('tsc --build', 'tsc --build --verbose'));
    const changed = runTurboWithSummary(['run', 'build'], workspace, env);
    assert.equal(changed.error, null, changed.output);
    assertExecutedSuccess(changed.summary, 'pkg-c', 'MISS');
  });
});
