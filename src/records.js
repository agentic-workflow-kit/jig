import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

export class RecordManager {
  constructor() {
    this.events = [];
    this.runDir = '';
    this.plan = null;
    this.config = null;
    this.policy = null;
  }

  init(plan, config, policy) {
    this.plan = plan;
    this.config = config;
    this.policy = policy;
    const recordBaseDir = config.runner.recordDir || 'runs';
    this.runDir = join(recordBaseDir, `run-${plan.id}-${Date.now()}`);
    mkdirSync(this.runDir, { recursive: true });
  }

  recordEvent(event) {
    const timestampedEvent = { ...event, timestamp: new Date().toISOString() };
    this.events.push(timestampedEvent);
    appendFileSync(join(this.runDir, 'events.jsonl'), JSON.stringify(timestampedEvent) + '\n');
  }

  async finalize(status) {
    const runRecord = {
      run: {
        id: this.plan.id,
        status,
        planId: this.plan.id
      },
      events: this.events
    };
    writeFileSync(join(this.runDir, 'run.json'), JSON.stringify(runRecord, null, 2));

    this.printSummary(status);
  }

  printSummary(status) {
    console.log('\n--- Run Summary ---');
    console.log(`Final Status: ${status}`);
    if (status === 'failure') {
      const failedEvent = this.events.find(e => e.family === 'story.failed');
      if (failedEvent) {
        console.log(`Failed Item: ${failedEvent.storyId}`);
      }
    }
    console.log(`Records Directory: ${this.runDir}`);
    console.log('-------------------\n');
  }
}
