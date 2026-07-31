import assert from 'node:assert/strict';
import { linkSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const provider = await import('../dist/index.js');
const runtime = await import('@agentic-workflow-kit/jig-runtime-contracts');
const request = () =>
  runtime.encodeSourceRequest({
    version: 'jig.source.v1',
    sourceIdentity: 'source/structured-json-file-source',
    basis: { repository: 'repo/example', track: 'track/one' },
    track: 'track/one',
    deadline: 900000,
    retry: { ordinal: 0, limit: 3 },
    predecessor: null,
  }).value;
const candidate = {
  version: 'jig.source.v1',
  sourceIdentity: 'source/structured-json-file-source',
  itemKey: 'item/one',
  revision: 'rev-1',
  cursor: 'cursor-1',
  content: { title: 'Candidate' },
  plan: {
    version: 'jig.plan.v1',
    track: 'track/one',
    policy: { frozenCheckClasses: ['check/unit'], capacities: { cpu: 2 }, reserves: { cpu: 1 } },
    stories: [
      {
        key: 'story/one',
        track: 'track/one',
        dependsOn: [],
        done: { kind: 'checks-pass', checkClasses: ['check/unit'] },
        requirements: ['bounded'],
        acceptanceCriteria: ['bounded'],
        demand: { cpu: 1 },
      },
    ],
  },
};
test('the live provider is structurally unavailable before qualification', () =>
  assert.deepEqual(provider.createQualifiedStructuredFileSource(), {
    ok: false,
    error: { family: 'FC-MECHANISM', code: 'PROVIDER_UNAVAILABLE_UNQUALIFIED' },
  }));
test('probe reads a real strict file but rejects nested duplicate keys, symlinks, and hard links', () => {
  const d = mkdtempSync(join(tmpdir(), 'jig-source-'));
  try {
    const p = join(realpathSync(d), 'work-plan.json');
    writeFileSync(p, JSON.stringify(candidate));
    assert.equal(provider.probeStructuredFileSource(p, request()).ok, true);
    writeFileSync(p, '{"version":"jig.source.v1","plan":{"version":"one","version":"two"}}');
    assert.equal(provider.probeStructuredFileSource(p, request()).error.code, 'DUPLICATE_JSON_KEY');
    writeFileSync(p, JSON.stringify(candidate));
    symlinkSync(p, join(d, 'link.json'));
    assert.equal(provider.probeStructuredFileSource(join(d, 'link.json'), request()).error.code, 'UNSAFE_FILE');
    linkSync(p, join(d, 'hard-link.json'));
    assert.equal(provider.probeStructuredFileSource(p, request()).error.code, 'UNSAFE_FILE');
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('probe bounds bytes and nesting before the semantic candidate boundary', () => {
  const d = mkdtempSync(join(tmpdir(), 'jig-source-'));
  try {
    const p = join(realpathSync(d), 'work-plan.json');
    writeFileSync(p, `{${'"x":{'.repeat(33)}"x":null${'}'.repeat(33)}}`);
    assert.equal(provider.probeStructuredFileSource(p, request()).error.code, 'JSON_DEPTH_EXCEEDED');
    writeFileSync(p, 'x'.repeat(65_537));
    assert.equal(provider.probeStructuredFileSource(p, request()).error.code, 'UNSAFE_FILE');
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});
