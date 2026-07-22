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

**Context.** The approved product/design corpus is locked at a verified source-empty baseline.
**Background.** That baseline is current commit `b860891d9102e0bdda1d23def81b1b974a4a26ac`, tree
`763fa777c62999795fb679cc05a61be1190d93b6`, whose live 67-file normative corpus is byte-identical
to passing subject `1731251d866b15b63131a0c3c580e7b563226cf3` and aggregate SHA-256 manifest
`fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c`. **Goal.** Judge one frozen
candidate faithfully against governing contracts—not to select architecture, invent a solution, or
trust a branch name, prior verdict, or author narrative.

## Review subject and freeze procedure

The coordinator must supply a single immutable subject before review:

| Required field                           | Reviewer check                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| candidate commit and tree                | resolve both Git objects; ensure the checkout is detached or otherwise immovable for review    |
| clean scope, merge base, and path set    | confirm clean scope and that changes match the story/phase contract                            |
| computed unpinned 70-path package digest | compute and record it outside the candidate; never accept a candidate-supplied expected digest |
| content and aggregate evidence digests   | confirm exact package/evidence binding, including target basis where relevant                  |
| story contract and `DR-*` selections     | verify all mandatory sections, scope, authority, and delegated-choice bounds                   |
| governing paths/IDs and dependencies     | trace each claimed behavior and predecessor to active product/design authority                 |
| check/CI/provider evidence               | verify freshness, identity, environment/build/manifest binding, and actual result              |
| reviewer identity and independence       | reviewer is not the author/implementer and is authorized by the selected policy                |

Record the candidate tuple—immutable commit/tree plus computed unpinned 70-path package digest—in
the independent review output outside the candidate. Any edit to source, evidence, contract
metadata, or subject binding invalidates the tuple and requires a fresh full review. No expected
candidate/package digest may appear in `track.json`, validator constants, fixtures, or
candidate-authored review prose. The local validator proves governing-source projection, package
consistency, and corpus integrity only; it does not semantically approve plan-authored outcomes or
prose. The pre-existing 67-file normative digest is corpus-drift evidence only, never the candidate
approval digest. Do not claim a candidate commit/tree for this documentation package until this
procedure happens.

## What to establish before a verdict

The candidate must match the live 67-file normative path set and aggregate manifest, and the
manifest must contain exactly 47 story IDs in seven phases. Independently verify its DAG is
topological and that the declared critical path is the real longest path. Check all 44 proof-route
texts against the active reconciliation table in both directions, all 56 imports, every fixed
inventory/reverse story occurrence, the 12 failure classes and 22 identities, and literal IDs only
(no wildcard or invented mappings). Confirm I13/I14; pre-Run rejected acknowledgement remains
separate from Story `NotRun`, `Rejected`, and `Stopped` selectors; refresh retains authority,
mints a new `ID-CAND`, returns to full review, and atomically rebinds; and remote `PORT-DELIVERY`
stays separate from local `PORT-VERIFY`.

The five mandatory semantic-to-provider splits are GF-019→GF-020, GF-010→GF-025,
GF-013→GF-026, GF-033→GF-039, and GF-042→GF-047. Confirm each exact mechanism gate and qualified
file-store closure before configuration. Check `DR-*` owners exactly against the delegation
register—Arye approval is distinct from an engineering/configuration selection. `CF-GATE-PRODUCT`
is exactly 39 recorded suite results plus every named element/governance record of all 44 settled
`PC-*` proof routes. Review the 56 imports separately as the matrix-plus-suite disposition audit
for the broader supported-profile coverage claim; provider/profile evidence supports admission and
does not add product-gate inputs.

## Reviewer navigation

1. [Delivery index](../../README.md) — authority order and scope.
2. [Baseline and findings](../baseline-and-findings.md) — immutable input and known gaps.
3. [Story contract](../story-contract.md) — mandatory review subject shape.
4. [Delivery policy](../delivery-policy.md) — universal gates and evidence rules.
5. [Greenfield overview](../README.md) — phase ordering and the 47-story map.
6. [Machine manifest](../track.json) — exact IDs, fields, DAG, inventories, gates, and closure.
7. [Full story briefs](../stories/) — complete per-story review subject.
8. [Coverage](../coverage.md), [verification](../verification.md), and
   [delegated choices](../decisions.md) — two-way routes, proof, and `DR-*` ownership.
9. [Risks and owner decisions](../risks-and-owner-decisions.md) — stop lines and escalation.
10. Active [`docs/product/`](../../../product/) — outcome and guarantee intent.
11. Active [`docs/redesign/design/`](../../../redesign/design/) — IDs, decisions, invariants,
    ports, lifecycle, recovery, and conformance.
12. [Review checklist](./review-checklist.md) — complete verdict criteria.

The readiness gate and archive manifest may establish baseline/provenance. Do not inspect archived
implementation, archived delivery material, or ignored remnants to fill a candidate gap. Research
is non-governing and may not select behavior. No product source may be added or inferred during
this documentation-track review.

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
never invent an implementation algorithm as the fix. The package PR itself must receive an
independent `PASS` on its frozen exact subject before hosted publication or lifecycle action.
