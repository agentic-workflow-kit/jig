---
title: "Product readiness gate — ninth remediation candidate"
purpose: Record the prior remediation history, the ninth independent readiness review's closure findings, their owner-approved bounded remediation, and the renewed exact-candidate reviews required after remediation merges.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers awaiting an implementation-ready corpus
scope: The ninth independent readiness review and its 2026-07-17 documentation-only remediation; implementation, archive, greenfield planning, merge authorization, and the renewed review verdict are excluded.
state: current
status: eighth remediation merged; ninth independent review returned FAIL with 6 blockers; owner-approved ninth remediation candidate in progress; readiness lock inactive pending merge and two consecutive independent exact-candidate PASS reviews
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ./product-guarantee-import.md
  - ../product-guarantee-reconciliation.md
  - ./D3-responsibilities-trust-authority.md
  - ./D6-concurrency-and-finalization.md
  - ./D7-acceptance-and-evidence.md
  - ./D10-runtime-decomposition.md
  - ./D15-pre-acceptance-review-publication.md
  - ../../../product/guarantees.md
related:
  - ./review-and-approval-record.md
  - ./layer2-gate-record.md
  - ../README.md
  - ../architecture-conformance.md
  - ../../guidelines/readiness-closure-rubric.md
  - ../delegation-register.md
---

# Product readiness gate — ninth remediation candidate

## Current gate state

The eighth remediation merged as baseline
`14e3de2a9b4fbaac4e40c89b7f077484f2247d0a`, tree
`58ed182e1a9fa29dce8bcce442246a899a5b985f`. Its 66-path normative subject has round-8-v1
manifest digest `40688dce250dd47cf1d418499581bcc5b1a68167bb13753e8c97370c192038df`. A fresh independent
readiness review of that exact subject on 2026-07-17 returned **FAIL** with six in-rubric blockers
and proposed the now-owner-authorized R1.2 amendment. The product-readiness lock therefore remains
**inactive**.

Arye Kogan authorized the bounded ninth-remediation resolutions recorded below. That instruction
does not authorize implementation inspection, archive work, greenfield planning, merge, or
self-certification of readiness. Author checks and the pre-PR independent assessment establish
review readiness only; two consecutive independent post-merge `PASS` reviews of the same exact
commit remain required.

## Historical sixth independent review and remediation

A fresh independent empty-repository readiness review of the round-6 baseline on 2026-07-17
returned **FAIL**: six blocker groups, two delegation gaps, and two traceability gaps. The review
found the issues. **Arye Kogan authorized** every direction, addition-budget use, and bounded
reopen carried by this candidate; no review authorized a design change. This candidate does not
certify the gate. After merge, the normative
[readiness closure rubric](../../guidelines/readiness-closure-rubric.md) requires two consecutive
independent `PASS` reviews of the same exact commit before the readiness lock can activate.

### Sixth-review finding-to-resolution record

| Finding                                                                                      | Verified status                                                                                                                                            | Closing item | Arye Kogan authorization                                                                    |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| 1a — self-referential approval digest                                                        | Verified against the envelope and D13 wording; candidate closure is the two-digest protocol.                                                               | 1            | Authorizes proposal-digest approval and composition-digest submission identity.             |
| 1b — approved requirements have no `SCH-PLAN` carrier                                        | Verified against `RP-PACKAGE` and `SCH-PLAN`; candidate closure adds the frozen plan carrier.                                                              | 2            | Authorizes the design-owned, non-delegable requirements/criteria field extension.           |
| 2a — non-agent reviewer has no session ingress                                               | Verified against the product-permitted reviewer principals and `PORT-SESSION`; candidate closure widens the existing face.                                 | 3            | OD-1: authorizes qualified human-client session mechanisms, not a new decision port.        |
| 2b — compose-time capability proof has no carrier/lifecycle                                  | Verified against the provider requirement; candidate closure adds the one permitted proof schema family and its acquisition/revalidation path.             | 4            | Authorizes the one new `SCH-CAPABILITY-PROOF` family within the round-6 budget.             |
| 3a — suspension releases finalization authority before target effects reconcile              | Verified against the suspend and Operation graphs; candidate closure retains fenced authority until reconciliation or bounded park.                        | 5            | Authorizes the bounded suspend-semantics clarification.                                     |
| 3b — registry waiter cannot withdraw after leaving eligibility                               | Verified against the registry protocol; candidate closure adds the one permitted conditional-append withdrawal record.                                     | 6            | Authorizes the one registry protocol record type within the round-6 budget.                 |
| 3c — accepted successor does not permanently fence predecessor resume                        | Verified against successor intake and resume integrity; candidate closure adds the consumed quarantine-cut rule.                                           | 7            | Authorizes the successor-resumption fence and one-successor cut.                            |
| 4a — intake index is outside witness coverage                                                | Verified against the witness scope; candidate closure makes intake recovery witness-verified.                                                              | 8            | Authorizes the intake witness-coverage extension.                                           |
| 4b — shared evidence disposal has only a Run-scoped guard                                    | Verified against global content addressing and disposal preconditions; candidate closure adds the deployment-wide reference guard.                         | 9            | Authorizes the cross-Run disposal guard.                                                    |
| 5a — reservation is incorrectly described as an Operation intent                             | Verified against the Operation catalog; candidate closure reclassifies reservations as durable Transition facts replayed from the ledger.                  | 10           | Authorizes reclassification only; no Operation is added.                                    |
| 5b — Retirement can strand when its final duty completes after preservation                  | Verified against the Story graph and wake catalog; candidate closure reuses `EV-WAKE-SETTLEMENT` for every duty-completing fact.                           | 11           | Authorizes the existing-event edge and derivation extension.                                |
| 5c — terminal stop cannot reach settlement/export authorization                              | Verified against the stopped-Run path and export identity; candidate closure reuses the settlement duty set, wake event, and terminal-settlement position. | 12           | OD-2: authorizes stopped-Run settlement without new phases, states, events, or Operations.  |
| 6 — non-gating policy surface has no default, forbidden set, validation, or oracle           | Verified against the best-effort clause; candidate closure adds the design-owned forbidden set and fail-closed preflight rule.                             | 13           | Authorizes the design half; the remaining allowed vocabulary is delegated only under DR-11. |
| Delegation gap 2 — checkpoint can be mistaken for session self-report                        | Verified against the profile checkpoint and liveness clauses; candidate closure requires a cataloged mechanism-produced durable event.                     | 14           | Authorizes the checkpoint producer and validation clause.                                   |
| Traceability gap 1 — `PC-*` routes and product gate composition are incomplete/discretionary | Verified by clause-by-clause audit of all 44 commitments; candidate closure records minimal sets and pure-conjunction inputs.                              | 15           | OD-3: retains the 56-ID matrix-plus-suite resolution; no per-ID route ratchet.              |
| Traceability gap 2 — product override has no normative design mapping                        | Verified against the product action and decision schema; candidate closure maps it to a scoped existing owner/delegate decision.                           | 16           | OD-4: authorizes the existing-event mapping with no new decision kind.                      |
| Delegation gap 1 — legitimate implementation seams have no normative closure register        | Verified across the readiness review; candidate closure lands the closure rubric and delegation register.                                                  | 17           | OD-5: adopts the supplied rubric and register, including DR-10 and DR-11.                   |
| Gate convergence/provenance discipline                                                       | Verified against prior record wording; candidate closure records findings as review-found and all directions as Arye-authorized.                           | 18           | Authorizes this bounded record update; it is not a gate verdict.                            |

## Historical third independent review and remediation

A fresh independent empty-repository readiness review of `ee35667b25b20610632dff4673bc1f07f7f9359a`
on 2026-07-17 returned **CHANGES_REQUIRED**. Arye Kogan verified the two findings and authorized
their settled, documentation-only remediation below. This candidate does not certify the gate;
after merge, a fresh independent reviewer must assess the exact merged commit.

| Finding                             | Resolution carried by this candidate                                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Successor-envelope digest collision | Add explicit genesis-or-successor lineage to `SCH-ENVELOPE` and its composition digest; preflight validates the lineage fail-closed, and `CF-ENVELOPE` proves distinct predecessor/reason successors create distinct digests and `ID-RUN`s. |
| `PC-*` proof-route traceability gap | Add one named proof route to every 44-row product-commitment inventory entry and require those routes or their governance records in `CF-GATE-PRODUCT` and this renewed gate.                                                               |

## Historical fourth independent review and remediation

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

## Historical fifth independent review and remediation

A fresh independent empty-repository readiness review of
`22b275075f86d81593ad365124cfec9da844f96d` on 2026-07-17 returned **FAIL**: 8 blockers,
2 delegation gaps, and 1 traceability gap. Arye Kogan verified the findings and approved the
bounded directions carried by this documentation-only candidate. The review found the issues; the
owner authorized their remediation. This candidate reopens only D8 under its third bounded reopen,
does not certify the gate, and requires a fresh independent reviewer to assess the exact merged
commit after merge.

## Fifth-review finding-to-resolution record

| Finding                     | Owner-approved resolution carried by this candidate                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Rejected intake spawning | Accepted acknowledgement conditions every Run-ledger/controller derivation; rejected acknowledgement is terminal and derives neither.                                            |
| 2. Acceptance invalidation  | Exact invalidating owner decisions take affected `Accepted`, `Waiting`, and `Finalizing` Stories to `Reviewing` with a fresh `RP-PACKAGE`; only `Finalizing` releases authority. |
| 3. Target-refresh alignment | `OPC-SESSION-ASSIGN` supports bounded re-dispatch, then a new Candidate and target-observation fact with retained authority and atomic rebind.                                   |
| 4. Post-terminal export     | The closed post-terminal administrative regime authorizes the create-once export/receipt path without changing the business-final cut.                                           |
| 5. Evidence disposal        | `OPC-ART-DISPOSE` requires artifact-bound owner authorization, certainty reconciliation, and preservation, retention, and no-open-obligation guards.                             |
| 6. Session lifecycle facts  | `EV-SESSION-FACT` carries all eight attestation kinds and every session-lifecycle row names its committing event.                                                                |
| 7. Successor quarantine     | `predecessorQuarantineCut` is lineage-bound, fail-closed at intake, and covered by the composition digest.                                                                       |
| 8. Two-phase trust stop     | `FC-TRUST` fences and halts first; `Stopped` records only on a trustworthy witnessed append basis or through external recovery.                                                  |
| 9. Qualifying progress      | `BND-IDLE` is an exhaustive digest-bound predicate over four qualifying fact classes, excluding message, token, and provider self-report volume.                                 |
| 10. Principal/read scopes   | The local OS-user plus configured-key trust root, fail-closed caller binding, reader scopes, and adversarial probes are explicit.                                                |
| 11. Pre-Run source deadline | `BND-WAIT-MECHANISM` and `CF-MECH-SOURCE` cover each `PORT-SOURCE` attempt and pre-Run exhaustion.                                                                               |

## Prior finding-to-resolution record

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

## Historical first-remediation owner-reviewable defaults

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

## Historical first-remediation exact candidate

That exact candidate was the complete merged commit produced by the first-remediation pull request
and was confined to `docs/redesign/`. The imported `docs/product/guarantees.md` bytes and pinned
digest remained unchanged. Its review verdict attached to the complete file digests at that merged
commit, not to this list or to a branch name; later byte changes superseded it.

All decision records except D13 remained byte-locked in that first-remediation candidate. D13
changed only under its then-current owner-approved bounded reopen; the earlier D4/D8 and D3/D7/D10
amendments were historical and supplied no additional authority.

## Historical first-remediation exact-commit owner item — resolved

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
| `PR-R5` | The diff is documentation-only and confined to `docs/redesign/`; no product-layer, implementation, archive, delivery, configuration, or greenfield artifact is included.                                                                                                                                                                                                                        |
| `PR-R6` | Formatting, links, repository checks, scoped greps, orphan scan, and a finding-by-finding author acceptance pass succeed.                                                                                                                                                                                                                                                                       |
| `PR-R7` | After merge, two consecutive independent reviewers examine the same exact merged candidate from an empty-repository implementation-readiness posture and return `PASS` under the readiness closure rubric.                                                                                                                                                                                      |

## Lock and review semantics

Author checks and the per-section acceptance pass establish only that the remediation is ready for
review. They are not the readiness gate and cannot activate the lock. This pull request remains
unmerged until separately authorized. After merge, the independent readiness gate must rerun on
the exact merged commit; only two consecutive independent `PASS` verdicts on that same commit
activate the product-readiness lock. Any blocking finding keeps the lock inactive, and any
correction creates a new exact candidate.

## Verification record

The earlier verification and review results remain historical evidence for their exact baselines.
They do not cover this remediation candidate. The pull request carries deterministic author checks
and a B1–E6 acceptance record; the independent post-merge verdict remains deliberately absent.

## Historical seventh independent review and remediation

The first independent review under [readiness closure rubric v1](../../guidelines/readiness-closure-rubric.md)
ran in Mode 1 (report-only) on 2026-07-17 and returned **FAIL** with 12 blockers, one
rubric-amendment proposal, and one editorial item. The review found these items; the coordinating
review verified them against the exact candidate. **Arye Kogan authorized** every ruling, the
round-scoped addition budget, and the rubric amendment. No review authorized a design change.
This seventh remediation candidate does not certify the gate; readiness lock remains inactive
until two consecutive independent `PASS` reviews assess the same exact merged commit.

### Seventh-review finding-to-resolution record

| Item | Finding or record                                                                                    | Candidate resolution                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | V9a edges were not bound to cataloged durable facts.                                                 | Bind every projection edge to its committing Transition, Operation, port fact, certainty/recovery fact, or suspend/stop/replacement Transition. |
| 2    | Six session/workspace Operations lacked an authorizing Transition mapping.                           | Map each existing Operation to the existing Story/Run Transition whose recorded intent dispatches it.                                           |
| 3    | Schema-family producers were not named consistently.                                                 | Add family-level producers, with field-level splits only where a family's fields have different producers.                                      |
| 4    | Digest-bound presets and prompt/role artifacts lacked a canonical carrier.                           | Add the budgeted immutable, digest-verified `SCH-CONFIG-ARTIFACT` carrier through `PORT-ARTIFACT`.                                              |
| 5    | Record and acknowledgement hash domains, and `ID-RUN` derivation, were underdefined.                 | State digest-free hash domains and derive the Run token from the intake create position plus the envelope-composition digest prefix.            |
| 6    | Some finalization-authority-release edges lacked the reconciliation prerequisite.                    | Apply the retained-but-fenced prerequisite or a structural no-effect proof to every such edge.                                                  |
| 7    | Capacity waiting lacked a bound class.                                                               | Add the budgeted `BND-WAIT-CAPACITY` class with its owner, wake, range, exhaustion, and no-renewal rule.                                        |
| 8    | `Suspended` lacked a durable release trigger after its final fenced Operation reconciled.            | Add the existing-fact-triggered, phase-preserving reconciliation Transition and its dispatch-free duty rule.                                    |
| 9    | Rejected intake and unwitnessable `FC-TRUST` halt lacked explicit no-settlement/export dispositions. | State their no-export rules and make terminal-settlement position the audit-export precondition.                                                |
| 10   | Six compound product-commitment proof routes were incomplete.                                        | Widen the named proof routes with their required independence, separation, governance, control, recovery, and capacity elements.                |
| 11   | Three policy classifications relied on an implicit default.                                          | Require explicit, fail-closed frozen-policy selection and add the corresponding `CF-POLICY` oracle.                                             |
| 12   | R2.1 and R7.1 needed owner-ruled closure-rubric wording.                                             | Record the authorized two-clause amendment, including explicit selection as the permitted default substitute.                                   |
| 13   | The design and, where still stale, decisions indexes described the sixth candidate as pending.       | Refresh the current-state status lines without changing a decision record.                                                                      |
| 14   | This gate record lacked the round-7 provenance, rulings, and closure account.                        | Append this report-only review record, resolution table, budget, and amendment reference.                                                       |

### Owner rulings and round-7 addition budget

| Ruling | Arye Kogan authorization                                                                                                                                                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OD-A` | R2.1 uses family-level producer naming; a field-level producer is required only where one family's fields differ.                                                                                                                                                                |
| `OD-B` | Add only `SCH-CONFIG-ARTIFACT` for canonical preset and prompt/role artifact content.                                                                                                                                                                                            |
| `OD-C` | A required explicit selection whose omission fails preflight closed substitutes for a default for the named policy classifications.                                                                                                                                              |
| `OD-D` | Amend only R2.1 and R7.1 under rubric procedure point 7.                                                                                                                                                                                                                         |
| `OD-E` | Use only one new schema family, one new bound class, and lifecycle edges between existing states triggered by existing events; add zero events, Operations, ports, runtime units, Run phases, Story states, failure codes, principals, conformance suites, or global components. |

The amendment is recorded in [readiness closure rubric v1](../../guidelines/readiness-closure-rubric.md)
under procedure point 7. The budget permits `SCH-CONFIG-ARTIFACT`, `BND-WAIT-CAPACITY`, and the
specified existing-event lifecycle edges only; all other additions remain prohibited for this
round.

## Eighth independent review — remediation in progress

The seventh remediation merged at baseline
`30129ea6148c1c81b30e27e291caecb85665ba55`, tree
`19bbd99a9c1f16dd91b9b90b76f1b2abd1d5aa2d`. A fresh independent readiness review of that exact
subject on 2026-07-17 returned **FAIL** with eleven in-rubric blockers. It also proposed one
non-blocking R1.2 rubric amendment and reported two editorial groups. The review found the issues;
it did not authorize a design change.

Arye Kogan's 2026-07-17 instruction to plan, fix, verify from the initial prompt's readiness phase,
and open a pull request only after verification authorizes the bounded documentation remediation
recorded below. It does not authorize implementation inspection, archive work, merge, or readiness
self-certification. This candidate remains review-readiness work with no lock effect.

### Eighth-review finding-to-resolution record

| Item | Clause    | Countable finding                                                                                        | Owner-authorized candidate resolution                                                                                                                                                                                                                                              |
| ---: | --------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | R1.3      | Five Operations lack named authorizing Transitions.                                                      | Make the Operation-to-authorizing-Transition inventory exhaustive for all 29 existing `OPC-*` Operations, including the five omitted session, setup, and verification Operations.                                                                                                  |
|    2 | R1.4      | Role-session terminal disposition and legal post-terminal appends are incomplete.                        | Define one terminal/closed disposition with the finite causes `replaced`, `cancelled`, `lost-attested`, and `completed-close`; enumerate the legal terminal append behavior without adding a session state.                                                                        |
|    3 | R2.1      | `SCH-CAPABILITY-PROOF` producer naming contradicts its owning contracts.                                 | Name the configured provider as source and `EP-PROVIDERS` as assembler/validator of the immutable proof carrier.                                                                                                                                                                   |
|    4 | R2.1      | `SCH-EVIDENCE` producer split omits manifest assembly and binding by `CP-EVIDENCE`.                      | Distinguish the mechanism-produced evidence bytes from `CP-EVIDENCE` assembly/binding and `CP-TRANSITION` adoption.                                                                                                                                                                |
|    5 | R2.1      | `SCH-AUDIT-EXPORT` names `CP-TRANSITION` as producer instead of `CP-PROJECTION`.                         | Distinguish `CP-PROJECTION` derivation, `CP-EVIDENCE` assembly, and `CP-TRANSITION` adoption of the authorized post-terminal append.                                                                                                                                               |
|    6 | R2.2/R2.3 | Registry waiter, withdrawal, grant, release, and atomic-rebind records lack a carrier and digest domain. | Add dedicated tagged-union `SCH-REGISTRY-RECORD`; derive expected-position-plus-one before hashing its non-self-referential staged domain, then use the committed-position-plus-digest handle; add no standalone registry identity.                                                |
|    7 | R3.1      | Arye-only pre-Run approval has no ingress port.                                                          | Reuse the private first-party `PORT-CONSUMER` facade for authenticated `EP-APPROVE` proposal approval; retain `P-OWNER` and `SCH-ENVELOPE`, and add no decision event, Run grant, or port.                                                                                         |
|    8 | R3.3      | D6 and its Layer 1 view contradict the retained-but-fenced suspension rule.                              | Narrowly reopen D6's suspension-release sentence and align both pages: authority remains retained-but-fenced until effect reconciliation or a terminal governance disposition preserves or externally transfers the fence.                                                         |
|    9 | R5.1      | Capability-proof acquisition has retries but no exact bounded attempt.                                   | Bind every exact proof request/attempt to existing `BND-WAIT-MECHANISM` and `BND-RETRY`; exhaustion fails composition or preflight before a Run exists.                                                                                                                            |
|   10 | R5.1      | Pre-Run configuration-artifact reads have no response deadline or exhaustion action.                     | Reuse the existing `SCH-INTAKE-ACK` family for immutable pre-ack start/result variants through `PORT-ARTIFACT`; deterministic keys and predecessor proof preserve bounds across loss/crash, the `terminal-ack` binds the chain, and exhaustion rejects intake before Run creation. |
|   11 | R5.1      | The finalization-authority queue bounds the holder, not its queued waiter.                               | Store the wait basis and continuous-starvation start in `SCH-REGISTRY-RECORD`; bind the waiter to existing `BND-WAIT-CAPACITY`, with release/eligibility wakes and deterministic park/escalation on exhaustion.                                                                    |

### Round-8 owner rulings and addition budget

The instruction above adopts the smallest closure set proposed by the verified Round-8 ledger:

1. add only `SCH-REGISTRY-RECORD` as the registry carrier, with no new `ID-*` family;
2. reopen only D6's contradictory suspension-release sentence;
3. use only existing `BND-WAIT-MECHANISM`, `BND-RETRY`, and `BND-WAIT-CAPACITY` classes for the
   three uncovered wait surfaces;
4. use existing `PORT-CONSUMER` for authenticated Arye-only pre-Run approval;
5. express role-session terminality as one disposition with finite causes, not a new state; and
6. add zero events, Operations, ports, bound classes, Run phases, Story states, failure codes,
   principals, conformance suites, runtime units, or global components.

The non-blocking R1.2 amendment proposal is not part of this candidate because the exact amendment
text was not supplied. That omission cannot be converted into a blocker under the current rubric.
The editorial groups are closed by refreshing current-status navigation and by stating
`ID-EXPORT`'s complete terminal-settlement-position plus export-basis digest domain and path.

### Round-8 exact-subject and verification discipline

The normative subject remains the complete tracked set under `docs/product`,
`docs/redesign/design`, and `docs/redesign/guidelines`, not merely the changed files. For this round,
manifest algorithm `round-8-v1` is the SHA-256 of the byte serialization produced by:

```bash
git ls-files -z docs/product docs/redesign/design docs/redesign/guidelines |
  LC_ALL=C sort -z |
  xargs -0 shasum -a 256 |
  shasum -a 256
```

The baseline subject contains 66 paths and has digest
`bbd107fb406004c0a046e4f280a388c4ac3c316fc042fdf1b0d0740be4030592`. The candidate commit, tree,
path count, manifest digest, docs-only checks, deterministic catalog/schema/bound counts, and
finding-by-finding R1–R7 author self-gate are generated after the candidate is frozen and carried
as pull-request evidence; they are not embedded self-referentially in these candidate bytes.

Before the pull request opens, an independent reviewer must assess that frozen commit using only
the initial prompt's readiness phase and the exact normative subject. That assessment is explicitly
**advisory and non-gating**. It may prevent publication of a deficient candidate, but it cannot
activate the product-readiness lock. After merge, two consecutive independent sessions must still
return `PASS` on the same exact merged commit, tree, and manifest before the lock can activate.

## Ninth independent review — remediation in progress

The eighth remediation merged at baseline
`14e3de2a9b4fbaac4e40c89b7f077484f2247d0a`, tree
`58ed182e1a9fa29dce8bcce442246a899a5b985f`. Its complete 66-path normative subject has
round-8-v1 manifest digest `40688dce250dd47cf1d418499581bcc5b1a68167bb13753e8c97370c192038df`.
A fresh independent review of those exact bytes on 2026-07-17 returned **FAIL** with six in-rubric
blockers. It also proposed the R1.2 amendment recorded below. The review found these items; it did
not authorize a design change.

Arye Kogan's 2026-07-17 instruction authorizes the bounded documentation remediation, one-row
ledger-contract budget, and exact rubric amendment recorded here. It does not authorize a decision
record reopen, implementation work, merge, archive work, or readiness self-certification. This
candidate remains review-readiness work with no lock effect.

### Ninth-review finding-to-resolution record

| Item | Clause | Countable finding                                                                                                                    | Owner-authorized candidate resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Joined files                                                                                                                                                                                                                                                                                                                          |
| ---: | ------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | R1.3   | Pre-Run configuration-read and capability-proof durable attempts crossed neither an Operation nor a commit-primitive-class contract. | Define their shared immutable conditional-create/readback protocol as `LG-PREFLIGHT-ATTEMPT`; require deterministic start/result variant keys, byte-equivalent same-variant-key replay, predecessor and deadline proof, and fail-closed mismatch, loss, tampering, or exhaustion. It creates no event, Operation, Run, Transition, authority, or dispatch. Classify snapshot, archive, and backup writes as subordinate physical-storage maintenance under the existing commit, projection, and recovery contracts rather than independent external acts. | `persistence-and-projections.md`, `data-and-identity.md`, `runtime.md`, `scheduling-and-bounds.md`, `components/control-plane.md`, `flows/run-and-story-lifecycle.md`, `mechanism-and-provider-contracts.md`, `envelope-production.md`, `lifecycle-catalogs.md`, `architecture-conformance.md`, `product-guarantee-reconciliation.md` |
|    2 | R1.4   | The declared Residual Obligation statuses had no closed lifecycle; finding resolution after reopen was also missing.                 | Add the complete open, accepted-handoff, and resolved obligation-status lifecycle, including entry, legal exits, triggers, settlement effect, duplicate behavior, terminality, and post-terminal behavior; add reopened-to-resolved finding closure.                                                                                                                                                                                                                                                                                                      | `data-and-identity.md`, `lifecycle-catalogs.md`, `flows/run-and-story-lifecycle.md`, `review-and-verification-execution.md`, `failure-and-liveness.md`, `operations-and-observability.md`, `architecture-conformance.md`                                                                                                              |
|    3 | R2.3   | The intake terminal acknowledgement had to bind fields that exist only after its own durable create.                                 | Stage a pre-create acknowledgement content digest over canonical terminal content while excluding its own digest, `ID-RUN`, assigned intake position, and derived create/lookup/witness handles; after create, bind the position-plus-content-digest tuple, then derive `ID-RUN` and the proof bindings.                                                                                                                                                                                                                                                  | `data-and-identity.md`, `persistence-and-projections.md`, `architecture-conformance.md`                                                                                                                                                                                                                                               |
|    4 | R3.1   | Provider-authority-manifest approval named owner approval fields but no authenticated ingress.                                       | Add a distinct method on existing `PORT-CONSUMER`, bound to Arye's configured principal and the exact manifest digest and scope; validate and return the existing approval fields, keep it non-delegable and distinct from envelope-proposal approval, and make any content change invalidate approval.                                                                                                                                                                                                                                                   | `data-and-identity.md`, `runtime.md`, `mechanism-and-provider-contracts.md`, `envelope-production.md`, `architecture-conformance.md`, `product-guarantee-reconciliation.md`                                                                                                                                                           |
|    5 | R4.2   | Artifact disposal checked only evidence and export manifests although the shared content-addressed namespace had other live holders. | Make the live-holder list exhaustive; make pre-Run configuration, attempt, and proof references monotonically non-disposable; and require a deployment-wide reverse-reference pin before every disposable reference becomes live, with atomic pin-versus-dispose behavior and byte-identical-digest protection.                                                                                                                                                                                                                                           | `data-and-identity.md`, `runtime.md`, `evidence-handling.md`, `lifecycle-catalogs.md`, `mechanism-and-provider-contracts.md`, `architecture-conformance.md`                                                                                                                                                                           |
|    6 | R6.1   | Four of 44 product-commitment routes did not cover their complete compound promise or were non-minimal.                              | Widen `PC-JIG-1` to cover envelope, acceptance, policy, control, landing, notice/export, and observability; bind both outcome-projection rows to the canonical projection; replace the Track route's unnecessary capacity element with the governing Track and independent-controller boundaries.                                                                                                                                                                                                                                                         | `product-guarantee-reconciliation.md`, `architecture-conformance.md`, this gate record                                                                                                                                                                                                                                                |

### Owner directions and round-9 addition budget

The owner-directed shape of this remediation is:

1. treat both durable pre-Run attempt families as one commit-primitive-class protocol, optionally
   using the sole budgeted ledger-contract row;
2. close every lifecycle enumeration found by the schema-family sweep, including obligations and
   reopened findings;
3. apply the existing registry staged-digest pattern to the intake terminal acknowledgement;
4. use existing `PORT-CONSUMER` for a distinct, Arye-only exact-manifest approval method;
5. enumerate every live digest-holder class in the shared namespace and close the disposal race;
6. re-audit all 44 product-commitment routes for full compound-clause coverage and minimality; and
7. adopt only the exact R1.2 amendment below under rubric procedure point 7.

The addition budget is exactly one new ledger-contract row, `LG-PREFLIGHT-ATTEMPT`. The candidate
adds zero events, Operations, ports, runtime units, control-plane components, Run phases, Story
states, failure codes, bound classes, conformance suites, principals, schema families, or other
identifier families. D1–D15 remain byte-locked. New rows and clauses within existing families do
not widen that budget.

### R1.2 owner-ruled amendment

Under readiness-rubric procedure point 7, the owner authorized replacing only R1.2 with this exact
text:

> Every trigger consumed by a cataloged lifecycle or administrative Transition is a cataloged
> event. Every cataloged event names at least one consuming Transition or an explicit named
> non-Transition consumer; every event that advances lifecycle state appears as a trigger on at
> least one state-changing Transition.

The joined replicas are `readiness-closure-rubric.md`, `lifecycle-catalogs.md`,
`operations-and-observability.md`, `components/control-plane.md`, `architecture-conformance.md`,
and this gate record.

The candidate closes the new reverse direction by mapping every cataloged event to a cataloged
lifecycle, phase-preserving, post-terminal administrative, or control-administrative Transition and
by retaining a state-changing Transition for every lifecycle-advancing event. No other rubric or
guideline text changes in this round.

The author census derives 32 distinct cataloged events and 32 distinct Transition triggers, with no
uncataloged trigger and no catalog event lacking a consuming Transition. The 26 events that advance
lifecycle or obligation status are all state-changing Transition triggers; the other six trigger
only phase-preserving or administrative Transitions. These counts are re-derived from the frozen
candidate for the pull-request self-review; they are author evidence, not a gate verdict.

### Round-9 44-route audit record

The author audit extracted the 44 commitment identities from the reconciliation inventory and the
44 route identities from its minimal-route table, verified equal ordered sets with no duplicates,
then split every commitment at conjunctions and outcome alternatives. Each atomic clause was mapped
to a named suite or governance carrier. Every route element then underwent a deletion test: removal
had to leave an atomic clause uncovered, while the full set had to cover every clause. The result
was 40 unchanged routes and four corrected routes: `PC-JIG-1`, `PC-CONCEPTS-7`, `PC-CONCEPTS-8`,
and `PC-CONCEPTS-9`. The identity-set check and incorporation of all 44 routes into
`CF-GATE-PRODUCT` were rerun after correction.

This is an author audit, not a readiness verdict. Candidate commit, tree, manifest digest, full
checks, budget diff, and adversarial self-review iterations are generated only after the candidate
is frozen and are carried as pull-request evidence rather than embedded self-referentially here.
No entry in this section records `PASS` or activates the readiness lock; after merge, the same exact
merged bytes still require two consecutive fresh independent `PASS` reviews.
