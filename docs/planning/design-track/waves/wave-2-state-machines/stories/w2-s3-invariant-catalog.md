---
id: w2-s3-invariant-catalog
wave: 2
status: designed
depends_on: [w2-s1-work-item-lifecycle, w2-s2-run-lifecycle-and-recovery]
design_targets: [] # the continued INV-* ledger, at the physical home the continuation rule in docs/design/conventions.md establishes (w0-s2 left the home open — single running list vs per-area rollup — so this brief defers to that settled rule rather than pre-empting it with a fixed filename); continues numbering from INV-009
reconciles_to: [SEE-1, SEE-2, SEE-3] # the invariant-continuation and three-ID-namespacing convention this checkpoint upholds; it consolidates the invariant candidates w2-s1 and w2-s2 mint
---

# w2-s3-invariant-catalog — consolidate the Wave 2 invariant catalog

## Objective

Brief a future design session to run the Wave 2 **consolidation checkpoint**: take the invariant
**candidates** the two lifecycle stories mint (`w2-s1`'s work-item guards and `w2-s2`'s run-recovery
guards) and consolidate them into the continued `INV-*` ledger, numbering from `INV-009` onward
without renumbering or duplicating `INV-001..008`, and keeping the three ID namespaces — product IDs
(`guarantees.md`: RESUME / GUARD / MERGE / FENCE / DOOR / EARN / ISO / LIVE / …), invariant IDs
(`INV-*`), and any handoff categories (SURF / FAIL / OBS / ENF / DEL / SEQ / … from
`runtime-design-m5a.md`) — distinct. This is not a third lifecycle area: it authors no state machine
and draws no transition table. It is a post-hoc consolidation that depends on both `w2-s1` and
`w2-s2` settling, so the invariants both mint are numbered once, coherently, into one ledger.

The **physical home** of the continued ledger is not fixed by this brief. `w0-s2` deliberately left
it open (a single running list vs. per-area lists a track-level index rolls up), to be settled by the
continuation rule `docs/design/conventions.md` establishes. This session places the consolidated
`INV-009+` entries per that settled rule; it does not pre-empt the rule with a filename of its own.

## Inputs to read

- [`../frame.md`](../frame.md) — this wave's frame: the `AgreedSystemModel`, the invariant-catalog
  context candidate, and the candidate new invariants (for `INV-009+`) the frame anticipates.
- [`../decisions.md`](../decisions.md) — the three dispositions (D-001..D-003) and the confirmed s3
  consolidation-dependency fact (this story depends on both `w2-s1` and `w2-s2`).
- `w2-s1-work-item-lifecycle.md` and `w2-s2-run-lifecycle-and-recovery.md` (this wave's siblings) and
  their settled outputs — the invariant candidates each names, which this session consolidates and
  numbers.
- `docs/design/notes/runtime-design-m5a.md` — the live `INV-001..008` ledger this session continues
  from `INV-009`, never resets; and the SURF / FAIL / OBS / ENF / DEL / SEQ / CTX handoff-category
  families, kept as a namespace distinct from `INV-*`.
- `docs/product/guarantees.md` — the product-ID namespace (RESUME / GUARD / MERGE / FENCE / DOOR /
  EARN / ISO / LIVE / SEE / …) each consolidated invariant reconciles to, kept distinct from `INV-*`.
- `docs/design/conventions.md` (once `w0-s2` authors it) — the `INV-*` continuation rule and the
  physical home (single running list vs. per-area rollup) this session places the consolidated
  entries under. If it does not yet exist at authoring time, this session logs that as an open
  dependency rather than inventing a home.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc(s) at the design_targets: the consolidated `INV-009+` ledger entries, placed at
   the home the continuation rule establishes.
2. Open questions, logged (never invented answers) — including, if `docs/design/conventions.md` is not
   yet settled, the dependency on its continuation rule and home.
3. Invariants preserved and any added — this session **is** the consolidation: it numbers the candidates
   `w2-s1` and `w2-s2` mint into `INV-009+`, continuing the ledger, never resetting `INV-001..008`.
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- What are the invariant candidates `w2-s1` and `w2-s2` mint, and how are they numbered into
  `INV-009+` without renumbering or duplicating `INV-001..008`?
- For each consolidated invariant: what does it constrain, which authority holds it, and which
  product IDs does it reconcile to — stated so the three ID namespaces (product IDs / `INV-*` /
  handoff categories) stay distinct and are never conflated or renumbered across each other?
- Where does the continued ledger physically live, per the continuation rule
  `docs/design/conventions.md` establishes (single running list vs. per-area rollup) — and if that
  rule is not yet settled, is the dependency logged rather than pre-empted?
- Are there duplicate or overlapping candidates across `w2-s1` and `w2-s2` (e.g. a guard both name)
  that must be consolidated into a single `INV-*` rather than numbered twice?

## Invariants to preserve

- The full `INV-001..008` ledger must be preserved verbatim; this session continues from `INV-009`
  and never resets or renumbers the existing entries.
- `SEE-1`, `SEE-2`, `SEE-3` — the consolidated catalog is itself part of the structured, inspectable
  record surface the conventions uphold; it must not become a parallel narrative that drifts from the
  invariants the two lifecycle docs state.
- The three ID namespaces stay distinct: product IDs (`guarantees.md`), invariant IDs (`INV-*`), and
  handoff categories (`runtime-design-m5a.md`) are never conflated or renumbered across each other.

## Must not decide

- Any **state machine or transition table** — this session authors none; it consolidates invariants
  the two lifecycle stories already minted. Drawing or revising a closed table is `w2-s1`'s / `w2-s2`'s,
  not this checkpoint's.
- The **content** of the invariant candidates — this session numbers and consolidates them; it does
  not re-derive or re-open the guards `w2-s1` and `w2-s2` settled.
- The **physical home** of the ledger beyond applying the rule `docs/design/conventions.md` sets — this
  session defers to that settled rule (single running list vs. per-area rollup) and does not invent a
  competing home.
- Product IDs or handoff categories — those namespaces are read, never renumbered; only `INV-*`
  continues here.
- Field-level schema, TypeScript interfaces, or JSON Schema — deferred per `docs/design/README.md`.

## Exit criteria

- The invariant candidates `w2-s1` and `w2-s2` mint are consolidated into `INV-009+`, continuing the
  ledger from `INV-008` without renumbering or duplication, at the home the continuation rule
  establishes (or the dependency on that rule is logged if unsettled).
- Each consolidated invariant states what it constrains, its authority, and the product IDs it
  reconciles to, with the three ID namespaces kept distinct.
- Any duplicate/overlapping candidate across the two lifecycle stories is consolidated into a single
  `INV-*` rather than numbered twice.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This wave's [`../frame.md`](../frame.md) — the frame that seeds this story's frame step.
- The authored design_targets (the consolidated `INV-009+` entries at their resolved home).
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — although it draws no state
machine, it authors durable, load-bearing invariant content (the `INV-009+` ledger every later wave
reconciles to), so the full frame → author → design-review pass applies, not the light method Wave 0
used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `lifecycle/state-machine`, `ddd_depth` `use-case-slices` per D-002 — inherited
   as the wave ceiling, though this checkpoint's own output is a catalog, not a table). This wave's
   build-time frame at [`../frame.md`](../frame.md) seeds it; the session confirms the candidate
   invariants both lifecycle stories minted.
2. author-technical-design → the consolidated `INV-009+` ledger at the home the continuation rule
   establishes.
3. review-technical-design → three lenses (architecture-enforceability: no state machine or transition
   table authored here, and the ledger's home follows the settled continuation rule rather than a
   pre-empted filename; domain-correctness: each consolidated invariant reconciles cleanly to its
   product IDs and the two lifecycle docs, with no duplicate numbering; agreement-integrity: the
   consolidated set agrees with `w2-s1`'s and `w2-s2`'s minted candidates and the wave frame, and the
   three ID namespaces stay distinct). Dispositions recorded into this wave's
   [`../decisions.md`](../decisions.md); settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved ledger home in the track's future
traceability matrix.

## Coordinator resolution (design_targets)

Per the D-001 family of resolutions and the `w0-s2` deferral, this story's `design_targets` are
**convention-relative**: the consolidated `INV-009+` entries live at the physical home the
continuation rule in `docs/design/conventions.md` establishes (single running list vs. per-area
rollup — deliberately left open by `w0-s2`), continuing numbering from `INV-009`. This brief does not
pre-empt that rule with a fixed filename; the future `author-technical-design` session places the
entries per the settled rule and, if the rule is not yet authored, logs the dependency rather than
inventing a home. This story authors no closed transition table; it consolidates the invariant
candidates `w2-s1` and `w2-s2` mint.
