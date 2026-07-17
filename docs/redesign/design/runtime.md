---
title: "Runtime architecture — decomposition, ports, and processes"
purpose: Decompose SYS-JIG into its runtime units, name every port through which the outside world is reached, and define the process and deployment model that preserves single-authority control.
audience:
  - Engineers, architects, security, and operations readers
  - Arye Kogan, Jig product and architecture decision owner
scope: Level 2 runtime units, named ports, the process model, and the single-host deployment shape; component internals, schemas, algorithms, provider technology, and operational tooling are excluded.
state: approved
status: owner-approved 2026-07-17 readiness-remediation candidate; product-readiness lock inactive pending merge and renewed independent exact-candidate review
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ./context.md
  - ./model.md
  - ./decisions/D2-system-boundary.md
  - ./decisions/D10-runtime-decomposition.md
  - ./decisions/D13-envelope-production-boundary.md
related:
  - ./envelope-production.md
  - ./components/control-plane.md
  - ./data-and-identity.md
  - ./persistence-and-projections.md
  - ./mechanism-and-provider-contracts.md
---

# Runtime architecture — decomposition, ports, and processes

This page decomposes `SYS-JIG` from the [system context](./context.md) one level. It consumes the
Layer 2 mandate of [D9 category 1](./decisions/D9-invariants-and-artifact-shape.md) and the D2
deferral of port and process decomposition. The decomposition rule follows
[D10](./decisions/D10-runtime-decomposition.md): **a modular single-authority runtime** — one
deterministic controller process per Run, passive durable stores, a thin operator interface, and
named ports as the only crossings of the authority-and-proof boundary.

The Jig product also ships the bounded Envelope Builder described in
[envelope production](./envelope-production.md). It realizes V1's `X-ENVELOPE` outside
`SYS-JIG`'s decision-authority boundary and reaches Work Source providers through `PORT-SOURCE`.
It is deliberately not a seventh D10 runtime unit: it authors and submits immutable input, while
the six units below realize the trusted Run authority core. Sharing an executable or installation
with `RT-OPERATOR` cannot move the builder inside the authority boundary.

## Runtime units

| ID              | Runtime unit              | Type         | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RT-OPERATOR`   | Operator interface        | Runtime unit | Implements the private first-party `PORT-CONSUMER` facade and hosts pre-controller `CP-INTAKE`. Intake's only durable write is the `LG-INTAKE` acknowledgement conditional-create; after an **accepted** acknowledgement exists, the operator idempotently creates the derived Run ledger and spawns the controller. A rejected acknowledgement permits neither action. The unit otherwise delegates commands and presents durable outcomes; it holds no lifecycle authority. |
| `RT-CONTROLLER` | Run controller            | Runtime unit | The single active Jig Control process for one Run: it validates, decides, records, dispatches, and reconciles under its controller generation.                                                                                                                                                                                                                                                                                                                                |
| `RT-LEDGER`     | Run ledger store          | Data store   | Holds one Run's durable ordered Transition ledger and durable control facts; passive data at rest with no decision behavior.                                                                                                                                                                                                                                                                                                                                                  |
| `RT-EVIDENCE`   | Immutable artifact store  | Data store   | Holds bounded evidence and configuration artifacts, plus terminal audit exports, referenced by digest from the ledger; passive data at rest with no decision behavior.                                                                                                                                                                                                                                                                                                        |
| `RT-REGISTRY`   | Target-authority registry | Data store   | Holds the durable cross-Run waiter and target-authority order keyed by `ID-TARGET`; grants only the comparator-least eligible recorded waiter, atomically rebinds Candidate-changing refreshes, and is the registry-first authority of record on recovery.                                                                                                                                                                                                                    |
| `RT-WITNESS`    | Currency witness store    | Data store   | Holds the `LG-WITNESS` heads for the Run ledgers, registry, and `LG-INTAKE` intake-index head, on storage whose trust is independent of `RT-LEDGER` and its backups; intake-index recovery is witness-verified readback. Where no independent witness is configured, autonomous restore is traded for a deliberate stop, including intake recovery.                                                                                                                           |

Rules the units must preserve:

- `RT-CONTROLLER` is the only unit that exercises Jig Control's Authorize, Decide, Record, and
  Reconcile powers (I3). `RT-OPERATOR` proposes triggers and reads projections; it can never
  advance lifecycle state directly.
- Every store is passive. Authority lives in the recorded content and its ordering, not in store
  behavior (I5); the storage technology below each store remains a replaceable external mechanism
  (`X-STORE`) behind `PORT-LEDGER` and `PORT-ARTIFACT`.
- Exactly one controller process is active per Run, enforced by the durable controller generation
  rather than by deployment convention (I6); a second controller instance is fenced, not merged.

## Named ports

Every interaction between Jig and the outside world crosses exactly one named port. A port is a
semantic contract owned by Jig, not a transport: transports, encodings, and provider protocols are
selected per configured mechanism in
[mechanism and provider contracts](./mechanism-and-provider-contracts.md).

| ID               | Port                            | Faces (V1)                                                                                                                | Carries                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT-CONSUMER`  | First-party consumer API facade | CLI, private MCP adapter, SDK                                                                                             | Versioned first-party preview/start commands, inspection reads, decision entry, and export retrieval. Preview invokes the Envelope Builder effect-free; core commands delegate to `PORT-INTAKE`, `PORT-DECIDE`, or `PORT-PUBLISH` without bypassing them. Each authenticated caller binds to exactly one configured `ID-PRINCIPAL` or fails closed.                                                                                                                                          |
| `PORT-INTAKE`    | Envelope intake                 | `X-ENVELOPE`                                                                                                              | Composition-digest-keyed conditional-create submission in; byte-equivalent durable `SCH-INTAKE-ACK`, existing `ID-RUN` on duplicate/lost-ack lookup, and preflight outcome out.                                                                                                                                                                                                                                                                                                              |
| `PORT-DECIDE`    | Human decision                  | `P-OWNER`                                                                                                                 | Parked questions and provider human requests out; grant-aware answers, Run suspend/resume/terminal-stop decisions, delegation-grant changes, and notice acknowledgement/snooze events in. Each authenticated caller binds to exactly one configured `ID-PRINCIPAL` or fails closed.                                                                                                                                                                                                          |
| `PORT-SESSION`   | Role session                    | Session mechanisms hosting `P-IMPLEMENTER`/`P-REVIEWER`: the Agent provider or a qualified human-client session mechanism | Bounded role assignments and scoped Doorbell answers out; attributable results, self-reports, verdicts, liveness, and human-needed provider requests in.                                                                                                                                                                                                                                                                                                                                     |
| `PORT-WORKSPACE` | Workspace effects               | `X-WORKSPACE`                                                                                                             | Authorized isolation and repository effects out; content, basis, cleanliness, and preservation facts in.                                                                                                                                                                                                                                                                                                                                                                                     |
| `PORT-VERIFY`    | Verification                    | `X-VERIFY`                                                                                                                | Authorized exact-subject check requests out; check observations in.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `PORT-DELIVERY`  | Delivery and target             | `X-DELIVERY`                                                                                                              | Disjoint review-publication `OPC-REV-*` effects and finalization/landing `OPC-DEL-*` effects out; target, gate, effect-certainty, request, and landing facts in. Review scope can never invoke target-changing classes.                                                                                                                                                                                                                                                                      |
| `PORT-LEDGER`    | Ledger commit and read          | `X-STORE`                                                                                                                 | Conditional ordered appends and verified reads of Run/registry authority, witness heads, and the deployment-scoped digest-to-intake-acknowledgement index `LG-INTAKE`.                                                                                                                                                                                                                                                                                                                       |
| `PORT-ARTIFACT`  | Artifact persistence            | `X-STORE`                                                                                                                 | Immutable evidence and terminal audit-export writes, owner-authorized disposal, plus digest-verified reads. `CP-INTAKE` directs the pre-Run digest-verified configuration-artifact read through `CP-MEDIATOR`, bound to its exact subject, expected digest, and composition digest, then records the validated carrier digest and subject in `SCH-INTAKE-ACK`; configuration artifacts are authored outside the Run control path and are never written through an uncataloged Run Operation. |
| `PORT-PUBLISH`   | Read-only publication           | `X-CONSUMER`                                                                                                              | Durable outcomes, explanations, actionable notices, immutable audit-export references, and obligations out; no control input.                                                                                                                                                                                                                                                                                                                                                                |

Port rules:

- One V1 external relationship maps to exactly one port, so the Layer 1 boundary stays checkable
  at Layer 2. `X-STORE` is reached through two ports because the ledger's conditional-append
  contract and the artifact store's immutable-blob contract are different proof obligations.
- Every inbound message is validated at the port against identity, role, exact subject, lifecycle
  position, fence, and capability before it can become a trigger (I7). `CP-MEDIATOR` validates the
  mediated mechanism ports; `CP-INTAKE` validates `PORT-INTAKE`; `CP-ESCALATION` validates
  `PORT-DECIDE`; controller derivation validation owns wakes; and `PORT-LEDGER`'s commit primitive
  carries equivalent identity, position, and digest validation inside the transition engine's
  commit protocol.
- `PORT-PUBLISH` is one-directional by construction. A consumer that needs to influence a Run must
  enter through `PORT-INTAKE` or `PORT-DECIDE` as a first-class validated participant.
- `PORT-CONSUMER` is a private product facade, not another lifecycle authority or provider seam. It
  terminates at `RT-OPERATOR`, binds each authenticated caller to exactly one configured principal
  from the local execution context or fails closed, preserves that caller principal/grant and event schema, and delegates to
  the existing validated ports for core actions. Its preview method instead invokes the Envelope
  Builder's effect-free `EP-PREVIEW` path outside the core authority boundary; controller
  components, stores, and mechanisms remain unreachable.
- `PORT-SOURCE` is not an eleventh crossing of `SYS-JIG`: it belongs to `X-ENVELOPE`'s bounded product
  front end. Candidate work can reach `PORT-INTAKE` only after validation, composition, and owner
  approval produce a new immutable envelope.

### First-party consumer API delegation

| Consumer action                                        | Delegates to                                  | Boundary rule                                                                                                                     |
| ------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Preview                                                | Envelope Builder `EP-PREVIEW`                 | Runs composition and validation effect-free; never calls intake, mints a Run, writes a ledger, or dispatches.                     |
| Start / envelope submission                            | `PORT-INTAKE`                                 | Reuses digest-keyed validation and acknowledgement; only intake may mint or retrieve a Run.                                       |
| Decide, override, handoff, stop, resume, notice action | `PORT-DECIDE`                                 | Preserves authenticated principal, current `ID-GRANT`, exact subject, and event schema.                                           |
| Inspect, watch, ask why, notices, outcomes             | `PORT-PUBLISH`                                | Reads a durable projection at a stated ledger position, scoped to the configured reader-principal set; no control input is added. |
| Export retrieval                                       | `PORT-PUBLISH`, then `OPC-ART-GET` internally | Returns a validated reference/read; the consumer never reads `RT-EVIDENCE` or storage directly.                                   |

The facade is private and versioned for shipped first-party consumers. It creates no public package
or external stability commitment; changing that posture is a deliberate owner-visible decision.

## Process model

- `RT-OPERATOR` runs as a short-lived process per command (configure, preview, start/submit,
  inspect, decide,
  suspend, resume, notice acknowledge/snooze, export). A realization may host the Envelope Builder
  in the same executable, but the
  builder still has only proposal authority and remains outside the controller's trust boundary.
  It communicates with a live controller only through durable records and validated port triggers,
  never through shared memory, so an absent or crashed operator process cannot corrupt control
  state. For start/submit it hosts `CP-INTAKE`; the acknowledgement conditional-create is the
  single commit point, and controller spawn occurs only after that **accepted** acknowledgement exists;
  a rejected acknowledgement is terminal preflight and cannot derive a ledger or controller.
- `RT-CONTROLLER` runs as one long-lived process per Run after intake acknowledgement through Run
  completion, interruption, or suspension. A suspended controller holds no live dispatch authority.
  On start, restart, or operator resume it acquires a new controller generation through
  `PORT-LEDGER` before any dispatch (I6). Concurrent Runs are concurrent controller processes; the
  only state shared between Runs is the target-authority registry (`RT-REGISTRY`), the deliberate
  cross-Run exception that serializes finalization authority per canonical target (I12). Every
  acquisition first records the waiter's D6/`C-ORDER` tuple; the registry grants only the
  comparator-least eligible waiter, records grant/release by conditional append, and performs a
  Candidate-changing refresh rebind in one atomic registry append. Recovery treats the registry as
  the cross-Run authority of record before reconciling a Run-ledger mirror. No global scheduler or
  second arbiter exists.
- Mechanism sessions (agent roles, verification executions, delivery operations) run outside the
  controller process as separate local processes or remote services reached through their ports.
  A mechanism crash is a Story- or Operation-scoped fault (I15), never a controller memory fault.

### View V6 — runtime decomposition

- **Question:** What separately runnable or independently stored units realize Jig, and through
  which ports do they reach the outside world?
- **View type:** Runtime/container decomposition of `SYS-JIG`.
- **Audience and purpose:** Engineers, architects, security, and operations; see where each Layer 1
  responsibility executes before opening component detail.
- **Scope and exclusions:** Jig's runtime units, ports, and immediate external counterparts.
  Component internals, schemas, transports, and deployment topology are excluded (V6a owns
  topology).
- **State:** Approved (not locked).
- **Owner:** Arye Kogan.
- **Sources:** D2, D10; I2–I3, I5–I7; [system context V1](./context.md).
- **Related views:** [V1](./context.md) owns the boundary; [V7](./components/control-plane.md)
  opens the controller; [V6a](#view-v6a--process-and-deployment-model) places these units on a
  host.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, ui-sans-serif, system-ui", "primaryTextColor": "#172033", "lineColor": "#65758b"}}}%%
flowchart LR
    subgraph Outside["External participants and mechanisms"]
        Envelope["X-ENVELOPE<br/>Execution-envelope authority<br/>[External authority]"]
        Owner(["P-OWNER<br/>Arye or recorded delegate<br/>[Decision authority]"])
        Session["X-AGENT<br/>Agent mechanism hosting roles<br/>[External mechanism]"]
        Effectors["X-WORKSPACE · X-VERIFY · X-DELIVERY<br/>Workspace, verification, delivery<br/>[External mechanisms]"]
        Storage["X-STORE<br/>Durable storage technology<br/>[External mechanism]"]
        Consumer["X-CONSUMER<br/>Read-only consumers<br/>[External consumer]"]
        FirstParty["CLI · private MCP · SDK<br/>First-party consumers<br/>[Private adapters]"]
    end

    subgraph Jig["SYS-JIG runtime units"]
        Operator["RT-OPERATOR<br/>Operator interface + CP-INTAKE<br/>acknowledges · submits · inspects · relays decisions<br/>[Runtime unit]"]
        Controller["RT-CONTROLLER<br/>Run controller<br/>validates · decides · records · reconciles<br/>[Runtime unit]"]
        Ledger[("RT-LEDGER<br/>Run ledger store<br/>[Data store]")]
        Evidence[("RT-EVIDENCE<br/>Evidence artifact store<br/>[Data store]")]
        Registry[("RT-REGISTRY<br/>Target-authority registry<br/>[Data store, cross-Run]")]
        Witness[("RT-WITNESS<br/>Currency witness store<br/>[Data store, independent trust]")]
    end

    Envelope -->|"submits envelope via PORT-INTAKE to"| Operator
    FirstParty -->|"uses PORT-CONSUMER only through"| Operator
    Operator -->|"after durable intake acknowledgement, creates ledger and starts"| Controller
    Operator -->|"conditionally creates LG-INTAKE acknowledgement via PORT-LEDGER"| Ledger
    Owner -->|"returns scoped decisions via PORT-DECIDE to"| Operator
    Controller -->|"parks named questions via PORT-DECIDE for"| Owner
    Controller -->|"assigns bounded role work via PORT-SESSION to"| Session
    Session -->|"returns attributable results and verdicts to"| Controller
    Controller -->|"authorizes scoped effects via PORT-WORKSPACE · PORT-VERIFY · PORT-DELIVERY to"| Effectors
    Effectors -->|"attest observed facts and effect certainty to"| Controller
    Controller -->|"conditionally appends and reads via PORT-LEDGER"| Ledger
    Controller -->|"acquires and releases cross-Run target authority via PORT-LEDGER"| Registry
    Controller -->|"advances and checks currency witness heads via PORT-LEDGER"| Witness
    Controller -->|"writes and reads immutable artifacts via PORT-ARTIFACT"| Evidence
    Ledger -->|"persists through storage contract on"| Storage
    Evidence -->|"persists through storage contract on"| Storage
    Registry -->|"persists through storage contract on"| Storage
    Witness -->|"persists through independently trusted storage on"| Storage
    Operator -.->|"publishes durable views via PORT-PUBLISH to"| Consumer

    style Outside fill:#f3edff,stroke:#8a6eb0,color:#172033
    style Jig fill:#fff6dd,stroke:#b8903a,color:#172033
    classDef authority fill:#dfeaff,stroke:#466c9f,color:#172033
    classDef person fill:#e8f1ff,stroke:#5a78a8,color:#172033
    classDef unit fill:#fff1cf,stroke:#a8781f,color:#172033
    classDef control fill:#fff1cf,stroke:#a8781f,stroke-width:3px,color:#172033
    classDef store fill:#e8f1ff,stroke:#5a78a8,stroke-width:3px,color:#172033
    classDef mechanism fill:#f1e9ff,stroke:#8061a8,color:#172033
    classDef consumer fill:#f4f5f7,stroke:#7c8798,stroke-dasharray:5 3,color:#172033
    class Envelope authority
    class Owner person
    class Operator unit
    class Controller control
    class Ledger,Evidence,Registry,Witness store
    class Session,Effectors,Storage mechanism
    class Consumer,FirstParty consumer
```

**V6 legend:** Rectangles are runtime units, authorities, or mechanisms; cylinders are data stores;
the rounded rectangle is a person. The thick yellow border marks the sole lifecycle authority
(`RT-CONTROLLER`); thick blue borders mark the durable stores whose recorded content is
authoritative. The dashed border and dashed line mark read-only publication with no control
authority. Every crossing of the yellow region names its port in the edge label; there are no
unnamed crossings. Purple nodes are external mechanisms, blue the decision authority, and gray the
consumer; color is redundant with the stable IDs and bracketed types. The grouped
`X-WORKSPACE · X-VERIFY · X-DELIVERY` node keeps this view at one level; each mechanism keeps its
own V1 identity and its own port. `RT-REGISTRY` is deliberately cross-Run: it is shared by
every Run controller, serializing finalization authority per canonical target (I12) through the
same conditional-append contract as the Run ledger. `RT-WITNESS` deliberately sits on storage of
independent trust, because its purpose is to detect rollback of the other stores and their
backups.

## Deployment shape

The proposed deployment is **single-host, per-Run**: an operator host (workstation or job runner)
executes `RT-OPERATOR` commands, each accepted Run gets one `RT-CONTROLLER` process on that host,
and the ledger, evidence, and registry stores are directories or volumes owned by that host's
storage, while the currency witness lives on separately configured storage of independent trust.
Remote participants —
forge targets, remote agent providers, the owner answering an escalation — remain remote services
or people reached through the ports. A hosted or multi-tenant topology is a future deployment view,
not a change to this logical decomposition (the guide separates logical architecture from
deployment topology).

### View V6a — process and deployment model

- **Question:** Where do the runtime units execute in the proposed single-host deployment, and
  which parts live outside the host?
- **View type:** Deployment view for the single-host environment.
- **Audience and purpose:** Operations and engineering readers; see process boundaries, store
  placement, and remote seams.
- **Scope and exclusions:** One materially distinct environment (single host). Replica counts,
  hosting products, network hardware, and provider topology are excluded.
- **State:** Approved (not locked).
- **Owner:** Arye Kogan.
- **Sources:** D10; I6, I15.
- **Related views:** [V6](#view-v6--runtime-decomposition) owns the logical decomposition;
  [V12](./mechanism-and-provider-contracts.md) owns mechanism contracts across the remote seam.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, ui-sans-serif, system-ui", "primaryTextColor": "#172033", "lineColor": "#65758b"}}}%%
flowchart LR
    subgraph Host["Operator host: workstation or job runner"]
        OperatorP["RT-OPERATOR + CP-INTAKE<br/>Short-lived command process<br/>[Process]"]
        ControllerP["RT-CONTROLLER<br/>One long-lived process per Run<br/>[Process]"]
        MechanismP["Local mechanism sessions<br/>agent · workspace · verification<br/>[Child processes]"]
        subgraph HostStore["Host storage"]
            LedgerD[("RT-LEDGER<br/>Per-Run ledger directory<br/>[Data at rest]")]
            EvidenceD[("RT-EVIDENCE<br/>Artifact directory<br/>[Data at rest]")]
            RegistryD[("RT-REGISTRY<br/>Host-scoped target-authority registry<br/>[Data at rest]")]
        end
        subgraph IndepStore["Independently trusted storage"]
            WitnessD[("RT-WITNESS<br/>Currency witness heads<br/>[Data at rest, independent trust]")]
        end
    end

    subgraph Remote["Remote services and people"]
        Forge["X-DELIVERY<br/>Forge and authoritative target<br/>[Remote service]"]
        RemoteAgent["X-AGENT<br/>Remote agent provider<br/>[Remote service]"]
        OwnerR(["P-OWNER<br/>Arye or recorded delegate<br/>[Person]"])
    end

    OperatorP -->|"after accepted LG-INTAKE acknowledgement, creates ledger and starts per Run"| ControllerP
    OperatorP -->|"conditionally creates LG-INTAKE via PORT-LEDGER"| LedgerD
    ControllerP -->|"spawns and supervises scoped"| MechanismP
    ControllerP -->|"conditionally appends via PORT-LEDGER to"| LedgerD
    ControllerP -->|"acquires cross-Run target authority via PORT-LEDGER from"| RegistryD
    ControllerP -->|"advances currency witness heads before acknowledgement via PORT-LEDGER to"| WitnessD
    ControllerP -->|"writes immutable artifacts via PORT-ARTIFACT to"| EvidenceD
    ControllerP -->|"authorizes remote effects via PORT-DELIVERY to"| Forge
    ControllerP -->|"hosts remote role sessions via PORT-SESSION on"| RemoteAgent
    ControllerP -.->|"parks questions via PORT-DECIDE for"| OwnerR
    OperatorP -->|"reads durable records for inspection from"| LedgerD

    style Host fill:#fff6dd,stroke:#b8903a,color:#172033
    style HostStore fill:#eef5ff,stroke:#7a96bd,color:#172033
    style Remote fill:#f3edff,stroke:#8a6eb0,color:#172033
    classDef process fill:#fff1cf,stroke:#a8781f,color:#172033
    classDef control fill:#fff1cf,stroke:#a8781f,stroke-width:3px,color:#172033
    classDef rest fill:#e8f1ff,stroke:#5a78a8,stroke-width:3px,color:#172033
    classDef remote fill:#f1e9ff,stroke:#8061a8,color:#172033
    classDef person fill:#e8f1ff,stroke:#5a78a8,color:#172033
    class OperatorP,MechanismP process
    class ControllerP control
    class LedgerD,EvidenceD,RegistryD,WitnessD rest
    style IndepStore fill:#eef5ff,stroke:#5a78a8,color:#172033
    class Forge,RemoteAgent remote
    class OwnerR person
```

**V6a legend:** Rectangles are processes or remote services; cylinders are data at rest; the
rounded rectangle is a person. The thick yellow border marks the controller process, the sole
lifecycle authority on the host; thick blue borders mark authoritative data at rest. Solid lines
are supervision, port-mediated effects, or reads; the dashed line is the escalation path to the
owner. The yellow region is the operator host, blue its storage, and purple everything remote;
color is redundant with IDs and bracketed types. Local mechanism sessions are grouped into one
node to keep this view at one level; their contracts are identical to remote mechanisms'.

## How the decomposition preserves the Layer 1 contract

| Layer 1 obligation                                  | Where it lands at Layer 2                                                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sole routine lifecycle authority (I3)               | Only `RT-CONTROLLER` decides; `RT-OPERATOR` proposes and reads; stores are passive.                                                                                                                          |
| Ledger authority, record before adopt/dispatch (I5) | `RT-LEDGER` behind `PORT-LEDGER`; the transition engine alone writes Run Transitions, while `CP-INTAKE` writes only `LG-INTAKE` and registry arbitration uses its separate declared conditional-append path. |
| Fencing and safe resume (I6)                        | Controller generation acquired through `PORT-LEDGER` before any dispatch; one controller process per Run.                                                                                                    |
| One target-scoped finalization authority (I12)      | Cross-Run arbitration through the shared `RT-REGISTRY` store behind `PORT-LEDGER`'s conditional-append contract; every Run controller contends on one authority line per canonical target.                   |
| Fail-closed trust posture after rollback (I20)      | `LG-WITNESS` heads in `RT-WITNESS`, on storage whose trust is independent of the ledger and its backups, advanced before every acknowledgement.                                                              |
| Exact-subject validation at the boundary (I7)       | Mechanism messages pass `CP-MEDIATOR`; intake passes `CP-INTAKE`; decisions pass `CP-ESCALATION`; wakes pass controller derivation validation; ledger primitives pass commit-protocol validation.            |
| Smallest-safe containment (I15)                     | Mechanism sessions are separate processes; their faults arrive as attested failures, not shared-memory failures.                                                                                             |
| No undeclared control path (D2, D3)                 | `PORT-PUBLISH` is read-only; every other crossing is a named, validated port.                                                                                                                                |

## Where to go next

- Inside the controller: [control plane components](./components/control-plane.md).
- Identity and schema shapes crossing these ports: [data and identity](./data-and-identity.md).
- The ledger and projection realization: [persistence and projections](./persistence-and-projections.md).
- Mechanism obligations behind the ports:
  [mechanism and provider contracts](./mechanism-and-provider-contracts.md).
- Why this decomposition was selected, with rejected alternatives:
  [D10 — runtime decomposition](./decisions/D10-runtime-decomposition.md).
