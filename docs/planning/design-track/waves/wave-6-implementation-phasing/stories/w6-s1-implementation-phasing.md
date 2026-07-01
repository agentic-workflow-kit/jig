---
id: w6-s1-implementation-phasing
wave: wave-6-implementation-phasing
status: designed
depends_on: [] # single-story wave; no internal story dependency graph
design_targets: [] # D-002/D-007: sequencing/handoff only; no docs/design targets, code, or tracker artifacts
reconciles_to:
  [
    FENCE-1,
    FENCE-3,
    GUARD-1,
    MERGE-1,
    MERGE-2,
    MERGE-4,
    ISO-4,
    SEC-2,
    STACK-2,
    STACK-4,
    STACK-5,
    DRIVE-1,
    DRIVE-3,
    SEE-1,
    SEE-3,
    INV-001,
    INV-002,
    INV-003,
    INV-006,
    INV-007,
    INV-008,
  ]
---

# w6-s1-implementation-phasing — sequence implementation-ready phases for future delivery

## Objective

Brief a future design session to author the **implementation-phasing handoff artifact** — a
planning-track-only sequencing pass that turns the settled design from Waves 1-5 into an
implementation-ready phase model for a later delivery track. This session moves from the approved
Wave 6 frame's phase surfaces to an authored handoff that orders work by **dependency and contract
readiness** rather than by planning-wave chronology alone: foundation/contracts, core spine, local
scripted-worker path, providers, hardening/gates, and future delivery handoff. It does **not**
author or deepen `docs/design/**`, create a real tracker, or decide code/package structure; it
produces a routed, implementation-ready handoff artifact and review evidence only.

Per D-002, D-003, D-004, and D-007 this story stays **sequencing-only**. It does not redesign core
or provider surfaces, and it does not collapse their ownership boundaries. Its job is to define the
order in which those already-settled surfaces should be realized, what must exist before the next
phase starts, which gates and stop conditions bound the work, and where a future delivery track
must stop and hand unresolved integration collection back to U9 or the owning design surface.
Before the phase model is usable, this story classifies Wave 5 routed findings and open questions in
[`../prerequisite-triage.md`](../prerequisite-triage.md); the ordered handoff in
[`../implementation-phasing.md`](../implementation-phasing.md) then carries those classifications as
phase stop conditions or evidence gates.

## Inputs to read

- [`../frame.md`](../frame.md) — the approved Wave 6 frame: source map, `InputResolution`,
  `AgreedSystemModel`, the implementation phase surfaces, and the sequencing/handoff constraints
  this story inherits.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under:
  D-002 sequencing/handoff-only scope; D-003 dependency-driven phase order; D-004 local-first and
  stub-first first slice; D-005 Wave 5 outputs as hardening/gate inputs; D-006 out-of-scope
  contract/U9 ownership; D-007 optimize for gates and ownership boundaries rather than package
  layout or tracker structure; D-008 `contract/seam design` / `strategic-only`.
- [`../../../README.md`](../../../README.md),
  [`../../wave-5-red-team/README.md`](../../wave-5-red-team/README.md), and
  [`../../wave-5-red-team/decisions.md`](../../wave-5-red-team/decisions.md) — the durable pre-U9
  statement that Wave 6 is a light implementation-phasing wave, follows Wave 5's gate posture, and
  hands sequencing forward to a future delivery track rather than code itself.
- [`../../wave-5-red-team/frame.md`](../../wave-5-red-team/frame.md),
  [`../../wave-5-red-team/decisions.md`](../../wave-5-red-team/decisions.md),
  [`../../wave-5-red-team/README.md`](../../wave-5-red-team/README.md), and both Wave 5 story briefs
  — the red-team outputs and routed-finding posture this story must place as later hardening/gate
  inputs rather than re-owning locally.
- Wave 5 settled output packages:
  [`w5-s1 authority/provider red-team`](../../wave-5-red-team/outputs/w5-s1-authority-and-provider-red-team/README.md)
  and
  [`w5-s2 recovery/records integration red-team`](../../wave-5-red-team/outputs/w5-s2-recovery-records-integration-red-team/README.md)
  — the source-backed findings/open questions that must be triaged before phasing.
- [`../../wave-4a-core/README.md`](../../wave-4a-core/README.md) and
  [`../../wave-4a-core/decisions.md`](../../wave-4a-core/decisions.md) — the fixed-logic spine
  this story must sequence before provider realizations: records, plan/policy/evidence,
  authorization, bootstrap, and orchestration.
- [`../../wave-4b-providers/README.md`](../../wave-4b-providers/README.md),
  [`../../wave-4b-providers/decisions.md`](../../wave-4b-providers/decisions.md), and the four Wave
  4b story briefs — the provider-side read-only boundary, stub-vs-real-driver posture, execution-host
  hardening seam, and work-source candidate posture this story must sequence after the core spine is
  ready.
- [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) and both Wave 3 story briefs — the
  four port boundaries providers implement against and the control-plane/operator surface the early
  implementation phases must preserve.
- [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md) and its stories —
  the run/work-item lifecycle, resume, and done/landed distinctions implementation phases must not
  contradict.
- [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md) and its stories — the track, plan,
  work-item, policy, and work-profile domain model the implementation phases realize.
- `docs/product/jig.md`, `docs/product/guarantees.md`, and `docs/product/concepts.md` — the product
  commitments and authority boundaries the phase model must preserve.
- `docs/design/README.md`, `docs/design/core/README.md`,
  `docs/design/core/{plan-intake,records,authorization,bootstrap,orchestration}.md`,
  `docs/design/contracts/{execution-plan-contract-v0,observability-records-contract-v0,providers,driving}.md`,
  and `docs/design/notes/runtime-design-m5a.md` — the current design surfaces, seam contracts, and
  delivery-input constraints the phase model sequences without editing.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable planning-track handoff artifacts, not `docs/design/**`:
   [`../prerequisite-triage.md`](../prerequisite-triage.md) and
   [`../implementation-phasing.md`](../implementation-phasing.md). The first classifies Wave 5
   prerequisite findings/open questions; the second gives the ordered phase model, per-phase
   dependency rationale, gate/stop matrix, and future delivery handoff notes. `design_targets` stays
   empty by design.
2. Open questions, logged (never invented answers) — especially where implementation order depends
   on unresolved red-team findings, future provider split decisions, or U9 integration work that
   this wave does not own.
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting numbering.
   This story preserves existing invariants and read-only candidates while sequencing implementation;
   it does **not** hard-number new invariants locally.
4. Risks and deferred decisions — including phase-boundary risks, stop conditions, red-team-derived
   hardening gates, and future delivery/U9 handoff risks.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- What is the minimal **phase order** that respects executable dependency and contract readiness:
  foundation/contracts, core spine, local scripted-worker path, provider realizations, hardening and
  gates, then future delivery handoff?
- Which exact surfaces belong in each phase, and what **must already exist** before the next phase
  may start — especially across plan intake, records, authorization, bootstrap, orchestration, and
  the four provider seams?
- How does the phase model preserve the **local-first / stub-first** first slice from D-004 — core
  spine plus scripted-worker path first — without smuggling real-driver, non-local-host, forge, or
  work-source extension work into the first executable phase?
- Which M5a delivery constraints remain active implementation inputs here — especially `SEQ-001`,
  `VAL-001`, and `STOP-001..004` — and how should they shape the ordered phases and their exit bars?
- How do **Wave 5 red-team outputs** attach to implementation as later hardening/gate inputs,
  especially for SEC-2, recovery/records contradictions, and routed findings, without turning Wave 6
  into a collector or redesign wave?
- Which Wave 5 items are explicit implementation stop conditions, which are evidence/test
  requirements, which route to later owners, and which are already resolved by current design?
- What exactly is handed to the **future delivery track**, and what remains outside this story's
  ownership: v0 contract edits, package layout, real tracker execution, hard-numbered invariant
  reconciliation, and U9 integration artifacts?

## Invariants to preserve

- `FENCE-1` / `INV-001` — fail-closed authorization remains an early implementation floor, not a
  later polish item.
- `FENCE-3`, `MERGE-2`, and `INV-002` — privileged authority stays runner-owned and the Agent seam
  exposes no privileged method; the scripted-worker path preserves that separation in the first slice.
- `GUARD-1` / `INV-003` — policy is fixed at launch; the implementation order must keep binding and
  launch semantics inside the core spine before provider realization expands outward.
- `SEE-1`, `SEE-3`, and `INV-006` — run visibility and records-as-evidence mean records and binding
  visibility must be realized early enough to support every later phase and hardening gate.
- `INV-007` — unknown or incompatible plan formats are rejected, not guessed; plan intake belongs in
  the early foundation/core work, not as a late validation afterthought.
- `INV-008` / `MERGE-1` / `MERGE-4` — authority and landing semantics are exercised in the dry-run /
  local scripted-worker slice before richer provider work, with done-versus-landed preserved.
- `STACK-2`, `STACK-4`, `STACK-5`, `DRIVE-1`, and `DRIVE-3` — the provider phases must preserve the
  four seams, capability attestation, authority boundaries, conformance-proof posture, and honest
  containment reporting rather than flattening them into generic implementation tasks.
- `ISO-4` and `SEC-2` — execution-host isolation and no-phone-home hardening stay later provider /
  gate work, not assumptions silently treated as solved by the first local stub slice.
- Existing un-numbered candidates remain **read-only** gate inputs here: containment-proven-not-asserted,
  isolation-strength-honestly-reported, work-source-never-bypasses-plan,
  binding-record-append-precedes-run-readiness, and resume-re-entry-preserves-original-binding are
  cited as later hardening or sequencing constraints, not renumbered.

## Must not decide

- Any `docs/design/**` updates, v0 contract mutations, runtime code, schema, TypeScript, or package
  layout decisions. This story sequences implementation; it does not perform or redesign it.
- A real implementation tracker, ticket breakdown, or delivery execution artifact. The authored
  output is a planning-track handoff for a future delivery track, not the tracker itself.
- Any collapse of the **core-before-provider** boundary. Providers still implement against ports and
  consume Wave 4a contracts read-only.
- Any local resolution of **Wave 5** findings or **U9** collection work. This story places them as
  later gate inputs and handoff obligations only.
- Hard-numbering new `INV-*` values or inventing new product IDs. Existing `INV-*` values and
  un-numbered candidates are cited read-only where applicable.
- Any extra story dependency artifact. This wave has one story; no `story-dag.md` is warranted.

## Exit criteria

- The implementation-phasing brief is specific enough to launch a future session that can author a
  sequencing/handoff artifact without inventing new design ownership, `docs/design/**` targets, code
  work, or a real tracker.
- The prerequisite triage classifies the required Wave 5 authority/provider and
  recovery/records/bootstrap findings without resolving them locally.
- The phase order is explicit and dependency-driven: foundation/contracts, core spine, local
  scripted-worker path, providers, hardening/gates, future delivery handoff.
- The brief states the **local-first/stub-first** first slice, the **core-before-provider**
  dependency boundary, the **cited/unfrozen** v0-contract posture, and the **Wave 5 as gate input**
  rule explicitly.
- `reconciles_to` remains exact and bounded to the product and invariant IDs this phase model
  directly preserves; no ranges, no invented IDs, and no hard-numbered new invariants.
- The handoff boundary is explicit: future delivery consumes the authored phase model, while U9 keeps
  traceability/review-red-team collection ownership.
- design-review verdict settled (zero open blocking suggestions).

## Evidence required

- The wave frame at [`../frame.md`](../frame.md).
- This authored story brief and the later planning-track implementation-phasing outputs it drives.
- [`../prerequisite-triage.md`](../prerequisite-triage.md) and
  [`../implementation-phasing.md`](../implementation-phasing.md).
- The cited Wave 5, Wave 4a, Wave 4b, Wave 3, Wave 2, and Wave 1 artifacts listed above,
  especially the Wave 4a / 4b charters and Wave 5 approved output that define the dependency and
  hardening boundaries.
- `docs/product/jig.md`, `docs/product/guarantees.md`, `docs/product/concepts.md`,
  `docs/design/contracts/execution-plan-contract-v0.md`,
  `docs/design/contracts/observability-records-contract-v0.md`,
  `docs/design/contracts/providers.md`, `docs/design/core/README.md`, and
  `docs/design/notes/runtime-design-m5a.md`.
- The design-review report and this wave's [`../decisions.md`](../decisions.md) dispositions.

## Design review & handoff

This session runs the technical-design method itself:

1. frame-technical-design -> a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode`, `ddd_depth`). This wave's build-time frame at [`../frame.md`](../frame.md)
   seeds it.
2. author-technical-design -> the planning-track prerequisite triage and implementation-phasing
   handoff artifacts. Because `design_targets` is intentionally empty, the authored output is the
   Wave 5 triage, phase model, per-phase dependency rationale, gate/stop matrix, and future delivery
   handoff notes this story prescribes, not a `docs/design/**` artifact or a real tracker.
3. review-technical-design -> three lenses (architecture-enforceability: the phase order preserves
   core-before-provider boundaries, local-first/stub-first posture, and Wave 5/U9 handoff lines.
   domain-correctness: the phase model actually sequences the FENCE / MERGE / STACK / DRIVE / SEE /
   ISO / SEC / INV surfaces named in `reconciles_to`, with M5a sequencing and stop inputs placed in
   sensible phases. agreement-integrity: nothing in the brief contradicts the approved Wave 6 frame,
   D-002..D-008, or the cited prior-wave ownership boundaries). Dispositions recorded into this
   wave's decisions.md; settled = zero open blocking suggestions.

Handoff: when settled, update status and hand the authored implementation-phasing artifact to the
future delivery track while preserving U9's ownership of final integration collection and keeping all
contract/design mutations routed to their owning surfaces.
