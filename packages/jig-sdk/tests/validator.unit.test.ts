import assert from 'node:assert';
import { test } from 'vitest';
import { PlanValidator } from '../src/plan-validator.js';

test('PlanValidator accepts valid minimal plan', () => {
  const plan = {
    plan: {
      id: 'valid-id',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1' }],
    },
  };
  assert.deepStrictEqual(PlanValidator.validate(plan), plan);
});

test('PR-AC-8: PlanValidator accepts dotted plan and story IDs', () => {
  const plan = {
    plan: {
      id: 'plan-v1.2',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'story-v1.2', title: 'T1' }],
    },
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
  const plan = {
    plan: {
      id: 123,
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1' }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /missing or malformed "id"/);
});

test('PlanValidator rejects malformed story', () => {
  const plan = {
    plan: {
      id: 'id',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1' }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /missing "id" or "title"/);
});

test('PlanValidator rejects path traversal in plan id', () => {
  const plan = {
    plan: {
      id: '../escaped',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1' }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /unsafe "id" containing path traversal characters/);
});

test('PR-AC-8: PlanValidator rejects double-dot sequence in plan id', () => {
  const plan = {
    plan: {
      id: 'plan..escaped',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1' }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /unsafe "id" containing path traversal characters/);
});

test('PR-AC-8: PlanValidator rejects path separator in plan id', () => {
  const plan = {
    plan: {
      id: 'plan/escaped',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1' }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /unsafe "id" containing path traversal characters/);
});

test('PlanValidator rejects path traversal in story id', () => {
  const plan = {
    plan: {
      id: 'valid-id',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1/../../etc/passwd', title: 'T1' }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /unsafe "id" containing path traversal characters/);
});

test('PR-AC-8: PlanValidator rejects double-dot sequence in story id', () => {
  const plan = {
    plan: {
      id: 'valid-id',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'story..escaped', title: 'T1' }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /unsafe "id" containing path traversal characters/);
});

test('PlanValidator rejects unknown dependency', () => {
  const plan = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1', dependsOn: ['UNKNOWN'] }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /is unknown or appears later in the plan/);
});

test('PlanValidator rejects late dependency', () => {
  const plan = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'S1', title: 'T1', dependsOn: ['S2'] },
        { id: 'S2', title: 'T2' },
      ],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /is unknown or appears later in the plan/);
});

test('PlanValidator rejects self-dependency', () => {
  const plan = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1', dependsOn: ['S1'] }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /self-dependency not allowed/);
});

test('PlanValidator rejects non-array dependsOn', () => {
  const plan = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1', dependsOn: 'S2' }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /"dependsOn" must be an array/);
});

test('PlanValidator rejects duplicate story IDs', () => {
  const plan = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [
        { id: 'S1', title: 'T1' },
        { id: 'S1', title: 'T2' },
      ],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /duplicate "id" "S1"/);
});

test('PlanValidator rejects dependsOn as null', () => {
  const plan = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1', dependsOn: null }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /"dependsOn" must be an array/);
});

test('PlanValidator rejects dependsOn as false', () => {
  const plan = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1', dependsOn: false }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /"dependsOn" must be an array/);
});

test('PlanValidator rejects dependsOn as empty string', () => {
  const plan = {
    plan: {
      id: 'p1',
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'S1', title: 'T1', dependsOn: '' }],
    },
  };
  assert.throws(() => PlanValidator.validate(plan), /"dependsOn" must be an array/);
});
