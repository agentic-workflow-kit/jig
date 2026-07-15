---
title: "D11 — ledger realization"
purpose: Record the proposed Layer 2 selection of a storage-agnostic conditional-append ledger contract with a single-host append-only file reference realization.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers realizing the Layer 2 design
scope: The D11 selection, rationale, accepted consequence, and rejected alternatives; the canonical persistence content is owned by the persistence-and-projections page.
state: proposed
status: proposed Layer 2 decision, authored 2026-07-15 under the owner continuation instruction; pending the Layer 2 independent review and owner stop
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../persistence-and-projections.md
  - ./D5-state-authority-and-recovery.md
  - ./D9-invariants-and-artifact-shape.md
  - ./D10-runtime-decomposition.md
related:
  - ./README.md
  - ../state-and-recovery.md
  - ../invariants.md
---

# D11 — ledger realization

- **Status:** Proposed Layer 2 selection; pending the Layer 2 gate and owner stop.
- **Owner:** Arye Kogan.
- **Related:** [Persistence and projections](../persistence-and-projections.md),
  [state and recovery](../state-and-recovery.md), [invariants I5–I6, I17, I20](../invariants.md).

## Question

Which persistence realization satisfies D5's durable ordered ledger authority, consuming the D9
category 5 deferral without creating a second source of truth or weakening record-before-adopt/
dispatch ordering?

## Proposed direction

Use a **storage-agnostic conditional-append ledger contract with a single-host append-only file
reference realization**:

- `PORT-LEDGER` is defined as a contract every conforming backend must satisfy: a single logical
  writer per Run enforced by the durable controller generation; a conditional append carrying the
  Transition identity, the expected prior position, the record's content digest, and the chained
  previous-record digest; atomic commit at exactly the expected position or rejection with the
  actual position; acknowledgement only after durable flush; and digest-verified ordered reads;
- records are hash-chained per Run, verified on recovery, and never rewritten in place — schema
  evolution is upcast-on-read;
- snapshots and projections are verified, disposable accelerators rebuilt from the ledger, never
  competing authority; and
- the reference realization is an append-only, segmented, fsync-on-acknowledge structured-record
  log per Run in `RT-LEDGER`'s directory; the contract, not the file format, is canonical, and a
  replacement backend qualifies by passing the ledger conformance suite.

The canonical contract, integrity, snapshot, compaction, backup, and disaster-recovery content is
recorded in [persistence and projections](../persistence-and-projections.md); this decision selects
the realization shape.

## Rationale and benefits

- Realizes D5's lost-acknowledgement resolution mechanically: re-reading the expected position by
  Transition identity yields confirmed committed, confirmed absent, or indeterminate, with no
  blind retry.
- Keeps authority in recorded content and ordering (I5) rather than in backend behavior, matching
  D10's passive-store rule and keeping storage a replaceable conforming mechanism.
- The hash chain makes rollback, fork, and tampering detectable, giving the I20 fail-closed rule a
  concrete trigger instead of a hope.
- A per-Run append-only file log needs no service dependency, fits the single-host deployment
  shape, and keeps the trusted persistence path small and auditable.

## Accepted negative consequence and trade-off

Single-writer serialization per Run caps one Run's commit throughput at one ordered stream, and
every alternative backend carries the conformance burden of proving the full contract rather than
just storing bytes. The file-based reference realization ties durability to the host filesystem's
flush guarantees, so a lying disk or filesystem weakens the durability promise beneath the
contract. These costs are accepted in exchange for verifiable ordered authority and deterministic
recovery.

## Alternatives not selected

- **Embedded relational database as the authority:** rejected because it makes durable truth a
  mutable table that only discipline keeps append-only, and it hides ordering inside transaction
  machinery instead of exposing it as verifiable positions and chained digests.
- **Hosted event-streaming platform as the authority:** rejected because it makes a remote service
  the trust root of every Run and couples single-host operation to network availability; a
  conforming hosted backend remains possible later through the conformance suite without being the
  selected authority shape.

## Deliberate deferrals

Segment sizes, fsync batching, and directory layout are realization detail decided with the
reference implementation; they cannot change the contract clauses, the single-writer rule, the
chain-verification obligation, or the fail-closed trust-root behavior selected here.
