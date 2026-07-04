---
title: Design-layer documentation quality review
date: 2026-07-04
commit: 6e63476 (jig main, after PR #51)
scope: docs/design/**
verdict: Substantively strong, editorially overloaded — quality pass planned
status: point-in-time review record
---

# Design-layer documentation quality review - 2026-07-04

> **Point-in-time record.** This review assesses the `docs/design/` layer for structure, details,
> visuals, coverage, readability, and correct-layer content placement after PR #51. It is the input
> to the design-layer quality pass planned in
> [`2026-07-04-design-layer-quality-plan.md`](./2026-07-04-design-layer-quality-plan.md). It records
> findings; it does not itself change any design doc.

## 1. Scope and method

The whole `docs/design/` tree was reviewed on `main` at `6e63476`: the front-door spine
(`README.md`, `charter.md`, `conventions.md`), the `core/` cluster, the `contracts/` cluster, the
`domain/` docs, the `decisions/` ADR log and index, the `evidence/` records, and the `notes/`
archive. The design layer was read against `docs/product/` (`jig.md`, `guarantees.md`,
`concepts.md`) to judge product-vs-design layering.

Checks run:

- Every core/domain/contracts doc read in full; the ADR index plus a sample of ADRs read.
- Diagram inventory: one Mermaid per core/domain/contracts doc (two in `core/README.md`); zero across
  the 28 ADRs. The `core/README.md` run-flow diagram was validated in a reference Mermaid renderer
  (valid; renders).
- Relative-link sweep across all 62 design Markdown files: **no broken relative links**.
- ID-namespace and invariant-ledger cross-checks: prefixes disjoint; `INV-001..018` resolve.

## 2. Verdict

The design layer is **substantively strong but editorially overloaded**. The system design itself -
entities, seams, ports, invariants, product traceability - is thorough, internally consistent, and
well diagrammed at the top. Two things hold it back, and neither is the design content:

1. A large amount of **authoring-process bookkeeping has settled into the durable design docs**
   (handoff summaries, review-session evidence, wave/story coordinates, seed-continuation narration).
2. Content is often organized by **when it was authored** (wave/phase chronology) rather than **what
   it is about**, which fragments per-subject design across a file.

Both hurt readability and blur the design/planning layer line. The layer currently reads like an
expert's working record, not yet like a reference a new engineer can read top to bottom.

## 3. What is already strong (preserve)

- Clean product/design split, stated and mostly honored: design cites product IDs
  (`FENCE-1`, `MERGE-4`, ...) instead of restating commitments.
- `core/README.md` is an excellent high-to-low entry point: structure diagram + run-flow diagram +
  responsibility tables mapped to product IDs + a one-paragraph "spine" + the two lifecycles.
- All four provider seams (agent, execution host, forge, work source) are fully specified as
  owns / implements / must-not, not stubs.
- The two data contracts hold the "agreed shape, not frozen schema" altitude with prominent
  not-frozen clauses.
- The `evidence/` folder is correctly a design **input**, with `Limitations`, redaction, and version
  discipline.
- Zero broken relative links across 62 files; disjoint ID namespaces; complete sequential ADR set.
- The diagrams that exist are consistently themed and load-bearing.

## 4. Findings by axis

### 4.1 Structure

- **`core/README.md` -> per-area files is a real high-to-low path.** The front door works.
- **`core/bootstrap.md` breaks the pattern.** ~110 lines of planner-handoff scaffolding (methodology
  frontmatter, `SRC/CTX/SURF/DEL` tables, "Pre-authoring Approval Record", "Assumptions and
  Blockers") precede the first design section (`## Owns`) at line 124. No sibling core file carries
  this - it is misplaced, not house style.
- **"Phase N realization" ledgers fragment subjects.** `contracts/providers.md` is effectively two
  documents: a clean seam-organized contract (lines 1-443) and a ~170-line chronological Phase 5-8
  ADR ledger (445-612) that re-covers the same four seams. The Forge design ends up scattered across
  five locations. The core files have the same issue in miniature.
- **Frontmatter status drift** erodes trust: `core/orchestration.md` says `stub` (it is a ~450-line
  doc with two transition tables); `contracts/providers.md` says "deepened for Phase 5" (body runs
  through Phase 8); `contracts/README.md` says `draft - stub` but the layer index calls it
  `overview`.

### 4.2 Readability (weakest axis)

The prose is pervasively **self-referential and defensive** - it argues with an imagined reviewer
about the authoring process instead of describing the system. Representative:

- "this is a re-projection of the seed, not a divergence from it ... The diagram remains the
  authoritative picture; this table is its elaboration." (`core/orchestration.md`)
- "this note states the equivalence once, explicitly, so a future editor reads it here rather than
  re-deriving it." (domain docs; the "so a future editor ..." construction recurs almost verbatim)
- "This section deepens the existing Agent seed in place rather than replacing it ... remain the
  governing seed statements for this seam." (`contracts/providers.md`, repeated per seam)

Plus **over-dense implementation paragraphs** - e.g. a single ~13-line sentence in
`contracts/providers.md` on `Symbol`/private-field/type-erasure marker mechanics. The
"seed / Wave 3 / w2-s3 / this session" vocabulary is internal editing history a fresh reader does
not need.

### 4.3 Visuals

- **Where they exist, they are good and they render.** The `core/README.md` diagrams, the domain
  relation diagrams (load-bearing solid-vs-dashed edges), and the `contracts/README.md` seam map all
  aid reading. (Minor: confirm the `elk` renderer used by the `core/README.md` flow diagram renders
  on GitHub.)
- **Concrete gaps:**
  - The **run-level state machine** is given a six-row transition table in `core/orchestration.md`
    but never drawn - the most obvious missing diagram.
  - **`contracts/providers.md`'s one diagram is stale** - it still labels three of four seams
    "named extension point", contradicting the body, which specifies all four with reference adapters.
  - **Both data contracts have zero diagrams** - no plan -> run -> records flow for the in/out
    boundary.
  - **28 ADRs, zero diagrams** - ADR 0027 (a three-package dependency DAG rendered as a table) and
    ADR 0028 (transport seam boundary) are the two implementers will consult most and are pure prose.

### 4.4 Coverage - what is missing for this layer

- **No consolidated security / threat-model / NFR view.** For a product whose entire thesis is safety
  and governance (fence, fail-closed, anti-gaming, no-phone-home, capability attestation), security is
  scattered across `core/authorization.md`, ADR 0026, and per-entity notes with no single cut. Most
  conspicuous gap.
- **No glossary / ubiquitous-language index.** The docs lean hard on specific terms
  (story = task = work item; track, policy, work profile, floors, evidence, notice) and re-litigate
  label collisions inline.
- **`domain/` is the richest content but nearly undiscoverable:** no prose section in `README.md`
  (only a status-table row); reachable only via two links buried at the bottom of `core/README.md`.
  Its "Domain model" label oversells - it covers 2 of the 4 entity groups.
- Smaller: the **operator surface** is named a core responsibility but has no core doc and no pointer
  to `contracts/driving.md`.

### 4.5 Content and correct-layer

- **Product <-> design is mostly clean.** Design cites product IDs rather than restating. Minor
  bleed: the "no public package/export/semver" posture (a product statement) is echoed ~4x across the
  contracts docs; `core/plan-intake.md` re-derives product's evidence categories (defensible as a
  deepening).
- **The real layer problem is process <-> design.** Planning-track material - handoff summaries
  (`core/bootstrap.md`), "Review evidence" session sections and wave/story coordinates (domain docs),
  seed-continuation narration (providers/driving) - has settled into the durable design docs. The
  repo's own charter puts the planning track under `docs/planning/` to record traceability; this
  content belongs there.
- **Canonical `INV-001..018` ledger lives in `notes/`** ("archival, not the main reading path") yet
  the durable design depends on it as authoritative - it should be discoverable from, or homed in, the
  durable layer.
- **The ADR log mixes decisions with execution bookkeeping.** ADRs 0005-0011 record fixtures being
  exercised rather than decisions-with-alternatives; the index has weak wayfinding (no dates, no
  grouping, cryptic titles, a Status column reading "applied" for all 28 rows).

## 5. Prioritized fixes (drives the plan)

1. **De-scaffold the durable docs** - move planner-handoff / review-session / seed-continuation
   bookkeeping out of design docs (starting with `core/bootstrap.md`).
2. **Reorganize by subject, not chronology** - split the Phase 5-8 realization ledger out of
   `contracts/providers.md`; do the same for the core files' phase blocks.
3. **Fix the stale/gap visuals** - redraw the `providers.md` seam diagram, add the run-level state
   machine, add a diagram to ADR 0027/0028 and the data contracts.
4. **Add the two missing views** - a security/threat-model cut and a glossary (consolidating existing
   design, not inventing new policy).
5. **Cheap trust wins** - correct drifted `status:` frontmatter; add dates + grouping to the ADR
   index.

## 6. Guardrail for the pass

Every fix in the follow-up pass is **editorial, structural, or consolidation only**. No fix invents a
new design decision, product commitment, invariant, or ADR. Anything that would require a genuine new
decision is logged as an Open Question in the owning doc, per this repo's charter rule of naming
conflicts rather than silently resolving them. No runtime source, schema, golden record, or ADR
history is changed.
