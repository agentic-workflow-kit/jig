import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeSync,
} from 'node:fs';

export type FileMechanismFailureFamily = 'FC-INPUT' | 'FC-SUBJECT' | 'FC-FENCE' | 'FC-TRUST' | 'FC-MECHANISM';
export type FileMechanismFailure = Readonly<{ family: FileMechanismFailureFamily; code: string }>;
export type FileMechanismResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: FileMechanismFailure }>;

export const ok = <T>(value: T): FileMechanismResult<T> => Object.freeze({ ok: true, value });
export const fail = (family: FileMechanismFailureFamily, code: string): FileMechanismResult<never> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
export const isDigest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
export const isPosition = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= -1;
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const MAX_FILE_BYTES = 262_144;
const MAX_CANONICAL_BYTES = 65_536;
const MAX_DEPTH = 32;
const MAX_COLLECTION_ENTRIES = 256;
const MAX_STRING_CODE_POINTS = 4_096;
const syntheticIndependentRoots = new WeakSet<object>();

export type IndependentRootEvidence = Readonly<{
  kind: 'synthetic-conformance-only';
  primaryRoot: string;
  witnessRoot: string;
}>;

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
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const length = BigInt(bytes.length * 8);
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
      const first =
        rotate(at(words, index - 15), 7) ^ rotate(at(words, index - 15), 18) ^ (at(words, index - 15) >>> 3);
      const second =
        rotate(at(words, index - 2), 17) ^ rotate(at(words, index - 2), 19) ^ (at(words, index - 2) >>> 10);
      words[index] = (at(words, index - 16) + first + at(words, index - 7) + second) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const first = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary = (h + first + choice + at(constants, index) + at(words, index)) >>> 0;
      const second = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      h = g;
      g = f;
      f = e;
      e = (d + temporary) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary + second + majority) >>> 0;
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

function validString(value: string): boolean {
  if (value.normalize('NFC') !== value || [...value].length > MAX_STRING_CODE_POINTS) return false;
  for (let index = 0; index < value.length; index += 1) {
    const point = value.charCodeAt(index);
    if (point >= 0xd800 && point <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (point >= 0xdc00 && point <= 0xdfff) return false;
  }
  return true;
}

function snapshot(value: unknown, depth = 0): Json {
  if (depth > MAX_DEPTH) throw new Error('too deep');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (!validString(value)) throw new Error('invalid string');
    return value;
  }
  if (typeof value === 'number' && Number.isSafeInteger(value) && !Object.is(value, -0)) return value;
  if (Array.isArray(value)) {
    if (
      Object.getPrototypeOf(value) !== Array.prototype ||
      value.length > MAX_COLLECTION_ENTRIES ||
      Reflect.ownKeys(value).length !== value.length + 1
    )
      throw new Error('invalid array');
    return value.map((entry) => snapshot(entry, depth + 1));
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('invalid object');
  const keys = Reflect.ownKeys(value);
  if (keys.length > MAX_COLLECTION_ENTRIES || keys.some((key) => typeof key !== 'string' || !validString(key)))
    throw new Error('invalid key');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result: Record<string, Json> = {};
  for (const key of keys as string[]) {
    const descriptor = descriptors[key];
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new Error('invalid field');
    result[key] = snapshot(descriptor.value, depth + 1);
  }
  return result;
}

function canonicalText(value: Json): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalText).join(',')}]`;
  return `{${Object.keys(value)
    .sort((left, right) => {
      const a = [...left];
      const b = [...right];
      for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
        const difference = (a[index]?.codePointAt(0) ?? 0) - (b[index]?.codePointAt(0) ?? 0);
        if (difference !== 0) return difference;
      }
      return a.length - b.length;
    })
    .map((key) => `${JSON.stringify(key)}:${canonicalText(value[key] as Json)}`)
    .join(',')}}`;
}

export function canonicalSnapshot(value: unknown): FileMechanismResult<Json> {
  try {
    return ok(snapshot(value));
  } catch {
    return fail('FC-INPUT', 'NONCANONICAL_VALUE');
  }
}

export function stagedDigest(domain: string, value: unknown, excluded: readonly string[]): FileMechanismResult<string> {
  try {
    if (!/^[A-Z][A-Z0-9-]{1,63}$/u.test(domain)) return fail('FC-INPUT', 'INVALID_DIGEST_DOMAIN');
    const cloned = snapshot(value);
    if (excluded.length > 0 && (typeof cloned !== 'object' || cloned === null || Array.isArray(cloned)))
      return fail('FC-INPUT', 'INVALID_DIGEST_VALUE');
    for (const path of excluded) {
      if (
        !/^[a-zA-Z][a-zA-Z0-9]*$/u.test(path) ||
        typeof cloned !== 'object' ||
        cloned === null ||
        Array.isArray(cloned) ||
        !(path in cloned)
      )
        return fail('FC-INPUT', 'INVALID_DIGEST_EXCLUSION');
      delete cloned[path];
    }
    const bytes = new TextEncoder().encode(canonicalText({ domain, value: cloned }));
    return bytes.byteLength <= MAX_CANONICAL_BYTES ? ok(sha256(bytes)) : fail('FC-INPUT', 'INVALID_DIGEST_VALUE');
  } catch {
    return fail('FC-INPUT', 'INVALID_DIGEST_VALUE');
  }
}

export const resourceKey = (value: string): string => sha256(new TextEncoder().encode(value));

const safePart = (value: string): boolean =>
  value.length > 0 &&
  value.length <= 128 &&
  value !== '.' &&
  value !== '..' &&
  !value.includes('/') &&
  !value.includes('\\') &&
  !value.includes('\0');

function checkedRoot(root: string): FileMechanismResult<string> {
  try {
    if (!root.startsWith('/') || !existsSync(root)) return fail('FC-MECHANISM', 'ROOT_UNAVAILABLE');
    const stat = lstatSync(root);
    if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(root) !== root)
      return fail('FC-TRUST', 'UNTRUSTED_ROOT');
    return ok(root);
  } catch {
    return fail('FC-MECHANISM', 'ROOT_UNAVAILABLE');
  }
}

export function confinedPath(root: string, parts: readonly string[]): FileMechanismResult<string> {
  const trusted = checkedRoot(root);
  if (!trusted.ok) return trusted;
  if (parts.length === 0 || parts.some((part) => !safePart(part))) return fail('FC-SUBJECT', 'PATH_OUT_OF_SCOPE');
  const candidate = `${root}/${parts.join('/')}`;
  return ok(candidate);
}

/** Test-only evidence for exercising mechanism semantics without claiming live witness qualification. */
export function createSyntheticIndependentRootsForConformance(
  primaryRoot: string,
  witnessRoot: string,
): FileMechanismResult<IndependentRootEvidence> {
  const primary = checkedRoot(primaryRoot);
  const witness = checkedRoot(witnessRoot);
  if (!primary.ok) return primary;
  if (!witness.ok) return witness;
  if (
    primary.value === witness.value ||
    witness.value.startsWith(`${primary.value}/`) ||
    primary.value.startsWith(`${witness.value}/`)
  )
    return fail('FC-TRUST', 'WITNESS_NOT_INDEPENDENT');
  const evidence = Object.freeze({
    kind: 'synthetic-conformance-only' as const,
    primaryRoot: primary.value,
    witnessRoot: witness.value,
  });
  syntheticIndependentRoots.add(evidence);
  return ok(evidence);
}

export function verifySeparateRoots(
  primaryRoot: string,
  witnessRoot: string,
  evidence?: IndependentRootEvidence,
): FileMechanismResult<void> {
  const primary = checkedRoot(primaryRoot);
  const witness = checkedRoot(witnessRoot);
  if (!primary.ok) return primary;
  if (!witness.ok) return witness;
  if (
    primary.value === witness.value ||
    witness.value.startsWith(`${primary.value}/`) ||
    primary.value.startsWith(`${witness.value}/`)
  )
    return fail('FC-TRUST', 'WITNESS_NOT_INDEPENDENT');
  try {
    if (lstatSync(primary.value).dev !== lstatSync(witness.value).dev) return ok(undefined);
    return evidence &&
      syntheticIndependentRoots.has(evidence) &&
      evidence.primaryRoot === primary.value &&
      evidence.witnessRoot === witness.value
      ? ok(undefined)
      : fail('FC-TRUST', 'WITNESS_NOT_INDEPENDENT');
  } catch {
    return fail('FC-MECHANISM', 'ROOT_UNAVAILABLE');
  }
}

export function ensureConfinedDirectory(root: string, parts: readonly string[]): FileMechanismResult<string> {
  let current = root;
  const trusted = checkedRoot(root);
  if (!trusted.ok) return trusted;
  try {
    for (let index = 0; index < parts.length; index += 1) {
      const next = confinedPath(root, parts.slice(0, index + 1));
      if (!next.ok) return next;
      current = next.value;
      if (!existsSync(current)) mkdirSync(current);
      const stat = lstatSync(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) return fail('FC-TRUST', 'UNTRUSTED_PATH_COMPONENT');
    }
    return ok(current);
  } catch {
    return fail('FC-MECHANISM', 'DIRECTORY_CREATE_FAILED');
  }
}

function errorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined;
}

export function readJsonFile(root: string, parts: readonly string[]): FileMechanismResult<unknown> {
  const path = confinedPath(root, parts);
  if (!path.ok) return path;
  let descriptor: number | undefined;
  try {
    const directoryParts = parts.slice(0, -1);
    const directories = [
      root,
      ...directoryParts.map((_, index) => `${root}/${directoryParts.slice(0, index + 1).join('/')}`),
    ].map((directory) => {
      const stat = lstatSync(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(directory) !== directory)
        throw new Error('untrusted directory');
      return Object.freeze({ directory, dev: stat.dev, ino: stat.ino });
    });
    const pathStat = lstatSync(path.value);
    if (
      !pathStat.isFile() ||
      pathStat.isSymbolicLink() ||
      pathStat.nlink !== 1 ||
      pathStat.size < 2 ||
      pathStat.size > MAX_FILE_BYTES ||
      realpathSync(path.value) !== path.value
    )
      return fail('FC-TRUST', 'UNTRUSTED_FILE');
    descriptor = openSync(path.value, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(descriptor);
    if (
      !opened.isFile() ||
      opened.dev !== pathStat.dev ||
      opened.ino !== pathStat.ino ||
      opened.nlink !== 1 ||
      opened.size !== pathStat.size
    )
      return fail('FC-TRUST', 'UNTRUSTED_FILE');
    for (const expected of directories) {
      const current = lstatSync(expected.directory);
      if (
        !current.isDirectory() ||
        current.isSymbolicLink() ||
        current.dev !== expected.dev ||
        current.ino !== expected.ino ||
        realpathSync(expected.directory) !== expected.directory
      )
        return fail('FC-TRUST', 'UNTRUSTED_PATH_COMPONENT');
    }
    const bytes = new Uint8Array(opened.size);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const count = readSync(descriptor, bytes, offset, bytes.byteLength - offset, offset);
      if (!Number.isSafeInteger(count) || count <= 0) throw new Error('short read');
      offset += count;
    }
    const after = fstatSync(descriptor);
    if (
      after.dev !== opened.dev ||
      after.ino !== opened.ino ||
      after.nlink !== opened.nlink ||
      after.size !== opened.size ||
      after.mtimeMs !== opened.mtimeMs
    )
      return fail('FC-TRUST', 'UNTRUSTED_FILE');
    closeSync(descriptor);
    descriptor = undefined;
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!text.endsWith('\n')) return fail('FC-TRUST', 'UNTRUSTED_FILE');
      const value = snapshot(JSON.parse(text));
      return `${canonicalText(value)}\n` === text ? ok(value) : fail('FC-TRUST', 'UNTRUSTED_FILE');
    } catch {
      return fail('FC-TRUST', 'UNTRUSTED_FILE');
    }
  } catch (error) {
    return fail('FC-MECHANISM', errorCode(error) === 'ENOENT' ? 'FILE_ABSENT' : 'READ_FAILED');
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {}
    }
  }
}

export function listConfinedFiles(root: string, parts: readonly string[]): FileMechanismResult<readonly string[]> {
  const directory = parts.length === 0 ? checkedRoot(root) : confinedPath(root, parts);
  if (!directory.ok) return directory;
  try {
    const stat = lstatSync(directory.value);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return fail('FC-TRUST', 'UNTRUSTED_DIRECTORY');
    const names = readdirSync(directory.value);
    if (names.some((name) => !safePart(name))) return fail('FC-TRUST', 'UNTRUSTED_DIRECTORY_ENTRY');
    return ok(Object.freeze([...names].sort()));
  } catch (error) {
    return fail('FC-MECHANISM', errorCode(error) === 'ENOENT' ? 'FILE_ABSENT' : 'READ_FAILED');
  }
}

export function writeCreateOnlyJson(
  root: string,
  directoryParts: readonly string[],
  file: string,
  value: unknown,
): FileMechanismResult<void> {
  if (!safePart(file)) return fail('FC-SUBJECT', 'PATH_OUT_OF_SCOPE');
  const directory = ensureConfinedDirectory(root, directoryParts);
  if (!directory.ok) return directory;
  const path = confinedPath(root, [...directoryParts, file]);
  if (!path.ok) return path;
  let descriptor: number | undefined;
  let directoryDescriptor: number | undefined;
  let temporaryFile: string | undefined;
  let temporaryDirectory: string | undefined;
  try {
    const canonical = canonicalSnapshot(value);
    if (!canonical.ok) return canonical;
    const bytes = new TextEncoder().encode(`${canonicalText(canonical.value)}\n`);
    if (bytes.byteLength > MAX_FILE_BYTES) return fail('FC-INPUT', 'VALUE_TOO_LARGE');
    const staging = ensureConfinedDirectory(root, ['staging']);
    if (!staging.ok) return staging;
    temporaryDirectory = mkdtempSync(`${staging.value}/write-`);
    temporaryFile = `${temporaryDirectory}/payload`;
    descriptor = openSync(temporaryFile, 'wx', 0o600);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const written = writeSync(descriptor, bytes, offset, bytes.byteLength - offset);
      if (!Number.isSafeInteger(written) || written <= 0) throw new Error('short write');
      offset += written;
    }
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    linkSync(temporaryFile, path.value);
    unlinkSync(temporaryFile);
    temporaryFile = undefined;
    rmdirSync(temporaryDirectory);
    temporaryDirectory = undefined;
    const parent = path.value.slice(0, path.value.lastIndexOf('/'));
    directoryDescriptor = openSync(parent, constants.O_RDONLY | constants.O_DIRECTORY);
    fsyncSync(directoryDescriptor);
    closeSync(directoryDescriptor);
    directoryDescriptor = undefined;
    return ok(undefined);
  } catch (error) {
    for (const open of [descriptor, directoryDescriptor]) {
      if (open === undefined) continue;
      try {
        closeSync(open);
      } catch {}
    }
    if (temporaryFile !== undefined) {
      try {
        unlinkSync(temporaryFile);
      } catch {}
    }
    if (temporaryDirectory !== undefined) {
      try {
        rmdirSync(temporaryDirectory);
      } catch {}
    }
    const code = errorCode(error);
    return fail(code === 'EEXIST' ? 'FC-FENCE' : 'FC-MECHANISM', code === 'EEXIST' ? 'ALREADY_EXISTS' : 'WRITE_FAILED');
  }
}
