import { type CanonicalJson, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';

export const VERIFICATION_CONTRACT_VERSION = 'jig.verification-contract.v1';
export const VERIFICATION_REQUEST_SCHEMA = 'jig.cb-verify-request.v1';
export const VERIFICATION_OBSERVATION_SCHEMA = 'jig.ev-check-observation.v1';
export const VERIFICATION_FAILURE_SCHEMA = 'jig.ev-check-failure.v1';
export const VERIFICATION_PORT = 'PORT-VERIFY';
export const VERIFICATION_CAPABILITY = 'CB-VERIFY';
export const VERIFICATION_OPERATION = 'OPC-VERIFY-EXECUTE';
export const VERIFICATION_MECHANISM = 'scripted-verify.v1';

export const VERIFICATION_POSTURES = Object.freeze(['deterministic', 'none'] as const);
export const VERIFICATION_BOUNDS = Object.freeze({
  waitMs: Object.freeze({ default: 15 * 60 * 1000, minimum: 5_000, maximum: 2 * 60 * 60 * 1000 }),
  retryLimit: Object.freeze({ default: 3, minimum: 1, maximum: 5 }),
});

export type VerificationPosture = (typeof VERIFICATION_POSTURES)[number];
export type VerificationOutcome = 'pass' | 'fail';
export type VerificationLifecycle = 'Waiting' | 'Accepted' | 'Finalizing';
export type VerificationFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-AUTHORITY'
  | 'FC-BOUND'
  | 'FC-MECHANISM'
  | 'FC-EVIDENCE'
  | 'FC-EFFECT'
  | 'FC-ORDERING'
  | 'FC-TRUST';
export type VerificationFailure = Readonly<{ family: VerificationFailureFamily; code: string }>;
export type VerificationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: VerificationFailure }>;

export type VerificationFence = Readonly<{
  generation: string;
  basis: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
}>;

export type VerificationSubject = Readonly<{
  candidate: string;
  candidateContentDigest: string;
  basisDigest: string;
  checkClasses: readonly string[];
  configurationDigest: string;
  environmentDigest: string;
  cleanReceiptDigest: string;
}>;

export type VerificationCheckClass = Readonly<{
  name: string;
  evidenceKind: string;
  bindingDigest: string;
}>;

export type VerificationPolicy = Readonly<{
  posture: VerificationPosture;
  required: readonly VerificationCheckClass[];
  digest: string;
}>;

export type VerificationConfiguration = Readonly<{
  bindings: readonly Readonly<{ checkClass: string; bindingDigest: string }>[];
  digest: string;
}>;

export type VerificationEnvironment = Readonly<{
  fingerprint: string;
  declaredNames: readonly string[];
  digest: string;
}>;

export type VerificationCleanReceipt = Readonly<{
  candidateContentDigest: string;
  targetBasisDigest: string;
  receiptDigest: string;
  checkout: 'read-only';
  scratch: 'discarded';
  network: 'none';
}>;

export type VerificationBounds = Readonly<{ waitMs: number; retryLimit: number }>;

export type VerificationRequest = Readonly<{
  schema: typeof VERIFICATION_REQUEST_SCHEMA;
  version: typeof VERIFICATION_CONTRACT_VERSION;
  type: typeof VERIFICATION_OPERATION;
  port: typeof VERIFICATION_PORT;
  capability: typeof VERIFICATION_CAPABILITY;
  operation: string;
  subject: VerificationSubject;
  fence: VerificationFence;
  policy: VerificationPolicy;
  configuration: VerificationConfiguration;
  environment: VerificationEnvironment;
  cleanReceipt: VerificationCleanReceipt;
  checkClass: string | null;
  lifecycle: VerificationLifecycle;
  retryOrdinal: number;
  predecessor: string | null;
  bounds: VerificationBounds;
}>;

export type VerificationObservation = Readonly<{
  schema: typeof VERIFICATION_OBSERVATION_SCHEMA;
  version: typeof VERIFICATION_CONTRACT_VERSION;
  kind: 'EV-CHECK-OBSERVATION';
  mechanism: typeof VERIFICATION_MECHANISM;
  provider: 'fixture-only';
  operation: string;
  subject: VerificationSubject;
  fence: VerificationFence;
  checkClass: string;
  outcome: VerificationOutcome;
  evidenceKind: string;
  evidenceDigest: string;
  artifactDigests: readonly string[];
  environmentDigest: string;
  cleanReceiptDigest: string;
  effectFree: true;
  observedAt: number;
}>;

export type VerificationFailureRecord = Readonly<{
  schema: typeof VERIFICATION_FAILURE_SCHEMA;
  version: typeof VERIFICATION_CONTRACT_VERSION;
  kind: 'failure';
  operation: string;
  retryOrdinal: number;
  reason: 'lost-response' | 'timeout';
  family: 'FC-MECHANISM';
  code: 'RESULT_UNCERTAIN' | 'MECHANISM_TIMEOUT';
  subject: VerificationSubject;
  fence: VerificationFence;
  supersededBy: string | null;
}>;

export type VerificationInvocation = Readonly<{
  operation: string;
  checkClass: string;
  retryOrdinal: number;
  result: 'returned' | 'lost-response' | 'timeout';
  effect: 'observation';
}>;

export type FinalizationVerificationState = Readonly<{
  origin: 'Waiting' | 'Accepted';
  state: 'Finalizing' | 'Reworking';
  posture: VerificationPosture;
  subject: VerificationSubject;
  fence: VerificationFence;
  requiredClasses: readonly string[];
  observations: readonly VerificationObservation[];
  noOp: boolean;
  readyForDelivery: boolean;
  deliveryOperations: readonly [];
  acceptanceGranted: false;
  landingGranted: false;
}>;

export type VerificationSnapshot = Readonly<{
  version: typeof VERIFICATION_CONTRACT_VERSION;
  requests: readonly VerificationRequest[];
  observations: readonly VerificationObservation[];
  failures: readonly VerificationFailureRecord[];
  invocations: readonly VerificationInvocation[];
  finalization: FinalizationVerificationState | null;
}>;

export type VerificationAuthorizer = Readonly<{
  recordDispatch(input: unknown): unknown;
}>;

export type ScriptedVerificationFixture = Readonly<{
  dispatch(input: unknown): VerificationResult<VerificationObservation>;
  enterFinalizing(input: unknown): VerificationResult<FinalizationVerificationState>;
  consume(input: unknown): VerificationResult<FinalizationVerificationState>;
  snapshot(): VerificationSnapshot;
  invocations(): readonly VerificationInvocation[];
  failures(): readonly VerificationFailureRecord[];
  reachability(): Readonly<{
    status: 'unavailable';
    providerEnabled: false;
    configurationEnabled: false;
    externalEffects: false;
  }>;
}>;

const DIGEST = /^[0-9a-f]{64}$/u;
const TEXT = /^[a-z0-9](?:[a-z0-9._/-]{0,127})$/u;
const MAX_CLASSES = 64;
const MAX_ARTIFACTS = 16;
const ZERO = '0'.repeat(64);

const ok = <T>(value: T): VerificationResult<T> => Object.freeze({ ok: true, value: deepFreeze(value) });
const fail = <T = never>(family: VerificationFailureFamily, code: string): VerificationResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function plain(value: unknown): value is Record<string, unknown> {
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
}

function fields(value: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  if (!plain(value)) return undefined;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors).sort();
    if (keys.join(',') !== [...names].sort().join(',')) return undefined;
    if (!names.every((name) => descriptors[name]?.enumerable && 'value' in descriptors[name])) return undefined;
    return Object.freeze(Object.fromEntries(names.map((name) => [name, descriptors[name].value])));
  } catch {
    return undefined;
  }
}

function list(value: unknown, maximum = MAX_CLASSES): readonly unknown[] | undefined {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum)
    return undefined;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(value).length !== value.length + 1) return undefined;
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor?.enumerable || !('value' in descriptor)) return undefined;
      result.push(descriptor.value);
    }
    return Object.freeze(result);
  } catch {
    return undefined;
  }
}

const digest = (value: unknown): value is string => typeof value === 'string' && DIGEST.test(value);
const text = (value: unknown): value is string => typeof value === 'string' && TEXT.test(value);
const boundedText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 512 && value.normalize('NFC') === value;
const nonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const identity = (kind: string, value: unknown): value is string =>
  typeof value === 'string' && parseIdentity(kind, value).ok;

function derived(domain: string, value: unknown): string | undefined {
  try {
    const result = stageDigest({ domain, excludePaths: [], value: value as CanonicalJson });
    return result.ok ? result.value.digest : undefined;
  } catch {
    return undefined;
  }
}

function same(left: unknown, right: unknown): boolean {
  const leftDigest = derived('VERIFY-COMPARE', left);
  return leftDigest !== undefined && leftDigest === derived('VERIFY-COMPARE', right);
}

function sameRequest(left: VerificationRequest, right: VerificationRequest): boolean {
  return (
    left.operation === right.operation &&
    left.checkClass === right.checkClass &&
    left.lifecycle === right.lifecycle &&
    left.retryOrdinal === right.retryOrdinal &&
    left.predecessor === right.predecessor &&
    sameSubject(left.subject, right.subject) &&
    same(left.fence, right.fence) &&
    left.policy.digest === right.policy.digest &&
    left.configuration.digest === right.configuration.digest &&
    left.environment.digest === right.environment.digest &&
    left.cleanReceipt.receiptDigest === right.cleanReceipt.receiptDigest &&
    same(left.bounds, right.bounds)
  );
}

function capabilityDigest(value: Readonly<Record<string, unknown>>): string | undefined {
  try {
    const result = stageDigest({
      domain: 'OPERATION-CAPABILITY',
      excludePaths: ['digest'],
      value: value as CanonicalJson,
    });
    return result.ok ? result.value.digest : undefined;
  } catch {
    return undefined;
  }
}

function checkClasses(value: unknown): readonly VerificationCheckClass[] | undefined {
  const entries = list(value);
  if (!entries) return undefined;
  const parsed: VerificationCheckClass[] = [];
  for (const entry of entries) {
    const raw = fields(entry, ['name', 'evidenceKind', 'bindingDigest']);
    if (!raw || !text(raw.name) || !text(raw.evidenceKind) || !digest(raw.bindingDigest)) return undefined;
    parsed.push(Object.freeze({ name: raw.name, evidenceKind: raw.evidenceKind, bindingDigest: raw.bindingDigest }));
  }
  const names = parsed.map((entry) => entry.name);
  if (new Set(names).size !== names.length || names.some((name, index) => index > 0 && names[index - 1] >= name))
    return undefined;
  return Object.freeze(parsed);
}

function policy(value: unknown): VerificationPolicy | undefined {
  const raw = fields(value, ['posture', 'required', 'digest']);
  const required = raw && checkClasses(raw.required);
  if (!raw || !required || !VERIFICATION_POSTURES.includes(raw.posture as VerificationPosture) || !digest(raw.digest))
    return undefined;
  const expected = derived('VERIFY-POLICY', { posture: raw.posture, required });
  return expected === raw.digest
    ? Object.freeze({ posture: raw.posture as VerificationPosture, required, digest: raw.digest })
    : undefined;
}

function configuration(value: unknown): VerificationConfiguration | undefined {
  const raw = fields(value, ['bindings', 'digest']);
  const entries = raw && list(raw.bindings);
  if (!raw || !entries || !digest(raw.digest)) return undefined;
  const bindings: Readonly<{ checkClass: string; bindingDigest: string }>[] = [];
  for (const entry of entries) {
    const item = fields(entry, ['checkClass', 'bindingDigest']);
    if (!item || !text(item.checkClass) || !digest(item.bindingDigest)) return undefined;
    bindings.push(Object.freeze({ checkClass: item.checkClass, bindingDigest: item.bindingDigest }));
  }
  const names = bindings.map((entry) => entry.checkClass);
  if (new Set(names).size !== names.length || names.some((name, index) => index > 0 && names[index - 1] >= name))
    return undefined;
  const expected = derived('VERIFY-CONFIGURATION', { bindings });
  return expected === raw.digest ? Object.freeze({ bindings: Object.freeze(bindings), digest: raw.digest }) : undefined;
}

function environment(value: unknown): VerificationEnvironment | undefined {
  const raw = fields(value, ['fingerprint', 'declaredNames', 'digest']);
  const names = raw && list(raw.declaredNames, 128);
  if (!raw || !text(raw.fingerprint) || !names || !digest(raw.digest) || names.some((name) => !text(name)))
    return undefined;
  const ordered = names as string[];
  if (
    new Set(ordered).size !== ordered.length ||
    ordered.some((name, index) => index > 0 && ordered[index - 1] >= name)
  )
    return undefined;
  const expected = derived('VERIFY-ENVIRONMENT', { fingerprint: raw.fingerprint, declaredNames: ordered });
  return expected === raw.digest
    ? Object.freeze({ fingerprint: raw.fingerprint, declaredNames: Object.freeze(ordered), digest: raw.digest })
    : undefined;
}

function cleanReceipt(value: unknown): VerificationCleanReceipt | undefined {
  const raw = fields(value, [
    'candidateContentDigest',
    'targetBasisDigest',
    'receiptDigest',
    'checkout',
    'scratch',
    'network',
  ]);
  if (
    !raw ||
    !digest(raw.candidateContentDigest) ||
    !digest(raw.targetBasisDigest) ||
    !digest(raw.receiptDigest) ||
    raw.checkout !== 'read-only' ||
    raw.scratch !== 'discarded' ||
    raw.network !== 'none'
  )
    return undefined;
  const expected = derived('VERIFY-CLEAN-RECEIPT', {
    candidateContentDigest: raw.candidateContentDigest,
    targetBasisDigest: raw.targetBasisDigest,
    checkout: raw.checkout,
    scratch: raw.scratch,
    network: raw.network,
  });
  return expected === raw.receiptDigest
    ? Object.freeze({
        candidateContentDigest: raw.candidateContentDigest,
        targetBasisDigest: raw.targetBasisDigest,
        receiptDigest: raw.receiptDigest,
        checkout: 'read-only',
        scratch: 'discarded',
        network: 'none',
      })
    : undefined;
}

function fence(value: unknown, run?: string): VerificationFence | undefined {
  const raw = fields(value, ['generation', 'basis', 'candidateContentDigest', 'targetBasisDigest']);
  if (
    !raw ||
    !boundedText(raw.generation) ||
    !digest(raw.basis) ||
    !digest(raw.candidateContentDigest) ||
    !digest(raw.targetBasisDigest) ||
    !identity('ID-GEN', raw.generation) ||
    (run !== undefined && !raw.generation.startsWith(`${run}/gen/`))
  )
    return undefined;
  return Object.freeze({
    generation: raw.generation,
    basis: raw.basis,
    candidateContentDigest: raw.candidateContentDigest,
    targetBasisDigest: raw.targetBasisDigest,
  });
}

function subject(value: unknown, expectedCandidate?: string): VerificationSubject | undefined {
  const raw = fields(value, [
    'candidate',
    'candidateContentDigest',
    'basisDigest',
    'checkClasses',
    'configurationDigest',
    'environmentDigest',
    'cleanReceiptDigest',
  ]);
  const classes = raw && list(raw.checkClasses);
  if (
    !raw ||
    !classes?.every(text) ||
    !boundedText(raw.candidate) ||
    !identity('ID-CAND', raw.candidate) ||
    (expectedCandidate !== undefined && raw.candidate !== expectedCandidate) ||
    !digest(raw.candidateContentDigest) ||
    !digest(raw.basisDigest) ||
    !digest(raw.configurationDigest) ||
    !digest(raw.environmentDigest) ||
    !digest(raw.cleanReceiptDigest)
  )
    return undefined;
  const names = classes as string[];
  if (new Set(names).size !== names.length || names.some((name, index) => index > 0 && names[index - 1] >= name))
    return undefined;
  return Object.freeze({
    candidate: raw.candidate,
    candidateContentDigest: raw.candidateContentDigest,
    basisDigest: raw.basisDigest,
    checkClasses: Object.freeze(names),
    configurationDigest: raw.configurationDigest,
    environmentDigest: raw.environmentDigest,
    cleanReceiptDigest: raw.cleanReceiptDigest,
  });
}

function bounds(value: unknown): VerificationBounds | undefined {
  const raw = fields(value, ['waitMs', 'retryLimit']);
  if (
    !raw ||
    typeof raw.waitMs !== 'number' ||
    raw.waitMs < VERIFICATION_BOUNDS.waitMs.minimum ||
    raw.waitMs > VERIFICATION_BOUNDS.waitMs.maximum ||
    !Number.isSafeInteger(raw.waitMs) ||
    typeof raw.retryLimit !== 'number' ||
    raw.retryLimit < VERIFICATION_BOUNDS.retryLimit.minimum ||
    raw.retryLimit > VERIFICATION_BOUNDS.retryLimit.maximum ||
    !Number.isSafeInteger(raw.retryLimit)
  )
    return undefined;
  return Object.freeze({ waitMs: raw.waitMs, retryLimit: raw.retryLimit });
}

function validateRequest(value: unknown): VerificationRequest | undefined {
  const raw = fields(value, [
    'schema',
    'version',
    'type',
    'port',
    'capability',
    'operation',
    'subject',
    'fence',
    'policy',
    'configuration',
    'environment',
    'cleanReceipt',
    'checkClass',
    'lifecycle',
    'retryOrdinal',
    'predecessor',
    'bounds',
  ]);
  if (
    !raw ||
    raw.schema !== VERIFICATION_REQUEST_SCHEMA ||
    raw.version !== VERIFICATION_CONTRACT_VERSION ||
    raw.type !== VERIFICATION_OPERATION ||
    raw.port !== VERIFICATION_PORT ||
    raw.capability !== VERIFICATION_CAPABILITY ||
    !boundedText(raw.operation) ||
    !identity('ID-OP', raw.operation) ||
    !nonNegativeInteger(raw.retryOrdinal) ||
    raw.retryOrdinal < 1 ||
    (raw.predecessor !== null && (!boundedText(raw.predecessor) || !identity('ID-OP', raw.predecessor))) ||
    (raw.checkClass !== null && !text(raw.checkClass)) ||
    !['Waiting', 'Accepted', 'Finalizing'].includes(raw.lifecycle as string)
  )
    return undefined;
  const parsedPolicy = policy(raw.policy);
  const parsedConfiguration = configuration(raw.configuration);
  const parsedEnvironment = environment(raw.environment);
  const parsedReceipt = cleanReceipt(raw.cleanReceipt);
  const parsedSubject = subject(raw.subject);
  const parsedFence = fence(raw.fence);
  const parsedBounds = bounds(raw.bounds);
  if (
    !parsedPolicy ||
    !parsedConfiguration ||
    !parsedEnvironment ||
    !parsedReceipt ||
    !parsedSubject ||
    !parsedFence ||
    !parsedBounds ||
    (parsedPolicy.posture === 'deterministic' &&
      (raw.checkClass === null || !parsedPolicy.required.some((entry) => entry.name === raw.checkClass))) ||
    (parsedPolicy.posture === 'none' &&
      raw.checkClass !== null &&
      !parsedPolicy.required.some((entry) => entry.name === raw.checkClass)) ||
    parsedPolicy.required.some(
      (entry) =>
        !parsedConfiguration.bindings.some(
          (binding) => binding.checkClass === entry.name && binding.bindingDigest === entry.bindingDigest,
        ),
    ) ||
    parsedSubject.checkClasses.join('|') !== parsedPolicy.required.map((entry) => entry.name).join('|') ||
    parsedSubject.configurationDigest !== parsedConfiguration.digest ||
    parsedSubject.environmentDigest !== parsedEnvironment.digest ||
    parsedSubject.cleanReceiptDigest !== parsedReceipt.receiptDigest ||
    parsedSubject.basisDigest !== parsedFence.basis ||
    parsedSubject.candidateContentDigest !== parsedFence.candidateContentDigest ||
    parsedReceipt.candidateContentDigest !== parsedFence.candidateContentDigest ||
    parsedReceipt.targetBasisDigest !== parsedFence.targetBasisDigest
  )
    return undefined;
  return Object.freeze({
    schema: VERIFICATION_REQUEST_SCHEMA,
    version: VERIFICATION_CONTRACT_VERSION,
    type: VERIFICATION_OPERATION,
    port: VERIFICATION_PORT,
    capability: VERIFICATION_CAPABILITY,
    operation: raw.operation,
    subject: parsedSubject,
    fence: parsedFence,
    policy: parsedPolicy,
    configuration: parsedConfiguration,
    environment: parsedEnvironment,
    cleanReceipt: parsedReceipt,
    checkClass: raw.checkClass as string | null,
    lifecycle: raw.lifecycle as VerificationLifecycle,
    retryOrdinal: raw.retryOrdinal,
    predecessor: raw.predecessor as string | null,
    bounds: parsedBounds,
  });
}

function validatePermit(value: unknown, request: VerificationRequest): boolean {
  const raw = fields(value, [
    'version',
    'operation',
    'ordinal',
    'type',
    'subject',
    'fence',
    'capability',
    'authority',
    'role',
    'lifecycle',
    'proof',
    'purpose',
    'predecessor',
  ]);
  const permitSubject = raw && fields(raw.subject, ['run', 'story', 'basis']);
  const permitFence = raw && fence(raw.fence);
  const capability =
    raw &&
    fields(raw.capability, [
      'kind',
      'port',
      'operationClass',
      'subject',
      'fence',
      'resourceScope',
      'manifest',
      'digest',
    ]);
  const proof = raw && fields(raw.proof, ['kind', 'position', 'event', 'transaction', 'recordDigest', 'witnessDigest']);
  if (
    raw?.version !== 'jig.operation.v1' ||
    raw.operation !== request.operation ||
    raw.type !== VERIFICATION_OPERATION ||
    raw.ordinal !== 1 ||
    !permitSubject ||
    !text(permitSubject.run) ||
    !text(permitSubject.story) ||
    !digest(permitSubject.basis) ||
    !permitSubject.story.startsWith(`${permitSubject.run}/story/`) ||
    permitSubject.basis !== request.subject.basisDigest ||
    !permitFence ||
    !same(permitFence, request.fence) ||
    !capability ||
    capability.kind !== VERIFICATION_CAPABILITY ||
    capability.port !== VERIFICATION_PORT ||
    capability.operationClass !== VERIFICATION_OPERATION ||
    capability.subject !== permitSubject.story ||
    !same(capability.fence, permitFence) ||
    !text(capability.resourceScope) ||
    !boundedText(capability.manifest) ||
    !identity('ID-MANIFEST', capability.manifest) ||
    !digest(capability.digest) ||
    raw.authority !== null ||
    !text(raw.role) ||
    !boundedText(raw.lifecycle) ||
    !proof ||
    proof.kind !== 'committed-witnessed' ||
    !nonNegativeInteger(proof.position) ||
    !text(proof.event) ||
    !boundedText(proof.transaction) ||
    !digest(proof.recordDigest) ||
    proof.recordDigest !== proof.witnessDigest ||
    !['semantic', 'replacement'].includes(raw.purpose as string) ||
    raw.predecessor !== request.predecessor
  )
    return false;
  return (
    capabilityDigest({
      kind: capability.kind,
      port: capability.port,
      operationClass: capability.operationClass,
      subject: capability.subject,
      fence: permitFence,
      resourceScope: capability.resourceScope,
      manifest: capability.manifest,
      digest: '',
    }) === capability.digest
  );
}

function observation(value: unknown, request: VerificationRequest): VerificationObservation | undefined {
  const raw = fields(value, [
    'schema',
    'version',
    'kind',
    'mechanism',
    'provider',
    'operation',
    'subject',
    'fence',
    'checkClass',
    'outcome',
    'evidenceKind',
    'evidenceDigest',
    'artifactDigests',
    'environmentDigest',
    'cleanReceiptDigest',
    'effectFree',
    'observedAt',
  ]);
  const artifacts = raw && list(raw.artifactDigests, MAX_ARTIFACTS);
  const subjectValue = raw && subject(raw.subject);
  const fenceValue = raw && fence(raw.fence);
  if (
    !raw ||
    !artifacts ||
    artifacts.some((item) => !digest(item)) ||
    raw.schema !== VERIFICATION_OBSERVATION_SCHEMA ||
    raw.version !== VERIFICATION_CONTRACT_VERSION ||
    raw.kind !== 'EV-CHECK-OBSERVATION' ||
    raw.mechanism !== VERIFICATION_MECHANISM ||
    raw.provider !== 'fixture-only' ||
    raw.operation !== request.operation ||
    !subjectValue ||
    !same(subjectValue, request.subject) ||
    !fenceValue ||
    !same(fenceValue, request.fence) ||
    raw.checkClass !== request.checkClass ||
    !['pass', 'fail'].includes(raw.outcome as string) ||
    !text(raw.evidenceKind) ||
    !digest(raw.evidenceDigest) ||
    raw.environmentDigest !== request.environment.digest ||
    raw.cleanReceiptDigest !== request.cleanReceipt.receiptDigest ||
    raw.effectFree !== true ||
    typeof raw.observedAt !== 'number' ||
    !Number.isSafeInteger(raw.observedAt) ||
    raw.observedAt < 0
  )
    return undefined;
  const expectedClass =
    request.checkClass === null
      ? undefined
      : request.policy.required.find((entry) => entry.name === request.checkClass);
  if (!expectedClass || raw.evidenceKind !== expectedClass.evidenceKind) return undefined;
  return Object.freeze({
    schema: VERIFICATION_OBSERVATION_SCHEMA,
    version: VERIFICATION_CONTRACT_VERSION,
    kind: 'EV-CHECK-OBSERVATION',
    mechanism: VERIFICATION_MECHANISM,
    provider: 'fixture-only',
    operation: request.operation,
    subject: request.subject,
    fence: request.fence,
    checkClass: request.checkClass as string,
    outcome: raw.outcome as VerificationOutcome,
    evidenceKind: raw.evidenceKind,
    evidenceDigest: raw.evidenceDigest,
    artifactDigests: Object.freeze(artifacts as string[]),
    environmentDigest: request.environment.digest,
    cleanReceiptDigest: request.cleanReceipt.receiptDigest,
    effectFree: true,
    observedAt: raw.observedAt,
  });
}

function sameSubject(left: VerificationSubject, right: VerificationSubject): boolean {
  return (
    left.candidate === right.candidate &&
    left.candidateContentDigest === right.candidateContentDigest &&
    left.basisDigest === right.basisDigest &&
    left.checkClasses.join('|') === right.checkClasses.join('|') &&
    left.configurationDigest === right.configurationDigest &&
    left.environmentDigest === right.environmentDigest &&
    left.cleanReceiptDigest === right.cleanReceiptDigest
  );
}

export function deriveVerificationPolicyDigest(
  value: Readonly<{ posture: VerificationPosture; required: readonly VerificationCheckClass[] }>,
): VerificationResult<string> {
  const required = checkClasses(value.required);
  if (!required || !VERIFICATION_POSTURES.includes(value.posture)) return fail('FC-INPUT', 'INVALID_POLICY');
  const result = derived('VERIFY-POLICY', { posture: value.posture, required });
  return result ? ok(result) : fail('FC-INPUT', 'INVALID_POLICY');
}

export function deriveVerificationConfigurationDigest(
  value: Readonly<{ bindings: readonly Readonly<{ checkClass: string; bindingDigest: string }>[] }>,
): VerificationResult<string> {
  const parsed = configuration({ bindings: value.bindings, digest: ZERO });
  if (!parsed) {
    const bindings = list(value.bindings);
    if (!bindings) return fail('FC-INPUT', 'INVALID_CONFIGURATION');
    const normalized = bindings.map((entry) => fields(entry, ['checkClass', 'bindingDigest']));
    if (normalized.some((entry) => !entry || !text(entry.checkClass) || !digest(entry.bindingDigest)))
      return fail('FC-INPUT', 'INVALID_CONFIGURATION');
    const result = derived('VERIFY-CONFIGURATION', {
      bindings: normalized.map((entry) => ({ checkClass: entry?.checkClass, bindingDigest: entry?.bindingDigest })),
    });
    return result ? ok(result) : fail('FC-INPUT', 'INVALID_CONFIGURATION');
  }
  return ok(parsed.digest);
}

export function deriveVerificationEnvironmentDigest(
  value: Readonly<{ fingerprint: string; declaredNames: readonly string[] }>,
): VerificationResult<string> {
  if (
    !text(value.fingerprint) ||
    !Array.isArray(value.declaredNames) ||
    value.declaredNames.some((name) => !text(name))
  )
    return fail('FC-INPUT', 'INVALID_ENVIRONMENT');
  const names = [...value.declaredNames];
  if (new Set(names).size !== names.length || names.some((name, index) => index > 0 && names[index - 1] >= name))
    return fail('FC-INPUT', 'INVALID_ENVIRONMENT');
  const result = derived('VERIFY-ENVIRONMENT', { fingerprint: value.fingerprint, declaredNames: names });
  return result ? ok(result) : fail('FC-INPUT', 'INVALID_ENVIRONMENT');
}

export function deriveVerificationCleanReceiptDigest(
  value: Readonly<{ candidateContentDigest: string; targetBasisDigest: string }>,
): VerificationResult<string> {
  if (!digest(value.candidateContentDigest) || !digest(value.targetBasisDigest))
    return fail('FC-INPUT', 'INVALID_CLEAN_RECEIPT');
  const result = derived('VERIFY-CLEAN-RECEIPT', {
    candidateContentDigest: value.candidateContentDigest,
    targetBasisDigest: value.targetBasisDigest,
    checkout: 'read-only',
    scratch: 'discarded',
    network: 'none',
  });
  return result ? ok(result) : fail('FC-INPUT', 'INVALID_CLEAN_RECEIPT');
}

function finalizationState(
  origin: 'Waiting' | 'Accepted',
  request: VerificationRequest,
): FinalizationVerificationState {
  return Object.freeze({
    origin,
    state: 'Finalizing',
    posture: request.policy.posture,
    subject: request.subject,
    fence: request.fence,
    requiredClasses: Object.freeze(request.policy.required.map((entry) => entry.name)),
    observations: Object.freeze([]),
    noOp: request.policy.posture === 'none',
    readyForDelivery: request.policy.posture === 'none',
    deliveryOperations: Object.freeze([]) as readonly [],
    acceptanceGranted: false,
    landingGranted: false,
  });
}

function parseSnapshot(value: unknown): VerificationSnapshot | undefined {
  const raw = fields(value, ['version', 'requests', 'observations', 'failures', 'invocations', 'finalization']);
  const requestValues = raw && list(raw.requests);
  const observationValues = raw && list(raw.observations);
  const failureValues = raw && list(raw.failures);
  const invocationValues = raw && list(raw.invocations);
  if (
    !raw ||
    raw.version !== VERIFICATION_CONTRACT_VERSION ||
    !requestValues ||
    !observationValues ||
    !failureValues ||
    !invocationValues
  )
    return undefined;
  const requests: VerificationRequest[] = [];
  for (const value of requestValues) {
    const parsed = validateRequest(value);
    if (!parsed || requests.some((entry) => entry.operation === parsed.operation)) return undefined;
    requests.push(parsed);
  }
  for (const request of requests) {
    if (request.retryOrdinal === 1) {
      if (request.predecessor !== null) return undefined;
      continue;
    }
    const predecessor = requests.find((entry) => entry.operation === request.predecessor);
    if (
      !predecessor ||
      request.predecessor === null ||
      predecessor.retryOrdinal + 1 !== request.retryOrdinal ||
      request.subject.candidate !== predecessor.subject.candidate ||
      !sameSubject(request.subject, predecessor.subject) ||
      !same(request.fence, predecessor.fence)
    )
      return undefined;
  }
  const observations: VerificationObservation[] = [];
  for (const value of observationValues) {
    const operation = plain(value) ? Object.getOwnPropertyDescriptor(value, 'operation')?.value : undefined;
    const request = requests.find((entry) => entry.operation === operation);
    const parsed = request && observation(value, request);
    if (!parsed || observations.some((entry) => entry.operation === parsed.operation)) return undefined;
    observations.push(parsed);
  }
  const failures: VerificationFailureRecord[] = [];
  for (const value of failureValues) {
    const item = fields(value, [
      'schema',
      'version',
      'kind',
      'operation',
      'retryOrdinal',
      'reason',
      'family',
      'code',
      'subject',
      'fence',
      'supersededBy',
    ]);
    const request = item && requests.find((entry) => entry.operation === item.operation);
    const parsedSubject = item && subject(item.subject);
    const parsedFence = item && fence(item.fence);
    if (
      !item ||
      !request ||
      item.schema !== VERIFICATION_FAILURE_SCHEMA ||
      item.version !== VERIFICATION_CONTRACT_VERSION ||
      item.kind !== 'failure' ||
      !nonNegativeInteger(item.retryOrdinal) ||
      item.retryOrdinal !== request.retryOrdinal ||
      !['lost-response', 'timeout'].includes(item.reason as string) ||
      item.family !== 'FC-MECHANISM' ||
      !['RESULT_UNCERTAIN', 'MECHANISM_TIMEOUT'].includes(item.code as string) ||
      !parsedSubject ||
      !sameSubject(parsedSubject, request.subject) ||
      !parsedFence ||
      !same(parsedFence, request.fence) ||
      (item.supersededBy !== null && (!boundedText(item.supersededBy) || !identity('ID-OP', item.supersededBy))) ||
      failures.some((entry) => entry.operation === item.operation)
    )
      return undefined;
    failures.push(
      Object.freeze({
        schema: VERIFICATION_FAILURE_SCHEMA,
        version: VERIFICATION_CONTRACT_VERSION,
        kind: 'failure',
        operation: request.operation,
        retryOrdinal: request.retryOrdinal,
        reason: item.reason as 'lost-response' | 'timeout',
        family: 'FC-MECHANISM',
        code: item.code as 'RESULT_UNCERTAIN' | 'MECHANISM_TIMEOUT',
        subject: request.subject,
        fence: request.fence,
        supersededBy: item.supersededBy as string | null,
      }),
    );
  }
  for (const failure of failures) {
    const invocation = invocationValues
      .map((value) => fields(value, ['operation', 'checkClass', 'retryOrdinal', 'result', 'effect']))
      .find((entry) => entry?.operation === failure.operation);
    if (!invocation || invocation.result !== failure.reason) return undefined;
    if (failure.supersededBy !== null) {
      const successor = requests.find((entry) => entry.operation === failure.supersededBy);
      if (
        !successor ||
        successor.predecessor !== failure.operation ||
        successor.retryOrdinal !== failure.retryOrdinal + 1 ||
        !sameSubject(successor.subject, failure.subject) ||
        !same(successor.fence, failure.fence)
      )
        return undefined;
    }
  }
  for (const request of requests) {
    if (
      request.retryOrdinal > 1 &&
      !failures.some((entry) => entry.operation === request.predecessor && entry.supersededBy === request.operation)
    )
      return undefined;
  }
  const invocations: VerificationInvocation[] = [];
  for (const value of invocationValues) {
    const item = fields(value, ['operation', 'checkClass', 'retryOrdinal', 'result', 'effect']);
    const request = item && requests.find((entry) => entry.operation === item.operation);
    if (
      !item ||
      !request ||
      !text(item.checkClass) ||
      request.checkClass === null ||
      item.checkClass !== request.checkClass ||
      !nonNegativeInteger(item.retryOrdinal) ||
      item.retryOrdinal !== request.retryOrdinal ||
      !['returned', 'lost-response', 'timeout'].includes(item.result as string) ||
      item.effect !== 'observation'
    )
      return undefined;
    invocations.push(
      Object.freeze({
        operation: request.operation,
        checkClass: item.checkClass,
        retryOrdinal: request.retryOrdinal,
        result: item.result as VerificationInvocation['result'],
        effect: 'observation',
      }),
    );
  }
  for (const request of requests) {
    const matchingInvocations = invocations.filter((entry) => entry.operation === request.operation);
    if (matchingInvocations.length === 0) {
      if (request.policy.posture !== 'none' && raw.finalization === null) return undefined;
      continue;
    }
    if (matchingInvocations.length !== 1) return undefined;
    const invocation = matchingInvocations[0];
    if (invocation.result === 'returned') {
      if (!observations.some((entry) => entry.operation === request.operation)) return undefined;
    } else if (!failures.some((entry) => entry.operation === request.operation && entry.reason === invocation.result))
      return undefined;
  }
  for (const observation of observations) {
    if (!invocations.some((entry) => entry.operation === observation.operation && entry.result === 'returned'))
      return undefined;
  }
  let finalization: FinalizationVerificationState | null = null;
  if (raw.finalization !== null) {
    const item = fields(raw.finalization, [
      'origin',
      'state',
      'posture',
      'subject',
      'fence',
      'requiredClasses',
      'observations',
      'noOp',
      'readyForDelivery',
      'deliveryOperations',
      'acceptanceGranted',
      'landingGranted',
    ]);
    const parsedSubject = item && subject(item.subject);
    const parsedFence = item && fence(item.fence);
    const required = item && list(item.requiredClasses);
    const finalObservations = item && list(item.observations);
    const deliveryOperations = item && list(item.deliveryOperations, 0);
    const anchor =
      item &&
      requests.find(
        (entry) =>
          parsedSubject && parsedFence && sameSubject(entry.subject, parsedSubject) && same(entry.fence, parsedFence),
      );
    const expectedRequired = anchor?.policy.required.map((entry) => entry.name);
    if (
      !item ||
      !anchor ||
      !['Waiting', 'Accepted'].includes(item.origin as string) ||
      !['Finalizing', 'Reworking'].includes(item.state as string) ||
      !VERIFICATION_POSTURES.includes(item.posture as VerificationPosture) ||
      !parsedSubject ||
      !parsedFence ||
      !required ||
      required.some((entry) => !text(entry)) ||
      !finalObservations ||
      !deliveryOperations ||
      deliveryOperations.length !== 0 ||
      item.acceptanceGranted !== false ||
      item.landingGranted !== false ||
      item.noOp !== (item.posture === 'none') ||
      !['boolean'].includes(typeof item.readyForDelivery) ||
      item.posture !== anchor.policy.posture ||
      !expectedRequired ||
      required.length !== expectedRequired.length ||
      required.some((entry, index) => entry !== expectedRequired[index]) ||
      (item.origin !== anchor.lifecycle && anchor.lifecycle !== 'Finalizing')
    )
      return undefined;
    const normalizedObservations: VerificationObservation[] = [];
    for (const observationValue of finalObservations) {
      const operation = plain(observationValue)
        ? Object.getOwnPropertyDescriptor(observationValue, 'operation')?.value
        : undefined;
      const request = requests.find((entry) => entry.operation === operation);
      const parsed = request && observation(observationValue, request);
      if (!parsed || !sameSubject(parsed.subject, parsedSubject) || !same(parsed.fence, parsedFence)) return undefined;
      normalizedObservations.push(parsed);
    }
    if (new Set(normalizedObservations.map((entry) => entry.checkClass)).size !== normalizedObservations.length)
      return undefined;
    const observedClasses = new Set(normalizedObservations.map((entry) => entry.checkClass));
    const hasFailure = normalizedObservations.some((entry) => entry.outcome === 'fail');
    const expectedState = hasFailure ? 'Reworking' : 'Finalizing';
    const expectedReady =
      item.posture === 'none' || (!hasFailure && expectedRequired.every((entry) => observedClasses.has(entry)));
    if (item.state !== expectedState || item.readyForDelivery !== expectedReady) return undefined;
    if (item.posture === 'none' && normalizedObservations.length !== 0) return undefined;
    finalization = Object.freeze({
      origin: item.origin as 'Waiting' | 'Accepted',
      state: item.state as 'Finalizing' | 'Reworking',
      posture: item.posture as VerificationPosture,
      subject: parsedSubject,
      fence: parsedFence,
      requiredClasses: Object.freeze(required as string[]),
      observations: Object.freeze(normalizedObservations),
      noOp: item.noOp as boolean,
      readyForDelivery: item.readyForDelivery as boolean,
      deliveryOperations: Object.freeze([]) as readonly [],
      acceptanceGranted: false,
      landingGranted: false,
    });
  }
  return Object.freeze({
    version: VERIFICATION_CONTRACT_VERSION,
    requests: Object.freeze(requests),
    observations: Object.freeze(observations),
    failures: Object.freeze(failures),
    invocations: Object.freeze(invocations),
    finalization,
  });
}

export function createScriptedVerificationFixture(
  authorizer: VerificationAuthorizer,
  initialSnapshot?: VerificationSnapshot,
): ScriptedVerificationFixture {
  const requests: VerificationRequest[] = [];
  const observations: VerificationObservation[] = [];
  const failures: VerificationFailureRecord[] = [];
  const invocations: VerificationInvocation[] = [];
  let finalization: FinalizationVerificationState | null = initialSnapshot?.finalization ?? null;
  if (initialSnapshot) {
    requests.push(...initialSnapshot.requests);
    observations.push(...initialSnapshot.observations);
    failures.push(...initialSnapshot.failures);
    invocations.push(...initialSnapshot.invocations);
  }

  const dispatch = (input: unknown): VerificationResult<VerificationObservation> => {
    const hasFault = plain(input) && Object.hasOwn(input, 'fault');
    const raw = fields(input, hasFault ? ['request', 'attestation', 'fault'] : ['request', 'attestation']);
    if (!raw || (raw.fault !== undefined && raw.fault !== 'lost-response' && raw.fault !== 'timeout'))
      return fail('FC-INPUT', 'INVALID_DISPATCH');
    const request = validateRequest(raw.request);
    if (!request || request.policy.posture === 'none') return fail('FC-INPUT', 'VERIFICATION_NOT_DISPATCHABLE');
    if (
      request.lifecycle !== 'Finalizing' ||
      !finalization ||
      finalization.state !== 'Finalizing' ||
      !sameSubject(finalization.subject, request.subject) ||
      !same(finalization.fence, request.fence)
    )
      return fail('FC-AUTHORITY', 'INVALID_FINALIZATION_STATE');
    if (request.retryOrdinal > request.bounds.retryLimit) return fail('FC-BOUND', 'RETRY_EXHAUSTED');
    const predecessor = request.predecessor
      ? requests.find((entry) => entry.operation === request.predecessor)
      : undefined;
    if (
      (request.retryOrdinal === 1 && request.predecessor !== null) ||
      (request.retryOrdinal > 1 &&
        (!predecessor ||
          predecessor.retryOrdinal + 1 !== request.retryOrdinal ||
          !sameSubject(predecessor.subject, request.subject) ||
          !same(predecessor.fence, request.fence) ||
          !failures.some((entry) => entry.operation === predecessor.operation && entry.supersededBy === null))) ||
      (request.retryOrdinal > 1 && !predecessor)
    )
      return fail('FC-ORDERING', 'REPLACEMENT_LINEAGE_REQUIRED');
    const predecessorFailure = predecessor
      ? failures.findIndex((entry) => entry.operation === predecessor.operation && entry.supersededBy === null)
      : -1;
    if (request.retryOrdinal > 1 && predecessorFailure < 0) return fail('FC-ORDERING', 'REPLACEMENT_LINEAGE_REQUIRED');
    const existing = requests.find((entry) => entry.operation === request.operation);
    if (existing && !sameRequest(existing, request)) return fail('FC-SUBJECT', 'OPERATION_SUBJECT_MISMATCH');
    if (existing && invocations.some((entry) => entry.operation === request.operation))
      return fail('FC-EFFECT', 'DUPLICATE_OPERATION');
    const priorFailure = predecessorFailure >= 0 ? failures[predecessorFailure] : undefined;
    if (predecessorFailure >= 0)
      failures[predecessorFailure] = Object.freeze({
        ...failures[predecessorFailure],
        supersededBy: request.operation,
      });
    const restorePriorFailure = (): void => {
      if (predecessorFailure >= 0 && priorFailure) failures[predecessorFailure] = priorFailure;
    };
    let permit: unknown;
    try {
      permit = authorizer.recordDispatch({ operation: request.operation, ordinal: 1 });
    } catch {
      restorePriorFailure();
      return fail('FC-AUTHORITY', 'DISPATCH_PERMIT_UNAVAILABLE');
    }
    const permitResult = fields(permit, ['ok', 'value']);
    if (permitResult?.ok !== true || !validatePermit(permitResult.value, request)) {
      restorePriorFailure();
      return fail('FC-AUTHORITY', 'INVALID_DISPATCH_PERMIT');
    }
    const reason = raw.fault as 'lost-response' | 'timeout' | undefined;
    if (reason) {
      if (!existing) requests.push(request);
      const record = Object.freeze({
        schema: VERIFICATION_FAILURE_SCHEMA,
        version: VERIFICATION_CONTRACT_VERSION,
        kind: 'failure' as const,
        operation: request.operation,
        retryOrdinal: request.retryOrdinal,
        reason,
        family: 'FC-MECHANISM' as const,
        code: reason === 'timeout' ? ('MECHANISM_TIMEOUT' as const) : ('RESULT_UNCERTAIN' as const),
        subject: request.subject,
        fence: request.fence,
        supersededBy: null,
      });
      failures.push(record);
      invocations.push(
        Object.freeze({
          operation: request.operation,
          checkClass: request.checkClass as string,
          retryOrdinal: request.retryOrdinal,
          result: reason,
          effect: 'observation',
        }),
      );
      return fail('FC-MECHANISM', record.code);
    }
    const checked = observation(raw.attestation, request);
    if (!checked) {
      restorePriorFailure();
      return fail('FC-MECHANISM', 'INVALID_ATTESTATION');
    }
    const earlier = observations.find((entry) => entry.checkClass === checked.checkClass);
    if (earlier) {
      restorePriorFailure();
      return fail('FC-ORDERING', 'CHECK_CLASS_ALREADY_OBSERVED');
    }
    if (!existing) requests.push(request);
    observations.push(checked);
    invocations.push(
      Object.freeze({
        operation: request.operation,
        checkClass: request.checkClass as string,
        retryOrdinal: request.retryOrdinal,
        result: 'returned',
        effect: 'observation',
      }),
    );
    return ok(checked);
  };

  const enterFinalizing = (input: unknown): VerificationResult<FinalizationVerificationState> => {
    const raw = fields(input, ['origin', 'request']);
    if (!raw || (raw.origin !== 'Waiting' && raw.origin !== 'Accepted'))
      return fail('FC-INPUT', 'INVALID_FINALIZATION_ENTRY');
    const request = validateRequest(raw.request);
    if (!request || (request.lifecycle !== raw.origin && request.lifecycle !== 'Finalizing'))
      return fail('FC-AUTHORITY', 'INVALID_FINALIZATION_ENTRY');
    const existing = requests.find((entry) => entry.operation === request.operation);
    if (existing && !sameRequest(existing, request)) return fail('FC-SUBJECT', 'OPERATION_SUBJECT_MISMATCH');
    if (!existing) requests.push(request);
    finalization = finalizationState(raw.origin, request);
    return ok(finalization);
  };

  const consume = (input: unknown): VerificationResult<FinalizationVerificationState> => {
    const raw = fields(input, ['observation']);
    if (!raw || !finalization || finalization.state !== 'Finalizing')
      return fail('FC-AUTHORITY', 'FINALIZATION_NOT_ACTIVE');
    const observationOperation = plain(raw.observation)
      ? Object.getOwnPropertyDescriptor(raw.observation, 'operation')?.value
      : undefined;
    const candidate = observations.find((entry) => entry.operation === observationOperation);
    if (
      !candidate ||
      !sameSubject(candidate.subject, finalization.subject) ||
      !same(candidate.fence, finalization.fence)
    )
      return fail('FC-SUBJECT', 'OBSERVATION_SUBJECT_MISMATCH');
    if (finalization.observations.some((entry) => entry.operation === candidate.operation))
      return fail('FC-ORDERING', 'CHECK_CLASS_ALREADY_OBSERVED');
    if (candidate.outcome === 'fail') {
      finalization = Object.freeze({
        ...finalization,
        state: 'Reworking',
        readyForDelivery: false,
        observations: Object.freeze([...finalization.observations, candidate]),
      });
      return ok(finalization);
    }
    const merged = [...finalization.observations, candidate];
    const classes = new Set(merged.map((entry) => entry.checkClass));
    finalization = Object.freeze({
      ...finalization,
      observations: Object.freeze(merged),
      readyForDelivery:
        finalization.posture === 'none' || finalization.requiredClasses.every((entry) => classes.has(entry)),
    });
    return ok(finalization);
  };

  const snapshot = (): VerificationSnapshot =>
    Object.freeze({
      version: VERIFICATION_CONTRACT_VERSION,
      requests: Object.freeze([...requests]),
      observations: Object.freeze([...observations]),
      failures: Object.freeze([...failures]),
      invocations: Object.freeze([...invocations]),
      finalization,
    });
  return Object.freeze({
    dispatch,
    enterFinalizing,
    consume,
    snapshot,
    invocations: () => Object.freeze([...invocations]),
    failures: () => Object.freeze([...failures]),
    reachability: () =>
      Object.freeze({
        status: 'unavailable' as const,
        providerEnabled: false as const,
        configurationEnabled: false as const,
        externalEffects: false as const,
      }),
  });
}

export function validateVerificationRequest(value: unknown): VerificationResult<VerificationRequest> {
  const parsed = validateRequest(value);
  return parsed ? ok(parsed) : fail('FC-INPUT', 'INVALID_VERIFICATION_REQUEST');
}

export function validateVerificationObservation(
  value: unknown,
  request: VerificationRequest,
): VerificationResult<VerificationObservation> {
  const parsed = observation(value, request);
  return parsed ? ok(parsed) : fail('FC-EVIDENCE', 'INVALID_CHECK_OBSERVATION');
}

export function restoreScriptedVerificationFixture(
  value: unknown,
  authorizer: VerificationAuthorizer,
): VerificationResult<ScriptedVerificationFixture> {
  const parsed = parseSnapshot(value);
  return parsed
    ? ok(createScriptedVerificationFixture(authorizer, parsed))
    : fail('FC-TRUST', 'INVALID_VERIFICATION_SNAPSHOT');
}
