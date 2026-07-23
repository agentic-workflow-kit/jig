---
title: "Jig greenfield delivery — reviewer packet"
purpose: "Provide separate independently usable review procedures for the delivery package and implementation candidates."
audience:
  - independent reviewers
  - Jig owner
  - delivery coordinators
status: review protocol; no candidate is currently frozen
owner: Arye Kogan
last_verified: 2026-07-23
---

# Reviewer packet

## Context, background, and goal

**Context.** The approved product/design corpus is locked at a verified source-empty baseline.
**Background.** Its immutable planning/authority provenance is commit
`b860891d9102e0bdda1d23def81b1b974a4a26ac`, tree
`763fa777c62999795fb679cc05a61be1190d93b6`, whose live 67-file normative corpus is byte-identical
to passing subject `1731251d866b15b63131a0c3c580e7b563226cf3` and aggregate SHA-256 manifest
`fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c`. **Goal.** Judge one frozen
subject faithfully against governing contracts—not to select architecture, invent a solution, or
trust a branch name, prior verdict, or author narrative.

## Choose the review protocol

The coordinator declares one protocol before review. Never apply a delivery-package requirement to
an implementation candidate, or treat a package `PASS` as a story implementation verdict.

### A. Delivery-package review

Use only when the subject is the delivery package itself. The coordinator supplies immutable tuple
`P`: reviewed commit/tree, exact package-only path set, each path's bytes/type/mode,
content/evidence digests, aggregate computed unpinned digest, and `PASS`, all recorded outside the
candidate. The reviewer verifies the live 67-file
normative corpus as corpus-drift evidence; the manifest's exact story set and phases;
DAG/topology/critical path; proof-route texts; imports; fixed inventories; failure classes and
identities; and literal IDs. Verify I13/I14, refresh/rebinding rules, split closure, `DR-*`
ownership, `CF-GATE-PRODUCT`, and supported-profile disposition as described by the package.

No expected package digest may appear in `track.json`, validator constants, fixtures, or
candidate-authored review prose. The local validator proves projection, package consistency, and
corpus integrity only. A package byte change invalidates its tuple and needs a fresh package review.

### B. Implementation-candidate review

Use only for one implementation attempt of one `GF-*` story whose exact external
owner-ratification/activation record is verified. The coordinator
supplies and the reviewer records outside the candidate:

| Required field                                                | Reviewer check                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| exact external owner-ratification/activation record           | verify the authenticated owner or explicitly named delegated principal, independently verifiable delegation/current validity, durable record ID/URL, original `P`, any required authoritative landing-equivalence record, immutable provenance, activation target scope, realization tuple, and expiry/revocation; generic authorization cannot pass |
| approved delivery-package tuple                               | resolve original `P`; if squash landing gives a different OID, resolve the authoritative landing-equivalence record proving full-tree equality or complete package-path byte/type/mode equality reproducing `P`'s digest. It does not make the landed commit reviewed.                                                                               |
| observed target base ref, commit, and tree                    | resolve the ref and both Git objects at freeze time; do not use planning provenance as a rolling execution base                                                                                                                                                                                                                                      |
| candidate commit and tree                                     | resolve both objects and review an immovable checkout/commit                                                                                                                                                                                                                                                                                         |
| merge-base equality and predecessor containment               | prove `merge-base(candidate, base) == base` and required predecessor landings are in the base's target content                                                                                                                                                                                                                                       |
| current normative-corpus comparison                           | compare all 67 normative authority files in the candidate against immutable authority provenance and record the clean result                                                                                                                                                                                                                         |
| owned source/config/test/evidence paths                       | confirm changed paths are story-owned and match the bounded contract; these paths may include product source and configuration                                                                                                                                                                                                                       |
| story contract, governing paths/IDs, and `DR-*` choices       | trace claimed behavior and delegated bounds to active authority                                                                                                                                                                                                                                                                                      |
| checks, CI, provider evidence, and final-verification posture | bind available pre-review results to the candidate and record which applicable verification, if any, runs after `Accepted`; require that deferred check before finalization or landing                                                                                                                                                               |
| reviewer identity and independence                            | reviewer is not the author/implementer and is authorized by the selected policy                                                                                                                                                                                                                                                                      |

The implementation tuple is exactly original package tuple `P` and any required
authoritative landing-equivalence record; recorded base ref/commit/tree; candidate commit/tree; merge-base equality and containment
proof; current normative-corpus comparison; owned paths; and exact evidence. It does **not** require
a fresh package-digest computation, full delivery-corpus review, or a delivery-package path
allowlist. Review the applicable story contract, its governing authority, dependencies,
lifecycle/effect/security behavior, provider qualification, tests, and acceptance evidence instead.
Any source, configuration, evidence, base, candidate, or delivery-package tuple change—including a
rebase or target-ref refresh—creates a new tuple: re-prove merge-base equality and containment,
repeat the corpus comparison and affected checks/CI, obtain a new package `PASS` if `P` changes or
authoritative landing-equivalence evidence is missing, ambiguous, or shows package-path add/remove/rename/mode/
byte drift, and perform a fresh exact review.

## Publication, CI, and verdict boundaries

Under D15, a recorded transition into `Reviewing` may authorize only fenced `OPC-REV-*`
draft/non-mergeable review publication for the frozen subject before independent review or
acceptance. It grants no acceptance, finalization, landing, or dependency-release authority.
Hosted CI may run before review. The selected final-verification posture must bind the exact
candidate; if it runs after `Accepted`, its applicable checks/evidence must pass before
finalization or landing. Independent review and all applicable CI/evidence must bind that same
candidate before merge or landing. The exact external owner-ratification/activation record remains
required throughout.

## Reviewer navigation

1. [Delivery index](../../README.md) — authority order and scope.
2. [Baseline and findings](../baseline-and-findings.md) — immutable input and known gaps.
3. [Story contract](../story-contract.md) — mandatory review subject shape.
4. [Delivery policy](../delivery-policy.md) — universal gates and evidence rules.
5. [Greenfield overview](../README.md) — phase ordering and the manifest's story map.
6. [Machine manifest](../track.json) — exact IDs, fields, DAG, inventories, gates, and closure.
7. [Full story briefs](../stories/) — complete per-story review subject.
8. [Coverage](../coverage.md), [verification](../verification.md), and
   [delegated choices](../decisions.md) — two-way routes, proof, and `DR-*` ownership.
9. [Risks and owner decisions](../risks-and-owner-decisions.md) — stop lines and escalation.
10. Active [`docs/product/`](../../../product/) — outcome and guarantee intent.
11. Active [`docs/redesign/design/`](../../../redesign/design/) — IDs, decisions, invariants,
    ports, lifecycle, recovery, and conformance.
12. [Review checklist](./review-checklist.md) — criteria for the selected protocol.

The readiness gate and archive manifest may establish planning/authority provenance. Do not inspect
archived implementation, archived delivery material, or ignored remnants to fill a candidate gap.
Research is non-governing and may not select behavior. Delivery-package review authorizes no product
source; implementation-candidate review may inspect the story-owned source/configuration paths but
does not infer uncontracted behavior.

## Verdicts

- **PASS** — every applicable checklist item is evidenced on the exact frozen subject; no
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
never invent an implementation algorithm as the fix. D15's recorded `Reviewing` transition and
fenced draft/non-mergeable `OPC-REV-*` publication may precede review; no acceptance,
finalization, landing, or dependency release may follow until the required exact-candidate review
and applicable verification complete.
