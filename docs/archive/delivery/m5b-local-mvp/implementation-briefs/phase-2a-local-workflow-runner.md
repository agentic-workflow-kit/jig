---
title: "Phase 2A implementation brief — Multi-item Local Workflow"
status: draft
phase: 2A
roadmap: m5b-local-mvp
---

# Phase 2A implementation brief — Multi-item Local Workflow

## Objective

Deliver the first multi-item workflow capability: an operator can run a small multi-step local workflow, get correct item-level outcomes, and inspect the run from local durable records. Execution remains sequential and local, but respects dependency-aware blocking and skipping logic.

## Source of truth to read

Read these before editing:

- [`../README.md`](../README.md) — M5b roadmap and milestones.
- [`../phases.md`](../phases.md) — Phase 2A requirements.
- [`../../../design/core/orchestration.md`](../../../design/core/orchestration.md) — run/work-item lifecycle.
- [`../../../design/contracts/execution-plan-contract-v0.md`](../../../design/contracts/execution-plan-contract-v0.md) — execution-plan shape.
- [Phase 1 brief](./phase-1-local-plan-runner.md) — Phase 1 baseline.

## This phase owns

- Multi-item local plan fixture.
- Minimal dependency-aware sequential execution.
- Validation of `dependsOn` references at current altitude (unknown, self, late dependencies).
- Item status events for `done`, `failed`, `blocked`, and `skipped`.
- Failure propagation to dependent items.
- Run summary including item-level outcomes.
- Tests for dependency order and downstream blocking/skipping.

## This phase consumes

- Phase 1 CLI command and fixture conventions.
- Phase 1 `PlanValidator`.
- Phase 1 `LocalHarness`.
- Phase 1 `RecordManager`.
- Phase 1 `ScriptedWorker`.
- Phase 1 local record format.
- Phase 1 policy gate.

## This phase must not decide

- Parallel execution.
- Generalized DAG optimization.
- Rich workflow scheduler.
- `jig inspect` implementation (reserved for Phase 2B).
- Changed-files capture.
- Real Agent provider.
- Real Execution Host provider.
- Forge/GitHub.
- Resume/recovery.
- Final schemas.

## Implementation slices

1. **Dependency validation in `PlanValidator`**
   - Ensure `dependsOn` is an array.
   - Reject unknown story IDs.
   - Reject self-dependencies.
   - Reject "late" dependencies (referencing a story that appears later in the `stories` array).

2. **Dependency-aware sequential execution in `LocalHarness`**
   - Execute stories in plan order.
   - If a story fails, stop executing worker stories.
   - For remaining stories:
     - Record `story.blocked` if they directly or transitively depend on the failed story.
     - Record `story.skipped` otherwise (reason: "run stopped after failure").
   - Final run status is `run.stopped` if any story failed/blocked/skipped.

   **Note:** Phase 2A intentionally stops after the first failed story for local-runner simplicity.
   This is a Phase 2-local simplification, not the final ISO-1/ISO-3 behavior.
   Product/design still require independent eligible work to keep moving once fuller DAG/eligibility resolution exists.
   Later workflow phases must revisit this before treating `story.skipped` as product-contract behavior.

3. **Extended `ScriptedWorker` multi-output support**
   - Support a new `stories` array in the scripted output fixture to provide outcomes for multiple stories.
   - Maintain backward compatibility with the single-story output format.

4. **Multi-item fixtures and tests**
   - Add success and failure fixtures with multiple stories and dependencies.
   - Verify execution order, event recording, and summary output.

## Likely files touched

- `src/plan-validator.js`
- `src/harness.js`
- `src/worker.js`
- `src/records.js` (summary printing)
- `test/fixtures/m5b-local-mvp/*.json`
- `test/*.test.js`

## Fixtures to add

- `multi-item-plan-success.json`
- `multi-item-plan-failure-blocks-dependent.json`
- `scripted-worker-multi-success.json`
- `scripted-worker-multi-failure-story-1.json`
- `golden-run-record-multi-success.json`
- `golden-run-record-dependent-blocked.json`
- `invalid-plan-unknown-dependency.json`
- `invalid-plan-late-dependency.json`
- `invalid-plan-self-dependency.json`

## Tests to add

- `PlanValidator` rejects unknown, self, and late dependencies.
- `LocalHarness` executes in plan order.
- `LocalHarness` records `story.blocked` for dependents of a failed story.
- `LocalHarness` records `story.skipped` for non-dependents after a failure.
- CLI run summary includes item-level outcomes.

## Acceptance criteria

- Multi-item valid fixture runs in plan order.
- Dependency references are validated before execution.
- Failed story prevents dependent story execution.
- Blocked/skipped outcomes are recorded in durable records.
- Run summary includes item-level outcomes.
- `pnpm check` passes.

## Stop conditions

- Implementation starts adding parallelism or a generalized DAG scheduler.
- Implementation requires real agent/provider behavior or resume/recovery.
- Implementation changes `docs/design/**`.

## Validation commands

```bash
corepack pnpm check
git diff --check
```

## Evidence required in PR

- Output of a successful multi-item run.
- Output of a multi-item run with a failure (showing blocked/skipped items).
- Proof of dependency validation (error messages for invalid plans).
