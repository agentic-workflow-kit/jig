import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';
import { authorizeRequest } from '../src/authorization.js';
import type { AuthorizationRequest, PolicyDoc, Story } from '../src/types.js';

const policy: PolicyDoc = {
  policy: {
    id: 'policy:assisted-v0',
    rules: {
      allowLocalDryRun: true,
      ruleGoverningSurfaces: ['.github/**', 'policies/**'],
    },
  },
};

const scopedStory: Story = {
  id: 'STORY-A',
  title: 'Scoped story',
  scope: ['src/**', 'tests/**'],
  authority: {
    requests: ['edit-files', 'run-checks'],
  },
};

test('P3-AC-2: declared in-scope edit-files request is granted by fixed category map', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-edit-src',
    kind: 'edit-files',
    paths: ['src/cli.ts'],
  };

  const decision = authorizeRequest(request, scopedStory, policy);

  assert.strictEqual(decision.outcome, 'grant');
  assert.deepStrictEqual(decision.basis, ['declared-request', 'in-scope', 'CFG-10:reversible']);
});

test('P3-AC-2: declared run-checks request is granted', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-check',
    kind: 'run-checks',
    command: 'corepack pnpm check',
  };

  const decision = authorizeRequest(request, scopedStory, policy);

  assert.strictEqual(decision.outcome, 'grant');
  assert.deepStrictEqual(decision.basis, ['declared-request', 'CFG-10:reversible']);
});

test('P3-AC-3: edit-files without paths or declared story scope denies fail-closed', () => {
  const noPaths = authorizeRequest({ id: 'REQ-no-paths', kind: 'edit-files' }, scopedStory, policy);
  const noScope = authorizeRequest(
    { id: 'REQ-no-scope', kind: 'edit-files', paths: ['src/cli.ts'] },
    { id: 'STORY-no-scope', title: 'No scope', authority: { requests: ['edit-files'] } },
    policy,
  );

  assert.strictEqual(noPaths.outcome, 'deny');
  assert.deepStrictEqual(noPaths.basis, ['FENCE-1', 'out-of-declared-scope']);
  assert.strictEqual(noScope.outcome, 'deny');
  assert.deepStrictEqual(noScope.basis, ['FENCE-1', 'out-of-declared-scope']);
});

test('P3-AC-3: out-of-scope edit-files request is denied fail-closed', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-edit-outside',
    kind: 'edit-files',
    paths: ['docs/product/jig.md'],
  };

  const decision = authorizeRequest(request, scopedStory, policy);

  assert.strictEqual(decision.outcome, 'deny');
  assert.deepStrictEqual(decision.basis, ['FENCE-1', 'out-of-declared-scope']);
});

test('P3-AC-4: rule-governing request routes to owner', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-policy',
    kind: 'edit-rule-governing-file',
    paths: ['policies/local.json'],
  };

  const decision = authorizeRequest(request, scopedStory, policy);

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['GUARD-2', 'rule-governing-surface']);
});

test('P3-AC-4: privileged and unknown request kinds route instead of granting', () => {
  const push = authorizeRequest({ id: 'REQ-push', kind: 'push' }, scopedStory, policy);
  const unknown = authorizeRequest({ id: 'REQ-unknown', kind: 'summon-release-agent' }, scopedStory, policy);

  assert.strictEqual(push.outcome, 'route');
  assert.deepStrictEqual(push.basis, ['privileged-or-irreversible']);
  assert.strictEqual(unknown.outcome, 'route');
  assert.deepStrictEqual(unknown.basis, ['unknown-request-kind']);
});

test('P3-AC-4: undeclared run-checks request routes instead of granting', () => {
  const decision = authorizeRequest(
    { id: 'REQ-undeclared-check', kind: 'run-checks', command: 'corepack pnpm check' },
    { id: 'STORY-no-checks', title: 'No checks', authority: { requests: ['edit-files'] } },
    policy,
  );

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['unknown-request-kind']);
});

test('P3-AC-6: classifier is deterministic fixed lookup without model/provider adjudication', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-deterministic',
    kind: 'edit-files',
    paths: ['src/harness.ts'],
  };

  const first = authorizeRequest(request, scopedStory, policy);
  const second = authorizeRequest(request, scopedStory, policy);
  assert.deepStrictEqual(second, first);

  const source = readFileSync(join(process.cwd(), 'src/authorization.ts'), 'utf8');
  assert.doesNotMatch(source, /openai|anthropic|provider|model|confidence|score|heuristic/i);
});
