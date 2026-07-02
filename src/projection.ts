import { isDeepStrictEqual } from 'node:util';
import type { Diagnostics, RunEvent, RunRecord, RunStatus } from './types.js';

export type ProjectionLifecycleState = 'started' | 'resumed' | 'stopped' | 'completed';
export type ProjectionStatus = RunStatus | 'running';
export type ProjectedStoryState = 'unstarted' | 'started' | 'parked' | 'done' | 'blocked' | 'rejected';

export interface WorkspaceFingerprint {
  repoRoot: string;
  root?: string;
  head: string;
  changeSetHash: string;
  kind?: string;
  [key: string]: unknown;
}

export interface LaunchBinding {
  policyRef: string;
  configRef: string;
  workspace: WorkspaceFingerprint;
}

export interface RunPosture {
  record?: string;
  redaction: string;
  export: string;
  [key: string]: unknown;
}

export interface ProjectionIssue {
  code: string;
  message: string;
  line?: number;
  offset?: number;
  details?: string[];
}

export interface ProjectedStory {
  storyId: string;
  state: ProjectedStoryState;
  reason?: string;
  blockedBy?: string;
  diagnostics?: Diagnostics;
  changedFiles: string[];
  lastEventFamily: string;
}

export interface RunProjection {
  runId: string;
  planId: string;
  mode: string;
  binding: LaunchBinding;
  workspace: WorkspaceFingerprint;
  posture: RunPosture;
  planSnapshotRef: string;
  status: ProjectionStatus;
  lifecycleState: ProjectionLifecycleState;
  stopCause?: string;
  summaryReason?: string;
  safeCheckpoint?: string;
  unstartedStoryIds: string[];
  stories: Record<string, ProjectedStory>;
  changedFiles: string[];
  diagnostics: ProjectionIssue[];
  notices: ProjectionIssue[];
  eventCount: number;
}

export interface ProjectRunEventsInput {
  eventsJsonl: string;
  runRecord?: RunRecord | null;
}

interface ParsedEvent {
  event: RunEvent;
  line: number;
  offset: number;
}

export class ProjectionError extends Error {
  readonly code: string;
  readonly line?: number;
  readonly offset?: number;

  constructor(code: string, message: string, context: { line?: number; offset?: number } = {}) {
    super(message);
    this.name = 'ProjectionError';
    this.code = code;
    this.line = context.line;
    this.offset = context.offset;
  }
}

interface StoryAccumulator {
  state: ProjectedStoryState;
  reason?: string;
  blockedBy?: string;
  diagnostics?: Diagnostics;
  changedFiles: string[];
  lastEventFamily: string;
}

const VALID_RECORD_POSTURE = 'safe-for-owner-record';
const VALID_EXPORT_POSTURE = 'redacted';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEventsJsonl(eventsJsonl: string): ParsedEvent[] {
  const parsedEvents: ParsedEvent[] = [];
  const lines = eventsJsonl.split('\n');
  let offset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = index + 1;
    const lineOffset = offset;

    if (index === lines.length - 1 && rawLine === '') {
      break;
    }

    if (rawLine.trim() === '') {
      throw new ProjectionError(
        'malformed-jsonl-line',
        `Malformed events.jsonl line ${line}: empty line is not a valid event`,
        {
          line,
          offset: lineOffset,
        },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawLine);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ProjectionError('malformed-jsonl-line', `Malformed events.jsonl line ${line}: ${message}`, {
        line,
        offset: lineOffset,
      });
    }

    if (!isRecord(parsed) || typeof parsed.family !== 'string') {
      throw new ProjectionError(
        'malformed-jsonl-line',
        `Malformed events.jsonl line ${line}: event must be an object with a string family`,
        { line, offset: lineOffset },
      );
    }

    parsedEvents.push({
      event: parsed as RunEvent,
      line,
      offset: lineOffset,
    });
    offset += rawLine.length + 1;
  }

  return parsedEvents;
}

function requireActor(parsedEvent: ParsedEvent): void {
  if (typeof parsedEvent.event.actor !== 'string' || parsedEvent.event.actor.trim() === '') {
    throw new ProjectionError(
      'missing-actor',
      `Event on line ${parsedEvent.line} is missing required actor`,
      parsedEvent,
    );
  }
}

function requireString(
  value: unknown,
  field: string,
  parsedEvent: ParsedEvent,
  errorCode: string = 'missing-launch-metadata',
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ProjectionError(errorCode, `Missing Phase 4 launch metadata in run.started: ${field}`, parsedEvent);
  }
  return value;
}

function requireObject(
  value: unknown,
  field: string,
  parsedEvent: ParsedEvent,
  errorCode: string = 'missing-launch-metadata',
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ProjectionError(errorCode, `Missing Phase 4 launch metadata in run.started: ${field}`, parsedEvent);
  }
  return value;
}

function readRunPosture(parsedEvent: ParsedEvent, postureRecord: Record<string, unknown>): RunPosture {
  const recordValue =
    typeof postureRecord.record === 'string' && postureRecord.record.trim() !== '' ? postureRecord.record : undefined;
  const redactionValue =
    typeof postureRecord.redaction === 'string' && postureRecord.redaction.trim() !== ''
      ? postureRecord.redaction
      : undefined;

  if (recordValue !== undefined && redactionValue !== undefined && recordValue !== redactionValue) {
    throw new ProjectionError(
      'invalid-posture',
      `Conflicting run.started posture values for record and redaction on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  const effectiveRecordPosture = redactionValue ?? recordValue;
  if (effectiveRecordPosture === undefined) {
    throw new ProjectionError(
      'missing-launch-metadata',
      'Missing Phase 4 launch metadata in run.started: posture.record|posture.redaction',
      parsedEvent,
    );
  }

  if (effectiveRecordPosture === 'unknown' || effectiveRecordPosture === 'ambiguous') {
    throw new ProjectionError(
      'invalid-posture',
      `Ambiguous run.started redaction posture on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  if (effectiveRecordPosture !== VALID_RECORD_POSTURE) {
    throw new ProjectionError(
      'invalid-posture',
      `Unsupported run.started redaction posture "${effectiveRecordPosture}" on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  const exportPosture = requireString(postureRecord.export, 'posture.export', parsedEvent);
  if (exportPosture === 'unknown' || exportPosture === 'ambiguous') {
    throw new ProjectionError(
      'invalid-posture',
      `Ambiguous run.started export posture on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  if (exportPosture !== VALID_EXPORT_POSTURE) {
    throw new ProjectionError(
      'invalid-posture',
      `Unsupported run.started export posture "${exportPosture}" on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  return {
    ...postureRecord,
    record: effectiveRecordPosture,
    redaction: effectiveRecordPosture,
    export: exportPosture,
  };
}

function readLaunchHeader(
  parsedEvent: ParsedEvent,
): Omit<
  RunProjection,
  | 'status'
  | 'lifecycleState'
  | 'stopCause'
  | 'safeCheckpoint'
  | 'unstartedStoryIds'
  | 'stories'
  | 'changedFiles'
  | 'diagnostics'
  | 'notices'
  | 'eventCount'
> {
  if (parsedEvent.event.family !== 'run.started') {
    throw new ProjectionError(
      'missing-launch-metadata',
      'events.jsonl must start with a Phase 4 run.started launch header',
      parsedEvent,
    );
  }

  const runId = requireString(parsedEvent.event.runId, 'runId', parsedEvent);
  const planId = requireString(parsedEvent.event.planId, 'planId', parsedEvent);
  const mode = requireString(parsedEvent.event.mode, 'mode', parsedEvent);
  const bindingRecord = requireObject(parsedEvent.event.binding, 'binding', parsedEvent);
  const workspaceRecord = requireObject(bindingRecord.workspace, 'binding.workspace', parsedEvent);
  const postureRecord = requireObject(parsedEvent.event.posture, 'posture', parsedEvent);
  const planSnapshotRecord = isRecord(parsedEvent.event.planSnapshot) ? parsedEvent.event.planSnapshot : undefined;

  const repoRoot = requireString(
    workspaceRecord.repoRoot ?? workspaceRecord.root,
    'binding.workspace.repoRoot',
    parsedEvent,
  );

  const binding: LaunchBinding = {
    policyRef: requireString(bindingRecord.policyRef, 'binding.policyRef', parsedEvent),
    configRef: requireString(bindingRecord.configRef, 'binding.configRef', parsedEvent),
    workspace: {
      ...workspaceRecord,
      repoRoot,
      head: requireString(workspaceRecord.head, 'binding.workspace.head', parsedEvent),
      changeSetHash: requireString(workspaceRecord.changeSetHash, 'binding.workspace.changeSetHash', parsedEvent),
    },
  };

  const posture = readRunPosture(parsedEvent, postureRecord);

  return {
    runId,
    planId,
    mode,
    binding,
    workspace: binding.workspace,
    posture,
    planSnapshotRef: requireString(
      parsedEvent.event.planSnapshotRef ?? planSnapshotRecord?.ref,
      'planSnapshotRef',
      parsedEvent,
    ),
  };
}

function getOrCreateStory(stories: Map<string, StoryAccumulator>, storyId: string): StoryAccumulator {
  const existing = stories.get(storyId);
  if (existing) {
    return existing;
  }

  const created: StoryAccumulator = {
    state: 'unstarted',
    changedFiles: [],
    lastEventFamily: 'story.unstarted',
  };
  stories.set(storyId, created);
  return created;
}

function appendChangedFiles(target: string[], value: unknown): void {
  if (!Array.isArray(value)) {
    return;
  }

  for (const entry of value) {
    if (typeof entry === 'string' && !target.includes(entry)) {
      target.push(entry);
    }
  }
}

function requireStoryId(parsedEvent: ParsedEvent): string {
  if (typeof parsedEvent.event.storyId !== 'string' || parsedEvent.event.storyId.trim() === '') {
    throw new ProjectionError(
      'missing-story-id',
      `Event family ${parsedEvent.event.family} on line ${parsedEvent.line} is missing required storyId`,
      parsedEvent,
    );
  }
  return parsedEvent.event.storyId;
}

function assertActiveRun(lifecycleState: ProjectionLifecycleState, parsedEvent: ParsedEvent): void {
  if (lifecycleState === 'completed') {
    throw new ProjectionError(
      'illegal-transition',
      `Illegal event ${parsedEvent.event.family} after run.completed on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  if (lifecycleState === 'stopped' && parsedEvent.event.family !== 'run.resumed') {
    throw new ProjectionError(
      'illegal-transition',
      `Illegal event ${parsedEvent.event.family} after run.stopped on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }
}

function assertStoryState(
  story: StoryAccumulator,
  allowedStates: ProjectedStoryState[],
  parsedEvent: ParsedEvent,
  storyId: string,
): void {
  if (!allowedStates.includes(story.state)) {
    throw new ProjectionError(
      'illegal-transition',
      `Illegal replay transition for ${storyId}: ${story.state} -> ${parsedEvent.event.family}`,
      parsedEvent,
    );
  }
}

function compareRunRecord(
  runRecord: RunRecord | null | undefined,
  projection: RunProjection,
  parsedEvents: ParsedEvent[],
): ProjectionIssue[] {
  if (!runRecord) {
    return [];
  }

  const staleDetails: string[] = [];

  if (runRecord.run.id !== projection.runId) staleDetails.push('run.id');
  if (runRecord.run.planId !== projection.planId) staleDetails.push('run.planId');
  if (runRecord.run.status !== projection.status) staleDetails.push('run.status');
  if (runRecord.run.mode !== undefined && runRecord.run.mode !== projection.mode) staleDetails.push('run.mode');
  if (
    runRecord.run.binding.policyRef !== undefined &&
    runRecord.run.binding.policyRef !== projection.binding.policyRef
  ) {
    staleDetails.push('run.binding.policyRef');
  }
  if (runRecord.run.binding.configRef !== projection.binding.configRef) staleDetails.push('run.binding.configRef');

  const runBindingRecord = runRecord.run.binding as unknown as Record<string, unknown>;
  if (
    runBindingRecord.workspace !== undefined &&
    !isDeepStrictEqual(runBindingRecord.workspace, projection.workspace)
  ) {
    staleDetails.push('run.binding.workspace');
  }

  const eventCache = Array.isArray(runRecord.events) ? runRecord.events : [];
  const authoritativeEvents = parsedEvents.map((entry) => entry.event);
  if (!isDeepStrictEqual(eventCache, authoritativeEvents)) {
    staleDetails.push('events');
  }

  if (staleDetails.length === 0) {
    return [];
  }

  return [
    {
      code: 'run.json-stale',
      message: 'run.json conflicts with authoritative events.jsonl; projection uses the log',
      details: staleDetails,
    },
  ];
}

function checkpointMatchesStory(stories: Map<string, StoryAccumulator>, checkpoint: string): boolean {
  if (!checkpoint.startsWith('after:')) {
    return false;
  }

  const target = checkpoint.slice('after:'.length);
  if (target.endsWith('.parked')) {
    const story = stories.get(target.slice(0, -'.parked'.length));
    return story?.state === 'parked';
  }

  const story = stories.get(target);
  return story !== undefined && ['done', 'blocked', 'rejected'].includes(story.state);
}

export function projectRunEvents(input: ProjectRunEventsInput): RunProjection {
  const parsedEvents = parseEventsJsonl(input.eventsJsonl);
  if (parsedEvents.length === 0) {
    throw new ProjectionError('missing-launch-metadata', 'events.jsonl is empty and cannot be projected');
  }

  requireActor(parsedEvents[0]);
  const launch = readLaunchHeader(parsedEvents[0]);
  const diagnostics: ProjectionIssue[] = [];
  const notices: ProjectionIssue[] = [];
  const stories = new Map<string, StoryAccumulator>();
  const changedFiles: string[] = [];

  let lifecycleState: ProjectionLifecycleState = 'started';
  let status: ProjectionStatus = 'running';
  let stopCause: string | undefined;
  let summaryReason: string | undefined;
  let safeCheckpoint: string | undefined;
  let unstartedStoryIds: string[] = [];
  let sawEvidenceGateFailure = false;
  let sawAuthorizationDenial = false;

  for (const parsedEvent of parsedEvents.slice(1)) {
    requireActor(parsedEvent);

    const family = parsedEvent.event.family;

    if (family === 'run.started') {
      throw new ProjectionError(
        'illegal-transition',
        `Illegal second run.started launch header on line ${parsedEvent.line}`,
        parsedEvent,
      );
    }

    if (family === 'run.resumed') {
      if (lifecycleState !== 'stopped') {
        throw new ProjectionError(
          'illegal-transition',
          `Illegal run.resumed from ${lifecycleState} on line ${parsedEvent.line}`,
          parsedEvent,
        );
      }

      lifecycleState = 'resumed';
      status = 'running';
      stopCause = undefined;
      safeCheckpoint = undefined;
      unstartedStoryIds = [];
      continue;
    }

    if (family === 'run.completed') {
      if (lifecycleState !== 'started' && lifecycleState !== 'resumed') {
        throw new ProjectionError(
          'illegal-transition',
          `Illegal run.completed from ${lifecycleState} on line ${parsedEvent.line}`,
          parsedEvent,
        );
      }

      lifecycleState = 'completed';
      status = 'success';
      stopCause = undefined;
      safeCheckpoint = undefined;
      unstartedStoryIds = [];
      continue;
    }

    if (family === 'run.stopped') {
      if (lifecycleState !== 'started' && lifecycleState !== 'resumed') {
        throw new ProjectionError(
          'illegal-transition',
          `Illegal run.stopped from ${lifecycleState} on line ${parsedEvent.line}`,
          parsedEvent,
        );
      }

      if (typeof parsedEvent.event.checkpoint !== 'string' || parsedEvent.event.checkpoint.trim() === '') {
        throw new ProjectionError(
          'missing-stop-checkpoint',
          `run.stopped on line ${parsedEvent.line} is missing required checkpoint`,
          parsedEvent,
        );
      }

      if (!checkpointMatchesStory(stories, parsedEvent.event.checkpoint)) {
        throw new ProjectionError(
          'illegal-transition',
          `run.stopped checkpoint ${parsedEvent.event.checkpoint} does not match a safe projected story state`,
          parsedEvent,
        );
      }

      lifecycleState = 'stopped';
      status = 'failure';
      stopCause = typeof parsedEvent.event.reason === 'string' ? parsedEvent.event.reason : 'unknown-stop-cause';
      safeCheckpoint = parsedEvent.event.checkpoint;
      unstartedStoryIds = Array.isArray(parsedEvent.event.unstarted)
        ? parsedEvent.event.unstarted.filter((storyId): storyId is string => typeof storyId === 'string')
        : [];
      continue;
    }

    assertActiveRun(lifecycleState, parsedEvent);

    if (family === 'authorization.denied' && parsedEvent.event.storyId === undefined) {
      sawAuthorizationDenial = true;
      if (typeof parsedEvent.event.reason === 'string' && parsedEvent.event.reason.trim() !== '') {
        summaryReason = parsedEvent.event.reason;
        status = 'failure';
      }
      continue;
    }

    const storyId = requireStoryId(parsedEvent);
    const story = getOrCreateStory(stories, storyId);

    switch (family) {
      case 'story.started':
        assertStoryState(story, ['unstarted', 'parked'], parsedEvent, storyId);
        story.state = 'started';
        story.reason = undefined;
        story.blockedBy = undefined;
        story.lastEventFamily = family;
        break;
      case 'authorization.requested':
        assertStoryState(story, ['started'], parsedEvent, storyId);
        story.lastEventFamily = family;
        break;
      case 'authorization.granted':
        assertStoryState(story, ['started', 'parked'], parsedEvent, storyId);
        story.state = 'started';
        story.lastEventFamily = family;
        break;
      case 'authorization.denied':
        assertStoryState(story, ['started', 'parked'], parsedEvent, storyId);
        sawAuthorizationDenial = true;
        story.lastEventFamily = family;
        break;
      case 'authorization.routed':
        assertStoryState(story, ['started'], parsedEvent, storyId);
        story.lastEventFamily = family;
        break;
      case 'story.parked':
        assertStoryState(story, ['started'], parsedEvent, storyId);
        story.state = 'parked';
        story.reason = typeof parsedEvent.event.reason === 'string' ? parsedEvent.event.reason : undefined;
        story.lastEventFamily = family;
        break;
      case 'evidence.modeled':
        assertStoryState(story, ['started'], parsedEvent, storyId);
        appendChangedFiles(story.changedFiles, parsedEvent.event.changedFiles);
        appendChangedFiles(changedFiles, parsedEvent.event.changedFiles);
        story.lastEventFamily = family;
        break;
      case 'story.done':
        assertStoryState(story, ['started'], parsedEvent, storyId);
        story.state = 'done';
        appendChangedFiles(story.changedFiles, parsedEvent.event.changedFiles);
        appendChangedFiles(changedFiles, parsedEvent.event.changedFiles);
        story.lastEventFamily = family;
        break;
      case 'story.blocked':
        if (parsedEvent.event.blockedBy !== undefined) {
          assertStoryState(story, ['unstarted'], parsedEvent, storyId);
        } else {
          assertStoryState(story, ['started', 'parked'], parsedEvent, storyId);
        }
        story.state = 'blocked';
        story.reason = typeof parsedEvent.event.reason === 'string' ? parsedEvent.event.reason : undefined;
        story.blockedBy = typeof parsedEvent.event.blockedBy === 'string' ? parsedEvent.event.blockedBy : undefined;
        story.diagnostics = parsedEvent.event.diagnostics;
        story.lastEventFamily = family;
        if (parsedEvent.event.reason === 'evidence-gate-failed') {
          sawEvidenceGateFailure = true;
        }
        if (parsedEvent.event.reason === 'authorization-denied' || parsedEvent.event.reason === 'owner-rejection') {
          sawAuthorizationDenial = true;
        }
        break;
      case 'runner-action.skipped-on-dry-run':
        assertStoryState(story, ['done'], parsedEvent, storyId);
        story.lastEventFamily = family;
        break;
      default:
        throw new ProjectionError(
          'illegal-transition',
          `Unsupported event family ${family} on line ${parsedEvent.line}`,
          parsedEvent,
        );
    }
  }

  if (stopCause === 'unattended-park') {
    notices.push({
      code: 'unattended-park',
      message: 'run stopped at an unattended parked story',
    });
  }

  if (sawEvidenceGateFailure) {
    notices.push({
      code: 'evidence-gate-failure',
      message: 'projection found a story blocked by the evidence gate',
    });
  }

  if (sawAuthorizationDenial) {
    notices.push({
      code: 'policy-authorization-denial',
      message: 'projection found a policy or authorization denial',
    });
  }

  const projection: RunProjection = {
    ...launch,
    status,
    lifecycleState,
    stopCause,
    summaryReason,
    safeCheckpoint,
    unstartedStoryIds,
    stories: Object.fromEntries(
      Array.from(stories.entries()).map(([storyId, story]) => [
        storyId,
        {
          storyId,
          state: story.state,
          reason: story.reason,
          blockedBy: story.blockedBy,
          diagnostics: story.diagnostics,
          changedFiles: story.changedFiles,
          lastEventFamily: story.lastEventFamily,
        },
      ]),
    ),
    changedFiles,
    diagnostics,
    notices,
    eventCount: parsedEvents.length,
  };

  projection.diagnostics.push(...compareRunRecord(input.runRecord, projection, parsedEvents));

  return projection;
}
