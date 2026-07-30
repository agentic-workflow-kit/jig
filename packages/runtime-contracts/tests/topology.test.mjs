import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const fixture = JSON.parse(readFileSync(resolve(import.meta.dirname, './fixtures/runtime-topology.json'), 'utf8'));
const fakeFixture = JSON.parse(readFileSync(resolve(import.meta.dirname, './fixtures/runtime-fakes.json'), 'utf8'));
const runtime = await import('../dist/index.js');
const codec = await import('@agentic-workflow-kit/jig-codec');

function encodedCrossing(crossing) {
  const encoded = runtime.encodeTopologyCrossing(crossing);
  assert.equal(encoded.ok, true);
  return encoded.value;
}

test('runtime topology: fixed topology has exactly six units and eleven semantic ports', () => {
  assert.equal(runtime.TOPOLOGY_VERSION, fixture.topologyVersion);
  assert.equal(runtime.CODEC_VERSION, fixture.codecVersion);
  assert.deepEqual(runtime.RUNTIME_UNITS, fixture.units);
  assert.deepEqual(runtime.SEMANTIC_PORTS, fixture.ports);
  assert.equal(runtime.TOPOLOGY.units.length, 6);
  assert.equal(runtime.TOPOLOGY.ports.length, 11);
  assert.deepEqual(runtime.ALLOWED_CROSSINGS, fixture.allowedCrossings);
});

test('runtime topology: authority catalogs and validator results reject mutation', () => {
  assert.equal(Object.isFrozen(runtime.TOPOLOGY), true);
  assert.equal(Object.isFrozen(runtime.TOPOLOGY.ports), true);
  assert.equal(Object.isFrozen(runtime.TOPOLOGY.ports[0]), true);
  assert.equal(Object.isFrozen(runtime.ALLOWED_CROSSINGS), true);
  assert.equal(Object.isFrozen(runtime.ALLOWED_CROSSINGS[0]), true);
  assert.throws(() => {
    runtime.TOPOLOGY.ports[0].owner = 'RT-CONTROLLER';
  }, TypeError);
  assert.throws(() => {
    runtime.ALLOWED_CROSSINGS[0].target = 'RT-LEDGER';
  }, TypeError);

  const result = runtime.validateTopologyCrossing(encodedCrossing(fixture.allowedCrossings[0]));
  assert.equal(result.ok, true);
  assert.notStrictEqual(result.value, runtime.ALLOWED_CROSSINGS[0]);
  assert.equal(Object.isFrozen(result.value), true);
  assert.throws(() => {
    result.value.target = 'RT-LEDGER';
  }, TypeError);
  assert.equal(
    runtime.validateTopologyCrossing(encodedCrossing({ ...fixture.allowedCrossings[0], target: 'RT-LEDGER' })).ok,
    false,
  );
});

test('runtime topology: source is builder-owned and cannot cross to the controller', () => {
  const source = runtime.TOPOLOGY.ports.find((port) => port.id === 'PORT-SOURCE');
  assert.deepEqual(source, {
    id: 'PORT-SOURCE',
    owner: 'X-ENVELOPE',
    direction: 'external-builder-to-source',
    controllerReachable: false,
  });
  assert.equal(
    runtime.validateTopologyCrossing(encodedCrossing({ ...fixture.allowedCrossings.at(-1), target: 'RT-CONTROLLER' }))
      .ok,
    false,
  );
});

test('runtime topology: unknown and forbidden authority crossings fail closed', () => {
  for (const edge of fixture.deniedEdges) {
    const result = runtime.validateDeniedEdge(edge);
    assert.deepEqual(result, { ok: false, error: { family: 'FC-AUTHORITY', code: 'DENIED_EDGE', edge } });
  }
  assert.deepEqual(runtime.validateCrossing('PORT-NOT-DECLARED', 'RT-OPERATOR'), {
    ok: false,
    error: { family: 'FC-AUTHORITY', code: 'UNKNOWN_PORT', port: 'PORT-NOT-DECLARED' },
  });
});

test('runtime topology: every fixed crossing passes and every field mutation fails closed', () => {
  for (const crossing of fixture.allowedCrossings) {
    assert.equal(runtime.validateTopologyCrossing(encodedCrossing(crossing)).ok, true);
    for (const field of [
      'port',
      'source',
      'target',
      'owner',
      'direction',
      'capability',
      'lifecycleAuthority',
      'readOnly',
    ]) {
      const mutated = {
        ...crossing,
        [field]: field === 'lifecycleAuthority' || field === 'readOnly' ? !crossing[field] : `MUTATED-${field}`,
      };
      assert.deepEqual(runtime.validateTopologyCrossing(encodedCrossing(mutated)).error?.family, 'FC-AUTHORITY');
    }
  }
  for (const probe of [
    { ...fixture.allowedCrossings[12], capability: 'generic-ledger-write' },
    { ...fixture.allowedCrossings[12], lifecycleAuthority: true },
    { ...fixture.allowedCrossings[0], target: 'RT-LEDGER' },
    { ...fixture.allowedCrossings[18], target: 'RT-WITNESS' },
  ])
    assert.equal(runtime.validateTopologyCrossing(encodedCrossing(probe)).ok, false);
});

test('runtime topology: topology crossing accepts only primitive canonical encodings', () => {
  const allowed = fixture.allowedCrossings[12];
  const canonical = encodedCrossing(allowed);
  assert.equal(runtime.validateTopologyCrossing(canonical).ok, true);

  const reordered = Object.fromEntries(Object.entries(allowed).reverse());
  assert.equal(encodedCrossing(reordered), canonical);

  const malicious = {
    ...allowed,
    source: 'RT-OPERATOR',
    port: 'PORT-SESSION',
    target: 'RT-LEDGER',
    capability: 'generic-lifecycle-write',
    lifecycleAuthority: true,
    toJSON: () => {
      throw new Error('must not invoke toJSON');
    },
  };
  assert.equal(runtime.validateTopologyCrossing(malicious).ok, false);
  const encoded = codec.encodeFrame({ test: 'spoof' });
  assert.equal(encoded.ok, true);
  assert.equal(runtime.createScriptedFake('PORT-SESSION').invoke(encoded.value, malicious).ok, false);
  assert.equal(runtime.validateTopologyCrossing({ ...allowed, extra: 'reject' }).ok, false);
  assert.equal(runtime.validateTopologyCrossing({ ...allowed, [Symbol('extra')]: 'reject' }).ok, false);

  let getterCalled = false;
  const accessor = {};
  for (const [key, value] of Object.entries(allowed))
    if (key !== 'capability') Object.defineProperty(accessor, key, { enumerable: true, value });
  Object.defineProperty(accessor, 'capability', {
    enumerable: true,
    get: () => {
      getterCalled = true;
      return allowed.capability;
    },
  });
  assert.equal(runtime.validateTopologyCrossing(accessor).ok, false);
  assert.equal(getterCalled, false);

  const traps = { ownKeys: 0, get: 0, getOwnPropertyDescriptor: 0, getPrototypeOf: 0 };
  const proxy = new Proxy(
    {},
    {
      ownKeys: () => {
        traps.ownKeys += 1;
        return Object.keys(allowed);
      },
      get: (_target, key) => {
        traps.get += 1;
        return allowed[key];
      },
      getOwnPropertyDescriptor: (_target, key) => {
        traps.getOwnPropertyDescriptor += 1;
        return Object.hasOwn(allowed, key)
          ? { configurable: true, enumerable: true, value: allowed[key], writable: true }
          : undefined;
      },
      getPrototypeOf: () => {
        traps.getPrototypeOf += 1;
        return Object.prototype;
      },
    },
  );
  assert.equal(runtime.validateTopologyCrossing(proxy).ok, false);
  assert.equal(runtime.createScriptedFake('PORT-SESSION').invoke(encoded.value, proxy).ok, false);
  assert.deepEqual(traps, { ownKeys: 0, get: 0, getOwnPropertyDescriptor: 0, getPrototypeOf: 0 });

  for (const value of [undefined, null, true, 1, 1n, Symbol('crossing'), () => canonical, new Uint8Array()])
    assert.equal(runtime.validateTopologyCrossing(value).ok, false);

  const decoded = codec.decodeFrame(new TextEncoder().encode(canonical));
  assert.equal(decoded.ok, true);
  const tamperedPayload = { ...decoded.value.payload, target: 'RT-LEDGER' };
  const tampered = codec.encodeFrame(tamperedPayload);
  assert.equal(tampered.ok, true);
  assert.equal(runtime.validateTopologyCrossing(new TextDecoder().decode(tampered.value)).ok, false);
  const unknownVersion = canonical.replace('jig.codec.v1', 'jig.codec.v9');
  const noncanonical = canonical.replace('{"payload"', '{ "payload"');
  const malformed = '{';
  const extraField = codec.encodeFrame({ ...decoded.value.payload, extra: 'reject' });
  assert.equal(extraField.ok, true);
  for (const value of [unknownVersion, noncanonical, malformed, new TextDecoder().decode(extraField.value)])
    assert.equal(runtime.validateTopologyCrossing(value).ok, false);
});

test('runtime topology: scripted fakes accept only canonical codec frames', () => {
  assert.equal(fakeFixture.fixtureVersion, 'runtime-topology-fakes.v1');
  for (const port of fakeFixture.ports) {
    const fake = runtime.createScriptedFake(port);
    const encoded = codec.encodeFrame({ fixture: fakeFixture.fixtureVersion, port });
    assert.equal(encoded.ok, true);
    const crossing = fixture.allowedCrossings.find((entry) => entry.port === port && entry.source === 'RT-CONTROLLER');
    const serialized = encodedCrossing(crossing);
    assert.deepEqual(fake.invoke(encoded.value, serialized).ok, true);
    assert.deepEqual(fake.invoke(new Uint8Array([0x7b]), serialized).error, {
      family: 'FC-AUTHORITY',
      code: 'MALFORMED_FRAME',
    });
    assert.equal(fake.invoke(encoded.value, encodedCrossing({ ...crossing, target: 'RT-LEDGER' })).ok, false);
  }
});
