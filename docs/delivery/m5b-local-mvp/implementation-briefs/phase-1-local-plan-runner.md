---
title: "Phase 1 implementation brief — Local Plan Runner"
status: draft
phase: 1
roadmap: m5b-local-mvp
---

# Phase 1 implementation brief — Local Plan Runner

## Objective

Deliver the first client-usable Jig slice: an operator can run one simple local plan from the terminal, drive the design-owned scripted-worker stub through a local dry-run harness, and inspect durable local records plus a human-readable summary.

This phase is intentionally **scripted-worker stub first**. It must not introduce a real Agent provider, real Execution Host provider, provider manifest, remote host, Forge, GitHub, resume, or full observability system. The first run should be boring, local, and inspectable. Software, tragically, tends to improve when it first does one thing honestly.

## Source of truth to read

Read these before editing:

- [`../README.md`](../README.md) — M5b roadmap, milestones, preserved gates, and terminology guard.
- [`../feature-inventory.md`](../feature-inventory.md) — P0 feature inventory and placement.
- [`../phases.md`](../phases.md) — Phase 1 requirements and acceptance criteria.
- [`../../../product/jig.md`](../../../product/jig.md) — Jig product promise and local MVP context.
- [`../../../product/guarantees.md`](../../../product/guarantees.md) — product guarantees this phase must not weaken.
- [`../../../product/concepts.md`](../../../product/concepts.md) — runner/worker boundary and product language.
- [`../../../design/core/plan-intake.md`](../../../design/core/plan-intake.md) — `PlanValidator` boundary and reject-unknown-format posture.
- [`../../../design/core/bootstrap.md`](../../../design/core/bootstrap.md) — preview/start binding and launch sequencing constraints.
- [`../../../design/core/orchestration.md`](../../../design/core/orchestration.md) — run/work-item lifecycle and scripted dry-run path constraints.
- [`../../../design/core/records.md`](../../../design/core/records.md) — records-as-evidence posture.
- [`../../../design/contracts/driving.md`](../../../design/contracts/driving.md) — operator/control entry point seam.
- [`../../../design/contracts/providers.md`](../../../design/contracts/providers.md) — provider seam boundaries and scripted-worker stub distinction.
- [`../../../planning/design-track/waves/wave-6-implementation-phasing/implementation-phasing.md`](../../../planning/design-track/waves/wave-6-implementation-phasing/implementation-phasing.md) — Phase 5 local scripted-worker dry-run proof surface and stop conditions.

## This phase owns

- A minimal `jig run <plan>`-style local command path.
- Loading a local plan file and simple local config/policy fixture.
- Fail-closed validation of one minimal plan shape at the `PlanValidator` boundary.
- A local dry-run harness around the **scripted-worker stub**, not a real provider.
- Executing one plan item sequentially through the scripted stub.
- Capturing local durable records/logs sufficient for direct inspection.
- Printing a human-readable summary with final state and record location.

## This phase consumes

- Phase 0 fixture and verification conventions.
- The v0 execution-plan and observability-record contracts as cited and unfrozen.
- The design-owned scripted-worker stub posture.
- Simple local policy and config fixtures.

## This phase must not decide

- Final execution-plan schema.
- Final observability/event-record schema.
- TypeScript public interfaces, JSON Schema, event constants, exports, provider manifests, conformance schema, or package decomposition.
- Real Agent provider behavior.
- Real Execution Host provider behavior.
- Forge/GitHub behavior.
- Resume/recovery behavior.
- Full authorization policy model beyond the minimal local policy needed for the scripted dry-run.
- Full observability projections, export, dashboard, or Learning-loop integration.

## Implementation slices

1. **CLI entry point**
   - Add the smallest `jig run <plan>` path the repo can support.
   - The command may be minimal and local-only.
   - It should fail clearly when required inputs are missing.

2. **Minimal local plan loading and validation**
   - Load one local plan fixture.
   - Validate enough structure to reject unknown, malformed, or incompatible input before a committed run exists.
   - Keep fixture shape illustrative and v0, not a frozen schema.

3. **Simple local config and policy loading**
   - Load local config/policy fixtures needed for the dry-run.
   - Keep policy simple: enough to bind the local trusted dry-run posture before execution.
   - Do not add general approval routing yet.

4. **Scripted-worker dry-run harness**
   - Invoke deterministic scripted-worker stub behavior.
   - The stub may read fixture-defined output or emit predetermined request/observe behavior.
   - It must not be a configurable real agent command, real Agent provider, or real Execution Host provider.

5. **Sequential one-item execution**
   - Execute one plan item.
   - Capture success and failure outcomes.
   - No dependency graph or multi-item workflow is required in this phase.

6. **Durable local records and summary**
   - Create a local run directory.
   - Write simple structured local records/logs.
   - Print final state and record location.
   - Console-only output is not enough.

## Likely files touched

These are likely, not mandatory. Inspect current repo layout first:

- `package.json`
- source files under a minimal repo-chosen location such as `src/**`, only if Phase 0 established or permits it
- `examples/**` or `test/fixtures/**`
- tests under the repo's chosen test location
- `docs/delivery/m5b-local-mvp/**`, only for small clarifications discovered during implementation

If the implementation requires broad package decomposition or public exports, stop and route that as a design/delivery planning issue.

## Fixtures to add

Use the Phase 0 fixture convention. Preferred illustrative fixtures:

- `minimal-plan` — one local plan with one work item.
- `invalid-plan` — malformed or incompatible input that must reject before run creation.
- `local-config` — local paths and scripted-worker stub configuration.
- `local-policy` — minimal local dry-run policy posture.
- `scripted-worker-success` — deterministic stub output for success.
- `scripted-worker-failure` — deterministic stub output for failure.
- `golden-run-record-success` — expected record/log shape for a successful local dry-run.
- `golden-run-record-failure` — expected record/log shape for worker failure.

Do not treat fixture fields as final schemas. They are examples for this phase's behavior.

## Tests to add

At minimum:

- CLI smoke test for a valid minimal local dry-run.
- Invalid-plan rejection test proving no committed run is created.
- Scripted-worker failure capture test.
- Record creation test proving durable local records/logs exist.
- Summary test proving final state and record location are visible.
- Regression test or assertion that the worker path does not receive Forge credentials or privileged methods.

## Acceptance criteria

- `jig run <valid-minimal-plan>` succeeds through the scripted-worker stub.
- `jig run <invalid-plan>` rejects with a clear reason before creating a committed run.
- Scripted-worker failure produces a failed work item and failed run summary.
- The run creates local durable records/logs such as `run.json`, `events.jsonl`, `stdout.log`, or equivalent repo-approved names.
- The terminal summary includes final status and record location.
- The phase does not require GitHub, Forge, real provider seams, resume, remote host, provider manifests, Learning-loop integration, or full observability projections.

## Stop conditions

Stop and ask for review if:

- work-source input can reach execution without `PlanValidator`;
- the run is console-only and leaves no durable local record;
- implementing the scripted worker requires a configurable real agent command;
- implementing the local harness requires claiming sandboxing, SEC-2 compliance, or host containment proof;
- the work requires a final schema, TypeScript public interface, JSON Schema, event constant set, provider manifest, or package export;
- the dry-run requires GitHub, Forge, resume, non-local host, or named provider extension seams.

## Validation commands

Run and record:

```bash
corepack pnpm check
git diff --check
```

Also run direct test commands if the repo's `pnpm check` does not yet include them, and state that gap in the PR.

## Evidence required in PR

The PR summary must include:

- the exact command used to run the minimal local dry-run;
- the valid and invalid fixture names;
- where local records/logs are written;
- what `corepack pnpm check` covers;
- proof that the worker path is scripted-stub only, not a real provider;
- confirmation that no `docs/design/**` files changed;
- explicit list of deferred features: real Agent provider, real Execution Host provider, Forge/GitHub, resume, provider manifests, full observability projections, and Learning-loop integration.
