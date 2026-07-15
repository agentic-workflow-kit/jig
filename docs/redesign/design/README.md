---
title: "Jig redesign — canonical design workspace"
purpose: Route each reader to the design page that answers their question, and state the current approval status of every layer.
audience:
  - Jig owner
  - Architecture authors and reviewers
  - Product, engineering, security, and operations stakeholders
scope: Navigation, overview, and gate status for the canonical redesign artifacts; each fact lives in exactly one linked page.
state: current
status: active index — Layer 0 approved; the re-presented Layer 1 view set is proposed and pending a fresh independent review; Layer 2 unauthorized
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../architecture-design-and-documentation-guide.md
  - Explicit owner structure-revision instruction, 2026-07-15
related:
  - ../README.md
  - ../raw/README.md
---

# Canonical design workspace

This directory holds the new canonical redesign, organized by abstraction level and view type
following the [architecture guide](../architecture-design-and-documentation-guide.md): one project
brief, one canonical model, and selective views over that model, each answering one question for one
audience. Approval still advances one layer at a time; the layer gates are recorded per artifact and
in the [review and approval record](./decisions/review-and-approval-record.md).

## Architecture at a glance

Jig owns the deterministic **authority-and-proof boundary** that turns an already-approved
**Execution Envelope** into reviewed, landed work or a deliberate, durable, inspectable non-delivery
outcome. It owns preflight sufficiency, stable identity, lifecycle and concurrency decisions,
operation authorization, authoritative recording, exact-subject validation, reconciliation, landing
proof, escalation, and preservation-safe retirement.

External participants retain their proper expertise and mechanisms retain their proper effects:

- the envelope authority supplies the approved plan, policy, and configuration;
- the implementer produces an exact candidate and attributable evidence;
- the reviewer independently judges the complete exact candidate;
- configured agent, workspace, verification, delivery, and storage mechanisms perform or observe
  scoped work; and
- Arye or an explicitly recorded delegate answers only the decisions within their recorded scope.

Jig validates every input and attestation before it can affect control state. **Jig Control** is the
sole routine lifecycle authority. It records an accepted transition and its operation intents in a
durable ordered ledger before adopting live state or dispatching effects. Recovery fences stale
control, reconstructs that durable truth, and reconciles uncertain effects before another semantic
attempt.

Eligible implementation and review may progress concurrently within explicit scarce-resource
capacity. Target-changing finalization is serialized through one target-scoped authority and a
deterministic total order. A valid reviewer approval of the exact candidate creates `Accepted`;
only authoritative proof that the target contains that accepted result creates `Landed` and releases
dependent work. Business outcome and retirement remain separate, so cleanup cannot reverse landing
or delay dependency release.

## Read this first

- **Product or business reader:** [Project brief](./brief.md) → [System context](./context.md).
- **New engineer or architect:** [System context](./context.md) → [Canonical model](./model.md) →
  [Run and Story lifecycle](./flows/run-and-story-lifecycle.md).
- **Security reviewer:** [Authority and trust](./perspectives/authority-and-trust.md) →
  [Acceptance and evidence](./acceptance-and-evidence.md) →
  [Failure and liveness](./failure-and-liveness.md).
- **Operations reader:** [Run and Story lifecycle](./flows/run-and-story-lifecycle.md) →
  [State and recovery](./state-and-recovery.md) →
  [Failure and liveness](./failure-and-liveness.md).
- **Reviewer of this candidate:** [Decision index](./decisions/README.md) →
  [Invariants](./invariants.md) →
  [Review and approval record](./decisions/review-and-approval-record.md).
- **Future Layer 2 author (after authorization):** [Invariants](./invariants.md) →
  [D9 Layer 2 boundary](./decisions/D9-invariants-and-artifact-shape.md).

## Document map

| Page                                                                    | Level or view type            | Question it answers                                                                              |
| ----------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| [Project brief](./brief.md)                                             | Level 0 — project brief       | Why does the redesign exist, for whom, and under which constraints and quality scenarios?        |
| [Canonical model](./model.md)                                           | Canonical model               | What vocabulary, stable identities, and binding rules does every view reference?                 |
| [System context](./context.md)                                          | Level 1 — system context (V1) | What is inside Jig's authority-and-proof boundary, and what surrounds it?                        |
| [Authority and trust](./perspectives/authority-and-trust.md)            | Perspective (V2)              | Who holds which power, how is trust validated, and how far does compromise propagate?            |
| [Run and Story lifecycle](./flows/run-and-story-lifecycle.md)           | Dynamic flow (V3)             | How do a Run and its Stories progress, branch on failure, and stay authoritative?                |
| [State and recovery](./state-and-recovery.md)                           | Supporting state view (V4)    | What is durably authoritative, what is replaceable, and how does recovery reconcile uncertainty? |
| [Acceptance and evidence](./acceptance-and-evidence.md)                 | Supporting view               | What judgment accepts an exact Candidate, which evidence counts, and what proves landing?        |
| [Concurrency and finalization](./concurrency-and-finalization.md)       | Supporting view               | How is concurrent work admitted deterministically and target change serialized?                  |
| [Failure and liveness](./failure-and-liveness.md)                       | Supporting view               | How are failures contained, waits bounded, liveness guaranteed, and work retired safely?         |
| [Invariants](./invariants.md)                                           | Contract                      | Which rules must every later design preserve, and where does each come from?                     |
| [Decision records](./decisions/README.md)                               | Decisions (D1–D9)             | Why was each direction selected, what was rejected, and which burdens are accepted?              |
| [Review and approval record](./decisions/review-and-approval-record.md) | Gate record                   | What was reviewed, what passed, and what remains before approval and lock become effective?      |

There is no runtime/container decomposition page yet by design: internal components, ports, and
processes are deliberate Layer 2 deferrals (see
[D9](./decisions/D9-invariants-and-artifact-shape.md#consolidated-deliberate-layer-2-deferrals)).
When Layer 2 is authorized, its decomposition, deployment, and data views join this structure at
their own levels.

## Layer gate status

| Layer gate                        | Canonical or proposed artifacts                                                 | Status                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Layer 0 — project definition      | [Project brief](./brief.md)                                                     | Approved; content unchanged by the 2026-07-15 relocation; governing input for Layer 1                                                     |
| Layer 1 — high-level architecture | All Layer 1 pages in the document map, the decision records, and the invariants | Proposed; the prior two-artifact candidate's pending recheck was superseded by the structure revision; a fresh independent review is next |
| Layer 2 — detailed architecture   | No artifact authorized                                                          | Unauthorized and not started under this execution stop; a Layer 1 `PASS` does not authorize Layer 2                                       |

Arye retains all material product and architecture decision ownership. The bounded review
delegation permits an independent reviewer to approve only faithful organization and re-expression
of already-established intent; a `PASS` on the exact candidate set makes the recorded Layer 1
approval and lock effective without a separate owner-selection step. After the Layer 1 commit, work
stops for Arye; Layer 2 must not begin.

The [raw provenance manifest](../raw/README.md) identifies binding decisions and historical
evidence; it does not make the prior presentation canonical.
