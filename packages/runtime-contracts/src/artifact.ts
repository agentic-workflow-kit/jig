/**
 * GF-013 semantic fixture only. It deliberately exposes no provider configuration, manifest,
 * storage address, or public-package export. GF-026 owns any physical provider realization.
 */
export const ARTIFACT_VERSION = 'jig.artifact.v1';

declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };
declare const TextDecoder: {
  new (label?: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array): string };
};

export type ArtifactFailureFamily = 'FC-INPUT' | 'FC-SUBJECT' | 'FC-EVIDENCE' | 'FC-AUTHORITY' | 'FC-TRUST';
export type ArtifactFailure = Readonly<{ family: ArtifactFailureFamily; code: string }>;
export type ArtifactResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: ArtifactFailure }>;
export type ArtifactContext = 'protected' | 'disposable';
export type ArtifactFact = Readonly<{
  operation: string;
  mode: 'put' | 'release-pin' | 'dispose-bytes';
  position: number;
  headDigest: string;
}>;

type PinSet = Readonly<{ temporary: string; intended: string }>;
type LookupPins = Readonly<{ temporary?: string; intended?: string }>;
type Stored = Readonly<{ bytes: Uint8Array; digest: string }>;
type PutRequest = Readonly<{ holder: string; bytes: Uint8Array; digest: string }>;
type LookupFault = 'behind' | 'fork' | 'rollback' | 'missing';

export type ScriptedArtifactStore = Readonly<{
  readonly protectedContext: object;
  readonly disposableContext: object;
  contextFor(holder: unknown): ArtifactResult<ArtifactContext>;
  putProtected(request: unknown): ArtifactResult<Readonly<{ digest: string }>>;
  putDisposable(request: unknown, fault?: 'after-flush' | 'lost-ack'): ArtifactResult<ArtifactFact>;
  get(request: unknown): ArtifactResult<Readonly<{ bytes: Uint8Array; digest: string }>>;
  moveProtected(holder: unknown): ArtifactResult<never>;
  aliasProtected(holder: unknown): ArtifactResult<never>;
  disposeProtected(holder: unknown): ArtifactResult<never>;
  lookup(digest: unknown): Readonly<{ temporary: string; intended: string }> | undefined;
  adopt(request: unknown): boolean;
  reject(request: unknown): boolean;
  release(request: unknown): ArtifactResult<ArtifactFact>;
  dispose(request: unknown): ArtifactResult<ArtifactFact>;
  acknowledge(fact: unknown): ArtifactResult<void>;
  reconcile(request: unknown): ArtifactResult<ArtifactFact | Readonly<{ kind: 'absent' }>>;
  restore(): ArtifactResult<void>;
  injectFault(fault: LookupFault): ArtifactResult<void>;
}>;

const PROTECTED_HOLDERS = new Set([
  'configuration',
  'intake-envelope',
  'intake-composition',
  'preflight-attempt',
  'capability-proof',
]);
const DISPOSABLE_HOLDERS = new Set([
  'work-product',
  'verification-result',
  'review-record',
  'delivery-record',
  'audit-evidence',
  'terminal-export',
]);
const MAX_BYTES = 1_048_576;
const GENESIS = '0'.repeat(64);
const fail = (family: ArtifactFailureFamily, code: string): ArtifactResult<never> => ({
  ok: false,
  error: { family, code },
});
const freeze = <T>(value: T): T => Object.freeze(value);
const isDigest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const safeString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 512;

function properties(value: unknown, expected: readonly string[]): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  try {
    const candidate = value as object;
    if (Object.getOwnPropertyNames(candidate).sort().join(',') !== [...expected].sort().join(',')) return undefined;
    const result: Record<string, unknown> = {};
    for (const key of expected) {
      const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
      if (!descriptor || !('value' in descriptor)) return undefined;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return undefined;
  }
}

function sha256(bytes: Uint8Array): string {
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
  const length = bytes.length;
  const padded = new Uint8Array(((length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[length] = 0x80;
  const bitLength = BigInt(length) * 8n;
  for (let index = 0; index < 8; index += 1)
    padded[padded.length - 1 - index] = Number((bitLength >> BigInt(index * 8)) & 255n);
  let state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const right = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Array<number>(64).fill(0);
    for (let index = 0; index < 16; index += 1)
      words[index] =
        ((padded[offset + index * 4] ?? 0) << 24) |
        ((padded[offset + index * 4 + 1] ?? 0) << 16) |
        ((padded[offset + index * 4 + 2] ?? 0) << 8) |
        (padded[offset + index * 4 + 3] ?? 0);
    for (let index = 16; index < 64; index += 1) {
      const left = words[index - 15] ?? 0;
      const rightWord = words[index - 2] ?? 0;
      words[index] =
        (((right(left, 7) ^ right(left, 18) ^ (left >>> 3)) + (words[index - 16] ?? 0)) | 0) +
        ((right(rightWord, 17) ^ right(rightWord, 19) ^ (rightWord >>> 10)) + (words[index - 7] ?? 0));
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const choice = (e & f) ^ (~e & g);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const first =
        (h + (right(e, 6) ^ right(e, 11) ^ right(e, 25)) + choice + (constants[index] ?? 0) + (words[index] ?? 0)) | 0;
      const second = ((right(a, 2) ^ right(a, 13) ^ right(a, 22)) + majority) | 0;
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
    state = state.map((value, index) => (value + (next[index] ?? 0)) | 0);
  }
  return state.map((value) => (value >>> 0).toString(16).padStart(8, '0')).join('');
}

function normalizePut(input: unknown): ArtifactResult<PutRequest> {
  const value = properties(input, ['holder', 'bytes', 'digest']);
  if (!value || !safeString(value.holder) || !(value.bytes instanceof Uint8Array) || !isDigest(value.digest))
    return fail('FC-INPUT', 'INVALID_ARTIFACT_REQUEST');
  if (value.bytes.length > MAX_BYTES || sha256(value.bytes) !== value.digest)
    return fail('FC-INPUT', 'INVALID_ARTIFACT_BYTES');
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(value.bytes);
  if (/(?:secret|token|password|credential)\s*[:=]/i.test(decoded)) return fail('FC-INPUT', 'SECRET_LIKE_BYTES');
  return {
    ok: true,
    value: freeze({ holder: value.holder, bytes: new Uint8Array(value.bytes), digest: value.digest }),
  };
}

function normalizePins(input: unknown): ArtifactResult<PinSet> {
  const value = properties(input, ['temporary', 'intended']);
  return value && safeString(value.temporary) && safeString(value.intended)
    ? { ok: true, value: freeze({ temporary: value.temporary, intended: value.intended }) }
    : fail('FC-EVIDENCE', 'EXACT_TWO_PIN_REQUIRED');
}

function factDigest(position: number, previous: string, operation: string, mode: ArtifactFact['mode']): string {
  return sha256(
    new TextEncoder().encode(`${ARTIFACT_VERSION}\u0000${position}\u0000${previous}\u0000${operation}\u0000${mode}`),
  );
}

export function createScriptedArtifactStore(input: unknown): ScriptedArtifactStore {
  const options = properties(input, ['resourceScope']);
  if (!options || !safeString(options.resourceScope)) throw new TypeError('invalid scripted artifact fixture binding');
  const protectedContext = freeze({ scope: `${options.resourceScope}/protected` });
  const disposableContext = freeze({ scope: `${options.resourceScope}/disposable` });
  const protectedObjects = new Map<string, Stored>();
  const disposableObjects = new Map<string, Stored>();
  const pins = new Map<string, LookupPins>();
  const retiredPins = new Set<string>();
  const operations = new Map<string, ArtifactFact>();
  let lookupPosition = -1;
  let lookupHead = GENESIS;
  let witnessed: Readonly<{ position: number; head: string }> | undefined;
  let fault: LookupFault | undefined;
  const holderContext = (holder: unknown): ArtifactResult<ArtifactContext> =>
    typeof holder === 'string' && PROTECTED_HOLDERS.has(holder)
      ? { ok: true, value: 'protected' }
      : typeof holder === 'string' && DISPOSABLE_HOLDERS.has(holder)
        ? { ok: true, value: 'disposable' }
        : fail('FC-SUBJECT', 'UNKNOWN_HOLDER_CLASS');
  const record = (operation: string, mode: ArtifactFact['mode']): ArtifactFact => {
    lookupPosition += 1;
    lookupHead = factDigest(lookupPosition, lookupHead, operation, mode);
    const result = freeze({ operation, mode, position: lookupPosition, headDigest: lookupHead });
    operations.set(`${operation}/${mode}`, result);
    return result;
  };
  const currentWitness = (): ArtifactResult<void> => {
    if (fault === 'missing' || !witnessed) return fail('FC-TRUST', 'WITNESS_ABSENT');
    if (fault === 'behind' || witnessed.position < lookupPosition) return fail('FC-TRUST', 'WITNESS_BEHIND');
    if (
      fault === 'fork' ||
      fault === 'rollback' ||
      witnessed.position !== lookupPosition ||
      witnessed.head !== lookupHead
    )
      return fail('FC-TRUST', 'WITNESS_MISMATCH');
    return { ok: true, value: undefined };
  };
  const samePins = (left: LookupPins, right: PinSet): boolean =>
    left.temporary === right.temporary && left.intended === right.intended;
  return freeze({
    protectedContext,
    disposableContext,
    contextFor: holderContext,
    putProtected(request) {
      const normalized = normalizePut(request);
      if (!normalized.ok) return normalized;
      const context = holderContext(normalized.value.holder);
      if (!context.ok) return context;
      if (context.value !== 'protected') return fail('FC-AUTHORITY', 'CONTEXT_MISMATCH');
      const prior = protectedObjects.get(normalized.value.digest);
      if (
        prior &&
        (prior.bytes.length !== normalized.value.bytes.length ||
          prior.bytes.some((byte, index) => byte !== normalized.value.bytes[index]))
      )
        return fail('FC-EVIDENCE', 'IMMUTABLE_DIGEST_CONFLICT');
      protectedObjects.set(
        normalized.value.digest,
        freeze({ bytes: new Uint8Array(normalized.value.bytes), digest: normalized.value.digest }),
      );
      return { ok: true, value: freeze({ digest: normalized.value.digest }) };
    },
    putDisposable(request, crash) {
      const candidate = properties(request, ['holder', 'bytes', 'digest', 'operation', 'pins']);
      if (!candidate || !safeString(candidate.operation)) return fail('FC-INPUT', 'INVALID_ARTIFACT_OPERATION');
      const normalized = normalizePut({ holder: candidate.holder, bytes: candidate.bytes, digest: candidate.digest });
      const pinSet = normalizePins(candidate.pins);
      if (!normalized.ok) return normalized;
      if (!pinSet.ok) return pinSet;
      const context = holderContext(normalized.value.holder);
      if (!context.ok) return context;
      if (context.value !== 'disposable') return fail('FC-AUTHORITY', 'CONTEXT_MISMATCH');
      const existing = operations.get(`${candidate.operation}/put`);
      if (existing) return { ok: true, value: existing };
      const prior = disposableObjects.get(normalized.value.digest);
      if (
        prior &&
        (prior.bytes.length !== normalized.value.bytes.length ||
          prior.bytes.some((byte, index) => byte !== normalized.value.bytes[index]))
      )
        return fail('FC-EVIDENCE', 'IMMUTABLE_DIGEST_CONFLICT');
      const previousPins = pins.get(normalized.value.digest);
      if (previousPins && !samePins(previousPins, pinSet.value)) return fail('FC-EVIDENCE', 'EXACT_TWO_PIN_REQUIRED');
      disposableObjects.set(
        normalized.value.digest,
        freeze({ bytes: new Uint8Array(normalized.value.bytes), digest: normalized.value.digest }),
      );
      pins.set(normalized.value.digest, pinSet.value);
      const artifactFact = record(candidate.operation, 'put');
      return crash === 'after-flush' || crash === 'lost-ack'
        ? fail('FC-TRUST', 'ACK_LOST')
        : { ok: true, value: artifactFact };
    },
    get(request) {
      const value = properties(request, ['holder', 'digest']);
      if (!value || !isDigest(value.digest)) return fail('FC-INPUT', 'INVALID_ARTIFACT_READ');
      const context = holderContext(value.holder);
      if (!context.ok) return context;
      const stored = (context.value === 'protected' ? protectedObjects : disposableObjects).get(value.digest);
      return stored
        ? { ok: true, value: freeze({ digest: stored.digest, bytes: new Uint8Array(stored.bytes) }) }
        : fail('FC-EVIDENCE', 'ARTIFACT_ABSENT');
    },
    moveProtected(holder) {
      const context = holderContext(holder);
      return !context.ok ? context : fail('FC-AUTHORITY', 'PROTECTED_CONTEXT');
    },
    aliasProtected(holder) {
      const context = holderContext(holder);
      return !context.ok ? context : fail('FC-AUTHORITY', 'PROTECTED_CONTEXT');
    },
    disposeProtected(holder) {
      const context = holderContext(holder);
      return !context.ok ? context : fail('FC-AUTHORITY', 'PROTECTED_CONTEXT');
    },
    lookup(digest) {
      const pinSet = isDigest(digest) ? pins.get(digest) : undefined;
      return pinSet?.temporary && pinSet.intended
        ? freeze({ temporary: pinSet.temporary, intended: pinSet.intended })
        : undefined;
    },
    adopt(request) {
      const value = properties(request, ['holder', 'digest', 'pins']);
      const pinSet = value ? normalizePins(value.pins) : fail('FC-EVIDENCE', 'EXACT_TWO_PIN_REQUIRED');
      const valid =
        !!value &&
        isDigest(value.digest) &&
        holderContext(value.holder).ok &&
        pinSet.ok &&
        samePins(pins.get(value.digest) ?? freeze({ temporary: '', intended: '' }), pinSet.value);
      if (valid && value && pinSet.ok) retiredPins.add(`${value.digest}/${pinSet.value.temporary}`);
      return valid;
    },
    reject(request) {
      const value = properties(request, ['holder', 'digest', 'pins']);
      const pinSet = value ? normalizePins(value.pins) : fail('FC-EVIDENCE', 'EXACT_TWO_PIN_REQUIRED');
      const context = value ? holderContext(value.holder) : fail('FC-SUBJECT', 'UNKNOWN_HOLDER_CLASS');
      if (
        !value ||
        !isDigest(value.digest) ||
        !pinSet.ok ||
        !context.ok ||
        context.value !== 'disposable' ||
        !samePins(pins.get(value.digest) ?? freeze({ temporary: '', intended: '' }), pinSet.value)
      )
        return false;
      retiredPins.add(`${value.digest}/${pinSet.value.temporary}`);
      retiredPins.add(`${value.digest}/${pinSet.value.intended}`);
      return true;
    },
    release(request) {
      const value = properties(request, ['holder', 'digest', 'pin']);
      if (!value || !isDigest(value.digest) || !safeString(value.pin)) return fail('FC-INPUT', 'INVALID_RELEASE');
      const context = holderContext(value.holder);
      if (!context.ok) return context;
      if (context.value !== 'disposable' || !retiredPins.has(`${value.digest}/${value.pin}`))
        return fail('FC-AUTHORITY', 'RELEASE_NOT_RETIRED');
      const pinSet = pins.get(value.digest);
      if (!pinSet || (value.pin !== pinSet.temporary && value.pin !== pinSet.intended))
        return fail('FC-EVIDENCE', 'PIN_ABSENT');
      const remaining = value.pin === pinSet.temporary ? pinSet.intended : pinSet.temporary;
      if (remaining)
        pins.set(value.digest, value.pin === pinSet.temporary ? { intended: remaining } : { temporary: remaining });
      else pins.delete(value.digest);
      return { ok: true, value: record(`release/${value.pin}`, 'release-pin') };
    },
    dispose(request) {
      const releaseValue = properties(request, ['holder', 'operation', 'digest', 'mode', 'pin']);
      const deleteValue = properties(request, ['holder', 'operation', 'digest', 'mode', 'facts']);
      const value = releaseValue ?? deleteValue;
      if (
        !value ||
        !safeString(value.operation) ||
        !isDigest(value.digest) ||
        (value.mode !== 'release-pin' && value.mode !== 'dispose-bytes')
      )
        return fail('FC-INPUT', 'INVALID_DISPOSAL');
      const context = holderContext(value.holder);
      if (!context.ok) return context;
      if (value.mode === 'release-pin') {
        if (
          !safeString(value.pin) ||
          context.value !== 'disposable' ||
          !retiredPins.has(`${value.digest}/${value.pin}`)
        )
          return fail('FC-AUTHORITY', 'RELEASE_NOT_RETIRED');
        const pinSet = pins.get(value.digest);
        if (!pinSet || (value.pin !== pinSet.temporary && value.pin !== pinSet.intended))
          return fail('FC-EVIDENCE', 'PIN_ABSENT');
        const remaining = value.pin === pinSet.temporary ? pinSet.intended : pinSet.temporary;
        if (remaining)
          pins.set(value.digest, value.pin === pinSet.temporary ? { intended: remaining } : { temporary: remaining });
        else pins.delete(value.digest);
        return { ok: true, value: record(value.operation, 'release-pin') };
      }
      const factsValue = properties(value.facts, ['owner', 'settlement', 'preservation', 'retention', 'obligations']);
      if (
        context.value !== 'disposable' ||
        !factsValue ||
        !safeString(factsValue.owner) ||
        factsValue.settlement !== 'settled' ||
        factsValue.preservation !== 'preserved' ||
        factsValue.retention !== 'expired' ||
        factsValue.obligations !== 'none'
      )
        return fail('FC-AUTHORITY', 'DISPOSAL_GUARDS_REQUIRED');
      if (pins.has(value.digest)) return fail('FC-AUTHORITY', 'LIVE_PIN_PRESENT');
      const witness = currentWitness();
      if (!witness.ok) return witness;
      if (!disposableObjects.has(value.digest)) return fail('FC-EVIDENCE', 'ARTIFACT_ABSENT');
      disposableObjects.delete(value.digest);
      return { ok: true, value: record(value.operation, 'dispose-bytes') };
    },
    acknowledge(value) {
      const fact = properties(value, ['operation', 'mode', 'position', 'headDigest']);
      if (
        !fact ||
        !safeString(fact.operation) ||
        (fact.mode !== 'put' && fact.mode !== 'release-pin' && fact.mode !== 'dispose-bytes') ||
        typeof fact.position !== 'number' ||
        !isDigest(fact.headDigest) ||
        operations.get(`${fact.operation}/${fact.mode}`)?.position !== fact.position ||
        operations.get(`${fact.operation}/${fact.mode}`)?.headDigest !== fact.headDigest
      )
        return fail('FC-EVIDENCE', 'INVALID_ARTIFACT_FACT');
      witnessed = freeze({ position: fact.position, head: fact.headDigest });
      return { ok: true, value: undefined };
    },
    reconcile(request) {
      const value = properties(request, ['operation', 'mode']);
      if (!value || !safeString(value.operation) || value.mode !== 'put')
        return fail('FC-INPUT', 'INVALID_RECONCILIATION');
      return { ok: true, value: operations.get(`${value.operation}/put`) ?? freeze({ kind: 'absent' as const }) };
    },
    restore() {
      return currentWitness();
    },
    injectFault(nextFault) {
      fault = nextFault;
      return { ok: true, value: undefined };
    },
  });
}
