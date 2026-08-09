import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const provider = await import('../dist/index.js');
const runtime = await import('../../runtime-contracts/dist/index.js');
const candidate = {
  candidateCommit: execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' }).trim(),
  candidateTree: execFileSync('git', ['rev-parse', '--verify', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(),
};

const localManifest = JSON.parse(new TextDecoder().decode(provider.LOCAL_GIT_WORKTREE_MANIFEST));
const admission = ({ startObservedAt = 1000, proofObservedAt = 1100, observedAt = 1200 } = {}) => {
  const ledger = runtime.createScriptedLedger();
  const approval = {
    principal: 'principal/arye',
    manifestId: provider.LOCAL_GIT_WORKTREE_MANIFEST_ID,
    manifestDigest: provider.LOCAL_GIT_WORKTREE_MANIFEST_DIGEST,
    scope: localManifest.scope,
  };
  const basis = {
    providerIdentity: localManifest.providerIdentity,
    providerBuild: provider.LOCAL_GIT_WORKTREE_BUILD_DIGEST,
    environment: localManifest.runtimeAuthority.environment,
    capability: 'PORT-WORKSPACE/local-git-worktree',
    policyMinimum: 'policy/local-posix-git-worktree/v1',
    manifestId: provider.LOCAL_GIT_WORKTREE_MANIFEST_ID,
    manifestDigest: provider.LOCAL_GIT_WORKTREE_MANIFEST_DIGEST,
    scope: approval.scope,
  };
  const fixture = runtime.createProviderAdmissionFixture({
    manifestBytes: provider.LOCAL_GIT_WORKTREE_MANIFEST,
    approval,
    ledger,
  });
  const start = fixture.start({
    basis,
    ordinal: 1,
    deadline: 2_000,
    observedAt: startObservedAt,
    retryLimit: 2,
    predecessor: null,
  });
  assert.equal(start.ok, true);
  const proof = fixture.result({
    basis,
    ordinal: 1,
    deadline: 2_000,
    observedAt: proofObservedAt,
    retryLimit: 2,
    predecessor: start.value.digest,
    outcome: 'positive',
  });
  assert.equal(proof.ok, true);
  return {
    kind: 'gf022-provider-admission',
    story: 'GF-022',
    principal: 'principal/arye',
    manifestId: provider.LOCAL_GIT_WORKTREE_MANIFEST_ID,
    manifestDigest: provider.LOCAL_GIT_WORKTREE_MANIFEST_DIGEST,
    proofDigest: proof.value.digest,
    ledger,
    approval,
    basis,
    proof: proof.value,
    observedAt,
    maxAgeMs: 86_400_000,
  };
};

test('GF-039 real local conformance probe uses only disposable Git-worktree roots and records the complete gate tuple', () => {
  const result = provider.runLocalGitWorktreeQualificationProbe({ ...candidate, admission: admission() });
  assert.equal(result.ok, true);
  assert.deepEqual(Object.values(result.value.observations).every(Boolean), true);
  assert.deepEqual(result.value.removedResources, [result.value.resourceRoot]);
  assert.equal(
    JSON.stringify(result.value.evidence).match(
      /(?:secret|token|password|credential|authorization|api[._ -]?key)\s*[=:]/i,
    ),
    null,
  );
  assert.equal(result.value.evidence.kind, 'CF-GATE-PROVIDER');
  assert.equal(result.value.evidence.provider, provider.LOCAL_GIT_WORKTREE_PROVIDER);
  assert.equal(result.value.evidence.manifestId, provider.LOCAL_GIT_WORKTREE_MANIFEST_ID);
  assert.equal(result.value.evidence.providerBuildDigest, provider.LOCAL_GIT_WORKTREE_BUILD_DIGEST);
  assert.equal(result.value.evidence.requestDigest.length, 64);
  assert.equal(result.value.evidence.resultDigest.length, 64);
  assert.equal(result.value.evidence.operationDigest.length, 64);
  assert.deepEqual(result.value.evidence.runner.runtime, 'node-esm');
});

test('GF-039 probe remains non-configuring in the same process and after restart', async () => {
  const probe = provider.runLocalGitWorktreeQualificationProbe({
    ...candidate,
    admission: admission(),
    retainRoot: true,
  });
  try {
    assert.equal(probe.ok, true);
    assert.equal('receipt' in probe.value, false);
    assert.equal('dispatch' in probe.value, false);
    assert.equal('providerEnabled' in probe.value, false);
    assert.equal(typeof provider.createQualifiedLocalGitWorktreeProvider, 'undefined');
    assert.equal(typeof provider.createMechanism, 'undefined');
    assert.equal(typeof provider.recordLocalGitWorktreeGateEvidence, 'undefined');
    const restartedProvider = await import('../dist/index.js?gf039-restart');
    assert.equal(typeof restartedProvider.createQualifiedLocalGitWorktreeProvider, 'undefined');
    assert.equal(typeof restartedProvider.createMechanism, 'undefined');
    assert.equal(typeof restartedProvider.recordLocalGitWorktreeGateEvidence, 'undefined');
    assert.equal(existsSync(join(probe.value.resourceRoot, '.jig-gf039-qualification-evidence.json')), false);
    assert.equal(existsSync(join(probe.value.resourceRoot, '.jig-gf039-qualification-anchor.json')), false);
  } finally {
    if (probe.ok)
      assert.deepEqual(provider.cleanupLocalGitWorktreeProbe(probe.value.resourceRoot), {
        ok: true,
        value: { removed: probe.value.resourceRoot },
      });
  }
});

test('GF-039 has no same-user durable qualification recorder and cleanup rejects unsafe resources', () => {
  assert.equal('recordLocalGitWorktreeGateEvidence' in provider, false);
  assert.equal(provider.cleanupLocalGitWorktreeProbe('/').ok, false);
  assert.equal(provider.cleanupLocalGitWorktreeProbe('/Users').ok, false);
  assert.equal(provider.cleanupLocalGitWorktreeProbe(homedir()).ok, false);
});

test('GF-039 public surface exposes one local Git provider and no generic or alternate provider mode', () => {
  for (const forbidden of [
    'createRemoteProvider',
    'createWindowsProvider',
    'createFallbackProvider',
    'runShell',
    'registerProvider',
    'createQualifiedLocalGitWorktreeProvider',
    'createMechanism',
    'recordLocalGitWorktreeGateEvidence',
  ])
    assert.equal(forbidden in provider, false, forbidden);
  const manifest = new TextDecoder().decode(provider.LOCAL_GIT_WORKTREE_MANIFEST);
  assert.equal(manifest.includes('"vcs":"git"'), true);
  assert.equal(manifest.includes('"shell":false'), true);
  assert.equal(manifest.includes('networkAuthority'), true);
  assert.equal(manifest.includes('credentialAuthority'), true);
  assert.equal(manifest.includes('win32'), false);
  assert.equal(manifest.includes('ssh'), false);
});

test('GF-039 conformance evidence cannot enable same-process provider reachability', () => {
  const probe = provider.runLocalGitWorktreeQualificationProbe({
    ...candidate,
    admission: admission(),
    retainRoot: true,
  });
  try {
    assert.equal(probe.ok, true);
    assert.equal('receipt' in probe.value, false);
    assert.equal('dispatch' in probe.value, false);
    assert.equal('providerEnabled' in probe.value, false);
    assert.equal('dispatchEnabled' in probe.value, false);
    assert.equal(typeof provider.createQualifiedLocalGitWorktreeProvider, 'undefined');
    assert.equal(typeof provider.createMechanism, 'undefined');
    assert.equal(typeof provider.recordLocalGitWorktreeGateEvidence, 'undefined');
  } finally {
    if (probe.ok)
      assert.deepEqual(provider.cleanupLocalGitWorktreeProbe(probe.value.resourceRoot), {
        ok: true,
        value: { removed: probe.value.resourceRoot },
      });
  }
});
