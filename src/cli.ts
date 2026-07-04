import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { composeReferenceRun } from './bootstrap.js';
import { createInMemoryStoryWorkspaceIsolation, LocalHarness } from './harness.js';
import { intakeCandidates } from './intake.js';
import { type IntegrityVerification, launchBindingExpectsIntegrity, verifyIntegritySidecar } from './integrity.js';
import { loadConfig, loadJson, loadPolicy } from './loaders.js';
import { PlanValidator } from './plan-validator.js';
import { projectRunEvents } from './projection.js';
import { RecordManager } from './records.js';
import { ResumeRefusal, resumeRun } from './resume.js';
import type { PlanInstance, RunRecord } from './types.js';

export async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'run') {
    await handleRun(args.slice(1));
  } else if (command === 'preview') {
    await handlePreview(args.slice(1));
  } else if (command === 'inspect') {
    await handleInspect(args.slice(1));
  } else if (command === 'resume') {
    await handleResume(args.slice(1));
  } else {
    printUsage();
    process.exit(1);
  }
}

function printUsage(): void {
  console.error('Usage:');
  console.error('  jig preview <plan> --config <config> --policy <policy>');
  console.error('  jig run <plan> --config <config> --policy <policy> --scripted-output <output>');
  console.error('  jig inspect <run-directory>');
  console.error(
    '  jig resume <run-directory> --scripted-output <output> [--config <config>] [--policy <policy>] [--plan <plan>]',
  );
}

async function handlePreview(args: string[]): Promise<void> {
  if (!args[0]) {
    printUsage();
    process.exit(1);
  }

  const planPath = args[0];
  const configPath = getArg(args, '--config');
  const policyPath = getArg(args, '--policy');

  if (!configPath || !policyPath) {
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
    const plan = (planInstance as PlanInstance).plan;

    console.log('\n--- Run Preview ---');
    console.log('Posture: run.previewed');
    console.log(`Plan ID: ${plan.id}`);
    console.log(`Policy ID: ${policy.policy?.id ?? 'unknown-policy'}`);
    if (config.runner?.mode) {
      console.log(`Mode: ${config.runner.mode}`);
    }
    console.log('Would-run stories:');
    for (const story of plan.stories) {
      console.log(`  - ${story.id}: ${story.title}`);
    }
    console.log('-------------------\n');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
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
    const composed = await composeReferenceRun({
      planInstance: planInstance as PlanInstance,
      config,
      scriptedOutput: scriptedOutput as Record<string, unknown>,
    });
    const recordManager = new RecordManager({
      launchAttestation: composed.substrateManifest ? composed.capabilityAttestation : undefined,
      substrateManifest: composed.substrateManifest,
      redaction: composed.redaction,
    });
    const intake = await intakeCandidates(composed.workSource);
    const [candidate] = intake.admitted;
    if (!candidate) {
      recordManager.init(composed.planInstance.plan, config, policy);
      for (const rejection of intake.rejected) {
        recordManager.recordEvent(rejection.event);
      }
      await recordManager.finalize('failure');
      throw new Error('No validated work-source candidate available');
    }
    const harness = new LocalHarness(composed.agent, recordManager, createOwnerDecisionSource(), {
      capabilityAttestation: composed.capabilityAttestation,
      forge: composed.forge,
      workspaceIsolation:
        composed.executionHost.describe().driverId === 'real-host'
          ? createInMemoryStoryWorkspaceIsolation(join(process.cwd(), '.jig-workspaces'))
          : undefined,
    });

    const status = await harness.run(candidate, config, policy);

    if (status !== 'success') {
      process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function handleResume(args: string[]): Promise<void> {
  const runDir = args[0];
  if (!runDir) {
    printUsage();
    process.exit(1);
  }

  const scriptedOutputPath = getArg(args, '--scripted-output');
  if (!scriptedOutputPath) {
    printUsage();
    process.exit(1);
  }

  try {
    const status = await resumeRun({
      runDir,
      scriptedOutputPath,
      configPath: getArg(args, '--config'),
      policyPath: getArg(args, '--policy'),
      planPath: getArg(args, '--plan'),
      ownerDecisionSource: createOwnerDecisionSource(),
    });

    if (status !== 'success') {
      process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof ResumeRefusal) {
      console.error(message);
    } else {
      console.error(`Error: ${message}`);
    }
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

  const eventsJsonlPath = join(runDir, 'events.jsonl');
  const runJsonPath = join(runDir, 'run.json');

  if (existsSync(eventsJsonlPath)) {
    const eventsJsonl = readFileSync(eventsJsonlPath, 'utf8');
    let runRecord: RunRecord | null = null;
    let cacheParseError: string | null = null;

    if (existsSync(runJsonPath)) {
      try {
        runRecord = JSON.parse(readFileSync(runJsonPath, 'utf8')) as RunRecord;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        cacheParseError = `run.json cache unreadable and ignored: ${message}`;
      }
    }

    try {
      const projection = projectRunEvents({ eventsJsonl, runRecord });
      const integrity = verifyIntegritySidecar(runDir, {
        expected: launchBindingExpectsIntegrity(projection.binding),
      });
      renderProjectionInspection(runDir, projection, cacheParseError, integrity);
      return;
    } catch (err) {
      if (runRecord && isLegacyProjectionFallback(err)) {
        renderLegacyInspection(runDir, runRecord);
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: Failed to inspect authoritative events.jsonl: ${message}`);
      process.exit(1);
    }
  }

  if (!existsSync(runJsonPath)) {
    console.error(`Error: Neither events.jsonl nor run.json found in "${runDir}"`);
    process.exit(1);
  }

  try {
    const runRecord = JSON.parse(readFileSync(runJsonPath, 'utf8')) as RunRecord;
    renderLegacyInspection(runDir, runRecord);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Failed to parse run.json: ${message}`);
    process.exit(1);
  }
}

function renderProjectionInspection(
  runDir: string,
  projection: ReturnType<typeof projectRunEvents>,
  cacheParseError: string | null,
  integrity: IntegrityVerification,
): void {
  console.log('\n--- Run Inspection ---');
  console.log(`Run ID: ${projection.runId}`);
  console.log(`Plan ID: ${projection.planId}`);
  console.log(`Final Status: ${projection.status}`);
  if (projection.mode) {
    console.log(`Mode: ${projection.mode}`);
  }
  console.log(`Records Directory: ${runDir}`);

  if (projection.stopCause) {
    console.log(`Stop Cause: ${projection.stopCause}`);
  }
  if (projection.summaryReason) {
    console.log(`Reason: ${projection.summaryReason}`);
  }
  if (projection.safeCheckpoint) {
    console.log(`Safe Resume Checkpoint: ${projection.safeCheckpoint}`);
  }

  const items = Object.values(projection.stories);
  if (items.length > 0) {
    console.log('\nItems:');
    for (const item of items) {
      let details = '';
      if (item.state === 'blocked') {
        details = item.blockedBy ? ` (blocked by ${item.blockedBy})` : item.reason ? ` (${item.reason})` : '';
      } else if (item.state === 'parked' && item.reason) {
        details = ` (${item.reason})`;
      }
      console.log(`  - ${item.storyId}: ${item.state}${details}`);

      if (item.diagnostics) {
        console.log('    Diagnostics:');
        if (item.diagnostics.exitCode !== undefined) console.log(`      exitCode: ${item.diagnostics.exitCode}`);
        if (item.diagnostics.error) console.log(`      error: ${item.diagnostics.error}`);
        if (item.diagnostics.stdout) console.log(`      stdout: ${item.diagnostics.stdout.trim().split('\n')[0]}...`);
      }

      if (item.changedFiles.length > 0) {
        console.log(`    Changed files: ${item.changedFiles.join(', ')}`);
      }
    }
  }

  const diagnostics = [...projection.diagnostics];
  if (cacheParseError) {
    diagnostics.push({
      code: 'run.json-cache-unreadable',
      message: cacheParseError,
    });
  }
  if (diagnostics.length > 0) {
    console.log('\nDiagnostics:');
    for (const diagnostic of diagnostics) {
      console.log(`  - ${diagnostic.code}: ${diagnostic.message}`);
    }
  }

  if (integrity.status === 'broken') {
    console.log('\nIntegrity Notices:');
    console.log(`  - ${integrity.code}: ${integrity.message}`);
  }

  if (projection.notices.length > 0) {
    console.log('\nProjected Notices:');
    for (const notice of projection.notices) {
      console.log(`  - ${notice.code}: ${notice.message}`);
    }
  }

  if (projection.changedFiles.length > 0) {
    console.log(`\nChanged files: ${projection.changedFiles.join(', ')}`);
  }

  console.log('----------------------\n');
}

function renderLegacyInspection(runDir: string, runRecord: RunRecord): void {
  const { run, events } = runRecord;

  console.log('\n--- Run Inspection ---');
  console.log(`Run ID: ${run.id}`);
  console.log(`Plan ID: ${run.planId}`);
  console.log(`Final Status: ${run.status}`);
  if (run.mode) {
    console.log(`Mode: ${run.mode}`);
  }
  console.log(`Records Directory: ${runDir}`);

  const items = events.filter((event) =>
    ['story.done', 'story.blocked', 'story.failed', 'story.skipped'].includes(event.family),
  );
  if (items.length > 0) {
    console.log('\nItems:');
    for (const item of items) {
      const outcome = item.family.replace('story.', '');
      let details = '';
      if (item.family === 'story.blocked') {
        details = item.blockedBy ? ` (blocked by ${item.blockedBy})` : ` (${item.reason})`;
      } else if (item.family === 'story.skipped') {
        details = ` (${item.reason})`;
      }
      console.log(`  - ${item.storyId}: ${outcome}${details}`);

      if ((item.family === 'story.blocked' || item.family === 'story.failed') && item.diagnostics) {
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
    const deniedEvent = events.find((event) => event.family === 'authorization.denied');
    if (deniedEvent) {
      console.log(`Reason: ${deniedEvent.reason}`);
    }
  }

  console.log('----------------------\n');
}

function isLegacyProjectionFallback(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'missing-launch-metadata';
}

function getArg(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return null;
}

type AskOwnerQuestion = (prompt: string) => Promise<string>;

/* v8 ignore next 7 -- exercised manually through an interactive terminal; unit tests inject ask. */
async function askOwnerQuestion(prompt: string): Promise<string> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await readline.question(prompt);
  } finally {
    readline.close();
  }
}

export function createOwnerDecisionSource(options: { interactive?: boolean; ask?: AskOwnerQuestion } = {}): {
  decide(request: unknown, story: unknown): Promise<'approve' | 'reject'>;
} | null {
  const interactive = options.interactive ?? process.stdin.isTTY;
  if (!interactive) {
    return null;
  }
  const ask = options.ask ?? askOwnerQuestion;

  return {
    decide: async (request: unknown, story: unknown): Promise<'approve' | 'reject'> => {
      const storyId = typeof story === 'object' && story !== null && 'id' in story ? String(story.id) : 'unknown-story';
      const requestId =
        typeof request === 'object' && request !== null && 'id' in request ? String(request.id) : 'unknown-request';
      const requestKind =
        typeof request === 'object' && request !== null && 'kind' in request ? String(request.kind) : 'unknown-kind';
      console.log(`Owner decision required for ${storyId} request ${requestId} (${requestKind}).`);
      const answer = (await ask('Approve this request? [y/N] ')).trim().toLowerCase();
      return answer === 'y' || answer === 'yes' || answer === 'approve' ? 'approve' : 'reject';
    },
  };
}
