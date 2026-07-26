import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const startedAt = new Date().toISOString();
const fixtureHarness = join('tests', 'gf-001', 'workspace-substrate.test.mjs');
const evidenceContract = join('tests', 'gf-001', 'evidence.test.mjs');
// biome-ignore lint/suspicious/noUndeclaredEnvVars: finalizers set this only for their nested full-check observation.
const nestedVerification = process.env.JIG_NESTED_VERIFICATION === '1';
const nestedTempDir = nestedVerification ? mkdtempSync(join(tmpdir(), 'jig-gf-001-nested-')) : undefined;

function runTestFile(testFile) {
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', testFile], {
    cwd: rootDir,
    encoding: 'utf8',
    env: nestedTempDir === undefined ? process.env : { ...process.env, TMPDIR: nestedTempDir },
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  return result;
}

let results;
try {
  results = [runTestFile(fixtureHarness)];
  if (results[0].status === 0 && !results[0].error) results.push(runTestFile(evidenceContract));
} finally {
  if (nestedTempDir !== undefined) rmSync(nestedTempDir, { recursive: true, force: true });
}
const result = {
  error: results.find((entry) => entry.error)?.error ?? null,
  signal: results.find((entry) => entry.signal)?.signal ?? null,
  status: results.find((entry) => entry.status !== 0)?.status ?? 0,
  stderr: results.map((entry) => entry.stderr ?? '').join(''),
  stdout: results.map((entry) => entry.stdout ?? '').join(''),
};

const exitCode = result.signal === null ? (result.status ?? 1) : 1;
if (!nestedVerification) {
  const outputDir = join(rootDir, 'artifacts', 'gf-001');
  mkdirSync(outputDir, { recursive: true });
  const fixtureEvidencePath = join(outputDir, 'fixture-evidence.json');
  const fixtureEvidence = existsSync(fixtureEvidencePath) ? readFileSync(fixtureEvidencePath, 'utf8') : null;
  const report = {
    schemaVersion: 2,
    subject: 'GF-001',
    command: 'node --test tests/gf-001/workspace-substrate.test.mjs then evidence.test.mjs',
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode,
    signal: result.signal,
    stdoutSha256: createHash('sha256')
      .update(result.stdout ?? '')
      .digest('hex'),
    stderrSha256: createHash('sha256')
      .update(result.stderr ?? '')
      .digest('hex'),
    fixtureEvidenceSha256: fixtureEvidence === null ? null : createHash('sha256').update(fixtureEvidence).digest('hex'),
  };
  writeFileSync(join(outputDir, 'fixture-results.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (result.status === 0 && fixtureEvidence === null)
    throw new Error('GF-001 fixture tests passed without producing fixture-evidence.json');
}
if (result.error) throw result.error;
if (exitCode !== 0) process.exitCode = exitCode;
