import {
  type ConfigDoc,
  type CreateJigSessionOptions,
  createJigSession,
  type JigOperatorControlPort,
  type PlanInstance,
  type PolicyDoc,
} from '@agentic-workflow-kit/jig-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const serverVersion = '0.0.0';
const jsonObjectSchema = z.record(z.string(), z.unknown());

export interface CreateJigMcpServerOptions {
  sessionOptions?: CreateJigSessionOptions;
  operator?: JigOperatorControlPort;
}

interface ToolSuccess {
  ok: true;
  action: string;
  result: unknown;
}

interface ToolFailure {
  ok: false;
  action: string;
  error: string;
}

type ToolEnvelope = ToolSuccess | ToolFailure;

function asPlanInstance(value: unknown): PlanInstance {
  return jsonObjectSchema.parse(value) as unknown as PlanInstance;
}

function asConfigDoc(value: unknown): ConfigDoc {
  return jsonObjectSchema.parse(value) as unknown as ConfigDoc;
}

function asPolicyDoc(value: unknown): PolicyDoc {
  return jsonObjectSchema.parse(value) as unknown as PolicyDoc;
}

function toolContent(envelope: ToolEnvelope, isError = false) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(envelope, null, 2),
      },
    ],
    isError,
  };
}

async function invokeTool(action: string, call: () => Promise<unknown>) {
  try {
    return toolContent({ ok: true, action, result: await call() });
  } catch (error) {
    return toolContent({ ok: false, action, error: error instanceof Error ? error.message : String(error) }, true);
  }
}

function registerOperatorTools(server: McpServer, operator: JigOperatorControlPort): void {
  server.registerTool(
    'jig_preview',
    {
      title: 'Jig preview',
      description: 'Preview a Jig plan against config and policy without allocating a run.',
      inputSchema: {
        planInstance: jsonObjectSchema,
        config: jsonObjectSchema,
        policy: jsonObjectSchema,
      },
    },
    async ({ planInstance, config, policy }) =>
      invokeTool('preview', () =>
        operator.preview({
          planInstance: asPlanInstance(planInstance),
          config: asConfigDoc(config),
          policy: asPolicyDoc(policy),
        }),
      ),
  );

  server.registerTool(
    'jig_start',
    {
      title: 'Jig start',
      description: 'Start a Jig run through the SDK operator-control port.',
      inputSchema: {
        planInstance: jsonObjectSchema,
        config: jsonObjectSchema,
        policy: jsonObjectSchema,
        scriptedOutput: jsonObjectSchema.default({}),
      },
    },
    async ({ planInstance, config, policy, scriptedOutput }) =>
      invokeTool('start', () =>
        operator.start({
          planInstance: asPlanInstance(planInstance),
          config: asConfigDoc(config),
          policy: asPolicyDoc(policy),
          scriptedOutput,
        }),
      ),
  );

  server.registerTool(
    'jig_inspect',
    {
      title: 'Jig inspect',
      description: 'Inspect a Jig run from its durable records.',
      inputSchema: {
        runDir: z.string(),
      },
    },
    async ({ runDir }) => invokeTool('inspect', () => operator.inspect({ runDir })),
  );

  server.registerTool(
    'jig_watch',
    {
      title: 'Jig watch',
      description: 'Project the current watch view for a Jig run from records.',
      inputSchema: {
        runDir: z.string(),
      },
    },
    async ({ runDir }) => invokeTool('watch', () => operator.watch({ runDir })),
  );

  server.registerTool(
    'jig_ask_why',
    {
      title: 'Jig ask why',
      description: 'Explain run or story state from Jig records.',
      inputSchema: {
        runDir: z.string(),
        storyId: z.string().optional(),
      },
    },
    async ({ runDir, storyId }) => invokeTool('ask-why', () => operator.askWhy({ runDir, storyId })),
  );

  server.registerTool(
    'jig_notice_ack',
    {
      title: 'Jig notice acknowledge',
      description: 'Acknowledge an open Jig notice through the operator-control port.',
      inputSchema: {
        runDir: z.string(),
        noticeId: z.string(),
      },
    },
    async ({ runDir, noticeId }) => invokeTool('notice-ack', () => operator.acknowledgeNotice({ runDir, noticeId })),
  );

  server.registerTool(
    'jig_notice_snooze',
    {
      title: 'Jig notice snooze',
      description: 'Snooze an open Jig notice through the operator-control port.',
      inputSchema: {
        runDir: z.string(),
        noticeId: z.string(),
        until: z.string(),
      },
    },
    async ({ runDir, noticeId, until }) =>
      invokeTool('notice-snooze', () => operator.snoozeNotice({ runDir, noticeId, until })),
  );

  server.registerTool(
    'jig_decide',
    {
      title: 'Jig decide',
      description: 'Record an owner decision for the currently routed parked story.',
      inputSchema: {
        runDir: z.string(),
        outcome: z.enum(['approve', 'reject', 'override', 'hand-off']),
        storyId: z.string().optional(),
        reason: z.string().optional(),
        handedOffTo: z.string().optional(),
      },
    },
    async ({ runDir, outcome, storyId, reason, handedOffTo }) =>
      invokeTool('decide', () => operator.decide({ runDir, outcome, storyId, reason, handedOffTo })),
  );

  server.registerTool(
    'jig_stop',
    {
      title: 'Jig stop',
      description: 'Request an operator stop for a run.',
      inputSchema: {
        runDir: z.string(),
        reason: z.string().optional(),
      },
    },
    async ({ runDir, reason }) => invokeTool('stop', () => operator.stop({ runDir, reason })),
  );

  server.registerTool(
    'jig_export',
    {
      title: 'Jig export',
      description: 'Write a local audit export for a terminal Jig run.',
      inputSchema: {
        runDir: z.string(),
        outputDir: z.string().optional(),
      },
    },
    async ({ runDir, outputDir }) => invokeTool('export', () => operator.export({ runDir, outputDir })),
  );
}

export function createJigMcpServer(options: CreateJigMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: 'jig-mcp',
    version: serverVersion,
  });
  registerOperatorTools(server, options.operator ?? createJigSession(options.sessionOptions).operator);
  return server;
}

export async function startJigMcpServerStdio(options: CreateJigMcpServerOptions = {}): Promise<void> {
  const server = createJigMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
