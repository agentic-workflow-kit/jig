import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { stageDigest } from '@agentic-workflow-kit/jig-codec';

const runtime = await import('../dist/index.js');
const d = (char) => char.repeat(64);
const run = 'run-000000000040-0123456789abcdef';
const story = `${run}/story/acceptance`;
const basis = d('a');
const candidateDigest = d('b');
const targetBasisDigest = d('c');
const ruleSurfaceDigest = d('1');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const candidateId = `${story}/cand/1|${candidateDigest}`;
const manifestFor = (subjectCandidate, adoptionTransition) => {
  const basis = {
    configurationDigest: d('0'),
    schemaVersion: 'jig.evidence.v1',
    policy: {
      kind: 'fixture-policy',
      version: 'fixture-policy/v1',
      digest: d('e'),
      scanPolicyVersion: 'scan/v1',
      scanPolicyDigest: d('f'),
    },
    subjectKind: 'ID-CAND',
    subjectIdentity: subjectCandidate,
    subject: `evidence://${subjectCandidate}/claim/candidate-content`,
    claim: 'candidate-content',
    producer: { kind: 'principal', principal: 'principal/implementer', session: `${story}/session/implementer/1` },
    providerManifest: null,
    contentType: 'text/plain',
    contentClass: 'completeness-critical',
    completeness: 'complete',
    originalDigest: d('2'),
    artifactDigest: d('3'),
    originalSize: 1,
    retainedSize: 1,
    loss: null,
    redaction: { policyVersion: 'scan/v1', status: 'none' },
    retention: { class: 'fixture', windowDays: 1, hold: null },
  };
  const artifactFact = {
    operation: 'operation/evidence-1',
    mode: 'put',
    position: 1,
    headDigest: d('4'),
    binding: 'binding',
  };
  const manifestDigest = hash(JSON.stringify({ basis, artifactFact, adoptionTransition }));
  return {
    ...basis,
    manifestDigest,
    disposition: 'admitted',
    artifactFact,
    adoptionTransition,
  };
};
const manifest = manifestFor(candidateId, 'transition/evidence/1');
const manifestDigest = manifest.manifestDigest;
const deliveryMetadata = {
  changedPaths: [],
  commitMessage: 'feat: acceptance',
  workspaceCommit: 'a'.repeat(40),
  session: `${story}/session/implementer/1`,
};
const deliveryDigest = stageDigest({
  domain: 'CANDIDATE-DELIVERY-METADATA',
  excludePaths: [],
  value: deliveryMetadata,
}).value.digest;
const candidate = Object.freeze({
  schema: 'jig.sch-candidate.v1',
  id: candidateId,
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
  deliveryMetadata,
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
const requiredPolicyDigest = runtime.deriveAcceptancePolicyDigest({
  posture: 'none',
  reviewMode: 'required-venue',
  ruleSurfaceDigest,
});
const requiredPolicy = {
  schema: 'jig.acceptance-policy.v1',
  posture: 'none',
  reviewMode: 'required-venue',
  ruleSurfaceDigest,
  digest: requiredPolicyDigest.value,
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
const venueGeneration = `${run}/gen/2|controller-token-1`;
const retryVenueGeneration = `${run}/gen/3|controller-token-2`;
const venueManifest = `provider/${d('2')}/authority/${d('3')}`;
const venueOperation = (ordinal, type, operationGeneration = venueGeneration) => {
  const transaction = `${run}/txn/${ordinal}/${operationGeneration}|${d(String(ordinal))}`;
  return { operation: `${transaction}/op/1`, transaction, event: `${run}/event/${ordinal}`, type };
};
const venueBinding = (ordinal, type, activeGeneration = venueGeneration, operationGeneration = activeGeneration) => {
  const entry = venueOperation(ordinal, type, operationGeneration);
  return {
    operation: entry.operation,
    operationType: type,
    mode: 'required-venue',
    subject: publicationSubject,
    repository: 'repository/fixture',
    candidate: candidate.id,
    candidateContentDigest: candidateDigest,
    targetBasisDigest,
    providerIdentity: 'fixture-provider/v1',
    sourceRef: 'refs/heads/feature-gf-040',
    targetRef: 'refs/heads/main',
    reviewRef: 'refs/jig/review/fixture-1',
    request: { identity: 'review-request/fixture-1', marker: 'jig-review-request-1', draft: true, mergeable: false },
    markers: { status: 'jig-status-1', comment: 'jig-comment-1' },
    explanationDigest: d('4'),
    fence: { generation: activeGeneration, basis, candidateContentDigest: candidateDigest, targetBasisDigest },
    generation: activeGeneration,
    manifest: venueManifest,
    transition: {
      kind: 'review-publication-transition',
      authorizer: 'CP-TRANSITION',
      controller: 'RT-CONTROLLER',
      lifecycle: 'Reviewing',
      operation: entry.operation,
      proof: {
        kind: 'committed-witnessed',
        position: ordinal - 1,
        event: entry.event,
        transaction: entry.transaction,
        operation: entry.operation,
        recordDigest: d('5'),
        witnessDigest: d('5'),
      },
    },
    authority: null,
  };
};
const venueBindings = () => [
  venueBinding(1, 'OPC-REV-PUBLISH'),
  venueBinding(2, 'OPC-REV-REQUEST'),
  venueBinding(3, 'OPC-REV-STATUS'),
  venueBinding(4, 'OPC-REV-COMMENT'),
];
const retryVenueBindings = () => [
  venueBinding(1, 'OPC-REV-PUBLISH', retryVenueGeneration, venueGeneration),
  venueBinding(2, 'OPC-REV-REQUEST', retryVenueGeneration, venueGeneration),
  venueBinding(3, 'OPC-REV-STATUS', retryVenueGeneration, venueGeneration),
  venueBinding(4, 'OPC-REV-COMMENT', retryVenueGeneration, venueGeneration),
];
const requiredObservation = runtime
  .createReviewPublicationController({
    fixture: runtime.createScriptedReviewPublicationFixture(),
    transition: runtime.createReviewPublicationTransitionRecorder({ verify: () => ({ ok: true, value: undefined }) }),
    preservationVerifier: { verify: () => ({ ok: true, value: undefined }) },
  })
  .publish({
    mode: 'required-venue',
    subject: publicationSubject,
    bindings: venueBindings(),
    retryBindings: retryVenueBindings(),
    faults: ['none', 'none', 'none', 'none'],
  }).value;
const evidenceDigest = runtime.deriveAcceptanceEvidenceDigest({
  schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
  manifest,
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
  manifest,
  manifestDigest,
  candidate: candidate.id,
  candidateContentDigest: candidateDigest,
  targetBasisDigest,
  disposition: 'admitted',
  availability: 'available',
  integrityDigest: evidenceDigest.value,
};
const candidate2Digest = d('e');
const candidate2Id = `${story}/cand/2|${candidate2Digest}`;
const manifest2 = manifestFor(candidate2Id, 'transition/evidence/2');
const deliveryMetadata2 = { ...deliveryMetadata, commitMessage: 'fix: acceptance' };
const deliveryDigest2 = stageDigest({
  domain: 'CANDIDATE-DELIVERY-METADATA',
  excludePaths: [],
  value: deliveryMetadata2,
}).value.digest;
const candidate2 = Object.freeze({
  ...candidate,
  id: candidate2Id,
  candidateContentDigest: candidate2Digest,
  evidenceManifestDigest: manifest2.manifestDigest,
  deliveryMetadata: deliveryMetadata2,
  deliveryMetadataDigest: deliveryDigest2,
});
const observation2 = runtime.createExplicitAbsenceObservation({
  mode: 'no-venue',
  subject: { ...publicationSubject, candidate: candidate2.id, candidateContentDigest: candidate2Digest },
}).value;
const evidence2Digest = runtime.deriveAcceptanceEvidenceDigest({
  schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
  manifest: manifest2,
  manifestDigest: candidate2.evidenceManifestDigest,
  candidate: candidate2.id,
  candidateContentDigest: candidate2Digest,
  targetBasisDigest,
  disposition: 'admitted',
  availability: 'available',
});
const evidence2 = {
  ...evidence,
  manifest: manifest2,
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

test('MC-040-03/07: required-venue is positive and complementary modes fail closed', () => {
  const controller = newController();
  const accepted = controller.assemble({
    candidate,
    requirements,
    evidence,
    publicationObservation: requiredObservation,
    policy: requiredPolicy,
    findings: [],
    contributorPrincipals: [],
  });
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  assert.equal(
    controller.assemble({
      candidate,
      requirements,
      evidence,
      publicationObservation: observation,
      policy: requiredPolicy,
      findings: [],
      contributorPrincipals: [],
    }).ok,
    false,
  );
  const noVenueController = newController();
  assert.equal(
    noVenueController.assemble({
      candidate,
      requirements,
      evidence,
      publicationObservation: requiredObservation,
      policy,
      findings: [],
      contributorPrincipals: [],
    }).ok,
    false,
  );
  assert.equal(runtime.validateReviewPublicationObservation({ ...requiredObservation, draft: false }).ok, false);
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
  const forgedSession = `${story}/session/reviewer-forged/1`;
  const forgedPrincipal = 'principal/reviewer-forged';
  const forgedAssignmentDigest = stageDigest({
    domain: 'REVIEW-ASSIGNMENT',
    excludePaths: [],
    value: {
      packageDigest: packageValue.digest,
      candidate: packageValue.candidate,
      session: forgedSession,
      principal: forgedPrincipal,
      role: 'reviewer',
    },
  }).value.digest;
  assert.equal(
    controller.receiveVerdict({
      assignment: {
        ...assignment.value,
        session: forgedSession,
        principal: forgedPrincipal,
        assignmentDigest: forgedAssignmentDigest,
      },
      verdict: 'approve',
      findings: [],
    }).ok,
    false,
  );
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
    originCandidate: candidate.id,
    originPackageDigest: packageValue.digest,
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
  assert.equal(
    controller.assemble({
      candidate,
      requirements,
      evidence,
      publicationObservation: observation,
      policy,
      findings: [],
      contributorPrincipals: [],
    }).ok,
    false,
  );
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
    originCandidate: candidate.id,
    originPackageDigest: firstPackage.digest,
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
  assert.equal(
    controller.receiveVerdict({
      assignment: secondAssignment,
      verdict: 'approve',
      findings: [
        { ...finding, candidate: candidate2.id, packageDigest: secondPackage.digest, severity: 'non-blocking' },
      ],
    }).ok,
    false,
  );
  const resolved = {
    ...finding,
    candidate: candidate2.id,
    packageDigest: secondPackage.digest,
    state: 'resolved',
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
  assert.equal('rejectStory' in controller, false);
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
