---
title: "D16 — final empty-repository readiness contract closure"
purpose: Record the owner-selected terminal-stop settlement, bounded rework-assignment, and accepted-successor uniqueness contracts that close the final empty-repository readiness findings.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers implementing the greenfield Jig generation
scope: The three final readiness choices, their alternatives, authority limits, accepted costs, and required conformance evidence; no implementation or delivery sequencing is selected.
state: approved
status: owner-approved direction of 2026-07-18; exact-candidate review pending
owner: Arye Kogan
last_verified: 2026-07-18
sources_of_truth:
  - ./product-readiness-gate-record.md
  - ../../guidelines/readiness-closure-rubric.md
related:
  - ./README.md
  - ../flows/run-and-story-lifecycle.md
  - ../lifecycle-catalogs.md
  - ../data-and-identity.md
  - ../persistence-and-projections.md
  - ../architecture-conformance.md
---

# D16 — final empty-repository readiness contract closure

- **Status:** Owner-approved; renewed exact-candidate review pending.
- **Owner:** Arye Kogan.
- **Related:** [Product readiness gate](./product-readiness-gate-record.md),
  [Run and Story lifecycle](../flows/run-and-story-lifecycle.md),
  [lifecycle catalogs](../lifecycle-catalogs.md), and
  [architecture conformance](../architecture-conformance.md).

## Context and decision drivers

The 2026-07-18 empty-repository readiness review found three in-rubric blockers in the exact merged
candidate: terminal `Stopped` settlement duties had no executable transition/authorizer path;
bounded rework had no complete role-session assignment path; and the asserted one-successor-per-cut
rule had no atomic cross-digest guard. The correction must preserve the approved product behavior,
single control authority, existing ports, boundedness, and one intake authority of record.

## Owner-selected direction

### Terminal-stop settlement overlay

Terminal `Stopped` remains the Run-level, non-resumable non-delivery outcome. Both cataloged
in-ledger entry paths — exact owner decision from `Suspended`, or `FC-TRUST` recovery observation
while a trustworthy witnessed append basis remains — open the same overlay. It preserves every
unfinished Story's existing state and applies a durable Run-scoped Settlement overlay rather than
manufacturing a Story business outcome or forcing the Story into `Retiring`. The overlay freezes
business dispatch and carries the complete, finite preservation, session-close, review-retirement,
workspace-retirement, authority-reconciliation/release, artifact, and residual-obligation duty set.
Only cataloged terminal-stop overlay Transitions may advance it. Terminal settlement commits only after
every duty completes or has an exact owner-accepted handoff; the existing post-terminal append
allow-list then applies unchanged.

This direction is the explicit bounded reopen needed to reconcile D4 and D8 with the already
approved terminal-stop prose. It does not make the Settlement overlay a Story state or redefine
ordinary business-outcome Retirement.

### Fresh bounded assignment for every rework turn

Every admitted rework turn creates a fresh logical Jig assignment and `ID-SESSION` lifecycle,
binding the exact Story, role, rework ordinal, Candidate/verdict or failed-check basis, bounds,
provider posture, and authorizing Transition. A provider may reuse an underlying process or
connection, but that reuse grants no standing Jig authority and is not a session reconnect. The
previous same-role assignment must be terminal and reconciled or fenced before the next assignment
can act. Existing rework, capacity, retry, and silence bounds retain their current exhaustion
outcomes and are not renewed by reconnect or replacement.

### Atomic accepted-successor cut claim

`LG-INTAKE` remains the single intake authority of record. For an accepted successor, one atomic,
witness-covered commit creates both the composition-digest acknowledgement and a unique claim keyed
by predecessor Run plus the full quarantine-cut position and digest. The acknowledgement and claim
bind each other without a self-referential digest. A concurrent different-digest submission for the
same cut loses deterministically, creates no claim or Run, and receives a durable rejected
acknowledgement naming the witnessed winner. Same-digest replay, crash recovery, and lost
acknowledgement return the original result.

## Options not selected

- Move every terminally stopped Story into `Retiring`, which would invent a Story outcome and alter
  the approved preserved-state meaning.
- Reuse an active rework session under standing assignment authority, which would leave the new
  turn, bounds, and result attribution unfenced.
- Serialize all intake globally or introduce a second successor registry, either of which would
  widen the selected authority/storage model.
- Rely on a pre-read or witness alone for successor uniqueness; neither makes two different intake
  keys conflict atomically.

## Consequences and required evidence

- The data model gains explicit Settlement and intake-cut-claim carriers and their deterministic
  identities/bindings.
- The lifecycle catalog gains phase-preserving terminal-stop and rework-session paths but no new Run
  phase, Story state, port, provider power, or delivery authority.
- Intake implementations must support the specified atomic two-key semantic commit inside the one
  witnessed intake index.
- Existing conformance suites must add exhaustive duty-order, rework-session, concurrency, crash,
  replay, stale-result, and recovery probes. No new acceptance philosophy or provider waiver is
  created.
- Physical representation, wire encoding, package decomposition, and provider implementation remain
  delegated only within the existing delegation register.
