import assert from 'node:assert/strict';
import test from 'node:test';

const runtime = await import('../dist/index.js');
const kernel = await import('@agentic-workflow-kit/jig-authority-kernel');

const d = (character) => character.repeat(64);
const run = 'run-000000000042-0123456789abcdef';
const story = `${run}/story/verification-semantics`;
const basis = d('a');
const candidateDigest = d('b');
const targetBasisDigest = d('c');
const generation = `${run}/gen/2|controller-token`;
const candidate = `${story}/cand/1|${candidateDigest}`;
const manifest = `provider/${d('d')}/authority/${d('e')}`;
const tx = (position) => `${run}/txn/${position}/${generation}|${basis}`;
const operation = (position) => `${tx(position)}/op/1`;

const classSet = Object.freeze([{ name: 'test', evidenceKind: 'test-report', bindingDigest: d('f') }]);
const policyDigest = runtime.deriveVerificationPolicyDigest({ posture: 'deterministic', required: classSet });
const configurationDigest = runtime.deriveVerificationConfigurationDigest({
  bindings: [{ checkClass: 'test', bindingDigest: d('f') }],
});
const environmentDigest = runtime.deriveVerificationEnvironmentDigest({
  fingerprint: 'environment/fixture',
  declaredNames: [],
});
const receiptDigest = runtime.deriveVerificationCleanReceiptDigest({
  candidateContentDigest: candidateDigest,
  targetBasisDigest,
});
assert.equal(policyDigest.ok && configurationDigest.ok && environmentDigest.ok && receiptDigest.ok, true);

const policy = Object.freeze({ posture: 'deterministic', required: classSet, digest: policyDigest.value });
const configuration = Object.freeze({
  bindings: Object.freeze([{ checkClass: 'test', bindingDigest: d('f') }]),
  digest: configurationDigest.value,
});
const environment = Object.freeze({
  fingerprint: 'environment/fixture',
  declaredNames: Object.freeze([]),
  digest: environmentDigest.value,
});
const cleanReceipt = Object.freeze({
  candidateContentDigest: candidateDigest,
  targetBasisDigest,
  receiptDigest: receiptDigest.value,
  checkout: 'read-only',
  scratch: 'discarded',
  network: 'none',
});
const subject = Object.freeze({
  candidate,
  candidateContentDigest: candidateDigest,
  basisDigest: basis,
  checkClasses: Object.freeze(['test']),
  configurationDigest: configuration.digest,
  environmentDigest: environment.digest,
  cleanReceiptDigest: cleanReceipt.receiptDigest,
});
const fence = Object.freeze({ generation, basis, candidateContentDigest: candidateDigest, targetBasisDigest });

const request = (position, overrides = {}) =>
  Object.freeze({
    schema: runtime.VERIFICATION_REQUEST_SCHEMA,
    version: runtime.VERIFICATION_CONTRACT_VERSION,
    type: runtime.VERIFICATION_OPERATION,
    port: runtime.VERIFICATION_PORT,
    capability: runtime.VERIFICATION_CAPABILITY,
    operation: operation(position),
    subject,
    fence,
    policy,
    configuration,
    environment,
    cleanReceipt,
    checkClass: 'test',
    lifecycle: 'Finalizing',
    retryOrdinal: position,
    predecessor: null,
    bounds: { waitMs: 5_000, retryLimit: 2 },
    ...overrides,
  });

const permit = (position, overrides = {}) => {
  const operationId = operation(position);
  const capabilityWithoutDigest = {
    kind: 'CB-VERIFY',
    port: 'PORT-VERIFY',
    operationClass: 'OPC-VERIFY-EXECUTE',
    subject: story,
    fence,
    resourceScope: 'verify/fixture',
    manifest,
  };
  const capabilityDigest = kernel.deriveOperationCapabilityDigest(capabilityWithoutDigest);
  assert.equal(capabilityDigest.ok, true);
  return Object.freeze({
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
      position: position - 1,
      event: `${run}/event/${position}`,
      transaction: tx(position),
      recordDigest: d(String(position)),
      witnessDigest: d(String(position)),
    },
    purpose: position === 1 ? 'semantic' : 'replacement',
    predecessor: null,
    ...overrides,
  });
};

const attestation = (requestValue, overrides = {}) => ({
  schema: runtime.VERIFICATION_OBSERVATION_SCHEMA,
  version: runtime.VERIFICATION_CONTRACT_VERSION,
  kind: 'EV-CHECK-OBSERVATION',
  mechanism: runtime.VERIFICATION_MECHANISM,
  provider: 'fixture-only',
  operation: requestValue.operation,
  subject: requestValue.subject,
  fence: requestValue.fence,
  checkClass: 'test',
  outcome: 'pass',
  evidenceKind: 'test-report',
  evidenceDigest: d('9'),
  artifactDigests: [],
  environmentDigest: requestValue.environment.digest,
  cleanReceiptDigest: requestValue.cleanReceipt.receiptDigest,
  effectFree: true,
  observedAt: 42,
  ...overrides,
});

const makeAuthorizer = (permits) => ({
  recordDispatch(input) {
    const value = permits.find((entry) => entry.operation === input.operation);
    return value ? { ok: true, value } : { ok: false, error: { family: 'FC-AUTHORITY', code: 'NOT_AUTHORIZED' } };
  },
});

test('GF-042 request and observation bind exact Candidate, basis, class, configuration, environment, receipt, Operation, and fence', () => {
  const valid = request(1);
  assert.equal(runtime.validateVerificationRequest(valid).ok, true);
  assert.equal(runtime.validateVerificationObservation(attestation(valid), valid).ok, true);
  for (const changed of [
    { ...valid, subject: { ...valid.subject, candidateContentDigest: d('z') } },
    { ...valid, subject: { ...valid.subject, basisDigest: d('z') } },
    { ...valid, subject: { ...valid.subject, configurationDigest: d('z') } },
    { ...valid, subject: { ...valid.subject, environmentDigest: d('z') } },
    { ...valid, subject: { ...valid.subject, cleanReceiptDigest: d('z') } },
    { ...valid, checkClass: 'build' },
  ])
    assert.equal(runtime.validateVerificationRequest(changed).ok, false);
  const emptyConfigurationDigest = runtime.deriveVerificationConfigurationDigest({ bindings: [] });
  assert.equal(emptyConfigurationDigest.ok, true);
  assert.equal(
    runtime.validateVerificationRequest({
      ...valid,
      configuration: { bindings: [], digest: emptyConfigurationDigest.value },
      subject: { ...valid.subject, configurationDigest: emptyConfigurationDigest.value },
    }).ok,
    false,
  );
  assert.equal(Object.isFrozen(runtime.validateVerificationRequest(valid).value), true);
});

test('CF-MECH-VERIFY: scripted verification accepts only effect-free exact attestations and exposes no provider configuration', () => {
  const valid = request(1);
  const fixture = runtime.createScriptedVerificationFixture(makeAuthorizer([permit(1)]));
  assert.deepEqual(fixture.dispatch({ request: valid, attestation: attestation(valid) }).error, {
    family: 'FC-AUTHORITY',
    code: 'INVALID_FINALIZATION_STATE',
  });
  assert.equal(fixture.enterFinalizing({ origin: 'Accepted', request: valid }).ok, true);
  assert.deepEqual(fixture.reachability(), {
    status: 'unavailable',
    providerEnabled: false,
    configurationEnabled: false,
    externalEffects: false,
  });
  assert.equal(fixture.dispatch({ request: valid, attestation: attestation(valid, { effectFree: false }) }).ok, false);
  assert.equal(fixture.invocations().length, 0);
  assert.equal(
    fixture.dispatch({ request: valid, attestation: attestation(valid, { cleanReceiptDigest: d('z') }) }).ok,
    false,
  );
  assert.equal(fixture.invocations().length, 0);
  assert.equal(fixture.dispatch({ request: valid, attestation: attestation(valid) }).ok, true);
  assert.equal(fixture.invocations()[0].effect, 'observation');
  assert.equal(fixture.dispatch({ request: valid, attestation: attestation(valid) }).error.code, 'DUPLICATE_OPERATION');
});

test('BND-WAIT-MECHANISM/BND-RETRY: loss is durable and replacement uses a new authorized ID-OP before observation adoption', () => {
  const first = request(1);
  const second = request(2, { operation: operation(2), retryOrdinal: 2, predecessor: first.operation });
  const fixture = runtime.createScriptedVerificationFixture(
    makeAuthorizer([permit(1), permit(2, { predecessor: first.operation })]),
  );
  assert.equal(fixture.enterFinalizing({ origin: 'Accepted', request: first }).ok, true);
  assert.equal(
    fixture.dispatch({
      request: { ...second, retryOrdinal: 2, predecessor: null },
      attestation: attestation(second),
    }).error.code,
    'REPLACEMENT_LINEAGE_REQUIRED',
  );
  assert.deepEqual(fixture.dispatch({ request: first, attestation: attestation(first), fault: 'lost-response' }), {
    ok: false,
    error: { family: 'FC-MECHANISM', code: 'RESULT_UNCERTAIN' },
  });
  assert.equal(fixture.failures()[0].supersededBy, null);
  const unauthorized = runtime.createScriptedVerificationFixture(makeAuthorizer([permit(1)]));
  assert.equal(unauthorized.enterFinalizing({ origin: 'Accepted', request: first }).ok, true);
  assert.equal(unauthorized.dispatch({ request: first, attestation: attestation(first), fault: 'timeout' }).ok, false);
  assert.equal(
    unauthorized.dispatch({ request: second, attestation: attestation(second) }).error.code,
    'INVALID_DISPATCH_PERMIT',
  );
  assert.equal(unauthorized.failures()[0].supersededBy, null);
  const forgedReady = structuredClone(fixture.snapshot());
  forgedReady.finalization.readyForDelivery = true;
  assert.equal(runtime.restoreScriptedVerificationFixture(forgedReady, makeAuthorizer([permit(1)])).ok, false);
  const recovered = runtime.restoreScriptedVerificationFixture(
    fixture.snapshot(),
    makeAuthorizer([permit(1), permit(2, { predecessor: first.operation })]),
  );
  assert.equal(recovered.ok, true);
  assert.equal(recovered.value.enterFinalizing({ origin: 'Accepted', request: first }).ok, true);
  assert.equal(recovered.value.dispatch({ request: second, attestation: attestation(second) }).ok, true);
  assert.equal(recovered.value.failures()[0].supersededBy, second.operation);
  const forgedLineage = structuredClone(recovered.value.snapshot());
  forgedLineage.failures[0].supersededBy = null;
  assert.equal(
    runtime.restoreScriptedVerificationFixture(forgedLineage, makeAuthorizer([permit(1), permit(2)])).ok,
    false,
  );
  assert.deepEqual(
    recovered.value.invocations().map((entry) => entry.operation),
    [first.operation, second.operation],
  );
  const exhausted = runtime.createScriptedVerificationFixture(
    makeAuthorizer([permit(1), permit(2, { predecessor: first.operation })]),
  );
  assert.equal(exhausted.enterFinalizing({ origin: 'Accepted', request: first }).ok, true);
  assert.equal(exhausted.dispatch({ request: first, attestation: attestation(first), fault: 'timeout' }).ok, false);
  assert.equal(
    exhausted.dispatch({
      request: { ...second, retryOrdinal: 3, operation: operation(3), predecessor: second.operation },
      attestation: attestation(second),
    }).error.code,
    'RETRY_EXHAUSTED',
  );
});

test('RP-VERIFY: deterministic pass/fail and explicit none are distinct inside the scripted Accepted/Finalizing fixture', () => {
  const finalizing = request(1);
  const fixture = runtime.createScriptedVerificationFixture(makeAuthorizer([permit(1)]));
  assert.equal(fixture.enterFinalizing({ origin: 'Accepted', request: finalizing }).value.state, 'Finalizing');
  const passing = fixture.dispatch({ request: finalizing, attestation: attestation(finalizing) });
  assert.equal(passing.ok, true);
  assert.equal(fixture.consume({ observation: passing.value }).value.readyForDelivery, true);
  assert.deepEqual(fixture.consume({ observation: passing.value }).error, {
    family: 'FC-ORDERING',
    code: 'CHECK_CLASS_ALREADY_OBSERVED',
  });
  const failingFixture = runtime.createScriptedVerificationFixture(makeAuthorizer([permit(1)]));
  assert.equal(failingFixture.enterFinalizing({ origin: 'Waiting', request: finalizing }).ok, true);
  const failed = failingFixture.dispatch({
    request: finalizing,
    attestation: attestation(finalizing, { outcome: 'fail' }),
  });
  assert.equal(failingFixture.consume({ observation: failed.value }).value.state, 'Reworking');
  const nonePolicyDigest = runtime.deriveVerificationPolicyDigest({ posture: 'none', required: classSet });
  const noneRequest = { ...finalizing, policy: { ...policy, posture: 'none', digest: nonePolicyDigest.value } };
  const noneFixture = runtime.createScriptedVerificationFixture(makeAuthorizer([]));
  const noOp = noneFixture.enterFinalizing({ origin: 'Accepted', request: noneRequest });
  assert.equal(noOp.ok, true);
  assert.equal(noOp.value.noOp, true);
  assert.equal(noOp.value.readyForDelivery, true);
  assert.deepEqual(noOp.value.deliveryOperations, []);
  assert.equal(noneFixture.invocations().length, 0);
  assert.equal(
    noneFixture.dispatch({ request: noneRequest, attestation: attestation(noneRequest) }).error.code,
    'VERIFICATION_NOT_DISPATCHABLE',
  );
  assert.equal(noOp.value.acceptanceGranted, false);
  assert.equal(noOp.value.landingGranted, false);

  const emptyPolicyDigest = runtime.deriveVerificationPolicyDigest({ posture: 'none', required: [] });
  const emptyConfigurationDigest = runtime.deriveVerificationConfigurationDigest({ bindings: [] });
  const emptyRequest = {
    ...noneRequest,
    policy: { posture: 'none', required: [], digest: emptyPolicyDigest.value },
    configuration: { bindings: [], digest: emptyConfigurationDigest.value },
    subject: { ...noneRequest.subject, checkClasses: [], configurationDigest: emptyConfigurationDigest.value },
    checkClass: null,
  };
  const emptyNoOp = runtime
    .createScriptedVerificationFixture(makeAuthorizer([]))
    .enterFinalizing({ origin: 'Accepted', request: emptyRequest });
  assert.equal(emptyNoOp.ok, true);
  assert.deepEqual(emptyNoOp.value.requiredClasses, []);
  assert.equal(emptyNoOp.value.noOp, true);
  const restoredNone = runtime.restoreScriptedVerificationFixture(noneFixture.snapshot(), makeAuthorizer([]));
  assert.equal(restoredNone.ok, true);
  assert.equal(restoredNone.value.snapshot().finalization?.noOp, true);
});

test('GF-042 fixture rejects capability substitution and preserves the no-provider boundary', () => {
  const valid = request(1);
  const wrongPermit = permit(1, {
    capability: {
      ...permit(1).capability,
      kind: 'CB-WORKSPACE',
      port: 'PORT-WORKSPACE',
      operationClass: 'OPC-WS-OBSERVE',
    },
  });
  const fixture = runtime.createScriptedVerificationFixture(makeAuthorizer([wrongPermit]));
  assert.equal(fixture.enterFinalizing({ origin: 'Accepted', request: valid }).ok, true);
  assert.deepEqual(fixture.dispatch({ request: valid, attestation: attestation(valid) }).error, {
    family: 'FC-AUTHORITY',
    code: 'INVALID_DISPATCH_PERMIT',
  });
  assert.equal(fixture.snapshot().observations.length, 0);
  assert.deepEqual(fixture.snapshot().finalization?.observations, []);
});
