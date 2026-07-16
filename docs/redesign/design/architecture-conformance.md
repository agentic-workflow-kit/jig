---
title: "Architecture conformance — executable suites for the locked invariants"
purpose: Map every locked Layer 1 invariant to at least one conformance suite that any realization must pass, and define how suite results gate realizations and providers.
audience:
  - Engineers realizing the Layer 2 design
  - Independent architecture reviewers
  - Arye Kogan, Jig product and architecture decision owner
scope: The conformance suite catalog, its execution posture, and its gated outcomes; suite implementations, test frameworks, and provider technology selection are excluded.
state: approved
status: complete owner-approved product-readiness amendment of 2026-07-16; lock pending exact-candidate review
owner: Arye Kogan
last_verified: 2026-07-16
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

| Suite                 | What it exercises                                                                                                                                                                                                                                                                | Invariants      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `CF-DETERMINISM`      | Replaying the same ledger and ordered validated triggers reproduces identical decisions and Operation intents.                                                                                                                                                                   | I4              |
| `CF-ORDERING`         | No live-state adoption and no effect dispatch happen before the corresponding ledger commit is confirmed.                                                                                                                                                                        | I5              |
| `CF-FENCE`            | Stale controller or finalization fences are rejected; redispatch preserves identity and basis only after recorded reauthorization refreshes every generation component to the current fence.                                                                                     | I6, I12         |
| `CF-BINDING`          | Wrong-subject, wrong-basis, and wrong-fence results cannot advance state; every mismatch fails closed.                                                                                                                                                                           | I7              |
| `CF-ACCEPTANCE`       | Acceptance requires a valid reviewer verdict on the exact Candidate plus Jig validation, never Jig re-judgment.                                                                                                                                                                  | I8              |
| `CF-POLICY`           | Configuration and providers cannot lower or silently change the policy-selected final verification.                                                                                                                                                                              | I9              |
| `CF-CAPACITY`         | Admission by scarce resource class always preserves the progress reserve for admitted work.                                                                                                                                                                                      | I10             |
| `CF-ORDER`            | Admission, finalization, and attribution tie-breaks follow the immutable comparator under permuted arrival order.                                                                                                                                                                | I11             |
| `CF-RELEASE`          | Only confirmed landing releases dependents; approval, publication, checks, integration response, or cleanup do not.                                                                                                                                                              | I13             |
| `CF-BLOCKERS`         | Multi-root outcomes carry the complete ordered direct-root `Blocked` or `Rejected` set; either terminal root yields `Not run — dependency blocked`.                                                                                                                              | I14             |
| `CF-CONTAINMENT`      | Faults land at the smallest safe scope — Story, target, Run — and insufficiency always fails closed.                                                                                                                                                                             | I15             |
| `CF-BOUNDS`           | Every one of the eleven `BND-*` classes accepts only its numeric or duration default and allowed range, and every bounded path reaches its declared exhaustion action.                                                                                                           | I16             |
| `CF-DOUBLE-EFFECT`    | No second semantic effect is attempted before the earlier uncertain effect is known absent or reconciled.                                                                                                                                                                        | I17             |
| `CF-SEPARATION`       | Cleanup and Retirement can neither reverse a recorded landing nor delay dependency release.                                                                                                                                                                                      | I18             |
| `CF-PRESERVATION`     | Work and evidence are preserved before resource destruction; unresolved Retirement becomes a Residual Obligation.                                                                                                                                                                | I19             |
| `CF-TRUST-STOP`       | After authoritative-store or decision-authority compromise the realization fails closed with an explicit named stop.                                                                                                                                                             | I20             |
| `CF-RULE-SURFACE`     | Adversarial Candidates that alter, rename, or remove governing paths park and invalidate prior acceptance until exact re-approval and fresh evidence.                                                                                                                            | I7, I8, I9, I15 |
| `CF-LIVENESS`         | Boundary cases for progress, idle, silence, repetition, and approval deadlines derive deterministic thinking/stuck/dead/overdue outcomes.                                                                                                                                        | I4, I16         |
| `CF-NOTICE-EXPORT`    | Every parked, blocked, stale, overdue, and residual condition projects an actionable notice; terminal exports are redacted, create-once, and digest-verifiable.                                                                                                                  | I16, I19        |
| `CF-RUN-CONTROL`      | Valid grant-aware suspend, resume, and terminal-stop events drive only declared Run transitions; suspension preserves Story states and resume requires a new generation plus `RC-RESUME-INTEGRITY`.                                                                              | I4, I5, I6, I20 |
| `CF-OPERATOR-ACTIONS` | Stop, resume, notice acknowledgement/snooze, owner decisions, handoffs, and export retrieval use their cataloged `PORT-DECIDE` event or effect-free artifact read; `PORT-PUBLISH` accepts no control input.                                                                      | I2, I3, I4, I5  |
| `CF-DELEGATION`       | A delegated decision requires a current, unrevoked, in-scope `ID-GRANT`; issuance naming product/architecture import or approval, gate-verdict, layer-reopen, or implicit-subdelegation scope is rejected as `FC-AUTHORITY`, as is expired, revoked, superseded, or escaped use. | I2, I3, I7, I20 |
| `CF-CONSUMER`         | CLI, private-MCP, and SDK adapters reach Jig only through `PORT-CONSUMER`, which delegates to `PORT-INTAKE`, `PORT-DECIDE`, or `PORT-PUBLISH` and exposes no bypass.                                                                                                             | I2, I3          |

The imported guarantees add required product-readiness suites without changing I1–I21:

| Suite                    | What it exercises                                                                                                                                                                                                                                                         | Closes                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `CF-ENVELOPE`            | Floor-preserving composition, exact approval, successor-Run replanning, digest-keyed conditional intake, duplicate submission, lost-ack lookup, and changed Work Source content producing a new immutable Candidate.                                                      | CFG-2/3/5/6/8, ISO-2, STACK-2             |
| `CF-PROVIDER-PERMISSION` | Provider-internal outcomes create no Jig decision; a human-needed request follows durable `ID-PARK` to the current same-principal session, or closes through recorded cancel-and-reissue lineage after unrecoverable context loss, without widening posture or authority. | FENCE-1/2, DOOR-1/2/3, SEC-2, CFG-10      |
| `CF-SETUP-FRESHNESS`     | Exact recipe/input/host receipts suppress setup; any relevant mismatch or stale receipt authorizes one reconciled setup effect and emits a fresh receipt.                                                                                                                 | CFG-9                                     |
| `CF-PROVIDER-AUTHORITY`  | Bindings can only narrow an exhaustive approved manifest; build, manifest, environment, proof-age, and approval changes close the provider gate until requalified.                                                                                                        | EARN-1, DRIVE-2                           |
| `CF-BLOCK-SURFACING`     | A real integration request receives one idempotent status/comment block when authorized; surfacing failure preserves `Blocked` and creates a notice and residual obligation.                                                                                              | MERGE-5                                   |
| `CF-REVIEW-PUBLICATION`  | Review-scoped Operations can publish the exact Candidate, maintain one draft/non-mergeable request, and post stable-marker updates; probes prove they cannot merge, touch the lineage anchor, acquire finalization authority, or land work.                               | Product pre-acceptance review publication |

Per-port mechanism suites verify the `MC-*` clauses and the port family duties of the
[mechanism and provider contracts](./mechanism-and-provider-contracts.md) against a concrete
provider:

| Suite               | Port             | Gates                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CF-MECH-LEDGER`    | `PORT-LEDGER`    | Registry-realization identity attestation and mismatch rejection; conditional-append rejection; durable acknowledgement; the five-way readback classification (own commit adopted once; empty-position absence retried with the same identity; a competing generation's occupant adopted with the proposer fenced and never retried; same-generation/different-digest failing closed as integrity loss; indeterminate halting); and `LG-WITNESS` currency: independent trust, monotonicity, advance-before-acknowledgement, and rollback-restore detection. |
| `CF-MECH-ARTIFACT`  | `PORT-ARTIFACT`  | Immutable writes and digest-verified reads.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `CF-MECH-SESSION`   | `PORT-SESSION`   | Assignment idempotency, posture stability, request-follows-principal answer delivery, replacement-session provenance, cancel-and-reissue lineage after context loss, and preservation of every pending request.                                                                                                                                                                                                                                                                                                                                             |
| `CF-MECH-WORKSPACE` | `PORT-WORKSPACE` | Effect idempotency, basis and cleanliness facts, setup receipt/freshness behavior, preservation.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `CF-MECH-SOURCE`    | `PORT-SOURCE`    | `ID-SOURCE-REQ` echo, recorded cursor/revision basis, bounded retry, duplicate normalization, changed-content immutability, and pre-Run failure containment.                                                                                                                                                                                                                                                                                                                                                                                                |
| `CF-MECH-VERIFY`    | `PORT-VERIFY`    | Exact-subject observation, repeatability, result retrieval, and enforced effect-freedom; any effect-needing check is rejected from this port.                                                                                                                                                                                                                                                                                                                                                                                                               |
| `CF-MECH-DELIVERY`  | `PORT-DELIVERY`  | Effect idempotency or lookup, no auto-replay, target-anchor atomicity, disjoint review/finalization bindings, stable-marker surfacing, and fail-closed cross-binding use.                                                                                                                                                                                                                                                                                                                                                                                   |

Every `CF-MECH-*` suite contains reusable adversarial probes, not only happy-path examples. At a
minimum the shared probe library exercises forged identities and attestations, scope widening,
stale fences, duplicate and late results, timeout and reconnect ambiguity, declared-posture
mismatch or undeclared credential use, and retry-after-uncertain-effect behavior; port-specific
suites add hostile basis, setup, anchor, publication, and redaction cases. Bundled and future
providers pass the same suite and probe versions. A provider-specific waiver cannot make a
provider configurable.

Governance invariants are covered without a runtime suite: I1 and I21 are verified by the layer
gates and the review record itself, and I2 and I3 are enforced structurally by the D10 port model —
`CF-BINDING` and the per-port suites observe that no undeclared control path exists and no
participant power widens through output.

## Execution posture and gated outcomes

- Suites run against a realization's port contracts. Control-plane suites use scripted or fake
  mechanisms so every replay is deterministic; mechanism suites additionally require recorded
  real-provider evidence for the concrete provider being gated.
- A conformance result is recorded evidence carrying the exact provider build digest, suite and
  adversarial-probe versions, provider-authority manifest digest, and relevant environment
  fingerprint — the exact-subject discipline of I7 applies to conformance evidence too. A claim
  without that exact recorded pass gates nothing.
- Every Run receives a fresh compose-time capability proof binding the configured provider to its
  approved manifest and current realization. Frozen policy may additionally set a maximum age for
  reusable conformance evidence. A manifest/build/environment mismatch or expired pass closes the
  gate until the exact subject passes again; changing authority also requires fresh owner approval.
- `CF-GATE-REALIZATION` — a realization is accepted only when every invariant suite above passes
  at its recorded version against that exact realization.
- `CF-GATE-PROVIDER` — a provider becomes configurable behind a port only when that port's
  `CF-MECH-*` suite passes against that exact provider, per the
  [conformance gating rule](./mechanism-and-provider-contracts.md).
- `CF-GATE-PRODUCT` — an implementation cannot claim the imported commitments closed by this
  amendment until every product-readiness suite above passes against the exact realization and
  selected providers.

`CF-PROVIDER-PERMISSION` closes the revised SEC-2 by proving the Jig/provider protocol and exact
posture selection that Jig governs. It does not independently certify the provider's sandbox or
establish that an arbitrary provider contains no undisclosed phone-home path. D14 deliberately
places that enforcement inside the trusted Agent-provider and Execution Host boundary.

## View V17 — invariants to suites to gated outcomes

- **Question:** Which suite groups make each invariant group executable, and what do their passes
  gate?
- **View type:** Verification mapping view over the conformance catalog.
- **Audience and purpose:** Engineers and reviewers; see the shortest path from a locked rule to
  the evidence that a realization or provider honors it.
- **Scope and exclusions:** Invariant groups, suite groups, and gated outcomes only. Individual
  test cases, frameworks, and schedules are excluded.
- **State:** Approved (not locked).
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
