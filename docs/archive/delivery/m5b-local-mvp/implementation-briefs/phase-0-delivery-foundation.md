---
title: "Phase 0 implementation brief — Delivery Foundation"
status: draft
phase: 0
roadmap: m5b-local-mvp
---

# Phase 0 implementation brief — Delivery Foundation

## Objective

Prepare the `jig` repo for the first runtime implementation work by establishing the smallest useful delivery foundation: local verification, fixture conventions, and contract-preservation checks. This phase produces no client-facing Jig behavior yet. Its value is that every later delivery PR can prove what changed instead of asking reviewers to admire prose. A noble dream, apparently.

## Source of truth to read

Read these before editing:

- [`../README.md`](../README.md) — M5b local MVP delivery roadmap and terminology guard.
- [`../phases.md`](../phases.md) — Phase 0 roadmap details.
- [`../../../design/README.md`](../../../../design/README.md) — current design status.
- [`../../../design/contracts/execution-plan-contract-v0.md`](../../../../design/contracts/execution-plan-contract-v0.md) — v0 execution-plan contract posture.
- [`../../../design/contracts/observability-records-contract-v0.md`](../../../../design/contracts/observability-records-contract-v0.md) — v0 run-record contract posture.
- [`../../../planning/design-track/waves/wave-6-implementation-phasing/implementation-phasing.md`](../../../planning/design-track/waves/wave-6-implementation-phasing/implementation-phasing.md) — proof-surface handoff and contract-unfrozen guardrails.

## This phase owns

- Establishing repo-local delivery verification for future runtime work.
- Documenting fixture conventions for local plan, local config, local policy, scripted-worker output, and local run-record examples.
- Adding or tightening checks only as needed to support implementation work.
- Creating the first explicit place where future implementation PRs can put fixtures and tests.

## This phase consumes

- Current v0 execution-plan and observability-record contracts as cited, unfrozen design inputs.
- The M5b roadmap's client-usable milestone sequence.
- Current repo tooling and `corepack pnpm check` behavior.

## This phase must not decide

- Final package layout or module boundaries.
- TypeScript public interfaces, JSON Schema, event constants, provider manifests, exports, or package decomposition.
- Any `docs/design/**` change.
- New hard-numbered `INV-*` rows.
- Runtime behavior for plan execution, records, authorization, bootstrap, orchestration, or providers.

## Implementation slices

1. **Inspect current repo gate**
   - Identify what `corepack pnpm check` currently runs.
   - Identify whether test/typecheck/lint tooling already exists.
   - Preserve existing behavior unless a change is required for delivery readiness.

2. **Add minimal delivery fixture conventions**
   - Add a small documentation note or fixture README for planned local MVP fixtures.
   - Define fixture categories without freezing field-level schemas:
     - local execution-plan fixture;
     - local config fixture;
     - simple local policy fixture;
     - scripted-worker output fixture;
     - local run-record fixture.

3. **Prepare test/check structure**
   - Add only the minimal test/check scaffolding needed for the next phase to add failing or passing tests.
   - If choosing a test framework or package layout would become a broad architecture decision, stop and record the decision needed instead of improvising.

4. **Add contract-preservation guardrail**
   - Add a lightweight check, fixture review note, or docs rule that future implementation examples remain illustrative until a contract owner approves schema freeze.
   - The check can be manual/documented if mechanical enforcement would require premature package/tooling choices.

## Likely files touched

These are likely, not mandatory. Inspect the repo first:

- `package.json`
- `pnpm-lock.yaml`, only if dependencies are deliberately added
- `tsconfig.json` or test config files, only if the repo already has or needs them
- `docs/delivery/m5b-local-mvp/**`
- `examples/**` or `test/fixtures/**`, if those paths are chosen as the minimal fixture home
- `.github/workflows/**`, only if the existing workflow needs to run the expanded check command

Do not create a broad source layout such as `src/core/**`, `src/providers/**`, or public exports unless the implementation session can justify it as the smallest reversible foundation step.

## Fixtures to add

At minimum, document the intended fixture names or add placeholder fixture files if the repo convention supports them:

- `examples/minimal-plan.*` or `test/fixtures/minimal-plan.*`
- `examples/local-config.*` or `test/fixtures/local-config.*`
- `examples/local-policy.*` or `test/fixtures/local-policy.*`
- `examples/scripted-worker-output.*` or `test/fixtures/scripted-worker-output.*`
- `examples/local-run-record.*` or `test/fixtures/local-run-record.*`

Use extensions already common in the repo when possible. Do not treat those examples as final schemas.

## Tests to add

This phase may add smoke tests for the verification harness itself, but it should not fake runtime behavior just to make tests pass.

Preferred minimum:

- `corepack pnpm check` runs locally.
- If a test runner is introduced, at least one trivial harness test proves it is wired.
- If fixture files are added, add a simple fixture-discovery or formatting check only if it does not freeze schema semantics.

## Acceptance criteria

- `corepack pnpm check` passes.
- `git diff --check` passes.
- Fixture conventions for Phase 1 are documented or present in an agreed minimal fixture location.
- The PR states whether lint/typecheck/test were added now or deliberately deferred.
- No v0 contract is converted into a final JSON Schema, TypeScript interface, export, or event-constant set.
- No `docs/design/**` file is edited.

## Stop conditions

Stop and ask for review if:

- adding tests requires deciding final package layout;
- fixture examples start behaving like normative schemas;
- implementation pressure requires changing execution-plan or observability-record design contracts;
- the repo needs provider manifests, conformance schemas, or public exports before Phase 1;
- the work drifts into runtime plan execution.

## Validation commands

Run and record:

```bash
corepack pnpm check
git diff --check
```

Also run any newly introduced test/lint/typecheck command directly if it is not already included in `pnpm check`.

## Evidence required in PR

The PR summary must include:

- what `corepack pnpm check` covers after the change;
- where Phase 1 fixtures should live;
- what was deliberately not frozen;
- confirmation that no `docs/design/**` files changed;
- any deferred tooling decisions with a clear owner or follow-up.
