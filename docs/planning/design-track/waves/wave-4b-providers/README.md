---
title: Wave 4b — provider parts
wave: 4b
status: charter draft
depends_on_waves: [1, 2, 3, "4a"]
---

# Wave 4b — provider parts

## Purpose

Deepen jig's **four provider seams** — Agent, Execution host, Forge, Work source — from the
port-skeleton altitude Wave 3's `w3-s1` left them at into authored, boundary-respecting provider
design, implemented **against** Wave 3's ports and **consuming** Wave 4a's committed core contracts
read-only. This is the wave where the governing plan's provider-boundary rule, carried into Wave 4b
by D-004, is tested against real provider designs for the first time: a provider implements against
its port and must **not** redefine core policy, evidence, authorization, or state semantics.
`AGENTS.md` remains repo-contract context for that guardrail, but not the sole authority for the full
Wave 4b wording. Four parts, each its own design problem, each deepening its own section of the
single shared `docs/design/contracts/providers.md`:

- **`w4-s5` — Agent provider** (`docs/design/contracts/providers.md`, Agent section): the contained
  coding worker — reads a work item, writes code, runs checks, reports. The stub-vs-real-driver
  posture (only the scripted-worker stub is built first; the real agent driver is a named extension
  point), the structural no-privileged-method guarantee (`INV-002`, cited), and the
  capability-attestation claim it supplies to `w4-s2`/`w4-s3`.
- **`w4-s6` — Execution host provider** (`docs/design/contracts/providers.md`, Execution host
  section): where the worker runs — the containment-proof discipline (SEC-2 no-phone-home, proven
  not asserted), the isolation-strength categories a host self-reports against, honest reporting
  (DRIVE-3), and the host's structural contribution to ISO-4. The wave's one **escalated** part.
- **`w4-s7` — Forge provider** (`docs/design/contracts/providers.md`, Forge section): the push / PR
  / merge target — the runner-exclusive landing adapter, respect for a forge's own branch-protection
  and merge-queue rules, and the mechanical block-surfacing act (MERGE-5).
- **`w4-s8` — Work source provider** (`docs/design/contracts/providers.md`, Work source section):
  where work items originate — the candidate origination/provenance surface and the
  never-bypasses-plan discipline (a candidate invariant, flagged for U9 dedup with Wave 3's own
  candidate of the same name).

This wave **authors real jig design content** — the provider seams every stack-portability
guarantee reconciles to — so each story runs the **full** frame → author → design-review method. It
is framed **per part**, not with a single wave frame: the four frames live in [`frames/`](./frames/)
(mirroring [`stories/`](./stories/)), the same deliberate deviation Wave 4a used, justified by the
plan's "Wave 4 gets a frame per part" instruction (each provider seam is its own design problem).
Wave 4b is the **second commit unit of Wave 4**, after [`../wave-4a-core/`](../wave-4a-core/README.md)
(committed): its frames consume Wave 4a's committed output — especially `w4-s1`'s records/evidence
surface and `w4-s2`'s evidence/attestation model — as their frame-time contract, which is why 4b
could not be one unit with 4a. See [`decisions.md`](./decisions.md) (D-001..D-006) for the
frame-gate dispositions this charter and the four stories are authored under; this charter does not
restate them.

Per **D-001** this wave deepens each provider's section of the existing `status: draft — stub`
`contracts/providers.md` **in place, no rename** — preserving and citing each seam's existing
Owns/Interface/Notes/Diagram as the deepened section's seed (STOP-003: re-project and cite, never
overwrite). This is Wave 4a's D-001 deepen-in-place pattern applied to a **shared** file rather than
four separate `core/*` files. The whole-vs-split question — whether the deepened file later splits
into `contracts/providers/{agent,execution-host,forge,work-source}.md` — is a `DocStructurePlan`
call deliberately **left OPEN for the author session** (D-006), stated canonically in `w4-s5`'s
story and cross-referenced by the other three.

Per **D-002** the four parts do **not** share one mode/depth. `w4-s5`, `w4-s7`, and `w4-s8` run at
`architecture_mode: ports-and-adapters`, `ddd_depth: ports-and-adapters` — each is adapter-isolation
work (a stub-vs-real-driver posture; a runner-exclusive forge adapter; the thinnest work-source
seam), with no new provider-owned invariant boundary of its own. `w4-s6` runs one rung **up**, at
`architecture_mode: tactical-ddd`, `ddd_depth: tactical-ddd` — the wave's one escalated part. Its
containment-proof discipline (SEC-2, proven not asserted) plus its structural ISO-4 workspace
isolation is a genuine provider-owned invariant with a concrete failure-token catalog (containment
unproven, isolation-strength overstated, workspace collision) — the ladder's tactical trigger. This
lands the concurrency / real-provider-adapter axis that **Wave 3's D-002** ("tactical escalation
stays in Wave 4b, keyed on real provider adapters + concurrency ISO-4") and **Wave 4a's D-002**
("Wave 4b remains the escalation point for the concurrency/adapter axis") both explicitly deferred
here — so it is the fulfillment of those forecasts, not a contradiction. **The escalation carries a
boundary-rule guardrail** (D-002): `w4-s6`'s tactical depth is **provider-owned** (its containment
mechanism, proof-generation, honest self-report) and does **not** re-own or redefine `w4-s3`'s
freshness/sufficiency judgment, `w4-s2`'s evidence-category taxonomy, or `w4-s1`'s log consistency
model — all cited read-only.

## Required input docs

- The four per-part frames in [`frames/`](./frames/) —
  [`w4-s5-agent-provider.md`](./frames/w4-s5-agent-provider.md),
  [`w4-s6-execution-host-provider.md`](./frames/w4-s6-execution-host-provider.md),
  [`w4-s7-forge-provider.md`](./frames/w4-s7-forge-provider.md), and
  [`w4-s8-work-source-provider.md`](./frames/w4-s8-work-source-provider.md) — each carrying its
  source map, `InputResolution`, `AgreedSystemModel`, per-part `architecture_mode`/`ddd_depth`, and
  the cross-part seam wording that seeds its story's frame step.
- [`./decisions.md`](./decisions.md) — the six frame-gate dispositions (D-001..D-006) and the
  confirmed safe assumptions (ISO-4 ownership split; MERGE-5 block-surfacing split; provenance/
  import-sync named at shape level only; author-time contention not dependency) all four stories are
  authored under.
- [`../wave-1-domain/frame.md`](../wave-1-domain/frame.md),
  [`../wave-1-domain/decisions.md`](../wave-1-domain/decisions.md), and Wave 1's two settled story
  briefs — the entity model that crosses these seams: Work item's done-vs-landed distinction (Wave
  1's D-003, deepened by Wave 2); Execution plan as jig's one hard input; Policy/Work-profile as
  jig-owned domain objects (Wave 1's D-001) whose content a provider never redefines.
- [`../wave-2-state-machines/frame.md`](../wave-2-state-machines/frame.md),
  [`../wave-2-state-machines/decisions.md`](../wave-2-state-machines/decisions.md), and Wave 2's
  three settled story briefs — the closed state machines these providers are invoked from: the Agent
  port at the work-item `started` state; the Forge port at the `done → landed` transition; the
  `blocked` state a Forge block surfaces from; the scheduling/eligibility discipline (ISO-4) a work
  source and an execution host must not bypass or collide with.
- [`../wave-3-ports/frame.md`](../wave-3-ports/frame.md),
  [`../wave-3-ports/decisions.md`](../wave-3-ports/decisions.md), and Wave 3's two settled story
  briefs — the port **shapes** these providers implement against: the Agent/Execution-host/Forge/
  Work-source ports' candidate anti-corruption stances (`w3-s1`), preserved and cited, not
  redesigned; and Wave 3's own un-numbered `INV-009`+ candidate for the work source (flagged for
  dedup with `w4-s8`).
- The four Wave 4a committed frames and their targets, **cited read-only** as this wave's frame-time
  contract — [`../wave-4a-core/frames/w4-s1-records-observability.md`](../wave-4a-core/frames/w4-s1-records-observability.md)
  (the records/evidence surface `w4-s6` frames its SEC-2 attestation against),
  [`../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)
  (the evidence/attestation category model `w4-s6` frames its EARN-2 attestation against; the policy
  sufficiency and GUARD-2 rule `w4-s7` respects as preconditions),
  [`../wave-4a-core/frames/w4-s3-authority-spine.md`](../wave-4a-core/frames/w4-s3-authority-spine.md)
  (the Fence classifier and capability-attestation gate that **judges** provider claims), and
  [`../wave-4a-core/frames/w4-s4-bootstrap-composition-root.md`](../wave-4a-core/frames/w4-s4-bootstrap-composition-root.md)
  (the composition root that wires the four provider ports), plus
  [`../wave-4a-core/decisions.md`](../wave-4a-core/decisions.md) (Wave 4a's D-002 concurrency/
  adapter-axis reconciliation; D-005 `INV-009`+ posture).
- `docs/design/contracts/providers.md` — the existing stub this wave deepens in place, each part
  preserving and citing its own seam's Owns/Interface/Notes/Diagram as the seed; the four seams'
  STACK/DRIVE reconciliation the deepened sections continue.
- `docs/design/contracts/execution-plan-contract-v0.md`,
  `docs/design/contracts/observability-records-contract-v0.md` — the two v0 data contracts these
  seams reconcile to (a work source's supplied items cross the plan-in seam; provider outcomes are
  events into the records-out seam); cited and **unfrozen**, not edited (no minting field names or
  event-type strings; a needed change routes back to the seam owner per STOP-003).
- `docs/design/core/orchestration.md` — the runner as the caller of the provider ports (drives the
  Agent port; sole holder of push/PR/merge authority into the Forge port); Wave 2's settled
  territory, cited not re-authored.
- `docs/product/guarantees.md` — the ID-bearing commitments the four parts reconcile to (each gloss
  matches that story's `reconciles_to` frontmatter exactly; the `INV-*` members each story also
  reconciles to are a distinct namespace, listed against `runtime-design-m5a.md` below): STACK-1,
  STACK-2, STACK-4, STACK-5, DRIVE-1, EARN-1, EARN-2, FENCE-1, FENCE-2, FENCE-3, MERGE-1, MERGE-2,
  ISO-1 (s5); SEC-2, DRIVE-3, ISO-4, STACK-1, STACK-2, STACK-4, STACK-5, EARN-1, EARN-2 (s6);
  MERGE-1, MERGE-2, MERGE-3, MERGE-4, MERGE-5, FENCE-3, SEC-3, STACK-1, STACK-2, STACK-4, STACK-5
  (s7); STACK-1, STACK-2, STACK-4, STACK-5, CFG-4, CFG-7 (s8).
- `docs/product/concepts.md` — the runner/worker authority-boundary paragraph (`w4-s5`'s structural
  anti-corruption stance) and the track model (the plan as jig's one runtime input, upstream of the
  work source — `w4-s8`).
- `docs/design/notes/runtime-design-m5a.md` — the live handoff-category vocabulary the four parts
  continue: `INV-002`/`ENF-002` (the Agent port's no-privileged-method rule, cited by `w4-s5`),
  `SURF-003`/`SURF-006` (the scripted-stub shape and the still-unbuilt provider ports), `CTX-005`/
  `DEL-004` (only the Agent seam has a built adapter) — kept a namespace distinct from `INV-*` and
  product IDs.

## Required output docs

- The deepened **Agent section** of `docs/design/contracts/providers.md` (the stub-vs-real-driver
  posture, the structural no-privileged-method guarantee cited from `INV-002`, the attestation-claim
  shape supplied to `w4-s2`/`w4-s3`), authored by `w4-s5` — deepened in place, preserving and citing
  the existing Agent Owns/Interface/Notes as its seed.
- The deepened **Execution host section** of `docs/design/contracts/providers.md` (the
  containment-proof discipline for SEC-2, the isolation-strength categories, honest reporting for
  DRIVE-3, the host's ISO-4 contribution), authored by `w4-s6` — deepened in place, at `tactical-ddd`
  depth (D-002) with the boundary-rule guardrail.
- The deepened **Forge section** of `docs/design/contracts/providers.md` (the runner-exclusive push/
  PR/merge adapter, respect for the forge's own protection/queue rules, the mechanical
  block-surfacing act for MERGE-5), authored by `w4-s7` — deepened in place.
- The deepened **Work source section** of `docs/design/contracts/providers.md` (the candidate
  origination/provenance surface and the never-bypasses-plan discipline), authored by `w4-s8` —
  deepened in place; provenance/import-sync named at shape level only.
- This wave's [`decisions.md`](./decisions.md), carrying D-001..D-006 and any design-review
  dispositions the four stories add.
- **No `story-dag.md` this wave** (D-006). Unlike Wave 4a — whose `w4-s4` structurally consumed its
  three siblings (a logical dependency that earned a DAG, Wave 4a's D-004) — Wave 4b's four parts are
  logically independent (`depends_on: []` each; distinct product-ID clusters; no part consumes
  another's settled content). The shared `providers.md` is **contention, not a logical dependency**;
  the contention posture is recorded in [`decisions.md`](./decisions.md) (D-006) and in "Story order"
  below rather than in a DAG the plan writes "only where internal deps earn it."

## Questions it must answer

- For **`w4-s5`**: how does the Agent port's adapter expose the contained worker's request/observe
  surface with **no privileged method** (`INV-002`, cited structural/compile-time — never re-minted),
  and how is the **stub-vs-real-driver posture** stated so the scripted-worker stub is the one built
  adapter, visibly a stub (the track's Stub rule), and the real agent driver is a named extension
  point? What capability-attestation **claim** does the Agent adapter supply into `w4-s2`'s category
  model — a claim only, judged by `w4-s3` (EARN-1/2), never a self-certification?
- For **`w4-s6`**: how does the execution host **prove** confinement rather than assert it (SEC-2 no
  phone home), what isolation-strength categories does it self-report against (DRIVE-3, honest
  reporting), and what is the host's structural contribution to ISO-4 (isolated workspace per run)?
  How does its containment proof frame **against** `w4-s1`'s records/evidence surface and `w4-s2`'s
  EARN-2 attestation model as a supplied claim, while the **guardrail** holds — the host owns the
  mechanism, proof, and honest report, and does **not** own `w4-s3`'s freshness/sufficiency judgment,
  `w4-s2`'s taxonomy, or `w4-s1`'s log model?
- **SEC-2 three-way boundary (`w4-s6`, per D-003, worded per the frame):** how does SEC-2 get an
  owner without duplicating or orphaning the red-team work — `w4-s6` owns the design posture and the
  proof requirement/seed; **Wave 5** (red team, future) authors the full adversarial phone-home
  scenario; a future **U9** `review-and-red-team.md` collects both? Wave 5 and the collector file do
  not exist on disk yet; they are named as **forward references to planned coordinator artifacts**.
- For **`w4-s7`**: how does the Forge port's adapter execute the runner's push/PR/merge as the
  runner's **exclusive** delegate (never the worker — MERGE-2, FENCE-3, SEC-3), respecting a forge's
  own branch-protection and merge-queue rules rather than overriding them, and how does it perform
  the **mechanical** block-surfacing act (open/update a PR, post status, write failure reasons —
  MERGE-5) after the runner's evidence-sufficiency (`w4-s2`, cited) and any GUARD-2 pause
  (`w4-s2`/`w4-s3`, cited) have cleared? It implements the `done → landed` action, it does **not**
  redefine what done or landed means (Wave 1/2).
- For **`w4-s8`**: how does the Work source port surface candidate origination/provenance while the
  **never-bypasses-plan** discipline holds — anything it supplies still crosses `PlanValidator`
  (`w4-s2`, cited); no work item reaches the runner except through the validated plan? How is this
  part's `INV-009`+ candidate (work-source-never-bypasses-plan) **flagged as likely identical** to
  Wave 3's own un-numbered candidate — both wordings recorded side by side, dedup deferred to U9,
  not silently merged and not silently duplicated?
- **Cross-part (all four):** does each part's provider design honor the **boundary rule** — implement
  against its Wave 3 port, consume Wave 4a's core contracts read-only, and **never** redefine core
  policy, evidence sufficiency, authorization, or state semantics? Which new invariants does each
  part mint (as `INV-009`+ **candidates**, un-numbered — `w4-s6`'s two; `w4-s8`'s one flagged for
  dedup; `w4-s5` citing `INV-002`; `w4-s7` minting none), flagged for cross-wave reconciliation with
  Wave 2's `w2-s3`, Wave 3's, and Wave 4a's candidates at U9, keeping the three ID namespaces
  distinct?

## What it must not decide

- **The boundary rule is absolute** (D-004): no provider part may **redefine core policy, evidence
  sufficiency, authorization, or state semantics**. A provider implements against its port and
  consumes Wave 4a's core contracts (`w4-s1` records/evidence, `w4-s2` policy/evidence,
  `w4-s3` authority) **read-only**. Providers **supply** attestation claims; `w4-s3` **judges** them
  (EARN-1/2) and `w4-s1` records them. A part that finds a provider area needing to originate a
  policy, evidence, or state rule routes that finding back to core's design (Wave 4a), never defines
  it locally.
- **The Wave 5 red-team scenario** — `w4-s6` owns the SEC-2 design posture and proof requirement/seed
  only; the full adversarial phone-home scenario is **Wave 5**'s, and its collection is a future
  **U9** `review-and-red-team.md` concern (D-003). This wave names those as forward references; it
  does not author the scenario or the collector.
- Anything **Wave 3** already settled: the four provider port **shapes** and their owns/implements/
  must-not splits. This wave deepens each seam's adapter-level detail **behind** its port, preserving
  and citing the port line as the seed; it does not redesign the port boundary.
- Anything **Wave 2** already settled: the work-item and run **state machines**. The Forge port is
  invoked **at** the `done → landed` transition and surfaces **from** the `blocked` state — it does
  not author either; the execution host provides the isolated workspace ISO-4's scheduling discipline
  (Wave 2) relies on, without owning that discipline.
- Anything **Wave 1** already settled: the entity model, the done-vs-landed milestone semantics (Wave
  1's D-003), the plan-as-jig's-one-input boundary. Providers implement around these entities; they
  do not re-open them.
- **The `providers.md` split** — whether the deepened file later splits into `contracts/providers/
{agent,execution-host,forge,work-source}.md` is an author-time `DocStructurePlan` question left
  **OPEN** (D-006), stated canonically in `w4-s5`'s story; not decided this wave.
- **Freezing** either v0 data contract — `execution-plan-contract-v0.md` and
  `observability-records-contract-v0.md` stay **cited and unfrozen**; a work source's supplied items
  cross the plan-in seam and provider outcomes are events into the records-out seam without minting
  field names or event-type strings; a needed change routes back to the seam owner (STOP-003).
- **Numbering** the consolidated invariant ledger — the parts name `INV-009`+ **candidates**;
  `w4-s5` **cites** `INV-002` and does not re-mint it; `w4-s8`'s candidate is flagged as likely
  identical to Wave 3's and **not** duplicated; physical numbering is coordinated with Wave 2's
  `w2-s3`, Wave 3's, and Wave 4a's candidates at U9, never hard-numbered here. Never reset
  `INV-001..008`.
- Concrete **provider implementation** — no real coding-agent, no sandbox technology, no forge-vendor
  API, no origin-system connector is built or its internals designed this wave; the wave authors the
  provider **seam design** (the anti-corruption stance, the contract a future adapter is held to),
  not an adapter.
- Field-level schema, TypeScript interfaces, JSON Schema, method signatures, or any frozen contract —
  deferred per `docs/design/README.md` and this track's non-goals.

## Exit criteria

- All four stories (`w4-s5`, `w4-s6`, `w4-s7`, `w4-s8`) are run and settled: zero open blocking
  suggestions from `review-technical-design` (the full method — architecture-enforceability,
  domain-correctness, agreement-integrity), applied over their authored provider sections.
- The four deepened provider sections exist in `docs/design/contracts/providers.md`, each preserving
  and citing the existing seam's Owns/Interface/Notes/Diagram as the seed rather than overwriting it
  (STOP-003), each reconciling to its `reconciles_to` IDs, and continuing (never resetting) the
  `INV-*` vocabulary.
- Every part's **boundary-rule statement** is present and identical in spirit: implements against its
  Wave 3 port, consumes Wave 4a's core contracts read-only, never redefines core policy/evidence/
  authorization/state; providers supply attestation claims, `w4-s3` judges, `w4-s1` records.
- `w4-s5`'s stub-vs-real-driver posture is stated (scripted stub the one built adapter, visibly a
  stub; real driver a named extension point); `INV-002` is **cited** for no-privileged-method, not
  re-minted.
- `w4-s6` is authored at `tactical-ddd` depth with its **guardrail** explicit (owns containment/
  proof/honest-reporting; does not re-own `w4-s3` judgment / `w4-s2` taxonomy / `w4-s1` log model);
  its **SEC-2 three-way boundary** (this wave / Wave 5 / U9's `review-and-red-team.md`) is stated
  consistently with D-003 and the s6 frame; the **s6 ↔ s5 containment seam** is stated consistently
  in both stories.
- `w4-s7`'s runner-exclusive push/PR/merge adapter, forge-protection respect, and mechanical
  block-surfacing (MERGE-5) are stated; it implements `done → landed` without redefining the
  milestone semantics (Wave 1/2, cited); evidence-sufficiency and GUARD-2 are cited preconditions,
  not re-evaluated.
- `w4-s8`'s never-bypasses-plan discipline is stated; its `INV-009`+ candidate is **flagged as likely
  identical** to Wave 3's own candidate, recorded side by side, dedup deferred to U9 — not merged,
  not duplicated; provenance/import-sync is named at shape level only.
- The new invariant candidates (`w4-s6`'s two; `w4-s8`'s one, flagged) are named for `INV-009`+ and
  flagged for cross-wave reconciliation; the three ID namespaces are kept distinct.
- D-001..D-006 are recorded in this wave's `decisions.md`, and every frame item flagged `requires
approval` (per-part depth; the SEC-2 boundary) is stated as settled in the authored sections
  consistent with those dispositions. **No `story-dag.md` is written** (D-006); the shared-file
  contention posture is recorded in `decisions.md` and this charter's "Story order" instead.

## Evidence required

- This charter (`README.md`) and the four per-part frames in [`frames/`](./frames/).
- Each story's own evidence: its authored provider section in `docs/design/contracts/providers.md`,
  its `review-technical-design` report, and its `decisions.md` entries.
- This wave's [`decisions.md`](./decisions.md).

## Story order

The four stories carry `depends_on: []` **each** (D-006). They are logically independent provider
designs — distinct product-ID clusters (STACK/DRIVE/EARN/FENCE/MERGE/ISO for s5; SEC/DRIVE/ISO/STACK/
EARN for s6; MERGE/FENCE/SEC/STACK for s7; STACK/CFG for s8), with no part consuming another's
settled content — so no author-time DAG binds them, and **this wave gets no `story-dag.md`** (unlike
Wave 4a, whose `w4-s4` earned one by structurally consuming its three siblings).

The one relationship among them is **contention, not dependency**: all four currently deepen the same
file, `docs/design/contracts/providers.md`. Whether their authoring **serializes or parallelizes** is
itself _contingent on the open `DocStructurePlan` split question_ (D-006): if the future author
session keeps one shared file, authoring likely serializes (one story edits the file at a time, or a
single session authors all four sections together, as the frame pass did for coherence); if it splits
into `contracts/providers/{agent,execution-host,forge,work-source}.md`, the four sessions can run in
parallel with no file contention. This charter records the posture; it does not resolve the split
question that would settle it.

1. [`w4-s5-agent-provider`](./stories/w4-s5-agent-provider.md) — the Agent provider: the
   stub-vs-real-driver posture, the structural no-privileged-method guarantee (`INV-002`, cited), the
   attestation-claim supply. `depends_on: []`. `ports-and-adapters` / `ports-and-adapters` (D-002).
   Carries the canonical `DocStructurePlan` split-question statement the others cross-reference.
2. [`w4-s6-execution-host-provider`](./stories/w4-s6-execution-host-provider.md) — the Execution host
   provider: the containment-proof discipline (SEC-2), isolation-strength categories, honest
   reporting (DRIVE-3), the ISO-4 contribution. `depends_on: []`. `tactical-ddd` / `tactical-ddd`
   (D-002, the one escalated part) with the boundary-rule guardrail. Carries the SEC-2 three-way
   boundary and the s6 ↔ s5 containment seam.
3. [`w4-s7-forge-provider`](./stories/w4-s7-forge-provider.md) — the Forge provider: the
   runner-exclusive push/PR/merge adapter, forge-protection respect, the mechanical block-surfacing
   act (MERGE-5). `depends_on: []`. `ports-and-adapters` / `ports-and-adapters` (D-002).
4. [`w4-s8-work-source-provider`](./stories/w4-s8-work-source-provider.md) — the Work source
   provider: the candidate origination/provenance surface and the never-bypasses-plan discipline
   (candidate invariant, flagged for U9 dedup with Wave 3). `depends_on: []`. `ports-and-adapters` /
   `ports-and-adapters` (D-002).
