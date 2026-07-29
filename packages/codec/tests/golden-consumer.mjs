import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  canonicalBytes,
  decodeFrame,
  formatIdentity,
  parseIdentity,
  stageDigest,
  validateStagedDigest,
} from '../dist/index.js';

const corpusPath = process.argv[2] ?? new URL('./fixtures/codec-corpus.json', import.meta.url);
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const utf8 = (value) => Buffer.from(value, 'utf8');
const sha256 = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const oversizedFrame = (descriptor) =>
  `{"payload":"${descriptor.character.repeat(descriptor.count)}","version":"jig.codec.v1"}`;
const expected = {
  cases: corpus.cases.map(({ id, expected: result }) => ({ id, expected: result })),
  constructors: corpus.constructors,
};
if (corpus.oracle?.sha256 !== sha256(expected))
  throw new Error('fixed corpus oracle digest does not match immutable expected values');

function actualCase(entry) {
  if (entry.frame) return decodeFrame(utf8(entry.frame));
  if (entry.generator) return decodeFrame(utf8(oversizedFrame(entry.generator)));
  if (entry.identity) return parseIdentity(entry.identity.kind, entry.identity.value);
  if (entry.staged) return validateStagedDigest(entry.staged);
  throw new Error(`unsupported corpus case ${entry.id}`);
}

function verifyFixedDerivedValues(entry, result) {
  if (entry.expected.canonicalBytesUtf8 !== undefined) {
    if (!result.ok) throw new Error(`canonical vector rejected ${entry.id}`);
    const bytes = canonicalBytes({ payload: result.value, version: corpus.frameVersion });
    const text = Buffer.from(bytes).toString('utf8');
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (text !== entry.expected.canonicalBytesUtf8 || hash !== entry.expected.canonicalBytesSha256)
      throw new Error(`implementation output does not match immutable canonical bytes for ${entry.id}`);
  }
  if (entry.expected.stagedDigest !== undefined) {
    const { digest, ...input } = entry.staged;
    const staged = stageDigest(input);
    if (!staged.ok || staged.value.digest !== entry.expected.stagedDigest)
      throw new Error(`implementation output does not match immutable staged digest for ${entry.id}`);
  }
}

const produced = {
  cases: corpus.cases.map((entry) => {
    const result = actualCase(entry);
    verifyFixedDerivedValues(entry, result);
    return { id: entry.id, expected: { ...entry.expected, result } };
  }),
  constructors: corpus.constructors.map((entry) => {
    const result = formatIdentity(entry.kind, entry.components);
    if (!result.ok) throw new Error(`constructor rejected immutable vector ${entry.kind}`);
    return { ...entry, value: result.value.value };
  }),
};
if (JSON.stringify(produced) !== JSON.stringify(expected))
  throw new Error('implementation output does not match the immutable corpus oracle');

process.stdout.write(
  `${JSON.stringify({
    corpusVersion: corpus.corpusVersion,
    seed: corpus.seed,
    oracleSha256: corpus.oracle.sha256,
    producedSha256: sha256(produced),
    verified: true,
  })}\n`,
);
