---
title: Execution-plan contract v0
status: draft — contract shape
---

# Execution-plan contract v0

The execution plan is Jig's hard input boundary. Planning produces this artifact; Jig runs it
under policy and work profile; downstream tools should not need Jig implementation internals
to understand what a valid plan must carry.

This document defines the high-level v0 shape of that seam. It is concrete enough to guide
Planning, but it deliberately stops short of field-level schema, package layout, CLI/API
design, or runtime implementation.

## v0 Not Frozen Schema

This is a v0 contract shape, not a frozen JSON Schema. A plan must preserve the properties
named below, but exact field names, nesting, enum values, validation language, and storage
encoding remain design and implementation detail until schema freeze. Illustrative JSON in
this document shows intent only.

## Product Commitments

The plan shape derives from these product commitments:

- [FENCE-1](../../product/guarantees.md#11-the-fence--runtime-authorization),
  [FENCE-2](../../product/guarantees.md#11-the-fence--runtime-authorization), and
  [FENCE-3](../../product/guarantees.md#11-the-fence--runtime-authorization): work must declare
  the authority it needs so the runner can fail closed and keep privileged actions out of the
  worker.
- [GUARD-1](../../product/guarantees.md#13-anti-gaming) and
  [GUARD-2](../../product/guarantees.md#13-anti-gaming): the plan must identify rule-governing
  surfaces and policy-sensitive changes that require re-approval.
- [MERGE-1](../../product/guarantees.md#15-merge-on-evidence),
  [MERGE-3](../../product/guarantees.md#15-merge-on-evidence), and
  [MERGE-4](../../product/guarantees.md#15-merge-on-evidence): done conditions and mergeability
  must be explicit and separable.
- [CFG-1](../../product/guarantees.md#2-configuration-ownership),
  [CFG-2](../../product/guarantees.md#2-configuration-ownership),
  [CFG-3](../../product/guarantees.md#2-configuration-ownership), and
  [CFG-4](../../product/guarantees.md#2-configuration-ownership): policy and work profile are
  track-scoped, and live behavior is derived rather than hand-set.
- [RESUME-1](../../product/guarantees.md#31-interruption-resume),
  [RESUME-2](../../product/guarantees.md#31-interruption-resume), and
  [RESUME-5](../../product/guarantees.md#31-interruption-resume): the plan must give Jig enough
  identity and dependency structure to checkpoint and resume safely.
- [ISO-1](../../product/guarantees.md#32-work-level-failure-isolation),
  [ISO-2](../../product/guarantees.md#32-work-level-failure-isolation), and
  [ISO-4](../../product/guarantees.md#32-work-level-failure-isolation): story eligibility,
  isolation, and failure handling depend on declared dependencies and constraints.
- [STACK-2](../../product/guarantees.md#4-stack-portability),
  [STACK-3](../../product/guarantees.md#4-stack-portability),
  [STACK-4](../../product/guarantees.md#4-stack-portability), and
  [DRIVE-2](../../product/guarantees.md#41-trusting-a-driver): agent, execution host, forge,
  and work source choices remain behind swappable seams and declared capabilities.
- [SEE-1](../../product/guarantees.md#5-full-observability) and
  [SEE-2](../../product/guarantees.md#5-full-observability): the plan must carry stable
  references the run record can cite later.

## Required Plan Properties

An execution plan must carry these properties at v0 design altitude.

### Plan Identity and Provenance

A plan must name its own identity, version posture, producing source, and track. Jig needs a
stable plan identity to bind a run to the input it executed, compare resume attempts against
the original input, and let records cite the plan without embedding every detail repeatedly.

At v0 this means the plan carries:

- a plan ID and human-readable title;
- the track identity it belongs to;
- the source or producer that authored it, when known;
- product and design references the stories were derived from, when available;
- an input version or compatibility marker so Jig can reject unknown formats instead of
  guessing.

### Track Binding

A plan is one artifact per track. It must reference the policy and work profile that govern
that track without copying every setting into each story. The plan must also be clear about
repo-level floors or inherited policy constraints the track cannot weaken.

This preserves [CFG-1](../../product/guarantees.md#2-configuration-ownership),
[CFG-2](../../product/guarantees.md#2-configuration-ownership), and
[CFG-3](../../product/guarantees.md#2-configuration-ownership): policy is the safety contract;
work profile is the realization; both are track-scoped.

### Story Set

A plan must contain the stories Jig schedules, runs, and lands. A story is one reviewable
change with its own done conditions. Each story needs enough identity, purpose, scope, and
expected change boundary for the runner to start work, inspect evidence, and report outcomes.

At v0, each story must carry:

- a stable story ID unique within the plan;
- a concise title and intent;
- references to product, design, issue, or acceptance material that explain why the story
  exists;
- the expected work boundary: files, components, capabilities, or behavior areas the story is
  intended to touch;
- any explicitly protected or rule-governing surfaces the story is expected to touch;
- dependencies on other stories in the same plan;
- its done/evidence requirements.

### Dependency and Eligibility Model

A plan must state story dependencies as a graph Jig can use for eligibility. A story is not
eligible until its prerequisites have landed, not merely started or self-reported complete.

The plan must also be able to represent independent stories so Jig can run safe parallel work
without false coupling. This is the input basis for [ISO-1](../../product/guarantees.md#32-work-level-failure-isolation)
and [ISO-4](../../product/guarantees.md#32-work-level-failure-isolation).

### Done and Evidence Requirements

A plan must describe each story's done conditions in terms Jig can evaluate under policy.
The plan does not decide whether evidence is sufficient by itself; policy does. The plan must
carry what evidence is expected and which product/design commitments it proves.

At v0, evidence requirements should be expressed as categories and references rather than a
runtime command schema:

- automated checks, such as tests, builds, lint, type checks, or configured gates;
- review requirements, such as owner or delegated reviewer approval;
- capability proof requirements, when a driver must prove an ability before autonomy;
- evidence artifacts or record references Jig should preserve;
- merge blockers that can leave a story done but not landed.

This preserves [MERGE-1](../../product/guarantees.md#15-merge-on-evidence),
[MERGE-3](../../product/guarantees.md#15-merge-on-evidence), and
[MERGE-4](../../product/guarantees.md#15-merge-on-evidence).

### Authority and Approval Needs

A plan must tell Jig what kinds of authority each story is expected to request and which
requests are known to require human approval. The plan does not grant authority; it declares
expected needs so the runner can compare worker requests to approved policy.

At v0 this means the plan can name:

- expected reversible actions;
- expected irreversible or privileged actions, such as push, PR creation, or merge, which
  remain runner-owned;
- changes to policy, verification, integration safety, credentials, or other rule-governing
  files that require explicit owner re-approval;
- known doorbell decisions that may park the story.

### Policy and Work-Profile References

The plan must reference the policy and work profile by identity and version posture. It must
not embed a mutable policy override that lets a run weaken its own guardrails. A work profile
change can tune how work is carried out, but it cannot lower the policy floor.

The plan should include enough compatibility information for Jig to reject a plan whose policy
or work profile cannot be understood in the current run context.

### Stack-Seam Requirements

The plan must identify any assumptions it makes about the four swappable product seams:
Agent, Execution Host, Forge, and Work Source. These assumptions are not driver
implementations; they are required capabilities or source references Jig must verify before
granting autonomy.

Examples include:

- the work source IDs stories came from;
- required forge capabilities for PR comments, status posting, merge queues, or protected
  branches;
- required execution-host isolation posture;
- agent or work-profile capabilities needed for a story.

Missing or failed capability proof reduces autonomy rather than weakening product guarantees.

### Constraints and Limits

A plan must carry constraints that materially affect safe scheduling and completion:

- concurrency or sequencing constraints that are stricter than the dependency graph;
- retry or budget posture when supplied by policy;
- isolation requirements for stories that must not share a workspace;
- branch, merge queue, or review-flow constraints that affect landing;
- known non-goals and out-of-scope surfaces for the run.

These constraints let Jig derive live behavior from plan plus policy, rather than asking the
worker to improvise.

## Illustrative v0 Example

This example is illustrative only. It is not a normative schema, field contract, or complete
fixture.

```json
{
  "plan": {
    "id": "plan-jig-docs-m1",
    "version": "execution-plan-shape-v0",
    "title": "Seed Jig contract design docs",
    "track": {
      "id": "jig-contract-design",
      "policyRef": "policy:jig-docs-cautious@2026-06",
      "workProfileRef": "work-profile:jig-doc-author@2026-06",
      "repoFloorRef": "repo-policy:jig-main-floor"
    },
    "source": {
      "producer": "human-approved-planning",
      "references": [
        "jig/docs/product/guarantees.md",
        ".github/MILESTONES.md#M1"
      ]
    },
    "stories": [
      {
        "id": "STORY-1",
        "title": "Describe execution-plan contract shape",
        "intent": "Give Planning a clear view of what Jig requires at its hard input boundary.",
        "scope": ["docs/design/contracts/execution-plan-contract-v0.md"],
        "dependsOn": [],
        "doneEvidence": [
          {
            "category": "automated-check",
            "name": "pnpm check"
          },
          {
            "category": "review",
            "name": "owner or delegated reviewer approval"
          }
        ],
        "authorityExpectations": {
          "workerMayRequest": ["read-files", "edit-docs", "run-checks"],
          "runnerOwned": ["push", "open-pr", "merge"],
          "doorbellIfTouched": ["policy", "verification", "credentials"]
        }
      },
      {
        "id": "STORY-2",
        "title": "Describe run-record contract shape",
        "intent": "Give Learning a clear view of what Jig records expose after a run.",
        "scope": ["docs/design/contracts/observability-records-contract-v0.md"],
        "dependsOn": ["STORY-1"],
        "doneEvidence": [
          {
            "category": "automated-check",
            "name": "pnpm check"
          }
        ]
      }
    ],
    "constraints": {
      "maxParallelStories": 1,
      "mergeQueueAware": true,
      "unknownFormatBehavior": "reject"
    }
  }
}
```

## Product Reconciliation

No conflict was found between this execution-plan v0 shape and the current Jig product docs.

The main reconciliation decision is altitude: product says a plan must carry stories,
dependencies, and done conditions, while M1 asks design to make that precise enough for
Planning without freezing a schema. This document therefore names required properties and
examples, but defers exact field names, validators, package layout, and runtime APIs.

The legacy `workflow-kit` prototype was treated as reference-only prior art. No legacy
mechanic is inherited here unless it preserves the current Jig product commitments.

## Deferred

This document does not define:

- TypeScript interfaces or JSON Schema;
- CLI flags or API endpoints for submitting a plan;
- package names, source files, or validation libraries;
- detailed policy classifier rules;
- the Technical Design handoff contract owned by the `technical-design` repo.
