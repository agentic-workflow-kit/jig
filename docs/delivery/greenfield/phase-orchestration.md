---
title: "Jig greenfield phase orchestration"
purpose: "Coordinate declared delivery-track stories through registered Git worktrees without changing authority or dependencies."
audience: ["phase coordinators", "implementers", "independent reviewers"]
status: active coordination contract
owner: Arye Kogan
last_verified: 2026-07-29
---

# Phase orchestration

This contract coordinates an explicitly requested phase. It does not authorize product/design
changes, create a scheduler service, add dependency edges, reinterpret edge types, or replace
Definition of Ready (DoR), Definition of Done (DoD), independent review, or CI gates.

## Authority and live state

Use this precedence order: current owner-approved product/design corpus; explicit current owner or
named-delegate implementation request; the [delivery policy](./delivery-policy.md) and
[story contract](./story-contract.md); [`track.json`](./track.json) for membership, phase,
dependencies, edge types, and gates; this coordination contract; the external live phase ledger;
then a handoff. The implementation request authorizes delivery only within the higher product/design
authority and tracked scope. Ordinary Git facts identify a candidate but never expand authority.
The ledger is the operational runtime record, not an approval gate; do not commit its live commits,
paths, identities, verdicts, or URLs into this repository.

## Mandatory worktree topology

- Create one durable phase integration branch and registered integration worktree from the authorized target using `pnpm worktree:new`. Record its path, branch, target ref, and initial commit in the ledger.
- For every admitted story, create one temporary registered story branch/worktree from the current integration commit that contains its declared predecessors. Record its path, branch, base ref and commit, current `HEAD`, clean status, and continuous implementer/reviewer pair before editing.
- The implementer owns writes. At an explicit review freeze, the same independent reviewer uses that registered story worktree read-only; they never write concurrently. A replacement is exceptional, must be explicit, and is recorded with its reason and handoff.
- Retain each story worktree, branch, and pair quiescent after integration through final-PR feedback and confirmed landing/closure. Cleanup requires confirmed landing and an explicit keep-list/scope; retain terminally blocked work until reconciliation, an applicable material owner decision, or explicit scoped cleanup.

No local fresh clone is a delivery, verification, review, or recovery workspace. A provider-managed hosted-CI checkout is allowed only as CI infrastructure and cannot replace local worktree evidence or read-only review.

## Ready-set loop and capacity

At phase start and after every terminal story boundary, inspect `track.json`, the ledger, and the
current integration branch. A story is ready only when it is in the explicitly requested phase,
has current DoR evidence, and every declared predecessor is contained in the integration base with
the required landing evidence. Pairs are distinct across stories and continuous within one story;
replacement is exceptional and ledger-recorded with reason/handoff. If an already-authorized
safe-overlap guard applies, a capacity or ownership conflict is a temporary ledger-recorded
admission hold, never a dependency. If no guard applies, do not invent one. Launch every other
ready story for which pair/worktree capacity is available. Do not invent an edge or wait for an
unrelated blocked story: a blocked story stops only descendants.

For Phase 1, after GF-010 lands, GF-011, GF-012, and GF-013 are initially ready. If GF-012 later blocks, it does not stop GF-011 or GF-013; GF-013 may enable GF-014, while GF-015 waits for both GF-011 and GF-014 (and its other declared predecessors). Phase closure still waits for GF-012.

## Story candidate and integration loop

The implementer commits the candidate and runs the story's required checks in its registered worktree with the policy's minimal non-secret environment-name allowlist. Before checks and after review, record tracked/untracked clean status and the exact `git ls-files --others --ignored --exclude-standard` inventory; fail closed on any residue outside the policy allowlist. The ledger binds the exact candidate commit, base, required command/set and result, timestamp and durable log reference, sanitized environment-name allowlist, ignored-state inventory/decision, reviewer identity, independence, findings and verdict. The reviewer reads the frozen `HEAD`, base, diff, predecessor containment, checks, environment/residue evidence, and status under the [reviewer protocol](./reviewer/README.md); it never runs checks or mutates state.

A fix or target refresh produces a new commit. The same implementer reruns every applicable required check and the same reviewer incrementally reviews the prior reviewed candidate through the new one, including affected invariants and sibling occurrences. `pnpm check:affected` may provide local feedback but never replaces the full `pnpm check` evidence required for candidate or integration gates. A prior verdict never authorizes the new commit. Record the cumulative verdict against the new candidate.

Integrate an approved story by fast-forward where possible or by a no-fast-forward merge that keeps the reviewed story commit as an ancestor. The coordinator must not resolve content conflicts on the integration branch: abort, return the work to the same pair, and require a new checked and reviewed candidate. Record the integration result and resulting integration commit in the ledger.

After every required phase story has approved integration, run required integration checks in the phase worktree, obtain an independent read-only closure review, and open one normal hosted-CI-backed PR from the phase branch to `main`. Route final-PR findings to the owning story pair. Any final-branch change needs refreshed checks and closure review before closure.

## Recovery and migration

Begin recovery with `git worktree list --porcelain` and reconcile every registered ledger path, branch, `HEAD`, base, and status. Reuse an existing matching worktree. If its path is missing but the recorded branch/object exists, follow the exact reattachment procedure in the repository-local skill's [`phase-protocol.md`](../../../.agents/skills/orchestrate-phase-delivery/references/phase-protocol.md); `pnpm worktree:new` creates a new branch and is not recovery. If an object, branch, base, evidence record, or clean reconciliation is missing, ambiguous, dirty, or irreconcilable, block the affected story and its descendants until reconciled; independent ready stories continue. Use `OWNER_DECISION_REQUIRED` only if recovery requires a material authority, scope, dependency, realization, provider-reachability, or accepted-trade-off decision. Never clone or invent evidence.

This policy supersedes the former custom candidate sealer, envelope, detached-clone review, and resealing gate. Historical seals remain historical evidence but are neither required nor sufficient for new or in-flight candidates. An in-flight candidate may migrate only when the required committed candidate, base, check, and reviewer evidence can be recorded; otherwise re-check and re-review it. No external pull request is a prerequisite solely because it carried sealer hardening.
