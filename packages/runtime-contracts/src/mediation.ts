const OPERATION_STATE_VERSION = 'jig.operation.v1';
const OPERATION_TYPES = Object.freeze([
  'OPC-SESSION-OPEN',
  'OPC-SESSION-ASSIGN',
  'OPC-SESSION-COLLECT',
  'OPC-SESSION-RESPOND',
  'OPC-SESSION-CLOSE',
  'OPC-WS-PROVISION',
  'OPC-WS-SETUP',
  'OPC-WS-OBSERVE',
  'OPC-WS-PRESERVE',
  'OPC-WS-RETIRE',
  'OPC-VERIFY-EXECUTE',
  'OPC-REV-PUBLISH',
  'OPC-REV-REQUEST',
  'OPC-REV-STATUS',
  'OPC-REV-COMMENT',
  'OPC-REV-RETIRE-REF',
  'OPC-REV-RETIRE-REQUEST',
  'OPC-REV-RETIRE-STATUS',
  'OPC-REV-RETIRE-COMMENT',
  'OPC-DEL-ANCHOR',
  'OPC-DEL-PUBLISH',
  'OPC-DEL-REQUEST',
  'OPC-DEL-STATUS',
  'OPC-DEL-COMMENT',
  'OPC-DEL-MERGE',
  'OPC-DEL-OBSERVE',
  'OPC-ART-PUT',
  'OPC-ART-GET',
  'OPC-ART-DISPOSE',
] as const);

type OperationType = (typeof OPERATION_TYPES)[number];
type DispatchPermit = Readonly<{
  version: typeof OPERATION_STATE_VERSION;
  operation: string;
  ordinal: number;
  type: OperationType;
  subject: Readonly<{ run: string; story: string; basis: string }>;
  fence: Readonly<{ generation: string; basis: string }>;
  capability: Readonly<{
    kind: CapabilityKind;
    port: MediatedPort;
    operationClass: OperationType;
    subject: string;
    fence: Readonly<{ generation: string; basis: string }>;
    resourceScope: string;
    manifest: string;
    digest: string;
  }>;
  authority: Readonly<{ authority: string; registry: string; basis: string }> | null;
  proof: Readonly<{
    kind: 'committed-witnessed';
    position: number;
    event: string;
    transaction: string;
    recordDigest: string;
    witnessDigest: string;
  }>;
}>;

export const MEDIATED_PORTS = Object.freeze([
  'PORT-SESSION',
  'PORT-WORKSPACE',
  'PORT-VERIFY',
  'PORT-DELIVERY',
  'PORT-ARTIFACT',
] as const);

type MediatedPort = (typeof MEDIATED_PORTS)[number];
type CapabilityKind =
  | 'CB-SESSION'
  | 'CB-WORKSPACE'
  | 'CB-VERIFY'
  | 'CB-REVIEW-PUBLICATION'
  | 'CB-DELIVERY'
  | 'CB-STORE';
type Effect = 'effectful' | 'observation';
type Route = Readonly<{ port: MediatedPort; capability: CapabilityKind; effect: Effect }>;
type FailureFamily = 'FC-INPUT' | 'FC-SUBJECT' | 'FC-FENCE' | 'FC-AUTHORITY' | 'FC-MECHANISM' | 'FC-EFFECT';
type Failure = Readonly<{ family: FailureFamily; code: string }>;
type Result<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: Failure }>;
type DispatchJournal = Readonly<{
  dispatchPermit(
    input: unknown,
  ): Readonly<{ ok: true; value: DispatchPermit } | { ok: false; error: Readonly<{ family: string; code: string }> }>;
}>;
type Attestation = Readonly<{
  operation: string;
  ordinal: number;
  mechanism: string;
  provider: 'fixture-only';
  subject: DispatchPermit['subject'];
  fence: DispatchPermit['fence'];
  capabilityDigest: string;
  authority: DispatchPermit['authority'];
  observation: Readonly<{ kind: string; digest: string }>;
  successClaim: 'observed';
}>;
type Invocation = Readonly<{
  operation: string;
  ordinal: number;
  port: MediatedPort;
  mechanism: string;
  effect: Effect;
  result: 'returned' | 'lost-response';
}>;

const OBSERVATIONS = new Set<OperationType>([
  'OPC-SESSION-COLLECT',
  'OPC-WS-OBSERVE',
  'OPC-VERIFY-EXECUTE',
  'OPC-REV-STATUS',
  'OPC-REV-RETIRE-STATUS',
  'OPC-DEL-STATUS',
  'OPC-DEL-OBSERVE',
  'OPC-ART-GET',
]);
const SCRIPTED_MECHANISMS: Readonly<Record<MediatedPort, string>> = Object.freeze({
  'PORT-SESSION': 'scripted-session.v1',
  'PORT-WORKSPACE': 'scripted-workspace.v1',
  'PORT-VERIFY': 'scripted-verify.v1',
  'PORT-DELIVERY': 'scripted-delivery.v1',
  'PORT-ARTIFACT': 'scripted-artifact.v1',
});

const fail = (family: FailureFamily, code: string): Result<never> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const ok = <T>(value: T): Result<T> => Object.freeze({ ok: true, value });
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
const boundedText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 512 && value.normalize('NFC') === value;
const operationType = (value: unknown): value is OperationType =>
  typeof value === 'string' && OPERATION_TYPES.includes(value as OperationType);

function fields(value: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).sort().join(',') !== [...names].sort().join(',') ||
      !Object.values(descriptors).every((descriptor) => 'value' in descriptor)
    )
      return undefined;
    return Object.freeze(
      Object.fromEntries(
        names.map((name) => [name, (descriptors[name] as PropertyDescriptor & { value: unknown }).value]),
      ),
    );
  } catch {
    return undefined;
  }
}

function sameObject(left: unknown, right: unknown, names: readonly string[]): boolean {
  if (left === null || right === null) return left === right;
  const leftFields = fields(left, names);
  const rightFields = fields(right, names);
  return Boolean(
    leftFields &&
      rightFields &&
      names.every((name) => {
        const leftValue = leftFields[name];
        const rightValue = rightFields[name];
        if (
          leftValue !== null &&
          rightValue !== null &&
          typeof leftValue === 'object' &&
          typeof rightValue === 'object'
        )
          return sameObject(leftValue, rightValue, Object.keys(leftValue as object));
        return leftValue === rightValue;
      }),
  );
}

export function operationRoute(type: unknown): Result<Route> {
  if (!operationType(type)) return fail('FC-INPUT', 'UNKNOWN_OPERATION_CLASS');
  const effect = OBSERVATIONS.has(type) ? 'observation' : 'effectful';
  if (type.startsWith('OPC-SESSION-'))
    return ok(Object.freeze({ port: 'PORT-SESSION', capability: 'CB-SESSION', effect }));
  if (type.startsWith('OPC-WS-'))
    return ok(Object.freeze({ port: 'PORT-WORKSPACE', capability: 'CB-WORKSPACE', effect }));
  if (type === 'OPC-VERIFY-EXECUTE') return ok(Object.freeze({ port: 'PORT-VERIFY', capability: 'CB-VERIFY', effect }));
  if (type.startsWith('OPC-REV-'))
    return ok(Object.freeze({ port: 'PORT-DELIVERY', capability: 'CB-REVIEW-PUBLICATION', effect }));
  if (type.startsWith('OPC-DEL-'))
    return ok(Object.freeze({ port: 'PORT-DELIVERY', capability: 'CB-DELIVERY', effect }));
  return ok(Object.freeze({ port: 'PORT-ARTIFACT', capability: 'CB-STORE', effect }));
}

function validateAttestation(value: unknown, permit: DispatchPermit, mechanism: string): Result<Attestation> {
  const raw = fields(value, [
    'operation',
    'ordinal',
    'mechanism',
    'provider',
    'subject',
    'fence',
    'capabilityDigest',
    'authority',
    'observation',
    'successClaim',
  ]);
  const observation = raw ? fields(raw.observation, ['kind', 'digest']) : undefined;
  if (
    !raw ||
    raw.operation !== permit.operation ||
    raw.ordinal !== permit.ordinal ||
    raw.mechanism !== mechanism ||
    raw.provider !== 'fixture-only' ||
    !sameObject(raw.subject, permit.subject, ['run', 'story', 'basis']) ||
    !sameObject(raw.fence, permit.fence, ['generation', 'basis']) ||
    raw.capabilityDigest !== permit.capability.digest ||
    !sameObject(raw.authority, permit.authority, ['authority', 'registry', 'basis']) ||
    !observation ||
    !boundedText(observation.kind) ||
    !digest(observation.digest) ||
    raw.successClaim !== 'observed'
  )
    return fail('FC-MECHANISM', 'INVALID_ATTESTATION');
  return ok(
    Object.freeze({
      operation: permit.operation,
      ordinal: permit.ordinal,
      mechanism,
      provider: 'fixture-only',
      subject: permit.subject,
      fence: permit.fence,
      capabilityDigest: permit.capability.digest,
      authority: permit.authority,
      observation: Object.freeze({ kind: observation.kind, digest: observation.digest }),
      successClaim: 'observed',
    }),
  );
}

export function createScriptedMediationFixture(journal: DispatchJournal) {
  const invocations: Invocation[] = [];
  const dispatched = new Set<string>();

  const permitFor = (operation: unknown, ordinal: unknown): Result<DispatchPermit> => {
    if (typeof operation !== 'string' || typeof ordinal !== 'number' || !Number.isSafeInteger(ordinal) || ordinal < 1)
      return fail('FC-INPUT', 'INVALID_DISPATCH_REQUEST');
    let permitted: ReturnType<DispatchJournal['dispatchPermit']>;
    try {
      permitted = journal.dispatchPermit({ operation, ordinal });
    } catch {
      return fail('FC-AUTHORITY', 'DISPATCH_PERMIT_UNAVAILABLE');
    }
    if (!permitted.ok)
      return fail(
        (['FC-INPUT', 'FC-SUBJECT', 'FC-FENCE', 'FC-AUTHORITY', 'FC-MECHANISM', 'FC-EFFECT'].includes(
          permitted.error.family,
        )
          ? permitted.error.family
          : 'FC-AUTHORITY') as FailureFamily,
        permitted.error.code,
      );
    const permit = permitted.value;
    const route = operationRoute(permit.type);
    if (
      !route.ok ||
      permit.version !== OPERATION_STATE_VERSION ||
      permit.operation !== operation ||
      permit.ordinal !== ordinal ||
      permit.capability.port !== route.value.port ||
      permit.capability.kind !== route.value.capability ||
      permit.capability.operationClass !== permit.type ||
      permit.capability.subject !== permit.subject.story ||
      !sameObject(permit.capability.fence, permit.fence, ['generation', 'basis']) ||
      permit.proof.kind !== 'committed-witnessed' ||
      permit.proof.recordDigest !== permit.proof.witnessDigest
    )
      return fail('FC-AUTHORITY', 'INVALID_DISPATCH_PERMIT');
    return ok(permit);
  };

  const dispatch = (input: unknown): Result<Readonly<{ port: MediatedPort; attestation: Attestation }>> => {
    const hasFault = typeof input === 'object' && input !== null && Object.hasOwn(input, 'fault');
    const raw = fields(
      input,
      hasFault ? ['operation', 'ordinal', 'attestation', 'fault'] : ['operation', 'ordinal', 'attestation'],
    );
    if (!raw || (raw.fault !== undefined && raw.fault !== 'lost-response'))
      return fail('FC-INPUT', 'INVALID_DISPATCH_REQUEST');
    const permit = permitFor(raw.operation, raw.ordinal);
    if (!permit.ok) return permit;
    const route = operationRoute(permit.value.type);
    if (!route.ok) return route;
    const key = `${permit.value.operation}\0${permit.value.ordinal}`;
    if (dispatched.has(key)) return fail('FC-EFFECT', 'DUPLICATE_DISPATCH');
    const mechanism = SCRIPTED_MECHANISMS[route.value.port];
    const attestation = validateAttestation(raw.attestation, permit.value, mechanism);
    if (!attestation.ok) return attestation;
    dispatched.add(key);
    invocations.push(
      Object.freeze({
        operation: permit.value.operation,
        ordinal: permit.value.ordinal,
        port: route.value.port,
        mechanism,
        effect: route.value.effect,
        result: raw.fault === 'lost-response' ? 'lost-response' : 'returned',
      }),
    );
    if (raw.fault === 'lost-response') return fail('FC-MECHANISM', 'RESULT_UNCERTAIN');
    return ok(Object.freeze({ port: route.value.port, attestation: attestation.value }));
  };

  const lookup = (
    input: unknown,
  ): Result<Readonly<{ effectOperation: string; observationOperation: string; outcome: string; digest: string }>> => {
    const raw = fields(input, ['effectOperation', 'observationOperation', 'ordinal', 'outcome', 'attestation']);
    if (
      !raw ||
      typeof raw.effectOperation !== 'string' ||
      raw.effectOperation === raw.observationOperation ||
      (raw.outcome !== 'confirmed-effect' && raw.outcome !== 'confirmed-absence' && raw.outcome !== 'indeterminate')
    )
      return fail('FC-INPUT', 'INVALID_RECONCILIATION_LOOKUP');
    const permit = permitFor(raw.observationOperation, raw.ordinal);
    if (!permit.ok) return permit;
    const route = operationRoute(permit.value.type);
    if (!route.ok || route.value.effect !== 'observation')
      return fail('FC-EFFECT', 'RECONCILIATION_REQUIRES_OBSERVATION');
    const mechanism = SCRIPTED_MECHANISMS[route.value.port];
    const attestation = validateAttestation(raw.attestation, permit.value, mechanism);
    if (!attestation.ok) return attestation;
    const key = `${permit.value.operation}\0${permit.value.ordinal}`;
    if (dispatched.has(key)) return fail('FC-EFFECT', 'DUPLICATE_DISPATCH');
    dispatched.add(key);
    invocations.push(
      Object.freeze({
        operation: permit.value.operation,
        ordinal: permit.value.ordinal,
        port: route.value.port,
        mechanism,
        effect: 'observation',
        result: 'returned',
      }),
    );
    return ok(
      Object.freeze({
        effectOperation: raw.effectOperation,
        observationOperation: permit.value.operation,
        outcome: raw.outcome,
        digest: attestation.value.observation.digest,
      }),
    );
  };

  return Object.freeze({
    dispatch,
    lookup,
    invocations: () => Object.freeze([...invocations]),
  });
}
