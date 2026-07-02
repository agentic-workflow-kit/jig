import assert from 'node:assert';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { run } from '../src/cli.js';
import type { RunRecord } from '../src/types.js';

// vitest's v8 coverage provider does not attribute coverage from execSync subprocesses
// (unlike c8's NODE_V8_COVERAGE inheritance), and those subprocesses execute compiled
// dist/ JS outside `coverage.include` regardless. This file exercises cli.ts (and, by
// extension, records.ts) in-process so the 90/90/90/90 gate reflects real coverage
// instead of relying on coverage.exclude as a last resort.

class ProcessExitSentinel extends Error {
  readonly code: number | undefined;
  constructor(code?: number) {
    super(`process.exit(${code ?? ''}) called`);
    this.name = 'ProcessExitSentinel';
    this.code = code;
  }
}

let exitSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let originalArgv: string[];
let originalCwd: string;
let workDir: string;

beforeEach(() => {
  originalArgv = process.argv;
  originalCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), 'jig-cli-unit-'));
  process.chdir(workDir);

  exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new ProcessExitSentinel(code);
  }) as never);
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
  process.argv = originalArgv;
  exitSpy.mockRestore();
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

function setArgv(...args: string[]): void {
  process.argv = ['node', 'bin/jig.js', ...args];
}

function fixture(name: string): string {
  return join(originalCwd, 'tests/fixtures/m5b-local-mvp', name);
}

function loggedLines(): string {
  return (logSpy.mock.calls as unknown[][]).map((call) => call.join(' ')).join('\n');
}

function erroredLines(): string {
  return (errorSpy.mock.calls as unknown[][]).map((call) => call.join(' ')).join('\n');
}

test('run(): no command prints usage and exits 1', async () => {
  setArgv();
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Usage:/);
});

test('run(): unknown command prints usage and exits 1', async () => {
  setArgv('bogus');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Usage:/);
});

test('run(): "run" with no plan path prints usage and exits 1', async () => {
  setArgv('run');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Usage:/);
});

test('run(): "inspect" with no directory prints usage and exits 1', async () => {
  setArgv('inspect');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Usage:/);
});

test('run(): "inspect" on a missing directory exits 1 with an error', async () => {
  setArgv('inspect', 'does-not-exist');
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Error: Run directory "does-not-exist" does not exist/);
});

test('run(): "inspect" on a directory without run.json exits 1 with an error', async () => {
  const runDir = join(workDir, 'no-run-json');
  mkdirSync(runDir, { recursive: true });

  setArgv('inspect', runDir);
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Error: run\.json not found in/);
});

test('run(): "inspect" on a corrupt run.json exits 1 with a parse error', async () => {
  const runDir = join(workDir, 'corrupt-run-dir');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'run.json'), '{ not valid json');

  setArgv('inspect', runDir);
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(erroredLines(), /Error: Failed to parse run\.json/);
});

test('run(): happy-path run with --config/--policy/--scripted-output flags succeeds', async () => {
  setArgv(
    'run',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
    '--scripted-output',
    fixture('scripted-with-files.json'),
  );

  await run();

  expect(exitSpy).not.toHaveBeenCalled();
  const output = loggedLines();
  assert.match(output, /Final Status: success/);
  assert.match(output, /- STORY-1: done/);

  const runDirMatch = output.match(/Records Directory: (runs\/run-plan-minimal-local-\d+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');
  const runDir = join(workDir, runDirMatch[1]);
  assert.ok(existsSync(join(runDir, 'run.json')));
  assert.ok(existsSync(join(runDir, 'events.jsonl')));

  const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as RunRecord;
  assert.strictEqual(runRecord.run.status, 'success');

  // The changed-files line only prints in inspect output, not the run summary.
  logSpy.mockClear();
  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  assert.match(loggedLines(), /Changed files: src\/cli\.js, src\/records\.js/);
});

test('run(): denied run in-process exits 1, records the denial, and inspect shows the reason', async () => {
  // Explicit --config/--scripted-output: the CLI's relative defaults cannot resolve from
  // this test's tmpdir cwd, and the denial must be reached, not a default-path load error.
  setArgv(
    'run',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy-denied.json'),
    '--scripted-output',
    fixture('scripted-worker-success.json'),
  );

  // process.exit(1) after a failure status is inside handleRun's try block, so the throwing
  // sentinel is caught by handleRun's own catch, which logs `Error: <sentinel message>` and
  // calls process.exit(1) again (throwing again). The record file is written by finalize()
  // before that first exit call, so inspect can still read it afterward.
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);

  const output = loggedLines();
  assert.match(output, /Final Status: failure/);
  assert.match(output, /Reason: Policy denial: allowLocalDryRun is not true/);

  const runDirMatch = output.match(/Records Directory: (runs\/run-plan-minimal-local-\d+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');
  const runDir = runDirMatch[1];

  logSpy.mockClear();
  errorSpy.mockClear();
  exitSpy.mockClear();

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /--- Run Inspection ---/);
  assert.match(inspectOutput, /Final Status: failure/);
  assert.match(inspectOutput, /Reason: Policy denial: allowLocalDryRun is not true/);
});

test('run(): failure run in-process exits 1 with diagnostics, and inspect shows them', async () => {
  setArgv(
    'run',
    fixture('minimal-plan.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
    '--scripted-output',
    fixture('scripted-worker-failure.json'),
  );

  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);

  const output = loggedLines();
  assert.match(output, /Final Status: failure/);
  assert.match(output, /- STORY-1: failed/);

  const runDirMatch = output.match(/Records Directory: (runs\/run-plan-minimal-local-\d+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');
  const runDir = runDirMatch[1];

  logSpy.mockClear();
  errorSpy.mockClear();
  exitSpy.mockClear();

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /--- Run Inspection ---/);
  assert.match(inspectOutput, /Final Status: failure/);
  assert.match(inspectOutput, /- STORY-1: failed/);
  assert.match(inspectOutput, /Diagnostics:/);
  assert.match(inspectOutput, /exitCode: 1/);
  assert.match(inspectOutput, /error: Simulated worker failure/);
  assert.match(inspectOutput, /stdout: Running checks\.\.\./);
});

test('run(): failure blocks dependent and skips independent, in summary and inspect', async () => {
  setArgv(
    'run',
    fixture('multi-item-plan-failure-blocks-dependent.json'),
    '--config',
    fixture('local-config.json'),
    '--policy',
    fixture('local-policy.json'),
    '--scripted-output',
    fixture('scripted-worker-multi-failure-story-1.json'),
  );

  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);

  const output = loggedLines();
  assert.match(output, /Final Status: failure/);
  assert.match(output, /- STORY-1: failed/);
  assert.match(output, /- STORY-2: blocked \(blocked by STORY-1\)/);
  assert.match(output, /- STORY-3: skipped \(run stopped after failure\)/);

  const runDirMatch = output.match(/Records Directory: (runs\/run-multi-item-failure-\d+)/);
  assert.ok(runDirMatch, 'Failed to find run directory in output');

  logSpy.mockClear();
  errorSpy.mockClear();
  exitSpy.mockClear();

  setArgv('inspect', runDirMatch[1]);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();
  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /- STORY-2: blocked \(blocked by STORY-1\)/);
  assert.match(inspectOutput, /- STORY-3: skipped \(run stopped after failure\)/);
});

test('run(): inspect renders a sparse record: no mode, diagnostics without optional fields', async () => {
  const runDir = join(workDir, 'sparse-run-dir');
  mkdirSync(runDir, { recursive: true });
  const sparseRecord = {
    run: { id: 'plan-sparse', status: 'failure', planId: 'plan-sparse' },
    events: [{ family: 'story.failed', storyId: 'STORY-1', diagnostics: {} }],
  };
  writeFileSync(join(runDir, 'run.json'), JSON.stringify(sparseRecord, null, 2));

  setArgv('inspect', runDir);
  await run();
  expect(exitSpy).not.toHaveBeenCalled();

  const inspectOutput = loggedLines();
  assert.match(inspectOutput, /- STORY-1: failed/);
  assert.match(inspectOutput, /Diagnostics:/);
  assert.doesNotMatch(inspectOutput, /Mode:/);
  assert.doesNotMatch(inspectOutput, /exitCode:/);
  assert.doesNotMatch(inspectOutput, /error:/);
  assert.doesNotMatch(inspectOutput, /stdout:/);
});

test('run(): invalid plan path surfaces the validation error and exits 1', async () => {
  setArgv('run', fixture('invalid-plan.json'));
  await expect(run()).rejects.toBeInstanceOf(ProcessExitSentinel);
  expect(exitSpy).toHaveBeenCalledWith(1);
  assert.match(
    erroredLines(),
    /Plan validation failed for ".*invalid-plan\.json": Invalid plan: unknown version "unknown-version"/,
  );
});
