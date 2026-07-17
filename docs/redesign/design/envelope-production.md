---
title: "Envelope production — tracks, configuration, setup, and Work Source"
purpose: Define how the Jig product turns candidate work and owner intent into one immutable approved Execution Envelope without widening the run controller's authority boundary.
audience:
  - Owners configuring Jig tracks
  - Engineers implementing the greenfield operator and setup surface
  - Provider authors implementing Work Source integrations
  - Architecture and security reviewers
scope: Envelope Builder responsibilities, input composition, policy/work-profile separation, guided setup, presets, Work Source, and successor-Run re-planning; active-Run lifecycle, provider transport, and setup-command execution are excluded.
state: approved
status: owner-approved 2026-07-17 readiness-remediation candidate; product-readiness lock inactive pending merge and renewed independent exact-candidate review
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ../../product/guarantees.md
  - ./context.md
  - ./model.md
  - ./decisions/D2-system-boundary.md
  - ./decisions/D13-envelope-production-boundary.md
related:
  - ./runtime.md
  - ./data-and-identity.md
  - ./mechanism-and-provider-contracts.md
  - ./product-guarantee-reconciliation.md
---

# Envelope production — tracks, configuration, setup, and Work Source

Jig has two deliberately different responsibility zones. The **Envelope Builder** is a bundled
product front end that helps an owner author and approve immutable Run input. `SYS-JIG` is the
authority-and-proof core that accepts that input and executes it. D2's `X-ENVELOPE` remains
external to the core's decision authority even when Jig ships both zones in one installation.

That separation is substantive: the builder may propose, explain, validate, and compose. It may
not authorize a Run Operation, append a lifecycle Transition, judge evidence sufficient, approve
its own proposal on the owner's behalf, or mutate an accepted Run.

## Envelope Builder responsibilities (`EP-*`)

| ID             | Responsibility                                                                                                                                                                                                                                                                                                         | Authority limit                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EP-SOURCE`    | Invoke a configured Work Source through `PORT-SOURCE` under `ID-SOURCE-REQ`; validate the revision/cursor-bound result identity, content digest, provenance, and plan shape.                                                                                                                                           | Candidate work is unapproved input. Retry is bounded; changed content creates a new candidate and cannot bypass validation or create a Run.                                              |
| `EP-TRACK`     | Resolve one track identity and its plan, policy, and work profile; reject ambiguous or cross-track composition.                                                                                                                                                                                                        | One envelope carries exactly one track.                                                                                                                                                  |
| `EP-FLOORS`    | Compose repo-policy floors with the track policy and emit a proof that every floor is preserved or tightened.                                                                                                                                                                                                          | Composition cannot weaken a repo floor; an unknown rule fails closed.                                                                                                                    |
| `EP-PROFILE`   | Validate the named work profile: model/provider choice, effort, prompt-strategy reference, role realization, and any exhaustive qualifying-checkpoint list. A qualifying checkpoint is expressible only as a cataloged mechanism-produced durable event matching its declared fact kind, never as session self-report. | A work profile may change cost or behavior but cannot lower policy, authority, provider-posture floors, evidence, or review requirements. An unexpressible checkpoint entry is rejected. |
| `EP-PROVIDERS` | Bind each selected provider to an approved authority-manifest digest and qualifying conformance evidence; acquire the provider's `SCH-CAPABILITY-PROOF` through that provider's own configured mechanism-port exchange; for the Agent provider, select one exact native permission posture and declared semantics.     | A missing, changed, stale, insufficient, negative, or policy-incompatible posture or capability proof keeps the envelope unlaunchable.                                                   |
| `EP-SETUP`     | Validate the declared workspace setup recipe, its input-fingerprint rule, and its required authority.                                                                                                                                                                                                                  | The builder declares setup; execution remains an authorized `PORT-WORKSPACE` Operation.                                                                                                  |
| `EP-GUIDANCE`  | Offer versioned presets and explanations for policy, work profile, provider posture, and setup.                                                                                                                                                                                                                        | Guidance is never authority and never becomes a hidden default.                                                                                                                          |
| `EP-COMPOSE`   | Produce the canonical composition report and proposal digest over every resolved input except the approval record.                                                                                                                                                                                                     | Any input change creates a new proposal and proposal digest.                                                                                                                             |
| `EP-PREVIEW`   | Run the identical composition and preflight-validation path and produce a read-only report of what would run, composed policy, bounds, capacity feasibility, and failures.                                                                                                                                             | Preview mints no `ID-RUN`, appends no ledger or `LG-INTAKE` record, dispatches nothing, and creates no submission-time preflight entitlement.                                            |
| `EP-APPROVE`   | Present the exact proposal to Arye and bind his recorded approval to its proposal digest and scope.                                                                                                                                                                                                                    | Pre-Run envelope/configuration approval is reserved to Arye in v1; the builder never self-approves and no pre-Run grant identity exists.                                                 |
| `EP-SUBMIT`    | Submit the approved `SCH-ENVELOPE` through `PORT-INTAKE`, using its composition digest as submission identity, and retain or recover `SCH-INTAKE-ACK`.                                                                                                                                                                 | Same-digest resubmission returns the existing acknowledgement/`ID-RUN`; a different digest is new. Submission never implies preflight success.                                           |

## Canonical input composition

The builder freezes two digests in one versioned `SCH-ENVELOPE`. The **proposal digest** covers
composition items 1–6 and 8 below: every resolved input except the approval record. `EP-APPROVE`
then binds Arye's recorded approval to that proposal digest and its scope. The **composition digest**
covers the proposal digest plus that owner-approval record; it is the sole submission identity at
`PORT-INTAKE`.

1. track identity, exact `SCH-PLAN` content, and its approved plan digest;
2. repo-policy-floor digest, track-policy digest, policy-selected integration mode, and their
   deterministic composition report;
3. the named work-profile digest and every referenced prompt/role artifact digest;
4. provider identities, capability requirements, `SCH-CAPABILITY-PROOF` references, approved
   authority-manifest digests, the exact Agent-provider native permission-posture reference and
   declared semantics, and qualifying conformance-evidence references;
5. target, per-class capacity/reserve and per-Story path-to-safe-point demand composition,
   storage, and other validated configuration;
6. the setup recipe and its freshness-input declaration; and
7. the owner-approval record, binding owner identity, scope, and proposal digest; and
8. `successorLineage`: explicitly `absent` for a genesis envelope, or the predecessor `ID-RUN`,
   predecessor envelope composition digest, durable re-plan reason, affected Story/root-blocker
   set, and predecessor-quarantine-cut position and digest for a successor.

There is no ambient fallback. An omitted required artifact, unknown version, unverifiable
provenance, floor violation, changed authority manifest, unbound reference, inconsistent lineage, or
missing, stale, negative, or mismatched capability proof makes the proposal invalid. `PORT-INTAKE`
independently validates the submitted envelope, including capability-proof freshness and subject
binding, and freezes both digests; it does not trust the builder's success claim.

### Plan validation

`SCH-PLAN` is Jig's design-owned, non-delegable hard-input contract. Under the Envelope Builder's
proposal authority, `EP-COMPOSE` validates before approval that:

- the dependency graph is acyclic;
- every dependency edge names existing stable Story keys, with no dangling Story reference;
- every per-Story done condition is well formed and references a check class present in the exact
  frozen policy; and
- every Story carries its approved requirements and acceptance-criteria content as part of the
  design-owned, non-delegable `SCH-PLAN` content; and
- every Story declares path-to-safe-point demand for each scarce resource class it uses (default
  one), every configurable class reserve is within one through capacity minus one, and preflight
  proves demand plus reserve feasible for every admissible path; and
- the plan resolves to exactly one track and that track's policy reference.

Any failure makes the proposal invalid and fails preflight closed. Engineering may select the wire
encoding and serialization, but it may not change these fields or validation rules. The envelope
freezes the approved plan digest, binding the validated `SCH-PLAN` content — including every
Story's requirements and acceptance criteria — to the Run basis.

### Effect-free preview

Preview is an `EP-PREVIEW` invocation of the Envelope Builder, exposed to first-party consumers
through `PORT-CONSUMER`; it is not a `PORT-INTAKE` call. The Builder executes the identical input
resolution, composition, and preflight-validation path — including plan validation, provider
qualification, bound evaluation, and capacity feasibility — used to prepare a submission. It
returns a read-only report showing what would run, the composed policy (including the
policy-selected integration mode), selected bounds, capacity feasibility, and every validation
failure.

Preview mints no `ID-RUN`, appends nothing to `LG-INTAKE` or any ledger, dispatches no Operation,
and changes no external state. A successful preview is not submission-time preflight success: the
world, source revision, provider proof, capacity, target, or policy-floor basis may change between
preview and start, and `PORT-INTAKE` independently validates the later approved envelope. A lost
capability proof is immutable recorded evidence referenced from the proposal; recovery re-acquires
it through the same provider mechanism-port exchange under `BND-RETRY`, never by treating the
missing proof as a successful prior result.

### Intake idempotency

`PORT-INTAKE` conditionally creates `LG-INTAKE` by composition digest, its sole submission
identity. Preflight validates
lineage consistency before that create/read: a successor names an existing predecessor
acknowledgement and `ID-RUN`, carries a non-empty re-plan reason, and provides a
predecessor-quarantine cut. A verified read of the predecessor's durable record at that position
must match the cut digest and prove every named affected Story/root-blocker is preserved-and-parked
or terminal; otherwise intake fails closed. A genesis envelope carries the explicit `absent` value
and no predecessor fields. The composition digest covers these lineage bytes. Any mismatch fails
closed. One predecessor quarantine cut binds at most one accepted successor: a second successor
submission naming an already-consumed cut fails intake closed. The first
submission binds one immutable acknowledgement and `ID-RUN`; a duplicate returns that exact value,
and a lost acknowledgement is recovered by digest lookup. Only a different composition digest is a
new submission. The submitter can therefore retry after ambiguity without forking two Runs from one
approval.

## Policy and work profile

The split is structural rather than editorial:

- **Policy** owns governance: acceptance and review strength, authority categories, anti-gaming
  floors, escalation posture, confinement minima, required checks, the integration/merge-spectrum
  mode, capacity maxima, and bounds. Repository-floor composition may forbid weaker integration
  modes and can only preserve or strengthen the track-policy selection.
- **Work profile** owns realization: agent/model selection, effort and cost posture, versioned
  prompt strategy, participant/provider realization of implementer and reviewer roles, and any
  exhaustive qualifying-progress checkpoint list.

The composition report proves that no work-profile field is consulted as a safety-floor value.
When a work-profile choice cannot satisfy policy — for example a provider lacks a required
capability or independent reviewer principal — the envelope fails before Run creation instead of
silently reducing the requirement.

Configuration and providers cannot lower, replace, or reinterpret the policy-selected integration
mode. A future delegate-approval model for pre-Run envelopes is explicitly deferred; it has no
authority in this candidate. `ID-GRANT` remains per-Run and operational-only.

## Guided setup and presets

Presets are immutable, versioned proposal inputs with a human-readable rationale, suitable-use
conditions, and explicit trade-offs. Applying one records its identifier and digest, expands it
into ordinary visible policy/profile/configuration fields, and lets the owner inspect and override
those fields. The expanded values, not the preset name, are authoritative.

Prompt strategies are versioned work-profile references. Dynamic, templated, and stable role
prompts are all legal when their exact content or generator version is digest-bound. Hidden
provider intuition is not configuration provenance.

## Work Source seam (`PORT-SOURCE`)

`PORT-SOURCE` is the fourth product-level swappable seam. It belongs to envelope production, not
the active Run authority core. A conforming Work Source:

- returns candidate work with stable source identity and provenance;
- accepts one stable `ID-SOURCE-REQ` over the normalized request basis and returns
  `SCH-SOURCE-EXCHANGE` with stable item key, revision/cursor, content digest, and attestation;
- supports repeatable lookup of that exact result identity, so refresh cannot silently substitute
  different work;
- retries within `BND-RETRY`; exhaustion fails the envelope-production request before any Run or
  Story exists;
- passes the same identity, authority-manifest, conformance, and adversarial-probe bar as other
  providers; and
- has no path to `PORT-INTAKE`, `CP-TRANSITION`, the ledger, or delivery Operations except through
  a newly composed and owner-approved envelope.

The hard input boundary remains an approved plan. A Work Source makes plan candidates easier to
obtain; it does not convert an issue, ticket, or provider assertion directly into executable work.
A refresh that returns a changed revision or content digest creates a new source result, candidate,
and envelope proposal. It never mutates an earlier candidate or approved envelope.

## Re-planning and successor Runs

The active envelope is immutable. Prevention-leaning policy may quarantine affected work and
request re-planning, but the result is a **successor envelope** and a **successor Run** carrying:

- the predecessor Run and envelope identities;
- the durable reason and affected Story/root-blocker set;
- the new plan, policy, work profile, and evidence bases; and
- a fresh owner approval over the successor proposal digest; and
- the lineage bytes that distinguish its predecessor identity, reason, and affected work from every
  otherwise identical successor proposal.

The predecessor remains reconstructible and is never rewritten. Independent work may land before
the successor according to the predecessor's frozen policy; no successor fact is retroactively
inserted into it.

## View V18 — product front end to authority core

- **Question:** How do candidate work and owner configuration become an immutable approved envelope
  without giving the builder or Work Source active-Run authority?
- **View type:** Runtime/supporting boundary view across the Jig product front end and V1.
- **Audience and purpose:** Owners, implementers, provider authors, and security reviewers; locate
  configuration ownership and the fourth provider seam before implementation planning.
- **Scope and exclusions:** Envelope production and submission. Story execution, setup-command
  execution, review, finalization, and landing remain in the existing Layer 2 views.
- **State:** Owner-approved product-readiness amendment; lock pending exact-candidate review.
- **Owner:** Arye Kogan.
- **Sources:** CFG-2/3/5/6/8, STACK-2, D2, D13.
- **Related views:** [V1](./context.md) owns `X-ENVELOPE` and `SYS-JIG`; [V6](./runtime.md) opens the
  authority core; [V12](./mechanism-and-provider-contracts.md) owns provider trust.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, ui-sans-serif, system-ui", "primaryTextColor": "#172033", "lineColor": "#65758b"}}}%%
flowchart LR
    Owner(["P-OWNER<br/>Arye Kogan<br/>[Pre-Run approval authority]"])
    subgraph SourceZone["Candidate-work providers"]
        Source["X-WORK-SOURCE<br/>Configured Work Source<br/>[External provider]"]
    end
    subgraph FrontEnd["Jig product front end, outside Run authority"]
        Builder["EP-BUILDER<br/>Validate · compose · explain<br/>[Envelope Builder]"]
        Proposal["SCH-ENVELOPE<br/>Exact proposal and composition digests<br/>[Immutable proposal]"]
    end
    subgraph Core["SYS-JIG authority-and-proof boundary"]
        Intake["PORT-INTAKE<br/>Independent validation and freeze<br/>[Core port]"]
        Controller["RT-CONTROLLER<br/>Run lifecycle authority<br/>[Trusted runtime]"]
    end

    Source -->|"supplies candidate work and provenance through PORT-SOURCE to"| Builder
    Builder -->|"produces exact"| Proposal
    Proposal -->|"presents for approval to"| Owner
    Owner -->|"approves the exact proposal digest of"| Proposal
    Proposal -->|"submits only after approval through"| Intake
    Intake -->|"freezes a valid envelope for"| Controller

    style SourceZone fill:#f3edff,stroke:#8a6eb0,color:#172033
    style FrontEnd fill:#eef5ff,stroke:#7a96bd,color:#172033
    style Core fill:#fff6dd,stroke:#b8903a,color:#172033
    classDef person fill:#e8f1ff,stroke:#5a78a8,color:#172033
    classDef provider fill:#f1e9ff,stroke:#8061a8,color:#172033
    classDef builder fill:#e8f1ff,stroke:#5a78a8,color:#172033
    classDef artifact fill:#edf8f0,stroke:#659574,color:#172033
    classDef core fill:#fff1cf,stroke:#a8781f,stroke-width:3px,color:#172033
    class Owner person
    class Source provider
    class Builder builder
    class Proposal artifact
    class Intake,Controller core
```

**V18 legend:** The rounded node is a person; rectangles are a provider, builder, artifact, port,
or runtime. Purple is the external Work Source zone, blue the product front end outside Run
authority, and yellow the trusted core. Thick yellow borders mark the authority boundary. Every
solid arrow carries candidate input, a proposal, approval, or validated intake; no Work Source
arrow reaches the core. Color is redundant with IDs and bracketed types. `EP` means
envelope-production responsibility and `SCH` a schema family.

## Exclusions and next reading

- Setup execution and freshness receipts: [mechanism and provider contracts](./mechanism-and-provider-contracts.md).
- Envelope and manifest schemas: [data and identity](./data-and-identity.md).
- Active-Run intake and controller processes: [runtime architecture](./runtime.md).
- Why this boundary was selected: [D13](./decisions/D13-envelope-production-boundary.md).
