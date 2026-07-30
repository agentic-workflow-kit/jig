import { type CanonicalJson, encodeFrame, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import { type AuthorityState, type ProposedTransition, replayAuthority } from './index.js';
import { type OperationJournalSnapshot, type OperationProjection, restoreOperationJournal } from './operation.js';

const LEDGER_VERSION = 'jig.ledger.v1';
const GENESIS_DIGEST = '0'.repeat(64);
const WAIT_MIN_MS = 1_000;
const WAIT_MAX_MS = 300_000;
const CRASH_POINTS = new Set([
  'before-claim',
  'after-claim',
  'before-replay',
  'after-replay',
  'before-projection',
  'after-projection',
]);

export type RecoveryFailureFamily = 'FC-INPUT' | 'FC-SUBJECT' | 'FC-FENCE' | 'FC-TRUST' | 'FC-BOUND';
export type LedgerFailure = Readonly<{ family: RecoveryFailureFamily; code: string }>;
export type RecoveryResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: LedgerFailure }>;
type RunStoreBinding = Readonly<{ kind: 'run'; run: string; generation: string }>;
type LedgerRecord = Readonly<{
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
type PreparedLedgerRecord = Readonly<Omit<LedgerRecord, 'event'>>;
type LedgerReadback =
  | Readonly<{ kind: 'committed'; record: LedgerRecord }>
  | Readonly<{ kind: 'absent'; position: number }>
  | Readonly<{ kind: 'competing'; record: LedgerRecord }>
  | Readonly<{ kind: 'integrity-failure'; record: LedgerRecord }>;
export type RecoverySnapshot = Readonly<{ position: number; digest: string; projection: CanonicalJson }>;
export type RecoveryProjection = Readonly<{
  position: number;
  digest: string;
  state: AuthorityState;
  decisions: readonly ProposedTransition[];
  stateDigest: string;
  decisionDigest: string;
}>;
export type RecoveryObservation = Readonly<{
  generation: string;
  position: number;
  digest: string;
  snapshot: 'absent' | 'used' | 'discarded';
}>;

type RecoveryLedger = Readonly<{
  append(
    request: Readonly<{ binding: RunStoreBinding; expectedPosition: number; record: PreparedLedgerRecord }>,
  ): RecoveryResult<LedgerRecord>;
  readback(
    request: Readonly<{ binding: RunStoreBinding; position: number; transaction: string; contentDigest: string }>,
  ): RecoveryResult<LedgerReadback>;
}>;
type ClaimInput = Readonly<{
  ledger: Pick<RecoveryLedger, 'append'>;
  binding: RunStoreBinding;
  generation: string;
  recoveryToken: string;
  expectedPosition: number;
  previousDigest: string;
}>;
type LostClaimInput = Readonly<{
  ledger: RecoveryLedger;
  binding: RunStoreBinding;
  record: PreparedLedgerRecord;
}>;

const failure = (family: RecoveryFailureFamily, code: string): RecoveryResult<never> => ({
  ok: false,
  error: { family, code },
});
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const position = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const expectedPosition = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= -1;
const freeze = <T>(value: T): T => Object.freeze(value);

function createLedgerRecord(
  input: Omit<PreparedLedgerRecord, 'version' | 'contentDigest'>,
): RecoveryResult<PreparedLedgerRecord> {
  if (!position(input.position) || !digest(input.previousDigest) || !encodeFrame(input.content).ok)
    return failure('FC-INPUT', 'INVALID_PREPARED_RECORD');
  const staged = stageDigest({
    domain: 'LEDGER-RECORD',
    excludePaths: ['contentDigest', 'event'],
    value: { ...input, event: '', version: LEDGER_VERSION, contentDigest: '' },
  });
  return staged.ok
    ? { ok: true, value: freeze({ version: LEDGER_VERSION, ...input, contentDigest: staged.value.digest }) }
    : failure('FC-INPUT', 'INVALID_PREPARED_RECORD');
}

function own(value: unknown, keys: readonly string[]): Record<string, unknown> | undefined {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    if (
      Object.keys(descriptors).length !== keys.length ||
      !keys.every((key) => descriptors[key] !== undefined && 'value' in descriptors[key]) ||
      !Object.keys(descriptors).every((key) => keys.includes(key))
    )
      return undefined;
    return freeze(Object.fromEntries(keys.map((key) => [key, descriptors[key]?.value])));
  } catch {
    return undefined;
  }
}

function ownOptional(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
): Record<string, unknown> | undefined {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const allowed = [...required, ...optional];
    if (
      !required.every((key) => descriptors[key] !== undefined && 'value' in descriptors[key]) ||
      !Object.keys(descriptors).every((key) => allowed.includes(key)) ||
      !Object.values(descriptors).every((descriptor) => 'value' in descriptor)
    )
      return undefined;
    return freeze(Object.fromEntries(Object.keys(descriptors).map((key) => [key, descriptors[key]?.value])));
  } catch {
    return undefined;
  }
}

function ownArray(value: unknown): readonly unknown[] | undefined {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const length = descriptors.length;
    if (
      !length ||
      !('value' in length) ||
      typeof length.value !== 'number' ||
      !Number.isSafeInteger(length.value) ||
      length.value < 0
    )
      return undefined;
    const entries: unknown[] = [];
    for (let index = 0; index < length.value; index += 1) {
      const entry = descriptors[String(index)];
      if (!entry || !('value' in entry)) return undefined;
      entries.push(entry.value);
    }
    return freeze(entries);
  } catch {
    return undefined;
  }
}

function binding(value: unknown): RunStoreBinding | undefined {
  const candidate = own(value, ['kind', 'run', 'generation']);
  if (
    candidate?.kind !== 'run' ||
    typeof candidate.run !== 'string' ||
    typeof candidate.generation !== 'string' ||
    !parseIdentity('ID-RUN', candidate.run).ok ||
    !parseIdentity('ID-GEN', candidate.generation).ok ||
    !candidate.generation.startsWith(`${candidate.run}/gen/`)
  )
    return undefined;
  return freeze({ kind: 'run', run: candidate.run, generation: candidate.generation });
}

function waitWithinBound(value: unknown): RecoveryResult<void> {
  if (value === undefined) return { ok: true, value: undefined };
  const candidate = own(value, ['elapsedMs', 'limitMs']);
  if (!candidate || !position(candidate.elapsedMs) || !position(candidate.limitMs))
    return failure('FC-INPUT', 'INVALID_BND_WAIT_LEDGER');
  if (candidate.limitMs < WAIT_MIN_MS || candidate.limitMs > WAIT_MAX_MS)
    return failure('FC-INPUT', 'INVALID_BND_WAIT_LEDGER');
  return candidate.elapsedMs > candidate.limitMs
    ? failure('FC-BOUND', 'BND_WAIT_LEDGER_EXHAUSTED')
    : { ok: true, value: undefined };
}

function record(value: unknown, run: string): LedgerRecord | undefined {
  const candidate = own(value, [
    'version',
    'run',
    'generation',
    'transaction',
    'event',
    'position',
    'previousDigest',
    'content',
    'contentDigest',
  ]);
  if (
    !candidate ||
    candidate.version !== LEDGER_VERSION ||
    candidate.run !== run ||
    typeof candidate.generation !== 'string' ||
    typeof candidate.transaction !== 'string' ||
    typeof candidate.event !== 'string' ||
    !position(candidate.position) ||
    !digest(candidate.previousDigest) ||
    !digest(candidate.contentDigest) ||
    !parseIdentity('ID-GEN', candidate.generation).ok ||
    !candidate.generation.startsWith(`${run}/gen/`) ||
    candidate.event !== `${run}/event/${candidate.position + 1}` ||
    !candidate.transaction.startsWith(`${run}/txn/${candidate.position + 1}/${candidate.generation}|`) ||
    !encodeFrame(candidate.content as CanonicalJson).ok
  )
    return undefined;
  const prepared = createLedgerRecord({
    run,
    generation: candidate.generation,
    transaction: candidate.transaction,
    position: candidate.position,
    previousDigest: candidate.previousDigest,
    content: candidate.content as CanonicalJson,
  });
  if (!prepared.ok || prepared.value.contentDigest !== candidate.contentDigest) return undefined;
  return freeze({
    version: LEDGER_VERSION,
    run,
    generation: candidate.generation,
    transaction: candidate.transaction,
    event: candidate.event,
    position: candidate.position,
    previousDigest: candidate.previousDigest,
    content: candidate.content as CanonicalJson,
    contentDigest: candidate.contentDigest,
  });
}

function snapshot(value: unknown): RecoverySnapshot | undefined {
  const candidate = own(value, ['position', 'digest', 'projection']);
  if (
    !candidate ||
    !position(candidate.position) ||
    !digest(candidate.digest) ||
    !encodeFrame(candidate.projection as CanonicalJson).ok
  )
    return undefined;
  return freeze({
    position: candidate.position,
    digest: candidate.digest,
    projection: candidate.projection as CanonicalJson,
  });
}

type GenerationControl =
  | Readonly<{ kind: 'not-claim' }>
  | Readonly<{ kind: 'claim'; token: string }>
  | Readonly<{ kind: 'operation-head'; position: number; digest: string }>
  | Readonly<{ kind: 'malformed' }>;

function generationControl(value: LedgerRecord): GenerationControl {
  try {
    if (typeof value.content !== 'object' || value.content === null || Array.isArray(value.content))
      return freeze({ kind: 'not-claim' });
    const descriptors = Object.getOwnPropertyDescriptors(value.content);
    if (descriptors.schema?.value === 'jig.operation-head.v1') {
      if (
        Object.keys(descriptors).length !== 3 ||
        descriptors.position === undefined ||
        descriptors.digest === undefined ||
        !position(descriptors.position.value) ||
        !digest(descriptors.digest.value)
      )
        return freeze({ kind: 'malformed' });
      return freeze({
        kind: 'operation-head',
        position: descriptors.position.value,
        digest: descriptors.digest.value,
      });
    }
    const shaped = descriptors.recovery !== undefined || descriptors.token !== undefined;
    if (!shaped) return freeze({ kind: 'not-claim' });
    if (
      Object.keys(descriptors).length !== 2 ||
      Object.keys(descriptors).some((key) => key !== 'recovery' && key !== 'token') ||
      descriptors.recovery?.value !== 'generation-claim' ||
      !digest(descriptors.token?.value)
    )
      return freeze({ kind: 'malformed' });
    return freeze({ kind: 'claim', token: descriptors.token.value });
  } catch {
    return freeze({ kind: 'malformed' });
  }
}

function replayStep(value: LedgerRecord): Readonly<{ event: unknown; bindings: unknown }> | undefined {
  const content = own(value.content, ['schema', 'event', 'bindings']);
  if (!content || (content.schema !== 'jig.transition.v1' && content.schema !== 'jig.transition.v0')) return undefined;
  // v0 and v1 have the same semantic fields; upcasting happens only in this recovered view.
  return freeze({ event: content.event, bindings: content.bindings });
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((entry, index) => entry === right[index]);
}

function canonicalProjection(
  position: number,
  digest: string,
  state: AuthorityState,
  decisions: readonly ProposedTransition[],
): CanonicalJson | undefined {
  try {
    const value = JSON.parse(JSON.stringify({ position, digest, state, decisions })) as CanonicalJson;
    return encodeFrame(value).ok ? value : undefined;
  } catch {
    return undefined;
  }
}

function replayProjection(
  initialState: AuthorityState,
  records: readonly LedgerRecord[],
  generationControlPositions: ReadonlySet<number>,
  position: number,
  digest: string,
): RecoveryResult<CanonicalJson> {
  const steps = records
    .filter((entry) => entry.position <= position && !generationControlPositions.has(entry.position))
    .map(replayStep);
  if (steps.some((step) => step === undefined)) return failure('FC-INPUT', 'UNKNOWN_TRANSITION_SCHEMA');
  const replayed = replayAuthority(initialState, steps);
  if (!replayed.ok)
    return failure(replayed.error.failure === 'FC-FENCE' ? 'FC-FENCE' : 'FC-INPUT', 'INVALID_TRANSITION');
  const state = replayed.value.at(-1)?.next ?? initialState;
  const projected = canonicalProjection(position, digest, state, replayed.value);
  return projected ? { ok: true, value: projected } : failure('FC-INPUT', 'INVALID_PROJECTION');
}

/**
 * Private recovery seam. It accepts only a copied ledger read, verifies every byte-equivalent
 * record against the GF-010 contract, and returns a disposable projection. It dispatches nothing.
 */
export function recoverFencedRun(input: unknown): RecoveryResult<
  Readonly<{
    projection: RecoveryProjection;
    observation: RecoveryObservation;
    snapshot: 'absent' | 'used' | 'discarded';
    pendingEffects: readonly OperationProjection[];
  }>
> {
  const candidate = ownOptional(
    input,
    ['ledger', 'binding', 'generation', 'recoveryToken', 'records', 'head', 'claim', 'initialState'],
    ['snapshot', 'wait', 'crashAt', 'operationState'],
  );
  if (!candidate) return failure('FC-INPUT', 'INVALID_RECOVERY_INPUT');
  const recoveredBinding = binding(candidate.binding);
  const records = ownArray(candidate.records);
  const head = own(candidate.head, ['position', 'digest']);
  const bounded = waitWithinBound(candidate.wait);
  if (!bounded.ok) return bounded;
  if (
    !recoveredBinding ||
    !records ||
    !head ||
    !expectedPosition(head.position) ||
    !digest(head.digest) ||
    typeof candidate.generation !== 'string' ||
    !parseIdentity('ID-GEN', candidate.generation).ok ||
    !candidate.generation.startsWith(`${recoveredBinding.run}/gen/`) ||
    !digest(candidate.recoveryToken)
  )
    return failure('FC-INPUT', 'INVALID_RECOVERY_INPUT');
  if (
    candidate.crashAt !== undefined &&
    (typeof candidate.crashAt !== 'string' || !CRASH_POINTS.has(candidate.crashAt))
  )
    return failure('FC-INPUT', 'INVALID_RECOVERY_INPUT');
  if (candidate.crashAt === 'before-claim') return failure('FC-TRUST', 'RECOVERY_REQUIRED');

  const normalized = records.map((entry) => record(entry, recoveredBinding.run));
  if (normalized.some((entry) => entry === undefined)) return failure('FC-INPUT', 'INVALID_RECORD');
  const ordered = [...(normalized as LedgerRecord[])].sort((left, right) => left.position - right.position);
  let previousDigest = GENESIS_DIGEST;
  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    if (!current || current.position !== index || current.previousDigest !== previousDigest)
      return failure('FC-TRUST', 'BROKEN_CHAIN');
    previousDigest = current.contentDigest;
  }
  const verifiedHead = ordered.at(-1);
  const verifiedPosition = verifiedHead?.position ?? -1;
  const verifiedDigest = verifiedHead?.contentDigest ?? GENESIS_DIGEST;
  if (head.position !== verifiedPosition || head.digest !== verifiedDigest)
    return failure('FC-TRUST', 'WITNESS_MISMATCH');

  const controls = ordered.map((entry) => freeze({ position: entry.position, control: generationControl(entry) }));
  if (controls.some((entry) => entry.control.kind === 'malformed'))
    return failure('FC-FENCE', 'MALFORMED_GENERATION_CLAIM');
  const generationControlPositions = new Set(
    controls
      .filter((entry) => entry.control.kind === 'claim' || entry.control.kind === 'operation-head')
      .map((entry) => entry.position),
  );

  const claimed = record(candidate.claim, recoveredBinding.run);
  const claimedControl = claimed ? generationControl(claimed) : undefined;
  if (
    !claimed ||
    !ordered.some((entry) => entry.contentDigest === claimed.contentDigest) ||
    claimed.generation !== candidate.generation ||
    claimedControl?.kind !== 'claim' ||
    claimedControl.token !== candidate.recoveryToken ||
    typeof candidate.ledger !== 'object' ||
    candidate.ledger === null
  )
    return failure('FC-FENCE', 'GENERATION_CLAIM_UNVERIFIED');
  let claimReadback: ReturnType<RecoveryLedger['readback']>;
  try {
    claimReadback = (candidate.ledger as RecoveryLedger).readback({
      binding: freeze({ kind: 'run', run: recoveredBinding.run, generation: candidate.generation }),
      position: claimed.position,
      transaction: claimed.transaction,
      contentDigest: claimed.contentDigest,
    });
  } catch {
    return failure('FC-TRUST', 'RECOVERY_REQUIRED');
  }
  if (!claimReadback.ok) return claimReadback;
  if (claimReadback.value.kind !== 'committed' || claimReadback.value.record.contentDigest !== claimed.contentDigest)
    return failure('FC-FENCE', 'GENERATION_CLAIM_UNVERIFIED');
  if (candidate.crashAt === 'after-claim') return failure('FC-TRUST', 'RECOVERY_REQUIRED');

  const requestedSnapshot = candidate.snapshot === undefined ? undefined : snapshot(candidate.snapshot);
  if (candidate.snapshot !== undefined && !requestedSnapshot) return failure('FC-INPUT', 'INVALID_SNAPSHOT');
  if (candidate.crashAt === 'before-replay') return failure('FC-TRUST', 'RECOVERY_REQUIRED');
  const projectionCanonical = replayProjection(
    candidate.initialState as AuthorityState,
    ordered,
    generationControlPositions,
    verifiedPosition,
    verifiedDigest,
  );
  if (!projectionCanonical.ok) return projectionCanonical;
  if (candidate.crashAt === 'after-replay') return failure('FC-TRUST', 'RECOVERY_REQUIRED');
  let effectiveProjection = projectionCanonical.value;
  const replayedProjection = effectiveProjection as unknown as Readonly<{
    position: number;
    digest: string;
    state: AuthorityState;
    decisions: readonly ProposedTransition[];
  }>;
  if (!replayedProjection.decisions.length) return failure('FC-INPUT', 'MISSING_TRANSITION');
  let snapshotStatus: RecoveryObservation['snapshot'] = 'absent';
  if (requestedSnapshot) {
    const covered =
      requestedSnapshot.position <= verifiedPosition &&
      ordered[requestedSnapshot.position]?.contentDigest === requestedSnapshot.digest
        ? replayProjection(
            candidate.initialState as AuthorityState,
            ordered,
            generationControlPositions,
            requestedSnapshot.position,
            requestedSnapshot.digest,
          )
        : undefined;
    const expected = covered?.ok ? encodeFrame(covered.value) : undefined;
    const supplied = encodeFrame(requestedSnapshot.projection);
    if (expected?.ok && supplied.ok && sameBytes(expected.value, supplied.value)) {
      effectiveProjection = requestedSnapshot.projection;
      snapshotStatus = 'used';
    } else snapshotStatus = 'discarded';
  }
  const projected = effectiveProjection as unknown as Readonly<{
    position: number;
    digest: string;
    state: AuthorityState;
    decisions: readonly ProposedTransition[];
  }>;
  const projectionDigest = stageDigest({ domain: 'RECOVERY-PROJECTION', excludePaths: [], value: effectiveProjection });
  if (!projectionDigest.ok) return failure('FC-INPUT', 'INVALID_PROJECTION');
  const decisionDigest = stageDigest({
    domain: 'RECOVERY-DECISIONS',
    excludePaths: [],
    value: JSON.parse(JSON.stringify(projected.decisions)) as CanonicalJson,
  });
  if (!decisionDigest.ok) return failure('FC-INPUT', 'INVALID_PROJECTION');
  if (candidate.crashAt === 'before-projection' || candidate.crashAt === 'after-projection')
    return failure('FC-TRUST', 'RECOVERY_REQUIRED');
  const projection = freeze({
    ...projected,
    stateDigest: projectionDigest.value.digest,
    decisionDigest: decisionDigest.value.digest,
  });
  const authorizedOperations = projected.decisions.flatMap((decision) => decision.operations);
  if (authorizedOperations.length > 0 && candidate.operationState === undefined)
    return failure('FC-TRUST', 'OPERATION_JOURNAL_REQUIRED');
  let pendingEffects: readonly OperationProjection[] = freeze([]);
  if (candidate.operationState !== undefined) {
    const operationState = own(candidate.operationState, ['snapshot', 'seal']);
    if (!operationState) return failure('FC-TRUST', 'OPERATION_JOURNAL_UNVERIFIED');
    const latestHead = controls.filter((entry) => entry.control.kind === 'operation-head').at(-1);
    const restored = restoreOperationJournal(operationState.snapshot, operationState.seal, {
      verify: (proof) => {
        const carrier = ordered[proof.position];
        return carrier &&
          carrier.event === proof.event &&
          carrier.transaction === proof.transaction &&
          carrier.contentDigest === proof.recordDigest &&
          proof.recordDigest === proof.witnessDigest
          ? { ok: true, value: undefined }
          : { ok: false, error: { family: 'FC-TRUST', code: 'OPERATION_COMMIT_PROOF_MISMATCH' } };
      },
      verifySeal: (seal) => {
        const carrier = ordered[seal.proof.position];
        const headContent = carrier ? own(carrier.content, ['schema', 'position', 'digest']) : undefined;
        return carrier &&
          carrier.event === seal.proof.event &&
          carrier.transaction === seal.proof.transaction &&
          carrier.contentDigest === seal.proof.recordDigest &&
          seal.proof.recordDigest === seal.proof.witnessDigest &&
          headContent?.schema === 'jig.operation-head.v1' &&
          headContent.position === seal.position &&
          headContent.digest === seal.digest &&
          latestHead?.position === carrier.position &&
          latestHead.control.kind === 'operation-head' &&
          latestHead.control.position === seal.position &&
          latestHead.control.digest === seal.digest
          ? { ok: true, value: undefined }
          : { ok: false, error: { family: 'FC-TRUST', code: 'OPERATION_HEAD_PROOF_MISMATCH' } };
      },
    });
    if (!restored.ok) return failure('FC-TRUST', 'OPERATION_JOURNAL_UNVERIFIED');
    const operationSnapshot = operationState.snapshot as OperationJournalSnapshot;
    const journalIntentIds: string[] = [];
    for (const entry of operationSnapshot.entries) {
      const proof = entry.record.proof;
      const carrier = ordered[proof.position];
      if (
        !carrier ||
        carrier.event !== proof.event ||
        carrier.transaction !== proof.transaction ||
        carrier.contentDigest !== proof.recordDigest ||
        proof.recordDigest !== proof.witnessDigest
      )
        return failure('FC-TRUST', 'OPERATION_COMMIT_PROOF_MISMATCH');
      if (entry.record.kind === 'intent') {
        journalIntentIds.push(entry.record.operation);
        const decisionOperation = authorizedOperations.find(
          (operation) => operation.operation === entry.record.operation,
        );
        if (
          !decisionOperation ||
          decisionOperation.type !== entry.record.type ||
          decisionOperation.transaction !== entry.record.transaction ||
          decisionOperation.event !== entry.record.event ||
          decisionOperation.subject.run !== entry.record.subject.run ||
          decisionOperation.subject.story !== entry.record.subject.story ||
          decisionOperation.subject.basis !== entry.record.subject.basis ||
          decisionOperation.fence.generation !== entry.record.fence.generation ||
          decisionOperation.fence.basis !== entry.record.fence.basis
        )
          return failure('FC-TRUST', 'OPERATION_INTENT_NOT_AUTHORIZED');
      }
    }
    const authorizedIds = authorizedOperations.map((operation) => operation.operation).sort();
    if (
      journalIntentIds.length !== authorizedIds.length ||
      journalIntentIds.sort().some((operation, index) => operation !== authorizedIds[index])
    )
      return failure('FC-TRUST', 'OPERATION_JOURNAL_COVERAGE_MISMATCH');
    pendingEffects = restored.value.pendingEffects();
  }
  const observation = freeze({
    generation: candidate.generation,
    position: verifiedPosition,
    digest: verifiedDigest,
    snapshot: snapshotStatus,
  });
  return {
    ok: true,
    value: freeze({ projection, observation, snapshot: snapshotStatus, pendingEffects }),
  };
}

export function claimRecoveryGeneration(input: unknown): RecoveryResult<LedgerRecord> {
  const candidate = own(input, [
    'ledger',
    'binding',
    'generation',
    'recoveryToken',
    'expectedPosition',
    'previousDigest',
  ]);
  const claimBinding = candidate ? binding(candidate.binding) : undefined;
  if (
    !candidate ||
    !claimBinding ||
    typeof candidate.generation !== 'string' ||
    candidate.generation !== claimBinding.generation ||
    !parseIdentity('ID-GEN', candidate.generation).ok ||
    !digest(candidate.recoveryToken) ||
    !expectedPosition(candidate.expectedPosition) ||
    !digest(candidate.previousDigest) ||
    typeof candidate.ledger !== 'object' ||
    candidate.ledger === null
  )
    return failure('FC-INPUT', 'INVALID_GENERATION_CLAIM');
  const ledger = candidate.ledger as ClaimInput['ledger'];
  const proposal = createLedgerRecord({
    run: claimBinding.run,
    generation: claimBinding.generation,
    transaction: `${claimBinding.run}/txn/${candidate.expectedPosition + 2}/${claimBinding.generation}|${candidate.recoveryToken}`,
    position: candidate.expectedPosition + 1,
    previousDigest: candidate.previousDigest,
    content: { recovery: 'generation-claim', token: candidate.recoveryToken },
  });
  if (!proposal.ok) return proposal;
  try {
    const appended = ledger.append({
      binding: claimBinding,
      expectedPosition: candidate.expectedPosition,
      record: proposal.value,
    });
    return !appended.ok && appended.error.family === 'FC-FENCE'
      ? failure('FC-FENCE', 'GENERATION_CLAIM_STALE')
      : appended;
  } catch {
    return failure('FC-TRUST', 'RECOVERY_REQUIRED');
  }
}

export function resolveLostClaimAcknowledgement(input: unknown): RecoveryResult<LedgerRecord> {
  const candidate = own(input, ['ledger', 'binding', 'record']);
  const claimBinding = candidate ? binding(candidate.binding) : undefined;
  const rawRecord = candidate
    ? ownOptional(
        candidate.record,
        ['version', 'run', 'generation', 'transaction', 'position', 'previousDigest', 'content', 'contentDigest'],
        ['event'],
      )
    : undefined;
  const prepared = rawRecord
    ? createLedgerRecord({
        run: rawRecord.run as string,
        generation: rawRecord.generation as string,
        transaction: rawRecord.transaction as string,
        position: rawRecord.position as number,
        previousDigest: rawRecord.previousDigest as string,
        content: rawRecord.content as CanonicalJson,
      })
    : undefined;
  if (!candidate || !claimBinding || !prepared?.ok || typeof candidate.ledger !== 'object' || candidate.ledger === null)
    return failure('FC-INPUT', 'INVALID_LOST_CLAIM');
  if (rawRecord?.version !== LEDGER_VERSION || rawRecord.contentDigest !== prepared.value.contentDigest)
    return failure('FC-INPUT', 'INVALID_LOST_CLAIM');
  const ledger = candidate.ledger as LostClaimInput['ledger'];
  try {
    const readback = ledger.readback({
      binding: claimBinding,
      position: prepared.value.position,
      transaction: prepared.value.transaction,
      contentDigest: prepared.value.contentDigest,
    });
    if (!readback.ok) return readback;
    if (readback.value.kind === 'committed') return { ok: true, value: readback.value.record };
    if (readback.value.kind === 'absent') return failure('FC-FENCE', 'GENERATION_CLAIM_RETRY_REQUIRED');
    if (readback.value.kind === 'competing') return failure('FC-FENCE', 'GENERATION_CLAIM_COMPETING');
    return failure('FC-TRUST', 'GENERATION_CLAIM_INTEGRITY_FAILURE');
  } catch {
    return failure('FC-TRUST', 'RECOVERY_REQUIRED');
  }
}
