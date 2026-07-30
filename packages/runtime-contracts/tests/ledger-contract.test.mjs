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
  transaction = `${fixture.run}/txn/${position + 1}`,
) {
  const created = runtime.createLedgerRecord({
    run: fixture.run,
    generation,
    transaction,
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
  assert.equal(behind.ok, true);
  assert.equal(behind.value.kind, 'witness-behind');
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
      predecessor: 'provider/a/1/start',
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
    transaction: `${fixture.run}/txn/1`,
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
