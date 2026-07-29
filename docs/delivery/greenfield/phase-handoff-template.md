---
title: "Jig phase delivery handoff template"
purpose: "Provide a state-free, resumable summary for an externally recorded phase ledger."
audience: ["phase coordinators", "replacement coordinators"]
status: template
owner: Arye Kogan
last_verified: 2026-07-29
---

# Phase delivery handoff

Use this template as a pointer to the live external ledger, not as a substitute for it. Never add live commit SHAs, worktree paths, verdicts, approval URLs, or reviewer identities to this file.

## Reconciliation checklist

- Inspect `track.json`, ledger, and phase integration branch before selecting ready work.
- Run `git worktree list --porcelain`; reconcile registered integration/story worktrees, branches, bases, candidates, clean statuses, and continuous pairs to the ledger.
- Launch only declared-ready stories within available pair/worktree capacity and any already-authorized safe-overlap guard. A blocked story blocks only its descendants.
- Require committed-candidate checks and the same reviewer’s incremental read-only review for each new candidate; do not use a local clone or historical seal as a gate.
- Keep integrated story worktrees/pairs quiescent until final-PR feedback and confirmed closure.

## Stop conditions

Stop `OWNER_DECISION_REQUIRED` for missing/ambiguous activation, tracker, predecessor, worktree, branch/object, base, evidence, clean-status, reviewer-independence, required-check, or ownership facts. Do not reconstruct a missing workspace with a clone.

## Handoff pointer

When instantiating a handoff outside this repository, supply only:

- the external ledger's durable identifier and access route;
- the phase identifier and authorized integration target;
- the terminal boundary that caused the handoff;
- the next required reconciliation action; and
- any explicit owner stop or exceptional pair-replacement decision.

The receiving coordinator resolves every live commit, worktree path, pair identity, verdict, and
ready/blocked fact from the external ledger and current Git state rather than copying it into this
repository.
