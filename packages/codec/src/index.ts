export const FRAME_VERSION = 'jig.codec.v1';

export const CANONICAL_LIMITS = Object.freeze({
  maxFrameBytes: 65_536,
  maxDepth: 32,
  maxCollectionEntries: 256,
  maxStringCodePoints: 4_096,
  maxSafeInteger: Number.MAX_SAFE_INTEGER,
});

type JsonPrimitive = null | boolean | number | string;
export type CanonicalJson = JsonPrimitive | CanonicalJson[] | { readonly [key: string]: CanonicalJson };
export type FailureFamily = 'FC-INPUT' | 'FC-SUBJECT';
export type FailureCode =
  | 'MALFORMED'
  | 'DUPLICATE_KEY'
  | 'UNKNOWN_VERSION'
  | 'NONCANONICAL'
  | 'OVERSIZED'
  | 'INVALID_SCOPE'
  | 'CROSS_SCOPE'
  | 'STAGED_DIGEST_MISMATCH'
  | 'INVALID_STAGED_DIGEST';
export type CodecError = Readonly<{ family: FailureFamily; code: FailureCode; message: string }>;
export type Result<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: CodecError }>;
export type IdentityKind =
  | 'ID-RUN'
  | 'ID-STORY'
  | 'ID-TXN'
  | 'ID-EVENT'
  | 'ID-OP'
  | 'ID-CAND'
  | 'ID-GEN'
  | 'ID-PRINCIPAL'
  | 'ID-MANIFEST'
  | 'ID-SESSION'
  | 'ID-FINDING'
  | 'ID-GRANT'
  | 'ID-PARK'
  | 'ID-SOURCE-REQ'
  | 'ID-REGISTRY'
  | 'ID-TARGET'
  | 'ID-AUTH'
  | 'ID-EVSUBJ'
  | 'ID-OBLIGATION'
  | 'ID-SETTLEMENT'
  | 'ID-NOTICE'
  | 'ID-EXPORT';
export interface IdentityComponents {
  readonly [key: string]: string | IdentityComponents;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const digest = '[0-9a-f]{64}';
const run = 'run-[0-9]{12}-[0-9a-f]{16}';
const key = '[a-z0-9](?:[a-z0-9-]{0,63})';
const ordinal = '(?:0|[1-9][0-9]*)';
const token = '[a-z0-9](?:[a-z0-9-]{0,63})';
const regex = (value: string) => new RegExp(`^${value}$`);

function failure(family: FailureFamily, code: FailureCode, message: string): Result<never> {
  return { ok: false, error: { family, code, message } };
}

function inputFailure(
  code: Extract<FailureCode, 'MALFORMED' | 'DUPLICATE_KEY' | 'UNKNOWN_VERSION' | 'NONCANONICAL' | 'OVERSIZED'>,
  message: string,
): Result<never> {
  return failure('FC-INPUT', code, message);
}

function subjectFailure(
  code: Extract<FailureCode, 'INVALID_SCOPE' | 'CROSS_SCOPE' | 'STAGED_DIGEST_MISMATCH' | 'INVALID_STAGED_DIGEST'>,
  message: string,
): Result<never> {
  return failure('FC-SUBJECT', code, message);
}

function codePoints(value: string): number {
  return [...value].length;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function compareKeys(left: string, right: string): number {
  const a = [...left];
  const b = [...right];
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index]?.codePointAt(0) ?? 0) - (b[index]?.codePointAt(0) ?? 0);
    if (diff !== 0) return diff;
  }
  return a.length - b.length;
}

function validateString(value: string): void {
  if (value.normalize('NFC') !== value) throw new Error('NONCANONICAL:string is not NFC normalized');
  if (codePoints(value) > CANONICAL_LIMITS.maxStringCodePoints)
    throw new Error('OVERSIZED:string exceeds code point limit');
  for (let index = 0; index < value.length; index += 1) {
    const point = value.charCodeAt(index);
    if (point >= 0xd800 && point <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) throw new Error('MALFORMED:unpaired surrogate');
      index += 1;
    } else if (point >= 0xdc00 && point <= 0xdfff) throw new Error('MALFORMED:unpaired surrogate');
  }
}

function validateValue(value: unknown, depth = 0): asserts value is CanonicalJson {
  if (depth > CANONICAL_LIMITS.maxDepth) throw new Error('OVERSIZED:maximum nesting depth exceeded');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') return validateString(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0))
      throw new Error('MALFORMED:only non-negative or negative safe integer JSON numbers are supported');
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > CANONICAL_LIMITS.maxCollectionEntries) throw new Error('OVERSIZED:array exceeds entry limit');
    for (const entry of value) validateValue(entry, depth + 1);
    return;
  }
  if (!isPlainObject(value)) throw new Error('MALFORMED:value must be a JSON primitive, array, or plain object');
  const entries = Object.entries(value);
  if (entries.length > CANONICAL_LIMITS.maxCollectionEntries) throw new Error('OVERSIZED:object exceeds entry limit');
  for (const [entryKey, entryValue] of entries) {
    validateString(entryKey);
    validateValue(entryValue, depth + 1);
  }
}

function canonicalText(value: CanonicalJson): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalText).join(',')}]`;
  return `{${Object.keys(value)
    .sort(compareKeys)
    .map((entryKey) => `${JSON.stringify(entryKey)}:${canonicalText(value[entryKey] as CanonicalJson)}`)
    .join(',')}}`;
}

export function canonicalBytes(value: CanonicalJson): Uint8Array {
  validateValue(value);
  const bytes = encoder.encode(canonicalText(value));
  if (bytes.byteLength > CANONICAL_LIMITS.maxFrameBytes)
    throw new Error('OVERSIZED:canonical value exceeds byte limit');
  return bytes;
}

class StrictJsonParser {
  private index = 0;

  constructor(private readonly text: string) {}

  parse(): CanonicalJson {
    const value = this.value(0);
    this.space();
    if (this.index !== this.text.length) throw new Error('MALFORMED:trailing content');
    return value;
  }

  private space(): void {
    while (
      this.text[this.index] === ' ' ||
      this.text[this.index] === '\n' ||
      this.text[this.index] === '\r' ||
      this.text[this.index] === '\t'
    )
      this.index += 1;
  }

  private value(depth: number): CanonicalJson {
    if (depth > CANONICAL_LIMITS.maxDepth) throw new Error('OVERSIZED:maximum nesting depth exceeded');
    this.space();
    const current = this.text[this.index];
    if (current === '"') return this.string();
    if (current === '{') return this.object(depth + 1);
    if (current === '[') return this.array(depth + 1);
    if (current === 't' && this.take('true')) return true;
    if (current === 'f' && this.take('false')) return false;
    if (current === 'n' && this.take('null')) return null;
    if (current === '-' || (current !== undefined && current >= '0' && current <= '9')) return this.number();
    throw new Error('MALFORMED:unexpected JSON token');
  }

  private take(expected: string): boolean {
    if (this.text.slice(this.index, this.index + expected.length) !== expected) return false;
    this.index += expected.length;
    return true;
  }

  private string(): string {
    let result = '';
    this.index += 1;
    while (this.index < this.text.length) {
      const current = this.text[this.index] as string;
      this.index += 1;
      if (current === '"') {
        validateString(result);
        return result;
      }
      if (current === '\\') {
        const escaped = this.text[this.index++];
        if (escaped === '"' || escaped === '\\' || escaped === '/') result += escaped;
        else if (escaped === 'b') result += '\b';
        else if (escaped === 'f') result += '\f';
        else if (escaped === 'n') result += '\n';
        else if (escaped === 'r') result += '\r';
        else if (escaped === 't') result += '\t';
        else if (escaped === 'u') {
          const digits = this.text.slice(this.index, this.index + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(digits)) throw new Error('MALFORMED:invalid unicode escape');
          result += String.fromCharCode(Number.parseInt(digits, 16));
          this.index += 4;
        } else throw new Error('MALFORMED:invalid escape');
      } else {
        if ((current.codePointAt(0) as number) < 0x20) throw new Error('MALFORMED:unescaped control character');
        result += current;
      }
    }
    throw new Error('MALFORMED:unterminated string');
  }

  private number(): number {
    const start = this.index;
    if (this.text[this.index] === '-') this.index += 1;
    if (this.text[this.index] === '0') this.index += 1;
    else {
      if (!/[1-9]/.test(this.text[this.index] ?? '')) throw new Error('MALFORMED:invalid number');
      while (/[0-9]/.test(this.text[this.index] ?? '')) this.index += 1;
    }
    if (this.text[this.index] === '.' || this.text[this.index] === 'e' || this.text[this.index] === 'E')
      throw new Error('NONCANONICAL:fractional or exponent JSON number');
    const value = Number(this.text.slice(start, this.index));
    validateValue(value);
    return value;
  }

  private object(depth: number): { readonly [key: string]: CanonicalJson } {
    const result: Record<string, CanonicalJson> = {};
    const seen = new Set<string>();
    this.index += 1;
    this.space();
    if (this.text[this.index] === '}') {
      this.index += 1;
      return result;
    }
    while (true) {
      this.space();
      if (this.text[this.index] !== '"') throw new Error('MALFORMED:object key must be a string');
      const entryKey = this.string();
      if (seen.has(entryKey)) throw new Error('DUPLICATE_KEY:duplicate object key');
      seen.add(entryKey);
      this.space();
      if (this.text[this.index++] !== ':') throw new Error('MALFORMED:missing object separator');
      result[entryKey] = this.value(depth);
      if (seen.size > CANONICAL_LIMITS.maxCollectionEntries) throw new Error('OVERSIZED:object exceeds entry limit');
      this.space();
      const delimiter = this.text[this.index++];
      if (delimiter === '}') return result;
      if (delimiter !== ',') throw new Error('MALFORMED:missing object delimiter');
    }
  }

  private array(depth: number): CanonicalJson[] {
    const result: CanonicalJson[] = [];
    this.index += 1;
    this.space();
    if (this.text[this.index] === ']') {
      this.index += 1;
      return result;
    }
    while (true) {
      result.push(this.value(depth));
      if (result.length > CANONICAL_LIMITS.maxCollectionEntries) throw new Error('OVERSIZED:array exceeds entry limit');
      this.space();
      const delimiter = this.text[this.index++];
      if (delimiter === ']') return result;
      if (delimiter !== ',') throw new Error('MALFORMED:missing array delimiter');
    }
  }
}

function resultForInput<T>(work: () => T): Result<T> {
  try {
    return { ok: true, value: work() };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'MALFORMED:unknown parser failure';
    const code = message.split(':', 1)[0] as FailureCode;
    if (code === 'DUPLICATE_KEY' || code === 'UNKNOWN_VERSION' || code === 'NONCANONICAL' || code === 'OVERSIZED')
      return inputFailure(code, message);
    return inputFailure('MALFORMED', message);
  }
}

export function encodeFrame(payload: CanonicalJson): Result<Uint8Array> {
  return resultForInput(() => canonicalBytes({ payload, version: FRAME_VERSION }));
}

export function decodeFrame(bytes: Uint8Array): Result<CanonicalJson> {
  return resultForInput(() => {
    if (bytes.byteLength > CANONICAL_LIMITS.maxFrameBytes) throw new Error('OVERSIZED:frame exceeds byte limit');
    const text = decoder.decode(bytes);
    const parsed = new StrictJsonParser(text).parse();
    if (
      !isPlainObject(parsed) ||
      Object.keys(parsed).length !== 2 ||
      parsed.version === undefined ||
      parsed.payload === undefined
    )
      throw new Error('MALFORMED:frame must contain exactly payload and version');
    if (parsed.version !== FRAME_VERSION) throw new Error('UNKNOWN_VERSION:frame version is not supported');
    const canonical = canonicalBytes(parsed);
    if (canonical.byteLength !== bytes.byteLength || canonical.some((entry, index) => entry !== bytes[index]))
      throw new Error('NONCANONICAL:frame bytes are not canonical');
    return parsed.payload as CanonicalJson;
  });
}

const patterns: Record<Exclude<IdentityKind, 'ID-EVSUBJ'>, RegExp> = {
  'ID-RUN': regex(run),
  'ID-STORY': regex(`${run}/story/${key}`),
  'ID-TXN': regex(`${run}/txn/${ordinal}/${run}/gen/${ordinal}\\|${token}\\|${digest}`),
  'ID-EVENT': regex(`${run}/event/${ordinal}`),
  'ID-OP': regex(`${run}/txn/${ordinal}/${run}/gen/${ordinal}\\|${token}\\|${digest}/op/${ordinal}`),
  'ID-CAND': regex(`${run}/story/${key}/cand/${ordinal}\\|${digest}`),
  'ID-GEN': regex(`${run}/gen/${ordinal}\\|${token}`),
  'ID-PRINCIPAL': regex(`principal/${key}`),
  'ID-MANIFEST': regex(`provider/${digest}/authority/${digest}`),
  'ID-SESSION': regex(`${run}/story/${key}/session/${key}/${ordinal}`),
  'ID-FINDING': regex(`${run}/story/${key}/finding/${ordinal}`),
  'ID-GRANT': regex(`${run}/grant/${ordinal}`),
  'ID-PARK': regex(`${run}/park/${ordinal}`),
  'ID-SOURCE-REQ': regex(`source/${digest}/request/${digest}`),
  'ID-REGISTRY': regex(`registry/${digest}`),
  'ID-TARGET': regex(`target/${key}`),
  'ID-AUTH': regex(`target/${key}/auth/${ordinal}`),
  'ID-OBLIGATION': regex(`${run}/obligation/${ordinal}`),
  'ID-SETTLEMENT': regex(`${run}/settlement/terminal-stop`),
  'ID-NOTICE': regex(`${run}/notice/${key}/${digest}`),
  'ID-EXPORT': regex(`${run}/export/${ordinal}/${digest}`),
};

function evidenceSubject(value: string): boolean {
  const prefix = 'evidence://';
  if (!value.startsWith(prefix)) return false;
  const divider = '/claim/';
  const claimIndex = value.lastIndexOf(divider);
  if (claimIndex < prefix.length) return false;
  const subject = value.slice(prefix.length, claimIndex);
  const claim = value.slice(claimIndex + divider.length);
  if (!regex(key).test(claim)) return false;
  return (
    patterns['ID-RUN'].test(subject) ||
    patterns['ID-STORY'].test(subject) ||
    patterns['ID-CAND'].test(subject) ||
    patterns['ID-OP'].test(subject) ||
    patterns['ID-TARGET'].test(subject)
  );
}

export function parseIdentity(
  kind: IdentityKind | string,
  value: string,
): Result<Readonly<{ kind: string; value: string }>> {
  if (
    typeof value !== 'string' ||
    value.normalize('NFC') !== value ||
    codePoints(value) > CANONICAL_LIMITS.maxStringCodePoints
  )
    return subjectFailure('INVALID_SCOPE', 'identity must be a bounded NFC string');
  if (kind === 'ID-EVSUBJ') {
    if (!evidenceSubject(value))
      return subjectFailure('INVALID_SCOPE', 'evidence subject must embed one allowed identity and one claim');
    return { ok: true, value: { kind, value } };
  }
  if (!Object.hasOwn(patterns, kind)) return subjectFailure('INVALID_SCOPE', 'identity kind is unknown');
  if (!patterns[kind as Exclude<IdentityKind, 'ID-EVSUBJ'>].test(value)) {
    const fitsOtherScope = Object.values(patterns).some((pattern) => pattern.test(value));
    return subjectFailure(
      fitsOtherScope ? 'CROSS_SCOPE' : 'INVALID_SCOPE',
      'identity does not satisfy its exact governed scope',
    );
  }
  if (kind === 'ID-TXN' || kind === 'ID-OP') {
    const runs = /^(run-[0-9]{12}-[0-9a-f]{16})\/txn\/[0-9]+\/(run-[0-9]{12}-[0-9a-f]{16})\/gen\//.exec(value);
    if (!runs || runs[1] !== runs[2])
      return subjectFailure('INVALID_SCOPE', 'transaction generation must belong to the same run');
  }
  return { ok: true, value: { kind, value } };
}

function component(components: IdentityComponents, name: string): string | undefined {
  const value = components[name];
  if (
    typeof value !== 'string' ||
    value.normalize('NFC') !== value ||
    codePoints(value) > CANONICAL_LIMITS.maxStringCodePoints
  )
    return undefined;
  return value;
}

function nestedComponents(components: IdentityComponents, name: string): IdentityComponents | undefined {
  const value = components[name];
  return isPlainObject(value) ? (value as IdentityComponents) : undefined;
}

function runComponents(components: IdentityComponents, prefix = 'run'): string | undefined {
  const sequence = component(components, `${prefix}Sequence`);
  const nonce = component(components, `${prefix}Nonce`);
  return sequence === undefined || nonce === undefined ? undefined : `run-${sequence}-${nonce}`;
}

function composeIdentity(kind: IdentityKind | string, components: IdentityComponents): string | undefined {
  const runValue = runComponents(components);
  const one = (name: string) => component(components, name);
  const withRun = (suffix: string) => (runValue === undefined ? undefined : `${runValue}/${suffix}`);
  switch (kind) {
    case 'ID-RUN':
      return runValue;
    case 'ID-STORY': {
      const storyKey = one('storyKey');
      return storyKey === undefined ? undefined : withRun(`story/${storyKey}`);
    }
    case 'ID-TXN': {
      const transactionOrdinal = one('transactionOrdinal');
      const generationRun = runComponents(components, 'generationRun');
      const generationOrdinal = one('generationOrdinal');
      const generationToken = one('generationToken');
      const generationDigest = one('generationDigest');
      return transactionOrdinal === undefined ||
        generationRun === undefined ||
        generationOrdinal === undefined ||
        generationToken === undefined ||
        generationDigest === undefined ||
        generationRun !== runValue
        ? undefined
        : withRun(
            `txn/${transactionOrdinal}/${generationRun}/gen/${generationOrdinal}|${generationToken}|${generationDigest}`,
          );
    }
    case 'ID-EVENT': {
      const eventOrdinal = one('eventOrdinal');
      return eventOrdinal === undefined ? undefined : withRun(`event/${eventOrdinal}`);
    }
    case 'ID-OP': {
      const transaction = composeIdentity('ID-TXN', components);
      const operationOrdinal = one('operationOrdinal');
      return transaction === undefined || operationOrdinal === undefined
        ? undefined
        : `${transaction}/op/${operationOrdinal}`;
    }
    case 'ID-CAND': {
      const storyKey = one('storyKey');
      const candidateOrdinal = one('candidateOrdinal');
      const candidateDigest = one('candidateDigest');
      return storyKey === undefined || candidateOrdinal === undefined || candidateDigest === undefined
        ? undefined
        : withRun(`story/${storyKey}/cand/${candidateOrdinal}|${candidateDigest}`);
    }
    case 'ID-GEN': {
      const generationOrdinal = one('generationOrdinal');
      const generationToken = one('generationToken');
      return generationOrdinal === undefined || generationToken === undefined
        ? undefined
        : withRun(`gen/${generationOrdinal}|${generationToken}`);
    }
    case 'ID-PRINCIPAL': {
      const principalKey = one('principalKey');
      return principalKey === undefined ? undefined : `principal/${principalKey}`;
    }
    case 'ID-MANIFEST': {
      const providerDigest = one('providerDigest');
      const authorityDigest = one('authorityDigest');
      return providerDigest === undefined || authorityDigest === undefined
        ? undefined
        : `provider/${providerDigest}/authority/${authorityDigest}`;
    }
    case 'ID-SESSION': {
      const storyKey = one('storyKey');
      const sessionKey = one('sessionKey');
      const sessionOrdinal = one('sessionOrdinal');
      return storyKey === undefined || sessionKey === undefined || sessionOrdinal === undefined
        ? undefined
        : withRun(`story/${storyKey}/session/${sessionKey}/${sessionOrdinal}`);
    }
    case 'ID-FINDING': {
      const storyKey = one('storyKey');
      const findingOrdinal = one('findingOrdinal');
      return storyKey === undefined || findingOrdinal === undefined
        ? undefined
        : withRun(`story/${storyKey}/finding/${findingOrdinal}`);
    }
    case 'ID-GRANT': {
      const grantOrdinal = one('grantOrdinal');
      return grantOrdinal === undefined ? undefined : withRun(`grant/${grantOrdinal}`);
    }
    case 'ID-PARK': {
      const parkOrdinal = one('parkOrdinal');
      return parkOrdinal === undefined ? undefined : withRun(`park/${parkOrdinal}`);
    }
    case 'ID-SOURCE-REQ': {
      const sourceDigest = one('sourceDigest');
      const requestDigest = one('requestDigest');
      return sourceDigest === undefined || requestDigest === undefined
        ? undefined
        : `source/${sourceDigest}/request/${requestDigest}`;
    }
    case 'ID-REGISTRY': {
      const registryDigest = one('registryDigest');
      return registryDigest === undefined ? undefined : `registry/${registryDigest}`;
    }
    case 'ID-TARGET': {
      const targetKey = one('targetKey');
      return targetKey === undefined ? undefined : `target/${targetKey}`;
    }
    case 'ID-AUTH': {
      const targetKey = one('targetKey');
      const authorityOrdinal = one('authorityOrdinal');
      return targetKey === undefined || authorityOrdinal === undefined
        ? undefined
        : `target/${targetKey}/auth/${authorityOrdinal}`;
    }
    case 'ID-EVSUBJ': {
      const subjectKind = one('subjectKind');
      const subjectComponents = nestedComponents(components, 'subjectComponents');
      const claimKey = one('claimKey');
      if (
        subjectComponents === undefined ||
        claimKey === undefined ||
        !['ID-RUN', 'ID-STORY', 'ID-CAND', 'ID-OP', 'ID-TARGET'].includes(subjectKind ?? '')
      )
        return undefined;
      const subject = composeIdentity(subjectKind as IdentityKind, subjectComponents);
      return subject === undefined ? undefined : `evidence://${subject}/claim/${claimKey}`;
    }
    case 'ID-OBLIGATION': {
      const obligationOrdinal = one('obligationOrdinal');
      return obligationOrdinal === undefined ? undefined : withRun(`obligation/${obligationOrdinal}`);
    }
    case 'ID-SETTLEMENT':
      return withRun('settlement/terminal-stop');
    case 'ID-NOTICE': {
      const noticeKey = one('noticeKey');
      const noticeDigest = one('noticeDigest');
      return noticeKey === undefined || noticeDigest === undefined
        ? undefined
        : withRun(`notice/${noticeKey}/${noticeDigest}`);
    }
    case 'ID-EXPORT': {
      const exportOrdinal = one('exportOrdinal');
      const exportDigest = one('exportDigest');
      return exportOrdinal === undefined || exportDigest === undefined
        ? undefined
        : withRun(`export/${exportOrdinal}/${exportDigest}`);
    }
    default:
      return undefined;
  }
}

/**
 * Formats one governed identity from caller-supplied bounded grammar components.
 * It only composes and validates supplied values: it never allocates an ordinal, digest, or authority.
 */
export function formatIdentity(
  kind: IdentityKind | string,
  components: IdentityComponents,
): Result<Readonly<{ kind: string; value: string }>> {
  if (!isPlainObject(components))
    return subjectFailure('INVALID_SCOPE', 'identity components must be a bounded object');
  const value = composeIdentity(kind, components as IdentityComponents);
  if (value === undefined)
    return subjectFailure('INVALID_SCOPE', 'identity components do not satisfy the governed grammar');
  return parseIdentity(kind, value);
}

export type StagedDigestInput = Readonly<{ domain: string; value: CanonicalJson; excludePaths: readonly string[] }>;
export type StagedDigest = Readonly<{ domain: string; excludePaths: readonly string[]; digest: string }>;

function cloneWithout(value: CanonicalJson, excludePaths: readonly string[]): CanonicalJson {
  const result = structuredClone(value) as CanonicalJson;
  const normalizedPaths = [...excludePaths];
  const seen = new Set<string>();
  for (const path of normalizedPaths) {
    if (!/^[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*$/.test(path) || seen.has(path))
      throw new Error('INVALID_STAGED_DIGEST:exclude paths must be unique object-property paths');
    seen.add(path);
  }
  for (const path of normalizedPaths)
    if (normalizedPaths.some((other) => other !== path && other.startsWith(`${path}.`)))
      throw new Error('INVALID_STAGED_DIGEST:exclude paths must not overlap');
  for (const path of normalizedPaths) {
    const segments = path.split('.');
    let current: CanonicalJson = result;
    for (const segment of segments.slice(0, -1)) {
      if (!isPlainObject(current) || !Object.hasOwn(current, segment))
        throw new Error('INVALID_STAGED_DIGEST:exclude path is absent');
      current = current[segment] as CanonicalJson;
    }
    const last = segments[segments.length - 1] as string;
    if (!isPlainObject(current) || !Object.hasOwn(current, last))
      throw new Error('INVALID_STAGED_DIGEST:exclude path is absent');
    delete (current as Record<string, CanonicalJson>)[last];
  }
  return result;
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
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const length = BigInt(bitLength);
  for (let index = 0; index < 8; index += 1)
    padded[padded.length - 1 - index] = Number((length >> BigInt(index * 8)) & 0xffn);
  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const at = (values: Uint8Array | Uint32Array | readonly number[], index: number) => values[index] ?? 0;
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Uint32Array(64);
    for (let index = 0; index < 16; index += 1)
      words[index] =
        (at(padded, offset + index * 4) << 24) |
        (at(padded, offset + index * 4 + 1) << 16) |
        (at(padded, offset + index * 4 + 2) << 8) |
        at(padded, offset + index * 4 + 3);
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotate(at(words, index - 15), 7) ^ rotate(at(words, index - 15), 18) ^ (at(words, index - 15) >>> 3);
      const s1 = rotate(at(words, index - 2), 17) ^ rotate(at(words, index - 2), 19) ^ (at(words, index - 2) >>> 10);
      words[index] = (at(words, index - 16) + s0 + at(words, index - 7) + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + at(constants, index) + at(words, index)) >>> 0;
      const s0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (at(hash, 0) + a) >>> 0;
    hash[1] = (at(hash, 1) + b) >>> 0;
    hash[2] = (at(hash, 2) + c) >>> 0;
    hash[3] = (at(hash, 3) + d) >>> 0;
    hash[4] = (at(hash, 4) + e) >>> 0;
    hash[5] = (at(hash, 5) + f) >>> 0;
    hash[6] = (at(hash, 6) + g) >>> 0;
    hash[7] = (at(hash, 7) + h) >>> 0;
  }
  return hash.map((part) => part.toString(16).padStart(8, '0')).join('');
}

export function stageDigest(input: StagedDigestInput): Result<StagedDigest> {
  try {
    if (!/^[A-Z][A-Z0-9-]{1,63}$/.test(input.domain)) throw new Error('INVALID_STAGED_DIGEST:domain is not canonical');
    validateValue(input.value);
    const excluded = cloneWithout(input.value, input.excludePaths);
    return {
      ok: true,
      value: {
        domain: input.domain,
        excludePaths: [...input.excludePaths].sort(compareKeys),
        digest: sha256(canonicalBytes({ domain: input.domain, value: excluded })),
      },
    };
  } catch (caught) {
    return subjectFailure(
      'INVALID_STAGED_DIGEST',
      caught instanceof Error ? caught.message : 'invalid staged digest input',
    );
  }
}

export function validateStagedDigest(input: StagedDigest & Readonly<{ value: CanonicalJson }>): Result<string> {
  if (!regex(digest).test(input.digest))
    return subjectFailure('INVALID_STAGED_DIGEST', 'digest must be lowercase SHA-256 hex');
  const staged = stageDigest(input);
  if (!staged.ok) return staged;
  if (
    staged.value.digest !== input.digest ||
    staged.value.excludePaths.join('\0') !== [...input.excludePaths].sort(compareKeys).join('\0')
  )
    return subjectFailure('STAGED_DIGEST_MISMATCH', 'digest does not match the exact staged canonical bytes');
  return { ok: true, value: input.digest };
}
