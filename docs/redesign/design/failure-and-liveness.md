---
title: "Failure and liveness — containment, bounded progress, and Retirement"
purpose: Define how Jig contains failure, makes bounded progress, recovers from interruption, guarantees finite-scope liveness, and retires work safely.
audience:
  - Architecture, engineering, security, and operations reviewers
  - Arye Kogan, Jig product and architecture decision owner
scope: Smallest-safe failure containment, bounded progress and exhaustion, fail-closed behavior and owner authority, the finite-scope liveness guarantee, and Retirement with Residual Obligations; failure codes, exact bounds, backoff, timer scheduling, cancellation, health checks, escalation UX, cleanup runbooks, alerts, and service objectives are excluded.
state: proposed
status: proposed Layer 1 content, re-presented 2026-07-15 under the owner-directed view-based structure; pending independent review of the new candidate set
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ./brief.md
  - ./model.md
  - ./decisions/D8-failure-and-liveness.md
  - ./decisions/D4-lifecycle-and-information-flow.md
related:
  - ./perspectives/authority-and-trust.md
  - ./flows/run-and-story-lifecycle.md
  - ./state-and-recovery.md
  - ./invariants.md
---

# Failure and liveness — containment, bounded progress, and Retirement

## Smallest-safe failure containment

| Fault scope         | Required posture                                                                                      | Safe continuation                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Preflight           | Reject the Run durably before Story effects.                                                          | No Story starts.                                                                    |
| Story               | Apply bounded retry or rework, then block or park; preserve and retire resources.                     | Independent Stories continue; transitive dependents remain ineligible.              |
| Target/finalization | Fence further target effects and reconcile the current Operation before another finalizer proceeds.   | Safe implementation and review may continue within capacity.                        |
| Shared Run          | Stop new dispatch, interrupt, reconstruct, reconcile, and resume only after authority is trustworthy. | No control transition continues while the ledger or controller authority is unsafe. |
| Trust root          | Fail autonomous progress closed and name the lost guarantee.                                          | Only externally governed recovery may continue.                                     |

A failure remains at the smallest safe scope. It becomes shared only when uncertainty, authority, or
proof crosses Story boundaries.

## Bounded progress and exhaustion

Every retry, rework, target refresh, wait, Recovery attempt, and Retirement path has:

- a named accountable owner;
- a durable reason;
- a wake or completion condition;
- a deadline, attempt, or budget class;
- a next action on success; and
- an explicit exhaustion action.

Durable waits create typed wake triggers; transient timers carry no decision authority. Exhaustion
becomes an explicit retry, block, park, escalation, interruption, stop, or Residual Obligation,
never silent success or an unnamed indefinite wait. A best-effort Operation may fail without blocking
only when frozen policy classifies it as non-gating and Jig records the failure durably.

## Automatic fail-closed behavior and owner authority

Jig automatically fails closed for invalid or insufficient input, identity, authority, fence,
subject, lifecycle position, evidence, durable recording, Candidate approval, effect certainty,
target proof, landing proof, or shared trust.

Arye or a recorded delegate within explicit scope is required to change policy or authority scope,
revise a gate, accept a Residual Obligation, govern trust-root Recovery, choose a risk-bearing
ambiguity, stop or replace a Run definition, approve otherwise unauthorized destructive cleanup, or
import a governing promise. An owner decision may authorize investigation, safe stop, or residual
handoff; it cannot turn missing evidence into a factual effect or landing claim.

## Finite-scope liveness guarantee and assumptions

For a finite frozen Run, Jig guarantees that no accepted scope remains in an unnamed or unbounded
wait. Every Story eventually reaches `Landed`, directly `Blocked`, or derived
`Not run — dependency blocked`; every Retirement obligation eventually completes or becomes an
explicit owner-accepted Residual Obligation.

The guarantee assumes:

1. the accepted evaluated scope remains finite and fixed;
2. the ordered ledger, controller fence, and decision authority remain trustworthy;
3. required configured resource capacity eventually becomes available;
4. participating mechanisms respond or reach a bounded timeout;
5. the target eventually remains stable long enough for bounded finalization; and
6. Arye or an explicitly recorded delegate eventually answers escalations.

If an assumption fails, Jig guarantees a durable named stop condition and explicit loss of guarantee,
not successful delivery or autonomous completion.

## Retirement and Residual Obligations

Retirement settles or fences pending Operations, preserves committed work and evidence, applies
required preservation behavior, releases finalization authority, closes sessions, and safely removes
or hands off resources. Destructive cleanup is never evidence of business success.

When automatic Retirement cannot complete, Jig records a Residual Obligation that identifies the
affected resource or proof obligation, reason, preservation and safety evidence, accountable owner,
accepted handoff decision, and completion or residual status. A Run completes only after every
obligation is retired or explicitly handed off.

## Where to go next

- The fault scopes this page bounds are located in the
  [authority and trust perspective](./perspectives/authority-and-trust.md).
- The recovery and exception branches appear in the
  [lifecycle flow](./flows/run-and-story-lifecycle.md).
- Why this posture was selected, with rejected alternatives:
  [D8 — failure and liveness](./decisions/D8-failure-and-liveness.md).
