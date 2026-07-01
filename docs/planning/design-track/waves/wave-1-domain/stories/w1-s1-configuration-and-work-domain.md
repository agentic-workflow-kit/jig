---
id: w1-s1-configuration-and-work-domain
wave: 1
status: designed
depends_on: []
design_targets: [docs/design/domain/configuration-and-work.md] # coordinator-proposed new area; author-technical-design may relocate via DocStructurePlan
reconciles_to: [CFG-1, CFG-2, CFG-3, CFG-10, GUARD-1, MERGE-3]
---

# w1-s1-configuration-and-work-domain — model the Configuration & Work domain

## Objective

Brief a future design session to author the domain model of jig's Configuration & Work area: the
owner-facing entities that carry a track's inputs — **Track**, **Execution plan** (as the authored
artifact), **Work item** (its authored facts), **Policy**, **Repo-level floors**, and **Work
profile** — plus the Track-level relations among them (composition vs. reference, and the
one-directional floors-tighten-only constraint). This session moves from the `docs/design/core/README.md`
group-A overview ("Configuration — the owner's inputs, per track") to an authored domain model that
names each entity's owns / reads / does-not-own, its relations, and the lifecycle **terms** it
carries — without deciding any state machine (Wave 2). The Track concept and the execution-plan
concept it grounds come from `docs/product/concepts.md` and the plan contract; this brief reconciles
to them without re-litigating product.

A settled disposition (D-001) frames the ownership altitude: **jig's domain model owns the
type, shape, and invariants** of Policy, Work profile, and Repo-level floors — CFG-1/CFG-2/CFG-3/
CFG-10 and GUARD-1 define what they are and their invariants — while **the owner authors each
instance's content and values**. The `core/README.md` placement of these entities in a "you author,
outside jig-core" box is about **authoring authority**, not domain ownership; this session must state
that distinction explicitly so the model reads as consistent with `core/README.md`, not as a
contradiction of it.

## Inputs to read

- `../frame.md` — this wave's frame: the `AgreedSystemModel`, the Configuration & Work context
  candidate, and the InputResolution rows this story's dispositions (D-001..D-003) settle.
- `../decisions.md` — the three dispositions this story is authored under (D-001 ownership altitude;
  D-002 plan-intake stays runtime-side; D-003 Work item is one entity, two phases).
- `docs/design/core/README.md` — the group-A entity map (Track, Execution plan, Work item, Policy,
  Repo-level floors, Work profile) this session deepens, and the authoring-authority vs.
  domain-ownership distinction D-001 turns on.
- `docs/product/concepts.md` — the Track model (PRD→design→plan→policy→work profile, per track), the
  policy-vs-work-profile split, repo-level floors as a distinct repo-scoped policy artifact, and
  story = work item.
- `docs/product/guarantees.md` — CFG-1 (policy is the governance contract), CFG-2 (work profile is
  the realization, freely tunable, never lowers the floor), CFG-3 (per-track config with inherited
  repo floors), CFG-10 (the fixed manual-to-assisted category boundary), GUARD-1 (policy fixed at
  launch), MERGE-3 (done conditions are explicit and policy-bound).
- `docs/design/contracts/execution-plan-contract-v0.md` — the authored-plan properties (identity/
  provenance, track binding, story set, dependency graph, declared done/evidence, authority
  expectations, policy/work-profile references, constraints) this session models as the Execution
  plan entity's authored facts. Unfrozen; do not mint field names from it.
- `docs/design/notes/runtime-design-m5a.md` — the live `INV-*`/`CTX-*` vocabulary this session
  continues; note that M5a has no Configuration context — this area models those entities as jig
  domain objects for the first time, so it re-projects rather than restates M5a's context map.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc(s) at the design_targets: the Configuration & Work domain model.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting numbering.
   This session is not expected to add new invariants (it names entities and ownership, not new
   runtime rules); if it adds none, say so explicitly and note that continuation would start at
   `INV-009`.
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- For each Configuration & Work entity (Track, Execution plan, Work item, Policy, Repo-level floors,
  Work profile): what does it own, what does it read, and what does it explicitly not own?
- How does jig own the **type / shape / invariants** of Policy, Work profile, and Repo-level floors
  while the **owner authors each instance's content** (D-001), and how is that stated so it reads as
  consistent with `core/README.md`'s group-A framing rather than contradicting it?
- What is the relation structure — Track binds one current Execution plan / Policy / Work profile
  each by reference (not embedding); Track inherits Repo-level floors it may tighten but never
  weaken; Execution plan declares a graph of Work items and references (not embeds) Policy and Work
  profile?
- Which of the Execution plan's properties are **authored facts** this area owns (identity,
  provenance, track binding, declared work-item set and dependency graph, declared done/evidence,
  declared authority expectations), as distinct from the runtime evaluation of those facts (Runtime
  & Observation)?
- What are Work item's **authored facts** this area owns (identity, dependencies-as-declared,
  done-conditions-as-declared), given D-003 makes Work item a single entity whose runtime state is
  owned by Runtime & Observation / Wave 2?
- What lifecycle **terms** do these entities carry (e.g. Policy "fixed at launch"; a plan instance
  "accepted or rejected" as a boundary decision), stated without a transition table?

## Invariants to preserve

- `CFG-1`, `CFG-2`, `CFG-3`, `CFG-10`, `GUARD-1`, `MERGE-3` — the model must not narrow, contradict,
  or silently drop any of these. In particular: Work profile carries no gating/safety authority
  (CFG-2); Policy is fixed at launch (GUARD-1); Repo-level floors may be tightened but never weakened
  by a track's Policy, and changing them is itself governed (CFG-3); done conditions are explicit and
  policy-bound (MERGE-3).
- `INV-003` (policy fixed at launch) and `INV-007` (reject unknown plan formats) from
  `runtime-design-m5a.md` bound entities this area names (Policy's fixed-at-launch term; the
  Execution plan's version/compatibility marker) — the model must stay consistent with them even
  though it does not own their runtime enforcement.
- No new `INV-*` numbers are expected from this story; if the session must add one, it continues from
  `INV-009` (the next number after `INV-008`) and records why in decisions.md.

## Must not decide

- The **validation act** on the plan — parse / validate / reject-unknown (INV-007). Per D-002 that is
  runtime-side and is named by `w1-s2` (re-projecting CTX-001); this area owns only the Execution
  plan **as authored artifact**, not the act of validating it.
- Work item's **runtime state** (eligible → started → parked → done | landed | rejected | blocked)
  and its state machine — owned by Runtime & Observation / Wave 2 as a later phase of the same entity
  (D-003).
- Fence, Doorbell, and Orchestration behavior — adjacent contexts named as relation targets only.
- The Runtime & Observation entities (Run, Evidence, Notice, Run records) — that is `w1-s2`.
- Field-level schema, TypeScript interfaces, or JSON Schema — deferred per `docs/design/README.md`;
  the v0 execution-plan contract stays unfrozen.

## Exit criteria

- The Configuration & Work domain doc exists at its resolved target and states, for each of the six
  entities, its owns / reads / does-not-own, its relations, and its lifecycle terms.
- The D-001 ownership altitude is stated explicitly: jig owns the type/shape/invariants; the owner
  authors instance content; the `core/README.md` "you author" placement is authoring authority, not
  domain ownership.
- D-003 is honored: Work item is one entity; this area owns its authored facts. The doc includes the
  explicit sentence that **Wave 2 may later elevate the runtime facet to a distinct entity with
  recorded rationale, but Wave 1 does not split it.**
- D-002 is honored: this area does not claim the plan-intake validation act; it owns the plan as
  authored artifact and points at `w1-s2` for the validation boundary.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This wave's [`../frame.md`](../frame.md) — the frame that seeds this story's frame step.
- The authored design_targets.
- The design-review report.
- The decisions.md entries (this wave's `../decisions.md`).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story introduces real
jig domain entities (Track, Execution plan, Work item, Policy, Repo-level floors, Work profile), so
the full frame → author → design-review pass applies, not the light method Wave 0 used for its
scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode`, `ddd_depth`). This wave's build-time frame at [`../frame.md`](../frame.md)
   seeds it; the session confirms and, where it deepens the entity model, extends the
   `AgreedSystemModel` rather than starting from nothing.
2. author-technical-design → the Configuration & Work domain doc at design_targets.
3. review-technical-design → three lenses (architecture-enforceability: no state machine or provider
   behavior leaked into a domain-model doc; domain-correctness: the six entities' ownership is
   consistent with product IDs and the D-001 authoring-vs-ownership distinction reads cleanly;
   agreement-integrity: nothing contradicts the wave frame's `AgreedSystemModel` or `w1-s2`'s seam
   naming). Dispositions recorded into this wave's `decisions.md`; settled = zero open blocking
   suggestions.

Handoff: when settled, update status and note the resolved design_targets path in the track's future
traceability matrix.

## Coordinator resolution (design_targets)

Proposed: the Configuration & Work domain model is a new standalone `docs/design/domain/configuration-and-work.md`
under a new `docs/design/domain/` area, cited from `docs/design/core/README.md`. This mirrors how the
design layer already separates concerns into sibling areas (`core/`, `contracts/`, `decisions/`,
`notes/`); the domain model sits alongside `core/` rather than being folded into it. The future
`author-technical-design` session may relocate the target via its `DocStructurePlan` if its own frame
finds a better home; this brief records the proposed target, not a frozen path. That session authors
the doc and adds one pointer line to `docs/design/core/README.md` (or `docs/design/README.md`); both
edits are that session's own, not this planning unit's.
