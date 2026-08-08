import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const provider = await import('../dist/index.js');
const runtime = await import('../../runtime-contracts/dist/index.js');
const repeatDigest = (character) => character.repeat(64);
const canonical = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(',')}}`;
};
const digest = (domain, value) => createHash('sha256').update(canonical({ domain, value })).digest('hex');
const candidate = {
  candidateCommit: execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' }).trim(),
  candidateTree: execFileSync('git', ['rev-parse', '--verify', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(),
};

const localManifest = JSON.parse(new TextDecoder().decode(provider.LOCAL_GIT_WORKTREE_MANIFEST));
const admission = (providerBuild = 'build/local-git-worktree-qualification') => {
  const ledger = runtime.createScriptedLedger();
  const approval = {
    principal: 'principal/arye',
    manifestId: provider.LOCAL_GIT_WORKTREE_MANIFEST_ID,
    manifestDigest: provider.LOCAL_GIT_WORKTREE_MANIFEST_DIGEST,
    scope: localManifest.scope,
  };
  const basis = {
    providerIdentity: localManifest.providerIdentity,
    providerBuild,
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
      evidence: { ...probe.value.evidence, providerBuildDigest: repeatDigest('b') },
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
  assert.deepEqual(
    provider.createQualifiedLocalGitWorktreeProvider({
      admission: admission('build/local-git-worktree-qualification-replay'),
      evidence: probe.value.evidence,
      environment,
    }),
    {
      ok: false,
      error: { family: 'FC-AUTHORITY', code: 'QUALIFICATION_ADMISSION_MISMATCH' },
    },
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

test('GF-039 fresh setup receipts cannot read an external repository outside the disposable root', () => {
  const probe = provider.runLocalGitWorktreeQualificationProbe({
    ...candidate,
    admission: admission(),
    retainRoot: true,
  });
  assert.equal(probe.ok, true);
  const environment = probe.value.evidence.environment;
  const qualified = provider.createQualifiedLocalGitWorktreeProvider({
    admission: admission(),
    evidence: probe.value.evidence,
    environment,
  });
  assert.equal(qualified.ok, true);
  const externalRoot = realpathSync(mkdtempSync(join(tmpdir(), 'jig-gf039-external-')));
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: externalRoot });
    execFileSync('git', ['config', 'user.name', 'Jig Qualification Fixture'], { cwd: externalRoot });
    execFileSync('git', ['config', 'user.email', 'fixture@invalid'], { cwd: externalRoot });
    writeFileSync(join(externalRoot, 'README.md'), 'external disposable repository\n');
    execFileSync('git', ['add', 'README.md'], { cwd: externalRoot });
    execFileSync('git', ['commit', '--quiet', '-m', 'fixture'], { cwd: externalRoot });

    const root = probe.value.resourceRoot;
    const target = join(root, 'target');
    const run = 'run-000000000001-0123456789abcdef';
    const story = `${run}/story/gf039`;
    const generation = `${run}/gen/1|controller-token-1|${'a'.repeat(64)}`;
    const operation = `${run}/txn/9/${generation}/op/9`;
    const operationType = 'OPC-WS-SETUP';
    const externalHead = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
      cwd: externalRoot,
      encoding: 'utf8',
    }).trim();
    const basis = digest('WORKSPACE-BASIS', { repository: externalRoot, head: externalHead });
    const binding = {
      operation,
      operationType,
      subject: { run, story, basis },
      repository: externalRoot,
      path: target,
      basis,
      recipeDigest: digest('WORKSPACE-RECIPE', { operationType }),
      inputFingerprintDigest: digest('WORKSPACE-INPUT', { operationType }),
      host: `host/local-git-worktree/${probe.value.evidence.environmentDigest}`,
      manifest: provider.LOCAL_GIT_WORKTREE_MANIFEST_ID,
    };
    const proof = {
      kind: 'committed-witnessed',
      position: 8,
      event: `${run}/event/9`,
      transaction: `${run}/txn/9/${generation}`,
      operation,
      recordDigest: digest('WORKSPACE-INTENT', binding),
      witnessDigest: digest('WORKSPACE-INTENT', binding),
    };
    const hostFingerprint = digest('WORKSPACE-HOST', {
      host: binding.host,
      manifest: binding.manifest,
      environment,
    });
    const targetHead = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
      cwd: target,
      encoding: 'utf8',
    }).trim();
    const receipt = {
      version: 'jig.workspace-contract.v1',
      operation,
      binding,
      hostFingerprint,
      workspaceFingerprint: digest('WORKSPACE-PATH', {
        repository: externalRoot,
        path: target,
        basis,
        head: targetHead,
      }),
      recipeDigest: binding.recipeDigest,
      inputFingerprintDigest: binding.inputFingerprintDigest,
      freshnessFingerprint: digest('WORKSPACE-SETUP-FRESHNESS', {
        recipeDigest: binding.recipeDigest,
        inputFingerprintDigest: binding.inputFingerprintDigest,
        host: hostFingerprint,
      }),
      effectDigest: digest('WORKSPACE-SETUP-EFFECT', { binding, head: targetHead }),
      completed: true,
      proof,
    };
    const intent = {
      version: 'jig.workspace-contract.v1',
      operation,
      operationType,
      effect: 'effectful',
      port: 'PORT-WORKSPACE',
      capability: 'CB-WORKSPACE',
      binding,
      proof,
    };
    assert.deepEqual(qualified.value.setup({ intent, receipt }), {
      ok: false,
      error: { family: 'FC-SUBJECT', code: 'REPOSITORY_OR_PATH_INVALID' },
    });
  } finally {
    assert.deepEqual(provider.cleanupLocalGitWorktreeProbe(externalRoot), {
      ok: true,
      value: { removed: externalRoot },
    });
    assert.deepEqual(provider.cleanupLocalGitWorktreeProbe(probe.value.resourceRoot), {
      ok: true,
      value: { removed: probe.value.resourceRoot },
    });
  }
});
