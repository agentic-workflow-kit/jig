import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  CANONICAL_LIMITS,
  canonicalBytes,
  decodeFrame,
  encodeFrame,
  FRAME_VERSION,
  formatIdentity,
  parseIdentity,
  stageDigest,
  validateStagedDigest,
} from '../../packages/codec/dist/index.js';

const vectors = JSON.parse(readFileSync(new URL('../fixtures/gf-002/vectors.json', import.meta.url), 'utf8'));
const corpus = JSON.parse(readFileSync(new URL('../fixtures/gf-002/corpus.json', import.meta.url), 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function expectError(result, family, code) {
  assert.equal(result.ok, false);
  assert.equal(result.error.family, family);
  assert.equal(result.error.code, code);
}

test('GF-002: canonical frame is byte-stable and refuses equivalent noncanonical bytes', () => {
  const encoded = encodeFrame({ z: [true, null], a: 'value' });
  assert.equal(encoded.ok, true);
  assert.equal(
    Buffer.from(encoded.value).toString('utf8'),
    '{"payload":{"a":"value","z":[true,null]},"version":"jig.codec.v1"}',
  );
  const decoded = decodeFrame(encoded.value);
  assert.deepEqual(decoded, { ok: true, value: { a: 'value', z: [true, null] } });
  expectError(
    decodeFrame(Buffer.from('{"version":"jig.codec.v1","payload":{"a":"value","z":[true,null]}}')),
    'FC-INPUT',
    'NONCANONICAL',
  );
});

test('GF-002: framing rejects malformed, duplicate-key, unknown-version, and bounded hostile inputs', () => {
  expectError(decodeFrame(Buffer.from('{')), 'FC-INPUT', 'MALFORMED');
  expectError(
    decodeFrame(Buffer.from('{"payload":{},"payload":{},"version":"jig.codec.v1"}')),
    'FC-INPUT',
    'DUPLICATE_KEY',
  );
  expectError(decodeFrame(Buffer.from('{"payload":{},"version":"jig.codec.v2"}')), 'FC-INPUT', 'UNKNOWN_VERSION');
  expectError(encodeFrame('x'.repeat(CANONICAL_LIMITS.maxStringCodePoints + 1)), 'FC-INPUT', 'OVERSIZED');
  expectError(decodeFrame(Buffer.alloc(CANONICAL_LIMITS.maxFrameBytes + 1, 0x20)), 'FC-INPUT', 'OVERSIZED');
  expectError(encodeFrame({ number: Number.POSITIVE_INFINITY }), 'FC-INPUT', 'MALFORMED');
  expectError(encodeFrame({ unicode: 'e\u0301' }), 'FC-INPUT', 'NONCANONICAL');
});

test('GF-002: numeric codec bounds are signed safe integers with no alternate spellings', () => {
  assert.deepEqual(decodeFrame(encodeFrame({ low: Number.MIN_SAFE_INTEGER, high: Number.MAX_SAFE_INTEGER }).value), {
    ok: true,
    value: { high: Number.MAX_SAFE_INTEGER, low: Number.MIN_SAFE_INTEGER },
  });
  expectError(encodeFrame({ unsafe: Number.MAX_SAFE_INTEGER + 1 }), 'FC-INPUT', 'MALFORMED');
  expectError(decodeFrame(Buffer.from('{"payload":1.5,"version":"jig.codec.v1"}')), 'FC-INPUT', 'NONCANONICAL');
  expectError(decodeFrame(Buffer.from('{"payload":1e1,"version":"jig.codec.v1"}')), 'FC-INPUT', 'NONCANONICAL');
  expectError(decodeFrame(Buffer.from('{"payload":-0,"version":"jig.codec.v1"}')), 'FC-INPUT', 'MALFORMED');
});

test('GF-002: all governed identity representations accept only their exact scopes', () => {
  assert.equal(FRAME_VERSION, vectors.frameVersion);
  for (const [kind, value] of Object.entries(vectors.identities))
    assert.deepEqual(parseIdentity(kind, value), { ok: true, value: { kind, value } }, kind);
  expectError(parseIdentity('ID-OP', vectors.identities['ID-EVENT']), 'FC-SUBJECT', 'CROSS_SCOPE');
  expectError(parseIdentity('ID-EVSUBJ', 'evidence://free-form/claim/anything'), 'FC-SUBJECT', 'INVALID_SCOPE');
  expectError(parseIdentity('ID-RUN', 'run-1-0123456789abcdef'), 'FC-SUBJECT', 'INVALID_SCOPE');
  assert.deepEqual(parseIdentity('ID-AUTH', 'target/repository-main/auth/1'), {
    ok: true,
    value: { kind: 'ID-AUTH', value: 'target/repository-main/auth/1' },
  });
  expectError(
    parseIdentity(
      'ID-AUTH',
      'target/repository-main/auth/1|registry/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ),
    'FC-SUBJECT',
    'INVALID_SCOPE',
  );
  const crossRun = vectors.identities['ID-TXN'].replace(
    'run-000000000001-0123456789abcdef/gen/2',
    'run-000000000002-fedcba9876543210/gen/2',
  );
  expectError(parseIdentity('ID-TXN', crossRun), 'FC-SUBJECT', 'INVALID_SCOPE');
  expectError(parseIdentity('ID-OP', `${crossRun}/op/1`), 'FC-SUBJECT', 'INVALID_SCOPE');
});

test('GF-002: formatter validates all 22 supplied canonical forms without allocating authority', () => {
  for (const entry of corpus.constructors)
    assert.deepEqual(
      formatIdentity(entry.kind, entry.components),
      { ok: true, value: { kind: entry.kind, value: entry.value } },
      entry.kind,
    );
  expectError(formatIdentity('ID-RUN', vectors.identities['ID-RUN']), 'FC-SUBJECT', 'INVALID_SCOPE');
  expectError(
    formatIdentity('ID-RUN', { runSequence: '000000000001', runNonce: 'not-a-hex-nonce' }),
    'FC-SUBJECT',
    'INVALID_SCOPE',
  );
  expectError(
    formatIdentity('ID-TXN', {
      ...corpus.constructors.find((entry) => entry.kind === 'ID-TXN').components,
      generationRunSequence: '000000000002',
      generationRunNonce: 'fedcba9876543210',
    }),
    'FC-SUBJECT',
    'INVALID_SCOPE',
  );
});

test('GF-002: staged digest hashes exactly the canonical pre-identity representation', () => {
  const subject = { digest: 'ignored', nested: { digest: 'ignored-too', value: 3 }, type: 'record' };
  const staged = stageDigest({ domain: 'LG-RECORD', value: subject, excludePaths: ['digest', 'nested.digest'] });
  assert.equal(staged.ok, true);
  assert.equal(
    staged.value.digest,
    sha256(canonicalBytes({ domain: 'LG-RECORD', value: { nested: { value: 3 }, type: 'record' } })),
  );
  assert.deepEqual(validateStagedDigest({ ...staged.value, value: subject }), { ok: true, value: staged.value.digest });
  expectError(
    validateStagedDigest({ ...staged.value, digest: '0'.repeat(64), value: subject }),
    'FC-SUBJECT',
    'STAGED_DIGEST_MISMATCH',
  );
  expectError(
    stageDigest({ domain: '', value: subject, excludePaths: ['missing'] }),
    'FC-SUBJECT',
    'INVALID_STAGED_DIGEST',
  );
  expectError(
    stageDigest({ domain: 'LG-RECORD', value: subject, excludePaths: ['nested.digest', 'nested'] }),
    'FC-SUBJECT',
    'INVALID_STAGED_DIGEST',
  );
  expectError(
    stageDigest({ domain: 'LG-RECORD', value: subject, excludePaths: ['nested', 'nested.digest'] }),
    'FC-SUBJECT',
    'INVALID_STAGED_DIGEST',
  );
});

test('GF-002: parsing is pure and cannot mint commitment or authority', () => {
  const value = parseIdentity('ID-RUN', vectors.identities['ID-RUN']);
  assert.equal(value.ok, true);
  assert.equal(Object.keys(value.value).sort().join(','), 'kind,value');
});
