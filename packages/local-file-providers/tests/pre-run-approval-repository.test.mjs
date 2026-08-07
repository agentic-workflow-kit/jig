import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const runtime = await import('@agentic-workflow-kit/jig-runtime-contracts');
const provider = await import('../dist/index.js');
const roots = [];
const scope = Object.freeze({ phase: 3, purpose: 'development-only' });

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'jig-gf023-repository-'));
  roots.push(root);
  const repository = provider.createLocalPreRunApprovalRepository(root);
  const created = runtime.createPreRunApproval({
    kind: 'proposal-approved',
    principal: 'principal/arye',
    subjectDigest: 'a'.repeat(64),
    scope,
  });
  assert.equal(created.ok, true);
  return { root, repository, record: created.value };
};

test.after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

test('pre-Run approval repository is immutable, exact, and recoverable across instances', () => {
  const { root, repository, record } = fixture();
  assert.deepEqual(Object.keys(repository).sort(), ['createIfAbsent', 'read']);
  const storageAgnosticContract = { createIfAbsent: repository.createIfAbsent, read: repository.read };
  assert.equal(runtime.isPreRunApprovalRepository(storageAgnosticContract), true);
  assert.deepEqual(repository.createIfAbsent(record), { ok: true, value: record });

  const reopened = provider.createLocalPreRunApprovalRepository(root);
  assert.deepEqual(reopened.read(record.key), { ok: true, value: record });
  assert.deepEqual(reopened.createIfAbsent(structuredClone(record)), { ok: true, value: record });
  assert.equal(readFileSync(join(root, `${record.key}.approval`)).byteLength > 0, true);
});

test('pre-Run approval repository rejects conflicting replay and integrity loss without replacement', () => {
  const { repository, record } = fixture();
  assert.equal(repository.createIfAbsent(record).ok, true);
  assert.deepEqual(repository.createIfAbsent({ ...record, approvalDigest: 'b'.repeat(64) }), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'APPROVAL_CONFLICTING_REPLAY' },
  });

  const corruptRoot = mkdtempSync(join(tmpdir(), 'jig-gf023-corrupt-'));
  roots.push(corruptRoot);
  const corrupt = provider.createLocalPreRunApprovalRepository(corruptRoot);
  writeFileSync(join(corruptRoot, `${record.key}.approval`), Buffer.from('not-canonical'));
  assert.deepEqual(corrupt.read(record.key), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'APPROVAL_INTEGRITY_MISMATCH' },
  });
});

test('approval records reject wrong principal, kind substitution, malformed scope, and symlink references', () => {
  const { root, repository, record } = fixture();
  assert.equal(repository.createIfAbsent({ ...record, principal: 'principal/other' }).ok, false);
  assert.equal(repository.createIfAbsent({ ...record, kind: 'provider-manifest-approved' }).ok, false);
  assert.equal(repository.createIfAbsent({ ...record, scope: { phase: 2, purpose: 'development-only' } }).ok, false);
  assert.deepEqual(repository.read('not-a-digest'), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_APPROVAL_RECORD' },
  });

  const symlinkRoot = mkdtempSync(join(tmpdir(), 'jig-gf023-symlink-'));
  roots.push(symlinkRoot);
  symlinkSync(join(root, `${record.key}.approval`), join(symlinkRoot, `${record.key}.approval`));
  assert.deepEqual(provider.createLocalPreRunApprovalRepository(symlinkRoot).read(record.key), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'APPROVAL_INTEGRITY_MISMATCH' },
  });
});
