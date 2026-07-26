import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  canonicalBytes,
  decodeFrame,
  encodeFrame,
  formatIdentity,
  parseIdentity,
  validateStagedDigest,
} from '../../packages/codec/dist/index.js';

const corpus = JSON.parse(readFileSync(new URL('../fixtures/codec-corpus.json', import.meta.url), 'utf8'));
const utf8 = (value) => Buffer.from(value, 'utf8');
const oversizedFrame = (descriptor) =>
  `{"payload":"${descriptor.character.repeat(descriptor.count)}","version":"jig.codec.v1"}`;

function expectOracle(result, oracle) {
  assert.deepEqual(result, oracle);
}

test('codec: runner-neutral golden corpus supplies exact inputs and oracles', () => {
  assert.equal(corpus.schemaVersion, 2);
  assert.equal(corpus.corpusVersion, 'codec-corpus.v2');
  assert.deepEqual(corpus.requiredClassSet, [
    'unit-schema',
    'golden-cross-runtime',
    'property-fuzz',
    'hostile-input',
    'negative-authority',
    'replay',
  ]);
  assert.equal(corpus.oracle.sha256, '4f96bb81af5ab41a899d4b16fa49adf2809eb0e5c5d9e3845057211af92a17d4');
  for (const entry of corpus.cases) {
    if (entry.frame) expectOracle(decodeFrame(utf8(entry.frame)), entry.expected.result);
    else if (entry.generator) expectOracle(decodeFrame(utf8(oversizedFrame(entry.generator))), entry.expected.result);
    else if (entry.identity)
      expectOracle(parseIdentity(entry.identity.kind, entry.identity.value), entry.expected.result);
    else expectOracle(validateStagedDigest(entry.staged), entry.expected.result);
  }
  assert.equal(
    createHash('sha256')
      .update(
        JSON.stringify({
          cases: corpus.cases.map(({ id, expected }) => ({ id, expected })),
          constructors: corpus.constructors,
        }),
      )
      .digest('hex'),
    corpus.oracle.sha256,
  );
  for (const entry of corpus.constructors)
    assert.deepEqual(formatIdentity(entry.kind, entry.components), {
      ok: true,
      value: { kind: entry.kind, value: entry.value },
    });
});

test('codec: deterministic property corpus replays canonical bytes from its declared seed', () => {
  let state = [...corpus.seed].reduce((total, character) => ((total * 33) ^ character.codePointAt(0)) >>> 0, 5381);
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state % 10_000;
  };
  for (let index = 0; index < 128; index += 1) {
    const payload = { a: next(), b: [`v-${next()}`, Boolean(next() & 1)], z: { n: next() } };
    const encoded = encodeFrame(payload);
    assert.equal(encoded.ok, true);
    const decoded = decodeFrame(encoded.value);
    assert.equal(decoded.ok, true);
    assert.deepEqual(canonicalBytes({ payload, version: corpus.frameVersion }), encoded.value);
  }
});

test('codec: independent process consumer derives the same corpus oracle', () => {
  const result = spawnSync(process.execPath, ['tests/codec/golden-consumer.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.corpusVersion, corpus.corpusVersion);
  assert.equal(output.seed, corpus.seed);
  assert.equal(output.oracleSha256, corpus.oracle.sha256);
  assert.equal(output.verified, true);
  assert.equal(output.producedSha256, corpus.oracle.sha256);
});

test('codec: independent consumer rejects wrong immutable canonical, digest, and error oracles', () => {
  const root = mkdtempSync('/tmp/codec-corpus-');
  try {
    for (const [index, mutate] of [
      (copy) => (copy.cases[0].expected.canonicalBytesSha256 = '0'.repeat(64)),
      (copy) => (copy.cases[7].expected.stagedDigest = '0'.repeat(64)),
      (copy) => (copy.cases[1].expected.result.error.code = 'OVERSIZED'),
    ].entries()) {
      const copy = structuredClone(corpus);
      mutate(copy);
      copy.oracle.sha256 = createHash('sha256')
        .update(
          JSON.stringify({
            cases: copy.cases.map(({ id, expected }) => ({ id, expected })),
            constructors: copy.constructors,
          }),
        )
        .digest('hex');
      const path = join(root, `${index}.json`);
      writeFileSync(path, `${JSON.stringify(copy)}\n`);
      const result = spawnSync(process.execPath, ['tests/codec/golden-consumer.mjs', path], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /fixed corpus oracle digest|implementation output/);
    }
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
