import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';
import type { RunRecord } from '../src/types.js';

const configFlag = '--config tests/fixtures/m5b-local-mvp/local-config.json';
const policyFlag = '--policy tests/fixtures/m5b-local-mvp/local-policy.json';
const successOutputFlag = '--scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-success.json';

test('CLI smoke test: valid minimal plan', () => {
  const output = execSync(
    `node bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} ${policyFlag} ${successOutputFlag}`,
    { encoding: 'utf8' },
  );
  assert.match(output, /Final Status: success/);
  assert.match(output, /Records Directory: runs\/run-plan-minimal-local-/);

  const runDirMatch = output.match(/Records Directory: (runs\/run-plan-minimal-local-\d+-[^\s]+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');
  const runDir = runDirMatch[1];
  assert.ok(existsSync(join(runDir, 'run.json')));
  assert.ok(existsSync(join(runDir, 'events.jsonl')));

  const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as RunRecord;
  assert.strictEqual(runRecord.run.status, 'success');
});

test('CLI smoke test: invalid plan rejection', () => {
  assert.throws(() => {
    execSync(
      `node bin/jig.js run tests/fixtures/m5b-local-mvp/invalid-plan.json ${configFlag} ${policyFlag} ${successOutputFlag}`,
      { stdio: 'pipe' },
    );
  }, /Invalid plan: unknown version "unknown-version"/);
});

test('CLI smoke test: scripted worker failure', () => {
  try {
    execSync(
      `node bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-failure.json`,
      { encoding: 'utf8', stdio: 'pipe' },
    );
    assert.fail('Should have failed');
  } catch (err) {
    const output = (err as { stdout: Buffer }).stdout.toString();
    assert.match(output, /Final Status: failure/);
    assert.match(output, /- STORY-1: blocked \(worker-reported-failure\)/);
  }
});

test('CLI smoke test: failure diagnostics existence', () => {
  try {
    execSync(
      `node bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-failure.json`,
      { encoding: 'utf8', stdio: 'pipe' },
    );
    assert.fail('Should have failed');
  } catch (err) {
    const output = (err as { stdout: Buffer }).stdout.toString();
    const runDirMatch = output.match(/Records Directory: (runs\/run-plan-minimal-local-\d+-[^\s]+)/);
    assert.ok(runDirMatch, 'Failed to find run directory in output');
    const runDir = runDirMatch[1];
    const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as RunRecord;
    const failedEvent = runRecord.events.find((e) => e.family === 'story.blocked');
    assert.ok(failedEvent, 'Missing diagnostics in failed event');
    assert.ok(failedEvent.diagnostics, 'Missing diagnostics in failed event');
    assert.strictEqual(failedEvent.reason, 'worker-reported-failure');
    assert.strictEqual(failedEvent.diagnostics.exitCode, 1);
    assert.match(failedEvent.diagnostics.stdout ?? '', /Check failed/);
  }
});

test('CLI smoke test: multi-item success', () => {
  const output = execSync(
    `node bin/jig.js run tests/fixtures/m5b-local-mvp/multi-item-plan-success.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-multi-success.json`,
    { encoding: 'utf8' },
  );
  assert.match(output, /Final Status: success/);
});

test('CLI smoke test: multi-item failure with blocked/skipped', () => {
  try {
    execSync(
      `node bin/jig.js run tests/fixtures/m5b-local-mvp/multi-item-plan-failure-blocks-dependent.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-multi-failure-story-1.json`,
      { encoding: 'utf8', stdio: 'pipe' },
    );
    assert.fail('Should have failed');
  } catch (err) {
    const output = (err as { stdout: Buffer }).stdout.toString();
    assert.match(output, /Final Status: failure/);

    const runDirMatch = output.match(/Records Directory: (runs\/run-multi-item-failure-\d+-[^\s]+)/);
    assert.ok(runDirMatch, 'Failed to find run directory in output');
    const runDir = runDirMatch[1];
    const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as RunRecord;
    assert.ok(runRecord.events.find((e) => e.family === 'story.blocked' && e.storyId === 'STORY-1'));
    assert.ok(runRecord.events.find((e) => e.family === 'story.blocked' && e.storyId === 'STORY-2'));
    assert.ok(
      runRecord.events.find(
        (e) => e.family === 'run.stopped' && Array.isArray(e.unstarted) && e.unstarted.includes('STORY-3'),
      ),
    );
  }
});

test('CLI inspect test: success run', () => {
  const runOutput = execSync(
    `node bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} ${policyFlag} ${successOutputFlag}`,
    {
      encoding: 'utf8',
    },
  );
  const runDirMatch = runOutput.match(/Records Directory: (runs\/run-plan-minimal-local-\d+-[^\s]+)/);
  if (runDirMatch) {
    const runDir = runDirMatch[1];
    const inspectOutput = execSync(`node bin/jig.js inspect ${runDir}`, {
      encoding: 'utf8',
    });
    assert.match(inspectOutput, /--- Run Inspection ---/);
    assert.match(inspectOutput, /Run ID: run-plan-minimal-local-/);
    assert.match(inspectOutput, /Final Status: success/);
    assert.match(inspectOutput, /Mode: local-dry-run/);
    assert.match(inspectOutput, /- STORY-1: done/);
  } else {
    assert.fail('Failed to find run directory in output');
  }
});

test('CLI inspect test: failure run with blocked/skipped', () => {
  try {
    execSync(
      `node bin/jig.js run tests/fixtures/m5b-local-mvp/multi-item-plan-failure-blocks-dependent.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-multi-failure-story-1.json`,
      { encoding: 'utf8', stdio: 'pipe' },
    );
    assert.fail('Should have failed');
  } catch (err) {
    const runOutput = (err as { stdout: Buffer }).stdout.toString();
    const runDirMatch = runOutput.match(/Records Directory: (runs\/run-multi-item-failure-\d+-[^\s]+)/);
    if (runDirMatch) {
      const runDir = runDirMatch[1];
      const inspectOutput = execSync(`node bin/jig.js inspect ${runDir}`, {
        encoding: 'utf8',
      });
      assert.match(inspectOutput, /--- Run Inspection ---/);
      assert.match(inspectOutput, /Final Status: failure/);
      assert.match(inspectOutput, /- STORY-1: blocked \(worker-reported-failure\)/);
      assert.match(inspectOutput, /- STORY-2: blocked \(blocked by STORY-1\)/);
      assert.doesNotMatch(inspectOutput, /STORY-3: skipped/);
      assert.match(inspectOutput, /Diagnostics:/);
      assert.match(inspectOutput, /error: Failing intentionally/);
    } else {
      assert.fail('Failed to find run directory in output');
    }
  }
});

test('CLI inspect test: invalid run path', () => {
  try {
    execSync('node bin/jig.js inspect non-existent-dir', { stdio: 'pipe' });
    assert.fail('Should have failed');
  } catch (err) {
    assert.match(
      (err as { stderr: Buffer }).stderr.toString(),
      /Error: Run directory "non-existent-dir" does not exist/,
    );
  }
});

test('CLI run test: validation error includes path and reason', () => {
  try {
    execSync(
      `node bin/jig.js run tests/fixtures/m5b-local-mvp/invalid-plan.json ${configFlag} ${policyFlag} ${successOutputFlag}`,
      { stdio: 'pipe' },
    );
    assert.fail('Should have failed');
  } catch (err) {
    assert.match(
      (err as { stderr: Buffer }).stderr.toString(),
      /Plan validation failed for "tests\/fixtures\/m5b-local-mvp\/invalid-plan.json": Invalid plan: unknown version "unknown-version"/,
    );
  }
});

test('CLI inspect test: shows changed files if present', () => {
  const runOutput = execSync(
    `node bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-with-files.json`,
    { encoding: 'utf8' },
  );
  const runDirMatch = runOutput.match(/Records Directory: (runs\/run-plan-minimal-local-\d+-[^\s]+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');
  const runDir = runDirMatch[1];
  const inspectOutput = execSync(`node bin/jig.js inspect ${runDir}`, {
    encoding: 'utf8',
  });
  assert.match(inspectOutput, /Changed files: src\/cli.js, src\/records.js/);
});

test('CLI inspect test: policy denial shows reason', () => {
  let runOutput: string;
  let exitCode: number | null = 0;
  try {
    runOutput = execSync(
      `node bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} --policy tests/fixtures/m5b-local-mvp/local-policy-denied.json ${successOutputFlag}`,
      { encoding: 'utf8', stdio: 'pipe' },
    );
    assert.fail('Should have failed');
  } catch (err) {
    const execErr = err as { stdout: Buffer; status: number | null };
    runOutput = execErr.stdout.toString();
    exitCode = execErr.status;
  }

  assert.notStrictEqual(exitCode, 0, 'Policy-denied run should exit non-zero');
  assert.match(runOutput, /Final Status: failure/);
  assert.match(runOutput, /Reason: Policy denial: allowLocalDryRun is not true/);

  const runDirMatch = runOutput.match(/Records Directory: (runs\/run-plan-minimal-local-\d+-[^\s]+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');
  const runDir = runDirMatch[1];
  const inspectOutput = execSync(`node bin/jig.js inspect ${runDir}`, { encoding: 'utf8' });
  assert.match(inspectOutput, /Reason: Policy denial: allowLocalDryRun is not true/);
});
