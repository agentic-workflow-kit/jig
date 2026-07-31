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
    subject.manifestDigest !== '982a0cde5b335759925af0003f58a87f1bfd2e03a25f046216bd4aa9569994cd' ||
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

export const certificateClaims = new WeakMap<object, QualificationClaims>();
export const executionClaims = new WeakMap<object, QualificationClaims>();
