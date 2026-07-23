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
   must have verified landing evidence contained in the observed
   implementation-candidate base. The front-matter `baseline_commit` remains immutable planning/
   authority provenance; it is not a rolling execution base. The attempt must identify the
   approved delivery package `P` it executes and any required authoritative landing-equivalence
   record.
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
10. A passing local check is evidence, not approval. Every implementation candidate needs an
    independent implementation-candidate review under the reviewer packet; that protocol reviews
    the story-owned source, configuration, tests, and evidence paths, not a fresh delivery-package
    corpus review or digest computation. It still binds approved `P` and records a current 67-file
    normative-corpus comparison.
11. Every correction loop searches sibling occurrences of the same defect across the exact
    manifest, briefs, inventories, routes, and evidence before reporting it fixed.
12. A post-edit re-review always freezes a new subject: any edit to candidate source,
    configuration, pre-acceptance evidence, metadata, review package, selected verification
    posture, policy-selected required check-class set, verification configuration/environment, or
    subject binding invalidates the prior candidate tuple and verdict. The sole continuation case is
    the authorized recording after `Accepted` of final-verification observations already required
    by that unchanged reviewed candidate, posture, check-class set, configuration/environment, and
    binding. Those observations are continuation evidence, not an edit to the reviewed subject, and
    do not by themselves reopen review.
13. Keep the two review protocols distinct. For delivery-package review, the coordinator freezes
    pre-verdict `Q` and supplies checks/evidence separately. An independent reviewer verifies the
    manifest's full story corpus and writes external `R`; only `PASS` creates `P`. An
    implementation-candidate review freezes one story tuple: observed base ref/commit/tree,
    candidate commit/tree, merge-base equality, predecessor containment, approved `P` binding,
    current normative-corpus comparison, owned path set, and exact evidence. It permits story-owned
    source and configuration paths and does not require a fresh package digest or full corpus
    review. Its verdict binds only that implementation tuple; it never mints or redefines `P`. A
    squash-produced landed commit may have a different OID without fresh package review
    only when an external authoritative landing-equivalence record binds approved `P` (and thus its
    exact `Q`) to the target ref and landed commit/tree and proves either full-tree equality or,
    where unrelated target paths moved, byte-for-byte/type/mode equality of the complete `Q` path
    set reproducing `Q`'s aggregate digest. That record does not make the landed commit reviewed.
    Missing, ambiguous, or drifting add/remove/rename/mode/byte evidence requires a new `Q`, `R`,
    and `P`; the 67-file normative-corpus comparison remains separate.
14. Under D15, the recorded transition into `Reviewing` and only its fenced `OPC-REV-*`
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
15. The local validator proves governing-source projection, package consistency, and corpus
    integrity only; it does not semantically approve plan-authored outcomes or prose. For a
    delivery-package subject, the coordinator records immutable pre-verdict `Q` outside the
    candidate and supplies checks/evidence separately; the independent reviewer records external
    `R`, and only `PASS` creates `P`. Never pin or copy an expected
    package digest into `track.json`, validator constants, fixtures, or candidate-authored review
    prose. Any package byte or path-set change invalidates `Q` and requires fresh package review;
    the 67-file normative digest is corpus-drift evidence only.

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
5. Run the contract's local proof and repository checks; under D15, record the transition into
   `Reviewing` and publish only the fenced `OPC-REV-*` draft/non-mergeable review subject as needed
   for hosted CI or review, and record exact evidence.
6. Freeze the implementation candidate tuple, including proof that
   `merge-base(candidate, base) == base`, and request independent review. If target movement or any
   edit changes the tuple, refresh/rebase as necessary and repeat merge-base/containment proof,
   normative-corpus comparison, evidence, CI, and review. If delivery-package identity `Q` changes,
   obtain a new external `R` and approved `P` before the next implementation review.
7. Resolve findings in a new candidate tuple; re-review until `PASS`, or escalate unresolved owner
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
