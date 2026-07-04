# Repo Plan for M7

The org derivation handoff for milestone **M7 — Real Provider Integration**
(`.github/MILESTONES.md`, "Deriving Repo Plans"). It records what jig owns, consumes, and must not
decide as it turns M7's outcome into local phases and stories. The phase decomposition and
ID-bearing acceptance criteria live in [`phases.md`](./phases.md); the track overview is
[`README.md`](./README.md).

**Closeout note (2026-07-04):** org M7 is now done through accepted EVRUN-partial evidence. This repo
plan is retained as durable delivery history. EVRUN-full and Codex transport hardening remain post-M7
debt.

- **Org milestone:** M7 — Real Provider Integration (`.github/MILESTONES.md`, state
  `done`; primary owner `jig`). Promote M5's `named extension point` seams (agent driver,
  execution-host driver, forge driver, work-source driver, resume, capability attestation) to
  `exercised` with real effects, behind the contracts already owned by M1 and merged in jig Phase 5.

- **This repo owns:**
  - Real driver implementations behind the four existing ports — `AgentPort`, `ExecutionHostPort`,
    `ForgePort`, `WorkSourcePort` — selected through the composition root
    ([`../../../src/bootstrap.ts`](../../../src/bootstrap.ts)), performing real effects (Phases 6-8).
  - A _proven_ capability attestation from a real execution host (`provenIsolationStrength` from an
    exercised confinement check) and the confinement evidence it attests to; a real freshness clock;
    per-story parallel-workspace isolation (Phase 6).
  - Resume attestation persist/recover — persisting the launch `CapabilityAttestation` and recovering
    it on resume, parallel to the Phase-4 binding (Residual A, Phase 6).
  - Runner-owned real Forge/GitHub landing with real-effect idempotency, and the
    `LandingRequest.action` union fix (Residual B, Phase 7).
  - Real work-source import through `PlanValidator` with provenance richer than the single
    `'jig-validated'` literal (Phase 8).
  - Records-integrity: tamper-evidence over the launch header + plan/policy snapshots and the active
    `resume-blocked-missing-approval` re-approval path (Phase 9).
  - The local phase sequencing, story decomposition, tests, and evidence.

- **This repo consumes:**
  - The execution-plan and observability-records v0 contract **shapes** (owned by M1; cited, not
    re-decided) — [`../../design/contracts/execution-plan-contract-v0.md`](../../design/contracts/execution-plan-contract-v0.md),
    [`../../design/contracts/observability-records-contract-v0.md`](../../design/contracts/observability-records-contract-v0.md).
  - The P5-pinned ports, composition root, capability-attestation gate, and driver conformance suite,
    merged at commit `f59a479` ([`../../../src/ports.ts`](../../../src/ports.ts),
    [`../../../src/bootstrap.ts`](../../../src/bootstrap.ts),
    [ADR 0021](../../design/decisions/0021-phase-5-integrated-provider-runs.md)).
  - jig's product guarantees as fixed inputs (STACK / DRIVE / SEC / MERGE / ISO / RESUME / EARN /
    GUARD in [`../../product/guarantees.md`](../../product/guarantees.md)) — no new PRD is stood up;
    M7 is not a new-layer milestone.

- **This repo must not decide:**
  - The M1-owned contract **shapes** (execution-plan, observability-records) — changing their shape is
    a breaking change routed back to M1/the contract owner, not decided in delivery planning.
  - v0 contract freeze — freezing the execution-plan / observability-records schemas (or a contract
    package) is contract-owner-owned; it is a checkpoint after representative real-provider usage, not
    a phase here.
  - The items under `.github/MILESTONES.md` "Deferred From This Sequence" — hosted multi-tenant
    operation, remote hosts beyond a ready seam, webhook/scheduler-triggered runs,
    model-adjudicated approval autonomy, legacy run migration — stay out of M7.
  - Whether a first-party TUI belongs in jig-core — that is a **product decision** (CFG-7 frames
    dashboards as a third-party extension point), not a delivery call.

- **Local artifacts to change:**
  - New: `docs/delivery/m7-real-providers/README.md`, `docs/delivery/m7-real-providers/phases.md`,
    this file.
  - Updated: `docs/delivery/README.md` (adds this track), the m5b-r2
    [`phases.md`](../m5b-local-mvp-r2/phases.md) "Phase 6 and beyond" section (redirected here so
    Phases 6-9 are not defined twice), and the m5b-r2
    [`feature-inventory.md`](../m5b-local-mvp-r2/feature-inventory.md) (its "Phase 6+" placements
    redirected to this track's phases/checkpoints).
  - Later, per phase: implementation briefs under `docs/delivery/m7-real-providers/`, per-phase ADRs
    authored via the local technical-design flow (design-owned; not created from this delivery plan),
    and the engine/tests under `src/` and `tests/`.

- **Local exit criteria:**
  - Phases 6-9 land with every phase AC evidenced by a test citing its AC ID (P6-AC-1..6, P7-AC-1..5,
    P8-AC-1..3, P9-AC-1..3).
  - Real drivers selected through the composition root perform real effects under policy against a
    real, proven capability attestation; the driver conformance suite still fails closed on a broken
    adapter; the Phase-0..4 record goldens stay byte-identical under default reference wiring.
  - `corepack pnpm check` green with the enforced 90% coverage thresholds for each landed phase.

- **Cross-repo dependencies:**
  - `.github` owns M7 and the derivation contract; a routed-back finding (e.g. an org seam proves
    wrong) goes to `.github/MILESTONES.md` and `ROADMAP.md`, not resolved locally.
  - Learning (M6) consumes the real run records M7 emits but does not block M7; M6's entry is already
    satisfiable by M1 examples or an M5 record.
  - No dependency on any other product repo for the real local path — real drivers are local and
    opt-in; hosted/remote operation is org-deferred.

- **Verification:**
  - Per-AC tests named by AC ID; a real-agent-edit integration test; host proof/self-report
    distinguishing and overstated-isolation tests; a real-clock freshness test; parallel-workspace
    isolation and duplicate-launch tests; a resume-attestation persist/recover and drifted-host resume
    test; a runner-only landing test, an `action`-union test, and a land-then-relaunch idempotency
    test; a work-source-to-plan-intake test and a bypass fail-closed test; a tamper-detection test and
    a changed-basis re-approval test.
  - Regression anchors every phase: default-wiring golden byte-identity and conformance-suite
    fail-closed-on-broken-adapter.
  - `corepack pnpm check` as the phase gate.

- **Open questions to send back to the org roadmap:**
  1. `ExecutionHostPort.describe()` is **synchronous** (`describe(): HostAttestation`), but a real
     host may need to run proof work to attest confinement. Does the port surface flex to async
     (an encoding change to a P5-pinned seam), or is proof pre-computed before `describe()`? Routed to
     the contract owner / design; not decided in delivery planning.
  2. Residual B's `LandingRequest.action` union is now live in the local port type. If richer
     work-source provenance or any later landing evidence forces an observability-records field change,
     that is a contract change routed to M1, not a local edit.
  3. Does tamper-evidence over the record chain (Phase 9) require a records-contract field for the
     digest/HMAC posture? If so, it is design/contract-owner-owned, and its freeze is the v0-freeze
     checkpoint — confirm sequencing with the org roadmap.
