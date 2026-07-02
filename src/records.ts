import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ConfigDoc, Plan, PolicyDoc, RecordSink, RunEvent, RunRecord, RunStatus } from './types.js';

const ITEM_FAMILIES = ['story.done', 'story.failed', 'story.blocked', 'story.skipped'];

export class RecordManager implements RecordSink {
  private events: RunEvent[];
  private runDir: string;
  private plan: Plan | null;
  private config: ConfigDoc | null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: the policy binding is held for the records seam; run-level binding records consume it from Phase R (ADR 0017)
  private policy: PolicyDoc | null;

  constructor() {
    this.events = [];
    this.runDir = '';
    this.plan = null;
    this.config = null;
    this.policy = null;
  }

  init(plan: Plan, config: ConfigDoc, policy: PolicyDoc): void {
    this.plan = plan;
    this.config = config;
    this.policy = policy;
    const recordBaseDir = config.runner?.recordDir || 'runs';
    this.runDir = join(recordBaseDir, `run-${plan.id}-${Date.now()}`);
    mkdirSync(this.runDir, { recursive: true });
  }

  recordEvent(event: Pick<RunEvent, 'family'> & Partial<RunEvent>): void {
    const timestampedEvent: RunEvent = { ...event, timestamp: new Date().toISOString() };
    this.events.push(timestampedEvent);
    appendFileSync(join(this.runDir, 'events.jsonl'), `${JSON.stringify(timestampedEvent)}\n`);
  }

  async finalize(status: RunStatus): Promise<void> {
    // init() always runs before finalize() in the harness flow; the null initializers only
    // exist to give the class a valid pre-init state. Cast here rather than adding a runtime
    // guard, matching the compile-time-only strict-mode discipline for this port.
    const plan = this.plan as Plan;
    const config = this.config as ConfigDoc;

    const runRecord: RunRecord = {
      run: {
        id: plan.id,
        status,
        planId: plan.id,
        mode: config.runner?.mode,
      },
      events: this.events,
    };
    writeFileSync(join(this.runDir, 'run.json'), JSON.stringify(runRecord, null, 2));

    this.printSummary(status);
  }

  printSummary(status: RunStatus): void {
    const config = this.config as ConfigDoc;

    console.log('\n--- Run Summary ---');
    console.log(`Final Status: ${status}`);
    if (config.runner?.mode) {
      console.log(`Mode: ${config.runner.mode}`);
    }

    // Item-level outcomes
    const items = this.events.filter((e) => ITEM_FAMILIES.includes(e.family));
    if (items.length > 0) {
      console.log('\nItems:');
      for (const item of items) {
        const outcome = item.family.replace('story.', '');
        let details = '';
        if (item.family === 'story.blocked') {
          details = ` (blocked by ${item.blockedBy})`;
        } else if (item.family === 'story.skipped') {
          details = ` (${item.reason})`;
        }
        console.log(`  - ${item.storyId}: ${outcome}${details}`);
      }
    } else if (status === 'failure') {
      const deniedEvent = this.events.find((e) => e.family === 'run.denied');
      if (deniedEvent) {
        console.log(`Reason: ${deniedEvent.reason}`);
      }
    }

    console.log(`\nRecords Directory: ${this.runDir}`);
    console.log('-------------------\n');
  }
}
