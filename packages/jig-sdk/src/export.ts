import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { type IntegrityVerification, launchBindingExpectsIntegrity, verifyIntegritySidecar } from './integrity.js';
import { parseEventsJsonl, projectRunEvents, type RunProjection } from './projection.js';
import { RedactionAmbiguityError, redactValue } from './redaction.js';
import type { RunBinding, RunEvent, RunRecord } from './types.js';

const EXPORTS_DIR = 'exports';
const EXPORT_AUDIT_FILE = 'export-audit.jsonl';
const EXPORT_FORMAT = 'jig.audit-export.v0';

export interface ExportRunInput {
  runDir: string;
  outputDir?: string;
}

export interface ExportedRunEvent {
  line: number;
  event: RunEvent;
}

export interface WithheldRunEvent {
  line: number;
  family: string;
  reason: string;
}

export interface ExportRunResult {
  runDir: string;
  status: 'exported' | 'refused';
  auditEventPath: string;
  artifactPath?: string;
  artifactSha256?: string;
  reason?: string;
}

interface ExportAuditEvent {
  family: 'export.prepared' | 'export.denied';
  actor: 'owner';
  timestamp: string;
  runId?: string;
  artifactPath?: string;
  artifactSha256?: string;
  reason?: string;
}

interface ExportArtifact {
  format: typeof EXPORT_FORMAT;
  createdAt: string;
  source: {
    runDir: string;
    eventsJsonlSha256: string;
    integrity: IntegrityVerification;
  };
  manifest: {
    runId: string;
    planId: string;
    lifecycleState: RunProjection['lifecycleState'];
    status: RunProjection['status'];
    eventCount: number;
    exportedEventCount: number;
    withheldEventCount: number;
    redaction: {
      default: 'redacted';
      policy: 'withhold-unknown-or-ambiguous';
    };
  };
  projection: RunProjection;
  events: ExportedRunEvent[];
  withheldEvents: WithheldRunEvent[];
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function readRunRecord(runDir: string): RunRecord | null {
  const runJsonPath = join(runDir, 'run.json');
  if (!existsSync(runJsonPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(runJsonPath, 'utf8')) as RunRecord;
  } catch {
    return null;
  }
}

function readLaunchBindingForIntegrity(eventsJsonl: string): Pick<RunBinding, 'drivers'> | undefined {
  const [launchLine] = eventsJsonl.split('\n');
  if (!launchLine) {
    return undefined;
  }

  try {
    const launch = JSON.parse(launchLine) as { binding?: Pick<RunBinding, 'drivers'> };
    return launch.binding;
  } catch {
    return undefined;
  }
}

function exportDirFor(input: ExportRunInput): string {
  return input.outputDir ?? join(input.runDir, EXPORTS_DIR);
}

function appendAuditEvent(outputDir: string, event: ExportAuditEvent): string {
  mkdirSync(outputDir, { recursive: true });
  const auditPath = join(outputDir, EXPORT_AUDIT_FILE);
  appendFileSync(auditPath, `${JSON.stringify(event)}\n`);
  return auditPath;
}

function refuse(input: ExportRunInput, reason: string, runId?: string): ExportRunResult {
  const outputDir = exportDirFor(input);
  const auditEventPath = appendAuditEvent(outputDir, {
    family: 'export.denied',
    actor: 'owner',
    timestamp: new Date().toISOString(),
    ...(runId ? { runId } : {}),
    reason,
  });
  return {
    runDir: input.runDir,
    status: 'refused',
    auditEventPath,
    reason,
  };
}

function postureForEvent(event: RunEvent, projection: RunProjection): string | null {
  const eventPosture = event.posture;
  if (typeof eventPosture === 'object' && eventPosture !== null && 'export' in eventPosture) {
    return typeof eventPosture.export === 'string' ? eventPosture.export : null;
  }
  return typeof projection.posture.export === 'string' ? projection.posture.export : null;
}

function exportEvents(
  eventsJsonl: string,
  projection: RunProjection,
): {
  events: ExportedRunEvent[];
  withheldEvents: WithheldRunEvent[];
} {
  const events: ExportedRunEvent[] = [];
  const withheldEvents: WithheldRunEvent[] = [];

  for (const parsed of parseEventsJsonl(eventsJsonl)) {
    const posture = postureForEvent(parsed.event, projection);
    if (posture !== 'redacted') {
      withheldEvents.push({
        line: parsed.line,
        family: parsed.event.family,
        reason: posture ? `unsupported-export-posture:${posture}` : 'missing-export-posture',
      });
      continue;
    }

    try {
      events.push({
        line: parsed.line,
        event: redactValue(parsed.event, { enabled: true }, `events[${parsed.line - 1}]`) as RunEvent,
      });
    } catch (error) {
      if (error instanceof RedactionAmbiguityError) {
        withheldEvents.push({
          line: parsed.line,
          family: parsed.event.family,
          reason: error.message,
        });
        continue;
      }
      throw error;
    }
  }

  return { events, withheldEvents };
}

function artifactPath(outputDir: string, projection: RunProjection, createdAt: string): string {
  const timestamp = createdAt.replace(/[:.]/g, '-');
  return join(outputDir, `${projection.runId}-audit-export-${timestamp}-${randomUUID()}.json`);
}

export function exportRun(input: ExportRunInput): ExportRunResult {
  if (!existsSync(input.runDir)) {
    throw new Error(`Run directory "${input.runDir}" does not exist`);
  }

  const eventsJsonlPath = join(input.runDir, 'events.jsonl');
  if (!existsSync(eventsJsonlPath)) {
    throw new Error(`Missing authoritative events.jsonl in "${input.runDir}"`);
  }

  const eventsJsonl = readFileSync(eventsJsonlPath, 'utf8');
  const integrity = verifyIntegritySidecar(input.runDir, {
    expected: launchBindingExpectsIntegrity(readLaunchBindingForIntegrity(eventsJsonl)),
  });
  if (integrity.status === 'broken') {
    return refuse(input, `${integrity.code}: ${integrity.message}`);
  }

  let projection: RunProjection;
  try {
    projection = projectRunEvents({ eventsJsonl, runRecord: readRunRecord(input.runDir) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return refuse(input, `projection-drift: ${message}`);
  }

  if (projection.lifecycleState !== 'completed' && projection.lifecycleState !== 'stopped') {
    return refuse(input, `run-not-finished:${projection.lifecycleState}`, projection.runId);
  }

  const outputDir = exportDirFor(input);
  mkdirSync(outputDir, { recursive: true });
  const createdAt = new Date().toISOString();
  const redacted = exportEvents(eventsJsonl, projection);
  const artifact: ExportArtifact = {
    format: EXPORT_FORMAT,
    createdAt,
    source: {
      runDir: basename(input.runDir),
      eventsJsonlSha256: sha256(eventsJsonl),
      integrity,
    },
    manifest: {
      runId: projection.runId,
      planId: projection.planId,
      lifecycleState: projection.lifecycleState,
      status: projection.status,
      eventCount: projection.eventCount,
      exportedEventCount: redacted.events.length,
      withheldEventCount: redacted.withheldEvents.length,
      redaction: {
        default: 'redacted',
        policy: 'withhold-unknown-or-ambiguous',
      },
    },
    projection,
    events: redacted.events,
    withheldEvents: redacted.withheldEvents,
  };
  const path = artifactPath(outputDir, projection, createdAt);
  writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' });
  const artifactSha256 = sha256(readFileSync(path));
  const auditEventPath = appendAuditEvent(outputDir, {
    family: 'export.prepared',
    actor: 'owner',
    timestamp: createdAt,
    runId: projection.runId,
    artifactPath: path,
    artifactSha256,
  });
  return {
    runDir: input.runDir,
    status: 'exported',
    auditEventPath,
    artifactPath: path,
    artifactSha256,
  };
}
