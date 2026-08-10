import assert from 'node:assert/strict';
import test from 'node:test';

const { classifyProcessFailure } = await import('../dist/process-failure.js');
const fallback = { family: 'FC-AUTHORITY', code: 'COMMAND_LAUNCH_FAILED' };

test('zero and negative child statuses are typed malformed failures, never ordinary observations', () => {
  for (const status of [0, -1]) {
    assert.deepEqual(classifyProcessFailure({ status, signal: null, code: null }, fallback), {
      family: 'FC-MECHANISM',
      code: 'MALFORMED_COMMAND_RESULT',
    });
  }
});

test('only a positive numeric child status can produce an ordinary failed observation', () => {
  assert.equal(classifyProcessFailure({ status: 1, signal: null, code: null, stderr: '' }, fallback), undefined);
  assert.deepEqual(
    classifyProcessFailure({ status: 1, signal: null, code: null, stderr: 'sandbox denied' }, fallback),
    {
      family: 'FC-AUTHORITY',
      code: 'SANDBOX_CONFINEMENT_FAILED',
    },
  );
});
