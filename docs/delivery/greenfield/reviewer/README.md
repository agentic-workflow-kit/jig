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

## Reviewer operation boundary

The reviewer performs semantic and evidence review only. Read-only inspection is permitted,
including files, exact commits/trees/diffs/manifests, logs, hosted check results, and evidence using
`git show`, `git diff`, `rg`, and `sed`. Do not execute `pnpm` tests/checks/builds, direct
validators, formatters, installers, evidence writers, or GitHub/repository mutations. Treat
missing, stale, contradictory, or incorrectly bound verification evidence as a finding; never
repair it by rerunning a check. The implementation owner runs local verification exactly once per
frozen candidate, hosted CI independently executes required checks, and the coordinator validates
only orchestration facts/evidence bindings.

## Choose the review protocol

The coordinator declares one protocol before review. Never apply a delivery-package requirement to
an implementation candidate, or treat a package `PASS` as a story implementation verdict.

### A. Delivery-package review

Use only when the subject is the delivery package itself. Before review, the coordinator supplies
delivery-package candidate identity `Q`: the exact candidate commit/tree to be reviewed; exact package-only path set; each path's
bytes/type/mode; and aggregate computed unpinned digest. The coordinator supplies `Q` and available
checks/evidence separately; pre-verdict `Q` contains neither `PASS` nor a review record. The
independent reviewer writes external review record `R`: protocol; reviewer
identity/independence; exact `Q`; checked scope; checks/evidence; findings; verdict; and a durable
external record identifier. Only `R` with `PASS` creates approved package
`P = Q + durable R identifier + PASS`. The reviewer verifies the live 67-file
normative corpus as corpus-drift evidence; the manifest's exact story set and phases;
DAG/topology/critical path; proof-route texts; imports; fixed inventories; failure classes and
identities; and literal IDs. Verify I13/I14, refresh/rebinding rules, split closure, `DR-*`
ownership, `CF-GATE-PRODUCT`, and supported-profile disposition as described by the package.

No expected package digest may appear in `track.json`, validator constants, fixtures, or
candidate-authored review prose. The local validator proves projection, package consistency, and
corpus integrity only. A package byte or path-set change invalidates `Q` and needs a fresh package
review, external `R`, and approved `P`.

### B. Implementation-candidate review

Use only for one implementation attempt of one `GF-*` story whose exact external
owner-ratification/activation record is verified. The coordinator
supplies and the reviewer records outside the candidate:

This protocol consumes already-approved `P`; its verdict binds only the exact implementation tuple
below and never mints or redefines `Q`, `R`, or `P`.

| Required field                                                | Reviewer check                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| exact external owner-ratification/activation record           | verify the authenticated owner or explicitly named delegated principal, independently verifiable delegation/current validity, durable record ID/URL, approved `P`, any required authoritative landing-equivalence record, immutable provenance, activation target scope, realization tuple, and expiry/revocation; generic authorization cannot pass |
| approved delivery package                                     | resolve `P = Q + durable R identifier + PASS`; if squash landing gives a different OID, resolve the authoritative landing-equivalence record proving full-tree equality or complete `Q` path-set byte/type/mode equality reproducing `Q`'s digest. It does not make the landed commit reviewed.                                                      |
| observed target base ref, commit, and tree                    | resolve the ref and both Git objects at freeze time; do not use planning provenance as a rolling execution base                                                                                                                                                                                                                                      |
| candidate commit and tree                                     | resolve both objects and review an immovable checkout/commit                                                                                                                                                                                                                                                                                         |
| merge-base equality and predecessor containment               | prove `merge-base(candidate, base) == base` and required predecessor landings are in the base's target content                                                                                                                                                                                                                                       |
| current normative-corpus comparison                           | compare all 67 normative authority files in the candidate against immutable authority provenance and record the clean result                                                                                                                                                                                                                         |
| owned source/config/test/evidence paths                       | confirm changed paths are story-owned and match the bounded contract; these paths may include product source and configuration                                                                                                                                                                                                                       |
| story contract, governing paths/IDs, and `DR-*` choices       | trace claimed behavior and delegated bounds to active authority                                                                                                                                                                                                                                                                                      |
| checks, CI, provider evidence, and final-verification posture | bind available pre-review results, the posture, required check-class set, verification configuration/environment, and subject binding to the candidate; under `deterministic`, require a passing subject-matching `EV-CHECK-OBSERVATION` for every required class and the complete set inside `Finalizing`; `none` remains a no-op                   |
| reviewer identity and independence                            | reviewer is not the author/implementer and is authorized by the selected policy                                                                                                                                                                                                                                                                      |

The implementation tuple includes approved package `P` and any required
authoritative landing-equivalence record; recorded base ref/commit/tree; candidate commit/tree; merge-base equality and containment
proof; current normative-corpus comparison; owned paths; and exact evidence. It does **not** require
a fresh package-digest computation, full delivery-corpus review, or a delivery-package path
allowlist. Review the applicable story contract, its governing authority, dependencies,
lifecycle/effect/security behavior, provider qualification, tests, and acceptance evidence instead.
Any source, configuration, pre-acceptance evidence, base, candidate, delivery-package identity,
selected posture, required check-class set, verification configuration/environment, or subject
binding change—including a rebase or target-ref refresh—creates a new tuple: re-prove merge-base
equality and containment, repeat the corpus comparison and affected checks/CI, obtain a new `Q`,
external `R`, and approved `P` if package identity changes or authoritative landing-equivalence
evidence is missing, ambiguous, or shows package-path add/remove/rename/mode/byte drift, and perform
a fresh exact review. After `Accepted`, recording only the final-verification observations already
authorized by the unchanged reviewed candidate, posture, required class set,
configuration/environment, and subject binding is continuation evidence and does not itself create
a new tuple or review loop.

Before requesting review, the implementation owner must have committed the candidate, recorded the
candidate/base/merge-base tuple, run required verification against that exact `HEAD`, and created an
external, non-candidate seal envelope. It contains exact commands, timestamps, exit codes, output
log digests or durable log identities, automatic candidate-bound `git diff --check
<base-commit>...<candidate-commit>` evidence, base-ancestry proof, and a final proof that the
original candidate commit/tree did not change and the worktree is clean. Commands ran in a detached
exact-candidate worktree; a non-ancestor base or original-candidate edit invalidates the seal. Review the envelope by
inspection; do not rerun its commands.

## Publication, CI, and verdict boundaries

Under D15, a recorded transition into `Reviewing` may authorize only fenced `OPC-REV-*`
draft/non-mergeable review publication for the frozen subject before independent review or
acceptance. It grants no acceptance, finalization, landing, or dependency-release authority.
Hosted CI may run before review. The selected final-verification posture must bind the exact
candidate. After `Accepted`, the authorized `Waiting` → `Finalizing` or retained-authority
`Accepted` → `Finalizing` transition records the selected verification intent. The
`deterministic` posture authorizes `OPC-VERIFY-EXECUTE`; every policy-selected required check class
must produce a passing, subject-matching `EV-CHECK-OBSERVATION`, and the complete required set must
be satisfied inside `Finalizing` before any target-changing `OPC-DEL-*`, merge, delivery, landing,
or other target-changing Operation. The `none` posture is an explicit no-op and authorizes no
verification Operation. The post-`Accepted` observations are authorized continuation evidence and
do not invalidate the review while candidate, posture, required class set, verification
configuration/environment, and subject binding remain unchanged; any drift requires a fresh tuple
and independent review. Independent review and all applicable CI/evidence must bind that same
candidate before target-changing delivery. The exact external owner-ratification/activation record
remains required throughout.

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

`PASS` validates only the frozen subject and its external review record. It is not a landing proof, a phase-gate result for a later
candidate, an approval of a changed PR, or authorization to skip a later independent review.

## Finding criteria

Create a blocking finding for any missing or contradictory governing mapping; unclosed boundary or
authority; missing durable fact/fence; invalid/stale/missing evidence; unbounded wait; uncertified
provider reachability; unsafe retry/recovery/cleanup; secret exposure; broken exact-subject
binding; incomplete oracle; invalid `DR-*` selection; or false acceptance/landing claim. Editorial
findings may not conceal a semantic or proof defect. A reviewer must cite direct evidence and
never invent an implementation algorithm as the fix. D15's recorded `Reviewing` transition and
fenced draft/non-mergeable `OPC-REV-*` publication may precede review; no acceptance may follow
until the required exact-candidate review passes. After `Accepted`, no target-changing
`OPC-DEL-*`, merge, delivery, landing, or dependency release may follow under `deterministic` until
every policy-selected required check class has a passing, subject-matching
`EV-CHECK-OBSERVATION` and the complete required set is satisfied inside `Finalizing`; `none`
remains an explicit no-op.
