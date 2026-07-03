// Shared domain types for the jig local execution engine.
// These are intentionally permissive where the runtime code validates loosely-typed
// JSON input at boundaries (loaders.ts, plan-validator.ts): fields that are checked at
// runtime rather than guaranteed by a schema stay optional here, matching the actual
// validation order in the source.

export interface Story {
  id: string;
  title: string;
  dependsOn?: unknown;
  scope?: string[];
  authority?: {
    requests?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Plan {
  id: string;
  version: string;
  stories: Story[];
  [key: string]: unknown;
}

export interface PlanInstance {
  plan: Plan;
  [key: string]: unknown;
}

export interface ConfigDoc {
  runner?: {
    recordDir?: string;
    mode?: string;
    [key: string]: unknown;
  };
  drivers?: unknown;
  [key: string]: unknown;
}

export interface PolicyDoc {
  policy?: {
    id?: string;
    rules?: {
      allowLocalDryRun?: boolean;
      ruleGoverningSurfaces?: string[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type AuthorizationOutcome = 'grant' | 'deny' | 'route';

export type AuthorizationBasis =
  | 'declared-request'
  | 'in-scope'
  | 'CFG-10:reversible'
  | 'GUARD-2'
  | 'rule-governing-surface'
  | 'privileged-or-irreversible'
  | 'FENCE-1'
  | 'out-of-declared-scope'
  | 'invalid-request-path'
  | 'unknown-request-kind'
  | 'containment-unproven'
  | 'isolation-strength-overstated'
  | 'workspace-collision';

export interface AuthorizationRequest {
  id: string;
  kind: string;
  paths?: string[];
  command?: string;
  capability?: string;
  privileged?: boolean;
  irreversible?: boolean;
  [key: string]: unknown;
}

export interface AuthorizationDecision {
  outcome: AuthorizationOutcome;
  basis: AuthorizationBasis[];
}

export interface Diagnostics {
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  evidenceResult?: unknown;
}

export type RunStatus = 'success' | 'failure';

export interface GitWorkspaceFingerprint {
  kind: 'git';
  repoRoot: string;
  head: string;
  changeSetHash: string;
}

export interface UnavailableWorkspaceFingerprint {
  kind: 'unavailable';
  reason: 'not-a-git-worktree' | 'git-unavailable' | 'git-command-failed';
  detail: string;
}

export type WorkspaceFingerprint =
  | GitWorkspaceFingerprint
  | UnavailableWorkspaceFingerprint
  | {
      repoRoot: string;
      head: string;
      changeSetHash: string;
    };

export interface RunBinding {
  policyRef: string;
  configRef: string;
  workspace: WorkspaceFingerprint;
}

export interface RunPosture {
  record: 'safe-for-owner-record';
  export: 'redacted';
}

export interface PlanSnapshotRef {
  ref?: string;
  path?: string;
}

export type PolicySnapshotRef = PlanSnapshotRef;

export interface RunEvent {
  family: string;
  actor?: string;
  runId?: string;
  planId?: string;
  mode?: string;
  binding?: RunBinding;
  posture?: RunPosture;
  planSnapshot?: PlanSnapshotRef;
  policySnapshot?: PolicySnapshotRef;
  storyId?: string;
  blockedBy?: string;
  reason?: string;
  diagnostics?: Diagnostics;
  changedFiles?: string[];
  result?: unknown;
  checkpoint?: string;
  unstarted?: string[];
  timestamp?: string;
  [key: string]: unknown;
}

export interface RunRecord {
  run: {
    id: string;
    attempt: number;
    status: RunStatus;
    planId: string;
    mode?: string;
    binding: RunBinding;
    posture?: RunPosture;
    planSnapshot?: PlanSnapshotRef;
    policySnapshot?: PolicySnapshotRef;
  };
  events: RunEvent[];
}

export interface ResumePlan {
  runId: string;
  checkpoint: string;
  stopCause: string;
  completedStoryIds: string[];
  blockedStoryIds: string[];
  parkedStoryId: string | null;
  unstartedStoryIds: string[];
  parkedRequest?: {
    requestId?: string;
    requestKind?: string;
    [key: string]: unknown;
  };
}

export interface WorkerResult {
  storyId?: string;
  outcome?: string;
  requests?: AuthorizationRequest[];
  evidence?: {
    result?: unknown;
    [key: string]: unknown;
  };
  changedFiles?: string[];
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  [key: string]: unknown;
}

export interface ScriptedOutput {
  storyId?: string;
  stories?: WorkerResult[];
  [key: string]: unknown;
}

/**
 * Executes a single story and reports its outcome. Implemented by ScriptedWorker today;
 * kept as an interface so the harness stays swappable and test doubles type-check.
 */
export interface Worker {
  execute(story: Story): Promise<WorkerResult>;
}

/**
 * Records run/story lifecycle events and finalizes the run record. Implemented by
 * RecordManager; kept as an interface so harness test doubles (plain object literals)
 * type-check without implementing the full class.
 */
export interface RecordSink {
  init(plan: Plan, config: ConfigDoc, policy: PolicyDoc): void;
  recordEvent(event: Pick<RunEvent, 'family'> & Partial<RunEvent>): void;
  finalize(status: RunStatus): Promise<void>;
}
