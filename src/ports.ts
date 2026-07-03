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

export interface LandingRequest {
  storyId: string;
  action: 'push|open-pr|merge';
  reason?: 'dry-run';
}

export type LandingOutcome = Pick<RunEvent, 'family'> & Partial<RunEvent>;

export interface ForgePort {
  land(request: LandingRequest): LandingOutcome | Promise<LandingOutcome>;
}

export interface CandidateWorkItem {
  planInstance: PlanInstance;
  provenance: 'jig-validated';
}

export interface WorkSourcePort {
  candidates(): CandidateWorkItem[] | Promise<CandidateWorkItem[]>;
}
