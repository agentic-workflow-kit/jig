import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  realpathSync,
  unlinkSync,
  writeSync,
} from 'node:fs';

/** Exact owner-selected authority manifest. Construction still fails closed below. */
export const LOCAL_FILE_ARTIFACT_MANIFEST = new TextEncoder().encode(
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[{"mode":"immutable-create-read-no-move-no-alias-no-dispose","root":"<JIG_DATA_HOME>/artifacts/protected"},{"mode":"immutable-create-read-two-pin-lookup-guarded-dispose","root":"<JIG_DATA_HOME>/artifacts/disposable"}],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":[],"networkAuthority":[],"providerIdentity":"local-file-artifact-provider/v1","runtimeAuthority":{"environment":"local-user-machine/v1","kind":"artifact-port-only","package":"packages/local-file-providers"},"scope":{"phase":2,"purpose":"local-file-artifact-provider","story":"GF-026"},"subprocessAuthority":[]}\n',
);
export const LOCAL_FILE_ARTIFACT_MANIFEST_DIGEST = '34a4035163a3b67d51e518f96307622ed043753832eb434872cb089c7b94f2df';
export const LOCAL_FILE_ARTIFACT_MANIFEST_ID =
  'provider/29398e4851f5eed7fcca59f7f9eb84869cf34a70545349f227adabe41483227e/authority/34a4035163a3b67d51e518f96307622ed043753832eb434872cb089c7b94f2df';
export const LOCAL_FILE_ARTIFACT_ROOTS = Object.freeze({
  protected: '<JIG_DATA_HOME>/artifacts/protected',
  disposable: '<JIG_DATA_HOME>/artifacts/disposable',
});

export const ARTIFACT_WAIT_DEFAULT_MS = 900_000;
export const ARTIFACT_WAIT_MIN_MS = 5_000;
export const ARTIFACT_WAIT_MAX_MS = 7_200_000;
export const ARTIFACT_RETRY_DEFAULT = 3;
export const ARTIFACT_RETRY_MIN = 1;
export const ARTIFACT_RETRY_MAX = 5;
export const ARTIFACT_WITNESS_WAIT_DEFAULT_MS = 30_000;
export const ARTIFACT_WITNESS_WAIT_MIN_MS = 1_000;
export const ARTIFACT_WITNESS_WAIT_MAX_MS = 300_000;
export const ARTIFACT_RECOVERY_DEFAULT = 3;
export const ARTIFACT_RECOVERY_MIN = 1;
export const ARTIFACT_RECOVERY_MAX = 5;

export type LocalFileArtifactFailure = Readonly<{
  family:
    | 'FC-INPUT'
    | 'FC-SUBJECT'
    | 'FC-EVIDENCE'
    | 'FC-AUTHORITY'
    | 'FC-FENCE'
    | 'FC-MECHANISM'
    | 'FC-EFFECT'
    | 'FC-TRUST';
  code: string;
}>;
export type LocalFileArtifactResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: LocalFileArtifactFailure }>;
export type LocalFileArtifactFact = Readonly<{
  operation: string;
  mode: 'put' | 'release-pin' | 'dispose-bytes';
  position: number;
  headDigest: string;
  binding: string;
}>;
export type LocalFileArtifactCurrency = Readonly<{
  position: number;
  headDigest: string;
  protectedPosition: number;
  protectedHead: string;
}>;
type Context = keyof typeof LOCAL_FILE_ARTIFACT_ROOTS;
type Mode = LocalFileArtifactFact['mode'] | 'get';
type Binding = Readonly<{
  resourceScope: string;
  subject: string;
  digest: string;
  fence: string;
  holder: string;
  operation: string;
  mode: Mode;
  detail?: string;
}>;
type Pin = Readonly<{ holder: string; tuple: string }>;
type Pins = Readonly<{ temporary: Pin; intended: Pin }>;
type Registration = {
  key: string;
  binding: Binding;
  pins: Pins;
  live: Set<'temporary' | 'intended'>;
  retired: Set<'temporary' | 'intended'>;
};
type StoredOperation = Readonly<{ fact: LocalFileArtifactFact; binding: string; uncertain: boolean }>;
type Fault = 'crash-before-effect' | 'lost-ack';

const PROTECTED = new Set([
  'SCH-ENVELOPE',
  'SCH-WORK-PROFILE',
  'SCH-CONFIG-ARTIFACT',
  'SCH-INTAKE-ACK',
  'SCH-CAPABILITY-PROOF',
]);
const DISPOSABLE = new Set([
  'SCH-EVIDENCE',
  'SCH-AUDIT-EXPORT',
  'EV-ARTIFACT-FACT',
  'SCH-VERDICT',
  'SCH-DECISION/EV-OWNER-DECISION',
  'SCH-OBLIGATION',
]);
const ZERO_DIGEST = '0'.repeat(64);
const fail = (family: LocalFileArtifactFailure['family'], code: string): LocalFileArtifactResult<never> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const ok = <T>(value: T): LocalFileArtifactResult<T> => Object.freeze({ ok: true, value });
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 512;
const subject = (value: unknown): value is string =>
  typeof value === 'string' && /^artifact\/[a-z0-9](?:[a-z0-9._/-]{0,126}[a-z0-9])?$/iu.test(value);
const hash = (value: string | Uint8Array) => {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
    0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
    0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2,
  ];
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const bitLength = BigInt(bytes.length) * 8n;
  for (let index = 0; index < 8; index += 1)
    padded[padded.length - 1 - index] = Number((bitLength >> BigInt(index * 8)) & 255n);
  let state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const right = (part: number, amount: number) => (part >>> amount) | (part << (32 - amount));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Array<number>(64).fill(0);
    for (let index = 0; index < 16; index += 1)
      words[index] =
        ((padded[offset + index * 4] ?? 0) << 24) |
        ((padded[offset + index * 4 + 1] ?? 0) << 16) |
        ((padded[offset + index * 4 + 2] ?? 0) << 8) |
        (padded[offset + index * 4 + 3] ?? 0);
    for (let index = 16; index < 64; index += 1) {
      const first = words[index - 15] ?? 0;
      const second = words[index - 2] ?? 0;
      words[index] =
        (((right(first, 7) ^ right(first, 18) ^ (first >>> 3)) + (words[index - 16] ?? 0)) | 0) +
        ((right(second, 17) ^ right(second, 19) ^ (second >>> 10)) + (words[index - 7] ?? 0));
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const first =
        (h +
          (right(e, 6) ^ right(e, 11) ^ right(e, 25)) +
          ((e & f) ^ (~e & g)) +
          (constants[index] ?? 0) +
          (words[index] ?? 0)) |
        0;
      const second = ((right(a, 2) ^ right(a, 13) ^ right(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + first) | 0;
      d = c;
      c = b;
      b = a;
      a = (first + second) | 0;
    }
    const next = [a, b, c, d, e, f, g, h];
    state = state.map((part, index) => (part + (next[index] ?? 0)) | 0);
  }
  return state.map((part) => (part >>> 0).toString(16).padStart(8, '0')).join('');
};
const canonical = (value: unknown) => JSON.stringify(value);

/** Holder class, never caller-selected context, determines the physical root. */
export function localFileArtifactRoute(
  holder: unknown,
): LocalFileArtifactResult<Readonly<{ context: Context; root: string }>> {
  const context: Context | undefined =
    typeof holder === 'string' && PROTECTED.has(holder)
      ? 'protected'
      : typeof holder === 'string' && DISPOSABLE.has(holder)
        ? 'disposable'
        : undefined;
  return context
    ? ok(Object.freeze({ context, root: LOCAL_FILE_ARTIFACT_ROOTS[context] }))
    : fail('FC-SUBJECT', 'UNKNOWN_HOLDER_CLASS');
}

/** Effect-free complete-set validation used before disposable persistence. */
export function validateLocalFileArtifactPut(input: unknown): LocalFileArtifactResult<void> {
  const value = fields(input, ['holder', 'pins']);
  const route = value && localFileArtifactRoute(value.holder);
  if (!value || !route?.ok || route.value.context !== 'disposable')
    return fail('FC-INPUT', 'DISPOSABLE_HOLDER_REQUIRED');
  const pins = exactPins(value.pins, value.holder as string);
  return pins.ok ? ok(undefined) : pins;
}

export type LocalFileArtifactOracle = Readonly<{
  resourceScope: string;
  roots: Readonly<{ protected: string; disposable: string }>;
  contextFor(holder: unknown): LocalFileArtifactResult<Context>;
  putProtected(request: unknown, fault?: Fault): LocalFileArtifactResult<Readonly<{ digest: string }>>;
  getProtected(request: unknown): LocalFileArtifactResult<Readonly<{ bytes: Uint8Array; digest: string }>>;
  putDisposable(request: unknown, fault?: Fault): LocalFileArtifactResult<LocalFileArtifactFact>;
  get(request: unknown): LocalFileArtifactResult<Readonly<{ bytes: Uint8Array; digest: string }>>;
  adopt(request: unknown): LocalFileArtifactResult<void>;
  reject(request: unknown): LocalFileArtifactResult<void>;
  retire(request: unknown): LocalFileArtifactResult<void>;
  release(request: unknown, fault?: Fault): LocalFileArtifactResult<LocalFileArtifactFact>;
  dispose(request: unknown, fault?: Fault): LocalFileArtifactResult<LocalFileArtifactFact>;
  acknowledge(fact: unknown): LocalFileArtifactResult<void>;
  reconcile(request: unknown): LocalFileArtifactResult<LocalFileArtifactFact | Readonly<{ kind: 'absent' }>>;
  snapshot(): Readonly<unknown>;
}>;

export type LocalFileArtifactOracleOptions = Readonly<{
  protectedRoot: string;
  disposableRoot: string;
  resourceScope: string;
  witness: Readonly<{ read(): unknown }>;
  intent: Readonly<{ recorded(operation: string, mode: LocalFileArtifactFact['mode'], binding: string): boolean }>;
}>;

/**
 * Conformance-only friend bridge. It accepts isolated roots and read-only mediator/witness views;
 * it neither configures the selected provider nor gains ledger or registry mutation authority.
 */
export function createLocalFileArtifactConformanceOracle(
  options: LocalFileArtifactOracleOptions,
): LocalFileArtifactResult<LocalFileArtifactOracle> {
  return createOracle(options);
}

export function restoreLocalFileArtifactConformanceOracle(
  options: LocalFileArtifactOracleOptions,
  snapshot: unknown,
): LocalFileArtifactResult<LocalFileArtifactOracle> {
  return createOracle(options, snapshot);
}

/** Selected construction remains unreachable until the independent file witness is qualified. */
export function createQualifiedLocalFileArtifactProvider(): LocalFileArtifactResult<never> {
  return fail('FC-MECHANISM', 'PROVIDER_UNAVAILABLE_UNQUALIFIED_WITNESS');
}

function createOracle(
  options: LocalFileArtifactOracleOptions,
  restored?: unknown,
): LocalFileArtifactResult<LocalFileArtifactOracle> {
  if (!text(options.resourceScope) || !text(options.protectedRoot) || !text(options.disposableRoot))
    return fail('FC-INPUT', 'INVALID_ORACLE_CONFIGURATION');
  if (
    options.protectedRoot === LOCAL_FILE_ARTIFACT_ROOTS.protected ||
    options.disposableRoot === LOCAL_FILE_ARTIFACT_ROOTS.disposable
  )
    return fail('FC-AUTHORITY', 'CONFORMANCE_ORACLE_CANNOT_CONFIGURE_SELECTED_ROOTS');
  let roots: Readonly<{ protected: string; disposable: string }>;
  try {
    mkdirSync(options.protectedRoot, { recursive: true, mode: 0o700 });
    mkdirSync(options.disposableRoot, { recursive: true, mode: 0o700 });
    const protectedRoot = checkedRoot(options.protectedRoot);
    const disposableRoot = checkedRoot(options.disposableRoot);
    if (protectedRoot === disposableRoot) return fail('FC-AUTHORITY', 'CONTEXT_ALIAS_FORBIDDEN');
    roots = Object.freeze({ protected: protectedRoot, disposable: disposableRoot });
    if (
      roots.protected === LOCAL_FILE_ARTIFACT_ROOTS.protected ||
      roots.disposable === LOCAL_FILE_ARTIFACT_ROOTS.disposable
    )
      return fail('FC-AUTHORITY', 'CONFORMANCE_ORACLE_CANNOT_CONFIGURE_SELECTED_ROOTS');
  } catch {
    return fail('FC-MECHANISM', 'ARTIFACT_ROOT_UNAVAILABLE');
  }

  const registrations = new Map<string, Registration>();
  const operations = new Map<string, StoredOperation>();
  const journal: Record<string, unknown>[] = [];
  let position = -1;
  let headDigest = ZERO_DIGEST;
  let protectedPosition = -1;
  let protectedHead = ZERO_DIGEST;

  const currency = (): LocalFileArtifactCurrency =>
    Object.freeze({ position, headDigest, protectedPosition, protectedHead });
  const witnessCurrency = (): LocalFileArtifactResult<LocalFileArtifactCurrency> => {
    const value = fields(options.witness.read(), ['position', 'headDigest', 'protectedPosition', 'protectedHead']);
    return value &&
      Number.isSafeInteger(value.position) &&
      Number.isSafeInteger(value.protectedPosition) &&
      digest(value.headDigest) &&
      digest(value.protectedHead)
      ? ok(Object.freeze(value as LocalFileArtifactCurrency))
      : fail('FC-TRUST', 'WITNESS_UNVERIFIABLE');
  };
  const requireCurrentWitness = (): LocalFileArtifactResult<void> => {
    const observed = witnessCurrency();
    const expected = currency();
    return observed.ok && canonical(observed.value) === canonical(expected)
      ? ok(undefined)
      : fail('FC-TRUST', 'WITNESS_NOT_CURRENT');
  };
  const record = (bindingValue: Binding, uncertain: boolean): LocalFileArtifactFact => {
    const operationKey = `${bindingValue.operation}/${bindingValue.mode}`;
    const existing = operations.get(operationKey);
    if (existing) return existing.fact;
    position += 1;
    headDigest = hash(`${headDigest}\0${canonical(bindingValue)}`);
    const fact = Object.freeze({
      operation: bindingValue.operation,
      mode: bindingValue.mode as LocalFileArtifactFact['mode'],
      position,
      headDigest,
      binding: canonical(bindingValue),
    });
    operations.set(operationKey, Object.freeze({ fact, binding: fact.binding, uncertain }));
    return fact;
  };
  const intent = (bindingValue: Binding): LocalFileArtifactResult<void> => {
    try {
      return options.intent.recorded(
        bindingValue.operation,
        bindingValue.mode as LocalFileArtifactFact['mode'],
        canonical(bindingValue),
      )
        ? ok(undefined)
        : fail('FC-AUTHORITY', 'DURABLE_INTENT_REQUIRED');
    } catch {
      return fail('FC-TRUST', 'INTENT_EVIDENCE_UNVERIFIABLE');
    }
  };
  const registered = (input: Record<string, unknown>, bindingValue: Binding): LocalFileArtifactResult<Registration> => {
    const pins = exactPins(input.pins, bindingValue.holder);
    if (!pins.ok || !text(input.putOperation)) return fail('FC-EVIDENCE', 'EXACT_REGISTRATION_REQUIRED');
    const registration = registrations.get(registrationKey(bindingValue, input.putOperation, pins.value));
    return registration ? ok(registration) : fail('FC-EVIDENCE', 'REGISTRATION_ABSENT');
  };
  const effectFailure = (fault: Fault | undefined): LocalFileArtifactResult<never> | undefined =>
    fault === 'crash-before-effect' ? fail('FC-MECHANISM', 'PROVED_ABSENT_BEFORE_EFFECT') : undefined;

  const store: LocalFileArtifactOracle = Object.freeze({
    resourceScope: options.resourceScope,
    roots,
    contextFor(holder) {
      const route = routeContext(holder);
      return route ? ok(route) : fail('FC-SUBJECT', 'UNKNOWN_HOLDER_CLASS');
    },
    putProtected(request, fault) {
      const value = fields(request, [
        'resourceScope',
        'subject',
        'digest',
        'fence',
        'holder',
        'operation',
        'mode',
        'bytes',
      ]);
      const bound = binding(value, 'put', options.resourceScope);
      if (
        !value ||
        !bound.ok ||
        routeContext(bound.value.holder) !== 'protected' ||
        !safeBytes(value.bytes) ||
        hash(value.bytes) !== bound.value.digest
      )
        return fail('FC-INPUT', 'INVALID_PROTECTED_CB_STORE');
      const prior = operations.get(`${bound.value.operation}/put`);
      if (prior)
        return prior.binding === canonical(bound.value)
          ? fail('FC-TRUST', 'RECONCILE_REQUIRED')
          : fail('FC-FENCE', 'OPERATION_BINDING_MISMATCH');
      const authorized = intent(bound.value);
      if (!authorized.ok) return authorized;
      const interrupted = effectFailure(fault);
      if (interrupted) return interrupted;
      try {
        immutablePut(artifactPath(roots.protected, bound.value.digest), value.bytes);
      } catch {
        return fail('FC-EFFECT', 'PROTECTED_WRITE_UNCERTAIN');
      }
      protectedPosition += 1;
      protectedHead = hash(`${protectedHead}\0${canonical(bound.value)}`);
      const fact = record(bound.value, fault === 'lost-ack');
      journal.push({ kind: 'protected', request: serializable(value), fact });
      return fault === 'lost-ack'
        ? fail('FC-EFFECT', 'ACK_LOST_RECONCILE_REQUIRED')
        : ok(Object.freeze({ digest: bound.value.digest }));
    },
    getProtected(request) {
      const value = fields(request, ['resourceScope', 'subject', 'digest', 'fence', 'holder', 'operation', 'mode']);
      const bound = binding(value, 'get', options.resourceScope);
      if (!value || !bound.ok || routeContext(bound.value.holder) !== 'protected')
        return fail('FC-INPUT', 'INVALID_PROTECTED_GET');
      return readFromRoot(roots.protected, bound.value.digest);
    },
    putDisposable(request, fault) {
      const value = fields(request, [
        'resourceScope',
        'subject',
        'digest',
        'fence',
        'holder',
        'operation',
        'mode',
        'bytes',
        'pins',
      ]);
      const bound = binding(value, 'put', options.resourceScope);
      if (
        !value ||
        !bound.ok ||
        routeContext(bound.value.holder) !== 'disposable' ||
        !safeBytes(value.bytes) ||
        hash(value.bytes) !== bound.value.digest
      )
        return fail('FC-INPUT', 'INVALID_DISPOSABLE_CB_STORE');
      const pins = exactPins(value.pins, bound.value.holder);
      if (!pins.ok) return pins;
      const exactBinding = Object.freeze({ ...bound.value, detail: canonical(pins.value) });
      const prior = operations.get(`${bound.value.operation}/put`);
      if (prior)
        return prior.binding === canonical(exactBinding)
          ? fail('FC-TRUST', 'RECONCILE_REQUIRED')
          : fail('FC-FENCE', 'OPERATION_BINDING_MISMATCH');
      const authorized = intent(exactBinding);
      if (!authorized.ok) return authorized;
      const interrupted = effectFailure(fault);
      if (interrupted) return interrupted;
      const registration: Registration = {
        key: registrationKey(bound.value, bound.value.operation, pins.value),
        binding: bound.value,
        pins: pins.value,
        live: new Set(['temporary', 'intended']),
        retired: new Set(),
      };
      try {
        immutablePut(artifactPath(roots.disposable, bound.value.digest), value.bytes);
      } catch {
        return fail('FC-EFFECT', 'ARTIFACT_WRITE_UNCERTAIN');
      }
      registrations.set(registration.key, registration);
      const fact = record(exactBinding, fault === 'lost-ack');
      journal.push({ kind: 'put', request: serializable(value), fact });
      return fault === 'lost-ack' ? fail('FC-EFFECT', 'ACK_LOST_RECONCILE_REQUIRED') : ok(fact);
    },
    get(request) {
      const value = fields(request, [
        'resourceScope',
        'subject',
        'digest',
        'fence',
        'holder',
        'operation',
        'mode',
        'putOperation',
        'pins',
      ]);
      const bound = binding(value, 'get', options.resourceScope);
      if (!value || !bound.ok || routeContext(bound.value.holder) !== 'disposable')
        return fail('FC-INPUT', 'INVALID_GET');
      const registration = registered(value, bound.value);
      if (!registration.ok) return registration;
      return readFromRoot(roots.disposable, bound.value.digest);
    },
    adopt(request) {
      return retireTransition(
        request,
        'temporary',
        registrations,
        requireCurrentWitness,
        options.resourceScope,
        journal,
      );
    },
    reject(request) {
      const value = fields(request, [
        'resourceScope',
        'subject',
        'digest',
        'fence',
        'holder',
        'operation',
        'mode',
        'putOperation',
        'pins',
        'fact',
        'temporaryProof',
        'intendedProof',
      ]);
      const bound = binding(value, 'put', options.resourceScope);
      if (!value || !bound.ok) return fail('FC-INPUT', 'INVALID_REJECTION');
      const registration = registered(value, bound.value);
      if (!registration.ok) return registration;
      const current = requireCurrentWitness();
      if (!current.ok) return current;
      for (const [role, proof] of [
        ['temporary', value.temporaryProof],
        ['intended', value.intendedProof],
      ] as const) {
        const verified = exactTransitionProof(proof, registration.value, role, value.fact);
        if (!verified.ok) return verified;
        registration.value.retired.add(role);
      }
      journal.push({ kind: 'reject', request: serializable(value) });
      return ok(undefined);
    },
    retire(request) {
      return retireTransition(
        request,
        'intended',
        registrations,
        requireCurrentWitness,
        options.resourceScope,
        journal,
      );
    },
    release(request, fault) {
      const value = fields(request, [
        'resourceScope',
        'subject',
        'digest',
        'fence',
        'holder',
        'operation',
        'mode',
        'pin',
        'putOperation',
        'pins',
      ]);
      const bound = binding(value, 'release-pin', options.resourceScope);
      if (!value || !bound.ok || routeContext(bound.value.holder) !== 'disposable' || !text(value.pin))
        return fail('FC-INPUT', 'INVALID_RELEASE');
      const registration = registered(value, bound.value);
      if (!registration.ok) return registration;
      const role =
        registration.value.pins.temporary.tuple === value.pin
          ? 'temporary'
          : registration.value.pins.intended.tuple === value.pin
            ? 'intended'
            : undefined;
      if (!role || !registration.value.live.has(role) || !registration.value.retired.has(role))
        return fail('FC-AUTHORITY', 'RELEASE_NOT_RETIRED');
      const current = requireCurrentWitness();
      if (!current.ok) return current;
      const exactBinding = Object.freeze({
        ...bound.value,
        detail: canonical({ registration: registration.value.key, pin: value.pin }),
      });
      const prior = operations.get(`${bound.value.operation}/release-pin`);
      if (prior)
        return prior.binding === canonical(exactBinding)
          ? fail('FC-TRUST', 'RECONCILE_REQUIRED')
          : fail('FC-FENCE', 'OPERATION_BINDING_MISMATCH');
      const authorized = intent(exactBinding);
      if (!authorized.ok) return authorized;
      const interrupted = effectFailure(fault);
      if (interrupted) return interrupted;
      registration.value.live.delete(role);
      const fact = record(exactBinding, fault === 'lost-ack');
      journal.push({ kind: 'release', request: serializable(value), fact });
      return fault === 'lost-ack' ? fail('FC-EFFECT', 'ACK_LOST_RECONCILE_REQUIRED') : ok(fact);
    },
    dispose(request, fault) {
      const value = fields(request, [
        'resourceScope',
        'subject',
        'digest',
        'fence',
        'holder',
        'operation',
        'mode',
        'facts',
        'putOperation',
        'pins',
      ]);
      const bound = binding(value, 'dispose-bytes', options.resourceScope);
      const guards = value && fields(value.facts, ['owner', 'settlement', 'preservation', 'retention', 'obligations']);
      if (
        !value ||
        !bound.ok ||
        routeContext(bound.value.holder) !== 'disposable' ||
        !guards ||
        !text(guards.owner) ||
        guards.settlement !== 'settled' ||
        guards.preservation !== 'preserved' ||
        guards.retention !== 'expired' ||
        guards.obligations !== 'none'
      )
        return fail('FC-AUTHORITY', 'DISPOSAL_GUARDS_REQUIRED');
      const registration = registered(value, bound.value);
      if (!registration.ok) return registration;
      if (
        [...registrations.values()].some(
          (candidate) => candidate.binding.digest === bound.value.digest && candidate.live.size > 0,
        )
      )
        return fail('FC-AUTHORITY', 'LIVE_PIN_PRESENT');
      const current = requireCurrentWitness();
      if (!current.ok) return current;
      const prior = operations.get(`${bound.value.operation}/dispose-bytes`);
      if (prior)
        return prior.binding === canonical(bound.value)
          ? fail('FC-TRUST', 'RECONCILE_REQUIRED')
          : fail('FC-FENCE', 'OPERATION_BINDING_MISMATCH');
      const authorized = intent(bound.value);
      if (!authorized.ok) return authorized;
      const interrupted = effectFailure(fault);
      if (interrupted) return interrupted;
      try {
        const path = artifactPath(roots.disposable, bound.value.digest);
        if (!readArtifact(path, bound.value.digest).ok) return fail('FC-TRUST', 'DISPOSAL_TARGET_UNVERIFIABLE');
        unlinkSync(path);
      } catch {
        return fail('FC-EFFECT', 'DISPOSAL_EFFECT_UNCERTAIN');
      }
      const fact = record(bound.value, fault === 'lost-ack');
      journal.push({ kind: 'dispose', request: serializable(value), fact });
      return fault === 'lost-ack' ? fail('FC-EFFECT', 'ACK_LOST_RECONCILE_REQUIRED') : ok(fact);
    },
    acknowledge(input) {
      const fact = exactFact(input);
      if (!fact.ok) return fact;
      const current = operations.get(`${fact.value.operation}/${fact.value.mode}`)?.fact;
      if (!current || canonical(current) !== canonical(fact.value)) return fail('FC-EVIDENCE', 'INVALID_ARTIFACT_FACT');
      return requireCurrentWitness();
    },
    reconcile(request) {
      return reconcile(request, registrations, operations, options.resourceScope);
    },
    snapshot() {
      const state = {
        version: 1,
        roots,
        resourceScope: options.resourceScope,
        currency: currency(),
        registrations: [...registrations.values()].map((item) => ({
          key: item.key,
          binding: item.binding,
          pins: item.pins,
          live: [...item.live].sort(),
          retired: [...item.retired].sort(),
        })),
        operations: [...operations.entries()],
        journal: structuredClone(journal),
      };
      return deepFreeze({ state, stateDigest: hash(canonical(state)) });
    },
  });

  if (restored !== undefined) {
    const restoredState = restoreState(restored, roots, options.resourceScope, witnessCurrency());
    if (!restoredState.ok) return restoredState;
    position = restoredState.value.currency.position;
    headDigest = restoredState.value.currency.headDigest;
    protectedPosition = restoredState.value.currency.protectedPosition;
    protectedHead = restoredState.value.currency.protectedHead;
    for (const item of restoredState.value.registrations) {
      registrations.set(item.key, {
        key: item.key,
        binding: item.binding,
        pins: item.pins,
        live: new Set(item.live),
        retired: new Set(item.retired),
      });
    }
    for (const [key, value] of restoredState.value.operations) operations.set(key, value);
    journal.push(...restoredState.value.journal);
    for (const registration of registrations.values()) {
      let path: string;
      try {
        path = artifactPath(roots.disposable, registration.binding.digest);
      } catch {
        return fail('FC-TRUST', 'RESTORED_ARTIFACT_MISMATCH');
      }
      const noLivePins = ![...registrations.values()].some(
        (item) => item.binding.digest === registration.binding.digest && item.live.size > 0,
      );
      const disposed = [...operations.values()].some(
        (item) => item.fact.mode === 'dispose-bytes' && item.fact.binding.includes(registration.binding.digest),
      );
      if (disposed && noLivePins ? existsSync(path) : !readArtifact(path, registration.binding.digest).ok)
        return fail('FC-TRUST', 'RESTORED_ARTIFACT_MISMATCH');
    }
    for (const entry of restoredState.value.journal) {
      const item = fields(entry, ['kind', 'request']) ?? fields(entry, ['kind', 'request', 'fact']);
      if (item?.kind !== 'protected') continue;
      const request = item.request as Record<string, unknown>;
      if (!digest(request.digest) || !readFromRoot(roots.protected, request.digest).ok)
        return fail('FC-TRUST', 'RESTORED_PROTECTED_ARTIFACT_MISMATCH');
    }
  }
  return ok(store);
}

function checkedRoot(path: string): string {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('unsafe root');
  return realpathSync(path);
}

function artifactPath(root: string, artifactDigest: string): string {
  if (!digest(artifactDigest) || checkedRoot(root) !== root) throw new Error('artifact root changed');
  return `${root}/${artifactDigest}.artifact`;
}

function immutablePut(path: string, bytes: Uint8Array): void {
  if (existsSync(path)) {
    const existing = readArtifact(path, hash(bytes));
    if (!existing.ok || Buffer.compare(existing.value.bytes, bytes) !== 0) throw new Error('immutable collision');
    return;
  }
  const fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  try {
    let offset = 0;
    while (offset < bytes.byteLength) offset += writeSync(fd, bytes, offset, bytes.byteLength - offset, offset);
    fsyncSync(fd);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size !== bytes.byteLength) throw new Error('unsafe artifact');
  } finally {
    closeSync(fd);
  }
}

function readArtifact(
  path: string,
  expected: string,
): LocalFileArtifactResult<Readonly<{ bytes: Uint8Array; digest: string }>> {
  let fd: number | undefined;
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) return fail('FC-TRUST', 'UNSAFE_ARTIFACT_FILE');
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(fd);
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      opened.dev !== stat.dev ||
      opened.ino !== stat.ino ||
      opened.size <= 0 ||
      opened.size > 65_536
    )
      return fail('FC-EVIDENCE', 'INVALID_ARTIFACT_BYTES');
    const bytes = new Uint8Array(opened.size);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const count = readSync(fd, bytes, offset, bytes.byteLength - offset, offset);
      if (count <= 0) return fail('FC-EFFECT', 'ARTIFACT_READ_INCOMPLETE');
      offset += count;
    }
    return hash(bytes) === expected
      ? ok(Object.freeze({ bytes, digest: expected }))
      : fail('FC-EVIDENCE', 'ARTIFACT_DIGEST_MISMATCH');
  } catch {
    return fail('FC-EVIDENCE', 'ARTIFACT_ABSENT');
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function readFromRoot(
  root: string,
  expected: string,
): LocalFileArtifactResult<Readonly<{ bytes: Uint8Array; digest: string }>> {
  try {
    return readArtifact(artifactPath(root, expected), expected);
  } catch {
    return fail('FC-TRUST', 'ARTIFACT_ROOT_CHANGED');
  }
}

function routeContext(holder: unknown): Context | undefined {
  return typeof holder === 'string' && PROTECTED.has(holder)
    ? 'protected'
    : typeof holder === 'string' && DISPOSABLE.has(holder)
      ? 'disposable'
      : undefined;
}

function fields(value: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== names.length || keys.some((key) => typeof key !== 'string')) return undefined;
    const sorted = [...names].sort();
    if (![...keys].sort().every((key, index) => key === sorted[index])) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (!names.every((name) => descriptors[name]?.enumerable && 'value' in descriptors[name])) return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
  } catch {
    return undefined;
  }
}

function binding(
  value: Record<string, unknown> | undefined,
  mode: Mode,
  resourceScope: string,
): LocalFileArtifactResult<Binding> {
  if (
    !value ||
    value.resourceScope !== resourceScope ||
    !subject(value.subject) ||
    !digest(value.digest) ||
    !text(value.fence) ||
    !text(value.holder) ||
    !text(value.operation) ||
    value.mode !== mode
  )
    return fail('FC-SUBJECT', 'INVALID_CB_STORE_BINDING');
  if (!routeContext(value.holder)) return fail('FC-SUBJECT', 'UNKNOWN_HOLDER_CLASS');
  return ok(
    Object.freeze({
      resourceScope,
      subject: value.subject,
      digest: value.digest,
      fence: value.fence,
      holder: value.holder,
      operation: value.operation,
      mode,
    }),
  );
}

function exactPins(value: unknown, holder: string): LocalFileArtifactResult<Pins> {
  const pins = fields(value, ['temporary', 'intended']);
  const temporary = pins && fields(pins.temporary, ['holder', 'tuple']);
  const intended = pins && fields(pins.intended, ['holder', 'tuple']);
  return temporary &&
    intended &&
    temporary.holder === 'EV-ARTIFACT-FACT' &&
    intended.holder === holder &&
    text(temporary.tuple) &&
    text(intended.tuple) &&
    temporary.tuple !== intended.tuple
    ? ok(
        Object.freeze({
          temporary: Object.freeze({ holder: temporary.holder, tuple: temporary.tuple }),
          intended: Object.freeze({ holder: intended.holder, tuple: intended.tuple }),
        }),
      )
    : fail('FC-EVIDENCE', 'EXACT_TWO_PIN_SET_REQUIRED');
}

function registrationKey(bindingValue: Binding, putOperation: unknown, pins: Pins): string {
  return canonical({
    resourceScope: bindingValue.resourceScope,
    subject: bindingValue.subject,
    digest: bindingValue.digest,
    fence: bindingValue.fence,
    holder: bindingValue.holder,
    putOperation,
    pins,
  });
}

function exactFact(input: unknown): LocalFileArtifactResult<LocalFileArtifactFact> {
  const value = fields(input, ['operation', 'mode', 'position', 'headDigest', 'binding']);
  return value &&
    text(value.operation) &&
    ['put', 'release-pin', 'dispose-bytes'].includes(String(value.mode)) &&
    Number.isSafeInteger(value.position) &&
    Number(value.position) >= 0 &&
    digest(value.headDigest) &&
    typeof value.binding === 'string' &&
    value.binding.length > 0 &&
    value.binding.length <= 4_096
    ? ok(Object.freeze(value as LocalFileArtifactFact))
    : fail('FC-EVIDENCE', 'INVALID_ARTIFACT_FACT');
}

function exactTransitionProof(
  input: unknown,
  registration: Registration,
  role: 'temporary' | 'intended',
  factInput: unknown,
): LocalFileArtifactResult<void> {
  const fact = exactFact(factInput);
  const proof = fields(input, [
    'transition',
    'registration',
    'role',
    'holder',
    'tuple',
    'subject',
    'fence',
    'fact',
    'digest',
  ]);
  if (!fact.ok || !proof) return fail('FC-AUTHORITY', 'EXACT_RETIREMENT_TRANSITION_REQUIRED');
  const pin = registration.pins[role];
  let factMatchesRegistration = false;
  if (fact.value.mode === 'put') {
    factMatchesRegistration =
      fact.value.operation === registration.binding.operation &&
      fact.value.binding === canonical({ ...registration.binding, detail: canonical(registration.pins) });
  } else if (fact.value.mode === 'release-pin') {
    try {
      const parsed = JSON.parse(fact.value.binding) as { detail?: string };
      const detail = typeof parsed.detail === 'string' ? (JSON.parse(parsed.detail) as { registration?: string }) : {};
      factMatchesRegistration = detail.registration === registration.key;
    } catch {
      factMatchesRegistration = false;
    }
  }
  const basis = {
    transition: proof.transition,
    registration: registration.key,
    role,
    holder: pin.holder,
    tuple: pin.tuple,
    subject: registration.binding.subject,
    fence: registration.binding.fence,
    fact: fact.value,
  };
  return factMatchesRegistration &&
    text(proof.transition) &&
    proof.registration === registration.key &&
    proof.role === role &&
    proof.holder === pin.holder &&
    proof.tuple === pin.tuple &&
    proof.subject === registration.binding.subject &&
    proof.fence === registration.binding.fence &&
    canonical(proof.fact) === canonical(fact.value) &&
    proof.digest === hash(canonical(basis))
    ? ok(undefined)
    : fail('FC-AUTHORITY', 'EXACT_RETIREMENT_TRANSITION_REQUIRED');
}

function retireTransition(
  request: unknown,
  role: 'temporary' | 'intended',
  registrations: Map<string, Registration>,
  currentWitness: () => LocalFileArtifactResult<void>,
  resourceScope: string,
  journal: Record<string, unknown>[],
): LocalFileArtifactResult<void> {
  const value = fields(request, [
    'resourceScope',
    'subject',
    'digest',
    'fence',
    'holder',
    'operation',
    'mode',
    'putOperation',
    'pins',
    'fact',
    'proof',
  ]);
  const bound = binding(value, 'put', resourceScope);
  if (!value || !bound.ok || routeContext(bound.value.holder) !== 'disposable')
    return fail('FC-INPUT', 'INVALID_RETIREMENT');
  const pins = exactPins(value.pins, bound.value.holder);
  if (!pins.ok || !text(value.putOperation)) return fail('FC-EVIDENCE', 'EXACT_REGISTRATION_REQUIRED');
  const registration = registrations.get(registrationKey(bound.value, value.putOperation, pins.value));
  if (!registration) return fail('FC-EVIDENCE', 'REGISTRATION_ABSENT');
  const current = currentWitness();
  if (!current.ok) return current;
  const proof = exactTransitionProof(value.proof, registration, role, value.fact);
  if (!proof.ok) return proof;
  registration.retired.add(role);
  journal.push({ kind: role === 'temporary' ? 'adopt' : 'retire', request: serializable(value) });
  return ok(undefined);
}

function reconcile(
  request: unknown,
  registrations: Map<string, Registration>,
  operations: Map<string, StoredOperation>,
  resourceScope: string,
): LocalFileArtifactResult<LocalFileArtifactFact | Readonly<{ kind: 'absent' }>> {
  try {
    const mode = (request as Record<string, unknown>)?.mode;
    const names =
      mode === 'put'
        ? ['resourceScope', 'subject', 'digest', 'fence', 'holder', 'operation', 'mode', 'bytes', 'pins']
        : mode === 'release-pin'
          ? [
              'resourceScope',
              'subject',
              'digest',
              'fence',
              'holder',
              'operation',
              'mode',
              'pin',
              'putOperation',
              'pins',
            ]
          : mode === 'dispose-bytes'
            ? [
                'resourceScope',
                'subject',
                'digest',
                'fence',
                'holder',
                'operation',
                'mode',
                'facts',
                'putOperation',
                'pins',
              ]
            : undefined;
    if (!names) return fail('FC-INPUT', 'INVALID_RECONCILIATION');
    const value =
      fields(request, names) ??
      (mode === 'put'
        ? fields(request, ['resourceScope', 'subject', 'digest', 'fence', 'holder', 'operation', 'mode', 'bytes'])
        : undefined);
    const bound = binding(value, mode as Mode, resourceScope);
    if (!value || !bound.ok) return fail('FC-INPUT', 'INVALID_RECONCILIATION');
    let exactBinding: Binding | undefined = bound.value;
    if (mode === 'put') {
      if (routeContext(bound.value.holder) === 'protected') exactBinding = bound.value;
      else {
        const pins = exactPins(value.pins, bound.value.holder);
        exactBinding = pins.ok ? Object.freeze({ ...bound.value, detail: canonical(pins.value) }) : undefined;
      }
    } else if (mode === 'release-pin') {
      const pins = exactPins(value.pins, bound.value.holder);
      const registration =
        pins.ok && text(value.putOperation)
          ? registrations.get(registrationKey(bound.value, value.putOperation, pins.value))
          : undefined;
      exactBinding =
        registration && text(value.pin)
          ? Object.freeze({ ...bound.value, detail: canonical({ registration: registration.key, pin: value.pin }) })
          : undefined;
    }
    if (!exactBinding) return fail('FC-INPUT', 'INVALID_RECONCILIATION');
    const prior = operations.get(`${bound.value.operation}/${mode}`);
    if (!prior) return ok(Object.freeze({ kind: 'absent' as const }));
    return prior.binding === canonical(exactBinding) ? ok(prior.fact) : fail('FC-FENCE', 'OPERATION_BINDING_MISMATCH');
  } catch {
    return fail('FC-INPUT', 'INVALID_RECONCILIATION');
  }
}

type RestoredState = {
  currency: LocalFileArtifactCurrency;
  registrations: Array<{
    key: string;
    binding: Binding;
    pins: Pins;
    live: Array<'temporary' | 'intended'>;
    retired: Array<'temporary' | 'intended'>;
  }>;
  operations: Array<[string, StoredOperation]>;
  journal: Record<string, unknown>[];
};

function restoreState(
  snapshot: unknown,
  roots: Readonly<{ protected: string; disposable: string }>,
  resourceScope: string,
  witness: LocalFileArtifactResult<LocalFileArtifactCurrency>,
): LocalFileArtifactResult<RestoredState> {
  const envelope = fields(snapshot, ['state', 'stateDigest']);
  if (!envelope || !digest(envelope.stateDigest) || hash(canonical(envelope.state)) !== envelope.stateDigest)
    return fail('FC-TRUST', 'RECOVERY_SNAPSHOT_INVALID');
  const state = fields(envelope.state, [
    'version',
    'roots',
    'resourceScope',
    'currency',
    'registrations',
    'operations',
    'journal',
  ]);
  const restoredRoots = state && fields(state.roots, ['protected', 'disposable']);
  const currency = state && fields(state.currency, ['position', 'headDigest', 'protectedPosition', 'protectedHead']);
  if (
    state?.version !== 1 ||
    state.resourceScope !== resourceScope ||
    !restoredRoots ||
    restoredRoots.protected !== roots.protected ||
    restoredRoots.disposable !== roots.disposable ||
    !currency ||
    !Number.isSafeInteger(currency.position) ||
    !Number.isSafeInteger(currency.protectedPosition) ||
    !digest(currency.headDigest) ||
    !digest(currency.protectedHead) ||
    !witness.ok ||
    canonical(witness.value) !== canonical(currency) ||
    !Array.isArray(state.registrations) ||
    !Array.isArray(state.operations) ||
    !Array.isArray(state.journal)
  )
    return fail('FC-TRUST', 'RECOVERY_HEAD_MISMATCH');
  try {
    const registrations = state.registrations.map((input) => {
      const item = fields(input, ['key', 'binding', 'pins', 'live', 'retired']);
      if (!item || !text(item.key) || !Array.isArray(item.live) || !Array.isArray(item.retired)) throw new Error('bad');
      const bound = item.binding as Binding;
      const pins = exactPins(item.pins, bound.holder);
      if (
        !pins.ok ||
        bound.resourceScope !== resourceScope ||
        item.key !== registrationKey(bound, bound.operation, pins.value) ||
        !item.live.every((role) => role === 'temporary' || role === 'intended') ||
        !item.retired.every((role) => role === 'temporary' || role === 'intended')
      )
        throw new Error('bad');
      return {
        key: item.key,
        binding: bound,
        pins: pins.value,
        live: item.live,
        retired: item.retired,
      } as RestoredState['registrations'][number];
    });
    const operations = state.operations.map((input) => {
      if (!Array.isArray(input) || input.length !== 2 || !text(input[0])) throw new Error('bad');
      const item = fields(input[1], ['fact', 'binding', 'uncertain']);
      const fact = item && exactFact(item.fact);
      if (!item || !fact?.ok || item.binding !== fact.value.binding || typeof item.uncertain !== 'boolean')
        throw new Error('bad');
      return [input[0], Object.freeze({ fact: fact.value, binding: item.binding, uncertain: item.uncertain })] as [
        string,
        StoredOperation,
      ];
    });
    const ordered = operations.map(([, item]) => item.fact).sort((left, right) => left.position - right.position);
    let rebuiltHead = ZERO_DIGEST;
    for (let index = 0; index < ordered.length; index += 1) {
      const fact = ordered[index];
      if (!fact || fact.position !== index) throw new Error('bad operation chain');
      rebuiltHead = hash(`${rebuiltHead}\0${fact.binding}`);
    }
    if (currency.position !== ordered.length - 1 || currency.headDigest !== rebuiltHead)
      throw new Error('bad operation head');
    let rebuiltProtectedHead = ZERO_DIGEST;
    let rebuiltProtectedPosition = -1;
    for (const entry of state.journal as Record<string, unknown>[]) {
      const item = fields(entry, ['kind', 'request']) ?? fields(entry, ['kind', 'request', 'fact']);
      if (item?.kind !== 'protected') continue;
      const request = fields(item.request, [
        'resourceScope',
        'subject',
        'digest',
        'fence',
        'holder',
        'operation',
        'mode',
        'bytes',
      ]);
      const bound = binding(request, 'put', resourceScope);
      if (
        !request ||
        !bound.ok ||
        !Array.isArray(request.bytes) ||
        hash(new Uint8Array(request.bytes as number[])) !== bound.value.digest
      )
        throw new Error('bad protected chain');
      rebuiltProtectedPosition += 1;
      rebuiltProtectedHead = hash(`${rebuiltProtectedHead}\0${canonical(bound.value)}`);
    }
    if (currency.protectedPosition !== rebuiltProtectedPosition || currency.protectedHead !== rebuiltProtectedHead)
      throw new Error('bad protected head');
    return ok({
      currency: Object.freeze(currency as LocalFileArtifactCurrency),
      registrations,
      operations,
      journal: state.journal as Record<string, unknown>[],
    });
  } catch {
    return fail('FC-TRUST', 'RECOVERY_SNAPSHOT_INVALID');
  }
}

function safeBytes(value: unknown): value is Uint8Array {
  return (
    value instanceof Uint8Array &&
    value.byteLength > 0 &&
    value.byteLength <= 65_536 &&
    !/(?:secret|token|password|credential|api[_-]?key)/iu.test(new TextDecoder().decode(value))
  );
}

function serializable(value: Record<string, unknown>): Record<string, unknown> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, item instanceof Uint8Array ? [...item] : deepClone(item)]),
    ),
  );
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
