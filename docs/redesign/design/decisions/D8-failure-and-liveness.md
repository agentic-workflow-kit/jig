---
title: "D8 — failure, interruption, Recovery, escalation, and liveness"
purpose: Record the owner-selected smallest-scope fail-closed containment with bounded autonomous Recovery and durable escalation.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Future Layer 2 architecture authors after authorization
scope: The D8 selection, rationale, accepted consequence, rejected alternatives, and Layer 2 deferral; the canonical failure model is owned by the failure-and-liveness page.
state: proposed
status: established owner decision, re-presented 2026-07-15; lock pending the Layer 1 gate
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../brief.md
  - ../../raw/design/decisions.md
related:
  - ./README.md
  - ../failure-and-liveness.md
  - ../invariants.md
---

# D8 — failure, interruption, Recovery, escalation, and liveness

- **Status:** Owner-selected; lock pending the Layer 1 gate.
- **Owner:** Arye Kogan.
- **Related:** [Failure and liveness](../failure-and-liveness.md),
  [invariants I15–I20](../invariants.md).

## Question

How does Jig contain failure, make bounded progress, recover from interruption, and reach a
deliberate outcome without weakening authority or silently hanging?

## Owner-selected direction

Use **smallest-scope fail-closed containment with bounded autonomous Recovery and durable
escalation**:

- Story failures block or park the Story and its dependents while independent work continues;
- target/finalization uncertainty fences further target effects but need not stop safe
  implementation and review;
- shared ledger, controller, authority, or trust failures interrupt the Run;
- invalid preflight rejects the Run before Story effects;
- retry, rework, refresh, wait, Recovery, and Retirement are separately bounded;
- every wait has durable reason, owner, wake condition, and exhaustion action, with typed wake
  triggers and no timer authority;
- exhaustion becomes retry, block, park, escalation, interruption, stop, or residual handoff, never
  silent success or indefinite waiting;
- uncertain irreversible effects reconcile under the same Operation identity before another
  semantic attempt;
- Landed and Blocked outcomes continue through safe Retirement; and
- unresolved Retirement requires preservation evidence, accountable ownership, and explicit residual
  handoff.

For a finite frozen Run with a trustworthy ledger/controller, eventually available capacity,
responsive or timing-out mechanisms, a target stable long enough for bounded finalization, and
responsive owner authority, every Story reaches a final business outcome and every Retirement
obligation closes or is explicitly handed off. Without those assumptions, Jig guarantees a durable
named stop, not successful delivery.

## Rationale and benefits

- Preserves useful independent progress after isolated failure.
- Prevents shared trust loss from contaminating outcomes.
- Eliminates unnamed hangs and tight polling.
- Gives uncertain effects and Retirement failures explicit owners and exits.

## Accepted negative consequence and trade-off

Failure classification and Recovery are more complex, finalization may remain blocked during
reconciliation, and owner responsiveness becomes a liveness dependency. Arye accepted richer
fault-domain modeling in exchange for safe useful progress.

## Alternatives not selected

- Fail the complete Run on any material Story failure.
- Best-effort continuation with permissive degradation or unbounded retry.

## Deliberate Layer 2 deferral

Failure codes, exact bounds, backoff, timer scheduling, cancellation, health checks, session
replacement, effect-specific reconciliation, escalation UX, cleanup runbooks, alerts, and service
objectives remain deferred. Smallest-safe containment and bounded explicit exhaustion do not.
