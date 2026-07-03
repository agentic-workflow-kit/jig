import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { composeReferenceRun } from './bootstrap.js';
import { LocalHarness } from './harness.js';
import { intakeCandidates } from './intake.js';
import { loadConfig, loadJson, loadPolicy } from './loaders.js';
import { PlanValidator } from './plan-validator.js';
import type { CapabilityAttestation, LandingAction } from './ports.js';
import { projectRunEvents, type RunProjection } from './projection.js';
import type { GitHubForgeTransport } from './providers/real/forge.js';
import { type RedactionOptions, redactValue } from './redaction.js';
import type {
  ConfigDoc,
  Plan,
  PlanInstance,
  PolicyDoc,
  RecordSink,
  ResumePlan,
  RunBinding,
  RunEvent,
  RunPosture,
  RunRecord,
  RunStatus,
} from './types.js';
import { captureWorkspaceFingerprint } from './workspace.js';

export type ResumeRefusalReason =
  | 'resume-blocked-binding-mismatch'
  | 'resume-blocked-workspace-mismatch'
  | 'resume-blocked-missing-approval';

export class ResumeRefusal extends Error {
  readonly reason: ResumeRefusalReason;

  constructor(reason: ResumeRefusalReason, message: string) {
    super(message);
    this.name = 'ResumeRefusal';
    this.reason = reason;
  }
}

export interface ResumeRunOptions {
  runDir: string;
  scriptedOutputPath: string;
  configPath?: string | null;
  policyPath?: string | null;
  planPath?: string | null;
  ownerDecisionSource?: ConstructorParameters<typeof LocalHarness>[2];
  forgeTransport?: GitHubForgeTransport;
  redaction?: RedactionOptions;
}

const PLAN_SNAPSHOT_FILE = 'plan.snapshot.json';
const POLICY_SNAPSHOT_FILE = 'policy.snapshot.json';
const ATTESTATION_SNAPSHOT_FILE = 'attestation.snapshot.json';

function describeConfigBinding(config: ConfigDoc): string {
  const mode = config.runner?.mode ?? 'unknown-mode';
  const recordDir = config.runner?.recordDir ?? 'runs';
  return `mode=${mode};recordDir=${recordDir}`;
}

function readJsonlEvents(eventsJsonl: string): RunEvent[] {
  return eventsJsonl
    .trimEnd()
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as RunEvent);
}

function loadRunRecord(runDir: string): RunRecord | null {
  const runJsonPath = join(runDir, 'run.json');
  if (!existsSync(runJsonPath)) {
    return null;
  }
  return JSON.parse(readFileSync(runJsonPath, 'utf8')) as RunRecord;
}

function loadPlanSnapshot(runDir: string): Plan {
  const snapshotPath = join(runDir, PLAN_SNAPSHOT_FILE);
  if (!existsSync(snapshotPath)) {
    throw new ResumeRefusal(
      'resume-blocked-binding-mismatch',
      `resume-blocked-binding-mismatch: missing plan snapshot at "${snapshotPath}"`,
    );
  }
  const plan = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Plan;
  PlanValidator.validate({ plan });
  return plan;
}

function loadPolicySnapshot(runDir: string, projection: RunProjection): PolicyDoc {
  const snapshotPath = join(runDir, POLICY_SNAPSHOT_FILE);
  if (!existsSync(snapshotPath)) {
    throw new ResumeRefusal(
      'resume-blocked-binding-mismatch',
      `resume-blocked-binding-mismatch: missing policy snapshot at "${snapshotPath}"`,
    );
  }
  const policy = JSON.parse(readFileSync(snapshotPath, 'utf8')) as PolicyDoc;
  if (policy.policy?.id !== projection.binding.policyRef) {
    throw new ResumeRefusal(
      'resume-blocked-binding-mismatch',
      `resume-blocked-binding-mismatch: policy snapshot id "${policy.policy?.id ?? 'unknown-policy'}" does not match launch binding "${projection.binding.policyRef}"`,
    );
  }
  return policy;
}

function loadLaunchAttestationSnapshot(runDir: string, events: RunEvent[]): CapabilityAttestation | undefined {
  const launchEvent = events.find((event) => event.family === 'run.started');
  if (!launchEvent?.attestationSnapshot) {
    return undefined;
  }

  const snapshotPath = join(runDir, ATTESTATION_SNAPSHOT_FILE);
  if (!existsSync(snapshotPath)) {
    throw new ResumeRefusal(
      'resume-blocked-binding-mismatch',
      `resume-blocked-binding-mismatch: missing attestation snapshot at "${snapshotPath}"`,
    );
  }

  return JSON.parse(readFileSync(snapshotPath, 'utf8')) as CapabilityAttestation;
}

function loadPlanInstanceForVerification(planPath: string): PlanInstance {
  const planInstance = loadJson(planPath) as PlanInstance;
  PlanValidator.validate(planInstance);
  return planInstance;
}

function verifyWorkspaceContinuity(projection: RunProjection): void {
  const current = captureWorkspaceFingerprint(process.cwd());
  if (
    ('kind' in current && current.kind === 'unavailable') ||
    ('kind' in projection.workspace && projection.workspace.kind === 'unavailable') ||
    !isDeepStrictEqual(current, projection.workspace)
  ) {
    throw new ResumeRefusal(
      'resume-blocked-workspace-mismatch',
      'resume-blocked-workspace-mismatch: current workspace fingerprint differs from the recorded launch binding',
    );
  }
}

function verifyOptionalBindings(
  options: ResumeRunOptions,
  projection: RunProjection,
  planSnapshot: Plan,
  policySnapshot: PolicyDoc,
): ConfigDoc | undefined {
  let verifiedConfig: ConfigDoc | undefined;
  if (options.configPath) {
    const config = loadConfig(options.configPath);
    if (describeConfigBinding(config) !== projection.binding.configRef) {
      throw new ResumeRefusal(
        'resume-blocked-binding-mismatch',
        'resume-blocked-binding-mismatch: --config does not match the recorded launch binding',
      );
    }
    verifiedConfig = config;
  }

  if (options.policyPath) {
    const policy = loadPolicy(options.policyPath);
    if (!isDeepStrictEqual(policy, policySnapshot)) {
      throw new ResumeRefusal(
        'resume-blocked-binding-mismatch',
        'resume-blocked-binding-mismatch: --policy does not match the recorded launch policy snapshot',
      );
    }
  }

  if (options.planPath) {
    const planInstance = loadPlanInstanceForVerification(options.planPath);
    if (!isDeepStrictEqual(planInstance.plan, planSnapshot)) {
      throw new ResumeRefusal(
        'resume-blocked-binding-mismatch',
        'resume-blocked-binding-mismatch: --plan does not match the recorded plan snapshot',
      );
    }
  }

  return verifiedConfig;
}

function configForResumeComposition(verifiedConfig?: ConfigDoc): ConfigDoc {
  return {
    drivers: verifiedConfig?.drivers ?? {},
  };
}

function parkedStoryIdFromCheckpoint(checkpoint: string | undefined): string | null {
  if (!checkpoint?.startsWith('after:') || !checkpoint.endsWith('.parked')) {
    return null;
  }
  return checkpoint.slice('after:'.length, -'.parked'.length);
}

function findParkedRequest(events: RunEvent[], parkedStoryId: string | null): ResumePlan['parkedRequest'] {
  if (!parkedStoryId) {
    return undefined;
  }

  let parkedEvent: RunEvent | undefined;
  for (const event of events) {
    if (event.family === 'story.parked' && event.storyId === parkedStoryId) {
      parkedEvent = event;
    }
  }

  if (!parkedEvent) {
    return undefined;
  }

  return {
    requestId: typeof parkedEvent.requestId === 'string' ? parkedEvent.requestId : undefined,
    requestKind: typeof parkedEvent.requestKind === 'string' ? parkedEvent.requestKind : undefined,
  };
}

const REAL_LANDING_FAMILIES = new Set(['runner-action.pushed', 'runner-action.opened-pr', 'runner-action.merged']);

function isLandingAction(value: unknown): value is LandingAction {
  return value === 'push' || value === 'open-pr' || value === 'merge';
}

function priorLandingsFromEvents(events: RunEvent[]): NonNullable<ResumePlan['priorLandings']> {
  return events
    .filter((event) => REAL_LANDING_FAMILIES.has(event.family))
    .flatMap((event) => {
      if (
        typeof event.storyId !== 'string' ||
        !isLandingAction(event.action) ||
        !isLandingAction(event.landingKind) ||
        typeof event.targetRef !== 'string' ||
        typeof event.targetHead !== 'string'
      ) {
        return [];
      }

      return [
        {
          storyId: event.storyId,
          action: event.action,
          landingKind: event.landingKind,
          targetRef: event.targetRef,
          targetHead: event.targetHead,
        },
      ];
    });
}

export function buildResumePlan(projection: RunProjection, events: RunEvent[]): ResumePlan {
  if (projection.lifecycleState !== 'stopped' || !projection.safeCheckpoint || !projection.stopCause) {
    throw new Error('Cannot resume a run that is not stopped at a safe checkpoint');
  }

  const completedStoryIds: string[] = [];
  const blockedStoryIds: string[] = [];
  const priorLandings = priorLandingsFromEvents(events);
  for (const story of Object.values(projection.stories)) {
    if (story.state === 'done') {
      completedStoryIds.push(story.storyId);
    } else if (story.state === 'blocked') {
      blockedStoryIds.push(story.storyId);
    }
  }

  const parkedStoryId = parkedStoryIdFromCheckpoint(projection.safeCheckpoint);

  return {
    runId: projection.runId,
    checkpoint: projection.safeCheckpoint,
    stopCause: projection.stopCause,
    completedStoryIds,
    blockedStoryIds,
    ...(priorLandings.length > 0 ? { priorLandings } : {}),
    parkedStoryId,
    unstartedStoryIds: projection.unstartedStoryIds,
    parkedRequest: findParkedRequest(events, parkedStoryId),
  };
}

class ResumeRecordSink implements RecordSink {
  private readonly events: RunEvent[];
  private readonly runDir: string;
  private readonly projection: RunProjection;
  private readonly launchEvent: RunEvent | undefined;
  private readonly redaction: RedactionOptions | undefined;

  constructor(runDir: string, projection: RunProjection, existingEvents: RunEvent[], redaction?: RedactionOptions) {
    this.runDir = runDir;
    this.projection = projection;
    this.events = [...existingEvents];
    this.launchEvent = existingEvents.find((event) => event.family === 'run.started');
    this.redaction = redaction;
  }

  init(): void {}

  recordEvent(event: Pick<RunEvent, 'family'> & Partial<RunEvent>): void {
    const redactedEvent = redactValue(event, this.redaction) as Pick<RunEvent, 'family'> & Partial<RunEvent>;
    const timestampedEvent: RunEvent = { ...redactedEvent, actor: 'runner', timestamp: new Date().toISOString() };
    this.events.push(timestampedEvent);
    appendFileSync(join(this.runDir, 'events.jsonl'), `${JSON.stringify(timestampedEvent)}\n`);
  }

  async finalize(status: RunStatus): Promise<void> {
    const runRecord: RunRecord = {
      run: {
        id: this.projection.runId,
        attempt: 1,
        status,
        planId: this.projection.planId,
        mode: this.projection.mode,
        binding: this.projection.binding as RunBinding,
        posture: this.projection.posture as RunPosture,
        planSnapshot: {
          ref: this.projection.planSnapshotRef,
          path: join(this.runDir, PLAN_SNAPSHOT_FILE),
        },
        policySnapshot: {
          ref: this.projection.policySnapshotRef,
          path: join(this.runDir, POLICY_SNAPSHOT_FILE),
        },
        ...(this.launchEvent?.attestationSnapshot ? { attestationSnapshot: this.launchEvent.attestationSnapshot } : {}),
        ...(this.launchEvent?.substrateManifest ? { substrateManifest: this.launchEvent.substrateManifest } : {}),
      },
      events: this.events,
    };
    writeFileSync(join(this.runDir, 'run.json'), JSON.stringify(runRecord, null, 2));
    this.printSummary(status);
  }

  printSummary(status: RunStatus): void {
    console.log('\n--- Run Summary ---');
    console.log(`Final Status: ${status}`);
    if (this.projection.mode) {
      console.log(`Mode: ${this.projection.mode}`);
    }

    const items = this.events.filter((event) =>
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
      }
    }

    console.log(`\nRecords Directory: ${this.runDir}`);
    console.log('-------------------\n');
  }
}

export async function resumeRun(options: ResumeRunOptions): Promise<RunStatus> {
  const eventsJsonlPath = join(options.runDir, 'events.jsonl');
  if (!existsSync(eventsJsonlPath)) {
    throw new Error(`Missing authoritative events.jsonl in "${options.runDir}"`);
  }

  const eventsJsonl = readFileSync(eventsJsonlPath, 'utf8');
  const existingEvents = readJsonlEvents(eventsJsonl);
  const projection = projectRunEvents({ eventsJsonl, runRecord: loadRunRecord(options.runDir) });
  const planSnapshot = loadPlanSnapshot(options.runDir);
  const policySnapshot = loadPolicySnapshot(options.runDir, projection);
  const launchAttestation = loadLaunchAttestationSnapshot(options.runDir, existingEvents);
  const verifiedConfig = verifyOptionalBindings(options, projection, planSnapshot, policySnapshot);
  verifyWorkspaceContinuity(projection);

  const resumePlan = buildResumePlan(projection, existingEvents);
  const scriptedOutput = loadJson(options.scriptedOutputPath) as Record<string, unknown>;
  const composed = await composeReferenceRun({
    planInstance: { plan: planSnapshot },
    config: configForResumeComposition(verifiedConfig),
    scriptedOutput,
    forgeTransport: options.forgeTransport,
    redaction: options.redaction,
  });
  const intake = await intakeCandidates(composed.workSource);
  const recordSink = new ResumeRecordSink(options.runDir, projection, existingEvents, composed.redaction);
  for (const rejection of intake.rejected) {
    recordSink.recordEvent(rejection.event);
  }
  const [candidate] = intake.admitted;
  if (!candidate) {
    await recordSink.finalize('failure');
    throw new Error('No validated work-source candidate available');
  }
  const harness = new LocalHarness(composed.agent, recordSink, options.ownerDecisionSource ?? null, {
    capabilityAttestation: launchAttestation ?? composed.capabilityAttestation,
    forge: composed.forge,
  });

  return await harness.resume(candidate, policySnapshot, resumePlan);
}
