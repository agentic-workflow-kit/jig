import {
  type AppendRequest,
  createLedgerRecord,
  type LedgerRecord,
  type Readback,
  type ReadbackRequest,
  type RunStoreBinding,
} from '@agentic-workflow-kit/jig-runtime-contracts';
import { createLocalFileWitness, type WitnessHead } from './local-file-witness.js';
import {
  ensureConfinedDirectory,
  type FileMechanismResult,
  fail,
  type IndependentRootEvidence,
  isDigest,
  isPosition,
  listConfinedFiles,
  ok,
  readJsonFile,
  resourceKey,
  verifySeparateRoots,
  writeCreateOnlyJson,
} from './path-confinement.js';

export const LOCAL_FILE_LEDGER_PROVIDER_IDENTITY = 'local-file-ledger-provider/v1';
export const LOCAL_FILE_LEDGER_MANIFEST_DIGEST = '80fa6ad9e8b06e2cb0c78864ee12ec9a990d7677b37533665d17d0520b680d7d';
export const LOCAL_FILE_LEDGER_MANIFEST_ID =
  'provider/073c62ae4abcbc443acf11f78151943758eb1a1f91fddee12c22b204dc6d0351/authority/80fa6ad9e8b06e2cb0c78864ee12ec9a990d7677b37533665d17d0520b680d7d';
export const LOCAL_FILE_LEDGER_ROOT = '/Users/aryekogan/.local/share/jig/state';
export const LOCAL_FILE_WITNESS_ROOT = '/Volumes/JigWitness/jig';
export const LOCAL_FILE_LEDGER_MANIFEST = new TextEncoder().encode(
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[{"access":["append","create","read"],"commit":"same-root-create-if-absent-non-replacing","confinement":["canonical-path","regular-file-only","reject-symlink","reject-traversal","toctou-fail-closed"],"root":"/Users/aryekogan/.local/share/jig/state/intake-preflight"},{"access":["append","create","read"],"commit":"same-root-create-if-absent-non-replacing","confinement":["canonical-path","regular-file-only","reject-symlink","reject-traversal","toctou-fail-closed"],"root":"/Users/aryekogan/.local/share/jig/state/registries"},{"access":["append","create","read"],"commit":"same-root-create-if-absent-non-replacing","confinement":["canonical-path","regular-file-only","reject-symlink","reject-traversal","toctou-fail-closed"],"root":"/Users/aryekogan/.local/share/jig/state/run-ledgers"},{"access":["create","read"],"confinement":["canonical-path","regular-file-only","reject-symlink","reject-traversal","toctou-fail-closed"],"root":"/Users/aryekogan/.local/share/jig/state/snapshots","semantics":"non-authoritative-verified-replay-only"},{"access":["append","create","read"],"backupSeparation":"excluded-from-primary-filesystem-backups","commit":"same-root-create-if-absent-non-replacing","confinement":["canonical-path","regular-file-only","reject-symlink","reject-traversal","toctou-fail-closed"],"root":"/Volumes/JigWitness/jig","trustBasis":"separately-administered-witness-filesystem"}],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":[],"networkAuthority":[],"providerIdentity":"local-file-ledger-provider/v1","runtimeAuthority":{"environment":"local-os-user-execution-context","kind":"node-local-file-provider","package":"packages/local-file-providers"},"scope":{"phase":2,"purpose":"local-file-ledger-registry-witness-provider","story":"GF-025"},"subprocessAuthority":[]}\n',
);

export type LocalFileLedgerFailure = Readonly<{
  family: 'FC-MECHANISM';
  code: 'PROVIDER_UNAVAILABLE_WITNESS' | 'PROVIDER_UNAVAILABLE_UNQUALIFIED';
}>;
export type LocalFileLedgerResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: LocalFileLedgerFailure }>;

/** No live store is constructible until the exact witness root and candidate-bound qualification are both current. */
export function createQualifiedLocalFileLedgerProvider(_input?: unknown): LocalFileLedgerResult<never> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ family: 'FC-MECHANISM', code: 'PROVIDER_UNAVAILABLE_WITNESS' }),
  });
}

const GENESIS: WitnessHead = Object.freeze({ position: -1, digest: '0'.repeat(64) });
const WAIT_DEFAULT_MS = 30_000;
const WAIT_MIN_MS = 1_000;
const WAIT_MAX_MS = 300_000;

function wait(value: unknown): FileMechanismResult<void> {
  if (value === undefined) return ok(undefined);
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return fail('FC-INPUT', 'INVALID_BND_WAIT_LEDGER');
    const elapsedMs = Object.getOwnPropertyDescriptor(value, 'elapsedMs')?.value;
    const limitValue = Object.getOwnPropertyDescriptor(value, 'limitMs')?.value;
    const limitMs = limitValue ?? WAIT_DEFAULT_MS;
    if (
      typeof elapsedMs !== 'number' ||
      !Number.isSafeInteger(elapsedMs) ||
      elapsedMs < 0 ||
      typeof limitMs !== 'number' ||
      !Number.isSafeInteger(limitMs) ||
      limitMs < WAIT_MIN_MS ||
      limitMs > WAIT_MAX_MS
    )
      return fail('FC-INPUT', 'INVALID_BND_WAIT_LEDGER');
    return elapsedMs > limitMs ? fail('FC-FENCE', 'BND_WAIT_LEDGER_EXHAUSTED') : ok(undefined);
  } catch {
    return fail('FC-INPUT', 'INVALID_BND_WAIT_LEDGER');
  }
}

function binding(value: unknown): FileMechanismResult<RunStoreBinding> {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return fail('FC-SUBJECT', 'INVALID_STORE_BINDING');
    const keys = Object.getOwnPropertyNames(value).sort().join(',');
    const kind = Object.getOwnPropertyDescriptor(value, 'kind')?.value;
    const run = Object.getOwnPropertyDescriptor(value, 'run')?.value;
    const generation = Object.getOwnPropertyDescriptor(value, 'generation')?.value;
    if (
      keys !== 'generation,kind,run' ||
      kind !== 'run' ||
      typeof run !== 'string' ||
      typeof generation !== 'string' ||
      !/^run-[0-9]{12}-[0-9a-f]{16}$/u.test(run) ||
      !generation.startsWith(`${run}/gen/`)
    )
      return fail('FC-SUBJECT', 'INVALID_STORE_BINDING');
    return ok(Object.freeze({ kind: 'run', run, generation }));
  } catch {
    return fail('FC-SUBJECT', 'INVALID_STORE_BINDING');
  }
}

function verifiedRecord(value: unknown, index: number, previousDigest: string): FileMechanismResult<LedgerRecord> {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail('FC-TRUST', 'BROKEN_CHAIN');
    const record = value as LedgerRecord;
    const keys = Object.getOwnPropertyNames(value).sort().join(',');
    if (
      keys !== 'content,contentDigest,event,generation,position,previousDigest,run,transaction,version' ||
      record.version !== 'jig.ledger.v1' ||
      record.position !== index ||
      record.previousDigest !== previousDigest ||
      record.event !== `${record.run}/event/${index + 1}`
    )
      return fail('FC-TRUST', 'BROKEN_CHAIN');
    const prepared = createLedgerRecord({
      run: record.run,
      generation: record.generation,
      transaction: record.transaction,
      position: record.position,
      previousDigest: record.previousDigest,
      content: record.content,
    });
    if (!prepared.ok || prepared.value.contentDigest !== record.contentDigest) return fail('FC-TRUST', 'BROKEN_CHAIN');
    return ok(Object.freeze({ ...record, content: prepared.value.content }));
  } catch {
    return fail('FC-TRUST', 'BROKEN_CHAIN');
  }
}

function generationOrdinal(generation: string): number | undefined {
  const value = Number(/\/gen\/([0-9]+)\|/u.exec(generation)?.[1]);
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function isGenerationClaim(content: unknown): boolean {
  try {
    if (typeof content !== 'object' || content === null || Array.isArray(content)) return false;
    const descriptors = Object.getOwnPropertyDescriptors(content);
    return (
      Object.keys(descriptors).sort().join(',') === 'recovery,token' &&
      descriptors.recovery?.value === 'generation-claim' &&
      isDigest(descriptors.token?.value)
    );
  } catch {
    return false;
  }
}

export function createLocalFileRunLedgerForConformance(
  ledgerRoot: string,
  witnessRoot: string,
  independenceEvidence?: IndependentRootEvidence,
) {
  const independent = verifySeparateRoots(ledgerRoot, witnessRoot, independenceEvidence);
  const witness = createLocalFileWitness(witnessRoot);
  const recordsFor = (run: string): FileMechanismResult<readonly LedgerRecord[]> => {
    const directory = [resourceKey(run), 'records'];
    const prepared = ensureConfinedDirectory(ledgerRoot, directory);
    if (!prepared.ok) return prepared;
    const files = listConfinedFiles(ledgerRoot, directory);
    if (!files.ok) return files;
    const records: LedgerRecord[] = [];
    let previous = GENESIS.digest;
    for (let index = 0; index < files.value.length; index += 1) {
      const name = files.value[index];
      if (!name || name !== `${String(index).padStart(12, '0')}.json`) return fail('FC-TRUST', 'LEDGER_FORK');
      const decoded = readJsonFile(ledgerRoot, [...directory, name]);
      if (!decoded.ok) return fail('FC-TRUST', 'BROKEN_CHAIN');
      const record = verifiedRecord(decoded.value, index, previous);
      if (!record.ok || record.value.run !== run) return fail('FC-TRUST', 'BROKEN_CHAIN');
      records.push(record.value);
      previous = record.value.contentDigest;
    }
    return ok(Object.freeze(records));
  };
  const head = (records: readonly LedgerRecord[]): WitnessHead => {
    const last = records.at(-1);
    return Object.freeze(last ? { position: last.position, digest: last.contentDigest } : { ...GENESIS });
  };
  const trustedHead = (run: string, records: readonly LedgerRecord[]): FileMechanismResult<WitnessHead> => {
    const ledgerHead = head(records);
    const witnessed = witness.read(`run:${run}`);
    if (!witnessed.ok) return witnessed;
    if (witnessed.value.position > ledgerHead.position) return fail('FC-TRUST', 'WITNESS_AHEAD');
    if (witnessed.value.position < ledgerHead.position) return fail('FC-TRUST', 'WITNESS_BEHIND');
    if (witnessed.value.digest !== ledgerHead.digest) return fail('FC-TRUST', 'WITNESS_MISMATCH');
    return ok(ledgerHead);
  };

  return Object.freeze({
    append(
      request: AppendRequest,
      fault?: 'before-append' | 'after-flush' | 'after-witness' | 'lost-ack',
    ): FileMechanismResult<LedgerRecord> {
      if (!independent.ok) return independent;
      const bounded = wait(request?.wait);
      if (!bounded.ok) return bounded;
      const bound = binding(request?.binding);
      if (!bound.ok) return bound;
      const records = recordsFor(bound.value.run);
      if (!records.ok) return records;
      const prepared = createLedgerRecord({
        run: request.record.run,
        generation: request.record.generation,
        transaction: request.record.transaction,
        position: request.record.position,
        previousDigest: request.record.previousDigest,
        content: request.record.content,
      });
      if (!prepared.ok || prepared.value.contentDigest !== request.record.contentDigest)
        return fail('FC-INPUT', 'INVALID_PREPARED_RECORD');
      const current = head(records.value);
      if (
        request.expectedPosition !== current.position ||
        request.record.position !== current.position + 1 ||
        request.record.previousDigest !== current.digest
      )
        return fail('FC-FENCE', 'EXPECTED_HEAD_MISMATCH');
      if (request.record.run !== bound.value.run || request.record.generation !== bound.value.generation)
        return fail('FC-SUBJECT', 'APPEND_BINDING_MISMATCH');
      const lastGeneration = records.value.at(-1)?.generation;
      if (lastGeneration && lastGeneration !== bound.value.generation) {
        const priorOrdinal = generationOrdinal(lastGeneration);
        const nextOrdinal = generationOrdinal(bound.value.generation);
        if (
          !isGenerationClaim(request.record.content) ||
          priorOrdinal === undefined ||
          nextOrdinal === undefined ||
          nextOrdinal <= priorOrdinal
        )
          return fail('FC-FENCE', 'STALE_GENERATION');
      } else if (lastGeneration && isGenerationClaim(request.record.content)) {
        return fail('FC-FENCE', 'DUPLICATE_GENERATION_CLAIM');
      }
      if (fault === 'before-append') return fail('FC-TRUST', 'ACK_LOST');
      const position = request.record.position;
      const record = Object.freeze({ ...request.record, event: `${bound.value.run}/event/${position + 1}` });
      const intent = writeCreateOnlyJson(
        ledgerRoot,
        [resourceKey(bound.value.run), 'intents'],
        `${String(position).padStart(12, '0')}-${record.contentDigest}.json`,
        { run: bound.value.run, generation: bound.value.generation, position, contentDigest: record.contentDigest },
      );
      if (!intent.ok && intent.error.code !== 'ALREADY_EXISTS') return intent;
      const stored = writeCreateOnlyJson(
        ledgerRoot,
        [resourceKey(bound.value.run), 'records'],
        `${String(position).padStart(12, '0')}.json`,
        record,
      );
      if (!stored.ok) return stored;
      if (fault === 'after-flush') return fail('FC-TRUST', 'ACK_LOST');
      const advanced = witness.advance(`run:${bound.value.run}`, current, {
        position,
        digest: record.contentDigest,
      });
      if (!advanced.ok) return advanced;
      if (fault === 'after-witness' || fault === 'lost-ack') return fail('FC-TRUST', 'ACK_LOST');
      return ok(record);
    },
    readback(request: ReadbackRequest, fault?: 'indeterminate-read'): FileMechanismResult<Readback> {
      if (!independent.ok) return independent;
      if (fault === 'indeterminate-read') return fail('FC-TRUST', 'INDETERMINATE_READ');
      const bounded = wait(request?.wait);
      if (!bounded.ok) return bounded;
      const bound = binding(request?.binding);
      if (!bound.ok) return bound;
      if (!isPosition(request.position) || request.position < 0 || !isDigest(request.contentDigest))
        return fail('FC-INPUT', 'INVALID_READBACK');
      if (!request.transaction.startsWith(`${bound.value.run}/txn/${request.position + 1}/${bound.value.generation}|`))
        return fail('FC-SUBJECT', 'INVALID_READBACK_BINDING');
      const records = recordsFor(bound.value.run);
      if (!records.ok) return records;
      const currentGeneration = records.value.at(-1)?.generation;
      if (currentGeneration && currentGeneration !== bound.value.generation)
        return fail('FC-FENCE', 'STALE_GENERATION');
      const trust = trustedHead(bound.value.run, records.value);
      if (!trust.ok) return trust;
      const found = records.value[request.position];
      if (!found) return ok(Object.freeze({ kind: 'absent', position: request.position }));
      if (found.transaction !== request.transaction || found.generation !== bound.value.generation)
        return ok(Object.freeze({ kind: 'competing', record: found }));
      return ok(
        Object.freeze(
          found.contentDigest === request.contentDigest
            ? { kind: 'committed', record: found }
            : { kind: 'integrity-failure', record: found },
        ),
      );
    },
    snapshot(bindingValue: unknown): FileMechanismResult<WitnessHead> {
      if (!independent.ok) return independent;
      const bound = binding(bindingValue);
      if (!bound.ok) return bound;
      const records = recordsFor(bound.value.run);
      if (!records.ok) return records;
      return records.value.length === 0 ? ok(GENESIS) : trustedHead(bound.value.run, records.value);
    },
    advanceWitnessFloor(bindingValue: unknown): FileMechanismResult<void> {
      if (!independent.ok) return independent;
      const bound = binding(bindingValue);
      if (!bound.ok) return bound;
      const records = recordsFor(bound.value.run);
      if (!records.ok) return records;
      const ledgerHead = head(records.value);
      const witnessed = witness.read(`run:${bound.value.run}`);
      if (!witnessed.ok) return witnessed;
      if (witnessed.value.position >= ledgerHead.position) return fail('FC-FENCE', 'WITNESS_ALREADY_CURRENT');
      const target = records.value[witnessed.value.position + 1];
      if (!target) return fail('FC-TRUST', 'BROKEN_CHAIN');
      const advanced = witness.advance(`run:${bound.value.run}`, witnessed.value, {
        position: target.position,
        digest: target.contentDigest,
      });
      return advanced.ok ? ok(undefined) : advanced;
    },
  });
}
