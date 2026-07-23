---
title: "Jig greenfield delivery policy"
purpose: "Set the mandatory implementation, qualification, evidence, and review rules for every greenfield story."
audience:
  - delivery planners
  - implementers
  - reviewers
status: active policy for this documentation track
owner: Arye Kogan
last_verified: 2026-07-22
---

# Delivery policy

## Context, background, and goal

The governing architecture is implementable but intentionally source-empty. This policy turns that
fact into a safe delivery discipline: small closed stories, exact authority, durable evidence, and
independent review rather than speculative scaffolding or retrospective proof.

## Mandatory delivery rules

1. Implement only a story whose [mandatory contract](./story-contract.md#mandatory-greenfield-story-contract),
   including Definition of Ready, is satisfied, whose exact external owner-ratification/activation
   record is recorded and independently verified: authenticated owner or explicitly named delegated
   principal with independently verifiable delegation and current validity; durable record ID/URL;
   original package tuple `P` and immutable planning/authority provenance; any required external
   authoritative landing-equivalence record; activation target scope; selected realization tuple; and
   expiry/revocation. Generic authorization cannot pass. Its predecessors
   must have verified landing evidence contained in the observed
   implementation-candidate base. The front-matter `baseline_commit` remains immutable planning/
   authority provenance; it is not a rolling execution base. The attempt must identify the approved
   original delivery-package tuple `P` it executes and any required authoritative landing-equivalence
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
   exact qualification gate/evidence, and gate evaluator pass. This applies to all five mandatory
   splits: GF-019→020, GF-010→025, GF-013→026, GF-033→039, and GF-042→047. Scripted fixtures may
   exercise contracts but must not make a real provider configurable. Independently, never
   recombine GF-057 review publication with GF-061 final delivery: their credentials, Operations,
   authority subjects, qualification evidence, and reachability gates remain disjoint.
5. Record operation intent before dispatch. For an uncertain external effect, reconcile using its
   stable identity; retry the same effect only after confirmed absence and recorded
   reauthorization. Otherwise park, preserve the resource, and surface the uncertainty.
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
    corpus review or digest computation. It still binds the approved package commit/tree, external
    digest, and `PASS`, and records a current 67-file normative-corpus comparison.
11. Every correction loop searches sibling occurrences of the same defect across the exact
    manifest, briefs, inventories, routes, and evidence before reporting it fixed.
12. A post-edit re-review always freezes a new subject: any edit to source, evidence, metadata, or
    review package invalidates the prior candidate tuple and verdict.
13. Keep the two review protocols distinct. A delivery-package review freezes the package commit/
    tree and its computed unpinned exact package path-set digest and verifies the manifest's full
    story corpus. An implementation-candidate review freezes one story tuple: observed base
    ref/commit/tree, candidate commit/tree, merge-base equality, predecessor containment, approved
    package `PASS` binding, current normative-corpus comparison, owned path set, and exact evidence.
    The latter
    permits story-owned source and configuration paths and does not require the package digest or
    full corpus review. Its `PASS` binds immutable package tuple `P`: reviewed commit/tree, exact
    package path set, each path's bytes/type/mode, aggregate digest, and `PASS`. A squash-produced
    landed commit may have a different OID without fresh package review only when an external
    authoritative landing-equivalence record binds `P` to the target ref and landed commit/tree and
    proves either full-tree equality or, where unrelated target paths moved, byte-for-byte/type/mode
    equality of the complete package path set that reproduces `P`'s aggregate digest. That record
    does not make the landed commit reviewed. Missing, ambiguous, or drifting add/remove/rename/
    mode/byte evidence requires a new tuple and `PASS`; the 67-file normative-corpus comparison
    remains separate.
14. Under D15, the recorded transition into `Reviewing` and only its fenced `OPC-REV-*`
    draft/non-mergeable review-publication Operations may occur before independent review or
    acceptance. They are not approval, acceptance, finalization, landing, or dependency release.
    Hosted CI may run before review. Bind the selected final-verification posture to the immutable
    candidate; if it runs after `Accepted`, its applicable checks/evidence must pass before
    finalization or landing. Independent exact-subject review and all applicable CI/evidence must
    bind the same candidate before merge or landing. The exact external owner-ratification/
    activation record remains required and cannot be inferred from publication, CI, or a reviewer
    verdict.
15. The local validator proves governing-source projection, package consistency, and corpus
    integrity only; it does not semantically approve plan-authored outcomes or prose. For a
    delivery-package subject, the independent reviewer records the immutable commit/tree and
    computed unpinned exact package path-set digest outside the candidate. Never pin or copy an
    expected
    package digest into `track.json`, validator constants, fixtures, or candidate-authored review
    prose. Any package byte change invalidates that package tuple and requires fresh package review;
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
   delegation/current validity; durable record ID/URL; original package tuple `P` and immutable
   planning/authority provenance; any required authoritative landing-equivalence record; activation
   target scope; selected realization tuple; and expiry/revocation. Also record `P`; the
   then-current target base ref/commit/tree; predecessor containment; and a clean current 67-file
   normative-corpus comparison against immutable authority provenance.
4. Implement the smallest closed subject; retain fail-closed adapters until qualified.
5. Run the contract's local proof and repository checks; under D15, record the transition into
   `Reviewing` and publish only the fenced `OPC-REV-*` draft/non-mergeable review subject as needed
   for hosted CI or review, and record exact evidence.
6. Freeze the implementation candidate tuple, including proof that
   `merge-base(candidate, base) == base`, and request independent review. If target movement or any
   edit changes the tuple, refresh/rebase as necessary and repeat merge-base/containment proof,
   normative-corpus comparison, evidence, CI, and review. If the delivery-package tuple changes,
   obtain its new `PASS` before the next implementation review.
7. Resolve findings in a new candidate tuple; re-review until `PASS`, or escalate unresolved owner
   decisions. Run and record the selected final-verification posture before finalization or landing;
   a reviewer cannot invent a product or architecture decision.

## Explicit non-goals

This policy does not authorize use of archive implementation, automatic authority widening,
unbounded retries, partial provider configuration, self-review, public stability promises, or a
claim that this documentation candidate is the final implementation subject.
