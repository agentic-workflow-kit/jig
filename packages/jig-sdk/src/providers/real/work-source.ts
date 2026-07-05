import type { CandidateWorkItem, WorkSourcePort } from '../../ports.js';
import type { PlanInstance } from '../../types.js';

export interface RealWorkSourceCandidate {
  sourceSystem: string;
  identifier: string;
  planInstance: PlanInstance;
}

export interface GitHubIssuesWorkSourceTransport {
  fetchCandidates(): Promise<RealWorkSourceCandidate[]>;
}

export interface GitHubIssuesWorkSourceOptions {
  transport?: GitHubIssuesWorkSourceTransport;
  env?: NodeJS.ProcessEnv;
}

export class GitHubIssuesWorkSource implements WorkSourcePort {
  private readonly transport: GitHubIssuesWorkSourceTransport;

  constructor(options: GitHubIssuesWorkSourceOptions = {}) {
    this.transport = options.transport ?? new GitHubIssuesApiTransport(options.env ?? process.env);
  }

  async candidates(): Promise<CandidateWorkItem[]> {
    const candidates = await this.transport.fetchCandidates();
    return candidates.map((candidate) => ({
      planInstance: candidate.planInstance,
      provenance: {
        origin: {
          sourceSystem: candidate.sourceSystem,
          candidateId: candidate.identifier,
        },
        jigValidated: true,
      },
    }));
  }
}

export function createGitHubIssuesWorkSource(options: GitHubIssuesWorkSourceOptions = {}): WorkSourcePort {
  return new GitHubIssuesWorkSource(options);
}

/* v8 ignore start -- live tracker transport is a thin seam; tests inject a fake transport. */
class GitHubIssuesApiTransport implements GitHubIssuesWorkSourceTransport {
  private readonly env: NodeJS.ProcessEnv;

  constructor(env: NodeJS.ProcessEnv) {
    this.env = env;
  }

  async fetchCandidates(): Promise<RealWorkSourceCandidate[]> {
    const repository = readRequiredEnv(this.env, 'JIG_GITHUB_ISSUES_REPOSITORY');
    const label = this.env.JIG_GITHUB_ISSUES_LABEL ?? 'jig-candidate';
    const token = this.env.GITHUB_TOKEN ?? this.env.GH_TOKEN;
    const response = await fetch(
      `https://api.github.com/repos/${repository}/issues?state=open&labels=${encodeURIComponent(label)}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!response.ok) {
      throw new Error(`github-issues-work-source-failed: GitHub returned HTTP ${response.status}`);
    }

    const issues = (await response.json()) as unknown;
    if (!Array.isArray(issues)) {
      throw new Error('github-issues-work-source-invalid-response: expected an issue array');
    }

    return issues.map((issue) => candidateFromIssue(issue));
  }
}

function readRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`github-issues-work-source-missing-env: ${key}`);
  }
  return value;
}

function candidateFromIssue(issue: unknown): RealWorkSourceCandidate {
  if (typeof issue !== 'object' || issue === null || Array.isArray(issue)) {
    throw new Error('github-issues-work-source-invalid-issue: expected an issue object');
  }

  const record = issue as { number?: unknown; body?: unknown; html_url?: unknown };
  const number = typeof record.number === 'number' ? String(record.number) : undefined;
  const body = typeof record.body === 'string' ? record.body : '';
  if (!number) {
    throw new Error('github-issues-work-source-invalid-issue: missing issue number');
  }

  return {
    sourceSystem: 'github-issues',
    identifier: number,
    planInstance: parsePlanFromIssueBody(body),
  };
}

function parsePlanFromIssueBody(body: string): PlanInstance {
  const fenced = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i.exec(body);
  const source = fenced?.[1] ?? body.trim();
  const guidance =
    'issue body must contain a JSON object with a top-level "plan" field, optionally inside a ```json fenced block';
  try {
    const parsed = JSON.parse(source) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && 'plan' in parsed) {
      return parsed as PlanInstance;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`github-issues-work-source-invalid-plan-json: ${guidance}; parse error: ${message}`);
  }

  throw new Error(`github-issues-work-source-invalid-plan-json: ${guidance}`);
}
/* v8 ignore stop */
