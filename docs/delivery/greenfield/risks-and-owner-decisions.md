---
title: "Jig greenfield delivery — risks and owner decisions"
purpose: "Keep implementation risks, selected posture, and escalation boundaries visible."
audience: ["Jig owner", "delivery implementers", "independent reviewers"]
status: "planning baseline; no implementation authorized"
owner: "Arye Kogan"
---

# Risks and owner decisions

## Design constraints and inactive delivery defaults

The design imposes authority, port, contract, conformance, and fail-closed boundaries. It defers
package layout, framing/wire realization, provider implementation, and profile selection within
those boundaries. The following delivery posture is therefore proposed, not owner-approved by this
corpus. It becomes selectable only through the exact external owner-ratification/activation record
defined in [the delegated-choice schedule](./decisions.md#external-owner-ratification-and-activation-prerequisite).

| Delivery choice or approved authority | Design boundary that remains binding                                                                                                  | Activation and delivery consequence                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Private topology                      | D10 fixes modular single authority and defers package/module layout.                                                                  | Node/TypeScript/pnpm/Turbo may start GF-001/GF-003 only after exact activation; graph proof cannot substitute for it.                         |
| Boundary framing                      | D12/D16 defer wire/physical representation within their validation and conformance constraints.                                       | Strict JSON may start GF-002 only after exact activation; ambiguous/alternative framing remains unavailable.                                  |
| Durable truth                         | D11 owner-approves the conditional-append contract, single-host append-only file reference realization, and independent witness rule. | Only segment sizing, batching, and directory layout remain deferred; no autonomous restore without the required independent witness evidence. |
| Initial providers                     | D12 keeps every provider unconfigurable until its exact mechanism proof is admitted.                                                  | The proposed source/store/workspace/verifier/session/delivery tuple needs activation and its separate qualification gates.                    |
| Notice channel                        | DR-12 keeps notice a durable presentation concern, not a provider authority path.                                                     | Terminal/file presentation needs activation plus notice/block-surfacing evidence; it is not `CF-GATE-PROVIDER` proof.                         |
| Provider posture                      | Unqualified or unsupported paths must remain unreachable.                                                                             | No compatibility inference, partial mode, or fallback makes a provider configurable.                                                          |
| Consumer surface                      | D10's private facade cannot create another lifecycle authority or public stability promise.                                           | Proposed CLI/private MCP surfaces need activation; GF-054–056 still prove parity and scope.                                                   |

No entry above is approval evidence. Missing, stale, ambiguous, unverifiable, or differently bound
ratification/activation evidence is `OWNER_DECISION_REQUIRED`, including for GF-001. This PR itself
remains documentation-only and does not authorize implementation.

## Risks, containment, and escalation

| Risk                                                            | Containment in the approved design                                                                                   | Evidence / escalation                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Archive leakage changes the greenfield architecture.            | Delivery uses active product/design and the final readiness baseline only; archived implementation is non-governing. | Stop and raise `OWNER_DECISION_REQUIRED` if a required behavior is absent from active authority.                                                                                                                                                                             |
| A proposed default is mistaken for an owner selection.          | The schedule separates design constraints from inactive defaults and requires exact external activation before use.  | Verify the authenticated owner or explicitly named delegated principal, independently verifiable delegation/validity, record ID, approved package/provenance and target-scope binding, realization tuple, scope, and expiry/revocation; otherwise `OWNER_DECISION_REQUIRED`. |
| A squash OID is mistaken for the reviewed package.              | Package `PASS` remains bound to immutable reviewed tuple `P`; a landed OID is not thereby reviewed.                  | Require the authoritative landing-equivalence record binding `P` to target ref and landed commit/tree with full-tree or complete package-path byte/type/mode proof reproducing `P`'s digest; any drift or ambiguity requires new `PASS`.                                     |
| Provider becomes reachable before it is qualified.              | Semantic/provider splits and exact manifest/proof gates.                                                             | Matching exact mechanism conformance and `CF-GATE-PROVIDER`; otherwise unconfigurable.                                                                                                                                                                                       |
| Shared storage rollback, fork, or witness coupling hides truth. | D11 independent witness, five-way readback, `FC-TRUST` stop.                                                         | GF-010/GF-012/GF-013 semantic crash/readback evidence plus GF-025/GF-026 real file-provider probes; deliberate stop rather than restore.                                                                                                                                     |
| Effect uncertainty causes duplicate external change.            | Intent-before-dispatch, identity/fence binding, reconciler, bounded retries.                                         | `CF-DOUBLE-EFFECT`, `CF-FENCE`; ambiguity parks.                                                                                                                                                                                                                             |
| Terminal stop invents outcomes or loses obligations.            | D16 phase-preserving Settlement overlay and post-terminal append allow-list.                                         | GF-050 every-position stop/replay/trust corpus.                                                                                                                                                                                                                              |
| Rework reuses standing authority.                               | Fresh logical `ID-SESSION` and committed ordinal for every turn.                                                     | GF-034/GF-035 adversarial lineage and stale-result probes.                                                                                                                                                                                                                   |
| Two successor digests both create a Run.                        | Atomic `SCH-INTAKE-ACK` plus `SCH-INTAKE-CUT-CLAIM` under `LG-INTAKE`.                                               | GF-024 contention/crash/readback probes; losing digest gets durable rejection.                                                                                                                                                                                               |
| Review publication gains final-delivery authority.              | D15 has distinct review Operations, no `ID-AUTH`, no finalizer.                                                      | GF-041 and `CF-REVIEW-PUBLICATION`.                                                                                                                                                                                                                                          |
| Cleanup alters outcome or release.                              | Preservation-before-destruction; business outcome/retirement separation.                                             | GF-046 and `CF-SEPARATION`/`CF-PRESERVATION`.                                                                                                                                                                                                                                |
| Product route closure is asserted from sampled evidence.        | Fixed 44 routes and fixed 39-suite `CF-GATE-PRODUCT` input set.                                                      | GF-062 immutable route manifest and exact CER bundle.                                                                                                                                                                                                                        |

## Escalation boundary

The ten open decisions are exactly DR-1 through DR-9 and DR-12. DR-10 and DR-11 are closed
constraints. A request to alter a fixed ID, authority boundary, lifecycle result, provider power,
policy floor, or conformance input is not an implementation choice; it requires an explicit owner
decision. Separately, choosing or activating a proposed delivery default requires the exact
external owner-ratification/activation record, which cites original package tuple `P` and any
required authoritative landing-equivalence record; a generic or historical approval claim is not enough.
