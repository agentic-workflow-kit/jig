---
title: "Phase 06 - Owner configuration model"
status: "merged (#65)"
---

# Phase 06 - Owner configuration model

## Overview

Make guarantee 2 (configuration ownership) real: introduce the work profile and repo-level
floors as first-class, validated configuration artifacts; complete the policy document across
the dimensions the product says policy owns; implement the CFG-10 assisted dial with its fixed
category boundary; and close the GUARD-2 enforcement loop (rule-governing touch pauses
completion for owner re-approval with fresh evidence).

## Background

The product layer defines four owner artifacts — execution plan, policy, work profile, and
repo-level floors — with a strict split: policy expresses risk and governance (`CFG-1`), work
profile expresses how work is carried out and can never lower the safety floor (`CFG-2`), floors
are repo-scoped and tighten-only (`CFG-3`). The current implementation has plan and a partial
policy (`allowLocalDryRun`, `ruleGoverningSurfaces`, `capabilityIsolation`, an assisted policy
fixture) validated by hand-rolled loader checks; work profile and floors do not exist at all,
and policy does not carry the full `CFG-1` dimension list (merge spectrum, concurrency ceiling,
retry budget, required reviews, escalation rules, anti-gaming floor). The design deepens these
entities in `domain/configuration-and-work.md`, and "no silent legacy coping" requires
unrecognized configuration to refuse with guidance.

## What To Do

- Introduce the **work profile** artifact: schema-shaped validation at the boundary, bound at
  launch alongside policy, snapshotted into the run record, and structurally unable to weaken
  policy or floors (attempts refuse with an explanation).
- Introduce **repo-level floors**: a repo-scoped artifact merged with track policy under a
  tighten-only rule — the effective policy is never looser than the floor; the merge result is
  inspectable (recorded in the policy snapshot or an equivalent recorded basis).
- Complete the **policy document** across the `CFG-1` dimensions with enforcement wired where
  the engine already has the seams (concurrency ceiling and retry budget in the harness,
  escalation rules in the doorbell path, merge spectrum feeding the `MERGE` outcomes, gating
  posture manual/assisted), including the `ISO-2` block-resolution posture —
  prevention-leaning quarantine/re-plan versus throughput-leaning continue-independent-work —
  as a policy-owned dimension whose consequence the harness honors and records at block time.
- Implement the **CFG-10 assisted dial**: the auto-grant boundary is fixed by category —
  reversible, non-privileged, non-rule-governing requests may auto-grant in assisted mode;
  credentials, push/merge, rule-governing files, and irreversible effects always route to a
  human; never model-adjudicated.
- Close **GUARD-2**: a change touching declared rule-governing surfaces pauses completion for
  owner re-approval plus fresh evidence, using the existing routed-decision machinery; the
  pause is durable and legible in the record.
- Validate all four artifacts at the boundary with understandable refusals ("no silent legacy
  coping"), replacing permissive duck-typing where it would otherwise guess.

## Why

- `CFG-1`, `CFG-2`, `CFG-3`, `CFG-10`; `GUARD-1`, `GUARD-2` — the configuration-ownership and
  anti-gaming families ([guarantee 2](../../../product/guarantees.md#2-configuration-ownership),
  [guarantee 1](../../../product/guarantees.md#1-control--trust)).
- `ISO-2` — block resolution is policy-determined
  ([guarantee 3](../../../product/guarantees.md#3-resilience--never-lose-work-resume-safely));
  no phase owned this dimension before, and it is not implemented anywhere in `src/`.
- [Domain model — configuration and work](../../../design/domain/configuration-and-work.md) —
  the entity split this phase realizes.
- Prerequisite for P07: setup templates need work-profile and floors artifacts to exist.

## Technical Requirements

- Policy stays fixed at launch (`GUARD-1`): new dimensions are bound and snapshotted at launch
  like existing ones; no mid-run mutation surface appears.
- Validation errors name the field, the problem, and the fix direction; unknown/unversioned
  config shapes refuse rather than best-effort parse.
- The CFG-10 category boundary is code, not configuration: the owner dials how much Jig asks,
  not which categories are human-only.
- Record additions are additive within v0 rules; goldens stay byte-identical unless this phase
  explicitly owns a change (default fixtures should not need one — new artifacts are optional
  inputs with reference defaults).
- Fixture growth (work-profile/floors examples) follows the fixture README conventions and
  keeps `scripts/check-delivery-foundation.mjs` green (update both together if needed).

## Reference Files

- [`product/guarantees.md`](../../../product/guarantees.md) §1–2
- [`design/domain/configuration-and-work.md`](../../../design/domain/configuration-and-work.md)
- [`design/core/plan-intake.md`](../../../design/core/plan-intake.md) (policy model, GUARD-2
  rule declaration), [`design/core/authorization.md`](../../../design/core/authorization.md)
  (fence decision order, GUARD-2 enforcement leg)
- Source: `src/loaders.ts`, `src/types.ts`, `src/authorization.ts`, `src/harness.ts`,
  `src/records.ts` (snapshots)
- Fixtures: `tests/fixtures/m5b-local-mvp/local-policy*.json`, fixture README

## Dependencies

- **Requires:** nothing hard.
- **Soft:** start after P02 (source layout).
- **Unlocks:** P07 (hard).
- **Parallel:** P03, P04, P05, P08, P09, P10.

## Acceptance Criteria

1. A run binds plan + policy + work profile + floors; all four are snapshotted and the
   effective (floor-merged) policy basis is reconstructible from the record.
2. A work profile that attempts to weaken a policy/floor value is refused at the boundary with
   an explanation naming the floor.
3. A floor tightens an otherwise-permissive track policy in an observable, tested way.
4. In assisted mode, a reversible non-privileged request auto-grants under the fixed rule and
   is recorded as such; a credential/push/rule-governing/irreversible request routes to the
   owner in every mode — both proven by tests.
5. A worker change touching a declared rule-governing surface pauses completion; completion
   proceeds only after owner re-approval with fresh evidence, all visible in the record.
6. The `ISO-2` block-resolution posture is expressible in policy, and a blocked story's
   resolution demonstrably follows it under both postures, with the consequence recorded.
7. Malformed or unrecognized config/policy/profile/floor files refuse with actionable guidance
   (tested per artifact); goldens byte-identical.

## Verification

- `pnpm check`; unit coverage across the new validation and merge logic; integration coverage
  for launch binding and snapshots.
- Negative-path review: every new artifact has refusal tests, not just happy paths.
- Reviewer axes: tighten-only merge correctness, fixed category boundary (not configurable),
  GUARD-2 pause durability, snapshot completeness.

## Out Of Scope

- Guided setup, templates, and presets (P07).
- Prompt-strategy guidance content (`CFG-8`) beyond leaving room for it in the work profile
  shape (P07 territory).
- JSON Schema freeze for any artifact (P13/contract owner).
- New lifecycle states.

## Stop Or Escalate If

- GUARD-2's pause needs a distinct lifecycle sub-state rather than the existing
  `parked`/routed-decision machinery — the orchestration transition tables are closed and the
  sub-state question is an open design question in
  [`plan-intake.md`](../../../design/core/plan-intake.md#open-questions) (authorization.md
  explicitly declines to invent a new lifecycle state); route it to design before minting a
  state.
- `ISO-2`'s throughput-side follow-up checks touch an open product question (which follow-up
  checks become shipped surfaces — [`jig.md`](../../../product/jig.md#open-questions)):
  implement the posture and its recorded consequence; route any shipped follow-up-check
  surface to the owner.
- The tighten-only merge hits a policy dimension where "tighter" is not well-ordered (for
  example, two different escalation-rule shapes) — route the ordering rule to design rather
  than choosing arbitrarily.
- Full `CFG-1` dimension enforcement requires engine behavior that does not exist yet (for
  example, a retry budget with no retry machinery) — record the dimension as bound-but-inert
  with a named follow-up rather than silently dropping it, and surface the gap in the PR.
