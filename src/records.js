import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

export class RecordManager {
  constructor() {
    this.events = [];
    this.runDir = "";
    this.plan = null;
    this.config = null;
    this.policy = null;
  }

  init(plan, config, policy) {
    this.plan = plan;
    this.config = config;
    this.policy = policy;
    const recordBaseDir = config.runner?.recordDir || "runs";
    this.runDir = join(recordBaseDir, `run-${plan.id}-${Date.now()}`);
    mkdirSync(this.runDir, { recursive: true });
  }

  recordEvent(event) {
    const timestampedEvent = { ...event, timestamp: new Date().toISOString() };
    this.events.push(timestampedEvent);
    appendFileSync(
      join(this.runDir, "events.jsonl"),
      JSON.stringify(timestampedEvent) + "\n",
    );
  }

  async finalize(status) {
    const runRecord = {
      run: {
        id: this.plan.id,
        status,
        planId: this.plan.id,
        mode: this.config.runner?.mode,
      },
      events: this.events,
    };
    writeFileSync(
      join(this.runDir, "run.json"),
      JSON.stringify(runRecord, null, 2),
    );

    this.printSummary(status);
  }

  printSummary(status) {
    console.log("\n--- Run Summary ---");
    console.log(`Final Status: ${status}`);
    if (this.config.runner?.mode) {
      console.log(`Mode: ${this.config.runner.mode}`);
    }

    // Item-level outcomes
    const items = this.events.filter((e) =>
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
      }
    } else if (status === "failure") {
      const deniedEvent = this.events.find((e) => e.family === "run.denied");
      if (deniedEvent) {
        console.log(`Reason: ${deniedEvent.reason}`);
      }
    }

    console.log(`\nRecords Directory: ${this.runDir}`);
    console.log("-------------------\n");
  }
}
