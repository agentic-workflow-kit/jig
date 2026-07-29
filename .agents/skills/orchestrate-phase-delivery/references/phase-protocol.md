# Phase protocol reference

Use this operational reference only after reading the active policy, story contract, tracker, and
phase contract. Product/design activation and `P` remain higher authority; this skill coordinates
only.

## Inputs and ledger schema

Before admission verify active owner activation/`P`, phase target, `track.json`, safe-overlap facts,
and external ledger. Record per story: ID; phase integration ref; registered worktree path/branch;
base commit/tree and candidate commit/tree; merge-base and declared-predecessor containment;
required check command/set, result, timestamp and durable log; minimal non-secret environment-name
allowlist; tracked/untracked clean status and exact
`git ls-files --others --ignored --exclude-standard` inventories before checks and after review;
ignored-state allowlist decision; continuous implementer and independent reviewer identities;
findings/verdict/timestamp; integration result/commit; current state and terminal boundary. Pair
replacement is exceptional and records reason plus handoff. Live facts never enter repository
files.

## Ready-set and ownership loop

At phase start and every terminal story boundary, inspect tracker, ledger, and integration HEAD.
Select only phase stories whose declared predecessors are landed in that base and whose activation
and DoR are current. Apply the safe-overlap guard: a capacity or ownership conflict is a temporary
ledger-recorded admission hold, never a dependency or permission to idle other ready stories. If no
guard applies, launch every ready story within available distinct pair/worktree capacity. Pairs are
distinct across stories and continuous within a story.

The implementer writes; at explicit freeze the reviewer uses that same registered worktree read-only.
Candidate, fix, or target move means commit, run affected checks with only the policy allowlisted
environment names, inventory ignored state before/after, record evidence, and have the same reviewer
incrementally inspect prior-reviewed..new, sibling occurrences, and invariants. `.env`/credential
files, external workspace links, unexplained generated output, or unlisted residue fail closed;
dependencies require frozen-lockfile/link-containment proof and generated/cache output must be
regenerated or exact-candidate-keyed. Old verdicts never transfer. Story states are admitted,
implementing, frozen-for-review, changes-required, approved, integrated/quiescent, or
terminally-blocked; inspect the ready set after every transition to approved, integrated, or
terminally-blocked.

## Integration and closure

Fast-forward or no-fast-forward merge only an approved story commit, preserving it as ancestor. On
content conflict abort; the coordinator does not resolve it. Return to the same pair for a new
candidate/check/review loop. Retain integrated branches/worktrees/pairs quiescent through final PR
feedback. Run integration checks, obtain independent read-only closure review, then use one normal
hosted-CI-backed phase PR; route feedback to its owning pair and refresh closure review after any
final candidate change.

## Worktree lifecycle and recovery

All local delivery, check, review, and recovery workspaces are registered Git worktrees. One durable
phase integration worktree and one story worktree per admitted story are mandatory. Cleanup happens
only after confirmed landing and explicit keep-list/scope; terminally blocked work remains until an
owner decision. Provider-managed hosted CI is the sole workspace exception and cannot replace local
evidence or review.

Create a new phase branch/worktree with `pnpm worktree:new <phase-branch> <authorized-target>`.
Create a new story branch/worktree with `pnpm worktree:new <story-branch>
<current-integration-commit>` only after predecessor containment and admission pass. These commands
create new branches; they are not recovery commands. After confirmed final landing and explicit
cleanup authorization, use the repository's guarded `pnpm worktree:clean <branch>` only for the
exact approved cleanup scope.

Recover by running `git worktree list --porcelain`, then reconcile registered paths, branches,
HEADs, bases, and clean states to the ledger. Reuse a matching worktree. Reattach a missing path
only after verifying its recorded branch/object exists, the destination path is the registered
missing path, and ledger/base/evidence/clean facts reconcile: `git worktree add <registered-path>
<recorded-branch>`. `pnpm worktree:new` creates a new branch and is not recovery. Any missing,
ambiguous, dirty, mismatched, or irreconcilable branch/object/path/base/evidence fact stops
`OWNER_DECISION_REQUIRED`. Never use a local clone.
