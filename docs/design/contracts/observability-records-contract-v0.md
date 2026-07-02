---
title: Observability records contract v0
status: draft — contract shape
---

# Observability records contract v0

Run and event records are Jig's durable output boundary. Jig produces them during and after a
run; owners inspect them; the future Learning loop consumes them between runs. Records must
explain what happened and why without requiring access to Jig implementation internals or a
worker transcript.

This document defines the high-level v0 shape of that seam. It is a design-contract surface,
not a storage or logging implementation.

## v0 Not Frozen Schema

This is a v0 contract shape, not a frozen event schema. A record must preserve the information
named below, but exact field names, event type strings, payload nesting, retention rules, and
export encoding remain design and implementation detail until schema freeze. Illustrative JSON
in this document shows intent only.

## Product Commitments

The record shape derives from these product commitments:

- [FENCE-1](../../product/guarantees.md#11-the-fence--runtime-authorization),
  [FENCE-2](../../product/guarantees.md#11-the-fence--runtime-authorization), and
  [FENCE-3](../../product/guarantees.md#11-the-fence--runtime-authorization): records must show
  requested, authorized, denied, and runner-owned privileged actions.
- [EARN-1](../../product/guarantees.md#12-earned-trust--capability-attestation) and
  [EARN-2](../../product/guarantees.md#12-earned-trust--capability-attestation): capability
  proof must be recorded with driver and run context.
- [GUARD-1](../../product/guarantees.md#13-anti-gaming) and
  [GUARD-2](../../product/guarantees.md#13-anti-gaming): records must preserve the policy in
  force and any re-approval caused by rule-governing changes.
- [DOOR-1](../../product/guarantees.md#14-the-doorbell--approval-and-escalation),
  [DOOR-2](../../product/guarantees.md#14-the-doorbell--approval-and-escalation), and
  [DOOR-3](../../product/guarantees.md#14-the-doorbell--approval-and-escalation): escalations,
  parked states, owner decisions, and narrow grants must survive interruption.
- [MERGE-1](../../product/guarantees.md#15-merge-on-evidence) through
  [MERGE-5](../../product/guarantees.md#15-merge-on-evidence): done, merge, blocked PR, status,
  and evidence decisions must be reconstructible.
- [SEC-1](../../product/guarantees.md#16-security--no-leaks-no-phone-home),
  [SEC-2](../../product/guarantees.md#16-security--no-leaks-no-phone-home), and
  [SEC-3](../../product/guarantees.md#16-security--no-leaks-no-phone-home): records must be
  redacted by default and must not leak credentials, secrets, or sensitive values.
- [RESUME-1](../../product/guarantees.md#31-interruption-resume) through
  [RESUME-5](../../product/guarantees.md#31-interruption-resume): records must support safe
  checkpoint resume and no double effect.
- [ISO-1](../../product/guarantees.md#32-work-level-failure-isolation) through
  [ISO-4](../../product/guarantees.md#32-work-level-failure-isolation): story outcomes and
  downstream effects must be dependency-aware.
- [LIVE-1](../../product/guarantees.md#33-liveness--noticing-a-stuck-run) and
  [LIVE-2](../../product/guarantees.md#33-liveness--noticing-a-stuck-run): stuck, silent, idle,
  or overdue conditions must become visible records and notices.
- [STACK-1](../../product/guarantees.md#4-stack-portability) through
  [DRIVE-3](../../product/guarantees.md#41-trusting-a-driver): driver capabilities, limits, and
  authority boundaries must be attributable.
- [SEE-1](../../product/guarantees.md#5-full-observability) through
  [SEE-6](../../product/guarantees.md#5-full-observability): records are a structured product
  surface, the evidence trail, the notice queue, and the redacted export basis.

## Required Record Properties

Run and event records must carry these properties at v0 design altitude.

### Run Identity and Input Binding

A run record must identify the run and bind it to the exact plan, policy, work profile, repo
floor, and driver context used at launch. This lets Jig resume safely, reject incompatible
resume attempts, and let owners or tools compare what happened against what was approved.

At v0 this means records preserve:

- run ID and run attempt identity;
- plan identity and version posture;
- track identity;
- policy, work-profile, and repo-floor references in force;
- runner version or compatibility posture;
- driver identities and attestation posture for Agent, Execution Host, Forge, and Work Source.

### Event Causality

Records must preserve enough structured causality to answer why a story landed, blocked,
parked, stopped, or was rejected. At v0 this means every governed event family names:

- the run and story it relates to, when applicable;
- the event family and outcome;
- the actor or component responsible, such as worker, runner, owner, delegated reviewer, or
  driver;
- the policy, evidence, approval, capability proof, or prior event it was based on;
- the record's redaction/export posture;
- ordering information sufficient for replay and resume.

Exact timestamp formats, IDs, correlation keys, and event names remain design detail.

#### v0 phasing of causality fields

The list above is the v0 design altitude; implementation phases the fields in as their
underlying concepts land
([ADR 0017](../decisions/0017-records-seam-reconciliation.md)). Required from the first
implementing phase: the actor on every event, and a run-level binding block naming the policy
and configuration in force. Phased in with the phases that introduce their concepts: per-event
basis, per-event redaction posture, work-profile/repo-floor/track references, and driver
identities with attestation posture. "Every governed event family" is read against this split,
not as all-fields-on-day-one.

### Story State and Outcomes

Records must expose story state transitions and final outcomes in product terms:

- parked, waiting on an owner decision;
- rejected, terminal by owner decision;
- blocked, unable to proceed with reason;
- done, evidence met but not necessarily merged;
- landed, merged on evidence.

The record must keep done and landed separate. Branch protection, merge queues, conflicts, or
other forge constraints can hold a done story without erasing its done evidence.

### Authorizations and Privileged Actions

Records must show worker requests, runner authorization decisions, denials, and privileged
runner actions. The worker's self-report is never enough for a privileged action to be
considered done.

At v0, this includes records for:

- requested capabilities or actions;
- authorization basis under policy;
- denied or narrowed requests;
- owner approvals, rejections, overrides, or handoffs;
- push, PR creation, PR comment/status posting, merge, and other runner-owned irreversible
  actions;
- skipped irreversible actions on resume because the effect already happened.

### Gates and Evidence

Records must preserve the evidence Jig uses to decide. Owners and downstream tools inspect
the same evidence basis Jig used; there must not be a separate narrative that can drift from
the run.

At v0 this includes:

- automated check observations;
- review observations;
- capability attestations;
- policy gate decisions;
- evidence artifacts or stable references to them;
- mergeability and branch-protection state when it affects done versus landed.

### Blocks, Stops, and Notices

Records must make non-happy paths first-class. A blocked story, parked decision, stale worker,
overdue approval, or cleanly stopped run is not just log text; it is a structured state with a
reason and next available owner action.

At v0 this includes:

- block reasons and affected downstream stories;
- run-level stop reasons and safe resume checkpoint;
- liveness signals that distinguish thinking, idle, stuck, and dead;
- notices for parked, blocked, stale, overdue, or attention-worthy conditions;
- acknowledgement or snooze posture when an owner handles a notice.

### Recovery and Resume

Records must support resume from the last safe checkpoint and prevent repeated irreversible
effects. The record should make repeatable work distinct from irreversible actions so Jig can
re-run checks when appropriate without pushing, opening, merging, or approving twice.

Records must also show when safety-relevant assumptions changed while the run was stopped and
why re-approval or fresh evidence was required before continuing. To support the workspace-
continuity check that resume performs, the run's input binding may carry a run-level workspace
fingerprint (e.g. repo root, `HEAD`, and a content hash over the working-tree change set that
distinguishes materially different dirty trees at one `HEAD`); its meaning is named here, its exact
encoding deferred to schema freeze ([ADR 0020](../decisions/0020-phase-4-reliable-local-runs.md)).

The launch binding and run identity must be recoverable from the durable event log itself, not only
from a finalized summary, so a crashed run whose finalized summary is absent stays inspectable and
resumable ([ADR 0020](../decisions/0020-phase-4-reliable-local-runs.md) §1); the carrier event and
its exact encoding are deferred to schema freeze.

### Redaction, Retention, and Export Posture

Records are safe to keep and export by default. At v0, every governed event family must be
compatible with redaction and export posture:

- secrets, tokens, credentials, and sensitive values are omitted or redacted;
- references to external artifacts are stable but do not embed private credentials;
- export posture says whether a record is safe for owner archive or compliance handoff;
- redaction decisions are themselves inspectable enough to explain what class of value was
  removed without exposing it.

At Phase 4 local altitude this posture is satisfied by a **run-level default** (safe-for-owner /
redacted-export); field-level per-record posture phases in with the concepts that introduce
sensitive values, consistent with [ADR 0017](../decisions/0017-records-seam-reconciliation.md)
decision 5's v0 phasing and settled in
[ADR 0020](../decisions/0020-phase-4-reliable-local-runs.md). Unknown or ambiguous posture stays
fail-closed. This clarifies the v0 reading; it does not freeze the schema.

### Learning-Loop Consumption

The Learning loop consumes records between runs, not in Jig's hot path. Records must therefore
be useful for root-cause analysis without turning Learning into a prerequisite for execution.

At v0, records should expose enough structured shape for Learning to ask:

- Was the defect caused by product, design, planning, Jig execution, policy, driver, or human
  decision?
- Which story, dependency, evidence gate, approval, or driver capability was involved?
- Did the run follow the plan and policy in force?
- Was the problem a one-off failure, a missing check, a weak plan, a weak policy, or an
  unsupported stack capability?
- Which earlier layer should receive the improvement finding?

## Event Families

The following event families are expected at v0 design altitude. Names are descriptive, not
schema constants:

- run lifecycle: previewed, started, stopped, resumed, completed;
- input binding: plan accepted, plan rejected, policy/work-profile bound;
- capability: driver attested, capability missing, capability stale, autonomy reduced;
- authorization: worker requested, runner allowed, runner denied, owner approved, owner
  rejected, owner narrowed, handoff recorded;
- story lifecycle: eligible, started, parked, unparked, blocked, done, landed, rejected;
- evidence and gates: check observed — as `evidence.observed` when genuinely observed, as
  `evidence.modeled` when the evidence is modeled rather than run, as in a dry-run
  ([ADR 0017](../decisions/0017-records-seam-reconciliation.md)) — review observed, gate
  passed, gate failed, mergeability observed;
- runner action: pushed, opened PR, posted status, posted comment, merged, skipped repeated
  effect on resume;
- liveness and notices: idle, stuck, overdue, notice created, notice acknowledged, notice
  snoozed;
- export and redaction: export prepared, redaction applied, export denied.

## Illustrative v0 Example

This example is illustrative only. It is not a normative schema, field contract, or complete
fixture.

```json
{
  "run": {
    "id": "run-2026-06-30-jig-docs-m1",
    "attempt": "attempt-1",
    "planRef": "plan-jig-docs-m1@execution-plan-shape-v0",
    "trackRef": "track:jig-contract-design",
    "policyRef": "policy:jig-docs-cautious@2026-06",
    "workProfileRef": "work-profile:jig-doc-author@2026-06",
    "repoFloorRef": "repo-policy:jig-main-floor",
    "drivers": {
      "agent": "agent:contained-doc-worker",
      "executionHost": "host:local-isolated-worktree",
      "forge": "forge:github",
      "workSource": "work-source:local-plan"
    }
  },
  "events": [
    {
      "family": "run.started",
      "runId": "run-2026-06-30-jig-docs-m1",
      "actor": "runner",
      "basis": ["planRef", "policyRef", "workProfileRef"],
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "story.parked",
      "runId": "run-2026-06-30-jig-docs-m1",
      "storyId": "STORY-1",
      "actor": "runner",
      "outcome": "waiting-on-owner",
      "basis": ["GUARD-2", "policy-rule-governing-change"],
      "notice": {
        "urgency": "decision-required",
        "ownerAction": "approve-or-reject-narrow-grant"
      },
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "evidence.observed",
      "runId": "run-2026-06-30-jig-docs-m1",
      "storyId": "STORY-1",
      "actor": "runner",
      "evidence": {
        "category": "automated-check",
        "name": "pnpm check",
        "result": "passed",
        "artifactRef": "record-artifact:checks/pnpm-check-STORY-1"
      },
      "basis": ["MERGE-1", "MERGE-3", "SEE-3"],
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "story.done",
      "runId": "run-2026-06-30-jig-docs-m1",
      "storyId": "STORY-1",
      "actor": "runner",
      "outcome": "done-not-landed",
      "basis": ["evidence.observed", "policyRef"],
      "mergeability": "held-by-review",
      "redaction": "safe-for-owner-record"
    }
  ],
  "export": {
    "default": "redacted",
    "posture": "write-once-owner-archive"
  }
}
```

## Product Reconciliation

No conflict was found between this run/event record v0 shape and the current Jig product docs.

The main reconciliation decision is that records are not general logs. Product guarantee 5
requires a structured product surface: decisions, evidence, approvals, state transitions, and
outcomes must be reconstructible. This document therefore centers governed event families and
causal basis rather than free-form transcript capture.

The future Learning loop is treated as a between-runs consumer, consistent with the product
boundary in [`jig.md`](../../product/jig.md#product-boundaries). This document does not make
Learning part of Jig's hot path.

The legacy `workflow-kit` prototype was treated as reference-only prior art. No legacy
mechanic is inherited here unless it preserves the current Jig product commitments.

## Deferred

This document does not define:

- TypeScript event types or JSON Schema;
- storage engine, log format, retention policy, or export file format;
- CLI, API, or dashboard surfaces for inspecting records;
- provider driver protocol details;
- Learning-loop product or design docs.
