/** Private GF-013 scripted semantic fixture; GF-026 owns providers and configuration. */
declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };

export type ArtifactFailure = Readonly<{
  family: 'FC-INPUT' | 'FC-SUBJECT' | 'FC-EVIDENCE' | 'FC-AUTHORITY' | 'FC-TRUST';
  code: string;
}>;
export type ArtifactResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: ArtifactFailure }>;
export type ArtifactContext = 'protected' | 'disposable';
export type ArtifactFact = Readonly<{
  operation: string;
  mode: 'put' | 'release-pin' | 'dispose-bytes';
  position: number;
  headDigest: string;
  binding: string;
}>;
type Pins = Readonly<{
  temporary: Readonly<{ holder: string; tuple: string }>;
  intended: Readonly<{ holder: string; tuple: string }>;
}>;
type Binding = Readonly<{
  resourceScope: string;
  subject: string;
  digest: string;
  fence: string;
  holder: string;
  operation: string;
  mode: ArtifactFact['mode'];
  detail?: string;
}>;
type StoredOperation = Readonly<{ fact: ArtifactFact; binding: string; pending: boolean }>;
const SCOPE = 'fixture/artifact-resource/v1';
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
const fail = (family: ArtifactFailure['family'], code: string): ArtifactResult<never> => ({
  ok: false,
  error: { family, code },
});
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 512;
const freeze = <T>(value: T): T => Object.freeze(value);
const hash = (value: Uint8Array | string) => {
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
  const length = BigInt(bytes.length) * 8n;
  for (let i = 0; i < 8; i += 1) padded[padded.length - 1 - i] = Number((length >> BigInt(i * 8)) & 255n);
  let state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const right = (v: number, n: number) => (v >>> n) | (v << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Array<number>(64).fill(0);
    for (let i = 0; i < 16; i += 1)
      words[i] =
        ((padded[offset + i * 4] ?? 0) << 24) |
        ((padded[offset + i * 4 + 1] ?? 0) << 16) |
        ((padded[offset + i * 4 + 2] ?? 0) << 8) |
        (padded[offset + i * 4 + 3] ?? 0);
    for (let i = 16; i < 64; i += 1) {
      const a = words[i - 15] ?? 0,
        b = words[i - 2] ?? 0;
      words[i] =
        (((right(a, 7) ^ right(a, 18) ^ (a >>> 3)) + (words[i - 16] ?? 0)) | 0) +
        ((right(b, 17) ^ right(b, 19) ^ (b >>> 10)) + (words[i - 7] ?? 0));
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < 64; i += 1) {
      const first =
          (h +
            (right(e, 6) ^ right(e, 11) ^ right(e, 25)) +
            ((e & f) ^ (~e & g)) +
            (constants[i] ?? 0) +
            (words[i] ?? 0)) |
          0,
        second = ((right(a, 2) ^ right(a, 13) ^ right(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
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
    state = state.map((part, i) => (part + (next[i] ?? 0)) | 0);
  }
  return state.map((part) => (part >>> 0).toString(16).padStart(8, '0')).join('');
};
function fields(input: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  try {
    const object = input as object;
    if (Object.getOwnPropertyNames(object).sort().join(',') !== [...names].sort().join(',')) return undefined;
    const out: Record<string, unknown> = {};
    for (const name of names) {
      const descriptor = Object.getOwnPropertyDescriptor(object, name);
      if (!descriptor || !('value' in descriptor)) return undefined;
      out[name] = descriptor.value;
    }
    return out;
  } catch {
    return undefined;
  }
}
function context(holder: unknown): ArtifactResult<ArtifactContext> {
  return typeof holder === 'string' && PROTECTED.has(holder)
    ? { ok: true, value: 'protected' }
    : typeof holder === 'string' && DISPOSABLE.has(holder)
      ? { ok: true, value: 'disposable' }
      : fail('FC-SUBJECT', 'UNKNOWN_HOLDER_CLASS');
}
const protectedHolder = (holder: unknown) => {
  const routed = context(holder);
  return routed.ok && routed.value === 'protected';
};
const disposableHolder = (holder: unknown) => {
  const routed = context(holder);
  return routed.ok && routed.value === 'disposable';
};
function binding(input: unknown, mode: ArtifactFact['mode']): ArtifactResult<Binding> {
  const value = input as Record<string, unknown> | undefined;
  if (
    !value ||
    value.resourceScope !== SCOPE ||
    !text(value.subject) ||
    !digest(value.digest) ||
    !text(value.fence) ||
    !text(value.operation) ||
    value.mode !== mode
  )
    return fail('FC-INPUT', 'INVALID_CB_STORE_BINDING');
  const route = context(value.holder);
  if (!route.ok) return route;
  return {
    ok: true,
    value: freeze({
      resourceScope: SCOPE,
      subject: value.subject,
      digest: value.digest,
      fence: value.fence,
      holder: value.holder as string,
      operation: value.operation,
      mode,
    }),
  };
}
function exactPins(input: unknown, holder: string): ArtifactResult<Pins> {
  const value = fields(input, ['temporary', 'intended']);
  const temporary = value && fields(value.temporary, ['holder', 'tuple']);
  const intended = value && fields(value.intended, ['holder', 'tuple']);
  if (
    !temporary ||
    !intended ||
    temporary.holder !== holder ||
    intended.holder !== holder ||
    !text(temporary.tuple) ||
    !text(intended.tuple)
  )
    return fail('FC-EVIDENCE', 'EXACT_HOLDER_TUPLES_REQUIRED');
  return {
    ok: true,
    value: freeze({
      temporary: freeze({ holder, tuple: temporary.tuple }),
      intended: freeze({ holder, tuple: intended.tuple }),
    }),
  };
}
const key = (bindingValue: Binding) => JSON.stringify(bindingValue);
const pinKey = (bindingValue: Binding, pin: Readonly<{ holder: string; tuple: string }>) =>
  `${bindingValue.digest}/${pin.holder}/${pin.tuple}`;

export type ScriptedArtifactStore = Readonly<{
  readonly resourceScope: string;
  readonly protectedContext: object;
  readonly disposableContext: object;
  contextFor(holder: unknown): ArtifactResult<ArtifactContext>;
  putProtected(request: unknown): ArtifactResult<Readonly<{ digest: string }>>;
  putDisposable(request: unknown, fault?: 'lost-ack'): ArtifactResult<ArtifactFact>;
  get(request: unknown): ArtifactResult<Readonly<{ bytes: Uint8Array; digest: string }>>;
  adopt(request: unknown): ArtifactResult<void>;
  release(request: unknown, fault?: 'lost-ack'): ArtifactResult<ArtifactFact>;
  dispose(request: unknown, fault?: 'lost-ack'): ArtifactResult<ArtifactFact>;
  acknowledge(fact: unknown): ArtifactResult<void>;
  reconcile(request: unknown): ArtifactResult<ArtifactFact | Readonly<{ kind: 'absent' }>>;
}>;
export type ScriptedArtifactFixture = Readonly<{
  store: ScriptedArtifactStore;
  witness: Readonly<{ advance(fact: unknown): ArtifactResult<void> }>;
}>;

export function createScriptedArtifactFixture(): ScriptedArtifactFixture {
  const objects = new Map<string, Uint8Array>();
  const pins = new Map<string, Pins>();
  const retired = new Set<string>();
  const operations = new Map<string, StoredOperation>();
  const witnessed = new Set<string>();
  let position = -1;
  let head = '0'.repeat(64);
  const makeFact = (bindingValue: Binding): ArtifactFact => {
    position += 1;
    head = hash(`${head}\0${key(bindingValue)}`);
    return freeze({
      operation: bindingValue.operation,
      mode: bindingValue.mode,
      position,
      headDigest: head,
      binding: key(bindingValue),
    });
  };
  const record = (bindingValue: Binding, pending: boolean): ArtifactFact => {
    const operationKey = `${bindingValue.operation}/${bindingValue.mode}`;
    const existing = operations.get(operationKey);
    if (existing) return existing.fact;
    const fact = makeFact(bindingValue);
    operations.set(operationKey, freeze({ fact, binding: key(bindingValue), pending }));
    return fact;
  };
  const witnessedFact = (fact: ArtifactFact): ArtifactResult<void> =>
    witnessed.has(fact.binding) && witnessed.has(`${fact.operation}/${fact.mode}`)
      ? { ok: true, value: undefined }
      : fail('FC-TRUST', 'WITNESS_ABSENT');
  const store: ScriptedArtifactStore = freeze({
    resourceScope: SCOPE,
    protectedContext: freeze({ scope: `${SCOPE}/protected` }),
    disposableContext: freeze({ scope: `${SCOPE}/disposable` }),
    contextFor: context,
    putProtected(request) {
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
      const bound = binding(value, 'put');
      if (
        !value ||
        !bound.ok ||
        (bound.value && !protectedHolder(bound.value.holder)) ||
        !(value.bytes instanceof Uint8Array) ||
        hash(value.bytes) !== bound.value.digest
      )
        return fail('FC-INPUT', 'INVALID_PROTECTED_CB_STORE');
      objects.set(`${bound.value.holder}/${bound.value.digest}`, new Uint8Array(value.bytes));
      return { ok: true, value: freeze({ digest: bound.value.digest }) };
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
      const bound = binding(value, 'put');
      if (
        !value ||
        !bound.ok ||
        !disposableHolder(bound.value.holder) ||
        !(value.bytes instanceof Uint8Array) ||
        hash(value.bytes) !== bound.value.digest
      )
        return fail('FC-INPUT', 'INVALID_DISPOSABLE_CB_STORE');
      const exact = exactPins(value.pins, bound.value.holder);
      if (!exact.ok) return exact;
      const operationKey = `${bound.value.operation}/put`;
      const prior = operations.get(operationKey);
      if (prior && prior.binding !== key(bound.value))
        return fail('FC-FENCE' as ArtifactFailure['family'], 'OPERATION_BINDING_MISMATCH');
      objects.set(`${bound.value.holder}/${bound.value.digest}`, new Uint8Array(value.bytes));
      pins.set(bound.value.digest, exact.value);
      const fact = record(bound.value, fault === 'lost-ack');
      return fault === 'lost-ack' ? fail('FC-TRUST', 'ACK_LOST') : { ok: true, value: fact };
    },
    get(request) {
      const value = fields(request, ['resourceScope', 'subject', 'digest', 'fence', 'holder', 'operation', 'mode']);
      const bound = binding(value, 'put');
      if (!bound.ok) return bound;
      const bytes = objects.get(`${bound.value.holder}/${bound.value.digest}`);
      return bytes
        ? { ok: true, value: freeze({ digest: bound.value.digest, bytes: new Uint8Array(bytes) }) }
        : fail('FC-EVIDENCE', 'ARTIFACT_ABSENT');
    },
    adopt(request) {
      const value = fields(request, [
        'resourceScope',
        'subject',
        'digest',
        'fence',
        'holder',
        'operation',
        'mode',
        'pins',
        'fact',
      ]);
      const bound = binding(value, 'put');
      if (!value || !bound.ok || !disposableHolder(bound.value.holder)) return fail('FC-INPUT', 'INVALID_ADOPTION');
      const exact = exactPins(value.pins, bound.value.holder);
      const fact = value.fact as ArtifactFact;
      if (!exact.ok || !fact || fact.binding !== key(bound.value)) return fail('FC-EVIDENCE', 'INVALID_ARTIFACT_FACT');
      const current = witnessedFact(fact);
      if (!current.ok) return current;
      retired.add(pinKey(bound.value, exact.value.temporary));
      return { ok: true, value: undefined };
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
      ]);
      const bound = binding(value, 'release-pin');
      if (!value || !bound.ok || !disposableHolder(bound.value.holder) || !text(value.pin))
        return fail('FC-INPUT', 'INVALID_RELEASE');
      const pair = pins.get(bound.value.digest);
      const pin =
        pair?.temporary.tuple === value.pin
          ? pair.temporary
          : pair?.intended.tuple === value.pin
            ? pair.intended
            : undefined;
      if (!pin || !retired.has(pinKey(bound.value, pin))) return fail('FC-AUTHORITY', 'RELEASE_NOT_RETIRED');
      const exactBinding = freeze({ ...bound.value, detail: value.pin });
      const operationKey = `${bound.value.operation}/release-pin`;
      const prior = operations.get(operationKey);
      if (prior && prior.binding !== key(exactBinding))
        return fail('FC-FENCE' as ArtifactFailure['family'], 'OPERATION_BINDING_MISMATCH');
      if (prior) return fail('FC-TRUST', 'RECONCILE_REQUIRED');
      const fact = record(exactBinding, fault === 'lost-ack');
      return fault === 'lost-ack' ? fail('FC-TRUST', 'ACK_LOST') : { ok: true, value: fact };
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
      ]);
      const bound = binding(value, 'dispose-bytes');
      const facts = value && fields(value.facts, ['owner', 'settlement', 'preservation', 'retention', 'obligations']);
      if (
        !bound.ok ||
        !facts ||
        !text(facts.owner) ||
        facts.settlement !== 'settled' ||
        facts.preservation !== 'preserved' ||
        facts.retention !== 'expired' ||
        facts.obligations !== 'none'
      )
        return fail('FC-AUTHORITY', 'DISPOSAL_GUARDS_REQUIRED');
      if (pins.has(bound.value.digest)) return fail('FC-AUTHORITY', 'LIVE_PIN_PRESENT');
      const operationKey = `${bound.value.operation}/dispose-bytes`;
      const prior = operations.get(operationKey);
      if (prior)
        return prior.binding === key(bound.value)
          ? fail('FC-TRUST', 'RECONCILE_REQUIRED')
          : fail('FC-FENCE' as ArtifactFailure['family'], 'OPERATION_BINDING_MISMATCH');
      const fact = record(bound.value, fault === 'lost-ack');
      return fault === 'lost-ack' ? fail('FC-TRUST', 'ACK_LOST') : { ok: true, value: fact };
    },
    acknowledge(input) {
      const fact = input as ArtifactFact;
      if (!fact || !text(fact.binding)) return fail('FC-EVIDENCE', 'INVALID_ARTIFACT_FACT');
      return witnessedFact(fact);
    },
    reconcile(request) {
      const value = fields(request, Object.getOwnPropertyNames(request as object));
      if (
        !value ||
        !text(value.operation) ||
        (value.mode !== 'put' && value.mode !== 'release-pin' && value.mode !== 'dispose-bytes')
      )
        return fail('FC-INPUT', 'INVALID_RECONCILIATION');
      const bound = binding(value, value.mode);
      if (!bound.ok) return bound;
      const exactBinding =
        value.mode === 'release-pin' ? freeze({ ...bound.value, detail: value.pin as string }) : bound.value;
      const prior = operations.get(`${bound.value.operation}/${bound.value.mode}`);
      if (!prior) return { ok: true, value: freeze({ kind: 'absent' as const }) };
      return prior.binding === key(exactBinding)
        ? { ok: true, value: prior.fact }
        : fail('FC-FENCE' as ArtifactFailure['family'], 'OPERATION_BINDING_MISMATCH');
    },
  });
  const witness = freeze({
    advance(input: unknown): ArtifactResult<void> {
      const fact = input as ArtifactFact;
      const operation = fact && operations.get(`${fact.operation}/${fact.mode}`);
      if (!operation || operation.fact !== fact) return fail('FC-EVIDENCE', 'INVALID_ARTIFACT_FACT');
      witnessed.add(fact.binding);
      witnessed.add(`${fact.operation}/${fact.mode}`);
      return { ok: true, value: undefined };
    },
  });
  return freeze({ store, witness });
}
export function createScriptedArtifactStore(): ScriptedArtifactStore {
  return createScriptedArtifactFixture().store;
}
