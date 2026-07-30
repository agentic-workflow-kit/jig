import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const operation = await import('../dist/operation.js');
const oracle = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/operation-contract-oracle.json'), 'utf8'),
);
const crashCorpus = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/operation-crash-corpus.json'), 'utf8'),
);

const digest = (character) => character.repeat(64);
const proofVerifier = Object.freeze({
  verify: (candidate) =>
    candidate.kind === 'committed-witnessed' && candidate.recordDigest === candidate.witnessDigest
      ? { ok: true, value: undefined }
      : { ok: false, error: { family: 'FC-TRUST', code: 'UNVERIFIED' } },
});
const createJournal = () => operation.createOperationJournal(proofVerifier);
const proof = (position, character = String((position % 9) + 1)) =>
  Object.freeze({
    kind: 'committed-witnessed',
    position,
    event: `${oracle.run}/event/${position + 1}`,
    transaction:
      position === 0
        ? oracle.transaction
        : `${oracle.run}/txn/${position + 1}/${oracle.refreshedGeneration}|${digest(character)}`,
    recordDigest: digest(character),
    witnessDigest: digest(character),
  });
const subject = Object.freeze({ run: oracle.run, story: oracle.story, basis: oracle.basis });
const fence = (generation = oracle.generation) => Object.freeze({ generation, basis: oracle.basis });
const capability = (overrides = {}) =>
  Object.freeze({
    kind: 'CB-DELIVERY',
    port: 'PORT-DELIVERY',
    operationClass: 'OPC-DEL-MERGE',
    subject: oracle.story,
    fence: fence(),
    resourceScope: 'repository/main',
    manifest: oracle.manifest,
    digest: oracle.capabilityDigest,
    ...overrides,
  });
const authority = Object.freeze({
  authority: oracle.authority,
  registry: oracle.registry,
  basis: oracle.basis,
});
const intent = (overrides = {}) =>
  Object.freeze({
    version: oracle.operationVersion,
    operation: oracle.operation,
    transaction: oracle.transaction,
    event: oracle.event,
    type: 'OPC-DEL-MERGE',
    subject,
    payloadBasisDigest: oracle.payloadBasis,
    fence: fence(),
    capability: capability(),
    authority,
    role: 'finalizer',
    lifecycle: 'Finalizing',
    effect: 'effectful',
    purpose: 'semantic',
    predecessor: null,
    bounds: Object.freeze({
      waitMs: oracle.defaultWaitMs,
      retryLimit: oracle.defaultRetryLimit,
      recoveryLimit: oracle.defaultRecoveryLimit,
    }),
    proof: proof(0),
    ...overrides,
  });
const attempt = (overrides = {}) =>
  Object.freeze({
    operation: oracle.operation,
    ordinal: 1,
    generation: oracle.generation,
    fence: fence(),
    capabilityDigest: oracle.capabilityDigest,
    authority,
    startedAt: 1000,
    deadline: 1000 + oracle.defaultWaitMs,
    reauthorization: null,
    proof: proof(1),
    ...overrides,
  });

test('operation contract: exact committed and witnessed intent is required before dispatch', () => {
  assert.equal(operation.OPERATION_STATE_VERSION, oracle.operationVersion);
  assert.deepEqual(operation.OPERATION_BOUNDS, {
    waitDefaultMs: 900000,
    waitMinimumMs: 5000,
    waitMaximumMs: 7200000,
    retryDefault: 3,
    recoveryDefault: 3,
    countMinimum: 1,
    countMaximum: 5,
  });
  assert.deepEqual(operation.createOperationJournal().recordIntent(intent()), {
    ok: false,
    error: { family: 'FC-ORDERING', code: 'COMMIT_PROOF_VERIFIER_REQUIRED' },
  });
  const journal = createJournal();
  assert.deepEqual(journal.dispatchPermit({ operation: oracle.operation, ordinal: 1 }), {
    ok: false,
    error: { family: 'FC-ORDERING', code: 'INTENT_NOT_RECORDED' },
  });
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.deepEqual(journal.dispatchPermit({ operation: oracle.operation, ordinal: 1 }), {
    ok: false,
    error: { family: 'FC-ORDERING', code: 'ATTEMPT_NOT_RECORDED' },
  });
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  const permit = journal.dispatchPermit({ operation: oracle.operation, ordinal: 1 });
  assert.equal(permit.ok, true);
  assert.equal(permit.value.operation, oracle.operation);
  assert.equal(permit.value.proof.kind, 'committed-witnessed');

  for (const invalid of [
    intent({ proof: { ...proof(0), witnessDigest: digest('f') } }),
    intent({ operation: `${oracle.operation}/op/2` }),
    intent({ payloadBasisDigest: 'not-a-digest' }),
    intent({ subject: { ...subject, story: `${oracle.run}/story/other` } }),
    intent({ fence: fence(oracle.refreshedGeneration) }),
    intent({ capability: capability({ operationClass: 'OPC-REV-PUBLISH' }) }),
    intent({ authority: null }),
    intent({ bounds: { waitMs: 4999, retryLimit: 3, recoveryLimit: 3 } }),
    intent({ bounds: { waitMs: 900000, retryLimit: 6, recoveryLimit: 3 } }),
  ]) {
    const isolated = createJournal();
    assert.equal(isolated.recordIntent(invalid).ok, false);
  }
});

test('operation contract: hostile containers and unknown operation classes fail closed', () => {
  const journal = createJournal();
  let getterCalled = false;
  const hostile = { ...intent() };
  Object.defineProperty(hostile, 'payloadBasisDigest', {
    enumerable: true,
    get() {
      getterCalled = true;
      return oracle.payloadBasis;
    },
  });
  assert.equal(journal.recordIntent(hostile).ok, false);
  assert.equal(getterCalled, false);
  assert.equal(journal.recordIntent({ ...intent(), type: 'OPC-UNKNOWN' }).ok, false);
  assert.equal(journal.recordIntent({ ...intent(), extra: true }).ok, false);
  assert.equal(
    journal.recordIntent(
      new Proxy(intent(), {
        ownKeys() {
          throw new Error('must be contained');
        },
      }),
    ).ok,
    false,
  );
});

test('operation contract: confirmed effect adopts once and contradictory or duplicate facts fail closed', () => {
  const journal = createJournal();
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  const result = {
    operation: oracle.operation,
    ordinal: 1,
    mechanism: 'scripted-delivery.v1',
    provider: 'fixture-only',
    subject,
    fence: fence(),
    capabilityDigest: oracle.capabilityDigest,
    authority,
    observation: { kind: 'target-effect', digest: digest('8') },
    successClaim: 'observed',
    proof: proof(2),
  };
  assert.equal(journal.recordResult(result).ok, true);
  assert.equal(
    journal.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-effect',
      observationDigest: digest('8'),
      proof: proof(3),
    }).ok,
    true,
  );
  assert.equal(journal.adopt({ operation: oracle.operation, proof: proof(4) }).ok, true);
  assert.deepEqual(journal.adopt({ operation: oracle.operation, proof: proof(5) }), {
    ok: false,
    error: { family: 'FC-EFFECT', code: 'EFFECT_ALREADY_ADOPTED' },
  });
  assert.equal(
    journal.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-absence',
      observationDigest: digest('9'),
      proof: proof(5),
    }).ok,
    false,
  );
});

test('operation contract: only confirmed absence permits a fresh same-identity effectful retry', () => {
  const journal = createJournal();
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  assert.equal(
    journal.recordResult({
      operation: oracle.operation,
      ordinal: 1,
      mechanism: 'scripted-delivery.v1',
      provider: 'fixture-only',
      subject,
      fence: fence(),
      capabilityDigest: oracle.capabilityDigest,
      authority,
      observation: { kind: 'lookup', digest: digest('8') },
      successClaim: 'absent',
      proof: proof(2),
    }).ok,
    true,
  );
  assert.equal(
    journal.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-absence',
      observationDigest: digest('8'),
      proof: proof(3),
    }).ok,
    true,
  );
  const refreshedAuthority = { ...authority, basis: oracle.basis };
  const reauthorization = {
    previousAttempt: 1,
    confirmedAbsenceDigest: digest('8'),
    generation: oracle.refreshedGeneration,
    fence: fence(oracle.refreshedGeneration),
    capabilityDigest: oracle.refreshedCapabilityDigest,
    authority: refreshedAuthority,
  };
  assert.equal(
    journal.recordAttempt(
      attempt({
        ordinal: 2,
        generation: oracle.refreshedGeneration,
        fence: fence(oracle.refreshedGeneration),
        capabilityDigest: oracle.refreshedCapabilityDigest,
        authority: refreshedAuthority,
        reauthorization,
        proof: proof(4),
      }),
    ).ok,
    true,
  );
  assert.equal(journal.dispatchPermit({ operation: oracle.operation, ordinal: 2 }).ok, true);

  const stale = createJournal();
  assert.equal(stale.recordIntent(intent()).ok, true);
  assert.equal(stale.recordAttempt(attempt()).ok, true);
  assert.equal(
    stale.recordAttempt(attempt({ ordinal: 2, reauthorization, proof: proof(2) })).error?.family,
    'FC-EFFECT',
  );
});

test('operation contract: indeterminate effects reconcile without retry and exhaustion parks with fence retained', () => {
  const journal = createJournal();
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  assert.equal(
    journal.recordUncertainty({
      operation: oracle.operation,
      ordinal: 1,
      reason: 'lost-response',
      proof: proof(2),
    }).ok,
    true,
  );
  assert.deepEqual(journal.recordAttempt(attempt({ ordinal: 2, proof: proof(3) })).error?.family, 'FC-EFFECT');

  for (let ordinal = 1; ordinal <= oracle.defaultRecoveryLimit; ordinal += 1) {
    assert.equal(
      journal.recordReconciliation({
        operation: oracle.operation,
        ordinal,
        observationOperation: `${oracle.observationTransaction}/op/${ordinal}`,
        outcome: 'indeterminate',
        observationDigest: digest(String(ordinal + 3)),
        proof: proof(ordinal + 2),
      }).ok,
      true,
    );
  }
  const state = journal.state(oracle.operation);
  assert.equal(state.ok, true);
  assert.equal(state.value.status, 'parked');
  assert.deepEqual(state.value.retainedFence, fence());
  assert.equal(journal.dispatchPermit({ operation: oracle.operation, ordinal: 1 }).ok, false);
});

test('operation contract: effect-free replacement requires a new linked ID', () => {
  const journal = createJournal();
  const observation = intent({
    operation: oracle.observationOperation,
    transaction: oracle.observationTransaction,
    event: oracle.observationEvent,
    type: 'OPC-VERIFY-EXECUTE',
    effect: 'observation',
    purpose: 'semantic',
    predecessor: null,
    capability: capability({
      kind: 'CB-VERIFY',
      port: 'PORT-VERIFY',
      operationClass: 'OPC-VERIFY-EXECUTE',
      fence: fence(oracle.refreshedGeneration),
      resourceScope: 'candidate/exact',
    }),
    authority: null,
    fence: fence(oracle.refreshedGeneration),
    proof: { ...proof(1), transaction: oracle.observationTransaction, event: oracle.observationEvent },
  });
  assert.equal(journal.recordIntent(observation).ok, true);
  assert.equal(
    journal.recordUncertainty({
      operation: oracle.observationOperation,
      ordinal: 0,
      reason: 'cancelled',
      proof: proof(2),
    }).ok,
    true,
  );
  const replacement = {
    ...observation,
    operation: oracle.replacementOperation,
    transaction: oracle.replacementTransaction,
    event: oracle.replacementEvent,
    purpose: 'replacement',
    predecessor: oracle.observationOperation,
    proof: { ...proof(3), transaction: oracle.replacementTransaction, event: oracle.replacementEvent },
  };
  assert.equal(journal.recordIntent(replacement).ok, true);
  assert.equal(
    journal.replaceObservation({
      operation: oracle.observationOperation,
      replacement: oracle.replacementOperation,
      proof: proof(4),
    }).ok,
    true,
  );
  assert.equal(journal.state(oracle.observationOperation).value.status, 'superseded');
  assert.equal(journal.state(oracle.replacementOperation).value.status, 'intent-recorded');
});

test('operation contract: journal restore verifies every entry and exact head', () => {
  const journal = createJournal();
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  const snapshot = journal.snapshot();
  const restored = operation.restoreOperationJournal(snapshot, snapshot.head, proofVerifier);
  assert.equal(restored.ok, true);
  assert.deepEqual(
    restored.value.pendingEffects().map((entry) => entry.operation),
    [oracle.operation],
  );
  assert.equal(
    operation.restoreOperationJournal(
      {
        ...snapshot,
        entries: snapshot.entries.map((entry, index) => (index ? entry : { ...entry, digest: digest('f') })),
      },
      snapshot.head,
      proofVerifier,
    ).error?.family,
    'FC-TRUST',
  );
  assert.equal(
    operation.restoreOperationJournal(snapshot, { ...snapshot.head, digest: digest('e') }, proofVerifier).error?.family,
    'FC-TRUST',
  );
});

test('operation contract: crash corpus has every required intent/dispatch/response/fact/adoption boundary', () => {
  assert.equal(crashCorpus.fixtureVersion, 'gf015-crash-corpus.v1');
  assert.deepEqual(crashCorpus.points, [
    'before-intent-commit',
    'after-intent-flush',
    'after-intent-witness',
    'before-dispatch',
    'after-dispatch',
    'after-response',
    'after-fact-flush',
    'after-fact-witness',
    'before-adoption',
    'after-adoption',
  ]);
  for (const point of crashCorpus.points) assert.equal(typeof crashCorpus.safeOutcomes[point], 'string');

  const intentCrash = createJournal();
  assert.equal(intentCrash.dispatchPermit({ operation: oracle.operation, ordinal: 1 }).ok, false);
  assert.equal(intentCrash.recordIntent(intent({ proof: { ...proof(0), witnessDigest: digest('f') } })).ok, false);
  assert.equal(intentCrash.recordIntent(intent()).ok, true);
  assert.equal(intentCrash.state(oracle.operation).value.status, 'intent-recorded');
  assert.equal(intentCrash.recordAttempt(attempt()).ok, true);
  assert.equal(intentCrash.dispatchPermit({ operation: oracle.operation, ordinal: 1 }).ok, true);

  const dispatchCrash = createJournal();
  assert.equal(dispatchCrash.recordIntent(intent()).ok, true);
  assert.equal(dispatchCrash.recordAttempt(attempt()).ok, true);
  assert.equal(
    dispatchCrash.recordUncertainty({
      operation: oracle.operation,
      ordinal: 1,
      reason: 'lost-response',
      proof: proof(2),
    }).ok,
    true,
  );
  const uncertainSnapshot = dispatchCrash.snapshot();
  const uncertainRestart = operation.restoreOperationJournal(uncertainSnapshot, uncertainSnapshot.head, proofVerifier);
  assert.equal(uncertainRestart.ok, true);
  assert.equal(uncertainRestart.value.state(oracle.operation).value.status, 'uncertain');
  assert.equal(uncertainRestart.value.dispatchPermit({ operation: oracle.operation, ordinal: 1 }).ok, false);

  const factCrash = createJournal();
  assert.equal(factCrash.recordIntent(intent()).ok, true);
  assert.equal(factCrash.recordAttempt(attempt()).ok, true);
  assert.equal(
    factCrash.recordResult({
      operation: oracle.operation,
      ordinal: 1,
      mechanism: 'scripted-delivery.v1',
      provider: 'fixture-only',
      subject,
      fence: fence(),
      capabilityDigest: oracle.capabilityDigest,
      authority,
      observation: { kind: 'target-effect', digest: digest('8') },
      successClaim: 'observed',
      proof: proof(2),
    }).ok,
    true,
  );
  assert.equal(factCrash.state(oracle.operation).value.status, 'result-recorded');
  assert.equal(factCrash.dispatchPermit({ operation: oracle.operation, ordinal: 1 }).ok, false);
  assert.equal(
    factCrash.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-effect',
      observationDigest: digest('8'),
      proof: { ...proof(3), witnessDigest: digest('f') },
    }).ok,
    false,
  );
  assert.equal(
    factCrash.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-effect',
      observationDigest: digest('8'),
      proof: proof(3),
    }).ok,
    true,
  );
  const factSnapshot = factCrash.snapshot();
  const factRestart = operation.restoreOperationJournal(factSnapshot, factSnapshot.head, proofVerifier);
  assert.equal(factRestart.ok, true);
  assert.equal(factRestart.value.state(oracle.operation).value.status, 'confirmed-effect');
  assert.equal(factRestart.value.adopt({ operation: oracle.operation, proof: proof(4) }).ok, true);
  assert.equal(factRestart.value.state(oracle.operation).value.status, 'adopted');
});
