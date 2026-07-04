---
title: Wave 1 — domain model
wave: 1
status: charter draft
depends_on_waves: [0]
---

# Wave 1 — domain model

## Purpose

Deepen jig's entity and domain model beyond the `docs/design/core/README.md` overview: name the
domain entities, their responsibilities (owns / reads / does-not-own), their relations, the seams
they sit against, and the lifecycle vocabulary they carry — across two domain areas. **Configuration
& Work** models the owner-facing inputs (Track, Execution plan, Work item, Policy, Repo-level floors,
Work profile) and the boundary at which the authored plan is handed to the runtime. **Runtime &
Observation** models the run artifacts (Run, Evidence, Notice) and the run-records / event-log
evidence model, and names the plan-intake validation boundary where the authored plan enters the
runtime. Wave 1 establishes the ubiquitous language and ownership map that Wave 2 (state machines)
and every later wave reconcile to. It authors domain content — real jig entities — so it runs the
**full** frame → author → design-review method, seeded by this wave's [`frame.md`](./frame.md); it
is not the scaffold-only, light-method work Wave 0 did.

Wave 1 names lifecycle **terms** only (eligible, started, parked, done, landed, rejected, blocked;
previewed, started, stopped, resumed, completed). The transition **tables** — which term may follow
which, under what guard — are Wave 2's, not this wave's.

## Required input docs

- [`./frame.md`](./frame.md) — this wave's build-time frame: the source map, InputResolution, and
  `AgreedSystemModel` (architecture_mode `system-entity-model`, ddd_depth `strategic-only`) that
  seed both stories' frame step.
- [`./decisions.md`](./decisions.md) — the three frame-InputResolution dispositions (D-001..D-003)
  the two stories are authored under.
- `docs/design/core/README.md` — the entity → product-ID spine map (groups A–D) this wave refines
  and the two lifecycles named at term level.
- `docs/design/core/{plan-intake,records,orchestration}.md` — the per-context stubs Wave 1 deepens
  the domain model above (Plan Intake's parse/validate/reject boundary; Records' append-only log and
  pure projections; Orchestration's lifecycle terms, not its transition table).
- `docs/design/contracts/{execution-plan,observability-records}-contract-v0.md` — the two versioned
  seams the domain entities sit directly against (unfrozen; the domain model must not mint field
  names from them).
- `docs/product/{concepts,guarantees}.md` — the Track model and the ID-bearing commitments the
  entities reconcile to (CFG-1..10, GUARD-1, MERGE-1/3/4, SEE-1..6, INV-003/004/006/007).
- `docs/design/notes/runtime-design-m5a.md` — the live vocabulary (INV-001..008, CTX-001..005, the
  ubiquitous language and context-map sections) this wave continues, never resets. In particular,
  CTX-001 (Plan Intake & Validation) is the runtime-side context w1-s2 re-projects and cites, never
  overwrites.

## Required output docs

- A domain design doc for the Configuration & Work area at `docs/design/domain/configuration-and-work.md`
  (coordinator-proposed new sibling under a new `docs/design/domain/` area, cited from
  `docs/design/core/README.md`; the future `author-technical-design` session may relocate it via its
  `DocStructurePlan` — see `stories/w1-s1-configuration-and-work-domain.md`).
- A domain design doc for the Runtime & Observation area at `docs/design/domain/runtime-and-observation.md`
  (same new area and same relocation caveat; see `stories/w1-s2-runtime-and-observation-domain.md`).
- This wave's [`decisions.md`](./decisions.md), carrying D-001..D-003 and any design-review
  dispositions the two stories add.

## Questions it must answer

- What are the domain entities of the Configuration & Work area, and for each: what does it own,
  what does it read, and what does it explicitly not own? In particular, how does jig own the
  type / shape / invariants of Policy, Work profile, and Repo-level floors while the owner authors
  each instance's content (D-001)?
- What is the relation structure among Track, Execution plan, Work item, Policy, Repo-level floors,
  and Work profile — composition, reference, or inheritance — and which relations are one-directional
  (e.g. the floors-tighten-only constraint)?
- What are the domain entities of the Runtime & Observation area (Run, Evidence, Notice, Run
  records), and how do Evidence and Notice remain record-derived (vocabulary and projection over the
  Records log) rather than independent stores (INV-006, SEE-3)?
- Where is the seam between the two areas — the handoff of the authored/validated plan plus the
  bound policy and work profile from Configuration & Work into the runtime — and where is the
  plan-intake validation boundary named (w1-s2, re-projecting CTX-001)?
- What lifecycle **terms** does each entity carry, stated without committing to a transition table?

## What it must not decide

- The run and work-item **state machines** — which term follows which, under what guard. That is
  Wave 2; Wave 1 names the terms only.
- Fence, Doorbell, and Orchestration **behavior** beyond naming them as adjacent contexts the
  relations point to — their entity/behavior depth is Wave 2 and Wave 4a.
- The plan-intake **validation act's** home is settled (runtime-side, w1-s2, per D-002); its
  internal mechanics are not re-decided here beyond naming the boundary and citing CTX-001.
- Field-level schema, TypeScript interfaces, or JSON Schema — deferred per `docs/design/README.md`
  and this track's non-goals. The v0 contracts stay unfrozen.
- Any provider driver behavior, port protocol, or package decomposition — later waves.

## Exit criteria

- `w1-s1-configuration-and-work-domain` and `w1-s2-runtime-and-observation-domain` are both run and
  settled: zero open blocking suggestions from `review-technical-design` (the full method these
  stories specify — architecture-enforceability, domain-correctness, agreement-integrity), applied
  over their authored design docs.
- Both domain design docs exist at the targets the coordinator resolves the two stories to, each
  reconciling to its `reconciles_to` IDs and continuing (never resetting) the `INV-*` vocabulary.
- D-001..D-003 are recorded in this wave's `decisions.md`, and every entity whose ownership was in
  question in the frame (Policy/Work-profile/Repo-floors, plan-intake placement, Work item as one
  entity) is stated as settled in the authored docs, consistent with those dispositions.
- The Configuration & Work ↔ Runtime & Observation seam is named in both docs consistently, and
  w1-s2's naming of the plan-intake boundary cites CTX-001 rather than superseding it.

## Evidence required

- This charter (`README.md`) and this wave's [`frame.md`](./frame.md).
- Each story's own evidence: its authored `design_targets`, its `review-technical-design` report,
  and its `decisions.md` entries.
- This wave's [`decisions.md`](./decisions.md).

## Story order

1. [`w1-s1-configuration-and-work-domain`](./stories/w1-s1-configuration-and-work-domain.md) — the
   Configuration & Work domain: Track, Execution plan (as authored artifact), Work item (authored
   facts), Policy, Repo-level floors, Work profile. No intra-wave dependency.
2. [`w1-s2-runtime-and-observation-domain`](./stories/w1-s2-runtime-and-observation-domain.md) — the
   Runtime & Observation domain: Run, Evidence, Notice, Run records, and the plan-intake validation
   boundary. Depends on `w1-s1` because it reads the authored-plan and configuration entities w1-s1
   settles and names the seam between the two areas.
