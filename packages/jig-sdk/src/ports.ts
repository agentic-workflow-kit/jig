import type { ContainmentMechanism } from './providers/real/confinement.js';
import type { PlanInstance, RunEvent, Story, WorkerResult } from './types.js';

export type IsolationStrength = 'none' | 'weak' | 'strong';
export type CapabilityFreshness = 'fresh' | 'stale' | 'missing';
export type HostFailureToken = 'containment-unproven' | 'isolation-strength-overstated' | 'workspace-collision';

export interface AgentPort {
  execute(story: Story): Promise<WorkerResult>;
}

export interface CapabilityAttestation {
  driverId: string;
  capability: string;
  runContext: string;
  freshness: CapabilityFreshness;
  positive: boolean;
  reportedIsolationStrength?: IsolationStrength;
  provenIsolationStrength?: IsolationStrength;
  provenBy?: 'exercised-confinement-proof';
  containmentMechanism?: ContainmentMechanism;
  failureToken?: HostFailureToken;
}

export interface HostAttestation {
  driverId: string;
  runContext: string;
  isolationStrength: IsolationStrength;
  capabilityAttestations: CapabilityAttestation[];
}

export interface ExecutionHostPort {
  describe(): HostAttestation;
}

export type LandingAction = 'push' | 'open-pr' | 'merge';
export type Mergeability = 'not-evaluated' | 'held-by-review' | 'held-by-merge-queue' | 'held-by-conflict';

export interface LandingRequest {
  storyId: string;
  action: LandingAction;
  reason?: 'dry-run';
}

export type LandingOutcome = Pick<RunEvent, 'family'> & Partial<RunEvent>;

export interface LandingVerificationRequest {
  storyId: string;
  action: LandingAction;
  landingKind: LandingAction;
  targetRef: string;
  targetHead: string;
}

export type LandingVerificationOutcome =
  | {
      status: 'matched';
      targetRef: string;
      targetHead: string;
    }
  | {
      status: 'mismatched';
      targetRef: string;
      expectedHead: string;
      actualHead: string;
    };

export interface BlockSurfaceRequest {
  storyId: string;
  reason: string;
  failureReasons: string[];
  safeBranch?: string;
  canPush?: boolean;
  diagnostics?: Record<string, unknown>;
}

export interface ForgePort {
  land(request: LandingRequest): LandingOutcome | Promise<LandingOutcome>;
  verifyLanding?(request: LandingVerificationRequest): LandingVerificationOutcome | Promise<LandingVerificationOutcome>;
  surfaceBlock?(request: BlockSurfaceRequest): LandingOutcome[] | Promise<LandingOutcome[]>;
}

export interface CandidateProvenance {
  origin: {
    sourceSystem: string;
    candidateId: string;
  };
  jigValidated: true;
}

export interface CandidateWorkItem {
  planInstance: PlanInstance;
  provenance: CandidateProvenance;
}

export interface WorkSourcePort {
  candidates(): CandidateWorkItem[] | Promise<CandidateWorkItem[]>;
}
