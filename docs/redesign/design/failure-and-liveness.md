---
title: "Failure and liveness — containment, bounded progress, and Retirement"
purpose: Define how Jig contains failure, makes bounded progress, recovers from interruption, guarantees finite-scope liveness, and retires work safely.
audience:
  - Architecture, engineering, security, and operations reviewers
  - Arye Kogan, Jig product and architecture decision owner
scope: Smallest-safe failure containment, bounded progress and exhaustion, fail-closed behavior and owner authority, the finite-scope liveness guarantee, and Retirement with Residual Obligations; failure codes, exact bounds, backoff, timer scheduling, cancellation, health checks, escalation UX, cleanup runbooks, alerts, and service objectives are excluded.
state: proposed
status: established Layer 1 baseline with bounded 2026-07-17 remediation amendments; renewed exact-candidate review pending
owner: Arye Kogan
last_verified: 2026-07-17
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

| Fault scope         | Required posture                                                                                                                                                                                     | Safe continuation                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Preflight           | Reject the Run durably before Story effects.                                                                                                                                                         | No Story starts.                                                                    |
| Story               | Apply bounded retry/rework; park iff a recorded owner action or changed fact can advance, otherwise block; preserve and retire resources.                                                            | Independent Stories continue; transitive dependents remain ineligible.              |
| Target/finalization | Fence further target effects and reconcile the current Operation before another finalizer proceeds.                                                                                                  | Safe implementation and review may continue within capacity.                        |
| Shared Run          | Stop new dispatch, interrupt, reconstruct, reconcile, and resume only after authority is trustworthy.                                                                                                | No control transition continues while the ledger or controller authority is unsafe. |
| Trust root          | Immediately fence dispatch/adoption, halt autonomous progress, and surface the lost guarantee. A terminal `Stopped` record requires a trustworthy witnessed append basis or later external recovery. | Only externally governed recovery may continue.                                     |

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
becomes an explicit retry, block, park, escalation, interruption, terminal-stop decision, or
Residual Obligation, never silent success or an unnamed indefinite wait.

### Non-gating Operation policy closure

A best-effort Operation may fail without park or block only when frozen policy explicitly names it
as non-gating and Jig commits a durable failure fact. No Operation is non-gating by default. The
design-owned forbidden set is every Operation on the acceptance, evidence-integrity, authority,
landing, or preservation path; policy cannot classify any member of that set as non-gating.
Preflight validates every named non-gating class against the Operation catalog and this forbidden
set: an unknown name or a forbidden classification rejects the envelope closed. The accepted
policy vocabulary beyond that forbidden set is deliberately delegated under
[DR-11](./delegation-register.md#entries).

## Automatic fail-closed behavior and owner authority

Jig automatically fails closed for invalid or insufficient input, identity, authority, fence,
subject, lifecycle position, evidence, durable recording, Candidate approval, effect certainty,
target proof, landing proof, or shared trust.

Arye is required to change policy or authority scope, revise a gate, import a governing promise,
approve a product or architecture direction, or reopen a layer. A recorded delegate may only make
the bounded operational decisions named by the exact current per-Run `ID-GRANT`, such as answering
a parked operational question, Run stop/resume, notice action, Residual Obligation handling, or
approved cleanup within that scope. Delegated Residual Obligation handling is limited to
evidence-backed resolution under the exact current grant; only Arye may accept the exact handoff
itself. An owner decision may
authorize investigation, safe stop, or that exact residual handoff; it cannot turn missing evidence
into a factual effect or landing claim.

## Finite-scope liveness guarantee and assumptions

For a finite frozen Run, Jig guarantees that no accepted scope remains in an unnamed or unbounded
wait. Every Story eventually reaches `Landed`, directly `Blocked`, owner-decided `Rejected`, or derived
`Not run — dependency blocked`; every Retirement obligation eventually completes or becomes an
explicit owner-accepted Residual Obligation.
The precise settlement substitute is status `accepted-handoff`; an `open` obligation does not
satisfy the duty.

An operator-controlled `Suspended` Run is deliberately outside this autonomous progress claim. It
is a named durable condition with no dispatch, not an unbounded retry or wait; resume re-enters the
integrity/recovery path, and an explicit terminal decision enters `Stopped`.

The guarantee assumes:

1. the accepted evaluated scope remains finite and fixed;
2. the ordered ledger, controller fence, and decision authority remain trustworthy;
3. required configured resource capacity eventually becomes available;
4. participating mechanisms respond or reach a bounded timeout;
5. the target eventually remains stable long enough for bounded finalization; and
6. Arye eventually answers owner-only handoff decisions, and Arye or an explicitly recorded
   delegate eventually answers other in-scope escalations.

If an assumption fails, Jig guarantees a durable named stopping point — a park, a block, an
overdue re-escalated `open` Residual Obligation, or a terminal stop under the failure taxonomy's
fixed selectors — and explicit loss of guarantee, not successful delivery or autonomous
completion.

## Retirement and Residual Obligations

When the first existing `EV-BOUND-EXHAUSTED` for a live `open` obligation blocks terminal
settlement, it is the explicit no-settlement disposition: the bounded wait has ended, but the
obligation remains open, owner-only handoff is unchanged, and the Run remains `Settling` or
pre-terminal `Stopped` (with any Story already `Retiring`) unchanged. It neither auto-handoffs,
resolves, closes, nor settles; no terminal-settlement audit export or artifact disposal is
authorized. Live projections, notice, ledger, obligation, and evidence stay inspectable and
preserved. Exact owner acceptance or evidence-backed resolution later exits the disposition,
wakes settlement, reaches terminal position, and only then permits terminal-settlement audit export.

Retirement settles or fences pending Operations, preserves committed work and evidence, applies
required preservation behavior, releases finalization authority, closes sessions, and safely removes
or hands off resources. Destructive cleanup is never evidence of business success.

When an automatic Retirement, preservation, surfacing, or export duty cannot complete, Jig mints a
Residual Obligation in `open` status with the affected resource or proof obligation, originating
position and reason, preservation and safety evidence, accountable owner, and exact completion
criteria. Creation also records the original `BND-WAIT-DECISION` start and deadline. This includes
an audit-export failure recorded after the terminal-settlement cut. The wait wakes on the exact
handoff decision or validated resolution. If its original deadline expires first,
`EV-BOUND-EXHAUSTED` records one idempotent durable overdue re-escalation and notice basis for the
same obligation, start, accountable owner, and owner-only authority; it never resets the wait,
changes status, or automatically accepts or resolves the duty. Continued liveness still relies on
the explicit assumption that Arye eventually answers owner-only handoff decisions. `open` cannot
satisfy settlement. Only an exact `EV-OWNER-DECISION` from Arye over that live identity may
advance it to `accepted-handoff`, and that is the sole status that may substitute for the incomplete
duty at settlement. If the automatic duty instead completes before handoff, an exact
`EV-OBLIGATION-RESOLVED` with validated completion criteria and digest-verified evidence may advance
`open` directly to terminal `resolved`, proving completion. The same event may advance an
`accepted-handoff` obligation to `resolved`. All three status edges and the phase-preserving overdue
re-escalation remain legal after terminal settlement as administrative Transitions, so a
post-terminal export obligation retains bounded attention plus its handoff and resolution paths.
Those Transitions retain any handoff provenance and cannot revise Run phase, Story state,
business-final cut, outcome, authority, or dependency facts.
Exact replay returns the existing transition and appends nothing, and no later status append is
legal after `resolved`.

## Where to go next

- The fault scopes this page bounds are located in the
  [authority and trust perspective](./perspectives/authority-and-trust.md).
- The recovery and exception branches appear in the
  [lifecycle flow](./flows/run-and-story-lifecycle.md).
- Why this posture was selected, with rejected alternatives:
  [D8 — failure and liveness](./decisions/D8-failure-and-liveness.md).
