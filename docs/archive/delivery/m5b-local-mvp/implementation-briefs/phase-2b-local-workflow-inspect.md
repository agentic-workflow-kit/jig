---
title: "Phase 2B implementation brief — Inspectable Local Workflow"
status: draft
phase: 2B
roadmap: m5b-local-mvp
---

# Phase 2B implementation brief — Inspectable Local Workflow

## Objective

Deliver the first inspectable local workflow capability: an operator can inspect a prior local workflow run from durable records and understand what happened without reading raw JSON by hand.

## Source of truth to read

Read these before editing:

- [`../README.md`](../README.md) — M5b roadmap and milestones.
- [`../phases.md`](../phases.md) — Phase 2B requirements.
- [`../../../design/core/records.md`](../../../design/core/records.md) — records-as-evidence.
- [Phase 2A brief](./phase-2a-local-workflow-runner.md) — Phase 2A baseline.

## This phase owns

- `jig inspect <run-directory>` command.
- Inspect-from-records behavior.
- Run status and item status reconstruction from records.
- Clearer validation diagnostics for plan authoring.
- Dry-run/local-run clarity in summary and inspect output.
- Changed-files display only if safely available from records.

## This phase consumes

- Phase 2A multi-item event families and item statuses.
- Phase 1/2A run directory layout and record files (`run.json`, `events.jsonl`).
- Phase 1 CLI command pattern.
- Phase 1 validation and error behavior.

## This phase must not decide

- Dashboard or TUI.
- Export format.
- Learning-loop integration.
- Recovery/resume.
- GitHub/Forge.
- Real changed-file capture from Git.
- Final observability schema.

## Implementation slices

1. **Add `inspect` command to CLI**
   - Add `inspect <run-directory>` to `bin/jig.js` and `src/cli.js`.
   - Read `run.json` from the provided directory.
   - Fail clearly if the directory or `run.json` is missing/malformed.

2. **Reconstruct and display run state**
   - Print run ID, plan ID, status, mode, and records directory.
   - Print per-story status (done, failed, blocked, skipped).
   - Show failure diagnostics summary and blocked/skipped reasons.
   - Show changed files if present in the record.

3. **Improve runner mode visibility**
   - Update `RecordManager` to include `run.mode` in `run.json`.
   - Print mode in CLI run summary and `inspect` output.

4. **Enhance validation diagnostics**
   - Include plan path and specific reason in CLI validation error output.

## Likely files touched

- `bin/jig.js`
- `src/cli.js`
- `src/records.js`
- `src/loaders.js`
- `test/cli.test.js`

## Fixtures to add

No static fixtures required if we generate run directories in tests using the actual CLI.

## Tests to add

- `inspect` success run shows expected summary.
- `inspect` failed/blocked run shows diagnostics and reasons.
- `inspect` invalid run path gives a clear error.
- `inspect` malformed record gives a clear error.
- CLI validation error includes plan path and reason.

## Acceptance criteria

- `inspect` reconstructs run and item state from records.
- Invalid run path gives a clear error.
- Validation errors include path and reason.
- Dry-run/local-run posture is visible.
- `pnpm check` passes.

## Stop conditions

- `inspect` requires a dashboard/TUI.
- Changed-file display requires Git/workspace diff capture.
- Validation diagnostics require broad validator redesign.

## Validation commands

```bash
corepack pnpm check
git diff --check
```

## Evidence required in PR

- Output of `jig inspect` for a successful run.
- Output of `jig inspect` for a failed run with blocked items.
- Output of a validation error showing path and reason.
