---
title: "Deterministic story orchestration — next conceptual design decisions"
status: planning companion — open design work, not yet agreed design
---

# Next conceptual design decisions

## Purpose and status

This file records where the standalone proposal currently stands and orders the remaining
conceptual design work. It is a planning companion, not another agreed design layer. Settled
decisions belong in the linked layer documents; items here remain open until a later design cycle
agrees and moves them into the proposal.

The proposal remains self-contained and unreconciled with the current Jig product, design, or
implementation model.

## Current position

The functional spine is agreed:

| Area             | Current agreement                                                                                                   | Source                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Inputs           | One approved immutable plan, uniform policy, concrete configuration, and resolved story routes                      | [Inputs](inputs.md)                                     |
| Core and runtime | Deterministic decisions are separate from runtime validation, persistence, live state adoption, and effect dispatch | [Orchestration](orchestration.md)                       |
| Story execution  | One isolated delivery unit per story, retained implementer and reviewer, bounded review and target-refresh loops    | [Story execution](story-execution.md)                   |
| Delivery         | Serialized finalization, policy-driven checkpointing and delivery, exact landing confirmation, safe cleanup         | [Delivery and operations](delivery-and-operations.md)   |
| Events           | Event-only durable storage, trusted envelopes, and persistence before live-state adoption or operation dispatch     | [Events and runtime state](events-and-runtime-state.md) |
| Live state       | Separate run and story entities, centralized atomic management, operation registry, and compact terminal retention  | [Live state](live-state.md)                             |

The proposal therefore defines what the simplified engine must accomplish, the main lifecycle
invariants, and the conceptual live-state ownership model. Three additional contract layers have
been drafted autonomously for review; failure/liveness and the later slices remain undesigned.

## Draft layers awaiting review

| Slice                  | Draft direction                                                                                                            | Document                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Port boundaries        | Six narrow ports: event store, artifact store, agent sessions, workspace, local verification, and delivery                 | [Port boundaries](ports.md)                         |
| Operations and results | Closed request/result unions, factual completed versus technical failure, operation catalog, validation, and idempotency   | [Operations and results](operations-and-results.md) |
| Evidence and artifacts | Bounded decision facts and manifests, immutable artifact references, trusted attribution, integrity, access, and retention | [Evidence and artifacts](evidence-and-artifacts.md) |

These documents are review drafts, not agreed layers. Approval should either accept them, revise
them, or return the affected slice to open design before the proposal treats their contracts as
settled.

## Recommended design order after draft review

### 1. Failure and liveness semantics

Complete the runtime behavior for:

- retryable, terminal, and best-effort operation failures;
- timeouts and cancellation;
- duplicate, stale, late, or mismatched results;
- event-persistence failure;
- operation identity and idempotency expectations;
- runtime interruption without recovery; and
- the boundary between blocking one story and interrupting the entire run.

Recovery remains deferred, but first-phase operation semantics should avoid making later recovery
or reconciliation impossible.

### 2. Composition and authority

Define how the approved configuration selects concrete implementations and how preflight proves
that they can satisfy policy. Cover:

- capability declaration and validation;
- provider/profile resolution;
- credential ownership and scoping;
- the runtime composition boundary;
- clock and identifier generation; and
- enforcement that implementer and reviewer sessions never receive delivery authority.

### 3. Read models and observability

Separate live and durable views:

- live inspection reads the active in-memory state;
- completed-run summaries consume the terminal event data;
- metrics, logs, exports, and future projections consume persisted events; and
- no observer or read model may become an undeclared control-state source.

An event bus, replay model, and projection-backed recovery remain separate future decisions.

### 4. Testing and conformance

Define the evidence required to trust the design:

- pure transition tests for the orchestration core;
- runtime tests proving event persistence precedes state adoption and effect dispatch;
- port conformance suites for every implementation;
- boundary-validation and producer-attribution tests;
- story simulations for review loops, target movement, blocking, and independent continuation;
  and
- delivery tests proving that only the approved exact candidate can land.

## Explicitly deferred beyond the first phase

The following are not prerequisites for completing the conceptual first-phase design:

- replay-derived runtime state, snapshots, and interrupted-run recovery;
- an event bus or direct event submission by multiple producers;
- agent-session replacement or dynamic route escalation;
- hosted pull-request review and feedback processing;
- multiple repositories or integration targets in one run; and
- reconciliation or migration against the current Jig architecture.

## Completion criterion

The conceptual design is implementation-ready when the ordered slices above define clear
responsibility, ownership, inputs, outcomes, and failure boundaries without introducing provider
details or contradicting the already-agreed invariants. Field-level schemas and implementation
planning should follow that conceptual closure rather than lead it.
