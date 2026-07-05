import type { AgentPort } from '../../ports.js';
import { type ApprovedSubstrateManifest, type SubstrateRequest, validateSubstrateRequest } from '../../substrate.js';
import type { Story, WorkerResult } from '../../types.js';

export type CodexSessionResult =
  | {
      status: 'completed';
      workerResult: WorkerResult;
      substrateRequests?: SubstrateRequest[];
      observedEvidence?: Record<string, unknown>;
    }
  | {
      status: 'capability-unavailable' | 'capability-denied';
      request: NonNullable<WorkerResult['requests']>[number];
      observedEvidence?: Record<string, unknown>;
    };

export interface CodexAgentSession {
  run(story: Story): Promise<CodexSessionResult>;
  interruptActiveTurn?(): Promise<boolean>;
  close?(): Promise<void>;
}

export interface CodexAgentOptions {
  session: CodexAgentSession;
  substrateManifest?: ApprovedSubstrateManifest;
}

export function createCodexAgent(options: CodexAgentOptions): AgentPort {
  return new CodexAgent(options.session, options.substrateManifest);
}

class CodexAgent implements AgentPort {
  private readonly session: CodexAgentSession;
  private readonly substrateManifest: ApprovedSubstrateManifest | undefined;

  constructor(session: CodexAgentSession, substrateManifest: ApprovedSubstrateManifest | undefined) {
    this.session = session;
    this.substrateManifest = substrateManifest;
  }

  async execute(story: Story): Promise<WorkerResult> {
    const result = await this.session.run(story);

    if (this.substrateManifest && result.status === 'completed') {
      for (const request of result.substrateRequests ?? []) {
        validateSubstrateRequest(this.substrateManifest, request);
      }
    }

    if (result.status === 'completed') {
      return {
        ...result.workerResult,
        evidence: {
          ...result.workerResult.evidence,
          observed: result.observedEvidence,
        },
      };
    }

    return {
      storyId: story.id,
      outcome: 'interrupted',
      requests: [result.request],
      evidence: {
        result: 'interrupted',
        observed: result.observedEvidence,
      },
    };
  }

  async close(): Promise<void> {
    await this.session.close?.();
  }
}
