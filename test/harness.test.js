import test from "node:test";
import assert from "node:assert";
import { LocalHarness } from "../src/harness.js";

test("LocalHarness sequential execution success", async () => {
  const worker = {
    execute: async (story) => ({
      outcome: "success",
      evidence: { result: "passed" },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan = { plan: { id: "p1", stories: [{ id: "s1" }] } };
  const policy = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, "success");
});

test("LocalHarness sequential execution failure", async () => {
  const worker = {
    execute: async (story) => ({
      outcome: "failure",
      evidence: { result: "failed" },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan = { plan: { id: "p1", stories: [{ id: "s1" }] } };
  const policy = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, "failure");
});

test("LocalHarness sequential execution catch worker error", async () => {
  const worker = {
    execute: async (story) => {
      throw new Error("Worker exploded");
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan = { plan: { id: "p1", stories: [{ id: "s1" }] } };
  const policy = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, "failure");
});

test("LocalHarness enforces allowLocalDryRun policy", async () => {
  const worker = {
    execute: async () => {
      assert.fail("Worker should not be called");
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan = { plan: { id: "p1", stories: [{ id: "s1" }] } };
  const policy = { policy: { id: "pol1", rules: { allowLocalDryRun: false } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, "failure");
});

test("LocalHarness handles multi-item success", async () => {
  const events = [];
  const worker = {
    execute: async (story) => ({
      outcome: "success",
      evidence: { result: "passed" },
    }),
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan = {
    plan: {
      id: "p1",
      stories: [
        { id: "s1", dependsOn: [] },
        { id: "s2", dependsOn: ["s1"] },
      ],
    },
  };
  const policy = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, "success");

  const doneEvents = events.filter((e) => e.family === "story.done");
  assert.strictEqual(doneEvents.length, 2);
  assert.strictEqual(doneEvents[0].storyId, "s1");
  assert.strictEqual(doneEvents[1].storyId, "s2");
});

test("LocalHarness handles multi-item failure with blocking and skipping", async () => {
  const events = [];
  const worker = {
    execute: async (story) => {
      if (story.id === "s1")
        return { outcome: "failure", evidence: { result: "failed" } };
      return { outcome: "success" };
    },
  };
  const recordManager = {
    init: () => {},
    recordEvent: (e) => events.push(e),
    finalize: async () => {},
    printSummary: () => {},
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan = {
    plan: {
      id: "p1",
      stories: [
        { id: "s1", dependsOn: [] },
        { id: "s2", dependsOn: ["s1"] },
        { id: "s3", dependsOn: [] },
      ],
    },
  };
  const policy = { policy: { rules: { allowLocalDryRun: true } } };
  const status = await harness.run(plan, {}, policy);
  assert.strictEqual(status, "failure");

  assert.ok(
    events.find((e) => e.family === "story.failed" && e.storyId === "s1"),
  );
  assert.ok(
    events.find(
      (e) =>
        e.family === "story.blocked" &&
        e.storyId === "s2" &&
        e.blockedBy === "s1",
    ),
  );
  assert.ok(
    events.find((e) => e.family === "story.skipped" && e.storyId === "s3"),
  );
  assert.ok(events.find((e) => e.family === "run.stopped"));
});
