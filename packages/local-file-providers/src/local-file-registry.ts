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
  resourceKey,
  stagedDigest,
  verifySeparateRoots,
  writeCreateOnlyJson,
} from './path-confinement.js';

const GENESIS = Object.freeze({ position: -1, digest: '0'.repeat(64) });
type CanonicalJson = null | boolean | number | string | CanonicalJson[] | { [key: string]: CanonicalJson };
type RegistryBinding = Readonly<{ descriptor: string; registry: string; target: string }>;
type RegistryRecord = Readonly<{
  version: 'jig.registry.v1';
  registry: string;
  target: string;
  expectedHeadPosition: number;
  expectedHeadDigest: string;
  position: number;
  previousDigest: string;
  predecessorDigest: string;
  contentDigest: string;
  variant: 'waiter' | 'withdrawal' | 'grant' | 'release' | 'atomic-rebind';
  handle: Readonly<{ registry: string; position: number; contentDigest: string }>;
  authority?: string;
  waiter?: Readonly<{ registry: string; position: number; contentDigest: string }>;
  content: CanonicalJson;
}>;

function binding(value: unknown): FileMechanismResult<RegistryBinding> {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return fail('FC-SUBJECT', 'INVALID_REGISTRY_BINDING');
    const descriptor = Object.getOwnPropertyDescriptor(value, 'descriptor')?.value;
    const registry = Object.getOwnPropertyDescriptor(value, 'registry')?.value;
    const target = Object.getOwnPropertyDescriptor(value, 'target')?.value;
    if (
      Object.getOwnPropertyNames(value).sort().join(',') !== 'descriptor,registry,target' ||
      !isDigest(descriptor) ||
      registry !== `registry/${descriptor}` ||
      typeof target !== 'string' ||
      !target.startsWith('target/')
    )
      return fail('FC-SUBJECT', 'INVALID_REGISTRY_BINDING');
    return ok(Object.freeze({ descriptor, registry, target }));
  } catch {
    return fail('FC-SUBJECT', 'INVALID_REGISTRY_BINDING');
  }
}

function recordDigest(record: RegistryRecord): FileMechanismResult<string> {
  const staged = stagedDigest(
    'REGISTRY-RECORD',
    {
      version: record.version,
      registry: record.registry,
      target: record.target,
      expectedHeadPosition: record.expectedHeadPosition,
      expectedHeadDigest: record.expectedHeadDigest,
      position: record.position,
      previousDigest: record.previousDigest,
      predecessorDigest: record.predecessorDigest,
      variant: record.variant,
      authority: record.authority ?? null,
      waiter: record.waiter ?? null,
      content: record.content,
      contentDigest: '',
      handle: null,
    },
    ['contentDigest', 'handle'],
  );
  return staged.ok ? ok(staged.value) : fail('FC-TRUST', 'INVALID_REGISTRY_RECORD');
}

export function createLocalFileRegistryForConformance(
  root: string,
  witnessRoot: string,
  independenceEvidence?: IndependentRootEvidence,
) {
  const independent = verifySeparateRoots(root, witnessRoot, independenceEvidence);
  const witness = createLocalFileWitness(witnessRoot);
  const recordsFor = (bound: RegistryBinding): FileMechanismResult<readonly RegistryRecord[]> => {
    const key = resourceKey(`${bound.registry}\0${bound.target}`);
    const prepared = ensureConfinedDirectory(root, [key, 'records']);
    if (!prepared.ok) return prepared;
    const files = listConfinedFiles(root, [key, 'records']);
    if (!files.ok) return files;
    const records: RegistryRecord[] = [];
    let previous = GENESIS.digest;
    for (let index = 0; index < files.value.length; index += 1) {
      if (files.value[index] !== `${String(index).padStart(12, '0')}.json`) return fail('FC-TRUST', 'REGISTRY_FORK');
      const decoded = readJsonFile(root, [key, 'records', files.value[index] as string]);
      const record = decoded.ok ? (decoded.value as RegistryRecord) : undefined;
      if (
        record?.version !== 'jig.registry.v1' ||
        record.registry !== bound.registry ||
        record.target !== bound.target ||
        record.position !== index ||
        record.previousDigest !== previous ||
        record.predecessorDigest !== previous ||
        record.handle?.registry !== bound.registry ||
        record.handle?.position !== index ||
        record.handle?.contentDigest !== record.contentDigest
      )
        return fail('FC-TRUST', 'INVALID_REGISTRY_RECORD');
      const digest = recordDigest(record);
      if (!digest.ok || digest.value !== record.contentDigest) return fail('FC-TRUST', 'INVALID_REGISTRY_RECORD');
      records.push(Object.freeze(record));
      previous = record.contentDigest;
    }
    return ok(Object.freeze(records));
  };
  const trusted = (bound: RegistryBinding, records: readonly RegistryRecord[]): FileMechanismResult<void> => {
    const witnessed = witness.read(`registry:${bound.registry}:${bound.target}`);
    if (records.length === 0)
      return !witnessed.ok && witnessed.error.code === 'WITNESS_ABSENT'
        ? ok(undefined)
        : fail('FC-TRUST', witnessed.ok ? 'REGISTRY_WITNESS_AHEAD' : witnessed.error.code);
    const latest = records.at(-1) as RegistryRecord;
    return witnessed.ok &&
      witnessed.value.position === latest.position &&
      witnessed.value.digest === latest.contentDigest
      ? ok(undefined)
      : fail('FC-TRUST', 'REGISTRY_WITNESS_MISMATCH');
  };
  return Object.freeze({
    append(
      input: {
        binding: RegistryBinding;
        expectedPosition: number;
        expectedDigest: string;
        record: RegistryRecord;
      },
      fault?: 'after-flush' | 'lost-ack',
    ): FileMechanismResult<RegistryRecord> {
      if (!independent.ok) return independent;
      const bound = binding(input?.binding);
      if (!bound.ok) return bound;
      const records = recordsFor(bound.value);
      if (!records.ok) return records;
      const trust = trusted(bound.value, records.value);
      if (!trust.ok) return trust;
      const latest = records.value.at(-1);
      const currentPosition = latest?.position ?? -1;
      const currentDigest = latest?.contentDigest ?? GENESIS.digest;
      if (input.expectedPosition !== currentPosition || input.expectedDigest !== currentDigest)
        return fail('FC-FENCE', 'EXPECTED_HEAD_MISMATCH');
      const record = input.record;
      const digest = record ? recordDigest(record) : undefined;
      if (
        !digest?.ok ||
        digest.value !== record.contentDigest ||
        record.registry !== bound.value.registry ||
        record.target !== bound.value.target ||
        record.position !== currentPosition + 1 ||
        record.previousDigest !== currentDigest ||
        record.predecessorDigest !== currentDigest ||
        record.expectedHeadPosition !== currentPosition ||
        record.expectedHeadDigest !== currentDigest
      )
        return fail('FC-SUBJECT', 'REGISTRY_RECORD_BINDING_MISMATCH');
      const key = resourceKey(`${bound.value.registry}\0${bound.value.target}`);
      const intent = writeCreateOnlyJson(
        root,
        [key, 'intents'],
        `${String(record.position).padStart(12, '0')}-${record.contentDigest}.json`,
        {
          registry: bound.value.registry,
          target: bound.value.target,
          position: record.position,
          digest: record.contentDigest,
        },
      );
      if (!intent.ok && intent.error.code !== 'ALREADY_EXISTS') return intent;
      const stored = writeCreateOnlyJson(
        root,
        [key, 'records'],
        `${String(record.position).padStart(12, '0')}.json`,
        record,
      );
      if (!stored.ok) return stored;
      if (fault === 'after-flush') return fail('FC-TRUST', 'REGISTRY_ACK_LOST');
      const advanced = witness.advance(
        `registry:${bound.value.registry}:${bound.value.target}`,
        { position: currentPosition, digest: currentDigest },
        { position: record.position, digest: record.contentDigest },
      );
      if (!advanced.ok) return advanced;
      return fault === 'lost-ack' ? fail('FC-TRUST', 'REGISTRY_ACK_LOST') : ok(Object.freeze(record));
    },
    readback(input: {
      binding: RegistryBinding;
      position: number;
    }): FileMechanismResult<
      Readonly<{ kind: 'committed'; record: RegistryRecord }> | Readonly<{ kind: 'absent'; position: number }>
    > {
      if (!independent.ok) return independent;
      const bound = binding(input?.binding);
      if (!bound.ok) return bound;
      if (!Number.isSafeInteger(input.position) || input.position < 0) return fail('FC-INPUT', 'INVALID_READBACK');
      const records = recordsFor(bound.value);
      if (!records.ok) return records;
      const trust = trusted(bound.value, records.value);
      if (!trust.ok) return trust;
      const found = records.value[input.position];
      return ok(
        found
          ? Object.freeze({ kind: 'committed', record: found })
          : Object.freeze({ kind: 'absent', position: input.position }),
      );
    },
    snapshot(bindingValue: unknown): FileMechanismResult<Readonly<{ position: number; digest: string }>> {
      if (!independent.ok) return independent;
      const bound = binding(bindingValue);
      if (!bound.ok) return bound;
      const records = recordsFor(bound.value);
      if (!records.ok) return records;
      const trust = trusted(bound.value, records.value);
      if (!trust.ok) return trust;
      const latest = records.value.at(-1);
      return ok(Object.freeze({ position: latest?.position ?? -1, digest: latest?.contentDigest ?? GENESIS.digest }));
    },
    advanceWitnessFloor(bindingValue: unknown): FileMechanismResult<void> {
      if (!independent.ok) return independent;
      const bound = binding(bindingValue);
      if (!bound.ok) return bound;
      const records = recordsFor(bound.value);
      if (!records.ok || records.value.length === 0)
        return records.ok ? fail('FC-FENCE', 'WITNESS_ALREADY_CURRENT') : records;
      const line = `registry:${bound.value.registry}:${bound.value.target}`;
      const witnessed = witness.read(line);
      const witnessHead = witnessed.ok
        ? witnessed.value
        : witnessed.error.code === 'WITNESS_ABSENT'
          ? GENESIS
          : undefined;
      if (!witnessHead) return fail('FC-TRUST', witnessed.ok ? 'REGISTRY_WITNESS_MISMATCH' : witnessed.error.code);
      const latest = records.value.at(-1) as RegistryRecord;
      if (witnessHead.position >= latest.position) return fail('FC-FENCE', 'WITNESS_ALREADY_CURRENT');
      const prior = witnessHead.position < 0 ? GENESIS.digest : records.value[witnessHead.position]?.contentDigest;
      const target = records.value[witnessHead.position + 1];
      if (!prior || prior !== witnessHead.digest || !target || target.previousDigest !== witnessHead.digest)
        return fail('FC-TRUST', 'INVALID_REGISTRY_RECORD');
      const advanced = witness.advance(line, witnessHead, {
        position: target.position,
        digest: target.contentDigest,
      });
      return advanced.ok ? ok(undefined) : advanced;
    },
  });
}
