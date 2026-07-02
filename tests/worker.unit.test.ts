import assert from 'node:assert';
import { test } from 'vitest';
import type { Worker } from '../src/types.js';
import { ScriptedWorker } from '../src/worker.js';

test('ScriptedWorker rejects story ID mismatch', async () => {
  const worker = new ScriptedWorker({ storyId: 'OTHER' });
  await assert.rejects(() => worker.execute({ id: 'STORY-1', title: 'Story One' }), /Worker mismatch/);
});

test('ScriptedWorker supports multi-output format', async () => {
  const scriptedOutput = {
    stories: [
      { storyId: 'S1', outcome: 'success' },
      { storyId: 'S2', outcome: 'failure' },
    ],
  };
  const worker = new ScriptedWorker(scriptedOutput);

  const r1 = await worker.execute({ id: 'S1', title: 'Story One' });
  assert.strictEqual(r1.outcome, 'success');

  const r2 = await worker.execute({ id: 'S2', title: 'Story Two' });
  assert.strictEqual(r2.outcome, 'failure');
});

test('ScriptedWorker multi-output rejects missing story', async () => {
  const scriptedOutput = {
    stories: [{ storyId: 'S1', outcome: 'success' }],
  };
  const worker = new ScriptedWorker(scriptedOutput);
  await assert.rejects(
    () => worker.execute({ id: 'S2', title: 'Story Two' }),
    /no scripted output found for story "S2"/,
  );
});

test('PR-AC-10: worker surface exposes no push, PR, merge, status, comment, credential, or forge capability', () => {
  const forbiddenPattern = /push|pullrequest|pull-request|pr|merge|status|comment|credential|secret|token|forge/i;
  const prototypeMembers = Object.getOwnPropertyNames(ScriptedWorker.prototype).filter(
    (name) => name !== 'constructor',
  );
  assert.deepStrictEqual(prototypeMembers, ['execute']);
  assert.ok(!prototypeMembers.some((name) => forbiddenPattern.test(name)));

  type Equals<A, B> =
    (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
      ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
        ? true
        : false
      : false;
  type Assert<T extends true> = T;
  const workerInterfaceOnlyExecute: Assert<Equals<keyof Worker, 'execute'>> = true;
  assert.strictEqual(workerInterfaceOnlyExecute, true);
});
