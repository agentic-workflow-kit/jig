import assert from 'node:assert';
import { test } from 'vitest';
import { authorizeRequest } from '../src/authorization.js';
import type { CapabilityAttestation } from '../src/ports.js';
import type { AuthorizationRequest, PolicyDoc, Story } from '../src/types.js';

const story: Story = {
  id: 'STORY-capability-proof',
  title: 'Capability proof story',
  scope: ['src/**'],
  authority: {
    requests: ['edit-files'],
  },
};

const policy: PolicyDoc = {
  policy: {
    id: 'policy:capability-isolation',
    rules: {
      allowLocalDryRun: true,
      capabilityIsolation: {
        'filesystem-edit': 'strong',
      },
    },
  },
};

const request: AuthorizationRequest = {
  id: 'REQ-edit-files',
  kind: 'edit-files',
  paths: ['src/harness.ts'],
  capability: 'filesystem-edit',
};

function attestation(overrides: Partial<CapabilityAttestation>): CapabilityAttestation {
  return {
    driverId: 'reference-agent',
    runContext: 'run-123',
    capability: 'filesystem-edit',
    freshness: 'fresh',
    positive: true,
    reportedIsolationStrength: 'strong',
    provenIsolationStrength: 'strong',
    ...overrides,
  };
}

test('P5-AC-2: fresh positive strong proof preserves the default grant basis', () => {
  const decision = authorizeRequest(request, story, policy, attestation({}));

  assert.strictEqual(decision.outcome, 'grant');
  assert.deepStrictEqual(decision.basis, ['declared-request', 'in-scope', 'CFG-10:reversible']);
});

test('P5-AC-2: stale proof routes and records containment-unproven', () => {
  const decision = authorizeRequest(request, story, policy, attestation({ freshness: 'stale' }));

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['containment-unproven']);
});

test('P5-AC-2: missing proof routes and records containment-unproven', () => {
  const decision = authorizeRequest(request, story, policy, attestation({ freshness: 'missing', positive: false }));

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['containment-unproven']);
});

test('P5-AC-2: omitted request capability under capability policy routes as unproven', () => {
  const { capability, ...requestWithoutCapability } = request;
  const decision = authorizeRequest(requestWithoutCapability, story, policy, attestation({}));

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['containment-unproven']);
  assert.strictEqual(capability, 'filesystem-edit');
});

test('P5-AC-2: strong self-report with weak proof routes and records isolation-strength-overstated', () => {
  const decision = authorizeRequest(
    request,
    story,
    policy,
    attestation({
      reportedIsolationStrength: 'strong',
      provenIsolationStrength: 'weak',
    }),
  );

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['isolation-strength-overstated']);
});

test('P5-AC-2: workspace-collision failure token passes through as a routed basis', () => {
  const decision = authorizeRequest(request, story, policy, attestation({ failureToken: 'workspace-collision' }));

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['workspace-collision']);
});

test('P5-AC-2: containment-unproven failure token passes through as a routed basis', () => {
  const decision = authorizeRequest(request, story, policy, attestation({ failureToken: 'containment-unproven' }));

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['containment-unproven']);
});
