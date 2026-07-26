import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { normativeCorpusManifest } from './check-delivery-track.mjs';
import { APPROVED_ACTIVATION, verifyApprovedActivation } from './run-gf-002-tests.mjs';

const root = resolve(import.meta.dirname, '..');
const artifactDir = join(root, 'artifacts/gf-004');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const bounded = (value) => value.slice(0, 4096);

export const LOCAL_OBSERVATIONS = Object.freeze([
  Object.freeze({ id: 'targeted-gf004', classId: 'catalog', command: 'node', args: ['scripts/run-gf-004-tests.mjs'] }),
  Object.freeze({
    id: 'conformance-guard',
    classId: 'schema',
    command: 'node',
    args: ['scripts/check-gf-004-conformance.mjs'],
  }),
  Object.freeze({ id: 'typecheck', classId: 'typecheck', command: 'pnpm', args: ['typecheck'] }),
  Object.freeze({ id: 'boundaries', classId: 'boundaries', command: 'pnpm', args: ['boundaries:check'] }),
  Object.freeze({ id: 'git-diff-check', classId: 'git-diff-check', command: 'git', args: ['diff', '--check'] }),
  Object.freeze({ id: 'delivery', classId: 'adversarial', command: 'pnpm', args: ['delivery:check'] }),
  Object.freeze({ id: 'structure', classId: 'gate-totality', command: 'pnpm', args: ['structure:check'] }),
  Object.freeze({ id: 'full-pnpm-check', classId: 'full-pnpm-check', command: 'pnpm', args: ['check'] }),
]);

export function observeLocalCommands(run = spawnSync) {
  return LOCAL_OBSERVATIONS.map((definition, ordinal) => {
    const startedAt = new Date().toISOString();
    const outcome = run(definition.command, definition.args, { cwd: root, encoding: 'utf8', env: process.env });
    const stdout = outcome.stdout ?? '';
    const stderr = outcome.stderr ?? '';
    const exitCode = outcome.error ? null : outcome.status;
    const observation = {
      id: definition.id,
      classId: definition.classId,
      ordinal,
      command: definition.command,
      args: definition.args,
      startedAt,
      endedAt: new Date().toISOString(),
      exitCode,
      spawnError: outcome.error?.message ?? null,
      stdoutSha256: sha256(stdout),
      stderrSha256: sha256(stderr),
      stdoutSummary: bounded(stdout),
      stderrSummary: bounded(stderr),
      status: exitCode === 0 ? 'observed-pass' : 'observed-fail',
    };
    if (outcome.error || exitCode !== 0) throw new Error(`GF-004 local observation failed: ${definition.id}`);
    return Object.freeze(observation);
  });
}

export function verifyArtifactHashes(artifacts) {
  if (sha256(artifacts.resultsText) !== artifacts.receipt.resultsSha256) return 'results-hash';
  if (sha256(artifacts.observationsText) !== artifacts.receipt.observationsSha256) return 'observations-hash';
  if (sha256(artifacts.evidenceText) !== artifacts.receipt.evidenceSha256) return 'evidence-hash';
  return 'pass';
}

export function verifyFinalizationArtifacts({ resultsText, observationsText, evidenceText, receiptText, candidate }) {
  let results, observations, evidence, receipt;
  try {
    results = JSON.parse(resultsText);
    observations = JSON.parse(observationsText);
    evidence = JSON.parse(evidenceText);
    receipt = JSON.parse(receiptText);
  } catch {
    return 'malformed';
  }
  const hashes = verifyArtifactHashes({ resultsText, observationsText, evidenceText, receipt });
  if (hashes !== 'pass') return hashes;
  if (receipt.candidate?.commit !== candidate.commit || receipt.candidate?.tree !== candidate.tree) return 'candidate';
  if (evidence.candidate?.commit !== candidate.commit || evidence.candidate?.tree !== candidate.tree)
    return 'candidate';
  if (evidence.resultsSha256 !== receipt.resultsSha256 || evidence.observationsSha256 !== receipt.observationsSha256)
    return 'evidence-link';
  if (receipt.readback !== 'pass') return 'readback';
  if (JSON.stringify(results.classes) !== JSON.stringify(EVIDENCE_CONTRACT.requiredClasses)) return 'missing-class';
  if (!Array.isArray(observations.local) || observations.local.length !== LOCAL_OBSERVATIONS.length)
    return 'observation-count';
  for (const [ordinal, expected] of LOCAL_OBSERVATIONS.entries()) {
    const actual = observations.local[ordinal];
    if (
      !actual ||
      actual.ordinal !== ordinal ||
      actual.id !== expected.id ||
      actual.command !== expected.command ||
      JSON.stringify(actual.args) !== JSON.stringify(expected.args)
    )
      return 'observation-order';
    if (actual.exitCode !== 0 || actual.status !== 'observed-pass') return 'observation-exit';
  }
  if (
    !Array.isArray(observations.prePublication) ||
    observations.prePublication.some((item) => item.disposition !== 'pending-not-yet-applicable')
  )
    return 'hosted';
  if (
    JSON.stringify(results.candidate) !== JSON.stringify(candidate) ||
    JSON.stringify(results.runner) !== JSON.stringify(observations.local[0])
  )
    return 'results-link';
  return 'pass';
}

export const EVIDENCE_CONTRACT = Object.freeze({
  activation: APPROVED_ACTIVATION,
  targetMain: Object.freeze({
    ref: 'origin/main',
    commit: '17eff4f8b90576fb4d7f65f7cac8a3e6780041a9',
    tree: '490717847d3c496ed3616e7d2339021c3270d70b',
  }),
  integrationBase: Object.freeze({
    ref: 'feat/greenfield-phase-0-substrate',
    commit: '86c32022fe2ff1c3ebd8b8d22578fc9b4db08fa0',
    tree: '1e9434a9157b063ccf2aa3af1fc54d13278fa23f',
  }),
  predecessors: Object.freeze({
    gf001: Object.freeze({
      commit: '17eff4f8b90576fb4d7f65f7cac8a3e6780041a9',
      tree: '490717847d3c496ed3616e7d2339021c3270d70b',
    }),
    gf002: Object.freeze({
      candidate: '48794c07abe6996b17c10f9b12179347e3d88dbb',
      tree: '46a9217249f2ec5fb923bb59ddb8602074e4f3ac',
      integration: '816024def188ef7e8aaad2cb789d80e8fd8fa8eb',
    }),
    gf003: Object.freeze({
      candidate: '6bbcc4b52944e0dcd8f7ba01857f12df9d6ebe6e',
      tree: '1e9434a9157b063ccf2aa3af1fc54d13278fa23f',
      integration: '86c32022fe2ff1c3ebd8b8d22578fc9b4db08fa0',
    }),
  }),
  requiredClasses: Object.freeze([
    'catalog',
    'schema',
    'recorder',
    'gate-totality',
    'adversarial',
    'replay-crash-timeout',
    'typecheck',
    'boundaries',
    'git-diff-check',
    'full-pnpm-check',
  ]),
  prePublication: Object.freeze([
    { id: 'hosted-check', disposition: 'pending-not-yet-applicable' },
    { id: 'independent-review', disposition: 'pending-not-yet-applicable' },
  ]),
  localObservations: LOCAL_OBSERVATIONS,
});

export function verifyIntegrationBase(readGit = git, candidate = 'HEAD') {
  const base = EVIDENCE_CONTRACT.integrationBase;
  if (readGit('rev-parse', base.commit) !== base.commit || readGit('rev-parse', `${base.commit}^{tree}`) !== base.tree)
    throw new Error('GF-004 integration base mismatch');
  if (readGit('merge-base', candidate, base.commit) !== base.commit)
    throw new Error('GF-004 candidate merge base mismatch');
}

export function verifyEvidenceContract() {
  verifyApprovedActivation();
  const c = EVIDENCE_CONTRACT;
  if (
    git('rev-parse', c.targetMain.ref) !== c.targetMain.commit ||
    git('rev-parse', `${c.targetMain.ref}^{tree}`) !== c.targetMain.tree
  )
    throw new Error('GF-004 target main anchor mismatch');
  verifyIntegrationBase();
  for (const predecessor of [c.predecessors.gf002, c.predecessors.gf003])
    if (
      git('rev-parse', `${predecessor.candidate}^{tree}`) !== predecessor.tree ||
      git('rev-parse', `${predecessor.integration}^{tree}`) !== predecessor.tree
    )
      throw new Error('GF-004 predecessor tree equivalence mismatch');
  return c;
}

export function finalizeEvidence() {
  if (git('status', '--porcelain', '--untracked-files=no'))
    throw new Error('GF-004 finalization requires a clean tracked exact candidate checkout');
  const contract = verifyEvidenceContract();
  const normativeCorpus = normativeCorpusManifest(root);
  const track = JSON.parse(readFileSync(join(root, 'docs/delivery/greenfield/track.json'), 'utf8'));
  if (normativeCorpus.pathCount !== 67 || normativeCorpus.digest !== track.baseline.normative_manifest_sha256)
    throw new Error('GF-004 normative corpus mismatch');
  const candidate = { commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}') };
  const local = observeLocalCommands();
  const observations = {
    schemaVersion: 2,
    subject: 'GF-004',
    candidate,
    local,
    prePublication: contract.prePublication,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      packageJsonSha256: sha256(readFileSync(join(root, 'package.json'))),
      workspaceSha256: sha256(readFileSync(join(root, 'pnpm-workspace.yaml'))),
    },
  };
  const results = {
    schemaVersion: 2,
    subject: 'GF-004',
    candidate,
    runner: local[0],
    classes: contract.requiredClasses,
  };
  const resultsText = json(results);
  const observationsText = json(observations);
  const fixture = readFileSync(join(root, 'tests/fixtures/gf-004/oracle.json'));
  const oracle = JSON.parse(fixture);
  const evidence = {
    schemaVersion: 3,
    subject: 'GF-004',
    activation: contract.activation,
    targetMain: contract.targetMain,
    integrationBase: contract.integrationBase,
    predecessors: contract.predecessors,
    candidate,
    mergeBase: git('merge-base', candidate.commit, contract.integrationBase.commit),
    normativeCorpus,
    harness: {
      sourceSha256: sha256(readFileSync(join(root, 'packages/conformance/src/index.ts'))),
      testSha256: sha256(readFileSync(join(root, 'tests/gf-004/conformance.test.mjs'))),
      oracleFixtureSha256: sha256(fixture),
      catalog: oracle.catalog,
      routes: oracle.routes,
    },
    requiredClasses: contract.requiredClasses,
    resultsSha256: sha256(resultsText),
    observationsSha256: sha256(observationsText),
    prePublication: contract.prePublication,
  };
  const evidenceText = json(evidence);
  const receipt = {
    schemaVersion: 3,
    subject: 'GF-004',
    candidate,
    resultsSha256: sha256(resultsText),
    observationsSha256: sha256(observationsText),
    evidenceSha256: sha256(evidenceText),
    readback: 'pass',
  };
  const receiptText = json(receipt);
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(join(artifactDir, 'results.json'), resultsText);
  writeFileSync(join(artifactDir, 'observations.json'), observationsText);
  writeFileSync(join(artifactDir, 'evidence.json'), evidenceText);
  writeFileSync(join(artifactDir, 'finalization-receipt.json'), receiptText);
  const readback = {
    resultsText: readFileSync(join(artifactDir, 'results.json'), 'utf8'),
    observationsText: readFileSync(join(artifactDir, 'observations.json'), 'utf8'),
    evidenceText: readFileSync(join(artifactDir, 'evidence.json'), 'utf8'),
    receiptText: readFileSync(join(artifactDir, 'finalization-receipt.json'), 'utf8'),
    candidate,
  };
  const verdict = verifyFinalizationArtifacts(readback);
  if (verdict !== 'pass') throw new Error(`GF-004 evidence readback failed: ${verdict}`);
  return receipt;
}
if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) finalizeEvidence();
