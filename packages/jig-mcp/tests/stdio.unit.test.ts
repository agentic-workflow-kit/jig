import assert from 'node:assert';
import { test, vi } from 'vitest';

const transportCalls = vi.hoisted((): string[] => []);

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class FakeStdioServerTransport {
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: unknown) => void;

    async start(): Promise<void> {
      transportCalls.push('start');
    }

    async send(): Promise<void> {
      transportCalls.push('send');
    }

    async close(): Promise<void> {
      transportCalls.push('close');
      this.onclose?.();
    }
  },
}));

test('P12-AC-2: stdio entry connects an MCP server to the stdio transport', async () => {
  transportCalls.length = 0;
  const { startJigMcpServerStdio } = await import('../src/server.js');

  await startJigMcpServerStdio();

  assert.deepStrictEqual(transportCalls, ['start']);
});
