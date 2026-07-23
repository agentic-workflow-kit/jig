import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(import.meta.dirname, '..');
const resultsPath = join(rootDir, 'artifacts', 'gf-002', 'results.json');
const observationsPath = join(rootDir, 'artifacts', 'gf-002', 'observations.json');
const vectorsPath = join(rootDir, 'tests', 'fixtures', 'gf-002', 'vectors.json');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function git(...args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
}

export function writeEvidence({ outputPath, requireClean = true } = {}) {
  if (!existsSync(resultsPath)) throw new Error('GF-002 results are missing; run pnpm test before writing evidence');
  const resultsText = readFileSync(resultsPath, 'utf8');
  const results = JSON.parse(resultsText);
  if (
    results.schemaVersion !== 2 ||
    results.subject !== 'GF-002' ||
    results.exitCode !== 0 ||
    typeof results.stdoutSha256 !== 'string' ||
    typeof results.stderrSha256 !== 'string'
  )
    throw new Error('GF-002 results are incomplete or non-passing; evidence must fail closed');
  if (requireClean && git('status', '--porcelain', '--untracked-files=no'))
    throw new Error('GF-002 evidence must be written from a clean candidate checkout');
  if (!existsSync(observationsPath))
    throw new Error('GF-002 observations are missing; finalize after clean candidate verification');
  const observationsText = readFileSync(observationsPath, 'utf8');
  const observations = JSON.parse(observationsText);
  if (
    observations.schemaVersion !== 1 ||
    observations.candidate?.commit !== results.candidate?.commit ||
    observations.candidate?.tree !== results.candidate?.tree ||
    observations.required?.some((observation) => observation.status !== 'pass') ||
    observations.prePublication?.some((observation) => observation.disposition !== 'pending-not-yet-applicable')
  )
    throw new Error('GF-002 observations are incomplete, stale, or claim unavailable pre-publication checks');

  const vectorsText = readFileSync(vectorsPath, 'utf8');
  const vectors = JSON.parse(vectorsText);
  if (
    vectors.schemaVersion !== 1 ||
    vectors.frameVersion !== 'jig.codec.v1' ||
    !vectors.identities ||
    Object.keys(vectors.identities).length !== 22
  )
    throw new Error('GF-002 vectors are incomplete or use an unknown frame version');

  const candidate = git('rev-parse', 'HEAD');
  const tree = git('rev-parse', 'HEAD^{tree}');
  const base = git('rev-parse', 'origin/main');
  const baseTree = git('rev-parse', 'origin/main^{tree}');
  const mergeBase = git('merge-base', 'HEAD', 'origin/main');
  if (
    results.candidate?.commit !== candidate ||
    results.candidate?.tree !== tree ||
    results.base?.commit !== base ||
    results.base?.tree !== baseTree ||
    results.base?.mergeBase !== mergeBase
  )
    throw new Error('GF-002 results are not bound to the exact candidate and execution base');
  if (
    !Array.isArray(results.requiredClassSet) ||
    results.requiredClassSet.length === 0 ||
    !results.activation?.recordUrl ||
    results.activation?.approvedDeliveryPackage?.q?.digest !==
      '27f879b8852e4137c16a9c6ee8a41decae5a62e1b07fd7b8e165211d491ede72'
  )
    throw new Error('GF-002 results omit required-class or activation bindings');
  const evidence = {
    schemaVersion: 1,
    subject: 'GF-002',
    activation: results.activation,
    candidate: results.candidate,
    base: results.base,
    codec: {
      packageJsonSha256: sha256(readFileSync(join(rootDir, 'packages', 'codec', 'package.json'))),
      sourceSha256: sha256(readFileSync(join(rootDir, 'packages', 'codec', 'src', 'index.ts'))),
      frameVersion: vectors.frameVersion,
      numericDomain: 'signed-safe-integer; decimal, exponent, and negative-zero spellings reject',
    },
    vectors: {
      sha256: sha256(vectorsText),
      schemaVersion: vectors.schemaVersion,
      identityCount: Object.keys(vectors.identities).length,
    },
    results: { sha256: sha256(resultsText), ...results },
    observations: { sha256: sha256(observationsText), ...observations },
  };
  const destination = outputPath ?? join(rootDir, 'artifacts', 'gf-002', 'evidence.json');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`);
  const persisted = JSON.parse(readFileSync(destination, 'utf8'));
  if (persisted.results?.sha256 !== sha256(resultsText) || persisted.observations?.sha256 !== sha256(observationsText))
    throw new Error('GF-002 evidence readback does not bind the exact results bytes');
  return evidence;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) writeEvidence();
