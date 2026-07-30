---
title: "Jig greenfield delivery documentation"
purpose: "Cold-start delivery package for the approved, source-empty Jig generation."
audience:
  - Jig owner
  - delivery planners and implementers
  - independent reviewers
status: active planning track; no implementation authorized by this index
owner: Arye Kogan
last_verified: 2026-07-23
---

# Jig greenfield delivery documentation

## Context, background, and goals

**Context.** Jig has an approved product and architecture, while the active repository deliberately
contains no product source. This is the durable planning package for a new generation.

**Background.** The final empty-repository readiness gate passed for immutable subject
`1731251d866b15b63131a0c3c580e7b563226cf3`; the retired implementation was archived afterward.
The immutable post-archive planning/authority provenance is
`b860891d9102e0bdda1d23def81b1b974a4a26ac` with tree
`763fa777c62999795fb679cc05a61be1190d93b6`. It is not a rolling implementation base; each story
must resolve its target ref's current commit/tree when its implementation candidate is frozen.

**Goals.** Turn the approved corpus into 48 small, auditable implementation stories in seven gated
phases; preserve product intent and design authority; make every effect, provider, recovery route,
and review obligation explicit before code begins.

## What and why

This package is a delivery map, not a replacement architecture. It includes the machine-readable
exact-set manifest and all 48 full story briefs, alongside the authority order, exact baseline,
phase gates, research boundaries, and independent review procedure needed to plan or review a later
implementation candidate. That separation keeps the new generation greenfield and prevents
archived behavior from silently becoming the design.

## Scope and non-goals

In scope: the machine manifest, seven-phase overview, 48 full story briefs, dependency/coverage/
verification records, delegated-choice schedule, risk/owner-decision register, mandatory contract,
delivery policy, baseline/finding register, research ledger, and reviewer packet. Out of scope:
product code, product package manifests/scaffolding, changing product/redesign documents, choosing
an unresolved `DR-*`, claiming a final candidate tree or commit, and using archive implementation
as a planning source. Minimal repository navigation, status, and validation wiring that solely
supports this documentation track remains in scope.

## Authority order

1. Explicit owner decisions recorded in the active product/design corpus.
2. [`docs/product/`](../product/) — product outcome, boundaries, and guarantees.
3. [`docs/redesign/design/`](../redesign/design/) — architecture, IDs, invariants, decisions,
   ports, lifecycle, recovery, and conformance.
4. An explicit current request from Arye Kogan or a named delegate — implementation authorization
   for only the named phase/story within the authority above.
5. The [final readiness gate](../archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md)
   — immutable reviewed-baseline and lock evidence.
6. This delivery package — faithful sequencing and story-level planning only.
7. [Reference research](./greenfield/research-ledger.md) — non-governing, constrained input.

## Navigation

- [Greenfield overview](./greenfield/README.md) — seven phases and cold-start reader route.
- [Machine manifest](./greenfield/track.json) — exact set of phases, stories, dependencies, gates,
  and planning facts.
- [Full story briefs](./greenfield/stories/) — one complete `GF-*` contract for every planned
  implementation subject.
- [Delegated-choice schedule](./greenfield/decisions.md) — bounded `DR-*` selections, proof, and
  fail-closed fallback.
- [Dependency DAG](./greenfield/dependency-dag.md) — implementation, decision, evidence, and merge
  edges.
- [Coverage](./greenfield/coverage.md) — product/design route and evidence coverage.
- [Verification](./greenfield/verification.md) — required evidence and exact-candidate checks.
- [Risks and owner decisions](./greenfield/risks-and-owner-decisions.md) — active risks, stop lines,
  and owner escalations.
- [Baseline and findings](./greenfield/baseline-and-findings.md) — verified facts, gaps, and
  assumptions.
- [Mandatory story contract](./greenfield/story-contract.md) — required content for every story.
- [Delivery policy](./greenfield/delivery-policy.md) — implementation and qualification rules.
- [Phase orchestration](./greenfield/phase-orchestration.md) — local coordination of declared
  dependencies, worktrees, continuous pairs, and final closure.
- [Phase handoff template](./greenfield/phase-handoff-template.md) — resumable state-free handoff.
- [Research ledger](./greenfield/research-ledger.md) — allowed comparative inputs and limits.
- [Reviewer packet](./greenfield/reviewer/README.md) — independent exact-candidate procedure.

The phase-2 topological sequence is GF-019, GF-021, GF-022, GF-020, GF-025, GF-026, GF-023, then
GF-024. After GF-022 and each lane's own prerequisites, GF-020, GF-025, and GF-026 may proceed in
parallel. GF-023 is effect-free and cannot create a Run or dispatch: it starts only after the
qualified source, ledger/registry/witness, and artifact provider evidence gates close, then records
separate exact Arye approvals for the proposal and provider manifest.

`CF-GATE-PRODUCT` is narrower than the supported-profile claim: it requires exactly 39 recorded
suite results plus every named element/governance record of all 44 settled `PC-*` proof routes. The
56 imports remain a separate matrix-plus-suite disposition audit for the broader supported-profile
coverage claim, and provider/profile evidence supports admission; neither adds an input to the
product gate.

## Validator and reviewer boundary

The local delivery validator proves governing-source projection, delivery-surface consistency, and
corpus integrity only; it does not approve implementation or semantically approve plan-authored
outcomes or prose. Its computed unpinned delivery-surface digest is informational integrity
evidence, not authorization. Do not copy an expected delivery-surface digest into `track.json`,
validator constants, fixtures, or candidate-authored review prose. The pre-existing 67-file
normative digest remains separate corpus-drift evidence only.

For a later implementation candidate, independent review freezes the committed candidate in its
registered worktree together with its
final-verification posture, policy-selected required check-class set, verification
configuration/environment, and subject binding. After `Accepted`, `deterministic` requires a
passing, subject-matching `EV-CHECK-OBSERVATION` for every required class and the complete set
inside `Finalizing` before any target-changing Operation; `none` is an explicit no-op. Recording
those observations under the unchanged reviewed binding is authorized continuation evidence, not a
review-invalidating edit. Candidate, posture, class-set, configuration/environment, or binding
drift requires every applicable required check and incremental review by the same reviewer. No
delivery-package qualification review, separate external approval issue, custom sealing, or
detached/fresh-clone gate is active. Local clones are invalid delivery, verification, review, and
recovery workspaces; they cannot replace registered-worktree evidence.

## Focused track gate

Run `pnpm delivery:check` before phase orchestration reads `track.json`. It fails fast on malformed
story identity, dependency, phase, or story-file references. It does not validate narrative prose,
authority mappings, or an exact documentation corpus, and it is not part of the universal
`pnpm check` gate.
