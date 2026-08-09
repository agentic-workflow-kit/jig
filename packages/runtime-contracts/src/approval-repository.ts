import { type CanonicalJson, stageDigest } from '@agentic-workflow-kit/jig-codec';

export const PRE_RUN_APPROVAL_SCHEMA = 'jig.pre-run-approval.v1';

export type ApprovalKind = 'proposal-approved' | 'provider-manifest-approved';
export type DevelopmentApprovalScope = Readonly<{ phase: 3; purpose: 'development-only' }>;
export type PreRunApproval = Readonly<{
  schema: typeof PRE_RUN_APPROVAL_SCHEMA;
  kind: ApprovalKind;
  principal: 'principal/arye';
  subjectDigest: string;
  scope: DevelopmentApprovalScope;
  scopeDigest: string;
  key: string;
  approvalDigest: string;
}>;

export type ApprovalRepositoryFailure = Readonly<{
  family: 'FC-INPUT' | 'FC-TRUST';
  code:
    | 'INVALID_APPROVAL_RECORD'
    | 'APPROVAL_ABSENT'
    | 'APPROVAL_INTEGRITY_MISMATCH'
    | 'APPROVAL_CONFLICTING_REPLAY'
    | 'APPROVAL_STORAGE_UNAVAILABLE';
}>;
export type ApprovalRepositoryResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: ApprovalRepositoryFailure }>;
export type PreRunApprovalRepository = Readonly<{
  createIfAbsent(record: unknown): ApprovalRepositoryResult<PreRunApproval>;
  read(key: unknown): ApprovalRepositoryResult<PreRunApproval>;
}>;

const freeze = <T>(value: T): T => Object.freeze(value);
const ok = <T>(value: T): ApprovalRepositoryResult<T> => freeze({ ok: true, value: freeze(value) });
const fail = (
  family: ApprovalRepositoryFailure['family'],
  code: ApprovalRepositoryFailure['code'],
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

function staged(domain: string, value: CanonicalJson): string | undefined {
  const result = stageDigest({ domain, excludePaths: [], value });
  return result.ok ? result.value.digest : undefined;
}

function scope(value: unknown): DevelopmentApprovalScope | undefined {
  const data = fields(value, ['phase', 'purpose']);
  return data?.phase === 3 && data.purpose === 'development-only'
    ? freeze({ phase: 3, purpose: 'development-only' })
    : undefined;
}

function keyFor(kind: ApprovalKind, principal: string, subjectDigest: string, scopeDigest: string): string | undefined {
  return staged('DEVELOPMENT-OWNER-APPROVAL-KEY', {
    schema: PRE_RUN_APPROVAL_SCHEMA,
    kind,
    principal,
    subjectDigest,
    scopeDigest,
  });
}

function contentFor(record: Omit<PreRunApproval, 'approvalDigest'>): string | undefined {
  return staged('DEVELOPMENT-OWNER-APPROVAL', record as unknown as CanonicalJson);
}

export function validatePreRunApproval(input: unknown): ApprovalRepositoryResult<PreRunApproval> {
  const data = fields(input, [
    'approvalDigest',
    'key',
    'kind',
    'principal',
    'schema',
    'scope',
    'scopeDigest',
    'subjectDigest',
  ]);
  const recordScope = data && scope(data.scope);
  const expectedKey =
    data &&
    (data.kind === 'proposal-approved' || data.kind === 'provider-manifest-approved') &&
    data.principal === 'principal/arye' &&
    digest(data.subjectDigest) &&
    digest(data.scopeDigest)
      ? keyFor(data.kind, data.principal, data.subjectDigest, data.scopeDigest)
      : undefined;
  const canonical: PreRunApproval | undefined =
    data &&
    recordScope &&
    data.schema === PRE_RUN_APPROVAL_SCHEMA &&
    (data.kind === 'proposal-approved' || data.kind === 'provider-manifest-approved') &&
    data.principal === 'principal/arye' &&
    digest(data.subjectDigest) &&
    digest(data.scopeDigest) &&
    digest(data.key) &&
    digest(data.approvalDigest) &&
    expectedKey === data.key &&
    staged('DEVELOPMENT-PROVIDER-SCOPE', recordScope) === data.scopeDigest
      ? freeze({
          schema: PRE_RUN_APPROVAL_SCHEMA as typeof PRE_RUN_APPROVAL_SCHEMA,
          kind: data.kind as ApprovalKind,
          principal: 'principal/arye' as const,
          subjectDigest: data.subjectDigest as string,
          scope: recordScope,
          scopeDigest: data.scopeDigest as string,
          key: data.key as string,
          approvalDigest: data.approvalDigest as string,
        })
      : undefined;
  if (!canonical) return fail('FC-INPUT', 'INVALID_APPROVAL_RECORD');
  const expectedContent = contentFor({
    schema: canonical.schema,
    kind: canonical.kind,
    principal: canonical.principal,
    subjectDigest: canonical.subjectDigest,
    scope: canonical.scope,
    scopeDigest: canonical.scopeDigest,
    key: canonical.key,
  });
  return expectedContent === canonical.approvalDigest ? ok(canonical) : fail('FC-TRUST', 'APPROVAL_INTEGRITY_MISMATCH');
}

export function createPreRunApproval(
  input: Readonly<{
    kind: ApprovalKind;
    principal: 'principal/arye';
    subjectDigest: string;
    scope: DevelopmentApprovalScope;
  }>,
): ApprovalRepositoryResult<PreRunApproval> {
  const scopeDigest = staged('DEVELOPMENT-PROVIDER-SCOPE', input.scope);
  const key = scopeDigest && keyFor(input.kind, input.principal, input.subjectDigest, scopeDigest);
  if (!scopeDigest || !key) return fail('FC-INPUT', 'INVALID_APPROVAL_RECORD');
  const withoutDigest = {
    schema: PRE_RUN_APPROVAL_SCHEMA,
    kind: input.kind,
    principal: input.principal,
    subjectDigest: input.subjectDigest,
    scope: input.scope,
    scopeDigest,
    key,
  } as const;
  const approvalDigest = contentFor(withoutDigest);
  return approvalDigest
    ? validatePreRunApproval({ ...withoutDigest, approvalDigest })
    : fail('FC-INPUT', 'INVALID_APPROVAL_RECORD');
}

export function isPreRunApprovalRepository(value: unknown): value is PreRunApprovalRepository {
  const data = fields(value, ['createIfAbsent', 'read']);
  return data !== undefined && typeof data.createIfAbsent === 'function' && typeof data.read === 'function';
}
