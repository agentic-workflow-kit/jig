import {
  type FileMechanismResult,
  fail,
  isDigest,
  isPosition,
  ok,
  readJsonFile,
  resourceKey,
  writeCreateOnlyJson,
} from './path-confinement.js';

type Snapshot = Readonly<{ subject: string; position: number; digest: string; stateDigest: string }>;

export function createLocalFileSnapshotForConformance(root: string) {
  return Object.freeze({
    write(subject: string, head: unknown, stateDigest: string): FileMechanismResult<Snapshot> {
      const value = head as { position?: unknown; digest?: unknown };
      if (
        typeof subject !== 'string' ||
        subject.length === 0 ||
        !isPosition(value?.position) ||
        !isDigest(value?.digest) ||
        !isDigest(stateDigest)
      )
        return fail('FC-INPUT', 'INVALID_SNAPSHOT');
      const snapshot = Object.freeze({ subject, position: value.position, digest: value.digest, stateDigest });
      const stored = writeCreateOnlyJson(
        root,
        [resourceKey(subject)],
        `${String(snapshot.position).padStart(12, '0')}-${snapshot.digest}.json`,
        snapshot,
      );
      if (!stored.ok && stored.error.code === 'ALREADY_EXISTS') {
        const existing = readJsonFile(root, [
          resourceKey(subject),
          `${String(snapshot.position).padStart(12, '0')}-${snapshot.digest}.json`,
        ]);
        const persisted = existing.ok ? (existing.value as Snapshot) : undefined;
        return persisted &&
          persisted.subject === snapshot.subject &&
          persisted.position === snapshot.position &&
          persisted.digest === snapshot.digest &&
          persisted.stateDigest === snapshot.stateDigest
          ? ok(Object.freeze(persisted))
          : fail('FC-FENCE', 'SNAPSHOT_MISMATCH');
      }
      if (!stored.ok) return stored;
      return ok(snapshot);
    },
    verify(subject: string, head: unknown, snapshot: unknown): FileMechanismResult<boolean> {
      const expected = head as { position?: unknown; digest?: unknown };
      const candidate = snapshot as Snapshot;
      if (
        typeof subject !== 'string' ||
        !isPosition(expected?.position) ||
        !isDigest(expected?.digest) ||
        typeof candidate !== 'object' ||
        candidate === null ||
        candidate.subject !== subject ||
        !isPosition(candidate.position) ||
        !isDigest(candidate.digest) ||
        !isDigest(candidate.stateDigest)
      )
        return fail('FC-INPUT', 'INVALID_SNAPSHOT');
      const stored = readJsonFile(root, [
        resourceKey(subject),
        `${String(candidate.position).padStart(12, '0')}-${candidate.digest}.json`,
      ]);
      if (!stored.ok) return fail('FC-TRUST', 'SNAPSHOT_UNVERIFIABLE');
      const persisted = stored.value as Snapshot;
      return ok(
        typeof persisted === 'object' &&
          persisted !== null &&
          Object.keys(persisted).sort().join(',') === 'digest,position,stateDigest,subject' &&
          persisted.subject === candidate.subject &&
          persisted.position === candidate.position &&
          persisted.digest === candidate.digest &&
          persisted.stateDigest === candidate.stateDigest &&
          candidate.position === expected.position &&
          candidate.digest === expected.digest,
      );
    },
  });
}
