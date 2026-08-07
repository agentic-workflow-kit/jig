---
name: orchestrate-story-waves
description: "Orchestrate dependency-aware implementation story waves by creating one dedicated Codex thread per eligible story, requiring an independent reviewer thread, completing each PR or integration-branch loop, recomputing readiness after merge, and continuing to a bounded story count. Use when a user asks to autonomously deliver multiple eligible stories, run each story in a separate Codex chat, or advance a tracked DAG through repeated review and merge lifecycles."
license: Apache-2.0
compatibility: Requires Codex thread-management tools, Git worktrees, and the repository's GitHub workflow tooling.
metadata:
  version: "0.1.0"
---

# Orchestrate Story Waves

Coordinate repeated story delivery without turning the coordinator into the implementer or reviewer.
Repository instructions, source-of-truth trackers, and local delivery skills remain authoritative.

## Start

1. Confirm that the user explicitly authorized new Codex threads and the requested mutation/lifecycle
   scope. Thread creation, pushing, PR creation, merging, and cleanup are separate capabilities; do
   not infer any missing authority.
2. Read the closest `AGENTS.md`, the tracker/story contracts, and any repository-local delivery
   skill. If the repo has a stricter worktree, reviewer, gate, or phase-PR rule, it overrides this
   skill.
3. Verify the current target ref, remote state, dirty worktrees, open PRs, required gates, and
   tracker authority. Missing evidence is not readiness.
4. Record an external operational ledger. Keep live thread IDs, worktree paths, commits, verdicts,
   and URLs outside tracked product files unless the repository explicitly requires otherwise.
5. Read `references/wave-protocol.md` before deriving the ready set. Read
   `references/thread-dispatch.md` before creating or steering any thread.

## Fixed role defaults

- Implementer: one isolated Codex thread per eligible story, `gpt-5.6-luna`, reasoning `high`.
- Reviewer: a separate thread created by that story's implementer, `gpt-5.6-terra`, reasoning
  `high`, permanently read-only.
- The same implementer/reviewer pair remains through fixes and incremental re-review. Replacement
  is exceptional and must preserve the repository's recovery policy.
- If Luna is explicitly unavailable, retry once with Terra at the same effort and record the
  fallback. An ordinary task failure is not model unavailability.
- Do not let model, effort, worktree, base, or lifecycle stop point inherit accidentally.

User-specified model, effort, count, or stop-point overrides replace these defaults when compatible
with repository policy.

## Wave loop

1. Validate the declared dependency graph and compute eligible stories from the tracker, current
   landed/integrated state, current gates, and the external ledger.
2. Create a registered clean worktree/branch from the exact eligible base for every admitted story.
   Never dispatch two implementers into one worktree.
3. Create one implementer thread for every currently eligible story within the user's story-count
   limit and available capacity. The prompt must satisfy `references/thread-dispatch.md`.
4. The implementer must create its independent reviewer before implementation writes when the
   repository requires pre-write must-covers; otherwise no later than candidate freeze. The
   reviewer never runs executable verification or mutates state.
5. The implementation owner commits and runs all required checks on the exact candidate. The
   reviewer returns `PASS` or `CHANGES_REQUIRED`; fixes stay with the same pair and require refreshed
   checks and incremental review.
6. Complete the selected delivery mode:
   - **PR mode:** the story thread pushes, creates a conventional-title PR, and runs the explicitly
     authorized default PR lifecycle through verified merge and scoped cleanup.
   - **Integration mode:** no per-story PR. The approved story candidate is integrated into the
     declared integration branch while preserving the reviewed commit as an ancestor. After phase
     closure, the coordinator creates the single phase PR and runs its authorized lifecycle.
7. Count a story only after verified merge in PR mode or verified integration in integration mode.
   Recompute the ready set from primary evidence, then dispatch the next wave. Never unlock a
   descendant from a branch, passing checks, reviewer prose, or an unmerged PR alone.
8. Continue until the requested count is reached, the named phase closes, or every remaining story
   is governed-blocked. A blocked story blocks only its descendants; continue independent ready
   stories.

## Stop conditions

Stop the affected lane and report exact evidence when:

- source authority or tracker scope is missing, contradictory, or requires an owner decision;
- predecessor landing/integration, worktree, candidate, check, reviewer, or lifecycle evidence
  cannot be reconciled;
- a reviewer or implementer crosses its authority boundary;
- the requested count conflicts with a required phase boundary and the user did not prioritize one;
- no eligible story remains.

Do not invent a dependency, story ID, approval, provider reachability, reviewer verdict, or merge.
Do not silently widen the story count to finish a phase.

## Validation

Before claiming completion, report every counted story with its thread, exact candidate, reviewer
verdict, PR or integration result, checks, merge/landing evidence, cleanup result, and the recomputed
next-ready set. Validate this skill with the open-skill validator and its eval fixtures after edits.
