import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normativeCorpusManifest } from './check-delivery-track.mjs';
import { APPROVED_ACTIVATION, verifyApprovedActivation } from './run-gf-002-tests.mjs';

const rootDir = resolve(import.meta.dirname, '..');
const artifactDir = join(rootDir, 'artifacts/gf-003');
const git = (...args) => execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
const isAncestor = (ancestor, descendant) =>
  spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd: rootDir }).status === 0;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export const EVIDENCE_CONTRACT = Object.freeze({
  activation: Object.freeze({
    recordUrl: 'https://github.com/agentic-workflow-kit/jig/issues/107',
    approvedPackage: APPROVED_ACTIVATION.approvedDeliveryPackage,
    landingEquivalence: APPROVED_ACTIVATION.landingEquivalence,
    planningProvenance: APPROVED_ACTIVATION.planningProvenance,
  }),
  targetMain: Object.freeze({
    ref: 'origin/main',
    commit: '17eff4f8b90576fb4d7f65f7cac8a3e6780041a9',
    tree: '490717847d3c496ed3616e7d2339021c3270d70b',
  }),
  integrationBase: Object.freeze({
    ref: 'feat/greenfield-phase-0-substrate',
    commit: '816024def188ef7e8aaad2cb789d80e8fd8fa8eb',
    tree: '46a9217249f2ec5fb923bb59ddb8602074e4f3ac',
  }),
  landed: Object.freeze({
    candidate: '6bbcc4b52944e0dcd8f7ba01857f12df9d6ebe6e',
    tree: '1e9434a9157b063ccf2aa3af1fc54d13278fa23f',
    integration: '86c32022fe2ff1c3ebd8b8d22578fc9b4db08fa0',
  }),
  predecessors: Object.freeze({
    gf001: Object.freeze({
      pr: 'https://github.com/agentic-workflow-kit/jig/pull/106',
      commit: '17eff4f8b90576fb4d7f65f7cac8a3e6780041a9',
    }),
    gf002: Object.freeze({
      candidate: Object.freeze({
        commit: '48794c07abe6996b17c10f9b12179347e3d88dbb',
        tree: '46a9217249f2ec5fb923bb59ddb8602074e4f3ac',
      }),
      integration: Object.freeze({
        commit: '816024def188ef7e8aaad2cb789d80e8fd8fa8eb',
        tree: '46a9217249f2ec5fb923bb59ddb8602074e4f3ac',
      }),
    }),
  }),
  requiredClasses: Object.freeze([
    'targeted-tests',
    'runtime-topology',
    'typecheck',
    'boundaries',
    'git-diff-check',
    'full-pnpm-check',
  ]),
  prePublication: Object.freeze([
    Object.freeze({ id: 'hosted-check', disposition: 'pending-not-yet-applicable' }),
    Object.freeze({ id: 'independent-review', disposition: 'pending-not-yet-applicable' }),
  ]),
});

export function verifyEvidenceContract() {
  verifyApprovedActivation();
  const contract = EVIDENCE_CONTRACT;
  if (
    git('rev-parse', `${contract.targetMain.ref}`) !== contract.targetMain.commit ||
    git('rev-parse', `${contract.targetMain.ref}^{tree}`) !== contract.targetMain.tree
  )
    throw new Error('GF-003 target-main anchor does not resolve to its exact immutable tuple');
  if (
    git('rev-parse', contract.integrationBase.commit) !== contract.integrationBase.commit ||
    git('rev-parse', `${contract.integrationBase.commit}^{tree}`) !== contract.integrationBase.tree
  )
    throw new Error('GF-003 historical integration base does not resolve to its exact immutable tuple');
  if (
    git('rev-parse', `${contract.landed.candidate}^{tree}`) !== contract.landed.tree ||
    git('rev-parse', `${contract.landed.integration}^{tree}`) !== contract.landed.tree
  )
    throw new Error('GF-003 landed candidate and integration trees do not preserve exact equality');
  const head = git('rev-parse', 'HEAD');
  if (head === contract.landed.candidate) {
    if (git('merge-base', head, contract.integrationBase.commit) !== contract.integrationBase.commit)
      throw new Error('GF-003 exact candidate merge-base does not equal the historical integration base');
  } else if (!isAncestor(contract.landed.integration, head)) {
    throw new Error('GF-003 downstream candidate does not contain the exact landed integration commit');
  }
  if (
    git('rev-parse', `${contract.predecessors.gf002.candidate.commit}^{tree}`) !==
      contract.predecessors.gf002.candidate.tree ||
    contract.predecessors.gf002.integration.tree !== contract.integrationBase.tree
  )
    throw new Error('GF-003 GF-002 candidate and squash integration trees do not preserve exact equality');
  return contract;
}

function observe(id, command, args) {
  const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8' });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0 || result.signal || result.error)
    throw new Error(`GF-003 required observation failed: ${id}`);
  return Object.freeze({ id, command: [command, ...args].join(' '), status: 'pass' });
}

function changedPaths() {
  return git('diff', '--name-only', EVIDENCE_CONTRACT.integrationBase.commit, 'HEAD')
    .split('\n')
    .filter(Boolean)
    .sort();
}

export function finalizeEvidence() {
  if (git('status', '--porcelain', '--untracked-files=no'))
    throw new Error('GF-003 finalization requires a clean tracked exact candidate checkout');
  const contract = verifyEvidenceContract();
  const required = [
    observe('targeted-tests', process.execPath, ['scripts/run-gf-003-tests.mjs']),
    observe('runtime-topology', 'pnpm', ['runtime:check']),
    observe('typecheck', 'pnpm', ['typecheck']),
    observe('boundaries', 'pnpm', ['boundaries:check']),
    observe('git-diff-check', 'git', ['diff', '--check']),
    observe('full-pnpm-check', 'pnpm', ['check']),
  ];
  const resultsText = readFileSync(join(artifactDir, 'results.json'), 'utf8');
  const results = JSON.parse(resultsText);
  const candidate = { commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}') };
  const observedMergeBase = git('merge-base', candidate.commit, contract.integrationBase.commit);
  if (observedMergeBase !== contract.integrationBase.commit)
    throw new Error('GF-003 observed merge-base no longer equals integration base');
  const track = JSON.parse(readFileSync(join(rootDir, 'docs/delivery/greenfield/track.json'), 'utf8'));
  const normativeCorpus = normativeCorpusManifest(rootDir);
  if (normativeCorpus.pathCount !== 67 || normativeCorpus.digest !== track.baseline?.normative_manifest_sha256)
    throw new Error('GF-003 current normative corpus does not match the approved 67-file provenance manifest');
  if (
    results.exitCode !== 0 ||
    results.candidate?.commit !== candidate.commit ||
    results.candidate?.tree !== candidate.tree
  )
    throw new Error('GF-003 results are not a passing observation of the exact candidate');
  const observations = {
    schemaVersion: 1,
    subject: 'GF-003',
    candidate,
    required,
    prePublication: contract.prePublication,
  };
  const observationsText = `${JSON.stringify(observations, null, 2)}\n`;
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(join(artifactDir, 'observations.json'), observationsText);
  const evidence = {
    schemaVersion: 2,
    subject: 'GF-003',
    activation: contract.activation,
    targetMain: contract.targetMain,
    integrationBase: contract.integrationBase,
    mergeBase: {
      candidate: candidate.commit,
      integrationBase: contract.integrationBase.commit,
      observed: observedMergeBase,
      equality: 'pass',
    },
    normativeCorpus: {
      ...normativeCorpus,
      provenance: { commit: track.baseline.passing_subject_commit, tree: track.baseline.passing_subject_tree },
      candidate: candidate.tree,
      byteIdenticalToPassingSubject: 'pass',
    },
    predecessors: contract.predecessors,
    candidate: { ...candidate, ownedChangedPaths: changedPaths() },
    topology: results.topology,
    fakes: results.fakes,
    codec: results.codec,
    deniedEdgeCorpus: results.deniedEdgeCorpus,
    requiredClasses: contract.requiredClasses,
    toolchain: results.toolchain,
    environment: results.environment,
    results: { sha256: sha256(resultsText), ...results },
    observations: { sha256: sha256(observationsText), ...observations },
  };
  const evidenceText = `${JSON.stringify(evidence, null, 2)}\n`;
  writeFileSync(join(artifactDir, 'evidence.json'), evidenceText);
  const receipt = {
    schemaVersion: 2,
    subject: 'GF-003',
    candidate,
    mergeBase: evidence.mergeBase,
    normativeCorpus: {
      pathCount: normativeCorpus.pathCount,
      digest: normativeCorpus.digest,
      byteIdenticalToPassingSubject: 'pass',
    },
    resultsSha256: sha256(resultsText),
    observationsSha256: sha256(observationsText),
    evidenceSha256: sha256(evidenceText),
    evidenceReadback: 'pass',
  };
  const receiptText = `${JSON.stringify(receipt, null, 2)}\n`;
  writeFileSync(join(artifactDir, 'finalization-receipt.json'), receiptText);
  if (
    sha256(readFileSync(join(artifactDir, 'evidence.json'), 'utf8')) !== receipt.evidenceSha256 ||
    sha256(readFileSync(join(artifactDir, 'observations.json'), 'utf8')) !== receipt.observationsSha256 ||
    sha256(readFileSync(join(artifactDir, 'results.json'), 'utf8')) !== receipt.resultsSha256
  )
    throw new Error('GF-003 finalization receipt readback failed');
  return receipt;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) finalizeEvidence();
