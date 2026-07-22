---
title: "Jig greenfield delivery — risks and owner decisions"
purpose: "Keep implementation risks, selected posture, and escalation boundaries visible."
audience: ["Jig owner", "delivery implementers", "independent reviewers"]
status: "planning baseline; no implementation authorized"
owner: "Arye Kogan"
---

# Risks and owner decisions

## Owner-approved decisions already carried by the track

| Decision          | Approved direction                                                                                                                | Delivery consequence                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Private topology  | Node/TypeScript/pnpm private modular topology.                                                                                    | GF-001/GF-003 use package seams as a proof surface, not an authority change.  |
| Boundary framing  | Strict JSON initially.                                                                                                            | GF-002 rejects alternative/ambiguous durable or public framing.               |
| Durable truth     | D11 file stores with a genuinely independent witness trust root.                                                                  | GF-010/GF-013 must stop on untrustworthy continuity; no autonomous restore.   |
| Initial providers | Structured-file source, file storage, local Git workspace, local verifier, Codex sessions, GitHub delivery, terminal/file notice. | GF-020/GF-039/GF-047/GF-060/GF-061 are distinct qualification gates.          |
| Provider posture  | Unsupported modes are unconfigurable.                                                                                             | Every provider gate fails closed; no compatibility inference or partial mode. |
| Consumer surface  | Private SDK plus CLI and private stdio MCP.                                                                                       | GF-054–056 prove parity and do not create a public API promise.               |

## Risks, containment, and escalation

| Risk                                                            | Containment in the approved design                                                                                   | Evidence / escalation                                                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Archive leakage changes the greenfield architecture.            | Delivery uses active product/design and the final readiness baseline only; archived implementation is non-governing. | Stop and raise `OWNER_DECISION_REQUIRED` if a required behavior is absent from active authority. |
| Provider becomes reachable before it is qualified.              | Semantic/provider splits and exact manifest/proof gates.                                                             | Matching `CF-MECH-*` and `CF-GATE-PROVIDER`; otherwise unconfigurable.                           |
| Shared storage rollback, fork, or witness coupling hides truth. | D11 independent witness, five-way readback, `FC-TRUST` stop.                                                         | GF-010/GF-013 crash/readback evidence; deliberate stop rather than restore.                      |
| Effect uncertainty causes duplicate external change.            | Intent-before-dispatch, identity/fence binding, reconciler, bounded retries.                                         | `CF-DOUBLE-EFFECT`, `CF-FENCE`; ambiguity parks.                                                 |
| Terminal stop invents outcomes or loses obligations.            | D16 phase-preserving Settlement overlay and post-terminal append allow-list.                                         | GF-050 every-position stop/replay/trust corpus.                                                  |
| Rework reuses standing authority.                               | Fresh logical `ID-SESSION` and committed ordinal for every turn.                                                     | GF-034/GF-035 adversarial lineage and stale-result probes.                                       |
| Two successor digests both create a Run.                        | Atomic `SCH-INTAKE-ACK` plus `SCH-INTAKE-CUT-CLAIM` under `LG-INTAKE`.                                               | GF-024 contention/crash/readback probes; losing digest gets durable rejection.                   |
| Review publication gains final-delivery authority.              | D15 has distinct review Operations, no `ID-AUTH`, no finalizer.                                                      | GF-041 and `CF-REVIEW-PUBLICATION`.                                                              |
| Cleanup alters outcome or release.                              | Preservation-before-destruction; business outcome/retirement separation.                                             | GF-046 and `CF-SEPARATION`/`CF-PRESERVATION`.                                                    |
| Product route closure is asserted from sampled evidence.        | Fixed 44 routes and fixed 39-suite `CF-GATE-PRODUCT` input set.                                                      | GF-062 immutable route manifest and exact CER bundle.                                            |

## Escalation boundary

The ten open decisions are exactly DR-1 through DR-9 and DR-12. DR-10 and DR-11 are closed
constraints. A request to alter a fixed ID, authority boundary, lifecycle result, provider power,
policy floor, or conformance input is not an implementation choice; it requires an explicit owner
decision.
