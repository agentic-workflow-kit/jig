import assert from 'node:assert';
import { test } from 'vitest';
import { approveSubstrateManifest, SubstrateAuthorizationError, validateSubstrateRequest } from '../src/substrate.js';

test('P6-AC-6: substrate manifest refuses an out-of-tuple credential request as a diagnosable stop', () => {
  const manifest = approveSubstrateManifest({
    id: 'codex-real-driver',
    runtimes: ['node'],
    argv: [['codex', 'exec']],
    credentials: ['CODEX_API_KEY'],
    egress: [],
  });

  assert.throws(
    () => validateSubstrateRequest(manifest, { kind: 'credential', value: 'GITHUB_TOKEN' }),
    (error: unknown) => error instanceof SubstrateAuthorizationError && /substrate-escalation/.test(error.message),
  );
});

test('P6-AC-6: substrate manifest accepts approved argv, credential, and egress requests', () => {
  const manifest = approveSubstrateManifest({
    id: 'codex-real-driver',
    runtimes: ['node'],
    argv: [['codex', 'exec']],
    credentials: ['CODEX_API_KEY'],
    egress: ['https://api.openai.com'],
  });

  assert.doesNotThrow(() => validateSubstrateRequest(manifest, { kind: 'argv', value: ['codex', 'exec'] }));
  assert.doesNotThrow(() => validateSubstrateRequest(manifest, { kind: 'credential', value: 'CODEX_API_KEY' }));
  assert.doesNotThrow(() => validateSubstrateRequest(manifest, { kind: 'egress', value: 'https://api.openai.com' }));
  assert.throws(
    () => validateSubstrateRequest(manifest, { kind: 'argv', value: ['codex', 'danger'] }),
    SubstrateAuthorizationError,
  );
});
