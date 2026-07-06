import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  ConfigDoc,
  JigOperatorControlPort,
  PlanInstance,
  PolicyDoc,
  RunEvent,
  RunRecord,
} from '@agentic-workflow-kit/jig-sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, test } from 'vitest';
import { createJigMcpServer } from '../src/server.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-mcp-session',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'MCP story' }],
  },
};

const config: ConfigDoc = {
  runner: {
    mode: 'local-dry-run',
    recordDir: 'runs',
  },
};

const policy: PolicyDoc = {
  version: 'policy-v0',
  policy: {
    id: 'policy-mcp-session',
    rules: {
      allowLocalDryRun: true,
    },
  },
};

let originalCwd: string;
let workDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), 'jig-mcp-session-'));
  process.chdir(workDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
});

interface ConnectedMcp {
  client: Client;
  close(): Promise<void>;
}

async function connectMcp(operator?: JigOperatorControlPort): Promise<ConnectedMcp> {
  const server = createJigMcpServer({ ...(operator ? { operator } : {}) });
  const client = new Client({ name: 'jig-mcp-test-client', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function stubInspectResult(): Awaited<ReturnType<JigOperatorControlPort['inspect']>> {
  return {
    kind: 'legacy',
    runDir: 'stub-run',
    runRecord: { run: { id: 'stub', status: 'success' }, events: [] },
  } as unknown as Awaited<ReturnType<JigOperatorControlPort['inspect']>>;
}

function stubWatchResult(): Awaited<ReturnType<JigOperatorControlPort['watch']>> {
  return { lifecycleState: 'completed', signals: [], notices: [] } as unknown as Awaited<
    ReturnType<JigOperatorControlPort['watch']>
  >;
}

function stubAskWhyResult(storyId?: string): Awaited<ReturnType<JigOperatorControlPort['askWhy']>> {
  return {
    subject: storyId ? { type: 'story', storyId } : { type: 'run' },
    answer: 'stub explanation',
    citations: [],
  } as unknown as Awaited<ReturnType<JigOperatorControlPort['askWhy']>>;
}

function stubNoticeResult(
  runDir: string,
  noticeId: string,
  extra: Record<string, unknown> = {},
): Awaited<ReturnType<JigOperatorControlPort['acknowledgeNotice']>> {
  return {
    runDir,
    notice: {
      id: noticeId,
      urgency: 'info',
      message: 'notice handled',
      createdAt: '2026-07-06T00:00:00.000Z',
      ...extra,
    },
  } as unknown as Awaited<ReturnType<JigOperatorControlPort['acknowledgeNotice']>>;
}

function stubExportResult(runDir: string, outputDir?: string): Awaited<ReturnType<JigOperatorControlPort['export']>> {
  return {
    runDir,
    status: 'exported',
    artifactPath: join(outputDir ?? runDir, 'stub-export.json'),
    auditEventPath: join(outputDir ?? runDir, 'export-audit.jsonl'),
    artifactSha256: '0'.repeat(64),
  };
}

function stubOperator(overrides: Partial<JigOperatorControlPort> = {}): JigOperatorControlPort {
  return {
    preview: async () => ({ posture: 'run.previewed', planId: 'stub-plan', policyId: 'stub-policy', stories: [] }),
    start: async () => 'success',
    inspect: async () => stubInspectResult(),
    watch: async () => stubWatchResult(),
    askWhy: async () => stubAskWhyResult(),
    acknowledgeNotice: async ({ runDir, noticeId }) => stubNoticeResult(runDir, noticeId),
    snoozeNotice: async ({ runDir, noticeId, until }) => stubNoticeResult(runDir, noticeId, { snoozedUntil: until }),
    decide: async ({ runDir, outcome, storyId, reason }) => ({ runDir, outcome, storyId, reason }),
    stop: async ({ runDir, reason }) => ({ runDir, status: 'requested', reason }),
    export: async ({ runDir, outputDir }) => stubExportResult(runDir, outputDir),
    ...overrides,
  };
}

function scriptedOutput(): Record<string, unknown> {
  return {
    storyId: 'STORY-1',
    outcome: 'success',
    evidence: {
      result: 'passed',
    },
  };
}

function firstRunDir(root = workDir): string {
  const [runName] = readdirSync(join(root, 'runs'));
  assert.ok(runName, 'expected one run directory');
  return join(root, 'runs', runName);
}

function toolEnvelope(result: Awaited<ReturnType<Client['callTool']>>): {
  ok: boolean;
  action: string;
  result?: unknown;
  error?: string;
} {
  assert.ok(Array.isArray(result.content), 'expected content array');
  const [content] = result.content;
  assert.ok(content, 'expected text content');
  assert.strictEqual(content.type, 'text');
  assert.strictEqual(typeof content.text, 'string');
  return JSON.parse(content.text) as { ok: boolean; action: string; result?: unknown; error?: string };
}

async function callTool(client: Client, name: string, args: Record<string, unknown>) {
  return toolEnvelope(await client.callTool({ name, arguments: args }));
}

function readEventFamilies(runDir: string): string[] {
  return readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => (JSON.parse(line) as RunEvent).family);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function readEvents(runDir: string): RunEvent[] {
  return readFileSync(join(runDir, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RunEvent);
}

function normalizeRecordEvent(event: RunEvent): Record<string, unknown> {
  const normalized = { ...event } as Record<string, unknown>;
  delete normalized.runId;
  delete normalized.timestamp;

  const binding = normalized.binding as { workspace?: { kind?: string } } | undefined;
  if (binding?.workspace) {
    normalized.binding = { ...binding, workspace: { kind: binding.workspace.kind } };
  }
  if (normalized.planSnapshot) {
    normalized.planSnapshot = { present: true };
  }
  if (normalized.policySnapshot) {
    normalized.policySnapshot = { present: true };
  }
  return normalized;
}

function normalizeRunRecordShape(record: RunRecord): Record<string, unknown> {
  const workspace = record.run.binding.workspace as { kind?: string };
  return {
    run: {
      attempt: record.run.attempt,
      status: record.run.status,
      planId: record.run.planId,
      mode: record.run.mode,
      binding: {
        ...record.run.binding,
        workspace: { kind: workspace.kind },
      },
      posture: record.run.posture,
      planSnapshot: { present: true },
      policySnapshot: { present: true },
    },
    events: record.events.map(normalizeRecordEvent),
  };
}

function writeParkedRun(): string {
  const runDir = join(workDir, 'parked-run');
  mkdirSync(runDir, { recursive: true });
  const events: RunEvent[] = [
    {
      family: 'run.started',
      actor: 'runner',
      timestamp: '2026-07-06T00:00:00.000Z',
      runId: 'run-mcp-parked',
      planId: 'plan-mcp-session',
      mode: 'local-dry-run',
      binding: {
        policyRef: 'policy-mcp-session',
        configRef: 'mode=local-dry-run;recordDir=runs',
        workspace: {
          repoRoot: workDir,
          head: '0123456789abcdef0123456789abcdef01234567',
          changeSetHash: 'workspace-clean',
        },
      },
      posture: { record: 'safe-for-owner-record', export: 'redacted' },
      planSnapshot: { ref: 'plan.snapshot.json' },
      policySnapshot: { ref: 'policy.snapshot.json' },
    },
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-06T00:00:01.000Z',
      storyId: 'STORY-1',
    },
    {
      family: 'story.parked',
      actor: 'runner',
      timestamp: '2026-07-06T00:00:02.000Z',
      storyId: 'STORY-1',
      reason: 'owner-decision-required',
      requestId: 'request-1',
      requestKind: 'edit-files',
    },
    {
      family: 'run.stopped',
      actor: 'runner',
      timestamp: '2026-07-06T00:00:03.000Z',
      reason: 'unattended-park',
      checkpoint: 'after:STORY-1.parked',
      unstarted: [],
    },
  ];
  writeFileSync(join(runDir, 'events.jsonl'), `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
  return runDir;
}

test('P12-AC-3: exposes every settled operator verb and no recovery-only resume tool', async () => {
  const mcp = await connectMcp();
  try {
    const tools = await mcp.client.listTools();
    const names = tools.tools.map((tool) => tool.name).sort();
    assert.deepStrictEqual(names, [
      'jig_ask_why',
      'jig_decide',
      'jig_export',
      'jig_inspect',
      'jig_notice_ack',
      'jig_notice_snooze',
      'jig_preview',
      'jig_start',
      'jig_stop',
      'jig_watch',
    ]);
  } finally {
    await mcp.close();
  }
});

test('P12-AC-2: in-process MCP client previews, starts, and inspects a fixture flow', async () => {
  const mcp = await connectMcp();
  try {
    const preview = await callTool(mcp.client, 'jig_preview', { planInstance, config, policy });
    assert.strictEqual(preview.ok, true);
    assert.strictEqual(preview.action, 'preview');

    const consoleLines: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleLines.push(args.map(String).join(' '));
    };
    let start: Awaited<ReturnType<typeof callTool>>;
    try {
      start = await callTool(mcp.client, 'jig_start', {
        planInstance,
        config,
        policy,
        scriptedOutput: scriptedOutput(),
      });
    } finally {
      console.log = originalLog;
    }
    assert.strictEqual(start.ok, true);
    assert.strictEqual(start.result, 'success');
    assert.deepStrictEqual(consoleLines, []);

    const runDir = firstRunDir();
    assert.ok(existsSync(join(runDir, 'events.jsonl')));
    const inspect = await callTool(mcp.client, 'jig_inspect', { runDir });
    assert.strictEqual(inspect.ok, true);
    assert.strictEqual(inspect.action, 'inspect');
    assert.strictEqual((inspect.result as { kind?: string }).kind, 'projection');
  } finally {
    await mcp.close();
  }
});

test('P12-AC-4: routed human-category decisions stay on the owner decide path over MCP', async () => {
  const runDir = writeParkedRun();
  const mcp = await connectMcp();
  try {
    const result = await callTool(mcp.client, 'jig_decide', {
      runDir,
      outcome: 'approve',
      reason: 'owner-approved-from-mcp',
    });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.result, {
      runDir,
      outcome: 'approve',
      storyId: 'STORY-1',
      reason: 'owner-approved-from-mcp',
    });
    assert.ok(
      readEventFamilies(runDir).includes('owner-decision.recorded'),
      'MCP decide must append the SDK owner decision event',
    );
  } finally {
    await mcp.close();
  }
});

test('P12-AC-3: thin MCP tools call the matching operator methods without hidden fan-out', async () => {
  const calls: string[] = [];
  const operator = stubOperator({
    watch: async (input) => {
      calls.push(`watch:${input.runDir}`);
      return stubWatchResult();
    },
    askWhy: async (input) => {
      calls.push(`ask-why:${input.runDir}:${input.storyId ?? ''}`);
      return stubAskWhyResult(input.storyId ?? 'STORY-1');
    },
    acknowledgeNotice: async (input) => {
      calls.push(`notice-ack:${input.runDir}:${input.noticeId}`);
      return stubOperator().acknowledgeNotice(input);
    },
    snoozeNotice: async (input) => {
      calls.push(`notice-snooze:${input.runDir}:${input.noticeId}:${input.until}`);
      return stubOperator().snoozeNotice(input);
    },
    stop: async (input) => {
      calls.push(`stop:${input.runDir}:${input.reason ?? ''}`);
      return { runDir: input.runDir, status: 'requested', reason: input.reason };
    },
    export: async (input) => {
      calls.push(`export:${input.runDir}:${input.outputDir ?? ''}`);
      return stubOperator().export(input);
    },
    inspect: async () => {
      throw 'string-failure';
    },
  });
  const mcp = await connectMcp(operator);
  try {
    assert.strictEqual((await callTool(mcp.client, 'jig_watch', { runDir: 'run-a' })).ok, true);
    assert.strictEqual((await callTool(mcp.client, 'jig_ask_why', { runDir: 'run-a', storyId: 'STORY-1' })).ok, true);
    assert.strictEqual(
      (await callTool(mcp.client, 'jig_notice_ack', { runDir: 'run-a', noticeId: 'notice-1' })).ok,
      true,
    );
    assert.strictEqual(
      (
        await callTool(mcp.client, 'jig_notice_snooze', {
          runDir: 'run-a',
          noticeId: 'notice-1',
          until: '2026-07-06T01:00:00.000Z',
        })
      ).ok,
      true,
    );
    assert.strictEqual((await callTool(mcp.client, 'jig_stop', { runDir: 'run-a', reason: 'owner-stop' })).ok, true);
    assert.strictEqual((await callTool(mcp.client, 'jig_export', { runDir: 'run-a', outputDir: 'exports' })).ok, true);
    const failure = await callTool(mcp.client, 'jig_inspect', { runDir: 'run-a' });
    assert.deepStrictEqual(failure, { ok: false, action: 'inspect', error: 'string-failure' });
    assert.deepStrictEqual(calls, [
      'watch:run-a',
      'ask-why:run-a:STORY-1',
      'notice-ack:run-a:notice-1',
      'notice-snooze:run-a:notice-1:2026-07-06T01:00:00.000Z',
      'stop:run-a:owner-stop',
      'export:run-a:exports',
    ]);
  } finally {
    await mcp.close();
  }
});

test('P12-AC-3: defaulted and optional inputs remain adapter-owned presentation only', async () => {
  const calls: unknown[] = [];
  const operator = stubOperator({
    start: async (input) => {
      calls.push({ action: 'start', scriptedOutput: input.scriptedOutput });
      return 'success';
    },
    askWhy: async (input) => {
      calls.push({ action: 'ask-why', storyId: input.storyId ?? null });
      return stubAskWhyResult(input.storyId);
    },
    stop: async (input) => {
      calls.push({ action: 'stop', reason: input.reason ?? null });
      return { runDir: input.runDir, status: 'requested', reason: input.reason };
    },
    export: async (input) => {
      calls.push({ action: 'export', outputDir: input.outputDir ?? null });
      return stubExportResult(input.runDir, input.outputDir);
    },
  });
  const mcp = await connectMcp(operator);
  try {
    assert.strictEqual((await callTool(mcp.client, 'jig_start', { planInstance, config, policy })).ok, true);
    assert.strictEqual((await callTool(mcp.client, 'jig_ask_why', { runDir: 'run-defaults' })).ok, true);
    assert.strictEqual((await callTool(mcp.client, 'jig_stop', { runDir: 'run-defaults' })).ok, true);
    assert.strictEqual((await callTool(mcp.client, 'jig_export', { runDir: 'run-defaults' })).ok, true);
    assert.deepStrictEqual(calls, [
      { action: 'start', scriptedOutput: {} },
      { action: 'ask-why', storyId: null },
      { action: 'stop', reason: null },
      { action: 'export', outputDir: null },
    ]);
  } finally {
    await mcp.close();
  }
});

test('P12-AC-5: CLI and MCP start produce equivalent record shapes', async () => {
  const cliDir = mkdtempSync(join(tmpdir(), 'jig-mcp-cli-parity-'));
  try {
    const repoRoot = originalCwd;
    const fixturePlanPath = join(repoRoot, 'tests/fixtures/m5b-local-mvp/minimal-plan.json');
    const fixtureConfigPath = join(repoRoot, 'tests/fixtures/m5b-local-mvp/local-config.json');
    const fixturePolicyPath = join(repoRoot, 'tests/fixtures/m5b-local-mvp/local-policy.json');
    const fixtureOutputPath = join(repoRoot, 'tests/fixtures/m5b-local-mvp/scripted-worker-success.json');
    const fixturePlan = readJson<PlanInstance>(fixturePlanPath);
    const fixtureConfig = readJson<ConfigDoc>(fixtureConfigPath);
    const fixturePolicy = readJson<PolicyDoc>(fixturePolicyPath);
    const fixtureOutput = readJson<Record<string, unknown>>(fixtureOutputPath);

    execFileSync(
      'node',
      [
        join(repoRoot, 'packages/jig-cli/bin/jig.js'),
        'run',
        fixturePlanPath,
        '--config',
        fixtureConfigPath,
        '--policy',
        fixturePolicyPath,
        '--scripted-output',
        fixtureOutputPath,
      ],
      { cwd: cliDir, encoding: 'utf8' },
    );
    const cliRunDir = firstRunDir(cliDir);

    const mcp = await connectMcp();
    try {
      await callTool(mcp.client, 'jig_start', {
        planInstance: fixturePlan,
        config: fixtureConfig,
        policy: fixturePolicy,
        scriptedOutput: fixtureOutput,
      });
      const mcpRunDir = firstRunDir();
      const cliRunRecord = JSON.parse(readFileSync(join(cliRunDir, 'run.json'), 'utf8')) as RunRecord;
      const mcpRunRecord = JSON.parse(readFileSync(join(mcpRunDir, 'run.json'), 'utf8')) as RunRecord;

      assert.deepStrictEqual(normalizeRunRecordShape(mcpRunRecord), normalizeRunRecordShape(cliRunRecord));
      assert.deepStrictEqual(
        readEvents(mcpRunDir).map(normalizeRecordEvent),
        readEvents(cliRunDir).map(normalizeRecordEvent),
      );
    } finally {
      await mcp.close();
    }
  } finally {
    rmSync(cliDir, { recursive: true, force: true });
  }
});
