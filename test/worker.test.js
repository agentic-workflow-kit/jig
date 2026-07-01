import test from 'node:test';
import assert from 'node:assert';
import { ScriptedWorker } from '../src/worker.js';

test('ScriptedWorker rejects story ID mismatch', async () => {
  const worker = new ScriptedWorker({ storyId: 'OTHER' });
  await assert.rejects(() => worker.execute({ id: 'STORY-1' }), /Worker mismatch/);
});
