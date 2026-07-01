---
id: w3-s2-data-and-driving-ports
wave: 3
status: designed
depends_on: []
design_targets: [
    docs/design/core/plan-intake.md,
    docs/design/core/records.md,
    docs/design/contracts/driving.md,
  ] # deepen all three in place (D-001): plan-intake.md for PlanValidator, records.md for RunStore, driving.md for the operator-control port. The two v0 data contracts (execution-plan / observability-records) stay CITED and UNFROZEN, not edited. authorization.md cited, not edited. author-technical-design may relocate via DocStructurePlan
reconciles_to:
  [
    SEE-1,
    SEE-2,
    SEC-1,
    ENF-001,
    INV-006,
    INV-007,
    SURF-001,
    SURF-002,
    SURF-004,
    ENF-003,
  ]
---

# w3-s2-data-and-driving-ports — design the data ports and the driving port

## Objective

Brief a future design session to author the **data ports** and the **driving port**, each stated as
an owns / implements / must-not split: the `PlanValidator` data-in port
(`docs/design/core/plan-intake.md`), the `RunStore` data-out port (`docs/design/core/records.md`),
and the operator-control driving port (`docs/design/contracts/driving.md`). This session moves from
the overview-altitude interfaces these three stubs already draw — `PlanValidator`'s
`validate(instance) → ValidatedPlan \| Rejection(reason)`; `RunStore`'s `append(event)` /
`project(state \| summary \| metrics)` / `export`; the operator-control port's one-command /
one-control-plane-call / one-audit-event invariant — to authored port contracts that, for each,
name what CORE owns (the contract, the invariants, the semantics), what a concrete adapter
implements, and what must **not** be done (skip or weaken the boundary the port governs).

Unlike the four swappable provider seams `w3-s1` frames, these are **core-owned** surfaces with a
different anti-corruption posture: the data ports admit jig's one hard input and emit its durable
output, and the driving port lets a consumer drive a run — none is a third-party seam swapped for a
different implementation the way a provider is. Their anti-corruption stances: `PlanValidator`
validates **once, at the boundary**, and nothing downstream re-validates plan shape (INV-007); a
supplier of a raw plan instance (e.g. a Work source, `w3-s1`) cannot skip or weaken this gate.
`RunStore` is append-only with a single leased writer, and projections never author the log
(INV-006 / ENF-003) — no parallel narrative of "what happened" can drift from it (SEE-3). The
operator-control port holds the one-command / one-call / one-audit invariant, and the **edge holds
no run logic and imports no provider contracts** (ENF-001) — a driving adapter cannot reach around
the port into orchestration, the Fence, or a provider directly.

Per D-001 this session **deepens all three stubs in place** — `plan-intake.md`, `records.md`, and
`driving.md` — preserving and citing their existing interfaces and diagrams as the seed (STOP-003:
re-project and cite, never overwrite; name any divergence explicitly). The two v0 data contracts
(`docs/design/contracts/execution-plan-contract-v0.md`,
`docs/design/contracts/observability-records-contract-v0.md`) are the seam **shapes** the
`PlanValidator` and `RunStore` ports carry; they stay **cited and unfrozen**, not edited — a needed
field change routes back to the seam owner (STOP-003), never a silent mutation, and this session
mints no field names or event-type strings. `docs/design/core/authorization.md` is **cited, not
edited** (the Fence is not a data or driving port).

## Inputs to read

- [`../frame.md`](../frame.md) — this wave's frame: the `AgreedSystemModel`, the data-and-driving-ports
  context candidate, the per-port owns / implements / must-not table (§4), the port-boundary invariant
  candidates (§7), and the InputResolution rows D-001..D-003 settle.
- [`../decisions.md`](../decisions.md) — the three dispositions this story is authored under (D-001
  deepen all three in place, no rename; D-002 mode `ports-and-adapters`, depth `ports-and-adapters`;
  D-003 parallel, no dependency on `w3-s1`) and the confirmed safe assumptions (INV-numbering
  coordination; Fence-as-port scope — the Fence is cited by neither data nor driving port here).
- [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md) and Wave 1's settled story briefs —
  the entity model these ports carry: the Execution plan as the authored artifact `PlanValidator`
  admits (INV-007 reject-unknown-format); the Run records event log `RunStore` owns; the driving
  actions (start / preview / watch / inspect / ask-why / decide / stop) the operator-control port
  maps to one call each.
- [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md) and Wave 2's settled
  story briefs — the state-machine transitions that **emit into** `RunStore` (every transition writes
  an event) and the `run.previewed` / launch phase where `PlanValidator` is invoked; the Doorbell
  escalation that surfaces to the owner through the operator-control port's `decide` action. This
  session names the port-invocation points, not the transitions.
- `docs/design/core/plan-intake.md` — the `PlanValidator` port (`validate(instance) → ValidatedPlan
\| Rejection(reason)`), the reject-unknown-format posture (INV-007), and the validate-once-at-the-boundary
  discipline this session deepens in place into an owns / implements / must-not contract.
- `docs/design/core/records.md` — the `RunStore` port (`append(event)` / `project(state \| summary \|
metrics)` / `export`), the single-leased-writer discipline, the pure-projection posture (INV-006),
  and the per-record redaction posture (SEC-1) this session deepens in place.
- `docs/design/contracts/driving.md` — the operator-control port, the CLI / MCP / SDK thin-adapter
  shape, the one-command / one-call / one-audit invariant, and the edge-imports-no-provider-contracts
  posture (ENF-001) this session deepens in place.
- `docs/design/contracts/execution-plan-contract-v0.md` — the plan-in seam shape `PlanValidator`
  validates against; cited and **unfrozen**, not edited (do not mint field names).
- `docs/design/contracts/observability-records-contract-v0.md` — the records-out seam shape and
  event-family list `RunStore` emits into; cited and **unfrozen**, not edited (do not mint field names
  or event-type strings).
- `docs/design/contracts/README.md` — the three-part edge taxonomy (driving / data / providers) and
  the two data contracts as jig-owned versioned seams these ports sit under.
- `docs/design/core/authorization.md` — **cited, not edited**, and only for the boundary posture (the
  Fence is not a data or driving port; the driving edge routes a `decide` action to core, never
  around it).
- `docs/product/guarantees.md` — SEE-1 / SEE-2 (full run visibility; structured, machine-readable
  records as a product surface) and SEC-1 (secrets stay out of records) the data-out port reconciles
  to; the "Driving a run" action set (`jig.md`) the operator-control port realizes.
- `docs/design/notes/runtime-design-m5a.md` — SURF-001 (`OperatorControlPort`: one command → one
  call → one audit event), SURF-002 (`PlanValidator`: `validate → ValidatedPlan \| Rejection`),
  SURF-004 (`RunStore`: append-only single leased writer + pure-replay projections), ENF-001 (edge
  imports no provider contracts / holds no run logic), ENF-003 (projections never append; only the
  reducer appends), INV-006 (records are the evidence; pure projections) and INV-007 (reject unknown
  formats) this session preserves — kept a namespace distinct from `INV-*` and product IDs.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc(s) at the design_targets: the deepened `PlanValidator` in
   `docs/design/core/plan-intake.md`, the deepened `RunStore` in `docs/design/core/records.md`, and
   the deepened operator-control port in `docs/design/contracts/driving.md` — each with its owns /
   implements / must-not split.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting numbering.
   This session names its **port-boundary invariant candidates** (validate-once-at-the-boundary;
   append-only-single-writer / projections-never-append; edge-imports-no-provider-contracts /
   port-contracts-are-versioned-seams). It does **not** hard-number them: they are candidates for
   `INV-009`+, flagged for cross-wave coordination with Wave 2's own not-yet-numbered `INV-009`+
   candidates (reconciled at consolidation / U9; settled by `docs/design/conventions.md`'s
   continuation rule). If it must number one locally, it continues from `INV-009` (never resets) and
   records why in decisions.md.
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- For the **`PlanValidator`** data-in port: what does CORE own (the `validate → ValidatedPlan \|
Rejection` contract, the reject-unknown-format invariant, the plan-in seam shape it validates
  against), what would an adapter implement, and what must **not** be done (skip or weaken the
  boundary — validation happens once, and nothing downstream re-validates plan shape, INV-007)?
- For the **`RunStore`** data-out port: what does CORE own (the `append` / `project` / `export`
  contract, the single-leased-writer discipline, the append-only / pure-projection invariant, the
  records-out seam shape), and what must **not** be done (projections never author the log, INV-006 /
  ENF-003; no parallel narrative that can drift from it, SEE-3; no redaction bypass, SEC-1)?
- For the **operator-control** driving port: how does one driving action (start / preview / watch /
  inspect / ask-why / decide / stop) map to one control-plane call and one audit event even on
  invalid input, and how does the **edge hold no run logic and import no provider contracts**
  (ENF-001) — a distinct anti-corruption posture from the swappable provider seams?
- How do the two v0 data contracts stay **cited and unfrozen** as the seam shapes the data ports
  carry — the ports name the properties the contracts require without minting field names or
  event-type strings, and a needed contract change routes back to the seam owner (STOP-003), never a
  silent local mutation?
- How does the driving port's `decide` action surface a routed / parked authorization decision (the
  Doorbell) to the owner through the same operator surface, without the edge reaching around the port
  into the Fence or orchestration directly?

## Invariants to preserve

- `SEE-1`, `SEE-2` — full run visibility (decisions, authorizations, gates, evidence, approvals,
  state transitions, outcomes reconstructible) and structured, machine-readable records as a product
  surface. `RunStore`'s contract carries these; the data-out port must not let a projection become a
  second source of truth.
- `SEC-1` — secrets, tokens, credentials, and sensitive values stay out of records; the per-record
  redaction posture `RunStore` owns must not be bypassed.
- `ENF-001` — the edge holds no run logic and imports no provider contracts; orchestration,
  eligibility, and authorization stay in core. The operator-control port is the single boundary every
  driving adapter realizes, and the driving edge cannot reach around it.
- `INV-006` (records are the evidence; state / summary / metrics / notices are pure projections of an
  append-only log, never authored directly) and `ENF-003` (projections never append; only the reducer
  appends) from `runtime-design-m5a.md` — the append-only / pure-projection discipline `RunStore`'s
  contract must preserve.
- `INV-007` (reject unknown formats; a plan whose version / compatibility marker is not understood is
  rejected, not guessed) from `runtime-design-m5a.md` — the validate-once-at-the-boundary discipline
  `PlanValidator`'s contract must preserve.
- No new `INV-*` numbers are hard-numbered by this story; it **names port-boundary invariant
  candidates** for `INV-009`+, flagged for cross-wave coordination with Wave 2's own not-yet-numbered
  candidates. If this session must number one locally, it continues from `INV-009` (never resets) and
  records why in decisions.md.

## Must not decide

- The **four provider ports** (Agent, Execution Host, Forge, Work Source) — that is
  `w3-s1-provider-port-skeleton` (parallel, D-003). This session cites that a Work source supplies raw
  plan instances to `PlanValidator` and that the runner emits provider-port outcomes into `RunStore`,
  but owns neither provider port.
- The **v0 data contracts' shape** — `execution-plan-contract-v0.md` and
  `observability-records-contract-v0.md` stay **cited and unfrozen**; this session names the properties
  the ports carry, never mints field names or event-type strings, and routes a needed contract change
  back to the seam owner (STOP-003), never a silent mutation. It does **not** freeze either contract.
- The Fence's `authorize → grant \| deny \| route` port and classifier internals — the Fence is not a
  data or driving port; `authorization.md` is **cited, not edited** (Wave 4a deepens it). The driving
  port's `decide` action routes to core; it does not redesign the Fence.
- Bootstrap's **internal** launch / re-entry mechanics — cited as the phase where `PlanValidator` is
  invoked and the binding record is appended; the wiring rules themselves are Wave 4a's core-parts
  territory.
- The **storage engine**, retention richness, or export encoding behind `RunStore` — deferred per
  `records.md`; and Learning-loop interpretation of records — a between-runs consumer per `jig.md`.
  Both out of scope. The exact method signatures of the operator-control port and how `decide` is
  represented across the three adapter forms — deferred per `driving.md`.
- The work-item and run **state machines** — Wave 2's settled territory. This session names only the
  port-invocation / emission points (every transition emits into `RunStore`; launch invokes
  `PlanValidator`), not the transitions.
- **Numbering** the consolidated invariant ledger — this session names port-boundary invariant
  candidates; numbering from `INV-009` is coordinated with Wave 2's candidates at consolidation.
- Field-level schema, TypeScript interfaces, JSON Schema, method signatures, or any frozen port
  contract — deferred per `docs/design/README.md`; the v0 contracts stay unfrozen.

## Exit criteria

- The deepened `PlanValidator`, `RunStore`, and operator-control port exist at their resolved targets
  (`plan-intake.md`, `records.md`, `driving.md`), each stating its owns / implements / must-not split,
  with the anti-corruption stance (skip or weaken the boundary the port governs) framed as the
  load-bearing correctness property, not an afterthought.
- The existing interfaces and diagrams in all three stubs are **preserved and cited** as the seed,
  re-projected and extended into per-port contracts rather than overwritten; any divergence from the
  seed is named explicitly (STOP-003).
- `PlanValidator` states validate-once-at-the-boundary (INV-007), nothing downstream re-validating;
  `RunStore` states append-only single-leased-writer with projections-never-append (INV-006 /
  ENF-003) and no drift-able parallel narrative (SEE-3), redaction posture preserved (SEC-1); the
  operator-control port states one-command / one-call / one-audit and edge-imports-no-provider-contracts
  (ENF-001).
- The two v0 data contracts are **cited and unfrozen**, not edited — the ports name the properties the
  contracts require without minting field names or event-type strings, and a needed change routes back
  to the seam owner (STOP-003); `authorization.md` is cited, not edited.
- The port-boundary invariant candidates this session names are handed forward for `INV-009`+
  consolidation, flagged for cross-wave coordination with Wave 2's candidates; the three ID namespaces
  (product IDs / `INV-*` / handoff categories) are kept distinct.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This wave's [`../frame.md`](../frame.md) — the frame that seeds this story's frame step.
- The authored design_targets.
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story authors real
jig port contracts (the two data ports and the driving port), the core-owned boundaries that admit
jig's one input, emit its durable output, and let a consumer drive a run, so the full frame → author
→ design-review pass applies, not the light method Wave 0 used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `ports-and-adapters`, `ddd_depth` `ports-and-adapters` per D-002). This wave's
   build-time frame at [`../frame.md`](../frame.md) seeds it; the session confirms and, where it
   deepens the candidate owns / implements / must-not splits into authored port contracts, extends the
   `AgreedSystemModel` rather than starting from nothing.
2. author-technical-design → the deepened `PlanValidator` (`plan-intake.md`), `RunStore`
   (`records.md`), and operator-control port (`driving.md`) at design_targets, preserving and citing
   the existing interfaces and diagrams as the seed; the two v0 data contracts cited and unfrozen.
3. review-technical-design → three lenses (architecture-enforceability: `PlanValidator` validates once
   at the boundary, `RunStore` is append-only with projections-never-append and no drift-able parallel
   narrative, the operator-control edge imports no provider contracts / holds no run logic, and the
   two v0 contracts stay unfrozen; domain-correctness: each port's owns / implements / must-not split
   reconciles to its SEE / SEC / ENF IDs and preserves INV-006 / INV-007, without minting field names;
   agreement-integrity: nothing contradicts the wave frame's `AgreedSystemModel`, Wave 1's entity
   model, Wave 2's state-machine emission points, or `w3-s1`'s provider-port seam). Dispositions
   recorded into this wave's [`../decisions.md`](../decisions.md); settled = zero open blocking
   suggestions.

Handoff: when settled, update status and note the resolved design_targets paths in the track's future
traceability matrix; hand the named port-boundary invariant candidates forward for `INV-009`+
consolidation, coordinated with Wave 2's candidates.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place, no rename), this story deepens `docs/design/core/plan-intake.md`
(`PlanValidator`), `docs/design/core/records.md` (`RunStore`), and `docs/design/contracts/driving.md`
(the operator-control port) directly — preserving and citing their existing interfaces and diagrams
as the seed and extending each into an owns / implements / must-not contract — rather than authoring a
new sibling ports doc. This is the STOP-003-compliant "re-project and cite": each stub's existing
content is the deepened doc's seed, not something overwritten. The two v0 data contracts
(`execution-plan-contract-v0.md`, `observability-records-contract-v0.md`) stay **cited and unfrozen**,
not edited; `docs/design/core/authorization.md` is **cited, not edited**. The future
`author-technical-design` session may relocate the targets via its `DocStructurePlan` if its own frame
finds a better home; this brief records the resolved targets, not frozen paths.
