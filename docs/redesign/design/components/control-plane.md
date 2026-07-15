---
title: "Control plane — component view of the run controller"
purpose: Decompose RT-CONTROLLER into its nine internal components, allocate each Jig Control power to exactly one component, and show the trigger-decision-record-dispatch cycle and recovery path inside the unit.
audience:
  - Engineers and architects realizing or reviewing the controller
  - Arye Kogan, Jig product and architecture decision owner
scope: Level 3 component responsibilities, power ownership, interaction rules, and the V7 internal view of RT-CONTROLLER; schemas, algorithms, numeric budgets, storage technology, and provider contracts are excluded.
state: proposed
status: proposed Layer 2 content, authored 2026-07-15 under the owner continuation instruction; pending the Layer 2 independent review
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../runtime.md
  - ../decisions/D10-runtime-decomposition.md
  - ../decisions/D3-responsibilities-trust-authority.md
  - ../decisions/D9-invariants-and-artifact-shape.md
  - ../perspectives/authority-and-trust.md
  - ../flows/run-and-story-lifecycle.md
  - ../state-and-recovery.md
  - ../concurrency-and-finalization.md
related:
  - ../data-and-identity.md
  - ../scheduling-and-bounds.md
  - ../persistence-and-projections.md
  - ../mechanism-and-provider-contracts.md
---

# Control plane — component view of the run controller

This page opens one runtime unit: `RT-CONTROLLER` from the
[runtime architecture](../runtime.md). It consumes
[D9 category 1](../decisions/D9-invariants-and-artifact-shape.md) (component decomposition) and
realizes the power ownership that [D3](../decisions/D3-responsibilities-trust-authority.md)
explicitly did not defer: every Jig Control power lands in exactly one named component. Package
and module structure inside the unit remains a D10 realization deferral.

## Component responsibilities

| ID              | Component                      | Responsibility                                                                                                                                                        | Realizes (Layer 1)                                                                                        | Ports touched                                                                                                                                    |
| --------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CP-INTAKE`     | Intake and preflight           | Validates the submitted envelope, assigns stable Run identity, runs deterministic preflight, and freezes the Run definition or rejects durably.                       | `RUN-RECEIVED`, `RUN-PREFLIGHT`, `RUN-REJECTED` (V3); the frozen-envelope binding of the canonical model. | `PORT-INTAKE` (inbound, behind `CP-MEDIATOR`).                                                                                                   |
| `CP-TRANSITION` | Transition engine              | Executes the single-transition cycle for every accepted trigger: validate against lifecycle position, decide deterministically, record, then adopt and dispatch.      | `FLOW-VALIDATE`, `FLOW-DECIDE`, `FLOW-RECORD`, `FLOW-ADOPT` (V3c); I4, I5.                                | `PORT-LEDGER` (sole writer; conditional ordered appends).                                                                                        |
| `CP-SCHEDULER`  | Scheduler                      | Derives eligibility from the projection and admits work within scarce resource-class capacity using the immutable total comparator; proposes admission triggers only. | `C-CAPACITY`, `C-ORDER` (V4); I10, I11.                                                                   | None directly; in-process proposals to `CP-TRANSITION`.                                                                                          |
| `CP-FINALIZER`  | Finalization authority manager | Manages the single target-scoped finalization authority: grant in deterministic order, fence binding, bounded refresh, rebinding, and release.                        | `C-FINALIZER` (V4); I12.                                                                                  | None directly; authorized target effects dispatch through `CP-MEDIATOR`.                                                                         |
| `CP-MEDIATOR`   | Mechanism mediator             | The trust boundary inside the unit: dispatches authorized operations to mechanism ports and validates every inbound port message before it can become a trigger.      | `R-VALIDATE` (V2); I7.                                                                                    | `PORT-SESSION`, `PORT-WORKSPACE`, `PORT-VERIFY`, `PORT-DELIVERY`, `PORT-ARTIFACT`; inbound gate for every port except `PORT-LEDGER` (see below). |
| `CP-EVIDENCE`   | Evidence binder                | Assembles evidence manifests, binds each artifact to its exact subject, persists immutable artifacts, and validates availability and integrity before decision use.   | `A-EVIDENCE` roles and the exact-subject binding of `A-CANDIDATE` (V4); I7.                               | `PORT-ARTIFACT` through `CP-MEDIATOR` (immutable writes; digest-verified reads).                                                                 |
| `CP-ESCALATION` | Escalation and parking         | Owns durable parked named questions, validates the responder and delegated scope of each owner decision, and turns valid decisions into wake triggers.                | `RUN-PARK` (V3) and the owner-decision identity binding of the canonical model.                           | `PORT-DECIDE` (questions out; validated decisions in, behind `CP-MEDIATOR`).                                                                     |
| `CP-RECOVERY`   | Recovery and reconciliation    | Acquires the controller generation, fences stale control, reconstructs canonical state from the ledger, and reconciles uncertain operations before dispatch resumes.  | `S-RECOVERY`, `FLOW-RECONCILE` (V4, V3c); I6, I17.                                                        | `PORT-LEDGER` (verified reads through the transition engine's commit protocol); reconciliation observations through `CP-MEDIATOR`.               |
| `CP-PROJECTION` | Projection and read models     | Maintains the live projection and derived read models recomputed from adopted durable facts; read-only, replaceable, and never independently authoritative.           | `S-PROJECTION`, `S-DERIVED` (V4).                                                                         | `PORT-PUBLISH` (read-only publication out).                                                                                                      |

## Power ownership realized

D3 fixed who owns each power; this table places each power inside the unit without redistributing it.

| Power (V2)          | Owning component | Realization rule                                                                                                                                                                                                                                                                   |
| ------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorize           | `CP-TRANSITION`  | Operation intents exist only inside a recorded Transition; `CP-SCHEDULER` and `CP-FINALIZER` propose.                                                                                                                                                                              |
| Decide              | `CP-TRANSITION`  | `FLOW-DECIDE` is calculated deterministically from authoritative state and one ordered trigger (I4).                                                                                                                                                                               |
| Record              | `CP-TRANSITION`  | `FLOW-RECORD` is the only conditional append path through `PORT-LEDGER` (I5).                                                                                                                                                                                                      |
| Reconcile           | `CP-RECOVERY`    | Reconciliation outcomes still enter durable truth only as triggers appended through `CP-TRANSITION`.                                                                                                                                                                               |
| Boundary validation | `CP-MEDIATOR`    | `R-VALIDATE` at every mediated Operation port; the `PORT-LEDGER` commit primitive receives the equivalent validation inside `CP-TRANSITION`'s commit protocol and `CP-RECOVERY`'s verified reads; `CP-TRANSITION` also revalidates lifecycle position inside `FLOW-VALIDATE` (I7). |

## Interaction rules

- Every lifecycle state change routes through `CP-TRANSITION`, the sole writer through
  `PORT-LEDGER`, so record-before-adopt/dispatch (I5) has exactly one enforcement point.
- `CP-MEDIATOR` is the sole gatekeeper for inbound messages on every port except `PORT-LEDGER` —
  including the storage port `PORT-ARTIFACT`, whose mechanism acts under a per-Operation `CB-STORE`
  capability binding and whose responses are validated like any other attestation. A message that
  fails identity, role, exact-subject, lifecycle, fence, or capability validation creates no
  trigger and no fact.
- `PORT-LEDGER` is the one deliberate exception, because its conditional append is the commit
  primitive that records Transitions and cannot itself be a mediated Operation
  ([persistence and projections](../persistence-and-projections.md)). Its equivalent validation is
  built in where the port is used: the transition engine's commit protocol is the single
  ledger-primitive validator and `CB-STORE` binding minter for appends and verified reads alike,
  validating identity, expected position, and digests under the `LG-*` clauses; `CP-RECOVERY`
  performs its verified reads through that same protocol facility rather than owning a second
  validator. This narrows the mediator claim of
  [D12](../decisions/D12-mechanism-contract-model.md) explicitly rather than silently.
- `CP-PROJECTION` is read-only and replaceable. Any component may read it; none may treat it as
  authority; losing it loses nothing durable.
- `CP-RECOVERY` runs first on every controller start and restart: generation acquisition, ledger
  verification, reconstruction, and reconciliation complete before any dispatch (I6, I17); it
  alone owns reconciliation, and no other component retries an uncertain effect.
- `CP-ESCALATION` owns durable parked questions and validates each owner decision's responder and
  recorded scope before the decision becomes a trigger; an invalid decision changes nothing.
- Components communicate in-process only by proposing triggers to `CP-TRANSITION` and reading
  `CP-PROJECTION`; no component mutates another component's state. This is the immutability
  posture: shared truth advances only by recorded transition.

The rejected alternative — one monolithic control loop without internal seams — would make power
ownership, the trust boundary, and the recovery-first rule conventions rather than contracts.

## View V7 — control-plane components

- **Question:** How is `RT-CONTROLLER` internally organized, and how do its components carry one
  trigger through validation, decision, record, dispatch, and recovery?
- **View type:** Component view (Level 3) of one runtime unit.
- **Audience and purpose:** Engineers and architects realizing or reviewing the controller; see the
  internal seams and the single authority path before opening schemas or algorithms.
- **Scope and exclusions:** The nine components, their in-process relationships, and the port
  endpoints at the unit edge. Schemas, algorithms, budgets, storage, and provider detail are
  excluded and owned by the sibling pages.
- **State:** Proposed.
- **Owner:** Arye Kogan.
- **Sources:** D3, D9 category 1, D10; I4–I7, I10–I12, I17; V2, V3c, V4, [V6](../runtime.md).
- **Related views:** [V6](../runtime.md) places this unit among the runtime units; V3c defines the
  transition cycle this view distributes across components.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, ui-sans-serif, system-ui", "primaryTextColor": "#172033", "lineColor": "#65758b"}}}%%
flowchart LR
    subgraph Ports["Named ports at the unit edge"]
        PIntake["PORT-INTAKE<br/>Envelope intake<br/>[Port]"]
        PDecide["PORT-DECIDE<br/>Owner decision<br/>[Port]"]
        PMech["PORT-SESSION · PORT-WORKSPACE<br/>PORT-VERIFY · PORT-DELIVERY<br/>[Mechanism ports]"]
        PLedger["PORT-LEDGER<br/>Ledger commit and read<br/>[Port]"]
        PArtifact["PORT-ARTIFACT<br/>Artifact persistence<br/>[Port]"]
        PPublish["PORT-PUBLISH<br/>Read-only publication<br/>[Port]"]
    end

    subgraph Controller["RT-CONTROLLER internals"]
        subgraph Boundary["Boundary and mediation"]
            Mediator["CP-MEDIATOR<br/>Mechanism mediator<br/>[Trust-boundary component]"]
            Intake["CP-INTAKE<br/>Intake and preflight<br/>[Component]"]
        end
        subgraph Core["Deterministic core"]
            Transition["CP-TRANSITION<br/>Transition engine<br/>[Sole decide-record component]"]
            Scheduler["CP-SCHEDULER<br/>Scheduler<br/>[Component]"]
            Finalizer["CP-FINALIZER<br/>Finalization authority manager<br/>[Component]"]
        end
        subgraph Support["Supporting components"]
            Evidence["CP-EVIDENCE<br/>Evidence binder<br/>[Component]"]
            Escalation["CP-ESCALATION<br/>Escalation and parking<br/>[Component]"]
            Recovery["CP-RECOVERY<br/>Recovery and reconciliation<br/>[Recovery component]"]
            Projection["CP-PROJECTION<br/>Projection and read models<br/>[Read-only component]"]
        end
    end

    PIntake -->|"delivers envelope submissions to"| Mediator
    PDecide -->|"returns scoped owner decisions to"| Mediator
    PMech -->|"returns attestations and effect certainty to"| Mediator
    Mediator -->|"routes validated envelopes to"| Intake
    Intake -->|"proposes preflight and freeze triggers to"| Transition
    Mediator -->|"supplies validated result triggers to"| Transition
    Mediator -->|"routes validated owner decisions to"| Escalation
    Mediator -->|"hands attested evidence to"| Evidence
    Escalation -->|"proposes wake triggers to"| Transition
    Escalation -->|"parks durable named questions via"| PDecide
    Scheduler -->|"proposes admission triggers to"| Transition
    Finalizer -->|"proposes authority grant and rebinding triggers to"| Transition
    Evidence -->|"requests artifact puts and digest-verified gets through"| Mediator
    Mediator -->|"performs validated artifact persistence via"| PArtifact
    Evidence -->|"returns integrity-validated manifests to"| Transition
    Transition -->|"commits ordered decisions and intents via"| PLedger
    Transition -->|"hands authorized operations for dispatch to"| Mediator
    Mediator -->|"dispatches scoped operations via"| PMech
    Transition -->|"feeds adopted facts to"| Projection
    Projection -->|"supplies derived eligibility and order to"| Scheduler
    Projection -.->|"publishes read models via"| PPublish
    Recovery -.->|"fences and reconstructs through verified reads of"| PLedger
    Recovery -.->|"reconciles uncertain effects through"| Mediator
    Recovery -.->|"resubmits reconciled triggers to"| Transition

    style Ports fill:#f3edff,stroke:#8a6eb0,color:#172033
    style Controller fill:#fff6dd,stroke:#b8903a,color:#172033
    style Boundary fill:#eef5ff,stroke:#7a96bd,color:#172033
    style Core fill:#fff1cf,stroke:#a8781f,color:#172033
    style Support fill:#f4f5f7,stroke:#7c8798,color:#172033
    classDef port fill:#f1e9ff,stroke:#8061a8,color:#172033
    classDef trust fill:#fff7df,stroke:#a8781f,color:#172033
    classDef component fill:#e8f1ff,stroke:#5a78a8,color:#172033
    classDef core fill:#fff1cf,stroke:#a8781f,color:#172033
    classDef authority fill:#fff1cf,stroke:#a8781f,stroke-width:3px,color:#172033
    classDef evidence fill:#e8f7ed,stroke:#4f8a63,color:#172033
    classDef recovery fill:#fce8e6,stroke:#a7615b,stroke-dasharray:5 3,color:#172033
    classDef readonly fill:#f4f5f7,stroke:#7c8798,stroke-dasharray:5 3,color:#172033
    class PIntake,PDecide,PMech,PLedger,PArtifact,PPublish port
    class Mediator trust
    class Intake,Escalation component
    class Transition authority
    class Scheduler,Finalizer core
    class Evidence evidence
    class Recovery recovery
    class Projection readonly
```

**V7 legend:** All nodes are rectangles: purple `PORT-*` nodes are the named port endpoints at the
unit edge (the grouped mechanism-ports node keeps this view at one level; each port keeps its own
identity in the [runtime architecture](../runtime.md)); every `CP-*` node is one controller
component. The thick yellow border marks `CP-TRANSITION`, the only component that decides, records,
and authorizes; the pale-yellow `CP-MEDIATOR` is the trust boundary; yellow core nodes propose but
never record; blue nodes are ordinary components; green is the evidence binder. Solid arrows are
the normal trigger, decision, record, and dispatch cycle. Dashed borders and dashed lines carry
only two meanings: the red `CP-RECOVERY` recovery/reconciliation path and the gray `CP-PROJECTION`
read-only publication. Color is redundant with IDs and bracketed types. `CP` means control-plane
component and `PORT` a named port.

## What this component view deliberately excludes

- Identity forms and record schemas crossing these seams: [data and identity](../data-and-identity.md).
- Algorithms and budget classes: [scheduling and bounds](../scheduling-and-bounds.md).
- Storage and projection realization: [persistence and projections](../persistence-and-projections.md).
- What each mechanism behind `CP-MEDIATOR`'s ports must guarantee:
  [mechanism and provider contracts](../mechanism-and-provider-contracts.md).

## Where to go next

- The unit this view opens, its ports, and its process model: [runtime architecture](../runtime.md).
- Why this unit and port shape was selected: [D10 — runtime decomposition](../decisions/D10-runtime-decomposition.md).
- The fixed power allocation this view realizes:
  [D3 — responsibilities, trust, and authority](../decisions/D3-responsibilities-trust-authority.md).
