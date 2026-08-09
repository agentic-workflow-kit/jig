import assert from 'node:assert/strict';
import test from 'node:test';

const runtime = await import('../dist/index.js');
const d = (char) => char.repeat(64);
const run = 'run-000000000040-0123456789abcdef';
const story = `${run}/story/acceptance`;
const basis = d('a');
const candidateDigest = d('b');
const targetBasisDigest = d('c');
const manifestDigest = d('d');
const deliveryDigest = d('f');
const ruleSurfaceDigest = d('1');
const candidate = Object.freeze({
  schema: 'jig.sch-candidate.v1',
  id: `${story}/cand/1|${candidateDigest}`,
  run,
  story,
  role: 'implementer',
  session: `${story}/session/implementer/1`,
  principal: 'principal/implementer',
  sessionOrdinal: 1,
  assignmentOrdinal: 1,
  source: 'session-result',
  sourceEventKey: `${run}/event/1`,
  sourceEvent: {
    event: 'EV-SESSION-RESULT',
    operation: `${run}/txn/1/gen/1|${basis}/op/1`,
    sessionOrdinal: 1,
    assignmentOrdinal: 1,
    commitProof: {},
  },
  candidateCreationKey: 'candidate-1',
  runBasisDigest: basis,
  targetBasisDigest,
  changedPaths: [],
  treeDigest: d('2'),
  workspaceCommit: 'a'.repeat(40),
  deliveryMetadata: {
    changedPaths: [],
    commitMessage: 'feat: acceptance',
    workspaceCommit: 'a'.repeat(40),
    session: `${story}/session/implementer/1`,
  },
  deliveryMetadataDigest: deliveryDigest,
  evidenceManifestDigest: manifestDigest,
  workspaceFingerprint: 'workspace/fixture',
  workspaceFactDigest: d('3'),
  candidateContentDigest: candidateDigest,
  posture: 'none',
  generation: `${run}/gen/1|controller`,
  authorizingTransition: `${run}/txn/1/gen/1|${basis}`,
  commitProof: {},
});
const requirementsDigest = runtime.deriveFrozenRequirementsDigest({
  requirements: ['ship acceptance'],
  acceptanceCriteria: ['exact approval'],
});
const policyDigest = runtime.deriveAcceptancePolicyDigest({
  posture: 'none',
  reviewMode: 'no-venue',
  ruleSurfaceDigest,
});
assert.equal(requirementsDigest.ok && policyDigest.ok, true);
const requirements = {
  schema: 'jig.frozen-requirements.v1',
  requirements: ['ship acceptance'],
  acceptanceCriteria: ['exact approval'],
  digest: requirementsDigest.value,
};
const policy = {
  schema: 'jig.acceptance-policy.v1',
  posture: 'none',
  reviewMode: 'no-venue',
  ruleSurfaceDigest,
  digest: policyDigest.value,
};
const publicationSubject = {
  run,
  story,
  basis,
  repository: 'repository/fixture',
  candidate: candidate.id,
  candidateContentDigest: candidateDigest,
  targetBasisDigest,
};
const observation = runtime.createExplicitAbsenceObservation({ mode: 'no-venue', subject: publicationSubject }).value;
const evidenceDigest = runtime.deriveAcceptanceEvidenceDigest({
  schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
  manifestDigest,
  candidate: candidate.id,
  candidateContentDigest: candidateDigest,
  targetBasisDigest,
  disposition: 'admitted',
  availability: 'available',
});
assert.equal(evidenceDigest.ok, true);
const evidence = {
  schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
  manifestDigest,
  candidate: candidate.id,
  candidateContentDigest: candidateDigest,
  targetBasisDigest,
  disposition: 'admitted',
  availability: 'available',
  integrityDigest: evidenceDigest.value,
};
const candidate2Digest = d('e');
const candidate2 = Object.freeze({
  ...candidate,
  id: `${story}/cand/2|${candidate2Digest}`,
  candidateContentDigest: candidate2Digest,
  evidenceManifestDigest: d('8'),
  deliveryMetadataDigest: d('7'),
});
const observation2 = runtime.createExplicitAbsenceObservation({
  mode: 'no-venue',
  subject: { ...publicationSubject, candidate: candidate2.id, candidateContentDigest: candidate2Digest },
}).value;
const evidence2Digest = runtime.deriveAcceptanceEvidenceDigest({
  schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
  manifestDigest: candidate2.evidenceManifestDigest,
  candidate: candidate2.id,
  candidateContentDigest: candidate2Digest,
  targetBasisDigest,
  disposition: 'admitted',
  availability: 'available',
});
const evidence2 = {
  ...evidence,
  manifestDigest: candidate2.evidenceManifestDigest,
  candidate: candidate2.id,
  candidateContentDigest: candidate2Digest,
  integrityDigest: evidence2Digest.value,
};
const newController = () => runtime.createScriptedAcceptanceController({ reworkLimit: 2 }).value;

test('MC-040-01/02/03: package digest binds all members and validates no-venue observation', () => {
  const controller = newController();
  const packageValue = controller.assemble({
    candidate,
    requirements,
    evidence,
    publicationObservation: observation,
    policy,
    findings: [],
    contributorPrincipals: [],
  });
  assert.equal(packageValue.ok, true, JSON.stringify(packageValue));
  assert.equal(Object.isFrozen(packageValue.value), true);
  assert.equal(
    controller.assemble({
      candidate,
      requirements,
      evidence: { ...evidence, targetBasisDigest: d('9') },
      publicationObservation: observation,
      policy,
      findings: [],
      contributorPrincipals: [],
    }).ok,
    false,
  );
});

test('MC-040-04/06: reviewer principal is fenced and only controller acceptance reaches Accepted', () => {
  const controller = newController();
  const packageValue = controller.assemble({
    candidate,
    requirements,
    evidence,
    publicationObservation: observation,
    policy,
    findings: [],
    contributorPrincipals: [],
  }).value;
  assert.deepEqual(
    controller.assign({ package: packageValue, session: `${story}/session/reviewer/1`, principal: candidate.principal })
      .error,
    { family: 'FC-AUTHORITY', code: 'REVIEWER_INDEPENDENCE_REQUIRED' },
  );
  const assignment = controller.assign({
    package: packageValue,
    session: `${story}/session/reviewer/1`,
    principal: 'principal/reviewer',
  });
  assert.equal(assignment.ok, true);
  const verdict = controller.receiveVerdict({ assignment: assignment.value, verdict: 'approve', findings: [] });
  assert.equal(verdict.ok, true);
  assert.equal(verdict.value.projection.state, 'Accepted');
  assert.equal(verdict.value.projection.acceptedPackageDigest, packageValue.digest);
  assert.equal(verdict.value.projection.blocker, null);
});

test('MC-040-05/08: blocking findings require explicit resolution and changes-required is bounded rework', () => {
  const controller = newController();
  const packageValue = controller.assemble({
    candidate,
    requirements,
    evidence,
    publicationObservation: observation,
    policy,
    findings: [],
    contributorPrincipals: [],
  }).value;
  const assignment = controller.assign({
    package: packageValue,
    session: `${story}/session/reviewer/2`,
    principal: 'principal/reviewer-2',
  }).value;
  const finding = {
    schema: runtime.FINDING_SCHEMA,
    id: `${story}/finding/1`,
    story,
    candidate: candidate.id,
    packageDigest: packageValue.digest,
    severity: 'blocking',
    requirement: 'exact approval',
    description: 'needs changes',
    state: 'open',
    introducedBy: { session: assignment.session, principal: assignment.principal },
    resolutionEvidenceDigest: null,
    resolvedBy: null,
    successor: null,
  };
  assert.equal(controller.receiveVerdict({ assignment, verdict: 'approve', findings: [finding] }).ok, false);
  const changed = controller.receiveVerdict({ assignment, verdict: 'changes-required', findings: [finding] });
  assert.equal(changed.ok, true);
  assert.equal(changed.value.projection.state, 'Reworking');
  assert.equal(controller.projection().reworkCount, 1);
});

test('MC-040-05/08: a fresh Candidate carries finding lineage and requires explicit resolution', () => {
  const controller = newController();
  const firstPackage = controller.assemble({
    candidate,
    requirements,
    evidence,
    publicationObservation: observation,
    policy,
    findings: [],
    contributorPrincipals: [],
  }).value;
  const firstAssignment = controller.assign({
    package: firstPackage,
    session: `${story}/session/reviewer/4`,
    principal: 'principal/reviewer-4',
  }).value;
  const finding = {
    schema: runtime.FINDING_SCHEMA,
    id: `${story}/finding/2`,
    story,
    candidate: candidate.id,
    packageDigest: firstPackage.digest,
    severity: 'blocking',
    requirement: 'exact approval',
    description: 'needs changes',
    state: 'open',
    introducedBy: { session: firstAssignment.session, principal: firstAssignment.principal },
    resolutionEvidenceDigest: null,
    resolvedBy: null,
    successor: null,
  };
  assert.equal(
    controller.receiveVerdict({ assignment: firstAssignment, verdict: 'changes-required', findings: [finding] }).ok,
    true,
  );

  const secondPackage = controller.assemble({
    candidate: candidate2,
    requirements,
    evidence: evidence2,
    publicationObservation: observation2,
    policy,
    findings: [finding],
    contributorPrincipals: [],
  }).value;
  const secondAssignment = controller.assign({
    package: secondPackage,
    session: `${story}/session/reviewer/5`,
    principal: 'principal/reviewer-5',
  }).value;
  const resolved = {
    ...finding,
    candidate: candidate2.id,
    packageDigest: secondPackage.digest,
    state: 'resolved',
    introducedBy: { session: secondAssignment.session, principal: secondAssignment.principal },
    resolutionEvidenceDigest: d('6'),
    resolvedBy: { session: secondAssignment.session, principal: secondAssignment.principal },
  };
  const accepted = controller.receiveVerdict({
    assignment: secondAssignment,
    verdict: 'approve',
    findings: [resolved],
  });
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  assert.equal(accepted.value.projection.state, 'Accepted');
});

test('MC-040-07/09: explicit posture, evidence, and rule invalidation fail closed', () => {
  assert.equal(
    runtime.validateAcceptancePolicy({
      schema: 'jig.acceptance-policy.v1',
      posture: 'deterministic',
      reviewMode: 'no-venue',
      ruleSurfaceDigest,
      digest: d('9'),
    }).ok,
    false,
  );
  const controller = newController();
  const packageValue = controller.assemble({
    candidate,
    requirements,
    evidence,
    publicationObservation: observation,
    policy,
    findings: [],
    contributorPrincipals: [],
  }).value;
  assert.deepEqual(controller.invalidate({ packageDigest: packageValue.digest, reason: 'rule-surface' }).ok, true);
  assert.equal(controller.projection().state, 'Reviewing');
});

test('MC-040-10: append-before-transition recovery reconciles a lost acknowledgement', () => {
  const controller = runtime.createScriptedAcceptanceController({ fault: 'lost-ack' }).value;
  const packageValue = controller.assemble({
    candidate,
    requirements,
    evidence,
    publicationObservation: observation,
    policy,
    findings: [],
    contributorPrincipals: [],
  });
  assert.equal(packageValue.ok, true);
  const assignment = controller.assign({
    package: packageValue.value,
    session: `${story}/session/reviewer/3`,
    principal: 'principal/reviewer-3',
  });
  assert.equal(assignment.ok, true);
  assert.equal(
    controller.receiveVerdict({
      assignment: { ...assignment.value, assignmentDigest: d('9') },
      verdict: 'approve',
      findings: [],
    }).ok,
    false,
  );
  const verdict = controller.receiveVerdict({ assignment: assignment.value, verdict: 'approve', findings: [] });
  assert.equal(verdict.ok, true);
  assert.equal(controller.projection().state, 'Accepted');
  const restored = runtime.restoreScriptedAcceptanceController(controller.snapshot());
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.equal(restored.value.projection().state, 'Accepted');
});

test('scripted reviewer remains unavailable to provider configuration', () => {
  const reviewer = runtime.createScriptedAcceptanceReviewer({ principal: 'principal/reviewer' });
  assert.deepEqual(reviewer.value.reachability(), {
    providerEnabled: false,
    configured: false,
    status: 'scripted-only',
  });
});
