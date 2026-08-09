/** Private GF-014 scripted semantic fixture; GF-022/GF-026 own provider admission and realization. */
import { parseIdentity } from '@agentic-workflow-kit/jig-codec';
import type { ArtifactFact, ArtifactResult } from './artifact.js';

declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };
declare const TextDecoder: {
  new (label?: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array): string };
};

export const EVIDENCE_POLICY = Object.freeze({
  schemaVersion: 'jig.evidence.v1',
  scanPolicyVersion: 'jig.secret-scan.v2',
  scanDetectors: Object.freeze(['assignment-v2', 'authorization-bearer-v1', 'percent-base64-split-v1']),
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
type SecretScanConfiguration = Readonly<{
  version: string;
  detectors: readonly string[];
  digest: string;
}>;
type EvidenceKindPolicy = Readonly<{
  kind: string;
  version: string;
  scanPolicyVersion: string;
  scanPolicyDigest: string;
  maxBytes: number;
  oversizeBehavior: 'reject' | 'truncate-with-recorded-loss';
  completenessCritical: boolean;
  contentType: 'text/plain' | 'application/json';
  redactionStatus: 'none' | 'source-redacted';
  retention: Retention;
  digest: string;
}>;
type PolicyIdentity = Readonly<{
  kind: string;
  version: string;
  digest: string;
  scanPolicyVersion: string;
  scanPolicyDigest: string;
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
type AdoptionProof = Readonly<{
  transition: string;
  registration: string;
  role: 'temporary';
  holder: 'EV-ARTIFACT-FACT';
  tuple: string;
  subject: string;
  fence: string;
  fact: ArtifactFact;
  digest: string;
}>;
type ManifestBasis = Readonly<{
  configurationDigest: string;
  schemaVersion: string;
  policy: PolicyIdentity;
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
  reason: 'SECRET_DETECTED';
}>;
type RejectedEvidence = Readonly<{
  kind: 'rejected';
  key: string;
  originalSize: number;
  reason: 'OVERSIZE_REJECTED';
}>;
type AdmittedEvidence = Readonly<{ kind: 'admitted'; manifest: EvidenceManifest }>;
type PendingEvidence = Readonly<{ kind: 'pending'; key: string; basis: ManifestBasis }>;
type EvidenceOutcome = PreparedEvidence | QuarantinedEvidence | RejectedEvidence;
type ReconciledEvidence = AdmittedEvidence | PendingEvidence | QuarantinedEvidence | RejectedEvidence;
const scriptedEvidenceFixtures = new WeakSet<object>();

type ArtifactReadPort = Readonly<{
  acknowledge(fact: unknown): ArtifactResult<void>;
  get(request: unknown): ArtifactResult<Readonly<{ bytes: Uint8Array; digest: string }>>;
  snapshot(): Readonly<unknown>;
}>;

type SubjectConfiguration = Readonly<{ kind: SubjectKind; identity: string; claims: readonly string[] }>;
type PrincipalConfiguration = Readonly<{ principal: string; sessions: readonly string[] }>;
type Configuration = Readonly<{
  subjects: readonly SubjectConfiguration[];
  principals: readonly PrincipalConfiguration[];
  secretScan: SecretScanConfiguration;
  evidenceKinds: readonly EvidenceKindPolicy[];
  digest: string;
}>;
type ConfigurationBinding = Readonly<{
  configurationDigest: string;
  subjectIndex: number;
  claimIndex: number;
  principalIndex: number;
  sessionIndex: number;
  policyIndex: number;
}>;
type IntentRecord = Readonly<{
  kind: 'intent';
  key: string;
  basis: ManifestBasis;
  artifact: Omit<ArtifactPutRequest, 'bytes'>;
  binding: ConfigurationBinding;
}>;
type AdmissionRecord = Readonly<{
  kind: 'admission';
  key: string;
  manifest: EvidenceManifest;
  getRequest: ArtifactGetRequest;
  proof: AdoptionProof;
  binding: ConfigurationBinding;
}>;
type OutcomeRecord =
  | Readonly<{ kind: 'quarantine'; key: string; outcome: QuarantinedEvidence; binding: ConfigurationBinding }>
  | Readonly<{ kind: 'rejection'; key: string; outcome: RejectedEvidence; binding: ConfigurationBinding }>;
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
const SECRET_ASSIGNMENT_PATTERN =
  /(?:api[\s._'"+/-]*key|access[\s._'"+/-]*token|refresh[\s._'"+/-]*token|client[\s._'"+/-]*secret|private[\s._'"+/-]*key|password|credential|secret|token)\s*["']?\s*[:=]\s*["']?\s*[^\s"',}\]]+/iu;
const AUTHORIZATION_PATTERN = /authorization\s*["']?\s*[:=]?\s*["']?\s*bearer(?:\s|[:=+/_-])+[a-z0-9._~+/-]{4,}/iu;
const NORMALIZED_SECRET_PATTERN =
  /(?:apikey|accesstoken|refreshtoken|clientsecret|privatekey)(?:is|equals)?[a-z0-9]{8,}|authorizationbearer[a-z0-9]{4,}/iu;
const BASE64_PATTERN = /(?:[A-Za-z0-9+/]{4}){3,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/gu;
const HEX_PATTERN = /(?:[0-9a-f]{2}){8,}/giu;
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

function decodeBase64(input: string): string | undefined {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const limit = Math.min(input.length, 8192);
  const usable = input.slice(0, limit - (limit % 4));
  if (usable.length < 12) return undefined;
  const output: number[] = [];
  for (let index = 0; index < usable.length; index += 4) {
    const first = alphabet.indexOf(usable[index] ?? '');
    const second = alphabet.indexOf(usable[index + 1] ?? '');
    const thirdCharacter = usable[index + 2] ?? '=';
    const fourthCharacter = usable[index + 3] ?? '=';
    const third = thirdCharacter === '=' ? 0 : alphabet.indexOf(thirdCharacter);
    const fourth = fourthCharacter === '=' ? 0 : alphabet.indexOf(fourthCharacter);
    if (first < 0 || second < 0 || third < 0 || fourth < 0) return undefined;
    output.push((first << 2) | (second >> 4));
    if (thirdCharacter !== '=') output.push(((second & 15) << 4) | (third >> 2));
    if (fourthCharacter !== '=') output.push(((third & 3) << 6) | fourth);
  }
  try {
    return decoder.decode(new Uint8Array(output));
  } catch {
    return undefined;
  }
}

function decodeHex(input: string): string | undefined {
  const limit = Math.min(input.length, 8192);
  const usable = input.slice(0, limit - (limit % 2));
  const output = new Uint8Array(usable.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    const value = Number.parseInt(usable.slice(index * 2, index * 2 + 2), 16);
    if (!Number.isFinite(value)) return undefined;
    output[index] = value;
  }
  try {
    return decoder.decode(output);
  } catch {
    return undefined;
  }
}

function directSecret(input: string): boolean {
  if (SECRET_ASSIGNMENT_PATTERN.test(input) || AUTHORIZATION_PATTERN.test(input)) return true;
  const normalized = input.normalize('NFKC').replace(/[^a-z0-9]/giu, '');
  return NORMALIZED_SECRET_PATTERN.test(normalized);
}

function percentDecoded(input: string): string {
  let output = '';
  for (let index = 0; index < input.length; ) {
    const token = input.slice(index + 1, index + 3);
    if (input[index] !== '%' || !/^[0-9a-f]{2}$/iu.test(token)) {
      output += input[index] ?? '';
      index += 1;
      continue;
    }
    const first = Number.parseInt(token, 16);
    if (first < 0x80) {
      output += String.fromCharCode(first);
      index += 3;
      continue;
    }
    const length =
      first >= 0xc2 && first <= 0xdf ? 2 : first >= 0xe0 && first <= 0xef ? 3 : first >= 0xf0 && first <= 0xf4 ? 4 : 0;
    const bytes: number[] = [first];
    let cursor = index + 3;
    while (bytes.length < length) {
      const continuation = input.slice(cursor + 1, cursor + 3);
      if (input[cursor] !== '%' || !/^[0-9a-f]{2}$/iu.test(continuation)) break;
      bytes.push(Number.parseInt(continuation, 16));
      cursor += 3;
    }
    if (length > 0 && bytes.length === length) {
      try {
        output += decoder.decode(new Uint8Array(bytes));
        index = cursor;
        continue;
      } catch {
        // Preserve only the invalid token; later valid runs remain independently decodable.
      }
    }
    output += input.slice(index, index + 3);
    index += 3;
  }
  return output;
}

function secretText(input: string): boolean {
  const variants = new Set<string>([input.normalize('NFKC')]);
  let decoded = input;
  for (let depth = 0; depth < 3; depth += 1) {
    const next = percentDecoded(decoded);
    if (next === decoded) break;
    variants.add(next.normalize('NFKC'));
    decoded = next;
  }
  for (const source of [...variants]) {
    for (let offset = 0; offset < source.length; offset += 7936) {
      const chunk = source.slice(offset, offset + 8192);
      if (directSecret(chunk)) return true;
      for (const candidate of chunk.match(BASE64_PATTERN) ?? []) {
        const decoded = decodeBase64(candidate);
        if (decoded && directSecret(decoded)) return true;
      }
      for (const candidate of chunk.match(HEX_PATTERN) ?? []) {
        const decoded = decodeHex(candidate);
        if (decoded && directSecret(decoded)) return true;
      }
    }
  }
  return false;
}

function jsonSecret(input: unknown): boolean {
  const pending = [input];
  while (pending.length > 0) {
    const value = pending.pop();
    if (typeof value === 'string') {
      if (secretText(value)) return true;
      continue;
    }
    if (Array.isArray(value)) {
      for (const child of value) pending.push(child);
      continue;
    }
    if (!value || typeof value !== 'object') continue;
    for (const [key, child] of Object.entries(value)) {
      const canonicalKey = key.normalize('NFKC').replace(/[^a-z0-9]/giu, '');
      if (
        [
          'apikey',
          'accesstoken',
          'refreshtoken',
          'clientsecret',
          'privatekey',
          'password',
          'credential',
          'secret',
          'token',
          'authorization',
        ].includes(canonicalKey.toLowerCase()) ||
        secretText(key) ||
        (typeof child === 'string' && secretText(`${key}:${child}`))
      )
        return true;
      pending.push(child);
    }
  }
  return false;
}

function parseConfiguration(input: unknown): Configuration | undefined {
  const value = fields(input, ['subjects', 'principals', 'secretScan', 'evidenceKinds']);
  if (
    !value ||
    !Array.isArray(value.subjects) ||
    value.subjects.length === 0 ||
    !Array.isArray(value.principals) ||
    value.principals.length === 0 ||
    !Array.isArray(value.evidenceKinds) ||
    value.evidenceKinds.length === 0
  )
    return undefined;
  const scan = fields(value.secretScan, ['version', 'detectors', 'digest']);
  if (
    !scan ||
    scan.version !== EVIDENCE_POLICY.scanPolicyVersion ||
    !Array.isArray(scan.detectors) ||
    JSON.stringify(scan.detectors) !== JSON.stringify(EVIDENCE_POLICY.scanDetectors) ||
    !digestValue(scan.digest) ||
    scan.digest !== sha256(JSON.stringify({ version: scan.version, detectors: scan.detectors }))
  )
    return undefined;
  const secretScan = deepFreeze({
    version: scan.version as string,
    detectors: [...(scan.detectors as string[])],
    digest: scan.digest as string,
  });
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
  const evidenceKinds: EvidenceKindPolicy[] = [];
  const kindSet = new Set<string>();
  const versionSet = new Set<string>();
  for (const item of value.evidenceKinds) {
    const policy = fields(item, [
      'kind',
      'version',
      'scanPolicyVersion',
      'scanPolicyDigest',
      'maxBytes',
      'oversizeBehavior',
      'completenessCritical',
      'contentType',
      'redactionStatus',
      'retention',
      'digest',
    ]);
    if (
      !policy ||
      !boundedText(policy.kind, 128) ||
      !KEY_PATTERN.test(policy.kind) ||
      !boundedText(policy.version, 128) ||
      policy.scanPolicyVersion !== secretScan.version ||
      policy.scanPolicyDigest !== secretScan.digest ||
      !Number.isSafeInteger(policy.maxBytes) ||
      (policy.maxBytes as number) < EVIDENCE_POLICY.minimumMaxBytes ||
      (policy.maxBytes as number) > EVIDENCE_POLICY.maximumMaxBytes ||
      (policy.oversizeBehavior !== 'reject' && policy.oversizeBehavior !== 'truncate-with-recorded-loss') ||
      typeof policy.completenessCritical !== 'boolean' ||
      (policy.completenessCritical && policy.oversizeBehavior !== 'reject') ||
      (policy.contentType !== 'text/plain' && policy.contentType !== 'application/json') ||
      (policy.redactionStatus !== 'none' && policy.redactionStatus !== 'source-redacted') ||
      !digestValue(policy.digest) ||
      kindSet.has(policy.kind as string) ||
      versionSet.has(policy.version as string)
    )
      return undefined;
    const retention = exactRetention(policy.retention);
    if (!retention.ok) return undefined;
    const basis = {
      kind: policy.kind,
      version: policy.version,
      scanPolicyVersion: policy.scanPolicyVersion,
      scanPolicyDigest: policy.scanPolicyDigest,
      maxBytes: policy.maxBytes,
      oversizeBehavior: policy.oversizeBehavior,
      completenessCritical: policy.completenessCritical,
      contentType: policy.contentType,
      redactionStatus: policy.redactionStatus,
      retention: retention.value,
    };
    if (policy.digest !== sha256(JSON.stringify(basis))) return undefined;
    kindSet.add(policy.kind);
    versionSet.add(policy.version);
    evidenceKinds.push(
      deepFreeze({
        ...basis,
        kind: policy.kind as string,
        version: policy.version as string,
        scanPolicyVersion: policy.scanPolicyVersion as string,
        scanPolicyDigest: policy.scanPolicyDigest as string,
        maxBytes: policy.maxBytes as number,
        oversizeBehavior: policy.oversizeBehavior as EvidenceKindPolicy['oversizeBehavior'],
        completenessCritical: policy.completenessCritical as boolean,
        contentType: policy.contentType as EvidenceKindPolicy['contentType'],
        redactionStatus: policy.redactionStatus as EvidenceKindPolicy['redactionStatus'],
        digest: policy.digest,
      }),
    );
  }
  const controlledStrings = [
    secretScan.version,
    ...secretScan.detectors,
    ...subjects.flatMap((subject) => [subject.kind, subject.identity, ...subject.claims]),
    ...principals.flatMap((principal) => [principal.principal, ...principal.sessions]),
    ...evidenceKinds.flatMap((policy) => [
      policy.kind,
      policy.version,
      policy.scanPolicyVersion,
      policy.contentType,
      policy.redactionStatus,
      policy.retention.class,
      ...(policy.retention.hold ? [policy.retention.hold.id, policy.retention.hold.basis] : []),
    ]),
  ];
  if (controlledStrings.some(secretText)) return undefined;
  const configurationBasis = { subjects, principals, secretScan, evidenceKinds };
  return deepFreeze({
    ...configurationBasis,
    digest: sha256(JSON.stringify(configurationBasis)),
  });
}

function exactSubject(
  input: unknown,
  configuration: Configuration,
): EvidenceResult<
  Readonly<{
    kind: SubjectKind;
    identity: string;
    claim: string;
    subject: string;
    subjectIndex: number;
    claimIndex: number;
  }>
> {
  if (typeof input !== 'string' || !parseIdentity('ID-EVSUBJ', input).ok)
    return fail('FC-SUBJECT', 'INVALID_EVIDENCE_SUBJECT');
  for (let subjectIndex = 0; subjectIndex < configuration.subjects.length; subjectIndex += 1) {
    const subject = configuration.subjects[subjectIndex];
    if (!subject) continue;
    const prefix = `evidence://${subject.identity}${CLAIM_DIVIDER}`;
    if (!input.startsWith(prefix)) continue;
    const claim = input.slice(prefix.length);
    const claimIndex = subject.claims.indexOf(claim);
    return claimIndex >= 0
      ? {
          ok: true,
          value: deepFreeze({
            kind: subject.kind,
            identity: subject.identity,
            claim,
            subject: input,
            subjectIndex,
            claimIndex,
          }),
        }
      : fail('FC-SUBJECT', 'UNKNOWN_CLAIM');
  }
  return fail('FC-SUBJECT', 'SUBJECT_NOT_FOUND');
}

function exactProducer(
  input: unknown,
  providerManifest: unknown,
  configuration: Configuration,
): EvidenceResult<Readonly<{ producer: Producer; principalIndex: number; sessionIndex: number }>> {
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
  const principalIndex = configuration.principals.findIndex((principal) => principal.principal === value.principal);
  const configured = configuration.principals[principalIndex];
  const sessionIndex = configured?.sessions.indexOf(value.session) ?? -1;
  return configured && sessionIndex >= 0
    ? {
        ok: true,
        value: deepFreeze({
          producer: {
            kind: 'principal' as const,
            principal: value.principal,
            session: value.session,
          },
          principalIndex,
          sessionIndex,
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

function scan(
  input: Uint8Array,
  contentType: string,
  policy: SecretScanConfiguration,
): EvidenceResult<Readonly<{ secret: boolean }>> {
  if (
    policy.version !== EVIDENCE_POLICY.scanPolicyVersion ||
    JSON.stringify(policy.detectors) !== JSON.stringify(EVIDENCE_POLICY.scanDetectors) ||
    policy.digest !== sha256(JSON.stringify({ version: policy.version, detectors: policy.detectors }))
  )
    return fail('FC-TRUST', 'SECRET_SCAN_POLICY_MISMATCH');
  const decoded = safeDecode(input);
  if (!decoded.ok) return decoded;
  let semanticSecret = false;
  if (contentType === 'application/json') {
    try {
      semanticSecret = jsonSecret(JSON.parse(decoded.value));
    } catch {
      return fail('FC-INPUT', 'INVALID_JSON_EVIDENCE');
    }
  }
  return { ok: true, value: freeze({ secret: semanticSecret || secretText(decoded.value) }) };
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
    policy: EvidenceKindPolicy;
    policyIndex: number;
    binding: ConfigurationBinding;
    contentDigest: string;
    bytes: Uint8Array;
    artifact: Readonly<{ resourceScope: string; operation: string; fence: string; temporaryTuple: string }>;
  }>
> {
  const value = fields(input, [
    'schemaVersion',
    'evidenceKind',
    'policy',
    'subject',
    'producer',
    'providerManifest',
    'contentDigest',
    'bytes',
    'artifact',
  ]);
  if (!value) return fail('FC-INPUT', 'INVALID_EVIDENCE_REQUEST');
  if (value.schemaVersion !== EVIDENCE_POLICY.schemaVersion) return fail('FC-INPUT', 'UNKNOWN_SCHEMA_VERSION');
  const selection = fields(value.policy, ['version', 'digest']);
  if (
    !boundedText(value.evidenceKind, 128) ||
    !selection ||
    !boundedText(selection.version, 128) ||
    !digestValue(selection.digest)
  )
    return fail('FC-EVIDENCE', 'INVALID_EVIDENCE_POLICY');
  const policyIndex = configuration.evidenceKinds.findIndex(
    (candidate) =>
      candidate.kind === value.evidenceKind &&
      candidate.version === selection.version &&
      candidate.digest === selection.digest,
  );
  const policy = configuration.evidenceKinds[policyIndex];
  if (!policy) return fail('FC-EVIDENCE', 'EVIDENCE_POLICY_NOT_CONFIGURED');
  const subject = exactSubject(value.subject, configuration);
  if (!subject.ok) return subject;
  const producer = exactProducer(value.producer, value.providerManifest, configuration);
  if (!producer.ok) return producer;
  if (!digestValue(value.contentDigest) || !(value.bytes instanceof Uint8Array) || value.bytes.byteLength === 0)
    return fail('FC-INPUT', 'INVALID_EVIDENCE_CONTENT');
  if (sha256(value.bytes) !== value.contentDigest) return fail('FC-EVIDENCE', 'CONTENT_DIGEST_MISMATCH');
  const artifact = fields(value.artifact, ['resourceScope', 'operation', 'fence', 'temporaryTuple']);
  if (
    !artifact ||
    !boundedText(artifact.resourceScope) ||
    !boundedText(artifact.operation) ||
    !boundedText(artifact.fence) ||
    !boundedText(artifact.temporaryTuple)
  )
    return fail('FC-FENCE', 'INVALID_ARTIFACT_BINDING');
  const binding = deepFreeze({
    configurationDigest: configuration.digest,
    subjectIndex: subject.value.subjectIndex,
    claimIndex: subject.value.claimIndex,
    principalIndex: producer.value.principalIndex,
    sessionIndex: producer.value.sessionIndex,
    policyIndex,
  });
  return {
    ok: true,
    value: {
      subject: deepFreeze({
        kind: subject.value.kind,
        identity: subject.value.identity,
        claim: subject.value.claim,
        subject: subject.value.subject,
      }),
      producer: producer.value.producer,
      policy,
      policyIndex,
      binding,
      contentDigest: value.contentDigest,
      bytes: new Uint8Array(value.bytes),
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
): EvidenceResult<AdoptionProof> {
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
    ? {
        ok: true,
        value: deepFreeze({
          transition: proof.transition,
          registration,
          role: 'temporary' as const,
          holder: pin.holder,
          tuple: pin.tuple,
          subject: request.subject,
          fence: request.fence,
          fact,
          digest: proof.digest as string,
        }),
      }
    : fail('FC-FENCE', 'INVALID_ADOPTION_BINDING');
}

function adoptionRecorded(
  port: ArtifactReadPort,
  request: Omit<ArtifactPutRequest, 'bytes'>,
  fact: ArtifactFact,
  proof: AdoptionProof,
): boolean {
  const snapshot = fields(port.snapshot(), ['journal', 'lookup']);
  if (!snapshot || !Array.isArray(snapshot.journal)) return false;
  for (const entry of snapshot.journal) {
    const item = fields(entry, ['kind', 'request']);
    if (item?.kind !== 'adopt') continue;
    const adoption = fields(item.request, [
      'resourceScope',
      'subject',
      'digest',
      'fence',
      'holder',
      'operation',
      'mode',
      'pins',
      'putOperation',
      'fact',
      'proof',
    ]);
    if (
      adoption &&
      adoption.resourceScope === request.resourceScope &&
      adoption.subject === request.subject &&
      adoption.digest === request.digest &&
      adoption.fence === request.fence &&
      adoption.holder === request.holder &&
      adoption.operation === request.operation &&
      adoption.mode === request.mode &&
      adoption.putOperation === request.operation &&
      JSON.stringify(adoption.pins) === JSON.stringify(request.pins) &&
      JSON.stringify(adoption.fact) === JSON.stringify(fact) &&
      JSON.stringify(adoption.proof) === JSON.stringify(proof)
    )
      return true;
  }
  return false;
}

function artifactCurrencyCurrent(port: ArtifactReadPort): boolean {
  const snapshot = fields(port.snapshot(), ['journal', 'lookup']);
  const lookup = snapshot && fields(snapshot.lookup, ['position', 'headDigest', 'protectedPosition', 'protectedHead']);
  if (
    !snapshot ||
    !lookup ||
    !Array.isArray(snapshot.journal) ||
    !Number.isSafeInteger(lookup.position) ||
    !digestValue(lookup.headDigest)
  )
    return false;
  let terminal: ArtifactFact | undefined;
  for (const entry of snapshot.journal) {
    const item = fields(entry, ['kind', 'request', 'fact']) ?? fields(entry, ['kind', 'request']);
    if (!item || typeof item.kind !== 'string') return false;
    if (item.kind !== 'put' && item.kind !== 'release' && item.kind !== 'dispose') continue;
    const fact = fields(item.fact, ['operation', 'mode', 'position', 'headDigest', 'binding']);
    if (
      !fact ||
      !boundedText(fact.operation) ||
      (fact.mode !== 'put' && fact.mode !== 'release-pin' && fact.mode !== 'dispose-bytes') ||
      !Number.isSafeInteger(fact.position) ||
      !digestValue(fact.headDigest) ||
      !boundedText(fact.binding, 4096)
    )
      return false;
    terminal = deepFreeze(fact as ArtifactFact);
  }
  if (!terminal) return lookup.position === -1 && lookup.headDigest === ZERO_DIGEST;
  return (
    terminal.position === lookup.position && terminal.headDigest === lookup.headDigest && port.acknowledge(terminal).ok
  );
}

function readArtifact(
  port: ArtifactReadPort,
  fact: ArtifactFact,
  request: ArtifactGetRequest,
  artifact: Omit<ArtifactPutRequest, 'bytes'>,
  proof: AdoptionProof,
  basis: ManifestBasis,
  configuration: Configuration,
): EvidenceResult<void> {
  try {
    if (!artifactCurrencyCurrent(port)) return fail('FC-TRUST', 'ARTIFACT_WITNESS_NOT_CURRENT');
    if (!adoptionRecorded(port, artifact, fact, proof)) return fail('FC-TRUST', 'ARTIFACT_ADOPTION_NOT_RECORDED');
    const read = port.get(request);
    if (!read.ok) return fail('FC-TRUST', 'ARTIFACT_READBACK_FAILED');
    if (
      read.value.digest !== request.digest ||
      !(read.value.bytes instanceof Uint8Array) ||
      sha256(read.value.bytes) !== request.digest
    )
      return fail('FC-EVIDENCE', 'ARTIFACT_READBACK_MISMATCH');
    const scanned = scan(read.value.bytes, basis.contentType, configuration.secretScan);
    if (!scanned.ok || scanned.value.secret) return fail('FC-EVIDENCE', 'ARTIFACT_READBACK_UNSAFE');
    return { ok: true, value: undefined };
  } catch {
    return fail('FC-TRUST', 'ARTIFACT_READBACK_FAILED');
  }
}

function policyIdentity(policy: EvidenceKindPolicy): PolicyIdentity {
  return deepFreeze({
    kind: policy.kind,
    version: policy.version,
    digest: policy.digest,
    scanPolicyVersion: policy.scanPolicyVersion,
    scanPolicyDigest: policy.scanPolicyDigest,
  });
}

function outcomeKey(
  configuration: Configuration,
  binding: ConfigurationBinding,
  kind: 'quarantine' | 'rejection',
  position: number,
): string {
  return sha256(
    JSON.stringify({
      configurationDigest: configuration.digest,
      subjectIndex: binding.subjectIndex,
      claimIndex: binding.claimIndex,
      principalIndex: binding.principalIndex,
      sessionIndex: binding.sessionIndex,
      policyIndex: binding.policyIndex,
      kind,
      position,
    }),
  );
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
        const scanned = scan(parsed.value.bytes, parsed.value.policy.contentType, state.configuration.secretScan);
        if (!scanned.ok) return scanned;
        const metadataSecret = [
          parsed.value.subject.subject,
          parsed.value.subject.identity,
          parsed.value.subject.claim,
          parsed.value.producer.principal,
          parsed.value.producer.session,
          parsed.value.policy.kind,
          parsed.value.policy.version,
          parsed.value.policy.scanPolicyVersion,
          parsed.value.policy.contentType,
          parsed.value.policy.redactionStatus,
          parsed.value.policy.retention.class,
          ...(parsed.value.policy.retention.hold
            ? [parsed.value.policy.retention.hold.id, parsed.value.policy.retention.hold.basis]
            : []),
          parsed.value.artifact.resourceScope,
          parsed.value.artifact.operation,
          parsed.value.artifact.fence,
          parsed.value.artifact.temporaryTuple,
        ].some(secretText);
        if (scanned.value.secret || metadataSecret) {
          const key = outcomeKey(state.configuration, parsed.value.binding, 'quarantine', state.position + 1);
          const outcome = deepFreeze({
            kind: 'quarantined' as const,
            key,
            reason: 'SECRET_DETECTED' as const,
          });
          append(state, deepFreeze({ kind: 'quarantine', key, outcome, binding: parsed.value.binding }));
          state.outcomes.set(key, outcome);
          return { ok: true, value: outcome };
        }
        const oversize = parsed.value.bytes.byteLength > parsed.value.policy.maxBytes;
        if (oversize && parsed.value.policy.oversizeBehavior === 'reject') {
          const key = outcomeKey(state.configuration, parsed.value.binding, 'rejection', state.position + 1);
          const outcome = deepFreeze({
            kind: 'rejected' as const,
            key,
            originalSize: parsed.value.bytes.byteLength,
            reason: 'OVERSIZE_REJECTED' as const,
          });
          append(state, deepFreeze({ kind: 'rejection', key, outcome, binding: parsed.value.binding }));
          state.outcomes.set(key, outcome);
          return { ok: true, value: outcome };
        }
        const retainedBytes = oversize
          ? parsed.value.bytes.slice(0, parsed.value.policy.maxBytes)
          : new Uint8Array(parsed.value.bytes);
        if (oversize) {
          const retainedScan = scan(retainedBytes, parsed.value.policy.contentType, state.configuration.secretScan);
          if (!retainedScan.ok || retainedScan.value.secret) return fail('FC-EVIDENCE', 'TRUNCATED_CONTENT_INVALID');
        }
        const loss: Loss = oversize
          ? deepFreeze({
              kind: 'truncated' as const,
              omittedBytes: parsed.value.bytes.byteLength - retainedBytes.byteLength,
            })
          : null;
        const basis: ManifestBasis = deepFreeze({
          configurationDigest: state.configuration.digest,
          schemaVersion: EVIDENCE_POLICY.schemaVersion,
          policy: policyIdentity(parsed.value.policy),
          subjectKind: parsed.value.subject.kind,
          subjectIdentity: parsed.value.subject.identity,
          subject: parsed.value.subject.subject,
          claim: parsed.value.subject.claim,
          producer: parsed.value.producer,
          providerManifest: null,
          contentType: parsed.value.policy.contentType,
          contentClass: parsed.value.policy.completenessCritical ? 'completeness-critical' : 'supporting',
          completeness: loss ? 'partial' : 'complete',
          originalDigest: parsed.value.contentDigest,
          artifactDigest: sha256(retainedBytes),
          originalSize: parsed.value.bytes.byteLength,
          retainedSize: retainedBytes.byteLength,
          loss,
          redaction: {
            policyVersion: parsed.value.policy.scanPolicyVersion,
            status: parsed.value.policy.redactionStatus,
          },
          retention: parsed.value.policy.retention,
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
          binding: parsed.value.binding,
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
        if (!state.configuration) return fail('FC-TRUST', 'CONFIGURATION_NOT_BOUND');
        const read = readArtifact(
          port,
          fact.value,
          getRequest(intent.artifact),
          intent.artifact,
          proof.value,
          intent.basis,
          state.configuration,
        );
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
            proof: proof.value,
            binding: intent.binding,
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
        configuration: state.configuration
          ? {
              digest: state.configuration.digest,
              scanPolicy: {
                version: state.configuration.secretScan.version,
                digest: state.configuration.secretScan.digest,
              },
            }
          : null,
        journal: [...state.journal],
        head: { position: state.position, headDigest: state.headDigest },
      });
    },
  });
  const runtime = freeze({ fixture, state });
  scriptedEvidenceFixtures.add(fixture);
  return runtime;
}

export type ScriptedEvidenceFixture = Readonly<{
  prepare(input: unknown): EvidenceResult<EvidenceOutcome>;
  admit(input: unknown, artifact: ArtifactReadPort, fault?: 'lost-ack'): EvidenceResult<AdmittedEvidence>;
  reconcile(key: unknown): EvidenceResult<ReconciledEvidence>;
  snapshot(): Readonly<unknown>;
}>;

export function isScriptedEvidenceFixture(value: unknown): value is ScriptedEvidenceFixture {
  try {
    return typeof value === 'object' && value !== null && scriptedEvidenceFixtures.has(value);
  } catch {
    return false;
  }
}

export function createScriptedEvidenceFixture(config: unknown): ScriptedEvidenceFixture {
  return createRuntime(parseConfiguration(config)).fixture;
}

const BASIS_FIELDS = [
  'configurationDigest',
  'schemaVersion',
  'policy',
  'subjectKind',
  'subjectIdentity',
  'subject',
  'claim',
  'producer',
  'providerManifest',
  'contentType',
  'contentClass',
  'completeness',
  'originalDigest',
  'artifactDigest',
  'originalSize',
  'retainedSize',
  'loss',
  'redaction',
  'retention',
] as const;

function exactConfigurationBinding(input: unknown, configuration: Configuration): EvidenceResult<ConfigurationBinding> {
  const value = fields(input, [
    'configurationDigest',
    'subjectIndex',
    'claimIndex',
    'principalIndex',
    'sessionIndex',
    'policyIndex',
  ]);
  if (
    !value ||
    value.configurationDigest !== configuration.digest ||
    !Number.isSafeInteger(value.subjectIndex) ||
    !Number.isSafeInteger(value.claimIndex) ||
    !Number.isSafeInteger(value.principalIndex) ||
    !Number.isSafeInteger(value.sessionIndex) ||
    !Number.isSafeInteger(value.policyIndex)
  )
    return fail('FC-TRUST', 'RECOVERY_CONFIGURATION_MISMATCH');
  const subject = configuration.subjects[value.subjectIndex as number];
  const principal = configuration.principals[value.principalIndex as number];
  const policy = configuration.evidenceKinds[value.policyIndex as number];
  if (!subject?.claims[value.claimIndex as number] || !principal?.sessions[value.sessionIndex as number] || !policy)
    return fail('FC-TRUST', 'RECOVERY_CONFIGURATION_MISMATCH');
  return {
    ok: true,
    value: deepFreeze({
      configurationDigest: configuration.digest,
      subjectIndex: value.subjectIndex as number,
      claimIndex: value.claimIndex as number,
      principalIndex: value.principalIndex as number,
      sessionIndex: value.sessionIndex as number,
      policyIndex: value.policyIndex as number,
    }),
  };
}

function exactBasis(
  input: unknown,
  configuration: Configuration,
  binding: ConfigurationBinding,
): EvidenceResult<ManifestBasis> {
  const value = fields(input, BASIS_FIELDS);
  const policyValue =
    value && fields(value.policy, ['kind', 'version', 'digest', 'scanPolicyVersion', 'scanPolicyDigest']);
  const producer = value && fields(value.producer, ['kind', 'principal', 'session']);
  const redaction = value && fields(value.redaction, ['policyVersion', 'status']);
  const retention = value && exactRetention(value.retention);
  const loss = value?.loss === null ? null : value && fields(value.loss, ['kind', 'omittedBytes']);
  const subject = configuration.subjects[binding.subjectIndex];
  const principal = configuration.principals[binding.principalIndex];
  const policy = configuration.evidenceKinds[binding.policyIndex];
  const claim = subject?.claims[binding.claimIndex];
  const session = principal?.sessions[binding.sessionIndex];
  const hasLoss =
    loss !== null &&
    loss !== undefined &&
    loss.kind === 'truncated' &&
    Number.isSafeInteger(loss.omittedBytes) &&
    (loss.omittedBytes as number) > 0;
  if (
    !value ||
    !policyValue ||
    !producer ||
    !redaction ||
    !retention?.ok ||
    !subject ||
    !principal ||
    !policy ||
    !claim ||
    !session ||
    value.configurationDigest !== configuration.digest ||
    value.schemaVersion !== EVIDENCE_POLICY.schemaVersion ||
    policyValue.kind !== policy.kind ||
    policyValue.version !== policy.version ||
    policyValue.digest !== policy.digest ||
    policyValue.scanPolicyVersion !== policy.scanPolicyVersion ||
    policyValue.scanPolicyDigest !== policy.scanPolicyDigest ||
    value.subjectKind !== subject.kind ||
    value.subjectIdentity !== subject.identity ||
    value.subject !== `evidence://${subject.identity}${CLAIM_DIVIDER}${claim}` ||
    value.claim !== claim ||
    producer.kind !== 'principal' ||
    producer.principal !== principal.principal ||
    producer.session !== session ||
    value.providerManifest !== null ||
    value.contentType !== policy.contentType ||
    value.contentClass !== (policy.completenessCritical ? 'completeness-critical' : 'supporting') ||
    (value.completeness !== 'complete' && value.completeness !== 'partial') ||
    !digestValue(value.originalDigest) ||
    !digestValue(value.artifactDigest) ||
    !Number.isSafeInteger(value.originalSize) ||
    (value.originalSize as number) <= 0 ||
    !Number.isSafeInteger(value.retainedSize) ||
    (value.retainedSize as number) <= 0 ||
    (value.retainedSize as number) > (value.originalSize as number) ||
    redaction.policyVersion !== policy.scanPolicyVersion ||
    redaction.status !== policy.redactionStatus ||
    JSON.stringify(retention.value) !== JSON.stringify(policy.retention) ||
    (value.loss !== null && !hasLoss) ||
    (value.loss === null && (value.originalSize !== value.retainedSize || value.completeness !== 'complete')) ||
    (hasLoss &&
      (policy.completenessCritical ||
        policy.oversizeBehavior !== 'truncate-with-recorded-loss' ||
        (value.originalSize as number) <= policy.maxBytes ||
        value.retainedSize !== policy.maxBytes ||
        loss.omittedBytes !== (value.originalSize as number) - policy.maxBytes ||
        value.completeness !== 'partial'))
  )
    return fail('FC-TRUST', 'RECOVERY_EVIDENCE_BASIS_INVALID');
  return {
    ok: true,
    value: deepFreeze({
      configurationDigest: configuration.digest,
      schemaVersion: EVIDENCE_POLICY.schemaVersion,
      policy: policyIdentity(policy),
      subjectKind: subject.kind,
      subjectIdentity: subject.identity,
      subject: `evidence://${subject.identity}${CLAIM_DIVIDER}${claim}`,
      claim,
      producer: {
        kind: 'principal' as const,
        principal: principal.principal,
        session,
      },
      providerManifest: null,
      contentType: policy.contentType,
      contentClass: policy.completenessCritical ? 'completeness-critical' : 'supporting',
      completeness: value.completeness as ManifestBasis['completeness'],
      originalDigest: value.originalDigest as string,
      artifactDigest: value.artifactDigest as string,
      originalSize: value.originalSize as number,
      retainedSize: value.retainedSize as number,
      loss: hasLoss
        ? {
            kind: 'truncated' as const,
            omittedBytes: loss.omittedBytes as number,
          }
        : null,
      redaction: {
        policyVersion: policy.scanPolicyVersion,
        status: policy.redactionStatus,
      },
      retention: retention.value,
    }),
  };
}

function exactArtifactBasis(
  input: unknown,
  key: string,
  basis: ManifestBasis,
): EvidenceResult<Omit<ArtifactPutRequest, 'bytes'>> {
  const value = fields(input, ['resourceScope', 'subject', 'digest', 'fence', 'holder', 'operation', 'mode', 'pins']);
  const pins = value && fields(value.pins, ['temporary', 'intended']);
  const temporary = pins && fields(pins.temporary, ['holder', 'tuple']);
  const intended = pins && fields(pins.intended, ['holder', 'tuple']);
  if (
    !value ||
    !temporary ||
    !intended ||
    !boundedText(value.resourceScope) ||
    value.subject !== `artifact/evidence/${key}` ||
    value.digest !== basis.artifactDigest ||
    !boundedText(value.fence) ||
    value.holder !== 'SCH-EVIDENCE' ||
    !boundedText(value.operation) ||
    value.mode !== 'put' ||
    temporary.holder !== 'EV-ARTIFACT-FACT' ||
    !boundedText(temporary.tuple) ||
    intended.holder !== 'SCH-EVIDENCE' ||
    intended.tuple !== `evidence-manifest/${key}` ||
    [value.resourceScope, value.subject, value.fence, value.operation, temporary.tuple, intended.tuple].some(
      (item) => typeof item !== 'string' || secretText(item),
    )
  )
    return fail('FC-TRUST', 'RECOVERY_ARTIFACT_BINDING_INVALID');
  return {
    ok: true,
    value: deepFreeze({
      resourceScope: value.resourceScope,
      subject: value.subject,
      digest: value.digest,
      fence: value.fence,
      holder: 'SCH-EVIDENCE' as const,
      operation: value.operation,
      mode: 'put' as const,
      pins: {
        temporary: { holder: 'EV-ARTIFACT-FACT' as const, tuple: temporary.tuple },
        intended: { holder: 'SCH-EVIDENCE' as const, tuple: intended.tuple },
      },
    }),
  };
}

function exactIntent(input: unknown, configuration: Configuration): EvidenceResult<IntentRecord> {
  const value = fields(input, ['kind', 'key', 'basis', 'artifact', 'binding']);
  if (value?.kind !== 'intent' || !digestValue(value.key)) return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
  const binding = exactConfigurationBinding(value.binding, configuration);
  if (!binding.ok) return binding;
  const basis = exactBasis(value.basis, configuration, binding.value);
  if (!basis.ok) return basis;
  const artifact = exactArtifactBasis(value.artifact, value.key, basis.value);
  if (!artifact.ok) return artifact;
  const artifactSelection = {
    resourceScope: artifact.value.resourceScope,
    operation: artifact.value.operation,
    fence: artifact.value.fence,
    temporaryTuple: artifact.value.pins.temporary.tuple,
  };
  if (value.key !== sha256(JSON.stringify({ basis: basis.value, artifact: artifactSelection })))
    return fail('FC-TRUST', 'RECOVERY_EVIDENCE_KEY_INVALID');
  return {
    ok: true,
    value: deepFreeze({
      kind: 'intent' as const,
      key: value.key,
      basis: basis.value,
      artifact: artifact.value,
      binding: binding.value,
    }),
  };
}

function exactAdmission(
  input: unknown,
  intent: IntentRecord,
  configuration: Configuration,
): EvidenceResult<AdmissionRecord> {
  const value = fields(input, ['kind', 'key', 'manifest', 'getRequest', 'proof', 'binding']);
  if (value?.kind !== 'admission' || value.key !== intent.key) return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
  const binding = exactConfigurationBinding(value.binding, configuration);
  if (!binding.ok || JSON.stringify(binding.value) !== JSON.stringify(intent.binding))
    return fail('FC-TRUST', 'RECOVERY_CONFIGURATION_MISMATCH');
  const manifest = fields(value.manifest, [
    ...BASIS_FIELDS,
    'manifestDigest',
    'disposition',
    'artifactFact',
    'adoptionTransition',
  ]);
  if (!manifest) return fail('FC-TRUST', 'RECOVERY_EVIDENCE_MANIFEST_INVALID');
  const basisInput: Record<string, unknown> = {};
  for (const name of BASIS_FIELDS) basisInput[name] = manifest[name];
  const basis = exactBasis(basisInput, configuration, binding.value);
  if (!basis.ok || JSON.stringify(basis.value) !== JSON.stringify(intent.basis))
    return fail('FC-TRUST', 'RECOVERY_EVIDENCE_MANIFEST_INVALID');
  const fact = exactFact(manifest.artifactFact, intent.artifact);
  if (!fact.ok) return fail('FC-TRUST', 'RECOVERY_EVIDENCE_MANIFEST_INVALID');
  const proof = exactProof(value.proof, intent.artifact, fact.value);
  if (!proof.ok) return fail('FC-TRUST', 'RECOVERY_EVIDENCE_MANIFEST_INVALID');
  const expectedGet = getRequest(intent.artifact);
  const manifestDigest = sha256(
    JSON.stringify({
      basis: intent.basis,
      artifactFact: fact.value,
      adoptionTransition: proof.value.transition,
    }),
  );
  if (
    manifest.disposition !== 'admitted' ||
    manifest.adoptionTransition !== proof.value.transition ||
    manifest.manifestDigest !== manifestDigest ||
    JSON.stringify(value.getRequest) !== JSON.stringify(expectedGet)
  )
    return fail('FC-TRUST', 'RECOVERY_EVIDENCE_MANIFEST_INVALID');
  return {
    ok: true,
    value: deepFreeze({
      kind: 'admission' as const,
      key: intent.key,
      manifest: {
        ...intent.basis,
        manifestDigest,
        disposition: 'admitted' as const,
        artifactFact: fact.value,
        adoptionTransition: proof.value.transition,
      },
      getRequest: expectedGet,
      proof: proof.value,
      binding: binding.value,
    }),
  };
}

function exactOutcome(input: unknown, configuration: Configuration, position: number): EvidenceResult<OutcomeRecord> {
  const value = fields(input, ['kind', 'key', 'outcome', 'binding']);
  if (!value || (value.kind !== 'quarantine' && value.kind !== 'rejection') || !digestValue(value.key))
    return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
  const binding = exactConfigurationBinding(value.binding, configuration);
  if (!binding.ok) return binding;
  const expectedKey = outcomeKey(configuration, binding.value, value.kind, position);
  const outcome =
    value.kind === 'quarantine'
      ? fields(value.outcome, ['kind', 'key', 'reason'])
      : fields(value.outcome, ['kind', 'key', 'originalSize', 'reason']);
  const expectedOutcomeKind = value.kind === 'quarantine' ? 'quarantined' : 'rejected';
  const expectedReason = value.kind === 'quarantine' ? 'SECRET_DETECTED' : 'OVERSIZE_REJECTED';
  const policy = configuration.evidenceKinds[binding.value.policyIndex];
  if (
    !outcome ||
    !policy ||
    value.key !== expectedKey ||
    outcome.kind !== expectedOutcomeKind ||
    outcome.key !== expectedKey ||
    outcome.reason !== expectedReason ||
    (value.kind === 'rejection' &&
      (policy.oversizeBehavior !== 'reject' ||
        !Number.isSafeInteger(outcome.originalSize) ||
        (outcome.originalSize as number) <= policy.maxBytes))
  )
    return fail('FC-TRUST', 'RECOVERY_EVIDENCE_OUTCOME_INVALID');
  return {
    ok: true,
    value:
      value.kind === 'quarantine'
        ? deepFreeze({
            kind: 'quarantine' as const,
            key: expectedKey,
            outcome: {
              kind: 'quarantined' as const,
              key: expectedKey,
              reason: 'SECRET_DETECTED' as const,
            },
            binding: binding.value,
          })
        : deepFreeze({
            kind: 'rejection' as const,
            key: expectedKey,
            outcome: {
              kind: 'rejected' as const,
              key: expectedKey,
              originalSize: outcome.originalSize as number,
              reason: 'OVERSIZE_REJECTED' as const,
            },
            binding: binding.value,
          }),
  };
}

export function restoreScriptedEvidenceFixture(
  snapshot: unknown,
  witness: unknown,
  config: unknown,
  artifact: ArtifactReadPort,
): EvidenceResult<ScriptedEvidenceFixture> {
  const configuration = parseConfiguration(config);
  const source = fields(snapshot, ['configuration', 'journal', 'head']);
  const storedConfiguration = source && fields(source.configuration, ['digest', 'scanPolicy']);
  const storedScan = storedConfiguration && fields(storedConfiguration.scanPolicy, ['version', 'digest']);
  const storedHead = source && fields(source.head, ['position', 'headDigest']);
  const suppliedHead = fields(witness, ['position', 'headDigest']);
  if (
    !configuration ||
    !source ||
    !storedConfiguration ||
    !storedScan ||
    storedConfiguration.digest !== configuration.digest ||
    storedScan.version !== configuration.secretScan.version ||
    storedScan.digest !== configuration.secretScan.digest ||
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
    if (!artifactCurrencyCurrent(artifact)) return fail('FC-TRUST', 'RECOVERY_ARTIFACT_MISMATCH');
    const runtime = createRuntime(configuration);
    let previousDigest = ZERO_DIGEST;
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
      const kindDescriptor =
        entry.record && typeof entry.record === 'object'
          ? Object.getOwnPropertyDescriptor(entry.record, 'kind')
          : undefined;
      const kind = kindDescriptor && 'value' in kindDescriptor ? kindDescriptor.value : undefined;
      let record: EvidenceRecord;
      if (kind === 'intent') {
        const exact = exactIntent(entry.record, configuration);
        if (!exact.ok) return exact;
        record = exact.value;
        if (
          runtime.state.intents.has(record.key) ||
          (runtime.state.operations.has(record.artifact.operation) &&
            runtime.state.operations.get(record.artifact.operation) !== record.key)
        )
          return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
        runtime.state.intents.set(record.key, record);
        runtime.state.operations.set(record.artifact.operation, record.key);
      } else if (kind === 'admission') {
        const keyDescriptor =
          entry.record && typeof entry.record === 'object'
            ? Object.getOwnPropertyDescriptor(entry.record, 'key')
            : undefined;
        const key = keyDescriptor && 'value' in keyDescriptor ? keyDescriptor.value : undefined;
        const intent = typeof key === 'string' ? runtime.state.intents.get(key) : undefined;
        if (!intent || runtime.state.admissions.has(intent.key)) return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
        const exact = exactAdmission(entry.record, intent, configuration);
        if (!exact.ok) return exact;
        record = exact.value;
        const read = portReadbackOnly(
          artifact,
          record.manifest.artifactFact,
          record.getRequest,
          intent.artifact,
          record.proof,
          intent.basis,
          configuration,
        );
        if (!read.ok) return read;
        const admitted = deepFreeze({ kind: 'admitted' as const, manifest: record.manifest });
        runtime.state.admissions.set(record.key, admitted);
      } else if (kind === 'quarantine' || kind === 'rejection') {
        const exact = exactOutcome(entry.record, configuration, index);
        if (!exact.ok) return exact;
        record = exact.value;
        if (runtime.state.outcomes.has(record.key)) return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
        runtime.state.outcomes.set(record.key, record.outcome);
      } else {
        return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
      }
      const frozenEntry = deepFreeze({
        position: entry.position as number,
        previousDigest: entry.previousDigest as string,
        digest: entry.digest as string,
        record,
      });
      runtime.state.journal.push(frozenEntry);
      runtime.state.position = entry.position as number;
      runtime.state.headDigest = entry.digest as string;
      previousDigest = entry.digest as string;
    }
    if (runtime.state.position !== storedHead.position || runtime.state.headDigest !== storedHead.headDigest)
      return fail('FC-TRUST', 'RECOVERY_HEAD_MISMATCH');
    return { ok: true, value: runtime.fixture };
  } catch {
    return fail('FC-TRUST', 'RECOVERY_JOURNAL_INVALID');
  }
}

function portReadbackOnly(
  port: ArtifactReadPort,
  fact: ArtifactFact,
  request: ArtifactGetRequest,
  artifact: Omit<ArtifactPutRequest, 'bytes'>,
  proof: AdoptionProof,
  basis: ManifestBasis,
  configuration: Configuration,
): EvidenceResult<void> {
  try {
    if (!adoptionRecorded(port, artifact, fact, proof)) return fail('FC-TRUST', 'RECOVERY_ARTIFACT_MISMATCH');
    const read = port.get(request);
    if (
      !read.ok ||
      read.value.digest !== request.digest ||
      !(read.value.bytes instanceof Uint8Array) ||
      sha256(read.value.bytes) !== request.digest
    )
      return fail('FC-TRUST', 'RECOVERY_ARTIFACT_MISMATCH');
    const scanned = scan(read.value.bytes, basis.contentType, configuration.secretScan);
    return scanned.ok && !scanned.value.secret
      ? { ok: true, value: undefined }
      : fail('FC-TRUST', 'RECOVERY_ARTIFACT_MISMATCH');
  } catch {
    return fail('FC-TRUST', 'RECOVERY_ARTIFACT_MISMATCH');
  }
}
