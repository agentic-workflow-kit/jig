---
title: "Architecture conformance — executable suites for the locked invariants"
purpose: Map every locked Layer 1 invariant to at least one conformance suite that any realization must pass, and define how suite results gate realizations and providers.
audience:
  - Engineers realizing the Layer 2 design
  - Independent architecture reviewers
  - Arye Kogan, Jig product and architecture decision owner
scope: The conformance suite catalog, its execution posture, and its gated outcomes; suite implementations, test frameworks, and provider technology selection are excluded.
state: proposed
status: proposed Layer 2 content, authored 2026-07-15 under the owner continuation instruction; pending the Layer 2 independent review
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ./invariants.md
  - ./decisions/D9-invariants-and-artifact-shape.md
  - ./decisions/D12-mechanism-contract-model.md
related:
  - ./runtime.md
  - ./mechanism-and-provider-contracts.md
  - ./components/control-plane.md
---

# Architecture conformance — executable suites for the locked invariants

This page consumes [D9](./decisions/D9-invariants-and-artifact-shape.md) category 13 (architecture
verification and conformance suites). Its purpose is to make [I1–I21](./invariants.md) executable:
each locked invariant maps to at least one conformance suite that any realization must pass, and
each suite tests the contract — observable decisions, records, and rejections — not the
implementation detail behind it. A realization may change internally without touching a suite;
a suite may not be weakened to admit a realization (the gate-integrity posture of I21).

## Suite catalog (`CF-*`)

| Suite              | What it exercises                                                                                                        | Invariants |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `CF-DETERMINISM`   | Replaying the same ledger and ordered validated triggers reproduces identical decisions and Operation intents.           | I4         |
| `CF-ORDERING`      | No live-state adoption and no effect dispatch happen before the corresponding ledger commit is confirmed.                | I5         |
| `CF-FENCE`         | Results and dispatches under a stale controller generation or stale finalization-authority fence are rejected.           | I6, I12    |
| `CF-BINDING`       | Wrong-subject, wrong-basis, and wrong-fence results cannot advance state; every mismatch fails closed.                   | I7         |
| `CF-ACCEPTANCE`    | Acceptance requires a valid reviewer verdict on the exact Candidate plus Jig validation, never Jig re-judgment.          | I8         |
| `CF-POLICY`        | Configuration and providers cannot lower or silently change the policy-selected final verification.                      | I9         |
| `CF-CAPACITY`      | Admission by scarce resource class always preserves the progress reserve for admitted work.                              | I10        |
| `CF-ORDER`         | Admission, finalization, and attribution tie-breaks follow the immutable comparator under permuted arrival order.        | I11        |
| `CF-RELEASE`       | Only confirmed landing releases dependents; approval, publication, checks, integration response, or cleanup do not.      | I13        |
| `CF-BLOCKERS`      | Multi-root dependency outcomes carry the complete canonically ordered reachable direct-root blocker set.                 | I14        |
| `CF-CONTAINMENT`   | Faults land at the smallest safe scope — Story, target, Run — and insufficiency always fails closed.                     | I15        |
| `CF-BOUNDS`        | Every retry, rework, refresh, wait, Recovery, and Retirement path is bounded and reaches its explicit exhaustion action. | I16        |
| `CF-DOUBLE-EFFECT` | No second semantic effect is attempted before the earlier uncertain effect is known absent or reconciled.                | I17        |
| `CF-SEPARATION`    | Cleanup and Retirement can neither reverse a recorded landing nor delay dependency release.                              | I18        |
| `CF-PRESERVATION`  | Work and evidence are preserved before resource destruction; unresolved Retirement becomes a Residual Obligation.        | I19        |
| `CF-TRUST-STOP`    | After authoritative-store or decision-authority compromise the realization fails closed with an explicit named stop.     | I20        |

Per-port mechanism suites verify the `MC-*` clauses and the port family duties of the
[mechanism and provider contracts](./mechanism-and-provider-contracts.md) against a concrete
provider:

| Suite               | Port             | Gates                                                              |
| ------------------- | ---------------- | ------------------------------------------------------------------ |
| `CF-MECH-LEDGER`    | `PORT-LEDGER`    | Conditional-append, position lookup, and unknown-ack resolution.   |
| `CF-MECH-ARTIFACT`  | `PORT-ARTIFACT`  | Immutable writes and digest-verified reads.                        |
| `CF-MECH-SESSION`   | `PORT-SESSION`   | Assignment idempotency, session lookup, resume or attested loss.   |
| `CF-MECH-WORKSPACE` | `PORT-WORKSPACE` | Effect idempotency, basis and cleanliness facts, preservation.     |
| `CF-MECH-VERIFY`    | `PORT-VERIFY`    | Exact-subject observation, repeatability, result retrieval.        |
| `CF-MECH-DELIVERY`  | `PORT-DELIVERY`  | Effect idempotency or lookup, certainty reporting, no auto-replay. |

Governance invariants are covered without a runtime suite: I1 and I21 are verified by the layer
gates and the review record itself, and I2 and I3 are enforced structurally by the D10 port model —
`CF-BINDING` and the per-port suites observe that no undeclared control path exists and no
participant power widens through output.

## Execution posture and gated outcomes

- Suites run against a realization's port contracts. Control-plane suites use scripted or fake
  mechanisms so every replay is deterministic; mechanism suites additionally require recorded
  real-provider evidence for the concrete provider being gated.
- A conformance result is recorded evidence carrying the exact suite version and the subject
  digest of what passed — the exact-subject discipline of I7 applies to conformance evidence too.
  A claim without its recorded pass gates nothing.
- `CF-GATE-REALIZATION` — a realization is accepted only when every invariant suite above passes
  at its recorded version against that exact realization.
- `CF-GATE-PROVIDER` — a provider becomes configurable behind a port only when that port's
  `CF-MECH-*` suite passes against that exact provider, per the
  [conformance gating rule](./mechanism-and-provider-contracts.md).

## View V17 — invariants to suites to gated outcomes

- **Question:** Which suite groups make each invariant group executable, and what do their passes
  gate?
- **View type:** Verification mapping view over the conformance catalog.
- **Audience and purpose:** Engineers and reviewers; see the shortest path from a locked rule to
  the evidence that a realization or provider honors it.
- **Scope and exclusions:** Invariant groups, suite groups, and gated outcomes only. Individual
  test cases, frameworks, and schedules are excluded.
- **State:** Proposed.
- **Owner:** Arye Kogan.
- **Sources:** D9 category 13, D12; [I1–I21](./invariants.md); [V12](./mechanism-and-provider-contracts.md).
- **Related views:** [V6](./runtime.md) names the ports the mechanism suites exercise;
  [V12](./mechanism-and-provider-contracts.md) owns the `MC-*` clauses those suites verify.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, ui-sans-serif, system-ui", "primaryTextColor": "#172033", "lineColor": "#65758b"}}}%%
flowchart LR
    subgraph Invariants["Locked Layer 1 invariants"]
        ITruth["I4 · I5 · I6 · I12<br/>Determinism, ledger, fencing<br/>[Invariant group]"]
        IBind["I7 · I8 · I9<br/>Binding, acceptance, policy<br/>[Invariant group]"]
        IConc["I10 · I11 · I13 · I14<br/>Capacity, order, release, blockers<br/>[Invariant group]"]
        IFail["I15 – I20<br/>Containment, bounds, effects, retirement<br/>[Invariant group]"]
    end

    subgraph Suites["Conformance suites"]
        STruth["CF-DETERMINISM · CF-ORDERING · CF-FENCE<br/>[Suite group]"]
        SBind["CF-BINDING · CF-ACCEPTANCE · CF-POLICY<br/>[Suite group]"]
        SConc["CF-CAPACITY · CF-ORDER · CF-RELEASE · CF-BLOCKERS<br/>[Suite group]"]
        SFail["CF-CONTAINMENT · CF-BOUNDS · CF-DOUBLE-EFFECT<br/>CF-SEPARATION · CF-PRESERVATION · CF-TRUST-STOP<br/>[Suite group]"]
        SMech["CF-MECH-LEDGER … CF-MECH-DELIVERY<br/>Per-port mechanism suites<br/>[Suite group]"]
    end

    subgraph Gates["Gated outcomes"]
        GReal["CF-GATE-REALIZATION<br/>Realization accepted<br/>[Gated outcome]"]
        GProv["CF-GATE-PROVIDER<br/>Provider configurable<br/>[Gated outcome]"]
    end

    ITruth -->|"is made executable by"| STruth
    IBind -->|"is made executable by"| SBind
    IConc -->|"is made executable by"| SConc
    IFail -->|"is made executable by"| SFail
    STruth -->|"recorded pass gates"| GReal
    SBind -->|"recorded pass gates"| GReal
    SConc -->|"recorded pass gates"| GReal
    SFail -->|"recorded pass gates"| GReal
    SMech -->|"recorded pass per provider gates"| GProv

    style Invariants fill:#e8f1ff,stroke:#5a78a8,color:#172033
    style Suites fill:#fff6dd,stroke:#b8903a,color:#172033
    style Gates fill:#e8f7ed,stroke:#4f8a63,color:#172033
    classDef invariant fill:#e8f1ff,stroke:#5a78a8,color:#172033
    classDef suite fill:#fff1cf,stroke:#a8781f,color:#172033
    classDef gate fill:#e8f7ed,stroke:#4f8a63,stroke-width:3px,color:#172033
    class ITruth,IBind,IConc,IFail invariant
    class STruth,SBind,SConc,SFail,SMech suite
    class GReal,GProv gate
```

**V17 legend:** All nodes are rectangles; shape carries no distinction at this level. Blue nodes
are locked invariant groups (their `I*` IDs are owned by the [invariants page](./invariants.md)),
yellow nodes are conformance suite groups (`CF-*`), and green thick-bordered nodes are the two
gated outcomes those recorded passes unlock. All lines are solid because every relationship here is
a normal gating flow; there is no failure or uncertainty path in this view — a missing or failed
pass simply leaves a gate closed. Color is redundant with the stable IDs and bracketed types. The
mechanism suite group additionally verifies the structural I2/I3 boundary, per the governance note
above. `CF` means conformance suite.

## Exclusions

- Suite implementations, test frameworks, harness layout, and execution schedules.
- The `MC-*` clause definitions and provider duties — owned by
  [mechanism and provider contracts](./mechanism-and-provider-contracts.md).
- Evidence storage, retention, and integrity rules for recorded passes — owned by the evidence
  pages built on [acceptance and evidence](./acceptance-and-evidence.md).
- Delivery sequencing of when suites are built; conformance shape is architecture, its schedule is
  not.

## Where to go next

- The clauses the mechanism suites verify:
  [mechanism and provider contracts](./mechanism-and-provider-contracts.md).
- The canonical invariant wording every suite traces to: [invariants](./invariants.md).
- The components whose behavior the invariant suites replay:
  [control plane components](./components/control-plane.md).
- Why conformance gating was selected over trust-by-configuration:
  [D12 — mechanism contract model](./decisions/D12-mechanism-contract-model.md).
