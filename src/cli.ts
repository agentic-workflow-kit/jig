import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LocalHarness } from './harness.js';
import { loadConfig, loadJson, loadPolicy } from './loaders.js';
import { PlanValidator } from './plan-validator.js';
import { RecordManager } from './records.js';
import type { PlanInstance, RunRecord } from './types.js';
import { ScriptedWorker } from './worker.js';

export async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'run') {
    await handleRun(args.slice(1));
  } else if (command === 'inspect') {
    await handleInspect(args.slice(1));
  } else {
    printUsage();
    process.exit(1);
  }
}

function printUsage(): void {
  console.error('Usage:');
  console.error('  jig run <plan> --config <config> --policy <policy> --scripted-output <output>');
  console.error('  jig inspect <run-directory>');
}

async function handleRun(args: string[]): Promise<void> {
  if (!args[0]) {
    printUsage();
    process.exit(1);
  }

  const planPath = args[0];
  const configPath = getArg(args, '--config');
  const policyPath = getArg(args, '--policy');
  const scriptedOutputPath = getArg(args, '--scripted-output');

  if (!configPath || !policyPath || !scriptedOutputPath) {
    printUsage();
    process.exit(1);
  }

  try {
    const planInstance = loadJson(planPath);
    try {
      PlanValidator.validate(planInstance);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Plan validation failed for "${planPath}": ${message}`);
    }

    const config = loadConfig(configPath);
    const policy = loadPolicy(policyPath);
    const scriptedOutput = loadJson(scriptedOutputPath);

    const worker = new ScriptedWorker(scriptedOutput as Record<string, unknown>);
    const recordManager = new RecordManager();
    const harness = new LocalHarness(worker, recordManager);

    const status = await harness.run(planInstance as PlanInstance, config, policy);

    if (status !== 'success') {
      process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function handleInspect(args: string[]): Promise<void> {
  const runDir = args[0];
  if (!runDir) {
    printUsage();
    process.exit(1);
  }

  if (!existsSync(runDir)) {
    console.error(`Error: Run directory "${runDir}" does not exist`);
    process.exit(1);
  }

  const runJsonPath = join(runDir, 'run.json');
  if (!existsSync(runJsonPath)) {
    console.error(`Error: run.json not found in "${runDir}"`);
    process.exit(1);
  }

  try {
    const runRecord = JSON.parse(readFileSync(runJsonPath, 'utf8')) as RunRecord;
    const { run, events } = runRecord;

    console.log('\n--- Run Inspection ---');
    console.log(`Run ID: ${run.id}`);
    console.log(`Plan ID: ${run.planId}`);
    console.log(`Final Status: ${run.status}`);
    if (run.mode) {
      console.log(`Mode: ${run.mode}`);
    }
    console.log(`Records Directory: ${runDir}`);

    // Item-level outcomes
    const items = events.filter((e) => ['story.done', 'story.blocked'].includes(e.family));
    if (items.length > 0) {
      console.log('\nItems:');
      for (const item of items) {
        const outcome = item.family.replace('story.', '');
        let details = '';
        if (item.family === 'story.blocked') {
          details = item.blockedBy ? ` (blocked by ${item.blockedBy})` : ` (${item.reason})`;
        }
        console.log(`  - ${item.storyId}: ${outcome}${details}`);

        if (item.family === 'story.blocked' && item.diagnostics) {
          console.log('    Diagnostics:');
          if (item.diagnostics.exitCode !== undefined) console.log(`      exitCode: ${item.diagnostics.exitCode}`);
          if (item.diagnostics.error) console.log(`      error: ${item.diagnostics.error}`);
          if (item.diagnostics.stdout) console.log(`      stdout: ${item.diagnostics.stdout.trim().split('\n')[0]}...`);
        }

        if (item.changedFiles && Array.isArray(item.changedFiles) && item.changedFiles.length > 0) {
          console.log(`    Changed files: ${item.changedFiles.join(', ')}`);
        }
      }
    } else if (run.status === 'failure') {
      const deniedEvent = events.find((e) => e.family === 'authorization.denied');
      if (deniedEvent) {
        console.log(`Reason: ${deniedEvent.reason}`);
      }
    }

    console.log('----------------------\n');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Failed to parse run.json: ${message}`);
    process.exit(1);
  }
}

function getArg(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return null;
}
