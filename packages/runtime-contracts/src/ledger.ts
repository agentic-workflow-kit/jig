import {
  type CanonicalJson,
  decodeFrame,
  encodeFrame,
  formatIdentity,
  parseIdentity,
  stageDigest,
  validateStagedDigest,
} from '@agentic-workflow-kit/jig-codec';

export const LEDGER_VERSION = 'jig.ledger.v1';
const GENESIS_DIGEST = '0'.repeat(64);

export type LedgerFailureFamily = 'FC-INPUT' | 'FC-SUBJECT' | 'FC-FENCE' | 'FC-TRUST' | 'FC-BOUND';
export type LedgerFailure = Readonly<{ family: LedgerFailureFamily; code: string }>;
export type LedgerResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: LedgerFailure }>;
export type RunStoreBinding = Readonly<{ kind: 'run'; run: string; generation: string }>;
export type LedgerRecord = Readonly<{
  version: typeof LEDGER_VERSION;
  run: string;
  generation: string;
  transaction: string;
  event: string;
  position: number;
  previousDigest: string;
  content: CanonicalJson;
  contentDigest: string;
}>;
export type LedgerProposal = Readonly<Omit<LedgerRecord, 'event' | 'version'>>;
export type LedgerWait = Readonly<{ elapsedMs: number; limitMs?: number }>;
export type AppendRequest = Readonly<{
  binding: RunStoreBinding;
  expectedPosition: number;
  record: LedgerProposal;
  wait?: LedgerWait;
}>;
export type ReadbackRequest = Readonly<{
  binding: RunStoreBinding;
  position: number;
  transaction: string;
  contentDigest: string;
  wait?: LedgerWait;
}>;
export type Readback =
  | Readonly<{ kind: 'committed'; record: LedgerRecord }>
  | Readonly<{ kind: 'absent'; position: number }>
  | Readonly<{ kind: 'competing'; record: LedgerRecord }>
  | Readonly<{ kind: 'integrity-failure'; record: LedgerRecord }>;
export type IntakeRequest = Readonly<{
  compositionDigest: string;
  acknowledgementDigest: string;
  successorCut?: string;
}>;
export type IntakeResult = Readonly<{
  kind: 'acknowledged' | 'rejected';
  position: number;
  compositionDigest: string;
  acknowledgementDigest: string;
  successorCut?: string;
}>;
export type IntakeReadback = Readonly<{ result: IntakeResult; witnessedHeadDigest: string }>;
export type PreflightRequest = Readonly<{
  key: string;
  variant: 'start' | 'result';
  bytes: CanonicalJson;
  predecessor?: string;
  deadline: number;
  observedAt?: number;
}>;
export type PreflightResult = Readonly<{ key: string; digest: string; bytes: CanonicalJson; deadline: number }>;
export type ScriptedLedgerFault =
  | 'after-flush'
  | 'after-witness'
  | 'lost-ack'
  | 'indeterminate-read'
  | 'witness-absent'
  | 'witness-ahead'
  | 'witness-contradiction'
  | 'fork'
  | 'rollback'
  | 'intake-after-flush'
  | 'intake-missing-companion';

export type ScriptedLedger = Readonly<{
  append(
    request: AppendRequest,
    fault?: Extract<ScriptedLedgerFault, 'after-flush' | 'after-witness' | 'lost-ack'>,
  ): LedgerResult<LedgerRecord>;
  readback(
    request: ReadbackRequest,
    fault?: Extract<ScriptedLedgerFault, 'indeterminate-read'>,
  ): LedgerResult<Readback>;
  advanceWitnessFloor(binding: RunStoreBinding): LedgerResult<void>;
  intake(
    request: IntakeRequest,
    fault?: Extract<ScriptedLedgerFault, 'intake-after-flush' | 'intake-missing-companion'>,
  ): LedgerResult<IntakeResult>;
  readIntake(compositionDigest: string): LedgerResult<IntakeReadback>;
  preflight(request: PreflightRequest): LedgerResult<PreflightResult>;
  snapshot(binding: RunStoreBinding): LedgerResult<Readonly<{ position: number; digest: string }>>;
  verifySnapshot(
    binding: RunStoreBinding,
    snapshot: Readonly<{ position: number; digest: string }>,
  ): LedgerResult<boolean>;
  injectFault(
    binding: RunStoreBinding,
    fault: Exclude<ScriptedLedgerFault, 'after-flush' | 'after-witness' | 'lost-ack' | 'indeterminate-read'>,
  ): LedgerResult<void>;
}>;

const fail = (family: LedgerFailureFamily, code: string): LedgerResult<never> => ({
  ok: false,
  error: { family, code },
});
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const position = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const expectedPosition = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= -1;
const WAIT_DEFAULT_MS = 30_000;
const WAIT_MIN_MS = 1_000;
const WAIT_MAX_MS = 300_000;
const freeze = <T>(value: T): T => Object.freeze(value);
const freezeDeep = <T>(value: T): T => {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
};

function snapshotContent(value: unknown): CanonicalJson | undefined {
  const encoded = encodeFrame(value as CanonicalJson);
  if (!encoded.ok) return undefined;
  const decoded = decodeFrame(encoded.value);
  return decoded.ok ? freezeDeep(decoded.value) : undefined;
}

function recordDigest(record: Omit<LedgerRecord, 'contentDigest'>): LedgerResult<string> {
  const staged = stageDigest({
    domain: 'LEDGER-RECORD',
    excludePaths: ['contentDigest', 'event'],
    value: { ...record, contentDigest: '' },
  });
  return staged.ok ? { ok: true, value: staged.value.digest } : fail('FC-INPUT', 'INVALID_RECORD');
}

function waitWithinBound(wait: LedgerWait | undefined): LedgerResult<void> {
  if (wait === undefined) return { ok: true, value: undefined };
  const limit = wait.limitMs ?? WAIT_DEFAULT_MS;
  if (!position(wait.elapsedMs) || !Number.isSafeInteger(limit) || limit < WAIT_MIN_MS || limit > WAIT_MAX_MS)
    return fail('FC-INPUT', 'INVALID_BND_WAIT_LEDGER');
  return wait.elapsedMs > limit ? fail('FC-BOUND', 'BND_WAIT_LEDGER_EXHAUSTED') : { ok: true, value: undefined };
}

function validateRecord(value: unknown): LedgerResult<LedgerRecord> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail('FC-INPUT', 'INVALID_RECORD');
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(',') !==
      'content,contentDigest,event,generation,position,previousDigest,run,transaction,version' ||
    record.version !== LEDGER_VERSION ||
    !nonEmpty(record.run) ||
    !nonEmpty(record.generation) ||
    !nonEmpty(record.transaction) ||
    !nonEmpty(record.event) ||
    !position(record.position) ||
    !digest(record.previousDigest) ||
    !digest(record.contentDigest)
  )
    return fail('FC-INPUT', 'INVALID_RECORD');
  if (
    !parseIdentity('ID-RUN', record.run).ok ||
    !parseIdentity('ID-GEN', record.generation).ok ||
    !parseIdentity('ID-TXN', record.transaction).ok ||
    !parseIdentity('ID-EVENT', record.event).ok ||
    !record.generation.startsWith(`${record.run}/gen/`) ||
    !record.transaction.startsWith(`${record.run}/txn/${record.position + 1}/${record.generation}|`) ||
    record.event !== `${record.run}/event/${record.position + 1}`
  )
    return fail('FC-SUBJECT', 'INVALID_IDENTITY_BINDING');
  const content = snapshotContent(record.content);
  if (content === undefined) return fail('FC-INPUT', 'INVALID_RECORD_CONTENT');
  const staged = validateStagedDigest({
    domain: 'LEDGER-RECORD',
    excludePaths: ['contentDigest', 'event'],
    digest: record.contentDigest,
    value: {
      version: record.version,
      run: record.run,
      generation: record.generation,
      transaction: record.transaction,
      event: record.event,
      position: record.position,
      previousDigest: record.previousDigest,
      content,
      contentDigest: record.contentDigest,
    },
  });
  if (!staged.ok) return fail('FC-INPUT', 'INVALID_RECORD_DIGEST');
  return {
    ok: true,
    value: freeze({
      version: LEDGER_VERSION,
      run: record.run,
      generation: record.generation,
      transaction: record.transaction,
      event: record.event,
      position: record.position,
      previousDigest: record.previousDigest,
      content,
      contentDigest: record.contentDigest,
    }),
  };
}

export function createLedgerRecord(input: LedgerProposal): LedgerResult<LedgerProposal> {
  if (
    typeof input !== 'object' ||
    input === null ||
    ![
      'content,generation,position,previousDigest,run,transaction',
      'content,contentDigest,generation,position,previousDigest,run,transaction',
    ].includes(Object.keys(input).sort().join(','))
  )
    return fail('FC-INPUT', 'INVALID_PROPOSAL');
  if (
    !position(input.position) ||
    !digest(input.previousDigest) ||
    !parseIdentity('ID-RUN', input.run).ok ||
    !parseIdentity('ID-GEN', input.generation).ok ||
    !parseIdentity('ID-TXN', input.transaction).ok ||
    !input.generation.startsWith(`${input.run}/gen/`) ||
    !input.transaction.startsWith(`${input.run}/txn/${input.position + 1}/${input.generation}|`)
  )
    return fail('FC-INPUT', 'INVALID_PROPOSAL');
  const content = snapshotContent(input.content);
  if (content === undefined) return fail('FC-INPUT', 'INVALID_RECORD_CONTENT');
  const staged = recordDigest({ ...input, content, event: '', version: LEDGER_VERSION });
  return staged.ok ? { ok: true, value: freeze({ ...input, content, contentDigest: staged.value }) } : staged;
}

function mintedEvent(run: string, position: number): LedgerResult<string> {
  const match = /^run-([0-9]{12})-([0-9a-f]{16})$/.exec(run);
  if (!match) return fail('FC-SUBJECT', 'INVALID_EVENT_SCOPE');
  const event = formatIdentity('ID-EVENT', {
    runSequence: match[1] as string,
    runNonce: match[2] as string,
    eventOrdinal: String(position + 1),
  });
  return event.ok ? { ok: true, value: event.value.value } : fail('FC-SUBJECT', 'INVALID_EVENT_SCOPE');
}

function validBinding(value: unknown): value is RunStoreBinding {
  const candidate = value as Record<string, unknown>;
  const run = candidate.run;
  const generation = candidate.generation;
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    candidate.kind === 'run' &&
    typeof run === 'string' &&
    typeof generation === 'string' &&
    parseIdentity('ID-RUN', run).ok &&
    parseIdentity('ID-GEN', generation).ok &&
    generation.startsWith(`${run}/gen/`) &&
    Object.keys(value as object)
      .sort()
      .join(',') === 'generation,kind,run'
  );
}

function head(records: readonly LedgerRecord[]): Readonly<{ position: number; digest: string }> {
  const last = records.at(-1);
  return last ? { position: last.position, digest: last.contentDigest } : { position: -1, digest: GENESIS_DIGEST };
}

function verifyChain(records: readonly LedgerRecord[]): LedgerResult<Readonly<{ position: number; digest: string }>> {
  let previous = GENESIS_DIGEST;
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record || record.position !== index || record.previousDigest !== previous || !validateRecord(record).ok)
      return fail('FC-TRUST', 'BROKEN_CHAIN');
    previous = record.contentDigest;
  }
  return { ok: true, value: head(records) };
}

/**
 * Semantic-only fixture. Its witness map is intentionally a separate logical control plane from
 * the ledger records. It is unapproved, has no configuration path, and cannot qualify a provider.
 */
export function createScriptedLedger(): ScriptedLedger {
  const records = new Map<string, LedgerRecord[]>();
  const witnesses = new Map<string, Readonly<{ position: number; digest: string }>>();
  const intake = new Map<string, IntakeResult>();
  const cuts = new Map<string, IntakeResult>();
  const preflight = new Map<string, PreflightResult>();
  const intakeWitnesses = new Map<string, Readonly<{ position: number; digest: string }>>();

  const forRun = (binding: RunStoreBinding): LedgerResult<LedgerRecord[]> => {
    if (!validBinding(binding)) return fail('FC-SUBJECT', 'INVALID_STORE_BINDING');
    const existing = records.get(binding.run);
    if (existing) return { ok: true, value: existing };
    const created: LedgerRecord[] = [];
    records.set(binding.run, created);
    return { ok: true, value: created };
  };
  const compareWitness = (run: string, recordsForRun: readonly LedgerRecord[]): LedgerResult<'current' | 'behind'> => {
    const verified = verifyChain(recordsForRun);
    if (!verified.ok) return verified;
    const witness = witnesses.get(run);
    if (!witness) return fail('FC-TRUST', 'WITNESS_ABSENT');
    if (witness.position > verified.value.position) return fail('FC-TRUST', 'WITNESS_AHEAD');
    if (witness.position === verified.value.position && witness.digest !== verified.value.digest)
      return fail('FC-TRUST', 'WITNESS_MISMATCH');
    if (witness.position < verified.value.position) return { ok: true, value: 'behind' };
    return { ok: true, value: 'current' };
  };

  return freeze({
    append(request, fault) {
      const wait = waitWithinBound(request.wait);
      if (!wait.ok) return wait;
      const state = forRun(request.binding);
      const proposal = createLedgerRecord(request.record);
      if (!state.ok) return state;
      if (!proposal.ok) return proposal;
      if (
        !expectedPosition(request.expectedPosition) ||
        proposal.value.run !== request.binding.run ||
        proposal.value.generation !== request.binding.generation ||
        proposal.value.position !== request.expectedPosition + 1
      )
        return fail('FC-SUBJECT', 'APPEND_BINDING_MISMATCH');
      const actual = head(state.value);
      if (request.expectedPosition !== actual.position || proposal.value.previousDigest !== actual.digest)
        return fail('FC-FENCE', 'EXPECTED_HEAD_MISMATCH');
      const event = mintedEvent(proposal.value.run, proposal.value.position);
      if (!event.ok) return event;
      const record = validateRecord({ ...proposal.value, event: event.value, version: LEDGER_VERSION });
      if (!record.ok) return record;
      state.value.push(record.value); // durable flush is modeled before every witness step.
      if (fault === 'after-flush') return fail('FC-TRUST', 'ACK_LOST');
      witnesses.set(
        request.binding.run,
        freeze({ position: record.value.position, digest: record.value.contentDigest }),
      );
      if (fault === 'after-witness' || fault === 'lost-ack') return fail('FC-TRUST', 'ACK_LOST');
      return { ok: true, value: record.value };
    },
    readback(request, fault) {
      if (fault === 'indeterminate-read') return fail('FC-TRUST', 'INDETERMINATE_READ');
      const wait = waitWithinBound(request.wait);
      if (!wait.ok) return wait;
      const state = forRun(request.binding);
      if (!state.ok) return state;
      if (!position(request.position) || !nonEmpty(request.transaction) || !digest(request.contentDigest))
        return fail('FC-INPUT', 'INVALID_READBACK');
      const currency = compareWitness(request.binding.run, state.value);
      if (!currency.ok) return currency;
      if (currency.value === 'behind') return fail('FC-TRUST', 'WITNESS_BEHIND');
      const record = state.value[request.position];
      if (!record) return { ok: true, value: freeze({ kind: 'absent', position: request.position }) };
      if (record.transaction === request.transaction && record.generation === request.binding.generation) {
        return record.contentDigest === request.contentDigest
          ? { ok: true, value: freeze({ kind: 'committed', record }) }
          : { ok: true, value: freeze({ kind: 'integrity-failure', record }) };
      }
      return { ok: true, value: freeze({ kind: 'competing', record }) };
    },
    advanceWitnessFloor(binding) {
      const state = forRun(binding);
      if (!state.ok) return state;
      const verified = verifyChain(state.value);
      if (!verified.ok) return verified;
      const witness = witnesses.get(binding.run);
      if (!witness) return fail('FC-TRUST', 'WITNESS_ABSENT');
      if (
        witness &&
        (witness.position > verified.value.position ||
          (witness.position === verified.value.position && witness.digest !== verified.value.digest))
      )
        return fail('FC-TRUST', 'WITNESS_MISMATCH');
      if (witness.position === verified.value.position) return fail('FC-FENCE', 'WITNESS_ALREADY_CURRENT');
      witnesses.set(binding.run, freeze(verified.value));
      return { ok: true, value: undefined };
    },
    intake(request, fault) {
      if (
        !digest(request.compositionDigest) ||
        !digest(request.acknowledgementDigest) ||
        (request.successorCut && !nonEmpty(request.successorCut))
      )
        return fail('FC-INPUT', 'INVALID_INTAKE');
      const existing = intake.get(request.compositionDigest);
      if (existing) {
        const read = this.readIntake(request.compositionDigest);
        if (!read.ok) return read;
        return existing.acknowledgementDigest === request.acknowledgementDigest
          ? { ok: true, value: existing }
          : fail('FC-INPUT', 'INTAKE_DIGEST_MISMATCH');
      }
      const position = intake.size;
      const winner = request.successorCut ? cuts.get(request.successorCut) : undefined;
      const result: IntakeResult = freeze(
        winner
          ? {
              kind: 'rejected',
              position,
              compositionDigest: request.compositionDigest,
              acknowledgementDigest: request.acknowledgementDigest,
            }
          : {
              kind: 'acknowledged',
              position,
              compositionDigest: request.compositionDigest,
              acknowledgementDigest: request.acknowledgementDigest,
              ...(request.successorCut ? { successorCut: request.successorCut } : {}),
            },
      );
      // The acknowledgement and unique successor cut are committed as one in-memory transaction.
      intake.set(request.compositionDigest, result);
      if (request.successorCut && result.kind === 'acknowledged') cuts.set(request.successorCut, result);
      if (fault === 'intake-after-flush') return fail('FC-TRUST', 'INTAKE_ACK_LOST');
      if (fault === 'intake-missing-companion' && result.successorCut) cuts.delete(result.successorCut);
      // The intake witness is deliberately separate from the pair's durable state and advances only after it.
      const stagedHead = stageDigest({
        domain: 'INTAKE-PAIR',
        excludePaths: [],
        value: { acknowledgement: result, cut: result.successorCut ?? null, position: result.position },
      });
      if (!stagedHead.ok) return fail('FC-TRUST', 'INTAKE_HEAD_INVALID');
      if (fault === 'intake-missing-companion') return fail('FC-TRUST', 'INTAKE_PAIR_MISMATCH');
      intakeWitnesses.set(
        request.compositionDigest,
        freeze({ position: result.position, digest: stagedHead.value.digest }),
      );
      return { ok: true, value: result };
    },
    readIntake(compositionDigest) {
      if (!digest(compositionDigest)) return fail('FC-INPUT', 'INVALID_INTAKE_KEY');
      const result = intake.get(compositionDigest);
      const intakeWitness = intakeWitnesses.get(compositionDigest);
      if (!result || !intakeWitness) return fail('FC-TRUST', 'INTAKE_UNVERIFIABLE');
      if (result.successorCut && cuts.get(result.successorCut) !== result)
        return fail('FC-TRUST', 'INTAKE_PAIR_MISMATCH');
      const stagedHead = stageDigest({
        domain: 'INTAKE-PAIR',
        excludePaths: [],
        value: { acknowledgement: result, cut: result.successorCut ?? null, position: result.position },
      });
      if (
        !stagedHead.ok ||
        intakeWitness.position !== result.position ||
        intakeWitness.digest !== stagedHead.value.digest
      )
        return fail('FC-TRUST', 'INTAKE_WITNESS_MISMATCH');
      return { ok: true, value: freeze({ result, witnessedHeadDigest: intakeWitness.digest }) };
    },
    preflight(request) {
      if (
        !nonEmpty(request.key) ||
        (request.variant !== 'start' && request.variant !== 'result') ||
        !position(request.deadline) ||
        (request.observedAt !== undefined &&
          (!position(request.observedAt) || request.observedAt > request.deadline)) ||
        (request.variant === 'start' ? request.predecessor !== undefined : !digest(request.predecessor))
      )
        return fail('FC-INPUT', 'INVALID_PREFLIGHT');
      const bytes = snapshotContent(request.bytes);
      if (bytes === undefined) return fail('FC-INPUT', 'INVALID_PREFLIGHT_BYTES');
      const staged = stageDigest({ domain: 'PREFLIGHT-ATTEMPT', excludePaths: [], value: bytes });
      if (!staged.ok) return fail('FC-INPUT', 'INVALID_PREFLIGHT_BYTES');
      const result = freeze({
        key: `${request.key}/${request.variant}`,
        digest: staged.value.digest,
        bytes,
        deadline: request.deadline,
      });
      const existing = preflight.get(result.key);
      const start = preflight.get(`${request.key}/start`);
      if (request.variant === 'result' && (!start || start.digest !== request.predecessor))
        return fail('FC-INPUT', 'INVALID_PREFLIGHT_PREDECESSOR');
      if (existing)
        return existing.digest === result.digest && existing.deadline === result.deadline
          ? { ok: true, value: existing }
          : fail('FC-INPUT', 'PREFLIGHT_MISMATCH');
      preflight.set(result.key, result);
      return { ok: true, value: result };
    },
    snapshot(binding) {
      const state = forRun(binding);
      if (!state.ok) return state;
      const verified = verifyChain(state.value);
      return verified.ok ? { ok: true, value: freeze(verified.value) } : verified;
    },
    verifySnapshot(binding, snapshot) {
      const state = forRun(binding);
      if (!state.ok) return state;
      const verified = verifyChain(state.value);
      if (!verified.ok) return verified;
      return {
        ok: true,
        value:
          position(snapshot.position) &&
          digest(snapshot.digest) &&
          snapshot.position === verified.value.position &&
          snapshot.digest === verified.value.digest,
      };
    },
    injectFault(binding, fault) {
      const state = forRun(binding);
      if (!state.ok) return state;
      const current = head(state.value);
      if (fault === 'witness-absent') witnesses.delete(binding.run);
      else if (fault === 'witness-ahead')
        witnesses.set(binding.run, freeze({ position: current.position + 1, digest: current.digest }));
      else if (fault === 'witness-contradiction')
        witnesses.set(binding.run, freeze({ position: current.position, digest: GENESIS_DIGEST }));
      else if (fault === 'rollback') state.value.pop();
      else if (fault === 'fork' && state.value.length > 0) {
        const previous = state.value.at(-1);
        if (previous) state.value.push(freeze({ ...previous, transaction: `${previous.transaction}-fork` }));
      }
      return { ok: true, value: undefined };
    },
  });
}
