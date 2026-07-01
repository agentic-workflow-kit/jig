import test from 'node:test';
import assert from 'node:assert';
import { PlanValidator } from '../src/plan-validator.js';

test('PlanValidator accepts valid minimal plan', () => {
  const plan = {
    plan: {
      id: 'valid-id',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1' }]
    }
  };
  assert.deepStrictEqual(PlanValidator.validate(plan), plan);
});

test('PlanValidator rejects missing root plan', () => {
  assert.throws(() => PlanValidator.validate({}), /missing root "plan" object/);
});

test('PlanValidator rejects unknown version', () => {
  const plan = { plan: { version: 'v99' } };
  assert.throws(() => PlanValidator.validate(plan), /unknown version "v99"/);
});

test('PlanValidator rejects missing stories', () => {
  const plan = { plan: { id: 'id', version: 'execution-plan-shape-v0' } };
  assert.throws(() => PlanValidator.validate(plan), /missing or empty "stories" array/);
});

test('PlanValidator rejects malformed id', () => {
  const plan = { plan: { id: 123, version: 'execution-plan-shape-v0', stories: [{ id: 'S1', title: 'T1' }] } };
  assert.throws(() => PlanValidator.validate(plan), /missing or malformed "id"/);
});

test('PlanValidator rejects malformed story', () => {
  const plan = { plan: { id: 'id', version: 'execution-plan-shape-v0', stories: [{ id: 'S1' }] } };
  assert.throws(() => PlanValidator.validate(plan), /missing "id" or "title"/);
});
