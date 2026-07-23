import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const startedAt = new Date().toISOString();
const testFiles = readdirSync(join(rootDir, 'tests', 'gf-001'))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => join('tests', 'gf-001', name));
const command = [process.execPath, '--test', '--test-concurrency=1', ...testFiles];
const result = spawnSync(command[0], command.slice(1), { cwd: rootDir, encoding: 'utf8' });
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');

const outputDir = join(rootDir, 'artifacts', 'gf-001');
mkdirSync(outputDir, { recursive: true });
const fixtureEvidencePath = join(outputDir, 'fixture-evidence.json');
const fixtureEvidence = existsSync(fixtureEvidencePath) ? readFileSync(fixtureEvidencePath, 'utf8') : null;
const report = {
  schemaVersion: 2,
  subject: 'GF-001',
  command: 'node --test tests/gf-001',
  startedAt,
  finishedAt: new Date().toISOString(),
  exitCode: result.status ?? 1,
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
if (result.error) throw result.error;
if (result.status === 0 && fixtureEvidence === null)
  throw new Error('GF-001 fixture tests passed without producing fixture-evidence.json');
if (result.status !== 0) process.exitCode = result.status ?? 1;
