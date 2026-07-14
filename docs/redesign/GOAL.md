---
title: "Deterministic story orchestration — initiative goal"
purpose: Define the approved problem, outcomes, scope, approval model, and decision ownership for Jig's full-lifecycle architecture redesign.
audience:
  - Jig owner
  - Architecture authors and reviewers
  - Product, engineering, security, and operations stakeholders
scope: Layer 0 project definition for the redesign initiative; architecture, implementation, migration, and delivery sequencing are excluded.
state: approved
status: approved — Layer 0 project definition; Stage 1 architecture not yet approved
owner: Arye Kogan (Jig owner)
last_verified: 2026-07-14
approved_on: 2026-07-14
amended_on: 2026-07-14
sources_of_truth:
  - Explicit owner approval recorded in this document
related:
  - ./README.md
  - ./guidelines/README.md
  - ./guidelines/01-high-level-architecture.md
---

# Main goal: define and approve Jig's canonical full-lifecycle architecture

## Goal

Design from first principles and obtain owner approval for a new canonical architecture for Jig's
complete deterministic multi-story delivery lifecycle.

The architecture must cover the path from an approved execution plan, policy, and configuration
through story scheduling, isolated implementation, independent acceptance, evidence handling,
concurrent execution, serialized landing, failure and liveness handling, interruption recovery,
no-double-effect behavior, authority enforcement, and durable observable outcomes.

The default architecture working set is this `docs/redesign/` workspace. Work must reason from this
goal first, then use the immutable standalone proposal under
[`deterministic-story-orchestration/`](./deterministic-story-orchestration/) as the primary source of
the owner's redesign direction and the independent files under [`reviews/`](./reviews/) as
adversarial checks. The proposal is directional source material, not an approved or locked design.

Product documents, design documents, ADRs, runtime behavior, and other artifacts outside
`docs/redesign/` are not default inputs to this initiative. They enter scope only when the owner
explicitly requests a comparison or imports a specific external promise or constraint for the new
architecture to address.

When the proposed architecture conflicts with this goal, an explicit owner decision, or an external
promise or constraint that the owner has deliberately imported into scope, the design work must
state explicitly:

- the governing constraint or imported promise;
- the proposed revision;
- why the revision is preferable;
- which behavior, guarantee, or tradeoff changes; and
- the owner decision required to approve the revision.

## Approval model

Architecture approval has two locked stages.

### Stage 1 — high-level architecture

Define the architectural foundation:

- system responsibilities and boundaries;
- trusted and untrusted components;
- authority ownership;
- primary lifecycle and data flow;
- major state and persistence model;
- concurrency and landing strategy;
- acceptance and evidence model;
- failure and recovery posture; and
- key architectural invariants.

Present the high-level architecture for explicit owner approval. Once approved, it is locked. Any
later change to a locked high-level decision requires an explicit reopen and renewed owner approval.

### Stage 2 — decision-complete architecture

Elaborate the locked foundation into a decision-complete architecture defining:

- component responsibilities;
- states and transitions;
- input and output contracts;
- ports and authority boundaries;
- operation and result semantics;
- scheduling and concurrency rules;
- evidence and acceptance flow;
- persistence, idempotency, and recovery;
- failure, retry, timeout, and liveness behavior;
- landing and cleanup behavior;
- security and credential boundaries;
- observability and audit records; and
- required architectural verification and conformance.

Stage 2 may refine the locked foundation but cannot change it without reopening Stage 1.

## Completion criteria

The goal is complete only when:

1. the high-level architecture has been explicitly approved and locked;
2. the decision-complete architecture is internally coherent and covers the full lifecycle;
3. every conflict with this goal, an owner decision, or an explicitly imported external promise has
   an explicit proposed revision, rationale, and tradeoff;
4. all material architectural decisions and failure semantics are closed;
5. the final architecture has received explicit owner approval; and
6. that approval is durably recorded.

## Non-goals

- Runtime implementation.
- Migration planning.
- Delivery sequencing.
- Preserving the current architecture or product contract by default.
- Reconciling the redesign to repository product, design, ADR, delivery, or runtime artifacts that
  the owner has not explicitly imported into scope.
- Updating every existing document merely for consistency.
- Treating any current proposal or review as the desired end state.

## Relationship to existing artifacts

The immutable standalone proposal under
[`deterministic-story-orchestration/`](./deterministic-story-orchestration/) is the primary
directional source for the redesign. New architecture should preserve and refine its useful model,
decisions, and vocabulary in the correct guideline layer and document context rather than starting
from unrelated repository documentation or continuing to edit the proposal in place.

The proposal's independent reviews under [`reviews/`](./reviews/) are corrective evidence. Read the
proposal first, then use the reviews to expose contradictions, missing guarantees, and decision
questions that the new design must address. Review findings are not automatic design decisions.

The proposal's internal `agreed`, `draft`, or `proposal` labels describe only that standalone
artifact's status; they do not constitute Stage 1 or Stage 2 approval under this goal. The new design
must be recreated under the durable `design/` folder, with its layer and approval state recorded in
artifact metadata rather than encoded in the folder name.

Review synthesis may identify problems and options, but it cannot approve or change the
architecture. Only explicit owner approval locks a stage.

## Layer 0 approval record

- **Decision:** Approved as the Layer 0 project definition for the Jig architecture redesign.
- **Approver:** Arye Kogan (Jig owner).
- **Approval date:** 2026-07-14.
- **Effect:** Authorizes Stage 1 work to define and present a proposed high-level architecture for
  explicit owner approval and lock.
- **Does not approve:** Any architectural shape, product-contract revision, Stage 1 decision,
  implementation change, migration plan, or delivery sequence.
- **Source-scope amendment:** On 2026-07-14 the owner directed the initiative to remain focused on
  `docs/redesign/`, to use the standalone proposal as the primary redesign-direction source, to use
  its reviews as adversarial checks, and not to import repository product, design, ADR, delivery, or
  runtime artifacts unless the owner explicitly expands scope.
