import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { encodeFrame } from '@agentic-workflow-kit/jig-codec';

const conformance = await import('../dist/index.js');
const oracleText = readFileSync(resolve(import.meta.dirname, './fixtures/conformance-oracle.json'), 'utf8');
const oracle = JSON.parse(oracleText);
const hash = 'a'.repeat(64);
const subject = Object.freeze({
  candidateContentDigest: hash,
  candidateCommit: 'c',
  candidateTree: hash,
  executionBaseCommit: 'b',
  executionBaseTree: hash,
  mergeBaseCommit: 'm',
  buildDigest: hash,
  toolchainDigest: hash,
  catalogDigest: hash,
  topologyVersion: 'jig.runtime-topology.v1',
  suiteVersion: 'v1',
  probeVersion: 'v1',
  fixtureDigest: hash,
  clockId: 'clock',
  seed: 'seed',
  recorderIdentity: 'independent',
  recordedAt: 1,
  providerId: 'fixture-provider',
  providerBuildDigest: hash,
  manifestDigest: hash,
  environmentDigest: hash,
});
const rawInput = (suite, changes = {}) => ({
  key: `${suite}-1`,
  bytes: `${suite}:1`,
  suite,
  status: 'pass',
  subject,
  independentRecorder: 'independent',
  complete: true,
  attempt: 1,
  ...changes,
});
const input = (suite, changes = {}) => {
  const encoded = encodeFrame(rawInput(suite, changes));
  assert.equal(encoded.ok, true);
  return encoded.value;
};
test('conformance red contract: catalog is fixed, literal, and exactly 39 entries', () => {
  assert.equal(conformance.SUITES.length, 39);
  assert.equal(new Set(conformance.SUITES).size, 39);
  assert.equal(conformance.SUITES[0], 'CF-DETERMINISM');
  assert.equal(conformance.SUITES.at(-1), 'CF-MECH-DELIVERY');
  assert.equal(conformance.PRODUCT_ROUTE_IDS.length, 44);
  assert.deepEqual(conformance.SUITES, oracle.catalog);
  assert.deepEqual(conformance.REALIZATION_SUITES, oracle.realization);
  assert.deepEqual(conformance.PRODUCT_ROUTE_IDS, oracle.routes);
  assert.equal(createHash('sha256').update(oracleText).digest('hex').length, 64);
  assert.deepEqual(
    conformance.PRODUCT_ROUTE_ORACLE.slice(0, 15).map((route) => ({
      id: route.id,
      elements: route.elements.map((element) => [element.kind, element.id]),
    })),
    oracle.routeElementsBatch1.map(({ id, elements }) => ({ id, elements })),
  );
  assert.deepEqual(
    conformance.PRODUCT_ROUTE_ORACLE.slice(15, 30).map((route) => ({
      id: route.id,
      elements: route.elements.map((element) => [element.kind, element.id]),
    })),
    oracle.routeElementsBatch2.map(({ id, elements }) => ({ id, elements })),
  );
  assert.deepEqual(
    conformance.PRODUCT_ROUTE_ORACLE.slice(30).map((route) => ({
      id: route.id,
      elements: route.elements.map((element) => [element.kind, element.id]),
    })),
    oracle.routeElementsBatch3.map(({ id, elements }) => ({ id, elements })),
  );
  const routeFixtures = [...oracle.routeElementsBatch1, ...oracle.routeElementsBatch2, ...oracle.routeElementsBatch3];
  assert.equal(routeFixtures.length, 44);
  for (const route of routeFixtures) {
    const candidate = { id: route.id, elements: route.elements };
    assert.equal(
      createHash('sha256').update(JSON.stringify(candidate)).digest('hex'),
      route.digest ?? route.routeDigest,
      `${route.id} route digest must bind its complete literal element list`,
    );
  }
  const tamperedElement = { ...oracle.routeElementsBatch1[0], elements: [['suite', 'CF-FENCE']] };
  assert.notEqual(
    createHash('sha256')
      .update(JSON.stringify({ id: tamperedElement.id, elements: tamperedElement.elements }))
      .digest('hex'),
    oracle.routeElementsBatch1[0].digest,
  );
  assert.notEqual(`${oracle.routeElementsBatch1[0].digest.slice(0, -1)}0`, oracle.routeElementsBatch1[0].digest);
});
test('conformance authority catalogs reject nested writes without weakening route checks', () => {
  assert.equal(Object.isFrozen(conformance.REALIZATION_SUITES), true);
  assert.equal(Object.isFrozen(conformance.PRODUCT_ROUTE_ORACLE), true);
  assert.equal(Object.isFrozen(conformance.PRODUCT_ROUTE_ORACLE[0]), true);
  assert.equal(Object.isFrozen(conformance.PRODUCT_ROUTE_ORACLE[0].elements), true);
  assert.equal(Object.isFrozen(conformance.PRODUCT_ROUTE_ORACLE[0].elements[0]), true);
  assert.throws(() => {
    conformance.REALIZATION_SUITES[0] = 'CF-MECH-DELIVERY';
  }, TypeError);
  assert.throws(() => {
    conformance.PRODUCT_ROUTE_ORACLE[0].elements[0].id = 'CF-FENCE';
  }, TypeError);

  const records = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  routes[0].elements = [];
  assert.ok(conformance.evaluateProduct(records, routes, subject).reasons.includes('route-elements:PC-README-1'));
});
test('conformance recorder rejects non-frame, proxy-adjacent object, self-attestation, collision, and incomplete artifacts', () => {
  assert.equal(conformance.parseRecordFrame({}).ok, false);
  const encoded = input('CF-DETERMINISM');
  assert.equal(conformance.parseRecordFrame(encoded).ok, true);
  assert.equal(conformance.parseRecordFrame(new TextDecoder().decode(encoded)).ok, true);
  const first = conformance.append(
    [],
    input('CF-MECH-LEDGER', {
      subject: {
        ...subject,
        providerId: 'p',
        providerBuildDigest: hash,
        manifestDigest: hash,
        environmentDigest: hash,
      },
    }),
  );
  assert.equal(first.status, 'pass');
  assert.equal(
    conformance.append(
      first.records,
      input('CF-MECH-LEDGER', {
        bytes: 'other',
        subject: {
          ...subject,
          providerId: 'p',
          providerBuildDigest: hash,
          manifestDigest: hash,
          environmentDigest: hash,
        },
      }),
    ).status,
    'not-recordable',
  );
  assert.equal(
    conformance.append(
      [],
      input('CF-MECH-LEDGER', {
        independentRecorder: 'p',
        subject: {
          ...subject,
          providerId: 'p',
          providerBuildDigest: hash,
          manifestDigest: hash,
          environmentDigest: hash,
        },
      }),
    ).status,
    'not-recordable',
  );
  assert.equal(conformance.append([], input('CF-DETERMINISM', { complete: false })).status, 'not-recordable');
});
test('conformance hostile frame inputs are rejected without reflecting on a Proxy', () => {
  const traps = { get: 0, getPrototypeOf: 0, has: 0, ownKeys: 0, getOwnPropertyDescriptor: 0 };
  const hostile = new Proxy(
    {},
    {
      get() {
        traps.get += 1;
        return undefined;
      },
      getPrototypeOf() {
        traps.getPrototypeOf += 1;
        return null;
      },
      has() {
        traps.has += 1;
        return false;
      },
      ownKeys() {
        traps.ownKeys += 1;
        return [];
      },
      getOwnPropertyDescriptor() {
        traps.getOwnPropertyDescriptor += 1;
        return undefined;
      },
    },
  );

  assert.equal(conformance.parseRecordFrame(hostile).ok, false);
  assert.deepEqual(traps, { get: 0, getPrototypeOf: 0, has: 0, ownKeys: 0, getOwnPropertyDescriptor: 0 });
});
test('conformance public recorder and gates close hostile caller containers without escape', () => {
  const throwingGetArray = new Proxy([], {
    get() {
      throw new Error('caller array get');
    },
  });
  let appendResult;
  assert.doesNotThrow(() => {
    appendResult = conformance.append(throwingGetArray, input('CF-DETERMINISM'));
  });
  assert.equal(appendResult.status, 'not-recordable');
  assert.equal(appendResult.failureClass, 'FC-INPUT');

  let realization;
  let provider;
  assert.doesNotThrow(() => {
    realization = conformance.evaluateRealization(throwingGetArray, subject);
    provider = conformance.evaluateProvider('PORT-LEDGER', throwingGetArray, subject);
  });
  for (const result of [realization, provider]) {
    assert.equal(result.passed, false);
    assert.equal(result.failureClass, 'FC-INPUT');
  }

  const record = conformance.append([], input('CF-DETERMINISM')).records[0];
  const throwingPrototypeRecord = new Proxy(record, {
    getPrototypeOf() {
      throw new Error('record prototype');
    },
  });
  let recordResult;
  assert.doesNotThrow(() => {
    recordResult = conformance.evaluateRealization([throwingPrototypeRecord], subject);
  });
  assert.equal(recordResult.passed, false);
  assert.equal(recordResult.failureClass, 'FC-EVIDENCE');

  const records = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const throwingRoutes = new Proxy(routes, {
    get() {
      throw new Error('routes get');
    },
  });
  let product;
  assert.doesNotThrow(() => {
    product = conformance.evaluateProduct(records, throwingRoutes, subject);
  });
  assert.equal(product.passed, false);
  assert.equal(product.failureClass, 'FC-INPUT');
});
test('conformance public entrypoints snapshot hostile arrays and nested caller values before evaluation', () => {
  const record = conformance.append([], input('CF-DETERMINISM')).records[0];
  const records = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const throwingGet = (value) =>
    new Proxy(value, {
      get() {
        throw new Error('caller get');
      },
    });
  const inconsistentGet = (value) =>
    new Proxy(value, {
      get(target, key, receiver) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        if (descriptor && Object.hasOwn(descriptor, 'value')) return Symbol('inconsistent');
        return Reflect.get(target, key, receiver);
      },
    });
  const throwingPrototype = (value) =>
    new Proxy(value, {
      getPrototypeOf() {
        throw new Error('caller prototype');
      },
    });
  const sparse = [];
  sparse[1] = record;
  const accessor = [];
  Object.defineProperty(accessor, '0', {
    enumerable: true,
    get() {
      throw new Error('array accessor');
    },
  });
  const iterator = [record];
  Object.defineProperty(iterator, Symbol.iterator, {
    value() {
      throw new Error('iterator');
    },
  });
  const hostileOuterArrays = [throwingGet([record]), throwingPrototype([record]), sparse, accessor, iterator];
  for (const hostile of hostileOuterArrays) {
    let appended;
    assert.doesNotThrow(() => {
      appended = conformance.append(hostile, input('CF-DETERMINISM'));
    });
    assert.equal(appended.status, 'not-recordable');
    assert.equal(appended.failureClass, 'FC-INPUT');
    for (const gate of [
      () => conformance.evaluateRealization(hostile, subject),
      () => conformance.evaluateProvider('PORT-LEDGER', hostile, subject),
    ]) {
      let result;
      assert.doesNotThrow(() => {
        result = gate();
      });
      assert.equal(result.passed, false);
      assert.equal(result.failureClass, 'FC-INPUT');
    }
  }

  const nestedRecords = [
    [throwingGet(record)],
    [inconsistentGet(record)],
    [throwingPrototype(record)],
    [{ ...record, subject: throwingGet(subject) }],
    [{ ...record, subject: inconsistentGet(subject) }],
    [{ ...record, subject: throwingPrototype(subject) }],
    [{ ...record, extra: true }],
    [(({ subject: ignored, ...rest }) => rest)(record)],
  ];
  for (const hostile of nestedRecords) {
    let result;
    assert.doesNotThrow(() => {
      result = conformance.evaluateRealization(hostile, subject);
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureClass, 'FC-EVIDENCE');
  }

  const routeCases = [
    throwingGet(routes),
    throwingPrototype(routes),
    [throwingGet(routes[0]), ...routes.slice(1)],
    [throwingPrototype(routes[0]), ...routes.slice(1)],
    [{ ...routes[0], elements: throwingGet(routes[0].elements) }, ...routes.slice(1)],
    [
      { ...routes[0], elements: [throwingGet(routes[0].elements[0]), ...routes[0].elements.slice(1)] },
      ...routes.slice(1),
    ],
    [
      { ...routes[0], elements: [inconsistentGet(routes[0].elements[0]), ...routes[0].elements.slice(1)] },
      ...routes.slice(1),
    ],
    [
      { ...routes[0], elements: [throwingPrototype(routes[0].elements[0]), ...routes[0].elements.slice(1)] },
      ...routes.slice(1),
    ],
    [{ ...routes[0], extra: true }, ...routes.slice(1)],
    [(({ elements: ignored, ...rest }) => rest)(routes[0]), ...routes.slice(1)],
  ];
  for (const hostile of routeCases) {
    let result;
    assert.doesNotThrow(() => {
      result = conformance.evaluateProduct(records, hostile, subject);
    });
    assert.equal(result.passed, false);
    assert.equal(result.failureClass, 'FC-INPUT');
  }
});
test('conformance remaining public helpers never reread hostile caller values or render a forged green result', () => {
  const throwingGet = new Proxy([], {
    get() {
      throw new Error('caller get');
    },
  });
  let attempt;
  assert.doesNotThrow(() => {
    attempt = conformance.runAttempt(throwingGet, 'key', 'bytes');
  });
  assert.deepEqual(attempt, [{ attempt: 1, key: 'key', bytes: 'bytes', state: 'evaluated' }]);

  const hostileValue = new Proxy(
    {},
    {
      get() {
        throw new Error('caller get');
      },
    },
  );
  let harness;
  assert.doesNotThrow(() => {
    harness = conformance.deterministicHarness(hostileValue, hostileValue);
    harness.nextId(hostileValue);
  });
  assert.equal(harness.clock, 0);
  assert.equal(harness.seed, '');
  assert.equal(conformance.classifyGateReason(hostileValue), 'FC-INPUT');

  const forgedGreen = new Proxy(
    { gate: 'CF-GATE-REALIZATION', passed: true, reasons: [] },
    {
      get() {
        throw new Error('forged gate get');
      },
    },
  );
  assert.doesNotThrow(() => conformance.renderGate(forgedGreen));
  assert.equal(conformance.renderGate(forgedGreen), 'closed');

  const records = conformance.REALIZATION_SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  assert.equal(conformance.renderGate(conformance.evaluateRealization(records, subject)), 'green');
});
test('conformance exact subjects reject extra, missing, partial, and malformed field values', () => {
  const { providerId, providerBuildDigest, manifestDigest, environmentDigest, ...realizationSubject } = subject;
  const { candidateCommit, ...subjectWithoutCommit } = subject;
  const { environmentDigest: omittedEnvironment, ...partialProviderSubject } = subject;
  assert.equal(conformance.parseRecordFrame(input('CF-DETERMINISM', { subject: realizationSubject })).ok, true);

  const invalidSubjects = [
    { ...subject, extra: true },
    subjectWithoutCommit,
    partialProviderSubject,
    { ...subject, candidateCommit: 1 },
    { ...subject, executionBaseCommit: false },
    { ...subject, mergeBaseCommit: true },
    { ...subject, candidateTree: false },
    { ...subject, suiteVersion: true },
    { ...subject, probeVersion: 1 },
    { ...subject, clockId: 1 },
    { ...subject, seed: false },
    { ...subject, recorderIdentity: 1 },
    { ...subject, recordedAt: true },
    { ...subject, recordedAt: -1 },
    { ...subject, providerId: false },
    { ...subject, providerBuildDigest: 'not-a-digest' },
    { ...subject, manifestDigest: true },
    { ...subject, environmentDigest: 1 },
  ];
  for (const invalidSubject of invalidSubjects)
    assert.equal(conformance.parseRecordFrame(input('CF-DETERMINISM', { subject: invalidSubject })).ok, false);
});
test('conformance product gate retains total input checks while provider qualification remains unavailable', () => {
  const records = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  assert.equal(conformance.evaluateRealization(records.slice(0, 32), subject).passed, true);
  const complete = conformance.evaluateProduct(records, routes, subject);
  assert.equal(complete.passed, false);
  assert.equal(complete.failureClass, 'FC-EVIDENCE');
  assert.deepEqual(
    complete.reasons,
    Object.values(conformance.MECHANISM_PORTS).map((port) => `provider-proof:${port}`),
  );
  const providerBypass = records.map((record) =>
    record.suite === 'CF-MECH-LEDGER'
      ? { ...record, subject: { ...record.subject, providerBuildDigest: 'b'.repeat(64) } }
      : record,
  );
  assert.equal(conformance.evaluateProduct(providerBypass, routes, subject).passed, false);
  assert.equal(conformance.evaluateProduct(records.slice(1), routes, subject).passed, false);
  assert.equal(conformance.evaluateProduct(records, routes.slice(1), subject).passed, false);
  assert.equal(
    conformance.evaluateProduct(
      records.map((record) => ({ ...record, subject: { ...subject, environmentDigest: 'b'.repeat(64) } })),
      routes,
      subject,
    ).passed,
    false,
  );
});

test('conformance product gate requires an exact branded observation for every mechanism port', () => {
  const providerSubject = { ...subject, recorderIdentity: 'recorder/jig-conformance/v1' };
  const records = conformance.SUITES.map(
    (suite) =>
      conformance.append([], input(suite, { subject: providerSubject, independentRecorder: 'independent' })).records[0],
  );
  const observed = Object.entries(conformance.MECHANISM_PORTS).map(([suite, port]) => {
    const source = records.filter((record) => record.suite === suite);
    const result = conformance.observeProvider(port, source, providerSubject);
    assert.equal(result.ok, true, port);
    if (!result.ok) throw new Error(port);
    return [suite, port, result.record];
  });
  const complete = records.map((record) => observed.find(([suite]) => suite === record.suite)?.[2] ?? record);
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  assert.equal(conformance.evaluateProduct(complete, routes, providerSubject).passed, true);
  for (const [suite, port, record] of observed) {
    const index = complete.findIndex((candidate) => candidate.suite === suite);
    const crossPort = observed.find(([, other]) => other !== port)?.[2];
    for (const replacement of [undefined, { ...record }, { ...record, key: `${record.key}/altered` }, crossPort]) {
      const mutated = [...complete];
      if (replacement === undefined) mutated.splice(index, 1);
      else mutated[index] = replacement;
      assert.equal(conformance.evaluateProduct(mutated, routes, providerSubject).passed, false, `${port}`);
    }
  }
});
test('conformance provider gate binds the exact port mechanism but remains unqualified in Phase 0', () => {
  const providerSubject = {
    ...subject,
    providerId: 'fixture',
    providerBuildDigest: hash,
    manifestDigest: hash,
    environmentDigest: hash,
  };
  const record = conformance.append([], input('CF-MECH-LEDGER', { subject: providerSubject })).records;
  const bound = conformance.evaluateProvider('PORT-LEDGER', record, providerSubject);
  assert.equal(bound.passed, false);
  assert.deepEqual(bound.reasons, ['missing:independent-recorder-provenance']);
  assert.equal(bound.failureClass, 'FC-EVIDENCE');
  const wrongPort = conformance.evaluateProvider('PORT-ARTIFACT', record, providerSubject);
  assert.equal(wrongPort.passed, false);
  assert.ok(wrongPort.reasons.includes('missing:CF-MECH-ARTIFACT'));
  assert.ok(wrongPort.reasons.includes('missing:independent-recorder-provenance'));
});
test('conformance claimed independent recorder labels cannot qualify a provider or product', () => {
  const claimedIndependentSubject = {
    ...subject,
    providerId: 'provider-controlled',
    recorderIdentity: 'claimed-independent',
  };
  const providerRecords = conformance.append(
    [],
    input('CF-MECH-LEDGER', {
      subject: claimedIndependentSubject,
      independentRecorder: 'claimed-independent',
    }),
  ).records;
  const provider = conformance.evaluateProvider('PORT-LEDGER', providerRecords, claimedIndependentSubject);
  assert.equal(provider.passed, false);
  assert.deepEqual(provider.reasons, ['missing:independent-recorder-provenance']);
  assert.equal(provider.failureClass, 'FC-EVIDENCE');

  const records = conformance.SUITES.map(
    (suite) =>
      conformance.append(
        [],
        input(suite, { subject: claimedIndependentSubject, independentRecorder: 'claimed-independent' }),
      ).records[0],
  );
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const product = conformance.evaluateProduct(records, routes, claimedIndependentSubject);
  assert.equal(product.passed, false);
  assert.equal(product.failureClass, 'FC-EVIDENCE');
  assert.deepEqual(
    product.reasons,
    Object.values(conformance.MECHANISM_PORTS).map((port) => `provider-proof:${port}`),
  );
});
test('conformance owns exact-subject provider observations and rejects forged or wrong-port proof', () => {
  const providerSubject = {
    ...subject,
    providerId: 'structured-json-file-source/v1',
    recorderIdentity: 'recorder/jig-conformance/v1',
  };
  const source = conformance.append([], input('CF-MECH-SOURCE', { subject: providerSubject })).records;
  const observation = conformance.observeProvider('PORT-SOURCE', source, providerSubject);
  assert.equal(observation.ok, true);
  assert.equal(conformance.evaluateProvider('PORT-SOURCE', [observation.record], providerSubject).passed, true);
  assert.equal(conformance.evaluateProvider('PORT-LEDGER', [observation.record], providerSubject).passed, false);

  const forged = { ...observation.record, independentRecorder: 'recorder/jig-conformance/v1' };
  assert.equal(conformance.evaluateProvider('PORT-SOURCE', [forged], providerSubject).passed, false);
  assert.equal(
    conformance.observeProvider('PORT-SOURCE', source, { ...providerSubject, manifestDigest: 'b'.repeat(64) }).ok,
    false,
  );
});

test('public conformance cannot manufacture a qualification certificate', () => {
  const providerSubject = {
    ...subject,
    providerId: 'structured-json-file-source/v1',
    providerBuildDigest: '0d842ed9d3bf39f51f1c10f36b1e4c2414df93bf214ec80da1dde92a890e1b81',
    manifestDigest: '982a0cde5b335759925af0003f58a87f1bfd2e03a25f046216bd4aa9569994cd',
    environmentDigest: 'b880653890190d5da3ac311736401fd1fa02f2d221bee8258eae231717143536',
    recorderIdentity: 'recorder/jig-conformance/v1',
  };
  const records = conformance.append([], input('CF-MECH-SOURCE', { subject: providerSubject })).records;
  const observation = conformance.observeProvider('PORT-SOURCE', records, providerSubject);
  assert.equal(observation.ok, true);
  if (!observation.ok) return;
  assert.equal(
    conformance.mintStructuredFileQualificationCertificate?.(
      observation.record,
      'fe23b4511a1abafef43ee38c6bc0c6496d4a3787ac9a913bd4634f960fce2bbd',
    ),
    undefined,
  );
  assert.equal('executeStructuredFileQualification' in conformance, false);
  assert.equal('mintStructuredFileQualificationCertificate' in conformance, false);
  assert.equal(
    conformance.mintStructuredFileQualificationCertificate?.(
      { ...observation.record },
      'fe23b4511a1abafef43ee38c6bc0c6496d4a3787ac9a913bd4634f960fce2bbd',
    ),
    undefined,
  );
  assert.equal('issueQualificationCertificate' in conformance, false);
  const copied = { ...observation.record };
  assert.equal(
    conformance.mintStructuredFileQualificationCertificate?.(
      copied,
      'fe23b4511a1abafef43ee38c6bc0c6496d4a3787ac9a913bd4634f960fce2bbd',
    ),
    undefined,
  );
});

test('private structured-file execution mints only an opaque runtime certificate', async () => {
  const internal = await import('../dist/structured-file-qualification.js');
  const registry = await import('../../runtime-contracts/dist/qualification-registry.js');
  const providerSubject = {
    ...subject,
    providerId: 'structured-json-file-source/v1',
    providerBuildDigest: '0d842ed9d3bf39f51f1c10f36b1e4c2414df93bf214ec80da1dde92a890e1b81',
    manifestDigest: '982a0cde5b335759925af0003f58a87f1bfd2e03a25f046216bd4aa9569994cd',
    environmentDigest: 'b880653890190d5da3ac311736401fd1fa02f2d221bee8258eae231717143536',
    recorderIdentity: 'recorder/jig-conformance/v1',
  };
  const records = conformance.append([], input('CF-MECH-SOURCE', { subject: providerSubject })).records;
  const certificate = internal.executeExactStructuredFileQualification(records, providerSubject);
  assert.ok(certificate);
  assert.equal('executeExactStructuredFileQualification' in conformance, false);
  const friend = await import('@agentic-workflow-kit/jig-runtime-contracts/qualification-certificate');
  assert.equal(friend.mintQualificationCertificate({}), undefined);
  assert.equal(friend.mintQualificationCertificate({ ...certificate }), undefined);

  const exactClaims = {
    subject: { ...providerSubject },
    resourceDigest: 'fe23b4511a1abafef43ee38c6bc0c6496d4a3787ac9a913bd4634f960fce2bbd',
    capability: 'PORT-SOURCE/read-structured-json',
    policyMinimum: 'policy/structured-file-source/v1',
  };
  const { candidateTree, ...incompleteSubject } = exactClaims.subject;
  assert.equal(
    friend.recordExactStructuredFileExecution({ ...exactClaims, subject: incompleteSubject }),
    undefined,
    'every exact conformance-subject field is required before carrier registration',
  );
  assert.equal(candidateTree, hash);

  const carrier = friend.recordExactStructuredFileExecution(exactClaims);
  assert.ok(carrier);
  exactClaims.subject.providerBuildDigest = '0'.repeat(64);
  exactClaims.subject.candidateTree = '0'.repeat(64);
  exactClaims.resourceDigest = '0'.repeat(64);
  const isolatedCertificate = friend.mintQualificationCertificate(carrier);
  assert.ok(isolatedCertificate, 'mutating caller-owned input cannot alter the registered snapshot');
  const stored = registry.certificateClaims.get(isolatedCertificate);
  assert.ok(stored);
  assert.equal(Object.isFrozen(stored), true);
  assert.equal(Object.isFrozen(stored.subject), true);
  assert.equal(stored.subject.providerBuildDigest, providerSubject.providerBuildDigest);
  assert.equal(stored.subject.candidateTree, providerSubject.candidateTree);
  assert.equal(stored.resourceDigest, 'fe23b4511a1abafef43ee38c6bc0c6496d4a3787ac9a913bd4634f960fce2bbd');
});
test('conformance direct evaluators reject forged, schema-less, self-attested, and malformed records', () => {
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const complete = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const gates = [
    [
      'realization',
      complete.filter((record) => conformance.REALIZATION_SUITES.includes(record.suite)),
      (records) => conformance.evaluateRealization(records, subject),
    ],
    [
      'provider',
      complete.filter((record) => record.suite === 'CF-MECH-LEDGER'),
      (records) => conformance.evaluateProvider('PORT-LEDGER', records, subject),
    ],
    ['product', complete, (records) => conformance.evaluateProduct(records, routes, subject)],
  ];
  const forgeries = [
    ['schema-less', (records) => records.map(({ schemaVersion, ...record }) => record), 'invalid:'],
    [
      'self-attested',
      (records) => records.map((record) => ({ ...record, independentRecorder: record.subject.providerId })),
      'self-attestation:',
    ],
    ['extra-record-key', (records) => records.map((record) => ({ ...record, extra: true })), 'invalid:'],
    [
      'malformed-subject',
      (records) => records.map((record) => ({ ...record, subject: { ...record.subject, recordedAt: false } })),
      'invalid:',
    ],
  ];
  assert.equal(gates.length, 3);
  assert.equal(forgeries.length, 4);
  for (const [, records, evaluate] of gates)
    for (const [, forge, reason] of forgeries) {
      const result = evaluate(forge(records));
      assert.equal(result.passed, false);
      assert.ok(result.reasons.some((entry) => entry.startsWith(reason)));
      assert.equal(result.failureClass, 'FC-EVIDENCE');
    }
});
test('conformance provider missing-binding closure reports evidence failure', () => {
  const { providerId, providerBuildDigest, manifestDigest, environmentDigest, ...realizationSubject } = subject;
  const records = conformance.append([], input('CF-MECH-LEDGER', { subject: realizationSubject })).records;
  const result = conformance.evaluateProvider('PORT-LEDGER', records, realizationSubject);
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes('missing:provider-binding'));
  assert.equal(result.failureClass, 'FC-EVIDENCE');
});
test('conformance direct gates close canonical-invalid subjects in records and expected input', () => {
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const complete = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const gates = [
    ['realization', complete.slice(0, 32), (records, expected) => conformance.evaluateRealization(records, expected)],
    [
      'provider',
      complete.filter((record) => record.suite === 'CF-MECH-LEDGER'),
      (records, expected) => conformance.evaluateProvider('PORT-LEDGER', records, expected),
    ],
    ['product', complete, (records, expected) => conformance.evaluateProduct(records, routes, expected)],
  ];
  const invalid = [
    { candidateContentDigest: 'A'.repeat(64) },
    { buildDigest: 'short' },
    { candidateCommit: '' },
    { suiteVersion: '' },
    { clockId: '' },
    { seed: '' },
    { recorderIdentity: '' },
    { topologyVersion: 'wrong' },
    { recordedAt: -1 },
    { environmentDigest: undefined },
  ];
  for (const [, records, evaluate] of gates)
    for (const change of invalid) {
      const invalidSubject = { ...subject, ...change };
      const result = evaluate(
        records.map((record) => ({ ...record, subject: invalidSubject })),
        invalidSubject,
      );
      assert.equal(result.passed, false);
      assert.equal(result.reasons[0], 'invalid:subject');
      assert.equal(result.failureClass, 'FC-EVIDENCE');
      const expectedOnly = evaluate(records, invalidSubject);
      assert.equal(expectedOnly.passed, false);
      assert.equal(expectedOnly.reasons[0], 'invalid:subject');
    }
});
test('conformance deterministic replay, crash, timeout, and resume remain append-only and closed', () => {
  const first = conformance.deterministicHarness(10, 'seed');
  const second = conformance.deterministicHarness(10, 'seed');
  assert.equal(first.nextId('probe'), second.nextId('probe'));
  const before = conformance.runAttempt([], 'k', 'b', 'before-record');
  const after = conformance.runAttempt(before, 'k', 'b', 'after-record');
  const resumed = conformance.runAttempt(after, 'k', 'b');
  assert.deepEqual(
    before.map((entry) => entry.state),
    ['incomplete'],
  );
  assert.deepEqual(
    after.map((entry) => entry.state),
    ['incomplete', 'recorded'],
  );
  assert.equal(resumed.at(-1).attempt, 3);
  assert.equal(resumed.at(-1).state, 'evaluated');
  assert.equal(
    conformance.runAttempt([], 'k', 'b', 'before-evaluation').at(-1).state,
    oracle.faults['before-evaluation'],
  );
  assert.equal(conformance.runAttempt([], 'k', 'b', 'before-record').at(-1).state, oracle.faults['before-record']);
});
test('conformance closed gate renderer cannot emit false green', () => {
  assert.equal(conformance.renderGate(conformance.evaluateProduct([], [], subject)), 'closed');
});
test('conformance fixed crash and replay corpus is append-only and never passing', () => {
  const stages = ['before-record', 'after-record', 'before-evaluation'];
  assert.equal(stages.length, 3);
  for (const stage of stages) {
    const log = conformance.runAttempt([], 'k', 'bytes', stage);
    assert.notEqual(log.at(-1).state, 'evaluated');
    assert.equal(conformance.renderGate(conformance.evaluateProduct([], [], subject)), 'closed');
  }
  const partial = conformance.runAttempt([], 'k', 'bytes', 'before-record');
  const resumed = conformance.runAttempt(partial, 'k', 'bytes');
  assert.equal(partial.length, 1);
  assert.equal(resumed.at(-1).attempt, 2);
  assert.deepEqual(conformance.runAttempt([], 'x', 'b'), conformance.runAttempt([], 'x', 'b'));
});
test('conformance negative corpus closes every substituted, stale, duplicate, partial, and false-green input', () => {
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const complete = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const closed = (records) =>
    conformance.evaluateProduct(records, routes, subject).passed === false ? 'closed' : 'open';
  for (const name of [
    'absent-suite',
    'duplicate-suite',
    'unknown-suite',
    'stale-evidence',
    'candidate-substitution',
    'basis-substitution',
    'build-substitution',
    'provider-substitution',
    'manifest-substitution',
    'environment-substitution',
    'clock-drift',
    'probe-substitution',
    'fixture-substitution',
    'false-green',
  ]) {
    const records =
      name === 'absent-suite'
        ? complete.slice(1)
        : name === 'duplicate-suite'
          ? [...complete, complete[0]]
          : name === 'unknown-suite'
            ? [...complete, { ...complete[0], suite: 'CF-UNKNOWN' }]
            : complete.map((record) => ({
                ...record,
                subject: {
                  ...record.subject,
                  [name === 'stale-evidence'
                    ? 'recordedAt'
                    : name === 'candidate-substitution'
                      ? 'candidateContentDigest'
                      : name === 'basis-substitution'
                        ? 'executionBaseTree'
                        : name === 'build-substitution'
                          ? 'buildDigest'
                          : name === 'provider-substitution'
                            ? 'providerId'
                            : name === 'manifest-substitution'
                              ? 'manifestDigest'
                              : name === 'environment-substitution'
                                ? 'environmentDigest'
                                : name === 'clock-drift'
                                  ? 'clockId'
                                  : name === 'probe-substitution'
                                    ? 'probeVersion'
                                    : 'fixtureDigest']: name === 'stale-evidence' ? -1 : name,
                },
              }));
    assert.equal(closed(records), oracle.negativeExpected[name]);
  }
  assert.equal(
    conformance.append([], input('CF-DETERMINISM', { complete: false })).status,
    oracle.negativeExpected['partial-artifact'],
  );
  assert.equal(Object.keys(oracle.negativeExpected).length, 17);
  const tamperedRoute = routes.map((route, index) =>
    index === 0 ? { ...route, elements: route.elements.slice(1) } : route,
  );
  assert.equal(conformance.evaluateProduct(complete, tamperedRoute, subject).passed, false);
  assert.equal(conformance.evaluateProduct([...complete].reverse(), routes, subject).passed, false);
});
test('conformance exact-subject N1 substitutions reach binding validation', () => {
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const complete = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const fields = [
    ['catalogDigest', 'FC-SUBJECT'],
    ['candidateContentDigest', 'FC-SUBJECT'],
    ['executionBaseTree', 'FC-SUBJECT'],
    ['buildDigest', 'FC-SUBJECT'],
    ['providerId', 'FC-SUBJECT'],
    ['manifestDigest', 'FC-SUBJECT'],
    ['environmentDigest', 'FC-TRUST'],
    ['clockId', 'FC-TRUST'],
  ];
  assert.equal(fields.length, 8);
  for (const [field] of fields) {
    const mutated = complete.map((record) => ({
      ...record,
      subject: { ...record.subject, [field]: `mutated-${field}` },
    }));
    const result = conformance.evaluateProduct(mutated, routes, subject);
    assert.equal(result.passed, false);
    assert.ok(['FC-SUBJECT', 'FC-EVIDENCE', 'FC-TRUST'].includes(result.failureClass));
  }
  const precedence = complete.map((record) => ({
    ...record,
    subject: { ...record.subject, candidateContentDigest: 'b'.repeat(64), buildDigest: 'c'.repeat(64) },
  }));
  assert.equal(
    conformance.evaluateProduct(precedence, routes, subject).reasons[0],
    'mismatched:CF-DETERMINISM:candidateContentDigest',
  );
});
test('conformance N2 structural fences close fixed valid adversarial corpus', () => {
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const complete = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const cases = [
    ['absent', complete.slice(1), 'missing:', 'FC-INPUT'],
    ['duplicate', [...complete, complete[0]], 'duplicate:', 'FC-INPUT'],
    ['unknown', [...complete, { ...complete[0], suite: 'CF-UNKNOWN' }], 'order:', 'FC-INPUT'],
    [
      'stale',
      complete.map((record) => ({ ...record, subject: { ...record.subject, recordedAt: -1 } })),
      'mismatched:CF-DETERMINISM:recordedAt',
      'FC-SUBJECT',
    ],
    [
      'probe',
      complete.map((record) => ({ ...record, subject: { ...record.subject, probeVersion: 'v2' } })),
      'mismatched:CF-DETERMINISM:probeVersion',
      'FC-SUBJECT',
    ],
    [
      'fixture',
      complete.map((record) => ({ ...record, subject: { ...record.subject, fixtureDigest: 'b'.repeat(64) } })),
      'mismatched:CF-DETERMINISM:fixtureDigest',
      'FC-SUBJECT',
    ],
    ['order', [...complete].reverse(), 'order:', 'FC-INPUT'],
  ];
  assert.equal(cases.length, 7);
  for (const [, records] of cases) {
    const result = conformance.evaluateProduct(records, routes, subject);
    assert.equal(result.passed, false);
    assert.ok(['FC-INPUT', 'FC-SUBJECT', 'FC-EVIDENCE', 'FC-TRUST'].includes(result.failureClass));
  }
  assert.equal(
    conformance.append(
      [],
      input('CF-MECH-LEDGER', {
        independentRecorder: 'p',
        subject: {
          ...subject,
          providerId: 'p',
          providerBuildDigest: hash,
          manifestDigest: hash,
          environmentDigest: hash,
        },
      }),
    ).status,
    'not-recordable',
  );
  assert.equal(conformance.renderGate(conformance.evaluateProduct(complete, routes.slice(1), subject)), 'closed');
});
test('conformance gate reasons have stable typed failure families', () => {
  const cases = [
    ['unknown:CF-X', 'FC-INPUT'],
    ['mismatched:CF-X', 'FC-SUBJECT'],
    ['missing:CF-X', 'FC-EVIDENCE'],
    ['route:PC-X', 'FC-TRUST'],
  ];
  assert.equal(cases.length, 4);
  for (const [reason, family] of cases) assert.equal(conformance.classifyGateReason(reason), family);
});
