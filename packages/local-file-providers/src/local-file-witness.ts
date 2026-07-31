import {
  type FileMechanismResult,
  fail,
  isDigest,
  isPosition,
  listConfinedFiles,
  ok,
  readJsonFile,
  resourceKey,
  writeCreateOnlyJson,
} from './path-confinement.js';

export type WitnessHead = Readonly<{ position: number; digest: string }>;
type WitnessEntry = Readonly<{
  line: string;
  position: number;
  digest: string;
  previousPosition: number;
  previousDigest: string;
}>;

const GENESIS: WitnessHead = Object.freeze({ position: -1, digest: '0'.repeat(64) });

function entry(value: unknown): FileMechanismResult<WitnessEntry> {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail('FC-TRUST', 'INVALID_WITNESS');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors).sort().join(',');
    if (keys !== 'digest,line,position,previousDigest,previousPosition') return fail('FC-TRUST', 'INVALID_WITNESS');
    const line = descriptors.line?.value;
    const position = descriptors.position?.value;
    const digest = descriptors.digest?.value;
    const previousPosition = descriptors.previousPosition?.value;
    const previousDigest = descriptors.previousDigest?.value;
    if (
      typeof line !== 'string' ||
      line.length === 0 ||
      line.length > 512 ||
      !isPosition(position) ||
      position < 0 ||
      !isDigest(digest) ||
      !isPosition(previousPosition) ||
      !isDigest(previousDigest)
    )
      return fail('FC-TRUST', 'INVALID_WITNESS');
    return ok(Object.freeze({ line, position, digest, previousPosition, previousDigest }));
  } catch {
    return fail('FC-TRUST', 'INVALID_WITNESS');
  }
}

export function createLocalFileWitness(root: string) {
  const read = (line: string): FileMechanismResult<WitnessHead> => {
    if (typeof line !== 'string' || line.length === 0 || line.length > 512)
      return fail('FC-SUBJECT', 'INVALID_WITNESS_LINE');
    const directory = [resourceKey(line)];
    const files = listConfinedFiles(root, directory);
    if (!files.ok) return files.error.code === 'FILE_ABSENT' ? fail('FC-TRUST', 'WITNESS_ABSENT') : files;
    if (files.value.length === 0) return fail('FC-TRUST', 'WITNESS_ABSENT');
    let previous = GENESIS;
    for (let index = 0; index < files.value.length; index += 1) {
      const name = files.value[index];
      if (!name || name !== `${String(index).padStart(12, '0')}.json`) return fail('FC-TRUST', 'WITNESS_FORK');
      const decoded = readJsonFile(root, [...directory, name]);
      if (!decoded.ok) return fail('FC-TRUST', 'WITNESS_UNVERIFIABLE');
      const parsed = entry(decoded.value);
      if (
        !parsed.ok ||
        parsed.value.line !== line ||
        parsed.value.position !== index ||
        parsed.value.previousPosition !== previous.position ||
        parsed.value.previousDigest !== previous.digest
      )
        return fail('FC-TRUST', 'WITNESS_FORK');
      previous = Object.freeze({ position: parsed.value.position, digest: parsed.value.digest });
    }
    return ok(previous);
  };

  return Object.freeze({
    read,
    advance(line: string, expected: WitnessHead, next: WitnessHead): FileMechanismResult<WitnessHead> {
      if (
        typeof line !== 'string' ||
        !isPosition(expected.position) ||
        !isDigest(expected.digest) ||
        !isPosition(next.position) ||
        next.position !== expected.position + 1 ||
        !isDigest(next.digest)
      )
        return fail('FC-INPUT', 'INVALID_WITNESS_ADVANCE');
      const current = read(line);
      if (current.ok) {
        if (current.value.position !== expected.position || current.value.digest !== expected.digest)
          return fail('FC-FENCE', 'WITNESS_HEAD_MISMATCH');
      } else if (
        current.error.code !== 'WITNESS_ABSENT' ||
        expected.position !== GENESIS.position ||
        expected.digest !== GENESIS.digest
      )
        return current;
      const stored = writeCreateOnlyJson(root, [resourceKey(line)], `${String(next.position).padStart(12, '0')}.json`, {
        line,
        position: next.position,
        digest: next.digest,
        previousPosition: expected.position,
        previousDigest: expected.digest,
      });
      return stored.ok ? ok(Object.freeze({ ...next })) : stored;
    },
  });
}
