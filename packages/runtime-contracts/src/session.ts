import { type CanonicalJson, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';

export const SESSION_CONTRACT_VERSION = 'jig.session-contract.v1';
export const SESSION_BINDING_SCHEMA = 'jig.cb-session.v1';
export const SESSION_SNAPSHOT_SCHEMA = 'jig.sch-session-snapshot.v1';
export const SESSION_MECHANISM = 'scripted-session.v1';
export const SESSION_SILENCE = Object.freeze({
  token: 'session_silence',
  defaultMs: 5 * 60 * 1000,
  minimumMs: 10 * 1000,
  maximumMs: 30 * 60 * 1000,
});

export const SESSION_OPERATION_TYPES = Object.freeze([
  'OPC-SESSION-OPEN',
  'OPC-SESSION-RESPOND',
  'OPC-SESSION-ASSIGN',
  'OPC-SESSION-COLLECT',
  'OPC-SESSION-CLOSE',
] as const);

export type SessionOperationType = (typeof SESSION_OPERATION_TYPES)[number];
export type SessionFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-AUTHORITY'
  | 'FC-ORDERING'
  | 'FC-EFFECT'
  | 'FC-MECHANISM'
  | 'FC-LIVENESS'
  | 'FC-BOUND'
  | 'FC-TRUST';
export type SessionFailure = Readonly<{ family: SessionFailureFamily; code: string }>;
export type SessionResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: SessionFailure }>;

export type SessionResponseBinding = Readonly<{
  request: string;
  originatingPrincipal: string;
  originatingSession: string;
  assignmentOrdinal: number;
  answerDigest: string;
  lineage: string | null;
}>;

export type SessionBinding = Readonly<{
  schema: typeof SESSION_BINDING_SCHEMA;
  run: string;
  story: string;
  role: string;
  principal: string;
  session: string;
  sessionOrdinal: number;
  assignmentOrdinal: number;
  assignmentBasis: string;
  inputDigest: string;
  generation: string;
  manifest: string;
  posture: string;
  response: SessionResponseBinding | null;
  digest: string;
}>;

export type SessionLifecycleState = 'open' | 'bound' | 'active' | 'terminal';
export type SessionTerminalCause = 'replaced' | 'cancelled' | 'lost-attested' | 'completed-close';
export type SessionLiveness = 'thinking' | 'stuck' | 'dead' | 'human input overdue';
export type SessionFactKind =
  | 'open'
  | 'bind'
  | 'assignment-acknowledged'
  | 'reconnect'
  | 'replacement'
  | 'collect'
  | 'human-needed'
  | 'response'
  | 'loss'
  | 'cancel-and-reissue'
  | 'close'
  | 'heartbeat';

export type SessionFact = Readonly<{
  event: string;
  type: 'EV-SESSION-FACT';
  kind: SessionFactKind;
  operation: string | null;
  session: string;
  principal: string;
  assignmentOrdinal: number;
  bindingDigest: string;
  predecessor: string | null;
  request: string | null;
  observedAt: number | null;
  attestationDigest: string | null;
}>;

export type SessionFault = Readonly<{
  event: string;
  type: 'EV-SESSION-FAULT';
  family: SessionFailureFamily;
  code: string;
  operation: string | null;
  session: string;
  principal: string;
  assignmentOrdinal: number;
  bindingDigest: string;
}>;

export type LivenessFact = Readonly<{
  event: string;
  type: 'SCH-LIVENESS';
  session: string;
  principal: string;
  assignmentOrdinal: number;
  observedAt: number;
  lastQualifyingProgress: number;
  silenceMs: number;
  classification: SessionLiveness;
  bound: typeof SESSION_SILENCE.token;
  bindingDigest: string;
}>;

export type SessionRecord = Readonly<{
  binding: SessionBinding;
  state: SessionLifecycleState;
  terminalCause: SessionTerminalCause | null;
  predecessor: string | null;
  successor: string | null;
  assigned: boolean;
  collected: boolean;
  pendingRequest: string | null;
  liveness: SessionLiveness;
  lastHeartbeatAt: number;
  lastQualifyingProgress: number;
  facts: readonly SessionFact[];
  faults: readonly SessionFault[];
  livenessFacts: readonly LivenessFact[];
  uncertainOperations: readonly string[];
}>;

export type SessionSnapshot = Readonly<{
  schema: typeof SESSION_SNAPSHOT_SCHEMA;
  nextSessionOrdinal: number;
  nextEventOrdinal: number;
  usedOperations: readonly string[];
  sessions: readonly SessionRecord[];
}>;

export type SessionLossAttestation = Readonly<{
  mechanism: typeof SESSION_MECHANISM;
  bindingDigest: string;
  session: string;
  principal: string;
  assignmentOrdinal: number;
  manifest: string;
  posture: string;
  observedAt: number;
  digest: string;
}>;

type SessionOperation = Readonly<{
  operation: string;
  type: SessionOperationType;
  binding: SessionBinding;
  requestDigest: string;
  predecessor: string | null;
}>;

type SessionAttestation = Readonly<{
  operation: string;
  type: SessionOperationType;
  bindingDigest: string;
  session: string;
  principal: string;
  assignmentOrdinal: number;
  manifest: string;
  posture: string;
  observation: 'accepted' | 'human-needed';
  request: string | null;
  digest: string;
}>;

type ScriptedScenario = Readonly<{
  nativeDecision?: 'allowed' | 'rejected' | 'human-needed';
  humanRequest?: string;
  faults?: Readonly<Partial<Record<SessionOperationType, 'lost-response' | 'crash'>>>;
}>;

type ScriptedFixtureEvidence = Readonly<{
  providerEnabled: false;
  dispatchEnabled: false;
  mechanism: typeof SESSION_MECHANISM;
  internalDecisions: readonly ('allowed' | 'rejected' | 'human-needed')[];
  invocations: readonly Readonly<{
    operation: string;
    type: SessionOperationType;
    result: 'returned' | 'lost-response';
  }>[];
}>;

export type SessionController = Readonly<{
  open(input: Readonly<{ operation: string; binding: unknown; requestDigest: string }>): SessionResult<SessionRecord>;
  bind(input: Readonly<{ session: string; binding: unknown }>): SessionResult<SessionRecord>;
  assign(input: Readonly<{ operation: string; binding: unknown; requestDigest: string }>): SessionResult<SessionRecord>;
  collect(
    input: Readonly<{ operation: string; binding: unknown; requestDigest: string }>,
  ): SessionResult<Readonly<{ record: SessionRecord; request: string | null }>>;
  respond(
    input: Readonly<{ operation: string; binding: unknown; requestDigest: string }>,
  ): SessionResult<SessionRecord>;
  close(input: Readonly<{ operation: string; binding: unknown; requestDigest: string }>): SessionResult<SessionRecord>;
  reconnect(input: Readonly<{ session: string; binding: unknown; observedAt: number }>): SessionResult<SessionRecord>;
  attestLoss(
    input: Readonly<{ session: string; binding: unknown; observedAt: number; attestation: unknown }>,
  ): SessionResult<SessionRecord>;
  cancelAndReissue(input: Readonly<{ session: string; binding: unknown }>): SessionResult<SessionRecord>;
  replace(
    input: Readonly<{ operation: string; predecessor: string; binding: unknown; requestDigest: string }>,
  ): SessionResult<SessionRecord>;
  observeLiveness(
    input: Readonly<{ session: string; binding: unknown; observedAt: number }>,
  ): SessionResult<LivenessFact>;
  classifySilence(
    input: Readonly<{ session: string; binding: unknown; observedAt: number; silenceMs?: number }>,
  ): SessionResult<LivenessFact>;
  session(session: unknown): SessionResult<SessionRecord>;
  facts(): readonly (SessionFact | SessionFault | LivenessFact)[];
  snapshot(): SessionSnapshot;
  fixtureEvidence(): ScriptedFixtureEvidence;
}>;

const DIGEST = /^[0-9a-f]{64}$/u;
const TEXT = /^[a-z0-9](?:[a-z0-9-]{0,63})$/u;
const MANIFEST = /^provider\/[0-9a-f]{64}\/authority\/[0-9a-f]{64}$/u;
const SCRIPTED_MANIFEST =
  'provider/53568c156d6ee898dc1ba32897d22f8abf47afa4bad86d35ffc6bcd7ce9067df/authority/53568c156d6ee898dc1ba32897d22f8abf47afa4bad86d35ffc6bcd7ce9067df';
const SESSION_BINDING_FIELDS = [
  'schema',
  'run',
  'story',
  'role',
  'principal',
  'session',
  'sessionOrdinal',
  'assignmentOrdinal',
  'assignmentBasis',
  'inputDigest',
  'generation',
  'manifest',
  'posture',
  'response',
] as const;

const ok = <T>(value: T): SessionResult<T> => Object.freeze({ ok: true, value: deepFreeze(value) });
const fail = <T = never>(family: SessionFailureFamily, code: string): SessionResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function ownFields(value: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  try {
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.keys(descriptors).sort().join(',') !== [...names].sort().join(',')) return undefined;
    if (!Object.values(descriptors).every((descriptor) => 'value' in descriptor)) return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name]?.value]));
  } catch {
    return undefined;
  }
}

function validDigest(value: unknown): value is string {
  return typeof value === 'string' && DIGEST.test(value);
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && TEXT.test(value) && value.normalize('NFC') === value;
}

function validTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function same(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function bindingDigest(value: Omit<SessionBinding, 'digest'>): string | undefined {
  const staged = stageDigest({
    domain: 'SESSION-BINDING',
    excludePaths: [],
    value: value as unknown as CanonicalJson,
  });
  return staged.ok ? staged.value.digest : undefined;
}

function validResponse(value: unknown): SessionResponseBinding | null | undefined {
  if (value === null) return null;
  const raw = ownFields(value, [
    'request',
    'originatingPrincipal',
    'originatingSession',
    'assignmentOrdinal',
    'answerDigest',
    'lineage',
  ]);
  if (
    !raw ||
    typeof raw.request !== 'string' ||
    !parseIdentity('ID-PARK', raw.request).ok ||
    typeof raw.originatingPrincipal !== 'string' ||
    !parseIdentity('ID-PRINCIPAL', raw.originatingPrincipal).ok ||
    typeof raw.originatingSession !== 'string' ||
    !parseIdentity('ID-SESSION', raw.originatingSession).ok ||
    !Number.isSafeInteger(raw.assignmentOrdinal) ||
    (raw.assignmentOrdinal as number) < 1 ||
    !validDigest(raw.answerDigest) ||
    (raw.lineage !== null && (typeof raw.lineage !== 'string' || !parseIdentity('ID-SESSION', raw.lineage).ok))
  )
    return undefined;
  return deepFreeze({
    request: raw.request,
    originatingPrincipal: raw.originatingPrincipal,
    originatingSession: raw.originatingSession,
    assignmentOrdinal: raw.assignmentOrdinal,
    answerDigest: raw.answerDigest,
    lineage: raw.lineage,
  } as SessionResponseBinding);
}

export function createSessionBinding(input: unknown): SessionResult<SessionBinding> {
  const raw = ownFields(input, [
    'schema',
    'run',
    'story',
    'role',
    'principal',
    'session',
    'sessionOrdinal',
    'assignmentOrdinal',
    'assignmentBasis',
    'inputDigest',
    'generation',
    'manifest',
    'posture',
    'response',
  ]);
  const response = raw ? validResponse(raw.response) : undefined;
  if (
    !raw ||
    raw.schema !== SESSION_BINDING_SCHEMA ||
    typeof raw.run !== 'string' ||
    !parseIdentity('ID-RUN', raw.run).ok ||
    typeof raw.story !== 'string' ||
    !parseIdentity('ID-STORY', raw.story).ok ||
    !raw.story.startsWith(`${raw.run}/story/`) ||
    !validText(raw.role) ||
    typeof raw.principal !== 'string' ||
    !parseIdentity('ID-PRINCIPAL', raw.principal).ok ||
    typeof raw.session !== 'string' ||
    !parseIdentity('ID-SESSION', raw.session).ok ||
    !raw.session.startsWith(`${raw.story}/session/${raw.role}/`) ||
    !Number.isSafeInteger(raw.sessionOrdinal) ||
    (raw.sessionOrdinal as number) < 1 ||
    !Number.isSafeInteger(raw.assignmentOrdinal) ||
    (raw.assignmentOrdinal as number) < 1 ||
    !validDigest(raw.assignmentBasis) ||
    !validDigest(raw.inputDigest) ||
    typeof raw.generation !== 'string' ||
    !parseIdentity('ID-GEN', raw.generation).ok ||
    typeof raw.manifest !== 'string' ||
    !parseIdentity('ID-MANIFEST', raw.manifest).ok ||
    !MANIFEST.test(raw.manifest) ||
    !validText(raw.posture) ||
    response === undefined
  )
    return fail('FC-INPUT', 'INVALID_SESSION_BINDING');
  if (
    response !== null &&
    (response.originatingPrincipal !== raw.principal || response.assignmentOrdinal !== raw.assignmentOrdinal)
  )
    return fail('FC-SUBJECT', 'INVALID_RESPONSE_LINEAGE');
  const unsigned = {
    schema: SESSION_BINDING_SCHEMA,
    run: raw.run,
    story: raw.story,
    role: raw.role,
    principal: raw.principal,
    session: raw.session,
    sessionOrdinal: raw.sessionOrdinal,
    assignmentOrdinal: raw.assignmentOrdinal,
    assignmentBasis: raw.assignmentBasis,
    inputDigest: raw.inputDigest,
    generation: raw.generation,
    manifest: raw.manifest,
    posture: raw.posture,
    response,
  } as Omit<SessionBinding, 'digest'>;
  const digest = bindingDigest(unsigned);
  return digest ? ok({ ...unsigned, digest }) : fail('FC-INPUT', 'INVALID_SESSION_BINDING');
}

function validateBinding(value: unknown): SessionResult<SessionBinding> {
  const raw = ownFields(value, [...SESSION_BINDING_FIELDS, 'digest']);
  if (!raw) return fail('FC-TRUST', 'SESSION_BINDING_DIGEST_MISMATCH');
  const unsigned = Object.fromEntries(SESSION_BINDING_FIELDS.map((field) => [field, raw[field]]));
  const result = createSessionBinding(unsigned);
  if (!result.ok) return result;
  if (!raw || raw.digest !== result.value.digest) return fail('FC-TRUST', 'SESSION_BINDING_DIGEST_MISMATCH');
  return result;
}

function expectedSessionId(story: string, role: string, ordinal: number): string {
  return `${story}/session/${role}/${ordinal}`;
}

function validOperation(value: unknown): value is string {
  return typeof value === 'string' && parseIdentity('ID-OP', value).ok;
}

function eventId(run: string, ordinal: number): string {
  return `${run}/event/${ordinal}`;
}

function operationInput(input: unknown, type: SessionOperationType): SessionResult<SessionOperation> {
  const raw = ownFields(input, ['operation', 'binding', 'requestDigest']);
  if (!raw || !validOperation(raw.operation) || !validDigest(raw.requestDigest))
    return fail('FC-INPUT', 'INVALID_SESSION_OPERATION');
  const binding = validateBinding(raw.binding);
  if (!binding.ok) return binding;
  if (type === 'OPC-SESSION-RESPOND' && binding.value.response === null)
    return fail('FC-SUBJECT', 'RESPONSE_BINDING_REQUIRED');
  if (type !== 'OPC-SESSION-RESPOND' && binding.value.response !== null)
    return fail('FC-SUBJECT', 'UNEXPECTED_RESPONSE_BINDING');
  return ok({
    operation: raw.operation,
    type,
    binding: binding.value,
    requestDigest: raw.requestDigest,
    predecessor: null,
  });
}

function sameBinding(left: SessionBinding, right: SessionBinding): boolean {
  return left.digest === right.digest && same(left, right);
}

function sameSessionLineage(left: SessionBinding, right: SessionBinding): boolean {
  return (
    left.run === right.run &&
    left.story === right.story &&
    left.role === right.role &&
    left.principal === right.principal &&
    left.session === right.session &&
    left.sessionOrdinal === right.sessionOrdinal &&
    left.assignmentOrdinal === right.assignmentOrdinal &&
    left.assignmentBasis === right.assignmentBasis &&
    left.inputDigest === right.inputDigest &&
    left.generation === right.generation &&
    left.manifest === right.manifest &&
    left.posture === right.posture
  );
}

function cloneRecord(record: SessionRecord): SessionRecord {
  return deepFreeze({
    ...record,
    binding: record.binding,
    facts: [...record.facts],
    faults: [...record.faults],
    livenessFacts: [...record.livenessFacts],
    uncertainOperations: [...record.uncertainOperations],
  });
}

function fixtureAttestation(
  operation: SessionOperation,
  observation: SessionAttestation['observation'],
  request: string | null,
): SessionAttestation {
  const staged = stageDigest({
    domain: 'SESSION-ATTESTATION',
    excludePaths: ['digest'],
    value: {
      operation: operation.operation,
      type: operation.type,
      bindingDigest: operation.binding.digest,
      session: operation.binding.session,
      principal: operation.binding.principal,
      assignmentOrdinal: operation.binding.assignmentOrdinal,
      manifest: operation.binding.manifest,
      posture: operation.binding.posture,
      observation,
      request,
      digest: '',
    },
  });
  if (!staged.ok) throw new Error('attestation digest unavailable');
  return deepFreeze({
    operation: operation.operation,
    type: operation.type,
    bindingDigest: operation.binding.digest,
    session: operation.binding.session,
    principal: operation.binding.principal,
    assignmentOrdinal: operation.binding.assignmentOrdinal,
    manifest: operation.binding.manifest,
    posture: operation.binding.posture,
    observation,
    request,
    digest: staged.value.digest,
  });
}

function validateAttestation(value: unknown, operation: SessionOperation): SessionResult<SessionAttestation> {
  const raw = ownFields(value, [
    'operation',
    'type',
    'bindingDigest',
    'session',
    'principal',
    'assignmentOrdinal',
    'manifest',
    'posture',
    'observation',
    'request',
    'digest',
  ]);
  if (
    !raw ||
    raw.operation !== operation.operation ||
    raw.type !== operation.type ||
    raw.bindingDigest !== operation.binding.digest ||
    raw.session !== operation.binding.session ||
    raw.principal !== operation.binding.principal ||
    raw.assignmentOrdinal !== operation.binding.assignmentOrdinal ||
    raw.manifest !== operation.binding.manifest ||
    raw.posture !== operation.binding.posture ||
    (raw.observation !== 'accepted' && raw.observation !== 'human-needed') ||
    (raw.request !== null && (typeof raw.request !== 'string' || !parseIdentity('ID-PARK', raw.request).ok)) ||
    !validDigest(raw.digest)
  )
    return fail('FC-MECHANISM', 'INVALID_SESSION_ATTESTATION');
  const expected = fixtureAttestation(operation, raw.observation, raw.request);
  return expected.digest === raw.digest ? ok(expected) : fail('FC-MECHANISM', 'INVALID_SESSION_ATTESTATION');
}

function lossAttestation(binding: SessionBinding, observedAt: number): SessionLossAttestation {
  const staged = stageDigest({
    domain: 'SESSION-LOSS-ATTESTATION',
    excludePaths: ['digest'],
    value: {
      mechanism: SESSION_MECHANISM,
      bindingDigest: binding.digest,
      session: binding.session,
      principal: binding.principal,
      assignmentOrdinal: binding.assignmentOrdinal,
      manifest: binding.manifest,
      posture: binding.posture,
      observedAt,
      digest: '',
    },
  });
  if (!staged.ok) throw new Error('loss attestation digest unavailable');
  return deepFreeze({
    mechanism: SESSION_MECHANISM,
    bindingDigest: binding.digest,
    session: binding.session,
    principal: binding.principal,
    assignmentOrdinal: binding.assignmentOrdinal,
    manifest: binding.manifest,
    posture: binding.posture,
    observedAt,
    digest: staged.value.digest,
  });
}

function validateLossAttestation(
  value: unknown,
  binding: SessionBinding,
  observedAt: number,
): SessionResult<SessionLossAttestation> {
  const raw = ownFields(value, [
    'mechanism',
    'bindingDigest',
    'session',
    'principal',
    'assignmentOrdinal',
    'manifest',
    'posture',
    'observedAt',
    'digest',
  ]);
  if (
    !raw ||
    raw.mechanism !== SESSION_MECHANISM ||
    raw.bindingDigest !== binding.digest ||
    raw.session !== binding.session ||
    raw.principal !== binding.principal ||
    raw.assignmentOrdinal !== binding.assignmentOrdinal ||
    raw.manifest !== binding.manifest ||
    raw.posture !== binding.posture ||
    raw.observedAt !== observedAt ||
    !validDigest(raw.digest)
  )
    return fail('FC-MECHANISM', 'INVALID_LOSS_ATTESTATION');
  const expected = lossAttestation(binding, observedAt);
  return expected.digest === raw.digest ? ok(expected) : fail('FC-MECHANISM', 'INVALID_LOSS_ATTESTATION');
}

function createFixture(scenario: ScriptedScenario = {}) {
  const nativeDecision = scenario.nativeDecision ?? 'allowed';
  const request = scenario.humanRequest ?? `${'run-000000000001-0123456789abcdef'}/park/1`;
  const invocations: Array<{ operation: string; type: SessionOperationType; result: 'returned' | 'lost-response' }> =
    [];
  const decisions: Array<'allowed' | 'rejected' | 'human-needed'> = [];
  const dispatched = new Set<string>();
  const dispatch = (operation: SessionOperation): SessionResult<SessionAttestation> => {
    const fault = scenario.faults?.[operation.type];
    const key = `${operation.operation}\0${operation.type}`;
    if (dispatched.has(key)) return fail('FC-EFFECT', 'DUPLICATE_SESSION_DISPATCH');
    dispatched.add(key);
    if (fault === 'crash' || fault === 'lost-response') {
      invocations.push(
        Object.freeze({ operation: operation.operation, type: operation.type, result: 'lost-response' }),
      );
      return fail('FC-EFFECT', fault === 'crash' ? 'SESSION_CRASH_UNCERTAIN' : 'SESSION_RESULT_UNCERTAIN');
    }
    const decision = operation.type === 'OPC-SESSION-COLLECT' ? nativeDecision : 'allowed';
    decisions.push(decision);
    const human = decision === 'human-needed' && operation.type === 'OPC-SESSION-COLLECT';
    const attestation = fixtureAttestation(operation, human ? 'human-needed' : 'accepted', human ? request : null);
    invocations.push(Object.freeze({ operation: operation.operation, type: operation.type, result: 'returned' }));
    return ok(attestation);
  };
  const evidence = (): ScriptedFixtureEvidence =>
    deepFreeze({
      providerEnabled: false,
      dispatchEnabled: false,
      mechanism: SESSION_MECHANISM,
      internalDecisions: [...decisions],
      invocations: [...invocations],
    });
  return { dispatch, evidence };
}

function createController(fixture: ReturnType<typeof createFixture>, snapshot?: SessionSnapshot): SessionController {
  const sessions = new Map<string, SessionRecord>();
  const usedOperations = new Set<string>();
  let nextSessionOrdinal = snapshot?.nextSessionOrdinal ?? 1;
  let nextEventOrdinal = snapshot?.nextEventOrdinal ?? 1;
  if (snapshot) {
    for (const operation of snapshot.usedOperations) usedOperations.add(operation);
    for (const record of snapshot.sessions) sessions.set(record.binding.session, cloneRecord(record));
  }

  const appendFact = (
    record: SessionRecord,
    kind: SessionFactKind,
    operation: string | null,
    request: string | null,
    predecessor: string | null,
    observedAt: number | null = null,
    attestationDigest: string | null = null,
  ): SessionRecord => {
    const fact = deepFreeze({
      event: eventId(record.binding.run, nextEventOrdinal++),
      type: 'EV-SESSION-FACT' as const,
      kind,
      operation,
      session: record.binding.session,
      principal: record.binding.principal,
      assignmentOrdinal: record.binding.assignmentOrdinal,
      bindingDigest: record.binding.digest,
      predecessor,
      request,
      observedAt,
      attestationDigest,
    });
    return cloneRecord({ ...record, facts: [...record.facts, fact] });
  };
  const appendFault = (record: SessionRecord, error: SessionFailure, operation: string | null): SessionRecord => {
    const fault = deepFreeze({
      event: eventId(record.binding.run, nextEventOrdinal++),
      type: 'EV-SESSION-FAULT' as const,
      family: error.family,
      code: error.code,
      operation,
      session: record.binding.session,
      principal: record.binding.principal,
      assignmentOrdinal: record.binding.assignmentOrdinal,
      bindingDigest: record.binding.digest,
    });
    return cloneRecord({ ...record, faults: [...record.faults, fault] });
  };
  const save = (record: SessionRecord): SessionRecord => {
    const frozen = cloneRecord(record);
    sessions.set(frozen.binding.session, frozen);
    return frozen;
  };
  const lookup = (session: unknown): SessionResult<SessionRecord> => {
    if (typeof session !== 'string' || !parseIdentity('ID-SESSION', session).ok)
      return fail('FC-INPUT', 'INVALID_SESSION_ID');
    const record = sessions.get(session);
    return record ? ok(record) : fail('FC-SUBJECT', 'SESSION_NOT_FOUND');
  };
  const checkOperation = (
    input: unknown,
    type: SessionOperationType,
  ): SessionResult<{ operation: SessionOperation; record: SessionRecord }> => {
    const parsed = operationInput(input, type);
    if (!parsed.ok) return parsed;
    const record = sessions.get(parsed.value.binding.session);
    if (!record) return fail('FC-SUBJECT', 'SESSION_NOT_FOUND');
    if (
      type === 'OPC-SESSION-RESPOND'
        ? !sameSessionLineage(record.binding, parsed.value.binding)
        : !sameBinding(record.binding, parsed.value.binding)
    )
      return fail('FC-FENCE', 'SESSION_BINDING_STALE');
    if (record.state === 'terminal') return fail('FC-FENCE', 'SESSION_TERMINAL');
    if (record.liveness === 'dead') return fail('FC-LIVENESS', 'SESSION_SILENCE_FENCED');
    if (record.uncertainOperations.includes(parsed.value.operation))
      return fail('FC-EFFECT', 'UNCERTAIN_OPERATION_PARKED');
    if (usedOperations.has(parsed.value.operation)) return fail('FC-EFFECT', 'OPERATION_ALREADY_USED');
    usedOperations.add(parsed.value.operation);
    return ok({ operation: parsed.value, record });
  };
  const failedOperation = (
    record: SessionRecord,
    result: SessionResult<never>,
    operation: string | null,
  ): SessionResult<never> => {
    const next = save(
      appendFault(record, result.ok ? { family: 'FC-TRUST', code: 'UNEXPECTED_SUCCESS' } : result.error, operation),
    );
    if (!result.ok && (result.error.family === 'FC-EFFECT' || result.error.family === 'FC-MECHANISM')) {
      save(
        cloneRecord({
          ...next,
          uncertainOperations: operation ? [...next.uncertainOperations, operation] : next.uncertainOperations,
        }),
      );
    }
    return result;
  };

  const open = (
    input: Readonly<{ operation: string; binding: unknown; requestDigest: string }>,
  ): SessionResult<SessionRecord> => {
    const parsed = operationInput(input, 'OPC-SESSION-OPEN');
    if (!parsed.ok) return parsed;
    const binding = parsed.value.binding;
    if (binding.session !== expectedSessionId(binding.story, binding.role, binding.sessionOrdinal))
      return fail('FC-FENCE', 'SESSION_ORDINAL_MISMATCH');
    if (
      binding.sessionOrdinal !== nextSessionOrdinal ||
      [...sessions.values()].some((record) => record.binding.session === binding.session)
    )
      return fail('FC-FENCE', 'SESSION_ORDINAL_REUSED');
    nextSessionOrdinal += 1;
    const attestation = fixture.dispatch(parsed.value);
    const initial: SessionRecord = deepFreeze({
      binding,
      state: 'open',
      terminalCause: null,
      predecessor: null,
      successor: null,
      assigned: false,
      collected: false,
      pendingRequest: null,
      liveness: 'thinking',
      lastHeartbeatAt: 0,
      lastQualifyingProgress: 0,
      facts: [],
      faults: [],
      livenessFacts: [],
      uncertainOperations: [],
    });
    if (!attestation.ok) return failedOperation(initial, attestation, parsed.value.operation);
    const checked = validateAttestation(attestation.value, parsed.value);
    if (!checked.ok) return failedOperation(initial, checked, parsed.value.operation);
    usedOperations.add(parsed.value.operation);
    return ok(save(appendFact(initial, 'open', parsed.value.operation, null, null)));
  };

  const bind = (input: Readonly<{ session: string; binding: unknown }>): SessionResult<SessionRecord> => {
    const binding = validateBinding(input.binding);
    if (!binding.ok) return binding;
    if (binding.value.session !== input.session) return fail('FC-SUBJECT', 'SESSION_SUBJECT_MISMATCH');
    const record = sessions.get(input.session);
    if (!record) return fail('FC-SUBJECT', 'SESSION_NOT_FOUND');
    if (!sameBinding(record.binding, binding.value)) return fail('FC-FENCE', 'SESSION_BINDING_STALE');
    if (record.state !== 'open') return fail('FC-ORDERING', 'SESSION_BIND_REQUIRES_OPEN');
    return ok(save(appendFact({ ...record, state: 'bound' }, 'bind', null, null, null)));
  };

  const assign = (
    input: Readonly<{ operation: string; binding: unknown; requestDigest: string }>,
  ): SessionResult<SessionRecord> => {
    const checked = checkOperation(input, 'OPC-SESSION-ASSIGN');
    if (!checked.ok) return checked;
    const { operation, record } = checked.value;
    if (record.state !== 'bound')
      return failedOperation(record, fail('FC-ORDERING', 'ASSIGN_REQUIRES_BOUND'), operation.operation);
    const attestation = fixture.dispatch(operation);
    if (!attestation.ok) return failedOperation(record, attestation, operation.operation);
    const validated = validateAttestation(attestation.value, operation);
    if (!validated.ok) return failedOperation(record, validated, operation.operation);
    return ok(
      save(
        appendFact(
          { ...record, state: 'active', assigned: true },
          'assignment-acknowledged',
          operation.operation,
          null,
          null,
        ),
      ),
    );
  };

  const collect = (
    input: Readonly<{ operation: string; binding: unknown; requestDigest: string }>,
  ): SessionResult<Readonly<{ record: SessionRecord; request: string | null }>> => {
    const checked = checkOperation(input, 'OPC-SESSION-COLLECT');
    if (!checked.ok) return checked;
    const { operation, record } = checked.value;
    if (record.state !== 'active' || !record.assigned)
      return failedOperation(record, fail('FC-ORDERING', 'COLLECT_REQUIRES_ACTIVE_ASSIGNMENT'), operation.operation);
    const attestation = fixture.dispatch(operation);
    if (!attestation.ok) return failedOperation(record, attestation, operation.operation);
    const validated = validateAttestation(attestation.value, operation);
    if (!validated.ok) return failedOperation(record, validated, operation.operation);
    const request = validated.value.observation === 'human-needed' ? validated.value.request : null;
    if (validated.value.observation === 'human-needed' && !request) {
      const next = save(
        appendFault(record, { family: 'FC-SUBJECT', code: 'HUMAN_REQUEST_LINEAGE_REQUIRED' }, operation.operation),
      );
      return fail('FC-SUBJECT', next.faults.at(-1)?.code ?? 'HUMAN_REQUEST_LINEAGE_REQUIRED');
    }
    const next = appendFact(
      { ...record, collected: request === null, pendingRequest: request },
      request ? 'human-needed' : 'collect',
      operation.operation,
      request,
      null,
    );
    return ok({ record: save(next), request });
  };

  const respond = (
    input: Readonly<{ operation: string; binding: unknown; requestDigest: string }>,
  ): SessionResult<SessionRecord> => {
    const checked = checkOperation(input, 'OPC-SESSION-RESPOND');
    if (!checked.ok) return checked;
    const { operation, record } = checked.value;
    const response = operation.binding.response;
    if (record.state !== 'active' || !response || record.pendingRequest !== response.request)
      return failedOperation(record, fail('FC-SUBJECT', 'RESPONSE_REQUEST_MISMATCH'), operation.operation);
    if (
      response.originatingPrincipal !== record.binding.principal ||
      response.assignmentOrdinal !== record.binding.assignmentOrdinal ||
      (response.originatingSession !== record.binding.session && response.originatingSession !== record.predecessor)
    )
      return failedOperation(record, fail('FC-SUBJECT', 'RESPONSE_PRINCIPAL_MISMATCH'), operation.operation);
    const attestation = fixture.dispatch(operation);
    if (!attestation.ok) return failedOperation(record, attestation, operation.operation);
    const validated = validateAttestation(attestation.value, operation);
    if (!validated.ok) return failedOperation(record, validated, operation.operation);
    return ok(
      save(
        appendFact(
          { ...record, pendingRequest: null, liveness: 'thinking' },
          'response',
          operation.operation,
          response.request,
          response.lineage,
        ),
      ),
    );
  };

  const close = (
    input: Readonly<{ operation: string; binding: unknown; requestDigest: string }>,
  ): SessionResult<SessionRecord> => {
    const checked = checkOperation(input, 'OPC-SESSION-CLOSE');
    if (!checked.ok) return checked;
    const { operation, record } = checked.value;
    if (record.uncertainOperations.length > 0)
      return failedOperation(record, fail('FC-EFFECT', 'UNCERTAIN_SESSION_EFFECT_RETIRED'), operation.operation);
    if (record.state !== 'active' || !record.assigned || !record.collected)
      return failedOperation(record, fail('FC-ORDERING', 'CLOSE_REQUIRES_COLLECTED_ACTIVE'), operation.operation);
    if (record.pendingRequest)
      return failedOperation(record, fail('FC-EFFECT', 'UNCERTAIN_SESSION_EFFECT_RETIRED'), operation.operation);
    const attestation = fixture.dispatch(operation);
    if (!attestation.ok) return failedOperation(record, attestation, operation.operation);
    const validated = validateAttestation(attestation.value, operation);
    if (!validated.ok) return failedOperation(record, validated, operation.operation);
    return ok(
      save(
        appendFact(
          { ...record, state: 'terminal', terminalCause: 'completed-close' },
          'close',
          operation.operation,
          null,
          null,
        ),
      ),
    );
  };

  const reconnect = (
    input: Readonly<{ session: string; binding: unknown; observedAt: number }>,
  ): SessionResult<SessionRecord> => {
    const binding = validateBinding(input.binding);
    if (!binding.ok) return binding;
    const record = sessions.get(input.session);
    if (!record || !sameBinding(record.binding, binding.value)) return fail('FC-FENCE', 'RECONNECT_BINDING_MISMATCH');
    if (record.state !== 'active' || !validTime(input.observedAt)) return fail('FC-FENCE', 'RECONNECT_REQUIRES_ACTIVE');
    return ok(
      save(
        appendFact(
          { ...record, lastHeartbeatAt: input.observedAt, liveness: 'thinking' },
          'reconnect',
          null,
          record.pendingRequest,
          null,
        ),
      ),
    );
  };

  const attestLoss = (
    input: Readonly<{ session: string; binding: unknown; observedAt: number; attestation: unknown }>,
  ): SessionResult<SessionRecord> => {
    const binding = validateBinding(input.binding);
    if (!binding.ok) return binding;
    const record = sessions.get(input.session);
    if (!record || !sameBinding(record.binding, binding.value)) return fail('FC-FENCE', 'LOSS_BINDING_MISMATCH');
    if (record.state !== 'active' || !validTime(input.observedAt)) return fail('FC-ORDERING', 'LOSS_REQUIRES_ACTIVE');
    const attestation = validateLossAttestation(input.attestation, binding.value, input.observedAt);
    if (!attestation.ok) return attestation;
    return ok(
      save(
        appendFact(
          { ...record, state: 'terminal', terminalCause: 'lost-attested', liveness: 'dead' },
          'loss',
          null,
          record.pendingRequest,
          null,
          input.observedAt,
          attestation.value.digest,
        ),
      ),
    );
  };

  const cancelAndReissue = (input: Readonly<{ session: string; binding: unknown }>): SessionResult<SessionRecord> => {
    const binding = validateBinding(input.binding);
    if (!binding.ok) return binding;
    const record = sessions.get(input.session);
    if (!record || !sameBinding(record.binding, binding.value)) return fail('FC-FENCE', 'CANCEL_BINDING_MISMATCH');
    if (record.state !== 'terminal' || record.terminalCause !== 'lost-attested' || !record.pendingRequest)
      return fail('FC-FENCE', 'CANCEL_REISSUE_REQUIRES_LOST_REQUEST');
    return ok(
      save(
        appendFact(
          { ...record, terminalCause: 'cancelled', pendingRequest: null },
          'cancel-and-reissue',
          null,
          record.pendingRequest,
          record.binding.session,
        ),
      ),
    );
  };

  const replace = (
    input: Readonly<{ operation: string; predecessor: string; binding: unknown; requestDigest: string }>,
  ): SessionResult<SessionRecord> => {
    const parsed = operationInput(
      { operation: input.operation, binding: input.binding, requestDigest: input.requestDigest },
      'OPC-SESSION-OPEN',
    );
    if (!parsed.ok) return parsed;
    const previous = sessions.get(input.predecessor);
    if (previous?.state !== 'terminal' || previous.terminalCause !== 'lost-attested')
      return fail('FC-FENCE', 'ATTESTED_LOSS_REQUIRED');
    const binding = parsed.value.binding;
    if (
      binding.principal !== previous.binding.principal ||
      binding.story !== previous.binding.story ||
      binding.role !== previous.binding.role ||
      binding.assignmentOrdinal !== previous.binding.assignmentOrdinal ||
      binding.assignmentBasis !== previous.binding.assignmentBasis ||
      binding.sessionOrdinal <= previous.binding.sessionOrdinal ||
      binding.session !== expectedSessionId(binding.story, binding.role, binding.sessionOrdinal) ||
      binding.response !== null
    )
      return fail('FC-SUBJECT', 'INVALID_REPLACEMENT_LINEAGE');
    const opened = open({ operation: input.operation, binding, requestDigest: input.requestDigest });
    if (!opened.ok) return opened;
    save(
      appendFact(
        { ...opened.value, predecessor: previous.binding.session, pendingRequest: previous.pendingRequest },
        'replacement',
        input.operation,
        previous.pendingRequest,
        previous.binding.session,
      ),
    );
    save({ ...previous, successor: binding.session });
    return lookup(binding.session);
  };

  const observeLiveness = (
    input: Readonly<{ session: string; binding: unknown; observedAt: number }>,
  ): SessionResult<LivenessFact> => {
    const binding = validateBinding(input.binding);
    if (!binding.ok) return binding;
    const record = sessions.get(input.session);
    if (!record || !sameBinding(record.binding, binding.value)) return fail('FC-FENCE', 'LIVENESS_BINDING_MISMATCH');
    if (record.state !== 'active' || !validTime(input.observedAt) || input.observedAt < record.lastHeartbeatAt)
      return fail('FC-FENCE', 'STALE_LIVENESS_OBSERVATION');
    const classification: SessionLiveness = record.pendingRequest ? 'human input overdue' : 'thinking';
    const fact = deepFreeze({
      event: eventId(record.binding.run, nextEventOrdinal++),
      type: 'SCH-LIVENESS' as const,
      session: record.binding.session,
      principal: record.binding.principal,
      assignmentOrdinal: record.binding.assignmentOrdinal,
      observedAt: input.observedAt,
      lastQualifyingProgress: record.lastQualifyingProgress,
      silenceMs: 0,
      classification,
      bound: SESSION_SILENCE.token,
      bindingDigest: record.binding.digest,
    });
    save({
      ...record,
      lastHeartbeatAt: input.observedAt,
      liveness: classification,
      livenessFacts: [...record.livenessFacts, fact],
    });
    return ok(fact);
  };

  const classifySilence = (
    input: Readonly<{ session: string; binding: unknown; observedAt: number; silenceMs?: number }>,
  ): SessionResult<LivenessFact> => {
    const binding = validateBinding(input.binding);
    if (!binding.ok) return binding;
    const record = sessions.get(input.session);
    const silenceMs = input.silenceMs ?? SESSION_SILENCE.defaultMs;
    if (!record || !sameBinding(record.binding, binding.value)) return fail('FC-FENCE', 'LIVENESS_BINDING_MISMATCH');
    if (
      record.state !== 'active' ||
      !validTime(input.observedAt) ||
      !Number.isSafeInteger(silenceMs) ||
      silenceMs < SESSION_SILENCE.minimumMs ||
      silenceMs > SESSION_SILENCE.maximumMs
    )
      return fail('FC-INPUT', 'INVALID_SILENCE_BOUND');
    const elapsed = input.observedAt - record.lastHeartbeatAt;
    const classification: SessionLiveness =
      elapsed >= silenceMs ? 'dead' : record.pendingRequest ? 'human input overdue' : 'thinking';
    const fact = deepFreeze({
      event: eventId(record.binding.run, nextEventOrdinal++),
      type: 'SCH-LIVENESS' as const,
      session: record.binding.session,
      principal: record.binding.principal,
      assignmentOrdinal: record.binding.assignmentOrdinal,
      observedAt: input.observedAt,
      lastQualifyingProgress: record.lastQualifyingProgress,
      silenceMs: elapsed,
      classification,
      bound: SESSION_SILENCE.token,
      bindingDigest: record.binding.digest,
    });
    save({ ...record, liveness: classification, livenessFacts: [...record.livenessFacts, fact] });
    return ok(fact);
  };

  const allFacts = (): readonly (SessionFact | SessionFault | LivenessFact)[] =>
    deepFreeze(
      [...sessions.values()]
        .flatMap((record) => [...record.facts, ...record.faults, ...record.livenessFacts])
        .sort((left, right) => left.event.localeCompare(right.event)),
    );
  const snapshotValue = (): SessionSnapshot =>
    deepFreeze({
      schema: SESSION_SNAPSHOT_SCHEMA,
      nextSessionOrdinal,
      nextEventOrdinal,
      usedOperations: [...usedOperations].sort(),
      sessions: [...sessions.values()],
    });

  return Object.freeze({
    open,
    bind,
    assign,
    collect,
    respond,
    close,
    reconnect,
    attestLoss,
    cancelAndReissue,
    replace,
    observeLiveness,
    classifySilence,
    session: lookup,
    facts: allFacts,
    snapshot: snapshotValue,
    fixtureEvidence: fixture.evidence,
  });
}

function validateSnapshot(value: unknown): SessionResult<SessionSnapshot> {
  const raw = ownFields(value, ['schema', 'nextSessionOrdinal', 'nextEventOrdinal', 'usedOperations', 'sessions']);
  if (
    !raw ||
    raw.schema !== SESSION_SNAPSHOT_SCHEMA ||
    !Number.isSafeInteger(raw.nextSessionOrdinal) ||
    (raw.nextSessionOrdinal as number) < 1 ||
    !Number.isSafeInteger(raw.nextEventOrdinal) ||
    (raw.nextEventOrdinal as number) < 1 ||
    !Array.isArray(raw.usedOperations) ||
    !raw.usedOperations.every((operation) => validOperation(operation)) ||
    new Set(raw.usedOperations as string[]).size !== raw.usedOperations.length ||
    !Array.isArray(raw.sessions)
  )
    return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
  const usedOperations = raw.usedOperations as string[];
  const sessions: SessionRecord[] = [];
  const sessionIds = new Set<string>();
  const eventIds = new Set<string>();
  const eventOrdinals = new Set<number>();
  const maxSessionOrdinal = Math.max(
    0,
    ...raw.sessions.map((candidate) => {
      const record = ownFields(candidate, ['binding']);
      const binding = record ? ownFields(record.binding, ['sessionOrdinal']) : undefined;
      return typeof binding?.sessionOrdinal === 'number' ? binding.sessionOrdinal : 0;
    }),
  );
  if ((raw.nextSessionOrdinal as number) <= maxSessionOrdinal) return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
  for (const candidate of raw.sessions) {
    const record = ownFields(candidate, [
      'binding',
      'state',
      'terminalCause',
      'predecessor',
      'successor',
      'assigned',
      'collected',
      'pendingRequest',
      'liveness',
      'lastHeartbeatAt',
      'lastQualifyingProgress',
      'facts',
      'faults',
      'livenessFacts',
      'uncertainOperations',
    ]);
    const binding = record && validateBinding(record.binding);
    if (
      !record ||
      !binding?.ok ||
      (record.state !== 'open' &&
        record.state !== 'bound' &&
        record.state !== 'active' &&
        record.state !== 'terminal') ||
      (record.terminalCause !== null &&
        record.terminalCause !== 'replaced' &&
        record.terminalCause !== 'cancelled' &&
        record.terminalCause !== 'lost-attested' &&
        record.terminalCause !== 'completed-close') ||
      (record.state === 'terminal' ? record.terminalCause === null : record.terminalCause !== null) ||
      (record.predecessor !== null &&
        (typeof record.predecessor !== 'string' || !parseIdentity('ID-SESSION', record.predecessor).ok)) ||
      (record.successor !== null &&
        (typeof record.successor !== 'string' || !parseIdentity('ID-SESSION', record.successor).ok)) ||
      typeof record.assigned !== 'boolean' ||
      typeof record.collected !== 'boolean' ||
      (record.pendingRequest !== null &&
        (typeof record.pendingRequest !== 'string' || !parseIdentity('ID-PARK', record.pendingRequest).ok)) ||
      (record.liveness !== 'thinking' &&
        record.liveness !== 'stuck' &&
        record.liveness !== 'dead' &&
        record.liveness !== 'human input overdue') ||
      !validTime(record.lastHeartbeatAt) ||
      !validTime(record.lastQualifyingProgress) ||
      !Array.isArray(record.facts) ||
      !Array.isArray(record.faults) ||
      !Array.isArray(record.livenessFacts) ||
      !Array.isArray(record.uncertainOperations) ||
      !record.uncertainOperations.every((operation) => validOperation(operation)) ||
      new Set(record.uncertainOperations as string[]).size !== record.uncertainOperations.length ||
      sessionIds.has(binding.value.session)
    )
      return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
    sessionIds.add(binding.value.session);

    let phase: SessionLifecycleState = 'open';
    let assigned = false;
    let collected = false;
    let pendingRequest: string | null = null;
    let terminalCause: SessionTerminalCause | null = null;
    let opened = false;
    let lastFactOrdinal = 0;
    for (const candidateFact of record.facts) {
      const fact = ownFields(candidateFact, [
        'event',
        'type',
        'kind',
        'operation',
        'session',
        'principal',
        'assignmentOrdinal',
        'bindingDigest',
        'predecessor',
        'request',
        'observedAt',
        'attestationDigest',
      ]);
      const event = typeof fact?.event === 'string' ? fact.event : '';
      const match = new RegExp(`^${binding.value.run}/event/([1-9][0-9]*)$`, 'u').exec(event);
      const ordinal = match ? Number(match[1]) : 0;
      if (
        !fact ||
        !match ||
        !Number.isSafeInteger(ordinal) ||
        ordinal <= lastFactOrdinal ||
        eventIds.has(event) ||
        eventOrdinals.has(ordinal) ||
        fact.type !== 'EV-SESSION-FACT' ||
        ![
          'open',
          'bind',
          'assignment-acknowledged',
          'reconnect',
          'replacement',
          'collect',
          'human-needed',
          'response',
          'loss',
          'cancel-and-reissue',
          'close',
        ].includes(fact.kind as string) ||
        (fact.operation !== null && !validOperation(fact.operation)) ||
        fact.session !== binding.value.session ||
        fact.principal !== binding.value.principal ||
        fact.assignmentOrdinal !== binding.value.assignmentOrdinal ||
        fact.bindingDigest !== binding.value.digest ||
        (fact.predecessor !== null &&
          (typeof fact.predecessor !== 'string' || !parseIdentity('ID-SESSION', fact.predecessor).ok)) ||
        (fact.request !== null && (typeof fact.request !== 'string' || !parseIdentity('ID-PARK', fact.request).ok)) ||
        (fact.observedAt !== null && !validTime(fact.observedAt)) ||
        (fact.attestationDigest !== null && !validDigest(fact.attestationDigest))
      )
        return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
      eventIds.add(event);
      eventOrdinals.add(ordinal);
      lastFactOrdinal = ordinal;
      if (fact.operation !== null && !usedOperations.includes(fact.operation))
        return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
      switch (fact.kind) {
        case 'open':
          if (opened || phase !== 'open' || fact.operation === null)
            return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          opened = true;
          break;
        case 'bind':
          if (!opened || phase !== 'open') return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          phase = 'bound';
          break;
        case 'replacement':
          if (!opened || phase !== 'open' || !fact.predecessor) return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          pendingRequest = fact.request;
          break;
        case 'assignment-acknowledged':
          if (!opened || phase !== 'bound' || fact.operation === null)
            return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          phase = 'active';
          assigned = true;
          break;
        case 'collect':
          if (phase !== 'active' || pendingRequest !== null || fact.operation === null)
            return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          collected = true;
          break;
        case 'human-needed':
          if (phase !== 'active' || pendingRequest !== null || !fact.request || fact.operation === null)
            return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          pendingRequest = fact.request;
          break;
        case 'response':
          if (phase !== 'active' || pendingRequest !== fact.request || !fact.request || fact.operation === null)
            return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          pendingRequest = null;
          break;
        case 'reconnect':
          if (phase !== 'active' || fact.operation !== null) return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          break;
        case 'loss':
          if (
            phase !== 'active' ||
            fact.operation !== null ||
            typeof fact.observedAt !== 'number' ||
            !validTime(fact.observedAt) ||
            typeof fact.attestationDigest !== 'string' ||
            !validDigest(fact.attestationDigest) ||
            lossAttestation(binding.value, fact.observedAt).digest !== fact.attestationDigest
          )
            return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          phase = 'terminal';
          terminalCause = 'lost-attested';
          break;
        case 'cancel-and-reissue':
          if (
            phase !== 'terminal' ||
            terminalCause !== 'lost-attested' ||
            fact.operation !== null ||
            !fact.request ||
            pendingRequest !== fact.request
          )
            return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          pendingRequest = null;
          terminalCause = 'cancelled';
          break;
        case 'close':
          if (phase !== 'active' || !collected || pendingRequest !== null || fact.operation === null)
            return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
          phase = 'terminal';
          terminalCause = 'completed-close';
          break;
      }
    }
    if (!opened && (record.state !== 'open' || record.facts.length !== 0 || record.faults.length === 0))
      return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
    if (opened && phase !== record.state) return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
    if (record.assigned !== assigned || record.collected !== collected || record.pendingRequest !== pendingRequest)
      return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
    if (record.state === 'terminal' && record.terminalCause !== terminalCause)
      return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');

    for (const candidateFault of record.faults) {
      const fault = ownFields(candidateFault, [
        'event',
        'type',
        'family',
        'code',
        'operation',
        'session',
        'principal',
        'assignmentOrdinal',
        'bindingDigest',
      ]);
      const event = typeof fault?.event === 'string' ? fault.event : '';
      const match = new RegExp(`^${binding.value.run}/event/([1-9][0-9]*)$`, 'u').exec(event);
      const ordinal = match ? Number(match[1]) : 0;
      if (
        !fault ||
        !match ||
        !Number.isSafeInteger(ordinal) ||
        eventIds.has(event) ||
        eventOrdinals.has(ordinal) ||
        fault.type !== 'EV-SESSION-FAULT' ||
        typeof fault.family !== 'string' ||
        typeof fault.code !== 'string' ||
        (fault.operation !== null && !validOperation(fault.operation)) ||
        fault.session !== binding.value.session ||
        fault.principal !== binding.value.principal ||
        fault.assignmentOrdinal !== binding.value.assignmentOrdinal ||
        fault.bindingDigest !== binding.value.digest
      )
        return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
      if (fault.operation !== null && !usedOperations.includes(fault.operation))
        return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
      eventIds.add(event);
      eventOrdinals.add(ordinal);
    }
    for (const candidateLiveness of record.livenessFacts) {
      const liveness = ownFields(candidateLiveness, [
        'event',
        'type',
        'session',
        'principal',
        'assignmentOrdinal',
        'observedAt',
        'lastQualifyingProgress',
        'silenceMs',
        'classification',
        'bound',
        'bindingDigest',
      ]);
      const event = typeof liveness?.event === 'string' ? liveness.event : '';
      const match = new RegExp(`^${binding.value.run}/event/([1-9][0-9]*)$`, 'u').exec(event);
      const ordinal = match ? Number(match[1]) : 0;
      if (
        !liveness ||
        !match ||
        !Number.isSafeInteger(ordinal) ||
        eventIds.has(event) ||
        eventOrdinals.has(ordinal) ||
        liveness.type !== 'SCH-LIVENESS' ||
        liveness.session !== binding.value.session ||
        liveness.principal !== binding.value.principal ||
        liveness.assignmentOrdinal !== binding.value.assignmentOrdinal ||
        !validTime(liveness.observedAt) ||
        !validTime(liveness.lastQualifyingProgress) ||
        typeof liveness.silenceMs !== 'number' ||
        !Number.isSafeInteger(liveness.silenceMs) ||
        liveness.silenceMs < 0 ||
        !['thinking', 'stuck', 'dead', 'human input overdue'].includes(liveness.classification as string) ||
        liveness.bound !== SESSION_SILENCE.token ||
        liveness.bindingDigest !== binding.value.digest
      )
        return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
      eventIds.add(event);
      eventOrdinals.add(ordinal);
    }
    sessions.push(deepFreeze({ ...record, binding: binding.value }) as SessionRecord);
  }
  const nextSessionOrdinal = raw.nextSessionOrdinal as number;
  const nextEventOrdinal = raw.nextEventOrdinal as number;
  if ([...eventOrdinals].some((ordinal) => ordinal >= nextEventOrdinal))
    return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
  const bySession = new Map(sessions.map((record) => [record.binding.session, record]));
  for (const record of sessions) {
    if (record.predecessor) {
      const predecessor = bySession.get(record.predecessor);
      if (
        !predecessor ||
        predecessor.successor !== record.binding.session ||
        record.state === 'terminal' ||
        !record.facts.some((fact) => fact.kind === 'replacement' && fact.predecessor === record.predecessor)
      )
        return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
    }
    if (record.successor) {
      const successor = bySession.get(record.successor);
      if (!successor || successor.predecessor !== record.binding.session)
        return fail('FC-TRUST', 'INVALID_SESSION_SNAPSHOT');
    }
  }
  return ok({ schema: SESSION_SNAPSHOT_SCHEMA, nextSessionOrdinal, nextEventOrdinal, usedOperations, sessions });
}

export function createScriptedSessionController(scenario?: ScriptedScenario): SessionController {
  return createController(createFixture(scenario));
}

export function restoreScriptedSessionController(
  snapshot: unknown,
  scenario?: ScriptedScenario,
): SessionResult<SessionController> {
  const checked = validateSnapshot(snapshot);
  if (!checked.ok) return checked;
  return ok(createController(createFixture(scenario), checked.value));
}

export function scriptedSessionLossAttestation(input: unknown): SessionResult<SessionLossAttestation> {
  const raw = ownFields(input, ['binding', 'observedAt']);
  if (!raw || !validTime(raw.observedAt)) return fail('FC-INPUT', 'INVALID_LOSS_ATTESTATION_INPUT');
  const binding = validateBinding(raw.binding);
  if (!binding.ok) return binding;
  return ok(lossAttestation(binding.value, raw.observedAt));
}

export function scriptedSessionManifest(): string {
  return SCRIPTED_MANIFEST;
}
