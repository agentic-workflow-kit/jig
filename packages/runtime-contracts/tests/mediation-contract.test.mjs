import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const kernel = await import('@agentic-workflow-kit/jig-authority-kernel');
const mediation = await import('../dist/mediation.js');
const oracle = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/mediation-contract-oracle.json'), 'utf8'),
);

const digest = (character) => character.repeat(64);

test('mediation contract: closed operation catalog maps onto exactly five private mediated port shapes', () => {
  assert.deepEqual(
    mediation.MEDIATED_PORTS,
    Object.freeze(['PORT-SESSION', 'PORT-WORKSPACE', 'PORT-VERIFY', 'PORT-DELIVERY', 'PORT-ARTIFACT']),
  );
  for (const [operationType, expected] of Object.entries(oracle.ports))
    assert.deepEqual(mediation.operationRoute(operationType), {
      ok: true,
      value: { port: expected[0], capability: expected[1], effect: expected[2] },
    });
  assert.equal(mediation.operationRoute('OPC-UNKNOWN').ok, false);
  assert.equal(
    kernel.OPERATION_TYPES.every((type) => mediation.operationRoute(type).ok),
    true,
  );
});

test('mediation contract: each mediated port shape dispatches only through its fixed scripted mechanism', () => {
  const cases = [
    ['OPC-SESSION-OPEN', 'CB-SESSION', 'PORT-SESSION'],
    ['OPC-WS-PROVISION', 'CB-WORKSPACE', 'PORT-WORKSPACE'],
    ['OPC-VERIFY-EXECUTE', 'CB-VERIFY', 'PORT-VERIFY'],
    ['OPC-REV-PUBLISH', 'CB-REVIEW-PUBLICATION', 'PORT-DELIVERY'],
    ['OPC-ART-PUT', 'CB-STORE', 'PORT-ARTIFACT'],
  ];
  for (const [type, capabilityKind, port] of cases) {
    const ordinal = cases.findIndex((entry) => entry[0] === type) + 1;
    const transaction = `run-000000000001-0123456789abcdef/txn/${ordinal}/run-000000000001-0123456789abcdef/gen/2|token|${digest(String(ordinal))}`;
    const operationId = `${transaction}/op/1`;
    const subject = {
      run: 'run-000000000001-0123456789abcdef',
      story: 'run-000000000001-0123456789abcdef/story/plan-a',
      basis: digest('b'),
    };
    const fence = {
      generation: 'run-000000000001-0123456789abcdef/gen/2|token',
      basis: digest('b'),
    };
    const authority =
      capabilityKind === 'CB-DELIVERY'
        ? {
            authority: 'target/repository-main/auth/1',
            registry: `registry/${digest('f')}`,
            basis: digest('b'),
          }
        : null;
    const permit = {
      version: kernel.OPERATION_STATE_VERSION,
      operation: operationId,
      ordinal: 1,
      type,
      subject,
      fence,
      capability: {
        kind: capabilityKind,
        port,
        operationClass: type,
        subject: subject.story,
        fence,
        resourceScope: `${port.toLowerCase()}/fixture`,
        manifest: `provider/${digest('c')}/authority/${digest('d')}`,
        digest: digest('e'),
      },
      authority,
      proof: {
        kind: 'committed-witnessed',
        position: ordinal - 1,
        event: `${subject.run}/event/${ordinal}`,
        transaction,
        recordDigest: digest(String(ordinal)),
        witnessDigest: digest(String(ordinal)),
      },
    };
    const fixture = mediation.createScriptedMediationFixture({
      dispatchPermit: () => ({ ok: true, value: permit }),
    });
    const attestation = {
      operation: operationId,
      ordinal: 1,
      mechanism: oracle.scriptedMechanisms[port],
      provider: 'fixture-only',
      subject,
      fence,
      capabilityDigest: permit.capability.digest,
      authority,
      observation: { kind: `${port.toLowerCase()}-fact`, digest: digest('a') },
      successClaim: 'observed',
    };
    const result = fixture.dispatch({ operation: operationId, ordinal: 1, attestation });
    assert.equal(result.ok, true, port);
    assert.equal(result.value.port, port);
    assert.deepEqual(
      fixture.invocations().map((entry) => entry.mechanism),
      [oracle.scriptedMechanisms[port]],
    );
  }
});

test('mediation contract: scripted fixture dispatches only an exact journal permit and exact attestation', () => {
  const permit = Object.freeze({
    version: 'jig.operation.v1',
    operation:
      'run-000000000001-0123456789abcdef/txn/1/run-000000000001-0123456789abcdef/gen/2|token|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/op/1',
    ordinal: 1,
    type: 'OPC-DEL-MERGE',
    subject: Object.freeze({
      run: 'run-000000000001-0123456789abcdef',
      story: 'run-000000000001-0123456789abcdef/story/plan-a',
      basis: digest('b'),
    }),
    fence: Object.freeze({
      generation: 'run-000000000001-0123456789abcdef/gen/2|token',
      basis: digest('b'),
    }),
    capability: Object.freeze({
      kind: 'CB-DELIVERY',
      port: 'PORT-DELIVERY',
      operationClass: 'OPC-DEL-MERGE',
      subject: 'run-000000000001-0123456789abcdef/story/plan-a',
      fence: Object.freeze({
        generation: 'run-000000000001-0123456789abcdef/gen/2|token',
        basis: digest('b'),
      }),
      resourceScope: 'repository/main',
      manifest:
        'provider/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc/authority/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      digest: digest('e'),
    }),
    authority: Object.freeze({
      authority: 'target/repository-main/auth/1',
      registry: `registry/${digest('f')}`,
      basis: digest('b'),
    }),
    proof: Object.freeze({
      kind: 'committed-witnessed',
      position: 0,
      event: 'run-000000000001-0123456789abcdef/event/1',
      transaction:
        'run-000000000001-0123456789abcdef/txn/1/run-000000000001-0123456789abcdef/gen/2|token|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      recordDigest: digest('1'),
      witnessDigest: digest('1'),
    }),
  });
  const journal = Object.freeze({
    dispatchPermit: ({ operation, ordinal }) =>
      operation === permit.operation && ordinal === permit.ordinal
        ? { ok: true, value: permit }
        : { ok: false, error: { family: 'FC-ORDERING', code: 'ATTEMPT_NOT_RECORDED' } },
  });
  const fixture = mediation.createScriptedMediationFixture(journal);
  const attestation = Object.freeze({
    operation: permit.operation,
    ordinal: 1,
    mechanism: oracle.scriptedMechanisms['PORT-DELIVERY'],
    provider: 'fixture-only',
    subject: permit.subject,
    fence: permit.fence,
    capabilityDigest: permit.capability.digest,
    authority: permit.authority,
    observation: Object.freeze({ kind: 'target-effect', digest: digest('2') }),
    successClaim: 'observed',
  });
  const dispatched = fixture.dispatch({ operation: permit.operation, ordinal: 1, attestation });
  assert.equal(dispatched.ok, true);
  assert.equal(dispatched.value.port, 'PORT-DELIVERY');
  assert.equal(fixture.invocations().length, 1);

  for (const changed of [
    { ...attestation, operation: `${permit.operation}/op/2` },
    { ...attestation, ordinal: 2 },
    { ...attestation, mechanism: 'real-provider' },
    { ...attestation, subject: { ...permit.subject, story: `${permit.subject.run}/story/other` } },
    { ...attestation, fence: { ...permit.fence, generation: `${permit.subject.run}/gen/3|other` } },
    { ...attestation, capabilityDigest: digest('9') },
    { ...attestation, authority: null },
    { ...attestation, successClaim: 'bare-success', observation: null },
  ])
    assert.equal(fixture.dispatch({ operation: permit.operation, ordinal: 1, attestation: changed }).ok, false);
  assert.equal(fixture.invocations().length, 1);
});

test('mediation contract: lost response records one possible effect and never dispatches again without reauthorization', () => {
  let allowed = true;
  const permit = {
    version: 'jig.operation.v1',
    operation:
      'run-000000000001-0123456789abcdef/txn/1/run-000000000001-0123456789abcdef/gen/2|token|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/op/1',
    ordinal: 1,
    type: 'OPC-WS-SETUP',
    subject: {
      run: 'run-000000000001-0123456789abcdef',
      story: 'run-000000000001-0123456789abcdef/story/plan-a',
      basis: digest('b'),
    },
    fence: { generation: 'run-000000000001-0123456789abcdef/gen/2|token', basis: digest('b') },
    capability: {
      kind: 'CB-WORKSPACE',
      port: 'PORT-WORKSPACE',
      operationClass: 'OPC-WS-SETUP',
      subject: 'run-000000000001-0123456789abcdef/story/plan-a',
      fence: {
        generation: 'run-000000000001-0123456789abcdef/gen/2|token',
        basis: digest('b'),
      },
      resourceScope: 'workspace/one',
      manifest:
        'provider/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc/authority/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      digest: digest('e'),
    },
    authority: null,
    proof: {
      kind: 'committed-witnessed',
      position: 0,
      event: 'run-000000000001-0123456789abcdef/event/1',
      transaction:
        'run-000000000001-0123456789abcdef/txn/1/run-000000000001-0123456789abcdef/gen/2|token|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      recordDigest: digest('1'),
      witnessDigest: digest('1'),
    },
  };
  const fixture = mediation.createScriptedMediationFixture({
    dispatchPermit: () =>
      allowed ? { ok: true, value: permit } : { ok: false, error: { family: 'FC-EFFECT', code: 'UNCERTAIN_EFFECT' } },
  });
  const attestation = {
    operation: permit.operation,
    ordinal: 1,
    mechanism: oracle.scriptedMechanisms['PORT-WORKSPACE'],
    provider: 'fixture-only',
    subject: permit.subject,
    fence: permit.fence,
    capabilityDigest: permit.capability.digest,
    authority: null,
    observation: { kind: 'workspace-effect', digest: digest('2') },
    successClaim: 'observed',
  };
  assert.deepEqual(fixture.dispatch({ operation: permit.operation, ordinal: 1, attestation, fault: 'lost-response' }), {
    ok: false,
    error: { family: 'FC-MECHANISM', code: 'RESULT_UNCERTAIN' },
  });
  allowed = false;
  assert.equal(fixture.dispatch({ operation: permit.operation, ordinal: 1, attestation }).ok, false);
  assert.equal(fixture.invocations().length, 1);
});

test('mediation contract: reconciliation lookup is a separately authorized effect-free operation', () => {
  const run = 'run-000000000001-0123456789abcdef';
  const transaction = `${run}/txn/2/${run}/gen/2|token|${digest('2')}`;
  const observationOperation = `${transaction}/op/1`;
  const subject = { run, story: `${run}/story/plan-a`, basis: digest('b') };
  const fence = { generation: `${run}/gen/2|token`, basis: digest('b') };
  const authority = {
    authority: 'target/repository-main/auth/1',
    registry: `registry/${digest('f')}`,
    basis: digest('b'),
  };
  const permit = {
    version: kernel.OPERATION_STATE_VERSION,
    operation: observationOperation,
    ordinal: 1,
    type: 'OPC-DEL-OBSERVE',
    subject,
    fence,
    capability: {
      kind: 'CB-DELIVERY',
      port: 'PORT-DELIVERY',
      operationClass: 'OPC-DEL-OBSERVE',
      subject: subject.story,
      fence,
      resourceScope: 'repository/main/lookup',
      manifest: `provider/${digest('c')}/authority/${digest('d')}`,
      digest: digest('e'),
    },
    authority,
    proof: {
      kind: 'committed-witnessed',
      position: 1,
      event: `${run}/event/2`,
      transaction,
      recordDigest: digest('2'),
      witnessDigest: digest('2'),
    },
  };
  const fixture = mediation.createScriptedMediationFixture({
    dispatchPermit: () => ({ ok: true, value: permit }),
  });
  const result = fixture.lookup({
    effectOperation: `${run}/txn/1/${run}/gen/2|token|${digest('1')}/op/1`,
    observationOperation,
    ordinal: 1,
    outcome: 'confirmed-absence',
    attestation: {
      operation: observationOperation,
      ordinal: 1,
      mechanism: oracle.scriptedMechanisms['PORT-DELIVERY'],
      provider: 'fixture-only',
      subject,
      fence,
      capabilityDigest: permit.capability.digest,
      authority,
      observation: { kind: 'effect-lookup', digest: digest('a') },
      successClaim: 'observed',
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    effectOperation: `${run}/txn/1/${run}/gen/2|token|${digest('1')}/op/1`,
    observationOperation,
    outcome: 'confirmed-absence',
    digest: digest('a'),
  });
});

test('mediation contract: no real provider, adapter, credentials, trigger, or configuration route is exposed', () => {
  assert.deepEqual(Object.keys(mediation).sort(), [
    'MEDIATED_PORTS',
    'createScriptedMediationFixture',
    'operationRoute',
  ]);
  const source = readFileSync(resolve(import.meta.dirname, '../src/mediation.ts'), 'utf8');
  for (const forbidden of [
    'process.env',
    'child_process',
    'node:net',
    'node:http',
    'node:https',
    'createProvider',
    'registerProvider',
    'configureProvider',
  ])
    assert.equal(source.includes(forbidden), false, forbidden);
  assert.equal(/\bEV-/u.test(source), false, 'provider cannot mint event types');
});
