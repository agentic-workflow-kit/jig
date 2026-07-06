import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTEGRITY_FILE } from '../../src/integrity.js';
import type { CapabilityAttestation } from '../../src/ports.js';
import type { RunEvent, RunRecord } from '../../src/types.js';

export const SMOKE_REPOSITORY = 'agentic-workflow-kit/jig-smoke-target';
export const SMOKE_SEED_ISSUE_LABEL = 'jig-candidate';
export const REAL_LANDING_FAMILIES = new Set([
  'runner-action.pushed',
  'runner-action.opened-pr',
  'runner-action.merged',
]);

export interface RunArtifacts {
  runDir: string;
  record: RunRecord;
  runJsonBytes: Buffer;
  integrityJsonBytes: Buffer;
}

export interface EvRunEvidenceFacts {
  runId: string;
  runStatus: string;
  driverSelection?: RunRecord['run']['binding']['drivers'];
  prUrl: string;
  prNumber?: number;
  landingOutcome: 'opened-pr' | 'merged' | 'held';
  landingFamilies: string[];
  integrityStatus: string;
  runJsonSha256: string;
  integrityJsonSha256: string;
  hostAttestation?: {
    driverId: string;
    runContext: string;
    positive: boolean;
    containmentMechanism?: string;
    reportedIsolationStrength?: string;
    provenIsolationStrength?: string;
    negativeEgressObservedOutcome?: string;
    failureToken?: string;
  };
  codexObserved?: {
    driver?: string;
    cliVersion?: string;
    threadResumed?: boolean;
    finalTurnStatus?: string;
    approvals?: unknown[];
    commands?: unknown[];
  };
}

export function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function gitConfigValues(env: NodeJS.ProcessEnv = process.env): string[] {
  const count = Number(env.GIT_CONFIG_COUNT ?? 0);
  if (!Number.isInteger(count) || count <= 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => env[`GIT_CONFIG_VALUE_${index}`]).filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
}

export function assertSerializedTokenClean(serialized: string): void {
  const forbiddenValues = [
    process.env.GITHUB_TOKEN,
    process.env.GH_TOKEN,
    process.env.JIG_RECORDS_INTEGRITY_KEY,
    ...gitConfigValues(),
    'x-access-token',
    process.env.GIT_ASKPASS,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  for (const forbidden of forbiddenValues) {
    assert.strictEqual(serialized.includes(forbidden), false, 'serialized evidence must not contain credentials');
  }
  assert.doesNotMatch(serialized, /https:\/\/[^:\s/]+:[^@\s/]+@/i);
}

export function emitJsonEvidenceFacts(outPath: string, facts: Record<string, unknown>): void {
  const serialized = `${JSON.stringify(facts, null, 2)}\n`;
  assertSerializedTokenClean(serialized);
  writeFileSync(outPath, serialized);
}

function assertArtifactTokenClean(runDir: string): {
  runJson: string;
  runJsonBytes: Buffer;
  integrityJsonBytes: Buffer;
} {
  const runJsonBytes = readFileSync(join(runDir, 'run.json'));
  const runJson = runJsonBytes.toString('utf8');
  const integrityPath = join(runDir, INTEGRITY_FILE);
  assert.ok(existsSync(integrityPath), `${INTEGRITY_FILE} must exist before evidence assertions`);
  const integrityJsonBytes = readFileSync(integrityPath);
  assertSerializedTokenClean(`${runJson}\n${integrityJsonBytes.toString('utf8')}`);
  return { runJson, runJsonBytes, integrityJsonBytes };
}

export function readSingleRunRecord(recordDir: string): RunArtifacts {
  const [runName] = readdirSync(recordDir);
  assert.ok(runName, 'expected one generated run directory');
  const runDir = join(recordDir, runName);
  const { runJson, runJsonBytes, integrityJsonBytes } = assertArtifactTokenClean(runDir);
  return {
    runDir,
    record: JSON.parse(runJson) as RunRecord,
    runJsonBytes,
    integrityJsonBytes,
  };
}

function readHostAttestation(runDir: string, record: RunRecord): CapabilityAttestation | undefined {
  const attestationPath = record.run.attestationSnapshot?.path;
  if (!attestationPath) {
    return undefined;
  }
  const resolved = attestationPath.startsWith(runDir) ? attestationPath : join(runDir, 'attestation.snapshot.json');
  if (!existsSync(resolved)) {
    return undefined;
  }
  return JSON.parse(readFileSync(resolved, 'utf8')) as CapabilityAttestation;
}

function latestEvidenceModeled(record: RunRecord): RunEvent | undefined {
  return [...record.events].reverse().find((event) => event.family === 'evidence.modeled');
}

function asObservedRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function buildEvidenceFacts(input: {
  runDir: string;
  record: RunRecord;
  integrityStatus: string;
  runJsonBytes: Buffer;
  integrityJsonBytes: Buffer;
}): EvRunEvidenceFacts {
  const openedPr = input.record.events.find(
    (event) => event.family === 'runner-action.opened-pr' && typeof event.prUrl === 'string',
  );
  assert.ok(openedPr, 'expected opened PR event before emitting evidence facts');

  const landingFamilies = [
    ...new Set(input.record.events.map((event) => event.family).filter((family) => REAL_LANDING_FAMILIES.has(family))),
  ];
  const heldOutcome = input.record.events.find(
    (event) =>
      event.family === 'story.done' && typeof event.mergeability === 'string' && typeof event.targetHead === 'string',
  );
  const hostAttestation = readHostAttestation(input.runDir, input.record);
  const modeledEvidence = latestEvidenceModeled(input.record);
  const observed = asObservedRecord(modeledEvidence?.observed);
  const codexObserved = observed
    ? {
        driver: typeof observed.driver === 'string' ? observed.driver : undefined,
        cliVersion: typeof observed.cliVersion === 'string' ? observed.cliVersion : undefined,
        threadResumed: typeof observed.threadResumed === 'boolean' ? observed.threadResumed : undefined,
        finalTurnStatus: typeof observed.finalTurnStatus === 'string' ? observed.finalTurnStatus : undefined,
        approvals: Array.isArray(observed.approvals) ? observed.approvals : undefined,
        commands: Array.isArray(observed.commands) ? observed.commands : undefined,
      }
    : undefined;

  return {
    runId: input.record.run.id,
    runStatus: input.record.run.status,
    driverSelection: input.record.run.binding.drivers,
    prUrl: openedPr.prUrl as string,
    ...(typeof openedPr.prNumber === 'number' ? { prNumber: openedPr.prNumber } : {}),
    landingOutcome: heldOutcome ? 'held' : landingFamilies.includes('runner-action.merged') ? 'merged' : 'opened-pr',
    landingFamilies,
    integrityStatus: input.integrityStatus,
    runJsonSha256: sha256(input.runJsonBytes),
    integrityJsonSha256: sha256(input.integrityJsonBytes),
    ...(hostAttestation
      ? {
          hostAttestation: {
            driverId: hostAttestation.driverId,
            runContext: hostAttestation.runContext,
            positive: hostAttestation.positive,
            ...(hostAttestation.containmentMechanism
              ? { containmentMechanism: hostAttestation.containmentMechanism }
              : {}),
            ...(hostAttestation.reportedIsolationStrength
              ? {
                  reportedIsolationStrength: hostAttestation.reportedIsolationStrength,
                }
              : {}),
            ...(hostAttestation.provenIsolationStrength
              ? {
                  provenIsolationStrength: hostAttestation.provenIsolationStrength,
                }
              : {}),
            ...(hostAttestation.negativeEgressObservedOutcome
              ? {
                  negativeEgressObservedOutcome: hostAttestation.negativeEgressObservedOutcome,
                }
              : {}),
            ...(hostAttestation.failureToken ? { failureToken: hostAttestation.failureToken } : {}),
          },
        }
      : {}),
    ...(codexObserved ? { codexObserved } : {}),
  };
}

export function emitEvidenceFacts(
  outPath: string,
  input: {
    runDir: string;
    record: RunRecord;
    integrityStatus: string;
    runJsonBytes: Buffer;
    integrityJsonBytes: Buffer;
  },
): void {
  const serialized = `${JSON.stringify(buildEvidenceFacts(input), null, 2)}\n`;
  assertSerializedTokenClean(serialized);
  writeFileSync(outPath, serialized);
}
