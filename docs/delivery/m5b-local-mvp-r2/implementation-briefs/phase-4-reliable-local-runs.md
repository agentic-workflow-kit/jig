---
title: "Phase 4 implementation brief — Reliable Local Runs"
status: active
---

# Phase 4 implementation brief — Reliable Local Runs

## Context and goal

Phases R and 3 made local runs governed and their records trustworthy, but a run is still
write-then-forget: `events.jsonl` is written and never read back, `jig inspect` renders from
`run.json`'s embedded `events[]`, there is no `jig resume`, and no run records a workspace
fingerprint or a redaction posture. Phase 4 makes local runs **reliable and recoverable**: inspect
by replaying the event log (so a crashed run with no finalized `run.json` is still inspectable),
resume from a durable checkpoint without repeating recorded effects or rebinding launch inputs,
detect a materially changed workspace, and make redaction/export ambiguity a diagnosable stop.

The design is closed in [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md).
This brief is implementation-ready **against that ADR**: it does not re-decide replay/resume/
no-double-effect/redaction/workspace semantics — it implements them. Where a detail is genuinely
design-owned rather than a local implementation choice, this brief says so and routes it back to
design per the stop conditions; do not fill gaps by invention.

**Dependency: Phases R and 3 are delivered on current `main`** — Phase R via
[PR #22](https://github.com/agentic-workflow-kit/jig/pull/22) and Phase 3 via
[PR #23](https://github.com/agentic-workflow-kit/jig/pull/23); the later
[PR #24](https://github.com/agentic-workflow-kit/jig/pull/24) was only a post-Phase-3 wording
cleanup, not a records change. Phase 4 extends the Phase R/3 records shape — the run-level `binding`
block, `actor` on every event, `run.stopped` `reason`/`checkpoint`/`unstarted`, the
`authorization.*` triad, and `runner-action.skipped-on-dry-run`. Verify the baseline gate
(`corepack pnpm check` green) before editing runtime behavior.

## Source files to read

Read, in order:

- [`../phases.md`](../phases.md) — the **authoritative** Phase 4 section and P4-AC-1..6. These IDs
  are the binding delivery target.
- [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md) — the nine settlements
  this brief implements (replay projection, inspect, resume surface, checkpoint semantics,
  no-double-effect ledger, workspace continuity, redaction/export posture, causal notices,
  resume-integrity gate).
- [`../../../design/core/records.md`](../../../design/core/records.md) — the replay/projection
  engine, projection purity/determinism, and the Phase 4 local altitude section (replay-inspect,
  run-level posture).
- [`../../../design/core/orchestration.md`](../../../design/core/orchestration.md) — the run-lifecycle
  and work-item closed transition tables, and the Phase 4 projected-checkpoint resume subsection
  (story-state resume, independent-work re-eligibility, no-double-effect handoff).
- [`../../../design/core/bootstrap.md`](../../../design/core/bootstrap.md) — resume re-entry,
  storage/workspace preflight, launch binding immutability, and the Phase 4 local re-entry
  subsection (the `jig resume` surface, plan snapshot, binding/workspace verification).
- [`../../../design/contracts/observability-records-contract-v0.md`](../../../design/contracts/observability-records-contract-v0.md)
  — Recovery/Resume and Redaction/Export Posture properties (v0, unfrozen).
- [ADR 0017](../../../design/decisions/0017-records-seam-reconciliation.md) decision 2 (a
  failure-halted `run.stopped` is a resumable checkpoint) and decision 5 (causality-field phasing).
- [Phase R brief](./phase-r-remediation.md) and [Phase 3 brief](./phase-3-governed-local-runs.md) —
  the delivered records shape and golden-fixture conventions Phase 4 builds on.

## Current delivered surfaces consumed from Phase R / 3

Confirmed against `src/` at authoring time — build on these, do not re-derive them:

- **Records shape.** `run.json` = `run: { id, attempt, status, planId, mode, binding: { policyRef,
configRef } }` **plus an embedded `events[]` array**; `events.jsonl` = one JSON event per line.
  `id` = `run-<planId>-<timestamp>-<uuid>` (already distinct from plan id); `attempt` = `1`
  (hard-coded); `configRef` = `mode=<mode>;recordDir=<dir>` (see `src/records.ts`).
- **Event families** (`src/harness.ts`, `src/records.ts`): `run.started`, `story.started`,
  `authorization.requested`/`granted`/`denied`/`routed`, `story.parked`, `evidence.modeled`,
  `story.done`, `story.blocked`, `runner-action.skipped-on-dry-run`, `run.completed`, `run.stopped`.
  Every event carries `actor: "runner"` and an ISO `timestamp`.
- **Stop/checkpoint.** `run.stopped` carries `reason` (`work-item-blocked` | `unattended-park`),
  `checkpoint` (`after:<story-id>` | `after:<story-id>.parked`), and `unstarted: string[]`.
- **Doorbell.** Routed parks are resolved by an in-process blocking prompt
  (`createOwnerDecisionSource`, `src/cli.ts`); the owner-decision source is `null` when stdin is
  non-interactive, which is what produces the `unattended-park` stop. Approval →
  `authorization.granted` basis `["owner-approval"]`; rejection → `authorization.denied` basis
  `["owner-rejection"]`.
- **Fence** (`src/authorization.ts`): `authorizeRequest(request, story, policy)` → `{ outcome, basis }`
  with the fixed CFG-10 category map; consumed per resumed request.
- **CLI** (`src/cli.ts`): `run` / `preview` / `inspect` subcommands, `getArg` flag parser, fail-closed
  on missing required flags. `inspect <run-dir>` currently reads `run.json` only.
- **Types** (`src/types.ts`): `RunRecord`, `RunEvent` (extensible via `[key: string]: unknown`),
  `RunStatus`, `AuthorizationRequest`/`Decision`, `Story`, `Plan`, `PolicyDoc`, `ConfigDoc`,
  `RecordSink`.

## Non-goals

Do not:

- implement real workers, real providers, or any Forge/GitHub landing;
- suppress or perform real irreversible effects (push/PR/merge) — there are none locally; real
  irreversible-effect idempotency is Phase 5;
- freeze a JSON Schema or add TypeScript contract types for the records/plan seams;
- create a public/TypeScript contract package;
- build per-story parallel-workspace isolation (ISO-4) or remote-host / cross-provider resume;
- build field-level per-record redaction posture (run-level default only) or a real secret scanner;
- design Phase 5, or move any product/design commitment.

## Likely source files touched (do not edit as part of this design PR)

- `src/cli.ts` — add the `resume` subcommand; route `inspect` through the projection.
- `src/records.ts` — a loader that reads `events.jsonl` back; write the validated-plan snapshot and
  `binding.workspace` at launch; run-level redaction/export posture on the run record.
- `src/harness.ts` — resume re-entry: continue from the projected checkpoint, free independent
  unstarted work, recognize already-terminal work and recorded actions/decisions.
- `src/types.ts` — extend `binding` (workspace fingerprint), the run record (redaction/export
  posture), and add projection/resume view types.
- `src/authorization.ts` — reused unchanged for authorizing resumed requests; touch only if the
  parked-resume decision path needs a seam.
- `tests/cli.unit.test.ts`, `tests/harness.unit.test.ts`, `tests/records-golden.int.test.ts` — new
  tests named per AC ID; new golden fixtures.
- `tests/fixtures/m5b-local-mvp/*` — resume/replay/workspace/redaction fixtures (below).

### Potential new modules (names are suggestions, not mandates)

Structure for ownership clarity; a different split is fine if ownership and dependencies stay clear.

- `src/projection.ts` — pure replay of `events.jsonl` → projected run view (status, per-story
  states, stop cause, safe checkpoint, notices). No I/O beyond receiving the parsed event array;
  reuses the orchestration transition tables as the legality check. **Depended on by** `inspect`
  and `resume`.
- `src/resume.ts` — resume orchestration: load snapshot + projection, verify binding + workspace,
  compute the resume plan (which stories are terminal / eligible / to re-drive), and re-enter the
  harness. **Depends on** `projection`, `workspace`, `records`, `harness`, `authorization`.
- `src/workspace.ts` — capture and compare the run-level workspace fingerprint (repo root + git
  `HEAD` + a content hash over the working-tree change set). **Depended on by** bootstrap-at-launch
  and `resume`.
- `src/redaction.ts` — the run-level default posture and the fail-closed inspect/export guard.
  **Depended on by** `records`/`inspect`.
- `tests/projection.unit.test.ts`, `tests/resume.unit.test.ts` — unit coverage for the two new
  pure/orchestration surfaces.

## Concrete implementation slices

Each slice maps to ADR 0020 sections and to the AC(s) it closes. Implement in order; each is
independently testable.

### Slice 1 — Replay projection (ADR 0020 §1) → foundation for P4-AC-4

Build `projection`: parse `events.jsonl` into events, fold them into a run view using the
orchestration transition tables as the legality check. Output: run status, per-story states, stop
cause, safe checkpoint, projected notices.

- Read from `events.jsonl` (authoritative). Accept `run.json` as an optional cache; when it
  conflicts, the log wins and the view carries a `run.json-stale` diagnostic.
- Fail-closed, diagnosable posture (ADR 0020 §1 table): missing `run.json` → replay anyway;
  malformed event line → stop naming the offset; missing required field (`actor`, stop
  `checkpoint`) → diagnosable defect; illegal replayed transition → correctness failure.
- Pure and deterministic: same log → same view (INV-006). No writes.

### Slice 2 — Inspect by replay (ADR 0020 §2) → P4-AC-4

Route `jig inspect <run-dir>` through `projection`. It replays `events.jsonl` by default and uses
`run.json` only as a summary/compat fallback. `inspect` explains the stop cause, the projected
notice, and the safe resume point — and works when `run.json` is absent (the crashed-run path).
No `--replay` flag. Preserve the existing rendering of item outcomes/diagnostics/changed files, now
sourced from the projection.

### Slice 3 — Launch-time durability: plan snapshot + workspace fingerprint + posture (ADR 0020 §3, §6, §7)

At `start`, extend the launch record so the log is self-sufficient for replay:

- **Write a validated-plan snapshot** into the run directory (e.g. `plan.snapshot.json`) so resume
  is records-backed and does not need an external plan file.
- **Record an authoritative launch header** as the first record of `events.jsonl` — the
  `run.started` event carrying `run.id`, `planId`, the launch `binding`, the workspace fingerprint,
  the run-level redaction/export posture (default `safe-for-owner-record` / export `redacted`), and
  a reference to the plan snapshot (ADR 0020 §1). Today `binding` is written only into `run.json`
  (`src/records.ts` `finalize`); this promotes it into the log **additively**, reusing the
  `run.started` family (no new family). This is what lets events-only inspect and resume recover
  binding, fingerprint, and posture when `run.json` is absent.
- **Capture the workspace fingerprint** — repo root + git `HEAD` + a content hash over the
  working-tree change set (`git status --porcelain` + tracked/staged diff; clean tree → sentinel
  hash) — into `binding.workspace`, so two materially different dirty trees at one `HEAD` do not
  collide (ADR 0020 §6).
- **Keep `run.json` as a finalized cache** carrying the same fields; it stays non-authoritative
  (ADR 0020 §1).

Guard the Phase R/3 goldens — see the golden fixture plan for normalization (the fingerprint
normalizes to a single `<WORKSPACE>` token).

### Slice 4 — Resume command and re-entry (ADR 0020 §3, §4, §9) → P4-AC-1, P4-AC-2, P4-AC-3

Add `jig resume <run-dir> --scripted-output <output>` (`src/cli.ts` + `src/resume.ts`):

1. Load the plan snapshot + projection; fail closed if the projection is defective.
2. **Verify binding** — any `--config`/`--policy`/`--plan` passed are verification-only against the
   recorded binding; a mismatch → `resume-blocked-binding-mismatch`, refuse (no rebinding; GUARD-1,
   INV-003/010).
3. **Workspace-continuity preflight** — recompute the fingerprint and compare; material mismatch →
   `resume-blocked-workspace-mismatch`, refuse (P4-AC-6).
4. **Resume-integrity gate** — if a safety-relevant assumption changed while stopped and the
   required fresh owner re-approval/evidence is absent → `resume-blocked-missing-approval`, refuse
   (RESUME-5, GUARD-2, INV-011; P4-AC-3).
5. **Continue from the projected checkpoint** — same run id, no fresh id, no `attempt` increment;
   append `run.resumed`. Apply the checkpoint semantics (ADR 0020 §4): terminal stories not re-run;
   independent unstarted work freed on a `work-item-blocked` stop; a `started`-without-terminal item
   re-driven as repeatable work; a parked checkpoint resolved by consuming a durable owner decision
   if present, else re-presenting via the Phase-3 Doorbell (interactive) or re-stopping fail-closed
   (non-interactive).
6. **No double effect** (ADR 0020 §5) — recognize already-terminal work, already-recorded
   `runner-action.skipped-on-dry-run`, and already-recorded owner decisions from the replayed log;
   neither re-run nor re-append them (P4-AC-2, RESUME-3/INV-012).

Append events into the **same** `events.jsonl`; the run continues to `completed` or `stopped` again.

### Slice 5 — Redaction/export fail-closed surface (ADR 0020 §7) → P4-AC-5

`redaction`: enforce the run-level default posture and fail closed on ambiguity. Posture is read
from the launch header in `events.jsonl` (Slice 3 / ADR 0020 §1), so an events-only inspect of a
crashed run has posture without `run.json`; fail-closed triggers only on **genuinely** unknown or
ambiguous posture, never merely because the cache is absent. Unknown posture → inspect/export denied
or constrained with a `redaction-export-posture-ambiguous` diagnostic; export under
unsafe/ambiguous posture → denied (never best-effort emitted); inspect never surfaces raw sensitive
values, only the posture and the class of withheld value. (Local dry-run has no real secrets; this
proves the fail-closed _posture_, not a scanner.)

### Slice 6 — Causal notices as projections (ADR 0020 §8)

Project the minimum notice set from recorded facts (no new event family): unattended-park stop,
evidence-gate-failure stop, policy/authorization-denial stop, and `redaction-export-posture-ambiguous`
(posture read from the launch header). Surface these through `inspect`.

The three `resume-blocked-*` conditions are **not** projections and are not `inspect` notices (ADR
0020 §8): they are computed live at resume preflight from resume-time inputs vs the recorded launch
header, and a refused resume appends no record and moves no checkpoint. Emit them only as the reason
a refused `resume` reports (non-zero exit + stderr diagnostic). Do **not** invent a refusal event
family to make them replayable — recording refused attempts is a named, deferred enhancement.

## Acceptance criteria (binding — from `phases.md`)

- **P4-AC-1** — An interrupted run resumes from the recorded checkpoint; launch bindings immutable
  across resume. Closed by Slices 3–4. Traces: RESUME-2, GUARD-1, INV-003.
- **P4-AC-2** — Previously recorded irreversible effects are not repeated on resume. Closed by
  Slice 4 step 6 (no-double-effect ledger). Traces: RESUME-3, INV-006/INV-012.
- **P4-AC-3** — Safety-relevant changes while stopped require fresh approval/evidence before
  resuming. Closed by Slice 4 step 4. Traces: RESUME-5, GUARD-2, INV-011.
- **P4-AC-4** — `inspect` explains stop cause, notice, and safe resume point by replaying
  `events.jsonl`, including when `run.json` is missing. Closed by Slices 1–2, 6. Traces: LIVE-2,
  SEE-4, INV-006.
- **P4-AC-5** — Redaction/export ambiguity becomes an operator-visible diagnosable stop; records
  stay safe to keep/export by default. Closed by Slices 3, 5. Traces: SEC-1..SEC-3.
- **P4-AC-6** — A materially different resumed workspace is detected rather than silently claimed
  continuous. Closed by Slices 3, 4 step 3. Traces: RESUME-4.

## Test / evidence plan

Every test cites the AC ID it proves (the r2 AC-to-test convention). Coverage thresholds stay at
90% (aim 95%); `corepack pnpm check` is the gate.

- **Projection unit** (`tests/projection.unit.test.ts`): deterministic replay; `run.json`-absent
  replay; `run.json`-conflict → log wins + staleness diagnostic; malformed line → diagnosable stop;
  missing `actor`/`checkpoint` → diagnosable defect; illegal transition → correctness failure.
- **Inspect** (`tests/cli.unit.test.ts`, `P4-AC-4: ...`): inspect a run dir with **no `run.json`**
  and assert the stop cause, notice, and safe resume point come from the replayed `events.jsonl`.
- **Resume** (`tests/resume.unit.test.ts` + `tests/harness.unit.test.ts`):
  - `P4-AC-1: resume from after:<story> continues without re-running terminal stories; binding
preserved`;
  - `P4-AC-1: resume frees independent unstarted work while the blocked story stays terminal`
    (work-item-blocked resume, ADR 0017 dec 2 + ISO-3);
  - `P4-AC-2: resume does not re-append a recorded runner-action.skipped-on-dry-run / terminal
story / owner decision`;
  - `P4-AC-2: resume never appends a second first-binding record`;
  - `P4-AC-3: resume with a changed safety-relevant assumption and no fresh approval is refused`;
  - parked-resume: `consumes a pre-recorded owner decision without re-asking`; `non-interactive
resume of an unresolved park re-stops fail-closed`.
- **Binding/workspace** (`P4-AC-1`, `P4-AC-6`): `resume with mismatched --policy is refused
(binding mismatch, no rebinding)`; `resume with a materially changed workspace fingerprint is
refused (workspace mismatch)`.
- **Redaction/export** (`P4-AC-5`): `unknown posture makes inspect/export a diagnosable stop`;
  `export under ambiguous posture is denied`; `records stay safe-to-export by default`.
- **Baseline guard**: the existing Phase R/3 goldens still pass (with the new normalization) — proof
  the additive record fields did not regress the delivered shape.

## Golden fixture plan

- **New: an `events.jsonl`-only fixture with no `run.json`.** This is a **new fixture shape** (raw
  jsonl lines, not the combined `run.json` doc) asserted against the **projection output** — the
  crashed-run path for P4-AC-4. It must not have a companion `run.json`. Its first line is the
  `run.started` launch header carrying binding, workspace fingerprint, and redaction/export posture,
  so the test proves the projection recovers run id, binding, and posture from the log alone (ADR
  0020 §1) — not from a cache.
- **New: a resume causal-chain golden.** Start → `unattended-park` stop (reuse the canonical triad),
  then resume: assert the continued `events.jsonl` (a `run.resumed`, the resolved park, terminal
  progress, and either `run.completed` or a fresh `run.stopped`) and that no terminal event or
  runner-owned action is duplicated.
- **New: a redaction/export collision fixture** driving the ambiguous-posture stop.
- **Extend normalization** (`tests/records-golden.int.test.ts`): add `<WORKSPACE>` for the workspace
  fingerprint and a placeholder for the plan-snapshot path so goldens stay machine-independent; keep
  the existing `<RUN_ID>`/`<RECORD_DIR>`/`<TIMESTAMP>` normalization. A golden no test reads may not
  exist (the Phase R rule).

## CLI behavior

- `jig inspect <run-dir>` — replays `events.jsonl` by default; works with no `run.json`; fails
  closed and diagnosably on a corrupt log or defective projection.
- `jig resume <run-dir> --scripted-output <output>` — continues the existing run; `--scripted-output`
  is required (fail closed on omission, matching the `run` flag discipline); `--config`/`--policy`/
  `--plan` are optional verification-only inputs; a refused resume exits non-zero with a diagnostic
  naming the `resume-blocked-*` reason. No fresh run id; no `attempt` increment.
- `jig run` / `jig preview` — unchanged in surface; `run` additionally writes the plan snapshot,
  workspace fingerprint, and run-level posture (Slice 3).

## Stop conditions

Halt and route back to design (do not decide locally) if:

- resume/replay/no-double-effect/redaction/workspace would need a rule ADR 0020 does not already
  settle;
- a fix requires freezing the records or plan JSON Schema, or adding TypeScript contract types;
- resume would need to rebind (swap policy/config/work-profile/repo-floor) to proceed;
- redaction would erase stop evidence, or a continuity claim would be made over a changed workspace;
- a real worker / real provider / Forge landing is needed for an AC to pass (that is Phase 5);
- per-event redaction posture, ISO-4 isolation, or remote-host recovery is required (deferred).

## PR evidence checklist

- `git diff --check` clean.
- `corepack pnpm check` green (lint, format:check, typecheck, delivery:check, vitest ≥ 90%).
- Every new test names the AC ID it proves; the `events.jsonl`-only projection fixture and the
  resume causal-chain golden are read by a test.
- A records-diff note in the PR body: the additive run-record fields (plan snapshot,
  `binding.workspace`, run-level posture) and the new `run.resumed`/resume continuation, citing
  ADR 0020 — downstream consumers read records, so the change must be legible.
- The Phase R/3 goldens still pass, evidencing no regression to the delivered shape.
