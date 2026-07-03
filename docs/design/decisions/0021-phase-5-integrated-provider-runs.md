---
title: "ADR 0021 — Phase 5 integrated provider runs: the four ports, the conformance harness, reference adapters"
status: applied
---

# ADR 0021 — Phase 5 integrated provider runs

## Context

Phase 5 ([`docs/delivery/m5b-local-mvp-r2/phases.md`](../../delivery/m5b-local-mvp-r2/phases.md),
P5-AC-1..5) introduces the **provider seam realizations**: the four ports jig's stack-portability
rests on (Agent, Execution host, Forge, Work source), the conformance machinery that proves a driver
before it is trusted, and the capability-attestation input that gates autonomy on fresh proof rather
than assertion. Phases 0–4 delivered a local dry-run engine in which the scripted worker is wired
directly and the other three seams are design-only. What is missing is the set of concrete choices an
implementer would otherwise have to invent. This ADR settles them so two independent implementers
produce compatible Phase 5 behavior, exactly as [ADR 0020](./0020-phase-4-reliable-local-runs.md) did
for Phase 4.

The design layer already seeds every Phase-5 concept — the four ports' owns/implements/must-not
contract in [`../contracts/providers.md`](../contracts/providers.md); the capability-attestation gate
in [`../core/authorization.md`](../core/authorization.md); the Category-3 capability-proof model and
its freshness/staleness discipline in [`../core/plan-intake.md`](../core/plan-intake.md); the
runner-exclusive `done → landed` boundary in [`../core/orchestration.md`](../core/orchestration.md);
and the composition root that "is the one place that imports provider implementations" in
[`../core/bootstrap.md`](../core/bootstrap.md). The adversarial surface is pre-mapped by the Wave 5
red-team
([`w5-s1`](../../planning/design-track/waves/wave-5-red-team/outputs/w5-s1-authority-and-provider-red-team/routed-findings.md):
F-1 SEC-2 blur, F-2 claim-versus-judgment, F-3 work-source second channel) and triaged by
[Wave 6](../../planning/design-track/waves/wave-6-implementation-phasing/prerequisite-triage.md).
`providers.md` deliberately defers the interface shapes, the conformance-suite design, the
capability-proof schema, the isolation-strength catalog, and the provider manifest — this ADR is where
those are settled, and `providers.md` is promoted from `draft` in the same design PR to carry them.

The v0 contracts remain unfrozen (STOP-003 in
[`../notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md)); nothing here freezes the
execution-plan or observability-records JSON Schema, mints a public contract package, or ships a real
driver. The four port interfaces are **jig-internal seams** in `src/` — the same category as the
existing `Worker` and `RecordSink` interfaces in `src/types.ts` — not a versioned public contract; the
provider manifest is designed at the design/contract surface (`providers.md`), not frozen through a
fixtures file (respecting the Contract-Preservation Rule in
[`tests/fixtures/m5b-local-mvp/README.md`](../../../tests/fixtures/m5b-local-mvp/README.md)).

### Org reconciliation — why Phase 5 is the "later slice," not the kill-assumption

Org M5 (`.github/MILESTONES.md`, "M5: Jig Local MVP Slice") marks the Agent, Execution-host, Forge,
and Work-source drivers plus Capability attestation as **`named extension point`** — design-only,
"never code, until a later slice exercises them" — and names a kill assumption: it "fails if 'design
fully, fill later' produces unexercised no-op code stubs for seams the dry-run never traverses." Phase
5 **is** that later slice. Its governing discipline is precisely what respects the kill assumption:
every port this ADR introduces is **exercised** — by the conformance harness, by a reference adapter,
and by an AC-bound contract test — so no unexercised stub lands. The local path has proven out through
Phases 0–4 (Phase 4 already exercised Resume, itself an M5 extension point), so introducing the seams
now is disciplined sequencing, not "minimal expanding into multi-driver portability before the local
path proves out": no **real** driver ships here (Decision 1). No org milestone owns provider runs (M6
is the Learning Loop Seed), and Phase 5 changes no org-owned contract seam (execution-plan v0 and
records v0 stay unfrozen), so no `.github` divergence is routed and no org PR is required.

### Delivered reality this ADR builds on

Established by Phases 0–4 and confirmed against `src/` at authoring time:

- **The Agent seam already has an abstraction.** `src/types.ts` defines
  `interface Worker { execute(story): Promise<WorkerResult> }`, documented as "kept as an interface so
  the harness stays swappable." `ScriptedWorker` (`src/worker.ts`) implements it; `LocalHarness`
  (`src/harness.ts`, the runner) depends on the abstract `Worker`, never the concrete class. This is
  the Agent port in embryo.
- **The composition root today** is `handleRun` in `src/cli.ts`:
  `const worker = new ScriptedWorker(...); const recordManager = new RecordManager(); const harness = new LocalHarness(worker, recordManager, createOwnerDecisionSource())`.
  It is the only place a concrete worker is imported and wired.
- **The Forge landing point is already modeled.** At `story.done` the runner emits
  `runner-action.skipped-on-dry-run` with `action: "push|open-pr|merge"`, `reason: "dry-run"`
  (`src/harness.ts`). This is the `done → landed` seam, modeled rather than performed.
- **A provider-selection placeholder exists.** `ConfigDoc.drivers?: unknown` (`src/types.ts`) is an
  unused config field awaiting the composition root's wiring.
- **The Fence** is `authorizeRequest(request, story, policy) → { outcome, basis }`
  (`src/authorization.ts`) with the fixed CFG-10 category map. It has **no capability-proof input
  today** — that is a Phase 5 addition.
- **The Work-source seam does not exist in code.** Plans reach the runner only through
  `PlanValidator.validate` (`src/plan-validator.ts`), invoked from `cli.ts`.

## Decision

Eight settlements, binding on Phase 5 and later provider phases. Each is a decision, not an open
question.

### 1. Scope: seams + conformance harness + reference adapters — no real drivers

Phase 5 delivers the provider **machinery**, not shipped drivers. Concretely:

**In scope**

- The four provider **ports** as jig-internal TypeScript interfaces (Decision 2).
- The **composition root** that selects and wires adapters (Decision 3).
- The **capability-attestation** input to the Fence, positive-only and core-judged (Decision 4).
- The **execution-host containment-proof** model and isolation-strength catalog (Decision 5).
- The **runner-invoked Forge** seam, modeled and idempotent (Decision 6).
- The **Work-source** seam routing candidates through plan intake (Decision 7).
- The **provider manifest** and the reusable **conformance suite** (Decision 8).
- **Reference adapters** for all four seams and AC-bound contract tests proving P5-AC-1..5.

**Out of scope — split to later phases (Decision "Deferred" section and
[`phases.md`](../../delivery/m5b-local-mvp-r2/phases.md) Phase 6+):** a real agent driver, a real
execution host with genuine confinement, real Forge/GitHub push/PR/merge, real work-source
integrations, a TUI/dashboard, and record/snapshot tamper-evidence (the post-Phase-5 records-integrity
phase, per ADR 0020).

The reference adapters run in **local dry-run only**: no real network, no real containment, no real
landing. Each **models** its seam faithfully enough for the conformance suite to prove the boundary
holds — a reference execution host reports an isolation category and supplies (or withholds) a proof
token; a reference forge records a runner-delegated landing intent that stays
`skipped-on-dry-run`; a reference work-source emits candidate items that must cross `PlanValidator`.
"A seam is not a shipped driver" (`providers.md` Notes; STACK "Honest edge"): the boundary and its
proof are what Phase 5 delivers.

### 2. The four provider ports as jig-internal interfaces

Each port is a `src/` interface at the same altitude as the existing `Worker`/`RecordSink` seams — the
method surface, the invoker, and the must-not are fixed here; exact parameter encodings may flex in
implementation (as [`../contracts/driving.md`](../contracts/driving.md) defers exact port signatures),
but no implementer may add a privileged method, change the invoker, or collapse two ports. Candidate
module: `src/ports.ts` (shapes below are the settled starting point, not a frozen contract).

- **`AgentPort`** — formalizes today's `Worker`. `execute(workItem) → Promise<WorkerResult>`:
  request/observe only. **Must not** expose any push / PR / merge / credential method or field
  (INV-002, SURF-003). `ScriptedWorker` becomes the reference `AgentPort` adapter unchanged in
  behavior.
- **`ExecutionHostPort`** — where the agent runs. `describe() → HostAttestation` returning a reported
  `isolationStrength` category (Decision 5) plus a host-supplied `containmentProof` token (or its
  absence). It **supplies** a claim and proof; it **must not** decide that its own proof is fresh or
  sufficient (that is core's, Decision 4/5).
- **`ForgePort`** — the landing target. `land(request) → LandingOutcome`, invoked **only by the
  runner** at `done → landed`, never by the agent (MERGE-2, FENCE-3). The seam covers every
  forge-side act P5-AC-4 names — push, open/update PR, post status, post comment, and merge — all
  runner-owned; the exact method decomposition may flex, but no act is exposed to the agent side.
  Reference forge records the intent and stays `skipped-on-dry-run` (Decision 6). **Must not** become a
  second caller of the transition or re-judge evidence sufficiency.
- **`WorkSourcePort`** — where candidates originate. `candidates() → CandidateWorkItem[]` (provenance /
  import surface, upstream of runtime). Every candidate crosses `PlanValidator` before it reaches the
  runner (INV-007, Decision 7). **Must not** hand work to the runner directly or schedule.

The runner (`LocalHarness`) and CLI depend on these **interfaces**, never on a concrete adapter
(ENF-001, "Core depends on ports, not adapters"). Introducing `ExecutionHostPort`, `ForgePort`, and
`WorkSourcePort` is additive: today's dry-run traverses the Agent seam and the modeled forge-skip; the
new ports are wired with reference adapters so the dry-run traverses **all four** — no unexercised
stub (Context, org reconciliation).

### 3. Composition root and provider wiring

A single composition-root module (candidate `src/bootstrap.ts`, or an extracted `composeRun` in
`cli.ts`) **selects and wires** the four adapters from `config.drivers`, defaulting to the reference
adapters, and hands the wired ports to the runner. It is the **one place** that imports provider
implementations (`bootstrap.md` SURF-004). `cli.ts` `handleRun`/`handleResume` call the composition
root instead of `new ScriptedWorker(...)` directly.

- Default wiring reproduces **today's dry-run exactly**: reference agent = the scripted worker,
  reference host = a process-local host, reference forge = the modeled-skip forge, reference source =
  none (the plan is supplied directly). The Phase 0–4 golden records are unchanged by the default
  wiring — this is the regression anchor.
- `config.drivers` selects a non-default adapter by name; an unknown driver name **fails closed** with
  usage guidance (fail-closed posture, FENCE-1), never a silent fallback.
- The composition root is the sole importer; the runner, fence, and records never import an adapter
  (proven by an import/boundary test, P5-AC-3 support).

### 4. Capability attestation: proof artifact, freshness, and the core-judged sufficiency gate

This is P5-AC-2's core and the F-1/F-2 red-team surface. It realizes the capability-attestation gate
`authorization.md` seeds and the Category-3 model `plan-intake.md` seeds.

**The proof artifact** a driver supplies (candidate shape; encoding deferred per ADR 0017 decision 5):
`{ driverId, capability, runContext, isolationStrength?, proof, freshness }`. The Fence gains a
capability-attestation input: `authorizeRequest(request, story, policy, attestation)`.

**The gate is positive-only and core-judged** (`authorization.md` "Capability-attestation gate"). A
request that is otherwise low-risk becomes auto-grantable **only if** a proof exists that is:

- **fresh** — valid for the current driver and run context the policy is judging;
- **positive** — demonstrates the capability safely enough (a missing or failed proof is not neutral);
- **driver-specific** and **run-context-specific** — no transfer across drivers or contexts.

Missing / stale / failed proof does not widen authority silently: the request **drops out of the
auto-grantable set** and is routed to the Doorbell (or stays denied by scope), per
`authorization.md` decision rule 4. No new lifecycle state is minted; `route`/`deny` already exist.

**Category is a claim, never sufficiency (F-1/F-2).** A host-reported isolation category or a
driver's capability claim is **input to** core's judgment, never a substitute for it. A `strong`
self-report with an absent, stale, or overstated proof is judged **unproven**: it does **not** unlock
the autonomy that category would allow. Only fresh + positive proof does. This is the load-bearing
distinction the conformance suite asserts (Decision 8) and what keeps SEC-2 / DRIVE-3 / EARN-1/2 from
degrading to self-report.

**Freshness is modeled deterministically at local altitude.** To keep goldens deterministic (no
`Date.now()` — the workflow/test discipline in ADR 0020 §Context and the repo's determinism rule), a
reference proof carries an explicit state — `fresh` | `stale` | `missing` — and the policy declares
the expectation it is judged against. Wall-clock validity windows are a later, real-driver concern;
the **shape** of the fresh/stale/missing decision and its autonomy consequence are settled now.

**Attestation source and lifetime.** The composition root (Decision 3) captures each wired driver's
attestation at launch — the host's from `ExecutionHostPort.describe()`, the agent's from its
manifest/attestation — alongside the launch binding, and it is **immutable for the run** (GUARD-1,
like binding): a driver cannot re-attest mid-run to widen its own authority (FENCE-2). The runner
threads the relevant attestation into `authorizeRequest`; on resume it is recovered the same
launch-immutable way as the binding (ADR 0020 §3), never re-solicited from a live driver.

### 5. Execution-host containment proof and the isolation-strength catalog

Realizes `providers.md` Execution-host "Provider implements" and P5-AC-2's "distinguish self-report
from confinement proof" (SEC-2, DRIVE-3).

**Isolation-strength catalog** (the minimum three `providers.md` requires):

| Category | Meaning                                                                   |
| -------- | ------------------------------------------------------------------------- |
| `none`   | No meaningful confinement proof.                                          |
| `weak`   | Confinement present but weaker than the strongest available boundary.     |
| `strong` | Confinement strong enough to support the highest autonomy core may allow. |

The host **reports** a category and **supplies** a proof token that the declared boundary held for the
run/driver context — not a bare posture. Core judges freshness/sufficiency (Decision 4) and records
the outcome; the category alone unlocks nothing.

**Failure tokens the host may report** (from `providers.md` w4b candidates), each a condition the host
surfaces without judging its policy consequence:

- `containment-unproven` — the host cannot supply proof for the boundary it claims.
- `isolation-strength-overstated` — the reported category exceeds what the proof supports.
- `workspace-collision` — the run-scoped workspace boundary was violated (ties to the Phase-4
  run-level workspace fingerprint; per-story ISO-4 isolation stays deferred).

Core's judgment on each: the autonomy the reported category would grant is **not** unlocked, the token
is recorded, and SEC-2 posture is **never claimed stronger than proven**. At local altitude the
reference host has no real sandbox, so it **models** these: it can be configured to supply a valid
proof matching its category, a stale/absent proof, or an overstated category — and the P5-AC-2 test
asserts that only the first unlocks the stronger-autonomy grant.

### 6. Forge seam: runner-invoked landing, modeled, idempotent

Realizes `providers.md` Forge port and P5-AC-4 (MERGE-2, MERGE-5), preserving the Phase-4 non-goal
that no real landing fires locally.

- The **runner is the sole invoker** of `ForgePort.land` at `done → landed`. The `AgentPort` exposes
  no landing method (proven by the no-privileged-method test, Decision 8 / P5-AC-3).
- **Landing stays modeled.** Real push / PR / merge remain out of scope. When the runner invokes the
  reference forge, the seam records the runner-delegated landing intent and it stays
  `runner-action.skipped-on-dry-run` (action `push|open-pr|merge`, reason `dry-run`). The **only**
  change from Phase 4 is that this record is now emitted **through the ForgePort seam** (runner →
  `forge.land` → the skip record) rather than inline, so "landing is runner-owned" is a testable seam
  property. Under the default wiring the record is **byte-identical** to Phase 4 — the seam is proven
  by test structure (the runner is the caller), not by a record change — so the goldens are untouched.
  An optional `via: "forge-seam"` field is reserved for a dedicated seam-tracing scenario with its own
  golden, never the default path (encoding deferred).
- **MERGE-5 block-surfacing** is modeled: when a run has a safe branch and permission, the reference
  forge records that it **would** open/update a PR with the failure reasons; real PR I/O is deferred,
  and the durable fallback stays a Records concern (`providers.md` Forge "Provider implements").
- **Idempotency** is a seam contract test: a resume/retry does not re-invoke a landing the runner
  already recorded — it reuses the Phase-4 no-double-effect recognition from the replayed log
  (ADR 0020 §5). A reference forge configured to double-apply must be caught by the test.

### 7. Work-source seam: candidates cross plan intake

Realizes `providers.md` Work-source port and P5-AC-5 (INV-007), and the Wave 6 stop condition that
work-source input must never become a second scheduling or authorization channel.

- `WorkSourcePort` surfaces candidate work items / provenance **upstream** of runtime. Every candidate
  crosses `PlanValidator.validate` before any work reaches the runner. The port is not a scheduler and
  not an authorization channel.
- The reference work-source emits candidate items; the P5-AC-5 test proves a candidate is admitted
  **only** through a validated plan and is rejected or held when it does not pass validation. Provenance
  is recorded honestly (what came from the source versus what jig validated and scheduled).
- **Stop condition (binding):** any implementation that lets source/provenance input reach runtime
  scheduling without `PlanValidator` **stops and routes to design** (Wave 6 triage; `w4-s8`/`w4-s2`).
  No import format or sync cadence is frozen here (deferred).

### 8. Provider manifest and the conformance suite

Realizes DRIVE-1 (prove a driver by a conformance suite, not assertion) and DRIVE-2 (a manifest
declares scope; changes require fresh approval).

- **Manifest (DRIVE-2).** A provider package declares what it may do — runtimes, network,
  credentials. The **format is design-owned** (named in `providers.md`), and any manifest used by a
  reference adapter in tests is a **non-normative fixture** — this does not freeze a manifest schema
  via the fixtures directory (Contract-Preservation Rule). The invariant Phase 5 exercises: a driver's
  authority is bounded by its **declared** manifest, and widening it requires fresh owner approval
  (FENCE-2). A reference adapter that acts beyond its manifest must be rejected by the suite.
- **Conformance suite (DRIVE-1).** A reusable contract-test harness (candidate
  `src/conformance/` + `tests/conformance/`) that any driver must pass, including the Wave 5
  adversarial probes (F-1/F-2/F-3). It asserts the cross-port invariants from `providers.md`:
  providers hold no privileged credentials; the Agent seam exposes no privileged landing path; the
  execution host's confinement is proven-not-asserted; the Forge is runner-invoked only; the
  Work-source never bypasses the plan; capabilities are attested, not assumed; core depends on ports,
  not adapters. A driver that **redefines** policy/evidence/authorization/lifecycle semantics fails the
  suite (P5-AC-1).
- The **reference adapters are the first drivers that pass** the suite. An intentionally **broken**
  adapter fixture (exposes a privileged method, overstates isolation, self-authorizes, or bypasses the
  plan) proves the suite **fails closed** — the suite's own regression that it actually gates.

## Contract and records posture

- **No v0 freeze.** The execution-plan and observability-records contracts stay v0 and unfrozen. The
  four ports are internal `src/` seams; the manifest and port shapes are design-owned, not
  fixtures-frozen.
- **Additive records only, and default records are byte-identical.** Under the **default wiring** the
  records are unchanged from Phase 0–4 — the reference forge emits exactly today's
  `runner-action.skipped-on-dry-run` (`action`, `reason`) with no added field, so the Phase 0–4 goldens
  are **untouched** (the Phase-4 precedent of keeping records stable). Any new named field — the Forge
  `via`, the capability-attestation outcome, the host isolation report + failure token — appears
  **only** in the **Phase-5-specific scenarios** that need it (a non-default driver selected, a
  proof-failing/overstated host, a work-source provenance case), and **each such scenario gets its own
  new golden**. Field meanings are fixed here; exact encoding is deferred (ADR 0017 decision 5). No
  event family is renamed, removed, or newly minted.

## Required doc updates (this design PR)

- **`providers.md`** — promoted from `draft`; deepened in place to carry the settled port shapes,
  manifest, conformance-suite reference, capability-proof model, and isolation-strength catalog,
  retiring the matching "Deferred and out of scope" bullets. (Done in this PR.)
- **`authorization.md`** — a "Phase 5 realization" note adds the capability-attestation input to the
  Fence decision rules and states category-is-not-sufficiency. (Done in this PR.)
- **`bootstrap.md`** — a "Phase 5 realization" note names the concrete composition-root provider-wiring
  for the reference adapters and the fail-closed unknown-driver rule. (Done in this PR.)
- **`orchestration.md`** — a "Phase 5 realization" note names the `ForgePort` invocation at
  `done → landed`. (Done in this PR.)
- No change to the execution-plan or observability-records v0 contracts, and no change to the
  fixtures-README convention snippets (`delivery:check` stays green).

## Consequences

- Phase 5 turns the four provider seams from design-only into **exercised jig-internal ports** with
  reference adapters, a composition root that is their sole importer, a capability-attestation input to
  the Fence, and a reusable conformance suite. The boundary and its proof — not a shipped driver — are
  what ships.
- The change is **additive** to the runtime and records: the default wiring reproduces the Phase 0–4
  dry-run and goldens exactly; the new ports are traversed by reference adapters so no unexercised stub
  lands; records gain only named optional fields with deferred encoding.
- Phase 5 implementation adds `src/ports.ts`, a composition root, `src/conformance/` (the reusable
  suite), and `src/providers/reference/*` adapters, and threads a capability-attestation argument into
  `src/authorization.ts` — see the Phase 5 implementation brief. It touches `src/cli.ts`,
  `src/harness.ts`, `src/authorization.ts`, and `src/types.ts`.
- No JSON Schema freeze, no TypeScript contract package, no real driver, no real network/containment,
  and no real Forge/GitHub landing. Real agent/host/forge/work-source drivers, a TUI, and record
  tamper-evidence (the records-integrity phase, ADR 0020) remain deferred to named later phases.

- Date: 2026-07-03
- Origin: Phase 5 integrated-provider-runs design closure (docs-only, pre-implementation), scoped to
  seams + conformance harness + reference adapters per the delivery-track re-triage after Phase 4.
