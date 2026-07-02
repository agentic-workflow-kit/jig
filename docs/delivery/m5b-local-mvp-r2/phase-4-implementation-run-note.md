---
title: "Phase 4 implementation run note"
status: active
---

# Phase 4 implementation run note

This note records pre-implementation anchors for the Phase 4 runtime work. It is evidence for the
implementation run, not a new design source.

## Live substrate

- PR #25 is merged: `docs: close Phase 4 reliable local runs design`.
- Merge commit confirmed locally and remotely: `1c8d2b544c4d5fbf204c4debf48b46ff8ea2c962`.
- Implementation branch: `impl/phase-4-reliable-local-runs`.

## Binding line anchors

- Local dry-run dependency satisfaction uses `story.done` as the stand-in for `landed` until
  Phase 5 Forge/GitHub landing exists: ADR 0020 lines 179-184.
- The authoritative `events.jsonl` launch header is the first `run.started` record and carries
  run id, plan id, binding, workspace fingerprint, run-level redaction/export posture, and plan
  snapshot reference: ADR 0020 lines 85-103; Phase 4 brief lines 159-176.
- The workspace fingerprint is repo root, git `HEAD`, and a content hash over `git status
--porcelain` plus tracked/staged diff, with a clean-tree sentinel: ADR 0020 lines 233-254;
  Phase 4 brief lines 172-175.
- `resume-blocked-*` outcomes are live resume preflight diagnostics, not projected notices; refused
  resume appends no event and moves no checkpoint: ADR 0020 lines 305-323; Phase 4 brief lines
  224-226.

## Preflight no-go checks

- P4-AC-3 must use a distinct local stimulus for `resume-blocked-missing-approval`; it must not be
  reduced to binding mismatch or workspace mismatch.
- Workspace continuity tests must use a real git repository context. A non-git sentinel must not
  claim continuity.

## Stop condition reached

Implementation reached the P5 resume slice and stopped on the first preflight no-go check:

- `resume-blocked-missing-approval` does not have a distinct Phase 4 local stimulus in the merged
  docs that avoids collapsing into `resume-blocked-binding-mismatch` or
  `resume-blocked-workspace-mismatch`.
- ADR 0020 lines 327-335 scope the local detection surface to recorded facts plus workspace
  fingerprint, while the Phase 4 brief requires the diagnostic at lines 192-194. The implementation
  can verify binding mismatch and workspace mismatch, but a separate missing-approval trigger would
  require inventing a new local rule or recording more launch-time policy/safety evidence.
- Per the Phase 4 stop conditions, do not invent that behavior in runtime code. Route this back to
  design before claiming P4-AC-3 closed.

Current implementation state on the branch is partial:

- Projection, replay inspect, launch durability, workspace fingerprinting, run-level posture, and
  resume scaffolding have landed in the worktree.
- Targeted tests for projection, records, inspect, harness, and resume passed in worker runs.
- Full `pnpm test` was reported by the resume worker as behavior-passing but coverage-failing after
  the new resume surface; coverage and lint cleanup remain after the design blocker is resolved.
