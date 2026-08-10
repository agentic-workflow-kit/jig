import assert from 'node:assert/strict';
import test from 'node:test';

const runtime = await import('../dist/index.js');

const digest = (char) => {
  const value = /^[0-9a-f]$/.test(char) ? char : ((char.charCodeAt(0) - 97) % 16).toString(16);
  return value.repeat(64);
};
const run = 'run-000000000043-0123456789abcdef';
const story = `${run}/story/finalizer`;
const generation = `${run}/gen/1|controller`;
const operation = (n) => `${run}/txn/${n}/${generation}|${digest('b')}/op/1`;

const binding = {
  descriptor: digest('c'),
  registry: `registry/${digest('c')}`,
  target: 'target/finalizer',
};

const policy = runtime.createFinalizerPolicy({
  posture: 'deterministic',
  requiredClasses: ['test'],
  waitCapacitySeconds: 3600,
  waitTargetSeconds: 3600,
  refreshLimit: 2,
});

const nonePolicy = runtime.createFinalizerPolicy({
  posture: 'none',
  requiredClasses: [],
  waitCapacitySeconds: 3600,
  waitTargetSeconds: 3600,
  refreshLimit: 2,
});

const makeWaiter = (key, ordinal, policyValue, operationNumber = ordinal, digestChar = 'a') => {
  const itemStory = `${run}/story/${key}`;
  return {
    operation: operation(operationNumber),
    run,
    story: itemStory,
    candidate: `${itemStory}/cand/1|${digest(digestChar)}`,
    candidateContentDigest: digest(digestChar),
    targetBasisDigest: digest('d'),
    generation,
    comparator: { priority: 1, ordinal, story: itemStory },
    eligibilityBasis: digest('e'),
    acceptedPackageDigest: digest('f'),
    policy: policyValue,
    waitedAt: 0,
  };
};

const observation = (authority, intent, outcome = 'pass') => ({
  kind: 'EV-CHECK-OBSERVATION',
  operation: intent.operation,
  candidate: authority.candidate,
  candidateContentDigest: authority.candidateContentDigest,
  targetBasisDigest: authority.targetBasisDigest,
  generation: authority.generation,
  checkClass: intent.checkClass,
  outcome,
  evidenceDigest: digest('g'),
  observedAt: 1,
});

const targetFact = (operationId, bindingValue, outcome, targetBasisDigest = digest('d'), anchorRegistry = null) => ({
  schema: runtime.FINALIZER_EVENT_SCHEMA,
  kind: 'EV-TARGET-FACT',
  operation: operationId,
  target: bindingValue.target,
  registry: bindingValue.registry,
  targetBasisDigest,
  anchorRegistry,
  outcome,
  observedAt: 2,
});

test('GF-043 comparator-least grant enters a fenced verification gate and rejects delivery before a pass', () => {
  assert.equal(policy.ok, true);
  const controller = runtime.createScriptedFinalizerController({ binding });
  assert.equal(controller.ok, true);
  const first = controller.value.enqueue({ ...makeWaiter('finalizer', 1, policy.value), operation: operation(1) });
  assert.equal(first.ok, true);
  const grant = controller.value.grant({ operation: operation(2), story, waitedAt: 0 });
  assert.equal(grant.ok, true);
  const entry = controller.value.enterFinalizing({
    operation: operation(3),
    origin: 'Waiting',
    verificationOperations: [{ operation: operation(4), checkClass: 'test' }],
  });
  assert.equal(entry.ok, true);
  assert.equal(controller.value.authorizeAnchor({ operation: operation(5), authority: grant.value }).ok, false);
  assert.equal(
    controller.value.observeVerification({
      authority: grant.value,
      observation: observation(grant.value, entry.value.verificationOperations[0]),
    }).ok,
    true,
  );
  const anchor = controller.value.authorizeAnchor({ operation: operation(5), authority: grant.value });
  assert.equal(anchor.ok, true);
  assert.equal(controller.value.authorizeAnchor({ operation: operation(5), authority: grant.value }).ok, true);
});

test('CF-ORDER/CF-CAPACITY: registry witness grants only comparator-least and preserves one holder', () => {
  const controller = runtime.createScriptedFinalizerController({ binding });
  assert.equal(controller.ok, true);
  const high = makeWaiter('high', 2, policy.value, 10, 'h');
  const low = makeWaiter('low', 1, policy.value, 11, 'i');
  assert.equal(controller.value.enqueue(high).ok, true);
  assert.equal(controller.value.enqueue(low).ok, true);
  assert.equal(controller.value.grant({ operation: operation(12), story: high.story, waitedAt: 0 }).ok, false);
  const granted = controller.value.grant({ operation: operation(13), story: low.story, waitedAt: 0 });
  assert.equal(granted.ok, true);
  assert.equal(controller.value.grant({ operation: operation(14), story: high.story, waitedAt: 0 }).ok, false);
  assert.equal(controller.value.projection().authority.story, low.story);
});

test('MC-043-ENTRY and none posture: explicit no-op creates no verification operations or observations', () => {
  assert.equal(nonePolicy.ok, true);
  const controller = runtime.createScriptedFinalizerController({ binding });
  const waiter = controller.value.enqueue(makeWaiter('none', 1, nonePolicy.value, 20, 'j'));
  assert.equal(waiter.ok, true);
  const granted = controller.value.grant({ operation: operation(21), story: waiter.value.story, waitedAt: 0 });
  assert.equal(granted.ok, true);
  const entry = controller.value.enterFinalizing({
    operation: operation(22),
    origin: 'Waiting',
    verificationOperations: [],
  });
  assert.equal(entry.ok, true);
  assert.equal(entry.value.noOp, true);
  assert.equal(entry.value.readyForDelivery, true);
  assert.deepEqual(entry.value.verificationOperations, []);
  assert.equal(controller.value.authorizeAnchor({ operation: operation(23), authority: granted.value }).ok, true);
});

test('MC-043-VERIFY-GATE and MC-043-FENCE: stale observations, required failures, and duplicate facts fail closed', () => {
  const controller = runtime.createScriptedFinalizerController({ binding });
  const waiter = controller.value.enqueue(makeWaiter('negative', 1, policy.value, 30, 'k'));
  const granted = controller.value.grant({ operation: operation(31), story: waiter.value.story, waitedAt: 0 });
  const entry = controller.value.enterFinalizing({
    operation: operation(32),
    origin: 'Waiting',
    verificationOperations: [{ operation: operation(33), checkClass: 'test' }],
  });
  assert.equal(waiter.ok && granted.ok && entry.ok, true);
  assert.deepEqual(
    controller.value.observeVerification({
      authority: granted.value,
      observation: {
        ...observation(granted.value, entry.value.verificationOperations[0]),
        targetBasisDigest: digest('z'),
      },
    }).error,
    { family: 'FC-FENCE', code: 'CHECK_OBSERVATION_FENCE_MISMATCH' },
  );
  assert.equal(
    controller.value.observeVerification({
      authority: granted.value,
      observation: observation(granted.value, entry.value.verificationOperations[0], 'fail'),
    }).ok,
    true,
  );
  assert.equal(controller.value.projection().status, 'Reworking');
  assert.equal(controller.value.authorizeAnchor({ operation: operation(34), authority: granted.value }).ok, false);
  assert.equal(
    controller.value.release({ operation: operation(35), authority: granted.value, reason: 'rework' }).ok,
    true,
  );
  assert.equal(
    controller.value.release({ operation: operation(35), authority: granted.value, reason: 'rework' }).ok,
    true,
  );
});

test('MC-043-ANCHOR/MC-043-REFRESH: target conflict parks, refresh retains authority, requires re-acceptance, and rebinds atomically', () => {
  const controller = runtime.createScriptedFinalizerController({ binding });
  const waiter = controller.value.enqueue(makeWaiter('refresh', 1, nonePolicy.value, 40, 'l'));
  const granted = controller.value.grant({ operation: operation(41), story: waiter.value.story, waitedAt: 0 });
  const entry = controller.value.enterFinalizing({
    operation: operation(42),
    origin: 'Waiting',
    verificationOperations: [],
  });
  const anchor = controller.value.authorizeAnchor({ operation: operation(43), authority: granted.value });
  assert.equal(waiter.ok && granted.ok && entry.ok && anchor.ok, true);
  assert.equal(
    controller.value.recordTargetFact({
      authority: granted.value,
      fact: targetFact(anchor.value.operation, binding, 'conflict', digest('d'), `registry/${digest('r')}`),
    }).ok,
    true,
  );
  assert.equal(controller.value.projection().status, 'TargetPark');
  const nextStoryCandidate = `${waiter.value.story}/cand/2|${digest('m')}`;
  const refreshed = controller.value.refresh({
    operation: operation(44),
    authority: granted.value,
    candidate: nextStoryCandidate,
    candidateContentDigest: digest('m'),
    targetBasisDigest: digest('n'),
    acceptedPackageDigest: digest('p'),
    generation,
    workspaceFact: {
      kind: 'EV-WORKSPACE-FACT',
      candidate: nextStoryCandidate,
      candidateContentDigest: digest('m'),
      targetBasisDigest: digest('n'),
      contentDigest: digest('o'),
    },
    acceptance: {
      state: 'Accepted',
      candidate: nextStoryCandidate,
      candidateContentDigest: digest('m'),
      targetBasisDigest: digest('n'),
      packageDigest: digest('p'),
    },
  });
  assert.equal(refreshed.ok, true);
  assert.equal(refreshed.value.candidate, nextStoryCandidate);
  assert.equal(controller.value.projection().status, 'Accepted');
  assert.equal(controller.value.projection().waiters[0].comparator.ordinal, 1);
  assert.equal(controller.value.projection().waiters[0].candidate, nextStoryCandidate);
  assert.equal(controller.value.projection().waiters[0].targetBasisDigest, digest('n'));
  assert.equal(controller.value.projection().waiters[0].acceptedPackageDigest, digest('p'));
  assert.equal(
    controller.value.refresh({
      operation: operation(44),
      authority: granted.value,
      candidate: nextStoryCandidate,
      candidateContentDigest: digest('m'),
      targetBasisDigest: digest('n'),
      acceptedPackageDigest: digest('p'),
      generation,
      workspaceFact: {
        kind: 'EV-WORKSPACE-FACT',
        candidate: nextStoryCandidate,
        candidateContentDigest: digest('m'),
        targetBasisDigest: digest('n'),
        contentDigest: digest('o'),
      },
      acceptance: {
        state: 'Accepted',
        candidate: nextStoryCandidate,
        candidateContentDigest: digest('m'),
        targetBasisDigest: digest('n'),
        packageDigest: digest('p'),
      },
    }).ok,
    true,
  );
});

test('MC-043-RECOVERY and ID-OP: lost acknowledgements reconcile once and journal replay restores exact state', () => {
  const registry = runtime.createScriptedRegistry();
  const controller = runtime.createScriptedFinalizerController({ binding, registry });
  const waiter = controller.value.enqueue({
    ...makeWaiter('recovery', 1, nonePolicy.value, 50, 'q'),
    fault: 'lost-ack',
  });
  assert.equal(waiter.ok, true);
  const granted = controller.value.grant({
    operation: operation(51),
    story: waiter.value.story,
    waitedAt: 0,
    fault: 'lost-ack',
  });
  assert.equal(granted.ok, true);
  assert.equal(controller.value.grant({ operation: operation(51), story: waiter.value.story, waitedAt: 0 }).ok, true);
  const snapshot = controller.value.snapshot();
  const restored = runtime.restoreScriptedFinalizerController(snapshot, { binding, registry });
  assert.equal(restored.ok, true);
  assert.deepEqual(restored.value.projection(), controller.value.projection());
  assert.equal(
    restored.value.wake({ operation: operation(52), event: 'EV-WAKE-FINALIZATION', elapsedSeconds: 1 }).ok,
    true,
  );
  assert.equal(restored.value.reachability().landingEnabled, false);
});
