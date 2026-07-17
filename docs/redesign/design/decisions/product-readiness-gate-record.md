---
title: "Product readiness gate — fourth remediation candidate"
purpose: Record the prior remediation history, the fourth independent readiness review's two findings, their owner-approved remediation, and the renewed exact-candidate review required after remediation merges.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers awaiting an implementation-ready corpus
scope: The fourth independent readiness review against baseline f0045c27408220bb0577cb286ebfe7574f3c66f5, including the 2026-07-17 documentation-only remediation; implementation, archive, greenfield planning, merge authorization, and the renewed review verdict are excluded.
state: current
status: fourth independent readiness review returned changes required for one terminal-liveness blocker and one PC-proof-route completeness gap; owner-approved remediation candidate in progress; readiness lock inactive pending merge and renewed independent exact-candidate review
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ./product-guarantee-import.md
  - ../product-guarantee-reconciliation.md
  - ./D3-responsibilities-trust-authority.md
  - ./D7-acceptance-and-evidence.md
  - ./D10-runtime-decomposition.md
  - ./D15-pre-acceptance-review-publication.md
  - ../../../product/guarantees.md
related:
  - ./review-and-approval-record.md
  - ./layer2-gate-record.md
  - ../README.md
  - ../architecture-conformance.md
---

# Product readiness gate — fourth remediation candidate

## Current gate state

The first remediation merged as baseline `fe493beec71aeb4411a3024ccc81cf7b6f5a2c88`. A fresh
independent empty-repository readiness review of that exact commit on 2026-07-17 returned
**FAIL**: 15 blocker groups, 9 delegation gaps, 4 traceability gaps, and 6 editorial groups.
The product-readiness lock therefore remains **inactive**.

Arye Kogan verified the findings, settled the nine decisions they require, and approved the exact
resolutions below. That authorization permits the named design and non-guarantee product-prose
corrections, including bounded reopen of D3, D7, and D10. It does not authorize unrelated Layer 1
changes, implementation, archive, greenfield planning, merge, or self-certification of readiness.

## Third independent review — remediation in progress

A fresh independent empty-repository readiness review of `ee35667b25b20610632dff4673bc1f07f7f9359a`
on 2026-07-17 returned **CHANGES_REQUIRED**. Arye Kogan verified the two findings and authorized
their settled, documentation-only remediation below. This candidate does not certify the gate;
after merge, a fresh independent reviewer must assess the exact merged commit.

| Finding                             | Resolution carried by this candidate                                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Successor-envelope digest collision | Add explicit genesis-or-successor lineage to `SCH-ENVELOPE` and its composition digest; preflight validates the lineage fail-closed, and `CF-ENVELOPE` proves distinct predecessor/reason successors create distinct digests and `ID-RUN`s. |
| `PC-*` proof-route traceability gap | Add one named proof route to every 44-row product-commitment inventory entry and require those routes or their governance records in `CF-GATE-PRODUCT` and this renewed gate.                                                               |

## Fourth independent review — remediation in progress

A fresh independent empty-repository readiness review of
`f0045c27408220bb0577cb286ebfe7574f3c66f5` on 2026-07-17 returned
**CHANGES_REQUIRED**. Arye Kogan verified the two findings and authorized the bounded,
documentation-only remediation below. This candidate changes decision-record bytes only in D4 and
D8 under their second explicit bounded reopens; it does not certify the gate. After merge, a fresh
independent reviewer must assess the exact merged commit.

| Finding                             | Owner-approved resolution carried by this candidate                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terminal-liveness contradiction     | Keep the exhaustive V3a and failure taxonomy unchanged; narrow all summary prose to `FC-TRUST` as the sole non-decision terminal selector, interpret liveness loss as `FC-TRUST` only when it destroys the trust root, and add a `CF-CONTAINMENT` oracle that rejects any direct `FC-LIVENESS → Stopped` selection. |
| `PC-*` proof-route completeness gap | Replace the one-route rule with minimal proof-route sets whose elements jointly cover each commitment; widen all eleven reviewer-required rows and the additional rows whose complete commitments require existing suites, governance records, or the narrow existing-suite clause recorded below.                  |

This gate record's unproven-edge inventory records these currently unproven edges: remote execution,
provider-permission enforcement, held merge, Windows host, and transport behavior. `CF-GATE-PROVIDER`
continues to prevent any unproven capability from becoming configurable; this inventory preserves the
specific current limitation rather than implying that the gate proves it.

## Finding-to-resolution record

| Finding | Owner-approved resolution carried by this candidate                                                                                                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `B1`    | Define design-owned `SCH-PLAN`, including stable Stories and edges, policy-check done conditions, track/policy references, digest, and fail-closed validation; delegate only wire encoding.                                              |
| `B2`    | Realize the local-first Execution Host seam inside the `PORT-WORKSPACE` provider family with host identity, posture, replacement, manifest-level swapping, and conformance clauses.                                                      |
| `B3`    | Move integration strategy/merge spectrum into frozen policy, subject to a non-weakening repository floor and `CF-POLICY`.                                                                                                                |
| `B4`    | Define effect-free Envelope Builder preview through `PORT-CONSUMER`, with no Run identity, ledger mutation, intake acknowledgement, or dispatch.                                                                                         |
| `B5`    | Make `SCH-INTAKE-ACK` conditional-create the single intake commit point; derive/recreate the Run ledger and projections after acknowledgement, and start the controller only after it exists.                                            |
| `B6`    | Reconcile authority wording: `CP-FINALIZER` alone proposes target-changing work under sole target authority; `CP-TRANSITION` alone authorizes it in a recorded Transition.                                                               |
| `B7`    | Make the target-authority registry the cross-Run arbiter with comparator-ordered waiters, conditional grant/release, atomic Candidate-changing rebind, and registry-first recovery.                                                      |
| `B8`    | Make forge and privileged-delivery credential classes structurally unrepresentable in Agent manifests and session bindings; reject them as `FC-AUTHORITY` and probe adversarially.                                                       |
| `B9`    | Add `ID-EVENT` and standalone `SCH-EVENT`; define ledger position as the sole trigger order and normalize producer/derivation deduplication.                                                                                             |
| `B10`   | Permit same-identity retry only for effectful Operations after confirmed absence and recorded reauthorization; replace effect-free observations with a new Operation.                                                                    |
| `B11`   | Add `EV-ARTIFACT-FACT` so artifact result/certainty/failure facts commit before evidence-manifest adoption.                                                                                                                              |
| `B12`   | Complete Operation lifecycle coverage for effectful retry plus durable `Superseded` and `Cancelled` outcomes.                                                                                                                            |
| `B13`   | Define the terminal-settlement export cut, keep export receipt/failure obligations post-terminal and outside its range, and add `EV-OBLIGATION-RESOLVED`.                                                                                |
| `B14`   | Route `BND-REFRESH` exhaustion to nonterminal `RefreshPark` with target-instability escalation and no dependent release.                                                                                                                 |
| `B15`   | Require absence of unresolved **blocking** findings in the amendable design views and canonical D7 bytes; severity remains reviewer judgment. The recorded owner-authorized D7 bounded reopen resolves the exact-commit review conflict. |
| `DG1`   | Reserve pre-Run envelope/configuration approval to Arye in v1; keep `ID-GRANT` per-Run and operational-only.                                                                                                                             |
| `DG2`   | Add review-publication retirement Operations for venue, branch, and status markers; failed retirement preserves a Residual Obligation.                                                                                                   |
| `DG3`   | Make the V3a Run-transition contract exhaustive: every edge has one trigger/event candidate, guard, and persisted fact.                                                                                                                  |
| `DG4`   | Add `ID-SESSION` and an exhaustive role-session lifecycle with replacement/result lineage and terminal loss attestation.                                                                                                                 |
| `DG5`   | Add `ID-FINDING` and explicit finding tuple/severity/resolution transitions within `SCH-VERDICT`.                                                                                                                                        |
| `DG6`   | Add owner-reviewable defaults and allowed ranges for evidence size/oversize handling, retention, snapshot cadence, proof freshness, and notice urgency.                                                                                  |
| `DG7`   | Default progress reserve to one slot per configurable scarce class, default per-Story demand to one, declare ranges, preserve the structural finalizer exception, and preflight feasibility.                                             |
| `DG8`   | Bind merge-queue and branch-protection holds to `BND-WAIT-TARGET`.                                                                                                                                                                       |
| `DG9`   | Replace discretionary containment alternatives with fixed failure selectors: park only when recorded owner action can change the outcome; otherwise block, with trust-root failures stopping.                                            |
| `TG1`   | Re-sweep all four product documents, map 44 normative commitments, and refresh every changed carrier row.                                                                                                                                |
| `TG2`   | Add secret-absence, observability, evidence-lifecycle, export-completeness, and fault-to-containment conformance coverage and propagate changed contracts through existing suites.                                                       |
| `TG3`   | Amend D10 canonical bytes from nine to ten ports and define `PORT-CONSUMER` as a private first-party facade with no authority crossing of its own.                                                                                       |
| `TG4`   | Amend D3 canonical bytes to reserve imports, approvals, verdicts, and reopens to Arye; correct stale model/import text and record the bounded reopen.                                                                                    |
| `E1`    | Refresh stale page-local status and `last_verified` metadata without activating the readiness lock.                                                                                                                                      |
| `E2`    | Complete V8 with all cataloged identities, including `ID-EVENT`, `ID-SESSION`, and `ID-FINDING`.                                                                                                                                         |
| `E3`    | Limit `CP-MEDIATOR`'s inbound claim to mediated mechanism ports; preserve the documented `PORT-LEDGER`, intake, decision, and controller-derived paths.                                                                                  |
| `E4`    | Limit `PORT-LEDGER` sole-writer language to the Run Transition ledger and name the separate `LG-INTAKE` and target-registry writers.                                                                                                     |
| `E5`    | Correct non-guarantee product prose: the optional supporting-product artifact chain no longer appears mandatory, and the private MCP adapter is current rather than future.                                                              |
| `E6`    | Correct `PC-JIG-5`: decisions use `EV-OWNER-DECISION`; handoff uses `EV-DELEGATION-GRANT`, `SCH-DELEGATION-GRANT`, and `ID-GRANT`.                                                                                                       |

## Nine settled owner rulings of 2026-07-17

1. The Execution Plan contract is design-owned and non-delegable; only its wire realization is
   delegated.
2. Preview is an effect-free Envelope Builder evaluation, not intake.
3. Integration strategy/merge spectrum is frozen policy, never ordinary configuration.
4. The v1 Execution Host seam is realized inside the workspace provider family; no new port is
   added.
5. The target-authority registry is the cross-Run total-order arbiter, and landing authority uses
   the single proposal-versus-authorization sentence recorded above.
6. Event identity is minted at accepted validation-commit; Run-ledger append position is its
   identity and the sole trigger order. This candidate uses the permitted standalone `SCH-EVENT`
   realization.
7. Same-identity retry is effectful-only after confirmed absence and recorded reauthorization;
   effect-free work is replaced with a new Operation.
8. Refresh exhaustion parks with target-instability escalation and releases no dependents.
9. D3 and D10 are bounded canonical reopens; pre-Run approval remains Arye-only, per-Run grants
   remain operational-only, and `PORT-CONSUMER` is the tenth private facade port.

The later 2026-07-17 owner decision additionally authorizes the one-clause D7 bounded reopen that
resolves B15; it does not alter the nine earlier settled rulings.

## Owner-reviewable defaults selected in this candidate

| Policy class                | Default                                                           | Allowed range or behavior                                                                                 |
| --------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Evidence object size        | 10 MiB                                                            | 64 KiB–1 GiB; policy selects fail-closed rejection or explicit lossy truncation, never silent truncation. |
| Evidence retention          | 90 days                                                           | 7 days–7 years; open preservation obligations override disposal.                                          |
| Snapshot cadence            | 100 records or 5 minutes, whichever occurs first                  | 10–10,000 records and 30 seconds–1 hour.                                                                  |
| Conformance-proof freshness | 24 hours                                                          | 5 minutes–30 days.                                                                                        |
| Notice urgency              | critical immediate; urgent 5 minutes; normal 1 hour; low 24 hours | Critical 0–1 minute; urgent 0–30 minutes; normal 5 minutes–24 hours; low 1 hour–7 days.                   |
| Progress reserve            | 1 slot per configurable scarce class                              | 1 through class capacity minus 1; the singleton `RC-FINALIZER` is structural and excluded.                |
| Story demand                | 1 slot per declared class                                         | Plan/policy may declare a larger feasible demand; preflight rejects infeasible composition.               |

The owning design pages define the precise units, tier ranges, and validation rules. This table
surfaces the latitude exercised for owner review; it does not create a second contract.

## Exact remediation candidate

The exact candidate is the complete merged commit produced by this remediation pull request and is
confined to `docs/redesign/design/`. The imported `docs/product/guarantees.md` bytes and pinned
digest remain unchanged. A review verdict attaches to the complete file digests at that merged
commit, not to this list or to a branch name. Any later byte change invalidates that verdict.

D3, D7, and D10 are already-amended historical baseline records and remain byte-locked in this
candidate, as do D1–D3, D5–D7, and D9–D15. Only D4 and D8 change under the owner-approved second
bounded reopens recorded above; their first-remediation amendments and the D3/D7/D10 amendments are
historical and are not additional authority for this candidate.

## Owner item discovered during exact-commit review — resolved

The authorized B15 change was already present in `acceptance-and-evidence.md` and
`review-and-verification-execution.md`, while the exact-commit review found that canonical D7 still
said Jig validates “unresolved findings.” That conflict was preserved and reported rather than
improvised. Arye then explicitly authorized a bounded D7 reopen on 2026-07-17: the one clause now
requires absence of unresolved blocking findings, while severity classification remains reviewer
judgment. B15 is therefore resolved across the amendable views and canonical decision bytes. This
author resolution does not alter or satisfy the independent post-merge gate requirement.

## Renewed gate requirements

| ID      | Requirement                                                                                                                                                                                                                                                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PR-R1` | All 56 imported guarantee IDs retain one honest `satisfied` or explanatory `note` mapping, with no `gap`, `upstream`, or `conflict`.                                                                                                                                                                                                                                                            |
| `PR-R2` | The product-commitment inventory maps every normative commitment in `README.md`, `jig.md`, `concepts.md`, and `use-cases.md` to a named carrier and non-empty minimal set of proof-route elements — existing conformance suites/clauses, testable oracles/evidence artifacts, or cited static governance records — that jointly cover the complete commitment; every element must pass or hold. |
| `PR-R3` | B1–B15, DG1–DG9, TG1–TG4, and E1–E6 meet their approved closed conditions across states, events, Operations, schemas, ports, capabilities, conformance, decisions, perspectives, and reconciliation.                                                                                                                                                                                            |
| `PR-R4` | Existing stable IDs and imported guarantee statements remain unchanged unless an approved finding explicitly adds a new ID or narrows non-guarantee product wording.                                                                                                                                                                                                                            |
| `PR-R5` | The diff is documentation-only and confined to `docs/redesign/design/`; no product-layer, implementation, archive, delivery, configuration, or greenfield artifact is included.                                                                                                                                                                                                                 |
| `PR-R6` | Formatting, links, repository checks, scoped greps, orphan scan, and a finding-by-finding author acceptance pass succeed.                                                                                                                                                                                                                                                                       |
| `PR-R7` | After merge, a fresh independent reviewer examines the exact merged candidate from an empty-repository implementation-readiness posture and returns `PASS`.                                                                                                                                                                                                                                     |

## Lock and review semantics

Author checks and the per-section acceptance pass establish only that the remediation is ready for
review. They are not the readiness gate and cannot activate the lock. This pull request remains
unmerged until separately authorized. After merge, the independent readiness gate must rerun on
the exact merged commit; only its recorded `PASS` activates the product-readiness lock. Any
blocking finding keeps the lock inactive, and any correction creates a new exact candidate.

## Verification record

The earlier verification and review results remain historical evidence for their exact baselines.
They do not cover this remediation candidate. The pull request carries deterministic author checks
and a B1–E6 acceptance record; the independent post-merge verdict remains deliberately absent.
