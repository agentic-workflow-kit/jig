---
title: "ADR 0031 - Owner decisions and stops are durable control records"
status: applied
---

# ADR 0031 - Owner decisions and stops are durable control records

## Context

Phase 09 adds out-of-band `decide` and `stop` surfaces. Before this phase, owner decisions could
arrive only through the in-process TTY prompt used by `jig run`/`jig resume`. That path could grant
or deny a routed request while the process was alive, but it could not accept a decision after a run
parked and the process exited.

The records projection already has the `started -> stopped -> resumed` lifecycle and the P08
observation surfaces read from `events.jsonl`. P09 needs to make owner decisions and operator stops
first-class without adding a new lifecycle state or letting an owner decision mint authority outside
the routed question that produced the park.

## Decision

`decide` is an operator-control action that appends owner-scoped control records:

- `owner-decision.recorded` with `actor: "owner"`, `storyId`, `outcome`, and optional
  `requestId`/`requestKind`, `reason`, or `handedOffTo`.
- `owner-decision.refused` with `actor: "owner"`, requested outcome, optional `storyId`, and a
  refusal reason.

The accepted outcomes are `approve`, `reject`, `override`, and `hand-off`. A recorded decision is
valid only for the story currently parked by the run's safe checkpoint. Decisions against a
non-parked story, a missing routed decision, a duplicate decision, or a hand-off without a target
are recorded refusals.

`resume` consumes the latest recorded decision for the parked story. `approve` and `override`
record the existing `authorization.granted` transition, with override legible in the basis.
`reject` records `authorization.denied` and blocks the parked story. `hand-off` records a routed
authorization event and keeps the run stopped at the parked checkpoint.

`stop` is an operator-control action that appends `operator-action.requested` for active runs. A
running harness reads the current event log at safe story boundaries and writes the terminal
`run.stopped` event itself, with the requested reason and a replay-safe checkpoint. Refused stops
append `operator-action.refused` and do not change lifecycle.

If a run has a records-integrity sidecar, owner/operator writes verify the sidecar before append
and extend it after append. A broken sidecar refuses the write.

The existing interactive TTY prompt remains a presentation convenience for live runs and resume
calls. It records the same `owner-decision.recorded` vocabulary and then feeds the existing
authorization transition path. The durable out-of-band path records the same owner-decision event so
interrupted parked runs can resume without re-asking.

## Consequences

- P09 can ship `jig decide` and `jig stop` without adding lifecycle states.
- Decisions stay narrow: they answer the current routed parked story only.
- Ask-why and replay can cite decision/refusal records without treating them as story transitions.
- P12 can expose `decide` and `stop` through MCP later as thin calls over the same SDK surface.
- Multi-user authentication and remote approval channels remain outside this decision.
