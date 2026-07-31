import type { PreflightRequest, PreflightResult } from '@agentic-workflow-kit/jig-runtime-contracts';
import {
  canonicalSnapshot,
  type FileMechanismResult,
  fail,
  isDigest,
  isPosition,
  ok,
  readJsonFile,
  resourceKey,
  stagedDigest,
  writeCreateOnlyJson,
} from './path-confinement.js';

export function createLocalFilePreflightForConformance(root: string) {
  const read = (
    key: string,
    variant: 'start' | 'result',
  ): FileMechanismResult<PreflightResult | { kind: 'absent' }> => {
    if (typeof key !== 'string' || key.length === 0 || (variant !== 'start' && variant !== 'result'))
      return fail('FC-INPUT', 'INVALID_PREFLIGHT_READ');
    const decoded = readJsonFile(root, [resourceKey(key), `${variant}.json`]);
    if (!decoded.ok) return decoded.error.code === 'READ_FAILED' ? ok(Object.freeze({ kind: 'absent' })) : decoded;
    try {
      const result = decoded.value as PreflightResult;
      if (
        typeof result !== 'object' ||
        result === null ||
        Object.keys(result).sort().join(',') !== 'bytes,deadline,digest,key' ||
        result.key !== `${key}/${variant}` ||
        !isDigest(result.digest) ||
        !isPosition(result.deadline) ||
        result.deadline < 0
      )
        return fail('FC-TRUST', 'PREFLIGHT_UNVERIFIABLE');
      const staged = stagedDigest('PREFLIGHT-ATTEMPT', result.bytes, []);
      return staged.ok && staged.value === result.digest
        ? ok(Object.freeze(result))
        : fail('FC-TRUST', 'PREFLIGHT_UNVERIFIABLE');
    } catch {
      return fail('FC-TRUST', 'PREFLIGHT_UNVERIFIABLE');
    }
  };
  return Object.freeze({
    read,
    create(request: PreflightRequest): FileMechanismResult<PreflightResult> {
      if (
        typeof request?.key !== 'string' ||
        request.key.length === 0 ||
        (request.variant !== 'start' && request.variant !== 'result') ||
        !isPosition(request.deadline) ||
        request.deadline < 0 ||
        (request.observedAt !== undefined &&
          (!isPosition(request.observedAt) || request.observedAt < 0 || request.observedAt > request.deadline)) ||
        (request.variant === 'start' ? request.predecessor !== undefined : !isDigest(request.predecessor))
      )
        return fail('FC-INPUT', 'INVALID_PREFLIGHT');
      const bytes = canonicalSnapshot(request.bytes);
      if (!bytes.ok) return fail('FC-INPUT', 'INVALID_PREFLIGHT_BYTES');
      const staged = stagedDigest('PREFLIGHT-ATTEMPT', bytes.value, []);
      if (!staged.ok) return fail('FC-INPUT', 'INVALID_PREFLIGHT_BYTES');
      if (request.variant === 'result') {
        const start = read(request.key, 'start');
        if (!start.ok || 'kind' in start.value || start.value.digest !== request.predecessor)
          return fail('FC-FENCE', 'INVALID_PREFLIGHT_PREDECESSOR');
      }
      const result = Object.freeze({
        key: `${request.key}/${request.variant}`,
        digest: staged.value,
        bytes: bytes.value,
        deadline: request.deadline,
      });
      const existing = read(request.key, request.variant);
      if (existing.ok && !('kind' in existing.value))
        return existing.value.digest === result.digest && existing.value.deadline === result.deadline
          ? ok(existing.value)
          : fail('FC-FENCE', 'PREFLIGHT_MISMATCH');
      const stored = writeCreateOnlyJson(root, [resourceKey(request.key)], `${request.variant}.json`, result);
      if (!stored.ok && stored.error.code === 'ALREADY_EXISTS') {
        const raced = read(request.key, request.variant);
        return raced.ok && !('kind' in raced.value) && raced.value.digest === result.digest
          ? ok(raced.value)
          : fail('FC-FENCE', 'PREFLIGHT_MISMATCH');
      }
      return stored.ok ? ok(result) : stored;
    },
  });
}
