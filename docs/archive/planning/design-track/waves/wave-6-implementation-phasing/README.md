---
title: Wave 6 — implementation phasing
wave: 6
status: charter draft
depends_on_waves: [1, 2, 3, "4a", "4b", 5]
---

# Wave 6 — implementation phasing

## Purpose

Sequence the design settled by Waves 1-5 into an **implementation-ready handoff** for a future
delivery track without authoring code, schemas, package layout, or a real tracker. Per the approved
frame and D-002, this wave is **sequencing / handoff only**: it introduces no new jig entities,
provider seams, runtime states, `docs/design/**` targets, implementation tickets, or execution
artifacts. Its job is to turn the already-settled design into a dependency-driven phase model the
future delivery track can execute against while preserving the current contract boundaries and
deferred-ownership lines. Before phasing, Wave 6 triages Wave 5 routed findings so unresolved
red-team pressure becomes explicit stop conditions, evidence/test requirements, routed-owner work,
or cited already-resolved design facts.

Per D-003, the phase order is driven by **implementation dependency and contract readiness**, not by
planning-wave chronology alone. The expected phase shape is:

- **foundation and contracts** — the input/output seam posture, validation bars, and stop conditions
  that must exist before runtime implementation starts;
- **core spine** — plan intake, records, authorization, bootstrap, and orchestration in the order the
  executable spine requires;
- **local scripted-worker path** — the first executable slice, keeping the current local-first,
  stub-first posture from D-004 rather than assuming richer providers up front;
- **provider realizations** — Agent / Execution host / Forge / Work source work after the core spine
  is ready, consuming Wave 4a's contracts read-only;
- **hardening and gates** — contract checks, conformance expectations, red-team follow-through, and
  stop conditions, with Wave 5 outputs treated as gate inputs per D-005 rather than a separate
  design-owning phase;
- **future delivery handoff** — the boundary where this planning artifact stops and the later
  delivery track takes over.

This wave authors planning-track artifacts only: the charter, the single story brief, and later the
implementation-phasing handoff artifact that story produces. U9 still owns final
`traceability.md` / `review-and-red-team.md` collection; Wave 6 only keeps those obligations visible.

## Required input docs

- [`frame.md`](./frame.md) — the approved Wave 6 frame: source map, `InputResolution`,
  `AgreedSystemModel`, `architecture_mode: contract/seam design`, `ddd_depth: strategic-only`, the
  implementation-phase surfaces, and the delivery constraints this charter and story inherit.
- [`decisions.md`](./decisions.md) — the frame-gate record this wave is authored under: D-001
  authoring may proceed from the completed frame; D-002 sequencing/handoff-only scope; D-003
  dependency-driven phase order; D-004 local-first/stub-first first slice; D-005 Wave 5 as
  hardening/gate input; D-006 out-of-scope ownership boundaries; D-007 optimize for gates and
  sequencing rather than module layout or tracker structure; D-008 `contract/seam design` +
  `strategic-only`.
- [`../../session-template.md`](../../session-template.md) — the exact wave-charter and story
  skeletons this wave follows.
- [`../../README.md`](../../README.md) and [`../../session-template.md`](../../session-template.md)
  — the durable pre-U9 Wave 6 scope: a light implementation-phasing wave with planning-track-only
  outputs and the standard charter/story artifact shape.
- [`../wave-5-red-team/README.md`](../wave-5-red-team/README.md) and
  [`../wave-5-red-team/decisions.md`](../wave-5-red-team/decisions.md) — the immediate pre-U9
  authority that makes Wave 5 a hardening/gate input and leaves final integration collection to U9.
- Wave 5 settled output packages:
  [`w5-s1 authority/provider red-team`](../wave-5-red-team/outputs/w5-s1-authority-and-provider-red-team/README.md)
  and
  [`w5-s2 recovery/records integration red-team`](../wave-5-red-team/outputs/w5-s2-recovery-records-integration-red-team/README.md)
  — the source-backed routed findings and open questions that Wave 6 must classify before phasing.
- The immediate prior-wave authority for how hardening inputs are treated:
  [`../wave-5-red-team/frame.md`](../wave-5-red-team/frame.md),
  [`../wave-5-red-team/decisions.md`](../wave-5-red-team/decisions.md),
  [`../wave-5-red-team/README.md`](../wave-5-red-team/README.md), and both Wave 5 story briefs.
- The settled design-ownership and dependency sources Wave 6 sequences:
  [`../wave-4a-core/README.md`](../wave-4a-core/README.md),
  [`../wave-4a-core/decisions.md`](../wave-4a-core/decisions.md),
  [`../wave-4b-providers/README.md`](../wave-4b-providers/README.md),
  [`../wave-4b-providers/decisions.md`](../wave-4b-providers/decisions.md),
  [`../wave-3-ports/frame.md`](../wave-3-ports/frame.md),
  [`../wave-2-state-machines/frame.md`](../wave-2-state-machines/frame.md), and
  [`../wave-1-domain/frame.md`](../wave-1-domain/frame.md).
- Product/design sources the frame cites for exact IDs, seam properties, and implementation-order
  constraints: `docs/product/jig.md`, `docs/product/guarantees.md`, `docs/product/concepts.md`,
  `docs/design/README.md`, `docs/design/core/README.md`,
  `docs/design/core/{plan-intake,records,authorization,bootstrap,orchestration}.md`,
  `docs/design/contracts/{execution-plan-contract-v0,observability-records-contract-v0,providers,driving}.md`,
  and `docs/design/notes/runtime-design-m5a.md`.

## Required output docs

- This charter: `docs/planning/design-track/waves/wave-6-implementation-phasing/README.md`.
- `docs/planning/design-track/waves/wave-6-implementation-phasing/stories/w6-s1-implementation-phasing.md`
  — the single implementation-phasing story brief.
- [`prerequisite-triage.md`](./prerequisite-triage.md) — the Wave 5 findings/open-question triage
  required before phasing.
- [`implementation-phasing.md`](./implementation-phasing.md) — the planning-track implementation
  phasing handoff artifact, not `docs/design/**`, code, schemas, or a real tracker. It carries the
  ordered phases, dependency rationale, gate/stop conditions, and future delivery handoff notes the
  later delivery track consumes.
- This wave's existing [`decisions.md`](./decisions.md), which remains coordinator-owned and records
  frame-gate and later review dispositions.
- **No `story-dag.md` this wave.** There is only one story, so no internal story dependency graph is
  earned.

## Questions it must answer

- What is the minimal **implementation-ready phase model** that respects dependency and contract
  readiness rather than simply replaying the planning-wave chronology?
- Which exact surfaces belong in **foundation/contracts**, **core spine**, **local scripted-worker
  path**, **provider realizations**, **hardening/gates**, and **future delivery handoff**, and why?
- Which M5a delivery inputs remain valid as phase constraints here — especially `SEQ-001`,
  `VAL-001`, and `STOP-001..004` — and where do they bite the ordered phase model?
- How does the phase model preserve the **core-before-provider** boundary: providers implement against
  Wave 3 ports and consume Wave 4a contracts read-only rather than redefining policy, evidence,
  authorization, or state semantics?
- How do **Wave 5 outputs** enter implementation as later hardening/gate inputs — especially SEC-2,
  recovery/records contradictions, and routed findings — without collapsing Wave 5's ownership or
  U9's collector role?
- Which Wave 5 findings must become implementation stop conditions, which become evidence/test
  requirements, which route away, and which are already resolved by current design?
- What exactly is handed to the **future delivery track**, and what remains outside this wave by
  decision: contract edits, package layout, tracker execution, and U9 integration artifacts?

## What it must not decide

- **No code or runtime implementation.** This wave must not author code, schemas, TypeScript,
  exports, package files, or a real implementation tracker.
- **No `docs/design/**` changes.** The v0 contracts, core docs, provider docs, and product layer are
  cited read-only; needed changes route back to their owners rather than being silently made here.
- **No package or module layout plan.** D-007 keeps this wave on sequencing, gates, and ownership
  boundaries, not final source-code decomposition.
- **No product re-litigation.** A contradiction or missing commitment remains a routed finding to the
  owning product/design surface.
- **No hard-numbering new `INV-*` values** and no collapsing the three namespaces (product IDs,
  `INV-*`, M5a handoff categories). Existing candidates remain read-only references for later
  reconciliation.
- **No U9 ownership theft.** This wave does not author `dependency-dag.md`, `waves.md`,
  `traceability.md`, `review-and-red-team.md`, or discoverability updates, and it does not pre-resolve
  U9's collection work.
- **No `story-dag.md`.** One story does not earn a DAG.

## Exit criteria

- This charter and `w6-s1-implementation-phasing.md` both exist and follow the session-template
  skeleton exactly, with `design_targets: []` and sequencing/handoff-only deliverables consistent
  with D-002/D-007.
- The single story explicitly sequences implementation by **dependency and contract readiness**:
  foundation/contracts, core spine, local scripted-worker path, providers, hardening/gates, future
  delivery handoff.
- The prerequisite triage classifies every required Wave 5 finding/open question without resolving
  it locally, and the implementation-phasing handoff carries those classifications into phase gates.
- The charter and story both preserve the **local-first/stub-first** first slice, the
  **core-before-provider** boundary, the **cited/unfrozen** v0-contract posture, Wave 5 as
  hardening/gate input, and U9 ownership of final integration collection.
- The story's `reconciles_to` frontmatter enumerates **exact** source-backed product IDs and existing
  invariant IDs only; no ranges, no invented IDs, and no hard-numbered new `INV-*`.
- `story-dag.md` is absent because there is only one story and no internal dependency graph is
  needed.
- Build-time review should be able to confirm the wave remains planning-track-only and coherent with
  the approved frame, with zero open blocking findings after disposition.

## Evidence required

- [`frame.md`](./frame.md) and [`decisions.md`](./decisions.md) for the Wave 6 frame-time contract and
  frame-gate dispositions.
- The authored story brief under [`stories/`](./stories/).
- [`prerequisite-triage.md`](./prerequisite-triage.md) and
  [`implementation-phasing.md`](./implementation-phasing.md).
- The cited prior-wave frames, decisions, charters, and story briefs listed above, especially Wave
  5's approved output and the Wave 4a / Wave 4b charters that settle the core/provider dependency
  boundary.
- The product/design sources cited above for exact IDs, seam properties, implementation-order
  constraints, and M5a sequencing/gate inputs.
- The later design-review report plus any coordinator-recorded dispositions in this wave's
  [`decisions.md`](./decisions.md).

## Story order

- `w6-s1-implementation-phasing`

There is only one story in this wave, so there is no internal story dependency graph and no
`story-dag.md`.
