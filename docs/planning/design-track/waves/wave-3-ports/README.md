---
title: Wave 3 — ports
wave: 3
status: charter draft
depends_on_waves: [1, 2]
---

# Wave 3 — ports

## Purpose

Deepen jig's **ports** — the boundary contracts between jig-core and the world — beyond the
overview altitude the existing stubs give them. This is the wave that makes the **boundary rule**
enforceable: core owns ports, invariants, state machines, the authority model, and event
semantics; providers implement against ports and must **not** redefine core policy, evidence,
authorization, or state semantics. Two areas. The **provider/driver seams** — Agent, Execution
Host, Forge, Work Source (`docs/design/contracts/providers.md`) — are the four swappable authority
boundaries a driver plugs in behind; this wave gives each port its owns/implements split and its
anti-corruption stance. The **data and driving ports** — the `PlanValidator` (plan-in, `docs/design/core/plan-intake.md`)
and `RunStore` (records-out, `docs/design/core/records.md`) data ports, and the operator-control
driving port (`docs/design/contracts/driving.md`) — are the core-owned surfaces that admit jig's
one hard input, emit its durable output, and let a consumer drive a run. Wave 3 gives each of these
seven ports the same per-port owns/implements/must-not rigor, and it establishes the boundary
contracts every later wave (4a core parts, 4b provider parts) reconciles to. It authors design
content — real jig port contracts — so it runs the **full** frame → author → design-review method,
seeded by this wave's [`frame.md`](./frame.md); it is not the scaffold-only, light-method work Wave
0 did.

Wave 3's mode and depth shift from Wave 2's. Per D-002 this wave runs at `architecture_mode:
ports-and-adapters` and `ddd_depth: ports-and-adapters` — the same enum value legitimately fills
both slots (it appears in both the skill's mode list and its depth list), and it is the depth
`docs/design/notes/runtime-design-m5a.md` §4 itself selected for this same four-driver-seam set
("makes Agent / Execution Host / Forge / Work Source swappable authority boundaries"). The
discriminator is isolation of the domain from concrete infrastructure via port contracts and
adapter boundaries — anti-corruption, not sequencing. This is a deliberate shift from Wave 2's
`lifecycle/state-machine`: Wave 3 authors no new state or transition, only the port-invocation
points within Wave 2's already-closed tables. Tactical DDD (aggregates, domain events) stays
deferred, following M5a's own recorded "why not": concurrency (ISO-4) and real provider adapters,
the gate for escalating past `ports-and-adapters`, remain out of scope until Wave 4b.

Per D-001 (deepen the existing stubs in place, no rename), Wave 3 does **not** create a new sibling
ports area the way Wave 1 created `docs/design/domain/`. All four homes are existing `status: draft
— stub` docs already drawing their ports' one-line interfaces: `docs/design/contracts/providers.md`
(the four provider seams), `docs/design/contracts/driving.md` (the operator-control port),
`docs/design/core/plan-intake.md` (`PlanValidator`), and `docs/design/core/records.md`
(`RunStore`). Wave 3 deepens those designated stubs in place — preserving and citing their existing
interfaces and diagrams as the deepened doc's seed (STOP-003: re-project and cite, never silently
overwrite). The two-directory straddle (`contracts/` vs `core/`) is not a defect but the design
layer's real core-vs-edge cut: the data ports are core-owned (`core/`), the provider and driving
ports are the swappable/edge surfaces (`contracts/`). `docs/design/core/authorization.md` (the
Fence) is **cited, not edited**: its `authorize → grant \| deny \| route` port is named as the
worked example of a core-owned port a provider consumes but never redefines; Wave 4a deepens it.
The two v0 data contracts (`docs/design/contracts/execution-plan-contract-v0.md`,
`docs/design/contracts/observability-records-contract-v0.md`) stay **cited and unfrozen**, not
edited — a needed field change routes back to the seam owner (STOP-003), never a silent mutation.

## Required input docs

- [`./frame.md`](./frame.md) — this wave's build-time frame: the source map, InputResolution, and
  `AgreedSystemModel` (architecture_mode `ports-and-adapters`, ddd_depth `ports-and-adapters`) that
  seed both stories' frame step, including the per-port owns/implements/must-not table both stories
  cite.
- [`./decisions.md`](./decisions.md) — the three frame-InputResolution dispositions (D-001..D-003)
  and the confirmed safe assumptions (INV-numbering coordination; Fence-as-port scope) both stories
  are authored under.
- [`../wave-1-domain/frame.md`](../wave-1-domain/frame.md), [`../wave-1-domain/decisions.md`](../wave-1-domain/decisions.md),
  and Wave 1's two settled story briefs — the entity model this wave's ports carry across the
  boundary: Work item is one entity, two phases (Wave 1's D-003); Run is bound-at-launch to
  Plan / Policy / Work-profile / Repo-floors (GUARD-1 / INV-003); Policy / Work profile / Repo-level
  floors are jig-owned domain objects with owner-authored instances (Wave 1's D-001) — the shapes a
  provider must not redefine.
- [`../wave-2-state-machines/frame.md`](../wave-2-state-machines/frame.md), [`../wave-2-state-machines/decisions.md`](../wave-2-state-machines/decisions.md),
  and Wave 2's three settled story briefs — the state machines whose transitions **invoke** provider
  ports (the runner drives the Agent port at `started`; lands through the Forge port at `done →
landed`) and whose guards (the Fence's `authorize`) are themselves a port this wave inventories,
  cited not redesigned. Wave 2's own D-001 in-place-deepening precedent is the closest analogue to
  this wave's placement resolution.
- `docs/design/contracts/README.md` — the three-part edge taxonomy (driving / data / providers),
  distinct from `core/`; the two data contracts as jig-owned versioned seams — the index the two
  stories' targets sit under.
- `docs/design/contracts/providers.md` — the four provider ports' existing one-line interfaces and
  diagram, and the seams-as-authority-boundaries / capabilities-attested postures `w3-s1` deepens in
  place, preserving and citing them as the seed.
- `docs/design/contracts/driving.md` — the operator-control port, the one-command / one-control-plane-call
  / one-audit-event invariant, and the edge-imports-no-provider-contracts posture (ENF-001) `w3-s2`
  deepens in place.
- `docs/design/core/plan-intake.md` — the `PlanValidator` port (`validate(instance) → ValidatedPlan
\| Rejection(reason)`) and the validate-once-at-the-boundary discipline (INV-007) `w3-s2` deepens
  in place.
- `docs/design/core/records.md` — the `RunStore` port (`append(event)` / `project(state \| summary
\| metrics)` / `export`), the single-leased-writer discipline, and the pure-projection posture
  (INV-006) `w3-s2` deepens in place.
- `docs/design/core/authorization.md` — the Fence's `authorize → grant \| deny \| route` port both
  stories cite (not edit) as the worked example of a core-owned port a provider crosses but never
  redefines; Wave 4a deepens it.
- `docs/design/core/bootstrap.md` — the composition root that wires the four provider ports ("the
  one place that imports provider implementations"); cited as the wiring point, not deepened (its
  internal wiring rules are Wave 4a's core-parts territory).
- `docs/design/core/orchestration.md` — the runner as the caller of provider ports at transitions
  (drives the Agent port; sole holder of push / PR / merge through the Forge port); cited as the
  port caller, not re-authored (Wave 2's settled territory).
- `docs/design/contracts/execution-plan-contract-v0.md`, `docs/design/contracts/observability-records-contract-v0.md`
  — the two v0 data-contract shapes the `PlanValidator` and `RunStore` ports carry; cited and
  **unfrozen**, not edited (do not mint field names or event-type strings; a needed change routes
  back to the seam owner per STOP-003).
- `docs/product/guarantees.md` — STACK-1..5, DRIVE-1..3 (provider/seam guarantees), SEC-1/SEC-2/SEC-3
  (no leaks, no phone-home, no forge credentials), FENCE-2/FENCE-3 (no self-widening, no worker
  credentials), EARN-1/EARN-2 (capability attestation), MERGE-2 (push/PR/merge is runner authority),
  SEE-1/SEE-2 (records as a structured, machine-readable surface) — the ID-bearing commitments the
  port contracts and anti-corruption stances reconcile to.
- `docs/design/notes/runtime-design-m5a.md` — the live handoff-category vocabulary this wave
  continues: CTX-005 (the driver seams are ports; M5b built only the Agent scripted stub), SURF-001
  (`OperatorControlPort`), SURF-002 (`PlanValidator`), SURF-003 (`AgentPort`), SURF-004 (`RunStore`),
  SURF-005 (`Fence`), SURF-006 (`ExecutionHostPort` / `ForgePort` / `WorkSourcePort`), ENF-001
  (edge imports no provider contracts), ENF-004 (core depends only on ports), DEL-004 (orchestration
  - the scripted-stub Agent adapter); INV-006 / INV-007 (the continued disciplines the data ports
    carry) — kept a namespace distinct from `INV-*` and from product IDs.

## Required output docs

- The deepened four provider ports in `docs/design/contracts/providers.md` (each port's owns /
  implements / must-not split and its anti-corruption stance — Agent, Execution Host, Forge, Work
  Source), authored by `w3-s1` — deepened in place, preserving and citing the existing one-line
  interfaces and diagram as its seed; the future `author-technical-design` session may relocate the
  target via its `DocStructurePlan` (see [`stories/w3-s1-provider-port-skeleton.md`](./stories/w3-s1-provider-port-skeleton.md)).
- The deepened data ports in `docs/design/core/plan-intake.md` (`PlanValidator`) and
  `docs/design/core/records.md` (`RunStore`), and the deepened driving port in
  `docs/design/contracts/driving.md` (operator-control port), authored by `w3-s2` — all three
  deepened in place; the two v0 data contracts cited and unfrozen, not edited; `authorization.md`
  cited, not edited (see [`stories/w3-s2-data-and-driving-ports.md`](./stories/w3-s2-data-and-driving-ports.md)).
- This wave's [`decisions.md`](./decisions.md), carrying D-001..D-003 and any design-review
  dispositions the two stories add.

## Questions it must answer

- For each of the four provider ports (Agent, Execution Host, Forge, Work Source): what does CORE
  own (the contract, the invariants, the semantics), what does the PROVIDER implement (the concrete
  adapter), and what must the provider **not** do (redefine core policy / evidence / authorization /
  state semantics)? State this owns / implements / must-not split as the load-bearing anti-corruption
  property, preserving and citing each port's existing one-line interface as the seed.
- How is **SEC-2 no-phone-home** a core-owned invariant the Execution Host port must **prove**, not
  a value it trusts from a provider self-report (DRIVE-3, honest containment reporting)?
- How is the Forge port invoked **only** by the runner, never the worker/Agent port (MERGE-2 /
  FENCE-3 / SEC-3), and how does the Agent port surface expose **no** privileged method (FENCE-3)?
- How does the Work source port supply provenance or import/sync behavior **without** becoming a
  second scheduling input — every work item still reaching the runner only through a validated plan?
- For the `PlanValidator` and `RunStore` data ports: what is each port's owns / implements / must-not
  split, deepening `plan-intake.md`'s `validate → ValidatedPlan \| Rejection` and `records.md`'s
  `append` / `project` / `export` in place, and keeping the two v0 contracts cited and unfrozen?
- For the operator-control driving port: how does one driving action map to one control-plane call
  and one audit event, and how does the edge hold no run logic and import no provider contracts
  (ENF-001) — a different anti-corruption posture from the swappable provider seams?
- Which new port-boundary invariants do the two stories mint (as candidates for `INV-009`+), and how
  are they flagged for cross-wave coordination with Wave 2's own not-yet-numbered `INV-009`+
  candidates, keeping the three ID namespaces (product IDs / `INV-*` / handoff categories) distinct?

## What it must not decide

- Anything Wave 1 already settled: the entity model itself, the Work-item-as-one-entity choice
  (D-003 of Wave 1), the plan-intake placement (D-002 of Wave 1, runtime-side), or the domain
  ownership of Policy / Work profile / Repo-level floors (D-001 of Wave 1). Wave 3 frames the ports
  those entities cross; it does not re-open the entities.
- Anything Wave 2 already settled: the work-item and run state machines, their transition tables,
  guards, and events. Wave 3 names only the port-**invocation points** within Wave 2's closed
  tables (the Agent port at `started`, the Forge port at `done → landed`, the `RunStore` append on
  every transition); it does not re-author the transitions.
- `authorization.md`'s Fence port and classifier internals — the `authorize → grant \| deny \|
route` decision and the CFG-10 category boundary stay that stub's own; both stories **cite** the
  Fence as a worked core-owned-port example, never redesign it. Wave 4a deepens `authorization.md`.
- Bootstrap's **internal** provider-wiring rules — how the composition root selects and wires each
  adapter — are Wave 4a's core-parts territory; Wave 3 cites bootstrap as the wiring point and
  frames the port shapes it wires, not the wiring rules.
- Any concrete provider adapter — an Agent implementation, an execution-host sandbox, a forge
  integration, a work-source connector — is Wave 4b (provider parts). Wave 3 frames the port
  contracts adapters implement against, not the adapters.
- The conformance suite a driver must pass and the provider-manifest format — `providers.md` already
  names both as deferred; Wave 3 does not claim them.
- Field-level schema, TypeScript interfaces, JSON Schema, method signatures, or any frozen port
  contract — deferred per `docs/design/README.md` and this track's non-goals. The v0 execution-plan
  and observability-records contracts stay **unfrozen**; a needed field change routes back to the
  seam owner (STOP-003), never a silent mutation.
- **Numbering** the consolidated invariant ledger — the two stories name port-boundary invariant
  **candidates** for `INV-009`+; the physical numbering is coordinated with Wave 2's own
  not-yet-numbered candidates at whichever session consolidates first (tracked at U9; settled by
  `docs/design/conventions.md`'s continuation rule), never hard-numbered here.
- Concurrency / parallel-workspace isolation (ISO-4) mechanics and real-driver behavior — the
  drivers M5a named as the gate for escalating past `ports-and-adapters`; out of scope until Wave 4b.

## Exit criteria

- `w3-s1-provider-port-skeleton` and `w3-s2-data-and-driving-ports` are both run and settled: zero
  open blocking suggestions from `review-technical-design` (the full method these stories specify —
  architecture-enforceability, domain-correctness, agreement-integrity), applied over their authored
  design docs.
- The deepened port contracts exist at the targets the coordinator resolved (`providers.md` for the
  four provider ports; `plan-intake.md` + `records.md` + `driving.md` for the data and driving
  ports), each preserving-and-citing the existing stub interface and diagram it deepened rather than
  overwriting it (STOP-003), each reconciling to its `reconciles_to` IDs, and continuing (never
  resetting) the `INV-*` vocabulary.
- Every port states its **owns / implements / must-not** split explicitly, with the anti-corruption
  stance (a provider must not redefine core policy / evidence / authorization / state semantics)
  framed as the load-bearing correctness property — not an afterthought. SEC-2 no-phone-home is named
  at the Execution Host port as a core-owned invariant the port proves; the Forge port is
  runner-only; the Agent port exposes no privileged method; the Work source port never bypasses the
  validated plan; the driving edge imports no provider contracts (ENF-001).
- The Fence's `authorize → grant \| deny \| route` port is **cited** as a worked core-owned-port
  example in both stories, with `authorization.md`'s classifier internals left untouched; the two v0
  data contracts stay cited and unfrozen.
- The new port-boundary invariant candidates the two stories mint are named for `INV-009`+ and
  flagged for cross-wave coordination with Wave 2's candidates; the three ID namespaces (product IDs
  / `INV-*` / handoff categories) are kept distinct.
- D-001..D-003 are recorded in this wave's `decisions.md`, and every item the frame flagged
  `requires approval` (placement; mode/depth; s1/s2 sequencing) is stated as settled in the authored
  docs consistent with those dispositions.

## Evidence required

- This charter (`README.md`) and this wave's [`frame.md`](./frame.md).
- Each story's own evidence: its authored `design_targets`, its `review-technical-design` report,
  and its `decisions.md` entries.
- This wave's [`decisions.md`](./decisions.md).

## Story order

`w3-s1` and `w3-s2` run **in parallel** — there is no intra-wave dependency (D-003). They frame
distinct seam categories in distinct directories with non-overlapping product-ID clusters and no
shared state-derivation; the one shared element, the per-port owns / implements / must-not
convention, is seeded by this wave's [`frame.md`](./frame.md) (§4) and cited by both, so neither
waits on the other's authored output.

1. [`w3-s1-provider-port-skeleton`](./stories/w3-s1-provider-port-skeleton.md) — the four provider
   ports (Agent, Execution Host, Forge, Work Source): each port's owns / implements / must-not split
   and anti-corruption stance, including SEC-2 no-phone-home at the Execution Host port and the
   runner-only Forge port. Cites the Fence's grant / deny / route decision as the guard every
   provider request crosses. No intra-wave dependency (`depends_on: []`).
2. [`w3-s2-data-and-driving-ports`](./stories/w3-s2-data-and-driving-ports.md) — the data ports
   (`PlanValidator`, `RunStore`) and the driving port (operator-control): each port's owns /
   implements / must-not split, the two v0 data contracts cited and unfrozen, and the
   edge-imports-no-provider-contracts posture (ENF-001). No intra-wave dependency (`depends_on: []`);
   parallel to `w3-s1`.
