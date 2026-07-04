# Wave 3 — decision log

Records `D-###` dispositions from framing and design-review for this wave. D-001..D-003 are the
three frame-`InputResolution` dispositions that resolved this wave's `requires approval` items; the
Disposition column names the resolved choice, and the Rationale gives the source evidence. D-004
onward record `review-technical-design` (build-time QA) suggestion dispositions (`fix`/`reject`/`defer`)
raised over this wave's scaffold. D-### IDs are wave-scoped: a reference to another wave's decision
names the wave (e.g. "Wave 1's D-003"), never a bare `D-###`.

| ID    | Decision                                                                                                                                                            | Disposition                                                                                                                                             | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-001 | Frame InputResolution: placement of Wave 3's port contracts — deepen the existing `contracts/*` and `core/*` port stubs in place, or author new sibling ports docs? | choice (a): **deepen in place, no rename**; targets split across `contracts/` and `core/` on the existing lines; `authorization.md` cited, not a target | All four homes are existing `status: draft — stub` docs already drawing their ports' one-line interfaces (verified on disk): `contracts/providers.md` (four provider seams), `contracts/driving.md` (operator-control port), `core/plan-intake.md` (`PlanValidator`), `core/records.md` (`RunStore`). This is Wave 2's D-001 situation exactly (existing, named, stub-status homes → deepen in place is the STOP-003-compliant "re-project and cite"; new siblings fit only Wave 1's no-existing-home case). The two-directory straddle is not a defect but the design layer's real core-vs-edge cut: the data ports are core-owned (`core/`), the provider and driving ports are the swappable/edge surfaces (`contracts/`). No consolidating rename — that would churn the existing structure for no gain. `authorization.md` (Fence) is cited as a worked port example, not a Wave 3 target (Wave 4a deepens it).               |
| D-002 | Frame InputResolution: should Wave 3's `architecture_mode` / `ddd_depth` shift from Wave 2's `lifecycle/state-machine` / `use-case-slices`?                         | choice: **`architecture_mode: ports-and-adapters`**, **`ddd_depth: ports-and-adapters`** (the frame's recommendation, accepted)                         | Both are valid skill enums (`frame-technical-design/SKILL.md`: `ports-and-adapters` appears in both the mode list and the depth list — the same value legitimately fills both slots). The ladder's `ports-and-adapters` discriminator — "the domain must be isolated from concrete infrastructure (provider SDKs, etc.)" — is exactly this wave's deliverable (boundary contracts + adapter isolation, anti-corruption), not sequencing. `runtime-design-m5a.md` §4 selected `ports-and-adapters` for this same four-driver-seam set ("makes Agent/Execution Host/Forge/Work Source swappable authority boundaries"). Not still `lifecycle/state-machine` (no new state/transition authored — only port-invocation points within Wave 2's closed tables); not yet `tactical-ddd` (concurrency ISO-4 and real provider adapters, the gate for escalating, stay in Wave 4b). This depth is the ceiling the two story briefs inherit. |
| D-003 | Frame InputResolution: does `w3-s2` (data + driving ports) depend on `w3-s1` (provider-port skeleton), or run parallel?                                             | choice: **parallel** — both `depends_on: []`                                                                                                            | The two stories frame distinct seam categories in distinct directories with non-overlapping product-ID clusters and no shared state-derivation (unlike Wave 2's s1→s2, where the run's `stopped` was defined partly in terms of work-item state). The one shared element — the owns/implements/anti-corruption convention — is seeded by **this frame's** AgreedSystemModel (§4) and cited by both stories, so `w3-s2` does not wait on `w3-s1`'s authored output. This matches the plan's "parallel within a wave" intent. (Had the shared convention needed authoring by s1, the call would flip to sequential; it does not, because the frame already carries it.)                                                                                                                                                                                                                                                              |

## Design targets resolved (coordinator)

Following D-001 (deepen in place, no rename), the coordinator resolves each story's `design_targets`;
a future `author-technical-design` session may still relocate via its own `DocStructurePlan`, so
these are proposed homes, not frozen paths:

- **`w3-s1-provider-port-skeleton`** → `docs/design/contracts/providers.md` (the four provider ports:
  Agent, Execution Host, Forge, Work Source — each port's owns/implements split and anti-corruption
  stance) — deepened in place, preserving and citing the existing one-line interfaces and diagram as
  its seed.
- **`w3-s2-data-and-driving-ports`** → `docs/design/core/plan-intake.md` (`PlanValidator`),
  `docs/design/core/records.md` (`RunStore`), and `docs/design/contracts/driving.md` (operator-control
  port) — all three deepened in place; the two v0 data contracts (`execution-plan-contract-v0.md`,
  `observability-records-contract-v0.md`) stay cited and unfrozen, not edited.
- `docs/design/core/authorization.md` (Fence) is **cited, not a target** in either story (Wave 2's
  posture continued; Wave 4a deepens it).

## Safe assumptions confirmed

The frame's two `safe assumption` items were confirmed by the coordinator and carry into the two
story briefs unchanged:

- **INV-numbering coordination** (safe assumption, confirmed): Wave 3's new port-boundary invariant
  candidates (providers-hold-no-credentials; no-phone-home / SEC-2 at the execution-host port;
  port-contracts-are-versioned-seams; capabilities-attested-not-assumed; edge-imports-no-provider-contracts
  / ENF-001; and the continued INV-006 / INV-007 disciplines) are recorded as **candidates for
  `INV-009`+**, never hard-numbered. They must be reconciled with Wave 2's own not-yet-numbered
  `INV-009`+ candidates (from `w2-s3`) at whichever session consolidates first — tracked at the U9
  traceability pass and settled by `docs/design/conventions.md`'s continuation rule. Keep the three
  ID namespaces distinct (product IDs / `INV-*` / M5a handoff categories SURF/DEL/CTX/ENF/…).
- **Fence-as-port scope** (safe assumption, confirmed): the Fence's `authorize → grant \| deny \|
route` port is **named** in the AgreedSystemModel as the worked example of a core-owned port a
  provider consumes but never redefines; it is **not** a Wave 3 `design_target` — `authorization.md`
  stays cited (Wave 2's posture) and is deepened by Wave 4a per the wave table.

## Design-review dispositions (per-unit review)

The per-unit `review-technical-design` pass over this scaffold returned **APPROVE** (zero blocking).
One disposition recorded:

- **D-004** — Per-unit review (agreement-integrity, **nit**): `frame.md` carries two bare
  Wave-1-meaning `D-###` tokens (intro blockquote and the §4 "Source Inputs Used" row) that run
  against the frame's own "cross-wave references... never bare" pledge. **Disposition: defer.** Both
  sit inside explicit in-context Wave-1-source citations (the intro names "Wave 1's D-001..D-003" one
  sentence earlier; the §4 row's own Source column names `../wave-1-domain/frame.md`) — the exact
  "frame in-context Wave-1-source citation" category Wave 2's own D-004 precedent left unqualified as
  acceptable. Every spot that precedent flagged as needing qualification (story Objectives, README
  "What it must not decide") is correctly qualified in this unit. Deferred to the U9 integration pass,
  which can sweep for full literal compliance across all waves if wanted, rather than a round-trip for
  a precedent-exempt cosmetic nit here.
