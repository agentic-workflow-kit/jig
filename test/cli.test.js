import test from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

test('CLI smoke test: valid minimal plan', () => {
  const output = execSync('node bin/jig.js run test/fixtures/m5b-local-mvp/minimal-plan.json', { encoding: 'utf8' });
  assert.match(output, /Final Status: success/);
  assert.match(output, /Records Directory: runs\/run-plan-minimal-local-/);

  const runDirMatch = output.match(/Records Directory: (runs\/run-plan-minimal-local-\d+)/);
  if (runDirMatch) {
    const runDir = runDirMatch[1];
    assert.ok(existsSync(join(runDir, 'run.json')));
    assert.ok(existsSync(join(runDir, 'events.jsonl')));

    const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8'));
    assert.strictEqual(runRecord.run.status, 'success');
  }
});

test('CLI smoke test: invalid plan rejection', () => {
  assert.throws(() => {
    execSync('node bin/jig.js run test/fixtures/m5b-local-mvp/invalid-plan.json', { stdio: 'pipe' });
  }, /unknown version "unknown-version"/);
});

test('CLI smoke test: scripted worker failure', () => {
  try {
    execSync('node bin/jig.js run test/fixtures/m5b-local-mvp/minimal-plan.json --scripted-output test/fixtures/m5b-local-mvp/scripted-worker-failure.json', { encoding: 'utf8', stdio: 'pipe' });
    assert.fail('Should have failed');
  } catch (err) {
    const output = err.stdout.toString();
    assert.match(output, /Final Status: failure/);
    assert.match(output, /Failed Item: STORY-1/);
  }
});

test('CLI smoke test: failure diagnostics existence', () => {
  try {
    execSync('node bin/jig.js run test/fixtures/m5b-local-mvp/minimal-plan.json --scripted-output test/fixtures/m5b-local-mvp/scripted-worker-failure.json', { encoding: 'utf8', stdio: 'pipe' });
    assert.fail('Should have failed');
  } catch (err) {
    const output = err.stdout.toString();
    const runDirMatch = output.match(/Records Directory: (runs\/run-plan-minimal-local-\d+)/);
    if (runDirMatch) {
      const runDir = runDirMatch[1];
      const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8'));
      const failedEvent = runRecord.events.find(e => e.family === 'story.failed');
      assert.ok(failedEvent.diagnostics, 'Missing diagnostics in failed event');
      assert.strictEqual(failedEvent.diagnostics.exitCode, 1);
      assert.match(failedEvent.diagnostics.stdout, /Check failed/);
    }
  }
});
