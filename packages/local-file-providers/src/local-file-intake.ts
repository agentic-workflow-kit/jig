import type { IntakeReadback, IntakeRequest, IntakeResult } from '@agentic-workflow-kit/jig-runtime-contracts';
import { createLocalFileWitness } from './local-file-witness.js';
import {
  ensureConfinedDirectory,
  type FileMechanismResult,
  fail,
  type IndependentRootEvidence,
  isDigest,
  listConfinedFiles,
  ok,
  readJsonFile,
  stagedDigest,
  verifySeparateRoots,
  writeCreateOnlyJson,
} from './path-confinement.js';

type IntakeEntry = Readonly<{
  position: number;
  previousDigest: string;
  digest: string;
  result: IntakeResult;
}>;
const GENESIS = Object.freeze({ position: -1, digest: '0'.repeat(64) });
const runFor = (position: number, digest: string) => `run-${String(position).padStart(12, '0')}-${digest.slice(0, 16)}`;

export function createLocalFileIntakeForConformance(
  root: string,
  witnessRoot: string,
  independenceEvidence?: IndependentRootEvidence,
) {
  const independent = verifySeparateRoots(root, witnessRoot, independenceEvidence);
  const witness = createLocalFileWitness(witnessRoot);
  const entries = (): FileMechanismResult<readonly IntakeEntry[]> => {
    const prepared = ensureConfinedDirectory(root, ['entries']);
    if (!prepared.ok) return prepared;
    const files = listConfinedFiles(root, ['entries']);
    if (!files.ok) return files;
    const output: IntakeEntry[] = [];
    let previous = GENESIS.digest;
    for (let index = 0; index < files.value.length; index += 1) {
      if (files.value[index] !== `${String(index).padStart(12, '0')}.json`) return fail('FC-TRUST', 'INTAKE_FORK');
      const decoded = readJsonFile(root, ['entries', files.value[index] as string]);
      const value = decoded.ok ? (decoded.value as IntakeEntry) : undefined;
      if (
        !value ||
        Object.keys(value).sort().join(',') !== 'digest,position,previousDigest,result' ||
        value.position !== index ||
        value.previousDigest !== previous ||
        !isDigest(value.digest)
      )
        return fail('FC-TRUST', 'INTAKE_UNVERIFIABLE');
      const staged = stagedDigest(
        'LOCAL-FILE-INTAKE',
        { position: value.position, previousDigest: value.previousDigest, digest: '', result: value.result },
        ['digest'],
      );
      if (!staged.ok || staged.value !== value.digest) return fail('FC-TRUST', 'INTAKE_UNVERIFIABLE');
      output.push(Object.freeze(value));
      previous = value.digest;
    }
    return ok(Object.freeze(output));
  };
  const trusted = (): FileMechanismResult<readonly IntakeEntry[]> => {
    const all = entries();
    if (!all.ok) return all;
    if (all.value.length === 0) {
      const head = witness.read('intake');
      return !head.ok && head.error.code === 'WITNESS_ABSENT'
        ? all
        : fail('FC-TRUST', head.ok ? 'WITNESS_AHEAD' : head.error.code);
    }
    const current = all.value.at(-1) as IntakeEntry;
    const head = witness.read('intake');
    if (!head.ok) return head;
    return head.value.position === current.position && head.value.digest === current.digest
      ? all
      : fail('FC-TRUST', head.value.position > current.position ? 'WITNESS_AHEAD' : 'WITNESS_MISMATCH');
  };
  const publicResult = (result: IntakeResult): IntakeResult =>
    result.kind === 'acknowledged'
      ? Object.freeze({ ...result, run: runFor(result.position, result.compositionDigest) })
      : Object.freeze(result);
  return Object.freeze({
    create(request: IntakeRequest, fault?: 'after-flush' | 'lost-ack'): FileMechanismResult<IntakeResult> {
      if (!independent.ok) return independent;
      if (
        !isDigest(request?.compositionDigest) ||
        !isDigest(request?.acknowledgementDigest) ||
        (request.terminalAck !== 'accepted' && request.terminalAck !== 'rejected') ||
        (request.terminalAck === 'rejected' && request.successorCut !== undefined) ||
        (request.successorCut !== undefined &&
          (typeof request.successorCut !== 'string' ||
            request.successorCut.length === 0 ||
            request.successorCut.length > 512))
      )
        return fail('FC-INPUT', 'INVALID_INTAKE');
      const all = trusted();
      if (!all.ok) return all;
      const existing = all.value.find((entry) => entry.result.compositionDigest === request.compositionDigest);
      if (existing) {
        const result = existing.result;
        const terminalAck =
          result.kind === 'rejected' && result.reason === 'envelope-rejected' ? 'rejected' : 'accepted';
        const cut =
          result.kind === 'acknowledged'
            ? result.successorCut
            : result.reason === 'successor-cut-already-claimed'
              ? result.winner.successorCut
              : undefined;
        return result.acknowledgementDigest === request.acknowledgementDigest &&
          terminalAck === request.terminalAck &&
          cut === request.successorCut
          ? ok(publicResult(result))
          : fail('FC-FENCE', 'INTAKE_REQUEST_MISMATCH');
      }
      const winner = request.successorCut
        ? all.value.find(
            (entry) => entry.result.kind === 'acknowledged' && entry.result.successorCut === request.successorCut,
          )
        : undefined;
      const position = all.value.length;
      const result: IntakeResult =
        request.terminalAck === 'rejected'
          ? Object.freeze({
              kind: 'rejected',
              position,
              compositionDigest: request.compositionDigest,
              acknowledgementDigest: request.acknowledgementDigest,
              reason: 'envelope-rejected',
            })
          : winner
            ? Object.freeze({
                kind: 'rejected',
                position,
                compositionDigest: request.compositionDigest,
                acknowledgementDigest: request.acknowledgementDigest,
                reason: 'successor-cut-already-claimed',
                winner: Object.freeze({
                  position: winner.result.position,
                  compositionDigest: winner.result.compositionDigest,
                  acknowledgementDigest: winner.result.acknowledgementDigest,
                  successorCut: request.successorCut as string,
                  run: runFor(winner.result.position, winner.result.compositionDigest),
                }),
              })
            : Object.freeze({
                kind: 'acknowledged',
                position,
                compositionDigest: request.compositionDigest,
                acknowledgementDigest: request.acknowledgementDigest,
                ...(request.successorCut ? { successorCut: request.successorCut } : {}),
                run: runFor(position, request.compositionDigest),
              });
      const previous = all.value.at(-1)?.digest ?? GENESIS.digest;
      const staged = stagedDigest('LOCAL-FILE-INTAKE', { position, previousDigest: previous, digest: '', result }, [
        'digest',
      ]);
      if (!staged.ok) return fail('FC-INPUT', 'INVALID_INTAKE');
      const entry = Object.freeze({ position, previousDigest: previous, digest: staged.value, result });
      const stored = writeCreateOnlyJson(root, ['entries'], `${String(position).padStart(12, '0')}.json`, entry);
      if (!stored.ok) return stored;
      if (fault === 'after-flush') return fail('FC-TRUST', 'INTAKE_ACK_LOST');
      const advanced = witness.advance(
        'intake',
        { position: position - 1, digest: previous },
        { position, digest: entry.digest },
      );
      if (!advanced.ok) return advanced;
      return fault === 'lost-ack' ? fail('FC-TRUST', 'INTAKE_ACK_LOST') : ok(publicResult(result));
    },
    read(compositionDigest: string): FileMechanismResult<IntakeReadback> {
      if (!independent.ok) return independent;
      if (!isDigest(compositionDigest)) return fail('FC-INPUT', 'INVALID_INTAKE_KEY');
      const all = trusted();
      if (!all.ok) return all;
      const found = all.value.find((entry) => entry.result.compositionDigest === compositionDigest);
      const head = all.value.at(-1);
      return found && head
        ? ok(Object.freeze({ result: publicResult(found.result), witnessedHeadDigest: head.digest }))
        : fail('FC-TRUST', 'INTAKE_UNVERIFIABLE');
    },
    advanceWitnessFloor(): FileMechanismResult<void> {
      if (!independent.ok) return independent;
      const all = entries();
      if (!all.ok || all.value.length === 0) return all.ok ? fail('FC-FENCE', 'WITNESS_ALREADY_CURRENT') : all;
      const current = all.value.at(-1) as IntakeEntry;
      const witnessed = witness.read('intake');
      const witnessHead = witnessed.ok
        ? witnessed.value
        : witnessed.error.code === 'WITNESS_ABSENT'
          ? GENESIS
          : undefined;
      if (!witnessHead) return fail('FC-TRUST', witnessed.ok ? 'INTAKE_UNVERIFIABLE' : witnessed.error.code);
      if (witnessHead.position >= current.position) return fail('FC-FENCE', 'WITNESS_ALREADY_CURRENT');
      const target = all.value[witnessHead.position + 1];
      if (!target) return fail('FC-TRUST', 'INTAKE_UNVERIFIABLE');
      const advanced = witness.advance('intake', witnessHead, { position: target.position, digest: target.digest });
      return advanced.ok ? ok(undefined) : advanced;
    },
  });
}
