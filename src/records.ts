import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ConfigDoc, Plan, PolicyDoc, RecordSink, RunEvent, RunRecord, RunStatus } from './types.js';

const ITEM_FAMILIES = ['story.done', 'story.blocked'];

function describeConfigBinding(config: ConfigDoc): string {
  const mode = config.runner?.mode ?? 'unknown-mode';
  const recordDir = config.runner?.recordDir ?? 'runs';
  return `mode=${mode};recordDir=${recordDir}`;
}

export class RecordManager implements RecordSink {
  private events: RunEvent[];
  private runDir: string;
  private runId: string;
  private plan: Plan | null;
  private config: ConfigDoc | null;
  private policy: PolicyDoc | null;

  constructor() {
    this.events = [];
    this.runDir = '';
    this.runId = '';
    this.plan = null;
    this.config = null;
    this.policy = null;
  }

  init(plan: Plan, config: ConfigDoc, policy: PolicyDoc): void {
    this.plan = plan;
    this.config = config;
    this.policy = policy;
    const recordBaseDir = config.runner?.recordDir || 'runs';
    this.runId = `run-${plan.id}-${Date.now()}-${randomUUID()}`;
    mkdirSync(recordBaseDir, { recursive: true });
    this.runDir = join(recordBaseDir, this.runId);
    mkdirSync(this.runDir);
  }

  recordEvent(event: Pick<RunEvent, 'family'> & Partial<RunEvent>): void {
    const timestampedEvent: RunEvent = { ...event, actor: 'runner', timestamp: new Date().toISOString() };
    this.events.push(timestampedEvent);
    appendFileSync(join(this.runDir, 'events.jsonl'), `${JSON.stringify(timestampedEvent)}\n`);
  }

  async finalize(status: RunStatus): Promise<void> {
    // init() always runs before finalize() in the harness flow; the null initializers only
    // exist to give the class a valid pre-init state. Cast here rather than adding a runtime
    // guard, matching the compile-time-only strict-mode discipline for this port.
    const plan = this.plan as Plan;
    const config = this.config as ConfigDoc;
    const policy = this.policy as PolicyDoc;

    const runRecord: RunRecord = {
      run: {
        id: this.runId,
        attempt: 1,
        status,
        planId: plan.id,
        mode: config.runner?.mode,
        binding: {
          policyRef: policy.policy?.id ?? 'unknown-policy',
          configRef: describeConfigBinding(config),
        },
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
          details = item.blockedBy ? ` (blocked by ${item.blockedBy})` : ` (${item.reason})`;
        }
        console.log(`  - ${item.storyId}: ${outcome}${details}`);
      }
    } else if (status === 'failure') {
      const deniedEvent = this.events.find((e) => e.family === 'authorization.denied');
      if (deniedEvent) {
        console.log(`Reason: ${deniedEvent.reason}`);
      }
    }

    console.log(`\nRecords Directory: ${this.runDir}`);
    console.log('-------------------\n');
  }
}
