---
title: "Phase 4 implementation plan"
status: active
---

# Phase 4 implementation plan

This is the durable execution plan for M5b Phase 4 — Reliable Local Runs. It records the updated
multi-agent plan used for the implementation branch
`impl/phase-4-reliable-local-runs`.

## Scope

Implement Phase 4 from ADR 0020 and the Phase 4 implementation brief:

- replay-based `jig inspect` over `events.jsonl`;
- self-sufficient launch records;
- durable plan and policy snapshots;
- `jig resume` from projected checkpoint evidence;
- no double-effect for recorded terminal work, owner decisions, and dry-run runner actions;
- workspace continuity checks;
- run-level redaction/export posture;
- projected causal notices.

Do not implement provider integrations, Forge/GitHub landing, schema freeze, public contract
packages, ISO-4 parallel-workspace isolation, remote-host resume, or refused-resume audit events.

## P0 Preflight Gate

Before runtime edits:

1. Confirm PR #25 is merged into `main`.
2. Confirm local `main` is at PR #25 merge commit.
3. Create external worktree/branch:
   `impl/phase-4-reliable-local-runs`.
4. Write `phase-4-implementation-run-note.md` with exact source line anchors for:
   - local `story.done` dependency satisfaction stand-in for `landed`;
   - first-line `run.started` launch-header fields, including plan and policy snapshot refs;
   - workspace fingerprint evidence;
   - `resume-blocked-*` as live diagnostics, not replayed notices;
   - `resume-blocked-missing-approval` as a seam with no active local trigger;
   - record/snapshot tamper-evidence as deferred.
5. Run baseline `corepack pnpm check`.
6. Stop before code if workspace fingerprint behavior would require claiming continuity without git
   evidence, or if implementing P4-AC-3 would require inventing a local missing-approval trigger,
   tamper-evidence, rebind behavior, or schema freeze.

Current P0 evidence:

- PR #25 merged as `1c8d2b544c4d5fbf204c4debf48b46ff8ea2c962`.
- Branch/worktree created at
  `/Users/aryekogan/repos/agentic-workflow-kit/worktrees/jig/impl-phase-4-reliable-local-runs`.
- Baseline `corepack pnpm check` passed with 101 tests and coverage above thresholds.

## Source Anchors

- ADR 0020 lines 179-184: `story.done` is the Phase 4 local-dry-run dependency-satisfaction
  stand-in for `landed`; true landed dependency satisfaction returns with Forge/GitHub landing in
  Phase 5.
- ADR 0020 lines 85-103 and Phase 4 brief lines 160-177: `events.jsonl` first line is the
  enriched `run.started` launch header carrying run id, plan id, binding, workspace fingerprint,
  run-level redaction/export posture, and plan + policy snapshot references.
- ADR 0020 lines 351-358 and 394-399; Phase 4 brief lines 164-170 and 192-206: the resolved launch
  policy is persisted in `policy.snapshot.json`; resume rebuilds and adjudicates from that snapshot,
  not a permissive policy id stub.
- ADR 0020 lines 233-254 and Phase 4 brief lines 172-175: workspace fingerprint is repo root, git
  `HEAD`, and content hash over `git status --porcelain` plus tracked/staged diff, with clean-tree
  sentinel.
- ADR 0020 lines 319-328 and Phase 4 brief lines 236-242: `resume-blocked-*` diagnostics are live
  resume preflight results; refused resume appends no event and moves no checkpoint.
- ADR 0020 lines 360-383: plan and policy snapshots are durable but not tamper-evident in Phase 4;
  record/snapshot integrity and the active missing-approval re-approval path are deferred.

## Dependency DAG

```text
P0 preflight -> no dependencies
P1 projection -> P0
P3 launch durability -> P0
P2 inspect-by-replay -> P1, P3
P4 redaction/notices -> P1, P3
P5 resume core -> P1, P3
P6 CLI/fixtures/goldens -> P2, P4, P5
V1 targeted review -> P6
V2 local gates -> V1
V3 PR prep -> V2
```

Notes:

- P3 owns the emitted truth for the first-line enriched `run.started` launch header.
- P1 projection consumes that shape; missing/old launch metadata is defective for Phase 4 replay
  when replay needs it.
- P2 should avoid over-finalizing inspect rendering before P4 lands posture/notices. Final inspect
  polish happens in P6 after notices and posture are integrated.
- P5 must keep a clean seam:

```text
projection -> ResumePlan -> harness execution from ResumePlan
```

`resume.ts` should not directly poke harness internals. It should produce a small `ResumePlan` or
equivalent internal structure that the harness can execute from.

## Dispatch Table

| Step | Agent                                           | Model / effort                        | Scope                                                                                                                           |
| ---- | ----------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| P0   | Coordinator + researcher                        | `gpt-5.3-codex-spark` / medium        | Live state, worktree, baseline gate, no-go checks, run note.                                                                    |
| P1   | Projection implementer                          | `gpt-5.4` / high                      | `src/projection.ts`, projection tests, deterministic replay/failure posture.                                                    |
| P3   | Records/workspace implementer                   | `gpt-5.4` / high                      | `src/records.ts`, `src/workspace.ts`, snapshot, first-line launch header, posture, workspace fingerprint, golden normalization. |
| P2   | Inspect implementer                             | `gpt-5.4` / medium                    | `jig inspect` consumes projection; no `run.json` required; output includes stop cause, checkpoint, diagnostics, notices.        |
| P4   | Redaction/notices implementer + architect check | `gpt-5.4` / high and `gpt-5.5` / high | Run-level posture guard and projected notices; no new event family and no new export product unless docs require it.            |
| P5   | Resume implementer + reviewer sidecar           | `gpt-5.5` / high                      | `ResumePlan`, `jig resume`, binding/workspace/integrity preflight, no-double-effect, checkpoint continuation.                   |
| P6   | Fixtures/test implementer                       | `gpt-5.4` / high                      | AC-named tests, events-only crashed run, resume causal chain, workspace mismatch, posture ambiguity, golden preservation.       |
| V1   | Reviewer                                        | `gpt-5.5` / high                      | ADR 0020/P4-AC audit, stop conditions, no scope creep, sibling occurrence search.                                               |
| V2   | Coordinator + implementer                       | `gpt-5.4` / medium                    | `git diff --check`, `corepack pnpm check`, required `rg` evidence checks, scoped fixes.                                         |
| V3   | Coordinator                                     | current model / low                   | PR body with acceptance, records diff, non-goals, verification evidence.                                                        |

## Implementation Slices

### P1 — Projection Foundation

Allowed files:

- `src/projection.ts`
- `tests/projection.unit.test.ts`
- `src/types.ts` only for additive exported projection types if needed

Requirements:

- Parse `events.jsonl` into events.
- Treat `events.jsonl` as authoritative.
- Treat `run.json` as optional non-authoritative cache.
- Derive run identity, plan id, mode, binding, workspace, posture, and plan snapshot reference from
  first-line `run.started`.
- Derive run status, per-story states, stop cause, safe checkpoint, diagnostics, changed files, and
  projected notices.
- Fail closed on malformed JSONL, missing `actor`, missing `run.stopped.checkpoint`, illegal
  transitions, and missing/ambiguous launch-header metadata needed for replay.
- Emit `run.json-stale` diagnostic when cache conflicts with log.
- Determinism: same accepted log, same projection.

Tests:

- Happy replay.
- Replay with no `run.json`.
- `run.json` conflict: log wins and diagnostic exists.
- Malformed line.
- Missing actor.
- Missing checkpoint.
- Illegal transition.
- Launch header supplies all Phase 4 replay metadata.

### P3 — Launch Durability

Allowed files:

- `src/workspace.ts`
- `src/records.ts`
- `src/types.ts`
- `tests/records.unit.test.ts`
- `tests/records-golden.int.test.ts`
- `tests/fixtures/m5b-local-mvp/golden-*.json`

Requirements:

- Write validated `plan.snapshot.json` at run start.
- Write resolved launch policy content to `policy.snapshot.json` at run start.
- Ensure the first line of `events.jsonl` is enriched `run.started`.
- Include run id, plan id, mode, binding, workspace fingerprint, redaction/export posture, plan
  snapshot reference, policy snapshot reference, actor, and timestamp.
- Keep `run.json` as finalized non-authoritative cache with compatible/additive fields.
- Workspace fingerprint uses local git only: repo root, `HEAD`, and content hash over
  `git status --porcelain` plus tracked/staged diff; clean tree uses a sentinel.
- Do not claim workspace continuity in non-git contexts.
- Normalize `<WORKSPACE>` and plan/policy snapshot path/ref in golden tests.

Tests:

- Plan and policy snapshots are written.
- First JSONL line is enriched `run.started`.
- Workspace hash differs for materially different dirty tracked/staged changes at same `HEAD`.
- Non-git contexts fail closed/diagnosably.
- Phase R/3 goldens still pass after controlled normalization.

### P2 — Inspect By Replay

Dependencies: P1, P3.

Requirements:

- `jig inspect <run-dir>` replays `events.jsonl` by default.
- No `--replay` flag.
- Works without `run.json`.
- Uses `run.json` only as cache/compat input for stale diagnostics.
- Renders item outcomes, diagnostics, changed files, stop cause, projected notices, and safe
  resume checkpoint from projection.
- Fails closed clearly on corrupt/defective logs.
- Leave final notice/posture rendering flexible until P4.

Tests:

- P4-AC-4 no-`run.json` inspect.
- P4-AC-4 stop reason, notice, checkpoint.
- P4-AC-4 corrupt/defective log failure.

### P4 — Redaction/Posture And Notices

Dependencies: P1, P3. Integrate with P2/P6 for final inspect output.

Requirements:

- Run-level default posture: record safe for owner; export redacted.
- Posture recovered from `run.started`.
- Missing/ambiguous posture is diagnosable and fail-closed.
- No denial merely because `run.json` is missing.
- Export under unsafe/ambiguous posture is denied if an export surface exists; do not create a full
  export product surface unless docs require it.
- Project notices from recorded facts:
  - unattended park;
  - evidence-gate failure;
  - policy/authorization denial;
  - redaction/export posture ambiguity.
- Do not project `resume-blocked-*`; they remain live resume diagnostics.

Tests:

- P4-AC-5 unknown posture yields diagnosable inspect/export posture failure.
- Valid launch-header posture allows events-only inspect.
- P4-AC-4/P4-AC-5 projected notices appear in inspect.
- Refused resume diagnostics append no lifecycle event.

### P5 — Resume Core

Dependencies: P1, P3.

Requirements:

- Add `jig resume <run-dir> --scripted-output <output>`.
- Optional `--config`, `--policy`, `--plan` are verification-only and never rebind.
- Load projection plus plan and policy snapshots.
- Rebuild the launch policy from `policy.snapshot.json` and adjudicate resumed requests against it.
- Refuse defective projection.
- Verify binding and snapshot if optional paths are supplied.
- Recompute workspace fingerprint and compare to `binding.workspace`.
- Refuse with active diagnostics:
  - `resume-blocked-binding-mismatch`;
  - `resume-blocked-workspace-mismatch`.
- Keep `resume-blocked-missing-approval` as a typed seam only; it has no active Phase 4 local
  trigger and must not be invented.
- Successful resume keeps same run id, same directory, and same attempt.
- Append `run.resumed`.
- Continue from projected checkpoint.
- Do not re-run terminal stories.
- Do not duplicate terminal events, owner decisions, or `runner-action.skipped-on-dry-run`.
- Free independent unstarted work after `work-item-blocked`.
- Keep blocked story and dependent blocked stories terminal.
- For unresolved parked checkpoint:
  - interactive resume re-presents Doorbell;
  - non-interactive resume re-enters, advances independent work where allowed, then records a fresh
    `run.stopped` with `unattended-park`.
- Implement a clean internal seam:

```text
projection -> ResumePlan -> harness execution from ResumePlan
```

Tests:

- P4-AC-1 resume from `after:<story-id>`.
- P4-AC-1 binding preserved.
- P4-AC-1 independent unstarted work proceeds after blocked stop.
- P4-AC-2 terminal stories not re-run.
- P4-AC-2 no duplicate `runner-action.skipped-on-dry-run`.
- P4-AC-2 no duplicate owner decision.
- P4-AC-2 no second first-binding launch header.
- P4-AC-3 resumed rule-governing work is routed under the durable launch policy snapshot instead
  of granted under a permissive stub.
- P4-AC-6 workspace mismatch refuses resume.
- CLI missing `--scripted-output` fails closed.

### P6 — Fixtures, Goldens, And Final CLI Integration

Dependencies: P2, P4, P5.

Required fixture categories:

1. Events-jsonl-only crashed run:
   - no `run.json`;
   - enriched first-line `run.started` with plan and policy snapshot refs;
   - proves P4-AC-4.
2. Resume causal chain:
   - start, stop, resume, continued work;
   - no duplicate terminal, runner-action, or owner-decision events.
3. Workspace mismatch:
   - recorded fingerprint differs from recomputed fingerprint;
   - resume refuses.
4. Redaction posture ambiguity:
   - missing or ambiguous posture;
   - inspect/export posture failure.

Every committed golden fixture must be read by a test.

## Verification

Run during implementation:

```bash
git diff --check
corepack pnpm check
```

Before PR:

```bash
rg -n "P4-AC-1|P4-AC-2|P4-AC-3|P4-AC-4|P4-AC-5|P4-AC-6" tests src docs/delivery/m5b-local-mvp-r2
rg -n "run\\.started|run\\.resumed|events\\.jsonl|plan\\.snapshot|binding\\.workspace|resume-blocked|redaction-export" src tests docs/delivery/m5b-local-mvp-r2
```

Final review must confirm:

- projection and resume share one replay-derived source of truth;
- no second binding/launch-header event is appended on resume;
- refused resume appends no event;
- inspect is not denied merely because `run.json` is missing;
- no provider/Forge/GitHub landing behavior was introduced;
- no schema freeze or public contract package was introduced;
- resumed rule-governing requests are adjudicated under the launch policy snapshot;
- record/snapshot tamper-evidence was not added.

## PR Shape

Title:

```text
feat: implement Phase 4 reliable local runs
```

PR body must include:

- summary bullets from the implementation brief;
- P4-AC-1 through P4-AC-6 acceptance evidence;
- records diff;
- durable but not tamper-evident records non-goal;
- non-goals preserved;
- verification evidence:
  - `git diff --check`;
  - `corepack pnpm check`;
  - targeted `rg` checks;
  - test count and coverage summary.
