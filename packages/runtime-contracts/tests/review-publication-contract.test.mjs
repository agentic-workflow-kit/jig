import assert from 'node:assert/strict';
import test from 'node:test';
import { stageDigest } from '@agentic-workflow-kit/jig-codec';

const runtime = await import('../dist/index.js');
const mediation = await import('../dist/mediation.js');
const kernel = await import('@agentic-workflow-kit/jig-authority-kernel');

const digest = (character) => character.repeat(64);
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
const manifest = `provider/${digest('c')}/authority/${digest('d')}`;
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
const retireBindings = () => [
  binding(5, 'OPC-REV-RETIRE-REF', generation, 'Settled'),
  binding(6, 'OPC-REV-RETIRE-REQUEST', generation, 'Settled'),
  binding(7, 'OPC-REV-RETIRE-STATUS', generation, 'Settled'),
  binding(8, 'OPC-REV-RETIRE-COMMENT', generation, 'Settled'),
];
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
const createController = (fixture) =>
  runtime.createReviewPublicationController({
    fixture,
    transition: runtime.createReviewPublicationTransitionRecorder({
      verify: () => ({ ok: true, value: undefined }),
    }),
    preservationVerifier: {
      verify: () => ({ ok: true, value: undefined }),
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
  });
  assert.deepEqual(rejected, { ok: false, error: { family: 'FC-TRUST', code: 'RETIREMENT_PRESERVATION_UNVERIFIED' } });
  const controller = createController();
  const retired = controller.retire({
    bindings: retireBindings(),
    faults: ['none', 'none', 'none', 'none'],
    preservation: preservation(),
  });
  assert.deepEqual(retired, { ok: true, value: { status: 'retired', operation: retireBindings().at(-1).operation } });
  const uncertain = createController().retire({
    bindings: retireBindings(),
    faults: ['lost-response', 'none', 'none', 'none'],
    preservation: preservation(),
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
