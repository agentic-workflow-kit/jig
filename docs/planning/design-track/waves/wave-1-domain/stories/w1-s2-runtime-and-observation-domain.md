---
id: w1-s2-runtime-and-observation-domain
wave: 1
status: designed
depends_on: [w1-s1-configuration-and-work-domain]
design_targets: [docs/design/domain/runtime-and-observation.md] # coordinator-proposed new area; author-technical-design may relocate via DocStructurePlan
reconciles_to:
  [
    SEE-1,
    SEE-2,
    SEE-3,
    SEE-4,
    SEE-5,
    SEE-6,
    INV-003,
    INV-004,
    INV-006,
    INV-007,
    MERGE-1,
    MERGE-3,
    MERGE-4,
    OBS-001,
    OBS-002,
    OBS-003,
    OBS-004,
    CTX-001,
  ]
---

# w1-s2-runtime-and-observation-domain — model the Runtime & Observation domain

## Objective

Brief a future design session to author the domain model of jig's Runtime & Observation area: the run
artifacts an owner observes — **Run**, **Evidence**, **Notice** — and the **Run records** event-log
evidence model they derive from, plus the **plan-intake validation boundary** where an authored plan
enters the runtime. This session moves from the `docs/design/core/README.md` group-D overview ("what
you observe") and the `records.md` / `orchestration.md` stubs to an authored domain model that names
each entity's owns / reads / does-not-own, its relations, and the lifecycle **terms** it carries —
without deciding any state machine (Wave 2). It depends on `w1-s1` because it reads the authored-plan
and configuration entities that story settles, and it names the seam where the validated plan plus
the bound policy and work profile cross from Configuration & Work into the runtime.

Two settled dispositions frame this area. **Evidence and Notice are record-derived, not independent
stores**: Evidence is the vocabulary for what gates landing (automated checks, review, capability
proof — MERGE-1/MERGE-3) backed entirely by the Records log (SEE-3, INV-006); Notice is a projection
of that same log (SEE-5), not a parallel store. **The plan-intake validation boundary stays
runtime-side** (D-002): this area **names** it — parse / validate / reject-unknown (INV-007) — by
**re-projecting and citing** `runtime-design-m5a.md`'s CTX-001 (Plan Intake & Validation), explicitly
continuing that context rather than overwriting or superseding it (per the track's STOP-003
discipline: a v0 contract or prior context is routed and cited, never silently mutated).

## Inputs to read

- `../frame.md` — this wave's frame: the `AgreedSystemModel`, the Runtime & Observation context
  candidate, and the InputResolution rows (Evidence, Notice, Work item, plan-intake placement) this
  story's dispositions settle.
- `../decisions.md` — the three dispositions (D-001..D-003); D-002 (plan-intake stays runtime-side)
  and D-003 (Work item is one entity whose runtime facet this area's sibling Wave 2 deepens) bear
  directly on this story.
- `w1-s1-configuration-and-work-domain.md` (this wave's sibling) and its settled output — the
  authored-plan and configuration entities this area reads and hands into the runtime.
- `docs/design/core/README.md` — the group-D entity map (Run, Evidence, Notice) and the group-B
  Run-records entity this session deepens.
- `docs/design/core/records.md` — the append-only event log, the single leased writer, and the pure
  projections (state, summary, metrics, notices, inspect) that ground Evidence and Notice as
  record-derived.
- `docs/design/core/orchestration.md` — the Run lifecycle **terms** (previewed → started → stopped /
  resumed / completed) and the done-vs-landed distinction (this area names the terms; the transition
  table is Wave 2).
- `docs/design/core/plan-intake.md` — the parse / validate / reject-unknown boundary this area names,
  and its own owns / reads / does-not-own.
- `docs/design/contracts/observability-records-contract-v0.md` — the required record properties (run
  identity, event causality, story outcomes, evidence/gates, blocks/stops/notices, redaction/export)
  and event families this area's entities carry. Unfrozen; do not mint field names from it.
- `docs/product/guarantees.md` — SEE-1..6 (records are the evidence, structured, self-diagnosable,
  the notice queue, the redacted export), MERGE-1/3/4 (evidence, done conditions, done-vs-landed).
- `docs/design/notes/runtime-design-m5a.md` — CTX-001 (Plan Intake & Validation) this area
  re-projects; INV-003/004/006/007 and OBS-001..004 this area's entities preserve; the ubiquitous
  language and event-family vocabulary it continues, never resets.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc(s) at the design_targets: the Runtime & Observation domain model.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting numbering.
   This session is not expected to add new invariants (it names entities and ownership, not new
   runtime rules); if it adds none, say so explicitly and note that continuation would start at
   `INV-009`.
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- For each Runtime & Observation entity (Run, Evidence, Notice, Run records): what does it own, what
  does it read, and what does it explicitly not own?
- How do **Evidence** and **Notice** stay record-derived — Evidence as vocabulary over the Records
  log (the categories automated-check / review / capability-proof, MERGE-1/MERGE-3) and Notice as a
  projection of the log (SEE-5) — without acquiring a second, competing notion of current state
  (INV-006, SEE-3)?
- How does **Run records** own the append-only log, the single-leased-writer discipline, the pure
  projections (state / summary / metrics / notices), and export (write-once, redacted), consistent
  with SEE-1..6 and INV-006?
- What is the **Run** entity's ownership — its identity, attempt identity, and the launch-time
  bindings (plan / policy / work-profile / repo-floor references) fixed for the run (GUARD-1/INV-003,
  OBS-001) — as distinct from the run's state machine (Wave 2)?
- Where is the **seam** between the two areas: the handoff of the validated plan plus the bound
  policy and work profile from Configuration & Work into the runtime? And where is the
  **plan-intake validation boundary** named (parse / validate / reject-unknown, INV-007), re-projecting
  and citing CTX-001?
- What lifecycle **terms** do these entities carry (Run: previewed / started / stopped / resumed /
  completed; a plan instance: accepted / rejected at the intake boundary), stated without a
  transition table?

## Invariants to preserve

- `SEE-1` through `SEE-6` — records are the evidence and the single structured product surface;
  Evidence and Notice must derive from the same log an owner inspects, with no parallel narrative
  that can drift (SEE-3).
- `INV-006` — state / summary / metrics / notices are **pure projections** of an append-only log,
  never authored directly. This is the load-bearing invariant that keeps Evidence and Notice
  record-derived.
- `INV-003` (policy fixed at launch) and `INV-004` (done is not landed) bound the Run and Work-item
  facts this area observes; `INV-007` (reject unknown plan formats) is the invariant the plan-intake
  boundary this area names enforces.
- `OBS-001` (run identity + input binding), `OBS-002` (event families), `OBS-003` (redaction-posture
  field), `OBS-004` (the golden run-record shape) — the record properties this area's Run-records
  entity carries.
- `MERGE-1`, `MERGE-3`, `MERGE-4` — Evidence gates landing on independent evidence, done conditions
  are explicit, and done and landed are separate milestones the records keep distinct.
- No new `INV-*` numbers are expected from this story; if the session must add one, it continues from
  `INV-009` (the next number after `INV-008`) and records why in decisions.md.

## Must not decide

- The run and work-item **state machines** — which term follows which, under what guard. Wave 2 owns
  the transition tables; this area names the terms and the done-vs-landed distinction only.
- Work item's runtime facet as a **separate entity** — per D-003 it is one entity, two phases; this
  area names its runtime-observed facts as the same entity `w1-s1` names, and does not split it.
- The plan-intake context's **internal mechanics or re-homing** — per D-002 the validation act stays
  runtime-side; this area **names and cites** CTX-001, it does not overwrite CTX-001 or move it into
  Configuration & Work (STOP-003).
- Learning-loop interpretation and a storage-engine choice — out of scope (Learning is a between-runs
  consumer per `jig.md`; storage engine is deferred per `records.md`).
- The Configuration & Work entities (Track, Execution plan as authored artifact, Policy, Repo-level
  floors, Work profile) — that is `w1-s1`.
- Field-level schema, TypeScript interfaces, or JSON Schema — deferred per `docs/design/README.md`;
  the v0 observability-records contract stays unfrozen.

## Exit criteria

- The Runtime & Observation domain doc exists at its resolved target and states, for each of the four
  entities, its owns / reads / does-not-own, its relations, and its lifecycle terms.
- Evidence and Notice are stated as record-derived (vocabulary and projection over the Records log),
  with Records as the single source of truth (INV-006, SEE-3) — neither carries a separate store.
- The plan-intake validation boundary is named (parse / validate / reject-unknown, INV-007) and
  **explicitly re-projects and cites CTX-001**, without superseding or overwriting it.
- The Configuration & Work ↔ Runtime & Observation seam (validated plan + bound policy + bound work
  profile crossing into the runtime) is named consistently with `w1-s1`'s side of it.
- D-003 is honored: the Run-observed Work-item facts are the same entity `w1-s1` names; this area does
  not split it.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This wave's [`../frame.md`](../frame.md) — the frame that seeds this story's frame step.
- The authored design_targets.
- The design-review report.
- The decisions.md entries (this wave's `../decisions.md`).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story introduces real
jig domain entities (Run, Evidence, Notice, Run records) and names a runtime seam, so the full frame →
author → design-review pass applies, not the light method Wave 0 used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode`, `ddd_depth`). This wave's build-time frame at [`../frame.md`](../frame.md)
   seeds it; the session confirms and, where it deepens the entity model, extends the
   `AgreedSystemModel` rather than starting from nothing.
2. author-technical-design → the Runtime & Observation domain doc at design_targets.
3. review-technical-design → three lenses (architecture-enforceability: no state machine leaked into
   a domain-model doc, and Evidence/Notice do not acquire a store that would violate INV-006;
   domain-correctness: the four entities' ownership is consistent with SEE-1..6 / MERGE-* and the
   plan-intake naming cites CTX-001 correctly; agreement-integrity: the seam and Work-item facts
   agree with `w1-s1`'s settled output and the wave frame's `AgreedSystemModel`). Dispositions
   recorded into this wave's `decisions.md`; settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved design_targets path in the track's future
traceability matrix.

## Coordinator resolution (design_targets)

Proposed: the Runtime & Observation domain model is a new standalone `docs/design/domain/runtime-and-observation.md`
under the same new `docs/design/domain/` area as its sibling, cited from `docs/design/core/README.md`.
This keeps the two Wave 1 domain docs as siblings in one area, mirroring how the design layer already
separates concerns into sibling areas (`core/`, `contracts/`, `decisions/`, `notes/`). The future
`author-technical-design` session may relocate the target via its `DocStructurePlan` if its own frame
finds a better home; this brief records the proposed target, not a frozen path. That session authors
the doc and adds one pointer line to `docs/design/core/README.md` (or `docs/design/README.md`); both
edits are that session's own, not this planning unit's.
