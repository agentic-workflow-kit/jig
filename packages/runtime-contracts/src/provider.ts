import { type CanonicalJson, encodeFrame, formatIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import { createScriptedLedger, type ScriptedLedger } from './ledger.js';

declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };

export const PROVIDER_ADMISSION_VERSION = 'jig.provider-admission.v1';

type FailureFamily = 'FC-INPUT' | 'FC-AUTHORITY' | 'FC-BOUND' | 'FC-TRUST';
export type ProviderAdmissionFailure = Readonly<{ family: FailureFamily; code: string }>;
export type ProviderAdmissionResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: ProviderAdmissionFailure }>;

type Scope = Readonly<{ phase: number; purpose: string; story: string }>;
type Basis = Readonly<{
  providerIdentity: string;
  providerBuild: string;
  environment: string;
  capability: string;
  policyMinimum: string;
  manifestId: string;
  manifestDigest: string;
  scope: Scope;
}>;
type Attempt = Readonly<{
  kind: 'start' | 'result';
  key: string;
  digest: string;
  basisDigest: string;
  ordinal: number;
  deadline: number;
  observedAt: number;
  retryLimit: number;
  predecessor: string | null;
  outcome?: 'positive' | 'negative' | 'timeout' | 'exhausted';
}>;
type Approval = Readonly<{ principal: string; manifestId: string; manifestDigest: string; scope: Scope }>;
type Fixture = Readonly<{
  approve(input: unknown): ProviderAdmissionResult<Readonly<{ kind: 'approved'; manifestId: string }>>;
  start(input: unknown): ProviderAdmissionResult<Attempt>;
  result(input: unknown): ProviderAdmissionResult<Attempt>;
  admit(
    input: unknown,
  ): ProviderAdmissionResult<Readonly<{ kind: 'eligible'; manifestId: string; providerEnabled: false }>>;
  readback(input: unknown): ProviderAdmissionResult<Attempt>;
  reachability(): ProviderAdmissionResult<Readonly<{ kind: 'unavailable'; providerEnabled: false }>>;
}>;

const APPROVED_MANIFEST_DIGEST = '53568c156d6ee898dc1ba32897d22f8abf47afa4bad86d35ffc6bcd7ce9067df';
const APPROVED_PROVIDER_DIGEST = 'c18ba0c266f04abcf220a39edd23c54599894dbf36d8d024db4b93aacb70308b';
const APPROVED_SCOPE = Object.freeze({ phase: 2, purpose: 'semantic-admission-fixture', story: 'GF-022' });
const APPROVED_MANIFEST_BYTES = new TextEncoder().encode(
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":[],"networkAuthority":[],"providerIdentity":"scripted-capability-proof-fixture/v1","runtimeAuthority":{"kind":"in-process-pure-fixture"},"scope":{"phase":2,"purpose":"semantic-admission-fixture","story":"GF-022"},"subprocessAuthority":[]}',
);
const SECRET = /(?:secret|token|password|credential|authorization|api[._ -]?key)/iu;
const DIGEST = /^[0-9a-f]{64}$/u;

const freeze = <T>(value: T): T => Object.freeze(value);
const ok = <T>(value: T): ProviderAdmissionResult<T> => freeze({ ok: true, value: freeze(value) });
const fail = (family: FailureFamily, code: string): ProviderAdmissionResult<never> =>
  freeze({ ok: false, error: freeze({ family, code }) });
const plain = (value: unknown): value is object => {
  try {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  } catch {
    return false;
  }
};
const fields = (value: unknown, names: readonly string[]): Record<string, unknown> | undefined => {
  try {
    if (!plain(value)) return undefined;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string') || keys.length !== names.length) return undefined;
    if (![...keys].sort().every((key, index) => key === [...names].sort()[index])) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (!names.every((name) => descriptors[name]?.enumerable && 'value' in descriptors[name])) return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
  } catch {
    return undefined;
  }
};
const canonical = (value: unknown): CanonicalJson | undefined => {
  const framed = encodeFrame(value as CanonicalJson);
  return framed.ok ? (value as CanonicalJson) : undefined;
};
const digest = (domain: string, value: unknown): string | undefined => {
  const framed = canonical(value);
  if (framed === undefined) return undefined;
  const staged = stageDigest({ domain, excludePaths: [], value: framed });
  return staged.ok ? staged.value.digest : undefined;
};
const safeText = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 256 &&
  value.normalize('NFC') === value &&
  !SECRET.test(value);
const safeDigest = (value: unknown): value is string => typeof value === 'string' && DIGEST.test(value);
const safeTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const scope = (value: unknown): Scope | undefined => {
  const data = fields(value, ['phase', 'purpose', 'story']);
  return data &&
    data.phase === APPROVED_SCOPE.phase &&
    data.purpose === APPROVED_SCOPE.purpose &&
    data.story === APPROVED_SCOPE.story
    ? freeze({ phase: data.phase, purpose: data.purpose, story: data.story })
    : undefined;
};
const same = (left: unknown, right: unknown): boolean => {
  const leftFrame = encodeFrame(left as CanonicalJson);
  const rightFrame = encodeFrame(right as CanonicalJson);
  return (
    leftFrame.ok &&
    rightFrame.ok &&
    leftFrame.value.length === rightFrame.value.length &&
    leftFrame.value.every((byte, index) => byte === rightFrame.value[index])
  );
};
const exactBytes = (value: unknown): boolean => {
  try {
    return (
      value instanceof Uint8Array &&
      value.byteLength === APPROVED_MANIFEST_BYTES.byteLength &&
      APPROVED_MANIFEST_BYTES.every((byte, index) => value[index] === byte)
    );
  } catch {
    return false;
  }
};
const manifestId = (): string | undefined => {
  const formatted = formatIdentity('ID-MANIFEST', {
    providerDigest: APPROVED_PROVIDER_DIGEST,
    authorityDigest: APPROVED_MANIFEST_DIGEST,
  });
  return formatted.ok ? formatted.value.value : undefined;
};
const basis = (value: unknown): Basis | undefined => {
  const data = fields(value, [
    'capability',
    'environment',
    'manifestDigest',
    'manifestId',
    'policyMinimum',
    'providerBuild',
    'providerIdentity',
    'scope',
  ]);
  const exactManifestId = manifestId();
  if (
    !data ||
    !exactManifestId ||
    data.manifestId !== exactManifestId ||
    data.manifestDigest !== APPROVED_MANIFEST_DIGEST ||
    data.providerIdentity !== 'scripted-capability-proof-fixture/v1' ||
    !safeText(data.providerBuild) ||
    !safeText(data.environment) ||
    !safeText(data.capability) ||
    !safeText(data.policyMinimum) ||
    !scope(data.scope)
  )
    return undefined;
  return freeze({
    providerIdentity: data.providerIdentity,
    providerBuild: data.providerBuild,
    environment: data.environment,
    capability: data.capability,
    policyMinimum: data.policyMinimum,
    manifestId: data.manifestId,
    manifestDigest: data.manifestDigest,
    scope: scope(data.scope) as Scope,
  });
};

export function createProviderAdmissionFixture(input: unknown): Fixture {
  const config = fields(input, ['approval', 'ledger', 'manifestBytes']);
  const ledger =
    config?.ledger && typeof (config.ledger as { preflight?: unknown }).preflight === 'function'
      ? (config.ledger as ScriptedLedger)
      : createScriptedLedger();
  const configured = config && exactBytes(config.manifestBytes) ? approval(config.approval) : undefined;
  const attempts = new Map<string, Attempt>();
  const approvalBinding = configured;
  const approve = (input: unknown): ProviderAdmissionResult<Readonly<{ kind: 'approved'; manifestId: string }>> =>
    approval(input) && approvalBinding && same(approval(input), approvalBinding)
      ? ok({ kind: 'approved', manifestId: approvalBinding.manifestId })
      : fail('FC-AUTHORITY', 'EXACT_MANIFEST_APPROVAL_REQUIRED');
  const write = (input: unknown, kind: Attempt['kind']): ProviderAdmissionResult<Attempt> => {
    if (!approvalBinding) return fail('FC-AUTHORITY', 'EXACT_MANIFEST_APPROVAL_REQUIRED');
    const names =
      kind === 'start'
        ? ['basis', 'deadline', 'observedAt', 'ordinal', 'predecessor', 'retryLimit']
        : ['basis', 'deadline', 'observedAt', 'ordinal', 'outcome', 'predecessor', 'retryLimit'];
    const data = fields(input, names);
    const bound = data && basis(data.basis);
    if (
      !data ||
      !bound ||
      !safeTime(data.deadline) ||
      !safeTime(data.observedAt) ||
      data.observedAt > data.deadline ||
      !Number.isSafeInteger(data.ordinal) ||
      (data.ordinal as number) < 1 ||
      !Number.isSafeInteger(data.retryLimit) ||
      (data.retryLimit as number) < 1 ||
      (data.ordinal as number) > (data.retryLimit as number) ||
      (kind === 'start'
        ? !(data.predecessor === null || safeDigest(data.predecessor))
        : !safeDigest(data.predecessor)) ||
      (kind === 'result' && !['positive', 'negative', 'timeout', 'exhausted'].includes(data.outcome as string))
    )
      return fail('FC-INPUT', 'INVALID_CAPABILITY_PROOF_ATTEMPT');
    const ordinal = data.ordinal as number;
    const retryLimit = data.retryLimit as number;
    const basisDigest = digest('CAPABILITY-PROOF-BASIS', bound);
    if (!basisDigest) return fail('FC-INPUT', 'INVALID_CAPABILITY_PROOF_BASIS');
    const key = `${basisDigest}/${ordinal}/${kind}`;
    if (kind === 'start') {
      if (ordinal === 1 ? data.predecessor !== null : !data.predecessor)
        return fail('FC-INPUT', 'INVALID_PREFLIGHT_PREDECESSOR');
      if (ordinal > 1) {
        const predecessor = attempts.get(`${basisDigest}/${ordinal - 1}/result`);
        if (
          !predecessor ||
          predecessor.digest !== data.predecessor ||
          !predecessor.outcome ||
          predecessor.outcome === 'positive' ||
          predecessor.outcome === 'exhausted'
        )
          return fail('FC-TRUST', 'TERMINAL_PREDECESSOR_REQUIRED');
      }
    } else {
      const predecessor = attempts.get(`${basisDigest}/${ordinal}/start`);
      if (
        !predecessor ||
        predecessor.digest !== data.predecessor ||
        predecessor.deadline !== data.deadline ||
        predecessor.retryLimit !== data.retryLimit ||
        data.observedAt < predecessor.observedAt
      )
        return fail('FC-TRUST', 'START_PREDECESSOR_REQUIRED');
    }
    const recordBasis =
      kind === 'start'
        ? {
            kind,
            basisDigest,
            ordinal,
            deadline: data.deadline,
            observedAt: data.observedAt,
            retryLimit,
            predecessor: data.predecessor,
          }
        : {
            kind,
            basisDigest,
            ordinal,
            deadline: data.deadline,
            observedAt: data.observedAt,
            retryLimit,
            predecessor: data.predecessor,
            outcome: data.outcome,
          };
    const durable = ledger.preflight({
      key: `${basisDigest}/${ordinal}`,
      variant: kind,
      bytes: recordBasis as CanonicalJson,
      ...(kind === 'result' ? { predecessor: data.predecessor as string } : {}),
      deadline: data.deadline,
      observedAt: data.observedAt,
    });
    if (!durable.ok) return fail('FC-TRUST', 'PREFLIGHT_STORAGE_MISMATCH');
    const record = freeze({ ...recordBasis, key, digest: durable.value.digest }) as Attempt;
    const existing = attempts.get(key);
    if (existing) return existing.digest === record.digest ? ok(existing) : fail('FC-INPUT', 'PREFLIGHT_MISMATCH');
    attempts.set(key, record);
    return ok(record);
  };
  return freeze({
    approve,
    start: (input) => write(input, 'start'),
    result: (input) => write(input, 'result'),
    admit(input) {
      const data = fields(input, ['basis', 'maxAgeMs', 'observedAt', 'proof']);
      const bound = data && basis(data.basis);
      if (!data || !bound || !safeTime(data.maxAgeMs) || !safeTime(data.observedAt) || !plain(data.proof))
        return fail('FC-INPUT', 'INVALID_ADMISSION');
      const proof = data.proof as Attempt;
      const stored = attempts.get(proof.key);
      if (!stored || stored !== proof || proof.kind !== 'result' || proof.outcome !== 'positive')
        return fail('FC-AUTHORITY', 'POSITIVE_EXACT_PROOF_REQUIRED');
      const basisDigest = digest('CAPABILITY-PROOF-BASIS', bound);
      if (!basisDigest || proof.basisDigest !== basisDigest || data.observedAt - proof.observedAt > data.maxAgeMs)
        return fail('FC-AUTHORITY', 'STALE_OR_MISMATCHED_PROOF');
      return ok({ kind: 'eligible', manifestId: bound.manifestId, providerEnabled: false as const });
    },
    readback(input) {
      const data = fields(input, ['basis', 'ordinal', 'variant']);
      const bound = data && basis(data.basis);
      if (
        !data ||
        !bound ||
        !Number.isSafeInteger(data.ordinal) ||
        (data.ordinal as number) < 1 ||
        (data.variant !== 'start' && data.variant !== 'result')
      )
        return fail('FC-INPUT', 'INVALID_READBACK');
      const basisDigest = digest('CAPABILITY-PROOF-BASIS', bound);
      const matched = basisDigest && attempts.get(`${basisDigest}/${data.ordinal as number}/${data.variant}`);
      return matched ? ok(matched) : fail('FC-TRUST', 'ATTEMPT_ABSENT');
    },
    reachability: () => ok({ kind: 'unavailable', providerEnabled: false as const }),
  });
}

function approval(value: unknown): Approval | undefined {
  const data = fields(value, ['manifestDigest', 'manifestId', 'principal', 'scope']);
  const exactManifestId = manifestId();
  if (
    !data ||
    !exactManifestId ||
    data.principal !== 'principal/arye' ||
    data.manifestId !== exactManifestId ||
    data.manifestDigest !== APPROVED_MANIFEST_DIGEST ||
    !scope(data.scope)
  )
    return undefined;
  return freeze({
    principal: data.principal,
    manifestId: data.manifestId,
    manifestDigest: data.manifestDigest,
    scope: scope(data.scope) as Scope,
  });
}
