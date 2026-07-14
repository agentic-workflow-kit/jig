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
| Events and state | In-memory runtime state, event-only durable storage, trusted envelopes, persistence before state and operations     | [Events and runtime state](events-and-runtime-state.md) |

The proposal therefore defines what the simplified engine must accomplish and the main lifecycle
invariants. It does not yet define all of the core state entities, external port contracts,
operation/result types, artifact boundaries, or runtime failure mechanics required to implement
that model cleanly.

## Recommended design order

### 1. Live in-memory state entities

This is the recommended next design slice because both core transitions and port contracts need a
shared vocabulary for the live state they affect.

Define conceptually:

- what belongs to `RunState` versus each `StoryState`;
- candidate, review, approval, branch, worktree, agent-session, delivery, and finalization-lease
  references;
- which values are owned state and which are derived from the plan or other state;
- how pending operations and resource usage are represented;
- where review-fix and target-refresh counters live;
- which facts are invalidated when the candidate SHA changes; and
- the invariants that prevent contradictory live states.

This slice should settle entities, ownership, relationships, and invalidation rules without yet
designing field-level serialization schemas.

### 2. Port boundaries

Define the minimum semantic capabilities the runtime needs from the external world. The candidate
first-phase boundaries are:

- **Agent-session port:** create, continue, identify, and close retained implementer and reviewer
  sessions.
- **Workspace port:** create, inspect, update, and safely remove story worktrees and branches.
- **Event-store port:** atomically append trusted persisted events and expose only the storage
  behavior required by the first phase.
- **Local-verification port:** execute the configured final check set against an exact candidate.
- **Delivery port:** checkpoint or deliver an exact branch and SHA, optionally create a pull
  request, observe remote checks, merge, and confirm landing.

The exact port operations and result types are not yet agreed.

The first phase does not currently need:

- a **plan-source port**, because an approved immutable envelope is supplied to the runtime;
- a separate **execution-host port**, because environment mechanics remain behind the agent and
  verification implementations;
- a forge-specific port, because GitHub or another forge is an implementation of delivery; or
- an observability control port, because observability consumes events and must not affect
  orchestration decisions.

These exclusions remain design recommendations until the port slice is agreed.

### 3. Typed operations, messages, and results

For each agreed port, define:

- the semantic operation the runtime may request;
- the typed success, failure, and rejected-result outcomes;
- operation identity and request/result matching;
- role-specific agent assignments and responses;
- validation at the runtime boundary; and
- the mapping from each accepted result to the agreed event catalog.

Provider SDK objects, raw GitHub responses, filesystem implementation details, and agent-provider
protocol objects must remain behind their adapters.

### 4. Evidence and artifact boundary

Decide which decision-relevant evidence remains inline in typed event payloads and which large data
is stored separately behind immutable references. This includes:

- implementer check output;
- patches and changed-path evidence;
- reviewer diagnostics;
- final local-verification logs;
- remote-check and merge evidence; and
- optional agent transcripts.

The design must also set redaction, integrity, retention, and missing-artifact behavior without
turning raw artifact parsing into orchestration judgment.

### 5. Failure and liveness semantics

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

### 6. Composition and authority

Define how the approved configuration selects concrete implementations and how preflight proves
that they can satisfy policy. Cover:

- capability declaration and validation;
- provider/profile resolution;
- credential ownership and scoping;
- the runtime composition boundary;
- clock and identifier generation; and
- enforcement that implementer and reviewer sessions never receive delivery authority.

### 7. Read models and observability

Separate live and durable views:

- live inspection reads the active in-memory state;
- completed-run summaries consume the terminal event data;
- metrics, logs, exports, and future projections consume persisted events; and
- no observer or read model may become an undeclared control-state source.

An event bus, replay model, and projection-backed recovery remain separate future decisions.

### 8. Testing and conformance

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
