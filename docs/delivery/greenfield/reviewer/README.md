---
title: "Jig greenfield delivery — reviewer packet"
purpose: "Provide an independently usable exact-candidate review procedure for greenfield delivery stories and phase gates."
audience:
  - independent reviewers
  - Jig owner
  - delivery coordinators
status: review protocol; no candidate is currently frozen
owner: Arye Kogan
last_verified: 2026-07-22
---

# Reviewer packet

## Context, background, and goal

The approved product/design corpus is locked at a verified source-empty baseline, but this
greenfield delivery package has not produced an implementation candidate. Your job is to judge one
frozen candidate faithfully against governing contracts—not to select architecture, invent a
solution, or trust a branch name, prior verdict, or author narrative.

## Review subject and freeze procedure

The coordinator must supply a single immutable subject before review:

| Required field                         | Reviewer check                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| candidate commit and tree              | resolve both Git objects; ensure the checkout is detached or otherwise immovable for review |
| merge base and changed path set        | confirm scope matches the story/phase contract                                              |
| content and aggregate evidence digests | confirm exact package/evidence binding, including target basis where relevant               |
| story contract and `DR-*` selections   | verify all mandatory sections, scope, authority, and delegated-choice bounds                |
| governing paths/IDs and dependencies   | trace each claimed behavior and predecessor to active product/design authority              |
| check/CI/provider evidence             | verify freshness, identity, environment/build/manifest binding, and actual result           |
| reviewer identity and independence     | reviewer is not the author/implementer and is authorized by the selected policy             |

Record the candidate tuple in the review output. Any edit to source, evidence, contract metadata,
or subject binding invalidates the review and requires a new freeze and fresh review. Do not claim a
candidate commit/tree for this documentation package until this procedure happens.

## Reviewer navigation

1. [Delivery index](../../README.md) — authority order and scope.
2. [Baseline and findings](../baseline-and-findings.md) — immutable input and known gaps.
3. [Story contract](../story-contract.md) — mandatory review subject shape.
4. [Delivery policy](../delivery-policy.md) — universal gates and evidence rules.
5. [Greenfield overview](../README.md) — phase ordering and the 45-story map.
6. Active [`docs/product/`](../../../product/) — outcome and guarantee intent.
7. Active [`docs/redesign/design/`](../../../redesign/design/) — IDs, decisions, invariants,
   ports, lifecycle, recovery, and conformance.
8. [Review checklist](./review-checklist.md) — complete verdict criteria.

The readiness gate and archive manifest may establish baseline/provenance. Do not inspect archived
implementation or delivery material to fill a candidate gap.

## Verdicts

- **PASS** — every applicable checklist item is evidenced on the exact frozen candidate; no
  unresolved blocking finding, missing governing mapping, authority widening, uncertain-effect
  blind retry, or reachable unqualified adapter remains.
- **CHANGES_REQUIRED** — one or more correctable candidate defects exist. Give stable finding IDs,
  severity, governing path/ID, exact evidence, required observable correction, and recheck scope.
- **OWNER_DECISION_REQUIRED** — the candidate needs a material product/architecture/authority/
  guarantee/accepted-tradeoff decision not already delegated. Stop rather than proposing it.

`PASS` validates only the frozen tuple. It is not a landing proof, a phase-gate result for a later
candidate, an approval of a changed PR, or authorization to skip a later independent review.

## Finding criteria

Create a blocking finding for any missing or contradictory governing mapping; unclosed boundary or
authority; missing durable fact/fence; invalid/stale/missing evidence; unbounded wait; uncertified
provider reachability; unsafe retry/recovery/cleanup; secret exposure; broken exact-subject
binding; incomplete oracle; invalid `DR-*` selection; or false acceptance/landing claim. Editorial
findings may not conceal a semantic or proof defect. A reviewer must cite direct evidence and
never invent an implementation algorithm as the fix.
