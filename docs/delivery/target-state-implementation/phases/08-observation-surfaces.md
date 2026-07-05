---
title: "Phase 08 - Observation surfaces: watch, notices, ask-why"
status: "implemented (#67)"
---

# Phase 08 - Observation surfaces: watch, notices, ask-why

## Overview

Deliver the live and explanatory observation surface: a `watch` action showing what is
progressing, parked, and blocked with liveness signals (`LIVE-1/2`); a notices queue with
acknowledge/snooze (`SEE-5`); and an `ask-why` action that answers "why did this story
block/merge/wait" from the run's own records (`SEE-1`, `SEE-4`). All three are projections and
edge presentations over the existing record log — no new authority.

## Background

The record substrate is strong: append-only `events.jsonl`, a strict projection state machine,
and notice-shaped diagnostics (`unattended-park`, `evidence-gate-failure`,
`policy-authorization-denial`) already exist and feed `inspect`. What is missing is everything
the owner actually watches: no live view, no distinction between thinking/stuck/dead, no
triaged attention queue with acknowledge/snooze durability, and no attributable "why" answer
short of reading JSONL. The product is explicit that attention is "a triaged queue, not a log"
and that ask-why answers from the run's own record.

## What To Do

- Implement `watch`: a live view over a running or resumed run (tailing the run directory's
  record log) grouping stories by progressing/parked/blocked/done, with the `LIVE-1` signal
  vocabulary — progress events, idleness, silence, overdue approvals — distinguishing
  thinking/stuck/dead, and the `LIVE-2` consequence: a stuck run escalates or parks rather than
  silently burning time (the enforcement leg lands in the harness/doorbell where the design
  puts it, surfaced through watch).
- Implement the **notices queue** (`SEE-5`): a durable, triaged attention surface derived from
  record events — what happened, how urgent, what to do next — with `acknowledge` and `snooze`
  as recorded owner actions so the queue reflects what the owner has seen.
- Implement `ask-why`: given a story or run outcome, produce an attributable explanation
  assembled from recorded decisions, authorizations, evidence, and transitions (`SEE-1`),
  consumable without extra tooling (`SEE-4`).
- Extend the operator-control port with `watch` and `ask-why` per the
  one-action/one-call/one-audit invariant; keep all logic in projections/core, presentation at
  the edge.
- Route acknowledge/snooze placement before implementation. The product requires durable notice
  attention state, but the active driving contract does not currently name acknowledge or snooze
  as driving actions; decide with the driving/records owners whether they are port verbs,
  notice-record operations, or presentation commands over a records operation.
- Coordinate record-vocabulary additions with P09 (decide/stop) — both phases touch the
  doorbell/notice families; agree the additive event shapes once.

## Why

- `SEE-1`, `SEE-4`, `SEE-5`; `LIVE-1`, `LIVE-2`
  ([guarantee 5](../../../product/guarantees.md#5-full-observability),
  [guarantee 3](../../../product/guarantees.md#3-resilience--never-lose-work-resume-safely)).
- [`design/domain/runtime-and-observation.md`](../../../design/domain/runtime-and-observation.md)
  — Run, Evidence, Notice entities; [`design/core/records.md`](../../../design/core/records.md)
  — pure projections rule.
- The driving contract names watch and ask-why as deliberate actions.

## Technical Requirements

- Projections stay pure: watch/ask-why/notices derive from records; they never write anything
  except the owner's own acknowledge/snooze/decision-adjacent events in the settled records
  location.
- Acknowledge/snooze are additive record events; the run's substantive history is untouched by
  attention state.
- If the notices vocabulary needs events on the reference path, this phase explicitly owns the
  golden change per the verification strategy — additive families only, declared in the PR.
- Watch degrades gracefully: a finished run shows final state; a dead process is reported as
  such (silence signal), not as an error loop.
- No parallel narrative: ask-why quotes/derives from recorded events (`SEE-3`), never from a
  side store.

## Reference Files

- [`product/guarantees.md`](../../../product/guarantees.md) §3 (LIVE), §5 (SEE);
  [`product/use-cases.md`](../../../product/use-cases.md) (doorbell and overnight scenarios)
- [`design/core/records.md`](../../../design/core/records.md),
  [`design/core/orchestration.md`](../../../design/core/orchestration.md),
  [`design/domain/runtime-and-observation.md`](../../../design/domain/runtime-and-observation.md)
- [Driving contract](../../../design/contracts/driving.md)
- Source: `src/projection.ts`, `src/records.ts`, `src/harness.ts` (unattended-park handling),
  `src/cli.ts`
- Tests: projection unit tests, `tests/records-golden.int.test.ts`

## Dependencies

- **Requires:** P01 (operator-control port to extend).
- **Soft:** after P02; coordinate with P09 on shared record vocabulary.
- **Unlocks:** verb coverage for P12; feeds P14.
- **Parallel:** P03–P06, P10.

## Acceptance Criteria

1. `watch` on a live fixture run shows story states updating and classifies a stalled worker
   via the LIVE-1 signals; a stuck run demonstrably escalates/parks under a policy-set
   threshold rather than running unbounded (`LIVE-2`).
2. Notices present what/urgency/next-action; `acknowledge` and `snooze` persist across process
   restarts and are visible in the record (`SEE-5`, `DOOR-2`-consistent durability).
3. `ask-why <story>` for a blocked, a merged, and a parked story produces an explanation citing
   the recorded events that justify it — reviewable against the raw log (`SEE-1`, `SEE-3`).
4. `watch` and `ask-why` go through the operator-control port with one audit record each; notice
   acknowledge/snooze follow the recorded placement decision and have one durable owner-event
   trail.
5. Golden posture explicit: either goldens are byte-identical, or the PR declares the owned
   additive events and the golden diff is reviewed as a records change.
6. Hermetic lanes green; no new authority (a watch/ask-why caller can change nothing).

## Verification

- `pnpm check`; projection unit tests for every new derivation; an integration test driving a
  run and watching it from a second process.
- Reviewer axes: purity of projections, additive-only record changes, SEE-3 fidelity (answers
  come from the record), LIVE thresholds policy-sourced not hardcoded.

## Out Of Scope

- Out-of-band decide/stop (P09) — watch surfaces a parked decision; deciding it is P09.
- Export (P10); dashboards or external sinks (`CFG-7` extension examples, not shipped
  surfaces).
- New lifecycle states or transition-table changes.
- MCP presentation of these verbs (P12).

## Stop Or Escalate If

- The notice vocabulary forces a position on the open evidence-gate-failure modeling question
  (distinct outcome vs. `started → blocked` cause,
  [`orchestration.md`](../../../design/core/orchestration.md)) — present what the record says
  today; route the modeling question to design instead of hardening it through UI vocabulary.
- LIVE-2's escalate/park consequence needs a transition the closed tables do not draw — design
  decision, not a local addition.
- A useful "why" answer requires event data the records do not carry — that is a records-design
  gap; route it with the concrete missing-field evidence rather than synthesizing narrative.
