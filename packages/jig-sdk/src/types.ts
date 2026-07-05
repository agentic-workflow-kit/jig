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
  version?: string;
  runner?: {
    recordDir?: string;
    mode?: string;
    [key: string]: unknown;
  };
  drivers?: unknown;
  track?: {
    id?: string;
    workProfilePath?: string;
    repoPolicyFloorsPath?: string;
    workProfile?: WorkProfileDoc;
    repoPolicyFloors?: RepoPolicyFloorsDoc;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PolicyRules {
  allowLocalDryRun?: boolean;
  ruleGoverningSurfaces?: string[];
  capabilityIsolation?: Record<string, 'none' | 'weak' | 'strong'>;
  gatingPosture?: 'manual' | 'assisted';
  mergeSpectrum?: 'push' | 'open-pr' | 'merge';
  concurrencyCeiling?: number;
  retryBudget?: number;
  requiredReviews?: string[];
  escalationRules?: {
    pauseOnOwnerDecision?: 'required';
    [key: string]: unknown;
  };
  blockResolution?: 'quarantine-replan' | 'continue-independent-work';
  [key: string]: unknown;
}

export interface PolicyBasisDimension {
  dimension: string;
  followUp: string;
}

export interface PolicyBasis {
  trackPolicyRef?: string;
  repoPolicyFloorsRef?: string;
  trackRef?: string;
  tightenedByRepoFloors?: string[];
  enforcedDimensions?: string[];
  inertDimensions?: PolicyBasisDimension[];
  [key: string]: unknown;
}

export interface PolicyDoc {
  version?: string;
  policy?: {
    id?: string;
    rules?: PolicyRules;
    basis?: PolicyBasis;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface WorkProfileDoc {
  version?: string;
  workProfile: {
    id: string;
    model: string;
    effort: 'low' | 'medium' | 'high';
    promptStrategy?: 'dynamic-per-task' | 'templated' | 'role-prompt';
    roleRealization?: 'single-agent' | 'planner-executor' | 'reviewer-assisted';
    setup?: {
      command?: string;
      freshnessCheck?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RepoPolicyFloorsDoc {
  version?: string;
  repoPolicyFloors: {
    id: string;
    rules?: PolicyRules;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface BoundOwnerConfiguration {
  trackRef?: string;
  policy: PolicyDoc;
  effectivePolicy: PolicyDoc;
  workProfile?: WorkProfileDoc;
  repoPolicyFloors?: RepoPolicyFloorsDoc;
  persistExtendedBindings: boolean;
}

export type AuthorizationOutcome = 'grant' | 'deny' | 'route';

export type AuthorizationBasis =
  | 'declared-request'
  | 'in-scope'
  | 'CFG-10:reversible'
  | 'CFG-10:manual-review-required'
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
  failureToken?: string;
  originalReason?: string;
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
  trackRef?: string;
  workProfileRef?: string;
  repoPolicyFloorsRef?: string;
  drivers?: {
    agent: string;
    executionHost: string;
    forge: string;
    workSource: string;
  };
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
export type WorkProfileSnapshotRef = PlanSnapshotRef;
export type RepoPolicyFloorsSnapshotRef = PlanSnapshotRef;
export type EffectivePolicySnapshotRef = PlanSnapshotRef;
export type AttestationSnapshotRef = PlanSnapshotRef;
export type SubstrateManifestRef = PlanSnapshotRef;

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
  workProfileSnapshot?: WorkProfileSnapshotRef;
  repoPolicyFloorsSnapshot?: RepoPolicyFloorsSnapshotRef;
  effectivePolicySnapshot?: EffectivePolicySnapshotRef;
  attestationSnapshot?: AttestationSnapshotRef;
  substrateManifest?: SubstrateManifestRef;
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
    workProfileSnapshot?: WorkProfileSnapshotRef;
    repoPolicyFloorsSnapshot?: RepoPolicyFloorsSnapshotRef;
    effectivePolicySnapshot?: EffectivePolicySnapshotRef;
    attestationSnapshot?: AttestationSnapshotRef;
    substrateManifest?: SubstrateManifestRef;
  };
  events: RunEvent[];
}

export interface ResumePlan {
  runId: string;
  checkpoint: string;
  stopCause: string;
  completedStoryIds: string[];
  blockedStoryIds: string[];
  priorLandings?: Array<{
    storyId: string;
    action: 'push' | 'open-pr' | 'merge';
    landingKind: 'push' | 'open-pr' | 'merge';
    targetRef: string;
    targetHead: string;
  }>;
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
  init(plan: Plan, config: ConfigDoc, policy: PolicyDoc, ownerConfiguration?: BoundOwnerConfiguration): void;
  recordEvent(event: Pick<RunEvent, 'family'> & Partial<RunEvent>): void;
  finalize(status: RunStatus): Promise<void>;
}
