import assert from 'node:assert';
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunRecord } from '@agentic-workflow-kit/jig-sdk';
import { test } from 'vitest';

const configFlag = '--config tests/fixtures/m5b-local-mvp/local-config.json';
const policyFlag = '--policy tests/fixtures/m5b-local-mvp/local-policy.json';
const successOutputFlag = '--scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-success.json';

async function waitForPath(path: string, timeoutMs = 5_000): Promise<void> {
  const startedAt = Date.now();
  while (!existsSync(path)) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for ${path}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

test('CLI smoke test: valid minimal plan', () => {
  const output = execSync(
    `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} ${policyFlag} ${successOutputFlag}`,
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

test('P07-AC-2/5: CLI setup emits artifacts that can launch a fixture run', () => {
  const setupDir = mkdtempSync(join(tmpdir(), 'jig-cli-setup-'));
  try {
    const setupOutput = execSync(
      `node packages/jig-cli/bin/jig.js setup ${setupDir} --track TRACK-P07 --template conservative-manual --posture reference-scripted`,
      { encoding: 'utf8' },
    );
    assert.match(setupOutput, /Status: created/);
    assert.match(setupOutput, /Manual gating/);
    assert.ok(existsSync(join(setupDir, 'jig.config.json')));
    assert.ok(existsSync(join(setupDir, 'setup-record.json')));

    const runOutput = execSync(
      `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json --config ${setupDir}/jig.config.json --policy ${setupDir}/policy.json ${successOutputFlag}`,
      { encoding: 'utf8' },
    );
    assert.match(runOutput, /Final Status: success/);
  } finally {
    rmSync(setupDir, { recursive: true, force: true });
  }
});

test('CLI smoke test: invalid plan rejection', () => {
  assert.throws(() => {
    execSync(
      `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/invalid-plan.json ${configFlag} ${policyFlag} ${successOutputFlag}`,
      { stdio: 'pipe' },
    );
  }, /Invalid plan: unknown version "unknown-version"/);
});

test('CLI smoke test: scripted worker failure', () => {
  try {
    execSync(
      `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-failure.json`,
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
      `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-failure.json`,
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
    `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/multi-item-plan-success.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-multi-success.json`,
    { encoding: 'utf8' },
  );
  assert.match(output, /Final Status: success/);
});

test('CLI smoke test: multi-item failure with blocked/skipped', () => {
  try {
    execSync(
      `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/multi-item-plan-failure-blocks-dependent.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-multi-failure-story-1.json`,
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
    `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} ${policyFlag} ${successOutputFlag}`,
    {
      encoding: 'utf8',
    },
  );
  const runDirMatch = runOutput.match(/Records Directory: (runs\/run-plan-minimal-local-\d+-[^\s]+)/);
  if (runDirMatch) {
    const runDir = runDirMatch[1];
    const inspectOutput = execSync(`node packages/jig-cli/bin/jig.js inspect ${runDir}`, {
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
      `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/multi-item-plan-failure-blocks-dependent.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-multi-failure-story-1.json`,
      { encoding: 'utf8', stdio: 'pipe' },
    );
    assert.fail('Should have failed');
  } catch (err) {
    const runOutput = (err as { stdout: Buffer }).stdout.toString();
    const runDirMatch = runOutput.match(/Records Directory: (runs\/run-multi-item-failure-\d+-[^\s]+)/);
    if (runDirMatch) {
      const runDir = runDirMatch[1];
      const inspectOutput = execSync(`node packages/jig-cli/bin/jig.js inspect ${runDir}`, {
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
    execSync('node packages/jig-cli/bin/jig.js inspect non-existent-dir', { stdio: 'pipe' });
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
      `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/invalid-plan.json ${configFlag} ${policyFlag} ${successOutputFlag}`,
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
    `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} ${policyFlag} --scripted-output tests/fixtures/m5b-local-mvp/scripted-with-files.json`,
    { encoding: 'utf8' },
  );
  const runDirMatch = runOutput.match(/Records Directory: (runs\/run-plan-minimal-local-\d+-[^\s]+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');
  const runDir = runDirMatch[1];
  const inspectOutput = execSync(`node packages/jig-cli/bin/jig.js inspect ${runDir}`, {
    encoding: 'utf8',
  });
  assert.match(inspectOutput, /Changed files: src\/cli.js, src\/records.js/);
});

test('CLI inspect test: policy denial shows reason', () => {
  let runOutput: string;
  let exitCode: number | null = 0;
  try {
    runOutput = execSync(
      `node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json ${configFlag} --policy tests/fixtures/m5b-local-mvp/local-policy-denied.json ${successOutputFlag}`,
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
  const inspectOutput = execSync(`node packages/jig-cli/bin/jig.js inspect ${runDir}`, { encoding: 'utf8' });
  assert.match(inspectOutput, /Reason: Policy denial: allowLocalDryRun is not true/);
});

test('P08-F11: watch observes a live run from a second process and then the finished record', async () => {
  const runRoot = mkdtempSync(join(tmpdir(), 'jig-watch-int-'));
  const runDir = join(runRoot, 'run-live-watch');
  mkdirSync(runDir, { recursive: true });
  const readyFile = join(runRoot, 'ready');
  const continueFile = join(runRoot, 'continue');

  const driverScript = `
    const { mkdirSync, writeFileSync, appendFileSync, existsSync } = require('node:fs');
    const { join } = require('node:path');
    const runDir = process.argv[1];
    const readyFile = process.argv[2];
    const continueFile = process.argv[3];
    const eventsPath = join(runDir, 'events.jsonl');
    const write = (event) => appendFileSync(eventsPath, JSON.stringify(event) + '\\n');
    mkdirSync(runDir, { recursive: true });
    writeFileSync(eventsPath, '');
    write({
      family: 'run.started',
      actor: 'runner',
      timestamp: '2026-07-06T09:00:00.000Z',
      runId: 'run-cli-watch-int',
      planId: 'plan-cli-watch-int',
      mode: 'local-dry-run',
      binding: {
        policyRef: 'policy-cli-watch-int',
        configRef: 'mode=local-dry-run;recordDir=runs',
        workspace: { repoRoot: runDir, head: '0123456789abcdef0123456789abcdef01234567', changeSetHash: 'workspace-clean' }
      },
      posture: { record: 'safe-for-owner-record', export: 'redacted' },
      planSnapshot: { ref: 'plan.snapshot.json' },
      policySnapshot: { ref: 'policy.snapshot.json' }
    });
    write({
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-06T09:00:01.000Z',
      storyId: 'STORY-1'
    });
    writeFileSync(readyFile, 'ready\\n');
    const timer = setInterval(() => {
      if (!existsSync(continueFile)) return;
      clearInterval(timer);
      write({
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-06T09:00:02.000Z',
        storyId: 'STORY-1'
      });
      write({
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-06T09:00:03.000Z'
      });
      process.exit(0);
    }, 20);
  `;

  const driver = spawn(process.execPath, ['-e', driverScript, runDir, readyFile, continueFile], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForPath(readyFile);

    const watchWhileRunning = execSync(`node packages/jig-cli/bin/jig.js watch ${runDir}`, {
      encoding: 'utf8',
    });
    assert.match(watchWhileRunning, /--- Run Watch ---/);
    assert.match(watchWhileRunning, /Signal: progressing/);
    assert.match(watchWhileRunning, /Progressing:\n {2}- STORY-1: started/);

    writeFileSync(continueFile, 'continue\n');
    await new Promise<void>((resolve, reject) => {
      driver.once('exit', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`driver exited with code ${String(code)}`));
      });
      driver.once('error', reject);
    });

    const watchAfterCompletion = execSync(`node packages/jig-cli/bin/jig.js watch ${runDir}`, {
      encoding: 'utf8',
    });
    assert.match(watchAfterCompletion, /Signal: finished/);
    assert.match(watchAfterCompletion, /Done:\n {2}- STORY-1: done/);
  } finally {
    driver.kill();
    rmSync(runRoot, { recursive: true, force: true });
  }
});
