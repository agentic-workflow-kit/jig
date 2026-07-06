import assert from 'node:assert';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { exportRun } from '../src/export.js';
import { RecordManager } from '../src/records.js';
import type { ConfigDoc, Plan, PolicyDoc } from '../src/types.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempRecordDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'jig-export-'));
  cleanupDirs.push(dir);
  return dir;
}

function plan(): Plan {
  return {
    id: 'plan-export',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Story one' }],
  };
}

function policy(): PolicyDoc {
  return { policy: { id: 'policy-export', rules: { allowLocalDryRun: true } } };
}

function config(recordDir: string): ConfigDoc {
  return { runner: { mode: 'local-dry-run', recordDir } };
}

function runDirFor(recordDir: string): string {
  const [runName] = readdirSync(recordDir);
  assert.ok(runName, 'expected a run directory to have been created');
  return join(recordDir, runName);
}

test('export: refuses when the run directory does not exist', () => {
  const parentDir = mkdtempSync(join(tmpdir(), 'jig-export-missing-parent-'));
  cleanupDirs.push(parentDir);
  assert.throws(() => exportRun({ runDir: join(parentDir, 'jig-export-does-not-exist') }), /does not exist/);
});

test('export: refuses when events.jsonl is missing from an existing run directory', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'jig-export-no-events-'));
  cleanupDirs.push(runDir);
  assert.throws(() => exportRun({ runDir }), /Missing authoritative events\.jsonl/);
});

test('export: a completed run exports successfully and records an export.prepared audit event', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();
  manager.init(plan(), config(recordDir), policy());
  manager.recordEvent({ family: 'run.started' });
  manager.recordEvent({ family: 'story.started', storyId: 'STORY-1' });
  manager.recordEvent({ family: 'story.done', storyId: 'STORY-1', changedFiles: ['src/a.ts'] });
  manager.recordEvent({ family: 'run.completed' });
  await manager.finalize('success');
  const runDir = runDirFor(recordDir);

  const result = exportRun({ runDir });

  assert.strictEqual(result.status, 'exported');
  assert.ok(result.artifactPath && existsSync(result.artifactPath));
  assert.ok(result.artifactSha256);
  const audit = readFileSync(result.auditEventPath, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.ok(
    audit.some((event) => event.family === 'export.prepared' && event.artifactSha256 === result.artifactSha256),
  );
  const artifact = JSON.parse(readFileSync(result.artifactPath as string, 'utf8'));
  assert.strictEqual(artifact.manifest.lifecycleState, 'completed');
  assert.strictEqual(artifact.manifest.withheldEventCount, 0);
});

test('export: a stopped run is also exportable (finished, not just completed)', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();
  manager.init(plan(), config(recordDir), policy());
  manager.recordEvent({ family: 'run.started' });
  manager.recordEvent({ family: 'story.started', storyId: 'STORY-1' });
  manager.recordEvent({ family: 'story.blocked', storyId: 'STORY-1', reason: 'work-item-blocked' });
  manager.recordEvent({ family: 'run.stopped', reason: 'owner-requested-pause', checkpoint: 'after:STORY-1' });
  await manager.finalize('failure');
  const runDir = runDirFor(recordDir);

  const result = exportRun({ runDir });

  assert.strictEqual(result.status, 'exported');
});

test('export: refuses an unfinished (still-running) run with a run-not-finished reason', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();
  manager.init(plan(), config(recordDir), policy());
  manager.recordEvent({ family: 'run.started' });
  const runDir = runDirFor(recordDir);
  // Deliberately do not finalize: the run remains in the "started" lifecycle state.

  const result = exportRun({ runDir });

  assert.strictEqual(result.status, 'refused');
  assert.strictEqual(result.reason, 'run-not-finished:started');
  const audit = readFileSync(result.auditEventPath, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.ok(audit.some((event) => event.family === 'export.denied' && event.reason === 'run-not-finished:started'));
});

test('export: refuses when events.jsonl exists but is empty, without crashing the integrity precheck', async () => {
  const runDir = mkdtempSync(join(tmpdir(), 'jig-export-empty-events-'));
  cleanupDirs.push(runDir);
  writeFileSync(join(runDir, 'events.jsonl'), '');

  const result = exportRun({ runDir });

  assert.strictEqual(result.status, 'refused');
  assert.ok(result.reason?.startsWith('projection-drift:'));
});

test('export: refuses when events.jsonl fails projection with a projection-drift reason', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();
  manager.init(plan(), config(recordDir), policy());
  manager.recordEvent({ family: 'run.started' });
  await manager.finalize('success');
  const runDir = runDirFor(recordDir);
  // Corrupt the authoritative event log after the fact so parsing/projection fails.
  writeFileSync(join(runDir, 'events.jsonl'), 'not valid jsonl {{{\n');

  const result = exportRun({ runDir });

  assert.strictEqual(result.status, 'refused');
  assert.ok(result.reason?.startsWith('projection-drift:'));
});

test('export: withholds events whose export posture is not redacted and records the reason', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();
  manager.init(plan(), config(recordDir), policy());
  manager.recordEvent({ family: 'run.started' });
  // An event carrying an explicit non-redacted export posture must be withheld, not exported.
  manager.recordEvent({
    family: 'story.started',
    storyId: 'STORY-1',
    posture: { export: 'raw' },
  } as never);
  manager.recordEvent({ family: 'story.done', storyId: 'STORY-1', changedFiles: [] });
  manager.recordEvent({ family: 'run.completed' });
  await manager.finalize('success');
  const runDir = runDirFor(recordDir);

  const result = exportRun({ runDir });

  assert.strictEqual(result.status, 'exported');
  const artifact = JSON.parse(readFileSync(result.artifactPath as string, 'utf8'));
  assert.ok(
    artifact.withheldEvents.some((event: { reason: string }) => event.reason === 'unsupported-export-posture:raw'),
  );
  assert.ok(!artifact.events.some((event: { event: { family: string } }) => event.event.family === 'story.started'));
});

test('export: an event carrying an ambiguous secret-shaped field is withheld with the redaction-ambiguity reason', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();
  manager.init(plan(), config(recordDir), policy());
  manager.recordEvent({ family: 'run.started' });
  // "apiKey" matches the secret-key pattern but carries a non-string value, which redactValue
  // cannot safely redact-or-pass-through -- it must throw RedactionAmbiguityError rather than
  // silently leaking a structured secret-shaped value.
  manager.recordEvent({
    family: 'story.started',
    storyId: 'STORY-1',
    apiKey: 12345,
  } as never);
  manager.recordEvent({ family: 'story.done', storyId: 'STORY-1', changedFiles: [] });
  manager.recordEvent({ family: 'run.completed' });
  await manager.finalize('success');
  const runDir = runDirFor(recordDir);

  const result = exportRun({ runDir });

  assert.strictEqual(result.status, 'exported');
  const artifact = JSON.parse(readFileSync(result.artifactPath as string, 'utf8'));
  assert.ok(
    artifact.withheldEvents.some((event: { reason: string }) =>
      event.reason.startsWith('redaction-export-posture-ambiguous:'),
    ),
  );
});

test('export: an ambiguous secret-shaped value inside the run projection itself refuses the export', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();
  manager.init(plan(), config(recordDir), policy());
  manager.recordEvent({ family: 'run.started' });
  manager.recordEvent({ family: 'story.started', storyId: 'STORY-1' });
  // A blocked story's diagnostics.evidenceResult flows into the projection's per-story
  // diagnostics; giving it a secret-shaped key with a non-string value forces
  // redactedProjectionForExport's redaction pass to hit the same ambiguity as the per-event
  // path, but this time against the projection as a whole -- which must refuse the whole
  // export rather than partially redact it.
  manager.recordEvent({
    family: 'story.blocked',
    storyId: 'STORY-1',
    reason: 'authorization-denied',
    diagnostics: { evidenceResult: { credential: 42 } },
  });
  manager.recordEvent({ family: 'run.stopped', reason: 'work-item-blocked', checkpoint: 'after:STORY-1' });
  await manager.finalize('failure');
  const runDir = runDirFor(recordDir);

  const result = exportRun({ runDir });

  assert.strictEqual(result.status, 'refused');
  assert.ok(result.reason?.startsWith('redaction-export-posture-ambiguous:'));
  const audit = readFileSync(result.auditEventPath, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.ok(audit.some((event) => event.family === 'export.denied' && event.reason === result.reason));
});

test('export: withholds an event whose own posture object lacks a usable export value with a missing-export-posture reason', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();
  manager.init(plan(), config(recordDir), policy());
  manager.recordEvent({ family: 'run.started' });
  manager.recordEvent({ family: 'story.started', storyId: 'STORY-1' });
  manager.recordEvent({ family: 'story.done', storyId: 'STORY-1', changedFiles: [] });
  manager.recordEvent({ family: 'run.completed' });
  await manager.finalize('success');
  const runDir = runDirFor(recordDir);
  // A per-event posture object that carries the "export" key but not a string value takes the
  // event-level branch in postureForEvent (skipping the projection-level fallback entirely), so
  // the withheld reason must be "missing-export-posture" rather than "unsupported-export-posture".
  const eventsPath = join(runDir, 'events.jsonl');
  const lines = readFileSync(eventsPath, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const patched = lines.map((event) =>
    event.family === 'story.done' ? { ...event, posture: { export: null } } : event,
  );
  writeFileSync(eventsPath, `${patched.map((event) => JSON.stringify(event)).join('\n')}\n`);

  const result = exportRun({ runDir });

  assert.strictEqual(result.status, 'exported');
  const artifact = JSON.parse(readFileSync(result.artifactPath as string, 'utf8'));
  assert.ok(artifact.withheldEvents.some((event: { reason: string }) => event.reason === 'missing-export-posture'));
});

test('export: honors a custom outputDir instead of the default runDir/exports location', async () => {
  const recordDir = tempRecordDir();
  const outputDir = mkdtempSync(join(tmpdir(), 'jig-export-outdir-'));
  cleanupDirs.push(outputDir);
  const manager = new RecordManager();
  manager.init(plan(), config(recordDir), policy());
  manager.recordEvent({ family: 'run.started' });
  manager.recordEvent({ family: 'story.started', storyId: 'STORY-1' });
  manager.recordEvent({ family: 'story.done', storyId: 'STORY-1', changedFiles: [] });
  manager.recordEvent({ family: 'run.completed' });
  await manager.finalize('success');
  const runDir = runDirFor(recordDir);

  const result = exportRun({ runDir, outputDir });

  assert.strictEqual(result.status, 'exported');
  assert.ok(result.artifactPath?.startsWith(outputDir));
  assert.ok(existsSync(join(outputDir, 'export-audit.jsonl')));
  assert.ok(existsSync(join(runDir, 'exports', 'export-audit.jsonl')));
  assert.strictEqual(
    readFileSync(join(runDir, 'exports', 'export-audit.jsonl'), 'utf8'),
    readFileSync(join(outputDir, 'export-audit.jsonl'), 'utf8'),
  );
});

test('export: trailing-slash canonical outputDir does not duplicate the audit event', async () => {
  const recordDir = tempRecordDir();
  const manager = new RecordManager();
  manager.init(plan(), config(recordDir), policy());
  manager.recordEvent({ family: 'run.started' });
  manager.recordEvent({ family: 'story.started', storyId: 'STORY-1' });
  manager.recordEvent({ family: 'story.done', storyId: 'STORY-1', changedFiles: [] });
  manager.recordEvent({ family: 'run.completed' });
  await manager.finalize('success');
  const runDir = runDirFor(recordDir);

  const outputDir = `${join(runDir, 'exports')}/`;
  const result = exportRun({ runDir, outputDir });

  assert.strictEqual(result.status, 'exported');
  const auditLines = readFileSync(join(runDir, 'exports', 'export-audit.jsonl'), 'utf8')
    .trim()
    .split('\n');
  assert.strictEqual(auditLines.length, 1);
  assert.match(auditLines[0] ?? '', /"family":"export\.prepared"/);
});
