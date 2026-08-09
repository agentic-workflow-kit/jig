export type QualificationSubject = Readonly<{
  candidateContentDigest: string;
  candidateCommit: string;
  candidateTree: string;
  executionBaseCommit: string;
  executionBaseTree: string;
  mergeBaseCommit: string;
  buildDigest: string;
  toolchainDigest: string;
  catalogDigest: string;
  topologyVersion: string;
  suiteVersion: string;
  probeVersion: string;
  fixtureDigest: string;
  clockId: string;
  seed: string;
  recorderIdentity: string;
  recordedAt: number;
  providerId: string;
  providerBuildDigest: string;
  manifestDigest: string;
  environmentDigest: string;
}>;
export type QualificationClaims = Readonly<{
  subject: QualificationSubject;
  resourceDigest: string;
  capability: string;
  policyMinimum: string;
}>;

export type ProviderAdmissionClaims = Readonly<{
  principal: 'principal/arye';
  providerIdentity: string;
  providerBuild: string;
  environment: string;
  capability: 'PORT-VERIFY/local-command';
  policyMinimum: 'policy/local-posix-command-verifier/v1';
  manifestId: string;
  manifestDigest: string;
  scope: Readonly<{ phase: 4; purpose: 'local-command-verification'; story: 'GF-047' }>;
  proofDigest: string;
  observedAt: number;
  maxAgeMs: 86_400_000;
}>;

const CLAIM_KEYS = Object.freeze(['capability', 'policyMinimum', 'resourceDigest', 'subject'] as const);
const SUBJECT_KEYS = Object.freeze([
  'buildDigest',
  'candidateCommit',
  'candidateContentDigest',
  'candidateTree',
  'catalogDigest',
  'clockId',
  'environmentDigest',
  'executionBaseCommit',
  'executionBaseTree',
  'fixtureDigest',
  'manifestDigest',
  'mergeBaseCommit',
  'probeVersion',
  'providerBuildDigest',
  'providerId',
  'recordedAt',
  'recorderIdentity',
  'seed',
  'suiteVersion',
  'toolchainDigest',
  'topologyVersion',
] as const);
const DIGEST_FIELDS = new Set<keyof QualificationSubject>([
  'buildDigest',
  'candidateContentDigest',
  'candidateTree',
  'catalogDigest',
  'environmentDigest',
  'executionBaseTree',
  'fixtureDigest',
  'manifestDigest',
  'providerBuildDigest',
  'toolchainDigest',
]);
const DIGEST = /^[0-9a-f]{64}$/u;
const PROVIDER_ADMISSION_KEYS = Object.freeze([
  'capability',
  'environment',
  'manifestDigest',
  'manifestId',
  'maxAgeMs',
  'observedAt',
  'policyMinimum',
  'principal',
  'proofDigest',
  'providerBuild',
  'providerIdentity',
  'scope',
] as const);
const PROVIDER_ADMISSION_SCOPE_KEYS = Object.freeze(['phase', 'purpose', 'story'] as const);

function exactDataObject(value: unknown, keys: readonly string[]): Record<string, unknown> | undefined {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    if (Object.getPrototypeOf(value) !== Object.prototype) return undefined;
    const names = Reflect.ownKeys(value);
    if (names.some((name) => typeof name !== 'string')) return undefined;
    if (names.length !== keys.length || ![...names].sort().every((name, index) => name === [...keys].sort()[index]))
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (!keys.every((key) => descriptors[key]?.enumerable && 'value' in descriptors[key])) return undefined;
    return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
  } catch {
    return undefined;
  }
}

function safeText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256 && value.normalize('NFC') === value;
}

/** Descriptor-safe immutable snapshot used before either execution or certificate registry admission. */
export function snapshotQualificationClaims(value: unknown): QualificationClaims | undefined {
  const claims = exactDataObject(value, CLAIM_KEYS);
  const subject = claims && exactDataObject(claims.subject, SUBJECT_KEYS);
  if (
    !claims ||
    !subject ||
    claims.capability !== 'PORT-SOURCE/read-structured-json' ||
    claims.policyMinimum !== 'policy/structured-file-source/v1' ||
    claims.resourceDigest !== 'fe23b4511a1abafef43ee38c6bc0c6496d4a3787ac9a913bd4634f960fce2bbd' ||
    subject.providerId !== 'structured-json-file-source/v1' ||
    subject.providerBuildDigest !== '0d842ed9d3bf39f51f1c10f36b1e4c2414df93bf214ec80da1dde92a890e1b81' ||
    subject.manifestDigest !== '91821429bca10e93438c9a15bb6309366ca5809f2d1cff972425adde54667a18' ||
    subject.environmentDigest !== 'b880653890190d5da3ac311736401fd1fa02f2d221bee8258eae231717143536' ||
    subject.recorderIdentity !== 'recorder/jig-conformance/v1' ||
    subject.topologyVersion !== 'jig.runtime-topology.v1' ||
    !Number.isSafeInteger(subject.recordedAt) ||
    (subject.recordedAt as number) < 0
  )
    return undefined;
  for (const key of SUBJECT_KEYS) {
    if (key === 'recordedAt') continue;
    const item = subject[key];
    if (!safeText(item) || (DIGEST_FIELDS.has(key) && !DIGEST.test(item))) return undefined;
  }
  const frozenSubject = Object.freeze({ ...subject }) as QualificationSubject;
  return Object.freeze({
    subject: frozenSubject,
    resourceDigest: claims.resourceDigest,
    capability: claims.capability,
    policyMinimum: claims.policyMinimum,
  }) as QualificationClaims;
}

export function snapshotProviderAdmissionClaims(value: unknown): ProviderAdmissionClaims | undefined {
  const claims = exactDataObject(value, PROVIDER_ADMISSION_KEYS);
  const scope = claims && exactDataObject(claims.scope, PROVIDER_ADMISSION_SCOPE_KEYS);
  const providerIdentity = claims && safeText(claims.providerIdentity) ? claims.providerIdentity : undefined;
  const providerBuild = claims && safeText(claims.providerBuild) ? claims.providerBuild : undefined;
  const environment = claims && safeText(claims.environment) ? claims.environment : undefined;
  const manifestId = claims && safeText(claims.manifestId) ? claims.manifestId : undefined;
  const observedAt = claims && typeof claims.observedAt === 'number' ? claims.observedAt : undefined;
  const manifestDigest = claims && typeof claims.manifestDigest === 'string' ? claims.manifestDigest : undefined;
  const proofDigest = claims && typeof claims.proofDigest === 'string' ? claims.proofDigest : undefined;
  if (
    !claims ||
    !scope ||
    claims.principal !== 'principal/arye' ||
    claims.capability !== 'PORT-VERIFY/local-command' ||
    claims.policyMinimum !== 'policy/local-posix-command-verifier/v1' ||
    scope.phase !== 4 ||
    scope.purpose !== 'local-command-verification' ||
    scope.story !== 'GF-047' ||
    claims.maxAgeMs !== 86_400_000
  )
    return undefined;
  if (observedAt === undefined || !Number.isSafeInteger(observedAt) || observedAt < 0) return undefined;
  if (!providerIdentity || !providerBuild || !environment || !manifestId) return undefined;
  if (!manifestDigest || !proofDigest || !DIGEST.test(manifestDigest) || !DIGEST.test(proofDigest)) return undefined;
  return Object.freeze({
    principal: 'principal/arye' as const,
    providerIdentity,
    providerBuild,
    environment,
    capability: 'PORT-VERIFY/local-command' as const,
    policyMinimum: 'policy/local-posix-command-verifier/v1' as const,
    manifestId,
    manifestDigest,
    scope: Object.freeze({
      phase: 4 as const,
      purpose: 'local-command-verification' as const,
      story: 'GF-047' as const,
    }),
    proofDigest,
    observedAt,
    maxAgeMs: 86_400_000 as const,
  });
}

const certificateClaims = new WeakMap<object, QualificationClaims>();
const executionClaims = new WeakMap<object, QualificationClaims>();
const providerAdmissionCertificateClaims = new WeakMap<object, ProviderAdmissionClaims>();
const providerAdmissionExecutionClaims = new WeakMap<object, ProviderAdmissionClaims>();

export function registerExecutionClaims(carrier: object, claims: QualificationClaims): void {
  executionClaims.set(carrier, claims);
}

export function readExecutionClaims(carrier: object): QualificationClaims | undefined {
  return executionClaims.get(carrier);
}

export function registerCertificateClaims(certificate: object, claims: QualificationClaims): void {
  certificateClaims.set(certificate, claims);
}

export function readCertificateClaims(certificate: object): QualificationClaims | undefined {
  return certificateClaims.get(certificate);
}

export function registerProviderAdmissionExecutionClaims(carrier: object, claims: ProviderAdmissionClaims): void {
  providerAdmissionExecutionClaims.set(carrier, claims);
}

export function readProviderAdmissionExecutionClaims(carrier: object): ProviderAdmissionClaims | undefined {
  return providerAdmissionExecutionClaims.get(carrier);
}

export function registerProviderAdmissionCertificateClaims(certificate: object, claims: ProviderAdmissionClaims): void {
  providerAdmissionCertificateClaims.set(certificate, claims);
}

export function readProviderAdmissionCertificateClaims(certificate: object): ProviderAdmissionClaims | undefined {
  return providerAdmissionCertificateClaims.get(certificate) ?? providerAdmissionExecutionClaims.get(certificate);
}
