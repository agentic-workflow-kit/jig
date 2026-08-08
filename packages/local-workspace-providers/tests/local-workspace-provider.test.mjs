import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const provider = await import('../dist/index.js');
const runtime = await import('../../runtime-contracts/dist/index.js');
const digest = (character) => character.repeat(64);
const candidate = {
  candidateCommit: execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' }).trim(),
  candidateTree: execFileSync('git', ['rev-parse', '--verify', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(),
};

const gf022ManifestBytes = new TextEncoder().encode(
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":[],"networkAuthority":[],"providerIdentity":"scripted-capability-proof-fixture/v1","runtimeAuthority":{"kind":"in-process-pure-fixture"},"scope":{"phase":2,"purpose":"semantic-admission-fixture","story":"GF-022"},"subprocessAuthority":[]}\n',
);
const gf022ManifestDigest = '53568c156d6ee898dc1ba32897d22f8abf47afa4bad86d35ffc6bcd7ce9067df';
const gf022ProviderDigest = 'c18ba0c266f04abcf220a39edd23c54599894dbf36d8d024db4b93aacb70308b';
const gf022ManifestId = `provider/${gf022ProviderDigest}/authority/${gf022ManifestDigest}`;
const admission = () => {
  const ledger = runtime.createScriptedLedger();
  const approval = {
    principal: 'principal/arye',
    manifestId: gf022ManifestId,
    manifestDigest: gf022ManifestDigest,
    scope: { phase: 2, purpose: 'semantic-admission-fixture', story: 'GF-022' },
  };
  const basis = {
    providerIdentity: 'scripted-capability-proof-fixture/v1',
    providerBuild: 'build/gf022-fixture',
    environment: 'environment/gf022-fixture',
    capability: 'capability/proof-only',
    policyMinimum: 'policy/gf022-fixture',
    manifestId: gf022ManifestId,
    manifestDigest: gf022ManifestDigest,
    scope: approval.scope,
  };
  const fixture = runtime.createProviderAdmissionFixture({ manifestBytes: gf022ManifestBytes, approval, ledger });
  const start = fixture.start({
    basis,
    ordinal: 1,
    deadline: 2_000,
    observedAt: 1_000,
    retryLimit: 2,
    predecessor: null,
  });
  assert.equal(start.ok, true);
  const proof = fixture.result({
    basis,
    ordinal: 1,
    deadline: 2_000,
    observedAt: 1_100,
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
    observedAt: 1_200,
    maxAgeMs: 86_400_000,
  };
};

test('GF-039 real local qualification uses only disposable Git-worktree roots and records the complete gate tuple', () => {
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

test('GF-039 gate remains unavailable without GF-022 admission, exact evidence, or exact environment', () => {
  const probe = provider.runLocalGitWorktreeQualificationProbe({
    ...candidate,
    admission: admission(),
    retainRoot: true,
  });
  assert.equal(probe.ok, true);
  const environment = probe.value.evidence.environment;
  assert.deepEqual(provider.createQualifiedLocalGitWorktreeProvider({ evidence: probe.value.evidence, environment }), {
    ok: false,
    error: { family: 'FC-AUTHORITY', code: 'GF022_ADMISSION_REQUIRED' },
  });
  assert.deepEqual(
    provider.createQualifiedLocalGitWorktreeProvider({
      admission: admission(),
      evidence: { ...probe.value.evidence, providerBuildDigest: digest('b') },
      environment,
    }).ok,
    false,
  );
  assert.deepEqual(
    provider.createQualifiedLocalGitWorktreeProvider({
      admission: admission(),
      evidence: probe.value.evidence,
      environment: { ...environment, os: 'win32' },
    }).ok,
    false,
  );
  assert.deepEqual(
    provider.createQualifiedLocalGitWorktreeProvider({
      admission: admission(),
      evidence: probe.value.evidence,
      environment,
    }).ok,
    true,
  );
  assert.deepEqual(provider.cleanupLocalGitWorktreeProbe(probe.value.resourceRoot), {
    ok: true,
    value: { removed: probe.value.resourceRoot },
  });
});

test('GF-039 evidence recorder and cleanup reject forged or unsafe resources', () => {
  assert.deepEqual(provider.recordLocalGitWorktreeGateEvidence(undefined), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'EVIDENCE_REQUIRED' },
  });
  assert.equal(provider.cleanupLocalGitWorktreeProbe('/').ok, false);
  assert.equal(provider.cleanupLocalGitWorktreeProbe('/Users').ok, false);
});

test('GF-039 public surface exposes one local Git provider and no generic or alternate provider mode', () => {
  for (const forbidden of [
    'createRemoteProvider',
    'createWindowsProvider',
    'createFallbackProvider',
    'runShell',
    'registerProvider',
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
