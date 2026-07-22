---
title: "Jig greenfield delivery — overview"
purpose: "Map the approved Jig architecture into seven implementation phases and 45 story contracts."
audience:
  - delivery planners
  - implementers
  - independent reviewers
status: planning baseline; no candidate implementation reviewed
owner: Arye Kogan
last_verified: 2026-07-22
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
baseline, applicable `DR-*` gates, and provider qualification. A phase may start only when those
facts and its phase gate have exact evidence. A failing gate parks the track; it does not authorize
a workaround or later-phase feature.

## Cold-start navigation

- [track.json](./track.json) — exact-set planning source: IDs, phases, dependencies, gates, and
  machine-readable story facts.
- [stories/](./stories/) — all 45 full implementation briefs.
- [Delegated-choice schedule](./decisions.md) — allowed realization choices and their constraints.
- [Dependency DAG](./dependency-dag.md) — critical path, parallel lanes, and non-negotiable gates.
- [Coverage](./coverage.md) — route, guarantee, and conformance coverage.
- [Verification](./verification.md) — exact-subject evidence and phase/candidate verification.
- [Risks and owner decisions](./risks-and-owner-decisions.md) — unresolved risks and required
  owner calls.
- [Reviewer packet](./reviewer/README.md) — independent frozen-candidate review procedure.

| Phase                                | Stories    | What it establishes                                                       | Exit gate                                                                     |
| ------------------------------------ | ---------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 0 — substrate                        | GF-001–005 | private workspace, IDs, topology, evidence harness, pure authority kernel | hermetic graph and first deterministic replay; no effect path                 |
| 1 — durable core                     | GF-010–015 | witnessed ledger/registry/artifacts, recovery, evidence, effect mediation | recovery and uncertainty evidence; no provider bypass                         |
| 2 — envelope and intake              | GF-019–024 | source, policy, manifests, preview, approvals, witnessed intake           | exact accepted/rejected acknowledgement; no Run on rejection                  |
| 3 — lifecycle and execution          | GF-030–039 | lifecycle, bounds, workspace/session, Doorbell, obligations               | scripted intake-to-park path plus qualified local workspace; no landing claim |
| 4 — acceptance and delivery          | GF-040–047 | review, publication, verification, finalization, landing, retirement      | scripted E2E for every product outcome and crash points                       |
| 5 — settlement and operator surfaces | GF-050–056 | terminal settlement, projections, notices, export, private consumers      | stop/reconstruct/export/parity evidence                                       |
| 6 — real-provider closure            | GF-060–062 | Codex/GitHub qualification and supported local profile                    | all provider gates, 39 suites, 44 routes, 56 imports, pure conjunction        |

## 45-story map

| Phase | Story IDs                                                                                                                                                                                                  | Intent                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 0     | GF-001 workspace; GF-002 identity codec; GF-003 runtime topology; GF-004 conformance harness; GF-005 authority kernel                                                                                      | establish an executable but effect-free semantic base               |
| 1     | GF-010 ledger; GF-011 replay/recovery; GF-012 registry; GF-013 artifacts; GF-014 evidence; GF-015 operation reconciliation                                                                                 | make durable truth and uncertain-effect containment real            |
| 2     | GF-019 Work Source; GF-020 file source; GF-021 policy/setup; GF-022 provider proofs; GF-023 preview/approvals; GF-024 intake                                                                               | produce and admit one exact Execution Envelope                      |
| 3     | GF-030 lifecycle; GF-031 scheduler; GF-032 bounds; GF-033 workspace contract; GF-034 sessions; GF-035 candidates; GF-036 Doorbell; GF-037 run control; GF-038 obligations; GF-039 local workspace provider | execute bounded work without acceptance or landing                  |
| 4     | GF-040 acceptance; GF-041 review publication; GF-042 verification; GF-043 finalizer; GF-044 delivery; GF-045 block surfacing; GF-046 retirement; GF-047 verifier provider                                  | accept, prove, land, block, and retire under fenced authority       |
| 5     | GF-050 Settlement; GF-051 projections; GF-052 notices; GF-053 audit export; GF-054 private SDK; GF-055 CLI; GF-056 private MCP                                                                             | close terminal duties and provide parity-preserving operator access |
| 6     | GF-060 Codex provider; GF-061 GitHub provider; GF-062 reference profile                                                                                                                                    | qualify real mechanisms and close the full product conjunction      |

## Cross-phase invariants

- No effect adapter is reachable before its semantic contract, qualification evidence, and exact
  manifest are admitted.
- Every external input is validated; unknown, stale, malformed, ambiguous, or unverifiable input
  fails closed.
- Intent is durable before dispatch; only confirmed absence plus recorded reauthorization permits
  same-effect retry. Otherwise reconcile or park.
- Product outcome, acceptance, landing, and retirement remain distinct. Cleanup cannot alter an
  outcome or release a dependency.
- Each story identifies its applicable `DR-*`; a choice that changes a governing constraint is an
  owner decision, not an implementer choice.

For details and unresolved planning work, use the [baseline and findings](./baseline-and-findings.md)
and [delivery policy](./delivery-policy.md).
