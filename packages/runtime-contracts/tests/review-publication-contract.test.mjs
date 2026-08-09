import assert from 'node:assert/strict';
import test from 'node:test';

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
const manifest = `provider/${digest('c')}/authority/${digest('d')}`;
const operation = (ordinal, type) => {
  const transaction = `${run}/txn/${ordinal}/${generation}|${digest(String(ordinal))}`;
  return {
    operation: `${transaction}/op/1`,
    transaction,
    event: `${run}/event/${ordinal}`,
    type,
  };
};
const binding = (ordinal, type) => {
  const entry = operation(ordinal, type);
  return {
    operation: entry.operation,
    operationType: type,
    mode: 'required-venue',
    subject,
    repository: subject.repository,
    candidate: subject.candidate,
    candidateContentDigest: subject.candidateContentDigest,
    targetBasisDigest: subject.targetBasisDigest,
    reviewRef: 'refs/jig/review/fixture-1',
    request: { identity: 'review-request/fixture-1', marker: 'jig-review-request-1', draft: true, mergeable: false },
    markers: { status: 'jig-status-1', comment: 'jig-comment-1' },
    explanationDigest: digest('e'),
    fence: {
      generation,
      basis: subject.basis,
      candidateContentDigest: subject.candidateContentDigest,
      targetBasisDigest: subject.targetBasisDigest,
    },
    generation,
    manifest,
    authority: null,
  };
};
const reviewBindings = () => [
  binding(1, 'OPC-REV-PUBLISH'),
  binding(2, 'OPC-REV-REQUEST'),
  binding(3, 'OPC-REV-STATUS'),
  binding(4, 'OPC-REV-COMMENT'),
];
const retireBindings = () => [
  binding(5, 'OPC-REV-RETIRE-REF'),
  binding(6, 'OPC-REV-RETIRE-REQUEST'),
  binding(7, 'OPC-REV-RETIRE-STATUS'),
  binding(8, 'OPC-REV-RETIRE-COMMENT'),
];

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
  const controller = runtime.createReviewPublicationController({ fixture });
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
  const controller = runtime.createReviewPublicationController();
  const result = controller.publish({
    mode: 'required-venue',
    subject,
    bindings: reviewBindings(),
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
  const controller = runtime.createReviewPublicationController();
  const faults = [['mechanism-absence', 'none'], 'none', 'none', 'none'];
  const result = controller.publish({ mode: 'required-venue', subject, bindings: reviewBindings(), faults });
  assert.equal(result.ok, true);
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
  const controller = runtime.createReviewPublicationController();
  const result = controller.publish({
    mode: 'required-venue',
    subject,
    bindings: reviewBindings(),
    faults: ['lost-response', 'none', 'none', 'none'],
  });
  assert.deepEqual(result, { ok: false, error: { family: 'FC-EFFECT', code: 'REVIEW_EFFECT_UNCERTAIN_PARKED' } });
  assert.equal(controller.snapshot().invocations.length, 1);
  assert.equal(controller.snapshot().reauthorizations.length, 0);
});

test('retirement requires preservation and never treats a no-venue branch as a venue', () => {
  const rejected = runtime
    .createReviewPublicationController()
    .retire({ bindings: retireBindings(), faults: ['none', 'none', 'none', 'none'], preserved: false });
  assert.deepEqual(rejected, { ok: false, error: { family: 'FC-INPUT', code: 'RETIREMENT_REQUIRES_PRESERVATION' } });
  const controller = runtime.createReviewPublicationController();
  const retired = controller.retire({
    bindings: retireBindings(),
    faults: ['none', 'none', 'none', 'none'],
    preserved: true,
  });
  assert.deepEqual(retired, { ok: true, value: { status: 'retired', operation: retireBindings().at(-1).operation } });
  const uncertain = runtime
    .createReviewPublicationController()
    .retire({ bindings: retireBindings(), faults: ['lost-response', 'none', 'none', 'none'], preserved: true });
  assert.deepEqual(uncertain, {
    ok: false,
    error: { family: 'FC-EFFECT', code: 'REVIEW_RETIREMENT_UNCERTAIN_OBLIGATION' },
  });
});
