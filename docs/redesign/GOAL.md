---
title: "Deterministic story orchestration — initiative goal"
status: active — high-level architecture not yet approved
---

# Main goal: define and approve Jig's canonical full-lifecycle architecture

## Goal

Design from first principles and obtain owner approval for a new canonical architecture for Jig's
complete deterministic multi-story delivery lifecycle.

The architecture must cover the path from an approved execution plan, policy, and configuration
through story scheduling, isolated implementation, independent acceptance, evidence handling,
concurrent execution, serialized landing, failure and liveness handling, interruption recovery,
no-double-effect behavior, authority enforcement, and durable observable outcomes.

Existing product documents, design documents, ADRs, reviews, proposals, and runtime behavior are
evidence and comparison points. They do not define the desired architecture merely because they
already exist.

When the proposed architecture conflicts with the current product contract, the design work must
state explicitly:

- the current product promise;
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
3. every conflict with the current product contract has an explicit proposed revision, rationale,
   and tradeoff;
4. all material architectural decisions and failure semantics are closed;
5. the final architecture has received explicit owner approval; and
6. that approval is durably recorded.

## Non-goals

- Runtime implementation.
- Migration planning.
- Delivery sequencing.
- Preserving the current architecture or product contract by default.
- Updating every existing document merely for consistency.
- Treating any current proposal or review as the desired end state.

## Relationship to existing artifacts

The immutable standalone proposal under
[`deterministic-story-orchestration/`](./deterministic-story-orchestration/) and its independent
reviews under [`reviews/`](./reviews/) are inputs to the initiative, not the locked architecture.
Their current `agreed`, `draft`, or `proposal` labels describe the standalone proposal's internal
status; they do not constitute Stage 1 or Stage 2 approval under this goal.

Review synthesis may identify problems and options, but it cannot approve or change the
architecture. Only explicit owner approval locks a stage.
