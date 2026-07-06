import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createConnection, createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { type Clock, decideFreshness } from '../../clock.js';
import type { CapabilityFreshness, HostFailureToken, IsolationStrength } from '../../ports.js';
import type { SubstrateRequest } from '../../substrate.js';

export type ContainmentMechanism = 'process-group' | 'kernel-tree' | 'job-object';
const LOOPBACK_EGRESS_REQUEST = 'loopback-tcp-connect';
const NEGATIVE_EGRESS_REQUEST = 'negative-egress-tcp-connect';
const PROBE_GRACE_PERIOD_MS = 250;
const PROBE_FRESHNESS_WINDOW_MS = 60_000;

// TEST-NET-3 (RFC 5737, 203.0.113.0/24) is reserved documentation address space: it is
// routable-shaped (not loopback or link-local) but never assigned, so the dial attempt is a
// genuine outbound egress exercise that can never reach or disturb a real service — the
// no-phone-home discipline holds even when the real dialer runs in the smoke lane.
const NEGATIVE_EGRESS_TARGET_HOST = '203.0.113.1';
const NEGATIVE_EGRESS_TARGET_PORT = 443;
const NEGATIVE_EGRESS_TIMEOUT_MS = 1_500;

/**
 * Observed outcome of the negative-egress dial attempt:
 *
 * - `blocked` — the local stack demonstrably denied the attempt by explicit local/policy
 *   refusal (EPERM/EACCES) before any route or peer response. Only this outcome may count
 *   toward a passed negative-egress probe.
 * - `open` — the attempt demonstrably left the host: either the connection established, or a
 *   peer/network response came back (ECONNREFUSED/ECONNRESET means a packet round-trip
 *   happened, which proves egress was not blocked).
 * - `ambiguous` — nothing conclusive was observed (timeout with no answer, or an unrecognized
 *   error). On an open-egress host dialing TEST-NET-3 this is the common honest outcome: no
 *   answer is indistinguishable from a silent block, so it must never count as `blocked`.
 */
export type NegativeEgressOutcome = 'blocked' | 'open' | 'ambiguous';

export interface NegativeEgressAttemptOptions {
  host: string;
  port: number;
  timeoutMs: number;
}

interface ChildProbePayload {
  observedAt: string;
  observedExecArgv: string[];
  parentPid: number;
  loopbackReachable: boolean;
  negativeEgressObservedOutcome: NegativeEgressOutcome;
}

type ProbeStream = Pick<NodeJS.ReadableStream, 'on'>;

export interface ProcessGroupProbeChildProcess {
  handle: NodeJS.EventEmitter;
  pid: number | null;
  stdout: ProbeStream;
  stderr: ProbeStream;
}

export interface ProcessGroupProbeServer {
  port: number;
  close(): Promise<void>;
}

export interface ProcessGroupConfinementRuntime {
  readonly currentPid: number;
  readonly execPath: string;
  delay(ms: number): Promise<void>;
  isProcessGroupEmpty(processGroupId: number): boolean;
  killProcessGroup(processGroupId: number, signal: 'SIGTERM' | 'SIGKILL'): void;
  spawnProbe(command: string[], env: NodeJS.ProcessEnv): ProcessGroupProbeChildProcess;
  startLoopbackServer(): Promise<ProcessGroupProbeServer>;
  waitForClose(child: ProcessGroupProbeChildProcess): Promise<number | null>;
}

const PROBE_CHILD_SOURCE = [
  "import { spawn } from 'node:child_process';",
  "import { createConnection } from 'node:net';",
  'const port = Number.parseInt(process.env.JIG_CONFINEMENT_PROBE_PORT ?? "", 10);',
  'if (!Number.isInteger(port) || port <= 0) {',
  "  throw new Error('confinement probe child requires JIG_CONFINEMENT_PROBE_PORT');",
  '}',
  "const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
  'grandchild.unref();',
  'const loopbackReachable = await new Promise((resolve) => {',
  "  const socket = createConnection({ host: '127.0.0.1', port });",
  '  let settled = false;',
  '  const finish = (reachable) => {',
  '    if (settled) return;',
  '    settled = true;',
  '    socket.destroy();',
  '    resolve(reachable);',
  '  };',
  "  socket.once('connect', () => finish(true));",
  "  socket.once('error', () => finish(false));",
  '  socket.setTimeout(500, () => finish(false));',
  '});',
  'const negativeEgressObservedOutcome = await new Promise((resolve) => {',
  `  const socket = createConnection({ host: ${JSON.stringify(NEGATIVE_EGRESS_TARGET_HOST)}, port: ${String(NEGATIVE_EGRESS_TARGET_PORT)} });`,
  '  let settled = false;',
  '  const finish = (outcome) => {',
  '    if (settled) return;',
  '    settled = true;',
  '    socket.destroy();',
  '    resolve(outcome);',
  '  };',
  "  socket.once('connect', () => finish('open'));",
  "  socket.once('error', (error) => {",
  "    const code = error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : undefined;",
  "    if (code === 'ECONNREFUSED' || code === 'ECONNRESET') {",
  "      finish('open');",
  '      return;',
  '    }',
  "    if (code === 'EPERM' || code === 'EACCES') {",
  "      finish('blocked');",
  '      return;',
  '    }',
  "    finish('ambiguous');",
  '  });',
  `  socket.setTimeout(${String(NEGATIVE_EGRESS_TIMEOUT_MS)}, () => finish('ambiguous'));`,
  '});',
  'const payload = {',
  '  observedAt: new Date().toISOString(),',
  '  observedExecArgv: process.execArgv,',
  '  parentPid: process.ppid,',
  '  loopbackReachable,',
  '  negativeEgressObservedOutcome,',
  '};',
  'await new Promise((resolve, reject) => {',
  "  process.stdout.write(JSON.stringify(payload) + '\\n', (error) => {",
  '    if (error) {',
  '      reject(error);',
  '      return;',
  '    }',
  '    resolve();',
  '  });',
  '});',
].join('\n');

export interface ConfinementProbeResult {
  reportedIsolationStrength?: IsolationStrength;
  observedAt?: string;
  freshnessWindowMs: number;
  terminationProvedEmpty: boolean;
  negativeEgressProbePassed: boolean;
  /**
   * The raw observed outcome of the negative-egress dial attempt, recorded alongside the
   * derived pass/fail boolean so downstream evidence (attestations, the EVRUN-full
   * no-phone-home leg) can cite what an exercised check actually observed instead of a
   * constant. Absent only for probe doubles that do not exercise the check at all.
   */
  negativeEgressObservedOutcome?: NegativeEgressOutcome;
  containmentMechanism?: ContainmentMechanism;
  commandBindingPassed: boolean;
  parentageProbePassed: boolean;
  provenIsolationStrength: IsolationStrength;
}

export interface ConfinementProof {
  freshness: CapabilityFreshness;
  positive: boolean;
  reportedIsolationStrength?: IsolationStrength;
  provenIsolationStrength?: IsolationStrength;
  provenBy?: 'exercised-confinement-proof';
  containmentMechanism?: ContainmentMechanism;
  negativeEgressObservedOutcome?: NegativeEgressOutcome;
  failureToken?: HostFailureToken;
}

export interface ConfinementProbe {
  readonly substrateRequests?: readonly SubstrateRequest[];
  run(): Promise<ConfinementProbeResult>;
}

function hasBaseProof(result: ConfinementProbeResult): boolean {
  return (
    result.terminationProvedEmpty &&
    result.containmentMechanism !== undefined &&
    result.commandBindingPassed &&
    result.parentageProbePassed
  );
}

function proofSupportsClaimedStrength(result: ConfinementProbeResult): boolean {
  if (!hasBaseProof(result)) {
    return false;
  }

  if (result.provenIsolationStrength === 'strong') {
    return result.negativeEgressProbePassed;
  }

  return result.provenIsolationStrength === 'weak' || result.provenIsolationStrength === 'none';
}

const BLOCKED_EGRESS_ERROR_CODES = new Set(['EPERM', 'EACCES']);
const OPEN_EGRESS_ERROR_CODES = new Set(['ECONNREFUSED', 'ECONNRESET']);

export function classifyNegativeEgressDialError(error: unknown): NegativeEgressOutcome {
  if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
    if (OPEN_EGRESS_ERROR_CODES.has(error.code)) {
      return 'open';
    }
    if (BLOCKED_EGRESS_ERROR_CODES.has(error.code)) {
      return 'blocked';
    }
  }

  return 'ambiguous';
}

/**
 * The real negative-egress dialer: attempts a TCP connect toward the configured target and
 * classifies what was actually observed. The confinement probe child uses the same semantics;
 * this helper exists so hermetic unit tests can exercise that classification with an injected
 * `createConnection` double and without real network I/O.
 */
export async function attemptNegativeEgressDial(
  options: NegativeEgressAttemptOptions,
  createConnectionImpl: typeof createConnection = createConnection,
): Promise<NegativeEgressOutcome> {
  return await new Promise((resolve) => {
    const socket = createConnectionImpl({ host: options.host, port: options.port });
    let settled = false;
    const finish = (outcome: NegativeEgressOutcome) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(outcome);
    };
    socket.once('connect', () => finish('open'));
    socket.once('error', (error) => finish(classifyNegativeEgressDialError(error)));
    socket.setTimeout(options.timeoutMs, () => finish('ambiguous'));
  });
}

export function defaultNegativeEgressAttemptOptions(): NegativeEgressAttemptOptions {
  return {
    host: NEGATIVE_EGRESS_TARGET_HOST,
    port: NEGATIVE_EGRESS_TARGET_PORT,
    timeoutMs: NEGATIVE_EGRESS_TIMEOUT_MS,
  };
}

function defaultConfinementRuntime(): ProcessGroupConfinementRuntime {
  return {
    currentPid: process.pid,
    execPath: process.execPath,
    delay,
    isProcessGroupEmpty: processGroupIsEmptyForTest,
    killProcessGroup: (processGroupId, signal) => {
      process.kill(-processGroupId, signal);
    },
    spawnProbe: (command, env) => {
      const child = spawn(command[0], command.slice(1), {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
      });
      return {
        handle: child,
        pid: child.pid ?? null,
        stdout: child.stdout,
        stderr: child.stderr,
      };
    },
    startLoopbackServer: startLoopbackServerForTest,
    waitForClose: async (child) => {
      const [exitCode] = (await once(child.handle, 'close')) as [number | null];
      return exitCode;
    },
  };
}

export function localProcessGroupProbeCommand(execPath = process.execPath): string[] {
  return [execPath, '--input-type=module', '--eval', PROBE_CHILD_SOURCE];
}

export function localProcessGroupProbeSubstrateRequests(execPath = process.execPath): readonly SubstrateRequest[] {
  return [
    { kind: 'argv', value: localProcessGroupProbeCommand(execPath) },
    { kind: 'egress', value: LOOPBACK_EGRESS_REQUEST },
    { kind: 'egress', value: NEGATIVE_EGRESS_REQUEST },
  ];
}

function localProcessGroupProbeEnv(port: number): NodeJS.ProcessEnv {
  return {
    JIG_CONFINEMENT_PROBE_PORT: String(port),
  };
}

function parseChildProbePayload(stdout: string): ChildProbePayload {
  const [line] = stdout.trim().split('\n');
  if (!line) {
    throw new Error('real-host confinement probe returned no payload');
  }

  return JSON.parse(line) as ChildProbePayload;
}

export function processGroupIsEmptyForTest(
  processGroupId: number,
  killProcess: (processGroupId: number, signal: 0) => void = (groupId, signal) => process.kill(groupId, signal),
): boolean {
  try {
    killProcess(-processGroupId, 0);
    return false;
  } catch (error) {
    return !(error instanceof Error && 'code' in error && error.code !== 'ESRCH');
  }
}

export async function startLoopbackServerForTest(
  createServerImpl: typeof createServer = createServer,
  onceImpl: typeof once = once,
): Promise<ProcessGroupProbeServer> {
  const server = createServerImpl((socket) => {
    socket.end();
  });
  server.listen(0, '127.0.0.1');
  await onceImpl(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('real-host confinement probe could not determine loopback port');
  }

  return {
    port: address.port,
    close: async () => {
      server.close();
      await onceImpl(server, 'close');
    },
  };
}

export function createMacosProcessGroupConfinementProbe(
  runtime: ProcessGroupConfinementRuntime = defaultConfinementRuntime(),
): ConfinementProbe {
  return {
    substrateRequests: localProcessGroupProbeSubstrateRequests(runtime.execPath),
    run: async () => {
      const loopback = await runtime.startLoopbackServer();
      const command = localProcessGroupProbeCommand(runtime.execPath);
      try {
        const child = runtime.spawnProbe(command, localProcessGroupProbeEnv(loopback.port));
        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];
        child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
        child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

        const exitCode = await runtime.waitForClose(child);
        const stdout = Buffer.concat(stdoutChunks).toString('utf8');
        const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
        if (exitCode !== 0) {
          throw new Error(stderr || `real-host confinement probe child exited with code ${String(exitCode)}`);
        }

        const payload = parseChildProbePayload(stdout);
        const processGroupId = child.pid ?? 0;
        if (processGroupId <= 0) {
          throw new Error('real-host confinement probe child did not expose a process-group id');
        }

        try {
          runtime.killProcessGroup(processGroupId, 'SIGTERM');
        } catch (error) {
          if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) {
            throw error;
          }
        }

        await runtime.delay(PROBE_GRACE_PERIOD_MS);
        if (!runtime.isProcessGroupEmpty(processGroupId)) {
          runtime.killProcessGroup(processGroupId, 'SIGKILL');
          await runtime.delay(PROBE_GRACE_PERIOD_MS);
        }

        const commandBindingPassed =
          JSON.stringify([runtime.execPath, ...payload.observedExecArgv]) === JSON.stringify(command);
        const parentageProbePassed = payload.parentPid === runtime.currentPid;
        const terminationProvedEmpty = runtime.isProcessGroupEmpty(processGroupId);

        const weakContainmentObserved =
          commandBindingPassed && parentageProbePassed && terminationProvedEmpty && payload.loopbackReachable;

        return {
          reportedIsolationStrength: weakContainmentObserved ? 'weak' : 'none',
          observedAt: payload.observedAt,
          freshnessWindowMs: PROBE_FRESHNESS_WINDOW_MS,
          terminationProvedEmpty,
          negativeEgressProbePassed: payload.negativeEgressObservedOutcome === 'blocked',
          negativeEgressObservedOutcome: payload.negativeEgressObservedOutcome,
          containmentMechanism: 'process-group',
          commandBindingPassed,
          parentageProbePassed,
          provenIsolationStrength: weakContainmentObserved ? 'weak' : 'none',
        };
      } finally {
        await loopback.close();
      }
    },
  };
}

export async function exerciseConfinementProbe(probe: ConfinementProbe, clock: Clock): Promise<ConfinementProof> {
  const result = await probe.run();
  const freshness = decideFreshness({
    observedAt: result.observedAt,
    windowMs: result.freshnessWindowMs,
    clock,
  });
  const positive = freshness === 'fresh' && proofSupportsClaimedStrength(result);

  return {
    freshness,
    positive,
    reportedIsolationStrength: result.reportedIsolationStrength,
    provenIsolationStrength: result.provenIsolationStrength,
    provenBy: positive ? 'exercised-confinement-proof' : undefined,
    containmentMechanism: result.containmentMechanism,
    negativeEgressObservedOutcome: result.negativeEgressObservedOutcome,
    failureToken: positive ? undefined : 'containment-unproven',
  };
}
