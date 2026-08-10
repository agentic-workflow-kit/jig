import assert from 'node:assert/strict';
import test from 'node:test';
import { stageDigest } from '@agentic-workflow-kit/jig-codec';

const runtime = await import('../dist/index.js');
const mediation = await import('../dist/mediation.js');
const kernel = await import('@agentic-workflow-kit/jig-authority-kernel');

const digest = (character) => (({ p: 'd' })[character] ?? character).repeat(64);
const run = 'run-000000000001-0123456789abcdef';
const story = `${run}/story/plan-a`;
const subject = {
  run,
  story,
  basis: digest('b'),
  repository: 'repository/fixture-main',
  candidate: `${story}/cand/1|${digest('8')}`,
  candidateContentDigest: digest('8'),
  targetBasisDigest: digest('9'),
};
const generation = `${run}/gen/2|controller-token-1`;
const retryGeneration = `${run}/gen/3|controller-token-2`;
const retryGeneration2 = `${run}/gen/4|controller-token-3`;
const manifest = `provider/${digest('c')}/authority/${digest('d')}`;
const obligationEvidenceSubject = `evidence://run-000000000001-0123456789abcdef/story/plan-a/cand/1|${digest('8')}/claim/candidate-content`;
const operation = (ordinal, type, activeGeneration = generation) => {
  const transaction = `${run}/txn/${ordinal}/${activeGeneration}|${digest(String(ordinal))}`;
  return {
    operation: `${transaction}/op/1`,
    transaction,
    event: `${run}/event/${ordinal}`,
    type,
  };
};
const binding = (
  ordinal,
  type,
  activeGeneration = generation,
  lifecycle = 'Reviewing',
  operationGeneration = activeGeneration,
) => {
  const entry = operation(ordinal, type, operationGeneration);
  const proof = {
    kind: 'committed-witnessed',
    position: ordinal - 1,
    event: entry.event,
    transaction: entry.transaction,
    operation: entry.operation,
    recordDigest: digest('a'),
    witnessDigest: digest('a'),
  };
  return {
    operation: entry.operation,
    operationType: type,
    mode: 'required-venue',
    subject,
    repository: subject.repository,
    candidate: subject.candidate,
    candidateContentDigest: subject.candidateContentDigest,
    targetBasisDigest: subject.targetBasisDigest,
    providerIdentity: 'fixture-provider/v1',
    sourceRef: 'refs/heads/feature-gf-041',
    targetRef: 'refs/heads/main',
    reviewRef: 'refs/jig/review/fixture-1',
    request: { identity: 'review-request/fixture-1', marker: 'jig-review-request-1', draft: true, mergeable: false },
    markers: { status: 'jig-status-1', comment: 'jig-comment-1' },
    explanationDigest: digest('e'),
    fence: {
      generation: activeGeneration,
      basis: subject.basis,
      candidateContentDigest: subject.candidateContentDigest,
      targetBasisDigest: subject.targetBasisDigest,
    },
    generation: activeGeneration,
    manifest,
    transition: {
      kind: 'review-publication-transition',
      authorizer: 'CP-TRANSITION',
      controller: 'RT-CONTROLLER',
      lifecycle,
      operation: entry.operation,
      proof,
    },
    authority: null,
  };
};
const reviewBindings = () => [
  binding(1, 'OPC-REV-PUBLISH', generation),
  binding(2, 'OPC-REV-REQUEST', generation),
  binding(3, 'OPC-REV-STATUS', generation),
  binding(4, 'OPC-REV-COMMENT', generation),
];
const retryReviewBindings = () => [
  binding(1, 'OPC-REV-PUBLISH', retryGeneration, 'Reviewing', generation),
  binding(2, 'OPC-REV-REQUEST', retryGeneration, 'Reviewing', generation),
  binding(3, 'OPC-REV-STATUS', retryGeneration, 'Reviewing', generation),
  binding(4, 'OPC-REV-COMMENT', retryGeneration, 'Reviewing', generation),
];
const retryReviewBindingSequences = () =>
  retryReviewBindings().map((first, index) => [
    first,
    binding(index + 1, first.operationType, retryGeneration2, 'Reviewing', generation),
  ]);
const retireBindings = () => [
  binding(5, 'OPC-REV-RETIRE-REF', generation, 'Settled'),
  binding(6, 'OPC-REV-RETIRE-REQUEST', generation, 'Settled'),
  binding(7, 'OPC-REV-RETIRE-STATUS', generation, 'Settled'),
  binding(8, 'OPC-REV-RETIRE-COMMENT', generation, 'Settled'),
];
const retireRetryBindingSequences = () =>
  retireBindings().map((entry, index) => [
    binding(index + 5, entry.operationType, retryGeneration, 'Settled', generation),
    binding(index + 5, entry.operationType, retryGeneration2, 'Settled', generation),
  ]);
const venueDigest = () => {
  const first = retireBindings()[0];
  return stageDigest({
    domain: 'REVIEW-PUBLICATION-VENUE',
    excludePaths: [],
    value: {
      subject: first.subject,
      providerIdentity: first.providerIdentity,
      sourceRef: first.sourceRef,
      targetRef: first.targetRef,
      reviewRef: first.reviewRef,
      request: first.request,
      markers: first.markers,
      manifest: first.manifest,
    },
  }).value.digest;
};
const preservation = () => ({
  kind: 'review-venue-preservation',
  status: 'preserved',
  venueDigest: venueDigest(),
  evidenceDigest: digest('b'),
});
const createController = (fixture, options = {}) =>
  runtime.createReviewPublicationController({
    fixture,
    transition: runtime.createReviewPublicationTransitionRecorder({
      verify: () => ({ ok: true, value: undefined }),
    }),
    preservationVerifier: {
      verify: () => ({ ok: true, value: undefined }),
    },
    obligationController: options.obligationController ?? obligationController(),
  });

const fixtureWithResourceState = (resourceState) => {
  const fixture = runtime.createScriptedReviewPublicationFixture();
  return Object.freeze({
    ...fixture,
    lookup(input) {
      const result = fixture.lookup(input);
      if (!result.ok) return result;
      const value = { ...result.value, resourceState };
      return {
        ...result,
        value: {
          ...value,
          observationDigest: stageDigest({
            domain: 'REVIEW-PUBLICATION-LOOKUP',
            excludePaths: [],
            value: {
              operation: value.operation,
              binding: value.binding,
              outcome: value.outcome,
              resourceState,
            },
          }).value.digest,
        },
      };
    },
  });
};

const retirementObligationInput = () => ({
  run,
  generation,
  resource: 'refs/jig/review/fixture-1',
  duty: 'retirement',
  origin: `${run}/event/5`,
  reason: 'automatic retirement duty failed after bounded attempts',
  preservationEvidence: {
    schema: 'jig.obligation-evidence.v1',
    key: digest('f'),
    subject: obligationEvidenceSubject,
    claim: 'preserve the review venue',
    manifestDigest: digest('c'),
    artifactDigest: digest('a'),
    trustRoot: digest('e'),
    referenceDigest: digest('b'),
  },
  accountableOwner: 'principal/arye',
  criteria: { subject: obligationEvidenceSubject, claim: 'preserve the review venue' },
  startedAt: 1000,
  deadline: 1000 + 72 * 60 * 60,
  policyDigest: digest('p'),
});

const obligationController = (id = `${run}/obligation/1`, onOpen = () => {}) => ({
  openAllocated: (input) => {
    onOpen(input);
    const criteriaDigest = runtime.obligationCriteriaDigest(input.criteria);
    const boundDigest = runtime.obligationBoundDigest({
      id,
      generation: input.generation,
      policyDigest: input.policyDigest,
      startedAt: input.startedAt,
      deadline: input.deadline,
    });
    return {
      ok: true,
      value: {
        id,
        event: `${run}/event/99`,
        run,
        generation,
        resource: input.resource,
        origin: `${run}/event/5`,
        duty: 'retirement',
        reason: input.reason,
        accountableOwner: 'principal/arye',
        bound: 'BND-WAIT-DECISION',
        startedAt: input.startedAt,
        deadline: input.deadline,
        policyDigest: input.policyDigest,
        preservationEvidence: {
          ...retirementObligationInput().preservationEvidence,
          referenceDigest: preservation().evidenceDigest,
        },
        boundDigest,
        criteria: { ...input.criteria, digest: criteriaDigest },
      },
    };
  },
});

test('GF-041 closes the typed D15 carrier and excludes target authority', () => {
  const valid = runtime.validateReviewPublicationBinding(binding(1, 'OPC-REV-PUBLISH'));
  assert.equal(valid.ok, true);
  assert.equal(valid.value.authority, null);
  for (const changed of [
    { ...binding(1, 'OPC-REV-PUBLISH'), candidateContentDigest: digest('a') },
    { ...binding(1, 'OPC-REV-PUBLISH'), targetBasisDigest: digest('a') },
    { ...binding(1, 'OPC-REV-PUBLISH'), request: { ...binding(1, 'OPC-REV-PUBLISH').request, draft: false } },
    { ...binding(1, 'OPC-REV-PUBLISH'), request: { ...binding(1, 'OPC-REV-PUBLISH').request, mergeable: true } },
    { ...binding(1, 'OPC-REV-PUBLISH'), authority: 'target/repository-main/auth/1' },
    { ...binding(1, 'OPC-REV-PUBLISH'), operationType: 'OPC-DEL-MERGE' },
  ]) {
    assert.equal(runtime.validateReviewPublicationBinding(changed).ok, false);
  }
});

test('review status and comment are effectful operations on both shared seams', () => {
  assert.equal(kernel.operationEffect('OPC-REV-STATUS'), 'effectful');
  assert.equal(kernel.operationEffect('OPC-REV-RETIRE-STATUS'), 'effectful');
  assert.deepEqual(mediation.operationRoute('OPC-REV-STATUS'), {
    ok: true,
    value: { port: 'PORT-DELIVERY', capability: 'CB-REVIEW-PUBLICATION', effect: 'effectful' },
  });
});

test('no-venue mode records canonical explicit absence and dispatches nothing', () => {
  const fixture = runtime.createScriptedReviewPublicationFixture();
  const controller = createController(fixture);
  const result = controller.publish({ mode: 'no-venue', subject });
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, 'no-venue');
  assert.equal(result.value.absence, 'explicit-no-venue');
  assert.equal(runtime.validateReviewPublicationObservation(result.value).ok, true);
  assert.deepEqual(fixture.invocations(), []);
  assert.deepEqual(controller.snapshot().intents, []);
  assert.deepEqual(controller.snapshot().reauthorizations, []);
});

test('required venue publishes the exact candidate with four draft/non-mergeable effect operations', () => {
  const controller = createController();
  const result = controller.publish({
    mode: 'required-venue',
    subject,
    bindings: reviewBindings(),
    retryBindings: retryReviewBindings(),
    faults: ['none', 'none', 'none', 'none'],
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, 'required-venue');
  assert.equal(result.value.draft, true);
  assert.equal(result.value.mergeable, false);
  assert.equal(result.value.operations.length, 4);
  assert.equal(runtime.validateReviewPublicationObservation(result.value).ok, true);
  assert.equal(controller.snapshot().intents.length, 4);
  assert.equal(controller.snapshot().invocations.length, 4);
});

test('mechanism absence alone permits one same-identity retry after reauthorization', () => {
  const controller = createController();
  const faults = [['mechanism-absence', 'none'], 'none', 'none', 'none'];
  const result = controller.publish({
    mode: 'required-venue',
    subject,
    bindings: reviewBindings(),
    retryBindings: retryReviewBindings(),
    faults,
  });
  assert.equal(result.ok, true);
  assert.equal(runtime.validateReviewPublicationObservation(result.value).ok, true);
  assert.equal(controller.snapshot().reauthorizations.length, 1);
  assert.deepEqual(
    controller
      .snapshot()
      .invocations.slice(0, 2)
      .map((entry) => entry.attempt),
    [1, 2],
  );
});

test('each retry ordinal requires a distinct fresh generation and fence', () => {
  const controller = createController();
  const result = controller.publish({
    mode: 'required-venue',
    subject,
    bindings: reviewBindings(),
    retryBindings: retryReviewBindingSequences(),
    faults: [['mechanism-absence', 'mechanism-absence', 'none'], 'none', 'none', 'none'],
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(
    controller
      .snapshot()
      .reauthorizations.filter((entry) => entry.operation === reviewBindings()[0].operation)
      .map((entry) => entry.binding.generation),
    [retryGeneration, retryGeneration2],
  );
  assert.equal(runtime.validateReviewPublicationObservation(result.value).ok, true);
});

test('reauthorization snapshot restores the refreshed binding and rejects tampering', () => {
  const verifier = { verify: () => ({ ok: true, value: undefined }) };
  const fixture = runtime.createScriptedReviewPublicationFixture();
  const controller = runtime.createReviewPublicationController({
    fixture,
    transition: runtime.createReviewPublicationTransitionRecorder(verifier),
  });
  const result = controller.publish({
    mode: 'required-venue',
    subject,
    bindings: reviewBindings(),
    retryBindings: retryReviewBindings(),
    faults: [['mechanism-absence', 'none'], 'none', 'none', 'none'],
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  const restored = runtime.restoreReviewPublicationTransitionRecorder(controller.snapshot().transition, verifier);
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.reauthorizations(), controller.snapshot().reauthorizations);

  const tampered = structuredClone(controller.snapshot().transition);
  tampered.reauthorizations[0].binding.fence.generation = generation;
  assert.deepEqual(runtime.restoreReviewPublicationTransitionRecorder(tampered, verifier), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'INVALID_REVIEW_TRANSITION_SNAPSHOT' },
  });
});

test('public transition recorder cannot hydrate past validated snapshot restore', () => {
  const verifier = { verify: () => ({ ok: true, value: undefined }) };
  const controller = runtime.createReviewPublicationController({
    fixture: runtime.createScriptedReviewPublicationFixture(),
    transition: runtime.createReviewPublicationTransitionRecorder(verifier),
  });
  const result = controller.publish({
    mode: 'required-venue',
    subject,
    bindings: reviewBindings(),
    retryBindings: retryReviewBindings(),
    faults: [['mechanism-absence', 'none'], 'none', 'none', 'none'],
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  const attemptedHydration = runtime.createReviewPublicationTransitionRecorder(
    verifier,
    controller.snapshot().transition,
  );
  assert.deepEqual(attemptedHydration.snapshot(), { intents: [], reauthorizations: [] });
});

test('uncertain post-dispatch effect parks without semantic retry', () => {
  const controller = createController();
  const result = controller.publish({
    mode: 'required-venue',
    subject,
    bindings: reviewBindings(),
    retryBindings: retryReviewBindings(),
    faults: ['lost-response', 'none', 'none', 'none'],
  });
  assert.deepEqual(result, { ok: false, error: { family: 'FC-EFFECT', code: 'REVIEW_EFFECT_UNCERTAIN_PARKED' } });
  assert.equal(controller.snapshot().invocations.length, 1);
  assert.equal(controller.snapshot().reauthorizations.length, 0);
});

test('confirmed recovery effect is adopted without a semantic dispatch retry', () => {
  const controller = createController();
  const result = controller.publish({
    mode: 'required-venue',
    subject,
    bindings: reviewBindings(),
    retryBindings: retryReviewBindings(),
    faults: ['lost-response-confirmed-effect', 'none', 'none', 'none'],
  });
  assert.equal(result.ok, true);
  assert.equal(controller.snapshot().invocations.length, 4);
});

test('retirement requires preservation and never treats a no-venue branch as a venue', () => {
  const rejected = createController().retire({
    bindings: retireBindings(),
    faults: ['none', 'none', 'none', 'none'],
    preservation: { kind: 'wrong' },
    obligation: retirementObligationInput(),
  });
  assert.deepEqual(rejected, { ok: false, error: { family: 'FC-TRUST', code: 'RETIREMENT_PRESERVATION_UNVERIFIED' } });
  const controller = createController();
  const retired = controller.retire({
    bindings: retireBindings(),
    faults: ['none', 'none', 'none', 'none'],
    preservation: preservation(),
    obligation: retirementObligationInput(),
  });
  assert.deepEqual(retired, { ok: true, value: { status: 'retired', operation: retireBindings().at(-1).operation } });
  const uncertain = createController().retire({
    bindings: retireBindings(),
    faults: ['lost-response', 'none', 'none', 'none'],
    preservation: preservation(),
    obligation: retirementObligationInput(),
  });
  assert.equal(uncertain.ok, true);
  assert.equal(uncertain.value.status, 'obligation');
  assert.equal(uncertain.value.operation, retireBindings()[0].operation);
  assert.equal(uncertain.value.obligation, `${run}/obligation/1`);
  assert.equal(uncertain.value.owner, 'RT-CONTROLLER');
  assert.equal(uncertain.value.completionCriteria, 'preserve-review-venue-and-complete-retirement');
  assert.equal(uncertain.value.evidenceDigest, preservation().evidenceDigest);
  assert.match(uncertain.value.obligationDigest, /^[0-9a-f]{64}$/u);
});

test('retirement delegates uncertain duty identity to the existing obligation controller', () => {
  const controller = obligationController(`${run}/obligation/17`);
  const reviewController = runtime.createReviewPublicationController({
    fixture: runtime.createScriptedReviewPublicationFixture(),
    transition: runtime.createReviewPublicationTransitionRecorder({ verify: () => ({ ok: true, value: undefined }) }),
    preservationVerifier: { verify: () => ({ ok: true, value: undefined }) },
    obligationController: controller,
  });
  const result = reviewController.retire({
    bindings: retireBindings(),
    faults: ['lost-response', 'none', 'none', 'none'],
    preservation: preservation(),
    obligation: retirementObligationInput(),
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.status, 'obligation');
  assert.equal(result.value.obligation, `${run}/obligation/17`);
});

test('retirement confirmed effect absence with a present resource preserves the duty', () => {
  const fixture = runtime.createScriptedReviewPublicationFixture();
  const result = createController(fixture).retire({
    bindings: retireBindings(),
    faults: ['mechanism-absence', 'none', 'none', 'none'],
    preservation: preservation(),
    obligation: retirementObligationInput(),
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.status, 'obligation');
  assert.equal(fixture.invocations()[0].result, 'mechanism-absent');
});

test('retirement confirmed absence reauthorizes the same operation before a bounded successful retry', () => {
  const fixture = runtime.createScriptedReviewPublicationFixture();
  const controller = createController(fixture);
  const result = controller.retire({
    bindings: retireBindings(),
    retryBindings: retireRetryBindingSequences(),
    faults: [['mechanism-absence', 'none'], 'none', 'none', 'none'],
    preservation: preservation(),
    obligation: retirementObligationInput(),
  });
  assert.deepEqual(result, { ok: true, value: { status: 'retired', operation: retireBindings().at(-1).operation } });
  assert.equal(controller.snapshot().reauthorizations.length, 1);
  assert.equal(controller.snapshot().reauthorizations[0].binding.generation, retryGeneration);
  assert.deepEqual(
    fixture
      .invocations()
      .slice(0, 2)
      .map((entry) => entry.attempt),
    [1, 2],
  );
});

test('retirement repeated confirmed absence exhausts BND-RETIRE and preserves one residual duty', () => {
  const fixture = runtime.createScriptedReviewPublicationFixture();
  const controller = createController(fixture);
  const result = controller.retire({
    bindings: retireBindings(),
    retryBindings: retireRetryBindingSequences(),
    faults: [['mechanism-absence', 'mechanism-absence', 'mechanism-absence'], 'none', 'none', 'none'],
    preservation: preservation(),
    obligation: retirementObligationInput(),
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.status, 'obligation');
  assert.equal(controller.snapshot().reauthorizations.length, 2);
  assert.deepEqual(
    fixture
      .invocations()
      .slice(0, 3)
      .map((entry) => entry.attempt),
    [1, 2, 3],
  );
});

test('authoritative exact-resource absence completes retirement without reauthorization', () => {
  const fixture = fixtureWithResourceState('absent');
  const controller = createController(fixture);
  const result = controller.retire({
    bindings: retireBindings(),
    faults: ['mechanism-absence', 'none', 'none', 'none'],
    preservation: preservation(),
    obligation: retirementObligationInput(),
  });
  assert.deepEqual(result, { ok: true, value: { status: 'retired', operation: retireBindings().at(-1).operation } });
  assert.equal(controller.snapshot().reauthorizations.length, 0);
});

test('retirement rejects every binding mismatch before allocation', () => {
  const valid = retirementObligationInput();
  const mismatches = [
    { ...valid, resource: 'refs/jig/review/other' },
    { ...valid, origin: `${run}/event/6` },
    { ...valid, duty: 'handoff' },
    { ...valid, accountableOwner: 'principal/other' },
    { ...valid, criteria: { ...valid.criteria, claim: 'different claim' } },
    {
      ...valid,
      preservationEvidence: { ...valid.preservationEvidence, referenceDigest: digest('a') },
    },
    { ...valid, deadline: valid.startedAt + 1 },
    { ...valid, policyDigest: 'not-a-digest' },
  ];
  for (const obligationInput of mismatches) {
    let calls = 0;
    const reviewController = createController(undefined, {
      obligationController: obligationController(`${run}/obligation/18`, () => {
        calls += 1;
      }),
    });
    const result = reviewController.retire({
      bindings: retireBindings(),
      faults: ['lost-response', 'none', 'none', 'none'],
      preservation: preservation(),
      obligation: obligationInput,
    });
    assert.deepEqual(result, {
      ok: false,
      error: { family: 'FC-AUTHORITY', code: 'RETIREMENT_OBLIGATION_BINDING_MISMATCH' },
    });
    assert.equal(calls, 0);
  }
});
