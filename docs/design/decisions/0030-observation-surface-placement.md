---
title: "ADR 0030 - Observation surfaces are operator projections with owner notice records"
status: applied
---

# ADR 0030 - Observation surfaces are operator projections with owner notice records

## Context

Phase 08 needs three observation surfaces: `watch`, a notices queue with acknowledge/snooze, and
`ask-why`. The driving contract already names `watch` and `ask-why` as operator-control actions.
It does not name acknowledge or snooze, but the product requires notice attention state to persist
across process restarts instead of being a transient presentation filter.

The existing records design makes `events.jsonl` authoritative. Projection is pure and fail-closed:
unknown event families make replay unusable. That means any durable notice attention operation must
be explicit in the record vocabulary and must not pretend to be a story or run lifecycle
transition.

## Decision

`watch` and `ask-why` are `OperatorControlPort` verbs. They read the run directory and return
projections derived from `events.jsonl` plus the optional `run.json` cache. They append no run
records and do not change story or run state.

Notice acknowledge and snooze are owner attention records, not driving lifecycle verbs. The SDK
exposes them as notice operations adjacent to the operator surface so all adapters can use one
implementation, but the durable shape is additive owner events:

- `notice.acknowledged` with `actor: "owner"` and `noticeId`.
- `notice.snoozed` with `actor: "owner"`, `noticeId`, and `snoozedUntil`.

Projection accepts these two event families as observation-only records. They can change only the
derived notice state (`open`, `acknowledged`, or `snoozed`). They never change lifecycle state,
story state, checkpoint, authorization, evidence, or landing semantics.

If a run has a records-integrity sidecar, owner notice writes must verify the current sidecar before
append and extend the sidecar after append. A broken sidecar refuses the notice write.

## Consequences

- P08 can ship `jig watch`, `jig ask-why`, `jig notice-ack`, and `jig notice-snooze` without adding
  a new lifecycle transition.
- The additive notice event vocabulary is coordinated ahead of P09: P09 owns out-of-band decision
  and stop records, not notice attention state.
- Golden run records are unchanged unless a test deliberately exercises the new owner notice events.
- P12 can expose the settled `watch` and `ask-why` verbs through MCP later; exposing notice actions
  remains a placement choice for that adapter.
