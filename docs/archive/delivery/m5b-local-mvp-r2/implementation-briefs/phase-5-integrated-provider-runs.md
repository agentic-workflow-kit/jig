---
title: "Phase 5 implementation brief — Integrated Provider Runs"
status: active
---

# Phase 5 implementation brief — Integrated Provider Runs

## Context and goal

Phases 0–4 delivered a reliable local dry-run engine, but its provider seams are not real seams yet:
the scripted worker is wired directly in `cli.ts`, the runner emits the forge-landing skip inline, and
the execution-host, forge, and work-source seams exist only in the design docs. Phase 5 turns the four
provider seams into **exercised jig-internal ports** with a composition root, a capability-attestation
input to the Fence, and a reusable conformance suite — proven with **reference adapters**, not shipped
drivers. Every acceptance criterion is a contract test that an invariant holds.

The design is closed in
[ADR 0021](../../../../design/decisions/0021-phase-5-integrated-provider-runs.md). This brief is
implementation-ready **against that ADR**: it does not re-decide the port shapes, the composition root,
the capability-attestation gate, the isolation catalog, the forge/work-source seams, or the conformance
suite — it implements them. Where a detail is genuinely design-owned rather than a local implementation
choice, this brief says so and routes it back per the stop conditions; do not fill gaps by invention.

**Scope (binding): seams + conformance harness + reference adapters.** No real agent driver, no real
execution host, no real network or containment, no real Forge/GitHub landing, no real work-source
integration, no TUI. Those are Phase 6+ (see [`../phases.md`](../phases.md) "Phase 6 and beyond"). The
default wiring must reproduce the Phase 0–4 dry-run and its golden records **exactly** — that is the
regression anchor.

**Dependency: Phases R, 3, and 4 are delivered on current `main`** — Phase R
([PR #22](https://github.com/agentic-workflow-kit/jig/pull/22)), Phase 3
([PR #23](https://github.com/agentic-workflow-kit/jig/pull/23)), Phase 4
([PR #26](https://github.com/agentic-workflow-kit/jig/pull/26)). Verify the baseline gate
(`corepack pnpm check` green) before editing runtime behavior.

## Source files to read

Read, in order:

- [`../phases.md`](../phases.md) — the **authoritative** Phase 5 section and P5-AC-1..5. These IDs are
  the binding delivery target.
- [ADR 0021](../../../../design/decisions/0021-phase-5-integrated-provider-runs.md) — the eight
  settlements this brief implements (scope, the four ports, composition root, capability attestation,
  isolation catalog, forge seam, work-source seam, manifest + conformance suite).
- [`../../../design/contracts/providers.md`](../../../../design/contracts/providers.md) — the four seams'
  owns/implements/must-not contract and the "Phase 5 realization (ADR 0021)" section.
- [`../../../design/core/authorization.md`](../../../../design/core/authorization.md) — the Fence
  decision rules, the capability-attestation gate, and its Phase 5 realization note (the attestation
  input; category-is-not-sufficiency).
- [`../../../design/core/plan-intake.md`](../../../../design/core/plan-intake.md) — the Category-3
  capability-proof model and freshness/staleness discipline; the `PlanValidator` boundary work-source
  candidates cross.
- [`../../../design/core/orchestration.md`](../../../../design/core/orchestration.md) — the runner-owned
  `done → landed` boundary and its Phase 5 realization note (the `ForgePort` invocation).
- [`../../../design/core/bootstrap.md`](../../../../design/core/bootstrap.md) — the composition root as the
  sole importer of provider implementations, and its Phase 5 realization note.
- Wave 5 red-team
  ([`w5-s1` routed-findings](../../../planning/design-track/waves/wave-5-red-team/outputs/w5-s1-authority-and-provider-red-team/routed-findings.md))
  and Wave 6
  ([`prerequisite-triage.md`](../../../planning/design-track/waves/wave-6-implementation-phasing/prerequisite-triage.md))
  — the adversarial scenarios the conformance suite must cover and the stop conditions to carry.
- [Phase 4 brief](./phase-4-reliable-local-runs.md) — the delivered records/resume shape and the
  golden-fixture conventions Phase 5 builds on.

## Current delivered surfaces consumed from Phases 0–4

Confirmed against `src/` at authoring time — build on these, do not re-derive them:

- **The Agent seam is already an interface.** `src/types.ts`:
  `interface Worker { execute(story: Story): Promise<WorkerResult> }`. `ScriptedWorker`
  (`src/worker.ts`) implements it; `LocalHarness` (`src/harness.ts`) holds a `Worker`, not the concrete
  class. Formalize this as `AgentPort`.
- **The composition root today** is `handleRun` in `src/cli.ts`:
  `new ScriptedWorker(scriptedOutput)`, `new RecordManager()`,
  `new LocalHarness(worker, recordManager, createOwnerDecisionSource())`. `handleResume` composes the
  same way via `src/resume.ts`.
- **The forge-landing point** is `src/harness.ts` at `story.done`: it emits
  `runner-action.skipped-on-dry-run` with `action: "push|open-pr|merge"`, `reason: "dry-run"`. This is
  the `done → landed` seam, modeled — route it through `ForgePort` without changing the emitted record
  under the default wiring.
- **The Fence** is `authorizeRequest(request, story, policy)` (`src/authorization.ts`) →
  `{ outcome, basis }` with the fixed CFG-10 map and the `AuthorizationBasis` union in `src/types.ts`.
  It has **no capability-proof input** today — Slice 3 adds one.
- **Plan intake** is `PlanValidator.validate(instance)` (`src/plan-validator.ts`), invoked from
  `cli.ts` before the runner sees a plan. Work-source candidates must cross it (Slice 6).
- **Config** carries `ConfigDoc.drivers?: unknown` (`src/types.ts`) — the unused provider-selection
  field the composition root reads (Slice 2).
- **Types** (`src/types.ts`): `Worker`, `WorkerResult`, `RecordSink`, `Story`, `Plan`, `PolicyDoc`,
  `ConfigDoc`, `AuthorizationRequest`/`Decision`, `RunEvent` (extensible via `[key: string]: unknown`).

## Non-goals

Do not:

- implement a **real** agent driver, real execution host, real network access, real containment, or any
  real Forge/GitHub push/PR/merge — reference adapters model their seam in local dry-run only;
- change the records the default wiring emits, or regress the Phase 0–4 golden fixtures;
- freeze a JSON Schema, event constants, a manifest schema, a capability-proof schema, or a TypeScript
  **contract** package for the execution-plan or observability-records v0 seams;
- add provider manifests, TypeScript interfaces, or event constants **to the fixtures directory**
  (`tests/fixtures/m5b-local-mvp/README.md` Contract-Preservation Rule) — the port and manifest shapes
  live in `src/` and the design docs; any manifest fixture stays clearly non-normative;
- introduce a new lifecycle state, transition table, or event family; Phase 5 records are additive;
- add per-story ISO-4 parallel-workspace isolation, record/snapshot tamper-evidence, or a real freshness
  clock (`Date.now()`) — all deferred;
- design Phase 6, or move any product/design commitment.

## Likely source files touched

- `src/cli.ts` — route `handleRun`/`handleResume` through the composition root instead of
  `new ScriptedWorker(...)`; fail closed on an unknown `config.drivers` selection.
- `src/harness.ts` — the runner calls `ForgePort.land` at `done → landed` (Slice 5) and threads the
  capability attestation into `authorizeRequest` (Slice 3); no behavior change under default wiring.
- `src/authorization.ts` — add the capability-attestation input to `authorizeRequest`; missing/stale
  proof drops a request out of the auto-grantable set.
- `src/resume.ts` — compose the same wired ports on resume; forge idempotency reuses the Phase-4
  no-double-effect recognition.
- `src/types.ts` — port interfaces (or import from `src/ports.ts`), the capability-attestation type,
  the host attestation/isolation types, and any additive `RunEvent` fields (forge `via`, attestation
  outcome, host report).
- `src/worker.ts` — `ScriptedWorker` becomes the reference `AgentPort` adapter (behavior unchanged).
- `tests/*` — new tests named per AC ID (below); `tests/fixtures/m5b-local-mvp/*` — reference-adapter
  and broken-adapter fixtures.

### Potential new modules (names are suggestions, not mandates)

Structure for ownership clarity; a different split is fine if ownership and dependencies stay clear.

- `src/ports.ts` — the four port interfaces (`AgentPort`, `ExecutionHostPort`, `ForgePort`,
  `WorkSourcePort`) plus the attestation/host-report types. **Depended on by** the composition root,
  the runner, and every adapter.
- `src/bootstrap.ts` (or an extracted `composeRun` in `cli.ts`) — the composition root: select and wire
  adapters from `config.drivers`, default to reference adapters, fail closed on unknown names. The one
  importer of provider implementations.
- `src/providers/reference/{agent,host,forge,work-source}.ts` — the four reference adapters. The
  reference agent wraps `ScriptedWorker`.
- `src/conformance/` — the reusable conformance suite (invariant assertions a driver must pass) plus a
  deliberately broken adapter used only to prove the suite fails closed.
- `tests/ports.unit.test.ts`, `tests/conformance/*.test.ts`, `tests/providers.*.test.ts` — coverage for
  the new seams and the suite.

## Concrete implementation slices

Each slice maps to an ADR 0021 decision and the AC(s) it closes. Implement in order; each is
independently testable, and after each the Phase 0–4 goldens must still pass under the default wiring.

### Slice 1 — The four ports (ADR 0021 decision 2) → foundation for P5-AC-3

Define `src/ports.ts`:

- `AgentPort` — formalize `Worker`: `execute(workItem) → Promise<WorkerResult>`, request/observe only.
  It must declare **no** push/PR/merge/credential method or field (INV-002, SURF-003).
- `ExecutionHostPort` — `describe() → HostAttestation` returning a reported `isolationStrength`
  (`none`|`weak`|`strong`) plus a supplied `containmentProof` (present/absent, with a modeled state).
- `ForgePort` — `land(request) → LandingOutcome`, documented as runner-invoked only; the seam covers
  push/open-PR/status/comment/merge (all runner-owned, none agent-exposed — P5-AC-4), method
  decomposition may flex.
- `WorkSourcePort` — `candidates() → CandidateWorkItem[]`, upstream of `PlanValidator`.

The runner and CLI depend on these interfaces. Keep the shapes minimal; exact parameter encodings may
flex, but the method surface, invoker, and must-not are fixed by the ADR.

### Slice 2 — Composition root + reference agent (ADR 0021 decision 3) → P5-AC-3

Build the composition root (`src/bootstrap.ts` or `composeRun`):

- Read `config.drivers`; default each seam to its reference adapter (reference agent = a thin
  `AgentPort` wrapper over `ScriptedWorker`; reference source = a **pass-through** `WorkSourcePort`
  that surfaces the directly-supplied plan as already-validated provenance). An unknown driver name
  **fails closed** with usage guidance (matching the fail-closed flag discipline in `cli.ts`), never a
  silent fallback.
- Return the wired ports to the runner. `cli.ts` `handleRun`/`handleResume` call the composition root
  instead of importing `ScriptedWorker` directly; after this slice the composition root is the **only**
  module that imports a provider adapter.
- **Wire and invoke all four ports** — the pass-through source is selected and called even on the
  default path (it still routes through `PlanValidator` exactly as today), so no seam is bypassed
  under default wiring (ADR 0021 decision 3; the M5 "no unexercised stub" rule).
- **Regression anchor:** default wiring reproduces today's records exactly — the Phase 0–4 goldens pass
  unchanged.

### Slice 3 — Capability-attestation input to the Fence (ADR 0021 decision 4) → P5-AC-2 (gate half)

Thread a capability attestation into authorization:

- Extend `authorizeRequest(request, story, policy, attestation)`. A request that is otherwise
  low-risk is auto-grantable **only** when the attestation is `fresh` + positive + driver/run-context
  specific; a `missing`/`stale`/failed proof drops it out of the auto-grantable set → `route` (or stays
  `deny` by scope), per `authorization.md` decision rule 4.
- **The default granted record stays byte-identical.** When the default reference attestation is
  `fresh`+positive the request grants exactly as today with the **same** recorded `basis` — do **not**
  append a proof-driven basis label on the default path (that would change the Phase 0–4 grant goldens,
  which must stay unchanged). Any new `AuthorizationBasis` label is emitted **only** on the
  proof-failure/route outcomes in the Phase-5-specific scenarios (missing/stale/overstated proof), which
  get their own new goldens — the gate is enforced on the default path, but it is proven by the request
  still granting with the unchanged basis, not by a new record field.
- **Category is not sufficiency:** a provider-supplied isolation category or capability claim is input,
  never a substitute. Do not let a `strong` self-report auto-grant without a fresh positive proof.
- **Freshness is modeled** (`fresh`|`stale`|`missing`) against a policy-declared expectation — no
  `Date.now()`. Keep it deterministic so goldens stay stable.
- **Source and lifetime (ADR 0021 decision 4):** the composition root captures each driver's
  attestation at launch (host via `ExecutionHostPort.describe()`) alongside the launch binding, and it
  is immutable for the run (GUARD-1); the runner passes the relevant attestation into `authorizeRequest`
  and, on resume, recovers it the launch-immutable way (like binding), never re-solicited live. Do not
  let a driver re-attest mid-run.

### Slice 4 — Execution-host port + reference host + isolation catalog (ADR 0021 decision 5) → P5-AC-2

Add the `ExecutionHostPort` reference adapter and core's judgment:

- The reference host reports an `isolationStrength` category and supplies a `containmentProof` token —
  configurable to a valid proof matching its category, a stale/absent proof, or an **overstated**
  category (reports `strong`, proof supports only `weak`).
- Core judges (reuse Slice 3): the autonomy the reported category would grant is unlocked **only** with
  fresh, positive proof. On an unproven/overstated/absent case, record the failure token
  (`containment-unproven` | `isolation-strength-overstated` | `workspace-collision`) and do not claim
  SEC-2 stronger than proven. The `workspace-collision` token ties to the Phase-4 run-level workspace
  fingerprint (per-story ISO-4 stays deferred).
- **Worked scenario (the P5-AC-2 anchor — implement exactly this, do not settle for a boolean
  proof-present test).** Pin the minimal policy field: policy declares a per-capability isolation
  expectation, e.g. `policy.rules.capabilityIsolation: { "<capability>": "strong" }`. A worker request
  declares `<capability>`. Then, with an otherwise-grantable request:
  - **(a) grant** — host reports `strong` with a **fresh, valid** proof → the request is
    `grant`-eligible.
  - **(b) route + `isolation-strength-overstated`** — host reports `strong` but the proof supports only
    `weak` (overstated) → **`route`, not grant**, and the token is recorded.
  - **(c) route + `containment-unproven`** — host reports honest `weak`, or proof is `missing`/`stale`,
    against a `strong` expectation → **`route`**, token recorded.

  Cases (a)/(b)/(c) are three named host-config fixtures. (b) is the one that fails a shallow
  proof-present test, so it is mandatory. This shape is fixed by ADR 0021 decision 4–5; the exact field
  encoding is deferred, but the `capabilityIsolation` expectation and the three outcomes are not.

### Slice 5 — Forge port + reference forge, runner-invoked and idempotent (ADR 0021 decision 6) → P5-AC-4

Route landing through the seam:

- At `done → landed`, the runner (not the agent) calls `ForgePort.land`. The reference forge records
  the runner-delegated landing intent and it stays `runner-action.skipped-on-dry-run` (action
  `push|open-pr|merge`, reason `dry-run`) — **byte-identical to today's inline emission**, now emitted
  through the seam. The seam being runner-owned is proven by **test structure** (the runner is the
  caller; the agent has no landing method), not by a record change, so the Phase 0–4 goldens are
  untouched. Do **not** add a field to the default skip record; an optional `via: "forge-seam"` field is
  reserved for a dedicated seam-tracing scenario with its own golden (encoding deferred).
- Model MERGE-5 block-surfacing (record that the forge **would** open/update a PR with failure reasons
  when a safe branch + permission exist); real PR I/O deferred.
- **Idempotency:** on resume/retry the runner does not re-invoke a landing it already recorded — reuse
  the Phase-4 no-double-effect recognition from the replayed log (ADR 0020 §5). A reference forge
  configured to double-apply must be caught by the test.

### Slice 6 — Work-source port + reference source, candidates cross plan intake (ADR 0021 decision 7) → P5-AC-5

Add the `WorkSourcePort` reference adapter:

- The reference source emits candidate work items; every candidate crosses `PlanValidator.validate`
  before it reaches the runner. Provenance is recorded honestly (source-supplied vs jig-validated).
- The port is not a scheduler and not an authorization channel. **Stop condition:** if a candidate
  could reach runtime scheduling without `PlanValidator`, stop and route to design (`w4-s8`/`w4-s2`) —
  do not add a bypass.

### Slice 7 — Conformance suite + manifest + broken-adapter regression (ADR 0021 decision 8) → P5-AC-1

Build the reusable suite (`src/conformance/` + `tests/conformance/`):

- Assert the cross-port invariants from `providers.md`: providers hold no privileged credentials; the
  Agent seam exposes no privileged landing path; execution-host confinement is proven-not-asserted; the
  Forge is runner-invoked only; the Work-source never bypasses the plan; capabilities are attested, not
  assumed; core depends on ports, not adapters. Include the Wave 5 adversarial probes (F-1/F-2/F-3).
- A reference-adapter **manifest** (runtimes/network/credentials, DRIVE-2) is a non-normative fixture;
  the suite asserts a driver cannot act beyond its declared manifest without fresh approval (FENCE-2).
- The reference adapters **pass** the suite. An intentionally **broken** adapter (exposes a privileged
  method, overstates isolation, self-authorizes, or bypasses the plan) makes the suite **fail closed** —
  the suite's own regression that it actually gates.

## Acceptance criteria (binding — from `phases.md`)

- **P5-AC-1** — A driver cannot redefine policy/evidence/authorization/lifecycle semantics; reference
  adapters pass the conformance suite, a broken adapter fails it closed. Closed by Slice 7. Traces:
  STACK-2..STACK-5, DRIVE-1.
- **P5-AC-2** — Execution-host tests distinguish self-report from confinement proof; a `strong`
  self-report with absent/stale/overstated proof unlocks nothing, and the failure token is recorded.
  Closed by Slices 3–4. Traces: SEC-2, DRIVE-3, EARN-1/EARN-2.
- **P5-AC-3** — The `AgentPort` exposes no privileged method and only the composition root imports
  adapters. Closed by Slices 1–2. Traces: FENCE-3, INV-002.
- **P5-AC-4** — Push/PR/status/comment/merge are runner-owned: `ForgePort` is runner-invoked only,
  stays `skipped-on-dry-run`, and is idempotent on resume/retry. Closed by Slice 5. Traces: MERGE-2,
  MERGE-5.
- **P5-AC-5** — Work-source candidates route through plan intake; source input never reaches runtime
  scheduling without `PlanValidator`. Closed by Slice 6. Traces: INV-007, plan-intake.

## Test / evidence plan

Every test cites the AC ID it proves (the r2 AC-to-test convention). Coverage thresholds stay at 90%
(aim 95%); `corepack pnpm check` is the gate.

- **Conformance** (`tests/conformance/*`): `P5-AC-1: each reference adapter passes the suite`;
  `P5-AC-1: a broken adapter (privileged method / semantic redefinition) fails the suite closed`;
  `P5-AC-1: an adapter acting beyond its declared manifest is rejected`.
- **Execution host** (`tests/providers.host.*` / `tests/authorization.unit.test.ts`):
  `P5-AC-2: a strong-category self-report with missing/stale proof does not unlock stronger autonomy`;
  `P5-AC-2: an overstated isolation category records isolation-strength-overstated and unlocks nothing`;
  `P5-AC-2: fresh positive proof unlocks the category's autonomy`.
- **Agent seam** (`tests/ports.unit.test.ts`, `tests/providers.*`): `P5-AC-3: AgentPort exposes no
push/PR/merge/credential method`; `P5-AC-3: only the composition root imports a provider adapter`
  (import/boundary assertion).
- **Forge** (`tests/harness.unit.test.ts`, `tests/resume.unit.test.ts`): `P5-AC-4: landing is invoked
only by the runner via ForgePort and stays skipped-on-dry-run`; `P5-AC-4: resume does not re-invoke a
landing already recorded` (idempotency).
- **Work source** (`tests/providers.work-source.*`): `P5-AC-5: a candidate is admitted only through a
validated plan`; `P5-AC-5: a candidate that fails validation is rejected/held and never scheduled`.
- **Baseline guard:** the Phase 0–4 goldens still pass under the default wiring — proof the seams,
  composition root, and forge-through-seam did not regress the delivered records.

## Fixture plan

- **Reference-adapter fixtures** for each seam (config selecting each reference driver), clearly
  non-normative. A **non-normative manifest** fixture for the reference adapters.
- **A broken-adapter fixture** the conformance suite rejects (privileged method / overstated isolation /
  self-authorization / plan bypass), proving fail-closed.
- **Host proof/self-report fixtures**: valid-proof, stale/absent-proof, and overstated-category cases
  for P5-AC-2.
- **New Phase-5 goldens are separate artifacts.** The default-wiring records stay byte-identical, so
  the Phase 0–4 goldens are **untouched** (do not re-normalize them to absorb a new field). The
  Phase-5-specific records (a proof-failing/overstated host, a non-default driver, a work-source
  provenance case, or a `via`-traced forge scenario) get their **own new goldens** that assert the new
  field directly — regenerate them, never normalize the semantic field away. A golden no test reads may
  not exist (the Phase R rule). Do not add TypeScript interfaces, JSON Schema, event constants, or
  provider manifests **to the fixtures directory as normative artifacts** (fixtures README rule); keep
  any manifest example plainly illustrative.

## CLI behavior

- `jig run` / `jig preview` / `jig inspect` / `jig resume` — **unchanged in surface** under the default
  wiring. `run`/`resume` now compose the four ports through the composition root; an unknown
  `config.drivers` selection fails closed with usage guidance and a non-zero exit.
- No new subcommand is required for Phase 5. If a `jig conform <driver>` affordance helps, it is
  optional and must not change the four core subcommands' behavior.

## Stop conditions

Halt and route back to design (do not decide locally) if:

- a provider adapter would need to redefine core policy/evidence/authorization/lifecycle semantics to
  make an AC pass;
- any AC would require a **real** driver, real network/containment, or real Forge/GitHub landing;
- SEC-2 posture would depend on host self-report instead of proof, or a reported isolation category
  would unlock autonomy without core-judged proof;
- a manifest, capability-proof, or records field must be **frozen** (JSON Schema / event constants /
  TypeScript contract package) — freeze is contract-owner-owned;
- work-source/provenance input could reach runtime scheduling without `PlanValidator`;
- the default wiring can no longer reproduce the Phase 0–4 goldens (a records regression) — the change
  is not additive and must be re-scoped.

## PR evidence checklist

- `git diff --check` clean.
- `corepack pnpm check` green (lint, format:check, typecheck, delivery:check, vitest ≥ 90%).
- Every new test names the AC ID it proves; the conformance suite and the broken-adapter fixture are
  read by a test.
- A records-diff note in the PR body: the default wiring reproduces the Phase 0–4 records; any additive
  field (forge `via`, attestation outcome, host report) is named and normalized, citing ADR 0021 —
  downstream consumers read records, so the change must be legible. Note the explicit non-goal: no real
  driver, no real landing, no schema freeze.
- The Phase 0–4 goldens still pass, evidencing no regression to the delivered shape.
