import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(import.meta.dirname, '..');
const fixtureRoot = join(rootDir, 'tests', 'fixtures', 'gf-001-workspace');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function git(...args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
}

function digestTree(root, current = root) {
  const hash = createHash('sha256');
  function visit(directory) {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const name = relative(root, path);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`evidence input must not be a symlink: ${name}`);
      if (stat.isDirectory()) {
        hash.update(`directory:${name}\0`);
        visit(path);
      } else if (stat.isFile()) hash.update(`file:${name}\0${readFileSync(path)}\0`);
      else throw new Error(`evidence input has unsupported file type: ${name}`);
    }
  }
  visit(current);
  return hash.digest('hex');
}

const expectedObservationLabels = new Map([
  ['cold-isolated-cache', ['cold']],
  ['warm-local-cache', ['cold', 'warm']],
  ['affected-selection', ['affected', 'seed']],
  ['shared-compiler-config-invalidation', ['changed', 'cold', 'warm']],
  ['uncached-failure-isolation', ['failed']],
  ['package-script-invalidation', ['changed', 'cold', 'warm']],
]);

function decodeRawSummary(record) {
  if (typeof record?.rawSummaryBase64 !== 'string' || typeof record?.rawSummarySha256 !== 'string')
    throw new Error('GF-001 fixture evidence is missing a raw Turbo summary');
  const rawSummary = Buffer.from(record.rawSummaryBase64, 'base64').toString('utf8');
  if (sha256(rawSummary) !== record.rawSummarySha256)
    throw new Error('GF-001 fixture evidence has a tampered raw Turbo summary');
  const summary = JSON.parse(rawSummary);
  if (!Array.isArray(summary.tasks) || summary.tasks.length === 0)
    throw new Error('GF-001 fixture evidence contains an incomplete raw Turbo summary');
  return summary;
}

function getTask(summary, packageName) {
  const task = summary.tasks.find((entry) => entry.taskId === `@gf-001-fixture/${packageName}#build`);
  if (
    !task ||
    typeof task.hash !== 'string' ||
    typeof task.cache?.status !== 'string' ||
    typeof task.execution?.exitCode !== 'number'
  )
    throw new Error(`GF-001 fixture evidence lacks complete task data for ${packageName}`);
  return task;
}

function requireTaskStatus(summary, packageNames, cacheStatus) {
  for (const packageName of packageNames) {
    const task = getTask(summary, packageName);
    if (task.cache.status !== cacheStatus || task.execution.exitCode !== 0)
      throw new Error(`GF-001 fixture evidence does not prove ${packageName} ${cacheStatus}`);
  }
}

function requireExpectedScenario(name, summaries) {
  const labels = expectedObservationLabels.get(name);
  if (!labels || JSON.stringify(Object.keys(summaries).sort()) !== JSON.stringify(labels))
    throw new Error(`GF-001 fixture evidence has an unexpected or incomplete scenario: ${name}`);
  const parsed = Object.fromEntries(
    Object.entries(summaries).map(([label, record]) => [label, decodeRawSummary(record)]),
  );
  if (name === 'cold-isolated-cache') requireTaskStatus(parsed.cold, ['pkg-a', 'pkg-b', 'pkg-c'], 'MISS');
  if (name === 'warm-local-cache') requireTaskStatus(parsed.warm, ['pkg-a', 'pkg-b', 'pkg-c'], 'HIT');
  if (name === 'affected-selection') {
    requireTaskStatus(parsed.affected, ['pkg-a', 'pkg-b'], 'MISS');
    if (parsed.affected.tasks.length !== 2) throw new Error('GF-001 affected selection includes an unrelated task');
  }
  if (name === 'shared-compiler-config-invalidation')
    requireTaskStatus(parsed.changed, ['pkg-a', 'pkg-b', 'pkg-c'], 'MISS');
  if (name === 'uncached-failure-isolation') {
    if (getTask(parsed.failed, 'pkg-a').execution.exitCode === 0)
      throw new Error('GF-001 intended failure did not fail');
    requireTaskStatus(parsed.failed, ['pkg-c'], 'MISS');
  }
  if (name === 'package-script-invalidation') requireTaskStatus(parsed.changed, ['pkg-c'], 'MISS');
}

function requireExactFixtureEvidence({ fixtureEvidence, fixtureResults, candidate, tree, mergeBase }) {
  if (
    fixtureResults.schemaVersion !== 2 ||
    fixtureResults.subject !== 'GF-001' ||
    fixtureResults.exitCode !== 0 ||
    typeof fixtureResults.fixtureEvidenceSha256 !== 'string'
  )
    throw new Error('GF-001 fixture results are invalid or non-passing; evidence must fail closed');
  if (
    fixtureEvidence.schemaVersion !== 1 ||
    fixtureEvidence.subject !== 'GF-001' ||
    fixtureEvidence.candidate?.commit !== candidate ||
    fixtureEvidence.candidate?.tree !== tree ||
    fixtureEvidence.base?.mergeBase !== mergeBase ||
    fixtureEvidence.fixture?.inputTreeSha256 !== digestTree(fixtureRoot) ||
    fixtureEvidence.fixture?.lockfileSha256 !== sha256(readFileSync(join(fixtureRoot, 'pnpm-lock.yaml'))) ||
    !Array.isArray(fixtureEvidence.observations) ||
    fixtureEvidence.observations.length !== expectedObservationLabels.size
  )
    throw new Error('GF-001 fixture evidence is stale, incomplete, or not bound to the exact candidate');
  const names = fixtureEvidence.observations.map((observation) => observation?.name).sort();
  if (JSON.stringify(names) !== JSON.stringify([...expectedObservationLabels.keys()].sort()))
    throw new Error('GF-001 fixture evidence is missing an expected scenario');
  for (const observation of fixtureEvidence.observations)
    requireExpectedScenario(observation.name, observation.summaries);
  const manifest = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
  const expectedToolchain = {
    turbo: manifest.devDependencies.turbo,
    typescript: manifest.devDependencies.typescript,
    pnpm: manifest.packageManager.replace(/^pnpm@/, ''),
  };
  if (JSON.stringify(fixtureEvidence.toolchain) !== JSON.stringify(expectedToolchain))
    throw new Error('GF-001 fixture evidence does not prove the pinned host toolchain');
}

export function writeEvidence({ outputPath, fixtureResultsPath, fixtureEvidencePath, requireClean = true } = {}) {
  const resultsPath = fixtureResultsPath ?? join(rootDir, 'artifacts', 'gf-001', 'fixture-results.json');
  const evidencePath = fixtureEvidencePath ?? join(rootDir, 'artifacts', 'gf-001', 'fixture-evidence.json');
  if (!existsSync(resultsPath))
    throw new Error('GF-001 fixture results are missing; run pnpm test before writing evidence');
  if (!existsSync(evidencePath))
    throw new Error('GF-001 fixture evidence is missing; run pnpm test before writing evidence');
  const fixtureResults = JSON.parse(readFileSync(resultsPath, 'utf8'));
  const base = git('rev-parse', 'origin/main');
  const candidate = git('rev-parse', 'HEAD');
  const tree = git('rev-parse', 'HEAD^{tree}');
  const mergeBase = git('merge-base', 'HEAD', 'origin/main');
  if (requireClean && git('status', '--porcelain', '--untracked-files=no'))
    throw new Error('GF-001 evidence must be written from a clean candidate checkout');
  const fixtureEvidenceText = readFileSync(evidencePath, 'utf8');
  const fixtureEvidence = JSON.parse(fixtureEvidenceText);
  requireExactFixtureEvidence({ fixtureEvidence, fixtureResults, candidate, tree, mergeBase });
  if (fixtureResults.fixtureEvidenceSha256 !== sha256(fixtureEvidenceText))
    throw new Error('GF-001 fixture result hash does not match the retained fixture evidence');
  const evidence = {
    schemaVersion: 1,
    subject: 'GF-001',
    consumer: { nextStory: 'GF-004', contract: 'exact-subject evidence input; no conformance result is implied' },
    candidate: { commit: candidate, tree },
    base: {
      ref: 'origin/main',
      commit: base,
      tree: git('rev-parse', 'origin/main^{tree}'),
      mergeBase,
    },
    toolchain: {
      node: process.version,
      pnpm: execFileSync('pnpm', ['--version'], { cwd: rootDir, encoding: 'utf8' }).trim(),
      packageJsonSha256: sha256(readFileSync(join(rootDir, 'package.json'))),
      lockfileSha256: sha256(readFileSync(join(rootDir, 'pnpm-lock.yaml'))),
      workspaceConfigSha256: sha256(readFileSync(join(rootDir, 'pnpm-workspace.yaml'))),
    },
    taskDefinitions: {
      turboJsonSha256: sha256(readFileSync(join(rootDir, 'turbo.json'))),
      tsconfigBaseSha256: sha256(readFileSync(join(rootDir, 'tsconfig.base.json'))),
    },
    fixture: {
      inputTreeSha256: digestTree(fixtureRoot),
      resultReport: fixtureResults,
      evidenceSha256: fixtureResults.fixtureEvidenceSha256,
      observations: fixtureEvidence.observations,
    },
    verificationEnvironment: {
      platform: process.platform,
      arch: process.arch,
      ci: process.env.CI === 'true',
      remoteCache: 'disabled and isolated by the fixture harness',
    },
  };
  const destination = outputPath ?? join(rootDir, 'artifacts', 'gf-001', 'evidence.json');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) writeEvidence();
