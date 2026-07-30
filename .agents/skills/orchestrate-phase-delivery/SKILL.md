---
name: orchestrate-phase-delivery
description: "Coordinate a Jig delivery phase with declared track dependencies, registered Git worktrees, continuous independent story review, bounded parallelism, and one final phase PR. Use when starting, resuming, recovering, or closing an explicitly owner-requested Jig delivery phase; do not use to author product/design decisions, change the track DAG, or implement a scheduler service."
---

# Orchestrate phase delivery

1. Resolve the current approved product package from `docs/product/` and approved architecture
   package from `docs/redesign/design/`. Only then read
   `docs/delivery/greenfield/delivery-policy.md`, `story-contract.md`, `track.json`, and
   `phase-orchestration.md`. Confirm that the current owner or named delegate explicitly requested
   implementation of the named phase/story. That request is sufficient implementation
   authorization within current product/design/track authority; do not require delivery-package
   qualification, delivery-surface digest approval, an external activation issue, or a
   landed-commit equivalence record. Start the external operational ledger when delivery begins.
2. Establish or reconcile one registered phase integration worktree and one registered story
   worktree per admitted story. Use Git worktrees for every local delivery, check, review, and
   recovery operation; no fresh clone is an exception. Read `references/phase-protocol.md` before
   recording ledger facts or recovering a worktree.
3. At phase start and after each terminal story boundary, inspect the declared DAG, ledger, and
   integration branch. Launch every ready story within available continuous implementer/reviewer
   pair capacity and any already-authorized safe-overlap guard. A blocked story blocks only
   descendants.
4. Keep each pair stable through implementation, committed-candidate checks, read-only review,
   fixes, and incremental re-review. Before each check, enforce the policy's minimal non-secret
   environment-name allowlist and record exact ignored-state inventories/allowlist decisions. Bind
   the reviewer verdict to the exact candidate in the external ledger. After final review and before
   merge, record tracked/untracked status and the exact
   `git ls-files --others --ignored --exclude-standard` output; bind that final residue snapshot to
   the reviewed candidate alongside the pre-check inventories and allowlist decisions. A changed
   candidate or target requires every applicable required check and re-review by that same reviewer.
   `pnpm check:affected` is optional local feedback only; it never replaces the full `pnpm check`
   evidence required for candidate or integration gates.
5. Merge only approved story commits into the integration branch while preserving them as
   ancestors. Do not resolve integration conflicts as coordinator; return them to the owning pair.
6. Retain story worktrees/pairs through final PR feedback. Run integration checks, obtain closure
   review, and create one normal hosted-CI-backed phase PR only after the phase is ready.

Stop `OWNER_DECISION_REQUIRED` only for a genuine material ambiguity or conflict in product/design
authority, tracked scope or dependencies, selected realization, provider reachability, or accepted
trade-off. Missing or contradictory tracker, predecessor-landing, worktree path/branch/object,
base, clean-status, sanitized-environment, ignored-state, evidence, reviewer-independence,
required-check, or ownership facts block the affected story and its descendants until repaired;
they do not revoke authorization or block independent ready stories. Record runtime facts in the
external ledger, not repository files.
