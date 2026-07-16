---
title: "ADR 0029 — Guided setup is a configuration operation"
status: applied
---

# ADR 0029 — Guided setup is a configuration operation

## Context

The product layer requires a setup surface: owners choose a track, provider posture, policy
template, and work profile before tuning details. The active driving contract names start,
preview, watch, inspect, ask-why, decide, and stop as operator-control actions. Setup therefore
needed placement before implementation: either a new operator-control verb, a configuration
operation, or a CLI-only helper.

Phase 07 also needs one audit-visible record of setup without treating setup as a run. At setup
time there is no run directory, no plan execution, and no provider composition. Forcing setup into
the operator-control port would make the control plane own configuration authoring, which the
driving contract deliberately keeps outside run logic.

## Decision

`jig setup` is a first-party configuration operation at the CLI edge. It is not an
`OperatorControlPort` verb in v0.

The CLI may call an SDK setup helper to instantiate versioned templates and validate the emitted
policy, work profile, repo-policy floors, and config with the same loaders used at launch. The setup
helper may write configuration artifacts plus a local `setup-record.json` that records what was
emitted and why. It must not start, preview, inspect, resume, or otherwise compose a run.

The setup record is audit-visible configuration evidence, not an observability-records event family.
Run records continue to be produced only by run/recovery/control operations. If a future contract
owner promotes setup to a cross-adapter action, that follow-up must decide the operator-control and
records shape explicitly.

## Consequences

- P07 may ship `jig setup` without widening the operator-control port or changing golden run records.
- MCP does not need to expose setup in P12 unless a later placement decision authorizes it.
- Setup templates remain supported package assets and must validate through P06 owner-configuration
  rules before being presented as usable.
- The first setup implementation is intentionally headless-capable; interactive prompting is only a
  presentation layer over the same answers.
