---
title: "Provider realization roadmap — Phase 5-8 (ADR 0021-0024)"
status: roadmap — chronological ADR-linked ledger
---

# Provider realization roadmap

This is the chronological, ADR-linked realization ledger for the four provider seams. The seam
contract itself — owns / implements / must-not for the Agent, Execution host, Forge, and Work
source ports — lives in [`providers.md`](./providers.md); that file is organized by seam. This
file is organized by phase: it records how each seam moved from reference adapter to real driver,
phase by phase, without changing the port shapes or the boundary rules `providers.md` defines.

Nothing here overrides `providers.md`. Where a phase promotes a seam from reference adapter to
real driver, the owns / implements / must-not rules for that seam are unchanged; only the adapter
behind the port changes.

## Phase 5 realization (ADR 0021)

[ADR 0021](../decisions/0021-phase-5-integrated-provider-runs.md) realizes these seams as
**jig-internal ports with reference adapters and a conformance suite** — the machinery, not shipped
drivers. It settles the concretizations this file previously deferred, at design altitude; field-level
schema freeze and real adapters stay deferred below. The port shapes here are the settled starting
point, not a frozen contract.

- **The four ports as jig-internal interfaces.** `AgentPort` formalizes the existing `Worker`
  interface (`execute` — request/observe only, no privileged method); `ExecutionHostPort.describe()`
  returns a `HostAttestation` (the merged [`../../../packages/jig-sdk/src/ports.ts`](../../../packages/jig-sdk/src/ports.ts) shape:
  the host `isolationStrength` plus its `capabilityAttestations`, where proof and result are unified in
  `CapabilityAttestation` — `freshness`, `positive`, `reportedIsolationStrength`,
  `provenIsolationStrength`, `failureToken` — with **no** separate `containmentProof` field);
  `ForgePort.land()` is runner-invoked only; `WorkSourcePort.candidates()` surfaces provenance upstream
  of `PlanValidator`. These are `src/` seams like `Worker`/`RecordSink`, not a versioned public
  contract.
- **Composition root.** A single module selects and wires the adapters from `config.drivers`,
  defaulting to the reference adapters, and is the sole importer of provider implementations
  ([`../core/bootstrap.md`](../core/bootstrap.md) SURF-004); an unknown driver name fails closed.
- **Capability attestation.** The Fence gains a positive-only, core-judged capability-proof input
  ([`../core/authorization.md`](../core/authorization.md)). A reported isolation **category or claim is
  input to** core's judgment, never a substitute for it: a `strong` self-report with absent, stale, or
  overstated proof is judged unproven and unlocks nothing (F-1/F-2; SEC-2, DRIVE-3, EARN-1/2).
- **Isolation-strength catalog.** `none` / `weak` / `strong`, reported honestly; the failure tokens
  `containment-unproven`, `isolation-strength-overstated`, and `workspace-collision` are host-reported
  conditions whose policy consequence core judges and records.
- **Forge.** Landing stays modeled (`runner-action.skipped-on-dry-run`) but is now emitted **through**
  the runner-invoked Forge seam; adapter idempotency across resume/retry is a seam contract test.
- **Work source.** Reference candidates are admitted only through a validated plan; source input that
  reaches runtime scheduling without `PlanValidator` is a stop condition, not a local decision.
- **Manifest and conformance suite.** The manifest (runtimes, network, credentials — DRIVE-2) is
  design-owned and used only as a non-normative fixture; the reusable conformance suite (DRIVE-1)
  asserts the cross-port invariants above, including the Wave 5 adversarial probes, and an
  intentionally broken adapter proves it fails closed.
- **Conformance adequacy bar.** Per
  [ADR 0026](../decisions/0026-conformance-self-report-only.md), the suite proves interface-shape
  conformance and specified responses under controlled doubles. It does **not** prove real-provider
  behavioral truth: a mock can lie. Any conformance verdict whose basis is solely the subject's own
  claim is classified with the typed `self-report-only` token and must not be read as independently
  verified conformance. The same bar extends to smoke and evidence assertions: an assertion a
  fail-closed refusal would also satisfy is not evidence of the claimed real-provider behavior.

## Phase 6 realization (ADR 0022)

[ADR 0022](../decisions/0022-phase-6-real-driver-integration.md) promotes the **Agent** and
**Execution host** seams from reference adapters to **real drivers** behind these same, unchanged
ports, at design altitude and unfrozen. It splits Phase 6 into **6a** (real Codex-first agent on a
`weak`/reference host, independently useful) and **6b** (real host supplying proven `strong`
confinement). The Forge (Phase 7) and Work source (Phase 8) seams stay reference-only here.

- **Real agent driver behind `AgentPort`.** A Codex-first driver maps to the merged
  `execute(story) → Promise<WorkerResult>` (request/observe only) and performs real edits, selected by
  name through the composition root. INV-002 stays **structural**: no push/PR/merge/credential path
  exists on the port (a forbidden-method sweep in the conformance suite asserts `fs/*`,
  `command/exec*`, `thread/shellCommand`, and any landing surface belong to **other** ports). On a
  denied or unavailable capability the driver parks/interrupts through the Fence — it never returns a
  broader profile; advisory (Guardian-style) evidence is observed evidence, never an auto-bypass.
- **Proven confinement, `provenIsolationStrength` not `reportedIsolationStrength`.** The real host
  populates `CapabilityAttestation.provenIsolationStrength` from an **exercised** confinement check —
  a termination/prove-empty step, a negative-probe egress check, a named containment mechanism
  (`process-group`/`kernel-tree`/`job-object`), and a planned-vs-actually-ran command binding — not a
  declared constant. Core judges autonomy on **proven**, never reported: `reported > proven` records
  `isolation-strength-overstated`; an absent/stale proof records `containment-unproven`; each withholds
  the autonomy the reported category would grant. `describe()` **stays synchronous** — the proof runs
  async at compose time (prove-then-describe) and `describe()` returns the already-computed attestation.
- **Per-story ISO-4 isolation.** Independent stories run in per-story isolated workspaces
  (worktree-per-story) so parallel work cannot collide; a duplicate launch of the same task is refused
  with `workspace-collision`, extending the Phase-4 run-level workspace fingerprint.
- **Resume attestation persist/recover (Residual A).** The launch `CapabilityAttestation` is persisted
  alongside the plan/policy snapshots and recovered on resume, launch-immutable; resumed requests are
  adjudicated against the **launch** attestation, never a fresher, more permissive re-derivation.
- **Substrate manifest.** Extending the Phase-5 manifest ([ADR 0021](../decisions/0021-phase-5-integrated-provider-runs.md)
  decision 8, declared + statically conformance-checked), a real provider's substrate scope (runtimes,
  argv, credentials, egress) becomes an **immutable, hashed, approved tuple** enforced **at runtime**:
  each substrate request is validated against it and an out-of-tuple request is refused as a diagnosable
  stop — the boundary the M7 substrate-escalation kill
  assumption requires (distinct from capability attestation: the manifest bounds what the driver may
  _request_, the attestation proves what the host _confines_). Manifest format is design-owned and used
  only as a non-normative fixture — no schema freeze.
- **Real freshness clock & redaction activation.** `CapabilityFreshness` is decided by a real clock
  against real timestamps (a stale attestation is non-fresh at the Fence), replacing the deterministic
  constant. Real secret-scanning **activates** at the boundary real credentials first enter records
  (6a); a redaction ambiguity becomes a diagnosable stop, extending
  [ADR 0020](../decisions/0020-phase-4-reliable-local-runs.md) §7.

## Phase 7 realization (ADR 0023)

[ADR 0023](../decisions/0023-phase-7-real-forge-landing.md) promotes the **Forge** seam from the
modeled, `skipped-on-dry-run` reference adapter to a **real Forge/GitHub driver** behind the same,
unchanged, runner-invoked `ForgePort.land()`, at design altitude and unfrozen — the first phase in which
`done → landed` performs a **real effect**. It splits Phase 7 into **7a** (real runner-owned landing +
the `action` union + real-effect idempotency + landing-path redaction, independently useful) and **7b**
(PR-side block surfacing). The Work source (Phase 8) seam stays reference-only here.

- **Real Forge/GitHub adapter behind the runner-invoked `land()`.** The real adapter performs a real
  push, PR, or merge at `done → landed`, invoked **only** by the runner (never the agent — INV-002
  stays structural). Selected by name (`forge: 'github'`) through the composition root, sole-imported;
  an unknown forge name fails closed. The default/dry-run wiring keeps emitting
  `runner-action.skipped-on-dry-run`, so the Phase-0..4 goldens stay byte-identical.
- **`LandingRequest.action` union (Residual B).** The live
  [`../../../packages/jig-sdk/src/ports.ts`](../../../packages/jig-sdk/src/ports.ts) shape now types `action` as the union
  `'push' | 'open-pr' | 'merge'` so the real adapter can discriminate, and an unknown action **fails
  closed**. This remains a jig-internal port-type fix that freezes nothing.
- **Real-effect idempotency.** A re-run or resume against an already-landed effect recognizes the prior
  landing **from the replayed records** (extending the Phase-4 no-double-effect recognition,
  [ADR 0020](../decisions/0020-phase-4-reliable-local-runs.md) §5) and the second attempt is a recorded
  no-op. The **exact-head re-read** is the safety property: a changed head is not blindly no-op'd nor
  duplicated — the run stops diagnosably. The richer outcome is additive on `LandingOutcome`
  (`Pick<RunEvent, 'family'> & Partial<RunEvent>`) with encoding deferred.
- **PR-side block surfacing (MERGE-5) is a distinct runner-invoked act, not a `land()` call.** A
  `blocked` item never reaches `done → landed`, so block surfacing is a separate forge-side act (the
  method decomposition ADR 0021 decision 6 permits to flex): when the runner has a safe branch and
  permission, the real Forge opens/updates the PR, posts status, and posts the failure reasons as a
  comment — without changing what `blocked` means; when it cannot safely do so, the block is recorded
  through the **durable Records fallback** and never dropped.
- **Landing-path secret redaction.** Forge/GitHub credentials/tokens on the real landing path are
  scanned and redacted in the landing records by the **same** Phase-6 redaction machinery
  ([ADR 0022](../decisions/0022-phase-6-real-driver-integration.md) Decision 8), extended to the
  landing boundary; a landing-path redaction ambiguity becomes a diagnosable stop and records stay safe
  to keep/export. Real landing maps onto the observability-records v0 runner-action families already
  named ("pushed, opened PR, posted status, posted comment, merged, skipped repeated effect on resume")
  — no new event family is minted.

## Phase 8 realization (ADR 0024)

[ADR 0024](../decisions/0024-phase-8-real-work-source.md) promotes the **Work source** seam from the
reference adapter to **real importer(s)** behind the same, unchanged `WorkSourcePort.candidates()`, at
design altitude and unfrozen — the phase in which candidate work first arrives from a **real external
source** rather than being seeded from the operator-supplied plan. It splits Phase 8 into **8a** (real
importer + the structural `PlanValidator` crossing, independently useful) and **8b** (richer,
origin-bearing provenance). This is the last real-driver phase of the M7 track.

- **Real importer behind `candidates()`, opt-in and sole-imported.** Real importer(s) produce
  `CandidateWorkItem`s from a real source (e.g. an issue tracker), selected by name
  (`config.drivers.workSource = 'github-issues'`) through the composition root, sole-imported; an unknown
  work-source name fails closed. The port is **not** a scheduler and **not** an authorization channel.
  The default/reference wiring keeps emitting its single seed-derived candidate, so the Phase-0..4
  goldens stay byte-identical.
- **The structural `PlanValidator` chokepoint realizes `work-source-never-bypasses-plan`.** The merged
  composition root validates the operator-supplied **seed** plan, but the thing actually scheduled is
  `candidate.planInstance`; the reference adapter is seeded from that same object, so identity masks the
  gap. A real importer breaks the identity, so Phase 8 enforces the crossing at a **single intake
  chokepoint** that mints an **opaque runtime-verifiable validated wrapper** carrying an **unforgeable
  runtime marker** (a module-private `Symbol` / private field) only it can produce; the runtime scheduling
  API (`LocalHarness.run` / `LocalHarness.resume`, internal — not one of the four ports) is narrowed to
  accept **only** that wrapper, never a raw plan. Two layers, both required: an unwrapped plan is a
  **compile-time type error** for typed callers, and — because a type-level brand is **erased at runtime** —
  `run`/`resume` also **verify the marker at runtime**, so an `any`-typed caller or a value crossing a
  deserialization boundary that lacks the marker is **refused fail-closed and recorded** (the runtime check
  makes the any-edge guarantee achievable). A failing candidate is rejected or held (P8-AC-1); a bypass —
  adapter-side or a direct-harness marker-less call — fails closed and is recorded through the existing
  `rejected`/`denied` families, minting no new event family (P8-AC-2). The runtime marker lives on the
  in-memory wrapper and is never serialized, so the Phase-0..4 goldens stay byte-identical. The
  `work-source-plan-intake-bypass` conformance anchor plus a direct-`run`/`resume`-bypass case exercising
  the runtime refusal ride Phase 8.
- **Origin-bearing `CandidateWorkItem.provenance` (Residual-B-style seam fix).** The merged
  [`../../../packages/jig-sdk/src/ports.ts`](../../../packages/jig-sdk/src/ports.ts) types `provenance` as the single literal
  `'jig-validated'`; Phase 8 widens it to a shape that **names the real origin** (source system +
  identifier) **and still asserts jig-validated**, so provenance is not collapsed to one constant. This is
  a jig-internal port-type widening — the same category as the ADR 0023 `LandingRequest.action` union —
  that **freezes nothing**; field encoding is deferred. The **per-candidate** origin (source + candidate
  identifier) is **legible in the run record** without a freeze: the observability-records contract is
  "v0 Not Frozen" and already carries the **driver** identity as `run.drivers.workSource`
  (`"work-source:local-plan"`) — but driver identity alone is **not** sufficient (two candidates through
  one driver must be distinguishable), so the per-candidate origin rides an **additive** provenance field /
  event basis alongside it; no frozen field is minted (P8-AC-3). The `PlanValidator` crossing is
  non-negotiable and does not regress: the source stays a candidate producer, never a scheduling
  authority.

## Realization summary

- A seam is not a shipped driver. In Phase 5 each port is exercised by a **reference adapter** and the
  conformance suite; the **real** agent and execution-host drivers arrive in Phase 6
  ([ADR 0022](../decisions/0022-phase-6-real-driver-integration.md)), the **real** forge driver arrives
  in Phase 7 ([ADR 0023](../decisions/0023-phase-7-real-forge-landing.md)), and the **real** work-source
  importer arrives in Phase 8 ([ADR 0024](../decisions/0024-phase-8-real-work-source.md)).
- Until a driver proves a capability, expect reduced autonomy, not a weaker guarantee.
- Realized in Phase 5 (ADR 0021): the reusable conformance suite, the provider-manifest shape at design
  altitude, the capability-proof model, and reference adapters for all four seams.

## Deferred and out of scope

- **Real** (production) adapter direction for the **Agent** and **Execution host** seams is recorded in
  Phase 6 ([ADR 0022](../decisions/0022-phase-6-real-driver-integration.md), "Phase 6 realization"
  above), real **Forge**/GitHub push/PR/merge direction in Phase 7
  ([ADR 0023](../decisions/0023-phase-7-real-forge-landing.md), "Phase 7 realization" above), and real
  **Work source** import direction in Phase 8
  ([ADR 0024](../decisions/0024-phase-8-real-work-source.md), "Phase 8 realization" above). EVRUN-full
  remains an evidence gate; design direction here must not be read as proof that the complete real
  Codex-driven path has been exercised.
- Freezing a manifest JSON Schema or a capability-proof field-level schema (design owns the shape,
  including the Phase-6 substrate manifest and persisted-attestation shape; freeze stays with the
  contract owner).
- Extracting provider packages, publishing provider APIs, or committing to a third-party provider
  ecosystem.
- Publicly exposing app-server protocol types, app-server session files, or the internal
  session-observable Codex seam.
- JSON Schema, event constants, or frozen field-level contract shapes for the execution-plan or
  observability-records v0 contracts.
- New lifecycle states, transition tables, or state-machine redesign.
- Record/snapshot tamper-evidence — the post-Phase-5 records-integrity phase
  ([ADR 0020](../decisions/0020-phase-4-reliable-local-runs.md)).
- Any change to the execution-plan or observability-records v0 contracts.

## Reconciles to

- `DRIVE-1` — a driver earns its place via a conformance suite, not assertion.
- `DRIVE-2` — a provider manifest declares its scope; changes require fresh approval.
- `DRIVE-3` — execution hosts report containment strength honestly.
- `SEC-2` — no phone-home is a proven containment boundary, not a provider assertion.
- `EARN-1` and `EARN-2` — autonomy follows fresh capability proof, not assumption.
- `MERGE-5` — a blocked item surfaces through a real PR when the Forge seam is real.
- [`providers.md`](./providers.md) — the seam contract (owns / implements / must-not) this roadmap
  realizes phase by phase.
