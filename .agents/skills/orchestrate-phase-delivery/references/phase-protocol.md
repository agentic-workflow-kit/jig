# Phase protocol reference

Use this operational reference only after reading the active policy, story contract, tracker, and
phase contract. Current product/design authority and the explicit owner or named-delegate
implementation request govern; this skill coordinates only.

## Inputs and ledger schema

Before admission verify the explicit requested phase/story scope, current product/design/track
authority, phase target, safe-overlap facts, and predecessor containment. Create or reconcile the
external operational ledger when delivery starts; it records execution state but is not an
approval gate. Record per story: ID; authorized scope and constraints; phase integration ref;
registered worktree path/branch; base commit/tree and candidate commit/tree; merge-base and
declared-predecessor containment; required check command/set, result, timestamp and durable log;
minimal non-secret environment-name allowlist; tracked/untracked clean status and exact
`git ls-files --others --ignored --exclude-standard` inventories before checks and after review;
ignored-state allowlist decision; continuous implementer and independent reviewer identities;
findings/verdict/timestamp; integration result/commit; current state and terminal boundary. Pair
replacement is exceptional and records reason plus handoff. Live facts never enter repository
files. Implementer effort reasoning, reviewer-prepared must-cover bullets, and implementer proof
notes stay in the existing dispatch and handoff; do not add ledger fields or repository artifacts
for them.

## Ready-set and ownership loop

At phase start and every terminal story boundary, inspect tracker, ledger, and integration HEAD.
Select only stories within the explicit request whose declared predecessors are landed in that base
and whose DoR is current. Apply the safe-overlap guard: a capacity or ownership conflict is a temporary
ledger-recorded admission hold, never a dependency or permission to idle other ready stories. If no
guard applies, launch every ready story within available distinct pair/worktree capacity. Pairs are
distinct across stories and continuous within a story.

Before writes, classify implementer effort from both scope clarity and semantic risk. Medium remains
available for bounded work whose realization is directly determined by current authority, whose
failure modes are local, and whose positive and negative proof is straightforward. Use high when
authority, fencing, recovery, replay, idempotency, witness or admission behavior, persistence,
identity, ordering, lifecycle, cross-package type closure, a seam that constrains later stories,
multiple authority sources, or a non-local guarantee materially shapes correctness. File count or
declared size alone cannot lower the classification. Use xhigh only for an exceptional
release-critical or architecture-wide decision under the global routing policy. This
repository-local assessment supplies Jig-specific effort reasoning and task content; generic
sub-agent context and provider routing remain owned by the global `offload` skill.

After the continuous pair is assigned and before the implementer writes, the reviewer prepares
read-only against the exact story, current product/design authority, predecessor surface, and
affected package seams. The reviewer does not run checks. It returns a concise set of normally five
to twelve must-cover bullets, each containing the invariant or failure mode, exact source, and
expected observable proof in code, types, or tests. The coordinator includes the selected effort
and reason plus those bullets in the implementer task. They supplement the story contract without
expanding it; a genuine ambiguity follows the existing `OWNER_DECISION_REQUIRED` rule.

Before candidate freeze, the implementer identifies in the normal handoff where code, types, or
tests prove each must-cover bullet. When an invariant applies to a family of operations, states, or
types, the implementer searches sibling occurrences rather than proving only one happy path.
Candidate, fix, or target move means commit, run every applicable required check with only the policy
allowlisted environment names, inventory ignored state before/after, record evidence, and have the
same reviewer incrementally inspect prior-reviewed..new, sibling occurrences, and invariants.
`pnpm check:affected` may provide local feedback but never replaces the full `pnpm check` evidence
required for candidate or integration gates. `.env`/credential
files, external workspace links, unexplained generated output, or unlisted residue fail closed;
dependencies require frozen-lockfile/link-containment proof and generated/cache output must be
regenerated or exact-candidate-keyed. Old verdicts never transfer. Story states are admitted,
implementing, frozen-for-review, changes-required, approved, integrated/quiescent, or
terminally-blocked; inspect the ready set after every transition to approved, integrated, or
terminally-blocked.

The candidate-bound reviewer inspects the full authorized diff, must-cover bullets, implementer
proof notes, sibling occurrences, relevant tests, and recorded check evidence. It returns `PASS` or
`CHANGES_REQUIRED` and, after finding a blocker, completes the rest of the presently supportable
inspection pass instead of intentionally stopping. Report all current blocking findings ordered by
severity, group findings sharing a root cause, name the invariant or source for each group, and give
the exact re-review scope. Report missing evidence that limits further judgment. Complete-pass
review does not require speculation beyond available evidence, and the reviewer remains permanently
read-only: it never runs checks, repairs evidence, or mutates repository or provider state.

A local defect stays in the ordinary loop: the same implementer fixes it, runs every applicable
required check, freezes a new candidate, and returns it to the same reviewer for incremental
re-review. For a structural defect—such as the wrong abstraction or ownership, an incomplete type
model, or a seam unable to express the required invariant—the implementer first restates the
corrected realization and affected surface in the normal handoff, then changes code and runs the
full candidate gate. This conditional rethink is not a new approval stage. Use
`OWNER_DECISION_REQUIRED` only if the correction would change approved architecture, tracked scope
or dependencies, provider reachability, selected realization, or an accepted trade-off.

## Integration and closure

Fast-forward or no-fast-forward merge only an approved story commit, preserving it as ancestor. On
content conflict abort; the coordinator does not resolve it. Return to the same pair for a new
candidate/check/review loop. Retain integrated branches/worktrees/pairs quiescent through final PR
feedback. Run integration checks, obtain independent read-only closure review, then use one normal
hosted-CI-backed phase PR; route feedback to its owning pair and refresh closure review after any
final candidate change.

## Worktree lifecycle and recovery

All local delivery, check, review, and recovery workspaces are registered Git worktrees. One durable
phase integration worktree and one story worktree per admitted story are mandatory. Confirmed
landing plus an explicit keep-list/scope is the normal cleanup prerequisite. A terminally blocked
story is the sole non-landed cleanup exception: first reconcile it or obtain any applicable
material owner decision, retain its ledger/evidence including terminal disposition, and obtain
explicit authorization for the exact scoped cleanup before deleting its worktree or branch.
Provider-managed hosted CI is the sole workspace exception and cannot replace local evidence or
review; it does not create another cleanup exception.

Create a new phase branch/worktree with `pnpm worktree:new <phase-branch> <authorized-target>`.
Create a new story branch/worktree with `pnpm worktree:new <story-branch>
<current-integration-commit>` only after predecessor containment and admission pass. These commands
create new branches; they are not recovery commands. After confirmed final landing and explicit
cleanup authorization, use the repository's guarded `pnpm worktree:clean <branch>` only for the
exact approved cleanup scope.

Recover by running `git worktree list --porcelain`, then reconcile registered paths, branches,
HEADs, bases, and clean states to the ledger. Reuse a matching worktree. Reattach a missing path
only after verifying its recorded branch/object exists, the destination path is the registered
missing path, and all tracker, base, clean-status, sanitized-environment, ignored-state, evidence,
reviewer-independence, required-check, and ownership facts reconcile:
`git worktree add --force <registered-path> <recorded-branch>`. `--force` overrides only the stale
missing-worktree registration already reconciled by those prerequisites; it is not permission to
replace a live or mismatched worktree. `pnpm worktree:new` creates a new branch and is not recovery.
Any missing, ambiguous, dirty, mismatched, or irreconcilable tracker, branch/object, registered path,
base, clean-status, sanitized-environment, ignored-state, evidence, reviewer-independence,
required-check, or ownership fact blocks the affected story and its descendants until reconciled;
independent ready stories continue. Use `OWNER_DECISION_REQUIRED` only if recovery requires a
material authority, scope, dependency, realization, provider-reachability, or accepted-trade-off
decision. Never use a local clone.
