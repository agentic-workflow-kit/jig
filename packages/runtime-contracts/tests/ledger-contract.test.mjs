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

function record(
  position,
  previousDigest,
  generation = binding.generation,
  transaction = `${fixture.run}/txn/${position + 1}/${generation}|${fixture.generationDigest}`,
) {
  const created = runtime.createLedgerRecord({
    run: fixture.run,
    generation,
    transaction,
    event: `${fixture.run}/event/${position + 1}`,
    position,
    previousDigest,
    content: { transition: position + 1 },
  });
  assert.equal(created.ok, true);
  return created.value;
}

function append(ledger, position, previousDigest, fault, generation = binding.generation) {
  const proposal = record(position, previousDigest, generation);
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
  assert.deepEqual(result.value, proposal);
  const read = ledger.readback({
    binding,
    position: 0,
    transaction: proposal.transaction,
    contentDigest: proposal.contentDigest,
  });
  assert.deepEqual(read, { ok: true, value: { kind: 'committed', record: proposal } });
});

test('semantic ledger: readback has the fixed five outcomes and never retries uncertainty', () => {
  const ledger = runtime.createScriptedLedger();
  const [first] = append(ledger, 0, '0'.repeat(64));
  const absent = ledger.readback({
    binding,
    position: 1,
    transaction: `${fixture.run}/txn/2`,
    contentDigest: digest('e'),
  });
  assert.deepEqual(absent, { ok: true, value: { kind: 'absent', position: 1 } });
  const mismatch = ledger.readback({
    binding,
    position: 0,
    transaction: first.transaction,
    contentDigest: digest('f'),
  });
  assert.equal(mismatch.ok, true);
  assert.equal(mismatch.value.kind, 'integrity-failure');
  const competingGeneration = `${fixture.run}/gen/2|replacement`;
  const [second] = append(ledger, 1, first.contentDigest, undefined, competingGeneration);
  const competing = ledger.readback({
    binding,
    position: 1,
    transaction: second.transaction,
    contentDigest: second.contentDigest,
  });
  assert.equal(competing.ok, true);
  assert.equal(competing.value.kind, 'competing');
  const indeterminate = ledger.readback(
    { binding, position: 0, transaction: first.transaction, contentDigest: first.contentDigest },
    'indeterminate-read',
  );
  assert.deepEqual(indeterminate, { ok: false, error: { family: 'FC-TRUST', code: 'INDETERMINATE_READ' } });
});

test('semantic ledger: flush precedes a separately controlled witness floor and acknowledgement', () => {
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

test('semantic ledger: intake acknowledgement and successor cut are atomic and contention cannot create a Run', () => {
  const ledger = runtime.createScriptedLedger();
  const first = ledger.intake({
    compositionDigest: fixture.digests.compositionA,
    acknowledgementDigest: fixture.digests.acknowledgementA,
    successorCut: 'predecessor/4',
  });
  assert.equal(first.ok, true);
  assert.equal(first.value.kind, 'acknowledged');
  const replay = ledger.intake({
    compositionDigest: fixture.digests.compositionA,
    acknowledgementDigest: fixture.digests.acknowledgementA,
    successorCut: 'predecessor/4',
  });
  assert.deepEqual(replay, first);
  const contender = ledger.intake({
    compositionDigest: fixture.digests.compositionB,
    acknowledgementDigest: fixture.digests.acknowledgementB,
    successorCut: 'predecessor/4',
  });
  assert.equal(contender.ok, true);
  assert.equal(contender.value.kind, 'rejected');
  assert.equal(contender.value.successorCut, undefined);
  assert.equal(ledger.readIntake(fixture.digests.compositionA).ok, true);
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
});

test('semantic ledger fixture records semantic metadata without provider qualification', () => {
  assert.equal(fixture.sourceId, 'runtime-contracts/ledger.ts');
  assert.equal(fixture.suiteVersion, 'semantic-ledger-contract.v1');
  assert.equal(fixture.probeVersion, 'scripted-fault-plane.v1');
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
    event: `${fixture.run}/event/1`,
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
  assert.equal(ledger.append({ binding, expectedPosition: 0, record: proposal }).error.family, 'FC-SUBJECT');
  assert.equal(runtime.createLedgerRecord({ ...proposal, position: -1 }).error.family, 'FC-INPUT');
  assert.equal(runtime.createLedgerRecord({ ...proposal, content: { text: 'e\u0301' } }).error.family, 'FC-INPUT');
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
