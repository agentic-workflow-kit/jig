---
title: "ADR 0024 — Phase 8 real work-source integration: the seed-vs-candidate intake chokepoint, richer provenance, and the two-authorities crossing"
status: applied
---

# ADR 0024 — Phase 8 real work-source integration

## Context

Phase 8 ([`docs/archive/delivery/m7-real-providers/phases.md`](../../delivery/m7-real-providers/phases.md),
P8-AC-1..3) promotes the **Work source** seam from the reference adapter to **real importer(s)** that
produce `CandidateWorkItem`s from a real source (an issue tracker or other system), with **every
candidate crossing `PlanValidator` before runtime scheduling** and **provenance richer than the single
`'jig-validated'` literal** so a record can name where a candidate came from. It is the fourth and last
real-driver phase of the M7 real-providers track: after Phase 6 made the agent and execution-host seams
real ([ADR 0022](./0022-phase-6-real-driver-integration.md)) and Phase 7 made the Forge seam real
([ADR 0023](./0023-phase-7-real-forge-landing.md)), Phase 8 is the phase in which candidate work first
arrives from a **real external source** rather than being seeded from the operator-supplied plan. The
validated execution plan stays jig's **only** runtime scheduling input: the source never schedules work
jig has not validated. What is missing is the set of concrete choices an implementer would otherwise have
to invent. This ADR settles them so two independent implementers produce compatible Phase 8 behavior,
exactly as [ADR 0023](./0023-phase-7-real-forge-landing.md) did for Phase 7,
[ADR 0022](./0022-phase-6-real-driver-integration.md) did for Phase 6, and
[ADR 0021](./0021-phase-5-integrated-provider-runs.md) did for Phase 5.

The design layer already seeds every Phase-8 concept — the Work-source port's owns/implements/must-not
contract (the `PlanValidator` boundary every source-supplied candidate crosses, the
`work-source-never-bypasses-plan` candidate invariant, honest provenance) in
[`../contracts/providers.md`](../contracts/providers.md); the plan-intake boundary that admits a plan
once and the `No second scheduling input` invariant candidate in
[`../core/plan-intake.md`](../core/plan-intake.md); the composition root that "is the one place that
imports provider implementations" in [`../core/bootstrap.md`](../core/bootstrap.md); and INV-007 (reject
unknown formats at the boundary; a future work-source path does not weaken or bypass the boundary). The
prior-art recipe — a Work-Source candidate-count lookup that never enters the run-lifecycle machine, and
the two-authorities discipline (the source is never a second scheduling or authorization authority) — is
recorded in [`../notes/prior-art-workflow-kit.md`](../notes/prior-art-workflow-kit.md) (the "dry-run is
greenfield" finding and lessons 5–6), weighed here and re-derived, never ported. **The `PlanValidator`
crossing is the improvement the prototype lacked and this ADR keeps it non-negotiable: it does not
regress.**

The v0 contracts remain unfrozen; nothing here freezes the execution-plan or observability-records JSON
Schema, mints a public contract package, or ships a real work-source importer **from this ADR** (this
ADR is docs-only; the real importer lands in the Phase-8 implementation cycle). The four ports stay
**jig-internal seams** in `src/` — the same category as `Worker` and `RecordSink` — not a versioned
public contract. The one port-type change this ADR authorizes — widening `CandidateWorkItem.provenance`
from the single literal `'jig-validated'` to a shape that names origin while still asserting
jig-validated — is a **local port-type fix** that freezes nothing, exactly as ADR 0023's
`LandingRequest.action` union was.

### Org reconciliation — Phase 8 is the work-source slice of the M5 "later slice" made real

Org M7 (`.github/MILESTONES.md`, "M7: Real Provider Integration") promotes the M5
`named extension point` seams (agent driver, execution-host driver, forge driver, **work-source driver**,
resume, capability attestation) to `exercised` **with real effects**, behind the contracts M1 owns and
jig Phase 5 merged (commit `f59a479`). Phase 8 is the **work-source** slice of that promotion. It
introduces **no new org-level seam** and changes **no** org-owned contract shape: the execution-plan v0
and observability-records v0 contracts stay unfrozen, and the four ports keep their merged surfaces —
`WorkSourcePort.candidates()` is unchanged; only the shape of one field it returns,
`CandidateWorkItem.provenance`, is widened from a single literal to an origin-bearing shape, a
jig-internal seam edit, not an org-owned contract change. Candidate origin maps onto the
observability-records v0 fields the contract **already** names — the `run.drivers.workSource` driver
identity (`"work-source:local-plan"`) and its additive event basis — so no event family is newly minted.
No `.github` divergence is routed and no org PR is required; a routed-back finding (an org seam proves
wrong, or richer provenance needs a frozen records field) goes to `.github/MILESTONES.md`/`ROADMAP.md`
and the contract owner (`repo-plan-m7.md` open question 2), not resolved locally.

### Delivered reality this ADR builds on

Established by Phases 0–7 and confirmed against `src/` at authoring time (the **real as-merged** port
shapes, not the ADR 0021 sketch):

- **The Work-source seam is a merged jig-internal port** ([`../../../packages/jig-sdk/src/ports.ts`](../../../../packages/jig-sdk/src/ports.ts)):
  `WorkSourcePort.candidates(): CandidateWorkItem[] | Promise<CandidateWorkItem[]>`, and
  `CandidateWorkItem` is `{ planInstance: PlanInstance; provenance: 'jig-validated' }` — **`provenance`
  is a single string literal, `'jig-validated'`, not an origin-bearing shape**. It is the field Phase 8
  enriches.
- **`PlanValidator` is a merged static validator** ([`../../../packages/jig-sdk/src/plan-validator.ts`](../../../../packages/jig-sdk/src/plan-validator.ts)):
  `PlanValidator.validate(planInstance): PlanInstance` — parses and validates against
  `execution-plan-shape-v0`, throws a reason-bearing `Error` on an unknown version, missing/malformed
  id, path-traversal id, empty/duplicate/late-dependency stories; otherwise returns the instance. It is
  the crossing every candidate must make (INV-007).
- **The composition root validates the _seed_ plan, and this is where the Phase-8 gap lives.**
  `composeReferenceRun` → `composeRunPorts` in [`../../../packages/jig-sdk/src/bootstrap.ts`](../../../../packages/jig-sdk/src/bootstrap.ts)
  calls `PlanValidator.validate(options.planInstance)` (line 164) — the **operator-supplied seed** plan
  — then wires `workSource: new ReferenceWorkSource(options.planInstance)`. But the thing actually
  **scheduled** is `candidate.planInstance` returned by `composed.workSource.candidates()`
  ([`../../../packages/jig-cli/src/cli.ts`](../../../../packages/jig-cli/src/cli.ts) lines 121→139, `harness.run(candidate.planInstance, …)`;
  [`../../../packages/jig-sdk/src/resume.ts`](../../../../packages/jig-sdk/src/resume.ts) line 390). Today `ReferenceWorkSource`
  ([`../../../packages/jig-sdk/src/providers/reference/work-source.ts`](../../../../packages/jig-sdk/src/providers/reference/work-source.ts))
  is **seeded from that same object**, so `candidate.planInstance === the validated seed` — **identity
  masks the gap**. A real importer breaks that identity: it builds fresh `planInstance`s from an external
  source that never crossed `validate`, and `harness.run(candidate.planInstance)` would schedule them
  **unvalidated**. That is exactly the INV-007 bypass P8-AC-2 must make impossible. Closing it
  structurally is the Phase-8 realization.
- **The conformance suite already anchors the fail-closed crossing.** `provider-conformance.ts`
  ([`../../../packages/jig-testkit/src/provider-conformance.ts`](../../../../packages/jig-testkit/src/provider-conformance.ts)
  lines 95–102) already calls `subject.workSource.candidates()`, runs `PlanValidator.validate` on each
  `candidate.planInstance`, and records the `work-source-plan-intake-bypass` finding when a candidate
  does not cross validation. Phase 8 extends this anchor; it does not invent it.
- **The composition root fails closed on an unknown driver name.** `readDriverSelection` /
  `assertReferenceSelection` ([`../../../packages/jig-sdk/src/bootstrap.ts`](../../../../packages/jig-sdk/src/bootstrap.ts)) supports
  `workSource=reference` only today and throws `ProviderSelectionError` on any other name — the same
  fail-closed selection the Phase-6 `agent=codex` and Phase-7 `forge=github` names extended. A real
  work-source selection is a new named driver in that same set.

## Decision

Five settlements, binding on Phase 8. Each is a decision, not an open question.

### 1. Real importer(s) behind `WorkSourcePort.candidates()`, opt-in by driver name; the reference wiring stays default

- **A real work-source driver, selected by name, sole-imported.** Phase 8 adds real importer(s) behind
  `WorkSourcePort.candidates()` producing `CandidateWorkItem`s from a real source (e.g. an issue
  tracker), selected through the `composeReferenceRun` successor
  ([`../../../packages/jig-sdk/src/bootstrap.ts`](../../../../packages/jig-sdk/src/bootstrap.ts)) by a config driver name (e.g.
  `config.drivers.workSource = 'github-issues'`), mirroring the Phase-6 `agent: 'codex'` and Phase-7
  `forge: 'github'` selection pattern; bootstrap.ts today supports `workSource=reference` only and must
  gain the real name. The composition root stays the **sole importer** of the driver; the runner, Fence,
  and records never import it. An unknown work-source driver name fails closed
  (`ProviderSelectionError`), never a silent fallback.
- **`candidates()` is upstream of runtime, not a scheduler.** The port surfaces candidate work items and
  provenance **before** runtime scheduling; it is not a scheduler and not an authorization channel
  (ADR 0021 decision 7; `providers.md` Work source "must not become a competing runtime scheduler"). The
  method surface is **unchanged** — the only field enriched is `CandidateWorkItem.provenance`
  (Decision 3).
- **The default (reference) wiring is unchanged, so the real importer is opt-in.** With
  `config.drivers` omitted or `workSource=reference`, `ReferenceWorkSource` still emits its single
  seed-derived candidate and the dry-run/default path reproduces the **Phase-0..4 record goldens
  byte-identically** — the load-bearing regression anchor the whole program depends on. Real-importer
  records land only in a real-work-source scenario with its own new golden.

### 2. The INV-007 crossing (P8-AC-1/P8-AC-2): a single structural intake chokepoint every candidate passes before scheduling

**This is the Phase-8 realization** — not "candidates cross `PlanValidator`" (ADR 0021 decision 7 already
said that), but **where the crossing is enforced structurally so a real importer cannot skip it.** The
seed-vs-candidate gap above (`bootstrap.ts:164` validates the seed; `harness.run(candidate.planInstance)`
schedules the candidate; identity masks it only for the reference adapter) is the asymmetry Phase 8
closes.

- **One chokepoint that mints a runtime-verifiable validated wrapper — enforced by construction, not by
  convention.** Settled: every candidate reaches runtime scheduling **only** through a single intake step
  that (a) runs `candidates()`, (b) calls `PlanValidator.validate(candidate.planInstance)` on **each**
  candidate, and (c) returns an **opaque, runtime-verifiable validated wrapper** (e.g. `ValidatedPlan` /
  `ValidatedCandidate`) carrying an **unforgeable runtime marker** — a module-private `Symbol`, a private
  class field, or a branded nonce the intake sets and **only this `PlanValidator`-gated chokepoint can
  produce**. No other code path can construct a wrapper bearing that marker. This is the crux the first
  cut got wrong: "the callers call an intake step" is enforcement **by convention** — a direct
  `harness.run` / `harness.resume` caller (or a future caller that forgets the step) could still schedule
  a raw, unvalidated `PlanInstance`. Settled instead: **the scheduling API itself refuses any value
  without the marker.** `LocalHarness.run` and `LocalHarness.resume` — merged today as
  `run(planInstance: PlanInstance, config, policy)`
  ([`../../../packages/jig-sdk/src/harness.ts`](../../../../packages/jig-sdk/src/harness.ts) line 246) and
  `resume(planInstance: PlanInstance, policy, resumePlan)` (line 364), each accepting a **raw
  `PlanInstance`** — change to accept **only the validated wrapper**, never a raw `PlanInstance`.
- **Two enforcement layers, both required — because a type-level brand is erased at runtime.** A
  compile-time brand alone protects **typed** callers (an unwrapped plan is a type error) but is
  **erased at runtime**, so `run`/`resume` could not distinguish a raw `PlanInstance` from a validated
  value handed in by an untyped/`any` caller or a value crossing a **deserialization boundary** — and the
  any-edge P8-AC-2 "fail closed **and** recorded" guarantee would be unachievable. Settled: the wrapper
  carries **both** layers. **(i) Compile-time:** the narrowed `run`/`resume` signatures make an unwrapped
  plan a type error for typed callers. **(ii) Runtime:** `run`/`resume` **check the unforgeable marker at
  runtime**; a value lacking it — a raw `PlanInstance`, an `any`-typed caller's object, a deserialized
  object reconstructed without crossing intake — is **refused fail-closed and the bypass is recorded**
  (P8-AC-2, via the existing `rejected`/`denied` families). So an unvalidated candidate is un-schedulable
  **both** by construction (typed) **and** by runtime refusal (untyped/deserialized edge). Both call
  sites that schedule today — `cli.ts` (run) and `resume.ts` (resume, line 400
  `harness.resume(candidate.planInstance, …)`) — obtain the wrapper only from the chokepoint. The exact
  home of the intake step (the composition root, or a dedicated intake module both paths call) is an
  implementation choice fixed in the brief; the **binding properties** fixed here are: **(i)** exactly one
  minter of the marker, gated by `PlanValidator`; **(ii)** the scheduling methods accept only a
  marker-bearing wrapper — compile-time **and** runtime — so no raw scheduling path remains reachable.
- **This is an internal harness-API change, allowed, and record-invariant — the marker is never
  serialized.** `LocalHarness` is **not** one of the four provider ports — narrowing its `run` / `resume`
  parameter type from raw `PlanInstance` to the validated wrapper, and adding the runtime marker check, is
  an **internal** engine-API edit, not an org-owned contract change and not a port-surface change (the
  four ports are untouched). The runtime marker lives on the **in-memory wrapper only**: the scheduler
  **unwraps** to the same `PlanInstance` payload it already consumes for execution and recording, and the
  marker is **never serialized into records**. So no record field is minted and no emitted byte changes;
  the seed plan is already validated at `bootstrap.ts:164`, so threading the wrapper through the
  default/reference path keeps the **Phase-0..4 goldens byte-identical** — a Phase-8 regression anchor,
  not a records change. (Runtime-verifiable wrapper; marker not persisted; goldens byte-identical.)
- **A failing candidate is rejected or held and never scheduled (P8-AC-1).** A candidate whose
  `planInstance` fails `PlanValidator.validate` (an `Error` is thrown) is **rejected or held** — it does
  not reach the runner. Validation stays exactly the reason-bearing act
  [`../../../packages/jig-sdk/src/plan-validator.ts`](../../../../packages/jig-sdk/src/plan-validator.ts) already performs; Phase 8 adds no new
  validation semantics, only the guarantee that the **candidate** plan (not merely the seed) crosses it.
- **A bypass attempt fails closed and is recorded (P8-AC-2).** An attempt to route a candidate to
  scheduling **without** `PlanValidator` — the structural bypass the chokepoint forecloses — fails closed
  and is **recorded**. Two bypass surfaces are covered: **(a)** an adapter whose candidate does not cross
  validation, and **(b)** a **direct-harness bypass** — an attempt to call `LocalHarness.run` /
  `LocalHarness.resume` with a raw, unvalidated candidate rather than the marker-bearing wrapper. Under
  the two enforcement layers (above): for a **typed** caller (b) is **unrepresentable** — it cannot
  type-check; and where a bypass is attempted through a boundary the type system cannot see — an
  untyped/`any` caller, or a value crossing a **deserialization** boundary that lacks the runtime marker —
  the runtime marker check **refuses it fail-closed and records the bypass**. The runtime refusal is the
  load-bearing half here: because the compile-time brand is erased at runtime, only the marker check makes
  the any-/deserialization-edge fail-closed-**and**-recorded guarantee achievable. The
  record leg maps onto an **existing** family — story-lifecycle `rejected` / authorization `denied` with
  a reason basis — so **no new event family is minted**, the same discipline ADR 0023 held. The
  conformance-suite anchor `work-source-plan-intake-bypass`
  ([`../../../packages/jig-testkit/src/provider-conformance.ts`](../../../../packages/jig-testkit/src/provider-conformance.ts)
  lines 95–102) rides Phase 8 for (a); a new direct-`run`/`resume`-bypass case anchors (b), exercising the
  **runtime** refusal (a marker-less object is fail-closed and recorded), not merely the compile error.
- **The two-authorities discipline is the crossing (prior art, weighed).** The prototype's lesson (the
  Work-Source candidate lookup that never entered the run-lifecycle machine; lessons 5–6's structural
  authority boundary) is that the **source is never a second scheduling or authorization authority**. The
  chokepoint realizes exactly that: source-supplied material stays _candidate_ until it crosses the one
  validated intake, and no source path hands runtime scheduling input directly to core.
- **Stop condition (binding).** Any implementation in which work-source/provenance input can reach
  runtime scheduling **without** `PlanValidator` **stops and routes to design** (`w4-s8`/`w4-s2`;
  `phases.md` Phase-8 stop condition), not decided locally. This ADR forecloses the bypass structurally;
  a discovered path around the chokepoint is a design escalation, not a local patch. The validated-wrapper
  enforcement (compile-time brand + runtime marker) freezes nothing; the runtime marker is an in-memory
  wrapper property, never serialized. If it genuinely could not be expressed without a records- or
  execution-plan-schema change, that is a **design stop** routed to the contract owner, not a local schema
  freeze — but it can (an unforgeable in-memory marker over the existing `PlanInstance`), so no freeze is
  required.

### 3. Richer provenance (P8-AC-3): widen `CandidateWorkItem.provenance` to an origin-bearing shape; the record carries origin without a freeze

Two surfaces, kept separate — mirroring ADR 0023's Residual B move (port-type fix vs. records
legibility):

- **Port type — a local seam fix that freezes nothing.** `CandidateWorkItem.provenance` widens from the
  single literal `'jig-validated'` to a shape that **names the real origin** (the source system and an
  identifier — e.g. which tracker, which issue) **and still asserts jig-validated**, so provenance is not
  collapsed to one constant. This is a jig-internal `src/ports.ts` seam edit — the same category as the
  `LandingRequest.action` union — that adds no privileged method, changes no invoker, and collapses no
  port. The **meaning** is fixed here (origin named + jig-validated asserted); the exact **field
  encoding** (the shape's field names) is **deferred** to schema freeze, consistent with ADR 0017
  decision 5 and ADR 0023 Decision 2. The reference work-source's provenance stays legible under the
  widened shape (its origin is the local seed plan); it need not, and must not, break the byte-identical
  default goldens — the reference default path keeps emitting today's record bytes (see the regression
  anchor, Decision 5).
- **Records legibility — the PER-CANDIDATE origin is required, not just the driver identity; no freeze
  required.** The origin must be **legible in the run record** (P8-AC-3). The observability-records
  contract is **explicitly "v0 Not Frozen"**
  ([`../contracts/observability-records-contract-v0.md`](../contracts/observability-records-contract-v0.md),
  "v0 Not Frozen Schema": exact field names are not frozen until schema freeze) and already carries the
  work-source **driver** identity as `run.drivers.workSource` (the illustrative `"work-source:local-plan"`).
  **But `run.drivers.workSource` identifies only the selected _driver_, not the candidate** — so two
  candidates pulled through the **same** driver would be indistinguishable in the record if only the driver
  identity were recorded. **Settled: the record must carry the per-candidate origin — the source system
  **and** the candidate identifier (e.g. the issue/item id) — as an additive provenance field / per-event
  basis on the candidate-admission record.** Driver identity alone is **not** sufficient. This is
  **additive and unfrozen**: the record already carries an additive `basis` on its events and the contract
  is "v0 Not Frozen", so the per-candidate identifier is legible **without minting a frozen field or a new
  event family** — no freeze. This confirms the stop condition below does **not** fire.
- **Stop condition (binding, does not fire here).** If richer provenance genuinely required **freezing**
  the observability-records or execution-plan schema (a frozen field / event constant / TypeScript
  contract field), that freeze is contract-owner-owned and routes back to design (`phases.md` Phase-8
  stop condition; `repo-plan-m7.md` open question 2). **It does not:** the contract is unfrozen and the
  per-candidate origin (source + candidate identifier) rides an additive provenance field / event basis
  alongside the existing `run.drivers.workSource` driver identity, so origin is legible with encoding
  deferred and no freeze required by this ADR.

### 4. The 8a/8b split and its acceptance-criteria assignment

`phases.md` invites an optional split. **Settled: Phase 8 splits into two sub-phases with a fixed
internal ordering 8a → 8b**, mirroring the ADR-0023 7a/7b style, because the two halves have genuinely
different risk and 8a is independently useful:

- **8a — real importer + the structural crossing.** The real importer behind `candidates()` (Decision 1)
  and the single intake chokepoint every candidate crosses before scheduling (Decision 2): a candidate
  reaches scheduling only after `PlanValidator`; a failing candidate is rejected or held; a bypass fails
  closed and is recorded. 8a is **independently useful**: an operator can pull candidate work from a real
  source and trust every candidate still crosses plan validation — even with **coarse** provenance.
- **8b — richer provenance.** Widening `CandidateWorkItem.provenance` to name the real origin and making
  that origin legible in the run record (Decision 3). 8b is legibility polish over 8a's working real
  import; it rides second because an importer whose candidates all cross the chokepoint is already useful
  without origin-naming.

**AC assignment** (the thing an implementer would otherwise invent), under the invariant _8a must land
independently useful with the real importer + the structural `PlanValidator` crossing + recorded
fail-closed bypass_:

| AC                                                                                                   | Sub-phase | Rationale                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **P8-AC-1** candidate reaches scheduling only after `PlanValidator`; failing candidate rejected/held | **8a**    | The structural crossing is 8a's whole point — the real importer plus the chokepoint that gates it.                                     |
| **P8-AC-2** bypass attempt fails closed and is recorded                                              | **8a**    | Fail-closed-and-recorded is the safety floor of the crossing; it must be in place the first time a real importer produces a candidate. |
| **P8-AC-3** provenance names real origin, legible in the record                                      | **8b**    | Origin-naming is legibility polish over a working real import, distinct from the crossing, and safe to land second.                    |

**Lighter than 7a/7b (stated so implementers do not over-split).** Unlike Phase 7's 7a/7b, both Phase-8
halves touch the **same** importer and the same seam — 8b enriches a field the 8a importer already
returns, it does not add a second act. The split is therefore lighter: 8a and 8b may land in one
implementation cycle if the crossing is verified first and provenance is enriched second, without a
separate adapter. The ordering (crossing before provenance) is the binding constraint, not a mandatory
two-PR decomposition.

### 5. Composition-root wiring and the two regression anchors

- **A real work-source driver, selected by name, sole-imported.** Restated as the wiring rule: Phase 8
  adds the real driver name to the `composeReferenceRun` successor's selection set
  ([`../../../packages/jig-sdk/src/bootstrap.ts`](../../../../packages/jig-sdk/src/bootstrap.ts)); the composition root stays the **sole
  importer**; an unknown name fails closed (`ProviderSelectionError`). The intake chokepoint (Decision 2)
  is wired here or in a dedicated module both the run and resume paths call — never bypassed by either.
- **The two regression anchors ride every Phase-8 sub-phase, not as their own phase:**
  1. **Default-wiring golden byte-identity.** The default (reference) wiring reproduces the Phase-0..4
     record goldens **byte-identically** — `ReferenceWorkSource` still emits its single seed-derived
     candidate, provenance still reads legibly, and no real-import field enters the default path. Real
     import lands **only** in a real-work-source scenario with its **own new golden**. This is the
     load-bearing regression anchor the whole program depends on.
  2. **Conformance-suite fails closed.** The driver conformance suite still fails closed on a broken or
     non-conforming work-source adapter — including the Phase-8 anchor
     `work-source-plan-intake-bypass` (a candidate that does not cross `PlanValidator`) and, additively,
     an adapter whose provenance collapses origin or whose candidate reaches scheduling structurally
     un-gated.

## Prior-art triage (weighed, not ported)

- **Two-authorities invariant → in scope.** It _is_ the Phase-8 crossing: the source is never a second
  scheduling or authorization authority; source material stays candidate until the one validated intake
  (Decision 2). Non-negotiable, and it keeps the `PlanValidator` crossing the prototype lacked.
- **TaskSnapshot-durable-before-claim → adopt only the record-the-attempt leg.** Phase 8 records the
  rejected/held bypass attempt (P8-AC-2's "recorded") through the existing `rejected`/`denied` family.
  The claim/lease machinery (a durable claim before scheduling) is **deferred** — it is needed only for
  **concurrent pull into a scheduler**, which is a Phase-8 non-goal (no webhook/scheduler-triggered
  runs).
- **Launch-coordination-ordering → deferred.** Scheduler/concurrent territory, an explicit Phase-8
  non-goal. Duplicate-launch safety already exists as the Phase-6 `workspace-collision` refusal
  ([ADR 0022](./0022-phase-6-real-driver-integration.md)); Phase 8 mints no scheduling ordering.

## Contract and records posture

- **No v0 freeze.** The execution-plan and observability-records contracts stay v0 and unfrozen. The
  four ports remain internal `src/` seams; the origin-bearing provenance shape and its record encoding
  are design-owned, not fixtures-frozen. The one port-type change — `CandidateWorkItem.provenance` →
  origin-bearing shape (Decision 3) — is a jig-internal seam edit that freezes nothing.
- **Additive records only, and default records are byte-identical.** Under the **default (reference)
  wiring** the records are unchanged from Phases 0–7. Any new named field — the per-candidate origin
  (source + candidate identifier), a recorded bypass rejection — appears **only** in the Phase-8-specific
  real-work-source scenarios that need it, and **each such scenario gets its own new golden**. The
  per-candidate origin rides an **additive** provenance field / event basis (driver identity via
  `run.drivers.workSource` alone is not sufficient — two candidates through one driver must be
  distinguishable by their recorded candidate identifier); the recorded bypass maps onto the
  `rejected`/`denied` families already named — **no event family is renamed, removed, or newly minted.**
  Field meanings are fixed here; exact encoding is deferred (ADR 0017 decision 5). If richer provenance
  genuinely required a **frozen** records field, that freeze is contract-owner-owned and routes back to
  design (Decision 3 stop condition) — it does not.

## Required doc updates (this design PR)

- **`plan-intake.md`** — a "Phase 8 realization (ADR 0024)" note at the `No second scheduling input`
  invariant candidate / INV-007: the seed-vs-candidate gap is closed by a single structural intake
  chokepoint every candidate crosses before scheduling; a failing candidate is rejected or held; a
  bypass fails closed and is recorded through an existing family. (Done in this PR.)
- **`providers.md`** — a "Phase 8 realization (ADR 0024)" section carrying the real importer behind
  `WorkSourcePort.candidates()`, the structural `PlanValidator` chokepoint realizing
  `work-source-never-bypasses-plan`, and the origin-bearing `CandidateWorkItem.provenance` widening; the
  matching "Deferred and out of scope" bullet for real work-source import is retired. (Done in this PR.)
- **`orchestration.md`** — **no change.** The work-source crossing is **upstream of** runtime scheduling:
  orchestration consumes a `ValidatedPlan` it did not have to re-derive, and Phase 8 changes neither the
  run/story lifecycle, the two-authority split, nor the `done → landed` boundary. The candidate→scheduling
  ordering is owned by plan-intake's validate-once boundary, not by orchestration, so `orchestration.md`
  is deliberately untouched.
- No change to the execution-plan or observability-records v0 contracts, and no change to the
  fixtures-README convention snippets (`delivery:check` stays green).

## Consequences

- Phase 8 turns the Work-source seam from a reference adapter (whose seed-derived candidate is identical
  to the validated seed plan, masking the intake gap) into a **real importer** behind the unchanged
  `WorkSourcePort.candidates()`, with **every candidate structurally gated by `PlanValidator` before
  scheduling** — the phase in which candidate work first arrives from a real external source. The 8a/8b
  split lands the real importer + the structural crossing first (independently useful), then the richer
  origin-naming provenance.
- The change is **additive** to the runtime and records: the default (reference) wiring reproduces the
  Phase-0..7 dry-run and goldens exactly, and the conformance suite keeps failing closed. The real
  importer is opt-in; real-import records land only in their own scenarios with their own goldens.
- The load-bearing safety boundaries are all preserved: the validated execution plan stays jig's only
  runtime scheduling input (INV-007); a candidate reaches scheduling only by carrying the
  marker-bearing validated wrapper the one `PlanValidator`-gated chokepoint mints, so an unvalidated
  candidate is un-schedulable **both** by construction (a type error for typed callers) **and** by
  runtime refusal (the runtime marker check fails closed and records the bypass at the any-/deserialization
  edge) — not by caller discipline; a failing candidate is rejected or held; a bypass attempt fails closed
  and is recorded through an existing family; and the source is never a second scheduling or authorization
  authority (the two-authorities discipline). The `CandidateWorkItem.provenance` widening and the
  validated wrapper are both local fixes that freeze nothing (the runtime marker is an in-memory property,
  never serialized).
- Phase 8 implementation widens `CandidateWorkItem.provenance` in `src/ports.ts`, adds
  `src/providers/real/work-source.ts` (or equivalent), adds the single validated-intake chokepoint that
  mints the marker-bearing validated wrapper both `src/cli.ts` and `src/resume.ts` route through,
  **narrows `LocalHarness.run` / `LocalHarness.resume` in `src/harness.ts` to accept only the wrapper (not
  a raw `PlanInstance`) and adds a runtime marker check that refuses a marker-less value fail-closed and
  records it** so raw scheduling is unrepresentable for typed callers and refused-and-recorded at the
  untyped/deserialization edge, adds the real work-source driver name to `src/bootstrap.ts` (kept the sole
  importer, unknown name fails closed), threads the origin into the run record additively, and adds the
  Phase-8 conformance additions (including the direct-`run`/`resume` bypass case exercising the runtime
  refusal) — see the Phase 8 implementation brief
  ([`../../archive/delivery/m7-real-providers/implementation-briefs/phase-8-real-work-source.md`](../../delivery/m7-real-providers/implementation-briefs/phase-8-real-work-source.md)).
  The runtime marker is never serialized, so the Phase-0..4 goldens stay byte-identical. It does not
  change the `WorkSourcePort.candidates()` method surface or any of the four provider ports.
- No JSON Schema freeze, no TypeScript contract package, no public contract package, and no
  webhook/scheduler-triggered runs, legacy run migration, or records tamper-evidence / active re-approval
  path (Phase 9). Hosted, multi-tenant, or remote operation stays org-deferred.

- Date: 2026-07-04
- Origin: Phase 8 real-work-source-integration design closure (docs-only, pre-implementation), scoped to
  the work-source slice of M7 per the M7 real-providers repo plan.
