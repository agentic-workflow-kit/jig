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
export type LedgerProposal = Readonly<
  Pick<LedgerRecord, 'run' | 'generation' | 'transaction' | 'position' | 'previousDigest' | 'content'>
>;
export type PreparedLedgerRecord = Readonly<Omit<LedgerRecord, 'event'>>;
export type LedgerWait = Readonly<{ elapsedMs: number; limitMs?: number }>;
export type AppendRequest = Readonly<{
  binding: RunStoreBinding;
  expectedPosition: number;
  record: PreparedLedgerRecord;
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
export type IntakeWinnerBinding = Readonly<{
  position: number;
  compositionDigest: string;
  acknowledgementDigest: string;
  successorCut: string;
  run: string;
}>;
export type IntakeResult =
  | Readonly<{
      kind: 'acknowledged';
      position: number;
      compositionDigest: string;
      acknowledgementDigest: string;
      successorCut?: string;
      run: string;
    }>
  | Readonly<{
      kind: 'rejected';
      position: number;
      compositionDigest: string;
      acknowledgementDigest: string;
      reason: 'successor-cut-already-claimed';
      winner: IntakeWinnerBinding;
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
  | 'before-append'
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
  | 'intake-missing-companion'
  | 'intake-mismatched-companion';

export type ScriptedLedger = Readonly<{
  append(
    request: AppendRequest,
    fault?: Extract<ScriptedLedgerFault, 'before-append' | 'after-flush' | 'after-witness' | 'lost-ack'>,
  ): LedgerResult<LedgerRecord>;
  readback(
    request: ReadbackRequest,
    fault?: Extract<ScriptedLedgerFault, 'indeterminate-read'>,
  ): LedgerResult<Readback>;
  advanceWitnessFloor(binding: RunStoreBinding): LedgerResult<void>;
  intake(
    request: IntakeRequest,
    fault?: Extract<
      ScriptedLedgerFault,
      'intake-after-flush' | 'intake-missing-companion' | 'intake-mismatched-companion'
    >,
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
    fault: Exclude<
      ScriptedLedgerFault,
      | 'before-append'
      | 'after-flush'
      | 'after-witness'
      | 'lost-ack'
      | 'indeterminate-read'
      | 'intake-after-flush'
      | 'intake-missing-companion'
      | 'intake-mismatched-companion'
    >,
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

function validTransaction(
  run: string,
  generation: string,
  recordPosition: number,
  transaction: unknown,
): transaction is string {
  return (
    typeof transaction === 'string' &&
    parseIdentity('ID-TXN', transaction).ok &&
    transaction.startsWith(`${run}/txn/${recordPosition + 1}/${generation}|`)
  );
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
    !parseIdentity('ID-EVENT', record.event).ok ||
    !record.generation.startsWith(`${record.run}/gen/`) ||
    !validTransaction(record.run, record.generation, record.position, record.transaction) ||
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

function validateProposal(input: unknown): LedgerResult<LedgerProposal> {
  if (
    typeof input !== 'object' ||
    input === null ||
    Object.keys(input).sort().join(',') !== 'content,generation,position,previousDigest,run,transaction'
  )
    return fail('FC-INPUT', 'INVALID_PROPOSAL');
  const proposal = input as LedgerProposal;
  if (
    !position(proposal.position) ||
    !digest(proposal.previousDigest) ||
    !parseIdentity('ID-RUN', proposal.run).ok ||
    !parseIdentity('ID-GEN', proposal.generation).ok ||
    !proposal.generation.startsWith(`${proposal.run}/gen/`) ||
    !validTransaction(proposal.run, proposal.generation, proposal.position, proposal.transaction)
  )
    return fail('FC-INPUT', 'INVALID_PROPOSAL');
  const content = snapshotContent(proposal.content);
  if (content === undefined) return fail('FC-INPUT', 'INVALID_RECORD_CONTENT');
  return { ok: true, value: freeze({ ...proposal, content }) };
}

function validatePreparedRecord(input: unknown): LedgerResult<PreparedLedgerRecord> {
  if (
    typeof input !== 'object' ||
    input === null ||
    Object.keys(input).sort().join(',') !==
      'content,contentDigest,generation,position,previousDigest,run,transaction,version'
  )
    return fail('FC-INPUT', 'INVALID_PREPARED_RECORD');
  const prepared = input as PreparedLedgerRecord;
  if (prepared.version !== LEDGER_VERSION || !digest(prepared.contentDigest))
    return fail('FC-INPUT', 'INVALID_PREPARED_RECORD');
  const proposal = validateProposal({
    run: prepared.run,
    generation: prepared.generation,
    transaction: prepared.transaction,
    position: prepared.position,
    previousDigest: prepared.previousDigest,
    content: prepared.content,
  });
  if (!proposal.ok) return proposal;
  const staged = recordDigest({ ...proposal.value, event: '', version: LEDGER_VERSION });
  if (!staged.ok || staged.value !== prepared.contentDigest) return fail('FC-INPUT', 'INVALID_PREPARED_RECORD');
  return {
    ok: true,
    value: freeze({ version: LEDGER_VERSION, ...proposal.value, contentDigest: prepared.contentDigest }),
  };
}

export function createLedgerRecord(input: LedgerProposal): LedgerResult<PreparedLedgerRecord> {
  const proposal = validateProposal(input);
  if (!proposal.ok) return proposal;
  const staged = recordDigest({ ...proposal.value, event: '', version: LEDGER_VERSION });
  return staged.ok
    ? { ok: true, value: freeze({ version: LEDGER_VERSION, ...proposal.value, contentDigest: staged.value }) }
    : staged;
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

function normalizedBinding(value: unknown): LedgerResult<RunStoreBinding> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return fail('FC-SUBJECT', 'INVALID_STORE_BINDING');
  try {
    const candidate = value as Record<string, unknown>;
    const keys = Object.getOwnPropertyNames(candidate).sort().join(',');
    const kind = Object.getOwnPropertyDescriptor(candidate, 'kind');
    const run = Object.getOwnPropertyDescriptor(candidate, 'run');
    const generation = Object.getOwnPropertyDescriptor(candidate, 'generation');
    if (
      !(
        keys === 'generation,kind,run' &&
        kind?.value === 'run' &&
        typeof run?.value === 'string' &&
        typeof generation?.value === 'string' &&
        parseIdentity('ID-RUN', run.value).ok &&
        parseIdentity('ID-GEN', generation.value).ok &&
        generation.value.startsWith(`${run.value}/gen/`)
      )
    )
      return fail('FC-SUBJECT', 'INVALID_STORE_BINDING');
    return { ok: true, value: freeze({ kind: 'run', run: run.value, generation: generation.value }) };
  } catch {
    return fail('FC-SUBJECT', 'INVALID_STORE_BINDING');
  }
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
  type PendingAcknowledgement = Readonly<Omit<Extract<IntakeResult, { kind: 'acknowledged' }>, 'run'>>;
  type StoredIntakeResult = PendingAcknowledgement | Extract<IntakeResult, { kind: 'rejected' }>;
  const intake = new Map<string, StoredIntakeResult>();
  const cuts = new Map<string, PendingAcknowledgement>();
  const preflight = new Map<string, PreflightResult>();
  const intakeWitnesses = new Map<string, Readonly<{ position: number; digest: string }>>();

  const forRun = (input: unknown): LedgerResult<Readonly<{ binding: RunStoreBinding; records: LedgerRecord[] }>> => {
    const binding = normalizedBinding(input);
    if (!binding.ok) return binding;
    const existing = records.get(binding.value.run);
    if (existing) return { ok: true, value: freeze({ binding: binding.value, records: existing }) };
    const created: LedgerRecord[] = [];
    records.set(binding.value.run, created);
    return { ok: true, value: freeze({ binding: binding.value, records: created }) };
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
  const deriveIntakeRun = (result: PendingAcknowledgement): LedgerResult<string> => {
    const run = formatIdentity('ID-RUN', {
      runSequence: String(result.position).padStart(12, '0'),
      runNonce: result.compositionDigest.slice(0, 16),
    });
    return run.ok ? { ok: true, value: run.value.value } : fail('FC-TRUST', 'INTAKE_RUN_DERIVATION_FAILED');
  };
  const publishedIntake = (result: StoredIntakeResult): LedgerResult<IntakeResult> => {
    if (result.kind === 'rejected') return { ok: true, value: result };
    const run = deriveIntakeRun(result);
    return run.ok ? { ok: true, value: freeze({ ...result, run: run.value }) } : run;
  };
  const stagedIntakeHead = (result: StoredIntakeResult): LedgerResult<string> => {
    const staged = stageDigest({
      domain: 'INTAKE-PAIR',
      excludePaths: [],
      value: {
        acknowledgement: result,
        cut: result.kind === 'acknowledged' ? (result.successorCut ?? null) : null,
        position: result.position,
      },
    });
    return staged.ok ? { ok: true, value: staged.value.digest } : fail('FC-TRUST', 'INTAKE_HEAD_INVALID');
  };
  const verifyIntake = (compositionDigest: string): LedgerResult<IntakeReadback> => {
    const result = intake.get(compositionDigest);
    const intakeWitness = intakeWitnesses.get(compositionDigest);
    if (!result || !intakeWitness) return fail('FC-TRUST', 'INTAKE_UNVERIFIABLE');
    if (result.kind === 'acknowledged' && result.successorCut && cuts.get(result.successorCut) !== result)
      return fail('FC-TRUST', 'INTAKE_PAIR_MISMATCH');
    const stagedHead = stagedIntakeHead(result);
    if (!stagedHead.ok || intakeWitness.position !== result.position || intakeWitness.digest !== stagedHead.value)
      return fail('FC-TRUST', 'INTAKE_WITNESS_MISMATCH');
    const published = publishedIntake(result);
    return published.ok
      ? { ok: true, value: freeze({ result: published.value, witnessedHeadDigest: intakeWitness.digest }) }
      : published;
  };

  return freeze({
    append(request, fault) {
      const wait = waitWithinBound(request.wait);
      if (!wait.ok) return wait;
      const state = forRun(request.binding);
      const proposal = validatePreparedRecord(request.record);
      if (!state.ok) return state;
      if (!proposal.ok) return proposal;
      if (
        !expectedPosition(request.expectedPosition) ||
        proposal.value.run !== state.value.binding.run ||
        proposal.value.generation !== state.value.binding.generation ||
        proposal.value.position !== request.expectedPosition + 1
      )
        return fail('FC-SUBJECT', 'APPEND_BINDING_MISMATCH');
      const actual = head(state.value.records);
      if (request.expectedPosition !== actual.position || proposal.value.previousDigest !== actual.digest)
        return fail('FC-FENCE', 'EXPECTED_HEAD_MISMATCH');
      if (fault === 'before-append') return fail('FC-TRUST', 'ACK_LOST');
      const event = mintedEvent(proposal.value.run, proposal.value.position);
      if (!event.ok) return event;
      const record = validateRecord({ ...proposal.value, event: event.value, version: LEDGER_VERSION });
      if (!record.ok) return record;
      state.value.records.push(record.value); // durable flush is modeled before every witness step.
      if (fault === 'after-flush') return fail('FC-TRUST', 'ACK_LOST');
      witnesses.set(
        state.value.binding.run,
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
      if (!position(request.position) || !digest(request.contentDigest)) return fail('FC-INPUT', 'INVALID_READBACK');
      if (
        !validTransaction(
          state.value.binding.run,
          state.value.binding.generation,
          request.position,
          request.transaction,
        )
      )
        return fail('FC-SUBJECT', 'INVALID_READBACK_BINDING');
      const currency = compareWitness(state.value.binding.run, state.value.records);
      if (!currency.ok) return currency;
      if (currency.value === 'behind') return fail('FC-TRUST', 'WITNESS_BEHIND');
      const record = state.value.records[request.position];
      if (!record) return { ok: true, value: freeze({ kind: 'absent', position: request.position }) };
      if (record.transaction === request.transaction && record.generation === state.value.binding.generation) {
        return record.contentDigest === request.contentDigest
          ? { ok: true, value: freeze({ kind: 'committed', record }) }
          : { ok: true, value: freeze({ kind: 'integrity-failure', record }) };
      }
      return { ok: true, value: freeze({ kind: 'competing', record }) };
    },
    advanceWitnessFloor(binding) {
      const state = forRun(binding);
      if (!state.ok) return state;
      const verified = verifyChain(state.value.records);
      if (!verified.ok) return verified;
      const witness = witnesses.get(state.value.binding.run);
      if (!witness) return fail('FC-TRUST', 'WITNESS_ABSENT');
      if (
        witness &&
        (witness.position > verified.value.position ||
          (witness.position === verified.value.position && witness.digest !== verified.value.digest))
      )
        return fail('FC-TRUST', 'WITNESS_MISMATCH');
      if (witness.position === verified.value.position) return fail('FC-FENCE', 'WITNESS_ALREADY_CURRENT');
      witnesses.set(state.value.binding.run, freeze(verified.value));
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
        const read = verifyIntake(request.compositionDigest);
        if (!read.ok) return read;
        if (
          existing.acknowledgementDigest !== request.acknowledgementDigest ||
          (existing.kind === 'acknowledged'
            ? existing.successorCut !== request.successorCut
            : existing.winner.successorCut !== request.successorCut)
        )
          return fail('FC-INPUT', 'INTAKE_REQUEST_MISMATCH');
        if (existing.kind === 'rejected') {
          const winner = verifyIntake(existing.winner.compositionDigest);
          if (
            !winner.ok ||
            winner.value.result.kind !== 'acknowledged' ||
            winner.value.result.position !== existing.winner.position ||
            winner.value.result.acknowledgementDigest !== existing.winner.acknowledgementDigest ||
            winner.value.result.successorCut !== existing.winner.successorCut ||
            winner.value.result.run !== existing.winner.run
          )
            return fail('FC-TRUST', 'INTAKE_PAIR_MISMATCH');
        }
        return { ok: true, value: read.value.result };
      }
      const position = intake.size;
      const winner = request.successorCut ? cuts.get(request.successorCut) : undefined;
      const claimed = request.successorCut
        ? [...intake.values()].find(
            (result): result is PendingAcknowledgement =>
              result.kind === 'acknowledged' && result.successorCut === request.successorCut,
          )
        : undefined;
      if (claimed && winner !== claimed) return fail('FC-TRUST', 'INTAKE_PAIR_MISMATCH');
      if (winner) {
        const winnerReadback = verifyIntake(winner.compositionDigest);
        if (!winnerReadback.ok || winnerReadback.value.result.kind !== 'acknowledged')
          return fail('FC-TRUST', 'INTAKE_PAIR_MISMATCH');
        const publishedWinner = winnerReadback.value.result;
        const result: StoredIntakeResult = freeze({
          kind: 'rejected',
          position,
          compositionDigest: request.compositionDigest,
          acknowledgementDigest: request.acknowledgementDigest,
          reason: 'successor-cut-already-claimed',
          winner: freeze({
            position: publishedWinner.position,
            compositionDigest: publishedWinner.compositionDigest,
            acknowledgementDigest: publishedWinner.acknowledgementDigest,
            successorCut: publishedWinner.successorCut as string,
            run: publishedWinner.run,
          }),
        });
        intake.set(request.compositionDigest, result);
        if (fault === 'intake-after-flush') return fail('FC-TRUST', 'INTAKE_ACK_LOST');
        const stagedHead = stagedIntakeHead(result);
        if (!stagedHead.ok) return stagedHead;
        intakeWitnesses.set(request.compositionDigest, freeze({ position: result.position, digest: stagedHead.value }));
        return { ok: true, value: result };
      }
      const result: PendingAcknowledgement = freeze({
        kind: 'acknowledged',
        position,
        compositionDigest: request.compositionDigest,
        acknowledgementDigest: request.acknowledgementDigest,
        ...(request.successorCut ? { successorCut: request.successorCut } : {}),
      });
      // The acknowledgement and unique successor cut are committed as one in-memory transaction.
      intake.set(request.compositionDigest, result);
      if (request.successorCut) cuts.set(request.successorCut, result);
      if (fault === 'intake-after-flush') return fail('FC-TRUST', 'INTAKE_ACK_LOST');
      if (fault === 'intake-missing-companion' && result.successorCut) cuts.delete(result.successorCut);
      if (fault === 'intake-mismatched-companion' && result.successorCut)
        cuts.set(result.successorCut, freeze({ ...result, compositionDigest: '0'.repeat(64) }));
      // The intake witness is deliberately separate from the pair's durable state and advances only after it.
      const stagedHead = stagedIntakeHead(result);
      if (!stagedHead.ok) return stagedHead;
      if (fault === 'intake-missing-companion') return fail('FC-TRUST', 'INTAKE_PAIR_MISMATCH');
      intakeWitnesses.set(request.compositionDigest, freeze({ position: result.position, digest: stagedHead.value }));
      if (fault === 'intake-mismatched-companion') return fail('FC-TRUST', 'INTAKE_PAIR_MISMATCH');
      const published = publishedIntake(result);
      return published.ok ? published : fail('FC-TRUST', 'INTAKE_RUN_DERIVATION_FAILED');
    },
    readIntake(compositionDigest) {
      if (!digest(compositionDigest)) return fail('FC-INPUT', 'INVALID_INTAKE_KEY');
      return verifyIntake(compositionDigest);
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
      const verified = verifyChain(state.value.records);
      return verified.ok ? { ok: true, value: freeze(verified.value) } : verified;
    },
    verifySnapshot(binding, snapshot) {
      const state = forRun(binding);
      if (!state.ok) return state;
      const verified = verifyChain(state.value.records);
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
      const current = head(state.value.records);
      if (fault === 'witness-absent') witnesses.delete(state.value.binding.run);
      else if (fault === 'witness-ahead')
        witnesses.set(state.value.binding.run, freeze({ position: current.position + 1, digest: current.digest }));
      else if (fault === 'witness-contradiction')
        witnesses.set(state.value.binding.run, freeze({ position: current.position, digest: GENESIS_DIGEST }));
      else if (fault === 'rollback') state.value.records.pop();
      else if (fault === 'fork' && state.value.records.length > 0) {
        const previous = state.value.records.at(-1);
        if (previous) state.value.records.push(freeze({ ...previous, transaction: `${previous.transaction}-fork` }));
      }
      return { ok: true, value: undefined };
    },
  });
}
