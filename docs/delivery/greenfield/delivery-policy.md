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
   including Definition of Ready, is satisfied and whose dependencies are merged on the selected baseline.
2. Treat the product and approved redesign as authority. The delivery track may select only an
   explicitly delegated `DR-*` realization choice, record its owner/constraints/evidence/fallback,
   and stop for `OWNER_DECISION_REQUIRED` outside that grant.
3. Keep one PR to one cohesive semantic and authority subject. Split `<ID>a` contract/core from
   `<ID>b` realization when it spans two external mechanism families, moves primary authority
   across runtime seams, joins deterministic semantics to independently failing real qualification,
   or lacks one coherent oracle. The first half stays useful and green but unconfigurable until the
   second qualifies.
4. No adapter, provider, or effect path is reachable before its semantic contract, manifest,
   qualification evidence, and gate evaluator pass. Scripted fixtures may exercise contracts but
   must not make a real provider configurable.
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
    independent exact-candidate review under the reviewer packet.

## Required evidence ladder

Every story names proportionate proof from this ladder: unit and schema tests; contract tests across
real validation boundaries; adversarial and negative authority probes; deterministic replay,
crash, fault, timeout, and reconciliation probes; provider qualification; E2E product outcome;
and the applicable `CF-*` suite/catalog entry. Evidence is exact-subject-bound and includes build,
manifest, environment, suite, probe, and output digests.

## Delivery lifecycle

1. Freeze the baseline and complete the story contract.
2. Independently review the contract's readiness and `DR-*` selection.
3. Implement the smallest closed subject; retain fail-closed adapters until qualified.
4. Run the contract's local proof and repository checks; record exact evidence.
5. Freeze the candidate tuple and request independent review.
6. Resolve findings in a new candidate tuple; re-review until `PASS`, or escalate unresolved owner
   decisions. A reviewer cannot invent a product or architecture decision.

## Explicit non-goals

This policy does not authorize use of archive implementation, automatic authority widening,
unbounded retries, partial provider configuration, self-review, public stability promises, or a
claim that this documentation candidate is the final implementation subject.
