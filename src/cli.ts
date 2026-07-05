import { createInterface } from 'node:readline/promises';
import {
  createJigSession,
  InspectRunError,
  type IntegrityVerification,
  loadConfig,
  loadJson,
  loadPlanInstance,
  loadPolicy,
  type ProjectionIssue,
  ResumeRefusal,
  type RunProjection,
  type RunRecord,
} from './index.js';

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
    const planInstance = loadPlanInstance(planPath);
    const config = loadConfig(configPath);
    const policy = loadPolicy(policyPath);
    const session = createJigSession();
    const preview = await session.operator.preview({ planInstance, config, policy });

    console.log('\n--- Run Preview ---');
    console.log(`Posture: ${preview.posture}`);
    console.log(`Plan ID: ${preview.planId}`);
    console.log(`Policy ID: ${preview.policyId}`);
    if (preview.mode) {
      console.log(`Mode: ${preview.mode}`);
    }
    console.log('Would-run stories:');
    for (const story of preview.stories) {
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
    const planInstance = loadPlanInstance(planPath);
    const config = loadConfig(configPath);
    const policy = loadPolicy(policyPath);
    const session = createJigSession({
      ownerDecisionSource: createOwnerDecisionSource(),
    });
    const status = await session.operator.start({
      planInstance,
      config,
      policy,
      scriptedOutput: loadJson(scriptedOutputPath) as Record<string, unknown>,
    });

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
    const session = createJigSession({
      ownerDecisionSource: createOwnerDecisionSource(),
    });
    const status = await session.recovery.resume({
      runDir,
      scriptedOutput: loadJson(scriptedOutputPath) as Record<string, unknown>,
      ...(getArg(args, '--config') ? { config: loadConfig(getArg(args, '--config') as string) } : {}),
      ...(getArg(args, '--policy') ? { policy: loadPolicy(getArg(args, '--policy') as string) } : {}),
      ...(getArg(args, '--plan')
        ? {
            planInstance: loadPlanInstance(getArg(args, '--plan') as string),
          }
        : {}),
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

  try {
    const session = createJigSession();
    const inspection = await session.operator.inspect({ runDir });
    if (inspection.kind === 'projection') {
      renderProjectionInspection(
        inspection.runDir,
        inspection.projection,
        inspection.cacheParseError,
        inspection.integrity,
        inspection.resumeDiagnostics,
      );
      return;
    }

    renderLegacyInspection(inspection.runDir, inspection.runRecord);
  } catch (err) {
    if (err instanceof InspectRunError && err.integrity?.status === 'broken') {
      console.error(`Integrity Notice: ${err.integrity.code}: ${err.integrity.message}`);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

function renderProjectionInspection(
  runDir: string,
  projection: RunProjection,
  cacheParseError: string | null,
  integrity: IntegrityVerification,
  resumeDiagnostics: ProjectionIssue[] = [],
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

  const diagnostics = [...projection.diagnostics, ...resumeDiagnostics];
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
