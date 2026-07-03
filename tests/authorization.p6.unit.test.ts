import assert from 'node:assert';
import { test } from 'vitest';
import { authorizeRequest } from '../src/authorization.js';
import type { CapabilityAttestation } from '../src/ports.js';
import type { AuthorizationRequest, PolicyDoc, Story } from '../src/types.js';

const story: Story = {
  id: 'STORY-P6',
  title: 'Phase 6 story',
  scope: ['src/**'],
  authority: {
    requests: ['edit-files'],
  },
};

const request: AuthorizationRequest = {
  id: 'REQ-edit',
  kind: 'edit-files',
  paths: ['src/file.ts'],
  capability: 'filesystem-edit',
};

const policy: PolicyDoc = {
  policy: {
    id: 'policy-p6',
    rules: {
      allowLocalDryRun: true,
      capabilityIsolation: {
        'filesystem-edit': 'strong',
      },
    },
  },
};

function attestation(overrides: Partial<CapabilityAttestation>): CapabilityAttestation {
  return {
    driverId: 'real-host',
    capability: 'filesystem-edit',
    runContext: 'local-real-host',
    freshness: 'fresh',
    positive: true,
    reportedIsolationStrength: 'strong',
    provenIsolationStrength: 'strong',
    ...overrides,
  };
}

test('P6-AC-1: a 6a real-agent run cannot obtain strong autonomy — a strong attestation not backed by an exercised proof (incl. the default reference-host strong) unlocks no more than weak', () => {
  const decision = authorizeRequest(
    request,
    story,
    policy,
    attestation({
      driverId: 'reference-host',
      runContext: 'local-dry-run',
    }),
  );

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['containment-unproven']);
});

test('P6-AC-2: proven strong unlocks the strong autonomy', () => {
  const decision = authorizeRequest(request, story, policy, attestation({}));

  assert.strictEqual(decision.outcome, 'grant');
  assert.deepStrictEqual(decision.basis, ['declared-request', 'in-scope', 'CFG-10:reversible']);
});

test('P6-AC-2: an overstated strong report records isolation-strength-overstated and unlocks nothing', () => {
  const decision = authorizeRequest(
    request,
    story,
    policy,
    attestation({
      provenIsolationStrength: 'weak',
      failureToken: 'isolation-strength-overstated',
    }),
  );

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['isolation-strength-overstated']);
});

test('P6-AC-2: an absent/stale proof records containment-unproven and routes', () => {
  const decision = authorizeRequest(
    request,
    story,
    policy,
    attestation({
      freshness: 'stale',
      positive: false,
      failureToken: 'containment-unproven',
    }),
  );

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['containment-unproven']);
});

test('P6-AC-2: honest weak proof against a strong expectation records containment-unproven and routes', () => {
  const decision = authorizeRequest(
    request,
    story,
    policy,
    attestation({
      reportedIsolationStrength: 'weak',
      provenIsolationStrength: 'weak',
    }),
  );

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['containment-unproven']);
});
