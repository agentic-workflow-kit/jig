import { closeSync, constants, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs';
import { type CanonicalJson, decodeFrame, encodeFrame } from '@agentic-workflow-kit/jig-codec';
import {
  type ApprovalRepositoryResult,
  type PreRunApproval,
  type PreRunApprovalRepository,
  validatePreRunApproval,
} from '@agentic-workflow-kit/jig-runtime-contracts';

export const PRE_RUN_APPROVAL_ROOT = '<JIG_DATA_HOME>/state/pre-run-approvals';

const freeze = <T>(value: T): T => Object.freeze(value);
const fail = (
  family: 'FC-INPUT' | 'FC-TRUST',
  code:
    | 'INVALID_APPROVAL_RECORD'
    | 'APPROVAL_ABSENT'
    | 'APPROVAL_INTEGRITY_MISMATCH'
    | 'APPROVAL_CONFLICTING_REPLAY'
    | 'APPROVAL_STORAGE_UNAVAILABLE',
): ApprovalRepositoryResult<never> => freeze({ ok: false, error: freeze({ family, code }) });
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);

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
    const expected = [...names].sort();
    if (
      keys.some((key) => typeof key !== 'string') ||
      keys.length !== expected.length ||
      [...keys].sort().some((key, index) => key !== expected[index])
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (!names.every((name) => descriptors[name]?.enumerable && 'value' in descriptors[name])) return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
  } catch {
    return undefined;
  }
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function fileBytes(record: PreRunApproval): Uint8Array | undefined {
  const encoded = encodeFrame(record as unknown as CanonicalJson);
  return encoded.ok ? encoded.value : undefined;
}

function readStored(path: string): ApprovalRepositoryResult<PreRunApproval> {
  try {
    const stats = lstatSync(path);
    if (!stats.isFile() || stats.isSymbolicLink()) return fail('FC-TRUST', 'APPROVAL_INTEGRITY_MISMATCH');
    const bytes = readFileSync(path);
    const decoded = decodeFrame(bytes);
    if (!decoded.ok) return fail('FC-TRUST', 'APPROVAL_INTEGRITY_MISMATCH');
    const validated = validatePreRunApproval(decoded.value);
    return validated.ok ? validated : fail('FC-TRUST', 'APPROVAL_INTEGRITY_MISMATCH');
  } catch (error) {
    return (error as { code?: unknown }).code === 'ENOENT'
      ? fail('FC-TRUST', 'APPROVAL_ABSENT')
      : fail('FC-TRUST', 'APPROVAL_STORAGE_UNAVAILABLE');
  }
}

export function createLocalPreRunApprovalRepository(root: string): PreRunApprovalRepository {
  if (typeof root !== 'string' || root.length === 0 || root.includes('\u0000') || !root.startsWith('/'))
    throw new TypeError('INVALID_APPROVAL_ROOT');
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const reference = (key: string): string => `${root}/${key}.approval`;
  const repository: PreRunApprovalRepository = {
    createIfAbsent(input) {
      const raw = fields(input, [
        'approvalDigest',
        'key',
        'kind',
        'principal',
        'schema',
        'scope',
        'scopeDigest',
        'subjectDigest',
      ]);
      const candidateKey = raw?.key;
      if (typeof candidateKey === 'string' && digest(candidateKey)) {
        const existing = readStored(reference(candidateKey));
        if (existing.ok) {
          const candidateBytes = encodeFrame(input as CanonicalJson);
          return candidateBytes.ok && bytesEqual(fileBytes(existing.value) as Uint8Array, candidateBytes.value)
            ? existing
            : fail('FC-TRUST', 'APPROVAL_CONFLICTING_REPLAY');
        }
        if (existing.error.code !== 'APPROVAL_ABSENT') return existing;
      }
      const validated = validatePreRunApproval(input);
      if (!validated.ok) return validated;
      const bytes = fileBytes(validated.value);
      if (!bytes) return fail('FC-INPUT', 'INVALID_APPROVAL_RECORD');
      const path = reference(validated.value.key);
      try {
        const fd = openSync(
          path,
          constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
          0o600,
        );
        try {
          const written = writeSync(fd, bytes, 0, bytes.byteLength);
          if (written !== bytes.byteLength) return fail('FC-TRUST', 'APPROVAL_STORAGE_UNAVAILABLE');
          fsyncSync(fd);
        } finally {
          closeSync(fd);
        }
        return freeze({ ok: true, value: freeze(validated.value) });
      } catch (error) {
        if ((error as { code?: unknown }).code !== 'EEXIST') return fail('FC-TRUST', 'APPROVAL_STORAGE_UNAVAILABLE');
        const existing = readStored(path);
        if (!existing.ok) return existing;
        return bytesEqual(fileBytes(existing.value) as Uint8Array, bytes)
          ? existing
          : fail('FC-TRUST', 'APPROVAL_CONFLICTING_REPLAY');
      }
    },
    read(input) {
      if (typeof input !== 'string' || !digest(input)) return fail('FC-INPUT', 'INVALID_APPROVAL_RECORD');
      return readStored(reference(input));
    },
  };
  return freeze(repository);
}
