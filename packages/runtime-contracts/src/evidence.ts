/** Private GF-014 scripted semantic fixture; GF-022/GF-026 own provider admission and realization. */
import { parseIdentity } from '@agentic-workflow-kit/jig-codec';
import type { ArtifactFact, ArtifactResult } from './artifact.js';

declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };
declare const TextDecoder: {
  new (label?: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array): string };
};

export const EVIDENCE_POLICY = Object.freeze({
  schemaVersion: 'jig.evidence.v1',
  scanPolicyVersion: 'jig.secret-scan.v1',
  defaultMaxBytes: 10 * 1024 * 1024,
  minimumMaxBytes: 64 * 1024,
  maximumMaxBytes: 1024 * 1024 * 1024,
  defaultRetentionDays: 90,
});

type SubjectKind = 'ID-RUN' | 'ID-STORY' | 'ID-CAND' | 'ID-OP' | 'ID-TARGET';
type EvidenceFailureFamily = 'FC-INPUT' | 'FC-SUBJECT' | 'FC-EVIDENCE' | 'FC-FENCE' | 'FC-TRUST';
export type EvidenceFailure = Readonly<{ family: EvidenceFailureFamily; code: string }>;
export type EvidenceResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: EvidenceFailure }>;

type Producer = Readonly<{
  kind: 'principal';
  principal: string;
  session: string;
}>;
type Retention = Readonly<{
  class: string;
  windowDays: number;
  hold: null | Readonly<{ id: string; basis: string; status: 'active' }>;
}>;
type Loss = null | Readonly<{ kind: 'truncated'; omittedBytes: number }>;
type Pins = Readonly<{
  temporary: Readonly<{ holder: 'EV-ARTIFACT-FACT'; tuple: string }>;
  intended: Readonly<{ holder: 'SCH-EVIDENCE'; tuple: string }>;
}>;
type ArtifactPutRequest = Readonly<{
  resourceScope: string;
  subject: string;
  digest: string;
  fence: string;
  holder: 'SCH-EVIDENCE';
  operation: string;
  mode: 'put';
  bytes: Uint8Array;
  pins: Pins;
}>;
type ArtifactGetRequest = Readonly<{
  resourceScope: string;
  subject: string;
  digest: string;
  fence: string;
  holder: 'SCH-EVIDENCE';
  operation: string;
  mode: 'get';
  putOperation: string;
  pins: Pins;
}>;
type ManifestBasis = Readonly<{
  schemaVersion: string;
  subjectKind: SubjectKind;
  subjectIdentity: string;
  subject: string;
  claim: string;
  producer: Producer;
  providerManifest: null;
  contentType: 'text/plain' | 'application/json';
  contentClass: 'completeness-critical' | 'supporting';
  completeness: 'complete' | 'partial';
  originalDigest: string;
  artifactDigest: string;
  originalSize: number;
  retainedSize: number;
  loss: Loss;
  redaction: Readonly<{ policyVersion: string; status: 'none' | 'source-redacted' }>;
  retention: Retention;
}>;
export type PreparedEvidence = Readonly<{
  kind: 'prepared';
  key: string;
  subjectKind: SubjectKind;
  subjectIdentity: string;
  claim: string;
  manifestBasis: ManifestBasis;
  artifactRequest: ArtifactPutRequest;
}>;
export type EvidenceManifest = Readonly<
  ManifestBasis & {
    manifestDigest: string;
    disposition: 'admitted';
    artifactFact: ArtifactFact;
    adoptionTransition: string;
  }
>;
type QuarantinedEvidence = Readonly<{
  kind: 'quarantined';
  key: string;
  subject: string;
  producer: Producer;
  contentType: string;
  originalSize: number;
  scanPolicyVersion: string;
  reason: 'SECRET_DETECTED';
}>;
type RejectedEvidence = Readonly<{
  kind: 'rejected';
  key: string;
  subject: string;
  producer: Producer;
  contentType: string;
  originalSize: number;
  reason: 'OVERSIZE_REJECTED';
}>;
type AdmittedEvidence = Readonly<{ kind: 'admitted'; manifest: EvidenceManifest }>;
type PendingEvidence = Readonly<{ kind: 'pending'; key: string; basis: ManifestBasis }>;
type EvidenceOutcome = PreparedEvidence | QuarantinedEvidence | RejectedEvidence;
type ReconciledEvidence = AdmittedEvidence | PendingEvidence | QuarantinedEvidence | RejectedEvidence;

type ArtifactReadPort = Readonly<{
  acknowledge(fact: unknown): ArtifactResult<void>;
  get(request: unknown): ArtifactResult<Readonly<{ bytes: Uint8Array; digest: string }>>;
}>;

type SubjectConfiguration = Readonly<{ kind: SubjectKind; identity: string; claims: readonly string[] }>;
type PrincipalConfiguration = Readonly<{ principal: string; sessions: readonly string[] }>;
type Configuration = Readonly<{
  subjects: readonly SubjectConfiguration[];
  principals: readonly PrincipalConfiguration[];
}>;
type IntentRecord = Readonly<{
  kind: 'intent';
  key: string;
  basis: ManifestBasis;
  artifact: Omit<ArtifactPutRequest, 'bytes'>;
}>;
type AdmissionRecord = Readonly<{
  kind: 'admission';
  key: string;
  manifest: EvidenceManifest;
  getRequest: ArtifactGetRequest;
}>;
type OutcomeRecord =
  | Readonly<{ kind: 'quarantine'; key: string; outcome: QuarantinedEvidence }>
  | Readonly<{ kind: 'rejection'; key: string; outcome: RejectedEvidence }>;
type EvidenceRecord = IntentRecord | AdmissionRecord | OutcomeRecord;
type JournalEntry = Readonly<{
  position: number;
  previousDigest: string;
  digest: string;
  record: EvidenceRecord;
}>;

type InternalState = {
  configuration?: Configuration;
  journal: JournalEntry[];
  position: number;
  headDigest: string;
  intents: Map<string, IntentRecord>;
  admissions: Map<string, AdmittedEvidence>;
  outcomes: Map<string, QuarantinedEvidence | RejectedEvidence>;
  operations: Map<string, string>;
};

const ZERO_DIGEST = '0'.repeat(64);
const SECRET_PATTERN = /(?:api[_-]?key|password|credential|token|secret)\s*[:=]/iu;
const KEY_PATTERN = /^[a-z0-9](?:[a-z0-9._/-]{0,510}[a-z0-9])?$/iu;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const CLAIM_DIVIDER = '/claim/';
const decoder = new TextDecoder('utf-8', { fatal: true });

const fail = (family: EvidenceFailureFamily, code: string): EvidenceResult<never> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const freeze = <T>(value: T): T => Object.freeze(value);
const digestValue = (value: unknown): value is string => typeof value === 'string' && DIGEST_PATTERN.test(value);
const boundedText = (value: unknown, maximum = 512): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= maximum && value.normalize('NFC') === value;

function fields(input: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  try {
    const object = input as object;
    if (Object.getOwnPropertyNames(object).sort().join(',') !== [...names].sort().join(',')) return undefined;
    const result: Record<string, unknown> = {};
    for (const name of names) {
      const descriptor = Object.getOwnPropertyDescriptor(object, name);
      if (!descriptor || !('value' in descriptor)) return undefined;
      result[name] = descriptor.value;
    }
    return result;
  } catch {
    return undefined;
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !ArrayBuffer.isView(value) && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function sha256(bytes: Uint8Array | string): string {
  const input = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
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
  const padded = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64);
  padded.set(input);
  padded[input.length] = 0x80;
  const bitLength = BigInt(input.length) * 8n;
  for (let index = 0; index < 8; index += 1)
    padded[padded.length - 1 - index] = Number((bitLength >> BigInt(index * 8)) & 0xffn);
  const state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
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
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const first =
        (h +
          (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) +
          ((e & f) ^ (~e & g)) +
          at(constants, index) +
          at(words, index)) >>>
        0;
      const second = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + first) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (first + second) >>> 0;
    }
    const next = [a, b, c, d, e, f, g, h];
    for (let index = 0; index < state.length; index += 1) state[index] = (at(state, index) + at(next, index)) >>> 0;
  }
  return state.map((part) => part.toString(16).padStart(8, '0')).join('');
}

function parseConfiguration(input: unknown): Configuration | undefined {
  const value = fields(input, ['subjects', 'principals']);
  if (!value || !Array.isArray(value.subjects) || !Array.isArray(value.principals)) return undefined;
  const subjects: SubjectConfiguration[] = [];
  const identities = new Set<string>();
  for (const item of value.subjects) {
    const subject = fields(item, ['kind', 'identity', 'claims']);
    if (
      !subject ||
      !['ID-RUN', 'ID-STORY', 'ID-CAND', 'ID-OP', 'ID-TARGET'].includes(String(subject.kind)) ||
      typeof subject.identity !== 'string' ||
      !Array.isArray(subject.claims) ||
      subject.claims.length === 0 ||
      subject.claims.some((claim) => !boundedText(claim, 128) || !KEY_PATTERN.test(claim)) ||
      new Set(subject.claims).size !== subject.claims.length ||
      !parseIdentity(subject.kind as SubjectKind, subject.identity).ok ||
      identities.has(subject.identity)
    )
      return undefined;
    identities.add(subject.identity);
    subjects.push(
      deepFreeze({
        kind: subject.kind as SubjectKind,
        identity: subject.identity,
        claims: [...(subject.claims as string[])],
      }),
    );
  }
  const principals: PrincipalConfiguration[] = [];
  const principalSet = new Set<string>();
  for (const item of value.principals) {
    const principal = fields(item, ['principal', 'sessions']);
    if (
      !principal ||
      typeof principal.principal !== 'string' ||
      !Array.isArray(principal.sessions) ||
      principal.sessions.length === 0 ||
      principal.sessions.some((session) => typeof session !== 'string' || !parseIdentity('ID-SESSION', session).ok) ||
      new Set(principal.sessions).size !== principal.sessions.length ||
      !parseIdentity('ID-PRINCIPAL', principal.principal).ok ||
      principalSet.has(principal.principal)
    )
      return undefined;
    principalSet.add(principal.principal);
    principals.push(
      deepFreeze({
        principal: principal.principal,
        sessions: [...(principal.sessions as string[])],
      }),
    );
  }
  return deepFreeze({ subjects, principals });
}

function exactSubject(
  input: unknown,
  configuration: Configuration,
): EvidenceResult<Readonly<{ kind: SubjectKind; identity: string; claim: string; subject: string }>> {
  if (typeof input !== 'string' || !parseIdentity('ID-EVSUBJ', input).ok)
    return fail('FC-SUBJECT', 'INVALID_EVIDENCE_SUBJECT');
  for (const subject of configuration.subjects) {
    const prefix = `evidence://${subject.identity}${CLAIM_DIVIDER}`;
    if (!input.startsWith(prefix)) continue;
    const claim = input.slice(prefix.length);
    return subject.claims.includes(claim)
      ? {
          ok: true,
          value: deepFreeze({ kind: subject.kind, identity: subject.identity, claim, subject: input }),
        }
      : fail('FC-SUBJECT', 'UNKNOWN_CLAIM');
  }
  return fail('FC-SUBJECT', 'SUBJECT_NOT_FOUND');
}

function exactProducer(
  input: unknown,
  providerManifest: unknown,
  configuration: Configuration,
): EvidenceResult<Producer> {
  const object = input as Record<string, unknown> | undefined;
  if (object?.kind === 'mechanism') return fail('FC-EVIDENCE', 'PROVIDER_MANIFEST_UNAVAILABLE');
  const value = fields(input, ['kind', 'principal', 'session']);
  if (
    value?.kind !== 'principal' ||
    typeof value.principal !== 'string' ||
    typeof value.session !== 'string' ||
    providerManifest !== null ||
    !parseIdentity('ID-PRINCIPAL', value.principal).ok ||
    !parseIdentity('ID-SESSION', value.session).ok
  )
    return fail('FC-SUBJECT', 'INVALID_PRODUCER');
  const configured = configuration.principals.find((principal) => principal.principal === value.principal);
  return configured?.sessions.includes(value.session)
    ? {
        ok: true,
        value: deepFreeze({
          kind: 'principal' as const,
          principal: value.principal,
          session: value.session,
        }),
      }
    : fail('FC-SUBJECT', 'PRODUCER_NOT_CONFIGURED');
}

function exactRetention(input: unknown): EvidenceResult<Retention> {
  const value = fields(input, ['class', 'windowDays', 'hold']);
  if (
    !value ||
    !boundedText(value.class, 128) ||
    !Number.isSafeInteger(value.windowDays) ||
    (value.windowDays as number) < 7 ||
    (value.windowDays as number) > 365 * 7
  )
    return fail('FC-INPUT', 'INVALID_RETENTION');
  if (value.hold === null)
    return {
      ok: true,
      value: deepFreeze({ class: value.class, windowDays: value.windowDays as number, hold: null }),
    };
  const hold = fields(value.hold, ['id', 'basis', 'status']);
  return hold && boundedText(hold.id) && boundedText(hold.basis) && hold.status === 'active'
    ? {
        ok: true,
        value: deepFreeze({
          class: value.class,
          windowDays: value.windowDays as number,
          hold: { id: hold.id, basis: hold.basis, status: 'active' as const },
        }),
      }
    : fail('FC-INPUT', 'INVALID_RETENTION_HOLD');
}

function safeDecode(input: Uint8Array): EvidenceResult<string> {
  try {
    return { ok: true, value: decoder.decode(input) };
  } catch {
    return fail('FC-INPUT', 'INVALID_TEXT_ENCODING');
  }
}

function scan(input: Uint8Array, contentType: string): EvidenceResult<Readonly<{ secret: boolean }>> {
  const decoded = safeDecode(input);
  if (!decoded.ok) return decoded;
  if (contentType === 'application/json') {
    try {
      JSON.parse(decoded.value);
    } catch {
      return fail('FC-INPUT', 'INVALID_JSON_EVIDENCE');
    }
  }
  return { ok: true, value: freeze({ secret: SECRET_PATTERN.test(decoded.value) }) };
}

function artifactBasis(request: ArtifactPutRequest): Omit<ArtifactPutRequest, 'bytes'> {
  return deepFreeze({
    resourceScope: request.resourceScope,
    subject: request.subject,
    digest: request.digest,
    fence: request.fence,
    holder: request.holder,
    operation: request.operation,
    mode: request.mode,
    pins: request.pins,
  });
}

function getRequest(request: Omit<ArtifactPutRequest, 'bytes'>): ArtifactGetRequest {
  return deepFreeze({
    resourceScope: request.resourceScope,
    subject: request.subject,
    digest: request.digest,
    fence: request.fence,
    holder: request.holder,
    operation: `${request.operation}/read`,
    mode: 'get' as const,
    putOperation: request.operation,
    pins: request.pins,
  });
}

function append(state: InternalState, record: EvidenceRecord): JournalEntry {
  const position = state.position + 1;
  const previousDigest = state.headDigest;
  const recordDigest = sha256(`${previousDigest}\0${JSON.stringify(record)}`);
  const entry = deepFreeze({ position, previousDigest, digest: recordDigest, record });
  state.journal.push(entry);
  state.position = position;
  state.headDigest = recordDigest;
  return entry;
}

function parsePrepare(
  input: unknown,
  configuration: Configuration,
): EvidenceResult<
  Readonly<{
    subject: Readonly<{ kind: SubjectKind; identity: string; claim: string; subject: string }>;
    producer: Producer;
    contentType: 'text/plain' | 'application/json';
    contentClass: 'completeness-critical' | 'supporting';
    completeness: 'complete' | 'partial';
    contentDigest: string;
    bytes: Uint8Array;
    redaction: Readonly<{ policyVersion: string; status: 'none' | 'source-redacted' }>;
    oversizeBehavior: 'reject' | 'truncate-with-recorded-loss';
    retention: Retention;
    artifact: Readonly<{ resourceScope: string; operation: string; fence: string; temporaryTuple: string }>;
  }>
> {
  const value = fields(input, [
    'schemaVersion',
    'subject',
    'producer',
    'providerManifest',
    'contentType',
    'contentClass',
    'completeness',
    'contentDigest',
    'bytes',
    'redaction',
    'oversizeBehavior',
    'retention',
    'artifact',
  ]);
  if (!value) return fail('FC-INPUT', 'INVALID_EVIDENCE_REQUEST');
  if (value.schemaVersion !== EVIDENCE_POLICY.schemaVersion) return fail('FC-INPUT', 'UNKNOWN_SCHEMA_VERSION');
  const subject = exactSubject(value.subject, configuration);
  if (!subject.ok) return subject;
  const producer = exactProducer(value.producer, value.providerManifest, configuration);
  if (!producer.ok) return producer;
  if (
    (value.contentType !== 'text/plain' && value.contentType !== 'application/json') ||
    (value.contentClass !== 'completeness-critical' && value.contentClass !== 'supporting') ||
    (value.completeness !== 'complete' && value.completeness !== 'partial') ||
    !digestValue(value.contentDigest) ||
    !(value.bytes instanceof Uint8Array) ||
    value.bytes.byteLength === 0 ||
    (value.oversizeBehavior !== 'reject' && value.oversizeBehavior !== 'truncate-with-recorded-loss')
  )
    return fail('FC-INPUT', 'INVALID_EVIDENCE_CONTENT');
  if (sha256(value.bytes) !== value.contentDigest) return fail('FC-EVIDENCE', 'CONTENT_DIGEST_MISMATCH');
  const redaction = fields(value.redaction, ['policyVersion', 'status']);
  if (
    !redaction ||
    redaction.policyVersion !== EVIDENCE_POLICY.scanPolicyVersion ||
    (redaction.status !== 'none' && redaction.status !== 'source-redacted')
  )
    return fail('FC-EVIDENCE', 'INVALID_REDACTION_POLICY');
  const retention = exactRetention(value.retention);
  if (!retention.ok) return retention;
  const artifact = fields(value.artifact, ['resourceScope', 'operation', 'fence', 'temporaryTuple']);
  if (
    !artifact ||
    !boundedText(artifact.resourceScope) ||
    !boundedText(artifact.operation) ||
    !boundedText(artifact.fence) ||
    !boundedText(artifact.temporaryTuple)
  )
    return fail('FC-FENCE', 'INVALID_ARTIFACT_BINDING');
  return {
    ok: true,
    value: {
      subject: subject.value,
      producer: producer.value,
      contentType: value.contentType,
      contentClass: value.contentClass,
      completeness: value.completeness,
      contentDigest: value.contentDigest,
      bytes: new Uint8Array(value.bytes),
      redaction: deepFreeze({
        policyVersion: redaction.policyVersion as string,
        status: redaction.status as 'none' | 'source-redacted',
      }),
      oversizeBehavior: value.oversizeBehavior,
      retention: retention.value,
      artifact: deepFreeze({
        resourceScope: artifact.resourceScope,
        operation: artifact.operation,
        fence: artifact.fence,
        temporaryTuple: artifact.temporaryTuple,
      }),
    },
  };
}

function exactFact(input: unknown, request: Omit<ArtifactPutRequest, 'bytes'>): EvidenceResult<ArtifactFact> {
  const fact = fields(input, ['operation', 'mode', 'position', 'headDigest', 'binding']);
  const expectedBinding = JSON.stringify({
    resourceScope: request.resourceScope,
    subject: request.subject,
    digest: request.digest,
    fence: request.fence,
    holder: request.holder,
    operation: request.operation,
    mode: request.mode,
    detail: JSON.stringify(request.pins),
  });
  return fact &&
    fact.operation === request.operation &&
    fact.mode === 'put' &&
    Number.isSafeInteger(fact.position) &&
    (fact.position as number) >= 0 &&
    digestValue(fact.headDigest) &&
    fact.binding === expectedBinding
    ? { ok: true, value: deepFreeze(fact as ArtifactFact) }
    : fail('FC-EVIDENCE', 'INVALID_ARTIFACT_FACT');
}

function exactProof(
  input: unknown,
  request: Omit<ArtifactPutRequest, 'bytes'>,
  fact: ArtifactFact,
): EvidenceResult<Readonly<{ transition: string }>> {
  const proof = fields(input, [
    'transition',
    'registration',
    'role',
    'holder',
    'tuple',
    'subject',
    'fence',
    'fact',
    'digest',
  ]);
  const registration = JSON.stringify({
    resourceScope: request.resourceScope,
    subject: request.subject,
    digest: request.digest,
    fence: request.fence,
    holder: request.holder,
    putOperation: request.operation,
    pins: request.pins,
  });
  const pin = request.pins.temporary;
  const canonical = JSON.stringify({
    transition: proof?.transition,
    registration,
    role: 'temporary',
    holder: pin.holder,
    tuple: pin.tuple,
    subject: request.subject,
    fence: request.fence,
    fact,
  });
  return proof &&
    boundedText(proof.transition) &&
    proof.registration === registration &&
    proof.role === 'temporary' &&
    proof.holder === pin.holder &&
    proof.tuple === pin.tuple &&
    proof.subject === request.subject &&
    proof.fence === request.fence &&
    JSON.stringify(proof.fact) === JSON.stringify(fact) &&
    proof.digest === sha256(canonical)
    ? { ok: true, value: freeze({ transition: proof.transition }) }
    : fail('FC-FENCE', 'INVALID_ADOPTION_BINDING');
}

function readArtifact(port: ArtifactReadPort, fact: ArtifactFact, request: ArtifactGetRequest): EvidenceResult<void> {
  try {
    const acknowledged = port.acknowledge(fact);
    if (!acknowledged.ok) return fail('FC-TRUST', 'ARTIFACT_WITNESS_NOT_CURRENT');
    const read = port.get(request);
    if (!read.ok) return fail('FC-TRUST', 'ARTIFACT_READBACK_FAILED');
    if (
      read.value.digest !== request.digest ||
      !(read.value.bytes instanceof Uint8Array) ||
      sha256(read.value.bytes) !== request.digest
    )
      return fail('FC-EVIDENCE', 'ARTIFACT_READBACK_MISMATCH');
    const scanned = scan(read.value.bytes, 'text/plain');
    if (!scanned.ok || scanned.value.secret) return fail('FC-EVIDENCE', 'ARTIFACT_READBACK_UNSAFE');
    return { ok: true, value: undefined };
  } catch {
    return fail('FC-TRUST', 'ARTIFACT_READBACK_FAILED');
  }
}

function createRuntime(configuration?: Configuration): Readonly<{
  fixture: ScriptedEvidenceFixture;
  state: InternalState;
}> {
  const state: InternalState = {
    configuration,
    journal: [],
    position: -1,
    headDigest: ZERO_DIGEST,
    intents: new Map(),
    admissions: new Map(),
    outcomes: new Map(),
    operations: new Map(),
  };

  const fixture: ScriptedEvidenceFixture = freeze({
    prepare(input: unknown): EvidenceResult<EvidenceOutcome> {
      if (!state.configuration) return fail('FC-INPUT', 'INVALID_CONFIGURATION');
      try {
        const parsed = parsePrepare(input, state.configuration);
        if (!parsed.ok) return parsed;
        const scanned = scan(parsed.value.bytes, parsed.value.contentType);
        if (!scanned.ok) return scanned;
        const sanitized = {
          subject: parsed.value.subject.subject,
          producer: parsed.value.producer,
          contentType: parsed.value.contentType,
          originalSize: parsed.value.bytes.byteLength,
        };
        if (scanned.value.secret) {
          const key = sha256(
            JSON.stringify({
              ...sanitized,
              scanPolicyVersion: EVIDENCE_POLICY.scanPolicyVersion,
              reason: 'SECRET_DETECTED',
            }),
          );
          const outcome = deepFreeze({
            kind: 'quarantined' as const,
            key,
            ...sanitized,
            scanPolicyVersion: EVIDENCE_POLICY.scanPolicyVersion,
            reason: 'SECRET_DETECTED' as const,
          });
          if (!state.outcomes.has(key)) {
            append(state, deepFreeze({ kind: 'quarantine', key, outcome }));
            state.outcomes.set(key, outcome);
          }
          return { ok: true, value: outcome };
        }
        const oversize = parsed.value.bytes.byteLength > EVIDENCE_POLICY.defaultMaxBytes;
        if (oversize && parsed.value.oversizeBehavior === 'reject') {
          const key = sha256(JSON.stringify({ ...sanitized, reason: 'OVERSIZE_REJECTED' }));
          const outcome = deepFreeze({
            kind: 'rejected' as const,
            key,
            ...sanitized,
            reason: 'OVERSIZE_REJECTED' as const,
          });
          if (!state.outcomes.has(key)) {
            append(state, deepFreeze({ kind: 'rejection', key, outcome }));
            state.outcomes.set(key, outcome);
          }
          return { ok: true, value: outcome };
        }
        if (
          oversize &&
          parsed.value.oversizeBehavior === 'truncate-with-recorded-loss' &&
          parsed.value.contentClass === 'completeness-critical'
        )
          return fail('FC-EVIDENCE', 'COMPLETENESS_CRITICAL_TRUNCATION');
        const retainedBytes = oversize
          ? parsed.value.bytes.slice(0, EVIDENCE_POLICY.defaultMaxBytes)
          : new Uint8Array(parsed.value.bytes);
        const loss: Loss = oversize
          ? deepFreeze({
              kind: 'truncated' as const,
              omittedBytes: parsed.value.bytes.byteLength - retainedBytes.byteLength,
            })
          : null;
        const basis: ManifestBasis = deepFreeze({
          schemaVersion: EVIDENCE_POLICY.schemaVersion,
          subjectKind: parsed.value.subject.kind,
          subjectIdentity: parsed.value.subject.identity,
          subject: parsed.value.subject.subject,
          claim: parsed.value.subject.claim,
          producer: parsed.value.producer,
          providerManifest: null,
          contentType: parsed.value.contentType,
          contentClass: parsed.value.contentClass,
          completeness: loss ? 'partial' : parsed.value.completeness,
          originalDigest: parsed.value.contentDigest,
          artifactDigest: sha256(retainedBytes),
          originalSize: parsed.value.bytes.byteLength,
          retainedSize: retainedBytes.byteLength,
          loss,
          redaction: parsed.value.redaction,
          retention: parsed.value.retention,
        });
        const key = sha256(
          JSON.stringify({
            basis,
            artifact: parsed.value.artifact,
          }),
        );
        const pins: Pins = deepFreeze({
          temporary: { holder: 'EV-ARTIFACT-FACT', tuple: parsed.value.artifact.temporaryTuple },
          intended: { holder: 'SCH-EVIDENCE', tuple: `evidence-manifest/${key}` },
        });
        const request: ArtifactPutRequest = freeze({
          resourceScope: parsed.value.artifact.resourceScope,
          subject: `artifact/evidence/${key}`,
          digest: basis.artifactDigest,
          fence: parsed.value.artifact.fence,
          holder: 'SCH-EVIDENCE' as const,
          operation: parsed.value.artifact.operation,
          mode: 'put' as const,
          bytes: new Uint8Array(retainedBytes),
          pins,
        });
        const existingOperation = state.operations.get(request.operation);
        if (existingOperation && existingOperation !== key) return fail('FC-FENCE', 'OPERATION_BINDING_MISMATCH');
        const record: IntentRecord = deepFreeze({
          kind: 'intent',
          key,
          basis,
          artifact: artifactBasis(request),
        });
        if (!state.intents.has(key)) {
          append(state, record);
          state.intents.set(key, record);
          state.operations.set(request.operation, key);
        }
        return {
          ok: true,
          value: freeze({
            kind: 'prepared' as const,
            key,
            subjectKind: basis.subjectKind,
            subjectIdentity: basis.subjectIdentity,
            claim: basis.claim,
            manifestBasis: basis,
            artifactRequest: request,
          }),
        };
      } catch {
        return fail('FC-INPUT', 'INVALID_EVIDENCE_REQUEST');
      }
    },
    admit(input: unknown, port: ArtifactReadPort, fault?: 'lost-ack'): EvidenceResult<AdmittedEvidence> {
      try {
        const value = fields(input, ['key', 'fact', 'proof']);
        if (!value || !digestValue(value.key)) return fail('FC-INPUT', 'INVALID_ADMISSION');
        const intent = state.intents.get(value.key);
        if (!intent) return fail('FC-SUBJECT', 'EVIDENCE_INTENT_NOT_FOUND');
        const fact = exactFact(value.fact, intent.artifact);
        if (!fact.ok) return fact;
        const proof = exactProof(value.proof, intent.artifact, fact.value);
        if (!proof.ok) return proof;
        const read = readArtifact(port, fact.value, getRequest(intent.artifact));
        if (!read.ok) return read;
        const existing = state.admissions.get(value.key);
        if (existing) return { ok: true, value: existing };
        const manifest: EvidenceManifest = deepFreeze({
          ...intent.basis,
          manifestDigest: sha256(
            JSON.stringify({
              basis: intent.basis,
              artifactFact: fact.value,
              adoptionTransition: proof.value.transition,
            }),
          ),
          disposition: 'admitted' as const,
          artifactFact: fact.value,
          adoptionTransition: proof.value.transition,
        });
        const admitted = deepFreeze({ kind: 'admitted' as const, manifest });
        append(
          state,
          deepFreeze({
            kind: 'admission',
            key: value.key,
            manifest,
            getRequest: getRequest(intent.artifact),
          }),
        );
        state.admissions.set(value.key, admitted);
        return fault === 'lost-ack' ? fail('FC-TRUST', 'ACK_LOST') : { ok: true, value: admitted };
      } catch {
        return fail('FC-INPUT', 'INVALID_ADMISSION');
      }
    },
    reconcile(input: unknown): EvidenceResult<ReconciledEvidence> {
      if (!digestValue(input)) return fail('FC-INPUT', 'INVALID_EVIDENCE_KEY');
      const admitted = state.admissions.get(input);
      if (admitted) return { ok: true, value: admitted };
      const outcome = state.outcomes.get(input);
      if (outcome) return { ok: true, value: outcome };
      const intent = state.intents.get(input);
      return intent
        ? {
            ok: true,
            value: deepFreeze({ kind: 'pending' as const, key: input, basis: intent.basis }),
          }
        : fail('FC-SUBJECT', 'EVIDENCE_NOT_FOUND');
    },
    snapshot(): Readonly<unknown> {
      return deepFreeze({
        journal: [...state.journal],
        head: { position: state.position, headDigest: state.headDigest },
      });
    },
  });
  return freeze({ fixture, state });
}

export type ScriptedEvidenceFixture = Readonly<{
  prepare(input: unknown): EvidenceResult<EvidenceOutcome>;
  admit(input: unknown, artifact: ArtifactReadPort, fault?: 'lost-ack'): EvidenceResult<AdmittedEvidence>;
  reconcile(key: unknown): EvidenceResult<ReconciledEvidence>;
  snapshot(): Readonly<unknown>;
}>;

export function createScriptedEvidenceFixture(config: unknown): ScriptedEvidenceFixture {
  return createRuntime(parseConfiguration(config)).fixture;
}

export function restoreScriptedEvidenceFixture(
  snapshot: unknown,
  witness: unknown,
  config: unknown,
  artifact: ArtifactReadPort,
): EvidenceResult<ScriptedEvidenceFixture> {
  const configuration = parseConfiguration(config);
  const source = fields(snapshot, ['journal', 'head']);
  const storedHead = source && fields(source.head, ['position', 'headDigest']);
  const suppliedHead = fields(witness, ['position', 'headDigest']);
  if (
    !configuration ||
    !source ||
    !Array.isArray(source.journal) ||
    !storedHead ||
    !suppliedHead ||
    !Number.isSafeInteger(storedHead.position) ||
    !digestValue(storedHead.headDigest) ||
    suppliedHead.position !== storedHead.position ||
    suppliedHead.headDigest !== storedHead.headDigest
  )
    return fail('FC-TRUST', 'RECOVERY_HEAD_MISMATCH');
  try {
    const runtime = createRuntime(configuration);
    let previousDigest = ZERO_DIGEST;
    let lastAdmission: AdmissionRecord | undefined;
    for (let index = 0; index < source.journal.length; index += 1) {
      const entry = fields(source.journal[index], ['position', 'previousDigest', 'digest', 'record']);
      if (
        !entry ||
        entry.position !== index ||
        entry.previousDigest !== previousDigest ||
        !digestValue(entry.digest) ||
        entry.digest !== sha256(`${previousDigest}\0${JSON.stringify(entry.record)}`)
      )
        return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
      const record = entry.record as EvidenceRecord;
      if (record.kind === 'intent') {
        if (
          !digestValue(record.key) ||
          !record.basis ||
          !record.artifact ||
          runtime.state.intents.has(record.key) ||
          (runtime.state.operations.has(record.artifact.operation) &&
            runtime.state.operations.get(record.artifact.operation) !== record.key)
        )
          return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
        runtime.state.intents.set(record.key, deepFreeze(record));
        runtime.state.operations.set(record.artifact.operation, record.key);
      } else if (record.kind === 'admission') {
        const intent = runtime.state.intents.get(record.key);
        if (
          !intent ||
          runtime.state.admissions.has(record.key) ||
          record.manifest.manifestDigest !==
            sha256(
              JSON.stringify({
                basis: intent.basis,
                artifactFact: record.manifest.artifactFact,
                adoptionTransition: record.manifest.adoptionTransition,
              }),
            )
        )
          return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
        const read = portReadbackOnly(artifact, record.getRequest);
        if (!read.ok) return read;
        const admitted = deepFreeze({ kind: 'admitted' as const, manifest: deepFreeze(record.manifest) });
        runtime.state.admissions.set(record.key, admitted);
        lastAdmission = record;
      } else if (record.kind === 'quarantine' || record.kind === 'rejection') {
        if (!digestValue(record.key) || runtime.state.outcomes.has(record.key))
          return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
        runtime.state.outcomes.set(record.key, deepFreeze(record.outcome));
      } else {
        return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
      }
      const frozenEntry = deepFreeze({
        position: entry.position as number,
        previousDigest: entry.previousDigest as string,
        digest: entry.digest as string,
        record: deepFreeze(record),
      });
      runtime.state.journal.push(frozenEntry);
      runtime.state.position = entry.position as number;
      runtime.state.headDigest = entry.digest as string;
      previousDigest = entry.digest as string;
    }
    if (
      runtime.state.position !== storedHead.position ||
      runtime.state.headDigest !== storedHead.headDigest ||
      (lastAdmission && !artifact.acknowledge(lastAdmission.manifest.artifactFact).ok)
    )
      return fail('FC-TRUST', 'RECOVERY_HEAD_MISMATCH');
    return { ok: true, value: runtime.fixture };
  } catch {
    return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
  }
}

function portReadbackOnly(port: ArtifactReadPort, request: ArtifactGetRequest): EvidenceResult<void> {
  try {
    const read = port.get(request);
    if (
      !read.ok ||
      read.value.digest !== request.digest ||
      !(read.value.bytes instanceof Uint8Array) ||
      sha256(read.value.bytes) !== request.digest
    )
      return fail('FC-TRUST', 'RECOVERY_ARTIFACT_MISMATCH');
    const scanned = scan(read.value.bytes, 'text/plain');
    return scanned.ok && !scanned.value.secret
      ? { ok: true, value: undefined }
      : fail('FC-TRUST', 'RECOVERY_ARTIFACT_MISMATCH');
  } catch {
    return fail('FC-TRUST', 'RECOVERY_ARTIFACT_MISMATCH');
  }
}
