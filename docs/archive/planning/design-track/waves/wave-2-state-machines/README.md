---
title: Wave 2 — state machines
wave: 2
status: charter draft
depends_on_waves: [1]
---

# Wave 2 — state machines

## Purpose

Deepen jig's run and work-item **state machines** beyond the lifecycle _terms_ Wave 1 named:
sequence those terms into transition tables, guards, events, and recovery/resume semantics, over
the entities Wave 1 already settled. **Work item** is the runtime phase of the one entity Wave 1's
D-003 kept whole — its state machine (`eligible → started → parked → done | landed | rejected |
blocked`), the guards on each transition, and the events each transition emits. **Run** is the
bound-at-launch entity Wave 1 named — its state machine (`previewed → started → stopped | resumed
| completed`), plus the recovery/resume semantics (the RESUME family, storage preflight,
crash/restart, and GUARD-1 launch-binding immutability held across a resume). A third area
consolidates the invariant catalog the two lifecycle stories mint. Wave 2 gives the run lifecycle
and recovery/resume the same closed-table rigor `docs/design/core/orchestration.md` already gives
the work-item lifecycle, and it establishes the guarded transitions every later wave reconciles
to. It authors design content — real jig state machines — so it runs the **full** frame → author →
design-review method, seeded by this wave's [`frame.md`](./frame.md); it is not the scaffold-only,
light-method work Wave 0 did.

Wave 2's mode and depth rise one rung above Wave 1's. Per D-002 this wave runs at
`architecture_mode: lifecycle/state-machine` and `ddd_depth: use-case-slices` — the depth
`docs/design/notes/runtime-design-m5a.md` itself selected for this same runtime behavior — because
the deliverable carries states, events, and guards, which `strategic-only` under-fits. Tactical
DDD (aggregates, domain events) stays deferred, following M5a's own recorded "why not":
concurrency (ISO-4) and real drivers, the gate for escalating past `use-case-slices`, remain out
of scope until Waves 3 / 4b.

Per D-001 (deepen the existing stubs in place), Wave 2 does **not** create a new sibling area the
way Wave 1 created `docs/design/domain/`. `docs/design/core/orchestration.md` already draws the
closed work-item Mermaid table and names the run lifecycle in prose; `docs/design/core/bootstrap.md`
already owns launch / `run.previewed` / storage-preflight and names resume as an undesigned
extension point. Wave 2 deepens those designated stubs in place — preserving and citing their
existing content as the deepened doc's seed (STOP-003: re-project and cite, never silently
overwrite). `docs/design/core/authorization.md` is **cited, not edited**: its `authorize →
grant \| deny \| route` classifier is consumed by `w2-s1` as an external guard predicate, not
redesigned.

## Required input docs

- [`./frame.md`](./frame.md) — this wave's build-time frame: the source map, InputResolution, and
  `AgreedSystemModel` (architecture_mode `lifecycle/state-machine`, ddd_depth `use-case-slices`)
  that seed all three stories' frame step.
- [`./decisions.md`](./decisions.md) — the three frame-InputResolution dispositions (D-001..D-003)
  and the confirmed safe assumptions (s1 → s2 sequencing; guard ownership; s3 consolidation
  dependency) the three stories are authored under.
- [`../wave-1-domain/frame.md`](../wave-1-domain/frame.md), [`../wave-1-domain/decisions.md`](../wave-1-domain/decisions.md),
  and Wave 1's two settled story briefs — the domain model this wave consumes: Work item is one
  entity, two phases (Wave 1's D-003), whose runtime facet Wave 2 sequences; Run is bound-at-launch
  (GUARD-1/INV-003); the lifecycle terms Wave 1 named are the states Wave 2 sequences.
- `docs/design/core/orchestration.md` — the existing closed work-item Mermaid table and run-lifecycle
  prose this wave deepens in place, preserving and citing them as the seed.
- `docs/design/core/bootstrap.md` — the launch / composition-root sequencing, `run.previewed`,
  storage preflight (RESUME-4), and resume-as-undesigned-extension-point this wave's run-lifecycle
  view deepens (bootstrap's internal re-entry mechanics stay Wave 4a per D-003).
- `docs/design/core/authorization.md` — the Fence/Doorbell `authorize → grant \| deny \| route`
  guard vocabulary `w2-s1` cites (not edits).
- `docs/design/core/records.md` — the append-only event log and pure projections every transition
  emits into; grounds "every transition emits an event."
- `docs/design/contracts/observability-records-contract-v0.md` — the recovery/resume/blocks/stops/
  notices record properties and event-family list transitions emit into (unfrozen; do not mint
  field names or event-type strings).
- `docs/product/guarantees.md` — RESUME-1..5, GUARD-1/2, MERGE-1..5, FENCE-1..3, DOOR-1..3,
  EARN-1/2, ISO-1..4, LIVE-1/2 — the ID-bearing commitments the transitions and guards reconcile to.
- `docs/design/notes/runtime-design-m5a.md` — the live INV-\*/CTX-\*/OBS-\* vocabulary this wave
  continues, never resets (INV-003/004/005/007/008 are already state-machine invariants); its own
  dry-run-scoped state-machine sketch and `use-case-slices` depth precedent.

## Required output docs

- The deepened work-item state machine in `docs/design/core/orchestration.md` (closed transition
  table, guards, events), authored by `w2-s1` — deepened in place, preserving and citing the
  existing closed work-item Mermaid table as its seed; the future `author-technical-design` session
  may relocate the target via its `DocStructurePlan` (see `stories/w2-s1-work-item-lifecycle.md`).
- The deepened run state machine in `docs/design/core/orchestration.md` (the `stopped` / `resumed` /
  `completed` transitions) **and** the run-lifecycle view of resume / storage-preflight /
  launch-binding in `docs/design/core/bootstrap.md`, authored by `w2-s2` — both deepened in place;
  `authorization.md` cited, not edited; bootstrap's internal re-entry mechanics deferred to Wave 4a
  (see `stories/w2-s2-run-lifecycle-and-recovery.md`).
- The consolidated `INV-*` ledger continuing from `INV-009`, authored by `w2-s3` at the physical
  home the continuation rule in `docs/design/conventions.md` establishes (single running list vs
  per-area rollup — deferred to that settled rule, not pre-empted here; see
  `stories/w2-s3-invariant-catalog.md`).
- This wave's [`decisions.md`](./decisions.md), carrying D-001..D-003 and any design-review
  dispositions the three stories add.

## Questions it must answer

- What is the closed work-item state machine — for each transition, which guard governs it, and
  which event does it emit — sequencing the terms `eligible → started → parked → done | landed |
rejected | blocked` that Wave 1 named, and preserving-and-citing the existing closed Mermaid table
  in `orchestration.md` as its seed?
- How does the work-item table consume the Fence's `authorize → grant \| deny \| route` decision as
  an **external guard predicate** (grant → proceed toward `done`; deny → `blocked`; route →
  `parked`) without redesigning `authorization.md`'s classifier?
- What is the closed run state machine (`previewed → started → stopped | resumed | completed`), its
  guards, and its events — and how is `stopped` defined partly in terms of work-item state (an
  unattended `parked` work item, or a liveness signal, drives `run.stopped`)?
- What are the run-lifecycle-level recovery/resume semantics (RESUME-1..5: durable progress,
  checkpoint resume, no-double-effect, fail-closed-and-diagnosable, resume-integrity re-approval),
  and how is GUARD-1 / INV-003 launch-binding immutability held **across a resume**?
- Which invariants do the two lifecycle stories mint, and how does `w2-s3` consolidate them into a
  single `INV-*` ledger continuing from `INV-009`, keeping the three ID namespaces (product IDs /
  `INV-*` / handoff categories) distinct?

## What it must not decide

- Anything Wave 1 already settled: the entity model itself, the Work-item-as-one-entity choice
  (D-003 of Wave 1), the plan-intake placement (D-002 of Wave 1, runtime-side), or the domain ownership of
  Policy / Work profile / Repo-level floors (D-001 of Wave 1). Wave 2 sequences the terms; it does
  not re-open the entities.
- `authorization.md`'s classifier internals — the CFG-10 fixed category boundary and escalation
  routing stay that stub's own; `w2-s1` cites the grant/deny/route decision, it does not redesign it.
- Bootstrap's **internal** re-entry mechanics on resume — how composition re-wires providers and
  re-checks storage preflight — are Wave 4a's (`w4-s4-bootstrap-composition-root` per D-003); `w2-s2`
  owns only the run-lifecycle view of resume.
- The four driver-seam ports and the operator/control-plane surfaces — Wave 3.
- Field-level schema, TypeScript interfaces, or JSON Schema — deferred per `docs/design/README.md`
  and this track's non-goals. The v0 execution-plan and observability-records contracts stay
  unfrozen; a needed field change routes back to the seam owner (STOP-003), never a silent mutation.
- Concurrency / parallel-workspace isolation (ISO-4) mechanics and real-driver behavior — the
  drivers M5a named as the gate for escalating past `use-case-slices`; out of scope until Waves 3 / 4b.

## Exit criteria

- `w2-s1-work-item-lifecycle`, `w2-s2-run-lifecycle-and-recovery`, and `w2-s3-invariant-catalog` are
  all run and settled: zero open blocking suggestions from `review-technical-design` (the full
  method these stories specify — architecture-enforceability, domain-correctness,
  agreement-integrity), applied over their authored design docs.
- The deepened state machines exist at the targets the coordinator resolved (orchestration.md for
  both lifecycles; bootstrap.md for the run-lifecycle resume view), each preserving-and-citing the
  existing stub content it deepened rather than overwriting it, each reconciling to its
  `reconciles_to` IDs, and continuing (never resetting) the `INV-*` vocabulary from `INV-009`.
- The work-item table's guards cite `authorization.md`'s grant/deny/route decision as an external
  predicate; the run lifecycle keeps GUARD-1 / INV-003 launch-binding immutability explicit across
  a resume; and `w2-s3` consolidates the minted invariants into one ledger with the three ID
  namespaces kept distinct.
- D-001..D-003 are recorded in this wave's `decisions.md`, and every item the frame flagged
  `requires approval` (placement; mode/depth; recovery-scope boundary) is stated as settled in the
  authored docs consistent with those dispositions.

## Evidence required

- This charter (`README.md`) and this wave's [`frame.md`](./frame.md).
- Each story's own evidence: its authored `design_targets`, its `review-technical-design` report,
  and its `decisions.md` entries.
- This wave's [`decisions.md`](./decisions.md).

## Story order

1. [`w2-s1-work-item-lifecycle`](./stories/w2-s1-work-item-lifecycle.md) — the work-item state
   machine: the closed transition table, its guards (including the Fence grant/deny/route guard,
   cited from `authorization.md`), and the events each transition emits. No intra-wave dependency.
2. [`w2-s2-run-lifecycle-and-recovery`](./stories/w2-s2-run-lifecycle-and-recovery.md) — the run
   state machine and its recovery/resume semantics (RESUME-1..5; GUARD-1 launch-binding immutability
   across a resume; the run-lifecycle view of bootstrap resume). Depends on `w2-s1` because the
   run's `stopped` / `resumed` / recovery semantics are defined partly in terms of work-item state.
3. [`w2-s3-invariant-catalog`](./stories/w2-s3-invariant-catalog.md) — the consolidation checkpoint:
   it continues the `INV-*` ledger from `INV-009`, numbering the invariant candidates `w2-s1` and
   `w2-s2` mint into one consolidated set, and keeps the three ID namespaces distinct. Depends on
   both `w2-s1` and `w2-s2`.
