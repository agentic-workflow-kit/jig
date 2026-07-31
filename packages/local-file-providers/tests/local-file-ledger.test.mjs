import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const runtime = await import('@agentic-workflow-kit/jig-runtime-contracts');
const codec = await import('../../codec/dist/index.js');
const publicProvider = await import('../dist/index.js');
const ledgerModule = await import('../dist/local-file-ledger.js');
const intakeModule = await import('../dist/local-file-intake.js');
const preflightModule = await import('../dist/local-file-preflight.js');
const registryModule = await import('../dist/local-file-registry.js');
const snapshotModule = await import('../dist/local-file-snapshot.js');
const pathModule = await import('../dist/path-confinement.js');
const oracle = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/local-file-ledger-oracle.json'), 'utf8'),
);

const digest = (character) => character.repeat(64);
const run = 'run-000000000001-aaaaaaaaaaaaaaaa';
const generation = `${run}/gen/1|generation`;
const binding = Object.freeze({ kind: 'run', run, generation });
const transaction = (position, suffix = 'a') => `${run}/txn/${position + 1}/${generation}|${digest(suffix)}`;
const proposal = (position, previousDigest, suffix = 'a') => {
  const created = runtime.createLedgerRecord({
    run,
    generation,
    transaction: transaction(position, suffix),
    position,
    previousDigest,
    content: { transition: position + 1 },
  });
  assert.equal(created.ok, true);
  return created.value;
};

function roots(t) {
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'jig-gf025-')));
  const primary = join(scratch, 'primary');
  const witness = join(scratch, 'witness');
  mkdirSync(primary);
  mkdirSync(witness);
  const evidence = pathModule.createSyntheticIndependentRootsForConformance(
    realpathSync(primary),
    realpathSync(witness),
  );
  assert.equal(evidence.ok, true);
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  return {
    scratch,
    primary: realpathSync(primary),
    witness: realpathSync(witness),
    independenceEvidence: evidence.value,
  };
}

test('GF-025 public catalogue pins the exact manifest and remains unavailable without the witness', () => {
  assert.equal(ledgerModule.LOCAL_FILE_LEDGER_PROVIDER_IDENTITY, oracle.providerIdentity);
  assert.equal(ledgerModule.LOCAL_FILE_LEDGER_MANIFEST_DIGEST, oracle.manifestDigest);
  assert.equal(ledgerModule.LOCAL_FILE_LEDGER_MANIFEST_ID, oracle.manifestId);
  assert.equal(ledgerModule.LOCAL_FILE_LEDGER_ROOT, oracle.primaryRoot);
  assert.equal(ledgerModule.LOCAL_FILE_WITNESS_ROOT, oracle.witnessRoot);
  assert.equal(
    createHash('sha256').update(ledgerModule.LOCAL_FILE_LEDGER_MANIFEST).digest('hex'),
    oracle.manifestDigest,
  );
  assert.deepEqual(publicProvider.createQualifiedLocalFileLedgerProvider(), {
    ok: false,
    error: { family: 'FC-MECHANISM', code: 'PROVIDER_UNAVAILABLE_WITNESS' },
  });
  for (const internal of [
    'createLocalFileRunLedgerForConformance',
    'createLocalFileRegistryForConformance',
    'createLocalFileWitness',
    'configureLocalFileLedgerProvider',
  ])
    assert.equal(internal in publicProvider, false);
});

test('path confinement rejects traversal, symlinks, witness nesting, and same-device witness roots', (t) => {
  const { primary, witness, independenceEvidence } = roots(t);
  assert.equal(pathModule.confinedPath(primary, ['..', 'escape']).ok, false);
  const outside = join(primary, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(primary, 'alias'));
  assert.equal(pathModule.ensureConfinedDirectory(primary, ['alias', 'nested']).ok, false);
  assert.deepEqual(pathModule.verifySeparateRoots(primary, outside), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'WITNESS_NOT_INDEPENDENT' },
  });
  assert.deepEqual(pathModule.verifySeparateRoots(primary, witness), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'WITNESS_NOT_INDEPENDENT' },
  });
  assert.deepEqual(pathModule.verifySeparateRoots(primary, witness, independenceEvidence), {
    ok: true,
    value: undefined,
  });
  assert.equal(pathModule.canonicalSnapshot({ text: 'e\u0301' }).ok, false);
  assert.equal(pathModule.canonicalSnapshot({ text: 'x'.repeat(4_097) }).ok, false);
  writeFileSync(join(primary, 'duplicate.json'), '{"value":1,"value":2}\n');
  assert.equal(pathModule.readJsonFile(primary, ['duplicate.json']).ok, false);
});

test('run ledger persists a witnessed chain and classifies the five readback outcomes', (t) => {
  const { primary, witness, independenceEvidence } = roots(t);
  const ledger = ledgerModule.createLocalFileRunLedgerForConformance(primary, witness, independenceEvidence);
  const first = proposal(0, digest('0'));
  assert.deepEqual(ledger.append({ binding, expectedPosition: -1, record: undefined }), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_PREPARED_RECORD' },
  });
  const committed = ledger.append({ binding, expectedPosition: -1, record: first });
  assert.equal(committed.ok, true);
  assert.equal(committed.value.event, `${run}/event/1`);
  assert.equal(
    ledger.readback({ binding, position: 0, transaction: first.transaction, contentDigest: first.contentDigest }).value
      .kind,
    'committed',
  );
  assert.deepEqual(ledger.readback({ binding, position: 1, transaction: transaction(1), contentDigest: digest('b') }), {
    ok: true,
    value: { kind: 'absent', position: 1 },
  });
  assert.deepEqual(ledger.readback({ binding, position: 1, transaction: undefined, contentDigest: digest('b') }), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_READBACK' },
  });
  assert.equal(
    ledger.readback({ binding, position: 0, transaction: transaction(0, 'b'), contentDigest: first.contentDigest })
      .value.kind,
    'competing',
  );
  assert.equal(
    ledger.readback({ binding, position: 0, transaction: first.transaction, contentDigest: digest('f') }).value.kind,
    'integrity-failure',
  );
  assert.deepEqual(
    ledger.readback(
      { binding, position: 0, transaction: first.transaction, contentDigest: first.contentDigest },
      'indeterminate-read',
    ),
    { ok: false, error: { family: 'FC-TRUST', code: 'INDETERMINATE_READ' } },
  );
  assert.deepEqual(oracle.fiveWay, ['committed', 'absent', 'competing', 'integrity-failure', 'indeterminate-read']);
});

test('flush-before-witness crash recovery and rollback detection fail closed', (t) => {
  const { primary, witness, independenceEvidence } = roots(t);
  const ledger = ledgerModule.createLocalFileRunLedgerForConformance(primary, witness, independenceEvidence);
  const first = proposal(0, digest('0'));
  assert.equal(ledger.append({ binding, expectedPosition: -1, record: first }).ok, true);
  const second = proposal(1, first.contentDigest, 'b');
  assert.deepEqual(ledger.append({ binding, expectedPosition: 0, record: second }, 'after-flush'), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'ACK_LOST' },
  });
  assert.deepEqual(
    ledger.readback({ binding, position: 1, transaction: second.transaction, contentDigest: second.contentDigest }),
    { ok: false, error: { family: 'FC-TRUST', code: 'WITNESS_BEHIND' } },
  );
  assert.equal(ledger.advanceWitnessFloor(binding).ok, true);
  const restored = ledgerModule.createLocalFileRunLedgerForConformance(primary, witness, independenceEvidence);
  assert.equal(
    restored.readback({ binding, position: 1, transaction: second.transaction, contentDigest: second.contentDigest })
      .value.kind,
    'committed',
  );
  const runKey = createHash('sha256').update(run).digest('hex');
  unlinkSync(join(primary, runKey, 'records', '000000000001.json'));
  assert.deepEqual(restored.snapshot(binding), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'WITNESS_AHEAD' },
  });
});

test('first-record recovery advances an absent witness exactly once', (t) => {
  const { primary, witness, independenceEvidence } = roots(t);
  const ledger = ledgerModule.createLocalFileRunLedgerForConformance(primary, witness, independenceEvidence);
  const first = proposal(0, digest('0'));
  assert.deepEqual(ledger.append({ binding, expectedPosition: -1, record: first }, 'after-flush'), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'ACK_LOST' },
  });
  assert.deepEqual(ledger.advanceWitnessFloor(binding), { ok: true, value: undefined });
  assert.deepEqual(ledger.advanceWitnessFloor(binding), {
    ok: false,
    error: { family: 'FC-FENCE', code: 'WITNESS_ALREADY_CURRENT' },
  });
  assert.equal(
    ledger.readback({ binding, position: 0, transaction: first.transaction, contentDigest: first.contentDigest }).value
      .kind,
    'committed',
  );
});

test('empty authoritative stores cannot bypass advanced witness state', (t) => {
  const { primary, witness, independenceEvidence } = roots(t);
  const ledger = ledgerModule.createLocalFileRunLedgerForConformance(primary, witness, independenceEvidence);
  const first = proposal(0, digest('0'));
  assert.equal(ledger.append({ binding, expectedPosition: -1, record: first }).ok, true);
  rmSync(join(primary, pathModule.resourceKey(run), 'records'), { recursive: true });
  assert.deepEqual(ledger.snapshot(binding), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'WITNESS_AHEAD' },
  });

  const intake = intakeModule.createLocalFileIntakeForConformance(primary, witness, independenceEvidence);
  assert.equal(intake.create({ compositionDigest: digest('a'), acknowledgementDigest: digest('b') }).ok, true);
  rmSync(join(primary, 'entries'), { recursive: true });
  assert.deepEqual(intake.create({ compositionDigest: digest('c'), acknowledgementDigest: digest('d') }), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'WITNESS_AHEAD' },
  });
});

test('generation recovery requires a strictly newer generation claim and retains the original wait bound', (t) => {
  const { primary, witness, independenceEvidence } = roots(t);
  const ledger = ledgerModule.createLocalFileRunLedgerForConformance(primary, witness, independenceEvidence);
  const first = proposal(0, digest('0'));
  assert.equal(ledger.append({ binding, expectedPosition: -1, record: first }).ok, true);
  const nextGeneration = `${run}/gen/2|recovery`;
  const claimed = runtime.createLedgerRecord({
    run,
    generation: nextGeneration,
    transaction: `${run}/txn/2/${nextGeneration}|${digest('c')}`,
    position: 1,
    previousDigest: first.contentDigest,
    content: { recovery: 'generation-claim', token: digest('d') },
  }).value;
  assert.equal(
    ledger.append({
      binding: { kind: 'run', run, generation: nextGeneration },
      expectedPosition: 0,
      record: claimed,
      wait: { elapsedMs: oracle.wait.defaultMs, limitMs: oracle.wait.defaultMs },
    }).ok,
    true,
  );
  assert.deepEqual(
    ledger.readback({ binding, position: 0, transaction: first.transaction, contentDigest: first.contentDigest }),
    { ok: false, error: { family: 'FC-FENCE', code: 'STALE_GENERATION' } },
  );
  assert.deepEqual(
    ledger.readback({
      binding: { kind: 'run', run, generation: nextGeneration },
      position: 2,
      transaction: `${run}/txn/3/${nextGeneration}|${digest('e')}`,
      contentDigest: digest('e'),
      wait: { elapsedMs: oracle.wait.maximumMs + 1, limitMs: oracle.wait.maximumMs },
    }),
    { ok: false, error: { family: 'FC-FENCE', code: 'BND_WAIT_LEDGER_EXHAUSTED' } },
  );
});

test('intake commits acknowledgement and successor claim in one witnessed record', (t) => {
  const { primary, witness, independenceEvidence } = roots(t);
  const intake = intakeModule.createLocalFileIntakeForConformance(primary, witness, independenceEvidence);
  const first = intake.create({
    compositionDigest: digest('a'),
    acknowledgementDigest: digest('b'),
    successorCut: 'predecessor/4',
  });
  assert.equal(first.ok, true);
  assert.equal(first.value.kind, 'acknowledged');
  assert.deepEqual(
    intake.create({
      compositionDigest: digest('a'),
      acknowledgementDigest: digest('b'),
      successorCut: 'predecessor/4',
    }),
    first,
  );
  const contender = intake.create({
    compositionDigest: digest('c'),
    acknowledgementDigest: digest('d'),
    successorCut: 'predecessor/4',
  });
  assert.equal(contender.ok, true);
  assert.equal(contender.value.kind, 'rejected');
  assert.equal(contender.value.winner.compositionDigest, digest('a'));
  assert.equal(intake.read(digest('a')).ok, true);
});

test('intake crash after durable pair flush requires witness reconciliation before read or progress', (t) => {
  const { primary, witness, independenceEvidence } = roots(t);
  const intake = intakeModule.createLocalFileIntakeForConformance(primary, witness, independenceEvidence);
  assert.deepEqual(
    intake.create(
      { compositionDigest: digest('e'), acknowledgementDigest: digest('f'), successorCut: 'predecessor/8' },
      'after-flush',
    ),
    { ok: false, error: { family: 'FC-TRUST', code: 'INTAKE_ACK_LOST' } },
  );
  assert.equal(intake.read(digest('e')).ok, false);
  assert.equal(intake.advanceWitnessFloor().ok, true);
  assert.equal(intake.read(digest('e')).ok, true);
});

test('preflight variants are immutable, predecessor-bound, and replay-safe', (t) => {
  const { primary } = roots(t);
  const store = preflightModule.createLocalFilePreflightForConformance(primary);
  const start = store.create({ key: 'proof/1', variant: 'start', bytes: { attempt: 1 }, deadline: 30_000 });
  assert.equal(start.ok, true);
  assert.deepEqual(store.create({ key: 'proof/1', variant: 'start', bytes: { attempt: 1 }, deadline: 30_000 }), start);
  assert.deepEqual(store.create({ key: 'proof/1', variant: 'start', bytes: { attempt: 1 }, deadline: 30_001 }), {
    ok: false,
    error: { family: 'FC-FENCE', code: 'PREFLIGHT_MISMATCH' },
  });
  assert.equal(
    store.create({
      key: 'proof/1',
      variant: 'result',
      bytes: { outcome: 'positive' },
      deadline: 30_000,
      predecessor: digest('f'),
    }).ok,
    false,
  );
  const result = store.create({
    key: 'proof/1',
    variant: 'result',
    bytes: { outcome: 'positive' },
    deadline: 30_000,
    predecessor: start.value.digest,
  });
  assert.equal(result.ok, true);
  assert.equal(store.read('proof/1', 'result').value.digest, result.value.digest);
  const corruptDirectory = join(primary, pathModule.resourceKey('proof/corrupt'));
  mkdirSync(corruptDirectory);
  writeFileSync(join(corruptDirectory, 'start.json'), '{not-json}\n');
  assert.deepEqual(store.read('proof/corrupt', 'start'), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'UNTRUSTED_FILE' },
  });
});

test('registry journals exact semantic records, witnesses them, and fences a second writer', (t) => {
  const { primary, witness, independenceEvidence } = roots(t);
  const store = registryModule.createLocalFileRegistryForConformance(primary, witness, independenceEvidence);
  const descriptor = digest('a');
  const registry = `registry/${descriptor}`;
  const target = 'target/repository';
  const binding = { descriptor, registry, target };
  const content = { waiter: { story: 'story/example' } };
  const staged = codec.stageDigest({
    domain: 'REGISTRY-RECORD',
    excludePaths: ['contentDigest', 'handle'],
    value: {
      version: 'jig.registry.v1',
      registry,
      target,
      expectedHeadPosition: -1,
      expectedHeadDigest: digest('0'),
      position: 0,
      previousDigest: digest('0'),
      predecessorDigest: digest('0'),
      variant: 'waiter',
      authority: null,
      waiter: null,
      content,
      contentDigest: '',
      handle: null,
    },
  });
  assert.equal(staged.ok, true);
  const record = {
    version: 'jig.registry.v1',
    registry,
    target,
    expectedHeadPosition: -1,
    expectedHeadDigest: digest('0'),
    position: 0,
    previousDigest: digest('0'),
    predecessorDigest: digest('0'),
    contentDigest: staged.value.digest,
    variant: 'waiter',
    handle: { registry, position: 0, contentDigest: staged.value.digest },
    content,
  };
  assert.equal(store.append({ binding, expectedPosition: -1, expectedDigest: digest('0'), record }).ok, true);
  assert.equal(store.readback({ binding, position: 0 }).value.kind, 'committed');
  assert.deepEqual(store.append({ binding, expectedPosition: -1, expectedDigest: digest('0'), record }), {
    ok: false,
    error: { family: 'FC-FENCE', code: 'EXPECTED_HEAD_MISMATCH' },
  });
  assert.equal(
    store.append({
      binding: { ...binding, target: 'target/other' },
      expectedPosition: -1,
      expectedDigest: digest('0'),
      record,
    }).ok,
    false,
  );
  const secondContent = { withdrawal: { story: 'story/example' } };
  const secondStaged = codec.stageDigest({
    domain: 'REGISTRY-RECORD',
    excludePaths: ['contentDigest', 'handle'],
    value: {
      version: 'jig.registry.v1',
      registry,
      target,
      expectedHeadPosition: 0,
      expectedHeadDigest: record.contentDigest,
      position: 1,
      previousDigest: record.contentDigest,
      predecessorDigest: record.contentDigest,
      variant: 'withdrawal',
      authority: null,
      waiter: null,
      content: secondContent,
      contentDigest: '',
      handle: null,
    },
  });
  assert.equal(secondStaged.ok, true);
  const second = {
    version: 'jig.registry.v1',
    registry,
    target,
    expectedHeadPosition: 0,
    expectedHeadDigest: record.contentDigest,
    position: 1,
    previousDigest: record.contentDigest,
    predecessorDigest: record.contentDigest,
    contentDigest: secondStaged.value.digest,
    variant: 'withdrawal',
    handle: { registry, position: 1, contentDigest: secondStaged.value.digest },
    content: secondContent,
  };
  const poisonedBasis = { ...second, predecessorDigest: digest('e'), contentDigest: '', handle: null };
  const poisonedDigest = codec.stageDigest({
    domain: 'REGISTRY-RECORD',
    excludePaths: ['contentDigest', 'handle'],
    value: poisonedBasis,
  });
  assert.equal(poisonedDigest.ok, true);
  const poisoned = {
    ...second,
    predecessorDigest: digest('e'),
    contentDigest: poisonedDigest.value.digest,
    handle: { registry, position: 1, contentDigest: poisonedDigest.value.digest },
  };
  assert.deepEqual(
    store.append({ binding, expectedPosition: 0, expectedDigest: record.contentDigest, record: poisoned }),
    {
      ok: false,
      error: { family: 'FC-SUBJECT', code: 'REGISTRY_RECORD_BINDING_MISMATCH' },
    },
  );
  assert.deepEqual(
    store.append({ binding, expectedPosition: 0, expectedDigest: record.contentDigest, record: second }, 'after-flush'),
    { ok: false, error: { family: 'FC-TRUST', code: 'REGISTRY_ACK_LOST' } },
  );
  const restored = registryModule.createLocalFileRegistryForConformance(primary, witness, independenceEvidence);
  assert.deepEqual(restored.readback({ binding, position: 1 }), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'REGISTRY_WITNESS_MISMATCH' },
  });
  assert.deepEqual(restored.advanceWitnessFloor(binding), { ok: true, value: undefined });
  assert.equal(restored.readback({ binding, position: 1 }).value.kind, 'committed');
  rmSync(join(primary, pathModule.resourceKey(`${registry}\0${target}`), 'records'), { recursive: true });
  assert.deepEqual(restored.snapshot(binding), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'REGISTRY_WITNESS_AHEAD' },
  });
});

test('snapshots remain disposable and verify only against the exact current head', (t) => {
  const { primary } = roots(t);
  const snapshots = snapshotModule.createLocalFileSnapshotForConformance(primary);
  const head = { position: 4, digest: digest('a') };
  const created = snapshots.write(run, head, digest('b'));
  assert.equal(created.ok, true);
  assert.deepEqual(snapshots.write(run, head, digest('c')), {
    ok: false,
    error: { family: 'FC-FENCE', code: 'SNAPSHOT_MISMATCH' },
  });
  assert.deepEqual(snapshots.verify(run, head, created.value), { ok: true, value: true });
  assert.deepEqual(snapshots.verify(run, { position: 5, digest: digest('c') }, created.value), {
    ok: true,
    value: false,
  });
});
