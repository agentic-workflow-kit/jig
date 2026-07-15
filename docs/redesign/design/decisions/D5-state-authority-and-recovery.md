---
title: "D5 — durable, transient, and derived state"
purpose: Record the owner-selected durable ordered Transition ledger authority with reconstructable live state.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Future Layer 2 architecture authors after authorization
scope: The D5 selection, rationale, accepted consequence, rejected alternatives, and Layer 2 deferral; the canonical state model is owned by the state-and-recovery page.
state: proposed
status: established owner decision, re-presented 2026-07-15; lock pending the Layer 1 gate
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../brief.md
  - ../../raw/design/decisions.md
related:
  - ./README.md
  - ../state-and-recovery.md
  - ../invariants.md
---

# D5 — durable, transient, and derived state

- **Status:** Owner-selected; lock pending the Layer 1 gate.
- **Owner:** Arye Kogan.
- **Related:** [State and recovery](../state-and-recovery.md),
  [invariants I5–I7, I17](../invariants.md).

## Question

Which facts are authoritative and durable, which are transient or derived, and how does Jig resume
safely after interruption or uncertain persistence/effect outcomes?

## Owner-selected direction

Use a **durable ordered Transition ledger as authority with reconstructable live state**:

- allocate stable Transition and Operation identities before dispatch;
- conditionally commit accepted transitions and Operation intents before live adoption or dispatch;
- resolve lost commit acknowledgement by stable identity and expected prior position;
- keep live state, queues, capacity calculations, and read models as replaceable projections;
- reject stale authority with durable controller, Operation, Candidate, target, and finalization
  fences;
- fence prior control and reconstruct/reconcile pending or uncertain effects before resume;
- forbid a new semantic effect until the earlier effect is known absent or reconciled;
- make owner decisions, parked questions, landing proof, preservation proof, and Residual Obligations
  durable; and
- fail closed to externally governed Recovery after authoritative storage becomes compromised or
  irrecoverable.

## Rationale and benefits

- Closes the archive's append-acknowledgement uncertainty.
- Supports deterministic Recovery, audit, and no-blind-retry behavior.
- Keeps derived state recomputable instead of creating another mutable authority.

## Accepted negative consequence and trade-off

Ordered conditional persistence, reconstruction, schema evolution, and reconciliation become
critical obligations. The ledger alone cannot prove remote state. Arye accepted demanding storage
and effect contracts in exchange for strong Recovery and audit.

## Alternatives not selected

- Durable current state plus a separate audit stream.
- In-memory authority with durable audit only and no autonomous resume.

## Deliberate Layer 2 deferral

Ledger technology, schemas, snapshots, projections, replication, compaction, backup, migration,
fence representation, and provider-specific reconciliation remain deferred. Durable authority and
record-before-adopt/dispatch ordering do not.
