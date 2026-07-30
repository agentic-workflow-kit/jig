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
  verify: (candidate, carrier) =>
    candidate.kind === 'committed-witnessed' &&
    candidate.recordDigest === candidate.witnessDigest &&
    carrier?.schema === 'jig.operation-record.v1' &&
    typeof carrier.record === 'object' &&
    carrier.record !== null &&
    typeof carrier.record.kind === 'string'
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
const fence = (generation = oracle.generation, overrides = {}) =>
  Object.freeze({
    generation,
    basis: oracle.basis,
    candidateContentDigest: oracle.candidateContentDigest,
    targetBasisDigest: oracle.targetBasisDigest,
    ...overrides,
  });
const capability = (overrides = {}) => {
  const candidate = {
    kind: 'CB-DELIVERY',
    port: 'PORT-DELIVERY',
    operationClass: 'OPC-DEL-MERGE',
    subject: oracle.story,
    fence: fence(),
    resourceScope: 'repository/main',
    manifest: oracle.manifest,
    ...overrides,
  };
  const { digest: suppliedDigest, ...unsigned } = candidate;
  const derived = operation.deriveOperationCapabilityDigest(unsigned);
  assert.equal(derived.ok, true);
  return Object.freeze({ ...unsigned, digest: suppliedDigest ?? derived.value });
};
const authority = Object.freeze({
  authority: oracle.authority,
  registry: oracle.registry,
  basis: oracle.targetBasisDigest,
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
    capability: capability(),
    authority,
    role: 'finalizer',
    lifecycle: 'Finalizing',
    startedAt: 1000,
    deadline: 1000 + oracle.defaultWaitMs,
    reauthorization: null,
    proof: proof(1),
    ...overrides,
  });
const restoreFor = (journal) =>
  operation.restoreOperationRecords(
    journal.snapshot().entries.map((entry) => entry.record),
    proofVerifier,
  );

test('operation contract: exact committed and witnessed intent is required before dispatch', () => {
  assert.equal(operation.OPERATION_STATE_VERSION, oracle.operationVersion);
  assert.equal(operation.OPERATION_RECORD_SCHEMA, oracle.recordCarrierSchema);
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
  assert.deepEqual(journal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(0) }), {
    ok: false,
    error: { family: 'FC-ORDERING', code: 'INTENT_NOT_RECORDED' },
  });
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.deepEqual(journal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(1) }), {
    ok: false,
    error: { family: 'FC-ORDERING', code: 'ATTEMPT_NOT_RECORDED' },
  });
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  const permit = journal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) });
  assert.equal(permit.ok, true);
  assert.equal(permit.value.operation, oracle.operation);
  assert.equal(permit.value.proof.kind, 'committed-witnessed');

  for (const invalid of [
    intent({ proof: { ...proof(0), witnessDigest: digest('f') } }),
    intent({ operation: `${oracle.operation}/op/2` }),
    intent({ payloadBasisDigest: 'not-a-digest' }),
    intent({ subject: { ...subject, story: `${oracle.run}/story/other` } }),
    intent({ fence: fence(oracle.refreshedGeneration) }),
    intent({ capability: { ...capability(), operationClass: 'OPC-REV-PUBLISH' } }),
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
  assert.equal(journal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) }).ok, true);
  const result = {
    operation: oracle.operation,
    ordinal: 1,
    mechanism: 'scripted-delivery.v1',
    provider: 'fixture-only',
    subject,
    fence: fence(),
    capability: capability(),
    authority,
    role: 'finalizer',
    lifecycle: 'Finalizing',
    observation: { kind: 'target-effect', digest: digest('8') },
    successClaim: 'observed',
    proof: proof(3),
  };
  for (const changed of [
    { ...result, fence: fence(oracle.generation, { candidateContentDigest: digest('f') }) },
    { ...result, capability: capability({ digest: digest('f') }) },
    { ...result, capability: { ...capability(), manifest: `provider/${digest('a')}/authority/${digest('b')}` } },
    { ...result, role: 'worker' },
    { ...result, lifecycle: 'Reviewing' },
  ])
    assert.equal(journal.recordResult(changed).ok, false);
  assert.equal(journal.recordResult(result).ok, true);
  assert.equal(
    journal.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-effect',
      observationDigest: digest('8'),
      proof: proof(4),
    }).ok,
    true,
  );
  assert.equal(journal.adopt({ operation: oracle.operation, proof: proof(5) }).ok, true);
  assert.deepEqual(journal.adopt({ operation: oracle.operation, proof: proof(6) }), {
    ok: false,
    error: { family: 'FC-EFFECT', code: 'EFFECT_ALREADY_ADOPTED' },
  });
  assert.equal(
    journal.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-absence',
      observationDigest: digest('9'),
      proof: proof(6),
    }).ok,
    false,
  );
});

test('operation contract: only confirmed absence permits a fresh same-identity effectful retry', () => {
  const journal = createJournal();
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  assert.equal(journal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) }).ok, true);
  assert.equal(
    journal.recordResult({
      operation: oracle.operation,
      ordinal: 1,
      mechanism: 'scripted-delivery.v1',
      provider: 'fixture-only',
      subject,
      fence: fence(),
      capability: capability(),
      authority,
      role: 'finalizer',
      lifecycle: 'Finalizing',
      observation: { kind: 'lookup', digest: digest('8') },
      successClaim: 'absent',
      proof: proof(3),
    }).ok,
    true,
  );
  assert.equal(
    journal.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-absence',
      observationDigest: digest('8'),
      proof: proof(4),
    }).ok,
    true,
  );
  const refreshedAuthority = { ...authority, authority: 'target/repository-main/auth/2' };
  const refreshedCapability = capability({ fence: fence(oracle.refreshedGeneration) });
  const reauthorization = {
    previousAttempt: 1,
    confirmedAbsenceDigest: digest('8'),
    generation: oracle.refreshedGeneration,
    fence: fence(oracle.refreshedGeneration),
    capability: refreshedCapability,
    authority: refreshedAuthority,
    role: 'finalizer',
    lifecycle: 'Finalizing',
  };
  assert.equal(
    journal.recordAttempt(
      attempt({
        ordinal: 2,
        generation: oracle.refreshedGeneration,
        fence: fence(oracle.refreshedGeneration),
        capability: refreshedCapability,
        authority,
        reauthorization: { ...reauthorization, authority },
        proof: proof(5),
      }),
    ).ok,
    false,
  );
  assert.equal(
    journal.recordAttempt(
      attempt({
        ordinal: 2,
        generation: oracle.refreshedGeneration,
        fence: fence(oracle.refreshedGeneration),
        capability: refreshedCapability,
        authority: refreshedAuthority,
        role: 'finalizer',
        lifecycle: 'Finalizing',
        reauthorization,
        proof: proof(5),
      }),
    ).ok,
    true,
  );
  assert.equal(journal.recordDispatch({ operation: oracle.operation, ordinal: 2, proof: proof(6) }).ok, true);

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
  assert.equal(journal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) }).ok, true);
  assert.equal(
    journal.recordUncertainty({
      operation: oracle.operation,
      ordinal: 1,
      reason: 'lost-response',
      proof: proof(3),
    }).ok,
    true,
  );
  assert.deepEqual(journal.recordAttempt(attempt({ ordinal: 2, proof: proof(4) })).error?.family, 'FC-EFFECT');

  for (let ordinal = 1; ordinal <= oracle.defaultRecoveryLimit; ordinal += 1) {
    const base = 4 + (ordinal - 1) * 5;
    const intentProof = proof(base);
    const observationOperation = `${intentProof.transaction}/op/1`;
    const observationCapability = capability({ operationClass: 'OPC-DEL-OBSERVE' });
    assert.equal(
      journal.recordIntent(
        intent({
          operation: observationOperation,
          transaction: intentProof.transaction,
          event: intentProof.event,
          type: 'OPC-DEL-OBSERVE',
          capability: observationCapability,
          effect: 'observation',
          purpose: 'reconciliation',
          predecessor: oracle.operation,
          proof: intentProof,
        }),
      ).ok,
      true,
    );
    assert.equal(
      journal.recordAttempt(
        attempt({
          operation: observationOperation,
          capability: observationCapability,
          proof: proof(base + 1),
        }),
      ).ok,
      true,
    );
    assert.equal(
      journal.recordDispatch({
        operation: observationOperation,
        ordinal: 1,
        proof: proof(base + 2),
      }).ok,
      true,
    );
    assert.equal(
      journal.recordResult({
        operation: observationOperation,
        ordinal: 1,
        mechanism: 'scripted-delivery.v1',
        provider: 'fixture-only',
        subject,
        fence: fence(),
        capability: observationCapability,
        authority,
        role: 'finalizer',
        lifecycle: 'Finalizing',
        observation: { kind: 'effect-indeterminate', digest: digest(String(ordinal + 3)) },
        successClaim: 'observed',
        proof: proof(base + 3),
      }).ok,
      true,
    );
    assert.equal(
      journal.recordReconciliation({
        operation: oracle.operation,
        observationOperation,
        proof: proof(base + 4),
      }).ok,
      true,
    );
  }
  const state = journal.state(oracle.operation);
  assert.equal(state.ok, true);
  assert.equal(state.value.status, 'parked');
  assert.deepEqual(state.value.retainedFence, fence());
  assert.equal(journal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(20) }).ok, false);
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
  assert.equal(
    journal.replaceObservation({
      operation: oracle.observationOperation,
      replacement: oracle.replacementOperation,
      proof: proof(3),
    }).ok,
    true,
  );
  const supersessionRestart = restoreFor(journal);
  assert.equal(supersessionRestart.ok, true);
  assert.equal(supersessionRestart.value.state(oracle.observationOperation).value.status, 'superseded');
  assert.equal(
    supersessionRestart.value.recordIntent({
      ...replacement,
      proof: { ...proof(4), transaction: oracle.replacementTransaction, event: oracle.replacementEvent },
    }).ok,
    true,
  );
  assert.equal(supersessionRestart.value.state(oracle.observationOperation).value.status, 'superseded');
  assert.equal(supersessionRestart.value.state(oracle.replacementOperation).value.status, 'intent-recorded');
  const replacementCapability = replacement.capability;
  assert.equal(
    supersessionRestart.value.recordAttempt({
      operation: oracle.replacementOperation,
      ordinal: 1,
      generation: oracle.refreshedGeneration,
      fence: fence(oracle.refreshedGeneration),
      capability: replacementCapability,
      authority: null,
      role: 'finalizer',
      lifecycle: 'Finalizing',
      startedAt: 1000,
      deadline: 1000 + oracle.defaultWaitMs,
      reauthorization: null,
      proof: proof(5),
    }).ok,
    true,
  );
  assert.equal(
    supersessionRestart.value.recordDispatch({
      operation: oracle.replacementOperation,
      ordinal: 1,
      proof: proof(6),
    }).ok,
    true,
  );
  const restarted = restoreFor(supersessionRestart.value);
  assert.equal(restarted.ok, true);
  assert.equal(
    restarted.value.recordDispatch({
      operation: oracle.observationOperation,
      ordinal: 1,
      proof: proof(7),
    }).ok,
    false,
  );
  assert.equal(restarted.value.state(oracle.replacementOperation).value.status, 'dispatch-crossed');
});

test('operation contract: journal restore replays only canonical byte-bound records', () => {
  const journal = createJournal();
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  const snapshot = journal.snapshot();
  const records = snapshot.entries.map((entry) => entry.record);
  const restored = operation.restoreOperationRecords(records, proofVerifier);
  assert.equal(restored.ok, true);
  assert.deepEqual(
    restored.value.pendingEffects().map((entry) => entry.operation),
    [oracle.operation],
  );
  assert.equal(
    operation.restoreOperationRecords(
      records.map((record, index) =>
        index === 0 ? { ...record, proof: { ...record.proof, witnessDigest: digest('f') } } : record,
      ),
      proofVerifier,
    ).error?.family,
    'FC-TRUST',
  );
});

test('operation contract: crash corpus has every required intent/dispatch/response/fact/adoption boundary', () => {
  assert.equal(crashCorpus.fixtureVersion, 'gf015-crash-corpus.v2');
  assert.deepEqual(crashCorpus.points, [
    'before-intent-commit',
    'after-intent-flush',
    'after-intent-witness',
    'before-dispatch',
    'after-dispatch-carrier-witness',
    'after-dispatch',
    'after-response',
    'after-fact-flush',
    'after-fact-witness',
    'before-adoption',
    'after-adoption',
  ]);
  for (const point of crashCorpus.points) assert.equal(typeof crashCorpus.safeOutcomes[point], 'string');

  const intentCrash = createJournal();
  assert.equal(intentCrash.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(0) }).ok, false);
  assert.equal(intentCrash.recordIntent(intent({ proof: { ...proof(0), witnessDigest: digest('f') } })).ok, false);
  assert.equal(intentCrash.recordIntent(intent()).ok, true);
  assert.equal(intentCrash.state(oracle.operation).value.status, 'intent-recorded');
  assert.equal(intentCrash.recordAttempt(attempt()).ok, true);
  assert.equal(intentCrash.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) }).ok, true);

  const dispatchCrash = createJournal();
  assert.equal(dispatchCrash.recordIntent(intent()).ok, true);
  assert.equal(dispatchCrash.recordAttempt(attempt()).ok, true);
  assert.equal(dispatchCrash.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) }).ok, true);
  assert.equal(
    dispatchCrash.recordUncertainty({
      operation: oracle.operation,
      ordinal: 1,
      reason: 'lost-response',
      proof: proof(3),
    }).ok,
    true,
  );
  const uncertainRestart = restoreFor(dispatchCrash);
  assert.equal(uncertainRestart.ok, true);
  assert.equal(uncertainRestart.value.state(oracle.operation).value.status, 'uncertain');
  assert.equal(
    uncertainRestart.value.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(4) }).ok,
    false,
  );

  const factCrash = createJournal();
  assert.equal(factCrash.recordIntent(intent()).ok, true);
  assert.equal(factCrash.recordAttempt(attempt()).ok, true);
  assert.equal(factCrash.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) }).ok, true);
  assert.equal(
    factCrash.recordResult({
      operation: oracle.operation,
      ordinal: 1,
      mechanism: 'scripted-delivery.v1',
      provider: 'fixture-only',
      subject,
      fence: fence(),
      capability: capability(),
      authority,
      role: 'finalizer',
      lifecycle: 'Finalizing',
      observation: { kind: 'target-effect', digest: digest('8') },
      successClaim: 'observed',
      proof: proof(3),
    }).ok,
    true,
  );
  assert.equal(factCrash.state(oracle.operation).value.status, 'result-recorded');
  assert.equal(factCrash.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(4) }).ok, false);
  assert.equal(
    factCrash.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-effect',
      observationDigest: digest('8'),
      proof: { ...proof(4), witnessDigest: digest('f') },
    }).ok,
    false,
  );
  assert.equal(
    factCrash.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-effect',
      observationDigest: digest('8'),
      proof: proof(4),
    }).ok,
    true,
  );
  const factRestart = restoreFor(factCrash);
  assert.equal(factRestart.ok, true);
  assert.equal(factRestart.value.state(oracle.operation).value.status, 'confirmed-effect');
  assert.equal(factRestart.value.adopt({ operation: oracle.operation, proof: proof(5) }).ok, true);
  assert.equal(factRestart.value.state(oracle.operation).value.status, 'adopted');
});

test('GF015-R01: a committed dispatch crossing survives restart and cannot authorize the same attempt twice', () => {
  const journal = createJournal();
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  assert.equal(journal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) }).ok, true);
  const restarted = restoreFor(journal);
  assert.equal(restarted.ok, true);
  assert.equal(restarted.value.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(3) }).ok, false);
});

test('GF015-R02: reconciliation cannot select certainty without a linked committed observation result', () => {
  const journal = createJournal();
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  assert.equal(journal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) }).ok, true);
  assert.equal(
    journal.recordUncertainty({
      operation: oracle.operation,
      ordinal: 1,
      reason: 'lost-response',
      proof: proof(3),
    }).ok,
    true,
  );
  assert.equal(
    journal.recordReconciliation({
      operation: oracle.operation,
      ordinal: 1,
      observationOperation: oracle.observationOperation,
      outcome: 'confirmed-absence',
      observationDigest: digest('f'),
      proof: proof(4),
    }).ok,
    false,
  );
  const otherSubject = { ...subject, story: `${oracle.run}/story/other` };
  const unsignedOtherCapability = {
    ...capability({ operationClass: 'OPC-DEL-OBSERVE' }),
    subject: otherSubject.story,
  };
  delete unsignedOtherCapability.digest;
  const otherDigest = operation.deriveOperationCapabilityDigest(unsignedOtherCapability);
  assert.equal(otherDigest.ok, true);
  const otherProof = proof(4);
  assert.equal(
    journal.recordIntent(
      intent({
        operation: `${otherProof.transaction}/op/1`,
        transaction: otherProof.transaction,
        event: otherProof.event,
        type: 'OPC-DEL-OBSERVE',
        subject: otherSubject,
        capability: { ...unsignedOtherCapability, digest: otherDigest.value },
        effect: 'observation',
        purpose: 'reconciliation',
        predecessor: oracle.operation,
        proof: otherProof,
      }),
    ).ok,
    false,
  );
});

test('GF015-R03: recovery authority is not a caller-supplied journal head', () => {
  const journal = createJournal();
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  assert.equal(typeof journal.seal, 'undefined');
  assert.equal(typeof operation.restoreOperationJournal, 'undefined');
});

test('GF015-R04: dispatch carries the complete canonical authority fence tuple', () => {
  const journal = createJournal();
  assert.equal(journal.recordIntent(intent()).ok, true);
  assert.equal(journal.recordAttempt(attempt()).ok, true);
  const permit = journal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) });
  assert.equal(permit.ok, true);
  assert.deepEqual(
    {
      candidateContentDigest: permit.value.fence.candidateContentDigest,
      targetBasisDigest: permit.value.fence.targetBasisDigest,
      manifest: permit.value.capability.manifest,
      role: permit.value.role,
      lifecycle: permit.value.lifecycle,
    },
    {
      candidateContentDigest: oracle.candidateContentDigest,
      targetBasisDigest: oracle.targetBasisDigest,
      manifest: oracle.manifest,
      role: 'finalizer',
      lifecycle: 'Finalizing',
    },
  );
});

test('GF015-R02/R04: exact result provenance and every dispatch authority operand are carrier-bound', () => {
  const baseIntent = intent();
  const baseCarrier = operation.deriveOperationRecordCarrier({ kind: 'intent', ...baseIntent });
  assert.equal(baseCarrier.ok, true);
  const exactIntentVerifier = {
    verify: (candidateProof, actualCarrier) =>
      candidateProof.recordDigest === candidateProof.witnessDigest &&
      JSON.stringify(actualCarrier) === JSON.stringify(baseCarrier.value)
        ? { ok: true, value: undefined }
        : { ok: false, error: { family: 'FC-TRUST', code: 'CARRIER_MISMATCH' } },
  };
  assert.equal(operation.createOperationJournal(exactIntentVerifier).recordIntent(baseIntent).ok, true);

  const candidateFence = fence(oracle.generation, { candidateContentDigest: digest('c') });
  const targetFence = fence(oracle.generation, { targetBasisDigest: digest('d') });
  const refreshedFence = fence(oracle.refreshedGeneration);
  const changedManifest = `provider/${digest('a')}/authority/${digest('c')}`;
  const mutations = [
    intent({ payloadBasisDigest: digest('c') }),
    intent({ fence: candidateFence, capability: capability({ fence: candidateFence }) }),
    intent({
      fence: targetFence,
      capability: capability({ fence: targetFence }),
      authority: { ...authority, basis: targetFence.targetBasisDigest },
    }),
    intent({ fence: refreshedFence, capability: capability({ fence: refreshedFence }) }),
    intent({ capability: capability({ manifest: changedManifest }) }),
    intent({ capability: capability({ resourceScope: 'repository/release' }) }),
    intent({ authority: { ...authority, authority: 'target/repository-main/auth/2' } }),
    intent({ authority: { ...authority, registry: 'target/repository-main/registry/2' } }),
    intent({ role: 'release-finalizer' }),
    intent({ lifecycle: 'Delivering' }),
    intent({ bounds: { waitMs: 600000, retryLimit: 2, recoveryLimit: 2 } }),
  ];
  for (const changed of mutations) {
    assert.equal(operation.createOperationJournal(exactIntentVerifier).recordIntent(changed).ok, false);
  }

  const expected = new Map();
  const verifier = {
    verify: (candidateProof, actualCarrier) => {
      const carrier = expected.get(candidateProof.position);
      return candidateProof.recordDigest === candidateProof.witnessDigest &&
        JSON.stringify(actualCarrier) === JSON.stringify(carrier)
        ? { ok: true, value: undefined }
        : { ok: false, error: { family: 'FC-TRUST', code: 'CARRIER_MISMATCH' } };
    },
  };
  const journal = operation.createOperationJournal(verifier);
  const authorize = (kind, input) => {
    const carrier = operation.deriveOperationRecordCarrier({ kind, ...input });
    assert.equal(carrier.ok, true);
    expected.set(input.proof.position, carrier.value);
  };
  const exactIntent = intent();
  authorize('intent', exactIntent);
  assert.equal(journal.recordIntent(exactIntent).ok, true);
  const exactAttempt = attempt();
  authorize('attempt', exactAttempt);
  assert.equal(journal.recordAttempt(exactAttempt).ok, true);
  const dispatch = { operation: oracle.operation, ordinal: 1, proof: proof(2) };
  authorize('dispatch', dispatch);
  assert.equal(journal.recordDispatch(dispatch).ok, true);
  const exactResult = {
    operation: oracle.operation,
    ordinal: 1,
    mechanism: 'scripted-delivery.v1',
    provider: 'fixture-only',
    subject,
    fence: fence(),
    capability: capability(),
    authority,
    role: 'finalizer',
    lifecycle: 'Finalizing',
    observation: { kind: 'effect-confirmed', digest: digest('8') },
    successClaim: 'observed',
    proof: proof(3),
  };
  authorize('result', exactResult);
  assert.equal(
    journal.recordResult({
      ...exactResult,
      observation: { kind: 'effect-absent', digest: exactResult.observation.digest },
    }).ok,
    false,
  );
  assert.equal(journal.recordResult(exactResult).ok, true);
});

test('GF015-R05: a replacement intent is rejected until predecessor supersession is committed', () => {
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
  assert.equal(
    journal.recordIntent({
      ...observation,
      operation: oracle.replacementOperation,
      transaction: oracle.replacementTransaction,
      event: oracle.replacementEvent,
      purpose: 'replacement',
      predecessor: oracle.observationOperation,
      proof: { ...proof(3), transaction: oracle.replacementTransaction, event: oracle.replacementEvent },
    }).ok,
    false,
  );
});

test('GF015-R03: every journal record kind rejects a valid unrelated witnessed carrier', () => {
  const effectJournal = createJournal();
  assert.equal(effectJournal.recordIntent(intent()).ok, true);
  assert.equal(effectJournal.recordAttempt(attempt()).ok, true);
  assert.equal(effectJournal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) }).ok, true);
  assert.equal(
    effectJournal.recordResult({
      operation: oracle.operation,
      ordinal: 1,
      mechanism: 'scripted-delivery.v1',
      provider: 'fixture-only',
      subject,
      fence: fence(),
      capability: capability(),
      authority,
      role: 'finalizer',
      lifecycle: 'Finalizing',
      observation: { kind: 'target-effect', digest: digest('8') },
      successClaim: 'observed',
      proof: proof(3),
    }).ok,
    true,
  );
  assert.equal(
    effectJournal.recordCertainty({
      operation: oracle.operation,
      ordinal: 1,
      certainty: 'confirmed-effect',
      observationDigest: digest('8'),
      proof: proof(4),
    }).ok,
    true,
  );
  assert.equal(effectJournal.adopt({ operation: oracle.operation, proof: proof(5) }).ok, true);

  const reconcileJournal = createJournal();
  assert.equal(reconcileJournal.recordIntent(intent()).ok, true);
  assert.equal(reconcileJournal.recordAttempt(attempt()).ok, true);
  assert.equal(reconcileJournal.recordDispatch({ operation: oracle.operation, ordinal: 1, proof: proof(2) }).ok, true);
  assert.equal(
    reconcileJournal.recordUncertainty({
      operation: oracle.operation,
      ordinal: 1,
      reason: 'lost-response',
      proof: proof(3),
    }).ok,
    true,
  );
  const observationProof = proof(4);
  const observationOperation = `${observationProof.transaction}/op/1`;
  const observationCapability = capability({ operationClass: 'OPC-DEL-OBSERVE' });
  assert.equal(
    reconcileJournal.recordIntent(
      intent({
        operation: observationOperation,
        transaction: observationProof.transaction,
        event: observationProof.event,
        type: 'OPC-DEL-OBSERVE',
        capability: observationCapability,
        effect: 'observation',
        purpose: 'reconciliation',
        predecessor: oracle.operation,
        proof: observationProof,
      }),
    ).ok,
    true,
  );
  assert.equal(
    reconcileJournal.recordAttempt(
      attempt({
        operation: observationOperation,
        capability: observationCapability,
        proof: proof(5),
      }),
    ).ok,
    true,
  );
  assert.equal(
    reconcileJournal.recordDispatch({ operation: observationOperation, ordinal: 1, proof: proof(6) }).ok,
    true,
  );
  assert.equal(
    reconcileJournal.recordResult({
      operation: observationOperation,
      ordinal: 1,
      mechanism: 'scripted-delivery.v1',
      provider: 'fixture-only',
      subject,
      fence: fence(),
      capability: observationCapability,
      authority,
      role: 'finalizer',
      lifecycle: 'Finalizing',
      observation: { kind: 'effect-indeterminate', digest: digest('7') },
      successClaim: 'observed',
      proof: proof(7),
    }).ok,
    true,
  );
  assert.equal(
    reconcileJournal.recordReconciliation({
      operation: oracle.operation,
      observationOperation,
      proof: proof(8),
    }).ok,
    true,
  );

  const replacementJournal = createJournal();
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
  assert.equal(replacementJournal.recordIntent(observation).ok, true);
  assert.equal(
    replacementJournal.recordUncertainty({
      operation: oracle.observationOperation,
      ordinal: 0,
      reason: 'cancelled',
      proof: proof(2),
    }).ok,
    true,
  );
  assert.equal(
    replacementJournal.replaceObservation({
      operation: oracle.observationOperation,
      replacement: oracle.replacementOperation,
      proof: proof(3),
    }).ok,
    true,
  );

  const coveredKinds = new Set();
  for (const journal of [effectJournal, reconcileJournal, replacementJournal]) {
    const records = journal.snapshot().entries.map((entry) => entry.record);
    const carriers = records.map((record) => operation.deriveOperationRecordCarrier(record).value);
    for (let target = 0; target < records.length; target += 1) {
      const kind = records[target].kind;
      if (coveredKinds.has(kind)) continue;
      coveredKinds.add(kind);
      const unrelated = carriers.find((candidate) => candidate.record.kind !== kind);
      assert.ok(unrelated);
      const strictVerifier = {
        verify: (candidateProof, actualCarrier) => {
          const index = records.findIndex((record) => record.proof.position === candidateProof.position);
          const expectedCarrier = index === target ? unrelated : carriers[index];
          return candidateProof.recordDigest === candidateProof.witnessDigest &&
            JSON.stringify(actualCarrier) === JSON.stringify(expectedCarrier)
            ? { ok: true, value: undefined }
            : { ok: false, error: { family: 'FC-TRUST', code: 'UNRELATED_CARRIER' } };
        },
      };
      assert.equal(operation.restoreOperationRecords(records, strictVerifier).ok, false, kind);
    }
  }
  assert.deepEqual([...coveredKinds].sort(), [
    'adoption',
    'attempt',
    'certainty',
    'dispatch',
    'intent',
    'reconciliation',
    'replacement',
    'result',
    'uncertainty',
  ]);
});
