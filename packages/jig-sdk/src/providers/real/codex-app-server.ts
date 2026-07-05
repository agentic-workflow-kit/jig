import { type ChildProcessWithoutNullStreams, execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import type { RedactionOptions } from '../../redaction.js';
import { redactValue } from '../../redaction.js';
import type { Story, WorkerResult } from '../../types.js';
import type { CodexAgentSession, CodexSessionResult } from './agent.js';

const execFileAsync = promisify(execFile);
const SUPPORTED_CODEX_VERSION = '0.142.5';
const MAX_PROMPT_CHARS = 100_000;
const REQUIRED_METHODS = ['initialize', 'thread/start', 'thread/resume', 'turn/start', 'turn/interrupt'] as const;
const REQUIRED_SERVER_REQUESTS = ['item/commandExecution/requestApproval'] as const;
const REQUIRED_SERVER_NOTIFICATIONS = [
  'thread/started',
  'thread/status/changed',
  'turn/started',
  'turn/completed',
  'item/started',
  'item/completed',
] as const;

type OwnerDecision = 'approve' | 'reject';

export interface CodexOwnerDecisionSource {
  decide(request: unknown, story: unknown): Promise<OwnerDecision>;
}

export interface CodexAppServerSessionOptions {
  ownerDecisionSource?: CodexOwnerDecisionSource | null;
  redaction?: RedactionOptions;
  environment?: CodexAppServerEnvironment;
}

interface CodexAppServerEnvironment {
  readonly platform: NodeJS.Platform;
  codexVersion(): Promise<string>;
  appServerSchema(): Promise<string>;
  startTransport(): CodexRpcTransport;
}

interface CodexRpcTransport {
  initialize(): Promise<void>;
  request(method: string, params?: unknown): Promise<unknown>;
  requestResponse(id: string | number, payload: JsonRpcResponseBody): Promise<void>;
  close(): Promise<void>;
  setServerRequestHandler(handler: (message: JsonRpcServerRequest) => Promise<void>): void;
  setNotificationHandler(handler: (message: JsonRpcNotification) => void): void;
}

interface JsonRpcNotification {
  method: string;
  params?: unknown;
}

interface JsonRpcServerRequest extends JsonRpcNotification {
  id: number | string;
}

interface JsonRpcResponse {
  id: number | string;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
}

type JsonRpcResponseBody = Omit<JsonRpcResponse, 'id'>;

interface ThreadHandle {
  id: string;
  cwd: string;
}

interface ActiveTurnState {
  storyId: string | undefined;
  threadResumed: boolean;
  turnId: string | null;
  interruptRequested: boolean;
  interruptDispatched: boolean;
}

type ApprovalDecision = 'accept' | 'decline';
type TurnTerminalStatus = 'completed' | 'interrupted' | 'failed';

interface ObservedApproval {
  kind: 'command-execution';
  requestId: string;
  command: string;
  decision: 'approved' | 'rejected';
  reason?: string;
}

interface ObservedCommand {
  command: string;
  status: string;
  exitCode: number | null;
}

interface TurnObservation {
  terminalStatus: TurnTerminalStatus;
  terminalError: string | null;
  finalMessage: string | null;
  approvals: ObservedApproval[];
  commands: ObservedCommand[];
}

class CodexAppServerPreDispatchError extends Error {
  readonly workerResult: WorkerResult;

  constructor(reason: string, message: string, storyId?: string) {
    super(message);
    this.name = 'CodexAppServerPreDispatchError';
    this.workerResult = {
      storyId,
      outcome: 'failure',
      evidence: {
        result: 'failed',
        observed: {
          driver: 'codex-app-server',
          reason,
        },
      },
      error: message,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function redactTransportValue(value: unknown, redaction: RedactionOptions | undefined, path: string): unknown {
  return redactValue(value, redaction ?? {}, path);
}

function storyWorkspaceCwd(story: Story): string {
  const workspace = isRecord(story.workspace) ? story.workspace : null;
  const path = workspace ? asString(workspace.path) : null;
  return path ?? process.cwd();
}

function buildTurnPrompt(story: Story): string {
  let serializedStory: string;
  try {
    serializedStory = JSON.stringify(story, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CodexAppServerPreDispatchError(
      'codex-prompt-unbounded',
      `codex pre-dispatch failed: story could not be serialized into a bounded prompt (${message})`,
      story.id,
    );
  }

  if (serializedStory.length > MAX_PROMPT_CHARS) {
    throw new CodexAppServerPreDispatchError(
      'codex-prompt-too-large',
      `codex pre-dispatch failed: serialized story prompt exceeds the conservative ${MAX_PROMPT_CHARS}-character guard`,
      story.id,
    );
  }

  return [
    'You are the Jig Codex worker for one bounded story.',
    'Work only on the story below.',
    'Use approvals when required; do not bypass them.',
    'Return a concise final message describing what happened.',
    '',
    'Story JSON:',
    serializedStory,
  ].join('\n');
}

function parseVersion(rawVersion: string): string {
  const match = /codex-cli\s+([0-9.]+)/.exec(rawVersion.trim());
  return match?.[1] ?? '';
}

function assertVersionPosture(rawVersion: string): string {
  const parsed = parseVersion(rawVersion);
  if (parsed !== SUPPORTED_CODEX_VERSION) {
    throw new CodexAppServerPreDispatchError(
      'codex-version-unsupported',
      `codex pre-dispatch failed: expected codex-cli ${SUPPORTED_CODEX_VERSION}, found "${rawVersion.trim()}"`,
    );
  }
  return parsed;
}

function assertSchemaIncludes(schema: string, methods: readonly string[], kind: string): void {
  for (const method of methods) {
    if (!schema.includes(`"${method}"`)) {
      throw new CodexAppServerPreDispatchError(
        'codex-app-server-surface-missing',
        `codex pre-dispatch failed: required ${kind} "${method}" was not present in the generated app-server schema`,
      );
    }
  }
}

function normalizeTurnStatus(status: unknown): TurnTerminalStatus {
  return status === 'interrupted' ? 'interrupted' : status === 'completed' ? 'completed' : 'failed';
}

function buildObservedEvidence(
  observation: TurnObservation,
  version: string,
  threadResumed: boolean,
): Record<string, unknown> {
  return {
    driver: 'codex-app-server',
    cliVersion: version,
    threadResumed,
    finalTurnStatus: observation.terminalStatus,
    approvals: observation.approvals,
    commands: observation.commands,
    finalMessage: observation.finalMessage,
    ...(observation.terminalError ? { terminalError: observation.terminalError } : {}),
  };
}

function syntheticWorkerFailure(
  story: Story,
  observation: TurnObservation,
  version: string,
  threadResumed: boolean,
  redaction: RedactionOptions | undefined,
): CodexSessionResult {
  const observedEvidence = redactTransportValue(
    buildObservedEvidence(observation, version, threadResumed),
    redaction,
    'codex.observed',
  ) as Record<string, unknown>;

  return {
    status: 'completed',
    workerResult: {
      storyId: story.id,
      outcome: observation.terminalStatus === 'interrupted' ? 'interrupted' : 'failure',
      evidence: {
        result: observation.terminalStatus === 'interrupted' ? 'interrupted' : 'failed',
      },
      error:
        observation.terminalError ??
        observation.approvals.find((approval) => approval.decision === 'rejected')?.reason ??
        observation.finalMessage ??
        `Codex turn ended ${observation.terminalStatus}`,
    },
    observedEvidence,
  };
}

function successfulWorkerResult(
  story: Story,
  observation: TurnObservation,
  version: string,
  threadResumed: boolean,
  redaction: RedactionOptions | undefined,
): CodexSessionResult {
  const observedEvidence = redactTransportValue(
    buildObservedEvidence(observation, version, threadResumed),
    redaction,
    'codex.observed',
  ) as Record<string, unknown>;

  return {
    status: 'completed',
    workerResult: {
      storyId: story.id,
      outcome: 'success',
      evidence: {
        result: 'passed',
      },
    },
    observedEvidence,
  };
}

class CodexRunObserver {
  private readonly story: Story;
  private readonly ownerDecisionSource: CodexOwnerDecisionSource | null;
  private readonly transport: CodexRpcTransport;
  private turnId: string | null;
  private finalMessage: string | null = null;
  private terminalStatus: TurnTerminalStatus | null = null;
  private terminalError: string | null = null;
  private readonly approvals: ObservedApproval[] = [];
  private readonly commands = new Map<string, ObservedCommand>();
  private readonly pendingNotifications: JsonRpcNotification[] = [];
  private completed!: Promise<TurnObservation>;
  private resolveCompleted!: (value: TurnObservation) => void;
  private rejectCompleted!: (error: unknown) => void;

  constructor(
    story: Story,
    ownerDecisionSource: CodexOwnerDecisionSource | null,
    transport: CodexRpcTransport,
    turnId: string | null,
  ) {
    this.story = story;
    this.ownerDecisionSource = ownerDecisionSource;
    this.transport = transport;
    this.turnId = turnId;
    this.completed = new Promise<TurnObservation>((resolve, reject) => {
      this.resolveCompleted = resolve;
      this.rejectCompleted = reject;
    });
  }

  setTurnId(turnId: string): void {
    this.turnId = turnId;
    for (const message of this.pendingNotifications.splice(0)) {
      this.notification(message);
    }
  }

  notification(message: JsonRpcNotification): void {
    if (!this.turnId) {
      this.pendingNotifications.push(message);
      return;
    }
    const params = isRecord(message.params) ? message.params : {};
    if (message.method === 'item/completed') {
      const item = isRecord(params.item) ? params.item : {};
      const itemType = asString(item.type);
      if (itemType === 'agentMessage') {
        this.finalMessage = asString(item.text);
      }

      if (itemType === 'commandExecution') {
        const itemId = asString(item.id);
        if (itemId) {
          this.commands.set(itemId, {
            command: asString(item.command) ?? 'unknown-command',
            status: asString(item.status) ?? 'unknown',
            exitCode: typeof item.exitCode === 'number' ? item.exitCode : null,
          });
        }
      }
      return;
    }

    if (message.method === 'turn/completed') {
      const turn = isRecord(params.turn) ? params.turn : {};
      const turnId = asString(turn.id);
      if (turnId !== this.turnId) {
        return;
      }

      this.terminalStatus = normalizeTurnStatus(turn.status);
      const turnError = isRecord(turn.error) ? asString(turn.error.message) : asString(turn.error);
      this.terminalError = turnError;
      this.resolveCompleted({
        terminalStatus: this.terminalStatus,
        terminalError: this.terminalError,
        finalMessage: this.finalMessage,
        approvals: [...this.approvals],
        commands: [...this.commands.values()],
      });
    }
  }

  async serverRequest(message: JsonRpcServerRequest): Promise<void> {
    if (message.method !== 'item/commandExecution/requestApproval') {
      await this.transport.requestResponse(message.id, {
        error: {
          code: -32601,
          message: `unsupported server request ${message.method}`,
        },
      });
      return;
    }

    const params = isRecord(message.params) ? message.params : {};
    const requestId = String(message.id);
    const command = asString(params.command) ?? 'unknown-command';
    const reason = asString(params.reason) ?? 'Codex requested approval for a command.';
    const approvalRequest = {
      id: `codex-approval:${requestId}`,
      kind: 'codex-command-approval',
      command,
      reason,
    };

    if (!this.ownerDecisionSource) {
      this.approvals.push({
        kind: 'command-execution',
        requestId,
        command,
        decision: 'rejected',
        reason: 'Owner decision source unavailable for Codex approval request',
      });
      await this.respondToApprovalRequest(message.id, 'decline');
      return;
    }

    const ownerDecision = await this.ownerDecisionSource.decide(approvalRequest, this.story);
    const decision: ApprovalDecision = ownerDecision === 'approve' ? 'accept' : 'decline';
    this.approvals.push({
      kind: 'command-execution',
      requestId,
      command,
      decision: ownerDecision === 'approve' ? 'approved' : 'rejected',
      reason,
    });
    await this.respondToApprovalRequest(message.id, decision);
  }

  async waitForCompletion(): Promise<TurnObservation> {
    return await this.completed;
  }

  fail(error: unknown): void {
    this.rejectCompleted(error);
  }

  private async respondToApprovalRequest(id: string | number, decision: ApprovalDecision): Promise<void> {
    await this.transport.requestResponse(id, {
      result: {
        decision,
      },
    });
  }
}

class StdioCodexRpcTransport implements CodexRpcTransport {
  private readonly child: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: unknown) => void }>();
  private serverRequestHandler: ((message: JsonRpcServerRequest) => Promise<void>) | null = null;
  private notificationHandler: ((message: JsonRpcNotification) => void) | null = null;
  private initialized = false;

  constructor() {
    this.child = spawn('codex', ['app-server', '--listen', 'stdio://'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    process.once('exit', () => {
      if (!this.child.killed) {
        this.child.kill('SIGTERM');
      }
    });
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      void this.handleLine(line);
    });
    createInterface({ input: this.child.stderr }).on('line', () => {
      // stderr is intentionally not promoted beyond the adapter boundary in P03.
    });
    this.child.once('exit', () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error('codex app-server exited unexpectedly'));
      }
      this.pending.clear();
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.request('initialize', {
      clientInfo: { name: 'jig-codex-app-server', version: '0.0.0' },
      capabilities: { experimentalApi: true },
    });
    this.notify('initialized');
    this.initialized = true;
  }

  setServerRequestHandler(handler: (message: JsonRpcServerRequest) => Promise<void>): void {
    this.serverRequestHandler = handler;
  }

  setNotificationHandler(handler: (message: JsonRpcNotification) => void): void {
    this.notificationHandler = handler;
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    const id = this.nextId++;
    const payload = params === undefined ? { id, method } : { id, method, params };
    return await new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  notify(method: string, params?: unknown): void {
    const payload = params === undefined ? { method } : { method, params };
    this.child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  async requestResponse(id: string | number, payload: JsonRpcResponseBody): Promise<void> {
    this.child.stdin.write(`${JSON.stringify({ id, ...payload })}\n`);
  }

  async close(): Promise<void> {
    if (!this.child.killed) {
      this.child.stdin.end();
    }
    await new Promise<void>((resolve) => {
      this.child.once('exit', () => resolve());
      setTimeout(() => {
        if (!this.child.killed) {
          this.child.kill('SIGTERM');
        }
      }, 100);
      setTimeout(resolve, 5_000);
    });
  }

  private async handleLine(line: string): Promise<void> {
    const message = JSON.parse(line) as Record<string, unknown>;
    if (
      'id' in message &&
      (Object.hasOwn(message, 'result') || Object.hasOwn(message, 'error')) &&
      !('method' in message)
    ) {
      const id = Number(message.id);
      const pending = this.pending.get(id);
      if (!pending) {
        return;
      }
      this.pending.delete(id);
      const error = isRecord(message.error) ? message.error : null;
      if (error) {
        pending.reject(new Error(asString(error.message) ?? 'codex app-server request failed'));
        return;
      }
      pending.resolve(message.result);
      return;
    }

    if ('id' in message && typeof message.method === 'string') {
      await this.serverRequestHandler?.(message as unknown as JsonRpcServerRequest);
      return;
    }

    if (typeof message.method === 'string') {
      this.notificationHandler?.(message as unknown as JsonRpcNotification);
    }
  }
}

class DefaultCodexAppServerEnvironment implements CodexAppServerEnvironment {
  get platform(): NodeJS.Platform {
    return process.platform;
  }

  async codexVersion(): Promise<string> {
    const result = await execFileAsync('codex', ['--version'], { encoding: 'utf8' });
    return result.stdout.trim();
  }

  async appServerSchema(): Promise<string> {
    const outDir = await mkdtemp(join(tmpdir(), 'jig-codex-schema-'));
    const schemaPath = join(outDir, 'codex_app_server_protocol.v2.schemas.json');
    try {
      await execFileAsync('codex', ['app-server', 'generate-json-schema', '--out', outDir], { encoding: 'utf8' });
      return await readFile(schemaPath, 'utf8');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  }

  startTransport(): CodexRpcTransport {
    return new StdioCodexRpcTransport();
  }
}

class ProductionCodexAgentSession implements CodexAgentSession {
  private readonly ownerDecisionSource: CodexOwnerDecisionSource | null;
  private readonly redaction: RedactionOptions | undefined;
  private readonly environment: CodexAppServerEnvironment;
  private transport: CodexRpcTransport | null = null;
  private preflightVersion: string | null = null;
  private thread: ThreadHandle | null = null;
  private activeTurn: ActiveTurnState | null = null;

  constructor(options: CodexAppServerSessionOptions) {
    this.ownerDecisionSource = options.ownerDecisionSource ?? null;
    this.redaction = options.redaction;
    this.environment = options.environment ?? new DefaultCodexAppServerEnvironment();
  }

  async run(story: Story): Promise<CodexSessionResult> {
    try {
      await this.ensurePreflight();
      const cwd = storyWorkspaceCwd(story);
      const prompt = buildTurnPrompt(story);
      if (this.activeTurn) {
        throw new CodexAppServerPreDispatchError(
          'codex-turn-overlap-unsupported',
          'codex pre-dispatch failed: overlapping Codex turns are unsupported until busy semantics are evidenced',
          story.id,
        );
      }

      this.activeTurn = {
        storyId: story.id,
        threadResumed: false,
        turnId: null,
        interruptRequested: false,
        interruptDispatched: false,
      };
      try {
        const transport = await this.ensureTransport();
        const { resumed } = await this.ensureThread(transport, cwd);
        if (!this.activeTurn) {
          throw new CodexAppServerPreDispatchError(
            'codex-turn-interrupted-before-dispatch',
            'codex pre-dispatch failed: active Codex turn state disappeared before dispatch completed',
            story.id,
          );
        }
        this.activeTurn.threadResumed = resumed;
        const observer = new CodexRunObserver(story, this.ownerDecisionSource, transport, null);
        transport.setServerRequestHandler(async (message) => {
          try {
            await observer.serverRequest(message);
          } catch (error) {
            observer.fail(error);
            throw error;
          }
        });
        transport.setNotificationHandler((message) => {
          observer.notification(message);
        });

        const turnResult = (await transport.request('turn/start', {
          threadId: this.thread?.id,
          cwd,
          approvalPolicy: 'on-request',
          approvalsReviewer: 'user',
          sandboxPolicy: {
            type: 'workspaceWrite',
            writableRoots: [cwd],
            networkAccess: false,
            excludeTmpdirEnvVar: false,
            excludeSlashTmp: false,
          },
          input: [{ type: 'text', text: prompt, text_elements: [] }],
        })) as { turn?: { id?: string } };
        const turnId = asString(turnResult?.turn?.id);
        if (!turnId) {
          throw new CodexAppServerPreDispatchError(
            'codex-turn-start-unrecognized',
            'codex pre-dispatch failed: turn/start did not return a recognizable turn id',
            story.id,
          );
        }

        this.activeTurn.turnId = turnId;
        observer.setTurnId(turnId);
        await this.dispatchPendingInterrupt();

        const observation = await observer.waitForCompletion();
        if (
          observation.terminalStatus !== 'completed' ||
          observation.approvals.some((approval) => approval.decision === 'rejected')
        ) {
          return syntheticWorkerFailure(
            story,
            observation,
            this.preflightVersion ?? SUPPORTED_CODEX_VERSION,
            this.activeTurn.threadResumed,
            this.redaction,
          );
        }

        return successfulWorkerResult(
          story,
          observation,
          this.preflightVersion ?? SUPPORTED_CODEX_VERSION,
          this.activeTurn.threadResumed,
          this.redaction,
        );
      } finally {
        this.activeTurn = null;
      }
    } catch (error) {
      if (error instanceof CodexAppServerPreDispatchError) {
        return {
          status: 'completed',
          workerResult: error.workerResult,
          observedEvidence: error.workerResult.evidence?.observed as Record<string, unknown> | undefined,
        };
      }

      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'completed',
        workerResult: {
          storyId: story.id,
          outcome: 'failure',
          evidence: {
            result: 'failed',
          },
          error: message,
        },
        observedEvidence: redactTransportValue(
          {
            driver: 'codex-app-server',
            reason: 'codex-transport-error',
            message,
          },
          this.redaction,
          'codex.observed',
        ) as Record<string, unknown>,
      };
    }
  }

  async interruptActiveTurn(): Promise<boolean> {
    if (!this.activeTurn) {
      return false;
    }

    this.activeTurn.interruptRequested = true;
    await this.dispatchPendingInterrupt();
    return true;
  }

  async close(): Promise<void> {
    const transport = this.transport;
    this.transport = null;
    this.thread = null;
    this.activeTurn = null;

    if (!transport) {
      return;
    }

    await transport.close();
  }

  private async ensurePreflight(): Promise<void> {
    if (this.environment.platform === 'win32') {
      throw new CodexAppServerPreDispatchError(
        'codex-platform-unsupported',
        'codex pre-dispatch failed: Windows is unsupported for the owned app-server transport until N1A-P14 lands',
      );
    }

    if (this.preflightVersion) {
      return;
    }

    const version = assertVersionPosture(await this.environment.codexVersion());
    const schema = await this.environment.appServerSchema();
    assertSchemaIncludes(schema, REQUIRED_METHODS, 'client method');
    assertSchemaIncludes(schema, REQUIRED_SERVER_REQUESTS, 'server request');
    assertSchemaIncludes(schema, REQUIRED_SERVER_NOTIFICATIONS, 'server notification');
    this.preflightVersion = version;
  }

  private async ensureTransport(): Promise<CodexRpcTransport> {
    if (!this.transport) {
      this.transport = this.environment.startTransport();
      await this.transport.initialize();
    }
    return this.transport;
  }

  private async ensureThread(transport: CodexRpcTransport, cwd: string): Promise<{ resumed: boolean }> {
    if (this.thread?.cwd === cwd) {
      return { resumed: false };
    }

    if (this.thread) {
      const resumedThread = (await transport.request('thread/resume', {
        threadId: this.thread.id,
        cwd,
        sandbox: 'workspace-write',
        approvalPolicy: 'on-request',
        approvalsReviewer: 'user',
      })) as { thread?: { id?: string } };
      const threadId = asString(resumedThread?.thread?.id);
      if (!threadId) {
        throw new CodexAppServerPreDispatchError(
          'codex-thread-resume-unrecognized',
          'codex pre-dispatch failed: thread/resume did not return a recognizable thread id',
        );
      }
      this.thread = { id: threadId, cwd };
      return { resumed: true };
    }

    const startedThread = (await transport.request('thread/start', {
      cwd,
      ephemeral: false,
      sandbox: 'workspace-write',
      approvalPolicy: 'on-request',
      approvalsReviewer: 'user',
      developerInstructions:
        'You are the Jig Codex transport. Work only on the provided story, stay local, and request approval when required.',
    })) as { thread?: { id?: string } };
    const threadId = asString(startedThread?.thread?.id);
    if (!threadId) {
      throw new CodexAppServerPreDispatchError(
        'codex-thread-start-unrecognized',
        'codex pre-dispatch failed: thread/start did not return a recognizable thread id',
      );
    }
    this.thread = { id: threadId, cwd };
    return { resumed: false };
  }

  private async dispatchPendingInterrupt(): Promise<void> {
    if (!this.transport || !this.thread || !this.activeTurn) {
      return;
    }

    if (!this.activeTurn.interruptRequested || this.activeTurn.interruptDispatched || !this.activeTurn.turnId) {
      return;
    }

    await this.transport.request('turn/interrupt', {
      threadId: this.thread.id,
      turnId: this.activeTurn.turnId,
    });
    this.activeTurn.interruptDispatched = true;
  }
}

export function createProductionCodexAgentSession(options: CodexAppServerSessionOptions = {}): CodexAgentSession {
  return new ProductionCodexAgentSession(options);
}

export const __internal = {
  CodexAppServerPreDispatchError,
  CodexRunObserver,
  DefaultCodexAppServerEnvironment,
  StdioCodexRpcTransport,
  assertSchemaIncludes,
  assertVersionPosture,
  buildObservedEvidence,
  buildTurnPrompt,
  normalizeTurnStatus,
  parseVersion,
  redactTransportValue,
  storyWorkspaceCwd,
  successfulWorkerResult,
  syntheticWorkerFailure,
};
