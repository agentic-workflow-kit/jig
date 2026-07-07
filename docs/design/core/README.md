---
title: "Jig runtime — system overview"
status: draft — design overview
---

# Jig runtime — system overview

This is the design-layer map of jig's local runtime: the system entities, what each is
responsible for, and how they relate. It reconciles to the product commitments in
[`docs/product/`](../../product/); product owns what and why, this design owns how. Deeper
per-area detail lives in sibling files — the fixed logic here in `core/`
([`bootstrap`](./bootstrap.md), [`plan-intake`](./plan-intake.md),
[`orchestration`](./orchestration.md), [`authorization`](./authorization.md),
[`records`](./records.md)) and the edge interfaces in [`../contracts/`](../contracts/) (driving,
the two data contracts, providers).

**Terminology.** Product altitude owns the name **story** (see
[`concepts.md`](../../product/concepts.md#stories--the-unit-of-work)); the earlier design draft
called it a **task**. This design uses the neutral term **work item**, because the owner
configures their own label — story, task, ticket, whatever fits their tracker. Story, task, and
work item are the same unit: what jig schedules, runs, and lands. This is a deliberate, recorded
design-layer naming choice, not a silent divergence.

## The relations, at a glance

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Inter, Arial, sans-serif",
    "primaryTextColor": "#2b2b2b",
    "lineColor": "#8a8882",
    "edgeLabelBackground": "#ffffff",
    "clusterBkg": "#fbfaf7",
    "clusterBorder": "#b8b8b1",
    "clusterTextColor": "#2b2b2b"
  },
  "flowchart": {
    "htmlLabels": false,
    "curve": "linear",
    "nodeSpacing": 60,
    "rankSpacing": 55
  }
}}%%
flowchart TB

  owner("`**Owner / operator**
authors + decides`")

  subgraph config["Configuration — you author, per track"]
    direction LR

    track("`**Track**
one line of work`")
    plan("`**Execution plan**
work items + deps`")
    policy("`**Policy**
safety contract`")
    profile("`**Work profile**
how work is done`")

    track ~~~ plan ~~~ policy ~~~ profile
  end

  subgraph core["Jig-core — the trusted runner (governs the seams)"]
    direction LR

    runner("`**Runner**
		orchestrates + enforces`")
    fence("`**Fence**
grants or denies`")
    doorbell("`**Doorbell**
escalates to you`")
    records("`**Run records**
the evidence log`")

    runner ~~~ fence ~~~ doorbell ~~~ records
  end

  subgraph reviewLane["Governed acceptance lane — independent assessment"]
    direction LR

    review("`**Verifier / reviewer**
policy-owned verdict`")
  end

  subgraph seams["Seams — swappable, governed at the boundary"]
    direction LR

    worker("`**Agent / worker**
writes code`")
    host("`**Execution host**
runs the worker`")
    forge("`**Forge**
push / PR / merge`")
    source("`**Work source**
supplies work items`")

    worker ~~~ host ~~~ forge ~~~ source
  end

  subgraph legend[" "]
    direction LR

    l1(" ")
    lt1["you author"]

    l2(" ")
    lt2["jig-core (trusted)"]

    l3(" ")
    lt3["governed lane"]

    l4(" ")
    lt4["swappable seam"]

    l5(" ")
    lt5["you"]

    l1 ~~~ lt1 ~~~ l2 ~~~ lt2 ~~~ l3 ~~~ lt3 ~~~ l4 ~~~ lt4 ~~~ l5 ~~~ lt5
  end

  owner -->|authors, starts| config
  config -->|plan + policy| core
  core -->|invokes when policy requires| reviewLane
  reviewLane -->|verdict / evidence| core
  core -->|drives + governs| seams
  seams ~~~ legend

  classDef ownerBox fill:#f6f4ed,stroke:#77736d,stroke-width:2px,color:#2b2b2b,rx:16,ry:16;
  classDef youAuthor fill:#eeeeff,stroke:#5549d8,stroke-width:2px,color:#29226f,rx:16,ry:16;
  classDef trusted fill:#e3f6f0,stroke:#007a62,stroke-width:2px,color:#003f34,rx:16,ry:16;
  classDef governed fill:#f5eefc,stroke:#6b3fa0,stroke-width:2px,color:#32194f,rx:16,ry:16;
  classDef seam fill:#fff0ea,stroke:#a43f22,stroke-width:2px,color:#4d1f12,rx:16,ry:16;

  classDef legendAuthor fill:#eeeeff,stroke:#5549d8,stroke-width:2px,color:#29226f,rx:6,ry:6;
  classDef legendTrusted fill:#e3f6f0,stroke:#007a62,stroke-width:2px,color:#003f34,rx:6,ry:6;
  classDef legendGoverned fill:#f5eefc,stroke:#6b3fa0,stroke-width:2px,color:#32194f,rx:6,ry:6;
  classDef legendSeam fill:#fff0ea,stroke:#a43f22,stroke-width:2px,color:#4d1f12,rx:6,ry:6;
  classDef legendYou fill:#f6f4ed,stroke:#77736d,stroke-width:2px,color:#2b2b2b,rx:6,ry:6;
  classDef legendText fill:transparent,stroke:transparent,color:#666666;

  class owner ownerBox;
  class track,plan,policy,profile youAuthor;
  class runner,fence,doorbell,records trusted;
  class review governed;
  class worker,host,forge,source seam;

  class l1 legendAuthor;
  class l2 legendTrusted;
  class l3 legendGoverned;
  class l4 legendSeam;
  class l5 legendYou;
  class lt1,lt2,lt3,lt4,lt5 legendText;

  style config fill:#fbfaf7,stroke:#b8b8b1,stroke-width:2px,color:#2b2b2b,rx:18,ry:18
  style core fill:#fbfaf7,stroke:#b8b8b1,stroke-width:2px,color:#2b2b2b,rx:18,ry:18
  style reviewLane fill:#fbfaf7,stroke:#b8b8b1,stroke-width:2px,color:#2b2b2b,rx:18,ry:18
  style seams fill:#fbfaf7,stroke:#b8b8b1,stroke-width:2px,color:#2b2b2b,rx:18,ry:18

  style legend fill:transparent,stroke:transparent,color:transparent
```

## How a run flows

The map above is the _structure_ — who owns what. This is the _flow_ — how one run moves through
the system in two phases. **Bootstrap / init** composes and launches a run: load and validate the
plan, bind the policy (frozen at launch), wire the providers, and allocate run identity. The
**core loop** then drives each eligible work item through the fence, records the outcome, and
lands only on evidence. The four provider seams are drawn here as one abstracted boundary; their
detail lives in [`../contracts/providers.md`](../contracts/providers.md).

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Inter, Arial, sans-serif",
    "primaryTextColor": "#2b2b2b",
    "lineColor": "#8a8882",
    "edgeLabelBackground": "transparent",
    "clusterBkg": "#fbfaf7",
    "clusterBorder": "#b8b8b1",
    "clusterTextColor": "#2b2b2b"
  },
  "flowchart": {
    "htmlLabels": false,
    "curve": "linear",
    "nodeSpacing": 60,
    "rankSpacing": 35,
    "subGraphTitleMargin": {
      "top": 0,
      "bottom": 0
    },
    "defaultRenderer": "elk"
  }
}}%%
flowchart TB

  drive("`**Drive run**
start`")

  subgraph row2[" "]
    direction LR
    planRej("`**Plan rejected**
no run
 `") ~~~ boot("`**Bootstrap / init**
load, validate, bind,
wire, identify, ready`") ~~~ records("`**Run records**
append-only;
every phase writes
 `")

    boot -.->|invalid| planRej
    boot -.->|writes| records
  end
  style row2 fill:#fbfaf7,stroke:#d6d2c8,stroke-width:1px,color:transparent,rx:18,ry:18

  subgraph row3[" "]
    direction LR
    doorbell("`**Doorbell**
owner decides
 `") ~~~ core("`**Core loop**
drive each work item,
fence, record, land`") ~~~ prov("`**Providers (seams)**
abstracted: agent,
host, forge, source`")

    core <-.->|route| doorbell
    core <-.-> prov
  end
  style row3 fill:#fbfaf7,stroke:#d6d2c8,stroke-width:1px,color:transparent,rx:18,ry:18

  runComp("`**Run completed**
or stopped`")

  subgraph legend[" "]
    direction LR
    l1(" ")
    lt1["bootstrap phase"]
    l2(" ")
    lt2["core phase"]
    l3(" ")
    lt3["providers"]
    l1 ~~~ lt1 ~~~ l2 ~~~ lt2 ~~~ l3 ~~~ lt3
  end
  style legend fill:transparent,stroke:transparent,color:transparent

  drive --> row2
  row2 --> row3
  row3 --> runComp
  runComp ~~~ legend

  classDef commonBox fill:#f6f4ed,stroke:#77736d,stroke-width:2px,color:#2b2b2b,rx:16,ry:16;
  classDef bootstrapBox fill:#eeeeff,stroke:#5549d8,stroke-width:2px,color:#29226f,rx:16,ry:16;
  classDef coreBox fill:#e3f6f0,stroke:#007a62,stroke-width:2px,color:#003f34,rx:16,ry:16;
  classDef providersBox fill:#fff0ea,stroke:#a43f22,stroke-width:2px,color:#4d1f12,rx:16,ry:16;
  classDef legendBootstrap fill:#eeeeff,stroke:#5549d8,stroke-width:2px,color:#29226f,rx:6,ry:6;
  classDef legendCore fill:#e3f6f0,stroke:#007a62,stroke-width:2px,color:#003f34,rx:6,ry:6;
  classDef legendProviders fill:#fff0ea,stroke:#a43f22,stroke-width:2px,color:#4d1f12,rx:6,ry:6;
  classDef legendText fill:transparent,stroke:transparent,color:#666666;

  class drive,planRej,records,doorbell,runComp commonBox;
  class boot bootstrapBox;
  class core coreBox;
  class prov providersBox;
  class l1 legendBootstrap;
  class l2 legendCore;
  class l3 legendProviders;
  class lt1,lt2,lt3 legendText;
```

## Responsibilities, by group

### A. Configuration — the owner's inputs (per track)

| Entity            | Responsibility (owns)                                                                                                                                                                                       | Product IDs            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Track             | One independent line of work; carries its own plan + policy + work profile; isolates parallel work so one area never falsely gates another.                                                                 | concepts; CFG-3        |
| Execution plan    | Jig's one hard input. A set of work items + their dependencies + each item's done conditions. One plan per track.                                                                                           | jig.md                 |
| Work item         | The unit jig executes and lands: one reviewable change with its own done conditions; declares dependencies on other items.                                                                                  | concepts               |
| Policy            | The safety/governance contract: gating posture, merge spectrum, concurrency ceiling, retries, required reviews, approvals, escalation, anti-gaming floor, and the manual-to-assisted dial. Fixed at launch. | CFG-1, CFG-10, GUARD-1 |
| Repo-level floors | Repo-scoped policy every track inherits; a track may tighten but never weaken; changing it is itself governed.                                                                                              | CFG-3                  |
| Work profile      | The realization: model, effort, prompt strategy, role realization. Freely tunable — it never lowers the safety floor.                                                                                       | CFG-2                  |

The domain model of this group — each entity's owns / reads / does-not-own, the Track-level relations, and the lifecycle terms it carries — is authored in [`../domain/configuration-and-work.md`](../domain/configuration-and-work.md).

### B. Jig-core — the trusted runner (governs the seams)

| Entity                 | Responsibility (owns)                                                                                                                                                                                                                                                                                                             | Product IDs                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Operator surface       | The thin entry point (CLI / MCP / SDK / embed) the owner drives jig through: one command becomes one control-plane call with SDK/operator-owned records; the edge holds no run logic and imports no provider contracts.                                                                                                           | jig.md; SEE-1                             |
| Runner                 | Jig's trusted orchestrator. Resolves eligibility/order, drives each work item, invokes governed review/verification lanes when implemented and policy requires them, holds credentials and the sole authority to push/PR/merge, and performs irreversible actions only under policy + evidence. Governs the seams; is not a seam. | concepts; FENCE-3, MERGE-2, SEC-3         |
| Fence                  | Runtime authorization: authorizes every worker request before it executes, fail-closed; grant / deny / route by fixed category; cannot be loosened mid-run.                                                                                                                                                                       | FENCE-1, FENCE-2, GUARD-1, CFG-10         |
| Doorbell               | Escalation surface: routes ambiguous/risky/unproven actions to the owner; parks durably (survives interruption); grants are narrow, not blanket.                                                                                                                                                                                  | DOOR-1, DOOR-2, DOOR-3                    |
| Capability attestation | Earned-trust gate: requires fresh, positive proof a driver can perform a capability safely; missing or stale proof means less autonomy, not a weaker guarantee.                                                                                                                                                                   | EARN-1, EARN-2, STACK-4, DRIVE-1, DRIVE-3 |
| Review lane            | Governed assessment lane selected by launch-bound policy/configuration. Emits a verdict or evidence assessment for the runner/policy to consume; does not land work, hold forge credentials, redefine policy, or transition lifecycle directly.                                                                                   | MERGE-1, MERGE-3, CFG-1                   |
| Run records            | Durable, ordered, structured records — the evidence itself; state/summary/metrics are pure projections of an append-only log; exportable write-once, redacted. The source of notices and "ask why."                                                                                                                               | SEE-1..6                                  |

The review lane boundary is settled by
[ADR 0034](../decisions/0034-acceptance-review-lane.md): it is governed evidence, not Jig-core,
Worker, Forge, Owner/Doorbell, or a fifth provider seam.

Operator-surface detail (the CLI / SDK / embed contract) lives in
[`../contracts/driving.md`](../contracts/driving.md).

### C. The four seams — swappable, governed at the authority boundary

| Entity           | Responsibility (owns)                                                                                                                                               | Product IDs                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Agent (= worker) | The contained coding agent: reads a work item, writes code, runs checks, reports. Holds no credentials; cannot push/PR/merge or widen its own authority.            | concepts; FENCE-3                |
| Execution host   | Where the worker runs; provides isolation/containment and reports its isolation strength honestly; local-first today.                                               | STACK-2, STACK-5, DRIVE-3, ISO-4 |
| Forge            | Deterministic adapter for runner-invoked push/PR/status/comment/merge operations; respects branch protection and merge queues; where a block surfaces as a real PR. | STACK-2, MERGE-5                 |
| Work source      | Where work items originate (an extension seam; the plan is the hard input).                                                                                         | STACK-2                          |

### D. What you observe (run artifacts)

| Entity   | Responsibility (owns)                                                                                                                 | Product IDs      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Run      | One execution of a plan under a policy; reconstructible end to end.                                                                   | jig.md           |
| Evidence | What gates landing — automated checks + governed review/acceptance verdicts + capability proof; never the worker's self-report alone. | MERGE-1, MERGE-3 |
| Notice   | A triaged attention item per parked/blocked/stale/overdue condition: what it is, how urgent, what you can do now.                     | SEE-5            |

The domain model of this group — Run, Evidence, Notice, and the Run-records event-log entity they derive from, each with its owns / reads / does-not-own, the runtime seam, and the lifecycle terms it carries — is authored in [`../domain/runtime-and-observation.md`](../domain/runtime-and-observation.md).

## The spine in one paragraph

The owner authors a track (plan + policy + work profile) and starts a run through the operator
surface (one command, one control-plane call, SDK/operator-owned records). The runner binds the
policy at launch, resolves which work items are eligible from their dependencies, and drives each
by handing work to the worker (the agent seam) running inside the execution host. Every action the
worker wants goes through the fence, which grants, denies, or routes it by fixed category; routed
or risky calls ring the doorbell for the owner. When launch-bound policy/configuration requires an
implemented acceptance lane, the runner consumes the verifier/reviewer verdict as evidence input.
The runner — never the worker — pushes, opens PRs, and merges through the forge, and only on
policy-sufficient evidence. Every decision lands in run records, from which the owner inspects,
asks "why," and works a queue of notices.

## The two lifecycles

- **Work item:** eligible → started → parked _(transient)_ → done / landed / rejected / blocked
- **Run:** previewed → started → stopped / resumed / completed

`stopped` is a run-level state, not a work-item outcome: a stop pauses the whole run, while
work items that had not reached a terminal outcome stay where they were and resume from their
last safe checkpoint (see [`concepts.md`](../../product/concepts.md#story-and-run-outcomes)).
