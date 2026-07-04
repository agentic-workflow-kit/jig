#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const outDir = process.argv[2] ?? 'docs/design/evidence/raw/n1a';
const sanitizeOnly = process.argv.includes('--sanitize-existing');
mkdirSync(outDir, { recursive: true });

const home = process.env.HOME ?? '';
const redactionMaps = new Map();

function labelFor(kind, value) {
  if (!redactionMaps.has(kind)) {
    redactionMaps.set(kind, new Map());
  }
  const values = redactionMaps.get(kind);
  if (!values.has(value)) {
    values.set(value, `<${kind}-${values.size + 1}>`);
  }
  return values.get(value);
}

function redactString(key, value, context = '') {
  const lowerKey = key.toLowerCase();
  if (/^<[^>]+>$/.test(value)) {
    return value;
  }
  if (home && value.includes(home)) {
    value = value.split(home).join('<redacted-home>');
  }
  value = value.replaceAll(
    /(rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.jsonl)/g,
    '$1-<redacted-rollout-id>$2',
  );
  value = value.replaceAll(/\/(?:private\/)?var\/folders\/[^\s"',]+/g, '<redacted-tmp-path>');
  value = value.replaceAll(/\/tmp\/n1a-[^\s"',]+/g, '<redacted-tmp-path>');
  value = value.replaceAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<redacted-uuid>');
  value = value.replaceAll(/sk-[A-Za-z0-9_-]+/g, '<redacted-token>');
  value = value.replaceAll(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <redacted-token>');
  value = value.replaceAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<redacted-email>');
  if (
    lowerKey.includes('token') ||
    lowerKey.includes('secret') ||
    lowerKey.includes('auth') ||
    lowerKey.includes('cookie')
  ) {
    return '<redacted-secret>';
  }
  if (lowerKey === 'servername') {
    return '<redacted-local-hostname>';
  }
  if (lowerKey === 'id' && context === 'thread') {
    return labelFor('thread', value);
  }
  if (lowerKey === 'id' && context === 'turn') {
    return labelFor('turn', value);
  }
  if (lowerKey === 'id' && context === 'item') {
    return labelFor('item', value);
  }
  if (lowerKey.endsWith('threadid') || lowerKey === 'threadid') {
    return labelFor('thread', value);
  }
  if (lowerKey.endsWith('sessionid') || lowerKey === 'sessionid') {
    return labelFor('session', value);
  }
  if (lowerKey.endsWith('turnid') || lowerKey === 'turnid') {
    return labelFor('turn', value);
  }
  if (lowerKey.endsWith('itemid') || lowerKey === 'itemid') {
    return labelFor('item', value);
  }
  if (lowerKey.endsWith('approvalid') || lowerKey === 'approvalid') {
    return labelFor('approval', value);
  }
  if (lowerKey.endsWith('installationid') || lowerKey === 'installationid') {
    return labelFor('installation', value);
  }
  if (lowerKey.endsWith('environmentid') || lowerKey === 'environmentid') {
    return value === null ? null : labelFor('environment', value);
  }
  if (lowerKey.endsWith('callid') || lowerKey.endsWith('conversationid')) {
    return labelFor('callback', value);
  }
  return value;
}

function contextForObject(value, key, parentContext) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return parentContext;
  }
  if (Object.hasOwn(value, 'sessionId') && Object.hasOwn(value, 'cliVersion')) {
    return 'thread';
  }
  if (Object.hasOwn(value, 'itemsView') && Object.hasOwn(value, 'status') && Object.hasOwn(value, 'durationMs')) {
    return 'turn';
  }
  if (Object.hasOwn(value, 'type') && Object.hasOwn(value, 'id') && key === 'item') {
    return 'item';
  }
  if (Object.hasOwn(value, 'type') && Object.hasOwn(value, 'id') && parentContext !== 'client-request') {
    return 'item';
  }
  if (Object.hasOwn(value, 'method') && Object.hasOwn(value, 'id')) {
    return 'client-request';
  }
  return parentContext;
}

function redact(value, key = '', context = '') {
  if (key.toLowerCase() === 'ratelimits') {
    return '<redacted-account-rate-limits>';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, key, context));
  }
  if (value && typeof value === 'object') {
    const nextContext = contextForObject(value, key, context);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k, nextContext)]));
  }
  if (typeof value === 'string') {
    return redactString(key, value, context);
  }
  return value;
}

function hashFileContent(content) {
  return createHash('sha256').update(content).digest('hex');
}

class AppServer {
  constructor(name, capturePath, { approvalDecision = 'accept' } = {}) {
    this.name = name;
    this.capturePath = capturePath;
    this.approvalDecision = approvalDecision;
    this.pending = new Map();
    this.events = [];
    this.lines = [];
    this.nextId = 1;
    this.child = spawn('codex', ['app-server', '--listen', 'stdio://'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.record('process', { pid: this.child.pid, probe: name });
    createInterface({ input: this.child.stdout }).on('line', (line) => this.handleStdout(line));
    createInterface({ input: this.child.stderr }).on('line', (line) => {
      this.record('stderr', { line });
    });
    this.exit = new Promise((resolve) => {
      this.child.on('exit', (code, signal) => {
        this.record('processExit', { code, signal });
        resolve({ code, signal });
      });
    });
  }

  record(direction, payload) {
    this.lines.push(JSON.stringify({ at: new Date().toISOString(), direction, payload: redact(payload) }));
  }

  handleStdout(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.record('stdoutNonJson', { line });
      return;
    }
    this.record('server', message);
    this.events.push(message);
    if (Object.hasOwn(message, 'id') && (Object.hasOwn(message, 'result') || Object.hasOwn(message, 'error'))) {
      const pending = this.pending.get(message.id);
      if (pending) {
        this.pending.delete(message.id);
        pending.resolve(message);
      }
      return;
    }
    if (Object.hasOwn(message, 'id') && message.method) {
      this.respondToServerRequest(message);
    }
  }

  respondToServerRequest(message) {
    const method = message.method;
    let result;
    if (method === 'item/commandExecution/requestApproval') {
      result = { decision: this.approvalDecision };
    } else if (method === 'item/fileChange/requestApproval') {
      result = { decision: this.approvalDecision };
    } else if (method === 'execCommandApproval') {
      result = { decision: this.approvalDecision === 'accept' ? 'approved' : 'denied' };
    } else if (method === 'applyPatchApproval') {
      result = { decision: this.approvalDecision };
    } else if (method === 'item/tool/requestUserInput') {
      result = { answer: { type: 'freeform', text: 'No additional input for this probe.' } };
    } else {
      result = { error: 'unsupported-by-n1a-probe' };
    }
    this.write({ id: message.id, result }, 'clientResponse');
  }

  write(message, direction = 'client') {
    this.record(direction, message);
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  request(method, params = undefined) {
    const id = this.nextId++;
    const message = params === undefined ? { id, method } : { id, method, params };
    this.write(message);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timeout waiting for ${method}`));
      }, 180_000);
      this.pending.set(id, {
        resolve: (response) => {
          clearTimeout(timeout);
          resolve(response);
        },
      });
    });
  }

  notify(method, params = undefined) {
    const message = params === undefined ? { method } : { method, params };
    this.write(message);
  }

  async initialize() {
    const response = await this.request('initialize', {
      clientInfo: { name: 'n1a-probe', version: '0.0.0' },
      capabilities: { experimentalApi: true },
    });
    this.notify('initialized');
    return response;
  }

  async close() {
    if (!this.child.killed) {
      this.child.stdin.end();
    }
    await Promise.race([
      this.exit,
      new Promise((resolve) =>
        setTimeout(() => {
          if (!this.child.killed) {
            this.child.kill('SIGTERM');
          }
          resolve({ code: null, signal: 'timeout-terminated' });
        }, 5_000),
      ),
    ]);
    const content = `${this.lines.join('\n')}\n`;
    writeFileSync(this.capturePath, content);
    return {
      path: this.capturePath,
      sha256: hashFileContent(content),
      events: this.events.map((event) => redact(event)),
    };
  }
}

function textInput(text) {
  return [{ type: 'text', text, text_elements: [] }];
}

function makeWorkspace(name) {
  return mkdtempSync(join(tmpdir(), `n1a-${name}-`));
}

function psSnapshot(pid) {
  try {
    return execFileSync('ps', ['-o', 'pid,ppid,pgid,sess,stat,command', '-p', String(pid)], {
      encoding: 'utf8',
    });
  } catch (error) {
    return `ps failed: ${error.message}`;
  }
}

async function startThread(server, workspace, overrides = {}) {
  return server.request('thread/start', {
    cwd: workspace,
    ephemeral: overrides.ephemeral ?? true,
    sandbox: overrides.sandbox ?? 'workspace-write',
    approvalPolicy: overrides.approvalPolicy ?? 'never',
    approvalsReviewer: 'user',
    developerInstructions:
      'You are running a transport probe. Use only harmless local commands when asked. Do not access network services. Do not print secrets.',
    ...overrides,
  });
}

async function waitForTurnCompletion(server, turnId) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const completed = server.events.find(
      (event) => event.method === 'turn/completed' && event.params?.turn?.id === turnId,
    );
    if (completed) {
      return completed;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timeout waiting for turn ${turnId}`);
}

async function closeWithResult(server, action) {
  let actionError;
  try {
    await action();
  } catch (error) {
    actionError = error;
  }
  const result = await server.close();
  if (actionError) {
    throw actionError;
  }
  return result;
}

async function probeHandshake() {
  const server = new AppServer('handshake', join(outDir, 'p02-handshake.jsonl'));
  return closeWithResult(server, async () => {
    await server.initialize();
  });
}

async function probeBasic() {
  const workspace = makeWorkspace('p04-basic');
  const server = new AppServer('basic', join(outDir, 'p04-basic-turn.jsonl'));
  return closeWithResult(server, async () => {
    await server.initialize();
    const thread = await startThread(server, workspace);
    const threadId = thread.result.thread.id;
    const turn = await server.request('turn/start', {
      threadId,
      cwd: workspace,
      approvalPolicy: 'never',
      sandboxPolicy: {
        type: 'workspaceWrite',
        writableRoots: [workspace],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      },
      input: textInput('Run `pwd` and `ls -1`, then reply with the word N1A-BASIC-DONE.'),
    });
    await waitForTurnCompletion(server, turn.result.turn.id);
  });
}

async function probeApproval(decision, slug) {
  const workspace = makeWorkspace(`p06-p07-${slug}`);
  const server = new AppServer(slug, join(outDir, `${slug}.jsonl`), { approvalDecision: decision });
  return closeWithResult(server, async () => {
    await server.initialize();
    const thread = await startThread(server, workspace, {
      sandbox: 'read-only',
      approvalPolicy: 'on-request',
    });
    const threadId = thread.result.thread.id;
    const turn = await server.request('turn/start', {
      threadId,
      cwd: workspace,
      approvalPolicy: 'on-request',
      approvalsReviewer: 'user',
      sandboxPolicy: { type: 'readOnly', networkAccess: false },
      input: textInput(
        'Use the shell to run exactly: printf n1a-approval-probe > approval-result.txt. Then report whether the command ran.',
      ),
    });
    await waitForTurnCompletion(server, turn.result.turn.id);
  });
}

async function probeInterrupt() {
  const workspace = makeWorkspace('p08-interrupt');
  const server = new AppServer('interrupt', join(outDir, 'p08-interrupt.jsonl'));
  return closeWithResult(server, async () => {
    await server.initialize();
    const thread = await startThread(server, workspace);
    const threadId = thread.result.thread.id;
    const turn = await server.request('turn/start', {
      threadId,
      cwd: workspace,
      approvalPolicy: 'never',
      sandboxPolicy: {
        type: 'workspaceWrite',
        writableRoots: [workspace],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      },
      input: textInput('Run `sleep 30` and then reply N1A-INTERRUPT-SHOULD-NOT-COMPLETE.'),
    });
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await server.request('turn/interrupt', { threadId, turnId: turn.result.turn.id });
    await waitForTurnCompletion(server, turn.result.turn.id).catch((error) => {
      server.record('probeNote', { message: error.message });
    });
  });
}

async function probeBusy() {
  const workspace = makeWorkspace('p09-busy');
  const server = new AppServer('busy', join(outDir, 'p09-busy.jsonl'));
  return closeWithResult(server, async () => {
    await server.initialize();
    const thread = await startThread(server, workspace);
    const threadId = thread.result.thread.id;
    const first = await server.request('turn/start', {
      threadId,
      cwd: workspace,
      approvalPolicy: 'never',
      sandboxPolicy: {
        type: 'workspaceWrite',
        writableRoots: [workspace],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      },
      input: textInput('Run `sleep 10` and then reply N1A-BUSY-FIRST.'),
    });
    await server
      .request('turn/start', {
        threadId,
        cwd: workspace,
        approvalPolicy: 'never',
        sandboxPolicy: {
          type: 'workspaceWrite',
          writableRoots: [workspace],
          networkAccess: false,
          excludeTmpdirEnvVar: false,
          excludeSlashTmp: false,
        },
        input: textInput('Reply N1A-BUSY-SECOND.'),
      })
      .catch((error) => server.record('probeNote', { secondTurnError: error.message }));
    await waitForTurnCompletion(server, first.result.turn.id).catch((error) => {
      server.record('probeNote', { firstTurnWaitError: error.message });
    });
  });
}

async function probeCleanup() {
  const server = new AppServer('cleanup', join(outDir, 'p10-cleanup.jsonl'));
  const first = await closeWithResult(server, async () => {
    await server.initialize();
    server.record('psBeforeMalformed', psSnapshot(server.child.pid));
    await server.request('n1a/unsupported-method', {}).catch((error) => {
      server.record('probeNote', { unsupportedMethodError: error.message });
    });
    server.record('psAfterMalformed', psSnapshot(server.child.pid));
  });
  const restart = new AppServer('cleanup-restart', join(outDir, 'p10-cleanup-restart.jsonl'));
  const second = await closeWithResult(restart, async () => {
    await restart.initialize();
    restart.record('psRestart', psSnapshot(restart.child.pid));
  });
  return { first, second };
}

async function probeResume() {
  const workspace = makeWorkspace('p11-resume');
  const firstServer = new AppServer('resume-first', join(outDir, 'p11-resume-first.jsonl'));
  let threadId;
  try {
    await firstServer.initialize();
    const thread = await startThread(firstServer, workspace, { ephemeral: false });
    threadId = thread.result.thread.id;
    const turn = await firstServer.request('turn/start', {
      threadId,
      cwd: workspace,
      approvalPolicy: 'never',
      sandboxPolicy: {
        type: 'workspaceWrite',
        writableRoots: [workspace],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      },
      input: textInput('Remember this marker for the next turn: N1A-RESUME-MARKER-20260704. Reply only ACK.'),
    });
    await waitForTurnCompletion(firstServer, turn.result.turn.id);
  } finally {
    await firstServer.close();
  }

  const secondServer = new AppServer('resume-second', join(outDir, 'p11-resume-second.jsonl'));
  return closeWithResult(secondServer, async () => {
    await secondServer.initialize();
    await secondServer.request('thread/resume', {
      threadId,
      cwd: workspace,
      sandbox: 'workspace-write',
      approvalPolicy: 'never',
      approvalsReviewer: 'user',
    });
    const turn = await secondServer.request('turn/start', {
      threadId,
      cwd: workspace,
      approvalPolicy: 'never',
      sandboxPolicy: {
        type: 'workspaceWrite',
        writableRoots: [workspace],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      },
      input: textInput('What marker did I ask you to remember? Reply with the marker only.'),
    });
    await waitForTurnCompletion(secondServer, turn.result.turn.id);
  });
}

async function main() {
  if (sanitizeOnly) {
    for (const fileName of readdirSync(outDir)) {
      if (!fileName.endsWith('.jsonl') && !fileName.endsWith('.json')) {
        continue;
      }
      const path = join(outDir, fileName);
      const content = readFileSync(path, 'utf8');
      const sanitized = fileName.endsWith('.jsonl')
        ? `${content
            .trimEnd()
            .split('\n')
            .filter(Boolean)
            .map((line) => {
              try {
                return JSON.stringify(redact(JSON.parse(line)));
              } catch {
                return JSON.stringify(redact({ unparsedLine: line }));
              }
            })
            .join('\n')}\n`
        : `${JSON.stringify(redact(JSON.parse(content)), null, 2)}\n`;
      writeFileSync(path, sanitized);
    }
    return;
  }
  const results = {};
  results.handshake = await probeHandshake();
  results.basic = await probeBasic();
  results.approvalAccept = await probeApproval('accept', 'p06-approval-accept');
  results.approvalDecline = await probeApproval('decline', 'p07-approval-decline');
  results.interrupt = await probeInterrupt();
  results.busy = await probeBusy();
  results.cleanup = await probeCleanup();
  results.resume = await probeResume();
  const summary = `${JSON.stringify(results, null, 2)}\n`;
  const summaryPath = join(outDir, 'probe-summary.json');
  writeFileSync(summaryPath, summary);
  console.log(JSON.stringify({ summaryPath, sha256: hashFileContent(summary), results }, null, 2));
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
