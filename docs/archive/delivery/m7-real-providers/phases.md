---
title: "M7 real-providers phase details"
status: completed via EVRUN-partial
---

# M7 real-providers phase details

Phases 6-9 only. Every acceptance criterion has a stable ID and cites the product/design IDs it
traces to. Tests cite the AC IDs they prove. These phases promote the M5 `named extension point`
seams (agent driver, execution-host driver, forge driver, work-source driver, resume, capability
attestation) to `exercised` with real effects, behind the ports pinned and merged in
[Phase 5](../m5b-local-mvp-r2/phases.md#phase-5--integrated-provider-runs) (commit `f59a479`,
[`../../../src/ports.ts`](../../../../src/ports.ts)).

**Status as of 2026-07-04:** this phase ladder is retained as durable M7 delivery history after the
org milestone accepted EVRUN-partial exit evidence. EVRUN-full and Codex transport hardening remain
post-M7 debt.

The **real as-merged port shapes** these phases build on — cite these, not the ADR 0021 sketch:

- `AgentPort.execute(story): Promise<WorkerResult>`.
- `ExecutionHostPort.describe(): HostAttestation` — **synchronous**; the host returns its
  attestation without awaiting. A real host that must run proof work to attest confinement is a
  live encoding tension, carried as a repo-plan open question, not resolved here.
- `ForgePort.land(request): LandingOutcome | Promise<LandingOutcome>`.
- `WorkSourcePort.candidates(): CandidateWorkItem[] | Promise<CandidateWorkItem[]>`.
- `CapabilityAttestation` unifies proof and result: `freshness`
  (`fresh`/`stale`/`missing`), `positive`, `reportedIsolationStrength`,
  `provenIsolationStrength`, `failureToken`. `HostAttestation` carries the host `isolationStrength`
  (`none`/`weak`/`strong`) and its `capabilityAttestations`.
- The composition root [`../../../src/bootstrap.ts`](../../../../src/bootstrap.ts)
  `composeReferenceRun` is the sole importer of the reference adapters and fails closed on an
  unknown driver name.
- Encoding deltas already merged from the ADR 0021 sketch: there is no separate `containmentProof`
  field (proof rides `CapabilityAttestation.provenIsolationStrength` + `freshness`); `ForgePort`
  collapsed to one `land()`; `CandidateWorkItem.provenance` is hard-coded to the single literal
  `'jig-validated'`.

Contracts stay v0 and unfrozen throughout; **delivery planning** introduces no TypeScript interfaces,
JSON Schema, provider manifests, package exports, or package decomposition — those remain design- and
contract-owner-owned. One design-owned exception is now exercised for Phase 6: the **substrate
manifest** (the immutable, hashed, approved argv/creds/egress tuple whose runtime validation closes
the substrate-escalation stop) is authorized **at design altitude by
[ADR 0022](../../../design/decisions/0022-phase-6-real-driver-integration.md) Decision 7** (extending
[ADR 0021](../../../design/decisions/0021-phase-5-integrated-provider-runs.md) decision 8), and stays a
non-normative fixture with no schema freeze. Building it per ADR 0022 is therefore design-owned work,
not a delivery-planning invention or a boundary violation; this track only **references** it. Two
regression anchors ride every phase below as evidence, never as their own phase: the Phase-0..4 record
goldens stay byte-identical under the default reference wiring (real drivers are opt-in), and the
driver conformance suite still fails closed on a broken or non-conforming adapter.

## Phase 6 — Real driver integration

**Client value:** An operator can run an approved plan with a **real agent** doing real edits inside
a **real, confined execution host**, and Jig grants that agent only the autonomy the host's _proven_
confinement earns — not the autonomy it merely reports. Independent stories run at once in isolated
workspaces without corrupting each other, and an interrupted real run resumes against the capability
that was attested at launch.

**Goal:** Promote the agent and execution-host seams from reference adapters to real drivers behind
the unchanged `AgentPort` and `ExecutionHostPort`. Supply a _proven_ `provenIsolationStrength` from
a real host, decide freshness by a real clock, isolate per-story workspaces in parallel, and persist
and recover the launch capability attestation across resume. Provider claims stay provider-supplied
but core-judged: a reported isolation strength or capability claim is input to core's judgment, never
a substitute for it.

**Design-time decision — the 6a/6b split.** The host is materially deeper than the driver (real
confinement proof, a termination ladder, workspace isolation), so this phase is expected to split at
design time into **6a — real agent driver** (Codex-first) on a weak or reference host, and **6b —
real execution host** supplying proven `strong` confinement. Recommended internal ordering: land 6a
attesting `weak` isolation (reduced autonomy, still useful), then 6b hardens to a real
`strong`-containment host. The split is settled in the Phase 6 design session, not here.

**Requirements:**

- A real agent driver (Codex-first) behind `AgentPort.execute(story)`, selected through
  `composeReferenceRun`'s successor in [`../../../src/bootstrap.ts`](../../../../src/bootstrap.ts),
  performing real edits — replacing the scripted-worker stub for the driven path. The `AgentPort`
  still exposes no push/PR/merge/credential path (INV-002).
- A real execution host behind `ExecutionHostPort.describe()` that returns a `HostAttestation` whose
  `capabilityAttestations` carry a `provenIsolationStrength` backed by an exercised confinement
  check, not a declared constant. An absent, stale, or overstated proof records the matching
  `failureToken` (`containment-unproven`, `isolation-strength-overstated`, `workspace-collision`) and
  does not unlock the autonomy the reported strength would grant.
- A real freshness clock deciding `CapabilityFreshness` (`fresh`/`stale`/`missing`) from real
  driver/host timestamps, replacing the deterministic reference constant.
- Per-story parallel-workspace isolation: independent stories run at once in their own isolated
  workspaces without corrupting each other's tree, and the same task cannot be launched twice.
- **Resume attestation persist/recover (Residual A):** the launch-captured `CapabilityAttestation` is
  persisted alongside the launch binding and recovered on resume, parallel to the Phase-4 binding
  mechanism ([ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md) §3). Today resume
  reconstructs a _constant_ reference-host attestation — safe only because the reference host does not
  drift; a real driver that can drift or self-widen requires true persist-and-recover so resumed work
  is adjudicated against the capability attested at launch, never a fresher permissive re-derivation.

**Acceptance criteria:**

- **P6-AC-1** — A real agent driver (Codex-first) selected through the composition root runs an
  approved plan and performs real edits recorded as observed evidence; the default (reference) wiring
  still reproduces the Phase-0..4 goldens byte-identically, so the real driver is opt-in. Traces:
  [`DRIVE-1`](../../../product/guarantees.md#41-trusting-a-driver),
  [`STACK-2`](../../../product/guarantees.md#4-stack-portability)–
  [`STACK-3`](../../../product/guarantees.md#4-stack-portability),
  [ADR 0021](../../../design/decisions/0021-phase-5-integrated-provider-runs.md) decisions 2–3.
- **P6-AC-2** — A real execution host attests `provenIsolationStrength` from an exercised confinement
  check; a host reporting `strong` with an absent, stale, or overstated proof records the failure
  token and does **not** unlock the autonomy `strong` would grant — only fresh, positive proof does.
  Traces: [`SEC-2`](../../../product/guarantees.md#16-security--no-leaks-no-phone-home),
  [`DRIVE-3`](../../../product/guarantees.md#41-trusting-a-driver),
  [`EARN-1`](../../../product/guarantees.md#12-earned-trust--capability-attestation)–
  [`EARN-2`](../../../product/guarantees.md#12-earned-trust--capability-attestation), ADR 0021
  decisions 4–5.
- **P6-AC-3** — Freshness is decided by a real clock against real driver/host timestamps: an
  attestation older than its freshness window is recorded `stale` and treated as non-fresh by the
  Fence, without a stubbed constant. Traces:
  [`EARN-1`](../../../product/guarantees.md#12-earned-trust--capability-attestation)–
  [`EARN-2`](../../../product/guarantees.md#12-earned-trust--capability-attestation), ADR 0021
  decision 4.
- **P6-AC-4** — Two independent stories run in parallel in isolated workspaces without corrupting
  each other's tree, and a second launch of the same task is refused
  (`workspace-collision` recorded on collision). Traces:
  [`ISO-4`](../../../product/guarantees.md#32-work-level-failure-isolation), ADR 0021 decision 5.
- **P6-AC-5** — The launch `CapabilityAttestation` is persisted with the launch binding and recovered
  on resume; a run resumed after a real host would attest a _fresher, more permissive_ capability is
  still adjudicated against the launch-attested capability, never the re-derived one, and the launch
  attestation is immutable across resume. Traces:
  [`RESUME-2`](../../../product/guarantees.md#31-interruption-resume),
  [`GUARD-1`](../../../product/guarantees.md#13-anti-gaming),
  [`EARN-2`](../../../product/guarantees.md#12-earned-trust--capability-attestation),
  [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md) §3.
- **P6-AC-6** — Secrets surfaced by a real agent or host (credentials, tokens, environment) are
  scanned and redacted in records the moment real credentials first enter play; a redaction ambiguity
  becomes an operator-visible diagnosable stop rather than a silent leak. Traces:
  [`SEC-1`](../../../product/guarantees.md#16-security--no-leaks-no-phone-home)–
  [`SEC-3`](../../../product/guarantees.md#16-security--no-leaks-no-phone-home).

**Evidence/tests:**

- A real-agent-edit integration test (P6-AC-1) plus a default-wiring golden-regression test proving
  the Phase-0..4 goldens are byte-identical.
- A host proof/self-report distinguishing test and a host-overstated-isolation test (P6-AC-2), each
  asserting the recorded `failureToken`.
- A real-clock freshness test with a stale-window fixture (P6-AC-3).
- A parallel-workspace isolation test and a duplicate-launch refusal test (P6-AC-4).
- A resume-attestation persist/recover test and a drifted-host resume test proving launch-attested
  capability governs (P6-AC-5).
- A secret-redaction test over a record carrying a real credential (P6-AC-6).
- The driver conformance suite still fails closed on a broken adapter; `corepack pnpm check` green
  with the enforced 90% coverage thresholds.

**Stop conditions:**

- Stop if a real driver can escalate its substrate — argv, credentials, or egress — past what the
  attestation authorized (Wave 5 finding: substrate trust is not code trust).
- Stop if attested isolation strength is declared rather than proven by an exercised check.
- Stop if resume adjudicates resumed work against a re-derived permissive attestation instead of the
  persisted launch attestation.
- Stop if making `ExecutionHostPort.describe()` supply real proof requires changing the port surface
  (e.g. to async) — that is an encoding change routed to the contract owner / design, not decided
  locally (repo-plan open question).
- Stop if "real" expands into hosted, multi-tenant, or remote operation before the local real path
  proves out.

**Relevant references:**

- [`../../../src/ports.ts`](../../../../src/ports.ts),
  [`../../../src/bootstrap.ts`](../../../../src/bootstrap.ts)
- [ADR 0021](../../../design/decisions/0021-phase-5-integrated-provider-runs.md),
  [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md) §3
- [`../../design/contracts/providers.md`](../../../design/contracts/providers.md)
- [`../../design/core/authorization.md`](../../../design/core/authorization.md),
  [`../../design/core/orchestration.md`](../../../design/core/orchestration.md)
- Wave 5 red-team:
  [`w5-s1`](../../planning/design-track/waves/wave-5-red-team/outputs/w5-s1-authority-and-provider-red-team/routed-findings.md)

**Explicit non-goals:**

- Real Forge/GitHub landing (Phase 7); real work-source import (Phase 8); tamper-evidence and the
  active re-approval path (Phase 9).
- Hosted, multi-tenant, or remote execution.
- Freezing the execution-plan, observability-records, or capability-attestation schemas.

## Phase 7 — Real Forge/GitHub landing

**Client value:** An operator sees an approved, evidenced run become **real landed work** — a real
push, PR, or merge on GitHub — the first time `done → landed` performs a real effect, and re-running
a landed effect does not duplicate it.

**Goal:** Promote `ForgePort` from the modeled, `skipped-on-dry-run` reference adapter to a real
Forge/GitHub adapter that lands work under the runner's authority, with real-effect idempotency.
Landing stays runner-owned: `ForgePort.land()` is invoked only by the runner at `done → landed`, and
the `AgentPort` never gains a landing path.

**Requirements:**

- A real Forge/GitHub adapter behind `ForgePort.land(request)` performing push, PR, and merge as the
  `LandingRequest.action` selects, invoked only by the runner at `done → landed`.
- **`LandingRequest.action` union (Residual B):** [`../../../src/ports.ts`](../../../../src/ports.ts)
  now types `action` as the union `'push' | 'open-pr' | 'merge'` so the real Forge path can
  discriminate actions. The historical modeled golden value may still record `"push|open-pr|merge"`
  for byte-identity, but the typed port surface is the union.
- Real-effect idempotency: a re-run against an already-landed effect recognizes the prior landing
  from the records and does not repeat it.
- **PR-side block surfacing (MERGE-5):** when a run is blocked and the runner has a safe branch and
  permission to push, the real Forge adapter surfaces the block on the PR — opening or updating the
  PR-side surface, posting status, and surfacing the failure reasons as a comment — without changing
  what `blocked` means; when it cannot safely do so, the block is still recorded through the durable
  Records fallback and never dropped.
- Secrets on the real landing path (Forge/GitHub credentials) are scanned and redacted in records;
  the landing path never leaks a token.

**Acceptance criteria:**

- **P7-AC-1** — The runner drives `ForgePort.land()` at `done → landed` and a real push/PR/merge
  effect occurs on GitHub; the `AgentPort` still exposes no landing path, and landing stays
  `skipped-on-dry-run` under dry-run wiring. Traces:
  [`MERGE-2`](../../../product/guarantees.md#15-merge-on-evidence),
  [`MERGE-5`](../../../product/guarantees.md#15-merge-on-evidence),
  [`FENCE-3`](../../../product/guarantees.md#11-the-fence--runtime-authorization), ADR 0021
  decision 6.
- **P7-AC-2** — `LandingRequest.action` is the union `'push' | 'open-pr' | 'merge'` and the real
  adapter discriminates on it; an unknown action fails closed. Traces:
  [`../../../src/ports.ts`](../../../../src/ports.ts) (Residual B),
  [`MERGE-2`](../../../product/guarantees.md#15-merge-on-evidence).
- **P7-AC-3** — Re-running a landed effect (resume or retry) does not duplicate it: the prior landing
  is recognized from the records and the second attempt is a recorded no-op. Traces:
  [`MERGE-5`](../../../product/guarantees.md#15-merge-on-evidence),
  [`RESUME-3`](../../../product/guarantees.md#31-interruption-resume), ADR 0021 decision 6.
- **P7-AC-4** — Secrets on the real landing path (Forge/GitHub credentials, tokens) are scanned and
  redacted in the landing records; a redaction ambiguity on the landing path becomes a diagnosable
  stop, and records stay safe to keep and export. Traces:
  [`SEC-1`](../../../product/guarantees.md#16-security--no-leaks-no-phone-home)–
  [`SEC-3`](../../../product/guarantees.md#16-security--no-leaks-no-phone-home).
- **P7-AC-5** — Blocked work is surfaced PR-side through the real Forge: when the runner has a safe
  branch and permission to push, the block opens or updates the PR, posts its status, and records the
  failure reasons as a PR comment, without changing what `blocked` means; when the run cannot safely
  do that, the block is still recorded through the durable Records fallback rather than dropped.
  Traces: [`MERGE-5`](../../../product/guarantees.md#15-merge-on-evidence), ADR 0021 decision 6.

**Evidence/tests:**

- A runner-only landing test proving the `AgentPort` has no landing path (P7-AC-1) and a
  dry-run `skipped-on-dry-run` regression.
- An `action`-union discrimination test and an unknown-action fail-closed test (P7-AC-2).
- A land-then-relaunch idempotency test (P7-AC-3).
- A landing-path secret-redaction test (P7-AC-4).
- A blocked-run PR-surfacing test proving status and a failure-reason comment are posted when the
  runner has a safe branch and permission, plus a no-safe-branch test proving the block falls back to
  the durable Records path rather than being dropped (P7-AC-5).
- The driver conformance suite still fails closed on a broken adapter; the Phase-0..4 goldens stay
  byte-identical under default wiring; `corepack pnpm check` green.

**Stop conditions:**

- Stop if real landing is not idempotent when re-run against a real effect.
- Stop if any landing path becomes reachable from the `AgentPort` rather than the runner.
- Stop if a Forge credential can appear unredacted in a record.
- Stop if making `action` a union requires freezing the observability-records schema — the union is a
  local port-type fix, but schema freeze is contract-owner-owned; route freeze back to design.

**Relevant references:**

- [`../../../src/ports.ts`](../../../../src/ports.ts) (`LandingRequest`, `ForgePort`)
- [ADR 0021](../../../design/decisions/0021-phase-5-integrated-provider-runs.md) decision 6
- [`../../design/core/orchestration.md`](../../../design/core/orchestration.md),
  [`../../design/contracts/providers.md`](../../../design/contracts/providers.md)

**Explicit non-goals:**

- Real work-source import (Phase 8); tamper-evidence and the re-approval path (Phase 9).
- Hosted, multi-tenant, or remote landing targets.
- Freezing the observability-records schema.

## Phase 8 — Real work-source integration

**Client value:** An operator can pull candidate work from a real source (an issue tracker or other
system) and trust that every candidate still crosses plan validation before it can run — the source
never schedules work Jig has not validated.

**Goal:** Promote `WorkSourcePort` from the reference adapter to real importer(s) that produce
`CandidateWorkItem`s, with every candidate crossing `PlanValidator` before runtime scheduling, and
provenance richer than the single `'jig-validated'` literal so a record can name where a candidate
came from.

**Requirements:**

- Real importer(s) behind `WorkSourcePort.candidates()` producing `CandidateWorkItem`s from a real
  source.
- Every candidate crosses `PlanValidator`: a candidate is admitted only via a validated plan and is
  rejected or held otherwise; source input never reaches runtime scheduling without `PlanValidator`
  (INV-007).
- Richer provenance than the single `CandidateWorkItem.provenance: 'jig-validated'` literal — a
  candidate's record names its real origin (source system, identifier) while still asserting it was
  jig-validated, so the provenance is not collapsed to one constant.

**Acceptance criteria:**

- **P8-AC-1** — A real importer produces candidates that reach runtime scheduling **only** after
  `PlanValidator`; a candidate that fails validation is rejected or held and never scheduled. Traces:
  [`../../design/core/plan-intake.md`](../../../design/core/plan-intake.md), INV-007, ADR 0021
  decision 7.
- **P8-AC-2** — An attempt to route a work-source candidate to scheduling bypassing `PlanValidator`
  fails closed and is recorded. Traces:
  [`../../design/core/plan-intake.md`](../../../design/core/plan-intake.md),
  [`STACK-4`](../../../product/guarantees.md#4-stack-portability)–
  [`STACK-5`](../../../product/guarantees.md#4-stack-portability), ADR 0021 decision 7.
- **P8-AC-3** — A candidate's provenance names its real origin (source and identifier) rather than
  the single `'jig-validated'` literal, and the origin is legible in the run record. Traces:
  [`SEE-3`](../../../product/guarantees.md#5-full-observability),
  [`../../../src/ports.ts`](../../../../src/ports.ts) (`CandidateWorkItem.provenance`).

**Evidence/tests:**

- A work-source-to-plan-intake test (P8-AC-1) and a bypass-attempt fail-closed test (P8-AC-2).
- A provenance-legibility test proving a candidate's real origin appears in the record (P8-AC-3).
- The driver conformance suite still fails closed on a broken adapter; the Phase-0..4 goldens stay
  byte-identical under default wiring; `corepack pnpm check` green.

**Stop conditions:**

- Stop if work-source/provenance input can reach runtime scheduling without `PlanValidator` — route
  to design (`w4-s8`/`w4-s2`), do not decide locally.
- Stop if richer provenance requires freezing the observability-records or execution-plan schema —
  route freeze back to design.
- Stop if "real work source" expands into webhook- or scheduler-triggered runs (deferred at org
  level).

**Relevant references:**

- [`../../../src/ports.ts`](../../../../src/ports.ts) (`WorkSourcePort`, `CandidateWorkItem`)
- [`../../design/core/plan-intake.md`](../../../design/core/plan-intake.md)
- [ADR 0021](../../../design/decisions/0021-phase-5-integrated-provider-runs.md) decision 7

**Explicit non-goals:**

- Webhook- or scheduler-triggered runs; legacy run migration (both org-deferred).
- Tamper-evidence and the re-approval path (Phase 9).
- Freezing the execution-plan or observability-records schema.

## Phase 9 — Records-integrity

**Client value:** An operator can trust that a run record has not been tampered with, and when an
approved plan's basis changes while a run is stopped, Jig actively blocks resume until the change is
re-approved rather than resuming on stale authority.

**Goal:** Add tamper-evidence over the durable record chain — computed over the authoritative launch
header plus the plan and policy snapshots — and make the `resume-blocked-missing-approval` re-approval
path active, replacing the Phase-4 named-seam-with-no-active-trigger. The tamper-evidence is
**computed over** the header and snapshots but **materialized on a separate integrity sidecar / a
non-golden surface**, so it does not alter the default golden record bytes — the byte-identical
Phase-0..4 goldens stay a regression anchor through this phase, and integrity lives beside the record,
not inside it. Sequenced **after** Phase 6 because
the real trust anchor arrives with real providers: tamper-evidence over a chain only real drivers can
meaningfully corrupt is worth more once those drivers exist
([ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md), integrity deferred
post-Phase-5).

**Requirements:**

- Tamper-evidence (a digest/HMAC/hash-chain) **computed over** the launch header and the plan and
  policy snapshots but **stored on a separate integrity sidecar / non-golden surface**, so an
  out-of-band edit to a record or snapshot is detectable at inspect/resume **without** writing
  integrity bytes into the default golden record. This is a design constraint the Phase 9 design
  session (ADR + T9) must honor: the byte-identical Phase-0..4 goldens are load-bearing for the whole
  program, so integrity rides beside the record rather than mutating its default bytes.
- The active `resume-blocked-missing-approval` path: a safety-relevant change to the approved plan's
  basis while a run is stopped requires fresh approval and evidence before resume proceeds — the
  Phase-4 named seam
  ([ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md)) becomes an active trigger.
- Integrity checks are diagnosable stops, not silent failures: a broken chain or a missing
  re-approval surfaces at inspect and refuses resume with a named reason.

**Acceptance criteria:**

- **P9-AC-1** — Tamper-evidence is computed over the launch header and the plan/policy snapshots and
  materialized on a separate integrity sidecar / non-golden surface — **not** written into the default
  golden record, which stays byte-identical; an out-of-band edit to a record or snapshot is detected
  and surfaced at inspect, and resume refuses on a broken chain with a named reason. Traces:
  [`GUARD-1`](../../../product/guarantees.md#13-anti-gaming),
  [`SEE-4`](../../../product/guarantees.md#5-full-observability),
  [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md).
- **P9-AC-2** — A safety-relevant change to the approved plan's basis while stopped triggers
  `resume-blocked-missing-approval`; resume refuses until fresh approval and evidence are recorded,
  and the re-approval decision is narrow and durable. Traces:
  [`RESUME-5`](../../../product/guarantees.md#31-interruption-resume),
  [`GUARD-2`](../../../product/guarantees.md#13-anti-gaming),
  [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md).
- **P9-AC-3** — Integrity and re-approval failures are operator-visible diagnosable stops with named
  reasons, never silent; records stay safe to keep and export. Traces:
  [`LIVE-2`](../../../product/guarantees.md#33-liveness--noticing-a-stuck-run),
  [`SEE-4`](../../../product/guarantees.md#5-full-observability),
  [`SEC-1`](../../../product/guarantees.md#16-security--no-leaks-no-phone-home).

**Evidence/tests:**

- A tamper-detection test (edit a record/snapshot, prove inspect surfaces it and resume refuses)
  (P9-AC-1).
- A changed-basis re-approval test proving resume is blocked until re-approved (P9-AC-2).
- A diagnosable-stop test for a broken chain and a missing re-approval (P9-AC-3).
- The Phase-0..4 goldens stay byte-identical under default wiring; `corepack pnpm check` green.

**Stop conditions:**

- Stop if tamper-evidence lands integrity bytes in the default golden record surface rather than a
  separate integrity sidecar / non-golden surface — that would break the byte-identical Phase-0..4
  goldens regression anchor, which stays sacrosanct through this phase.
- Stop if tamper-evidence requires freezing the observability-records schema — the digest/HMAC field
  posture is design-owned; route freeze back to design.
- Stop if the re-approval path can be widened mid-run without owner approval, or if a model
  adjudicates the re-approval (authorization.md CFG-10 — no model adjudicates this boundary).
- Stop if integrity failures resume silently instead of refusing with a named reason.

**Relevant references:**

- [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md) (integrity deferred
  post-Phase-5; the `resume-blocked-missing-approval` named seam)
- [`../../design/core/records.md`](../../../design/core/records.md),
  [`../../design/core/authorization.md`](../../../design/core/authorization.md),
  [`../../design/core/bootstrap.md`](../../../design/core/bootstrap.md)

**Explicit non-goals:**

- Learning-loop analysis (M6); TUI/dashboard and policy analyzer (see the track README's checkpoints).
- Hosted, multi-tenant, or remote operation.
- Freezing the observability-records schema.

## Beyond this track — checkpoints and tail

These are not phases of this track. They ride behind it, are owned elsewhere, or open with a decision
before any design session.

- **Learning loop (M6).** Consumes representative real run records to produce hardening
  recommendations; owned by org milestone **M6 (Learning Loop Seed)**, whose entry criterion is
  already satisfiable by M1 examples or an M5 record, so M6 does not block on this track. The real run
  records these phases emit strengthen M6 seeding.
- **TUI / dashboard — product decision first.** There is no ID-bearing product guarantee behind a
  first-party TUI, and
  [`CFG-7`](../../../product/guarantees.md#2-configuration-ownership) frames dashboards as a
  **third-party extension point** — arguably a signal against a first-party TUI. A TUI must open with
  a **product decision** (is a TUI jig-core at all, or does CFG-7 keep it out-of-repo?), not just a
  design session.
- **Policy analyzer.** Tune policy strictness from run history; needs run-history volume before it is
  worth designing.
- **v0 contract freeze.** Freeze the execution-plan and observability-records schemas (and any
  contract package) once representative real-provider usage exists (post Phase 7/8). Contract freeze
  is contract-owner-owned; this track keeps the contracts cited and unfrozen.
- **Doc micro-deferrals.** Invariant-ledger consolidation, replay-drift token vs. notice,
  event-sourcing subprofile, retention richness, and posture-tuning depth are design-owned and
  revisited opportunistically.
