---
title: "Jig greenfield delivery policy"
purpose: "Set the mandatory implementation, qualification, evidence, and review rules for every greenfield story."
audience:
  - delivery planners
  - implementers
  - reviewers
status: active policy for this documentation track
owner: Arye Kogan
last_verified: 2026-07-23
---

# Delivery policy

## Context, background, and goal

The governing architecture is implementable but intentionally source-empty. This policy turns that
fact into a safe delivery discipline: small closed stories, exact authority, durable evidence, and
independent review rather than speculative scaffolding or retrospective proof.

## Canonical delivery-package identities

- Delivery-package candidate identity `Q` is the exact candidate commit/tree to be reviewed; exact package-only path set; each
  path's bytes/type/mode; and aggregate computed unpinned digest.
- External review record `R` records: protocol; reviewer identity/independence; exact `Q`; checked
  scope; checks/evidence; findings; verdict; and a durable external record identifier. The
  coordinator supplies `Q` and available checks/evidence separately; neither `PASS` nor `R` is a
  field of pre-verdict `Q`.
- Only an `R` whose verdict is `PASS` creates approved delivery package
  `P = Q + durable R identifier + PASS`.

## Mandatory delivery rules

1. Implement only a story whose [mandatory contract](./story-contract.md#mandatory-greenfield-story-contract),
   including Definition of Ready, is satisfied, whose exact external owner-ratification/activation
   record is recorded and independently verified: authenticated owner or explicitly named delegated
   principal with independently verifiable delegation and current validity; durable record ID/URL;
   approved package `P` and immutable planning/authority provenance; any required external
   authoritative landing-equivalence record; activation target scope; selected realization tuple; and
   expiry/revocation. Generic authorization cannot pass. Its predecessors
   must have verified landing evidence contained in the observed implementation-candidate base.
   Record that provenance in the external durable activation record, reviewer packet, or PR review
   record, and verify it at readiness. The attempt must identify the approved delivery package `P`
   it executes and any required authoritative landing-equivalence record.
2. Treat the product and approved redesign as authority. The delivery track may select only an
   explicitly delegated `DR-*` realization choice, record its owner/constraints/evidence/fallback,
   and stop for `OWNER_DECISION_REQUIRED` outside that grant.
3. Keep one PR to one cohesive semantic and authority subject. Split `<ID>a` contract/core from
   `<ID>b` realization when it spans two external mechanism families, moves primary authority
   across runtime seams, joins deterministic semantics to independently failing real qualification,
   or lacks one coherent oracle. The first half stays useful and green but unconfigurable until the
   second qualifies.
4. No adapter, provider, or effect path is reachable before its semantic contract, manifest,
   exact qualification gate/evidence, and gate evaluator pass. This applies to all eight mandatory
   splits: GF-019→020, GF-010→025, GF-013→026, GF-033→039, GF-042→047, GF-034→060,
   GF-041→057, and GF-044→061. Scripted fixtures may exercise contracts but must not make a real
   provider configurable. GF-041→057 review publication and GF-044→061 final delivery share
   `PORT-DELIVERY`/`CF-MECH-DELIVERY` only; their credentials, Operations, authority subjects,
   qualification evidence, and reachability gates remain disjoint.
5. Record operation intent before dispatch. Applicable runtime failures use cataloged typed `FC-*`
   failure classes; non-runtime failures remain typed under their bounded story contract. For an
   uncertain external effect, reconcile using its stable identity. Same-identity retry is
   effectful-only after confirmed absence and recorded reauthorization; an effect-free replacement
   uses a new Operation identity. Otherwise park, preserve the resource, and surface the
   uncertainty.
6. Validate every boundary input. Missing, malformed, stale, oversized, cross-scope, ambiguous,
   self-reported, or unverifiable values fail closed. Provider output and evidence never widen
   authority.
7. Credentials are named configuration references resolved only in memory. Secrets must not enter
   ledger records, evidence, logs, exports, fixtures, or reviewer packets; redaction and hostile
   input limits apply at every port.
8. Timers wake work but never decide it. Durable facts decide retry, recovery, resume, settlement,
   release, and cleanup. Every wait has a named finite `BND-*` outcome.
9. Acceptance, landing, product outcome, and retirement are separate. Only authoritative target
   proof makes `Landed` and releases dependents; cleanup cannot change business outcome or release.
10. A passing local check is evidence, not approval. The implementation owner runs every required
    local proof, repository check, and direct validator exactly once for the frozen candidate; hosted
    CI independently executes its required checks. The coordinator verifies only orchestration facts
    and evidence bindings. Every implementation candidate needs an independent
    implementation-candidate review under the reviewer packet; that protocol reviews the
    story-owned source, configuration, tests, and evidence paths, not a fresh delivery-package
    corpus review or digest computation. At candidate freeze, record approved `P`, the current
    67-file normative-corpus comparison, and exact-subject evidence in the external reviewer
    packet or PR review record; the independent reviewer verifies them at review.
11. Seal an implementation candidate only in this order: complete edits and commit; record the
    exact candidate commit/tree, observed base commit/tree, and merge-base; run the required
    verification against that exact `HEAD`; then prove that `HEAD` and its tree are unchanged and
    the worktree is clean. The implementation owner produces an external, non-candidate evidence
    envelope with the exact commands, start/end timestamps, exit codes, output-log digests or durable
    log identities, tuple, and final unchanged/clean proof. Use `pnpm candidate:seal` with an
    external output directory, base ref, and one or more commands when its generic capture format
    fits the story. The command refuses a dirty start, records every supplied command once, and marks
    the seal invalid if any command fails or changes the candidate. An edit to candidate source,
    configuration, evidence, metadata, review package, verification posture/configuration, or
    subject binding invalidates the seal and its verification evidence; do not report an earlier
    green result for a later candidate.
12. The independent reviewer is read-only and performs semantic and evidence review only. The
    reviewer may read files and inspect exact commits, trees, diffs, manifests, logs, hosted check
    results, and evidence with read-only operations such as `git show`, `git diff`, `rg`, and `sed`.
    The reviewer must not execute `pnpm` tests/checks/builds, direct validators, formatters,
    installers, evidence writers, or GitHub/repository mutations. Missing, stale, contradictory, or
    incorrectly bound verification evidence is a finding; the reviewer must not repair it by
    rerunning a check. This preserves independent semantic authority and does not weaken required
    review or hosted CI.
13. Every correction loop searches sibling occurrences of the same defect across the exact
    manifest, briefs, inventories, routes, and evidence before reporting it fixed.
14. A post-edit re-review always freezes a new subject: any edit to candidate source,
    configuration, pre-acceptance evidence, metadata, review package, selected verification
    posture, policy-selected required check-class set, verification configuration/environment, or
    subject binding invalidates the prior candidate tuple and verdict. The sole continuation case is
    the authorized recording after `Accepted` of final-verification observations already required
    by that unchanged reviewed candidate, posture, check-class set, configuration/environment, and
    binding. Those observations are continuation evidence, not an edit to the reviewed subject, and
    do not by themselves reopen review. Record and verify each replacement tuple only at its
    candidate freeze and review in the external durable reviewer record; do not encode it as a
    permanent repo-resident assertion.
15. Keep the two review protocols distinct. For delivery-package review, the coordinator freezes
    pre-verdict `Q` and supplies checks/evidence separately. An independent reviewer verifies the
    manifest's full story corpus and writes external `R`; only `PASS` creates `P`. An
    implementation-candidate review freezes one story tuple: observed base ref/commit/tree,
    candidate commit/tree, merge-base equality, predecessor containment, approved `P` binding,
    current normative-corpus comparison, owned path set, and exact evidence in the external
    reviewer packet; the independent reviewer verifies that tuple at review. It permits
    story-owned source and configuration paths and does not require a fresh package digest or full corpus
    review. Its verdict binds only that implementation tuple; it never mints or redefines `P`. A
    squash-produced landed commit may have a different OID without fresh package review
    only when an external authoritative landing-equivalence record binds approved `P` (and thus its
    exact `Q`) to the target ref and landed commit/tree and proves either full-tree equality or,
    where unrelated target paths moved, byte-for-byte/type/mode equality of the complete `Q` path
    set reproducing `Q`'s aggregate digest. That record does not make the landed commit reviewed.
    Missing, ambiguous, or drifting add/remove/rename/mode/byte evidence requires a new `Q`, `R`,
    and `P`; the 67-file normative-corpus comparison remains separate.
16. Under D15, the recorded transition into `Reviewing` and only its fenced `OPC-REV-*`
    draft/non-mergeable review-publication Operations may occur before independent review or
    acceptance. They are not approval, acceptance, finalization, landing, or dependency release.
    Hosted CI may run before review. Bind the selected final-verification posture to the immutable
    candidate. After `Accepted`, record the selected verification intent on the authorized
    `Waiting` → `Finalizing` or retained-authority `Accepted` → `Finalizing` transition. The
    `deterministic` posture authorizes `OPC-VERIFY-EXECUTE`; every policy-selected required check
    class must produce a passing, subject-matching `EV-CHECK-OBSERVATION`, and the complete required
    set must be satisfied inside `Finalizing` before any target-changing `OPC-DEL-*`, merge,
    delivery, landing, or other target-changing Operation. The `none` posture is an explicit no-op
    and authorizes no verification Operation. These post-`Accepted` observations are authorized
    continuation evidence when the reviewed candidate, posture, required check-class set,
    configuration/environment, and subject binding remain unchanged; recording them does not itself
    invalidate the verdict. Drift in any of those values requires a fresh implementation tuple,
    evidence, and independent review. Independent exact-subject review and all applicable
    CI/evidence must bind the same candidate before target-changing delivery. The exact external
    owner-ratification/activation record remains required and cannot be inferred from publication,
    CI, or a reviewer verdict.
17. The local validator proves governing-source projection, package consistency, and corpus
    integrity only; it does not semantically approve plan-authored outcomes or prose. For a
    delivery-package subject, the coordinator records immutable pre-verdict `Q` outside the
    candidate and supplies checks/evidence separately; the independent reviewer records external
    `R`, and only `PASS` creates `P`. Never pin or copy an expected
    package digest into `track.json`, validator constants, fixtures, or candidate-authored review
    prose. Any package byte or path-set change invalidates `Q` and requires fresh package review;
    the 67-file normative digest is corpus-drift evidence only.
18. Keep delivery-process state out of repository source, tests, fixtures, and CI configuration.
    Within those places, do not commit delivery-process provenance or review state — commit SHAs,
    tree hashes, candidate or story branch refs, PR or issue URLs, review verdicts, approval
    records, or package digests — and do not use a story ID as an identifier in a source, test,
    fixture, or script file or directory name. Canonical story files under
    `docs/delivery/greenfield/stories/` and ordinary CI branch triggers are unaffected. Tests remain
    per-story work named and organized by the package or behavior under test; oracle fixtures remain
    named for the oracle; and one generic evidence writer may accept a story ID as a CI-time
    argument and write artifacts uploaded by the workflow. Provenance facts are verified when
    asserted; re-verifying them forever produces no information and creates failures on ordinary
    squash-merge.

## Required evidence ladder

Every story names proportionate proof from this ladder: unit and schema tests; contract tests across
real validation boundaries; adversarial and negative authority probes; deterministic replay,
crash, fault, timeout, and reconciliation probes; provider qualification; E2E product outcome;
and the applicable `CF-*` suite/catalog entry. Evidence is exact-subject-bound and includes build,
manifest, environment, suite, probe, and output digests.

## Delivery lifecycle

1. Keep the immutable planning/authority provenance and complete the story contract.
2. Independently review the contract's readiness and `DR-*` selection.
3. Record and independently verify the exact external owner-ratification/activation record:
   authenticated owner or explicitly named delegated principal with independently verifiable
   delegation/current validity; durable record ID/URL; approved package `P` and immutable
   planning/authority provenance; any required authoritative landing-equivalence record; activation
   target scope; selected realization tuple; and expiry/revocation. Also resolve `P`; the
   then-current target base ref/commit/tree; predecessor containment; and a clean current 67-file
   normative-corpus comparison against immutable authority provenance.
4. Implement the smallest closed subject; retain fail-closed adapters until qualified.
5. Complete the edits and commit the candidate. Record its exact commit/tree, the observed base
   commit/tree, and merge-base before executing any required local verification.
6. The implementation owner runs every required local proof, repository check, and direct validator
   exactly once against that committed `HEAD`; hosted CI independently supplies execution
   verification. Produce the external seal envelope, then prove the candidate `HEAD`/tree remained
   unchanged and its worktree is clean. The coordinator checks only the resulting bindings and
   orchestration facts; it does not rerun checks.
7. Under D15, record the transition into `Reviewing` and publish only the fenced `OPC-REV-*`
   draft/non-mergeable review subject as needed for hosted CI or review. Supply the sealed tuple and
   evidence envelope for read-only independent semantic/evidence review. If target movement or any
   edit changes the tuple, refresh/rebase as necessary, create a new seal, and repeat affected
   evidence, CI, and review. If delivery-package identity `Q` changes, obtain a new external `R`
   and approved `P` before the next implementation review.
8. Resolve findings in a new candidate tuple; the implementation owner corrects, commits, seals, and
   re-submits it. The reviewer rechecks changed hunks, sibling occurrences, affected invariants, and
   the new seal/evidence binding. Unchanged conclusions may carry forward only through unchanged
   path hashes; a full manual corpus reread and reviewer-run check suite are not required. Re-review
   until `PASS`, or escalate unresolved owner
   decisions. After `Accepted`, enter `Finalizing` through the authorized transition and record the
   selected verification intent there. Under `deterministic`, every policy-selected required check
   class must have a passing, subject-matching `EV-CHECK-OBSERVATION`, and the complete set must be
   satisfied in `Finalizing` before any target-changing Operation; `none` remains an explicit no-op.
   Recording those observations is authorized continuation evidence, not a review-invalidating edit,
   only while the reviewed candidate, posture, required class set, configuration/environment, and
   binding remain unchanged. Any drift requires a fresh tuple and review. A reviewer cannot invent a
   product or architecture decision.

## Explicit non-goals

This policy does not authorize use of archive implementation, automatic authority widening,
unbounded retries, partial provider configuration, self-review, public stability promises, or a
claim that this documentation candidate is the final implementation subject.
