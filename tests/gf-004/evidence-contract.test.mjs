import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { normativeCorpusManifest } from '../../scripts/check-delivery-track.mjs';

function verifyFixtureContract(value) {
  if (value.resultsHash !== value.results) return 'results-hash';
  if (value.observationsHash !== value.observations) return 'observations-hash';
  if (value.evidenceHash !== value.evidence) return 'evidence-hash';
  if (
    value.corpus.count !== 67 ||
    value.corpus.digest !== 'fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c'
  )
    return 'corpus';
  if (value.classes.length !== 10) return 'classes';
  if (value.hosted !== 'pending-not-yet-applicable') return 'hosted';
  if (value.routeDigest.length !== 64) return 'route-digest';
  if (value.predecessorTree !== EVIDENCE_CONTRACT.integrationBase.tree) return 'predecessor';
  return 'pass';
}

import {
  EVIDENCE_CONTRACT,
  LOCAL_OBSERVATIONS,
  verifyArtifactHashes,
  verifyEvidenceContract,
  verifyFinalizationArtifacts,
  verifyIntegrationBase,
} from '../../scripts/finalize-gf-004-evidence.mjs';

test('GF-004 evidence contract fixes activation, integration, predecessor chain, corpus, and pending publication', () => {
  assert.equal(EVIDENCE_CONTRACT.activation.recordUrl, 'https://github.com/agentic-workflow-kit/jig/issues/107');
  assert.equal(EVIDENCE_CONTRACT.activation.approvedDeliveryPackage.q.pathCount, 79);
  assert.equal(
    EVIDENCE_CONTRACT.activation.landingEquivalence.landed.commit,
    '8cf8decb29ab223275d954220d1a6b5fa575c6a2',
  );
  assert.deepEqual(EVIDENCE_CONTRACT.integrationBase, {
    ref: 'feat/greenfield-phase-0-substrate',
    commit: '86c32022fe2ff1c3ebd8b8d22578fc9b4db08fa0',
    tree: '1e9434a9157b063ccf2aa3af1fc54d13278fa23f',
  });
  assert.equal(EVIDENCE_CONTRACT.predecessors.gf003.integration, EVIDENCE_CONTRACT.integrationBase.commit);
  assert.equal(EVIDENCE_CONTRACT.predecessors.gf001.commit, EVIDENCE_CONTRACT.targetMain.commit);
  assert.equal(EVIDENCE_CONTRACT.predecessors.gf002.tree, '46a9217249f2ec5fb923bb59ddb8602074e4f3ac');
  assert.equal(EVIDENCE_CONTRACT.predecessors.gf003.tree, EVIDENCE_CONTRACT.integrationBase.tree);
  assert.equal(EVIDENCE_CONTRACT.requiredClasses.includes('full-pnpm-check'), true);
  assert.equal(EVIDENCE_CONTRACT.prePublication[0].disposition, 'pending-not-yet-applicable');
  const oracle = readFileSync(resolve(import.meta.dirname, '../fixtures/gf-004/oracle.json'), 'utf8');
  assert.ok(oracle.includes('routeElementsBatch3'));
  const fixture = JSON.parse(oracle);
  assert.equal(fixture.catalog.length, 39);
  assert.equal(fixture.routes.length, 44);
  assert.equal(
    [...fixture.routeElementsBatch1, ...fixture.routeElementsBatch2, ...fixture.routeElementsBatch3].length,
    44,
  );
  const corpus = normativeCorpusManifest(process.cwd());
  assert.equal(corpus.pathCount, 67);
  assert.equal(corpus.digest, 'fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c');
  assert.equal(corpus.paths.length, 67);
});

test('GF-004 evidence contract preserves its immutable historical integration base after the phase branch advances', () => {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const base = EVIDENCE_CONTRACT.integrationBase;
  assert.notEqual(git('rev-parse', base.ref), base.commit);
  assert.equal(git('rev-parse', base.commit), base.commit);
  assert.equal(git('rev-parse', `${base.commit}^{tree}`), base.tree);
  assert.equal(git('merge-base', 'HEAD', base.commit), base.commit);
  assert.doesNotThrow(() => verifyEvidenceContract());
});

test('GF-004 immutable integration-base verifier rejects wrong object resolution and non-ancestry', () => {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const base = EVIDENCE_CONTRACT.integrationBase;
  const override =
    (expectedArgs, value) =>
    (...args) =>
      args.join('\u0000') === expectedArgs.join('\u0000') ? value : git(...args);
  assert.throws(
    () => verifyIntegrationBase(override(['rev-parse', base.commit], EVIDENCE_CONTRACT.targetMain.commit)),
    /GF-004 integration base mismatch/,
  );
  assert.throws(
    () => verifyIntegrationBase(override(['rev-parse', `${base.commit}^{tree}`], EVIDENCE_CONTRACT.targetMain.tree)),
    /GF-004 integration base mismatch/,
  );
  assert.throws(
    () => verifyIntegrationBase(override(['merge-base', 'HEAD', base.commit], EVIDENCE_CONTRACT.targetMain.commit)),
    /GF-004 candidate merge base mismatch/,
  );
});

test('GF-004 pure evidence cross-binding verifier rejects nine fixed mutations', () => {
  const valid = {
    resultsHash: 'r',
    results: 'r',
    observationsHash: 'o',
    observations: 'o',
    evidenceHash: 'e',
    evidence: 'e',
    corpus: { count: 67, digest: 'fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c' },
    classes: EVIDENCE_CONTRACT.requiredClasses,
    hosted: 'pending-not-yet-applicable',
    routeDigest: 'a'.repeat(64),
    predecessorTree: EVIDENCE_CONTRACT.integrationBase.tree,
  };
  assert.equal(verifyFixtureContract(valid), 'pass');
  const cases = [
    ['results-hash', { ...valid, resultsHash: 'x' }],
    ['observations-hash', { ...valid, observationsHash: 'x' }],
    ['evidence-hash', { ...valid, evidenceHash: 'x' }],
    ['corpus', { ...valid, corpus: { ...valid.corpus, digest: 'x' } }],
    ['corpus', { ...valid, corpus: { ...valid.corpus, count: 66 } }],
    ['classes', { ...valid, classes: [] }],
    ['hosted', { ...valid, hosted: 'pass' }],
    ['route-digest', { ...valid, routeDigest: 'x' }],
    ['predecessor', { ...valid, predecessorTree: 'x' }],
  ];
  assert.equal(cases.length, 9);
  for (const [reason, value] of cases) assert.equal(verifyFixtureContract(value), reason);
});

test('GF-004 finalizer hash verifier rejects artifact tampering', () => {
  const resultsText = 'results';
  const observationsText = 'observations';
  const evidenceText = 'evidence';
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  const receipt = {
    resultsSha256: hash(resultsText),
    observationsSha256: hash(observationsText),
    evidenceSha256: hash(evidenceText),
  };
  assert.equal(verifyArtifactHashes({ resultsText, observationsText, evidenceText, receipt }), 'pass');
  assert.equal(
    verifyArtifactHashes({ resultsText: 'tampered', observationsText, evidenceText, receipt }),
    'results-hash',
  );
});

test('GF-004 finalization verifier rejects stale outputs, observation drift, candidate drift, and hosted false green', () => {
  const candidate = { commit: 'candidate', tree: 'tree' };
  const local = LOCAL_OBSERVATIONS.map((item, ordinal) => ({
    id: item.id,
    classId: item.classId,
    ordinal,
    command: item.command,
    args: item.args,
    exitCode: 0,
    status: 'observed-pass',
  }));
  const observations = { local, prePublication: EVIDENCE_CONTRACT.prePublication };
  const results = { candidate, runner: local[0], classes: EVIDENCE_CONTRACT.requiredClasses };
  const resultsText = `${JSON.stringify(results)}\n`;
  const observationsText = `${JSON.stringify(observations)}\n`;
  const evidence = {
    candidate,
    resultsSha256: createHash('sha256').update(resultsText).digest('hex'),
    observationsSha256: createHash('sha256').update(observationsText).digest('hex'),
  };
  const evidenceText = `${JSON.stringify(evidence)}\n`;
  const receipt = {
    candidate,
    resultsSha256: createHash('sha256').update(resultsText).digest('hex'),
    observationsSha256: createHash('sha256').update(observationsText).digest('hex'),
    evidenceSha256: createHash('sha256').update(evidenceText).digest('hex'),
    readback: 'pass',
  };
  const valid = { resultsText, observationsText, evidenceText, receiptText: `${JSON.stringify(receipt)}\n`, candidate };
  assert.equal(verifyFinalizationArtifacts(valid), 'pass');
  const mutate = (key, value) => ({ ...valid, [key]: value });
  const changedExit = { ...observations, local: local.map((item, index) => (index ? item : { ...item, exitCode: 1 })) };
  const changedOrder = { ...observations, local: [...local].reverse() };
  const hostedPass = { ...observations, prePublication: [{ id: 'hosted-check', disposition: 'pass' }] };
  const cases = [
    ['results-hash', mutate('resultsText', `${JSON.stringify({ ...results, stale: true })}\n`)],
    ['observations-hash', mutate('observationsText', `${JSON.stringify(changedExit)}\n`)],
    ['observations-hash', mutate('observationsText', `${JSON.stringify(changedOrder)}\n`)],
    ['candidate', { ...valid, candidate: { commit: 'other', tree: 'tree' } }],
    ['observations-hash', mutate('observationsText', `${JSON.stringify(hostedPass)}\n`)],
    ['evidence-hash', mutate('evidenceText', `${JSON.stringify({ ...evidence, stale: true })}\n`)],
    ['evidence-hash', mutate('evidenceText', `${JSON.stringify({ ...evidence, observationsSha256: 'x' })}\n`)],
  ];
  for (const [reason, value] of cases) assert.equal(verifyFinalizationArtifacts(value), reason);
  const source = readFileSync(resolve(import.meta.dirname, '../../scripts/finalize-gf-004-evidence.mjs'), 'utf8');
  assert.equal(source.includes("status: 'pass'"), false);
});
