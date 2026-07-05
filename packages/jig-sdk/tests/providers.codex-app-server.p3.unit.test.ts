import assert from 'node:assert';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { test, vi } from 'vitest';
import type { AgentPort } from '../src/ports.js';
import type { CodexSessionResult } from '../src/providers/real/agent.js';
import { __internal, createProductionCodexAgentSession } from '../src/providers/real/codex-app-server.js';
import type { ConfigDoc, PlanInstance, Story } from '../src/types.js';

const schemaSurface = JSON.stringify({
  methods: ['initialize', 'thread/start', 'thread/resume', 'turn/start', 'turn/interrupt'],
  serverRequests: ['item/commandExecution/requestApproval'],
  notifications: [
    'thread/started',
    'thread/status/changed',
    'turn/started',
    'turn/completed',
    'item/started',
    'item/completed',
  ],
});

const planInstance: PlanInstance = {
  plan: {
    id: 'codex-app-server-plan',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Run the Codex app-server turn' }],
  },
};

const config: ConfigDoc = {
  runner: { mode: 'local-dry-run', recordDir: 'runs' },
  drivers: {
    agent: 'codex',
  },
};

interface FakeTransportScript {
  approvalDecision?: 'accept' | 'decline';
  terminalStatus?: 'completed' | 'interrupted';
  finalMessage?: string;
  missingThreadId?: boolean;
  missingResumeThreadId?: boolean;
  missingTurnId?: boolean;
  completionDelayMs?: number;
}

class FakeTransport {
  readonly requests: Array<{ method: string; params?: unknown }> = [];
  closeCalls = 0;
  private readonly script: FakeTransportScript;
  private serverRequestHandler: ((message: { id: number; method: string; params?: unknown }) => Promise<void>) | null =
    null;
  private notificationHandler: ((message: { method: string; params?: unknown }) => void) | null = null;
  private pendingApprovalDecision: ((decision: string) => void) | null = null;
  private interrupted = false;

  constructor(script: FakeTransportScript) {
    this.script = script;
  }

  async initialize(): Promise<void> {}

  setServerRequestHandler(handler: (message: { id: number; method: string; params?: unknown }) => Promise<void>): void {
    this.serverRequestHandler = handler;
  }

  setNotificationHandler(handler: (message: { method: string; params?: unknown }) => void): void {
    this.notificationHandler = handler;
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    this.requests.push({ method, params });
    if (method === 'thread/start') {
      return {
        thread: {
          id: this.script.missingThreadId ? undefined : 'thread-1',
        },
      };
    }
    if (method === 'thread/resume') {
      return {
        thread: {
          id: this.script.missingResumeThreadId ? undefined : 'thread-1',
        },
      };
    }
    if (method === 'turn/start') {
      queueMicrotask(() => {
        void this.runTurn();
      });
      return {
        turn: {
          id: this.script.missingTurnId ? undefined : 'turn-1',
        },
      };
    }
    if (method === 'turn/interrupt') {
      this.interrupted = true;
      return {
        interrupted: true,
      };
    }
    throw new Error(`unexpected method ${method}`);
  }

  async requestResponse(_id: string | number, payload: { result?: unknown }): Promise<void> {
    const result = payload.result as { decision?: string } | undefined;
    this.pendingApprovalDecision?.(result?.decision ?? 'unknown');
  }

  async close(): Promise<void> {
    this.closeCalls += 1;
  }

  private async runTurn(): Promise<void> {
    this.notificationHandler?.({
      method: 'thread/status/changed',
      params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } },
    });
    this.notificationHandler?.({
      method: 'turn/started',
      params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'inProgress' } },
    });

    if (this.script.approvalDecision) {
      const decision = await new Promise<string>((resolve) => {
        this.pendingApprovalDecision = resolve;
        void this.serverRequestHandler?.({
          id: 99,
          method: 'item/commandExecution/requestApproval',
          params: {
            command: '/bin/zsh -lc "touch demo.txt"',
            reason: 'Need approval to edit a file',
          },
        });
      });
      assert.strictEqual(decision, this.script.approvalDecision);
      this.notificationHandler?.({
        method: 'item/completed',
        params: {
          item: {
            type: 'commandExecution',
            id: 'command-1',
            command: '/bin/zsh -lc "touch demo.txt"',
            status: decision === 'accept' ? 'completed' : 'declined',
            exitCode: decision === 'accept' ? 0 : null,
          },
        },
      });
    } else {
      this.notificationHandler?.({
        method: 'item/completed',
        params: {
          item: {
            type: 'commandExecution',
            id: 'command-1',
            command: '/bin/zsh -lc "pwd"',
            status: 'completed',
            exitCode: 0,
          },
        },
      });
    }

    if (this.script.completionDelayMs) {
      await delay(this.script.completionDelayMs);
    }

    this.notificationHandler?.({
      method: 'item/completed',
      params: {
        item: {
          type: 'agentMessage',
          id: 'message-1',
          text: this.script.finalMessage ?? 'done',
        },
      },
    });
    this.notificationHandler?.({
      method: 'turn/completed',
      params: {
        threadId: 'thread-1',
        turn: {
          id: 'turn-1',
          status: this.interrupted ? 'interrupted' : (this.script.terminalStatus ?? 'completed'),
          error: null,
        },
      },
    });
  }
}

function fakeEnvironment(
  script: FakeTransportScript = {},
  overrides: Partial<{ version: string; platform: NodeJS.Platform }> = {},
) {
  const transport = new FakeTransport(script);
  return {
    transport,
    environment: {
      platform: overrides.platform ?? 'darwin',
      codexVersion: async () => overrides.version ?? 'codex-cli 0.142.5',
      appServerSchema: async () => schemaSurface,
      startTransport: () => transport,
    },
  };
}

function completedResult(result: CodexSessionResult) {
  assert.strictEqual(result.status, 'completed');
  return result;
}

test('P03-AC-1: unsupported platform fails closed before dispatch', async () => {
  const { environment } = fakeEnvironment({}, { platform: 'win32' });
  const session = createProductionCodexAgentSession({ environment });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /Windows is unsupported/);
});

test('P03-AC-2: incompatible Codex version fails closed before dispatch', async () => {
  const { environment } = fakeEnvironment({}, { version: 'codex-cli 0.150.0' });
  const session = createProductionCodexAgentSession({ environment });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /expected codex-cli 0.142.5/);
});

test('P03-AC-2: missing schema methods fail closed before dispatch', async () => {
  const { transport } = fakeEnvironment();
  const session = createProductionCodexAgentSession({
    environment: {
      platform: 'darwin',
      codexVersion: async () => 'codex-cli 0.142.5',
      appServerSchema: async () => JSON.stringify({ methods: ['initialize'] }),
      startTransport: () => transport,
    },
  });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /required client method "thread\/start"/);
});

test('P03-AC-2: helper branches cover version parsing and schema checks directly', () => {
  assert.strictEqual(__internal.parseVersion('codex-cli 0.142.5'), '0.142.5');
  assert.strictEqual(__internal.parseVersion('unexpected-version-output'), '');
  assert.strictEqual(__internal.assertVersionPosture('codex-cli 0.142.5'), '0.142.5');
  assert.doesNotThrow(() => __internal.assertSchemaIncludes(schemaSurface, ['initialize'], 'client method'));
});

test('P03-AC-2: oversized prompt cases fail closed before dispatch', async () => {
  const { environment } = fakeEnvironment();
  const session = createProductionCodexAgentSession({ environment });

  const result = completedResult(
    await session.run({
      id: 'STORY-LARGE',
      title: 'large',
      payload: 'x'.repeat(120_000),
    } as Story),
  );

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /serialized story prompt exceeds/);
});

test('P03-AC-2: unbounded prompt serialization fails closed before dispatch', async () => {
  const { environment } = fakeEnvironment();
  const session = createProductionCodexAgentSession({ environment });
  const circular = { id: 'STORY-CIRCULAR', title: 'circular' } as Story & { self?: unknown };
  circular.self = circular;

  const result = completedResult(await session.run(circular));

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /could not be serialized into a bounded prompt/);
});

test('P03-AC-2: non-Error serialization failures still fail closed', async () => {
  const { environment } = fakeEnvironment();
  const session = createProductionCodexAgentSession({ environment });
  const weirdStory = {
    id: 'STORY-WEIRD',
    title: 'weird',
    toJSON: () => {
      throw 'string failure';
    },
  } as unknown as Story;

  const result = completedResult(await session.run(weirdStory));

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /string failure/);
});

test('P03-AC-3: approval relay uses the owner decision source and records approval evidence', async () => {
  const { environment } = fakeEnvironment({ approvalDecision: 'accept', finalMessage: 'completed' });
  const session = createProductionCodexAgentSession({
    environment,
    ownerDecisionSource: {
      decide: async () => 'approve',
    },
  });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));

  assert.strictEqual(result.workerResult.outcome, 'success');
  assert.deepStrictEqual((result.observedEvidence as Record<string, unknown>).approvals, [
    {
      kind: 'command-execution',
      requestId: '99',
      command: '/bin/zsh -lc "touch demo.txt"',
      decision: 'approved',
      reason: 'Need approval to edit a file',
    },
  ]);
});

test('P03-AC-3: denied command evidence maps to a failed worker result even when the turn completes', async () => {
  const { environment } = fakeEnvironment({ approvalDecision: 'decline', finalMessage: 'approval denied' });
  const session = createProductionCodexAgentSession({
    environment,
    ownerDecisionSource: {
      decide: async () => 'reject',
    },
  });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));
  const observed = result.observedEvidence as Record<string, unknown>;

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.strictEqual(observed.finalTurnStatus, 'completed');
  assert.deepStrictEqual(observed.approvals, [
    {
      kind: 'command-execution',
      requestId: '99',
      command: '/bin/zsh -lc "touch demo.txt"',
      decision: 'rejected',
      reason: 'Need approval to edit a file',
    },
  ]);
});

test('P03-AC-3: missing owner decision source rejects the approval request inside the adapter', async () => {
  const { environment } = fakeEnvironment({ approvalDecision: 'decline' });
  const session = createProductionCodexAgentSession({ environment });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /Owner decision source unavailable/);
});

test('P03-AC-4: interrupted turns map to interrupted worker results', async () => {
  const { environment } = fakeEnvironment({ terminalStatus: 'interrupted' });
  const session = createProductionCodexAgentSession({ environment });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));

  assert.strictEqual(result.workerResult.outcome, 'interrupted');
  assert.strictEqual(result.workerResult.evidence?.result, 'interrupted');
});

test('P03-AC-4: interrupt returns false when there is no active turn', async () => {
  const { environment } = fakeEnvironment();
  const session = createProductionCodexAgentSession({ environment });

  assert.strictEqual(await session.interruptActiveTurn?.(), false);
});

test('P03-AC-4: reachable interrupt sends turn/interrupt for the active turn and maps to interrupted results', async () => {
  const { environment, transport } = fakeEnvironment({ completionDelayMs: 20, finalMessage: 'interrupted' });
  const session = createProductionCodexAgentSession({ environment });

  const runPromise = session.run({
    id: 'STORY-INTERRUPT',
    title: 'Interrupt me',
    workspace: { path: '/tmp/story-interrupt' },
  } as Story);
  await delay(0);

  assert.strictEqual(await session.interruptActiveTurn?.(), true);
  const result = completedResult(await runPromise);

  assert.strictEqual(result.workerResult.outcome, 'interrupted');
  assert.strictEqual((result.observedEvidence as Record<string, unknown>).finalTurnStatus, 'interrupted');
  assert.deepStrictEqual(
    transport.requests.map((entry) => entry.method),
    ['thread/start', 'turn/start', 'turn/interrupt'],
  );
  assert.deepStrictEqual(transport.requests[2]?.params, {
    threadId: 'thread-1',
    turnId: 'turn-1',
  });
});

test('P03-AC-4: helper branches cover translated evidence shaping and redaction', () => {
  const observation = {
    terminalStatus: 'failed' as const,
    terminalError: 'boom',
    finalMessage: 'done',
    approvals: [{ kind: 'command-execution' as const, requestId: '1', command: 'pwd', decision: 'rejected' as const }],
    commands: [{ command: 'pwd', status: 'completed', exitCode: 0 }],
  };
  assert.deepStrictEqual(
    __internal.storyWorkspaceCwd({ id: 'S', title: 't', workspace: { path: '/tmp/story' } } as Story),
    '/tmp/story',
  );
  assert.strictEqual(typeof __internal.storyWorkspaceCwd({ id: 'S', title: 't' } as Story), 'string');
  assert.strictEqual(__internal.normalizeTurnStatus('unexpected'), 'failed');
  assert.deepStrictEqual(__internal.buildObservedEvidence(observation, '0.142.5', true), {
    driver: 'codex-app-server',
    cliVersion: '0.142.5',
    threadResumed: true,
    finalTurnStatus: 'failed',
    approvals: observation.approvals,
    commands: observation.commands,
    finalMessage: 'done',
    terminalError: 'boom',
  });
  const failure = completedResult(
    __internal.syntheticWorkerFailure({ id: 'S', title: 't' } as Story, observation, '0.142.5', false, undefined),
  );
  assert.strictEqual(failure.workerResult.error, 'boom');
  const fallbackFailure = completedResult(
    __internal.syntheticWorkerFailure(
      { id: 'S', title: 't' } as Story,
      {
        terminalStatus: 'failed',
        terminalError: null,
        finalMessage: null,
        approvals: [],
        commands: [],
      },
      '0.142.5',
      false,
      undefined,
    ),
  );
  assert.strictEqual(fallbackFailure.workerResult.error, 'Codex turn ended failed');
  const success = completedResult(
    __internal.successfulWorkerResult(
      { id: 'S', title: 't' } as Story,
      {
        terminalStatus: 'completed',
        terminalError: null,
        finalMessage: null,
        approvals: [],
        commands: [],
      },
      '0.142.5',
      false,
      {
        enabled: true,
        secrets: {
          TOKEN: 'secret-token',
        },
      },
    ),
  );
  assert.strictEqual(success.workerResult.outcome, 'success');
  assert.deepStrictEqual(
    __internal.redactTransportValue({ apiToken: 'secret-token' }, { enabled: true }, 'codex.observed'),
    {
      apiToken: '[REDACTED]',
    },
  );
  assert.deepStrictEqual(
    __internal.buildObservedEvidence(
      {
        terminalStatus: 'completed',
        terminalError: null,
        finalMessage: null,
        approvals: [],
        commands: [],
      },
      '0.142.5',
      false,
    ),
    {
      driver: 'codex-app-server',
      cliVersion: '0.142.5',
      threadResumed: false,
      finalTurnStatus: 'completed',
      approvals: [],
      commands: [],
      finalMessage: null,
    },
  );
});

test('P03-AC-4: observer flushes buffered notifications and ignores mismatched turns', async () => {
  const responses: Array<{ id: string | number; payload: unknown }> = [];
  const observer = new __internal.CodexRunObserver(
    { id: 'S', title: 't' } as Story,
    null,
    {
      request: async () => undefined,
      initialize: async () => undefined,
      close: async () => undefined,
      requestResponse: async (id: string | number, payload: unknown) => {
        responses.push({ id, payload });
      },
      setNotificationHandler: () => undefined,
      setServerRequestHandler: () => undefined,
    },
    null,
  );

  observer.notification({
    method: 'item/completed',
    params: {
      item: { type: 'agentMessage', id: 'message-1', text: 'buffered' },
    },
  });
  observer.setTurnId('turn-1');
  observer.notification({
    method: 'item/completed',
    params: {
      item: { type: 'commandExecution', id: 'command-1', command: 'pwd', status: 'completed', exitCode: 0 },
    },
  });
  observer.notification({
    method: 'turn/completed',
    params: {
      turn: { id: 'turn-other', status: 'completed', error: null },
    },
  });
  observer.notification({
    method: 'turn/completed',
    params: {
      turn: { id: 'turn-1', status: 'completed', error: null },
    },
  });

  assert.deepStrictEqual(await observer.waitForCompletion(), {
    terminalStatus: 'completed',
    terminalError: null,
    finalMessage: 'buffered',
    approvals: [],
    commands: [{ command: 'pwd', status: 'completed', exitCode: 0 }],
  });
  await observer.serverRequest({ id: 1, method: 'item/unknown/requestApproval', params: {} });
  observer.notification({ method: 'item/completed' });
  observer.notification({
    method: 'turn/completed',
    params: { turn: { id: 'turn-1', error: { message: 'late-error' } } },
  });
  assert.deepStrictEqual(responses, [
    {
      id: 1,
      payload: {
        error: {
          code: -32601,
          message: 'unsupported server request item/unknown/requestApproval',
        },
      },
    },
  ]);
});

test('P03-AC-4: transport setup errors surface as codex transport failures', async () => {
  const session = createProductionCodexAgentSession({
    environment: {
      platform: 'darwin',
      codexVersion: async () => 'codex-cli 0.142.5',
      appServerSchema: async () => schemaSurface,
      startTransport: () => {
        throw new Error('spawn failed');
      },
    },
  });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /spawn failed/);
  assert.deepStrictEqual(result.observedEvidence, {
    driver: 'codex-app-server',
    reason: 'codex-transport-error',
    message: 'spawn failed',
  });
});

test('P03-AC-4: non-Error transport setup failures are surfaced through the adapter transport error path', async () => {
  const { environment } = fakeEnvironment({ approvalDecision: 'accept' });
  const session = createProductionCodexAgentSession({
    environment: {
      ...environment,
      startTransport: () => {
        throw 'transport string failure';
      },
    },
  });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /transport string failure/);
});

test('P03-AC-2: default environment reads version and schema and always cleans temporary schema output', async () => {
  vi.resetModules();
  const rmCalls: string[] = [];
  const mkdirCalls: string[] = [];
  const writeFileCalls: string[] = [];
  const execFileMock = vi.fn();
  Object.defineProperty(execFileMock, promisify.custom, {
    configurable: true,
    value: async (_file: string, args: string[]) => {
      if (args[0] === '--version') {
        return { stdout: 'codex-cli 0.142.5\n', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    },
  });
  vi.doMock('node:child_process', () => ({
    execFile: execFileMock,
    spawn: vi.fn(),
  }));
  vi.doMock('node:fs/promises', () => ({
    mkdir: vi.fn(async (path: string) => {
      mkdirCalls.push(path);
    }),
    readFile: vi.fn(async () => schemaSurface),
    rm: vi.fn(async (path: string) => {
      rmCalls.push(path);
    }),
    stat: vi.fn(),
    writeFile: vi.fn(async (path: string) => {
      writeFileCalls.push(path);
    }),
  }));
  const module = await import('../src/providers/real/codex-app-server.js');
  const environment = new module.__internal.DefaultCodexAppServerEnvironment();

  assert.strictEqual(await environment.codexVersion(), 'codex-cli 0.142.5');
  assert.strictEqual(await environment.appServerSchema(), schemaSurface);
  assert.deepStrictEqual(mkdirCalls, [module.__internal.APP_SERVER_SCHEMA_LOCK_DIR]);
  assert.deepStrictEqual(rmCalls, [
    module.__internal.APP_SERVER_SCHEMA_OUT_DIR,
    module.__internal.APP_SERVER_SCHEMA_OUT_DIR,
    module.__internal.APP_SERVER_SCHEMA_LOCK_DIR,
  ]);
  assert.deepStrictEqual(writeFileCalls, [`${module.__internal.APP_SERVER_SCHEMA_LOCK_DIR}/owner.json`]);
});

test('P03-AC-2: default environment still removes the temp schema directory when schema generation fails', async () => {
  vi.resetModules();
  const rmCalls: string[] = [];
  const execFileMock = vi.fn();
  Object.defineProperty(execFileMock, promisify.custom, {
    configurable: true,
    value: async (_file: string, args: string[]) => {
      if (args[0] === '--version') {
        return { stdout: 'codex-cli 0.142.5\n', stderr: '' };
      }
      throw new Error('schema generation failed');
    },
  });
  vi.doMock('node:child_process', () => ({
    execFile: execFileMock,
    spawn: vi.fn(),
  }));
  vi.doMock('node:fs/promises', () => ({
    mkdir: vi.fn(async () => undefined),
    readFile: vi.fn(),
    rm: vi.fn(async (path: string) => {
      rmCalls.push(path);
    }),
    stat: vi.fn(),
    writeFile: vi.fn(async () => undefined),
  }));
  const module = await import('../src/providers/real/codex-app-server.js');
  const environment = new module.__internal.DefaultCodexAppServerEnvironment();

  await assert.rejects(() => environment.appServerSchema(), /schema generation failed/);
  assert.deepStrictEqual(rmCalls, [
    module.__internal.APP_SERVER_SCHEMA_OUT_DIR,
    module.__internal.APP_SERVER_SCHEMA_OUT_DIR,
    module.__internal.APP_SERVER_SCHEMA_LOCK_DIR,
  ]);
});

test('P03-AC-2: schema generation is serialized around the shared deterministic output directory', async () => {
  vi.resetModules();
  let schemaCalls = 0;
  let inFlight = 0;
  let maxInFlight = 0;
  let releaseFirst!: () => void;
  const firstSchemaGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const execFileMock = vi.fn();
  Object.defineProperty(execFileMock, promisify.custom, {
    configurable: true,
    value: async (_file: string, args: string[]) => {
      if (args[0] === '--version') {
        return { stdout: 'codex-cli 0.142.5\n', stderr: '' };
      }
      schemaCalls += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      if (schemaCalls === 1) {
        await firstSchemaGate;
      }
      inFlight -= 1;
      return { stdout: '', stderr: '' };
    },
  });
  vi.doMock('node:child_process', () => ({
    execFile: execFileMock,
    spawn: vi.fn(),
  }));
  vi.doMock('node:fs/promises', () => ({
    mkdir: vi.fn(async () => undefined),
    readFile: vi.fn(async () => schemaSurface),
    rm: vi.fn(async () => undefined),
    stat: vi.fn(),
    writeFile: vi.fn(async () => undefined),
  }));
  const module = await import('../src/providers/real/codex-app-server.js');
  const environment = new module.__internal.DefaultCodexAppServerEnvironment();

  const first = environment.appServerSchema();
  const second = environment.appServerSchema();
  await delay(0);

  assert.strictEqual(schemaCalls, 1);
  assert.strictEqual(maxInFlight, 1);
  releaseFirst();
  const [firstSchema, secondSchema] = await Promise.all([first, second]);

  assert.strictEqual(firstSchema, schemaSurface);
  assert.strictEqual(secondSchema, schemaSurface);
  assert.strictEqual(schemaCalls, 2);
  assert.strictEqual(maxInFlight, 1);
});

test('P03-AC-2: filesystem schema lock waits for another process lock to clear before acquiring', async () => {
  vi.useFakeTimers();
  vi.resetModules();
  let mkdirAttempts = 0;
  let lockHeld = true;
  vi.doMock('node:child_process', () => ({
    execFile: vi.fn(),
    spawn: vi.fn(),
  }));
  vi.doMock('node:fs/promises', () => ({
    mkdir: vi.fn(async () => {
      mkdirAttempts += 1;
      if (lockHeld) {
        const error = new Error('exists') as Error & { code?: string };
        error.code = 'EEXIST';
        throw error;
      }
    }),
    readFile: vi.fn(),
    rm: vi.fn(async () => undefined),
    stat: vi.fn(async () => ({ mtimeMs: Date.now() })),
    writeFile: vi.fn(async () => undefined),
  }));
  const module = await import('../src/providers/real/codex-app-server.js');

  const acquirePromise = module.__internal.acquireSchemaDirectoryLock();
  await vi.advanceTimersByTimeAsync(module.__internal.APP_SERVER_SCHEMA_LOCK_RETRY_MS);
  assert.strictEqual(mkdirAttempts, 2);

  lockHeld = false;
  await vi.advanceTimersByTimeAsync(module.__internal.APP_SERVER_SCHEMA_LOCK_RETRY_MS);
  const release = await acquirePromise;
  await release();

  assert.ok(mkdirAttempts >= 3);
});

test('P03-AC-2: stale filesystem schema locks are removed before retrying acquisition', async () => {
  vi.resetModules();
  let mkdirAttempts = 0;
  let staleThreshold = 0;
  const rmCalls: string[] = [];
  vi.doMock('node:child_process', () => ({
    execFile: vi.fn(),
    spawn: vi.fn(),
  }));
  vi.doMock('node:fs/promises', () => ({
    mkdir: vi.fn(async () => {
      mkdirAttempts += 1;
      if (mkdirAttempts === 1) {
        const error = new Error('exists') as Error & { code?: string };
        error.code = 'EEXIST';
        throw error;
      }
    }),
    readFile: vi.fn(),
    rm: vi.fn(async (path: string) => {
      rmCalls.push(path);
    }),
    stat: vi.fn(async () => ({ mtimeMs: Date.now() - staleThreshold - 1 })),
    writeFile: vi.fn(async () => undefined),
  }));
  const module = await import('../src/providers/real/codex-app-server.js');
  staleThreshold = module.__internal.APP_SERVER_SCHEMA_LOCK_STALE_MS;

  const release = await module.__internal.acquireSchemaDirectoryLock();
  await release();

  assert.strictEqual(mkdirAttempts, 2);
  assert.deepStrictEqual(rmCalls, [
    module.__internal.APP_SERVER_SCHEMA_LOCK_DIR,
    module.__internal.APP_SERVER_SCHEMA_LOCK_DIR,
  ]);
});

test('P03-AC-2: missing filesystem schema locks are treated as non-stale during lock checks', async () => {
  vi.resetModules();
  vi.doMock('node:child_process', () => ({
    execFile: vi.fn(),
    spawn: vi.fn(),
  }));
  vi.doMock('node:fs/promises', () => ({
    mkdir: vi.fn(),
    readFile: vi.fn(),
    rm: vi.fn(),
    stat: vi.fn(async () => {
      const error = new Error('missing') as Error & { code?: string };
      error.code = 'ENOENT';
      throw error;
    }),
    writeFile: vi.fn(),
  }));
  const module = await import('../src/providers/real/codex-app-server.js');

  assert.strictEqual(await module.__internal.isStaleSchemaLock(module.__internal.APP_SERVER_SCHEMA_LOCK_DIR), false);
});

test('P03-AC-2: unexpected filesystem schema lock acquisition errors fail closed', async () => {
  vi.resetModules();
  vi.doMock('node:child_process', () => ({
    execFile: vi.fn(),
    spawn: vi.fn(),
  }));
  vi.doMock('node:fs/promises', () => ({
    mkdir: vi.fn(async () => {
      throw new Error('permission denied');
    }),
    readFile: vi.fn(),
    rm: vi.fn(),
    stat: vi.fn(),
    writeFile: vi.fn(),
  }));
  const module = await import('../src/providers/real/codex-app-server.js');

  await assert.rejects(() => module.__internal.acquireSchemaDirectoryLock(), /permission denied/);
});

test('P03-AC-2: owner metadata write failure removes the acquired lock directory before failing closed', async () => {
  vi.resetModules();
  const rmCalls: string[] = [];
  vi.doMock('node:child_process', () => ({
    execFile: vi.fn(),
    spawn: vi.fn(),
  }));
  vi.doMock('node:fs/promises', () => ({
    mkdir: vi.fn(async () => undefined),
    readFile: vi.fn(),
    rm: vi.fn(async (path: string) => {
      rmCalls.push(path);
    }),
    stat: vi.fn(),
    writeFile: vi.fn(async () => {
      throw new Error('write failed');
    }),
  }));
  const module = await import('../src/providers/real/codex-app-server.js');

  await assert.rejects(() => module.__internal.acquireSchemaDirectoryLock(), /write failed/);
  assert.deepStrictEqual(rmCalls, [module.__internal.APP_SERVER_SCHEMA_LOCK_DIR]);
});

test('P03-AC-2: schema generation lock recovers after a previous callback rejection', async () => {
  vi.resetModules();
  vi.doMock('node:child_process', () => ({
    execFile: vi.fn(),
    spawn: vi.fn(),
  }));
  vi.doMock('node:fs/promises', () => ({
    mkdir: vi.fn(async () => undefined),
    readFile: vi.fn(),
    rm: vi.fn(async () => undefined),
    stat: vi.fn(),
    writeFile: vi.fn(async () => undefined),
  }));
  const module = await import('../src/providers/real/codex-app-server.js');

  await assert.rejects(
    () =>
      module.__internal.withSchemaGenerationLock(async () => {
        throw new Error('first failure');
      }),
    /first failure/,
  );
  await assert.doesNotReject(async () => {
    await module.__internal.withSchemaGenerationLock(async () => undefined);
  });
});

test('P03-AC-4: overlapping turn starts fail closed while an active turn is in progress', async () => {
  const { environment } = fakeEnvironment({ completionDelayMs: 20 });
  const session = createProductionCodexAgentSession({ environment });

  const firstRun = session.run(planInstance.plan.stories[0]);
  await delay(0);
  const secondRun = completedResult(await session.run({ id: 'STORY-2', title: 'Overlap' } as Story));
  const firstResult = completedResult(await firstRun);

  assert.strictEqual(secondRun.workerResult.outcome, 'failure');
  assert.match(String(secondRun.workerResult.error), /overlapping Codex turns are unsupported/);
  assert.strictEqual(firstResult.workerResult.outcome, 'success');
});

test('P03-AC-4: overlap rejection happens before any thread mutation for a different workspace', async () => {
  const { environment, transport } = fakeEnvironment({ completionDelayMs: 20 });
  const session = createProductionCodexAgentSession({ environment });

  const firstRun = session.run({
    id: 'STORY-A',
    title: 'First story',
    workspace: { path: '/tmp/story-a' },
  } as Story);
  await delay(0);
  const secondRun = completedResult(
    await session.run({
      id: 'STORY-B',
      title: 'Second story',
      workspace: { path: '/tmp/story-b' },
    } as Story),
  );
  await firstRun;

  assert.strictEqual(secondRun.workerResult.outcome, 'failure');
  assert.match(String(secondRun.workerResult.error), /overlapping Codex turns are unsupported/);
  assert.deepStrictEqual(
    transport.requests.map((entry) => entry.method),
    ['thread/start', 'turn/start'],
  );
});

test('P03-AC-4: preflight and transport initialization are cached after the first successful run', async () => {
  const calls = {
    version: 0,
    schema: 0,
    transport: 0,
  };
  const { transport } = fakeEnvironment();
  const session = createProductionCodexAgentSession({
    environment: {
      platform: 'darwin',
      codexVersion: async () => {
        calls.version += 1;
        return 'codex-cli 0.142.5';
      },
      appServerSchema: async () => {
        calls.schema += 1;
        return schemaSurface;
      },
      startTransport: () => {
        calls.transport += 1;
        return transport;
      },
    },
  });

  await session.run({ id: 'STORY-A', title: 'First' } as Story);
  await session.run({ id: 'STORY-B', title: 'Second' } as Story);

  assert.deepStrictEqual(calls, {
    version: 1,
    schema: 1,
    transport: 1,
  });
});

test('P03-AC-4: thread resume stays adapter-internal across sequential runs', async () => {
  const { environment, transport } = fakeEnvironment();
  const session = createProductionCodexAgentSession({ environment });
  const storyA: Story = {
    id: 'STORY-A',
    title: 'First story',
    workspace: { path: '/tmp/story-a' },
  };
  const storyB: Story = {
    id: 'STORY-B',
    title: 'Second story',
    workspace: { path: '/tmp/story-b' },
  };

  await session.run(storyA);
  await session.run(storyB);
  await delay(0);

  assert.deepStrictEqual(
    transport.requests.map((entry) => entry.method),
    ['thread/start', 'turn/start', 'thread/resume', 'turn/start'],
  );
});

test('P03-AC-4: close shuts down the transport and clears cached transport state', async () => {
  const transports: FakeTransport[] = [];
  const session = createProductionCodexAgentSession({
    environment: {
      platform: 'darwin',
      codexVersion: async () => 'codex-cli 0.142.5',
      appServerSchema: async () => schemaSurface,
      startTransport: () => {
        const transport = new FakeTransport({});
        transports.push(transport);
        return transport;
      },
    },
  });

  await session.run({
    id: 'STORY-A',
    title: 'First story',
    workspace: { path: '/tmp/story-a' },
  } as Story);
  await session.close?.();
  await session.run({
    id: 'STORY-B',
    title: 'Second story',
    workspace: { path: '/tmp/story-b' },
  } as Story);

  assert.strictEqual(transports.length, 2);
  assert.strictEqual(transports[0]?.closeCalls, 1);
  assert.deepStrictEqual(
    transports.map((transport) => transport.requests.map((entry) => entry.method)),
    [
      ['thread/start', 'turn/start'],
      ['thread/start', 'turn/start'],
    ],
  );
});

test('P03-AC-4: close is a no-op before any transport has been created', async () => {
  const { environment } = fakeEnvironment();
  const session = createProductionCodexAgentSession({ environment });

  await session.close?.();

  assert.strictEqual(true, true);
});

test('P03-AC-4: missing thread id on start fails closed', async () => {
  const { environment } = fakeEnvironment({ missingThreadId: true });
  const session = createProductionCodexAgentSession({ environment });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /thread\/start did not return a recognizable thread id/);
});

test('P03-AC-4: missing turn id on start fails closed', async () => {
  const { environment } = fakeEnvironment({ missingTurnId: true });
  const session = createProductionCodexAgentSession({ environment });

  const result = completedResult(await session.run(planInstance.plan.stories[0]));

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /turn\/start did not return a recognizable turn id/);
});

test('P03-AC-4: missing thread id on resume fails closed', async () => {
  const { environment } = fakeEnvironment({ missingResumeThreadId: true });
  const session = createProductionCodexAgentSession({ environment });

  await session.run({
    id: 'STORY-A',
    title: 'First story',
    workspace: { path: '/tmp/story-a' },
  } as Story);
  const result = completedResult(
    await session.run({
      id: 'STORY-B',
      title: 'Second story',
      workspace: { path: '/tmp/story-b' },
    } as Story),
  );

  assert.strictEqual(result.workerResult.outcome, 'failure');
  assert.match(String(result.workerResult.error), /thread\/resume did not return a recognizable thread id/);
});

test('P03-AC-1: the composition root composes the production session for agent=codex without test-only injection', async () => {
  vi.resetModules();
  const createdAgents: AgentPort[] = [];
  vi.doMock('../src/providers/real/codex-app-server.js', () => ({
    createProductionCodexAgentSession: () => ({
      run: async (story: Story) => ({
        status: 'completed',
        workerResult: {
          storyId: story.id,
          outcome: 'success',
          evidence: { result: 'passed' },
        },
        observedEvidence: {
          driver: 'codex-app-server',
        },
      }),
    }),
  }));

  const bootstrap = await import('../src/bootstrap.js');
  const composed = await bootstrap.composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: {},
  });
  createdAgents.push(composed.agent);
  const result = await composed.agent.execute(planInstance.plan.stories[0]);

  assert.strictEqual(createdAgents.length, 1);
  assert.strictEqual(result.outcome, 'success');
  assert.strictEqual((result.evidence?.observed as Record<string, unknown>).driver, 'codex-app-server');
  vi.doUnmock('../src/providers/real/codex-app-server.js');
});
