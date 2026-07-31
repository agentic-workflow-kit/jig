import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync } from 'node:fs';
import {
  decodeSourceRequest,
  encodeSourceCandidate,
  type SourceExchange,
  type SourceResult,
  structuredFileProviderGate,
  validateSourceExchange,
} from '@agentic-workflow-kit/jig-runtime-contracts';

export const STRUCTURED_FILE_SOURCE_IDENTITY = 'source/structured-json-file-source';
export const STRUCTURED_FILE_SOURCE_PATH = '/Users/aryekogan/.local/share/jig/work-sources/work-plan.json';
export const STRUCTURED_FILE_SOURCE_MANIFEST = new TextEncoder().encode(
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[{"access":"read-only","discovery":"none","locator":{"kind":"exact-file","path":"/Users/aryekogan/.local/share/jig/work-sources/work-plan.json"},"regularFileOnly":true,"symlinkPolicy":"reject","traversalPolicy":"reject"}],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":[],"networkAuthority":[],"packageIdentity":"packages/local-file-providers","providerIdentity":"structured-json-file-source/v1","runtimeAuthority":{"environmentIdentity":"environment/local-file-source","kind":"in-process-local-file-provider"},"scope":{"phase":2,"purpose":"structured-file-work-source","story":"GF-020"},"subprocessAuthority":[]}\n',
);
export const STRUCTURED_FILE_SOURCE_MANIFEST_ID =
  'provider/332e924db587773fae8b38359c47e715e2064d3ba3f1a7091130e4da661dc73e/authority/982a0cde5b335759925af0003f58a87f1bfd2e03a25f046216bd4aa9569994cd';
export const SOURCE_WAIT_DEFAULT_MS = 900_000;
export const SOURCE_RETRY_DEFAULT = 3;
export const SOURCE_WAIT_MIN_MS = 5_000;
export const SOURCE_WAIT_MAX_MS = 7_200_000;
export const SOURCE_RETRY_MIN = 1;
export const SOURCE_RETRY_MAX = 5;
const MAX_BYTES = 65_536;
const MAX_JSON_DEPTH = 32;

export type FileSourceFailure = Readonly<{ family: 'FC-INPUT' | 'FC-MECHANISM'; code: string }>;
export type FileSourceResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: FileSourceFailure }>;
const fail = (family: FileSourceFailure['family'], code: string): FileSourceResult<never> => ({
  ok: false,
  error: { family, code },
});
const sourceFail = <T>(value: SourceResult<T>): FileSourceResult<T> =>
  value.ok
    ? { ok: true, value: value.value }
    : fail(value.error.family === 'FC-MECHANISM' ? 'FC-MECHANISM' : 'FC-INPUT', value.error.code);

/** Effect-free guard: it preserves GF-019's request identity and opaque retry receipt semantics. */
export function validateStructuredFileSourceRequest(requestFrame: unknown): FileSourceResult<void> {
  const request = decodeSourceRequest(requestFrame);
  if (!request.ok || request.value.sourceIdentity !== STRUCTURED_FILE_SOURCE_IDENTITY)
    return fail('FC-INPUT', 'REQUEST_BINDING_MISMATCH');
  if (
    request.value.deadline < SOURCE_WAIT_MIN_MS ||
    request.value.deadline > SOURCE_WAIT_MAX_MS ||
    request.value.retry.limit < SOURCE_RETRY_MIN ||
    request.value.retry.limit > SOURCE_RETRY_MAX
  )
    return fail('FC-INPUT', 'SOURCE_BOUND_OUT_OF_RANGE');
  return { ok: true, value: undefined };
}

function strictJson(bytes: Uint8Array): FileSourceResult<unknown> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return fail('FC-INPUT', 'INVALID_FILE_BYTES');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return fail('FC-INPUT', 'INVALID_FILE_BYTES');
  }
  const duplicate = duplicateJsonKey(text);
  if (duplicate) return fail('FC-INPUT', duplicate);
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return fail('FC-INPUT', 'INVALID_JSON');
  }
}

/** Walk JSON syntax before JSON.parse: the native parser otherwise silently accepts duplicate keys. */
function duplicateJsonKey(text: string): 'DUPLICATE_JSON_KEY' | 'JSON_DEPTH_EXCEEDED' | undefined {
  let index = 0;
  const whitespace = () => {
    while (/\s/u.test(text[index] ?? '')) index += 1;
  };
  const string = (): string | undefined => {
    if (text[index] !== '"') return undefined;
    const start = index++;
    let escaped = false;
    while (index < text.length) {
      const character = text[index++] as string;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === '"') {
        try {
          return JSON.parse(text.slice(start, index)) as string;
        } catch {
          return undefined;
        }
      }
      if (character < ' ') return undefined;
    }
    return undefined;
  };
  const scalar = () => {
    const match = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/u.exec(text.slice(index));
    if (!match) return false;
    index += match[0].length;
    return true;
  };
  const value = (depth: number): boolean | 'DUPLICATE_JSON_KEY' | 'JSON_DEPTH_EXCEEDED' => {
    if (depth > MAX_JSON_DEPTH) return 'JSON_DEPTH_EXCEEDED';
    whitespace();
    if (text[index] === '"') return string() !== undefined;
    if (text[index] === '[') {
      index += 1;
      whitespace();
      if (text[index] === ']') {
        index += 1;
        return true;
      }
      while (true) {
        const nested = value(depth + 1);
        if (nested !== true) return nested;
        whitespace();
        if (text[index] === ']') {
          index += 1;
          return true;
        }
        if (text[index++] !== ',') return false;
      }
    }
    if (text[index] !== '{') return scalar();
    index += 1;
    const keys = new Set<string>();
    whitespace();
    if (text[index] === '}') {
      index += 1;
      return true;
    }
    while (true) {
      whitespace();
      const key = string();
      if (key === undefined) return false;
      if (keys.has(key)) return 'DUPLICATE_JSON_KEY';
      keys.add(key);
      whitespace();
      if (text[index++] !== ':') return false;
      const nested = value(depth + 1);
      if (nested !== true) return nested;
      whitespace();
      if (text[index] === '}') {
        index += 1;
        return true;
      }
      if (text[index++] !== ',') return false;
    }
  };
  const parsed = value(0);
  whitespace();
  return parsed === true && index === text.length ? undefined : parsed === true ? undefined : parsed || undefined;
}

function readOpenedFile(fd: number, size: number): FileSourceResult<Uint8Array> {
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES) return fail('FC-INPUT', 'UNSAFE_FILE');
  const bytes = new Uint8Array(size);
  let offset = 0;
  while (offset < bytes.length) {
    const count = readSync(fd, bytes, offset, bytes.length - offset, offset);
    if (!Number.isSafeInteger(count) || count <= 0) return fail('FC-MECHANISM', 'SOURCE_UNAVAILABLE');
    offset += count;
  }
  return { ok: true, value: bytes };
}

/** This mechanism is deliberately private: only the manifest-scoped exact path can reach it. */
function readStructuredFileSource(requestFrame: unknown): FileSourceResult<SourceExchange> {
  const filePath = STRUCTURED_FILE_SOURCE_PATH;
  const bounded = validateStructuredFileSourceRequest(requestFrame);
  if (!bounded.ok) return bounded;
  let fd: number | undefined;
  try {
    const before = lstatSync(filePath);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) return fail('FC-INPUT', 'UNSAFE_FILE');
    if (realpathSync(filePath) !== filePath) return fail('FC-INPUT', 'PATH_OUT_OF_SCOPE');
    fd = openSync(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(fd);
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      opened.size > MAX_BYTES ||
      opened.dev !== before.dev ||
      opened.ino !== before.ino
    )
      return fail('FC-MECHANISM', 'TOCTOU_DETECTED');
    const bytes = readOpenedFile(fd, opened.size);
    if (!bytes.ok) return bytes;
    const parsed = strictJson(bytes.value);
    const after = fstatSync(fd);
    if (
      opened.dev !== after.dev ||
      opened.ino !== after.ino ||
      opened.size !== after.size ||
      opened.mtimeMs !== after.mtimeMs
    )
      return fail('FC-MECHANISM', 'TOCTOU_DETECTED');
    if (!parsed.ok) return parsed;
    const request = decodeSourceRequest(requestFrame);
    if (!request.ok || request.value.sourceIdentity !== STRUCTURED_FILE_SOURCE_IDENTITY)
      return fail('FC-INPUT', 'REQUEST_BINDING_MISMATCH');
    const candidate = encodeSourceCandidate(requestFrame, parsed.value);
    if (!candidate.ok) return sourceFail(candidate);
    return sourceFail(validateSourceExchange(requestFrame, candidate.value));
  } catch {
    return fail('FC-MECHANISM', 'SOURCE_UNAVAILABLE');
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** The owner-selected source is absent; no positive external qualification is represented in this package. */
export function createQualifiedStructuredFileSource(): FileSourceResult<never> {
  const gate = structuredFileProviderGate({
    manifestBytes: STRUCTURED_FILE_SOURCE_MANIFEST,
    manifestId: STRUCTURED_FILE_SOURCE_MANIFEST_ID,
    providerBuild: 'build/unqualified',
    environment: 'environment/local-file-source',
    scope: { phase: 2, purpose: 'structured-file-work-source', story: 'GF-020' },
  });
  if (!gate.ok) return fail('FC-MECHANISM', 'PROVIDER_UNAVAILABLE_UNQUALIFIED');
  return fail('FC-MECHANISM', 'PROVIDER_UNAVAILABLE_UNQUALIFIED');
}
