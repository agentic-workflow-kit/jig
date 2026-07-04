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
- PR #27 is merged: `docs: amend Phase 4 design — durable policy snapshot; defer record integrity`.
- PR #27 squash commit confirmed on `origin/main`: `eb108e7`.
- Implementation branch: `impl/phase-4-reliable-local-runs`.

## Binding line anchors

- Local dry-run dependency satisfaction uses `story.done` as the stand-in for `landed` until
  Phase 5 Forge/GitHub landing exists: ADR 0020 lines 179-184.
- The authoritative `events.jsonl` launch header is the first `run.started` record and carries
  run id, plan id, binding, workspace fingerprint, run-level redaction/export posture, and plan
  - policy snapshot references: ADR 0020 lines 85-103; Phase 4 brief lines 160-177.
- The durable policy snapshot is resolved launch policy content, not only a policy id; resume
  rebuilds the launch policy from `policy.snapshot.json` and never from a permissive stub: ADR 0020
  lines 351-358 and 394-399; Phase 4 brief lines 164-170 and 192-206.
- The workspace fingerprint is repo root, git `HEAD`, and a content hash over `git status
--porcelain` plus tracked/staged diff, with a clean-tree sentinel: ADR 0020 lines 233-254;
  Phase 4 brief lines 172-175.
- `resume-blocked-*` outcomes are live resume preflight diagnostics, not projected notices; refused
  resume appends no event and moves no checkpoint: ADR 0020 lines 319-328; Phase 4 brief lines
  236-242.
- Record and snapshot tamper-evidence is explicitly deferred; Phase 4 is durable but not
  tamper-evident: ADR 0020 lines 360-383.

## Preflight no-go checks

- P4-AC-3 must be implemented at local altitude through launch-policy immutability. Do not invent a
  local `resume-blocked-missing-approval` trigger; keep it as a named seam.
- Workspace continuity tests must use a real git repository context. A non-git sentinel must not
  claim continuity.

## Stop condition resolution

The original P4-AC-3 blocker is resolved by the amended design merged in PR #27:

- P4-AC-3 is met locally by persisting resolved launch policy content in `policy.snapshot.json` and
  adjudicating resumed requests against that snapshot.
- `resume-blocked-missing-approval` remains wired as a refusal reason/seam but has no active Phase 4
  local trigger.
- The active re-approval affordance and record/snapshot tamper-evidence are deferred together to a
  later records-integrity phase.

Current implementation state on the branch is complete for PR #26:

- Projection, replay inspect, launch durability, workspace fingerprinting, run-level posture,
  durable plan + policy snapshots, and resume re-entry have landed in the worktree.
- Resume uses a `ResumePlan` seam from projection to harness execution.
- Full `corepack pnpm check` is green after the policy-snapshot and coverage updates.
