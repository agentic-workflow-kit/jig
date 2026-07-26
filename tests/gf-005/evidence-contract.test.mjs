import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  createGf004OperandRecords,
  deriveFrozenCandidate,
  deriveGf004Subject,
  EVIDENCE_CONTRACT,
  GF004_OPERANDS,
  OPERAND_FAILURE_CLASS,
  OPERAND_NOT_RECORDABLE_REASON,
  OPERAND_RESULT_STATUS,
  OPERAND_STATUS,
  PHASE0_RECORDER_IDENTITY,
  verifyEvidenceContract,
  verifyPreFinalizationArtifacts,
} from '../../scripts/finalize-gf-005-evidence.mjs';

const codec = await import('../../packages/codec/dist/index.js');
const conformance = await import('../../packages/conformance/dist/index.js');

const hash = (value) => createHash('sha256').update(value).digest('hex');
const candidate = deriveFrozenCandidate();
const closedResults = () => ({
  candidate,
  status: OPERAND_RESULT_STATUS,
  operands: GF004_OPERANDS,
  reason: OPERAND_NOT_RECORDABLE_REASON,
  failureClass: OPERAND_FAILURE_CLASS,
});

const artifacts = (evidence, results = closedResults()) => {
  const observations = { candidate, prePublication: EVIDENCE_CONTRACT.prePublication };
  const resultsText = `${JSON.stringify(results)}\n`;
  const observationsText = `${JSON.stringify(observations)}\n`;
  const evidenceText = `${JSON.stringify(evidence)}\n`;
  const receipt = {
    candidate,
    resultsSha256: hash(resultsText),
    observationsSha256: hash(observationsText),
    evidenceSha256: hash(evidenceText),
    readback: 'pass',
  };
  return { resultsText, observationsText, evidenceText, receiptText: `${JSON.stringify(receipt)}\n`, candidate };
};

const evidenceFor = (records, qualification = {}, results = closedResults()) => {
  const observations = { candidate, prePublication: EVIDENCE_CONTRACT.prePublication };
  const resultsText = `${JSON.stringify(results)}\n`;
  const observationsText = `${JSON.stringify(observations)}\n`;
  return {
    status: qualification.status ?? OPERAND_RESULT_STATUS,
    reason: qualification.reason ?? OPERAND_NOT_RECORDABLE_REASON,
    failureClass: qualification.failureClass ?? OPERAND_FAILURE_CLASS,
    candidate,
    operands: GF004_OPERANDS,
    catalogVersion: EVIDENCE_CONTRACT.catalogVersion,
    seed: EVIDENCE_CONTRACT.seed,
    harnessVersion: EVIDENCE_CONTRACT.harnessVersion,
    catalogInventorySha256: EVIDENCE_CONTRACT.catalogInventorySha256,
    gf004Records: records,
    resultsSha256: hash(resultsText),
    observationsSha256: hash(observationsText),
  };
};

test('GF-005 evidence contract binds only the three structural GF-004 operands', async () => {
  const contract = await verifyEvidenceContract();
  assert.deepEqual(GF004_OPERANDS, ['CF-DETERMINISM', 'CF-BINDING', 'CF-ORDERING']);
  assert.deepEqual(contract.gf004Operands, GF004_OPERANDS);
  assert.equal(contract.seed, 'gf-005-authority-kernel-seed-v1');
  assert.equal(
    contract.prePublication.every((item) => item.disposition === 'pending-not-yet-applicable'),
    true,
  );
  assert.equal(EVIDENCE_CONTRACT.catalog.states, 17);
  assert.equal(EVIDENCE_CONTRACT.catalog.runPhases, 10);
  assert.equal(EVIDENCE_CONTRACT.catalog.events, 32);
  assert.equal(EVIDENCE_CONTRACT.catalog.operations, 29);
  assert.equal(EVIDENCE_CONTRACT.catalog.failures, 12);
  const records = createGf004OperandRecords(candidate);
  assert.deepEqual(
    records.map((record) => record.suite),
    GF004_OPERANDS,
  );
  assert.equal(
    records.every((record) => record.record.schemaVersion === 'jig.conformance.v1'),
    true,
  );
  assert.equal(
    records.every((record) => /^[0-9a-f]+$/.test(record.frameHex)),
    true,
  );
  assert.equal(
    records.every((record) => /^[0-9a-f]{64}$/.test(record.frameSha256)),
    true,
  );
  const subject = deriveGf004Subject(candidate);
  assert.equal(candidate.tree.length, 40);
  assert.equal(subject.candidateTree.length, 64);
  assert.equal(
    records.every((record) => record.record.subject.candidateTree === subject.candidateTree),
    true,
  );
  assert.equal(
    records.every((record) => record.record.subject.executionBaseTree === subject.executionBaseTree),
    true,
  );
});

test('GF-005 Phase 0 artifacts fail closed without independent-recorder provenance', () => {
  const records = createGf004OperandRecords(candidate);
  assert.equal(
    records.every((record) => record.record.status === OPERAND_STATUS),
    true,
  );
  assert.equal(
    records.every((record) => record.record.independentRecorder === PHASE0_RECORDER_IDENTITY),
    true,
  );
  assert.equal(
    records.every((record) => record.record.subject.recorderIdentity === PHASE0_RECORDER_IDENTITY),
    true,
  );
  assert.equal(verifyPreFinalizationArtifacts(artifacts(evidenceFor(records))), 'pass');
  const subject = deriveGf004Subject(candidate);
  const provider = conformance.evaluateProvider(
    'PORT-LEDGER',
    records.map((record) => record.record),
    subject,
  );
  const product = conformance.evaluateProduct(
    records.map((record) => record.record),
    [],
    subject,
  );
  assert.equal(provider.passed, false);
  assert.equal(product.passed, false);
  assert.ok(provider.reasons.includes(OPERAND_NOT_RECORDABLE_REASON));
  assert.ok(product.reasons.some((reason) => reason.startsWith('not-passing:')));
  for (const status of ['operands-recorded-not-gate-pass', 'gate-pass', 'accepted']) {
    const upgradedResults = { ...closedResults(), status };
    assert.equal(
      verifyPreFinalizationArtifacts(artifacts(evidenceFor(records, {}, upgradedResults), upgradedResults)),
      'gate-claim',
    );
    assert.equal(verifyPreFinalizationArtifacts(artifacts(evidenceFor(records, { status }))), 'gate-claim');
  }
  for (const qualification of [{ reason: 'missing:recorder' }, { failureClass: 'FC-EVIDENCE' }])
    assert.equal(
      verifyPreFinalizationArtifacts(artifacts(evidenceFor(records, qualification))),
      qualification.reason ? 'not-recordable-reason' : 'not-recordable-classification',
    );
  const { reason: _reason, ...evidenceWithoutReason } = evidenceFor(records);
  assert.equal(verifyPreFinalizationArtifacts(artifacts(evidenceWithoutReason)), 'not-recordable-reason');
  const { reason: _resultReason, ...resultsWithoutReason } = closedResults();
  assert.equal(
    verifyPreFinalizationArtifacts(artifacts(evidenceFor(records, {}, resultsWithoutReason), resultsWithoutReason)),
    'not-recordable-reason',
  );
});

test('GF-005 readback proves parsed GF-004 frames and rejects every provenance bypass', () => {
  const records = createGf004OperandRecords(candidate);
  const evidence = evidenceFor(records);
  const valid = artifacts(evidence);
  assert.equal(verifyPreFinalizationArtifacts(valid), 'pass');
  for (const [expected, changed] of [
    ['results-hash', { ...valid, resultsText: `${JSON.stringify({ candidate, stale: true })}\n` }],
    ['observations-hash', { ...valid, observationsText: `${JSON.stringify({ candidate, stale: true })}\n` }],
    ['evidence-hash', { ...valid, evidenceText: `${JSON.stringify({ ...evidence, stale: true })}\n` }],
    ['candidate', { ...valid, candidate: { ...candidate, tree: candidate.executionBaseTree } }],
    ['candidate', { ...valid, candidate: { ...candidate, executionBaseTree: candidate.tree } }],
  ])
    assert.equal(verifyPreFinalizationArtifacts(changed), expected);
  const staticRecords = records.map(({ suite, frameSha256 }) => ({ suite, frameSha256 }));
  assert.equal(verifyPreFinalizationArtifacts(artifacts(evidenceFor(staticRecords))), 'operand-records');
  const hashMismatch = records.map((record, index) =>
    index === 0 ? { ...record, frameSha256: '0'.repeat(64) } : record,
  );
  assert.equal(verifyPreFinalizationArtifacts(artifacts(evidenceFor(hashMismatch))), 'operand-frame-hash');
  const malformedFrame = records.map((record, index) =>
    index === 0 ? { ...record, frameHex: '00', frameSha256: hash(Buffer.from('00', 'hex')) } : record,
  );
  assert.equal(verifyPreFinalizationArtifacts(artifacts(evidenceFor(malformedFrame))), 'operand-frame-parse');
  const mutateFrame = (changes) => {
    const { schemaVersion: _schemaVersion, ...input } = records[0].record;
    const mutated = { ...input, ...changes };
    const encoded = codec.encodeFrame(mutated);
    assert.equal(encoded.ok, true);
    return {
      ...records[0],
      frameHex: Buffer.from(encoded.value).toString('hex'),
      frameSha256: hash(encoded.value),
      record: { ...mutated, schemaVersion: 'jig.conformance.v1' },
    };
  };
  for (const changes of [
    { suite: 'CF-MECH-LEDGER' },
    { status: 'pass' },
    { status: 'fail' },
    { independentRecorder: 'gf005-independent-recorder' },
  ]) {
    const altered = mutateFrame(changes);
    assert.equal(
      verifyPreFinalizationArtifacts(artifacts(evidenceFor([altered, ...records.slice(1)]))),
      'operand-record',
    );
  }
  for (const [field, expected] of [
    ['candidateTree', 'operand-subject'],
    ['executionBaseTree', 'operand-subject'],
    ['recorderIdentity', 'operand-record'],
  ]) {
    const altered = mutateFrame({ subject: { ...records[0].record.subject, [field]: '0'.repeat(64) } });
    assert.equal(verifyPreFinalizationArtifacts(artifacts(evidenceFor([altered, ...records.slice(1)]))), expected);
  }
});
