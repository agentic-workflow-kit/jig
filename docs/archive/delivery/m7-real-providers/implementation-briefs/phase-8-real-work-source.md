---
title: "Phase 8 implementation brief — Real work-source integration"
status: completed history
---

# Phase 8 implementation brief — Real work-source integration

> **Closeout note (2026-07-04):** retained as M7 delivery history after org M7 accepted
> EVRUN-partial exit evidence. EVRUN-full remains post-M7 Codex-transport debt.

## Context and goal

Phase 5 pinned and merged the four provider ports, the composition root, and the driver conformance
suite as **exercised jig-internal seams** proven with **reference adapters** (commit `f59a479`); Phase 6
promoted the **agent** and **execution-host** seams to real drivers
([ADR 0022](../../../design/decisions/0022-phase-6-real-driver-integration.md)); Phase 7 promoted the
**Forge** seam to a real Forge/GitHub adapter
([ADR 0023](../../../design/decisions/0023-phase-7-real-forge-landing.md)). Phase 8 promotes the **Work
source** seam from the reference adapter to **real importer(s)** behind the same, unchanged
`WorkSourcePort.candidates()`: the phase in which candidate work first arrives from a **real external
source** (an issue tracker or other system) rather than being seeded from the operator-supplied plan.
Two properties are the whole point: **every candidate crosses `PlanValidator` before runtime scheduling**
(INV-007), and **provenance is richer than the single `'jig-validated'` literal** so a record can name
where a candidate came from. Every acceptance criterion is a test citing its AC ID.

The design is closed in
[ADR 0024](../../../design/decisions/0024-phase-8-real-work-source.md). This brief is
implementation-ready **against that ADR**: it does not re-decide the 8a/8b split, the intake-chokepoint
location property, the provenance-shape widening, or the no-freeze provenance encoding — it implements
them. Where a detail is genuinely design- or contract-owner-owned rather than a local implementation
choice, this brief says so and routes it back per the stop conditions; do not fill gaps by invention.

**The load-bearing insight (ADR 0024 Decision 2).** The composition root validates the **seed** plan
(`bootstrap.ts` `PlanValidator.validate(options.planInstance)`, line 164), but the thing actually
**scheduled** is `candidate.planInstance` returned by `composed.workSource.candidates()`
(`cli.ts` 121→139; `resume.ts` 390). The reference adapter is seeded from that same object, so
`candidate.planInstance === the validated seed` — **identity masks the gap**. A real importer breaks the
identity: it builds fresh plans from an external source that never crossed `validate`, and
`harness.run(candidate.planInstance)` would schedule them **unvalidated**. Phase 8's core work is closing
that gap **structurally**: a single `PlanValidator`-gated intake chokepoint mints an **opaque
runtime-verifiable validated wrapper** carrying an **unforgeable runtime marker** only intake can produce,
and `LocalHarness.run` / `LocalHarness.resume` are narrowed to accept **only** that wrapper — never a raw
`PlanInstance`. Two enforcement layers, both required: **(i)** compile-time — an unwrapped plan is a type
error for typed callers; **(ii)** runtime — because a type-level brand is **erased at runtime**, `run` /
`resume` **check the marker at runtime** so an `any`-typed caller or a value crossing a deserialization
boundary that lacks the marker is **refused fail-closed and recorded** (P8-AC-2). "The callers call an
intake step" is not enough, and a type-level-only brand is not enough either — the scheduling API must
refuse marker-less values at runtime (ADR 0024 Decision 2, the crux).

**Scope (binding): real work-source import, opt-in, unfrozen.** No webhook/scheduler-triggered runs, no
legacy run migration (both org-deferred), no records tamper-evidence or active re-approval path
(Phase 9), no hosted/multi-tenant/remote operation. The v0 contracts stay unfrozen; the **only**
port-type change is widening `CandidateWorkItem.provenance` from the single literal `'jig-validated'` to
an origin-bearing shape (ADR 0024 Decision 3) — a jig-internal seam edit that freezes nothing;
`WorkSourcePort.candidates()`'s method surface is unchanged. The default (reference) wiring must
reproduce the Phase-0..4 dry-run and its golden records **exactly** — that is the regression anchor,
alongside the conformance suite still failing closed on a broken adapter.

**Dependency: Phases 5–7 are delivered on current `main`** (the four ports, composition root,
capability-attestation gate, conformance suite, the real agent/host/forge drivers, `src/redaction.ts`,
`src/substrate.ts`, `src/clock.ts`, `src/providers/real/forge.ts`). Verify the baseline gate
(`corepack pnpm check` green) before editing runtime behavior.

## Source files to read

Read, in order:

- [`../phases.md`](../phases.md) — the **authoritative** Phase 8 section and P8-AC-1..3. These IDs are
  the binding delivery target, with their guarantee traces.
- [ADR 0024](../../../design/decisions/0024-phase-8-real-work-source.md) — the five settlements this
  brief implements (the real importer + opt-in driver name, the single structural intake chokepoint, the
  origin-bearing provenance widening, the 8a/8b split + AC assignment, and the two regression anchors).
- [`../repo-plan-m7.md`](../repo-plan-m7.md) — the open questions routed to design (open question 2: if
  richer work-source provenance forces any observability-records field change, that is a contract change
  routed to M1 — **it does not**, per ADR 0024 Decision 3; do not re-open).
- [ADR 0021](../../../design/decisions/0021-phase-5-integrated-provider-runs.md) decision 7 (the
  work-source seam: candidates cross plan intake; the port is not a scheduler and not an authorization
  channel; the `w4-s8`/`w4-s2` stop condition) — the carry-forward Phase 8 realizes structurally.
- [`../../../design/core/plan-intake.md`](../../../design/core/plan-intake.md) — the `PlanValidator`
  validate-once boundary, INV-007, the `No second scheduling input` invariant candidate, and the
  "Phase 8 realization (ADR 0024)" note (the seed-vs-candidate chokepoint).
- [`../../../design/contracts/providers.md`](../../../design/contracts/providers.md) — the Work-source
  seam's owns/implements/must-not contract, the `work-source-never-bypasses-plan` candidate invariant,
  and the "Phase 8 realization (ADR 0024)" section.
- [`../../../design/contracts/observability-records-contract-v0.md`](../../../design/contracts/observability-records-contract-v0.md)
  — the **"v0 Not Frozen"** posture and the `run.drivers.workSource` driver-identity field
  (`"work-source:local-plan"`) that already carries the origin. Real candidate origin rides this existing
  field / an additive event basis — **do not mint a new field or event family, do not freeze.**
- [`../../../design/notes/prior-art-workflow-kit.md`](../../../design/notes/prior-art-workflow-kit.md)
  (the "dry-run is greenfield" finding: the prototype's Work-Source candidate-count lookup never entered
  the run-lifecycle machine; lessons 5–6 the two-authorities boundary) — the re-derived (never ported)
  recipe. **Keep jig's `PlanValidator` crossing — the improvement the prototype lacked; do not regress
  it.**
- [Phase 7 brief](phase-7-real-forge-landing.md) — the delivered real-driver, opt-in-driver-name,
  additive-record, and golden-fixture conventions Phase 8 builds on (and the Residual-B port-widening
  pattern Phase 8's provenance widening mirrors).

## Current delivered surfaces consumed from Phases 5–7

Confirmed against `src/` at authoring time — build on these, do not re-derive them:

- **The Work-source port is merged** ([`../../../../../packages/jig-sdk/src/ports.ts`](../../../../../packages/jig-sdk/src/ports.ts)):
  `WorkSourcePort.candidates(): CandidateWorkItem[] | Promise<CandidateWorkItem[]>`, and
  `CandidateWorkItem` is `{ planInstance: PlanInstance; provenance: 'jig-validated' }` — **`provenance`
  is a single string literal, not an origin-bearing shape**. It is the field Phase 8 enriches.
- **`PlanValidator` is a merged static validator**
  ([`../../../../../packages/jig-sdk/src/plan-validator.ts`](../../../../../packages/jig-sdk/src/plan-validator.ts)):
  `PlanValidator.validate(planInstance): PlanInstance` — validates `execution-plan-shape-v0`; throws a
  reason-bearing `Error` on unknown version, missing/malformed/path-traversal id, empty/duplicate/
  late-dependency stories; otherwise returns the instance. This is the crossing (INV-007).
- **The composition root validates the seed, not the candidate.** `composeReferenceRun` →
  `composeRunPorts` ([`../../../../../packages/jig-sdk/src/bootstrap.ts`](../../../../../packages/jig-sdk/src/bootstrap.ts)) calls
  `PlanValidator.validate(options.planInstance)` (line 164), then wires
  `workSource: new ReferenceWorkSource(options.planInstance)` (line 204). It supports
  `workSource=reference` only and fails closed on an unknown driver (`ProviderSelectionError`).
- **The candidate is what gets scheduled.** `cli.ts` (lines 121→139) does
  `const [candidate] = await composed.workSource.candidates()` then
  `await harness.run(candidate.planInstance, config, policy)`; `resume.ts` (line 390) does the same. The
  reference `candidate.planInstance` is the validated seed **by identity** — a real importer breaks that.
- **The reference work-source models the seed candidate**
  ([`../../../../../packages/jig-sdk/src/providers/reference/work-source.ts`](../../../../../packages/jig-sdk/src/providers/reference/work-source.ts)):
  `candidates()` returns `[{ planInstance: this.planInstance, provenance: 'jig-validated' }]`. This is the
  Phase-8 replacement on the **real** path only; the default/reference path is untouched.
- **The conformance suite already anchors the crossing**
  ([`../../../../../packages/jig-testkit/src/provider-conformance.ts`](../../../../../packages/jig-testkit/src/provider-conformance.ts)
  lines 95–102): it runs `candidates()`, validates each `candidate.planInstance`, and records
  `work-source-plan-intake-bypass` when a candidate does not cross validation. Phase 8 extends it.

## Non-goals

Do not:

- change the **`WorkSourcePort.candidates()` method surface** — the only port-type edit is widening
  `CandidateWorkItem.provenance` to the origin-bearing shape (ADR 0024 Decision 3); do **not** make the
  Work-source seam a scheduler or an authorization channel (ADR 0021 decision 7; `providers.md` Work
  source must-not);
- implement webhook- or scheduler-triggered runs, or legacy run migration (both org-deferred), or
  records **tamper-evidence** / the active re-approval path (Phase 9);
- change the records the default (reference) wiring emits, or regress the Phase-0..4 golden fixtures —
  the reference candidate and its provenance stay byte-identical on the default path;
- **mint a new event family** — the recorded bypass maps onto the `rejected`/`denied` families already
  named; the candidate origin maps onto the `run.drivers.workSource` field and additive event basis
  already named;
- freeze a JSON Schema, event constants, a provenance/origin records field, or a TypeScript **contract**
  package for the execution-plan or observability-records v0 seams — if richer provenance genuinely
  needs a frozen records field, that is a stop routed to the contract owner (it does not: the contract is
  "v0 Not Frozen" and already carries `run.drivers.workSource`);
- add manifests, port interfaces, or event constants **to the fixtures directory** as normative
  artifacts (fixtures README Contract-Preservation Rule) — keep any real-work-source fixture plainly
  non-normative;
- introduce a new lifecycle state, transition table, or event family; Phase 8 records are additive;
- let "real work source" expand into webhook-, scheduler-, or concurrent-pull-triggered runs before the
  local real import proves out.

## Likely source files touched / new modules (names are suggestions, not mandates)

- `src/ports.ts` — widen `CandidateWorkItem.provenance` from the literal `'jig-validated'` to the
  origin-bearing shape `{ /* names source + identifier */ ; jigValidated: true }` (exact field names are
  design-deferred; the meaning — origin named **and** jig-validated asserted — is fixed by ADR 0024
  Decision 3). `WorkSourcePort.candidates()` surface is unchanged.
- `src/providers/real/work-source.ts` (new) — the real importer(s) behind `WorkSourcePort.candidates()`:
  produce `CandidateWorkItem`s from a real source, each carrying an origin-bearing provenance.
- `src/intake.ts` (new, or fold into the composition root) — the **single validated-intake chokepoint
  that mints the runtime-verifiable validated wrapper**: given the composed `workSource`, run
  `candidates()`, `PlanValidator.validate` each `candidate.planInstance`, reject-or-hold a failing
  candidate, and return an **opaque validated wrapper** (e.g. `ValidatedPlan` / `ValidatedCandidate`)
  carrying an **unforgeable runtime marker** — a **module-private `Symbol`**, a **private class field**
  (`#validated`), or a branded nonce — that **only this module can set** (the marker / constructor is not
  exported for arbitrary construction). This is the sole minter; it is the structural INV-007 enforcement
  (ADR 0024 Decision 2).
- `src/harness.ts` — **narrow the scheduling signatures to accept only the validated wrapper, AND add a
  runtime marker check.** `LocalHarness.run(planInstance: PlanInstance, config, policy)` (line 246) and
  `LocalHarness.resume(planInstance: PlanInstance, policy, resumePlan)` (line 364) currently accept a
  **raw `PlanInstance`**; change both to accept the **validated wrapper** instead — (i) a raw/unwrapped
  plan is a **type error** for typed callers. And because a compile-time brand is **erased at runtime**,
  (ii) `run` / `resume` **verify the runtime marker** on entry: a value lacking it (a raw `PlanInstance`,
  an `any`-typed caller's object, a deserialized object) is **refused fail-closed and the bypass is
  recorded** (via the existing `rejected`/`denied` families), not silently scheduled. The runtime marker
  lives on the **in-memory wrapper only** — the scheduler unwraps to the same `PlanInstance` payload for
  execution/recording and the marker is **never serialized**, so no record field or emitted byte changes
  (goldens stay byte-identical).
- `src/bootstrap.ts` — add the real work-source driver name (e.g. `workSource: 'github-issues'`) to the
  composition root's selection (`assertReferenceSelection`'s `workSource` set), mirroring the Phase-6
  `agent: 'codex'` / Phase-7 `forge: 'github'` pattern; keep the composition root the sole importer;
  unknown work-source name fails closed (`ProviderSelectionError`).
- `src/cli.ts`, `src/resume.ts` — obtain the validated wrapper from the intake chokepoint and pass **it**
  to `harness.run` / `harness.resume` (line 400, `harness.resume(candidate.planInstance, …)`) — never a
  raw `candidate.planInstance`; record a rejected/held bypass through the existing `rejected`/`denied`
  family.
- `src/conformance/*` — Phase-8 adversarial additions (candidate that does not cross `PlanValidator`;
  a **direct-`run`/`resume` bypass** attempt with a raw/marker-less candidate exercising the **runtime**
  refusal; provenance that omits the per-candidate identifier / collapses origin).
- `tests/*` — new tests named per AC ID (below); `tests/fixtures/**` — real-work-source, bypass-attempt,
  and origin-provenance fixtures (all non-normative).

## Concrete implementation slices — ordered per the 8a → 8b split

Implement in order. After **every** slice, the Phase-0..4 goldens must still pass under the default
(reference) wiring and the conformance suite must still fail closed on a broken adapter.

### Sub-phase 8a — real importer + the structural `PlanValidator` crossing

#### Slice 1 — the runtime-verifiable validated wrapper + narrowed scheduling signature + runtime marker check (ADR 0024 Decision 2) → P8-AC-1

The crux of Phase 8: enforce the crossing **by construction, not by convention** — and, because a
type-level brand is **erased at runtime**, also **by a runtime marker check**. "The callers call an intake
step" is not enough, and a compile-time-only brand is not enough either — a direct `harness.run` /
`harness.resume` call from an `any`-typed caller, or a value crossing a deserialization boundary, could
still schedule a raw plan or fail **without** the required record. Three mandated edits, together:

- **The single minter of a runtime-verifiable marker.** Add the one intake step (a `src/intake.ts` module
  or a composition-root function) that: runs `composed.workSource.candidates()`, calls
  `PlanValidator.validate(candidate.planInstance)` on **each** candidate, rejects or holds a failing
  candidate, and returns an **opaque validated wrapper** (e.g. `ValidatedPlan` / `ValidatedCandidate`)
  carrying an **unforgeable runtime marker** — a **module-private `Symbol`**, a **private class field**
  (`#validated`), or a branded nonce — that **only this module can set** (do not export the
  marker/constructor for arbitrary construction). This is the single proof-of-crossing and it is
  verifiable at runtime, not merely at compile time.
- **The scheduling API accepts only the wrapper — compile-time narrowing, binding.** Narrow
  `LocalHarness.run(planInstance: PlanInstance, config, policy)` (`src/harness.ts` line 246) and
  `LocalHarness.resume(planInstance: PlanInstance, policy, resumePlan)` (line 364) to accept **only the
  validated wrapper**, never a raw `PlanInstance`. Scheduling a raw / unvalidated plan is then a **type
  error** for typed callers — un-schedulable by construction. The scheduling methods must **stop accepting
  raw `PlanInstance`**.
- **The scheduling methods verify the marker at runtime — binding, this is the load-bearing half.**
  Because the compile-time brand is erased at runtime, `run` / `resume` must **check the runtime marker on
  entry**: a value lacking it (a raw `PlanInstance`, an `any`-typed caller's object, a deserialized object
  reconstructed without crossing intake) is **refused fail-closed and the bypass is recorded** through the
  existing `rejected`/`denied` families — never silently scheduled. Compile-time narrowing alone would let
  an `any`/deserialization-edge caller schedule unvalidated work or fail **without** the required
  P8-AC-2 record; the runtime check is what makes the any-edge fail-closed-**and**-recorded guarantee
  achievable.
- **Both `cli.ts` (run) and `resume.ts` (resume, line 400) obtain the wrapper from the chokepoint and
  pass it to the scheduler.** Neither reaches `harness.run` / `harness.resume` with a raw candidate plan.
  This is the seed-vs-candidate gap closed structurally: `bootstrap.ts:164` validating the **seed** is
  **not** sufficient; the **candidate** plan is what gets scheduled and must carry the marker.
- **Record-invariant — the marker is never serialized.** The runtime marker lives on the **in-memory
  wrapper only**; the scheduler unwraps to the same `PlanInstance` payload it already consumes for
  execution/recording, and the marker is **not** written into any record. No record field, no
  emitted-byte change. The seed plan is already validated at `bootstrap.ts:164`, so threading the wrapper
  through the default/reference path keeps the **Phase-0..4 goldens byte-identical** — a regression anchor
  for this slice.
- A candidate whose `planInstance` fails `PlanValidator.validate` (an `Error` is thrown) is **rejected or
  held** — it never obtains the marker, so it never reaches the runner. No new validation semantics; only
  the guarantee that the candidate plan crosses the existing validator.
- **Test obligation:** (1) a work-source-to-plan-intake test proving a candidate reaches scheduling
  **only** after `PlanValidator`, and a failing candidate is rejected or held and never scheduled;
  (2) a **direct-harness-bypass** obligation exercising the **runtime** refusal — a raw / `any` /
  deserialized candidate passed directly to `harness.run` / `harness.resume` (a value lacking the marker)
  is **refused fail-closed AND recorded** at runtime (not only a compile error); the typed-caller
  compile-error is a secondary, complementary check (see Slice 3);
  (3) a byte-identical-goldens guard proving the wrapper/marker did not change the default record bytes.
- **Stop condition:** if any path lets work-source/provenance input reach runtime scheduling **without**
  `PlanValidator`, **stop and route to design** (`w4-s8`/`w4-s2`) — do not patch locally. If the
  runtime-marker enforcement genuinely could not be expressed without a records- or plan-schema change,
  that too is a **design stop** (do not freeze a schema locally) — but it can, as an unforgeable in-memory
  marker over the existing `PlanInstance`, never serialized, so no freeze is required.

#### Slice 2 — real importer behind `WorkSourcePort.candidates()`, opt-in by driver name (ADR 0024 Decision 1) → P8-AC-1

- Add `src/providers/real/work-source.ts`: a real importer producing `CandidateWorkItem`s from a real
  source (e.g. an issue tracker). It maps to the merged port unchanged
  (`candidates() → CandidateWorkItem[] | Promise<CandidateWorkItem[]>`); it is **not** a scheduler and
  **not** an authorization channel.
- Selected by name (`config.drivers.workSource = 'github-issues'`) through the composition root; the
  reference wiring is unchanged, so the real importer is **opt-in**. Unknown work-source name fails closed
  (`ProviderSelectionError`).
- **Regression anchor:** the default (reference) wiring reproduces the Phase-0..4 goldens byte-identically
  — `ReferenceWorkSource` still emits its single seed-derived candidate; the real-import record lands only
  in a real-work-source scenario with its own golden.

#### Slice 3 — bypass fails closed and is recorded (ADR 0024 Decision 2) → P8-AC-2

- An attempt to route a candidate to scheduling **bypassing** `PlanValidator` (the structural bypass the
  chokepoint forecloses) **fails closed** and is **recorded**. Two bypass surfaces: **(a)** an adapter
  whose candidate does not cross validation, and **(b)** a **direct-harness bypass** — an attempt to
  schedule a raw / marker-less candidate through `harness.run` / `harness.resume`. Under Slice 1's two
  layers: for a **typed** caller (b) is **unrepresentable** (a type error); and — the load-bearing half —
  where a bypass is reached through an untyped/`any` or **deserialization** edge with a value lacking the
  runtime marker, the **runtime marker check refuses it fail-closed and records it**. The record maps onto
  the existing story-lifecycle `rejected` / authorization `denied` family with a reason basis — **no new
  event family**.
- The conformance-suite anchor `work-source-plan-intake-bypass`
  ([`../../../../../packages/jig-testkit/src/provider-conformance.ts`](../../../../../packages/jig-testkit/src/provider-conformance.ts)
  lines 95–102) rides Phase 8 for (a). Extend it (Slice 5) to also anchor the **direct-`run`/`resume`
  bypass** case (b), exercising the **runtime** refusal — a marker-less object handed to the scheduler is
  fail-closed and recorded, not merely a compile-time rejection.
- **Test obligation:** a bypass-attempt fail-closed test proving the attempt is refused **and** recorded
  through the existing family, covering **both** the adapter-side bypass and the direct-harness bypass; the
  direct-harness case must exercise the **runtime** refusal (a raw / `any` / deserialized marker-less
  value), not only the type error.

### Sub-phase 8b — richer provenance

#### Slice 4 — origin-bearing `CandidateWorkItem.provenance`, legible in the record (ADR 0024 Decision 3) → P8-AC-3

- In `src/ports.ts`, widen `CandidateWorkItem.provenance` from the single literal `'jig-validated'` to a
  shape that **names the real origin** (source system + identifier) **and still asserts jig-validated** —
  the same jig-internal seam-widening pattern as ADR 0023's `LandingRequest.action` union; **it freezes
  nothing.** Fix the meaning here; **defer the exact field names** to schema freeze (ADR 0017 decision 5).
  Update `ReferenceWorkSource` mechanically so its provenance stays legible under the widened shape (its
  origin is the local seed plan) **without changing the default golden bytes**.
- **Make the PER-CANDIDATE origin legible in the run record — driver identity alone is NOT sufficient,
  no freeze.** The observability-records contract is **"v0 Not Frozen"** and already carries the
  **driver** identity as `run.drivers.workSource` (`"work-source:local-plan"`). But that names only the
  selected _driver_ — two candidates pulled through the **same** driver would be indistinguishable in the
  record. **Required: record the per-candidate origin — the source system AND the candidate identifier
  (the issue/item id) — as an additive provenance field / per-event basis on the candidate-admission
  record.** Do **not** rely on `run.drivers.workSource` alone. This is **additive and unfrozen** (the
  record already carries an additive `basis`; the contract is "v0 Not Frozen"), so **no frozen field is
  minted, no new event family is added**; if a frozen field genuinely turned out to be required, that is a
  stop routed to the contract owner (it is not required — ADR 0024 Decision 3).
- **Test obligation:** a provenance-legibility test proving a real candidate's per-candidate origin
  (source + candidate identifier) appears in the run record and provenance is not collapsed to the single
  literal; **and** a distinguishability test proving **two candidates pulled through the same tracker/driver
  are distinguishable by their recorded origin identifier** (driver identity alone would fail this).

#### Slice 5 — conformance-suite adversarial additions (ADR 0024 Decisions 2, 3, 5) → P8-AC-1..3 regression

Extend `src/conformance/` + broken/adversarial work-source adapter fixtures so the suite still fails
closed on:

- a **plan-intake-bypass** adapter — a candidate whose `planInstance` does not cross `PlanValidator`
  (the existing `work-source-plan-intake-bypass` anchor) → rejected;
- a **direct-`run`/`resume` bypass** — a raw / marker-less candidate handed to the harness: the **runtime
  marker check** refuses it fail-closed and records it (exercise the runtime refusal, not only the type
  error) → rejected;
- a **collapsed / driver-only-provenance** adapter — provenance that names no per-candidate origin (still
  the bare `'jig-validated'` posture, or only the driver identity with no candidate identifier, where a
  real origin exists) or that omits the jig-validated assertion → rejected.

## Acceptance criteria (binding — from `phases.md`)

- **P8-AC-1** — A real importer produces candidates that reach runtime scheduling **only** after
  `PlanValidator`; a candidate that fails validation is rejected or held and never scheduled. **8a**,
  Slices 1–2. Traces: [`../../../../design/core/plan-intake.md`](../../../design/core/plan-intake.md), INV-007,
  ADR 0021 decision 7.
- **P8-AC-2** — An attempt to route a work-source candidate to scheduling bypassing `PlanValidator`
  fails closed and is recorded. **8a**, Slice 3. Traces:
  [`../../../../design/core/plan-intake.md`](../../../design/core/plan-intake.md),
  [`STACK-4`](../../../../product/guarantees.md#4-stack-portability)–
  [`STACK-5`](../../../../product/guarantees.md#4-stack-portability), ADR 0021 decision 7.
- **P8-AC-3** — A candidate's provenance names its real origin (source and identifier) rather than the
  single `'jig-validated'` literal, and the origin is legible in the run record. **8b**, Slice 4.
  Traces: [`SEE-3`](../../../../product/guarantees.md#5-full-observability),
  [`../../../../../packages/jig-sdk/src/ports.ts`](../../../../../packages/jig-sdk/src/ports.ts) (`CandidateWorkItem.provenance`).

## Test / evidence plan

Every test cites the AC ID it proves. Coverage thresholds stay at 90% (aim 95%); `corepack pnpm check`
is the gate.

- **Work-source to plan-intake** (`tests/providers.real-work-source.*` / `tests/intake.*`): `P8-AC-1: a
real importer's candidate reaches scheduling only after PlanValidator`; `P8-AC-1: a candidate that fails
validation is rejected or held and never scheduled`; the **both-paths** guard `P8-AC-1: run and
resume both route the candidate through the validated-wrapper chokepoint` (proving neither path schedules
  a raw candidate plan — Slice 1); and the **byte-identical-goldens** guard `P8-AC-1: the Phase-0..4 goldens
stay byte-identical after the validated-wrapper scheduling signature` (the runtime marker is never
  serialized — Slice 1).
- **Bypass fail-closed** (`tests/providers.real-work-source.*` / `tests/harness.*` / `tests/conformance/*`):
  `P8-AC-2: an attempt to route a candidate to scheduling bypassing PlanValidator fails closed`;
  `P8-AC-2: a direct harness.run/harness.resume call with a raw/any/deserialized marker-less candidate is
refused fail-closed at runtime and recorded` (the runtime marker check, not only the type error — the
  load-bearing any-edge case); `P8-AC-2: the bypass attempt is recorded through the rejected/denied family`
  (no new family — Slice 3).
- **Provenance legibility** (`tests/providers.real-work-source.*` / `tests/ports.*`): `P8-AC-3: a real
candidate's provenance names its per-candidate origin (source + candidate identifier) and still asserts
jig-validated`; `P8-AC-3: the per-candidate origin is legible in the run record`; the **distinguishability**
  guard `P8-AC-3: two candidates pulled through the same tracker/driver are distinguishable by their recorded
origin identifier` (driver identity alone fails this — Slice 4); and the **no-collapse** guard `P8-AC-3:
provenance is not collapsed to the single 'jig-validated' literal` (Slice 4).
- **Conformance (regression anchors)** (`tests/conformance/*`): the reference work-source still passes; a
  broken adapter still fails closed; plus the Phase-8 adversarial additions (`P8-...: a
plan-intake-bypass / direct-run-resume-bypass / collapsed-provenance work-source adapter is rejected`).
- **Baseline guard:** the Phase-0..4 goldens still pass under the default wiring — proof the real
  importer, the intake chokepoint, and the provenance widening did not regress the delivered records
  (`ReferenceWorkSource`'s seed candidate and its provenance stay byte-identical).

## Fixture plan

- **Real-work-source fixtures** (config selecting `workSource: 'github-issues'`), clearly non-normative,
  each real-import record in its **own new golden** (the Phase-0..4 goldens stay untouched — do not
  re-normalize them to absorb a new provenance field; the default path stays the reference seed
  candidate).
- **A candidate-fails-validation fixture** (a candidate whose `planInstance` fails `PlanValidator`) for
  P8-AC-1's reject-or-hold case.
- **A bypass-attempt fixture** (a candidate routed toward scheduling without crossing the chokepoint) +
  a **direct-harness-bypass fixture** (a raw / marker-less candidate handed to `harness.run` /
  `harness.resume` through an untyped/deserialization edge, exercising the runtime marker refusal) for the
  fail-closed-and-recorded P8-AC-2 case.
- **An origin-provenance fixture** (a candidate carrying a real source + candidate identifier) + a
  **two-candidates-same-driver fixture** (two candidates from one tracker, distinguishable by identifier) +
  a **collapsed/driver-only-provenance fixture** (bare `'jig-validated'`, or driver identity with no
  candidate identifier, where a real origin exists) for P8-AC-3.
- **Broken/adversarial work-source adapter fixtures** the conformance suite rejects (Slice 5), proving
  fail-closed.
- No TypeScript interfaces, JSON Schema, event constants, or provenance schema as **normative** fixtures
  (fixtures README rule); keep every real-work-source example plainly illustrative.

## CLI behavior

- `jig run` / `jig preview` / `jig inspect` / `jig resume` — **unchanged in surface** under the default
  wiring. `run`/`resume` compose the real importer through the composition root only when
  `config.drivers` selects it (`workSource: 'github-issues'`); an unknown selection still fails closed
  with a non-zero exit. No new subcommand is required. The real import is opt-in behind the driver
  selection, and both `run` and `resume` obtain the validated wrapper from the intake chokepoint before
  scheduling — the harness accepts nothing else, and refuses a marker-less value fail-closed at runtime.

## Stop conditions

Halt and route back to design (do not decide locally) if:

- work-source/provenance input can reach runtime scheduling **without** `PlanValidator` — route to design
  (`w4-s8`/`w4-s2`), do not decide locally (`phases.md` Phase-8 stop condition);
- richer provenance would require **freezing** the observability-records or execution-plan schema (a JSON
  Schema / event constant / TypeScript contract field) — the provenance widening is a local port-type
  fix, but schema freeze is contract-owner-owned; route freeze back to design (`repo-plan-m7.md` open
  question 2). It does **not**: the contract is "v0 Not Frozen" and already carries
  `run.drivers.workSource`;
- the default wiring can no longer reproduce the Phase-0..4 goldens (a records regression) — the change
  is not additive and must be re-scoped;
- "real work source" would expand into webhook-, scheduler-, or concurrent-pull-triggered runs, or legacy
  run migration, before the local real import proves out.

## PR evidence checklist

- `git diff --check` clean.
- `corepack pnpm check` green (lint, format:check, typecheck, delivery:check, vitest ≥ 90%).
- Every new test names the AC ID it proves; the conformance suite and every broken/adversarial
  work-source adapter fixture are read by a test.
- `LocalHarness.run` / `LocalHarness.resume` accept **only** the validated wrapper (not a raw
  `PlanInstance`) **and verify its unforgeable runtime marker on entry**, proven by the direct-harness-bypass
  test (a raw / `any` / deserialized marker-less candidate is refused fail-closed at runtime and recorded)
  plus the single-minter intake module; the runtime marker is never serialized, evidenced by the
  byte-identical-goldens guard.
- A records-diff note in the PR body: the default wiring reproduces the Phase-0..4 records (the reference
  seed candidate and its provenance unchanged); any additive field (the per-candidate origin — source +
  candidate identifier, driver identity alone not sufficient; the recorded bypass rejection) is named and
  cited to ADR 0024, and mapped onto the observability-records v0 fields already named (an additive
  provenance field / event basis alongside `run.drivers.workSource`; `rejected`/`denied` families) —
  downstream consumers read records, so the change must be legible, and **no event family is minted**.
  Note the explicit non-goals: no webhook/scheduler-triggered runs, no legacy migration, no schema
  freeze, no `WorkSourcePort.candidates()` method-surface change (only the `CandidateWorkItem.provenance`
  widening).
- The Phase-0..4 goldens still pass, evidencing no regression to the delivered shape.
