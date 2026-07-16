---
title: "Layer 2 review and approval record"
purpose: Own the Layer 2 gate state, candidate enumeration, deferral-coverage traceability, and review history.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
scope: The Layer 2 gate only; Layer 2 content lives in the design pages, and the Layer 1 gate lives in the Layer 1 review and approval record.
state: current
status: gate record — the corrected candidate passed the 2026-07-16 round-4 verification recheck, and Arye explicitly approved Layer 2 (approved, not locked) the same day
owner: Arye Kogan
last_verified: 2026-07-16
sources_of_truth:
  - ./review-and-approval-record.md
  - ./D9-invariants-and-artifact-shape.md
  - Explicit owner continuation instruction, 2026-07-15
related:
  - ./README.md
  - ../README.md
  - ../invariants.md
---

# Layer 2 review and approval record

## Current gate state

- **Authorization:** The explicit owner continuation instruction of 2026-07-15, recorded in the
  [Layer 1 record](./review-and-approval-record.md#owner-continuation-authorization-2026-07-15),
  authorizes Layer 2 authoring against the approved and locked Layer 1, with D1–D9 and I1–I21 as
  fixed inputs.
- **Current state:** Approved, not locked. The complete candidate set below was authored on
  2026-07-15; the independent review recorded below returned `PASS` the same day; Arye's PR #84
  review findings were resolved through four correction passes; and the explicit owner decision of
  2026-07-16 approved the corrected candidate without locking it. No locked Layer 1 decision, invariant, view, or model content was modified. Two locked
  navigation artifacts — the [design index](../README.md) and the [decision index](./README.md) —
  were extended with additive Layer 2 navigation (the Layer 2 document map, the gate-status row,
  and the D10–D12 section) under the Layer 1 record's post-verdict record-keeping rule; the
  reviewed Layer 1 digests of both files remain recorded in the
  [Layer 1 record](./review-and-approval-record.md), so the exact locked baseline stays
  verifiable. Any material change to locked content still requires a Layer 1 reopen (I21).
- **Owner review (2026-07-15, PR #84):** After the independent `PASS`, Arye reviewed the exact
  head `4b68515786aaa4d73ba96118bb7a9eaa4a332c29` and returned **ten blocking findings** (recorded
  below with dispositions). All ten were resolved by the corrections recorded below; per
  exact-candidate semantics the earlier independent `PASS` applies only to its recorded baseline
  and does not transfer to the corrected candidate.
- **Gate closure (2026-07-16):** The fourth correction pass passed the verification recheck
  recorded below, and Arye explicitly approved the Layer 2 candidate the same day — **approved,
  not locked**. The four non-blocking independent-review notes were presented with the candidate
  and accepted as non-blocking. The approval applies to the exact finalized candidate identified
  by the digests in the round-4 record below.
- **Fixed-input result:** Authoring surfaced no conflict requiring `OWNER_DECISION_REQUIRED`;
  every page elaborates deferred mechanisms without changing an owner decision or invariant.

## Candidate set

The Layer 2 candidate is exactly these files:

1. `docs/redesign/design/runtime.md` (views V6, V6a)
2. `docs/redesign/design/components/control-plane.md` (V7)
3. `docs/redesign/design/data-and-identity.md` (V8)
4. `docs/redesign/design/lifecycle-catalogs.md` (V9, V9a)
5. `docs/redesign/design/scheduling-and-bounds.md` (V10)
6. `docs/redesign/design/persistence-and-projections.md` (V11)
7. `docs/redesign/design/mechanism-and-provider-contracts.md` (V12)
8. `docs/redesign/design/evidence-handling.md` (V13)
9. `docs/redesign/design/review-and-verification-execution.md` (V14)
10. `docs/redesign/design/forge-and-landing.md` (V15)
11. `docs/redesign/design/operations-and-observability.md` (V16)
12. `docs/redesign/design/architecture-conformance.md` (V17)
13. `docs/redesign/design/decisions/D10-runtime-decomposition.md`
14. `docs/redesign/design/decisions/D11-ledger-realization.md`
15. `docs/redesign/design/decisions/D12-mechanism-contract-model.md`

The exact reviewed baseline (commit and per-file digests) is recorded with each review below.

## Deferral-coverage traceability

Each D9 deferral category is consumed by a named owning page:

| D9 category                                                       | Owning Layer 2 page                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1 — component, port, package, process, deployment decomposition   | [Runtime architecture](../runtime.md) and [control plane](../components/control-plane.md) |
| 2 — schemas                                                       | [Data and identity](../data-and-identity.md)                                              |
| 3 — exhaustive state machines, catalogs, failure taxonomy         | [Lifecycle catalogs](../lifecycle-catalogs.md)                                            |
| 4 — retry/wait/queue/reservation/capacity algorithms and budgets  | [Scheduling and bounds](../scheduling-and-bounds.md)                                      |
| 5 — ledger technology, snapshots, projections, backup, migration  | [Persistence and projections](../persistence-and-projections.md)                          |
| 6 — controller/Operation/authority/Candidate/fence representation | [Data and identity](../data-and-identity.md)                                              |
| 7 — provider idempotency, lookup, reconciliation, reconnection    | [Mechanism and provider contracts](../mechanism-and-provider-contracts.md)                |
| 8 — evidence storage, integrity, redaction, retention             | [Evidence handling](../evidence-handling.md)                                              |
| 9 — reviewer protocol, policy language, verification execution    | [Review and verification execution](../review-and-verification-execution.md)              |
| 10 — forge Operations, merge strategies, landing-proof algorithms | [Forge and landing](../forge-and-landing.md)                                              |
| 11 — credentials, delegation, sandboxing, capability binding      | [Mechanism and provider contracts](../mechanism-and-provider-contracts.md)                |
| 12 — escalation, operator tooling, read models, alerts            | [Operations and observability](../operations-and-observability.md)                        |
| 13 — architecture verification and conformance suites             | [Architecture conformance](../architecture-conformance.md)                                |

Per-D-record "deliberate Layer 2 deferral" items map into the same pages: D2/D3 decomposition and
enforcement into categories 1 and 11, D4 exhaustive lifecycle into category 3, D5 persistence and
fences into categories 5 and 6, D6 scheduling into category 4, D7 evidence/review/landing into
categories 8–10, and D8 failure mechanics into categories 3, 4, and 12.

## Layer 2 gate items

| Gate item                                                                     | Requirement                                                                                               |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| L2-R1 — every D9 category is consumed or explicitly re-deferred with a reason | The coverage table above holds under inspection of each page.                                             |
| L2-R2 — no fixed input changed                                                | D1–D9 and I1–I21 are preserved exactly; conflicts were escalated, not resolved in place.                  |
| L2-R3 — one coherent Layer 2 model                                            | `RT-*`, `PORT-*`, `CP-*`, and the page-scoped ID families are collision-free and used consistently.       |
| L2-R4 — view discipline                                                       | Every page and diagram carries the communication contract, one level, legends, and validated Mermaid.     |
| L2-R5 — altitude discipline                                                   | No implementation or current-state claims; numeric limits are policy-supplied bound classes.              |
| L2-R6 — invariant preservation is argued, not asserted                        | Each page names the invariants its mechanisms preserve, and the conformance page makes I1–I21 executable. |
| L2-R7 — proposed decisions carry alternatives and costs                       | D10–D12 record rejected alternatives and accepted negative consequences.                                  |

## Review history

### Independent Layer 2 review (2026-07-15)

- **Reviewer:** Independent, read-only reviewer session (Claude Opus 4.8), not an author of any
  candidate file; bounded to judging coherent, altitude-correct elaboration that preserves the
  fixed inputs, with no decision-selection authority.
- **Verdict:** `PASS` on the exact 15-file candidate at the baseline below. Zero blocking
  findings; zero `OWNER_DECISION_REQUIRED` findings.
- **Gate-item evidence:** All 15 candidate files were read in full. All 13 D9 categories traced to
  their owning pages with none silently re-deferred (L2-R1). Fixed-input hunts confirmed the
  policy floor (I9), release only on confirmed landing (I13), no second semantic effect before
  reconciliation (I17), sole lifecycle authority (I3), cleanup unable to reverse landing (I18),
  bounded waits with exhaustion actions (I16), and no Jig re-judgment of reviewer sufficiency
  (I8) (L2-R2). The `RT-*`/`PORT-*`/`CP-*` model and all page-scoped ID families were verified
  collision-free with resolving cross-references, and cited Layer 1 IDs confirmed against the
  locked pages (L2-R3). All views V6–V17 carry the communication contract and legends, with
  representative diagrams re-validated (L2-R4). Altitude and bound-class discipline confirmed
  (L2-R5). All 21 invariants explicitly accounted for by suites or reasoned gate coverage
  (L2-R6). D10–D12 carry rejected alternatives and accepted costs (L2-R7).
- **Non-blocking notes (no gate item failed):**
  1. The design-index Layer 2 map row for lifecycle catalogs omitted the `V9a` label (index nit;
     corrected in the index after the review — the candidate files are unchanged).
  2. `architecture-conformance.md` covers governance invariants I1 and I21 through the gate and
     review mechanism rather than an executable suite, with explicit reasoning; I4–I20 map to
     dedicated suites and I2/I3 to structural plus per-port coverage.
  3. In V9, the `Accepted` to `Waiting for finalization` transition reuses the accepting event as
     a modeling simplification of an internal derived step.
  4. `evidence-handling.md` names SHA-256 for artifact digests while sibling pages keep ledger
     digests generic; a specificity variance within category 8 ownership, not a contradiction.
- **Effect:** The gate advanced to the owner stop. This `PASS` confirms faithfulness of the
  candidate it examined; it approves and locks nothing, and it does not transfer to the corrected
  candidate produced by the owner review below.

#### Reviewed baseline

Repository `HEAD` `3cd8103d03f0bca462a20687d4fa0b32d69b3e1c`, working tree clean before and after
the read-only review. Commit identifiers may not survive squash-based landing; the per-file
SHA-256 digests below are the durable identification of the exact reviewed content.

| Reviewed file                                                    | SHA-256                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/redesign/design/runtime.md`                                | `09a7fb0d087d7c15d97da67373539ee003d313c9c6f5032643b883da848c65ce` |
| `docs/redesign/design/components/control-plane.md`               | `cbadc8da0fc51547cb921f745e3b11d0df2eaf5fbaff0a02ef33e2fe43b1b8f7` |
| `docs/redesign/design/data-and-identity.md`                      | `417db9acbae50827d9cdd20e5d85e9399a44f2c8f1ccd2990079faf7b79b8e56` |
| `docs/redesign/design/lifecycle-catalogs.md`                     | `539ac4d35e24784af26d22e2235664f7a91798cbc6ae409fa21abe9748cd6f7b` |
| `docs/redesign/design/scheduling-and-bounds.md`                  | `e019a6aacfac432f9a3d53b49759cb478054e4ca99875fefb4a13228c071a966` |
| `docs/redesign/design/persistence-and-projections.md`            | `ca4460f8df50a5a21e6b909d030b31a5e1dd288443ebda675632af68d3705728` |
| `docs/redesign/design/mechanism-and-provider-contracts.md`       | `badc1f566a1326128c6094bf01a567dc077a83074531752f646506ece010bf5c` |
| `docs/redesign/design/evidence-handling.md`                      | `845d80e7ab8f6f531fc63aa255ca619cde5391256f3ee744b348f450b05e7da3` |
| `docs/redesign/design/review-and-verification-execution.md`      | `8763878e6be57a215bb69986c7d929e89cea3b5f4cb33b3a279714a7ceb12294` |
| `docs/redesign/design/forge-and-landing.md`                      | `a10116b9a303dc0ef5827d9d14a89791f8748b774913fba8332b32de8068787f` |
| `docs/redesign/design/operations-and-observability.md`           | `690bbfada5faefb73308711883c59f091791f7d67c453de4a1167368c9a1336e` |
| `docs/redesign/design/architecture-conformance.md`               | `1cd10c92e9dc806c023104706bb97424b6188c61df8eedc76e25fd03a9e93be0` |
| `docs/redesign/design/decisions/D10-runtime-decomposition.md`    | `9816b8a23714711d8c59304632329d24fdb3650983468f1714212c432dfc19fd` |
| `docs/redesign/design/decisions/D11-ledger-realization.md`       | `04f16c754a5dff3539f236f1aa2a30362e59cf4363c01de5672c14bcb113646b` |
| `docs/redesign/design/decisions/D12-mechanism-contract-model.md` | `d77e9b9b0e99e585bb2ae95bd70514d2f6783135c6c48868ed006a37e0f0feee` |

### Owner review (2026-07-15, PR #84)

- **Reviewer:** Arye Kogan, product and architecture decision owner; high-effort review of exact
  head `4b68515786aaa4d73ba96118bb7a9eaa4a332c29` posted on pull request #84.
- **Verdict:** Ten blocking findings; all confirmed and all resolved in the correction change set
  recorded by the PR history. Dispositions:
  1. **Target authority Run-scoped (QS4, I12):** `ID-TARGET` is now canonical and cross-Run, and
     `ID-AUTH` ordinals are allocated from a shared durable target-authority registry; preflight
     rejects Runs whose target no registry can arbitrate (data-and-identity, persistence, runtime).
  2. **Transition/generation identity collisions:** `ID-TXN` is a position claim qualified by the
     proposing generation and valid only with its record digest; `ID-GEN` claims carry a unique
     instance token arbitrated by the conditional append; readback requires identity plus digest
     match (data-and-identity, persistence).
  3. **No rollback-currency proof:** new `LG-WITNESS` clause — an independently trusted monotonic
     head witness advanced on every acknowledged append; restart and restore establish currency
     against it or fail closed to externally governed recovery (persistence).
  4. **Verdict bound to content digest only:** new `RP-PACKAGE-DIGEST` over content, basis,
     evidence manifest, findings state, and delivery metadata; any element change — including a
     basis-only refresh — invalidates the verdict and re-enters full review; the V9 refresh path
     now always returns through review, retaining only finalization-authority ownership
     (review-and-verification-execution, lifecycle-catalogs).
  5. **Independence by session only:** new `ID-PRINCIPAL` participant identity bound to every
     session with provenance across reconnection and replacement; a reviewer principal that
     contributed to the Candidate in any session is rejected (data-and-identity,
     review-and-verification-execution, mechanism-and-provider-contracts, lifecycle-catalogs).
  6. **Arbitrary checks classed re-issue safe:** verification execution is effect-free by enforced
     contract (`CB-VERIFY`: read-only subject, discarded scratch, zero egress by default); a check
     class with declared external effects is classified irreversible with lookup and certainty
     reconciliation (lifecycle-catalogs, review-and-verification-execution,
     mechanism-and-provider-contracts).
  7. **Mediator did not cover storage ports:** `PORT-ARTIFACT` now routes through `CP-MEDIATOR`;
     `PORT-LEDGER` is an explicit, narrowly recorded exception whose equivalent validation lives
     in the commit protocol and verified reads (control-plane, runtime,
     mechanism-and-provider-contracts).
  8. **Ledger append cataloged as an Operation (circular):** `PORT-LEDGER` rows removed from the
     Operation catalog; the conditional append and verified read are the commit primitive with
     their own unknown-acknowledgement recovery (lifecycle-catalogs, persistence).
  9. **Authoritative-store timeouts Story-blocked:** new `BND-WAIT-LEDGER` class — exhaustion
     halts dispatch and interrupts the Run into Recovery, never Story-blocks;
     `BND-WAIT-MECHANISM` now names the mediated Operation ports only (scheduling-and-bounds).
  10. **No transitions for deterministic-check failure:** V9 consumes `EV-CHECK-OBSERVATION`
      explicitly — a failed policy-required check releases authority into bounded rework, an
      exhausted bound records directly `Blocked`, and a pass advances inside `Finalizing`
      (lifecycle-catalogs, review-and-verification-execution).

#### Owner recheck (2026-07-15, head `5fe5df62`)

Arye rechecked all ten dispositions on the corrected head. Findings 5, 6, 8, 9, and 10 were
verified and resolved. Findings 1, 2, 3, 4, and 7 returned with follow-ups, resolved by a second
correction pass:

1. The target-authority registry is now a declared runtime unit (`RT-REGISTRY`) with its port path
   (`PORT-LEDGER`) in the runtime unit table, V6, V6a, and D10; the Run-isolation statement names
   it as the one deliberate cross-Run exception (I12).
2. The confirmed-absent contract distinguishes its two sub-cases explicitly: an empty position
   permits the Layer 1 same-identity retry; an occupied position fences the proposer and resolves
   by adopt-and-recompute — a position-bound identity is never retried into an occupied position
   (persistence, data-and-identity).
3. `LG-WITNESS` is part of D11's selected contract (with the chain/witness division of labor
   corrected: the chain detects forks and tampering, the witness detects rollback) and is gated by
   `CF-MECH-LEDGER`: independence, monotonicity, advance-before-acknowledgement, and
   rollback-restore detection.
4. `RP-PACKAGE-DIGEST` now includes the frozen-requirements digest, and `SCH-VERDICT` is
   exact-package-bound; V14 and the exact-package rule enumerate all six elements.
5. The universal mediator wording is amended on every governing surface — the control-plane power
   table, the mechanism-contract preamble and delegation rule, the V12 scope, and D12 — each now
   recording the `PORT-LEDGER` commit primitive as a non-Operation validated equivalently by the
   transition engine and recovery reads under its `CB-STORE` binding.

#### Owner recheck round 2 (2026-07-15, head `07c82b33`)

Finding 4 (package digest) was verified and resolved. Findings 1, 2, 3, and 7 returned with
contract-level demands, resolved by a third correction pass:

1. **Registry scope made checkable end to end:** a new `ID-REGISTRY` identity is declared per
   canonical target in frozen configuration and validated at preflight; every authority grant
   carries its allocating registry in the fence; every landing records it in delivery metadata;
   and the finalizer verifies registry lineage against the target's own recorded lineage before a
   grant's first target-changing effect, parking on mismatch (`FC-AUTHORITY`). **Named residual
   proposed for explicit owner acceptance:** independently administered deployments declaring
   different registries for one target have no shared arbiter before either has landed; a
   simultaneous first-finalization race is detected and parked by lineage divergence afterwards,
   not prevented — prevention requires one shared registry realization.
2. **Readback contract reconciled with the locked Layer 1 rule:** the occupied-position case is
   classified as the confirmed commit of the competing record (adopt once, fence the proposer),
   not as this proposal's absence, so the locked "confirmed absent retries the same identity and
   content" rule holds without exception for its only case, the empty position. A
   same-generation/different-digest occupant is classified as corruption or generation
   duplication and fails closed (I20, `FC-TRUST`).
3. **Witness made structural:** `RT-WITNESS` is a declared runtime unit on independently trusted
   storage, reached through `PORT-LEDGER` (whose carries-row now names witness heads) under a
   witness-line `CB-STORE` scope; `LG-WITNESS` advances durably after flush and **before**
   `LG-ACK` returns; storage-provider duties and D11 carry the witness obligations, and D11's
   no-service-dependency claim now names the witness as its deliberate exception.
4. **Operation-vocabulary clauses made satisfiable for the ledger:** a recorded
   ledger-primitive substitutions table maps every `MC-*` clause (identity echo, scope,
   idempotency/lookup, reconciliation, compensation, reconnection) to its commit-primitive
   equivalent; `CB-STORE` defines both scopes explicitly; V12 declares the ledger contract's
   absence; D12 records the substitutions.

#### Owner recheck round 3 (2026-07-15, head `c73b6b63`)

Four findings returned with converging demands, resolved by a fourth correction pass:

1. **First-touch race eliminated, residual withdrawn:** the round-3 proposal to accept a
   first-touch serialization residual is withdrawn as improper — a Layer 2 acceptance cannot
   waive locked I12/QS4 without a Layer 1 reopen. It is replaced by the **target lineage
   anchor**: no Candidate-changing landing effect is authorized until an anchor at the target
   itself names the grant's realization-bound `ID-REGISTRY`. That identity is derived from a
   provider-attested canonical registry descriptor rather than a declared label, so copied
   configuration cannot alias distinct registry realizations. When absent the anchor is created by
   `OPC-DEL-ANCHOR`, an atomic
   conditional-create the delivery mechanism must support and attest (`CF-MECH-DELIVERY` gates
   it; preflight fails closed otherwise), so competing registries serialize on the target's own
   atomicity and exactly one can win. The effect-fence tuple now carries `ID-REGISTRY` with
   `ID-AUTH`, matching the prose, and V15 includes the anchor observation, conditional-create,
   reconciliation, and conflict stop before the landing sequence proceeds.
2. **Conformance surfaces track the corrected readback classification:** `CF-MECH-LEDGER` and
   the persistence suite list now gate the five-way classification explicitly (own commit;
   empty-position absence with same-identity retry; competing-generation commit with proposer
   fencing and no retry; same-generation integrity failure failing closed; indeterminate),
   replacing the stale "both confirmed-absent sub-cases" wording.
3. **Witness in the authoritative dataflow:** V11 now shows the `RT-WITNESS` node, the
   advance-witness-durably-then-acknowledge barrier on the commit path, and recovery's
   chain-head-versus-witness currency comparison failing closed on rollback (I20).
4. **One owner for the ledger primitive:** the transition engine's commit protocol is recorded
   as the single ledger-primitive validator and `CB-STORE` binding minter, with `CP-RECOVERY`
   reading through that facility (control-plane component table, power table, interaction rule,
   mechanism-contract preamble and substitutions, D12); the substitutions
   table now defines the ledger's binding-identity-and-fence substitute (store line, expected
   position, proposing generation) and references only defined clauses (`MC-IDEMPOTENT`,
   `MC-LOOKUP` — the undefined `MC-RECONCILE` reference is corrected).

### Round-4 verification recheck and owner decision (2026-07-16)

- **Verifier:** Coordinator session (Claude Fable 5), read-only verification only, not an author
  of the round-4 corrections; bounded to confirming that the four round-3 dispositions are present
  and coherent on the merged content, with no decision-selection authority.
- **Scope and evidence:** The four round-3 correction dispositions were verified on the merged
  `main` content (commit `931e699`, the squash landing of PR #84):
  1. **Registry scope end to end:** `ID-REGISTRY` is derived from the storage mechanism's
     provider-attested canonical realization descriptor (data-and-identity identity table and
     `MC-IDENTITY`); the effect-fence tuple carries the registry identity for target-scoped
     Operations; preflight opens and verifies the registry realization fail-closed (persistence);
     and the target lineage anchor path — `OPC-DEL-ANCHOR` as an atomic conditional-create, lost
     races parking `FC-AUTHORITY` — is present in the forge Operation set, the anchor rule, and
     V15, gated by `CF-MECH-DELIVERY`.
  2. **Five-way readback classification:** defined in persistence (own commit; empty-position
     absence with same-identity retry; competing-generation commit with proposer fencing and no
     retry; same-generation integrity failure failing closed; indeterminate) and gated with all
     five cases enumerated in `CF-MECH-LEDGER`.
  3. **Witness in the authoritative dataflow:** V11 shows the `RT-WITNESS` node, the
     advance-witness-durably-then-acknowledge barrier on the commit path, and recovery's
     chain-head-versus-witness currency comparison failing closed on rollback (I20); D11 records
     the witness contract and its deliberate exception status.
  4. **One owner for the ledger primitive:** the transition engine's commit protocol is recorded
     as the single ledger-primitive validator and `CB-STORE` binding minter on the control-plane
     power table and interaction rules, the mechanism-contract preamble and substitutions table,
     and D12; the substitutions table defines the binding-identity-and-fence substitute (store
     line, expected position, proposing generation) and references only defined clauses.
- **Verdict:** All four dispositions verified present and coherent; no new finding.
- **Owner decision:** On 2026-07-16 Arye Kogan explicitly approved the Layer 2 candidate —
  **approved, not locked** — after reviewing this verification evidence, and accepted the four
  non-blocking independent-review notes as non-blocking. Approval metadata on the fifteen
  candidate files was finalized in the same change, matching the Layer 1 practice of finalizing
  metadata as part of the gate record-keeping.
- **Verified content versus approved bytes:** the recheck above verified the `931e699` bytes.
  The digests below identify the finalized files, which differ from `931e699` only by the
  approval-metadata edits made for this record-keeping: the frontmatter `state`, `status`, and
  `last_verified` fields, the summary-view `State` line, and the D10–D12 inline status line. No
  substantive content differs between the verified bytes and the approved baseline — a
  `git diff` from `931e699` to the commit that landed this record, over the fifteen files,
  reproduces exactly that metadata-only delta — so the approved candidate is the finalized byte
  set identified by the digests, carrying the verified `931e699` substance unchanged.

#### Approved candidate baseline (2026-07-16)

| Approved file                                                    | SHA-256                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/redesign/design/runtime.md`                                | `391c787dbc97e021c2891ab147d213d59458302a9327ba8f0928414b94563d14` |
| `docs/redesign/design/components/control-plane.md`               | `91322946a6cb80b3bed6682b438a1e608727cf9b856d58507f1c39c528fa0648` |
| `docs/redesign/design/data-and-identity.md`                      | `f724fdb41344982e3fe0f0aaab1f49557bb2df377bb0dab962eed9252bfe54bd` |
| `docs/redesign/design/lifecycle-catalogs.md`                     | `ffc9b7e7b344cb6d95c5a7e0b2d160b8e9b6e4e67139b05bc89314928772d789` |
| `docs/redesign/design/scheduling-and-bounds.md`                  | `048f9bb63389cc054c841dd8ab523e2b53f0141f7f4f7b794e1e092834a23178` |
| `docs/redesign/design/persistence-and-projections.md`            | `ed9f010dfbde8cface6590a127a6acf7d858979dd09af43641024cc287e67f1f` |
| `docs/redesign/design/mechanism-and-provider-contracts.md`       | `28848151e124c4fe576c111f906697116447370b5fe7e90e73dd02f171172340` |
| `docs/redesign/design/evidence-handling.md`                      | `b93eaa38ea06c81bc639abf5a326c7c7ea097b3e96a0c9a1068edce2ead8827d` |
| `docs/redesign/design/review-and-verification-execution.md`      | `455437ce2934bf4e1950bcfe4c597235029e309b1c6f99649a982a08a05dfa76` |
| `docs/redesign/design/forge-and-landing.md`                      | `834f9fc4d8bdb5a4b688e7d816100a9ded5dc37eb39d49cb93548dfdf1e6315e` |
| `docs/redesign/design/operations-and-observability.md`           | `7d86996f818547082e6d597d8bc5da3328e6666f5e764699b071d4658b70eca7` |
| `docs/redesign/design/architecture-conformance.md`               | `0c3432b4e412a62d89ee48af3663e29573e6636d780f2f26e179260942b4aa31` |
| `docs/redesign/design/decisions/D10-runtime-decomposition.md`    | `877b9930aac396ac8bdf06c2ec0769ffb25d5afe8d3cf7e5e5dd29a4c95af956` |
| `docs/redesign/design/decisions/D11-ledger-realization.md`       | `fbe78a2d9accaa055ea250d390d6a16e89e69cdfaebc7704b263383175ae94f7` |
| `docs/redesign/design/decisions/D12-mechanism-contract-model.md` | `03f3de85170d94ab19e6fc958057398bd3860b531180ee19c037b93d4e56931f` |

Later reviews append here with the same structure: reviewer identity and independence, delegation
bounds, verdict, blocking findings and dispositions, non-blocking notes, and the exact reviewed
baseline.

## After the gate

Layer 2 is approved and deliberately **not locked**: it is the governing detailed architecture,
and a later material Layer 2 change requires renewed review and an explicit owner decision, but
not a formal reopen ceremony. Material change to D1–D9 or I1–I21 remains a Layer 1 reopen
regardless of any Layer 2 state.
