---
name: orchestrate-phase-delivery
description: "Coordinate a Jig delivery phase with declared track dependencies, registered Git worktrees, continuous independent story review, bounded parallelism, and one final phase PR. Use when starting, resuming, recovering, or closing an explicitly owner-requested Jig delivery phase; do not use to author product/design decisions, change the track DAG, or implement a scheduler service."
---

# Orchestrate phase delivery

1. Run `pnpm delivery:check` and stop before scheduling if the declared track is malformed. Confirm
   that the global `offload` skill is available as an orchestration prerequisite; if it is absent,
   stop before story admission with a missing-dependency error rather than inventing a local route,
   lowering effort, or returning `OWNER_DECISION_REQUIRED`. Resolve
   the current approved product package from `docs/product/` and approved architecture package from
   `docs/redesign/design/`. Only then read
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
3. At phase start and after each terminal story boundary, re-run `pnpm delivery:check`, then inspect
   the declared DAG, ledger, and integration branch. Launch every ready story within available
   continuous implementer/reviewer pair capacity and any already-authorized safe-overlap guard. A
   blocked story blocks only descendants. Before dispatch, select implementer effort from semantic
   risk as well as boundedness, then use the global `offload` skill to plan each semantic
   implementer and reviewer role. Those Jig role names establish ownership and independence; they
   do not select a runtime agent type. The existing dispatch/handoff must state the story and role,
   root work replaced, model class, planned model, effort and reason, offload-selected runtime type,
   context mode, hard budget, expected output, verification owner, actual route, and any fallback.
   Jig assigns and records the verification owner under its local ownership rules; offload does not
   choose that responsibility.
   Default to isolated context. A fixed runtime type is ineligible when its model or effort conflicts
   with the plan, and no implementation writes begin until the accepted spawn configuration
   preserves that route. Retry rejected spawns and model unavailability only under offload's
   provider rules; never inherit defaults or lower effort silently. Do not add a tracked dispatch
   artifact or ledger field.

   Medium is eligible only when current authority directly determines a local realization, behavior
   and failure effects are local, no authority, fencing, recovery, replay, idempotency,
   witness/admission, persistence, identity, ordering, deadline, lifecycle, cross-package type
   closure, later-constraining seam, multiple-authority reconciliation, or other non-local guarantee
   materially shapes correctness, and straightforward positive and negative tests suffice. Use high
   when any such risk materially applies, regardless of file count. Use xhigh only for an exceptional
   release-critical or architecture-wide decision under the global routing policy. Jig supplies the
   risk reasoning and task content; offload owns generic context and provider routing.

4. After assigning the continuous pair and before writes, have the already-assigned reviewer
   prepare read-only against the exact story, current authority, predecessor surface, and affected
   package seams. The reviewer returns a concise set of normally five to twelve stable-ID must-cover
   bullets; each names the source and invariant or failure mode, expected observable code/type
   behavior, applicable test category, and sibling operations, states, or types. The same response
   returns either `resolved` with the exact authority source or `OWNER_DECISION_REQUIRED` with the
   missing or conflicting authority. Public identity, durable authority, policy, fencing, or
   ownership semantics require an exact source. Clearly authorized package-private bookkeeping may
   proceed only when the admitted story has no unresolved required authority. If any required
   authority is unresolved, block every write for that story until the authority is resolved or the
   owner explicitly reauthorizes a narrower story scope; independent ready stories continue. Put the
   selected route plus those bullets in the implementer task. They supplement rather than expand the
   story contract, create no new artifact or ledger field, and do not replace the existing
   owner-decision rule. Read
   `references/phase-protocol.md` for the implementer proof handoff, complete-pass verdict, and
   conditional structural-defect loop.
5. Keep each pair stable through implementation, committed-candidate checks, read-only review,
   fixes, and incremental re-review. A candidate cannot freeze until the implementer's normal
   handoff maps every must-cover ID to concrete implementation and applicable type/test locations,
   sibling-search scope/result, and implementation-owner verification evidence. Generic coverage
   claims are insufficient; missing or non-concrete mappings remain `implementing`, unresolved
   authority stops before writes, and a false or inadequate mapping found in review is
   `CHANGES_REQUIRED`. One test may prove multiple bullets, and a justified non-testable designation
   is allowed; do not add a test-per-bullet rule or proof artifact. Before each check, enforce the
   policy's minimal non-secret
   environment-name allowlist and record exact ignored-state inventories/allowlist decisions. Bind
   the reviewer verdict to the exact candidate in the external ledger. After final review and before
   merge, record tracked/untracked status and the exact
   `git ls-files --others --ignored --exclude-standard` output; bind that final residue snapshot to
   the reviewed candidate alongside the pre-check inventories and allowlist decisions. A changed
   candidate or target requires every applicable required check and re-review by that same reviewer.
   Reviewers inspect recorded check evidence, including `git diff --check`, but never rerun it or any
   project check. An incomplete but advancing correction keeps the same pair. Pair replacement is
   exceptional and follows the bounded non-progress and boundary-breach rules in
   `references/phase-protocol.md`; if a replacement repeats the same qualifying failure, stop the
   affected story instead of forming another replacement chain.
   `pnpm check:affected` is optional local feedback only; it never replaces the full `pnpm check`
   evidence required for candidate or integration gates.
6. Merge only approved story commits into the integration branch while preserving them as
   ancestors. Do not resolve integration conflicts as coordinator; return them to the owning pair.
7. Retain story worktrees/pairs through final PR feedback. Run integration checks, obtain closure
   review, and create one normal hosted-CI-backed phase PR only after the phase is ready.

Stop `OWNER_DECISION_REQUIRED` only for a genuine material ambiguity or conflict in product/design
authority, tracked scope or dependencies, selected realization, provider reachability, or accepted
trade-off. Missing or contradictory tracker, predecessor-landing, worktree path/branch/object,
base, clean-status, sanitized-environment, ignored-state, evidence, reviewer-independence,
required-check, or ownership facts block the affected story and its descendants until repaired;
they do not revoke authorization or block independent ready stories. Record runtime facts in the
external ledger, not repository files.
