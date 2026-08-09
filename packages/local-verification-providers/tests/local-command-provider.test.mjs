import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { platform } from 'node:os';
import test from 'node:test';

const provider = await import('../dist/index.js');
const runtime = await import('@agentic-workflow-kit/jig-runtime-contracts');
const conformance = await import('../../conformance/dist/provider-admission-qualification.js');
const kernel = await import('@agentic-workflow-kit/jig-authority-kernel');

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const executable = '/usr/bin/true';
const executableDigest = digest(readFileSync(executable));
const manifest = provider.createLocalCommandManifest({
  executable,
  executableDigest,
  args: [],
  environmentNames: [],
});
assert.equal(manifest.ok, true);
const manifestValue = manifest.value;
const candidateCommit = execFileSync('/usr/bin/git', ['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' }).trim();
const candidateTree = execFileSync('/usr/bin/git', ['rev-parse', '--verify', 'HEAD^{tree}'], {
  encoding: 'utf8',
}).trim();
const checkoutPath = execFileSync('/usr/bin/git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const run = 'run-000000000042-0123456789abcdef';
const story = `${run}/story/local-command-verifier`;
const basis = 'a'.repeat(64);
const candidateDigest = provider.deriveLocalCommandCheckoutContentDigest(candidateTree);
assert.equal(typeof candidateDigest, 'string');
const targetBasisCommit = candidateCommit;
const targetBasisTree = candidateTree;
const targetBasisDigest = provider.deriveLocalCommandTargetBasisDigest(targetBasisCommit, targetBasisTree);
assert.equal(typeof targetBasisDigest, 'string');
const generation = `${run}/gen/2|controller-token`;
const operation = (ordinal) => `${run}/txn/${ordinal}/${generation}|${basis}/op/${ordinal}`;
const candidate = `${story}/cand/1|${candidateDigest}`;
const classSet = Object.freeze([{ name: 'test', evidenceKind: 'test-report', bindingDigest: 'f'.repeat(64) }]);
const policyDigest = runtime.deriveVerificationPolicyDigest({ posture: 'deterministic', required: classSet });
const configurationDigest = runtime.deriveVerificationConfigurationDigest({
  bindings: [{ checkClass: 'test', bindingDigest: 'f'.repeat(64) }],
});
const environmentDigest = runtime.deriveVerificationEnvironmentDigest({
  fingerprint: 'environment/local-posix',
  declaredNames: [],
});
const receiptDigest = runtime.deriveVerificationCleanReceiptDigest({
  candidateContentDigest: candidateDigest,
  targetBasisDigest,
});
assert.equal(policyDigest.ok && configurationDigest.ok && environmentDigest.ok && receiptDigest.ok, true);
const fence = Object.freeze({ generation, basis, candidateContentDigest: candidateDigest, targetBasisDigest });
const subject = Object.freeze({
  candidate,
  candidateContentDigest: candidateDigest,
  basisDigest: basis,
  checkClasses: Object.freeze(['test']),
  configurationDigest: configurationDigest.value,
  environmentDigest: environmentDigest.value,
  cleanReceiptDigest: receiptDigest.value,
});
const request = (ordinal, predecessor = null) =>
  Object.freeze({
    schema: runtime.VERIFICATION_REQUEST_SCHEMA,
    version: runtime.VERIFICATION_CONTRACT_VERSION,
    type: runtime.VERIFICATION_OPERATION,
    port: runtime.VERIFICATION_PORT,
    capability: runtime.VERIFICATION_CAPABILITY,
    operation: operation(ordinal),
    subject,
    fence,
    policy: { posture: 'deterministic', required: classSet, digest: policyDigest.value },
    configuration: {
      bindings: [{ checkClass: 'test', bindingDigest: 'f'.repeat(64) }],
      digest: configurationDigest.value,
    },
    environment: { fingerprint: 'environment/local-posix', declaredNames: [], digest: environmentDigest.value },
    cleanReceipt: {
      candidateContentDigest: candidateDigest,
      targetBasisDigest,
      receiptDigest: receiptDigest.value,
      checkout: 'read-only',
      scratch: 'discarded',
      network: 'none',
    },
    checkClass: 'test',
    lifecycle: 'Finalizing',
    retryOrdinal: ordinal,
    predecessor,
    bounds: { waitMs: 5_000, retryLimit: 2 },
  });
const permit = (ordinal, predecessor = null, manifestId = manifestValue.manifestId) => {
  const operationId = operation(ordinal);
  const capabilityWithoutDigest = {
    kind: 'CB-VERIFY',
    port: 'PORT-VERIFY',
    operationClass: 'OPC-VERIFY-EXECUTE',
    subject: story,
    fence,
    resourceScope: 'verify/local-command',
    manifest: manifestId,
  };
  const capabilityDigest = kernel.deriveOperationCapabilityDigest(capabilityWithoutDigest);
  assert.equal(capabilityDigest.ok, true);
  return {
    version: 'jig.operation.v1',
    operation: operationId,
    ordinal: 1,
    type: 'OPC-VERIFY-EXECUTE',
    subject: { run, story, basis },
    fence,
    capability: { ...capabilityWithoutDigest, digest: capabilityDigest.value },
    authority: null,
    role: 'controller',
    lifecycle: 'Finalizing',
    proof: {
      kind: 'committed-witnessed',
      position: ordinal - 1,
      event: `${run}/event/${ordinal}`,
      transaction: `${run}/txn/${ordinal}`,
      recordDigest: String(ordinal).repeat(64).slice(0, 64),
      witnessDigest: String(ordinal).repeat(64).slice(0, 64),
    },
    purpose: ordinal === 1 ? 'semantic' : 'replacement',
    predecessor,
  };
};

const admission = () => {
  const ledger = runtime.createScriptedLedger();
  const approval = {
    principal: 'principal/arye',
    manifestId: manifestValue.manifestId,
    manifestDigest: manifestValue.manifestDigest,
    scope: manifestValue.value.scope,
  };
  const basisValue = {
    providerIdentity: provider.LOCAL_COMMAND_VERIFIER_PROVIDER,
    providerBuild: provider.LOCAL_COMMAND_VERIFIER_BUILD_DIGEST,
    environment: provider.LOCAL_COMMAND_VERIFIER_ENVIRONMENT,
    capability: 'PORT-VERIFY/local-command',
    policyMinimum: 'policy/local-posix-command-verifier/v1',
    manifestId: manifestValue.manifestId,
    manifestDigest: manifestValue.manifestDigest,
    scope: manifestValue.value.scope,
  };
  const fixture = runtime.createProviderAdmissionFixture({
    manifestBytes: manifestValue.bytes,
    approval,
    ledger,
  });
  const now = Date.now();
  const start = fixture.start({
    basis: basisValue,
    ordinal: 1,
    deadline: now + 2_000,
    observedAt: now,
    retryLimit: 2,
    predecessor: null,
  });
  assert.equal(start.ok, true);
  const proof = fixture.result({
    basis: basisValue,
    ordinal: 1,
    deadline: now + 2_000,
    observedAt: now,
    retryLimit: 2,
    predecessor: start.value.digest,
    outcome: 'positive',
  });
  assert.equal(proof.ok, true);
  const certificate = conformance.qualifyLocalCommandAdmission({
    manifestBytes: manifestValue.bytes,
    approval,
    ledger,
    basis: basisValue,
    proof: proof.value,
  });
  assert.ok(certificate);
  return { certificate };
};

const checkoutResource = (requestValue, path = checkoutPath) =>
  provider.createLocalCommandCheckoutResource({
    checkoutPath: path,
    request: requestValue,
    targetBasisCommit,
    targetBasisTree,
  });

test('local command provider package is unavailable before exact qualification', () => {
  assert.deepEqual(provider.createQualifiedLocalCommandProvider(), {
    ok: false,
    error: { family: 'FC-MECHANISM', code: 'PROVIDER_UNAVAILABLE_UNQUALIFIED' },
  });
  assert.equal(
    provider.createLocalCommandManifest({ executable, executableDigest, args: ['--bad'], environmentNames: ['TOKEN'] })
      .ok,
    false,
  );
  assert.equal('createLocalCommandAdmissionTransition' in runtime, false);
});

test('manifest and native posture are exact, local, no-shell, and no-credential', () => {
  assert.equal(manifestValue.manifestId.startsWith('provider/'), true);
  assert.equal(new TextDecoder().decode(manifestValue.bytes).includes('"shell":false'), true);
  assert.equal(new TextDecoder().decode(manifestValue.bytes).includes('credentialAuthority'), true);
  assert.equal(provider.attestLocalPosixPosture({ executable, manifest: manifestValue }).ok, platform() === 'darwin');
  assert.equal(provider.attestLocalPosixPosture({ executable, manifest: manifestValue, network: 'allowed' }).ok, false);
});

test('GF-022 admission is opaque and cannot be minted by caller-shaped data', () => {
  const raw = {
    kind: 'gf022-provider-admission',
    story: 'GF-022',
    principal: 'principal/arye',
    manifestId: manifestValue.manifestId,
    manifestDigest: manifestValue.manifestDigest,
    proofDigest: 'd'.repeat(64),
    ledger: {},
    approval: {},
    basis: {},
    proof: {},
    observedAt: 1_200,
    maxAgeMs: 86_400_000,
  };
  assert.deepEqual(
    provider.runLocalCommandQualificationProbe({
      candidateCommit,
      candidateTree,
      manifest: manifestValue,
      admission: raw,
    }),
    { ok: false, error: { family: 'FC-AUTHORITY', code: 'GF022_ADMISSION_REQUIRED' } },
  );
  const cloned = { certificate: { ...admission().certificate } };
  assert.deepEqual(
    provider.runLocalCommandQualificationProbe({
      candidateCommit,
      candidateTree,
      manifest: manifestValue,
      admission: cloned,
    }),
    { ok: false, error: { family: 'FC-AUTHORITY', code: 'GF022_ADMISSION_REQUIRED' } },
  );
});

test('admission freshness is checked against the current clock at create, restore, and dispatch', () => {
  const realNow = Date.now;
  const issuedAt = realNow();
  const auth = admission();
  const proof = provider.runLocalCommandQualificationProbe({
    candidateCommit,
    candidateTree,
    manifest: manifestValue,
    admission: auth,
  });
  if (!proof.ok) return;
  try {
    Date.now = () => issuedAt - provider.LOCAL_COMMAND_VERIFIER_MAX_PROOF_AGE_MS - 1;
    assert.deepEqual(
      provider.createQualifiedLocalCommandProvider({
        manifest: manifestValue,
        admission: auth,
        qualification: proof.value,
      }),
      { ok: false, error: { family: 'FC-AUTHORITY', code: 'EXACT_QUALIFICATION_REQUIRED' } },
      'future admission is rejected at provider creation',
    );
    Date.now = () => issuedAt + provider.LOCAL_COMMAND_VERIFIER_MAX_PROOF_AGE_MS + 10_000;
    assert.deepEqual(
      provider.createQualifiedLocalCommandProvider({
        manifest: manifestValue,
        admission: auth,
        qualification: proof.value,
      }),
      { ok: false, error: { family: 'FC-AUTHORITY', code: 'EXACT_QUALIFICATION_REQUIRED' } },
      'stale admission is rejected at provider creation',
    );
  } finally {
    Date.now = realNow;
  }
  const created = provider.createQualifiedLocalCommandProvider({
    manifest: manifestValue,
    admission: auth,
    qualification: proof.value,
  });
  if (!created.ok) return;
  const req = request(1);
  assert.equal(created.value.enterFinalizing({ origin: 'Accepted', request: req }).ok, true);
  const resource = checkoutResource(req);
  assert.equal(resource.ok, true);
  try {
    Date.now = () => issuedAt + provider.LOCAL_COMMAND_VERIFIER_MAX_PROOF_AGE_MS + 10_000;
    assert.deepEqual(
      provider.restoreQualifiedLocalCommandProvider({
        manifest: manifestValue,
        admission: auth,
        qualification: proof.value,
        snapshot: created.value.snapshot(),
      }),
      { ok: false, error: { family: 'FC-AUTHORITY', code: 'EXACT_QUALIFICATION_REQUIRED' } },
      'stale admission is rejected at restore',
    );
    assert.deepEqual(
      created.value.dispatch({ checkoutResource: resource.value, request: req, permit: permit(1) }),
      { ok: false, error: { family: 'FC-AUTHORITY', code: 'GF022_ADMISSION_REQUIRED' } },
      'stale admission is rejected again at dispatch',
    );
  } finally {
    Date.now = realNow;
  }
});

test('dispatch rejects an arbitrary checkout before command execution', () => {
  const auth = admission();
  const proof = provider.runLocalCommandQualificationProbe({
    candidateCommit,
    candidateTree,
    manifest: manifestValue,
    admission: auth,
  });
  if (!proof.ok) return;
  const created = provider.createQualifiedLocalCommandProvider({
    manifest: manifestValue,
    admission: auth,
    qualification: proof.value,
  });
  assert.equal(created.ok, true, JSON.stringify(created));
  const qualified = created.value;
  assert.equal(qualified.enterFinalizing({ origin: 'Accepted', request: request(1) }).ok, true);
  assert.deepEqual(checkoutResource(request(1), '/private/tmp'), {
    ok: false,
    error: { family: 'FC-SUBJECT', code: 'CHECKOUT_NOT_REPOSITORY' },
  });
  assert.equal(qualified.invocations().length, 0);
});

test('qualified provider binds exact admission, mechanism proof, and command observation', () => {
  const auth = admission();
  const proof = provider.runLocalCommandQualificationProbe({
    candidateCommit,
    candidateTree,
    manifest: manifestValue,
    admission: auth,
  });
  assert.equal(proof.ok, platform() === 'darwin');
  if (!proof.ok) return;
  const created = provider.createQualifiedLocalCommandProvider({
    manifest: manifestValue,
    admission: auth,
    qualification: proof.value,
  });
  assert.equal(created.ok, true, JSON.stringify(created));
  const qualified = created.value;
  assert.deepEqual(qualified.reachability().status, 'qualified');
  assert.equal(qualified.enterFinalizing({ origin: 'Accepted', request: request(1) }).ok, true);
  const resource = checkoutResource(request(1));
  assert.equal(resource.ok, true, JSON.stringify(resource));
  assert.deepEqual(
    qualified.dispatch({ checkoutResource: { ...resource.value }, request: request(1), permit: permit(1) }),
    { ok: false, error: { family: 'FC-SUBJECT', code: 'CHECKOUT_RESOURCE_REQUIRED' } },
  );
  const observed = qualified.dispatch({ checkoutResource: resource.value, request: request(1), permit: permit(1) });
  assert.equal(observed.ok, true);
  assert.equal(observed.value.provider, provider.LOCAL_COMMAND_VERIFIER_PROVIDER);
  assert.equal(observed.value.effectFree, true);
  assert.equal(JSON.stringify(observed.value).includes('secret='), false);
  const consumed = qualified.consume({ observation: observed.value });
  assert.equal(consumed.value.readyForDelivery, true);
  const snapshot = qualified.snapshot();
  const restored = provider.restoreQualifiedLocalCommandProvider({
    manifest: manifestValue,
    admission: auth,
    qualification: proof.value,
    snapshot,
  });
  assert.equal(restored.ok, true);
  assert.equal(restored.value.snapshot().observations.length, 1);
  assert.deepEqual(
    restored.value.dispatch({ checkoutResource: resource.value, request: request(1), permit: permit(1) }).error,
    {
      family: 'FC-EFFECT',
      code: 'DUPLICATE_OPERATION',
    },
  );
});

test('wrong permit, stale qualification, and retry reuse fail closed without command invocation', () => {
  const auth = admission();
  const proof = provider.runLocalCommandQualificationProbe({
    candidateCommit,
    candidateTree,
    manifest: manifestValue,
    admission: auth,
  });
  if (!proof.ok) return;
  const stale = { ...proof.value, manifestDigest: '0'.repeat(64) };
  assert.deepEqual(
    provider.createQualifiedLocalCommandProvider({
      manifest: manifestValue,
      admission: auth,
      qualification: stale,
    }),
    {
      ok: false,
      error: { family: 'FC-AUTHORITY', code: 'EXACT_QUALIFICATION_REQUIRED' },
    },
  );
  assert.deepEqual(
    provider.createQualifiedLocalCommandProvider({
      manifest: manifestValue,
      admission: auth,
      qualification: { ...proof.value },
    }),
    {
      ok: false,
      error: { family: 'FC-AUTHORITY', code: 'EXACT_QUALIFICATION_REQUIRED' },
    },
  );
  const created = provider.createQualifiedLocalCommandProvider({
    manifest: manifestValue,
    admission: auth,
    qualification: proof.value,
  });
  assert.equal(created.ok, true, JSON.stringify(created));
  const qualified = created.value;
  assert.equal(qualified.enterFinalizing({ origin: 'Accepted', request: request(1) }).ok, true);
  assert.deepEqual(
    qualified.dispatch({
      checkoutResource: checkoutResource(request(1)).value,
      request: request(1),
      permit: permit(1, null, `provider/${'0'.repeat(64)}/authority/${'0'.repeat(64)}`),
    }).error,
    {
      family: 'FC-AUTHORITY',
      code: 'INVALID_DISPATCH_PERMIT',
    },
  );
  assert.equal(qualified.invocations().length, 0);
  assert.deepEqual(
    qualified.dispatch({
      checkoutResource: checkoutResource(request(1)).value,
      request: request(1),
      permit: permit(1),
      fault: 'timeout',
    }).error,
    {
      family: 'FC-MECHANISM',
      code: 'MECHANISM_TIMEOUT',
    },
  );
  assert.equal(
    qualified.dispatch({
      checkoutResource: checkoutResource(request(2)).value,
      request: request(2, operation(1)),
      permit: permit(2, operation(1)),
    }).ok,
    true,
  );
  assert.equal(
    qualified.dispatch({
      checkoutResource: checkoutResource(request(3, operation(2))).value,
      request: request(3, operation(2)),
      permit: permit(3, operation(2)),
    }).error.code,
    'RETRY_EXHAUSTED',
  );
});

test('qualification removes its disposable scratch and exposes no delivery or alternate routes', () => {
  const proof = provider.runLocalCommandQualificationProbe({
    candidateCommit,
    candidateTree,
    manifest: manifestValue,
    admission: admission(),
  });
  if (!proof.ok) return;
  assert.deepEqual(
    provider.runLocalCommandQualificationProbe({
      candidateCommit,
      candidateTree,
      manifest: manifestValue,
      admission: admission(),
      retainRoot: true,
    }),
    {
      ok: false,
      error: { family: 'FC-AUTHORITY', code: 'DISPOSABLE_SCRATCH_REQUIRED' },
    },
  );
  assert.equal(proof.value.kind, 'CF-GATE-PROVIDER');
  assert.equal(proof.value.provider, provider.LOCAL_COMMAND_VERIFIER_PROVIDER);
  assert.deepEqual(proof.value.removedResources, [proof.value.resourceRoot]);
  assert.equal(existsSync(proof.value.resourceRoot), false);
  for (const forbidden of [
    'createRemoteProvider',
    'createWindowsProvider',
    'createFallbackProvider',
    'runShell',
    'push',
    'merge',
  ])
    assert.equal(forbidden in provider, false, forbidden);
});

test('hostile manifest, posture, qualification, and snapshot inputs remain unavailable', () => {
  const auth = admission();
  assert.equal(
    provider.createLocalCommandManifest({ executable, executableDigest, args: [], environmentNames: ['SAFE_NAME'] }).ok,
    false,
  );
  assert.equal(provider.attestLocalPosixPosture({ executable: '/usr/bin/false', manifest: manifestValue }).ok, false);
  assert.deepEqual(
    provider.runLocalCommandQualificationProbe({
      candidateCommit: '1'.repeat(40),
      candidateTree,
      manifest: manifestValue,
      admission: auth,
    }),
    {
      ok: false,
      error: { family: 'FC-AUTHORITY', code: 'CANDIDATE_SUBJECT_UNBOUND' },
    },
  );
  const proof = provider.runLocalCommandQualificationProbe({
    candidateCommit,
    candidateTree,
    manifest: manifestValue,
    admission: auth,
  });
  if (!proof.ok) return;
  assert.deepEqual(
    provider.createQualifiedLocalCommandProvider({
      manifest: manifestValue,
      admission: auth,
      qualification: { ...proof.value, nativePostureDigest: '0'.repeat(64) },
    }),
    {
      ok: false,
      error: { family: 'FC-AUTHORITY', code: 'EXACT_QUALIFICATION_REQUIRED' },
    },
  );
  assert.deepEqual(
    provider.restoreQualifiedLocalCommandProvider({
      manifest: manifestValue,
      admission: auth,
      qualification: proof.value,
      snapshot: { version: 'jig.local-command-verifier.v1', observations: [], verification: {} },
    }),
    {
      ok: false,
      error: { family: 'FC-TRUST', code: 'INVALID_LOCAL_COMMAND_SNAPSHOT' },
    },
  );
});
