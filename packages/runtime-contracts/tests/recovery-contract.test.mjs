import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const ledgerRuntime = await import('../dist/index.js');
const recovery = await import('../dist/recovery.js');
const fixture = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/recovery-contract-oracle.json'), 'utf8'),
);
const digest = (character) => character.repeat(64).slice(0, 64);
const binding = Object.freeze({ kind: 'run', run: fixture.run, generation: fixture.priorGeneration });

function append(ledger, position, previousDigest, content, generation = fixture.priorGeneration) {
  const proposal = ledgerRuntime.createLedgerRecord({
    run: fixture.run,
    generation,
    transaction: `${fixture.run}/txn/${position + 1}/${generation}|${fixture.recoveryToken}`,
    position,
    previousDigest,
    content,
  });
  assert.equal(proposal.ok, true);
  const result = ledger.append({
    binding: { kind: 'run', run: fixture.run, generation },
    expectedPosition: position - 1,
    record: proposal.value,
  });
  assert.equal(result.ok, true);
  return result.value;
}

function fixtureChain() {
  const ledger = ledgerRuntime.createScriptedLedger();
  const first = append(ledger, 0, digest('0'), { state: 'recorded' });
  const second = append(ledger, 1, first.contentDigest, { state: 'replayed' });
  return { ledger, records: [first, second], head: { position: second.position, digest: second.contentDigest } };
}

function recover(input) {
  const { ledger: _ledger, ...chain } = fixtureChain();
  return recovery.recoverFencedRun({
    binding,
    generation: fixture.generation,
    recoveryToken: fixture.recoveryToken,
    ...chain,
    ...input,
  });
}

test('CF-RUN-CONTROL: recovery reconstructs the same position-ordered canonical view from every prefix', () => {
  const chain = fixtureChain();
  for (let length = 0; length <= chain.records.length; length += 1) {
    const records = chain.records.slice(0, length);
    const last = records.at(-1);
    const result = recover({
      records,
      head: last ? { position: last.position, digest: last.contentDigest } : { position: -1, digest: digest('0') },
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.projection.position, length - 1);
    assert.equal(result.value.pendingEffects.length, 0);
  }
});

test('CF-ORDERING: input permutations are replayed in ledger position order, never caller order', () => {
  const chain = fixtureChain();
  const ordered = recover({ records: chain.records, head: chain.head });
  const reversed = recover({ records: [...chain.records].reverse(), head: chain.head });
  assert.equal(ordered.ok, true);
  assert.equal(reversed.ok, true);
  assert.deepEqual(reversed.value.projection, ordered.value.projection);
  assert.equal(ordered.value.projection.stateDigest, fixture.expectedStateDigest);
});

test('CF-FENCE: a new generation has a conditional claim and stale or duplicate control is fenced', () => {
  const chain = fixtureChain();
  const claimed = recovery.claimRecoveryGeneration({
    ledger: chain.ledger,
    binding: { kind: 'run', run: fixture.run, generation: fixture.generation },
    generation: fixture.generation,
    recoveryToken: fixture.recoveryToken,
    expectedPosition: chain.head.position,
    previousDigest: chain.head.digest,
  });
  assert.equal(claimed.ok, true);
  assert.equal(claimed.value.generation, fixture.generation);
  assert.deepEqual(
    recovery.claimRecoveryGeneration({
      ledger: chain.ledger,
      binding: { kind: 'run', run: fixture.run, generation: fixture.generation },
      generation: fixture.generation,
      recoveryToken: fixture.recoveryToken,
      expectedPosition: chain.head.position,
      previousDigest: chain.head.digest,
    }),
    { ok: false, error: { family: 'FC-FENCE', code: 'GENERATION_CLAIM_STALE' } },
  );
});

test('FC-TRUST: chain/witness disagreements and corrupt snapshots discard acceleration and fail closed', () => {
  const chain = fixtureChain();
  const broken = recover({ records: [chain.records[0], chain.records[0]], head: chain.head });
  assert.deepEqual(broken, { ok: false, error: { family: 'FC-TRUST', code: 'BROKEN_CHAIN' } });
  const mismatch = recover({ records: chain.records, head: { position: 1, digest: digest('f') } });
  assert.deepEqual(mismatch, { ok: false, error: { family: 'FC-TRUST', code: 'WITNESS_MISMATCH' } });
  const fallback = recover({
    records: chain.records,
    head: chain.head,
    snapshot: { position: 1, digest: digest('f'), projection: { state: 'forged' } },
  });
  assert.equal(fallback.ok, true);
  assert.equal(fallback.value.snapshot, 'discarded');
  assert.equal(fallback.value.projection.state, 'replayed');
});

test('FC-INPUT and Recovery: hostile callers, unavailable reads, and lost acks cannot cause dispatch or effect retry', () => {
  const hostile = new Proxy(
    {},
    {
      get() {
        throw new Error('getter');
      },
    },
  );
  assert.doesNotThrow(() => recover({ records: hostile }));
  assert.deepEqual(recover({ records: hostile }), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_RECOVERY_INPUT' },
  });
  const unavailable = recover({ wait: { elapsedMs: 30001, limitMs: 30000 } });
  assert.deepEqual(unavailable, { ok: false, error: { family: 'FC-BOUND', code: 'BND_WAIT_LEDGER_EXHAUSTED' } });
  const chain = fixtureChain();
  const proposal = ledgerRuntime.createLedgerRecord({
    run: fixture.run,
    generation: fixture.generation,
    transaction: `${fixture.run}/txn/3/${fixture.generation}|${fixture.recoveryToken}`,
    position: 2,
    previousDigest: chain.head.digest,
    content: { recovery: 'generation-claim', token: fixture.recoveryToken },
  });
  assert.equal(proposal.ok, true);
  assert.deepEqual(
    recovery.resolveLostClaimAcknowledgement({
      ledger: chain.ledger,
      binding: { kind: 'run', run: fixture.run, generation: fixture.generation },
      record: proposal.value,
      outcome: 'indeterminate',
    }),
    { ok: false, error: { family: 'FC-TRUST', code: 'RECOVERY_REQUIRED' } },
  );
});
