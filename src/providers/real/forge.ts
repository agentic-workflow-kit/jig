import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  BlockSurfaceRequest,
  ForgePort,
  LandingAction,
  LandingOutcome,
  LandingRequest,
  LandingVerificationOutcome,
  LandingVerificationRequest,
} from '../../ports.js';

/* v8 ignore start -- live git/gh command transport is intentionally outside hermetic tests. */
const execFileAsync = promisify(execFile);
/* v8 ignore stop */
const LANDING_ACTIONS = new Set<LandingAction>(['push', 'open-pr', 'merge']);

export class ForgeLandingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ForgeLandingError';
    this.code = code;
  }
}

export interface GitHubForgeEffect {
  targetRef: string;
  targetHead: string;
  remoteUrl?: string;
  prNumber?: number;
  prUrl?: string;
  diagnostics?: Record<string, unknown>;
}

export interface GitHubForgeTransport {
  push(request: LandingRequest): Promise<GitHubForgeEffect>;
  openPullRequest(request: LandingRequest): Promise<GitHubForgeEffect>;
  mergePullRequest(request: LandingRequest): Promise<GitHubForgeEffect>;
  readHead(request: { targetRef: string }): Promise<{ targetRef: string; targetHead: string }>;
  openOrUpdatePullRequestForBlock(request: BlockSurfaceRequest): Promise<GitHubForgeEffect>;
  postBlockStatus(request: BlockSurfaceRequest): Promise<GitHubForgeEffect>;
  postBlockComment(request: BlockSurfaceRequest): Promise<GitHubForgeEffect>;
}

export interface GitHubForgeOptions {
  transport?: GitHubForgeTransport;
}

function assertLandingAction(action: string): asserts action is LandingAction {
  if (!LANDING_ACTIONS.has(action as LandingAction)) {
    throw new ForgeLandingError('forge-unknown-action', `forge-unknown-action: unsupported landing action "${action}"`);
  }
}

function familyForAction(action: LandingAction): string {
  if (action === 'push') return 'runner-action.pushed';
  if (action === 'open-pr') return 'runner-action.opened-pr';
  return 'runner-action.merged';
}

function outcomeForAction(request: LandingRequest, effect: GitHubForgeEffect): LandingOutcome {
  return {
    family: familyForAction(request.action),
    storyId: request.storyId,
    action: request.action,
    landingKind: request.action,
    targetRef: effect.targetRef,
    targetHead: effect.targetHead,
    ...(effect.remoteUrl ? { remoteUrl: effect.remoteUrl } : {}),
    ...(effect.prNumber !== undefined ? { prNumber: effect.prNumber } : {}),
    ...(effect.prUrl ? { prUrl: effect.prUrl } : {}),
    ...(effect.diagnostics ? { diagnostics: effect.diagnostics } : {}),
  };
}

/* v8 ignore start -- live git/gh command transport is intentionally outside hermetic tests. */
async function readCurrentBranch(): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  return stdout.trim();
}

async function readCurrentHead(ref = 'HEAD'): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', ref]);
  return stdout.trim();
}

function parseGhJson(stdout: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to the explicit adapter error below.
  }

  throw new ForgeLandingError('forge-transport-invalid-json', 'forge-transport-invalid-json: gh returned invalid JSON');
}

function readStringField(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function readNumberField(record: Record<string, unknown>, field: string): number | undefined {
  const value = record[field];
  return typeof value === 'number' ? value : undefined;
}

export function createGitHubCommandTransport(): GitHubForgeTransport {
  return {
    push: async () => {
      const branch = await readCurrentBranch();
      const targetHead = await readCurrentHead('HEAD');
      await execFileAsync('git', ['push', 'origin', `HEAD:${branch}`]);
      return {
        targetRef: `refs/heads/${branch}`,
        targetHead,
      };
    },
    openPullRequest: async () => {
      const branch = await readCurrentBranch();
      const targetHead = await readCurrentHead('HEAD');
      const { stdout } = await execFileAsync('gh', [
        'pr',
        'create',
        '--fill',
        '--json',
        'number,url,headRefName,headRefOid',
      ]);
      const parsed = parseGhJson(stdout);
      return {
        targetRef: `refs/heads/${readStringField(parsed, 'headRefName') ?? branch}`,
        targetHead: readStringField(parsed, 'headRefOid') ?? targetHead,
        prNumber: readNumberField(parsed, 'number'),
        prUrl: readStringField(parsed, 'url'),
      };
    },
    mergePullRequest: async () => {
      const branch = await readCurrentBranch();
      const targetHead = await readCurrentHead('HEAD');
      const { stdout } = await execFileAsync('gh', ['pr', 'view', '--json', 'number,url,headRefName,headRefOid']);
      const parsed = parseGhJson(stdout);
      await execFileAsync('gh', ['pr', 'merge', '--squash', '--delete-branch=false']);
      return {
        targetRef: `refs/heads/${readStringField(parsed, 'headRefName') ?? branch}`,
        targetHead: readStringField(parsed, 'headRefOid') ?? targetHead,
        prNumber: readNumberField(parsed, 'number'),
        prUrl: readStringField(parsed, 'url'),
      };
    },
    readHead: async (request) => ({
      targetRef: request.targetRef,
      targetHead: await readCurrentHead(request.targetRef),
    }),
    openOrUpdatePullRequestForBlock: async (request) => {
      const branch = request.safeBranch ?? (await readCurrentBranch());
      const targetHead = await readCurrentHead('HEAD');
      const { stdout } = await execFileAsync('gh', [
        'pr',
        'create',
        '--fill',
        '--head',
        branch,
        '--json',
        'number,url,headRefName,headRefOid',
      ]);
      const parsed = parseGhJson(stdout);
      return {
        targetRef: `refs/heads/${readStringField(parsed, 'headRefName') ?? branch}`,
        targetHead: readStringField(parsed, 'headRefOid') ?? targetHead,
        prNumber: readNumberField(parsed, 'number'),
        prUrl: readStringField(parsed, 'url'),
      };
    },
    postBlockStatus: async (request) => {
      const branch = request.safeBranch ?? (await readCurrentBranch());
      const targetHead = await readCurrentHead('HEAD');
      await execFileAsync('gh', [
        'api',
        `repos/:owner/:repo/statuses/${targetHead}`,
        '-f',
        'state=failure',
        '-f',
        'context=jig/block',
        '-f',
        `description=${request.reason}`,
      ]);
      return {
        targetRef: `refs/heads/${branch}`,
        targetHead,
      };
    },
    postBlockComment: async (request) => {
      const branch = request.safeBranch ?? (await readCurrentBranch());
      const targetHead = await readCurrentHead('HEAD');
      await execFileAsync('gh', ['pr', 'comment', branch, '--body', request.failureReasons.join('\n')]);
      return {
        targetRef: `refs/heads/${branch}`,
        targetHead,
      };
    },
  };
}
/* v8 ignore stop */

export function createGitHubForge(options: GitHubForgeOptions = {}): ForgePort {
  const transport = options.transport ?? createGitHubCommandTransport();

  return {
    land: async (request) => {
      assertLandingAction(request.action);

      if (request.action === 'push') {
        return outcomeForAction(request, await transport.push(request));
      }

      if (request.action === 'open-pr') {
        return outcomeForAction(request, await transport.openPullRequest(request));
      }

      return outcomeForAction(request, await transport.mergePullRequest(request));
    },
    verifyLanding: async (request: LandingVerificationRequest): Promise<LandingVerificationOutcome> => {
      assertLandingAction(request.action);
      const current = await transport.readHead({ targetRef: request.targetRef });
      if (current.targetHead === request.targetHead) {
        return {
          status: 'matched',
          targetRef: current.targetRef,
          targetHead: current.targetHead,
        };
      }

      return {
        status: 'mismatched',
        targetRef: current.targetRef,
        expectedHead: request.targetHead,
        actualHead: current.targetHead,
      };
    },
    surfaceBlock: async (request) => {
      if (!request.safeBranch || request.canPush !== true) {
        return [];
      }

      const pr = await transport.openOrUpdatePullRequestForBlock(request);
      const status = await transport.postBlockStatus(request);
      const comment = await transport.postBlockComment(request);
      return [
        {
          family: 'runner-action.opened-pr',
          storyId: request.storyId,
          targetRef: pr.targetRef,
          targetHead: pr.targetHead,
          ...(pr.prNumber !== undefined ? { prNumber: pr.prNumber } : {}),
          ...(pr.prUrl ? { prUrl: pr.prUrl } : {}),
        },
        {
          family: 'runner-action.posted-status',
          storyId: request.storyId,
          targetRef: status.targetRef,
          targetHead: status.targetHead,
          status: 'failure',
          reason: request.reason,
        },
        {
          family: 'runner-action.posted-comment',
          storyId: request.storyId,
          targetRef: comment.targetRef,
          targetHead: comment.targetHead,
          failureReasons: request.failureReasons,
        },
      ];
    },
  };
}
