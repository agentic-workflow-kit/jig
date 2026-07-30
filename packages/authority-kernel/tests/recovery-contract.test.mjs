import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const runtime = await import('../../runtime-contracts/dist/index.js');
const operation = await import('../dist/operation.js');
const recovery = await import('../dist/recovery.js');
const fixture = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/recovery-contract-oracle.json'), 'utf8'),
);
const digest = (value) => value.repeat(64).slice(0, 64);
const run = fixture.run;
const priorGeneration = fixture.priorGeneration;
const generation = fixture.generation;
const basis = fixture.recoveryToken;
const subject = Object.freeze({ run, story: `${run}/story/story-1`, basis });
const priorFence = Object.freeze({ generation: priorGeneration, basis });
const initialState = Object.freeze({
  storyState: 'Pending',
  runPhase: 'Received',
  subject,
  fence: priorFence,
  catalogVersion: 'jig.authority-kernel.v1',
});

function transition(position, schema = 'jig.transition.v1') {
  const transaction = `${run}/txn/${position + 1}/${priorGeneration}|${basis}`;
  const event = {
    type: 'EV-WAKE-DEPENDENCY',
    edge: 'pending-eligible',
    id: `${run}/event/${position + 1}`,
    subject,
    fence: priorFence,
    catalogVersion: 'jig.authority-kernel.v1',
  };
  return {
    schema,
    event,
    bindings: {
      transaction,
      event: event.id,
      operation: `${transaction}/op/1`,
      subject,
      fence: priorFence,
      catalogVersion: 'jig.authority-kernel.v1',
    },
  };
}

function append(ledger, position, previousDigest, recordGeneration, content, fault) {
  const proposal = runtime.createLedgerRecord({
    run,
    generation: recordGeneration,
    transaction: `${run}/txn/${position + 1}/${recordGeneration}|${basis}`,
    position,
    previousDigest,
    content,
  });
  assert.equal(proposal.ok, true);
  const result = ledger.append(
    {
      binding: { kind: 'run', run, generation: recordGeneration },
      expectedPosition: position - 1,
      record: proposal.value,
    },
    fault,
  );
  assert.equal(result.ok, true);
  return result.value;
}

function chain(schema) {
  const ledger = runtime.createScriptedLedger();
  const first = append(ledger, 0, digest('0'), priorGeneration, transition(0, schema));
  const claim = append(ledger, 1, first.contentDigest, generation, {
    recovery: 'generation-claim',
    token: basis,
  });
  return { ledger, records: [first, claim], claim, head: { position: claim.position, digest: claim.contentDigest } };
}

function secondRestart(malformedHistory = false) {
  const ledger = runtime.createScriptedLedger();
  const first = append(ledger, 0, digest('0'), priorGeneration, transition(0));
  const priorClaim = append(ledger, 1, first.contentDigest, generation, {
    recovery: 'generation-claim',
    token: basis,
  });
  const records = [first, priorClaim];
  let previousDigest = priorClaim.contentDigest;
  if (malformedHistory) {
    const malformed = append(ledger, 2, previousDigest, generation, {
      recovery: 'generation-claim',
      token: digest('b'),
      ambiguous: true,
    });
    records.push(malformed);
    previousDigest = malformed.contentDigest;
  }
  const currentGeneration = `${run}/gen/3|recovery`;
  const claim = append(ledger, records.length, previousDigest, currentGeneration, {
    recovery: 'generation-claim',
    token: digest('c'),
  });
  records.push(claim);
  return {
    ledger,
    records,
    claim,
    head: { position: claim.position, digest: claim.contentDigest },
    currentGeneration,
  };
}

function recover(overrides = {}) {
  return recovery.recoverFencedRun({
    ...chain(),
    binding: { kind: 'run', run, generation: priorGeneration },
    generation,
    recoveryToken: basis,
    initialState,
    ...overrides,
  });
}

test('CF-RUN-CONTROL: replay uses the GF-005 reducer and retains canonical decision inputs', () => {
  const result = recover();
  assert.equal(result.ok, true);
  assert.equal(result.value.projection.state.storyState, 'Eligible');
  assert.equal(result.value.projection.decisions.length, 1);
  assert.equal(result.value.projection.decisions[0].trigger.id, `${run}/event/1`);
  assert.equal(result.value.observation.generation, generation);
});

test('CF-ORDERING: caller permutations produce the same reconstructed authority state', () => {
  const source = chain();
  const ordered = recover(source);
  const reversed = recover({ ...source, records: [...source.records].reverse() });
  assert.equal(ordered.ok, true);
  assert.equal(reversed.ok, true);
  assert.deepEqual(reversed.value.projection, ordered.value.projection);
  assert.equal(ordered.value.projection.stateDigest, fixture.expectedStateDigest);
  assert.equal(ordered.value.projection.decisionDigest, fixture.expectedDecisionDigest);
});

test('CF-SNAPSHOT: only a byte-equivalent replay projection is used', () => {
  const source = chain();
  const withoutSnapshot = recover(source);
  assert.equal(withoutSnapshot.ok, true);
  const {
    stateDigest: _stateDigest,
    decisionDigest: _decisionDigest,
    ...coveredProjection
  } = withoutSnapshot.value.projection;
  const snapshot = {
    position: source.head.position,
    digest: source.head.digest,
    projection: coveredProjection,
  };
  const used = recover({ ...source, snapshot });
  const forged = recover({
    ...source,
    snapshot: { ...snapshot, projection: { ...coveredProjection, decisions: [] } },
  });
  assert.equal(used.ok, true);
  assert.equal(forged.ok, true);
  assert.equal(used.value.snapshot, 'used');
  assert.equal(forged.value.snapshot, 'discarded');
  assert.deepEqual(used.value.projection, withoutSnapshot.value.projection);
  assert.deepEqual(forged.value.projection, withoutSnapshot.value.projection);
});

test('CF-FENCE: a witnessed claim fences stale appends and recovery refuses absent claim proof', () => {
  const source = chain();
  const stale = runtime.createLedgerRecord({
    run,
    generation: priorGeneration,
    transaction: `${run}/txn/3/${priorGeneration}|${basis}`,
    position: 2,
    previousDigest: source.head.digest,
    content: transition(2),
  });
  assert.equal(stale.ok, true);
  assert.deepEqual(
    source.ledger.append({
      binding: { kind: 'run', run, generation: priorGeneration },
      expectedPosition: 1,
      record: stale.value,
    }),
    { ok: false, error: { family: 'FC-FENCE', code: 'STALE_GENERATION' } },
  );
  assert.deepEqual(recover({ ...source, claim: source.records[0] }), {
    ok: false,
    error: { family: 'FC-FENCE', code: 'GENERATION_CLAIM_UNVERIFIED' },
  });
});

test('CF-RESTART: replay excludes every exact generation-control record and fences prior generations', () => {
  const source = secondRestart();
  const result = recovery.recoverFencedRun({
    ledger: source.ledger,
    records: source.records,
    claim: source.claim,
    head: source.head,
    binding: { kind: 'run', run, generation: priorGeneration },
    generation: source.currentGeneration,
    recoveryToken: digest('c'),
    initialState,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.projection.state.storyState, 'Eligible');
  assert.equal(result.value.projection.decisions.length, 1);
  assert.equal(result.value.projection.decisionDigest, fixture.expectedDecisionDigest);
  const stale = runtime.createLedgerRecord({
    run,
    generation,
    transaction: `${run}/txn/4/${generation}|${basis}`,
    position: 3,
    previousDigest: source.head.digest,
    content: transition(3),
  });
  assert.equal(stale.ok, true);
  assert.deepEqual(
    source.ledger.append({
      binding: { kind: 'run', run, generation },
      expectedPosition: 2,
      record: stale.value,
    }),
    { ok: false, error: { family: 'FC-FENCE', code: 'STALE_GENERATION' } },
  );
});

test('FC-FENCE: malformed historical generation claims fail closed before replay', () => {
  const source = secondRestart(true);
  assert.deepEqual(
    recovery.recoverFencedRun({
      ledger: source.ledger,
      records: source.records,
      claim: source.claim,
      head: source.head,
      binding: { kind: 'run', run, generation: priorGeneration },
      generation: source.currentGeneration,
      recoveryToken: digest('c'),
      initialState,
    }),
    { ok: false, error: { family: 'FC-FENCE', code: 'MALFORMED_GENERATION_CLAIM' } },
  );
});

test('FC-INPUT: unknown and invalid transition schemas fail before replay', () => {
  const source = chain();
  for (const content of [
    { schema: 'unknown', event: {}, bindings: {} },
    { schema: 'jig.transition.v0', event: {}, bindings: {} },
  ]) {
    const corrupt = { ...source.records[0], content };
    assert.deepEqual(recover({ ...source, records: [corrupt, source.claim] }), {
      ok: false,
      error: { family: 'FC-INPUT', code: 'INVALID_RECORD' },
    });
  }
  const upcast = recover(chain('jig.transition.v0'));
  assert.equal(upcast.ok, true);
  assert.equal(upcast.value.projection.state.storyState, 'Eligible');
});

test('FC-TRUST: actual witness faults stop before reconstruction at every declared recovery boundary', () => {
  for (const fault of ['witness-absent', 'witness-ahead', 'witness-contradiction', 'rollback', 'fork']) {
    const source = chain();
    assert.equal(source.ledger.injectFault({ kind: 'run', run, generation }, fault).ok, true);
    const result = recover(source);
    assert.equal(result.ok, false, fault);
    assert.equal(result.error.family, 'FC-TRUST', fault);
  }
  for (const point of fixture.faultPoints) {
    assert.deepEqual(recover({ crashAt: point }), {
      ok: false,
      error: { family: 'FC-TRUST', code: 'RECOVERY_REQUIRED' },
    });
  }
});

test('lost claim acknowledgement uses real five-way ledger readback outcomes without caller shortcuts', () => {
  const source = chain();
  assert.equal(
    recovery.resolveLostClaimAcknowledgement({
      ledger: source.ledger,
      binding: { kind: 'run', run, generation },
      record: source.claim,
    }).ok,
    true,
  );
  const proposal = runtime.createLedgerRecord({
    run,
    generation,
    transaction: `${run}/txn/3/${generation}|${basis}`,
    position: 2,
    previousDigest: source.head.digest,
    content: { recovery: 'generation-claim', token: digest('b') },
  });
  assert.equal(proposal.ok, true);
  assert.deepEqual(
    recovery.resolveLostClaimAcknowledgement({
      ledger: source.ledger,
      binding: { kind: 'run', run, generation },
      record: proposal.value,
    }),
    { ok: false, error: { family: 'FC-FENCE', code: 'GENERATION_CLAIM_RETRY_REQUIRED' } },
  );
  const competing = runtime.createLedgerRecord({
    run,
    generation,
    transaction: `${run}/txn/2/${generation}|${digest('c')}`,
    position: 1,
    previousDigest: source.records[0].contentDigest,
    content: { recovery: 'generation-claim', token: digest('c') },
  });
  assert.equal(competing.ok, true);
  assert.deepEqual(
    recovery.resolveLostClaimAcknowledgement({
      ledger: source.ledger,
      binding: { kind: 'run', run, generation },
      record: competing.value,
    }),
    { ok: false, error: { family: 'FC-FENCE', code: 'GENERATION_CLAIM_COMPETING' } },
  );
  const corrupt = runtime.createLedgerRecord({
    run,
    generation,
    transaction: source.claim.transaction,
    position: source.claim.position,
    previousDigest: source.records[0].contentDigest,
    content: { recovery: 'generation-claim', token: digest('d') },
  });
  assert.equal(corrupt.ok, true);
  assert.deepEqual(
    recovery.resolveLostClaimAcknowledgement({
      ledger: source.ledger,
      binding: { kind: 'run', run, generation },
      record: corrupt.value,
    }),
    { ok: false, error: { family: 'FC-TRUST', code: 'GENERATION_CLAIM_INTEGRITY_FAILURE' } },
  );
  assert.deepEqual(
    recovery.resolveLostClaimAcknowledgement({
      ledger: source.ledger,
      binding: { kind: 'run', run, generation: priorGeneration },
      record: source.claim,
    }),
    { ok: false, error: { family: 'FC-FENCE', code: 'STALE_GENERATION' } },
  );
  assert.deepEqual(
    recovery.resolveLostClaimAcknowledgement({
      ledger: { ...source.ledger, readback: (...args) => source.ledger.readback(...args, 'indeterminate-read') },
      binding: { kind: 'run', run, generation },
      record: proposal.value,
    }),
    { ok: false, error: { family: 'FC-TRUST', code: 'INDETERMINATE_READ' } },
  );
});

test('GF-015 recovery derives pending effects only from an exact journal bound to authorized ledger bytes', () => {
  const ledger = runtime.createScriptedLedger();
  const operationInitialState = Object.freeze({
    ...initialState,
    storyState: 'Eligible',
  });
  const transaction = `${run}/txn/1/${priorGeneration}|${basis}`;
  const event = Object.freeze({
    type: 'EV-WAKE-CAPACITY',
    edge: 'eligible-preparing',
    id: `${run}/event/1`,
    subject,
    fence: priorFence,
    catalogVersion: 'jig.authority-kernel.v1',
  });
  const bindings = Object.freeze({
    transaction,
    event: event.id,
    operation: `${transaction}/op/1`,
    subject,
    fence: priorFence,
    catalogVersion: 'jig.authority-kernel.v1',
  });
  const first = append(ledger, 0, digest('0'), priorGeneration, {
    schema: 'jig.transition.v1',
    event,
    bindings,
  });
  const operationFence = Object.freeze({
    ...priorFence,
    candidateContentDigest: digest('6'),
    targetBasisDigest: digest('7'),
  });
  const unsignedCapability = {
    kind: 'CB-WORKSPACE',
    port: 'PORT-WORKSPACE',
    operationClass: 'OPC-WS-PROVISION',
    subject: subject.story,
    fence: operationFence,
    resourceScope: 'workspace/story-1',
    manifest: `provider/${digest('3')}/authority/${digest('4')}`,
  };
  const capabilityDigest = operation.deriveOperationCapabilityDigest(unsignedCapability);
  assert.equal(capabilityDigest.ok, true);
  const operationVerifier = {
    verify: (proof) => {
      const readback = ledger.readback({
        binding: { kind: 'run', run, generation: priorGeneration },
        position: proof.position,
        transaction: proof.transaction,
        contentDigest: proof.recordDigest,
      });
      const snapshot = ledger.snapshot({ kind: 'run', run, generation: priorGeneration });
      return readback.ok &&
        readback.value.kind === 'committed' &&
        snapshot.ok &&
        snapshot.value.position === proof.position &&
        snapshot.value.digest === proof.witnessDigest
        ? { ok: true, value: undefined }
        : { ok: false, error: { family: 'FC-TRUST', code: 'UNVERIFIED' } };
    },
    verifySeal: (seal) => {
      const readback = ledger.readback({
        binding: { kind: 'run', run, generation: priorGeneration },
        position: seal.proof.position,
        transaction: seal.proof.transaction,
        contentDigest: seal.proof.recordDigest,
      });
      return readback.ok &&
        readback.value.kind === 'committed' &&
        readback.value.record.content.schema === 'jig.operation-head.v1' &&
        readback.value.record.content.position === seal.position &&
        readback.value.record.content.digest === seal.digest
        ? { ok: true, value: undefined }
        : { ok: false, error: { family: 'FC-TRUST', code: 'UNVERIFIED' } };
    },
  };
  const operationJournal = operation.createOperationJournal(operationVerifier);
  assert.equal(
    operationJournal.recordIntent({
      version: operation.OPERATION_STATE_VERSION,
      operation: bindings.operation,
      transaction,
      event: event.id,
      type: 'OPC-WS-PROVISION',
      subject,
      payloadBasisDigest: digest('2'),
      fence: operationFence,
      capability: { ...unsignedCapability, digest: capabilityDigest.value },
      authority: null,
      role: 'controller',
      lifecycle: 'Preparing',
      effect: 'effectful',
      purpose: 'semantic',
      predecessor: null,
      bounds: { waitMs: 900000, retryLimit: 3, recoveryLimit: 3 },
      proof: {
        kind: 'committed-witnessed',
        position: first.position,
        event: first.event,
        transaction: first.transaction,
        recordDigest: first.contentDigest,
        witnessDigest: first.contentDigest,
      },
    }).ok,
    true,
  );
  const snapshot = operationJournal.snapshot();
  const headCarrier = append(ledger, 1, first.contentDigest, priorGeneration, {
    schema: 'jig.operation-head.v1',
    position: snapshot.head.position,
    digest: snapshot.head.digest,
  });
  const seal = operationJournal.seal({
    proof: {
      kind: 'committed-witnessed',
      position: headCarrier.position,
      event: headCarrier.event,
      transaction: headCarrier.transaction,
      recordDigest: headCarrier.contentDigest,
      witnessDigest: headCarrier.contentDigest,
    },
  });
  assert.equal(seal.ok, true);
  const claim = append(ledger, 2, headCarrier.contentDigest, generation, {
    recovery: 'generation-claim',
    token: basis,
  });
  const recoveryInput = {
    ledger,
    records: [first, headCarrier, claim],
    claim,
    head: { position: claim.position, digest: claim.contentDigest },
    binding: { kind: 'run', run, generation: priorGeneration },
    generation,
    recoveryToken: basis,
    initialState: operationInitialState,
  };
  assert.deepEqual(recovery.recoverFencedRun(recoveryInput), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'OPERATION_JOURNAL_REQUIRED' },
  });
  const recovered = recovery.recoverFencedRun({
    ...recoveryInput,
    operationState: { snapshot, seal: seal.value },
  });
  assert.equal(recovered.ok, true);
  assert.deepEqual(
    recovered.value.pendingEffects.map((entry) => [entry.operation, entry.status]),
    [[bindings.operation, 'intent-recorded']],
  );

  assert.deepEqual(
    recovery.recoverFencedRun({
      ...recoveryInput,
      operationState: { snapshot, seal: { ...seal.value, digest: digest('f') } },
    }),
    { ok: false, error: { family: 'FC-TRUST', code: 'OPERATION_JOURNAL_UNVERIFIED' } },
  );

  const behindLedger = runtime.createScriptedLedger();
  const behindFirst = append(behindLedger, 0, digest('0'), priorGeneration, {
    schema: 'jig.transition.v1',
    event,
    bindings,
  });
  const behindHead = append(behindLedger, 1, behindFirst.contentDigest, priorGeneration, {
    schema: 'jig.operation-head.v1',
    position: snapshot.head.position,
    digest: snapshot.head.digest,
  });
  const laterHead = append(behindLedger, 2, behindHead.contentDigest, priorGeneration, {
    schema: 'jig.operation-head.v1',
    position: snapshot.head.position,
    digest: digest('f'),
  });
  const behindClaim = append(behindLedger, 3, laterHead.contentDigest, generation, {
    recovery: 'generation-claim',
    token: basis,
  });
  assert.deepEqual(
    recovery.recoverFencedRun({
      ...recoveryInput,
      ledger: behindLedger,
      records: [behindFirst, behindHead, laterHead, behindClaim],
      claim: behindClaim,
      head: { position: behindClaim.position, digest: behindClaim.contentDigest },
      operationState: { snapshot, seal: seal.value },
    }),
    { ok: false, error: { family: 'FC-TRUST', code: 'OPERATION_JOURNAL_UNVERIFIED' } },
  );
});
