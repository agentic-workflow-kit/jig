import assert from 'node:assert/strict';
import test from 'node:test';

const runtime = await import('../dist/index.js');
const codec = await import('@agentic-workflow-kit/jig-codec');
const digest = (character) => character.repeat(64);

const envelopeInput = () => ({
  plan: {
    version: 'jig.plan.v1',
    track: 'track/default',
    policy: {
      frozenCheckClasses: ['check/unit'],
      capacities: { 'rc-session': 3 },
      reserves: { 'rc-session': 1 },
    },
    stories: [
      {
        key: 'story/one',
        track: 'track/default',
        dependsOn: [],
        done: { kind: 'checks-pass', checkClasses: ['check/unit'] },
        requirements: ['req'],
        acceptanceCriteria: ['accept'],
        demand: { 'rc-session': 1 },
      },
    ],
  },
  policy: {
    track: 'track/default',
    selections: { review: 2, checks: 1 },
    bounds: Object.fromEntries(Object.entries(runtime.ENVELOPE_BOUNDS).map(([id, value]) => [id, value.default])),
    capacities: { 'RC-SESSION': 2, 'RC-FINALIZER': 1 },
    reserves: { 'RC-SESSION': 1 },
  },
  profile: {
    track: 'track/default',
    version: 'v1',
    model: 'model/default',
    provider: 'provider/declarative',
    effort: 'standard',
    cost: 'balanced',
    promptStrategy: { artifact: 'strategy/default', version: 'v1', digest: digest('a') },
    promptDigest: digest('a'),
    roles: [{ role: 'implementer', prompt: 'prompt/one' }],
  },
  artifacts: [
    { track: 'track/default', kind: 'role-prompt', version: 'v1', digest: digest('a'), id: 'prompt/one' },
    {
      track: 'track/default',
      kind: 'prompt-strategy',
      version: 'v1',
      digest: digest('a'),
      id: 'strategy/default',
    },
  ],
  setup: {
    track: 'track/default',
    recipeDigest: digest('c'),
    inputFingerprintRule: 'workspace-v1',
    pathManifest: ['src'],
    ruleManifest: ['review'],
  },
  ruleSurface: { track: 'track/default', version: 'v1', entries: [{ path: 'src', rule: 'review' }] },
  guidance: { rationale: 'why', suitableUse: 'when', tradeoffs: 'cost' },
});

const manifest = (changes = {}) => ({
  credentialAuthority: [],
  dispatchEnabled: false,
  externalServiceAuthority: [],
  filesystemAuthority: [],
  lineage: { kind: 'genesis' },
  manifestVersion: 'provider-authority/v1',
  nativePermissionPostures: [],
  networkAuthority: [],
  providerEnabled: false,
  providerIdentity: 'development-semantic-only/v1',
  recovery: 'fail-closed-no-autonomous-restore',
  runtimeAuthority: { kind: 'in-process-pure-fixture' },
  scope: { phase: 3, purpose: 'development-only' },
  subprocessAuthority: [],
  ...changes,
});

const manifestBytes = (changes) => {
  const framed = codec.encodeFrame(manifest(changes));
  assert.equal(framed.ok, true);
  return framed.value;
};

function approvedFixture() {
  const authority = runtime.createDevelopmentApprovalAuthority();
  const profile = runtime.createDevelopmentPreRun({
    ledger: runtime.createScriptedLedger(),
    approvalVerifier: authority.verifier,
  });
  const preview = profile.preview({ envelope: envelopeInput(), providerManifestBytes: manifestBytes() });
  assert.equal(preview.ok, true);
  const proposalApproval = authority.consumer.approveProposal({ preview: preview.value });
  const manifestApproval = authority.consumer.approveProviderManifest({ preview: preview.value });
  assert.equal(proposalApproval.ok, true);
  assert.equal(manifestApproval.ok, true);
  return {
    authority,
    profile,
    preview: preview.value,
    proposalApproval: proposalApproval.value,
    manifestApproval: manifestApproval.value,
  };
}

test('development profile preview recomposes the envelope and carries no provider or dispatch authority', () => {
  const authority = runtime.createDevelopmentApprovalAuthority();
  const profile = runtime.createDevelopmentPreRun({
    ledger: runtime.createScriptedLedger(),
    approvalVerifier: authority.verifier,
  });
  const preview = profile.preview({ envelope: envelopeInput(), providerManifestBytes: manifestBytes() });
  assert.equal(preview.ok, true);
  assert.equal(preview.value.posture, 'development-semantic-only');
  assert.equal(preview.value.recovery, 'fail-closed-no-autonomous-restore');
  assert.equal(preview.value.providerEnabled, false);
  assert.equal(preview.value.dispatchEnabled, false);
  assert.equal('run' in preview.value, false);
  assert.equal(Object.isFrozen(preview.value), true);

  const changed = envelopeInput();
  changed.policy.selections.review = 3;
  const second = profile.preview({ envelope: changed, providerManifestBytes: manifestBytes() });
  assert.equal(second.ok, true);
  assert.notEqual(second.value.compositionDigest, preview.value.compositionDigest);
});

test('provider manifest digest is derived from canonical bytes and authority-free posture', () => {
  const authority = runtime.createDevelopmentApprovalAuthority();
  const profile = runtime.createDevelopmentPreRun({
    ledger: runtime.createScriptedLedger(),
    approvalVerifier: authority.verifier,
  });
  const preview = profile.preview({ envelope: envelopeInput(), providerManifestBytes: manifestBytes() });
  assert.equal(preview.ok, true);
  const expected = codec.stageDigest({
    domain: 'DEVELOPMENT-PROVIDER-MANIFEST',
    excludePaths: [],
    value: manifest(),
  });
  assert.equal(expected.ok, true);
  assert.equal(preview.value.manifestDigest, expected.value.digest);
  assert.equal(preview.value.manifestId, `provider/development/authority/${expected.value.digest}`);
  assert.equal(
    profile.preview({ envelope: envelopeInput(), providerManifestBytes: manifestBytes({ providerEnabled: true }) }).ok,
    false,
  );
  assert.equal(
    profile.preview({
      envelope: envelopeInput(),
      providerManifest: { manifestId: preview.value.manifestId, manifestDigest: preview.value.manifestDigest },
    }).ok,
    false,
  );
});

test('proposal and provider-manifest approvals are distinct, exact, immutable owner capabilities', () => {
  const { authority, profile, preview, proposalApproval, manifestApproval } = approvedFixture();
  assert.equal(proposalApproval.kind, 'proposal-approved');
  assert.equal(manifestApproval.kind, 'provider-manifest-approved');
  assert.notEqual(proposalApproval.approvalDigest, manifestApproval.approvalDigest);
  assert.deepEqual(authority.consumer.approveProposal({ preview }), {
    ok: true,
    value: proposalApproval,
  });
  assert.equal(authority.consumer.approveProposal({ preview: { ...preview } }).ok, false);
  assert.equal('approveProposal' in profile, false);
  assert.equal('approveProviderManifest' in profile, false);
});

test('accepted development intake is witnessed, idempotent, and is the only path that derives a Run', () => {
  const { profile, preview, proposalApproval, manifestApproval } = approvedFixture();
  const first = profile.submit({
    preview,
    proposalApproval,
    manifestApproval,
    terminalAck: 'accepted',
  });
  assert.equal(first.ok, true);
  assert.equal(first.value.kind, 'acknowledged');
  assert.match(first.value.run, /^run-[0-9]{12}-[0-9a-f]{16}$/u);
  assert.deepEqual(profile.submit({ preview, proposalApproval, manifestApproval, terminalAck: 'accepted' }), first);
  const readback = profile.readback(preview.compositionDigest);
  assert.equal(readback.ok, true);
  assert.deepEqual(readback.value.result, first.value);
  assert.match(readback.value.witnessedHeadDigest, /^[0-9a-f]{64}$/u);
});

test('rejected development intake is witnessed and can never derive a Run', () => {
  const { profile, preview, proposalApproval, manifestApproval } = approvedFixture();
  const rejected = profile.submit({
    preview,
    proposalApproval,
    manifestApproval,
    terminalAck: 'rejected',
  });
  assert.equal(rejected.ok, true);
  assert.equal(rejected.value.kind, 'rejected');
  assert.equal(rejected.value.reason, 'envelope-rejected');
  assert.equal('run' in rejected.value, false);
  const readback = profile.readback(preview.compositionDigest);
  assert.equal(readback.ok, true);
  assert.deepEqual(readback.value.result, rejected.value);
});

test('development intake rejects approval substitution, copied carriers, and changed previews', () => {
  const { authority, profile, preview, proposalApproval, manifestApproval } = approvedFixture();
  assert.equal(
    profile.submit({
      preview,
      proposalApproval: manifestApproval,
      manifestApproval: proposalApproval,
      terminalAck: 'accepted',
    }).ok,
    false,
  );
  assert.equal(
    profile.submit({
      preview: { ...preview },
      proposalApproval,
      manifestApproval,
      terminalAck: 'accepted',
    }).ok,
    false,
  );
  const secondProfile = runtime.createDevelopmentPreRun({
    ledger: runtime.createScriptedLedger(),
    approvalVerifier: authority.verifier,
  });
  const secondPreview = secondProfile.preview({ envelope: envelopeInput(), providerManifestBytes: manifestBytes() });
  assert.equal(secondPreview.ok, true);
  const secondProposalApproval = authority.consumer.approveProposal({ preview: secondPreview.value });
  const secondManifestApproval = authority.consumer.approveProviderManifest({ preview: secondPreview.value });
  assert.equal(secondProposalApproval.ok, true);
  assert.equal(secondManifestApproval.ok, true);
  assert.equal(
    secondProfile.submit({
      preview: secondPreview.value,
      proposalApproval: secondProposalApproval.value,
      manifestApproval: secondManifestApproval.value,
      terminalAck: 'accepted',
    }).ok,
    false,
    'one owner verifier cannot be reused to authorize a second profile',
  );
  for (const forbidden of [
    'approveProposal',
    'approveProviderManifest',
    'configureProvider',
    'enableProvider',
    'dispatch',
    'execute',
  ])
    assert.equal(forbidden in profile, false);
});
