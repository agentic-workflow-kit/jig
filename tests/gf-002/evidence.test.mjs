import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPROVED_ACTIVATION,
  OBSERVATION_MANIFEST,
  verifyApprovedActivation,
} from '../../scripts/run-gf-002-tests.mjs';

test('GF-002: execution results bind the exact immutable activation package and post-check observations', () => {
  const activation = verifyApprovedActivation();
  assert.deepEqual(activation.approvedDeliveryPackage.q, {
    commit: '1ec48a9800d33beb49761e45e4679e65b25e7317',
    tree: 'f66b9da5e030c969c6d1fd76e41d86ae66c5126e',
    pathCount: 79,
    ownedPaths: APPROVED_ACTIVATION.approvedDeliveryPackage.q.ownedPaths,
    manifestAlgorithm: 'sha256(lines: mode SP sha256(bytes) SP SP path LF)',
    digest: '27f879b8852e4137c16a9c6ee8a41decae5a62e1b07fd7b8e165211d491ede72',
  });
  assert.equal(
    activation.approvedDeliveryPackage.r.url,
    'https://github.com/agentic-workflow-kit/jig/pull/104#issuecomment-5053504609',
  );
  assert.equal(activation.landingEquivalence.landed.tree, 'f66b9da5e030c969c6d1fd76e41d86ae66c5126e');
  assert.equal(activation.planningProvenance.commit, 'b860891d9102e0bdda1d23def81b1b974a4a26ac');
  assert.deepEqual(
    OBSERVATION_MANIFEST.required.map((observation) => observation.id),
    ['targeted-tests', 'typecheck', 'boundaries', 'git-diff-check', 'full-pnpm-check', 'evidence-readback'],
  );
  assert.deepEqual(
    OBSERVATION_MANIFEST.prePublication.map((observation) => observation.disposition),
    ['pending-not-yet-applicable', 'pending-not-yet-applicable'],
  );
});
