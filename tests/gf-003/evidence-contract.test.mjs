import assert from 'node:assert/strict';
import test from 'node:test';
import { normativeCorpusManifest } from '../../scripts/check-delivery-track.mjs';
import { EVIDENCE_CONTRACT, verifyEvidenceContract } from '../../scripts/finalize-gf-003-evidence.mjs';

test('GF-003 evidence contract binds activation, predecessors, topology, and pre-publication state', () => {
  assert.equal(EVIDENCE_CONTRACT.activation.recordUrl, 'https://github.com/agentic-workflow-kit/jig/issues/107');
  assert.deepEqual(EVIDENCE_CONTRACT.activation.approvedPackage.q, {
    commit: '1ec48a9800d33beb49761e45e4679e65b25e7317',
    tree: 'f66b9da5e030c969c6d1fd76e41d86ae66c5126e',
    pathCount: 79,
    ownedPaths: EVIDENCE_CONTRACT.activation.approvedPackage.q.ownedPaths,
    manifestAlgorithm: 'sha256(lines: mode SP sha256(bytes) SP SP path LF)',
    digest: '27f879b8852e4137c16a9c6ee8a41decae5a62e1b07fd7b8e165211d491ede72',
  });
  assert.equal(EVIDENCE_CONTRACT.activation.landingEquivalence.landed.tree, 'f66b9da5e030c969c6d1fd76e41d86ae66c5126e');
  assert.deepEqual(EVIDENCE_CONTRACT.integrationBase, {
    ref: 'feat/greenfield-phase-0-substrate',
    commit: '816024def188ef7e8aaad2cb789d80e8fd8fa8eb',
    tree: '46a9217249f2ec5fb923bb59ddb8602074e4f3ac',
  });
  assert.deepEqual(EVIDENCE_CONTRACT.targetMain, {
    ref: 'origin/main',
    commit: '17eff4f8b90576fb4d7f65f7cac8a3e6780041a9',
    tree: '490717847d3c496ed3616e7d2339021c3270d70b',
  });
  assert.equal(EVIDENCE_CONTRACT.predecessors.gf002.candidate.commit, '48794c07abe6996b17c10f9b12179347e3d88dbb');
  assert.equal(EVIDENCE_CONTRACT.predecessors.gf002.integration.commit, EVIDENCE_CONTRACT.integrationBase.commit);
  assert.deepEqual(EVIDENCE_CONTRACT.prePublication, [
    { id: 'hosted-check', disposition: 'pending-not-yet-applicable' },
    { id: 'independent-review', disposition: 'pending-not-yet-applicable' },
  ]);
  assert.doesNotThrow(() => verifyEvidenceContract());
  assert.deepEqual(normativeCorpusManifest(process.cwd()), {
    pathCount: 67,
    digest: 'fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c',
    paths: normativeCorpusManifest(process.cwd()).paths,
  });
});
