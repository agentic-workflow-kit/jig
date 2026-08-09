---
title: "Jig greenfield delivery — overview"
purpose: "Map the approved Jig architecture into seven implementation phases and 48 story contracts."
audience:
  - delivery planners
  - implementers
  - independent reviewers
status: planning baseline; no candidate implementation reviewed
owner: Arye Kogan
last_verified: 2026-07-23
---

# Greenfield delivery overview

## Context, background, and goals

Jig must be implemented greenfield from the approved product and redesign, not recovered from the
retired generation. The goal is a deterministic authority-and-proof boundary: accepted envelopes
become safely landed work or durable, inspectable non-delivery outcomes. The plan orders semantic
closure before effects and qualification before configuration.

## How to use this overview

Each ID below has an included completed full brief in [stories/](./stories/) and an entry in the
machine-readable [track manifest](./track.json). The table is an overview, never a substitute for
those contracts. Before implementation, revalidate its merged dependencies, selected exact
immutable planning provenance, dynamically observed target ref/commit/tree, applicable `DR-*`
gates, and provider qualification. A phase may start only when those facts and its phase gate have
exact evidence. A failing gate parks the track; it does not authorize a workaround or later-phase
feature.

## Cold-start navigation

- [track.json](./track.json) — exact-set planning source: IDs, phases, dependencies, gates, and
  machine-readable story facts.
- [stories/](./stories/) — all 48 full implementation briefs.
- [Delegated-choice schedule](./decisions.md) — allowed realization choices and their constraints.
- [Dependency DAG](./dependency-dag.md) — critical path, parallel lanes, and non-negotiable gates.
- [Coverage](./coverage.md) — route, guarantee, and conformance coverage.
- [Verification](./verification.md) — exact-subject evidence and phase/candidate verification.
- [Phase orchestration](./phase-orchestration.md) — declared-DAG coordination, mandatory
  worktrees, continuous pairs, recovery, and one final phase PR.
- [Phase handoff template](./phase-handoff-template.md) — state-free resume pointer to the external
  live ledger.
- [Risks and owner decisions](./risks-and-owner-decisions.md) — unresolved risks and required
  owner calls.
- [Reviewer packet](./reviewer/README.md) — independent frozen-candidate review procedure.

| Phase                                | Stories                                                        | What it establishes                                                                                                              | Exit gate                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — substrate                        | GF-001–005                                                     | private workspace, IDs, topology, evidence harness, pure authority kernel                                                        | hermetic graph and first deterministic replay; no effect path                                                                           |
| 1 — durable core                     | GF-010–015                                                     | witnessed ledger/registry/artifacts, recovery, evidence, effect mediation                                                        | recovery and uncertainty evidence; no provider bypass                                                                                   |
| 2 — envelope and intake              | GF-019, GF-021, GF-022, GF-020, GF-025, GF-026, GF-023, GF-024 | source, policy, provider proofs, qualified stores, preview, approvals, witnessed intake                                          | exact accepted/rejected acknowledgement; no Run on rejection                                                                            |
| 3 — lifecycle and execution          | GF-030–039                                                     | lifecycle, bounds, workspace/session, Doorbell, obligations                                                                      | scripted intake-to-park path; GF-039 local workspace remains deferred and unconfigurable pending independent evidence; no landing claim |
| 4 — acceptance and delivery          | GF-041, GF-040, GF-042–047                                     | review publication, acceptance, verification, finalization, landing, retirement                                                  | scripted E2E for every product outcome and crash points                                                                                 |
| 5 — settlement and operator surfaces | GF-050–056                                                     | terminal settlement, projections, notices, export, private consumers                                                             | stop/reconstruct/export/parity evidence                                                                                                 |
| 6 — real-provider closure            | GF-057, GF-060–062                                             | GitHub review publication, Codex, and GitHub final-delivery qualification; GF-062 joins all three in the supported local profile | product gate: 39 suite results plus 44 settled PC routes; separate profile coverage audit                                               |

## 48-story map

| Phase | Story IDs                                                                                                                                                                                                  | Intent                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 0     | GF-001 workspace; GF-002 identity codec; GF-003 runtime topology; GF-004 conformance harness; GF-005 authority kernel                                                                                      | establish an executable but effect-free semantic base                                           |
| 1     | GF-010 ledger; GF-011 replay/recovery; GF-012 registry; GF-013 artifacts; GF-014 evidence; GF-015 operation reconciliation                                                                                 | make durable truth and uncertain-effect containment real                                        |
| 2     | GF-019 Work Source; GF-021 policy/setup; GF-022 provider proofs; GF-020 file source; GF-025 ledger/registry/witness file provider; GF-026 artifact file provider; GF-023 preview/approvals; GF-024 intake  | admit a semantic-only development envelope before Phase 3; qualify real providers independently |
| 3     | GF-030 lifecycle; GF-031 scheduler; GF-032 bounds; GF-033 workspace contract; GF-034 sessions; GF-035 candidates; GF-036 Doorbell; GF-037 run control; GF-038 obligations; GF-039 local workspace provider | execute bounded work without acceptance or landing                                              |
| 4     | GF-041 review publication; GF-040 acceptance; GF-042 verification; GF-043 finalizer; GF-044 delivery; GF-045 block surfacing; GF-046 retirement; GF-047 verifier provider                                  | publish for review, accept, prove, land, block, and retire under fenced authority               |
| 5     | GF-050 Settlement; GF-051 projections; GF-052 notices; GF-053 audit export; GF-054 private SDK; GF-055 CLI; GF-056 private MCP                                                                             | close terminal duties and provide parity-preserving operator access                             |
| 6     | GF-057 GitHub review-publication provider; GF-060 Codex provider; GF-061 GitHub final-delivery provider; GF-062 joins all three in the reference profile                                                   | qualify real mechanisms and close the full product conjunction                                  |

## Cross-phase invariants

- No effect adapter is reachable before its semantic contract, qualification evidence, and exact
  manifest are admitted.
- Every external input is validated; unknown, stale, malformed, ambiguous, or unverifiable input
  fails closed.
- Intent is durable before dispatch. Same-identity retry is effectful-only after confirmed absence
  and recorded reauthorization; an effect-free replacement uses a new Operation identity.
  Otherwise reconcile or park.
- Under deterministic final verification, every policy-selected required check class must have a
  passing, subject-matching `EV-CHECK-OBSERVATION`, and the complete required set must be satisfied
  inside `Finalizing` before any target-changing Operation. `none` is an explicit no-op.
  Post-`Accepted` observations under the unchanged reviewed candidate, posture, check-class set,
  verification configuration/environment, and binding are authorized continuation evidence; drift
  requires a fresh tuple and review.
- Product outcome, acceptance, landing, and retirement remain distinct. Cleanup cannot alter an
  outcome or release a dependency.
- Each story identifies its applicable `DR-*`; a choice that changes a governing constraint is an
  owner decision, not an implementer choice.

## Mandatory semantic-to-provider closure

The manifest fixes eight splits: GF-019→GF-020 (`PORT-SOURCE`), GF-010→GF-025 (`PORT-LEDGER`),
GF-013→GF-026 (`PORT-ARTIFACT`), GF-033→GF-039 (`PORT-WORKSPACE`), GF-042→GF-047
(`PORT-VERIFY`), GF-034→GF-060 (`PORT-SESSION`), GF-041→GF-057 (review-publication
`PORT-DELIVERY`), and GF-044→GF-061 (final-delivery `PORT-DELIVERY`). The two delivery splits
retain disjoint credentials, Operations, evidence, and authority subjects. Every semantic half can
be green while its provider stays unreachable and unconfigurable until its exact `CF-MECH-*`
evidence passes. In phase 2, GF-019, GF-021, and GF-022 establish the topological prefix. GF-020,
GF-025, and GF-026 may then proceed in parallel after GF-022 and their own prerequisites, but their
external qualification does not block semantic lifecycle development. GF-023 instead consumes the
semantic contracts and a development-only, provider-disabled manifest; GF-024 may then create a
scripted witnessed accepted or rejected acknowledgement. This exact semantic closure permits
GF-030 to begin. Real-provider reachability, autonomous restore, supported-profile claims, and full
Phase 2 closure still require all three exact provider gates plus a recomposed preview and refreshed
approvals.

## Product gate versus supported-profile coverage

`CF-GATE-PRODUCT` is exactly 39 recorded suite results plus every named element/governance record
of all 44 settled `PC-*` proof routes. The 56 imports are not product-gate inputs: they require a
separate matrix-plus-suite disposition audit for the broader supported-profile coverage claim.
Likewise, provider/profile qualification evidence supports admission but does not join the product
gate.

For details and unresolved planning work, use the [baseline and findings](./baseline-and-findings.md)
and [delivery policy](./delivery-policy.md).
