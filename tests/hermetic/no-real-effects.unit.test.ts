// Proves the hermetic guard installed by ./no-real-effects.setup.ts: seeded attempts at a
// forbidden real effect must be blocked, and the guard's own error identity (not an incidental
// failure like ENOENT or a DNS error) must be what blocks them. Allowlisted real local effects
// (git in a temp workspace, node self-invocation) must keep working, matching what
// tests/records.unit.test.ts and tests/cli.int.test.ts already rely on.
import { execFile, execFileSync, execSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, assert, test } from 'vitest';
import { HermeticGuardViolation } from './no-real-effects.setup.js';

const execFileAsync = promisify(execFile);
let tempDir: string | undefined;

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

test('seeded violation: execFile("gh", ...) is blocked by the hermetic guard', async () => {
  let caught: unknown;
  try {
    await execFileAsync('gh', ['pr', 'view']);
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof HermeticGuardViolation, `expected HermeticGuardViolation, got ${String(caught)}`);
  assert.match((caught as Error).message, /blocked real execFile\("gh"/);
});

test('seeded violation: execSync("git push ...") is blocked by the hermetic guard', () => {
  let caught: unknown;
  try {
    execSync('git push origin main');
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof HermeticGuardViolation, `expected HermeticGuardViolation, got ${String(caught)}`);
  assert.match((caught as Error).message, /blocked real execSync/);
});

test('seeded violation: spawnSync("git", ["push", ...]) is blocked by the hermetic guard', () => {
  let caught: unknown;
  try {
    spawnSync('git', ['push', 'origin', 'main']);
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof HermeticGuardViolation, `expected HermeticGuardViolation, got ${String(caught)}`);
});

test('seeded violation: execFileSync("codex", ...) is blocked by the hermetic guard', () => {
  let caught: unknown;
  try {
    execFileSync('codex', ['exec']);
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof HermeticGuardViolation, `expected HermeticGuardViolation, got ${String(caught)}`);
  assert.match((caught as Error).message, /blocked real execFileSync\("codex"/);
});

test('seeded violation: fetch to a non-local host is blocked by the hermetic guard', async () => {
  let caught: unknown;
  try {
    await fetch('https://api.github.com/repos/example/example/issues');
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof HermeticGuardViolation, `expected HermeticGuardViolation, got ${String(caught)}`);
  assert.match((caught as Error).message, /blocked real fetch/);
});

test('allowlisted: real local git subcommands in a temp workspace still work', () => {
  tempDir = mkdtempSync(join(tmpdir(), 'jig-hermetic-guard-'));
  const init = spawnSync('git', ['init', '-b', 'main'], { cwd: tempDir, encoding: 'utf8' });
  assert.strictEqual(init.status, 0);

  const status = spawnSync('git', ['status', '--porcelain=v1'], { cwd: tempDir, encoding: 'utf8' });
  assert.strictEqual(status.status, 0);

  const diff = spawnSync('git', ['diff', '--no-ext-diff', '--binary', '--'], { cwd: tempDir, encoding: 'utf8' });
  assert.strictEqual(diff.status, 0);
});

test('allowlisted: real fetch to a local host still works', async () => {
  let caught: unknown;
  try {
    await fetch('http://127.0.0.1:0/');
  } catch (err) {
    caught = err;
  }
  // A local fetch is allowed through to the real implementation; it fails with a connection
  // error (nothing listens on port 0), not the guard's violation error.
  assert.ok(!(caught instanceof HermeticGuardViolation), 'local fetch must not be blocked by the guard');
});
