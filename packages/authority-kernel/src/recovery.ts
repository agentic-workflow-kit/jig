import {
  type AuthorityState,
  type ProposedTransition,
  replayAuthority,
} from './index.js';
import { type CanonicalJson, encodeFrame, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import {
  createLedgerRecord,
  LEDGER_VERSION,
  type LedgerFailure,
  type LedgerRecord,
  type PreparedLedgerRecord,
  type RunStoreBinding,
  type ScriptedLedger,
} from '@agentic-workflow-kit/jig-runtime-contracts';

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

export type RecoveryFailureFamily = LedgerFailure['family'];
export type RecoveryResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: LedgerFailure }>;
export type RecoverySnapshot = Readonly<{ position: number; digest: string; projection: CanonicalJson }>;
export type RecoveryProjection = Readonly<{
  position: number;
  digest: string;
  state: AuthorityState;
  decisions: readonly ProposedTransition[];
  stateDigest: string;
}>;
export type RecoveryObservation = Readonly<{
  generation: string;
  position: number;
  digest: string;
  snapshot: 'absent' | 'used' | 'discarded';
}>;

type RecoveryLedger = Pick<ScriptedLedger, 'append' | 'readback'>;
type ClaimInput = Readonly<{
  ledger: Pick<ScriptedLedger, 'append'>;
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

function recoveryClaim(value: LedgerRecord, generation: string, token: string): boolean {
  try {
    if (
      value.generation !== generation ||
      typeof value.content !== 'object' ||
      value.content === null ||
      Array.isArray(value.content)
    )
      return false;
    return (
      Object.getOwnPropertyDescriptor(value.content, 'recovery')?.value === 'generation-claim' &&
      Object.getOwnPropertyDescriptor(value.content, 'token')?.value === token
    );
  } catch {
    return false;
  }
}

function replayStep(value: LedgerRecord): Readonly<{ event: unknown; bindings: unknown }> | undefined {
  const content = own(value.content, ['schema', 'event', 'bindings']);
  if (!content || (content.schema !== 'jig.transition.v1' && content.schema !== 'jig.transition.v0')) return undefined;
  // v0 and v1 have the same semantic fields; upcasting happens only in this recovered view.
  return freeze({ event: content.event, bindings: content.bindings });
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
    pendingEffects: readonly [];
  }>
> {
  const candidate = ownOptional(
    input,
    ['ledger', 'binding', 'generation', 'recoveryToken', 'records', 'head', 'claim', 'initialState'],
    ['snapshot', 'wait', 'crashAt'],
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

  const claimed = record(candidate.claim, recoveredBinding.run);
  if (
    !claimed ||
    !ordered.some((entry) => entry.contentDigest === claimed.contentDigest) ||
    !recoveryClaim(claimed, candidate.generation, candidate.recoveryToken) ||
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
  const snapshotStatus: RecoveryObservation['snapshot'] = requestedSnapshot
    ? requestedSnapshot.position <= verifiedPosition &&
      ordered[requestedSnapshot.position]?.contentDigest === requestedSnapshot.digest
      ? 'used'
      : 'discarded'
    : 'absent';
  const steps = ordered.filter((entry) => entry.contentDigest !== claimed.contentDigest).map(replayStep);
  if (steps.some((step) => step === undefined)) return failure('FC-INPUT', 'UNKNOWN_TRANSITION_SCHEMA');
  if (candidate.crashAt === 'before-replay') return failure('FC-TRUST', 'RECOVERY_REQUIRED');
  const replayed = replayAuthority(candidate.initialState, steps);
  if (!replayed.ok)
    return failure(replayed.error.failure === 'FC-FENCE' ? 'FC-FENCE' : 'FC-INPUT', 'INVALID_TRANSITION');
  if (candidate.crashAt === 'after-replay') return failure('FC-TRUST', 'RECOVERY_REQUIRED');
  const state = replayed.value.at(-1)?.next;
  if (!state) return failure('FC-INPUT', 'MISSING_TRANSITION');
  const projected = { position: verifiedPosition, digest: verifiedDigest, state, decisions: replayed.value };
  const projectionCanonical = JSON.parse(JSON.stringify(projected)) as CanonicalJson;
  const projectionDigest = stageDigest({ domain: 'RECOVERY-PROJECTION', excludePaths: [], value: projectionCanonical });
  if (!projectionDigest.ok) return failure('FC-INPUT', 'INVALID_PROJECTION');
  if (candidate.crashAt === 'before-projection' || candidate.crashAt === 'after-projection')
    return failure('FC-TRUST', 'RECOVERY_REQUIRED');
  const projection = freeze({ ...projected, stateDigest: projectionDigest.value.digest });
  const observation = freeze({
    generation: candidate.generation,
    position: verifiedPosition,
    digest: verifiedDigest,
    snapshot: snapshotStatus,
  });
  return {
    ok: true,
    value: freeze({ projection, observation, snapshot: snapshotStatus, pendingEffects: freeze([]) as readonly [] }),
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
    if (!readback.ok) return failure('FC-TRUST', 'RECOVERY_REQUIRED');
    if (readback.value.kind === 'committed') return { ok: true, value: readback.value.record };
    if (readback.value.kind === 'absent') return failure('FC-FENCE', 'GENERATION_CLAIM_RETRY_REQUIRED');
    if (readback.value.kind === 'competing') return failure('FC-FENCE', 'GENERATION_CLAIM_COMPETING');
    return failure('FC-TRUST', 'GENERATION_CLAIM_INTEGRITY_FAILURE');
  } catch {
    return failure('FC-TRUST', 'RECOVERY_REQUIRED');
  }
}
