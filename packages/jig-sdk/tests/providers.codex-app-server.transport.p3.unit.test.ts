import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { test, vi } from 'vitest';

interface FakeChild extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  stdin: {
    writes: string[];
    ended: boolean;
    write: (chunk: string) => void;
    end: () => void;
  };
  killed: boolean;
  kill: (signal?: string) => boolean;
}

function createFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = {
    writes: [],
    ended: false,
    write: (chunk: string) => {
      child.stdin.writes.push(chunk);
    },
    end: () => {
      child.stdin.ended = true;
    },
  };
  child.killed = false;
  child.kill = () => {
    child.killed = true;
    child.emit('exit', 0, null);
    return true;
  };
  return child;
}

async function importTransportWithMocks(child: FakeChild) {
  vi.resetModules();
  vi.doMock('node:child_process', () => ({
    spawn: () => child,
    execFile: vi.fn(),
  }));
  vi.doMock('node:readline', () => ({
    createInterface: ({ input }: { input: EventEmitter }) => input,
  }));
  return await import('../src/providers/real/codex-app-server.js');
}

test('P03-AC-2: stdio transport initializes, routes notifications, and answers responses', async () => {
  const child = createFakeChild();
  const module = await importTransportWithMocks(child);
  const transport = new module.__internal.StdioCodexRpcTransport();
  const notifications: Array<{ method: string }> = [];
  const requests: Array<{ method: string }> = [];
  transport.setNotificationHandler((message: { method: string }) => {
    notifications.push(message);
  });
  transport.setServerRequestHandler(async (message: { method: string }) => {
    requests.push(message);
  });

  const initPromise = transport.initialize();
  child.stdout.emit('line', JSON.stringify({ id: 1, result: { ok: true } }));
  await initPromise;
  await transport.initialize();
  transport.notify('initialized');
  child.stdout.emit('line', JSON.stringify({ method: 'thread/status/changed', params: {} }));
  child.stdout.emit('line', JSON.stringify({ id: 99, method: 'item/commandExecution/requestApproval', params: {} }));
  await delay(0);

  assert.match(child.stdin.writes[0] ?? '', /"method":"initialize"/);
  assert.match(child.stdin.writes[1] ?? '', /"method":"initialized"/);
  assert.match(child.stdin.writes[2] ?? '', /"method":"initialized"/);
  assert.deepStrictEqual(
    notifications.map((entry) => entry.method),
    ['thread/status/changed'],
  );
  assert.deepStrictEqual(
    requests.map((entry) => entry.method),
    ['item/commandExecution/requestApproval'],
  );
});

test('P03-AC-2: stdio transport rejects request errors and pending work on exit', async () => {
  const child = createFakeChild();
  const module = await importTransportWithMocks(child);
  const transport = new module.__internal.StdioCodexRpcTransport();

  const failingRequest = transport.request('turn/start');
  child.stdout.emit('line', JSON.stringify({ id: 1, error: { message: 'bad request' } }));
  await assert.rejects(failingRequest, /bad request/);
  const fallbackErrorRequest = transport.request('turn/start');
  child.stdout.emit('line', JSON.stringify({ id: 2, error: {} }));
  await assert.rejects(fallbackErrorRequest, /codex app-server request failed/);
  child.stdout.emit('line', JSON.stringify({ id: 999, result: { ignored: true } }));
  child.stdout.emit('line', JSON.stringify({ unrelated: true }));

  const pendingRequest = transport.request('thread/start');
  child.emit('exit', 1, null);
  await assert.rejects(pendingRequest, /exited unexpectedly/);
});

test('P03-AC-2: stdio transport closes the child process cleanly', async () => {
  const child = createFakeChild();
  const module = await importTransportWithMocks(child);
  const transport = new module.__internal.StdioCodexRpcTransport();

  const closePromise = transport.close();
  child.emit('exit', 0, null);
  await closePromise;

  assert.strictEqual(child.stdin.ended, true);
});

test('P03-AC-2: close is a no-op for an already killed child', async () => {
  const child = createFakeChild();
  child.killed = true;
  const module = await importTransportWithMocks(child);
  const transport = new module.__internal.StdioCodexRpcTransport();

  const closePromise = transport.close();
  child.emit('exit', 0, null);
  await closePromise;

  assert.strictEqual(child.stdin.ended, false);
});
