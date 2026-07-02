import test from "node:test";
import assert from "node:assert";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

test("CLI smoke test: valid minimal plan", () => {
  const output = execSync(
    "node bin/jig.js run test/fixtures/m5b-local-mvp/minimal-plan.json",
    { encoding: "utf8" },
  );
  assert.match(output, /Final Status: success/);
  assert.match(output, /Records Directory: runs\/run-plan-minimal-local-/);

  const runDirMatch = output.match(
    /Records Directory: (runs\/run-plan-minimal-local-\d+)/,
  );
  if (runDirMatch) {
    const runDir = runDirMatch[1];
    assert.ok(existsSync(join(runDir, "run.json")));
    assert.ok(existsSync(join(runDir, "events.jsonl")));

    const runRecord = JSON.parse(
      readFileSync(join(runDir, "run.json"), "utf8"),
    );
    assert.strictEqual(runRecord.run.status, "success");
  }
});

test("CLI smoke test: invalid plan rejection", () => {
  assert.throws(() => {
    execSync(
      "node bin/jig.js run test/fixtures/m5b-local-mvp/invalid-plan.json",
      { stdio: "pipe" },
    );
  }, /Invalid plan: unknown version "unknown-version"/);
});

test("CLI smoke test: scripted worker failure", () => {
  try {
    execSync(
      "node bin/jig.js run test/fixtures/m5b-local-mvp/minimal-plan.json --scripted-output test/fixtures/m5b-local-mvp/scripted-worker-failure.json",
      { encoding: "utf8", stdio: "pipe" },
    );
    assert.fail("Should have failed");
  } catch (err) {
    const output = err.stdout.toString();
    assert.match(output, /Final Status: failure/);
    assert.match(output, /- STORY-1: failed/);
  }
});

test("CLI smoke test: failure diagnostics existence", () => {
  try {
    execSync(
      "node bin/jig.js run test/fixtures/m5b-local-mvp/minimal-plan.json --scripted-output test/fixtures/m5b-local-mvp/scripted-worker-failure.json",
      { encoding: "utf8", stdio: "pipe" },
    );
    assert.fail("Should have failed");
  } catch (err) {
    const output = err.stdout.toString();
    const runDirMatch = output.match(
      /Records Directory: (runs\/run-plan-minimal-local-\d+)/,
    );
    if (runDirMatch) {
      const runDir = runDirMatch[1];
      const runRecord = JSON.parse(
        readFileSync(join(runDir, "run.json"), "utf8"),
      );
      const failedEvent = runRecord.events.find(
        (e) => e.family === "story.failed",
      );
      assert.ok(failedEvent.diagnostics, "Missing diagnostics in failed event");
      assert.strictEqual(failedEvent.diagnostics.exitCode, 1);
      assert.match(failedEvent.diagnostics.stdout, /Check failed/);
    }
  }
});

test("CLI smoke test: multi-item success", () => {
  const output = execSync(
    "node bin/jig.js run test/fixtures/m5b-local-mvp/multi-item-plan-success.json --scripted-output test/fixtures/m5b-local-mvp/scripted-worker-multi-success.json",
    { encoding: "utf8" },
  );
  assert.match(output, /Final Status: success/);
});

test("CLI smoke test: multi-item failure with blocked/skipped", () => {
  try {
    execSync(
      "node bin/jig.js run test/fixtures/m5b-local-mvp/multi-item-plan-failure-blocks-dependent.json --scripted-output test/fixtures/m5b-local-mvp/scripted-worker-multi-failure-story-1.json",
      { encoding: "utf8", stdio: "pipe" },
    );
    assert.fail("Should have failed");
  } catch (err) {
    const output = err.stdout.toString();
    assert.match(output, /Final Status: failure/);

    const runDirMatch = output.match(
      /Records Directory: (runs\/run-multi-item-failure-\d+)/,
    );
    if (runDirMatch) {
      const runDir = runDirMatch[1];
      const runRecord = JSON.parse(
        readFileSync(join(runDir, "run.json"), "utf8"),
      );
      assert.ok(
        runRecord.events.find(
          (e) => e.family === "story.failed" && e.storyId === "STORY-1",
        ),
      );
      assert.ok(
        runRecord.events.find(
          (e) => e.family === "story.blocked" && e.storyId === "STORY-2",
        ),
      );
      assert.ok(
        runRecord.events.find(
          (e) => e.family === "story.skipped" && e.storyId === "STORY-3",
        ),
      );
    }
  }
});

test("CLI inspect test: success run", () => {
  const runOutput = execSync(
    "node bin/jig.js run test/fixtures/m5b-local-mvp/minimal-plan.json",
    { encoding: "utf8" },
  );
  const runDirMatch = runOutput.match(
    /Records Directory: (runs\/run-plan-minimal-local-\d+)/,
  );
  if (runDirMatch) {
    const runDir = runDirMatch[1];
    const inspectOutput = execSync(`node bin/jig.js inspect ${runDir}`, {
      encoding: "utf8",
    });
    assert.match(inspectOutput, /--- Run Inspection ---/);
    assert.match(inspectOutput, /Run ID: plan-minimal-local/);
    assert.match(inspectOutput, /Final Status: success/);
    assert.match(inspectOutput, /Mode: local-dry-run/);
    assert.match(inspectOutput, /- STORY-1: done/);
  } else {
    assert.fail("Failed to find run directory in output");
  }
});

test("CLI inspect test: failure run with blocked/skipped", () => {
  try {
    execSync(
      "node bin/jig.js run test/fixtures/m5b-local-mvp/multi-item-plan-failure-blocks-dependent.json --scripted-output test/fixtures/m5b-local-mvp/scripted-worker-multi-failure-story-1.json",
      { encoding: "utf8", stdio: "pipe" },
    );
  } catch (err) {
    const runOutput = err.stdout.toString();
    const runDirMatch = runOutput.match(
      /Records Directory: (runs\/run-multi-item-failure-\d+)/,
    );
    if (runDirMatch) {
      const runDir = runDirMatch[1];
      const inspectOutput = execSync(`node bin/jig.js inspect ${runDir}`, {
        encoding: "utf8",
      });
      assert.match(inspectOutput, /--- Run Inspection ---/);
      assert.match(inspectOutput, /Final Status: failure/);
      assert.match(inspectOutput, /- STORY-1: failed/);
      assert.match(inspectOutput, /- STORY-2: blocked \(blocked by STORY-1\)/);
      assert.match(
        inspectOutput,
        /- STORY-3: skipped \(run stopped after failure\)/,
      );
      assert.match(inspectOutput, /Diagnostics:/);
      assert.match(inspectOutput, /error: Failing intentionally/);
    } else {
      assert.fail("Failed to find run directory in output");
    }
  }
});

test("CLI inspect test: invalid run path", () => {
  try {
    execSync("node bin/jig.js inspect non-existent-dir", { stdio: "pipe" });
    assert.fail("Should have failed");
  } catch (err) {
    assert.match(
      err.stderr.toString(),
      /Error: Run directory "non-existent-dir" does not exist/,
    );
  }
});

test("CLI run test: validation error includes path and reason", () => {
  try {
    execSync(
      "node bin/jig.js run test/fixtures/m5b-local-mvp/invalid-plan.json",
      { stdio: "pipe" },
    );
    assert.fail("Should have failed");
  } catch (err) {
    assert.match(
      err.stderr.toString(),
      /Plan validation failed for "test\/fixtures\/m5b-local-mvp\/invalid-plan.json": Invalid plan: unknown version "unknown-version"/,
    );
  }
});

test("CLI inspect test: shows changed files if present", () => {
  const scriptedWithFiles = {
    storyId: "STORY-1",
    outcome: "success",
    changedFiles: ["src/cli.js", "src/records.js"],
    evidence: { result: "passed" },
  };
  const scriptedPath = "test/fixtures/m5b-local-mvp/scripted-with-files.json";
  writeFileSync(scriptedPath, JSON.stringify(scriptedWithFiles));

  const runOutput = execSync(
    `node bin/jig.js run test/fixtures/m5b-local-mvp/minimal-plan.json --scripted-output ${scriptedPath}`,
    { encoding: "utf8" },
  );
  const runDirMatch = runOutput.match(
    /Records Directory: (runs\/run-plan-minimal-local-\d+)/,
  );
  if (runDirMatch) {
    const runDir = runDirMatch[1];
    const inspectOutput = execSync(`node bin/jig.js inspect ${runDir}`, {
      encoding: "utf8",
    });
    assert.match(inspectOutput, /Changed files: src\/cli.js, src\/records.js/);
  }
});
