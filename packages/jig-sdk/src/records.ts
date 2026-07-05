import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertSupportedDriverSelection,
  driverSelectionUsesRealDriver,
  readDriverSelection,
} from './driver-selection.js';
import { assertIntegrityKeyAvailable, writeIntegritySidecar } from './integrity.js';
import type { CapabilityAttestation } from './ports.js';
import { type RedactionOptions, redactValue } from './redaction.js';
import type { ApprovedSubstrateManifest } from './substrate.js';
import type {
  AttestationSnapshotRef,
  BoundOwnerConfiguration,
  ConfigDoc,
  EffectivePolicySnapshotRef,
  Plan,
  PlanSnapshotRef,
  PolicyDoc,
  PolicySnapshotRef,
  RecordSink,
  RepoPolicyFloorsSnapshotRef,
  RunBinding,
  RunEvent,
  RunPosture,
  RunRecord,
  RunStatus,
  SubstrateManifestRef,
  WorkProfileSnapshotRef,
} from './types.js';
import { captureWorkspaceFingerprint } from './workspace.js';

const ITEM_FAMILIES = ['story.done', 'story.blocked', 'story.failed', 'story.skipped'];
const PLAN_SNAPSHOT_FILE = 'plan.snapshot.json';
const POLICY_SNAPSHOT_FILE = 'policy.snapshot.json';
const WORK_PROFILE_SNAPSHOT_FILE = 'work-profile.snapshot.json';
const REPO_POLICY_FLOORS_SNAPSHOT_FILE = 'repo-policy-floors.snapshot.json';
const EFFECTIVE_POLICY_SNAPSHOT_FILE = 'effective-policy.snapshot.json';
const ATTESTATION_SNAPSHOT_FILE = 'attestation.snapshot.json';
const SUBSTRATE_MANIFEST_FILE = 'substrate.manifest.json';
const DEFAULT_RUN_POSTURE: RunPosture = {
  record: 'safe-for-owner-record',
  export: 'redacted',
};

export interface RecordManagerOptions {
  launchAttestation?: CapabilityAttestation;
  substrateManifest?: ApprovedSubstrateManifest;
  redaction?: RedactionOptions;
  ownerConfiguration?: BoundOwnerConfiguration;
}

function describeConfigBinding(config: ConfigDoc): string {
  const mode = config.runner?.mode ?? 'unknown-mode';
  const recordDir = config.runner?.recordDir ?? 'runs';
  return `mode=${mode};recordDir=${recordDir}`;
}

export class RecordManager implements RecordSink {
  private events: RunEvent[];
  private runDir: string;
  private runId: string;
  private plan: Plan | null;
  private config: ConfigDoc | null;
  private policy: PolicyDoc | null;
  private binding: RunBinding | null;
  private posture: RunPosture;
  private planSnapshot: PlanSnapshotRef | null;
  private policySnapshot: PolicySnapshotRef | null;
  private workProfileSnapshot: WorkProfileSnapshotRef | null;
  private repoPolicyFloorsSnapshot: RepoPolicyFloorsSnapshotRef | null;
  private effectivePolicySnapshot: EffectivePolicySnapshotRef | null;
  private attestationSnapshot: AttestationSnapshotRef | null;
  private substrateManifestRef: SubstrateManifestRef | null;
  private launchHeaderRecorded: boolean;
  private integrityEnabled: boolean;
  private readonly options: RecordManagerOptions;

  constructor(options: RecordManagerOptions = {}) {
    this.options = options;
    this.events = [];
    this.runDir = '';
    this.runId = '';
    this.plan = null;
    this.config = null;
    this.policy = null;
    this.binding = null;
    this.posture = DEFAULT_RUN_POSTURE;
    this.planSnapshot = null;
    this.policySnapshot = null;
    this.workProfileSnapshot = null;
    this.repoPolicyFloorsSnapshot = null;
    this.effectivePolicySnapshot = null;
    this.attestationSnapshot = null;
    this.substrateManifestRef = null;
    this.launchHeaderRecorded = false;
    this.integrityEnabled = false;
  }

  init(plan: Plan, config: ConfigDoc, policy: PolicyDoc, ownerConfiguration?: BoundOwnerConfiguration): void {
    this.events = [];
    this.launchHeaderRecorded = false;
    this.plan = plan;
    this.config = config;
    this.policy = policy;
    const driverSelection = readDriverSelection(config);
    assertSupportedDriverSelection(driverSelection);
    this.integrityEnabled = driverSelectionUsesRealDriver(driverSelection);
    if (this.integrityEnabled) {
      assertIntegrityKeyAvailable();
    }
    const recordBaseDir = config.runner?.recordDir || 'runs';
    this.runId = `run-${plan.id}-${Date.now()}-${randomUUID()}`;
    mkdirSync(recordBaseDir, { recursive: true });
    this.runDir = join(recordBaseDir, this.runId);
    mkdirSync(this.runDir);
    this.binding = {
      policyRef: policy.policy?.id ?? 'unknown-policy',
      configRef: describeConfigBinding(config),
      workspace: captureWorkspaceFingerprint(process.cwd()),
      ...(ownerConfiguration?.trackRef ? { trackRef: ownerConfiguration.trackRef } : {}),
      ...(ownerConfiguration?.workProfile?.workProfile.id
        ? { workProfileRef: ownerConfiguration.workProfile.workProfile.id }
        : {}),
      ...(ownerConfiguration?.repoPolicyFloors?.repoPolicyFloors.id
        ? { repoPolicyFloorsRef: ownerConfiguration.repoPolicyFloors.repoPolicyFloors.id }
        : {}),
      ...(this.integrityEnabled ? { drivers: driverSelection } : {}),
    };
    const planSnapshotPath = join(this.runDir, PLAN_SNAPSHOT_FILE);
    this.planSnapshot = {
      ref: `record-artifact:${this.runId}/${PLAN_SNAPSHOT_FILE}`,
      path: planSnapshotPath,
    };
    writeFileSync(planSnapshotPath, JSON.stringify(plan, null, 2));
    const policySnapshotPath = join(this.runDir, POLICY_SNAPSHOT_FILE);
    this.policySnapshot = {
      ref: `record-artifact:${this.runId}/${POLICY_SNAPSHOT_FILE}`,
      path: policySnapshotPath,
    };
    writeFileSync(policySnapshotPath, JSON.stringify(policy, null, 2));
    this.workProfileSnapshot = null;
    this.repoPolicyFloorsSnapshot = null;
    this.effectivePolicySnapshot = null;
    if (ownerConfiguration?.persistExtendedBindings) {
      if (ownerConfiguration.workProfile) {
        const workProfileSnapshotPath = join(this.runDir, WORK_PROFILE_SNAPSHOT_FILE);
        this.workProfileSnapshot = {
          ref: `record-artifact:${this.runId}/${WORK_PROFILE_SNAPSHOT_FILE}`,
          path: workProfileSnapshotPath,
        };
        writeFileSync(workProfileSnapshotPath, JSON.stringify(ownerConfiguration.workProfile, null, 2));
      }
      if (ownerConfiguration.repoPolicyFloors) {
        const repoPolicyFloorsSnapshotPath = join(this.runDir, REPO_POLICY_FLOORS_SNAPSHOT_FILE);
        this.repoPolicyFloorsSnapshot = {
          ref: `record-artifact:${this.runId}/${REPO_POLICY_FLOORS_SNAPSHOT_FILE}`,
          path: repoPolicyFloorsSnapshotPath,
        };
        writeFileSync(repoPolicyFloorsSnapshotPath, JSON.stringify(ownerConfiguration.repoPolicyFloors, null, 2));
      }
      const effectivePolicySnapshotPath = join(this.runDir, EFFECTIVE_POLICY_SNAPSHOT_FILE);
      this.effectivePolicySnapshot = {
        ref: `record-artifact:${this.runId}/${EFFECTIVE_POLICY_SNAPSHOT_FILE}`,
        path: effectivePolicySnapshotPath,
      };
      writeFileSync(effectivePolicySnapshotPath, JSON.stringify(ownerConfiguration.effectivePolicy, null, 2));
    }
    if (this.options.launchAttestation) {
      const attestationSnapshotPath = join(this.runDir, ATTESTATION_SNAPSHOT_FILE);
      this.attestationSnapshot = {
        ref: `record-artifact:${this.runId}/${ATTESTATION_SNAPSHOT_FILE}`,
        path: attestationSnapshotPath,
      };
      writeFileSync(attestationSnapshotPath, JSON.stringify(this.options.launchAttestation, null, 2));
    }
    if (this.options.substrateManifest) {
      const substrateManifestPath = join(this.runDir, SUBSTRATE_MANIFEST_FILE);
      this.substrateManifestRef = {
        ref: `record-artifact:${this.runId}/${SUBSTRATE_MANIFEST_FILE}`,
        path: substrateManifestPath,
      };
      writeFileSync(substrateManifestPath, JSON.stringify(this.options.substrateManifest, null, 2));
    }
  }

  recordEvent(event: Pick<RunEvent, 'family'> & Partial<RunEvent>): void {
    if (!this.launchHeaderRecorded) {
      if (event.family === 'run.started') {
        this.appendEvent(this.buildLaunchHeader(event));
        this.launchHeaderRecorded = true;
        return;
      }

      this.appendEvent(this.buildLaunchHeader());
      this.launchHeaderRecorded = true;
    } else if (event.family === 'run.started' && Object.keys(event).length === 1) {
      return;
    }

    this.appendEvent(event);
  }

  private buildLaunchHeader(event: Partial<RunEvent> = {}): Pick<RunEvent, 'family'> & Partial<RunEvent> {
    const plan = this.plan as Plan;
    const config = this.config as ConfigDoc;

    return {
      ...event,
      family: 'run.started',
      runId: this.runId,
      planId: plan.id,
      mode: config.runner?.mode,
      binding: this.binding as RunBinding,
      posture: this.posture,
      planSnapshot: this.planSnapshot as PlanSnapshotRef,
      policySnapshot: this.policySnapshot as PolicySnapshotRef,
      ...(this.workProfileSnapshot ? { workProfileSnapshot: this.workProfileSnapshot } : {}),
      ...(this.repoPolicyFloorsSnapshot ? { repoPolicyFloorsSnapshot: this.repoPolicyFloorsSnapshot } : {}),
      ...(this.effectivePolicySnapshot ? { effectivePolicySnapshot: this.effectivePolicySnapshot } : {}),
      ...(this.attestationSnapshot ? { attestationSnapshot: this.attestationSnapshot } : {}),
      ...(this.substrateManifestRef ? { substrateManifest: this.substrateManifestRef } : {}),
    };
  }

  private appendEvent(event: Pick<RunEvent, 'family'> & Partial<RunEvent>): void {
    const redactedEvent = redactValue(event, this.options.redaction) as Pick<RunEvent, 'family'> & Partial<RunEvent>;
    const timestampedEvent: RunEvent = { ...redactedEvent, actor: 'runner', timestamp: new Date().toISOString() };
    this.events.push(timestampedEvent);
    appendFileSync(join(this.runDir, 'events.jsonl'), `${JSON.stringify(timestampedEvent)}\n`);
    if (this.integrityEnabled) {
      writeIntegritySidecar(this.runDir);
    }
  }

  async finalize(status: RunStatus): Promise<void> {
    // init() always runs before finalize() in the harness flow; the null initializers only
    // exist to give the class a valid pre-init state. Cast here rather than adding a runtime
    // guard, matching the compile-time-only strict-mode discipline for this port.
    const plan = this.plan as Plan;
    const config = this.config as ConfigDoc;

    const runRecord: RunRecord = {
      run: {
        id: this.runId,
        attempt: 1,
        status,
        planId: plan.id,
        mode: config.runner?.mode,
        binding: this.binding as RunBinding,
        posture: this.posture,
        planSnapshot: this.planSnapshot as PlanSnapshotRef,
        policySnapshot: this.policySnapshot as PolicySnapshotRef,
        ...(this.workProfileSnapshot ? { workProfileSnapshot: this.workProfileSnapshot } : {}),
        ...(this.repoPolicyFloorsSnapshot ? { repoPolicyFloorsSnapshot: this.repoPolicyFloorsSnapshot } : {}),
        ...(this.effectivePolicySnapshot ? { effectivePolicySnapshot: this.effectivePolicySnapshot } : {}),
        ...(this.attestationSnapshot ? { attestationSnapshot: this.attestationSnapshot } : {}),
        ...(this.substrateManifestRef ? { substrateManifest: this.substrateManifestRef } : {}),
      },
      events: this.events,
    };
    writeFileSync(join(this.runDir, 'run.json'), JSON.stringify(runRecord, null, 2));

    this.printSummary(status);
  }

  printSummary(status: RunStatus): void {
    const config = this.config as ConfigDoc;

    console.log('\n--- Run Summary ---');
    console.log(`Final Status: ${status}`);
    if (config.runner?.mode) {
      console.log(`Mode: ${config.runner.mode}`);
    }

    // Item-level outcomes
    const items = this.events.filter((e) => ITEM_FAMILIES.includes(e.family));
    if (items.length > 0) {
      console.log('\nItems:');
      for (const item of items) {
        const outcome = item.family.replace('story.', '');
        let details = '';
        if (item.family === 'story.blocked') {
          details = item.blockedBy ? ` (blocked by ${item.blockedBy})` : ` (${item.reason})`;
        } else if (item.family === 'story.skipped') {
          details = ` (${item.reason})`;
        }
        console.log(`  - ${item.storyId}: ${outcome}${details}`);
      }
    } else if (status === 'failure') {
      const deniedEvent = this.events.find((e) => e.family === 'authorization.denied');
      if (deniedEvent) {
        console.log(`Reason: ${deniedEvent.reason}`);
      }
    }

    console.log(`\nRecords Directory: ${this.runDir}`);
    console.log('-------------------\n');
  }
}
