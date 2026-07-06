import { createInterface } from 'node:readline/promises';
import {
  type AskWhyResult,
  createJigSession,
  createSetupArtifacts,
  type DecideRunResult,
  type ExportAuditRecord,
  type ExportRunResult,
  InspectRunError,
  type IntegrityVerification,
  loadConfig,
  loadJson,
  loadPlanInstance,
  loadPolicy,
  type NoticeActionResult,
  type OwnerDecisionOutcome,
  type ProjectedNotice,
  type ProjectionIssue,
  ResumeRefusal,
  type RunProjection,
  type RunRecord,
  type SetupAnswers,
  type StopRunResult,
  type WatchProjection,
} from '@agentic-workflow-kit/jig-sdk';

export async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'run') {
    await handleRun(args.slice(1));
  } else if (command === 'preview') {
    await handlePreview(args.slice(1));
  } else if (command === 'setup') {
    await handleSetup(args.slice(1));
  } else if (command === 'inspect') {
    await handleInspect(args.slice(1));
  } else if (command === 'watch') {
    await handleWatch(args.slice(1));
  } else if (command === 'ask-why') {
    await handleAskWhy(args.slice(1));
  } else if (command === 'notice-ack') {
    await handleNoticeAck(args.slice(1));
  } else if (command === 'notice-snooze') {
    await handleNoticeSnooze(args.slice(1));
  } else if (command === 'decide') {
    await handleDecide(args.slice(1));
  } else if (command === 'stop') {
    await handleStop(args.slice(1));
  } else if (command === 'export') {
    await handleExport(args.slice(1));
  } else if (command === 'resume') {
    await handleResume(args.slice(1));
  } else {
    printUsage();
    process.exit(1);
  }
}

function printUsage(): void {
  console.error('Usage:');
  console.error(
    '  jig setup <output-directory> --track <track-id> --template <conservative-manual|assisted-local> --posture <reference-scripted|real-local> [--setup-command <command>] [--freshness-check <command>] [--answers <answers.json>] [--force]',
  );
  console.error('  jig preview <plan> --config <config> --policy <policy>');
  console.error('  jig run <plan> --config <config> --policy <policy> --scripted-output <output>');
  console.error('  jig inspect <run-directory>');
  console.error('  jig watch <run-directory>');
  console.error('  jig ask-why <run-directory> [--story <story-id>]');
  console.error('  jig notice-ack <run-directory> <notice-id>');
  console.error('  jig notice-snooze <run-directory> <notice-id> --until <iso-timestamp>');
  console.error(
    '  jig decide <run-directory> --outcome <approve|reject|override|hand-off> [--story <story-id>] [--reason <text>] [--to <owner>]',
  );
  console.error('  jig stop <run-directory> [--reason <text>]');
  console.error('  jig export <run-directory> [--output-dir <directory>]');
  console.error(
    '  jig resume <run-directory> --scripted-output <output> [--config <config>] [--policy <policy>] [--plan <plan>]',
  );
}

async function handleSetup(args: string[]): Promise<void> {
  const outputDir = args[0];
  if (!outputDir) {
    printUsage();
    process.exit(1);
  }

  try {
    const answerPath = getArg(args, '--answers');
    const answerFile = answerPath ? (loadJson(answerPath) as Partial<SetupAnswers>) : {};
    const answers: SetupAnswers = {
      trackId: getArg(args, '--track') ?? answerFile.trackId ?? '',
      template: (getArg(args, '--template') ??
        answerFile.template ??
        'conservative-manual') as SetupAnswers['template'],
      providerPosture: (getArg(args, '--posture') ??
        answerFile.providerPosture ??
        'reference-scripted') as SetupAnswers['providerPosture'],
      ...((getArg(args, '--setup-command') ?? answerFile.setupCommand)
        ? { setupCommand: getArg(args, '--setup-command') ?? answerFile.setupCommand }
        : {}),
      ...((getArg(args, '--freshness-check') ?? answerFile.freshnessCheck)
        ? { freshnessCheck: getArg(args, '--freshness-check') ?? answerFile.freshnessCheck }
        : {}),
      force: hasFlag(args, '--force') || answerFile.force === true,
    };
    const result = createSetupArtifacts(outputDir, answers);

    console.log('\n--- Jig Setup ---');
    console.log(`Status: ${result.status}`);
    console.log(`Output Directory: ${result.outputDir}`);
    console.log(`Template: ${result.template}`);
    console.log(`Provider Posture: ${result.providerPosture}`);
    console.log('Reasoning:');
    for (const reason of result.reasoning) {
      console.log(`  - ${reason}`);
    }
    if (result.artifacts.length > 0) {
      console.log('Artifacts:');
      for (const artifact of result.artifacts) {
        console.log(`  - ${artifact.kind}: ${artifact.path}`);
      }
    }
    if (result.setupCommand) {
      console.log(`Setup Command: ${result.setupCommand.action}`);
    }
    console.log('-----------------\n');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
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
        inspection.exportAudit,
        inspection.exportAuditDiagnostics,
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

async function handleWatch(args: string[]): Promise<void> {
  const runDir = args[0];
  if (!runDir) {
    printUsage();
    process.exit(1);
  }

  try {
    const session = createJigSession();
    renderWatch(await session.operator.watch({ runDir }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function handleAskWhy(args: string[]): Promise<void> {
  const runDir = args[0];
  if (!runDir) {
    printUsage();
    process.exit(1);
  }

  try {
    const session = createJigSession();
    renderAskWhy(await session.operator.askWhy({ runDir, storyId: getArg(args, '--story') ?? undefined }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function handleNoticeAck(args: string[]): Promise<void> {
  const [runDir, noticeId] = args;
  if (!runDir || !noticeId) {
    printUsage();
    process.exit(1);
  }

  try {
    const session = createJigSession();
    renderNoticeAction(await session.operator.acknowledgeNotice({ runDir, noticeId }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function handleNoticeSnooze(args: string[]): Promise<void> {
  const [runDir, noticeId] = args;
  const until = getArg(args, '--until');
  if (!runDir || !noticeId || !until) {
    printUsage();
    process.exit(1);
  }

  try {
    const session = createJigSession();
    renderNoticeAction(await session.operator.snoozeNotice({ runDir, noticeId, until }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

function parseDecisionOutcome(value: string | null): OwnerDecisionOutcome | null {
  if (value === 'approve' || value === 'reject' || value === 'override' || value === 'hand-off') {
    return value;
  }
  return null;
}

async function handleDecide(args: string[]): Promise<void> {
  const runDir = args[0];
  const outcome = parseDecisionOutcome(getArg(args, '--outcome'));
  if (!runDir || !outcome) {
    printUsage();
    process.exit(1);
  }

  try {
    const session = createJigSession();
    renderDecision(
      await session.operator.decide({
        runDir,
        outcome,
        ...(getArg(args, '--story') ? { storyId: getArg(args, '--story') as string } : {}),
        ...(getArg(args, '--reason') ? { reason: getArg(args, '--reason') as string } : {}),
        ...(getArg(args, '--to') ? { handedOffTo: getArg(args, '--to') as string } : {}),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function handleStop(args: string[]): Promise<void> {
  const runDir = args[0];
  if (!runDir) {
    printUsage();
    process.exit(1);
  }

  try {
    const session = createJigSession();
    renderStop(
      await session.operator.stop({
        runDir,
        ...(getArg(args, '--reason') ? { reason: getArg(args, '--reason') as string } : {}),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

async function handleExport(args: string[]): Promise<void> {
  const runDir = args[0];
  if (!runDir) {
    printUsage();
    process.exit(1);
  }

  try {
    const session = createJigSession();
    renderExport(
      await session.operator.export({
        runDir,
        ...(getArg(args, '--output-dir') ? { outputDir: getArg(args, '--output-dir') as string } : {}),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

function renderWatch(watch: WatchProjection): void {
  console.log('\n--- Run Watch ---');
  console.log(`Run ID: ${watch.runId}`);
  console.log(`Status: ${watch.status}`);
  console.log(`Lifecycle: ${watch.lifecycleState}`);
  console.log(`Signal: ${watch.signal}`);
  renderWatchGroup('Progressing', watch.groups.progressing);
  renderWatchGroup('Parked', watch.groups.parked);
  renderWatchGroup('Blocked', watch.groups.blocked);
  renderWatchGroup('Done', watch.groups.done);
  renderWatchGroup('Waiting', watch.groups.waiting);
  renderProjectedNotices(watch.notices);
  console.log('-----------------\n');
}

function renderDecision(result: DecideRunResult): void {
  console.log('\n--- Owner Decision ---');
  console.log(`Records Directory: ${result.runDir}`);
  console.log(`Outcome: ${result.outcome}`);
  if (result.storyId) console.log(`Story: ${result.storyId}`);
  if (result.reason) console.log(`Reason: ${result.reason}`);
  console.log('----------------------\n');
}

function renderStop(result: StopRunResult): void {
  console.log('\n--- Run Stop ---');
  console.log(`Records Directory: ${result.runDir}`);
  console.log(`Status: ${result.status}`);
  if (result.checkpoint) console.log(`Checkpoint: ${result.checkpoint}`);
  if (result.reason) console.log(`Reason: ${result.reason}`);
  console.log('----------------\n');
}

function renderExport(result: ExportRunResult): void {
  console.log('\n--- Run Export ---');
  console.log(`Records Directory: ${result.runDir}`);
  console.log(`Status: ${result.status}`);
  console.log(`Audit Event: ${result.auditEventPath}`);
  if (result.artifactPath) console.log(`Artifact: ${result.artifactPath}`);
  if (result.artifactSha256) console.log(`SHA-256: ${result.artifactSha256}`);
  if (result.reason) console.log(`Reason: ${result.reason}`);
  console.log('------------------\n');
}

function renderWatchGroup(label: string, stories: WatchProjection['groups']['done']): void {
  if (stories.length === 0) return;
  console.log(`${label}:`);
  for (const story of stories) {
    const details = story.reason ? ` (${story.reason})` : story.blockedBy ? ` (blocked by ${story.blockedBy})` : '';
    console.log(`  - ${story.storyId}: ${story.state}${details}`);
  }
}

function renderAskWhy(result: AskWhyResult): void {
  console.log('\n--- Ask Why ---');
  console.log(`Subject: ${result.subject}`);
  console.log(`Answer: ${result.answer}`);
  if (result.citations.length > 0) {
    console.log('Citations:');
    for (const citation of result.citations) {
      const source = citation.source ? `${citation.source}:` : '';
      const reason = citation.reason ? ` reason=${citation.reason}` : '';
      const details = citation.details?.length ? ` ${citation.details.join(' ')}` : '';
      console.log(`  - ${source}line ${citation.line}: ${citation.family}${reason}${details}`);
    }
  }
  console.log('---------------\n');
}

function renderNoticeAction(result: NoticeActionResult): void {
  console.log('\n--- Notice Action ---');
  console.log(`Records Directory: ${result.runDir}`);
  renderNotice(result.notice);
  console.log('---------------------\n');
}

function renderProjectedNotices(notices: ProjectedNotice[]): void {
  if (notices.length === 0) return;
  console.log('Notices:');
  for (const notice of notices) {
    renderNotice(notice);
  }
}

function renderNotice(notice: ProjectedNotice): void {
  const snoozed = notice.snoozedUntil ? ` until ${notice.snoozedUntil}` : '';
  console.log(`  - ${notice.id}: ${notice.urgency}/${notice.state}${snoozed}`);
  console.log(`    ${notice.message}`);
  console.log(`    Next: ${notice.nextAction}`);
}

function renderProjectionInspection(
  runDir: string,
  projection: RunProjection,
  cacheParseError: string | null,
  integrity: IntegrityVerification,
  resumeDiagnostics: ProjectionIssue[] = [],
  exportAudit: ExportAuditRecord[] = [],
  exportAuditDiagnostics: ProjectionIssue[] = [],
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

  const diagnostics = [...projection.diagnostics, ...resumeDiagnostics, ...exportAuditDiagnostics];
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

  if (exportAudit.length > 0) {
    const latestExport = exportAudit[exportAudit.length - 1];
    if (latestExport) {
      console.log('\nLatest Export Attempt:');
      console.log(`  - ${latestExport.event.family} at ${latestExport.event.timestamp}`);
      if (latestExport.event.artifactPath) {
        console.log(`    Artifact: ${latestExport.event.artifactPath}`);
      }
      if (latestExport.event.artifactSha256) {
        console.log(`    SHA-256: ${latestExport.event.artifactSha256}`);
      }
      if (latestExport.event.reason) {
        console.log(`    Reason: ${latestExport.event.reason}`);
      }
    }
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

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
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
  decide(
    request: unknown,
    story: unknown,
  ): Promise<Exclude<OwnerDecisionOutcome, 'hand-off'> | { outcome: OwnerDecisionOutcome; handedOffTo?: string }>;
} | null {
  const interactive = options.interactive ?? process.stdin.isTTY;
  if (!interactive) {
    return null;
  }
  const ask = options.ask ?? askOwnerQuestion;

  return {
    decide: async (
      request: unknown,
      story: unknown,
    ): Promise<Exclude<OwnerDecisionOutcome, 'hand-off'> | { outcome: OwnerDecisionOutcome; handedOffTo?: string }> => {
      const storyId = typeof story === 'object' && story !== null && 'id' in story ? String(story.id) : 'unknown-story';
      const requestId =
        typeof request === 'object' && request !== null && 'id' in request ? String(request.id) : 'unknown-request';
      const requestKind =
        typeof request === 'object' && request !== null && 'kind' in request ? String(request.kind) : 'unknown-kind';
      console.log(`Owner decision required for ${storyId} request ${requestId} (${requestKind}).`);
      const answer = (await ask('Decision [approve/reject/override/hand-off] (default reject): ')).trim().toLowerCase();
      if (answer === 'y' || answer === 'yes' || answer === 'approve') return 'approve';
      if (answer === 'override') return 'override';
      if (answer === 'hand-off' || answer === 'handoff' || answer === 'hand off') {
        const handedOffTo = (await ask('Hand-off target: ')).trim();
        if (!handedOffTo) return 'reject';
        return { outcome: 'hand-off', handedOffTo };
      }
      return 'reject';
    },
  };
}
