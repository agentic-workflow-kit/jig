---
title: "Phase 09 - Owner decision and run control: decide, stop"
status: "merged (#68)"
---

# Phase 09 - Owner decision and run control: decide, stop

## Overview

Make owner decisions and run control first-class, durable driving actions: an out-of-band
`decide` action (approve / reject / override / hand off) against a parked or routed decision,
usable after the fact and after interruption, and a `stop` action that halts a run cleanly into
a resumable state. Today both exist only as an in-process TTY prompt during `jig run` and as
whatever happens when that process ends.

## Background

`DOOR-2` requires escalations to be durable — "the run parks and resumes on owner decision,
even after interruption" — and the product's decide vocabulary is approve, reject, override,
hand off. The current `createOwnerDecisionSource` is `node:readline/promises` inside the run
process: no TTY, no decision; process gone, decision channel gone. The parked state and
routed-decision records exist in the lifecycle, and resume exists, so the missing piece is the
decision as its own recorded, out-of-band operator action plus the wiring for a parked run to
be decided and then resumed/continued. `stop` similarly exists as a lifecycle state
(`started → stopped`) but has no deliberate driving action.

## What To Do

- Implement `decide`: given a run's parked/routed decision (discoverable via inspect/watch/
  notices), record an owner decision — approve, reject, override, or hand off — as a durable,
  attributed event, honoring `DOOR-3` (grants are narrow: scoped to the immediate need, not
  blanket authority). A decision on a live run unblocks it; a decision on an interrupted run is
  picked up by resume (`DOOR-2`).
- Keep the interactive in-run prompt as a presentation convenience that calls the same
  control-plane path — one decision vocabulary, one record shape, whichever surface it arrives
  through (the driving contract's rule that decisions return through the operator boundary).
- Implement `stop`: a deliberate action that halts a running run at a safe boundary into the
  existing `stopped` state, with the record showing a clean stop (no half-recorded effects;
  in-flight irreversible actions complete or are interrupted per the agent seam's interrupt
  semantics), such that `resume` works afterward.
- Extend the operator-control port with both actions; one action, one call, SDK-owned records —
  including refused decisions (deciding a non-parked story is a recorded refusal, not a crash).
- Coordinate record vocabulary with P08 (shared doorbell/notice families).

## Why

- `DOOR-1..3` — durable, narrow, owner-routed decisions
  ([guarantee 1](../../../product/guarantees.md#1-control--trust)).
- `RESUME-1..5` — stop/resume as ordinary, safe operations
  ([guarantee 3](../../../product/guarantees.md#3-resilience--never-lose-work-resume-safely)).
- The driving contract names decide and stop as deliberate actions; product's "Driving a run"
  promises approve/reject/override/hand off and "stop a run cleanly so it can be resumed."
- Removes the TTY-only limitation that blocks headless/embedded operation (and therefore
  matters to P12's MCP consumers).

## Technical Requirements

- The Fence/Doorbell remain the authority: `decide` supplies the owner's answer to an existing
  routed question; it cannot mint permissions outside the routed scope (`DOOR-3`) and does not
  bypass authorization for new actions.
- Decisions are attributed, timestamped, durable events; replaying the record reconstructs who
  decided what and why the run proceeded (`SEE-1`, `SEE-3`).
- `hand off` at minimum re-targets the decision to another named decider visibly in the record;
  it does not require a user system to exist.
- Stop honors no-double-effect: a stop during a landing-adjacent moment must leave the record
  in a state resume's replay logic already handles (extend tests, not semantics).
- Overrides are recorded as overrides (distinct from approve) so the audit trail preserves
  "the owner chose differently" (`SEE-1`; authorization design's decision vocabulary).
- Golden posture explicit, as in P08: additive events only, declared if the reference path
  changes.

## Reference Files

- [`product/guarantees.md`](../../../product/guarantees.md) `DOOR-1..3`, `RESUME-1..5`;
  [`product/use-cases.md`](../../../product/use-cases.md) (doorbell scenario, safe resume
  scenario)
- [`design/core/authorization.md`](../../../archive/design/core/authorization.md) (doorbell,
  owner-decision flow), [`design/core/orchestration.md`](../../../archive/design/core/orchestration.md)
  (run lifecycle: `started → stopped`, resume), [driving
  contract](../../../design/contracts/driving.md) (decide via the operator boundary)
- Source: `packages/jig-cli/src/cli.ts` (`createOwnerDecisionSource`),
  `packages/jig-sdk/src/harness.ts`, `packages/jig-sdk/src/resume.ts`,
  `packages/jig-sdk/src/projection.ts`, `packages/jig-sdk/src/records.ts`
- Tests: harness/resume unit tests, `tests/cli.int.test.ts`

## Dependencies

- **Requires:** P01 (port to extend).
- **Soft:** after P02; coordinate with P08 on record vocabulary.
- **Unlocks:** verb coverage for P12; feeds P14.
- **Parallel:** P03–P06, P08, P10.

## Acceptance Criteria

1. A run parks on a routed decision; the process exits; `jig decide` approves it; `jig resume`
   continues from the decision without re-asking (`DOOR-2` end to end, tested).
2. Reject, override, and hand off each produce distinct recorded outcomes with the design's
   meanings; an override is legible as an override in ask-why/inspect output.
3. A `decide` against nothing (no routed decision) or outside the routed scope is a recorded
   refusal with guidance (`DOOR-3`).
4. `jig stop` on a live run yields a clean `stopped` record that `jig resume` continues;
   no-double-effect replay tests pass across the stop point.
5. The in-run interactive prompt and the out-of-band action produce identical record shapes.
6. Hermetic lanes green; golden posture declared; TTY absence no longer prevents any decision
   path.

## Verification

- `pnpm check`; integration tests for park → exit → decide → resume and run → stop → resume;
  unit tests for each decision verb and refusal path.
- Reviewer axes: authority containment (decide answers routed questions only), attribution and
  durability of decision events, stop safety against the replay logic, single decision
  vocabulary across surfaces.

## Out Of Scope

- Notices presentation and acknowledge/snooze (P08).
- Multi-user identity/authentication systems (hand-off is a recorded re-target, not an auth
  feature).
- Webhook/remote approval channels (operator-initiated boundary stands).
- New lifecycle states or transition-table changes.

## Stop Or Escalate If

- The decide vocabulary needs a narrower owner-override subtype than approve/reject/override —
  an open question in [`authorization.md`](../../../archive/design/core/authorization.md); route to
  design rather than extending the vocabulary locally.
- Clean stop requires a transition the closed tables do not draw (for example, stopping during
  landing) — design decision.
- Durable decisions require cross-process coordination the records design does not yet own
  (lease/lock questions) — route to the records design owner with the concrete scenario.
