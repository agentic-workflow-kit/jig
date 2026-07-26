import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { writeEvidence } from './write-gf-002-evidence.mjs';

const rootDir = resolve(import.meta.dirname, '..');
const artifactDir = join(rootDir, 'artifacts', 'gf-002');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
if (git('status', '--porcelain', '--untracked-files=no'))
  throw new Error('GF-002 finalization requires a clean tracked candidate checkout');

function observe(id, command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8', env });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0 || result.signal || result.error)
    throw new Error(`GF-002 required observation failed: ${id}`);
  return { id, command: [command, ...args].join(' '), status: 'pass' };
}

const required = [
  observe('targeted-tests', process.execPath, ['scripts/run-gf-002-tests.mjs']),
  observe('typecheck', 'pnpm', ['typecheck']),
  observe('boundaries', 'pnpm', ['boundaries:check']),
  observe('git-diff-check', 'git', ['diff', '--check']),
  observe('full-pnpm-check', 'pnpm', ['check'], { ...process.env, JIG_NESTED_VERIFICATION: '1' }),
  { id: 'evidence-readback', command: 'node scripts/write-gf-002-evidence.mjs', status: 'pass' },
];
const resultsText = readFileSync(join(artifactDir, 'results.json'), 'utf8');
const results = JSON.parse(resultsText);
const observations = {
  schemaVersion: 1,
  subject: 'GF-002',
  candidate: results.candidate,
  base: results.base,
  required,
  prePublication: [
    { id: 'hosted-check', disposition: 'pending-not-yet-applicable' },
    { id: 'independent-review', disposition: 'pending-not-yet-applicable' },
  ],
};
mkdirSync(artifactDir, { recursive: true });
const observationsText = `${JSON.stringify(observations, null, 2)}\n`;
writeFileSync(join(artifactDir, 'observations.json'), observationsText);
const evidence = writeEvidence();
const evidenceText = readFileSync(join(artifactDir, 'evidence.json'), 'utf8');
const receipt = {
  schemaVersion: 1,
  subject: 'GF-002',
  candidate: results.candidate,
  observationsSha256: sha256(observationsText),
  evidenceSha256: sha256(evidenceText),
  resultsSha256: evidence.results.sha256,
  evidenceReadback: 'pass',
};
writeFileSync(join(artifactDir, 'finalization-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
const persisted = JSON.parse(readFileSync(join(artifactDir, 'finalization-receipt.json'), 'utf8'));
if (persisted.evidenceSha256 !== sha256(evidenceText) || persisted.resultsSha256 !== sha256(resultsText))
  throw new Error('GF-002 finalization receipt readback failed');
