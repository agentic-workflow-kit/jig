import { PlanValidator } from "./plan-validator.js";
import { loadJson, loadConfig, loadPolicy } from "./loaders.js";
import { LocalHarness } from "./harness.js";
import { ScriptedWorker } from "./worker.js";
import { RecordManager } from "./records.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function run() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "run") {
    await handleRun(args.slice(1));
  } else if (command === "inspect") {
    await handleInspect(args.slice(1));
  } else {
    printUsage();
    process.exit(1);
  }
}

function printUsage() {
  console.error("Usage:");
  console.error(
    "  jig run <plan> [--config <config>] [--policy <policy>] [--scripted-output <output>]",
  );
  console.error("  jig inspect <run-directory>");
}

async function handleRun(args) {
  if (!args[0]) {
    printUsage();
    process.exit(1);
  }

  const planPath = args[0];
  const configPath =
    getArg(args, "--config") || "test/fixtures/m5b-local-mvp/local-config.json";
  const policyPath =
    getArg(args, "--policy") || "test/fixtures/m5b-local-mvp/local-policy.json";
  const scriptedOutputPath =
    getArg(args, "--scripted-output") ||
    "test/fixtures/m5b-local-mvp/scripted-worker-success.json";

  try {
    const planInstance = loadJson(planPath);
    try {
      PlanValidator.validate(planInstance);
    } catch (err) {
      throw new Error(
        `Plan validation failed for "${planPath}": ${err.message}`,
      );
    }

    const config = loadConfig(configPath);
    const policy = loadPolicy(policyPath);
    const scriptedOutput = loadJson(scriptedOutputPath);

    const worker = new ScriptedWorker(scriptedOutput);
    const recordManager = new RecordManager();
    const harness = new LocalHarness(worker, recordManager);

    const status = await harness.run(planInstance, config, policy);

    if (status !== "success") {
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function handleInspect(args) {
  const runDir = args[0];
  if (!runDir) {
    printUsage();
    process.exit(1);
  }

  if (!existsSync(runDir)) {
    console.error(`Error: Run directory "${runDir}" does not exist`);
    process.exit(1);
  }

  const runJsonPath = join(runDir, "run.json");
  if (!existsSync(runJsonPath)) {
    console.error(`Error: run.json not found in "${runDir}"`);
    process.exit(1);
  }

  try {
    const runRecord = JSON.parse(readFileSync(runJsonPath, "utf8"));
    const { run, events } = runRecord;

    console.log("\n--- Run Inspection ---");
    console.log(`Run ID: ${run.id}`);
    console.log(`Plan ID: ${run.planId}`);
    console.log(`Final Status: ${run.status}`);
    if (run.mode) {
      console.log(`Mode: ${run.mode}`);
    }
    console.log(`Records Directory: ${runDir}`);

    // Item-level outcomes
    const items = events.filter((e) =>
      ["story.done", "story.failed", "story.blocked", "story.skipped"].includes(
        e.family,
      ),
    );
    if (items.length > 0) {
      console.log("\nItems:");
      for (const item of items) {
        let outcome = item.family.replace("story.", "");
        let details = "";
        if (item.family === "story.blocked") {
          details = ` (blocked by ${item.blockedBy})`;
        } else if (item.family === "story.skipped") {
          details = ` (${item.reason})`;
        }
        console.log(`  - ${item.storyId}: ${outcome}${details}`);

        if (item.family === "story.failed" && item.diagnostics) {
          console.log("    Diagnostics:");
          if (item.diagnostics.exitCode !== undefined)
            console.log(`      exitCode: ${item.diagnostics.exitCode}`);
          if (item.diagnostics.error)
            console.log(`      error: ${item.diagnostics.error}`);
          if (item.diagnostics.stdout)
            console.log(
              `      stdout: ${item.diagnostics.stdout.trim().split("\n")[0]}...`,
            );
        }

        if (
          item.changedFiles &&
          Array.isArray(item.changedFiles) &&
          item.changedFiles.length > 0
        ) {
          console.log(`    Changed files: ${item.changedFiles.join(", ")}`);
        }
      }
    }

    console.log("----------------------\n");
  } catch (err) {
    console.error(`Error: Failed to parse run.json: ${err.message}`);
    process.exit(1);
  }
}

function getArg(args, name) {
  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return null;
}
