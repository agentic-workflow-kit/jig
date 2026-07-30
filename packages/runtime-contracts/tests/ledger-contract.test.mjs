import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const runtime = await import('../dist/index.js');
const fixture = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/ledger-contract-oracle.json'), 'utf8'),
);
const binding = Object.freeze({ kind: 'run', run: fixture.run, generation: fixture.generation });
const digest = (value) => value.repeat(64).slice(0, 64);
const intakeRun = (position, compositionDigest) =>
  `run-${String(position).padStart(12, '0')}-${compositionDigest.slice(0, 16)}`;

function record(
  position,
  previousDigest,
  generation = binding.generation,
  transaction = `${fixture.run}/txn/${position + 1}/${generation}|${fixture.generationDigest}`,
  content = { transition: position + 1 },
) {
  const created = runtime.createLedgerRecord({
    run: fixture.run,
    generation,
    transaction,
    position,
    previousDigest,
    content,
  });
  assert.equal(created.ok, true);
  return created.value;
}

function append(ledger, position, previousDigest, fault, generation = binding.generation, content) {
  const proposal = record(position, previousDigest, generation, undefined, content);
  return [
    proposal,
    ledger.append({ binding: { ...binding, generation }, expectedPosition: position - 1, record: proposal }, fault),
  ];
}

test('semantic ledger: an append is witnessed before acknowledgement', () => {
  assert.equal(typeof runtime.createScriptedLedger, 'function');
  const ledger = runtime.createScriptedLedger();
  const [proposal, result] = append(ledger, 0, '0'.repeat(64));
  assert.equal(result.ok, true);
  assert.equal(result.value.event, `${fixture.run}/event/1`);
  const read = ledger.readback({
    binding,
    position: 0,
    transaction: proposal.transaction,
    contentDigest: proposal.contentDigest,
  });
  assert.deepEqual(read, { ok: true, value: { kind: 'committed', record: result.value } });
});

test('semantic ledger: readback has the fixed five outcomes and never retries uncertainty', () => {
  const ledger = runtime.createScriptedLedger();
  const [first] = append(ledger, 0, '0'.repeat(64));
  const absent = ledger.readback({
    binding,
    position: 1,
    transaction: `${fixture.run}/txn/2/${binding.generation}|${fixture.generationDigest}`,
    contentDigest: digest('e'),
  });
  assert.deepEqual(absent, { ok: true, value: { kind: 'absent', position: 1 } });
  for (const transaction of [
    `${fixture.run}/txn/2`,
    `run-000000000002-bbbbbbbbbbbbbbbb/txn/2/run-000000000002-bbbbbbbbbbbbbbbb/gen/1|generation|${fixture.generationDigest}`,
    `${fixture.run}/txn/2/${fixture.run}/gen/2|replacement|${fixture.generationDigest}`,
    `${fixture.run}/txn/1/${binding.generation}|${fixture.generationDigest}`,
  ]) {
    const invalid = ledger.readback({ binding, position: 1, transaction, contentDigest: digest('e') });
    assert.deepEqual(invalid, { ok: false, error: { family: 'FC-SUBJECT', code: 'INVALID_READBACK_BINDING' } });
  }
  const mismatch = ledger.readback({
    binding,
    position: 0,
    transaction: first.transaction,
    contentDigest: digest('f'),
  });
  assert.equal(mismatch.ok, true);
  assert.equal(mismatch.value.kind, 'integrity-failure');
  const competingGeneration = `${fixture.run}/gen/2|replacement`;
  const [second] = append(ledger, 1, first.contentDigest, undefined, competingGeneration, {
    recovery: 'generation-claim',
    token: digest('a'),
  });
  const competing = ledger.readback({
    binding,
    position: 1,
    transaction: `${fixture.run}/txn/2/${binding.generation}|${fixture.generationDigest}`,
    contentDigest: second.contentDigest,
  });
  assert.deepEqual(competing, { ok: false, error: { family: 'FC-FENCE', code: 'STALE_GENERATION' } });
  const indeterminate = ledger.readback(
    { binding, position: 0, transaction: first.transaction, contentDigest: first.contentDigest },
    'indeterminate-read',
  );
  assert.deepEqual(indeterminate, { ok: false, error: { family: 'FC-TRUST', code: 'INDETERMINATE_READ' } });
});

test('semantic ledger: crash points preserve only their public durable and witnessed states', () => {
  const before = runtime.createScriptedLedger();
  const beforeProposal = record(0, '0'.repeat(64));
  assert.deepEqual(before.append({ binding, expectedPosition: -1, record: beforeProposal }, 'before-append'), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'ACK_LOST' },
  });
  assert.deepEqual(before.snapshot(binding), { ok: true, value: { position: -1, digest: '0'.repeat(64) } });
  assert.deepEqual(
    before.readback({
      binding,
      position: 0,
      transaction: beforeProposal.transaction,
      contentDigest: beforeProposal.contentDigest,
    }),
    { ok: false, error: { family: 'FC-TRUST', code: 'WITNESS_ABSENT' } },
  );

  const ledger = runtime.createScriptedLedger();
  const [first] = append(ledger, 0, '0'.repeat(64));
  const [second, lost] = append(ledger, 1, first.contentDigest, 'after-flush');
  assert.deepEqual(lost, { ok: false, error: { family: 'FC-TRUST', code: 'ACK_LOST' } });
  const behind = ledger.readback({
    binding,
    position: 1,
    transaction: second.transaction,
    contentDigest: second.contentDigest,
  });
  assert.deepEqual(behind, { ok: false, error: { family: 'FC-TRUST', code: 'WITNESS_BEHIND' } });
  assert.equal(ledger.advanceWitnessFloor(binding).ok, true);
  assert.equal(
    ledger.readback({ binding, position: 1, transaction: second.transaction, contentDigest: second.contentDigest })
      .value.kind,
    'committed',
  );

  for (const fault of ['after-witness', 'lost-ack']) {
    const recovered = runtime.createScriptedLedger();
    const [proposal, acknowledgement] = append(recovered, 0, '0'.repeat(64), fault);
    assert.deepEqual(acknowledgement, { ok: false, error: { family: 'FC-TRUST', code: 'ACK_LOST' } });
    assert.deepEqual(recovered.snapshot(binding), { ok: true, value: { position: 0, digest: proposal.contentDigest } });
    assert.equal(
      recovered.readback({
        binding,
        position: 0,
        transaction: proposal.transaction,
        contentDigest: proposal.contentDigest,
      }).value.kind,
      'committed',
    );
  }
});

test('semantic ledger: trust faults fail closed without repair or rewrite', () => {
  for (const fault of ['witness-absent', 'witness-ahead', 'witness-contradiction', 'rollback', 'fork']) {
    const ledger = runtime.createScriptedLedger();
    const [proposal] = append(ledger, 0, '0'.repeat(64));
    assert.equal(ledger.injectFault(binding, fault).ok, true);
    const read = ledger.readback({
      binding,
      position: 0,
      transaction: proposal.transaction,
      contentDigest: proposal.contentDigest,
    });
    assert.equal(read.ok, false, fault);
    assert.equal(read.error.family, 'FC-TRUST', fault);
  }
});

test('semantic ledger: hostile binding containers fail closed without reflection', () => {
  const ledger = runtime.createScriptedLedger();
  const proposal = record(0, '0'.repeat(64));
  let validGetCount = 0;
  const validProxy = new Proxy(
    { kind: 'run', run: fixture.run, generation: fixture.generation },
    {
      get() {
        validGetCount += 1;
        throw new Error('valid trap');
      },
    },
  );
  for (const binding of [
    null,
    [],
    1,
    new Proxy(
      {},
      {
        get() {
          throw new Error('trap');
        },
      },
    ),
  ]) {
    for (const operation of [
      () => ledger.append({ binding, expectedPosition: -1, record: proposal }),
      () =>
        ledger.readback({
          binding,
          position: 0,
          transaction: proposal.transaction,
          contentDigest: proposal.contentDigest,
        }),
      () => ledger.advanceWitnessFloor(binding),
      () => ledger.snapshot(binding),
      () => ledger.verifySnapshot(binding, { position: -1, digest: '0'.repeat(64) }),
      () => ledger.injectFault(binding, 'witness-absent'),
    ]) {
      assert.doesNotThrow(operation);
      assert.equal(operation().ok, false);
    }
  }
  for (const operation of [
    () => ledger.append({ binding: validProxy, expectedPosition: -1, record: proposal }),
    () =>
      ledger.readback({
        binding: validProxy,
        position: 0,
        transaction: proposal.transaction,
        contentDigest: proposal.contentDigest,
      }),
    () => ledger.advanceWitnessFloor(validProxy),
    () => ledger.snapshot(validProxy),
    () => ledger.verifySnapshot(validProxy, { position: -1, digest: '0'.repeat(64) }),
    () => ledger.injectFault(validProxy, 'witness-absent'),
  ])
    assert.doesNotThrow(operation);
  assert.equal(validGetCount, 0);
});

test('semantic ledger: intake acknowledgement and successor cut are atomic and contention cannot create a Run', () => {
  const ledger = runtime.createScriptedLedger();
  const first = ledger.intake({
    compositionDigest: fixture.digests.compositionA,
    acknowledgementDigest: fixture.digests.acknowledgementA,
    successorCut: 'predecessor/4',
  });
  assert.equal(first.ok, true);
  assert.equal(first.value.kind, 'acknowledged');
  assert.equal(first.value.run, intakeRun(0, fixture.digests.compositionA));
  const replay = ledger.intake({
    compositionDigest: fixture.digests.compositionA,
    acknowledgementDigest: fixture.digests.acknowledgementA,
    successorCut: 'predecessor/4',
  });
  assert.deepEqual(replay, first);
  assert.deepEqual(
    ledger.intake({
      compositionDigest: fixture.digests.compositionA,
      acknowledgementDigest: fixture.digests.acknowledgementA,
      successorCut: 'predecessor/5',
    }),
    { ok: false, error: { family: 'FC-INPUT', code: 'INTAKE_REQUEST_MISMATCH' } },
  );
  const contender = ledger.intake({
    compositionDigest: fixture.digests.compositionB,
    acknowledgementDigest: fixture.digests.acknowledgementB,
    successorCut: 'predecessor/4',
  });
  assert.equal(contender.ok, true);
  assert.equal(contender.value.kind, 'rejected');
  assert.equal(contender.value.reason, 'successor-cut-already-claimed');
  assert.deepEqual(contender.value.winner, {
    position: first.value.position,
    compositionDigest: first.value.compositionDigest,
    acknowledgementDigest: first.value.acknowledgementDigest,
    successorCut: first.value.successorCut,
    run: first.value.run,
  });
  const winnerReadback = ledger.readIntake(fixture.digests.compositionA);
  assert.equal(winnerReadback.ok, true);
  assert.deepEqual(
    ledger.intake({
      compositionDigest: fixture.digests.compositionB,
      acknowledgementDigest: fixture.digests.acknowledgementB,
      successorCut: 'predecessor/4',
    }),
    contender,
  );
});

test('semantic ledger: intake crash and missing companions fail closed without repair', () => {
  const request = {
    compositionDigest: fixture.digests.compositionA,
    acknowledgementDigest: fixture.digests.acknowledgementA,
    successorCut: 'predecessor/4',
  };
  const lost = runtime.createScriptedLedger();
  assert.deepEqual(lost.intake(request, 'intake-after-flush'), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'INTAKE_ACK_LOST' },
  });
  assert.equal(lost.readIntake(request.compositionDigest).ok, false);
  const missing = runtime.createScriptedLedger();
  assert.equal(missing.intake(request, 'intake-missing-companion').ok, false);
  assert.deepEqual(missing.readIntake(request.compositionDigest), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'INTAKE_UNVERIFIABLE' },
  });
  const mismatched = runtime.createScriptedLedger();
  assert.equal(mismatched.intake(request, 'intake-mismatched-companion').ok, false);
  assert.deepEqual(mismatched.readIntake(request.compositionDigest), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'INTAKE_PAIR_MISMATCH' },
  });
  const unverifiedWinner = runtime.createScriptedLedger();
  assert.equal(unverifiedWinner.intake(request, 'intake-missing-companion').ok, false);
  assert.deepEqual(
    unverifiedWinner.intake({
      compositionDigest: fixture.digests.compositionB,
      acknowledgementDigest: fixture.digests.acknowledgementB,
      successorCut: 'predecessor/4',
    }),
    { ok: false, error: { family: 'FC-TRUST', code: 'INTAKE_PAIR_MISMATCH' } },
  );
});

test('semantic ledger fixture records semantic metadata without provider qualification', () => {
  assert.equal(fixture.sourceId, 'runtime-contracts/ledger.ts');
  assert.equal(fixture.suiteVersion, 'semantic-ledger-contract.v1');
  assert.equal(fixture.probeVersion, 'scripted-fault-plane.v2');
  assert.deepEqual(fixture.crashProbeInventory, [
    'before-append',
    'after-flush',
    'after-witness',
    'lost-ack',
    'intake-after-flush',
    'intake-missing-companion',
    'intake-mismatched-companion',
  ]);
  assert.equal(fixture.logicalControl, 'separate scripted witness state');
  assert.equal(fixture.providerQualification, 'none');
});

test('semantic ledger: preflight is a deterministic non-Run primitive and snapshots are disposable', () => {
  const ledger = runtime.createScriptedLedger();
  const initial = ledger.preflight({
    key: 'provider/a/1',
    variant: 'start',
    bytes: { request: 'proof' },
    deadline: 30,
  });
  assert.equal(initial.ok, true);
  assert.deepEqual(
    ledger.preflight({ key: 'provider/a/1', variant: 'start', bytes: { request: 'proof' }, deadline: 30 }),
    initial,
  );
  assert.equal(
    ledger.preflight({
      key: 'provider/a/1',
      variant: 'result',
      bytes: { result: 'pass' },
      predecessor: initial.value.digest,
      deadline: 30,
    }).ok,
    true,
  );
  assert.deepEqual(
    ledger.preflight({ key: 'provider/a/1', variant: 'start', bytes: { request: 'changed' }, deadline: 30 }),
    {
      ok: false,
      error: { family: 'FC-INPUT', code: 'PREFLIGHT_MISMATCH' },
    },
  );
  const [proposal] = append(ledger, 0, '0'.repeat(64));
  const snapshot = ledger.snapshot(binding);
  assert.equal(snapshot.ok, true);
  assert.deepEqual(ledger.verifySnapshot(binding, snapshot.value), { ok: true, value: true });
  assert.equal(ledger.verifySnapshot(binding, { ...snapshot.value, digest: proposal.previousDigest }).value, false);
});

test('semantic ledger: records and preflight bytes are canonical immutable snapshots', () => {
  const content = { nested: { value: 'original' } };
  const created = runtime.createLedgerRecord({
    run: fixture.run,
    generation: fixture.generation,
    transaction: `${fixture.run}/txn/1/${fixture.generation}|${fixture.generationDigest}`,
    position: 0,
    previousDigest: '0'.repeat(64),
    content,
  });
  assert.equal(created.ok, true);
  content.nested.value = 'mutated';
  assert.equal(created.value.content.nested.value, 'original');
  assert.equal(Object.isFrozen(created.value.content), true);
  assert.equal(Object.isFrozen(created.value.content.nested), true);
});

test('semantic ledger: BND-WAIT-LEDGER has a 30-second default and fails closed on exhaustion', () => {
  const ledger = runtime.createScriptedLedger();
  const proposal = record(0, '0'.repeat(64));
  assert.equal(
    ledger.append({ binding, expectedPosition: -1, record: proposal, wait: { elapsedMs: 30_001 } }).error.family,
    'FC-BOUND',
  );
  assert.equal(
    ledger.append({ binding, expectedPosition: -1, record: proposal, wait: { elapsedMs: 1, limitMs: 999 } }).error
      .family,
    'FC-INPUT',
  );
  assert.equal(
    ledger.append({ binding, expectedPosition: -1, record: proposal, wait: { elapsedMs: 1_000, limitMs: 1_000 } }).ok,
    true,
  );
});

test('semantic ledger: rejects cross-boundary, stale-head, malformed, and noncanonical proposals', () => {
  const ledger = runtime.createScriptedLedger();
  const proposal = record(0, '0'.repeat(64));
  assert.equal(
    ledger.append({ binding: { ...binding, run: 'run-other' }, expectedPosition: -1, record: proposal }).error.family,
    'FC-SUBJECT',
  );
  assert.equal(ledger.append({ binding, expectedPosition: 0, record: proposal }).ok, false);
  const normalProposal = {
    run: fixture.run,
    generation: fixture.generation,
    transaction: `${fixture.run}/txn/1/${fixture.generation}|${fixture.generationDigest}`,
    position: 0,
    previousDigest: '0'.repeat(64),
    content: { transition: 1 },
  };
  assert.equal(runtime.createLedgerRecord(normalProposal).ok, true);
  assert.deepEqual(runtime.createLedgerRecord({ ...normalProposal, position: -1 }), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_PROPOSAL' },
  });
  for (const computed of [
    { contentDigest: proposal.contentDigest },
    { event: `${fixture.run}/event/1` },
    { version: runtime.LEDGER_VERSION },
  ])
    assert.equal(runtime.createLedgerRecord({ ...normalProposal, ...computed }).error.family, 'FC-INPUT');
  assert.deepEqual(runtime.createLedgerRecord({ ...normalProposal, content: { text: 'e\u0301' } }), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_RECORD_CONTENT' },
  });
});

test('review regressions: recovery observations are private and semantic boundaries fail closed', () => {
  const ledger = runtime.createScriptedLedger();
  const [first] = append(ledger, 0, '0'.repeat(64));
  const [second] = append(ledger, 1, first.contentDigest, 'after-flush');
  const behind = ledger.readback({
    binding,
    position: 1,
    transaction: second.transaction,
    contentDigest: second.contentDigest,
  });
  assert.equal(behind.ok, false);
  assert.equal(ledger.advanceWitnessFloor({ ...binding, run: 'run-without-witness' }).ok, false);
  assert.equal(
    ledger.preflight({
      key: 'provider/result-before-start',
      variant: 'result',
      bytes: { result: 'pass' },
      predecessor: digest('a'),
      deadline: 30,
    }).ok,
    false,
  );
  assert.equal(
    runtime.createLedgerRecord({
      run: 'not-a-run',
      generation: 'not-a-generation',
      transaction: 'not-a-transaction',
      event: 'not-an-event',
      position: 0,
      previousDigest: '0'.repeat(64),
      content: {},
    }).ok,
    false,
  );
});

test('generation claims fence every stale PORT-LEDGER basis after the witnessed claim', () => {
  const ledger = runtime.createScriptedLedger();
  const [first] = append(ledger, 0, '0'.repeat(64));
  const currentGeneration = `${fixture.run}/gen/2|recovery`;
  const [claim] = append(ledger, 1, first.contentDigest, undefined, currentGeneration, {
    recovery: 'generation-claim',
    token: digest('a'),
  });
  const stale = record(2, claim.contentDigest, binding.generation);
  assert.deepEqual(ledger.append({ binding, expectedPosition: 1, record: stale }), {
    ok: false,
    error: { family: 'FC-FENCE', code: 'STALE_GENERATION' },
  });
  assert.deepEqual(
    ledger.readback({
      binding,
      position: 1,
      transaction: claim.transaction,
      contentDigest: claim.contentDigest,
    }),
    { ok: false, error: { family: 'FC-FENCE', code: 'STALE_GENERATION' } },
  );
});

test('witness-floor recovery promotes a durably flushed generation claim before stale reuse', () => {
  const ledger = runtime.createScriptedLedger();
  const [first] = append(ledger, 0, '0'.repeat(64));
  const recoveredGeneration = `${fixture.run}/gen/2|recovery`;
  const claim = record(1, first.contentDigest, recoveredGeneration, undefined, {
    recovery: 'generation-claim',
    token: digest('a'),
  });
  assert.deepEqual(
    ledger.append(
      {
        binding: { ...binding, generation: recoveredGeneration },
        expectedPosition: 0,
        record: claim,
      },
      'after-flush',
    ),
    { ok: false, error: { family: 'FC-TRUST', code: 'ACK_LOST' } },
  );
  assert.equal(ledger.advanceWitnessFloor({ ...binding, generation: recoveredGeneration }).ok, true);
  const stale = record(2, claim.contentDigest);
  assert.deepEqual(ledger.append({ binding, expectedPosition: 1, record: stale }), {
    ok: false,
    error: { family: 'FC-FENCE', code: 'STALE_GENERATION' },
  });
});
