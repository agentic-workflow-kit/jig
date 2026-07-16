---
title: "D6 — concurrency, capacity, and finalization"
purpose: Record the owner-selected resource-class capacity, deterministic ordering, and single target-scoped finalization authority.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Future Layer 2 architecture authors after authorization
scope: The D6 selection, rationale, accepted consequence, rejected alternatives, and Layer 2 deferral; the canonical concurrency model is owned by the concurrency-and-finalization page.
state: proposed
status: established owner decision, re-presented 2026-07-15; lock pending the Layer 1 gate
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../brief.md
  - ../../raw/design/decisions.md
related:
  - ./README.md
  - ../concurrency-and-finalization.md
  - ../invariants.md
---

# D6 — concurrency, capacity, and finalization

- **Status:** Owner-selected; lock pending the Layer 1 gate.
- **Owner:** Arye Kogan.
- **Related:** [Concurrency and finalization](../concurrency-and-finalization.md),
  [invariants I10–I14](../invariants.md).

## Question

How does Jig admit concurrent work deterministically, avoid resource deadlock and starvation,
serialize target change, and derive dependency consequences?

## Owner-selected direction

Use **explicit resource-class capacity, deterministic ordering, and one target-scoped finalization
authority**:

- model actual scarce resource classes instead of active Stories alone;
- let policy define maxima and progress requirements while configuration declares hard capacity;
- prioritize progress and Retirement of admitted work over new admission when constrained;
- use approved plan priority, immutable plan ordinal, and unique Story identity as the total
  comparator for otherwise-equal admission, finalization, and blocker attribution;
- let Accepted Stories wait without finalization authority;
- allow exactly one Story to hold durable finalization authority for the configured target;
- permit bounded target refresh to retain Story ownership while requiring full review and atomic
  authority rebinding after Candidate mutation;
- release authority for ordinary implementation rework;
- release dependencies only after confirmed landing;
- preserve the complete canonically ordered set of reachable direct non-delivery roots — directly
  `Blocked` or `Rejected`; and
- make finite-run scheduling starvation-resistant under the recorded liveness assumptions.

An operator suspension fences and releases any held target-scoped finalization authority while
preserving the underlying Story phase. Resume must reacquire and rebind authority before any
target-changing dispatch, so a deliberately suspended Run cannot starve other Runs.

## Rationale and benefits

- Resolves the proposal's Story-count/session-capacity contradictions and reviewer-capacity deadlock
  risk.
- Preserves concurrent implementation and review while serializing target change.
- Makes every admission, finalization, and attribution tie deterministic.
- Models provider-specific capacity without giving providers decision authority.

## Accepted negative consequence and trade-off

Resource-class configuration and scheduling are more complex. Conservative progress reserve and one
target finalizer may leave available capacity idle. Arye accepted lower utilization in exchange for
liveness and correctness.

## Alternatives not selected

- Full Story-bundle slots that reserve every possible resource for an admitted Story.
- One Story active end to end.

## Deliberate Layer 2 deferral

Resource manifests, reservation algorithms, queue structures, fairness metrics, exact bounds,
provider-capacity mapping, and authority APIs remain deferred. Resource classes, the total
comparator, admitted-progress priority, and serialized finalization do not.
