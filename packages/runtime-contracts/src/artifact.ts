/** Private GF-013 scripted semantic fixture; GF-026 owns providers and configuration. */
declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };
declare const process: {
  getBuiltinModule(name: string): {
    createHash(name: string): { update(value: Uint8Array): { digest(encoding: 'hex'): string } };
  };
};
const createHash = process.getBuiltinModule('node:crypto').createHash;

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
const hash = (value: Uint8Array | string) =>
  createHash('sha256')
    .update(typeof value === 'string' ? new TextEncoder().encode(value) : value)
    .digest('hex');
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
