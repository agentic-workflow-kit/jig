import test from "node:test";
import assert from "node:assert";
import { ScriptedWorker } from "../src/worker.js";

test("ScriptedWorker rejects story ID mismatch", async () => {
  const worker = new ScriptedWorker({ storyId: "OTHER" });
  await assert.rejects(
    () => worker.execute({ id: "STORY-1" }),
    /Worker mismatch/,
  );
});

test("ScriptedWorker supports multi-output format", async () => {
  const scriptedOutput = {
    stories: [
      { storyId: "S1", outcome: "success" },
      { storyId: "S2", outcome: "failure" },
    ],
  };
  const worker = new ScriptedWorker(scriptedOutput);

  const r1 = await worker.execute({ id: "S1" });
  assert.strictEqual(r1.outcome, "success");

  const r2 = await worker.execute({ id: "S2" });
  assert.strictEqual(r2.outcome, "failure");
});

test("ScriptedWorker multi-output rejects missing story", async () => {
  const scriptedOutput = {
    stories: [{ storyId: "S1", outcome: "success" }],
  };
  const worker = new ScriptedWorker(scriptedOutput);
  await assert.rejects(
    () => worker.execute({ id: "S2" }),
    /no scripted output found for story "S2"/,
  );
});
