import assert from 'node:assert/strict';
import test from 'node:test';

const runtime = await import('../dist/index.js');
const plan = JSON.parse(
  '{"version":"jig.plan.v1","track":"track/one","policy":{"frozenCheckClasses":["check/unit"],"capacities":{"cpu":3},"reserves":{"cpu":1}},"stories":[{"key":"story/one","track":"track/one","dependsOn":[],"done":{"kind":"checks-pass","checkClasses":["check/unit"]},"requirements":["r"],"acceptanceCriteria":["a"],"demand":{"cpu":1}}]}',
);
test('R03 second-review RED: public plan validator rejects special-key maps', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const value = structuredClone(plan);
    Object.defineProperty(value.policy.capacities, key, { value: 2, enumerable: true });
    Object.defineProperty(value.policy.reserves, key, { value: 1, enumerable: true });
    assert.equal(runtime.validateSourcePlan(value).ok, false);
  }
});
