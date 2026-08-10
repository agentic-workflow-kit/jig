import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { stageDigest } from '@agentic-workflow-kit/jig-codec';

const runtime = await import('../dist/index.js');
const kernel = await import('@agentic-workflow-kit/jig-authority-kernel');

const d = (character) => character.repeat(64);
const run = 'run-000000000044-0123456789abcdef';
const generation = `${run}/gen/1|controller`;
const basis = d('a');
const binding = Object.freeze({ descriptor: d('c'), registry: `registry/${d('c')}`, target: 'target/finalizer' });
const transition = (ordinal) => `${run}/txn/${ordinal}/${generation}|${basis}`;
const operation = (ordinal) => `${transition(ordinal)}/op/1`;
const transitionForOperation = (value) => value.slice(0, value.lastIndexOf('/op/'));
const makeRemoteGateRequirement = (data, required) => {
  const authority = data.finalizer.projection().authority;
  const acceptedPackageDigest = data.acceptanceController.projection().acceptedPackageDigest;
  const value = {
    schema: 'jig.delivery-gate-requirement.v1',
    required,
    subject: required ? 'gate/required' : null,
    correlationKey: required ? 'gate/correlation/1' : null,
    resourceIdentity: required ? 'gate/resource/1' : null,
    maxAgeSeconds: required ? 50 : null,
    asOf: required ? 100 : null,
    acceptedPackageDigest,
    candidate: data.candidate.id,
    targetBasisDigest: data.targetBasisDigest,
    generation,
    authority: authority.authority,
    registry: binding.registry,
    target: binding.target,
  };
  return { ...value, digest: runtime.deriveDeliveryGateRequirementDigest(value) };
};
const policy = runtime.createFinalizerPolicy({
  posture: 'none',
  requiredClasses: [],
  waitCapacitySeconds: 3_600,
  waitTargetSeconds: 1_800,
  refreshLimit: 2,
}).value;

const hash = (value) => createHash('sha256').update(value).digest('hex');
const redigestDeliveryRecords = (records) => {
  let previousDigest = d('0');
  return records.map((record, index) => {
    const entry = { position: index + 1, previousDigest, record };
    const result = stageDigest({ domain: 'DELIVERY-RECORD', excludePaths: [], value: entry });
    assert.equal(result.ok, true, JSON.stringify(result));
    previousDigest = result.value.digest;
    return { ...entry, digest: previousDigest };
  });
};
const manifestFor = (candidate, contentDigest, session) => {
  const basisValue = {
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
    subjectIdentity: candidate,
    subject: `evidence://${candidate}/claim/candidate-content`,
    claim: 'candidate-content',
    producer: { kind: 'principal', principal: 'principal/implementer', session },
    providerManifest: null,
    contentType: 'text/plain',
    contentClass: 'completeness-critical',
    completeness: 'complete',
    originalDigest: d('2'),
    artifactDigest: contentDigest,
    originalSize: 1,
    retainedSize: 1,
    loss: null,
    redaction: { policyVersion: 'scan/v1', status: 'none' },
    retention: { class: 'fixture', windowDays: 1, hold: null },
  };
  const artifactFact = { operation: operation(91), mode: 'put', position: 1, headDigest: d('4'), binding: 'binding' };
  return {
    ...basisValue,
    manifestDigest: hash(
      JSON.stringify({ basis: basisValue, artifactFact, adoptionTransition: `${candidate}/transition` }),
    ),
    disposition: 'admitted',
    artifactFact,
    adoptionTransition: `${candidate}/transition`,
  };
};

const makeCandidate = (key, workspaceCommit = null) => {
  const story = `${run}/story/${key}`;
  const targetBasisDigest = d('f');
  const changedPaths = [];
  const treeDigest = d('e');
  const candidateContentDigest = stageDigest({
    domain: 'CANDIDATE-CONTENT',
    excludePaths: [],
    value: { targetBasisDigest, changedPaths, treeDigest, workspaceCommit },
  }).value.digest;
  const candidate = {
    schema: 'jig.sch-candidate.v1',
    id: `${story}/cand/1|${candidateContentDigest}`,
    run,
    story,
    role: 'implementer',
    session: `${story}/session/implementer/1`,
    principal: 'principal/implementer',
    sessionOrdinal: 1,
    assignmentOrdinal: 1,
    source: 'session-result',
    sourceEventKey: d('1'),
    sourceEvent: {
      event: 'EV-SESSION-RESULT',
      operation: `${transition(1)}/op/1`,
      sessionOrdinal: 1,
      assignmentOrdinal: 1,
      commitProof: {
        kind: 'committed-witnessed',
        position: 0,
        event: `${run}/event/1`,
        transaction: transition(1),
        recordDigest: d('5'),
        witnessDigest: d('5'),
      },
    },
    candidateCreationKey: '',
    runBasisDigest: basis,
    targetBasisDigest,
    changedPaths,
    treeDigest,
    workspaceCommit,
    deliveryMetadata: { changedPaths, commitMessage: null, workspaceCommit, session: `${story}/session/implementer/1` },
    deliveryMetadataDigest: '',
    evidenceManifestDigest: '',
    workspaceFingerprint: '',
    workspaceFactDigest: '',
    candidateContentDigest,
    posture: 'none',
    generation,
    authorizingTransition: transition(1),
    commitProof: {
      kind: 'committed-witnessed',
      position: 0,
      event: `${run}/event/1`,
      transaction: transition(1),
      recordDigest: d('5'),
      witnessDigest: d('5'),
    },
  };
  candidate.candidateCreationKey = stageDigest({
    domain: 'CANDIDATE-CREATION-KEY',
    excludePaths: [],
    value: {
      source: candidate.source,
      story,
      session: candidate.session,
      producerKey: candidate.sourceEventKey,
      candidateContentDigest,
    },
  }).value.digest;
  candidate.deliveryMetadataDigest = stageDigest({
    domain: 'CANDIDATE-DELIVERY-METADATA',
    excludePaths: [],
    value: candidate.deliveryMetadata,
  }).value.digest;
  return { candidate, targetBasisDigest, changedPaths, candidateContentDigest, story };
};

const makeAdmission = (key, workspaceCommit = null) => {
  const data = makeCandidate(key, workspaceCommit);
  const workspaceTransition = runtime.createWorkspaceTransitionRecorder();
  const workspaceController = runtime.createWorkspaceController({
    transition: workspaceTransition,
    fixture: runtime.createScriptedWorkspaceFixture(),
  });
  const observed = workspaceController.observe({
    binding: {
      operation: operation(90),
      operationType: 'OPC-WS-OBSERVE',
      subject: { run, story: data.story, basis },
      repository: 'repository/finalizer-fixture',
      path: '/workspace/finalizer-fixture',
      basis,
      recipeDigest: d('8'),
      inputFingerprintDigest: d('9'),
      host: 'host/finalizer-fixture',
      manifest: `provider/${d('3')}/authority/${d('4')}`,
    },
  });
  assert.equal(observed.ok, true, JSON.stringify(observed));
  data.candidate.workspaceFingerprint = observed.value.workspaceFingerprint;
  data.candidate.workspaceFactDigest = observed.value.contentDigest;
  const manifest = manifestFor(data.candidate.id, data.candidateContentDigest, data.candidate.session);
  data.candidate.evidenceManifestDigest = manifest.manifestDigest;
  const evidenceDigest = runtime.deriveAcceptanceEvidenceDigest({
    schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
    manifest,
    manifestDigest: manifest.manifestDigest,
    candidate: data.candidate.id,
    candidateContentDigest: data.candidateContentDigest,
    targetBasisDigest: data.targetBasisDigest,
    disposition: 'admitted',
    availability: 'available',
  });
  assert.equal(evidenceDigest.ok, true, JSON.stringify(evidenceDigest));
  const publication = runtime.createExplicitAbsenceObservation({
    mode: 'no-venue',
    subject: {
      run,
      story: data.story,
      basis,
      repository: 'repository/finalizer-fixture',
      candidate: data.candidate.id,
      candidateContentDigest: data.candidateContentDigest,
      targetBasisDigest: data.targetBasisDigest,
    },
  });
  assert.equal(publication.ok, true, JSON.stringify(publication));
  const requirementsDigest = runtime.deriveFrozenRequirementsDigest({
    requirements: ['finalize'],
    acceptanceCriteria: ['exact'],
  });
  const policyDigest = runtime.deriveAcceptancePolicyDigest({
    posture: 'none',
    reviewMode: 'no-venue',
    ruleSurfaceDigest: d('6'),
  });
  assert.equal(requirementsDigest.ok && policyDigest.ok, true);
  const acceptanceController = runtime.createScriptedAcceptanceController({ reworkLimit: 2 }).value;
  const assembled = acceptanceController.assemble({
    candidate: data.candidate,
    requirements: {
      schema: 'jig.frozen-requirements.v1',
      requirements: ['finalize'],
      acceptanceCriteria: ['exact'],
      digest: requirementsDigest.value,
    },
    evidence: {
      schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
      manifest,
      manifestDigest: manifest.manifestDigest,
      candidate: data.candidate.id,
      candidateContentDigest: data.candidateContentDigest,
      targetBasisDigest: data.targetBasisDigest,
      disposition: 'admitted',
      availability: 'available',
      integrityDigest: evidenceDigest.value,
    },
    publicationObservation: publication.value,
    policy: {
      schema: 'jig.acceptance-policy.v1',
      posture: 'none',
      reviewMode: 'no-venue',
      ruleSurfaceDigest: d('6'),
      digest: policyDigest.value,
    },
    findings: [],
    contributorPrincipals: [],
  });
  assert.equal(assembled.ok, true, JSON.stringify(assembled));
  const assignment = acceptanceController.assign({
    package: assembled.value,
    session: `${data.story}/session/reviewer/1`,
    principal: 'principal/reviewer',
  });
  assert.equal(assignment.ok, true, JSON.stringify(assignment));
  const verdict = acceptanceController.receiveVerdict({
    assignment: assignment.value,
    verdict: 'approve',
    findings: [],
  });
  assert.equal(verdict.ok, true, JSON.stringify(verdict));
  const verificationRequest = {
    schema: runtime.VERIFICATION_REQUEST_SCHEMA,
    version: runtime.VERIFICATION_CONTRACT_VERSION,
    type: runtime.VERIFICATION_OPERATION,
    port: runtime.VERIFICATION_PORT,
    capability: runtime.VERIFICATION_CAPABILITY,
    operation: operation(4),
    subject: {
      candidate: data.candidate.id,
      candidateContentDigest: data.candidateContentDigest,
      basisDigest: basis,
      checkClasses: [],
      configurationDigest: runtime.deriveVerificationConfigurationDigest({ bindings: [] }).value,
      environmentDigest: runtime.deriveVerificationEnvironmentDigest({
        fingerprint: 'environment/delivery-fixture',
        declaredNames: [],
      }).value,
      cleanReceiptDigest: runtime.deriveVerificationCleanReceiptDigest({
        candidateContentDigest: data.candidateContentDigest,
        targetBasisDigest: data.targetBasisDigest,
      }).value,
    },
    fence: {
      generation,
      basis,
      candidateContentDigest: data.candidateContentDigest,
      targetBasisDigest: data.targetBasisDigest,
    },
    policy: {
      posture: 'none',
      required: [],
      digest: runtime.deriveVerificationPolicyDigest({ posture: 'none', required: [] }).value,
    },
    configuration: { bindings: [], digest: runtime.deriveVerificationConfigurationDigest({ bindings: [] }).value },
    environment: {
      fingerprint: 'environment/delivery-fixture',
      declaredNames: [],
      digest: runtime.deriveVerificationEnvironmentDigest({
        fingerprint: 'environment/delivery-fixture',
        declaredNames: [],
      }).value,
    },
    cleanReceipt: {
      candidateContentDigest: data.candidateContentDigest,
      targetBasisDigest: data.targetBasisDigest,
      receiptDigest: runtime.deriveVerificationCleanReceiptDigest({
        candidateContentDigest: data.candidateContentDigest,
        targetBasisDigest: data.targetBasisDigest,
      }).value,
      checkout: 'read-only',
      scratch: 'discarded',
      network: 'none',
    },
    checkClass: null,
    lifecycle: 'Finalizing',
    retryOrdinal: 1,
    predecessor: null,
    bounds: { waitMs: 5_000, retryLimit: 2 },
  };
  const capability = {
    kind: 'CB-VERIFY',
    port: 'PORT-VERIFY',
    operationClass: 'OPC-VERIFY-EXECUTE',
    subject: data.story,
    fence: verificationRequest.fence,
    resourceScope: 'verify/delivery-fixture',
    manifest: `provider/${d('3')}/authority/${d('4')}`,
  };
  const capDigest = kernel.deriveOperationCapabilityDigest(capability);
  assert.equal(capDigest.ok, true);
  const permit = {
    version: 'jig.operation.v1',
    operation: verificationRequest.operation,
    ordinal: 1,
    type: 'OPC-VERIFY-EXECUTE',
    subject: { run, story: data.story, basis },
    fence: verificationRequest.fence,
    capability: { ...capability, digest: capDigest.value },
    authority: null,
    role: 'controller',
    lifecycle: 'Finalizing',
    proof: {
      kind: 'committed-witnessed',
      position: 3,
      event: `${run}/event/4`,
      transaction: transition(4),
      recordDigest: d('5'),
      witnessDigest: d('5'),
    },
    purpose: 'semantic',
    predecessor: null,
  };
  const verificationAuthorizer = {
    recordDispatch: (input) =>
      input.operation === verificationRequest.operation
        ? { ok: true, value: permit }
        : { ok: false, error: { family: 'FC-AUTHORITY', code: 'NOT_AUTHORIZED' } },
  };
  const verification = runtime.createScriptedVerificationFixture(verificationAuthorizer);
  const registry = runtime.createScriptedRegistry();
  const finalizer = runtime.createScriptedFinalizerController({ binding, registry, verification });
  assert.equal(finalizer.ok, true, JSON.stringify(finalizer));
  const enqueued = finalizer.value.enqueue({
    operation: operation(1),
    run,
    story: data.story,
    comparator: { priority: 1, ordinal: 1, story: data.story },
    policy,
    waitedAt: 10,
    candidateCarrier: data.candidate,
    acceptanceController,
    workspaceController,
  });
  assert.equal(enqueued.ok, true, JSON.stringify(enqueued));
  const granted = finalizer.value.grant({ operation: operation(2), story: data.story, waitedAt: 10 });
  assert.equal(granted.ok, true, JSON.stringify(granted));
  const entry = finalizer.value.enterFinalizing({
    operation: operation(3),
    origin: 'Waiting',
    verificationRequests: [verificationRequest],
  });
  assert.equal(entry.ok, true, JSON.stringify(entry));
  const anchorOperation = operation(6);
  const anchorCarrier = finalizer.value.authorizeAnchor({ operation: anchorOperation, authority: granted.value });
  assert.equal(anchorCarrier.ok, true, JSON.stringify(anchorCarrier));
  return {
    ...data,
    candidate: data.candidate,
    acceptanceController,
    finalizer: finalizer.value,
    anchorOperation,
    registry,
    verificationAuthorizer,
    strategy: null,
  };
};

const factEffect = (
  data,
  op,
  type,
  outcome,
  result = {},
  observedAt = 10,
  failurePhase = null,
  resourceIdentity = null,
  generationOverride = null,
  authorityOverride = null,
  correlationKeyOverride = null,
) => ({
  schema: runtime.DELIVERY_EVENT_SCHEMA,
  kind: 'EV-EFFECT-CERTAINTY',
  operation: op,
  type,
  target: binding.target,
  registry: binding.registry,
  generation: generationOverride ?? generation,
  authority: authorityOverride ?? data.finalizer.projection().authority.authority,
  candidate: data.candidate.id,
  candidateContentDigest: data.candidateContentDigest,
  targetBasisDigest: data.targetBasisDigest,
  correlationKey: correlationKeyOverride ?? `corr/${op.split('/').at(-4)}`,
  resourceIdentity: resourceIdentity ?? `resource/${type.toLowerCase()}`,
  outcome,
  observedAt,
  failurePhase,
  result,
});
const factObservation = (
  data,
  op,
  subject,
  outcome,
  resolvesOperation,
  result = {},
  observedAt = 20,
  correlationKey = null,
  resourceIdentity = null,
) => ({
  schema: runtime.DELIVERY_EVENT_SCHEMA,
  kind: subject === 'target' ? 'EV-TARGET-FACT' : 'EV-DELIVERY-OBSERVATION',
  operation: op,
  subject,
  target: binding.target,
  registry: binding.registry,
  generation,
  authority: data.finalizer.projection().authority.authority,
  candidate: data.candidate.id,
  candidateContentDigest: data.candidateContentDigest,
  targetBasisDigest: data.targetBasisDigest,
  correlationKey: correlationKey ?? `corr/${op.split('/').at(-4)}`,
  resourceIdentity:
    resourceIdentity ??
    (subject === 'effect'
      ? `resource/${resolvesOperation === data.anchorOperation ? 'opc-del-anchor' : 'opc-del-merge'}`
      : 'resource/opc-del-observe'),
  resolvesOperation,
  outcome,
  observedAt,
  result,
});
const request = (data, op, type, _ordinal, subject = 'target', correlationKey = null, resourceIdentity = null) => ({
  operation: op,
  type,
  target: binding.target,
  registry: binding.registry,
  candidate: data.candidate.id,
  candidateContentDigest: data.candidateContentDigest,
  targetBasisDigest: data.targetBasisDigest,
  generation,
  authority: data.finalizer.projection().authority.authority,
  transition: transitionForOperation(op),
  strategy: data.strategy,
  subject,
  correlationKey: correlationKey ?? `corr/${op.split('/').at(-4)}`,
  resourceIdentity:
    resourceIdentity ?? (subject === 'effect' ? 'resource/opc-del-merge' : `resource/${type.toLowerCase()}`),
});

const makeController = (
  mode = 'merge-commit',
  key = `delivery-${mode}`,
  workspaceCommit = null,
  offset = 0,
  uncertainMerge = false,
  heldMerge = false,
  specialMerge = null,
  observedTreeDigest = null,
  targetOutcome = 'ready',
  anchorConflict = false,
  preDispatchAbsentType = null,
  staleEffectFence = false,
  remoteGateRequired = false,
  remoteGateObservedAt = 90,
  remoteGateState = 'pass',
  secondTargetOutcome = null,
  recoveryObservationOutcome = 'absent',
  retryLimit = undefined,
  anchorUncertain = false,
  anchorObservationResolvesOperation = null,
  anchorObservationCorrelationKey = null,
  anchorObservationResourceIdentity = null,
  anchorObservationOutcome = 'present',
  anchorRetryOutcomes = null,
  anchorRecoveryOutcomes = null,
  anchorRetryLanding = false,
  anchorDirectFailurePhase = 'pre-dispatch',
  recoveryTypes = [],
) => {
  const data = makeAdmission(key, workspaceCommit);
  data.strategy = mode;
  const remoteGate = makeRemoteGateRequirement(data, remoteGateRequired);
  const digest = runtime.deriveDeliveryStrategyDigest(mode);
  const effects = [];
  const nonAnchorOperation = (ordinal) => operation(offset + ordinal + 10);
  const anchorRetryOperations = (anchorRetryOutcomes ?? []).map((_, index) => operation(offset + 70 + index));
  const addEffect = (ordinal, type, outcome = 'success', result = {}, observedAt = 10, failurePhase = null) => {
    const effectOperation = type === 'OPC-DEL-ANCHOR' ? data.anchorOperation : nonAnchorOperation(ordinal);
    const effectOutcome =
      type === 'OPC-DEL-ANCHOR' && anchorConflict
        ? 'conflict'
        : type === 'OPC-DEL-ANCHOR' && anchorUncertain
          ? 'uncertain'
          : recoveryTypes.includes(type)
            ? 'uncertain'
            : preDispatchAbsentType === type
              ? 'absent'
              : outcome;
    effects.push(
      factEffect(
        data,
        effectOperation,
        type,
        effectOutcome,
        result,
        observedAt,
        type === preDispatchAbsentType
          ? type === 'OPC-DEL-ANCHOR'
            ? anchorDirectFailurePhase
            : 'pre-dispatch'
          : failurePhase,
        null,
        staleEffectFence ? `${run}/gen/2|stale` : null,
        staleEffectFence ? 'target/finalizer/auth/2' : null,
      ),
    );
  };
  addEffect(1, 'OPC-DEL-ANCHOR', 'success', { anchorRegistry: binding.registry });
  for (const [index, outcome] of (anchorRetryOutcomes ?? []).entries()) {
    effects.push(
      factEffect(
        data,
        anchorRetryOperations[index],
        'OPC-DEL-ANCHOR',
        outcome,
        outcome === 'success' ? { anchorRegistry: binding.registry } : {},
        30 + index,
        null,
        'resource/opc-del-anchor',
        null,
        null,
        `corr/${data.anchorOperation.split('/').at(-4)}`,
      ),
    );
  }
  addEffect(2, 'OPC-DEL-PUBLISH');
  addEffect(3, 'OPC-DEL-REQUEST');
  addEffect(4, 'OPC-DEL-STATUS');
  addEffect(5, 'OPC-DEL-COMMENT');
  addEffect(
    6,
    'OPC-DEL-MERGE',
    specialMerge ?? (uncertainMerge ? 'uncertain' : heldMerge ? 'held' : 'success'),
    {},
    10,
  );
  const changedPathsDigest = runtime.deriveDeliveryChangeSetDigest({
    targetBasisDigest: data.targetBasisDigest,
    changedPaths: [],
  });
  const targetResult =
    mode === 'direct-fast-forward'
      ? { commit: workspaceCommit, treeDigest: data.candidate.treeDigest, contentDigest: data.candidateContentDigest }
      : { treeDigest: observedTreeDigest ?? data.candidate.treeDigest, changedPathsDigest };
  const mergeCorrelation = `corr/${nonAnchorOperation(6).split('/').at(-4)}`;
  const anchorAttemptOperations = [data.anchorOperation, ...anchorRetryOperations];
  const recoveredEffectObservations = recoveryTypes.map((type, index) => {
    const effectOperation =
      type === 'OPC-DEL-ANCHOR'
        ? data.anchorOperation
        : nonAnchorOperation(
            type === 'OPC-DEL-PUBLISH'
              ? 2
              : type === 'OPC-DEL-REQUEST'
                ? 3
                : type === 'OPC-DEL-STATUS'
                  ? 4
                  : type === 'OPC-DEL-COMMENT'
                    ? 5
                    : 6,
          );
    const correlation = `corr/${effectOperation.split('/').at(-4)}`;
    const resourceIdentity = `resource/${type.toLowerCase()}`;
    return factObservation(
      data,
      nonAnchorOperation(7 + index),
      'effect',
      'present',
      effectOperation,
      {},
      20 + index,
      correlation,
      resourceIdentity,
    );
  });
  const observations = anchorUncertain
    ? [
        ...(anchorRecoveryOutcomes ?? [anchorObservationOutcome]).map((outcome, index) =>
          factObservation(
            data,
            nonAnchorOperation(7 + index),
            'effect',
            outcome,
            anchorObservationResolvesOperation ?? anchorAttemptOperations[index],
            outcome === 'present' ? { anchorRegistry: binding.registry } : {},
            20 + index,
            index === 0
              ? (anchorObservationCorrelationKey ?? `corr/${data.anchorOperation.split('/').at(-4)}`)
              : `corr/${data.anchorOperation.split('/').at(-4)}`,
            index === 0 ? (anchorObservationResourceIdentity ?? 'resource/opc-del-anchor') : 'resource/opc-del-anchor',
          ),
        ),
        ...(anchorRetryLanding
          ? [
              factObservation(
                data,
                nonAnchorOperation(30),
                'target',
                targetOutcome,
                nonAnchorOperation(6),
                targetResult,
                40,
                mergeCorrelation,
              ),
            ]
          : []),
      ]
    : recoveryTypes.length > 0
      ? [
          ...recoveredEffectObservations,
          ...(recoveryTypes.includes('OPC-DEL-MERGE')
            ? [
                factObservation(
                  data,
                  nonAnchorOperation(30),
                  'target',
                  targetOutcome,
                  nonAnchorOperation(6),
                  targetResult,
                  40,
                  mergeCorrelation,
                ),
              ]
            : []),
        ]
      : uncertainMerge
        ? [
            factObservation(
              data,
              nonAnchorOperation(7),
              'effect',
              recoveryObservationOutcome,
              nonAnchorOperation(6),
              {},
              20,
              mergeCorrelation,
            ),
          ]
        : heldMerge
          ? [
              factObservation(
                data,
                nonAnchorOperation(7),
                'target',
                'held',
                nonAnchorOperation(6),
                {},
                100,
                mergeCorrelation,
              ),
              factObservation(
                data,
                nonAnchorOperation(8),
                'target',
                'held',
                nonAnchorOperation(6),
                {},
                1_900,
                mergeCorrelation,
              ),
            ]
          : [
              ...(remoteGateRequired
                ? [
                    factObservation(
                      data,
                      nonAnchorOperation(9),
                      'gate',
                      'ready',
                      null,
                      {
                        gateSubject: remoteGate.subject,
                        gateState: remoteGateState,
                        attestationDigest: d('b'),
                      },
                      remoteGateObservedAt,
                      remoteGate.correlationKey,
                      remoteGate.resourceIdentity,
                    ),
                  ]
                : []),
              factObservation(
                data,
                nonAnchorOperation(7),
                'target',
                targetOutcome,
                nonAnchorOperation(6),
                targetResult,
                20,
                mergeCorrelation,
              ),
              ...(secondTargetOutcome
                ? [
                    factObservation(
                      data,
                      nonAnchorOperation(8),
                      'target',
                      secondTargetOutcome,
                      nonAnchorOperation(6),
                      targetResult,
                      30,
                      mergeCorrelation,
                    ),
                  ]
                : []),
            ];
  const mechanism = runtime.createScriptedDeliveryMechanism({ effects, observations });
  assert.equal(mechanism.ok, true, JSON.stringify(mechanism));
  const controller = runtime.createScriptedDeliveryController({
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: data.finalizer.snapshot(),
    registry: data.registry,
    remoteGate,
    retryLimit,
    strategy: { mode, digest: digest },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: mechanism.value,
    initialSnapshot: undefined,
  });
  assert.equal(controller.ok, true, JSON.stringify(controller));
  return {
    ...data,
    controller: controller.value,
    mechanism: mechanism.value,
    operations: {
      anchor: data.anchorOperation,
      publish: nonAnchorOperation(2),
      request: nonAnchorOperation(3),
      status: nonAnchorOperation(4),
      comment: nonAnchorOperation(5),
      merge: nonAnchorOperation(6),
      observe: nonAnchorOperation(7),
      observe2: nonAnchorOperation(8),
      gate: nonAnchorOperation(9),
      anchorRetry: anchorRetryOperations,
      target: nonAnchorOperation(30),
    },
    mode,
    remoteGate,
    changedPathsDigest,
    targetResult,
  };
};

const authorizeAndDispatch = (data, type, op, ordinal) => {
  const authorized = data.controller.authorize(request(data, op, type, ordinal));
  assert.equal(authorized.ok, true, JSON.stringify(authorized));
  const dispatched = data.controller.dispatch({ operation: op });
  assert.equal(dispatched.ok, true, JSON.stringify(dispatched));
};

test('CF-MECH-DELIVERY/MC-044-02: all final-delivery operations are fenced, durable, and provider-attested', () => {
  const data = makeController();
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  assert.equal(data.controller.projection().finalizer.anchorRegistry, binding.registry);
  assert.deepEqual(data.controller.projection().finalizer.pendingDeliveryOperations, []);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  assert.equal(
    data.controller.authorize(
      request(
        data,
        data.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'target',
        `corr/${data.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    false,
  );
  authorizeAndDispatch(data, 'OPC-DEL-STATUS', data.operations.status, 4);
  authorizeAndDispatch(data, 'OPC-DEL-COMMENT', data.operations.comment, 5);
  authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
  const observed = data.controller.authorize(
    request(
      data,
      data.operations.observe,
      'OPC-DEL-OBSERVE',
      7,
      'target',
      `corr/${data.operations.merge.split('/').at(-4)}`,
    ),
  );
  assert.equal(observed.ok, true, JSON.stringify(observed));
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'target' }).ok, true);
  const landed = data.controller.recordLanded({
    operation: operation(99),
    mergeOperation: data.operations.merge,
    targetObservationOperation: data.operations.observe,
  });
  assert.equal(landed.ok, true, JSON.stringify(landed));
  assert.equal(data.controller.projection().status, 'Landed');
  assert.deepEqual(data.controller.projection().releasedStories, [data.story]);
  assert.equal(data.controller.reachability().landingEnabled, false);
});

test('GF044-MC-07/MC-08: a later advanced target observation permanently invalidates an earlier ready proof', () => {
  const data = makeController(
    'merge-commit',
    'delivery-stale-ready',
    null,
    50,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    'advanced',
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
  assert.equal(
    data.controller.authorize(
      request(
        data,
        data.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'target',
        `corr/${data.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'target' }).ok, true);
  assert.equal(
    data.controller.authorize(
      request(
        data,
        data.operations.observe2,
        'OPC-DEL-OBSERVE',
        8,
        'target',
        `corr/${data.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe2, subject: 'target' }).ok, true);
  assert.equal(data.controller.projection().status, 'Parked');
  assert.deepEqual(
    data.controller.recordLanded({
      operation: operation(59),
      mergeOperation: data.operations.merge,
      targetObservationOperation: data.operations.observe,
    }).error,
    { family: 'FC-AUTHORITY', code: 'DELIVERY_TERMINAL' },
  );
});

test('GF044-MC-02/MC-06/RP-REMOTE: required gates are exact, fresh, passing, and consumed before merge', () => {
  const missing = makeController(
    'merge-commit',
    'delivery-required-gate-missing',
    null,
    60,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    true,
  );
  authorizeAndDispatch(missing, 'OPC-DEL-ANCHOR', missing.operations.anchor, 1);
  authorizeAndDispatch(missing, 'OPC-DEL-PUBLISH', missing.operations.publish, 2);
  authorizeAndDispatch(missing, 'OPC-DEL-REQUEST', missing.operations.request, 3);
  assert.deepEqual(missing.controller.authorize(request(missing, missing.operations.merge, 'OPC-DEL-MERGE', 6)).error, {
    family: 'FC-EVIDENCE',
    code: 'REMOTE_GATE_REQUIRED',
  });
  assert.deepEqual(
    missing.controller.authorize(
      request(
        missing,
        missing.operations.gate,
        'OPC-DEL-OBSERVE',
        9,
        'gate',
        'gate/foreign',
        missing.remoteGate.resourceIdentity,
      ),
    ).error,
    { family: 'FC-FENCE', code: 'REMOTE_GATE_OPERATION_FENCE_MISMATCH' },
  );
  assert.equal(
    missing.controller.authorize(
      request(
        missing,
        missing.operations.gate,
        'OPC-DEL-OBSERVE',
        9,
        'gate',
        missing.remoteGate.correlationKey,
        missing.remoteGate.resourceIdentity,
      ),
    ).ok,
    true,
  );
  assert.equal(missing.controller.observe({ operation: missing.operations.gate, subject: 'gate' }).ok, true);
  authorizeAndDispatch(missing, 'OPC-DEL-MERGE', missing.operations.merge, 6);

  const stale = makeController(
    'merge-commit',
    'delivery-required-gate-stale',
    null,
    70,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    true,
    0,
  );
  authorizeAndDispatch(stale, 'OPC-DEL-ANCHOR', stale.operations.anchor, 1);
  authorizeAndDispatch(stale, 'OPC-DEL-PUBLISH', stale.operations.publish, 2);
  authorizeAndDispatch(stale, 'OPC-DEL-REQUEST', stale.operations.request, 3);
  assert.equal(
    stale.controller.authorize(
      request(
        stale,
        stale.operations.gate,
        'OPC-DEL-OBSERVE',
        9,
        'gate',
        stale.remoteGate.correlationKey,
        stale.remoteGate.resourceIdentity,
      ),
    ).ok,
    true,
  );
  assert.deepEqual(stale.controller.observe({ operation: stale.operations.gate, subject: 'gate' }).error, {
    family: 'FC-EVIDENCE',
    code: 'REMOTE_GATE_ATTESTATION_INVALID',
  });
});

test('GF044-MC-01/MC-03/CF-DOUBLE-EFFECT: wrong binding, exact intent replay, and response uncertainty fail closed', () => {
  const data = makeController('merge-commit', 'delivery-uncertain', null, 100, true);
  assert.deepEqual(data.controller.authorize(request(data, operation(999), 'OPC-DEL-ANCHOR', 1)).error, {
    family: 'FC-FENCE',
    code: 'GF043_ANCHOR_OPERATION_MISMATCH',
  });
  const bad = data.controller.authorize({
    ...request(data, data.operations.anchor, 'OPC-DEL-ANCHOR', 1),
    target: 'target/other',
  });
  assert.deepEqual(bad.error, { family: 'FC-FENCE', code: 'DELIVERY_OPERATION_FENCE_MISMATCH' });
  const first = data.controller.authorize(request(data, data.operations.anchor, 'OPC-DEL-ANCHOR', 1));
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(data.controller.authorize(request(data, data.operations.anchor, 'OPC-DEL-ANCHOR', 1)).ok, true);
  assert.equal(data.controller.dispatch({ operation: data.operations.anchor }).ok, true);
  assert.equal(data.controller.dispatch({ operation: data.operations.anchor }).ok, false);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  const merge = data.controller.authorize(request(data, data.operations.merge, 'OPC-DEL-MERGE', 6));
  assert.equal(merge.ok, true, JSON.stringify(merge));
  assert.equal(data.controller.dispatch({ operation: data.operations.merge }).ok, true);
  assert.equal(data.controller.projection().status, 'Recovering');
  assert.equal(data.controller.authorize(request(data, data.operations.status, 'OPC-DEL-STATUS', 4)).ok, false);
});

test('GF044-MC-01: stale generation and ID-AUTH echoes cannot attest an otherwise matching effect', () => {
  const data = makeController(
    'merge-commit',
    'delivery-stale-fence',
    null,
    120,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    true,
  );
  const authorized = data.controller.authorize(request(data, data.operations.anchor, 'OPC-DEL-ANCHOR', 1));
  assert.equal(authorized.ok, true, JSON.stringify(authorized));
  assert.deepEqual(data.controller.dispatch({ operation: data.operations.anchor }).error, {
    family: 'FC-FENCE',
    code: 'EFFECT_FACT_FENCE_MISMATCH',
  });
});

test('GF044-MC-04: crash/replay reconciles an uncertain effect with an effect-free observation and permits only a new ID-OP', () => {
  const data = makeController('merge-commit', 'delivery-recovery', null, 200, true);
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  const merge = data.controller.authorize(request(data, data.operations.merge, 'OPC-DEL-MERGE', 6));
  assert.equal(merge.ok, true);
  assert.equal(data.controller.dispatch({ operation: data.operations.merge }).ok, true);
  const recovered = runtime.restoreScriptedDeliveryController(data.controller.snapshot(), {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: data.controller.snapshot().finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.equal(recovered.ok, true, JSON.stringify(recovered));
  assert.equal(recovered.value.projection().finalizer.anchorRegistry, binding.registry);
  assert.deepEqual(recovered.value.projection().finalizer.pendingDeliveryOperations, []);
  const observation = recovered.value.authorize(
    request(
      data,
      data.operations.observe,
      'OPC-DEL-OBSERVE',
      7,
      'effect',
      `corr/${data.operations.merge.split('/').at(-4)}`,
    ),
  );
  assert.equal(observation.ok, true, JSON.stringify(observation));
  const recoveredObservation = recovered.value.observe({ operation: data.operations.observe, subject: 'effect' });
  assert.equal(recoveredObservation.ok, true, JSON.stringify(recoveredObservation));
  assert.equal(recovered.value.projection().status, 'Ready');
  const replacement = operation(209);
  assert.equal(recovered.value.authorize(request(data, replacement, 'OPC-DEL-MERGE', 9)).ok, true);
  assert.equal(recovered.value.authorize(request(data, data.operations.merge, 'OPC-DEL-MERGE', 6)).ok, true);
  assert.equal(recovered.value.dispatch({ operation: data.operations.merge }).ok, false);
});

test('GF044-MC-04/MC-07: anchor recovery bridges only the exact original operation, correlation, and resource', () => {
  const exact = makeController(
    'merge-commit',
    'delivery-anchor-recovery-exact',
    null,
    320,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    undefined,
    true,
  );
  authorizeAndDispatch(exact, 'OPC-DEL-ANCHOR', exact.operations.anchor, 1);
  const exactCorrelation = `corr/${exact.anchorOperation.split('/').at(-4)}`;
  assert.equal(
    exact.controller.authorize(
      request(
        exact,
        exact.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'effect',
        exactCorrelation,
        'resource/opc-del-anchor',
      ),
    ).ok,
    true,
  );
  assert.equal(exact.controller.observe({ operation: exact.operations.observe, subject: 'effect' }).ok, true);
  assert.equal(exact.controller.projection().finalizer.anchorRegistry, binding.registry);
  assert.equal(exact.controller.projection().status, 'Ready');

  for (const [label, overrides] of [
    ['resolves-operation', { resolvesOperation: operation(7) }],
    ['correlation', { correlationKey: 'corr/foreign' }],
    ['resource', { resourceIdentity: 'resource/foreign' }],
  ]) {
    const data = makeController(
      'merge-commit',
      `delivery-anchor-recovery-${label}`,
      null,
      340 + label.length,
      false,
      false,
      null,
      null,
      'ready',
      false,
      null,
      false,
      false,
      90,
      'pass',
      null,
      'absent',
      undefined,
      true,
      overrides.resolvesOperation ?? null,
      overrides.correlationKey ?? null,
      overrides.resourceIdentity ?? null,
    );
    authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
    const correlation = overrides.correlationKey ?? `corr/${data.anchorOperation.split('/').at(-4)}`;
    const resource = overrides.resourceIdentity ?? 'resource/opc-del-anchor';
    const authorized = data.controller.authorize(
      request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7, 'effect', correlation, resource),
    );
    assert.equal(authorized.ok, true, `${label}: ${JSON.stringify(authorized)}`);
    const rejected = data.controller.observe({ operation: data.operations.observe, subject: 'effect' });
    assert.deepEqual(rejected.error, { family: 'FC-FENCE', code: 'GF043_ANCHOR_RECOVERY_FACT_MISMATCH' });
    assert.equal(data.controller.projection().status, 'Recovering');
    assert.equal(data.controller.projection().recovery?.observations, 0);
    assert.deepEqual(data.controller.projection().finalizer.pendingDeliveryOperations, [data.anchorOperation]);
    const snapshot = data.controller.snapshot();
    assert.equal(
      snapshot.finalizerSnapshot.records.some((entry) => entry.record.kind === 'target-fact'),
      false,
    );
    const restored = runtime.restoreScriptedDeliveryController(snapshot, {
      acceptanceSnapshot: data.acceptanceController.snapshot(),
      binding,
      candidateCarrier: data.candidate,
      finalizerSnapshot: snapshot.finalizerSnapshot,
      remoteGate: data.remoteGate,
      registry: data.registry,
      retryLimit: data.controller.projection().carrier.retryLimit,
      strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
      verificationAuthorizer: data.verificationAuthorizer,
      mechanism: data.mechanism,
    });
    assert.equal(restored.ok, true, `${label}: ${JSON.stringify(restored)}`);
    const replayRejected = restored.value.observe({ operation: data.operations.observe, subject: 'effect' });
    assert.deepEqual(replayRejected.error, { family: 'FC-FENCE', code: 'GF043_ANCHOR_RECOVERY_FACT_MISMATCH' });
    assert.deepEqual(restored.value.projection().finalizer.pendingDeliveryOperations, [data.anchorOperation]);
  }
});

test('GF044-MC-04: exact anchor absence resolves recovery without mutating the finalizer and survives replay/restore', () => {
  const data = makeController(
    'merge-commit',
    'delivery-anchor-recovery-absent',
    null,
    390,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    undefined,
    true,
    null,
    null,
    null,
    'absent',
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  const correlation = `corr/${data.anchorOperation.split('/').at(-4)}`;
  assert.equal(
    data.controller.authorize(
      request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'effect' }).ok, true);
  assert.equal(data.controller.projection().status, 'Ready');
  assert.equal(data.controller.projection().recovery, null);
  assert.deepEqual(data.controller.projection().finalizer.pendingDeliveryOperations, [data.anchorOperation]);
  assert.equal(
    data.controller.snapshot().finalizerSnapshot.records.some((entry) => entry.record.kind === 'target-fact'),
    false,
  );

  const restored = runtime.restoreScriptedDeliveryController(data.controller.snapshot(), {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: data.controller.snapshot().finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    retryLimit: data.controller.projection().carrier.retryLimit,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.projection(), data.controller.projection());
});

test('GF044-MC-04/MC-07: exact anchor absence authorizes a fresh bounded replacement operation across restore', () => {
  const data = makeController(
    'merge-commit',
    'delivery-anchor-retry',
    null,
    420,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    2,
    true,
    null,
    null,
    null,
    'present',
    ['success'],
    ['absent'],
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  const correlation = `corr/${data.anchorOperation.split('/').at(-4)}`;
  const replacement = data.operations.anchorRetry[0];
  assert.deepEqual(
    data.controller.authorize(
      request(data, replacement, 'OPC-DEL-ANCHOR', 2, 'effect', correlation, 'resource/opc-del-anchor'),
    ).error,
    { family: 'FC-RECOVERY', code: 'RECOVERY_OBSERVATION_REQUIRED' },
  );
  assert.equal(
    data.controller.authorize(
      request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'effect' }).ok, true);

  const snapshot = data.controller.snapshot();
  const restored = runtime.restoreScriptedDeliveryController(snapshot, {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    retryLimit: data.controller.projection().carrier.retryLimit,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(
    restored.value.authorize({
      ...request(data, replacement, 'OPC-DEL-ANCHOR', 2, 'effect', correlation, 'resource/opc-del-anchor'),
      target: 'target/foreign',
    }).error,
    { family: 'FC-FENCE', code: 'DELIVERY_OPERATION_FENCE_MISMATCH' },
  );
  assert.deepEqual(
    restored.value.authorize(
      request(data, replacement, 'OPC-DEL-ANCHOR', 2, 'effect', 'corr/foreign', 'resource/foreign'),
    ).error,
    { family: 'FC-FENCE', code: 'RETRY_RESOURCE_FENCE_MISMATCH' },
  );
  const authorized = restored.value.authorize(
    request(data, replacement, 'OPC-DEL-ANCHOR', 2, 'effect', correlation, 'resource/opc-del-anchor'),
  );
  assert.equal(authorized.ok, true, JSON.stringify(authorized));
  const retrySnapshot = restored.value.snapshot();
  const replayed = runtime.restoreScriptedDeliveryController(retrySnapshot, {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: retrySnapshot.finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    retryLimit: data.controller.projection().carrier.retryLimit,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  const retryRecord = replayed.value.records().find((entry) => entry.record.kind === 'retry-authorized');
  assert.deepEqual(retryRecord?.record, {
    kind: 'retry-authorized',
    operation: replacement,
    predecessor: data.anchorOperation,
    ordinal: 1,
    correlationKey: correlation,
    resourceIdentity: 'resource/opc-del-anchor',
  });
  assert.equal(replayed.value.dispatch({ operation: replacement }).ok, true);
  assert.equal(replayed.value.projection().finalizer.anchorRegistry, binding.registry);
  assert.deepEqual(replayed.value.projection().finalizer.pendingDeliveryOperations, []);
  assert.equal(replayed.value.dispatch({ operation: data.anchorOperation }).ok, false);
  assert.equal(
    replayed.value.authorize(
      request(data, replacement, 'OPC-DEL-ANCHOR', 2, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  assert.equal(replayed.value.dispatch({ operation: replacement }).ok, false);
});

test('GF044-MC-04/BND-RETRY: anchor replacement exhausts at the configured bound and does not bypass lineage', () => {
  const data = makeController(
    'merge-commit',
    'delivery-anchor-retry-exhaustion',
    null,
    450,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    1,
    true,
    null,
    null,
    null,
    'present',
    ['uncertain'],
    ['absent', 'absent'],
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  const correlation = `corr/${data.anchorOperation.split('/').at(-4)}`;
  assert.equal(
    data.controller.authorize(
      request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'effect' }).ok, true);
  const replacement = data.operations.anchorRetry[0];
  assert.equal(
    data.controller.authorize(
      request(data, replacement, 'OPC-DEL-ANCHOR', 2, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  assert.equal(data.controller.dispatch({ operation: replacement }).ok, true);
  assert.equal(
    data.controller.authorize(
      request(data, data.operations.observe2, 'OPC-DEL-OBSERVE', 8, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe2, subject: 'effect' }).ok, true);
  const exhausted = data.controller.authorize(
    request(data, operation(999), 'OPC-DEL-ANCHOR', 3, 'effect', correlation, 'resource/opc-del-anchor'),
  );
  assert.deepEqual(exhausted.error, { family: 'FC-BOUND', code: 'DELIVERY_RETRY_EXHAUSTED' });
  assert.equal(data.controller.projection().status, 'Ready');
  assert.equal(data.controller.records().filter((entry) => entry.record.kind === 'retry-authorized').length, 1);
});

test('GF044-MC-04/MC-05/MC-06: direct pre-dispatch anchor absence restores, retries, lands, and releases', () => {
  const data = makeController(
    'merge-commit',
    'delivery-anchor-direct-absence',
    null,
    540,
    false,
    false,
    null,
    null,
    'ready',
    false,
    'OPC-DEL-ANCHOR',
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    2,
    false,
    null,
    null,
    null,
    'present',
    ['success'],
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  assert.equal(data.controller.projection().status, 'Ready');
  const snapshot = data.controller.snapshot();
  const restored = runtime.restoreScriptedDeliveryController(snapshot, {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    retryLimit: 2,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  data.controller = restored.value;
  const correlation = `corr/${data.anchorOperation.split('/').at(-4)}`;
  const replacement = data.operations.anchorRetry[0];
  assert.equal(
    data.controller.authorize(
      request(data, replacement, 'OPC-DEL-ANCHOR', 2, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  assert.equal(data.controller.dispatch({ operation: replacement }).ok, true);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  authorizeAndDispatch(data, 'OPC-DEL-STATUS', data.operations.status, 4);
  authorizeAndDispatch(data, 'OPC-DEL-COMMENT', data.operations.comment, 5);
  authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
  const mergeCorrelation = `corr/${data.operations.merge.split('/').at(-4)}`;
  assert.equal(
    data.controller.authorize(request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7, 'target', mergeCorrelation))
      .ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'target' }).ok, true);
  const landed = data.controller.recordLanded({
    operation: operation(559),
    mergeOperation: data.operations.merge,
    targetObservationOperation: data.operations.observe,
  });
  assert.equal(landed.ok, true, JSON.stringify(landed));
  assert.equal(data.controller.projection().status, 'Landed');
  assert.deepEqual(data.controller.projection().releasedStories, [data.story]);
  assert.deepEqual(data.controller.projection().finalizer.pendingDeliveryOperations, []);
});

test('GF044-MC-04: direct anchor absence rejects post-dispatch and unspecified failure phases', () => {
  for (const [label, phase] of [
    ['post-dispatch', 'post-dispatch'],
    ['unspecified', null],
  ]) {
    const data = makeController(
      'merge-commit',
      `delivery-anchor-direct-${label}`,
      null,
      label === 'post-dispatch' ? 570 : 580,
      false,
      false,
      null,
      null,
      'ready',
      false,
      'OPC-DEL-ANCHOR',
      false,
      false,
      90,
      'pass',
      null,
      'absent',
      2,
      false,
      null,
      null,
      null,
      'present',
      ['success'],
      null,
      false,
      phase,
    );
    authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
    assert.deepEqual(
      data.controller.authorize(
        request(
          data,
          data.operations.anchorRetry[0],
          'OPC-DEL-ANCHOR',
          2,
          'effect',
          `corr/${data.anchorOperation.split('/').at(-4)}`,
          'resource/opc-del-anchor',
        ),
      ).error,
      { family: 'FC-RECOVERY', code: 'GF043_ANCHOR_REAUTHORIZATION_REQUIRED' },
    );
  }
});

test('GF044-MC-04/CF-DOUBLE-EFFECT: direct absence replay rejects an effect-before-intent forged journal', () => {
  const data = makeController(
    'merge-commit',
    'delivery-anchor-direct-order',
    null,
    590,
    false,
    false,
    null,
    null,
    'ready',
    false,
    'OPC-DEL-ANCHOR',
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    2,
    false,
    null,
    null,
    null,
    'present',
    ['success'],
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  const correlation = `corr/${data.anchorOperation.split('/').at(-4)}`;
  assert.equal(
    data.controller.authorize(
      request(
        data,
        data.operations.anchorRetry[0],
        'OPC-DEL-ANCHOR',
        2,
        'effect',
        correlation,
        'resource/opc-del-anchor',
      ),
    ).ok,
    true,
  );
  const snapshot = data.controller.snapshot();
  const records = [...snapshot.records];
  const intent = records.find(
    (entry) => entry.record.kind === 'intent' && entry.record.intent.operation === data.anchorOperation,
  );
  const effect = records.find(
    (entry) => entry.record.kind === 'effect' && entry.record.fact.operation === data.anchorOperation,
  );
  assert.ok(intent && effect);
  const moved = new Set([intent, effect]);
  const forged = {
    ...snapshot,
    records: redigestDeliveryRecords([
      effect.record,
      intent.record,
      ...records.filter((entry) => !moved.has(entry)).map((entry) => entry.record),
    ]),
  };
  const restored = runtime.restoreScriptedDeliveryController(forged, {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    retryLimit: 2,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.deepEqual(restored.error, { family: 'FC-FENCE', code: 'GF043_ANCHOR_REAUTHORIZATION_REQUIRED' });
});

test('GF044-MC-05/MC-06/MC-07: fresh anchor retry completes delivery landing and release through the original GF-043 carrier', () => {
  const data = makeController(
    'merge-commit',
    'delivery-anchor-retry-landing',
    null,
    480,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    2,
    true,
    null,
    null,
    null,
    'present',
    ['success'],
    ['absent'],
    true,
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  const correlation = `corr/${data.anchorOperation.split('/').at(-4)}`;
  assert.equal(
    data.controller.authorize(
      request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'effect' }).ok, true);
  const replacement = data.operations.anchorRetry[0];
  assert.equal(
    data.controller.authorize(
      request(data, replacement, 'OPC-DEL-ANCHOR', 2, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  assert.equal(data.controller.dispatch({ operation: replacement }).ok, true);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  authorizeAndDispatch(data, 'OPC-DEL-STATUS', data.operations.status, 4);
  authorizeAndDispatch(data, 'OPC-DEL-COMMENT', data.operations.comment, 5);
  authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
  const mergeCorrelation = `corr/${data.operations.merge.split('/').at(-4)}`;
  assert.equal(
    data.controller.authorize(request(data, data.operations.target, 'OPC-DEL-OBSERVE', 30, 'target', mergeCorrelation))
      .ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.target, subject: 'target' }).ok, true);
  const landed = data.controller.recordLanded({
    operation: operation(499),
    mergeOperation: data.operations.merge,
    targetObservationOperation: data.operations.target,
  });
  assert.equal(landed.ok, true, JSON.stringify(landed));
  assert.equal(landed.value.operation, operation(499));
  assert.equal(data.controller.projection().status, 'Landed');
  assert.deepEqual(data.controller.projection().releasedStories, [data.story]);
  assert.deepEqual(data.controller.projection().finalizer.pendingDeliveryOperations, []);
});

test('GF044-MC-04/CF-DOUBLE-EFFECT: retry replay rejects absence resolution whose causal journal order is forged', () => {
  const data = makeController(
    'merge-commit',
    'delivery-anchor-retry-order',
    null,
    510,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    2,
    true,
    null,
    null,
    null,
    'present',
    ['success'],
    ['absent'],
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  const correlation = `corr/${data.anchorOperation.split('/').at(-4)}`;
  assert.equal(
    data.controller.authorize(
      request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'effect' }).ok, true);
  const replacement = data.operations.anchorRetry[0];
  assert.equal(
    data.controller.authorize(
      request(data, replacement, 'OPC-DEL-ANCHOR', 2, 'effect', correlation, 'resource/opc-del-anchor'),
    ).ok,
    true,
  );
  const snapshot = data.controller.snapshot();
  const records = [...snapshot.records];
  const originalIntent = records.find(
    (entry) => entry.record.kind === 'intent' && entry.record.intent.operation === data.anchorOperation,
  );
  const observationIntent = records.find(
    (entry) => entry.record.kind === 'intent' && entry.record.intent.operation === data.operations.observe,
  );
  const observation = records.find(
    (entry) => entry.record.kind === 'observation' && entry.record.fact.operation === data.operations.observe,
  );
  const effect = records.find(
    (entry) => entry.record.kind === 'effect' && entry.record.fact.operation === data.anchorOperation,
  );
  const resolution = records.find(
    (entry) => entry.record.kind === 'recovery-resolved' && entry.record.operation === data.anchorOperation,
  );
  assert.ok(originalIntent && observationIntent && observation && effect && resolution);
  const moved = new Set([originalIntent, observationIntent, observation, effect, resolution]);
  const reordered = [
    originalIntent,
    observationIntent,
    observation,
    effect,
    resolution,
    ...records.filter((entry) => !moved.has(entry)),
  ];
  const forged = { ...snapshot, records: redigestDeliveryRecords(reordered.map((entry) => entry.record)) };
  const restored = runtime.restoreScriptedDeliveryController(forged, {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    retryLimit: data.controller.projection().carrier.retryLimit,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.deepEqual(restored.error, { family: 'FC-FENCE', code: 'GF043_ANCHOR_REAUTHORIZATION_REQUIRED' });
});

test('GF044 hosted correction: restore derives status from the authenticated journal and rejects a forged snapshot status', () => {
  const data = makeController();
  const snapshot = { ...data.controller.snapshot(), status: 'Parked' };
  const restored = runtime.restoreScriptedDeliveryController(snapshot, {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    retryLimit: data.controller.projection().carrier.retryLimit,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.deepEqual(restored.error, { family: 'FC-TRUST', code: 'DELIVERY_STATUS_REPLAY_MISMATCH' });
});

test('GF044 hosted correction: recovery observations increment once and restore replay is projection-equivalent', () => {
  const data = makeController(
    'merge-commit',
    'delivery-recovery-once',
    null,
    220,
    true,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    null,
    'uncertain',
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
  assert.equal(
    data.controller.authorize(
      request(
        data,
        data.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'effect',
        `corr/${data.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'effect' }).ok, true);
  assert.equal(data.controller.projection().recovery?.observations, 1);
  const snapshot = data.controller.snapshot();
  const restored = runtime.restoreScriptedDeliveryController(snapshot, {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    retryLimit: data.controller.projection().carrier.retryLimit,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.projection(), data.controller.projection());
});

test('GF044 hosted correction: reconciled presence is success across anchor and every delivery dependency edge', () => {
  const anchor = makeController(
    'merge-commit',
    'delivery-anchor-present-recovery-landing',
    null,
    230,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    undefined,
    true,
    null,
    null,
    null,
    'present',
    null,
    null,
    true,
  );
  authorizeAndDispatch(anchor, 'OPC-DEL-ANCHOR', anchor.operations.anchor, 1);
  assert.equal(
    anchor.controller.authorize(
      request(
        anchor,
        anchor.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'effect',
        `corr/${anchor.anchorOperation.split('/').at(-4)}`,
        'resource/opc-del-anchor',
      ),
    ).ok,
    true,
  );
  assert.equal(anchor.controller.observe({ operation: anchor.operations.observe, subject: 'effect' }).ok, true);
  authorizeAndDispatch(anchor, 'OPC-DEL-PUBLISH', anchor.operations.publish, 2);
  authorizeAndDispatch(anchor, 'OPC-DEL-REQUEST', anchor.operations.request, 3);
  authorizeAndDispatch(anchor, 'OPC-DEL-MERGE', anchor.operations.merge, 6);
  assert.equal(
    anchor.controller.authorize(
      request(
        anchor,
        anchor.operations.target,
        'OPC-DEL-OBSERVE',
        30,
        'target',
        `corr/${anchor.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(anchor.controller.observe({ operation: anchor.operations.target, subject: 'target' }).ok, true);
  assert.equal(
    anchor.controller.recordLanded({
      operation: operation(239),
      mergeOperation: anchor.operations.merge,
      targetObservationOperation: anchor.operations.target,
    }).ok,
    true,
  );
  assert.equal(anchor.controller.projection().status, 'Landed');

  const chain = makeController(
    'merge-commit',
    'delivery-publish-request-merge-present-recovery',
    null,
    250,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    undefined,
    false,
    null,
    null,
    null,
    'present',
    null,
    null,
    false,
    'pre-dispatch',
    ['OPC-DEL-PUBLISH', 'OPC-DEL-REQUEST', 'OPC-DEL-MERGE'],
  );
  authorizeAndDispatch(chain, 'OPC-DEL-ANCHOR', chain.operations.anchor, 1);
  authorizeAndDispatch(chain, 'OPC-DEL-PUBLISH', chain.operations.publish, 2);
  assert.equal(
    chain.controller.authorize(
      request(
        chain,
        chain.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'effect',
        `corr/${chain.operations.publish.split('/').at(-4)}`,
        'resource/opc-del-publish',
      ),
    ).ok,
    true,
  );
  assert.equal(chain.controller.observe({ operation: chain.operations.observe, subject: 'effect' }).ok, true);
  authorizeAndDispatch(chain, 'OPC-DEL-REQUEST', chain.operations.request, 3);
  assert.equal(
    chain.controller.authorize(
      request(
        chain,
        chain.operations.observe2,
        'OPC-DEL-OBSERVE',
        8,
        'effect',
        `corr/${chain.operations.request.split('/').at(-4)}`,
        'resource/opc-del-request',
      ),
    ).ok,
    true,
  );
  assert.equal(chain.controller.observe({ operation: chain.operations.observe2, subject: 'effect' }).ok, true);
  authorizeAndDispatch(chain, 'OPC-DEL-STATUS', chain.operations.status, 4);
  authorizeAndDispatch(chain, 'OPC-DEL-COMMENT', chain.operations.comment, 5);
  authorizeAndDispatch(chain, 'OPC-DEL-MERGE', chain.operations.merge, 6);
  assert.equal(
    chain.controller.authorize(
      request(
        chain,
        chain.operations.gate,
        'OPC-DEL-OBSERVE',
        9,
        'effect',
        `corr/${chain.operations.merge.split('/').at(-4)}`,
        'resource/opc-del-merge',
      ),
    ).ok,
    true,
  );
  assert.equal(chain.controller.observe({ operation: chain.operations.gate, subject: 'effect' }).ok, true);
  assert.equal(chain.controller.projection().status, 'Ready');
  const snapshot = chain.controller.snapshot();
  const restored = runtime.restoreScriptedDeliveryController(snapshot, {
    acceptanceSnapshot: chain.acceptanceController.snapshot(),
    binding,
    candidateCarrier: chain.candidate,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    remoteGate: chain.remoteGate,
    registry: chain.registry,
    retryLimit: chain.controller.projection().carrier.retryLimit,
    strategy: { mode: chain.mode, digest: runtime.deriveDeliveryStrategyDigest(chain.mode) },
    verificationAuthorizer: chain.verificationAuthorizer,
    mechanism: chain.mechanism,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.projection(), chain.controller.projection());
  assert.equal(
    restored.value.authorize(
      request(
        chain,
        chain.operations.target,
        'OPC-DEL-OBSERVE',
        30,
        'target',
        `corr/${chain.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(restored.value.observe({ operation: chain.operations.target, subject: 'target' }).ok, true);
  assert.equal(
    restored.value.recordLanded({
      operation: operation(259),
      mergeOperation: chain.operations.merge,
      targetObservationOperation: chain.operations.target,
    }).ok,
    true,
  );
});

test('GF044 hosted correction: forged replay cannot turn a cross-operation presence into success', () => {
  const data = makeController(
    'merge-commit',
    'delivery-present-recovery-forged-replay',
    null,
    270,
    false,
    false,
    null,
    null,
    'ready',
    false,
    null,
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    undefined,
    false,
    null,
    null,
    null,
    'present',
    null,
    null,
    false,
    'pre-dispatch',
    ['OPC-DEL-PUBLISH'],
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  assert.equal(
    data.controller.authorize(
      request(
        data,
        data.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'effect',
        `corr/${data.operations.publish.split('/').at(-4)}`,
        'resource/opc-del-publish',
      ),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'effect' }).ok, true);
  const snapshot = data.controller.snapshot();
  const forgedRecords = snapshot.records.map((entry) =>
    entry.record.kind === 'observation' && entry.record.fact.operation === data.operations.observe
      ? {
          ...entry.record,
          fact: { ...entry.record.fact, resolvesOperation: data.operations.request },
        }
      : entry.record,
  );
  const forged = { ...snapshot, records: redigestDeliveryRecords(forgedRecords) };
  const restored = runtime.restoreScriptedDeliveryController(forged, {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    retryLimit: data.controller.projection().carrier.retryLimit,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.deepEqual(restored.error, { family: 'FC-TRUST', code: 'DELIVERY_PROJECTION_REPLAY_MISMATCH' });
});

test('GF044 hosted correction: target-wait observations increment once and restore replay is projection-equivalent', () => {
  const data = makeController('merge-commit', 'delivery-target-wait-once', null, 240, false, true);
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
  assert.equal(
    data.controller.authorize(
      request(
        data,
        data.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'target',
        `corr/${data.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'target' }).ok, true);
  assert.equal(data.controller.projection().targetWait?.observations, 1);
  const snapshot = data.controller.snapshot();
  const restored = runtime.restoreScriptedDeliveryController(snapshot, {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    retryLimit: data.controller.projection().carrier.retryLimit,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.projection(), data.controller.projection());
});

test('GF044 hosted correction: retry defaults to 3, accepts only 1 through 5, and authorization uses the configured limit', () => {
  const defaults = makeController();
  assert.equal(defaults.controller.projection().carrier.retryLimit, 3);
  const configured = makeController(
    'merge-commit',
    'delivery-retry-limit',
    null,
    260,
    false,
    false,
    null,
    null,
    'ready',
    false,
    'OPC-DEL-PUBLISH',
    false,
    false,
    90,
    'pass',
    null,
    'absent',
    1,
  );
  authorizeAndDispatch(configured, 'OPC-DEL-ANCHOR', configured.operations.anchor, 1);
  assert.equal(
    configured.controller.authorize(request(configured, configured.operations.publish, 'OPC-DEL-PUBLISH', 2)).ok,
    true,
  );
  assert.equal(configured.controller.dispatch({ operation: configured.operations.publish }).ok, true);
  assert.deepEqual(
    configured.controller.authorize(
      request(
        configured,
        operation(269),
        'OPC-DEL-PUBLISH',
        3,
        'target',
        `corr/${configured.operations.publish.split('/').at(-4)}`,
        'resource/opc-del-publish',
      ),
    ).error,
    { family: 'FC-BOUND', code: 'DELIVERY_RETRY_EXHAUSTED' },
  );
  const invalid = (limit) =>
    makeController(
      'merge-commit',
      `delivery-invalid-retry-${limit}`,
      null,
      280 + limit,
      false,
      false,
      null,
      null,
      'ready',
      false,
      null,
      false,
      false,
      90,
      'pass',
      null,
      'absent',
      limit,
    );
  assert.throws(() => invalid(0), { message: /INVALID_DELIVERY_RETRY_LIMIT/ });
  assert.throws(() => invalid(6), { message: /INVALID_DELIVERY_RETRY_LIMIT/ });
});

test('GF044-MC-05/MC-06/LP-EQUIV: all four frozen integration strategies require authoritative post-effect content proof', () => {
  for (const [index, mode] of ['direct-fast-forward', 'merge-commit', 'squash', 'merge-queue'].entries()) {
    const data = makeController(
      mode,
      `delivery-${mode}`,
      mode === 'direct-fast-forward' ? 'commit/workspace' : null,
      300 + index * 20,
    );
    authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
    authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
    authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
    authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
    assert.equal(
      data.controller.authorize(
        request(
          data,
          data.operations.observe,
          'OPC-DEL-OBSERVE',
          7,
          'target',
          `corr/${data.operations.merge.split('/').at(-4)}`,
        ),
      ).ok,
      true,
    );
    assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'target' }).ok, true);
    assert.equal(
      data.controller.recordLanded({
        operation: operation(399 + index),
        mergeOperation: data.operations.merge,
        targetObservationOperation: data.operations.observe,
      }).ok,
      true,
    );
  }
  const mismatch = makeController('merge-commit', 'delivery-domain-mismatch', null, 700, false, false, null, d('a'));
  authorizeAndDispatch(mismatch, 'OPC-DEL-ANCHOR', mismatch.operations.anchor, 1);
  authorizeAndDispatch(mismatch, 'OPC-DEL-PUBLISH', mismatch.operations.publish, 2);
  authorizeAndDispatch(mismatch, 'OPC-DEL-REQUEST', mismatch.operations.request, 3);
  authorizeAndDispatch(mismatch, 'OPC-DEL-MERGE', mismatch.operations.merge, 6);
  assert.equal(
    mismatch.controller.authorize(
      request(
        mismatch,
        mismatch.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'target',
        `corr/${mismatch.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(mismatch.controller.observe({ operation: mismatch.operations.observe, subject: 'target' }).ok, true);
  assert.deepEqual(
    mismatch.controller.recordLanded({
      operation: operation(799),
      mergeOperation: mismatch.operations.merge,
      targetObservationOperation: mismatch.operations.observe,
    }).error,
    { family: 'FC-EVIDENCE', code: 'LP_EQUIVALENCE_FAILED' },
  );
});

test('GF044-MC-07/MC-08: anchor conflict and ordinary target movement park and fence all further delivery effects', () => {
  const anchorConflict = makeController(
    'merge-commit',
    'delivery-anchor-conflict',
    null,
    800,
    false,
    false,
    null,
    null,
    'ready',
    true,
  );
  authorizeAndDispatch(anchorConflict, 'OPC-DEL-ANCHOR', anchorConflict.operations.anchor, 1);
  assert.equal(anchorConflict.controller.projection().status, 'Parked');
  assert.equal(
    anchorConflict.controller.authorize(request(anchorConflict, anchorConflict.operations.merge, 'OPC-DEL-MERGE', 6))
      .ok,
    false,
  );

  const moved = makeController(
    'merge-commit',
    'delivery-target-moved',
    null,
    820,
    false,
    false,
    null,
    null,
    'advanced',
  );
  authorizeAndDispatch(moved, 'OPC-DEL-ANCHOR', moved.operations.anchor, 1);
  authorizeAndDispatch(moved, 'OPC-DEL-PUBLISH', moved.operations.publish, 2);
  authorizeAndDispatch(moved, 'OPC-DEL-REQUEST', moved.operations.request, 3);
  authorizeAndDispatch(moved, 'OPC-DEL-MERGE', moved.operations.merge, 6);
  assert.equal(
    moved.controller.authorize(
      request(
        moved,
        moved.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'target',
        `corr/${moved.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(moved.controller.observe({ operation: moved.operations.observe, subject: 'target' }).ok, true);
  assert.equal(moved.controller.projection().status, 'Parked');
  assert.equal(moved.controller.authorize(request(moved, operation(899), 'OPC-DEL-MERGE', 9)).ok, false);
});

test('GF044-MC-04/CF-DOUBLE-EFFECT: retry requires the exact prior absence correlation and resource identity', () => {
  const data = makeController(
    'merge-commit',
    'delivery-retry-fence',
    null,
    900,
    false,
    false,
    null,
    null,
    'ready',
    false,
    'OPC-DEL-PUBLISH',
  );
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  const first = data.controller.authorize(request(data, data.operations.publish, 'OPC-DEL-PUBLISH', 2));
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(data.controller.dispatch({ operation: data.operations.publish }).ok, true);
  assert.deepEqual(
    data.controller.authorize(
      request(data, operation(913), 'OPC-DEL-PUBLISH', 3, 'target', 'corr/foreign', 'resource/foreign'),
    ).error,
    { family: 'FC-FENCE', code: 'RETRY_RESOURCE_FENCE_MISMATCH' },
  );
});

test('GF044-MC-08/BND-WAIT-TARGET: held integration re-observes and parks at the governed bound without re-requesting merge', () => {
  const data = makeController('merge-commit', 'delivery-held', null, 500, false, true);
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
  assert.equal(
    data.controller.authorize(
      request(
        data,
        data.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'target',
        `corr/${data.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'target' }).ok, true);
  assert.equal(data.controller.authorize(request(data, operation(509), 'OPC-DEL-MERGE', 9)).ok, false);
  assert.equal(
    data.controller.authorize(
      request(
        data,
        data.operations.observe2,
        'OPC-DEL-OBSERVE',
        8,
        'target',
        `corr/${data.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe2, subject: 'target' }).ok, true);
  assert.equal(data.controller.projection().status, 'Parked');
  assert.equal(data.controller.wake({ operation: data.operations.observe2, at: 1_900 }).ok, false);
});

test('GF044-MC-07: GF-043 target wait bounds are corrected to 1 minute through 24 hours', () => {
  assert.equal(
    runtime.createFinalizerPolicy({
      posture: 'none',
      requiredClasses: [],
      waitCapacitySeconds: 3_600,
      waitTargetSeconds: 59,
      refreshLimit: 1,
    }).ok,
    false,
  );
  assert.equal(
    runtime.createFinalizerPolicy({
      posture: 'none',
      requiredClasses: [],
      waitCapacitySeconds: 3_600,
      waitTargetSeconds: 60,
      refreshLimit: 1,
    }).ok,
    true,
  );
  assert.equal(
    runtime.createFinalizerPolicy({
      posture: 'none',
      requiredClasses: [],
      waitCapacitySeconds: 3_600,
      waitTargetSeconds: 86_400,
      refreshLimit: 1,
    }).ok,
    true,
  );
  assert.equal(
    runtime.createFinalizerPolicy({
      posture: 'none',
      requiredClasses: [],
      waitCapacitySeconds: 3_600,
      waitTargetSeconds: 86_401,
      refreshLimit: 1,
    }).ok,
    false,
  );
});

test('GF044 hosted correction: append and verified replay preserve one mixed-transition projection', () => {
  const data = makeController('merge-commit', 'delivery-reducer-equivalence', null, 300, false, true);
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
  assert.equal(
    data.controller.authorize(
      request(
        data,
        data.operations.observe,
        'OPC-DEL-OBSERVE',
        7,
        'target',
        `corr/${data.operations.merge.split('/').at(-4)}`,
      ),
    ).ok,
    true,
  );
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'target' }).ok, true);
  const snapshot = data.controller.snapshot();
  const restored = runtime.restoreScriptedDeliveryController(snapshot, {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    candidateCarrier: data.candidate,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    remoteGate: data.remoteGate,
    registry: data.registry,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.projection(), data.controller.projection());
});

test('GF044 hosted correction: delivery stageDigest derive and same paths fail closed on circular input', () => {
  const circular = {};
  circular.self = circular;
  assert.equal(runtime.deriveDeliveryChangeSetDigest({ targetBasisDigest: d('a'), changedPaths: circular }), undefined);
  assert.equal(runtime.deriveDeliveryGateRequirementDigest(circular), undefined);
  const data = makeController('merge-commit', 'delivery-hostile-digest', null, 340);
  const snapshot = data.controller.snapshot();
  const hostileCarrier = {};
  hostileCarrier.self = hostileCarrier;
  const restored = runtime.restoreScriptedDeliveryController(
    { ...snapshot, carrier: hostileCarrier },
    {
      acceptanceSnapshot: data.acceptanceController.snapshot(),
      binding,
      candidateCarrier: data.candidate,
      finalizerSnapshot: snapshot.finalizerSnapshot,
      remoteGate: data.remoteGate,
      registry: data.registry,
      strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
      verificationAuthorizer: data.verificationAuthorizer,
      mechanism: data.mechanism,
    },
  );
  assert.deepEqual(restored.error, { family: 'FC-TRUST', code: 'INVALID_DELIVERY_SNAPSHOT' });
});
