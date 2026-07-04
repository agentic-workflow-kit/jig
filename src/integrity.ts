import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const INTEGRITY_FILE = 'integrity.json';
export const INTEGRITY_KEY_ENV = 'JIG_RECORDS_INTEGRITY_KEY';
export const INTEGRITY_KEY_ID_ENV = 'JIG_RECORDS_INTEGRITY_KEY_ID';

interface IntegrityArtifact {
  path: string;
  sha256: string;
}

interface IntegrityPayload {
  version: 1;
  algorithms: {
    artifactDigest: 'sha256';
    eventLogChain: 'sha256(prev || line)';
    hmac: 'hmac-sha256';
  };
  keyId: string;
  artifacts: Record<string, IntegrityArtifact>;
  eventLog: {
    path: 'events.jsonl';
    lineCount: number;
    chainHead: string;
  };
}

export interface IntegritySidecar extends IntegrityPayload {
  hmac: string;
}

export type IntegrityVerification =
  | { status: 'not-applicable' }
  | { status: 'verified'; sidecar: IntegritySidecar }
  | {
      status: 'broken';
      code:
        | 'integrity-sidecar-missing'
        | 'integrity-sidecar-unreadable'
        | 'integrity-key-missing'
        | 'integrity-hmac-mismatch'
        | 'integrity-artifact-mismatch';
      message: string;
      artifacts: string[];
    };

export class RecordsIntegrityError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RecordsIntegrityError';
    this.code = code;
  }
}

function sha256(bytes: string | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function readIntegrityKey(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const value = env[INTEGRITY_KEY_ENV];
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return Buffer.from(value, 'utf8');
}

function readKeyId(env: NodeJS.ProcessEnv = process.env): string {
  const value = env[INTEGRITY_KEY_ID_ENV];
  return typeof value === 'string' && value.trim() !== '' ? value : `env:${INTEGRITY_KEY_ENV}`;
}

export function assertIntegrityKeyAvailable(env: NodeJS.ProcessEnv = process.env): void {
  if (!readIntegrityKey(env)) {
    throw new RecordsIntegrityError(
      'integrity-key-missing',
      `${INTEGRITY_KEY_ENV} is required when records integrity is expected`,
    );
  }
}

function eventLines(eventsJsonl: string): string[] {
  const lines = eventsJsonl.split('\n');
  if (lines.at(-1) === '') {
    return lines.slice(0, -1);
  }
  return lines;
}

function computeEventLogChain(lines: string[]): { lineCount: number; chainHead: string } {
  let previous = Buffer.alloc(0);
  for (const line of lines) {
    previous = createHash('sha256')
      .update(Buffer.concat([previous, Buffer.from(line, 'utf8')]))
      .digest();
  }
  return {
    lineCount: lines.length,
    chainHead: previous.toString('hex'),
  };
}

function artifactDigest(path: string): IntegrityArtifact {
  return {
    path,
    sha256: sha256(readFileSync(path)),
  };
}

function collectArtifacts(runDir: string, eventsJsonl: string): Record<string, IntegrityArtifact> {
  const lines = eventLines(eventsJsonl);
  const launchHeader = lines[0] ?? '';
  const artifacts: Record<string, IntegrityArtifact> = {
    'run.started': {
      path: 'events.jsonl:1',
      sha256: sha256(launchHeader),
    },
  };

  for (const filename of ['plan.snapshot.json', 'policy.snapshot.json', 'attestation.snapshot.json']) {
    const path = join(runDir, filename);
    if (existsSync(path)) {
      artifacts[filename] = artifactDigest(path);
    }
  }

  return artifacts;
}

function buildPayload(runDir: string, env: NodeJS.ProcessEnv = process.env): IntegrityPayload {
  const eventsJsonl = readFileSync(join(runDir, 'events.jsonl'), 'utf8');
  const lines = eventLines(eventsJsonl);
  const chain = computeEventLogChain(lines);

  return {
    version: 1,
    algorithms: {
      artifactDigest: 'sha256',
      eventLogChain: 'sha256(prev || line)',
      hmac: 'hmac-sha256',
    },
    keyId: readKeyId(env),
    artifacts: collectArtifacts(runDir, eventsJsonl),
    eventLog: {
      path: 'events.jsonl',
      lineCount: chain.lineCount,
      chainHead: chain.chainHead,
    },
  };
}

function signPayload(payload: IntegrityPayload, env: NodeJS.ProcessEnv = process.env): string {
  const key = readIntegrityKey(env);
  if (!key) {
    throw new RecordsIntegrityError(
      'integrity-key-missing',
      `${INTEGRITY_KEY_ENV} is required when records integrity is expected`,
    );
  }
  return createHmac('sha256', key).update(stableStringify(payload)).digest('hex');
}

export function writeIntegritySidecar(runDir: string, env: NodeJS.ProcessEnv = process.env): IntegritySidecar {
  const payload = buildPayload(runDir, env);
  const sidecar: IntegritySidecar = {
    ...payload,
    hmac: signPayload(payload, env),
  };
  const tempPath = join(runDir, `${INTEGRITY_FILE}.${process.pid}.${randomUUID()}.tmp`);
  const finalPath = join(runDir, INTEGRITY_FILE);
  writeFileSync(tempPath, `${JSON.stringify(sidecar, null, 2)}\n`);
  renameSync(tempPath, finalPath);
  return sidecar;
}

function readSidecar(runDir: string): IntegritySidecar | IntegrityVerification {
  const path = join(runDir, INTEGRITY_FILE);
  if (!existsSync(path)) {
    return {
      status: 'broken',
      code: 'integrity-sidecar-missing',
      message: `${INTEGRITY_FILE} is missing for a run that expects records integrity`,
      artifacts: [INTEGRITY_FILE],
    };
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8')) as IntegritySidecar;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'broken',
      code: 'integrity-sidecar-unreadable',
      message: `${INTEGRITY_FILE} is unreadable: ${message}`,
      artifacts: [INTEGRITY_FILE],
    };
  }
}

function safeCompareHex(left: unknown, right: unknown): boolean {
  if (typeof left !== 'string' || typeof right !== 'string') {
    return false;
  }
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) {
    return false;
  }
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function compareArtifacts(sidecar: IntegritySidecar, computed: IntegrityPayload): string[] {
  const broken = new Set<string>();
  const names = new Set([...Object.keys(sidecar.artifacts ?? {}), ...Object.keys(computed.artifacts)]);

  for (const name of names) {
    const expected = sidecar.artifacts[name];
    const actual = computed.artifacts[name];
    if (!expected || !actual || expected.sha256 !== actual.sha256 || expected.path !== actual.path) {
      broken.add(name);
    }
  }

  if (
    sidecar.eventLog?.lineCount !== computed.eventLog.lineCount ||
    sidecar.eventLog?.chainHead !== computed.eventLog.chainHead
  ) {
    broken.add('events.jsonl');
  }

  return [...broken].sort();
}

export function verifyIntegritySidecar(
  runDir: string,
  options: { expected?: boolean; env?: NodeJS.ProcessEnv } = {},
): IntegrityVerification {
  const sidecarPath = join(runDir, INTEGRITY_FILE);
  if (!options.expected && !existsSync(sidecarPath)) {
    return { status: 'not-applicable' };
  }

  const sidecar = readSidecar(runDir);
  if ('status' in sidecar) {
    return sidecar;
  }

  const env = options.env ?? process.env;
  const key = readIntegrityKey(env);
  if (!key) {
    return {
      status: 'broken',
      code: 'integrity-key-missing',
      message: `${INTEGRITY_KEY_ENV} is required to verify ${INTEGRITY_FILE}`,
      artifacts: [INTEGRITY_KEY_ENV],
    };
  }

  const computed = buildPayload(runDir, env);
  const artifacts = compareArtifacts(sidecar, computed);
  if (artifacts.length > 0) {
    return {
      status: 'broken',
      code: 'integrity-artifact-mismatch',
      message: `records integrity mismatch: ${artifacts.join(', ')}`,
      artifacts,
    };
  }

  const expectedHmac = createHmac('sha256', key).update(stableStringify(computed)).digest('hex');
  if (!safeCompareHex(sidecar.hmac, expectedHmac)) {
    return {
      status: 'broken',
      code: 'integrity-hmac-mismatch',
      message: `${INTEGRITY_FILE} HMAC does not verify`,
      artifacts: [INTEGRITY_FILE],
    };
  }

  return { status: 'verified', sidecar };
}

export function launchBindingExpectsIntegrity(binding: { drivers?: unknown } | undefined): boolean {
  return typeof binding === 'object' && binding !== null && binding.drivers !== undefined;
}
