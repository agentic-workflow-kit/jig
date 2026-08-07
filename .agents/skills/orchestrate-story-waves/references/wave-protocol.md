# Story-wave protocol

## Readiness

A story is eligible only when all of these are current:

1. It is inside the explicitly authorized scope and story-count boundary.
2. Its tracker entry, story contract, governing authority, and required choices are complete.
3. Every declared dependency has verified landing or integration evidence in the story base.
4. Required decision, evidence, provider, environment, and overlap gates pass.
5. A clean registered worktree, continuous implementer/reviewer ownership, required checks, and
   lifecycle destination can be recorded before writes.

Git ancestry proves containment, not semantic predecessor conformance. A known predecessor defect
blocks its first affected consumer even when the predecessor commit is present.

## Dependency waves

At initialization and after each terminal merge/integration:

1. Refresh the target and hosted state.
2. Validate the tracker with its own consumer gate.
3. Reconcile the external ledger against registered worktrees and exact commits.
4. Mark completed, active, recoverable-blocked, owner-decision-blocked, and eligible stories.
5. Launch all eligible stories within pair capacity and the remaining count.

Independent stories may run concurrently. Their candidates must integrate serially against the
current integration head or use the repository's authorized conflict protocol. The coordinator
never resolves a story integration conflict; return it to the owning pair for a refreshed candidate.

## PR mode

Use when every story is independently deliverable to the repository target.

1. The story thread pushes the reviewed candidate and creates one non-draft PR with a conventional
   title.
2. Run the repository's PR lifecycle. Defaults apply only when the user explicitly authorized
   watch, feedback resolution, merge, and cleanup.
3. A story counts only after remote `MERGED`, target synchronization, and scoped worktree/branch
   cleanup are verified.
4. Recompute readiness from the new target commit.

## Integration mode

Use when repository policy requires one phase/epic integration branch and one final PR.

1. Each story gets its own registered worktree and exact-candidate review.
2. After `PASS`, integrate the reviewed commit into the integration branch while preserving it as
   an ancestor. Record the resulting integration commit and keep the story worktree quiescent.
3. Re-run required integration gates after every terminal story boundary and recompute readiness.
4. After all required stories integrate, run full integration checks and independent closure
   review, then create the single final PR.
5. The coordinator runs the authorized PR lifecycle and cleans the integration/story worktrees only
   after verified landing and explicit cleanup scope.

## Counting and persistence

The user's numeric limit counts verified story completions, not threads, retries, review loops,
remediation attempts, PRs, or merge commits, unless the user explicitly defines another unit.

If a phase contains more stories than the remaining count, stop at the count boundary unless the
user explicitly prioritized finishing the phase. If the user did prioritize phase closure, finish
the phase and report that it exceeded the numeric limit. Never choose silently.

Maintain progress autonomously while eligible work exists. When monitoring a long-running thread or
PR, use bounded waits and primary status reads. Do not declare a goal blocked merely because work is
slow or unchanged.
