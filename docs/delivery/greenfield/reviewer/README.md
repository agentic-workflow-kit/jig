---
title: "Jig greenfield delivery — reviewer packet"
purpose: "Provide independent read-only review procedures for committed story and phase candidates."
audience:
  - independent reviewers
  - Jig owner
  - delivery coordinators
status: active review protocol
owner: Arye Kogan
last_verified: 2026-07-29
---

# Reviewer packet

## Context, background, and goal

Judge one frozen subject against current active authority. Do not choose architecture, invent a
solution, or trust a branch name, prior verdict, implementer narrative, CI result, or historical
seal. Review binds one exact committed story candidate or the frozen phase integration candidate.

## Reviewer operation boundary

The reviewer performs semantic and evidence review only. Read-only inspection of files, exact
commits/trees/diffs, manifests, logs, hosted check results, and recorded evidence is permitted with
operations such as `git show`, `git diff`, `rg`, and `sed`.

The reviewer must not execute `pnpm` checks, tests, builds, direct validators, formatters,
installers, evidence writers, or repository/GitHub mutations. Missing, stale, contradictory, or
incorrectly bound verification evidence is a finding; never repair it by rerunning a command. The
implementation owner owns executable verification, hosted CI independently runs its required
checks, and the coordinator verifies orchestration facts and evidence bindings.

## Implementation-candidate review

Use this protocol for one implementation attempt of one `GF-*` story covered by an explicit current
owner or named-delegate implementation request. It permits bounded story-owned source,
configuration, test, and evidence paths. No delivery-package qualification, delivery-surface
digest approval, or separate external approval issue is required. Provider qualification remains
mandatory: configuration cannot expose a provider until its named evidence, including
`CF-GATE-PROVIDER` where applicable, passes.

The external phase ledger or reviewer record supplies:

| Required field                          | Reviewer check                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| authorized scope and constraints        | Verify that the explicit current implementation request covers this phase/story and that current product/design/track authority plus any selected bounded realization remain compatible. No durable external approval URL is required.                                                                                                                |
| registered worktree and continuous pair | Resolve the exact story worktree path/branch; verify explicit freeze, clean status, implementer identity, reviewer independence, distinct-across-story pairing, and any exceptional replacement reason/handoff.                                                                                                                                       |
| integration base ref/commit/tree        | Resolve the ref and Git objects at freeze; do not use planning provenance as a rolling execution base.                                                                                                                                                                                                                                                |
| candidate commit/tree and merge-base    | Resolve exact frozen `HEAD`/tree, prove base ancestry, and verify every declared predecessor landing is contained.                                                                                                                                                                                                                                    |
| current normative-corpus comparison     | Verify the candidate's 67 authority files against immutable provenance; this is integrity evidence, not authorization.                                                                                                                                                                                                                                |
| owned source/config/test/evidence paths | Confirm changed paths match the bounded story contract and contain no unrelated authority or behavior.                                                                                                                                                                                                                                                |
| governing paths/IDs and `DR-*` choices  | Trace behavior, failure/recovery/security, provider reachability, authority, and delegated bounds to active product/design.                                                                                                                                                                                                                           |
| required checks and evidence            | Bind exact command/set, result, timestamp, durable log/reference, verification posture/classes/environment, minimal non-secret environment-name allowlist, candidate-bound `git diff --check` where applicable, tracked/untracked clean status, and exact ignored-state inventory/allowlist decision before checks and after review to the candidate. |
| reviewer verdict                        | Bind reviewer identity/independence, findings, timestamp, and verdict to the exact committed candidate; do not treat it as acceptance, landing, or dependency release.                                                                                                                                                                                |
| integration result                      | After approval, verify fast-forward or no-fast-forward integration preserves the reviewed commit as an ancestor and record the resulting integration commit.                                                                                                                                                                                          |

Inspect the registered story worktree only at explicit freeze. The reviewer shares that worktree
with the implementer through a write/freeze handoff and never writes concurrently. No custom
sealer, seal envelope, detached clone, fresh clone, or resealing is a review gate. Historical seals
may be cited as history but are neither required nor sufficient.

Verify the recorded ignored-state inventory read-only. `.env`/credential files, external workspace
links, unexplained generated output, or unlisted residue invalidate the evidence. Dependency trees
need frozen-lockfile and workspace-link-containment proof; generated/cache output must have been
regenerated by the recorded check or content-keyed to the exact candidate. Verify that locally
recorded checks inherited only the named minimal environment allowlist and that durable logs contain
neither ambient credentials nor secret values.

For a fix, rebase, target movement, posture change, evidence change, or other binding drift, require
a new committed candidate and evidence for every applicable required check. The same continuous reviewer incrementally
reviews the prior-reviewed-to-new range, changed hunks, sibling occurrences, affected invariants,
and new evidence. Conclusions carry forward only for unchanged paths and unaffected invariants; an
old verdict cannot authorize a new candidate.

## Publication, CI, and verdict boundaries

Under D15, a recorded transition into `Reviewing` may authorize only fenced `OPC-REV-*`
draft/non-mergeable review publication for the frozen subject before independent review or
acceptance. It grants no acceptance, finalization, landing, or dependency-release authority.
Hosted CI may run before review.

The selected final-verification posture binds the exact candidate. After `Accepted`, the authorized
`Waiting` → `Finalizing` or retained-authority `Accepted` → `Finalizing` transition records
verification intent. The `deterministic` posture authorizes `OPC-VERIFY-EXECUTE`; every
policy-selected required check class must produce a passing, subject-matching
`EV-CHECK-OBSERVATION`, and the complete required set must be satisfied inside `Finalizing` before
any target-changing `OPC-DEL-*`, merge, delivery, or landing. The `none` posture is an explicit
no-op and authorizes no verification Operation.

Post-`Accepted` observations are continuation evidence only while candidate, posture, class set,
verification configuration/environment, and subject binding remain unchanged. Any drift requires
every applicable required check and incremental review by the same reviewer. Explicit
implementation scope, independent review, required CI, finalization, landing, and dependency
release remain separate.

## Phase integration and closure

Approved story commits integrate into one phase branch. A content conflict is returned to the same
story pair for a new candidate/check/review loop; the coordinator does not resolve it on the
integration branch. Story worktrees, branches, and pairs remain quiescent through final-PR
feedback.

After all required stories integrate, independently review the frozen phase integration candidate
read-only with its required integration checks. The phase uses one normal hosted-CI-backed PR to
`main`. Route attributable findings to the owning continuous story pair. Any final-branch change
requires refreshed checks and closure review. Approval, DoD, authoritative landing proof, and
explicit cleanup scope remain required.

## Reviewer navigation

1. [Delivery index](../../README.md) — authority order and scope.
2. [Baseline and findings](../baseline-and-findings.md) — immutable input and known gaps.
3. [Story contract](../story-contract.md) — mandatory implementation subject shape.
4. [Delivery policy](../delivery-policy.md) — universal gates and evidence rules.
5. [Phase orchestration](../phase-orchestration.md) — declared-DAG and worktree coordination.
6. [Greenfield overview](../README.md) — phase ordering and the manifest story map.
7. [Machine manifest](../track.json) — exact IDs, fields, DAG, inventories, gates, and closure.
8. [Full story briefs](../stories/) — complete per-story review subjects.
9. [Coverage](../coverage.md), [verification](../verification.md), and
   [delegated choices](../decisions.md) — two-way routes, proof, and `DR-*` ownership.
10. [Risks and owner decisions](../risks-and-owner-decisions.md) — stop lines and escalation.
11. Active [`docs/product/`](../../../product/) — outcome and guarantee intent.
12. Active [`docs/redesign/design/`](../../../redesign/design/) — IDs, decisions, invariants,
    ports, lifecycle, recovery, and conformance.
13. [Review checklist](./review-checklist.md) — criteria for the selected protocol.

The readiness gate and archive manifest may establish planning/authority provenance. Do not inspect
archived implementation, archived delivery material, or ignored remnants to fill a candidate gap.
Research is non-governing and may not select behavior.

## Verdicts

- **PASS** — every applicable checklist item is evidenced on the exact frozen subject; no
  unresolved blocking finding, missing governing mapping, authority widening, uncertain-effect
  blind retry, or reachable unqualified adapter remains.
- **CHANGES_REQUIRED** — one or more correctable candidate defects exist. Give stable finding IDs,
  severity, governing path/ID, exact evidence, required observable correction, and recheck scope.
- **OWNER_DECISION_REQUIRED** — the candidate needs a material product, architecture, authority,
  guarantee, or accepted-tradeoff decision not already delegated. Stop rather than proposing it.

`PASS` validates only the frozen subject. It is not approval for a changed candidate, final landing
proof, a later phase gate, or authorization to skip independent review, finalization, or CI.

## Finding criteria

Create a blocking finding for any missing or contradictory governing mapping; unclosed boundary or
authority; missing durable fact/fence; invalid, stale, missing, or differently bound evidence;
unbounded wait; uncertified provider reachability; unsafe retry/recovery/cleanup; secret exposure;
broken exact-subject binding; incomplete oracle; invalid `DR-*` selection; worktree/ledger
mismatch; reviewer replacement without handoff; or false acceptance/landing claim. Editorial
findings may not conceal a semantic or proof defect. Cite direct evidence and never invent an
implementation algorithm as the fix.
