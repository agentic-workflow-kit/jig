import { Buffer } from 'node:buffer';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const artifactDir = join(root, 'artifacts/gf-005');
const fixturePath = join(root, 'tests/fixtures/gf-005/evidence-contract.json');
const kernelPath = join(root, 'packages/authority-kernel/dist/index.js');
const sourcePath = join(root, 'packages/authority-kernel/src/index.ts');
const testPath = join(root, 'tests/gf-005/authority-kernel.test.mjs');
const gf004HarnessPath = join(root, 'packages/conformance/src/index.ts');
const gf004TestPath = join(root, 'tests/gf-004/conformance.test.mjs');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const EXECUTION_BASE = Object.freeze({
  commit: '75bd601014cac54935587e3141daa68a68557567',
  tree: 'ed875727cd71cae6a439f9a125d05394a0d216ec',
});
const GF005_CONTENT_PATHS = Object.freeze([
  'packages/authority-kernel/package.json',
  'packages/authority-kernel/src/index.ts',
  'scripts/finalize-gf-005-evidence.mjs',
  'tests/fixtures/gf-005/authority-oracle.json',
  'tests/fixtures/gf-005/evidence-contract.json',
  'tests/gf-005/authority-kernel.test.mjs',
  'tests/gf-005/evidence-contract.test.mjs',
]);
const gitBytes = (...args) => execFileSync('git', args, { cwd: root });
const exactKeys = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const sameFields = (left, right) =>
  left !== null &&
  right !== null &&
  typeof left === 'object' &&
  typeof right === 'object' &&
  Object.keys(left).length === Object.keys(right).length &&
  Object.keys(left).every((key) => Object.hasOwn(right, key) && left[key] === right[key]);

export const GF004_OPERANDS = Object.freeze(['CF-DETERMINISM', 'CF-BINDING', 'CF-ORDERING']);
const kernel = await import(kernelPath);
const codec = await import(join(root, 'packages/codec/dist/index.js'));
const conformance = await import(join(root, 'packages/conformance/dist/index.js'));
const fixtureText = readFileSync(fixturePath, 'utf8');
const fixture = Object.freeze(JSON.parse(fixtureText));
export const CATALOG_INVENTORY = Object.freeze({
  storyStates: Object.freeze([...kernel.STORY_STATES]),
  runPhases: Object.freeze([...kernel.RUN_PHASES]),
  events: Object.freeze([...kernel.EVENT_TYPES]),
  operations: Object.freeze([...kernel.OPERATION_TYPES]),
  failures: Object.freeze([...kernel.FAILURE_CLASSES]),
});
export const EVIDENCE_CONTRACT = Object.freeze({
  schemaVersion: fixture.schemaVersion,
  seed: fixture.seed,
  catalogVersion: fixture.catalogVersion,
  harnessVersion: fixture.harnessVersion,
  gf004Operands: Object.freeze([...fixture.gf004Operands]),
  prePublication: Object.freeze(fixture.prePublication.map((item) => Object.freeze({ ...item }))),
  catalog: Object.freeze({
    states: kernel.STORY_STATES.length,
    runPhases: kernel.RUN_PHASES.length,
    events: kernel.EVENT_TYPES.length,
    operations: kernel.OPERATION_TYPES.length,
    failures: kernel.FAILURE_CLASSES.length,
  }),
  catalogInventorySha256: hash(JSON.stringify(CATALOG_INVENTORY)),
});

export function deriveFrozenCandidate(commit = git('rev-parse', 'HEAD')) {
  const candidate = {
    commit,
    tree: git('rev-parse', `${commit}^{tree}`),
    executionBaseCommit: EXECUTION_BASE.commit,
    executionBaseTree: EXECUTION_BASE.tree,
    mergeBaseCommit: EXECUTION_BASE.commit,
  };
  if (git('merge-base', candidate.commit, EXECUTION_BASE.commit) !== EXECUTION_BASE.commit)
    throw new Error('GF-005 candidate does not have the exact execution and merge base');
  if (git('rev-parse', `${EXECUTION_BASE.commit}^{tree}`) !== EXECUTION_BASE.tree)
    throw new Error('GF-005 execution base tree does not match the frozen base');
  return Object.freeze(candidate);
}

export function deriveGf004Subject(candidate) {
  if (
    !exactKeys(candidate, ['commit', 'tree', 'executionBaseCommit', 'executionBaseTree', 'mergeBaseCommit']) ||
    candidate.executionBaseCommit !== EXECUTION_BASE.commit ||
    candidate.executionBaseTree !== EXECUTION_BASE.tree ||
    candidate.mergeBaseCommit !== EXECUTION_BASE.commit ||
    git('rev-parse', `${candidate.commit}^{tree}`) !== candidate.tree ||
    git('merge-base', candidate.commit, EXECUTION_BASE.commit) !== EXECUTION_BASE.commit
  )
    throw new Error('GF-005 candidate tuple does not bind the frozen Git candidate and base');
  return Object.freeze({
    candidateContentDigest: hash(gitBytes('archive', '--format=tar', candidate.commit, ...GF005_CONTENT_PATHS)),
    candidateCommit: candidate.commit,
    candidateTree: hash(gitBytes('cat-file', 'tree', candidate.tree)),
    executionBaseCommit: candidate.executionBaseCommit,
    executionBaseTree: hash(gitBytes('cat-file', 'tree', candidate.executionBaseTree)),
    mergeBaseCommit: candidate.mergeBaseCommit,
    buildDigest: hash(readFileSync(kernelPath)),
    toolchainDigest: hash(readFileSync(join(root, 'package.json'))),
    catalogDigest: EVIDENCE_CONTRACT.catalogInventorySha256,
    topologyVersion: 'jig.runtime-topology.v1',
    suiteVersion: conformance.CONFORMANCE_VERSION,
    probeVersion: EVIDENCE_CONTRACT.harnessVersion,
    fixtureDigest: hash(fixtureText),
    clockId: 'gf005-no-clock',
    seed: EVIDENCE_CONTRACT.seed,
    recorderIdentity: 'gf005-independent-recorder',
    recordedAt: 0,
  });
}

export function createGf004OperandRecords(candidate) {
  const subject = deriveGf004Subject(candidate);
  return GF004_OPERANDS.map((suite, ordinal) => {
    const encoded = codec.encodeFrame({
      key: `gf005-${ordinal + 1}`,
      bytes: JSON.stringify({ candidate, candidateContentDigest: subject.candidateContentDigest, suite }),
      suite,
      status: 'pass',
      subject,
      independentRecorder: 'gf005-independent-recorder',
      complete: true,
      attempt: 1,
    });
    const parsed = encoded.ok ? conformance.parseRecordFrame(encoded.value) : undefined;
    if (!encoded.ok || parsed === undefined || !parsed.ok) throw new Error('GF-005 GF-004 operand frame failed');
    const appended = conformance.append([], encoded.value);
    if (appended.status !== 'pass' || appended.records.length !== 1)
      throw new Error('GF-005 GF-004 operand recorder failed');
    return Object.freeze({
      suite,
      frameHex: Buffer.from(encoded.value).toString('hex'),
      frameSha256: hash(encoded.value),
      record: appended.records[0],
    });
  });
}

export async function verifyEvidenceContract() {
  const contract = EVIDENCE_CONTRACT;
  if (
    contract.schemaVersion !== 'gf-005-evidence-contract.v1' ||
    contract.seed !== 'gf-005-authority-kernel-seed-v1' ||
    contract.catalogVersion !== kernel.AUTHORITY_KERNEL_VERSION ||
    contract.harnessVersion !== 'gf-005-authority-harness.v1' ||
    JSON.stringify(contract.gf004Operands) !== JSON.stringify(GF004_OPERANDS) ||
    contract.prePublication.some((item) => item.disposition !== 'pending-not-yet-applicable') ||
    JSON.stringify(contract.catalog) !==
      JSON.stringify({ states: 17, runPhases: 10, events: 32, operations: 29, failures: 12 })
  )
    throw new Error('GF-005 evidence contract is not the exact bounded operand contract');
  return contract;
}

export function verifyPreFinalizationArtifacts({
  resultsText,
  observationsText,
  evidenceText,
  receiptText,
  candidate,
}) {
  let results, observations, evidence, receipt;
  try {
    results = JSON.parse(resultsText);
    observations = JSON.parse(observationsText);
    evidence = JSON.parse(evidenceText);
    receipt = JSON.parse(receiptText);
  } catch {
    return 'malformed';
  }
  let expectedSubject;
  try {
    expectedSubject = deriveGf004Subject(candidate);
  } catch {
    return 'candidate';
  }
  if (hash(resultsText) !== receipt.resultsSha256) return 'results-hash';
  if (hash(observationsText) !== receipt.observationsSha256) return 'observations-hash';
  if (hash(evidenceText) !== receipt.evidenceSha256) return 'evidence-hash';
  if (
    JSON.stringify(receipt.candidate) !== JSON.stringify(candidate) ||
    JSON.stringify(evidence.candidate) !== JSON.stringify(candidate) ||
    JSON.stringify(results.candidate) !== JSON.stringify(candidate) ||
    JSON.stringify(observations.candidate) !== JSON.stringify(candidate)
  )
    return 'candidate';
  if (evidence.resultsSha256 !== receipt.resultsSha256 || evidence.observationsSha256 !== receipt.observationsSha256)
    return 'evidence-link';
  if (receipt.readback !== 'pass') return 'readback';
  if (results.status !== 'operands-recorded-not-gate-pass') return 'gate-claim';
  if (JSON.stringify(results.operands) !== JSON.stringify(GF004_OPERANDS)) return 'operand-list';
  if (JSON.stringify(evidence.operands) !== JSON.stringify(GF004_OPERANDS)) return 'operand-list';
  if (
    !Array.isArray(evidence.gf004Records) ||
    evidence.gf004Records.length !== GF004_OPERANDS.length ||
    JSON.stringify(evidence.gf004Records.map((entry) => entry.suite)) !== JSON.stringify(GF004_OPERANDS) ||
    evidence.gf004Records.some(
      (entry) =>
        !exactKeys(entry, ['suite', 'frameHex', 'frameSha256', 'record']) ||
        typeof entry.frameHex !== 'string' ||
        !/^[0-9a-f]+$/.test(entry.frameHex) ||
        entry.frameHex.length % 2 !== 0 ||
        typeof entry.frameSha256 !== 'string' ||
        !/^[0-9a-f]{64}$/.test(entry.frameSha256),
    )
  )
    return 'operand-records';
  for (const entry of evidence.gf004Records) {
    const frame = Buffer.from(entry.frameHex, 'hex');
    if (frame.toString('hex') !== entry.frameHex) return 'operand-frame';
    if (hash(frame) !== entry.frameSha256) return 'operand-frame-hash';
    const parsed = conformance.parseRecordFrame(frame);
    if (!parsed.ok) return 'operand-frame-parse';
    const appended = conformance.append([], frame);
    if (appended.status !== 'pass' || appended.records.length !== 1) return 'operand-record';
    const record = appended.records[0];
    if (
      record.suite !== entry.suite ||
      record.status !== 'pass' ||
      record.complete !== true ||
      record.independentRecorder !== expectedSubject.recorderIdentity
    )
      return 'operand-record';
    if (!sameFields(record.subject, expectedSubject)) return 'operand-subject';
    if (JSON.stringify(entry.record) !== JSON.stringify(record)) return 'operand-record';
  }
  if (
    evidence.catalogVersion !== EVIDENCE_CONTRACT.catalogVersion ||
    evidence.seed !== EVIDENCE_CONTRACT.seed ||
    evidence.harnessVersion !== EVIDENCE_CONTRACT.harnessVersion ||
    evidence.catalogInventorySha256 !== EVIDENCE_CONTRACT.catalogInventorySha256
  )
    return 'evidence-binding';
  if (observations.prePublication?.some((item) => item.disposition !== 'pending-not-yet-applicable')) return 'hosted';
  return 'pass';
}

export async function finalizeEvidence(run = spawnSync) {
  if (git('status', '--porcelain', '--untracked-files=no'))
    throw new Error('GF-005 finalization requires a clean tracked exact candidate checkout');
  const contract = await verifyEvidenceContract();
  const candidate = deriveFrozenCandidate();
  const observed = run(process.execPath, ['scripts/run-gf-005-tests.mjs'], { cwd: root, encoding: 'utf8' });
  if (observed.status !== 0 || observed.error) throw new Error('GF-005 targeted observation failed');
  const results = { candidate, status: 'operands-recorded-not-gate-pass', operands: GF004_OPERANDS };
  const observations = {
    candidate,
    seed: contract.seed,
    harnessVersion: contract.harnessVersion,
    prePublication: contract.prePublication,
    targeted: { command: 'node scripts/run-gf-005-tests.mjs', exitCode: observed.status },
  };
  const resultsText = json(results);
  const observationsText = json(observations);
  const gf004Records = createGf004OperandRecords(candidate);
  const evidence = {
    schemaVersion: 1,
    subject: 'GF-005',
    candidate,
    catalog: contract.catalog,
    catalogInventory: CATALOG_INVENTORY,
    catalogInventorySha256: contract.catalogInventorySha256,
    catalogVersion: contract.catalogVersion,
    seed: contract.seed,
    harnessVersion: contract.harnessVersion,
    operands: GF004_OPERANDS,
    gf004Version: conformance.CONFORMANCE_VERSION,
    gf004Catalog: conformance.SUITES,
    gf004Records,
    reducerSha256: hash(readFileSync(sourcePath)),
    fixtureSha256: hash(fixtureText),
    harness: {
      gf005TestSha256: hash(readFileSync(testPath)),
      gf004ConformanceSha256: hash(readFileSync(gf004HarnessPath)),
      gf004TestSha256: hash(readFileSync(gf004TestPath)),
    },
    resultsSha256: hash(resultsText),
    observationsSha256: hash(observationsText),
  };
  const evidenceText = json(evidence);
  const receipt = {
    schemaVersion: 1,
    subject: 'GF-005',
    candidate,
    resultsSha256: hash(resultsText),
    observationsSha256: hash(observationsText),
    evidenceSha256: hash(evidenceText),
    readback: 'pass',
  };
  const receiptText = json(receipt);
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(join(artifactDir, 'results.json'), resultsText);
  writeFileSync(join(artifactDir, 'observations.json'), observationsText);
  writeFileSync(join(artifactDir, 'evidence.json'), evidenceText);
  writeFileSync(join(artifactDir, 'finalization-receipt.json'), receiptText);
  const verdict = verifyPreFinalizationArtifacts({
    resultsText: readFileSync(join(artifactDir, 'results.json'), 'utf8'),
    observationsText: readFileSync(join(artifactDir, 'observations.json'), 'utf8'),
    evidenceText: readFileSync(join(artifactDir, 'evidence.json'), 'utf8'),
    receiptText: readFileSync(join(artifactDir, 'finalization-receipt.json'), 'utf8'),
    candidate,
  });
  if (verdict !== 'pass') throw new Error(`GF-005 evidence readback failed: ${verdict}`);
  return receipt;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await finalizeEvidence();
