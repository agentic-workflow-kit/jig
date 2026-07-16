---
title: "ADR 0022 — Phase 6 real-driver integration: the 6a/6b split, the real agent driver, proven confinement, substrate authorization"
status: applied
---

# ADR 0022 — Phase 6 real-driver integration

## Context

Phase 6 ([`docs/archive/delivery/m7-real-providers/phases.md`](../../delivery/m7-real-providers/phases.md),
P6-AC-1..6) promotes the agent and execution-host seams from **reference adapters** to **real
drivers** behind the unchanged `AgentPort` and `ExecutionHostPort`. It is the keystone of the M7
real-providers track: a real agent (Codex-first) performs real edits inside a real, confined
execution host, and jig grants that agent only the autonomy the host's _proven_ confinement earns —
not the autonomy it merely reports. This is the first phase in which a **real** driver exists, so it
is also the first point at which substrate-escalation risk (argv, credentials, egress, hosts an
adapter requests at runtime) becomes concrete, and the first point at which real credentials enter
records. What is missing is the set of concrete choices an implementer would otherwise have to
invent. This ADR settles them so two independent implementers produce compatible Phase 6 behavior,
exactly as [ADR 0021](./0021-phase-5-integrated-provider-runs.md) did for Phase 5 and
[ADR 0020](./0020-phase-4-reliable-local-runs.md) did for Phase 4.

The design layer already seeds every Phase-6 concept — the four ports' owns/implements/must-not
contract and the "Phase 5 realization (ADR 0021)" section in
[`../contracts/providers.md`](../contracts/providers.md); the capability-attestation gate and its
positive-only, core-judged discipline in [`../core/authorization.md`](../core/authorization.md); the
Category-3 capability-proof/freshness model in [`../core/plan-intake.md`](../core/plan-intake.md);
the runner-exclusive `done → landed` boundary and its ISO-4 extension point in
[`../core/orchestration.md`](../core/orchestration.md); the composition root that "is the one place
that imports provider implementations" in [`../core/bootstrap.md`](../core/bootstrap.md); and the
Phase-4 launch-binding persist/recover mechanism ([ADR 0020](./0020-phase-4-reliable-local-runs.md)
§3), the run-level workspace fingerprint (§6), and the redaction/export posture (§7) this ADR
extends. The prior-art recipe for a real local worker and a proven-not-asserted execution host is
recorded in [`../notes/prior-art-workflow-kit.md`](../notes/prior-art-workflow-kit.md) lessons 9–10,
re-derived here, never ported.

The v0 contracts remain unfrozen (STOP-003 in
[`../notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md)); nothing here freezes the
execution-plan or observability-records JSON Schema, mints a public contract package, or ships a real
driver **from this ADR** (this ADR is docs-only; the real drivers land in the Phase-6 implementation
cycle). The four ports stay **jig-internal seams** in `src/` — the same category as `Worker` and
`RecordSink` — not a versioned public contract. The provider manifest this ADR introduces is
designed at the design/contract surface, exercised as a **non-normative fixture**, and not frozen
through a schema (respecting the Contract-Preservation Rule in
[`tests/fixtures/m5b-local-mvp/README.md`](../../../../tests/fixtures/m5b-local-mvp/README.md)).

### Org reconciliation — Phase 6 is the M5 "later slice" made real

Org M7 (`.github/MILESTONES.md`, "M7: Real Provider Integration") promotes the M5
`named extension point` seams (agent driver, execution-host driver, resume, capability attestation)
to `exercised` **with real effects**, behind the contracts M1 owns and jig Phase 5 merged (commit
`f59a479`). Phase 6 is the agent+host slice of that promotion. It introduces **no new org-level
seam** and changes **no** org-owned contract shape: the execution-plan v0 and observability-records
v0 contracts stay unfrozen, and the four ports keep their merged surfaces (Decision 3 keeps
`describe()` synchronous precisely so no P5-pinned seam surface flexes). The M7 kill assumption —
"fails if a real driver can escalate its substrate (argv/creds/egress) past what the attestation
authorized" — is a Phase-6 concern by construction: Phase 6 is where the first real driver appears,
so it is where the substrate-authorization boundary must exist (Decision 7). No `.github` divergence
is routed and no org PR is required; a routed-back finding (an org seam proves wrong) goes to
`.github/MILESTONES.md` and `ROADMAP.md`, not resolved locally.

### Delivered reality this ADR builds on

Established by Phases 0–5 and confirmed against `src/` at authoring time (the **real as-merged** port
shapes, not the ADR 0021 sketch):

- **The four ports are merged jig-internal interfaces** ([`../../../packages/jig-sdk/src/ports.ts`](../../../../packages/jig-sdk/src/ports.ts)):
  - `AgentPort.execute(story: Story): Promise<WorkerResult>` — request/observe only, no push/PR/merge/credential method or field.
  - `ExecutionHostPort.describe(): HostAttestation` — **synchronous**; returns without awaiting.
  - `ForgePort.land(request): LandingOutcome | Promise<LandingOutcome>` (Phase 7's concern).
  - `WorkSourcePort.candidates(): CandidateWorkItem[] | Promise<CandidateWorkItem[]>` (Phase 8's concern).
- **`CapabilityAttestation` unifies proof and result** in one merged shape (there is no separate
  `containmentProof` field — proof rides the attestation): `{ driverId, capability, runContext,
freshness: 'fresh'|'stale'|'missing', positive: boolean, reportedIsolationStrength?,
provenIsolationStrength?, failureToken? }`. `HostAttestation` carries the host `isolationStrength`
  (`none`|`weak`|`strong`) and its `capabilityAttestations: CapabilityAttestation[]`.
  `HostFailureToken` is `'containment-unproven' | 'isolation-strength-overstated' |
'workspace-collision'`.
- **The composition root is `composeReferenceRun` in
  [`../../../packages/jig-sdk/src/bootstrap.ts`](../../../../packages/jig-sdk/src/bootstrap.ts)** — already `async`
  (`Promise<ComposedRunPorts>`), the sole importer of the reference adapters
  (`createReferenceAgent`, `ReferenceExecutionHost`, `ReferenceForge`, `ReferenceWorkSource`), and it
  fails closed on an unknown driver name (`ProviderSelectionError`). It calls `PlanValidator.validate`,
  then `executionHost.describe()`, and captures the launch `capabilityAttestation` at compose time.
- **`ExecutionHostPort.describe()`'s caller is already async.** The composition root is `async` and
  awaits nothing before `describe()`. This is the load-bearing fact for Decision 3: proof can run
  async at compose time and `describe()` can stay a pure getter over an already-computed attestation —
  the port surface need not change.
- **Reference-host attestation is a constant.** The `ReferenceExecutionHost` reports a fixed
  isolation strength and a modeled `fresh`/`stale`/`missing` proof state; resume re-derives it (it
  cannot drift). Freshness is a modeled constant, never a real clock. Both are Phase-6 replacements.
- **Resume recovers binding, plan, and policy from durable snapshots** in the run directory
  ([ADR 0020](./0020-phase-4-reliable-local-runs.md) §3): a validated-plan snapshot and a resolved
  launch-policy snapshot, read back and treated as launch-immutable. The launch **`CapabilityAttestation`
  is not yet persisted** — resume reconstructs the constant reference attestation (Residual A).
- **Redaction is a run-level default posture** (ADR 0020 §7); local dry-run "has no real secrets
  yet," so real secret-scanning is explicitly deferred to this phase.

## Decision

Eight settlements, binding on Phase 6 and later provider phases. Each is a decision, not an open
question.

### 1. The 6a/6b split and its acceptance-criteria assignment

`phases.md` leaves the 6a/6b split "settled in the Phase 6 design session, not here." Settled: Phase 6
splits into two sub-phases with a fixed internal ordering **6a → 6b**.

- **6a — real agent driver, autonomy capped at `weak`.** A real Codex-first agent driver behind
  `AgentPort.execute(story)` performs real edits on a host attesting **at most `weak`** isolation. 6a
  lands **independently useful**: `weak`-isolation autonomy is reduced but real, and the phase produces
  real run records. 6a is the boundary at which **real credentials first enter play**, so it carries
  redaction activation.
- **The 6a strong-attestation boundary (binding).** 6a must **not** be able to obtain `strong`
  autonomy, because 6b's exercised confinement proof does not exist yet. This is a live hazard, not a
  hypothetical: the merged `ReferenceExecutionHost`
  ([`../../../packages/jig-sdk/src/providers/reference/host.ts`](../../../../packages/jig-sdk/src/providers/reference/host.ts)) **defaults**
  both `reportedIsolationStrength` and `provenIsolationStrength` to `strong`, so a naive 6a wiring that
  selects only `agent: 'codex'` and leaves the host at its default would run the first real agent under
  a `strong`-but-unexercised attestation. 6a therefore requires **both** closures — they are
  complementary, not alternatives, and an implementer must land **both**:
  1. **Explicit weak host selection** — 6a wires a host that attests **`weak`** (a real host reporting
     honest `weak`, or the reference host **explicitly constructed** with
     `reportedIsolationStrength: 'weak'` / `provenIsolationStrength: 'weak'`), never the `strong`
     default; **and**
  2. **A 6a autonomy cap in core (the non-negotiable backstop)** — independent of what any host
     attests, the 6a real-agent path caps grantable autonomy at what `weak` earns: an attestation
     claiming `strong` whose `strong` is not backed by an **exercised** confinement proof (Decision 4)
     — which is every host in 6a, the reference host's declared `strong` included — is treated as
     **non-proven-strong** and unlocks no more than `weak`. Proven-`strong` autonomy is unavailable
     until 6b's exercised check lands. This cap is what makes closure 1 fail safe: closure 1 alone is
     defeated by a config bug or a default-host fallback (nothing would reject the unexercised
     `strong`), so the core cap must hold **even if a host is misconfigured to the `strong` default**.
     It follows directly from Decision 4 (autonomy is judged on **proven**, not reported/declared
     strength), which is why it is mandatory rather than optional.
- **6b — real execution host supplying proven `strong` confinement.** A real host behind
  `ExecutionHostPort.describe()` returns a `HostAttestation` whose `capabilityAttestations` carry a
  `provenIsolationStrength` of `strong` from an **exercised** confinement check (Decision 4) — the
  first point at which `strong` autonomy becomes available. 6b hardens 6a: it unlocks the highest
  autonomy core may allow, and it owns the per-story parallel-workspace isolation that only real
  containment can enforce.

**AC assignment** (the thing an implementer would otherwise invent), under the invariant _6a must
land independently useful with `weak` isolation_:

| AC                                                               | Sub-phase | Rationale                                                                                                                                                                         |
| ---------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P6-AC-1** real agent edits + golden byte-identity              | **6a**    | The real agent is 6a's whole point; the default-wiring golden regression rides with it.                                                                                           |
| **P6-AC-3** real freshness clock                                 | **6a**    | Freshness is a property of the launch attestation the real agent's run captures; it applies even on a `weak` host and must not wait for `strong`.                                 |
| **P6-AC-5** resume attestation persist/recover                   | **6a**    | A real agent that can drift or self-widen (Decision 6) is exactly what makes persist/recover load-bearing; it must be in place the first time a real driver runs, on either host. |
| **P6-AC-6** real credential redaction                            | **6a**    | Real credentials first enter through the real agent driver, so redaction activates in 6a (Decision 8).                                                                            |
| **P6-AC-2** proven `strong` from an exercised check              | **6b**    | An exercised confinement proof strong enough to unlock the highest autonomy is the real host's job.                                                                               |
| **P6-AC-4** per-story ISO-4 isolation + duplicate-launch refusal | **6b**    | Per-story workspace isolation strong enough to prevent parallel corruption is enforced by real host containment, not by the agent.                                                |

AC-4 and AC-5 placement is the genuine judgment call: AC-5 rides with 6a because persist/recover must
guard the **first** real run (a `weak`-host real agent can still drift), and AC-4 rides with 6b
because ISO-4 parallel isolation is a containment property the real host owns. Both are stated here so
two implementers do not split them differently.

### 2. Real agent driver (Codex-first) behind `AgentPort`, selected through the composition root

The real agent driver is a concrete `AgentPort` adapter, selected by name through the
`composeReferenceRun` successor in [`../../../packages/jig-sdk/src/bootstrap.ts`](../../../../packages/jig-sdk/src/bootstrap.ts), performing
real edits — replacing the scripted-worker stub on the driven path only.

- **It maps to the merged port unchanged:** `execute(story: Story): Promise<WorkerResult>`,
  request/observe only. The real driver adapts a Codex agent session to this single method: it drives
  the agent, observes the edits and check results, and returns a `WorkerResult`. It adds **no** method
  or field to the port.
- **INV-002 is structural, not policy.** The push / PR / merge / credential path is **outside** the
  `AgentPort` surface — the driver literally has no landing method to call, not merely a disallowed
  one. The conformance suite's forbidden-method sweep (Decision 5, re-derived from prior-art lesson 10)
  asserts the agent adapter exposes no `fs/*`, `command/exec*`, `thread/shellCommand`, or landing
  surface: those belong to the Execution-host and Forge ports, never the Agent port.
- **On a denied or unavailable capability, the driver parks or interrupts — it never returns a broad
  profile.** Re-derived from prior art: the Codex `item/permissions/requestApproval` channel has no
  explicit denial response, so a deny must map to an interrupt/park (routed to the Doorbell through the
  normal Fence path), never to the driver self-selecting a wider capability set. Guardian-style
  advisory evidence is treated as **observed evidence only** and never auto-bypasses the Fence.
- **Selection and wiring.** `config.drivers.agent` selects the real driver by name (e.g.
  `agent: 'codex'`); the composition root constructs it behind `AgentPort` and hands the wired port to
  the runner, exactly as `createReferenceAgent` is wired today. It stays the **sole importer**; the
  runner, Fence, and records never import the driver. An unknown driver name fails closed
  (`ProviderSelectionError`), never a silent fallback. The default (reference) wiring is unchanged, so
  the real driver is **opt-in** and the Phase-0..4 goldens stay byte-identical (Decision 8, regression
  anchor).

### 3. `describe()` stays synchronous — prove-then-describe resolves the sync/async tension

**The open question routed from the repo plan** (`repo-plan-m7.md` open question 1; `phases.md`
Phase-6 stop condition): `ExecutionHostPort.describe()` is **synchronous** in the merged
`src/ports.ts`, but real confinement proof may be async. **Resolved here as prove-then-describe, with
the port surface unchanged.**

- The confinement proof (Decision 4) runs **async at compose time, outside `describe()`**, in the
  host driver's factory. `composeReferenceRun` is already `async`
  ([`../../../packages/jig-sdk/src/bootstrap.ts`](../../../../packages/jig-sdk/src/bootstrap.ts)) and is `describe()`'s only caller, so an
  async real-host factory — `createRealExecutionHost(): Promise<ExecutionHostPort>`, mirroring the
  existing `createReferenceAgent` factory — runs the exercised proof, computes the `HostAttestation`
  (populating `provenIsolationStrength` and any `failureToken`), and constructs a host whose
  `describe()` is a **pure getter** returning that already-computed attestation.
- **`describe()` therefore stays `HostAttestation` (sync), unchanged.** No P5-pinned seam surface
  flexes to async; STOP-003 and the Phase-6 stop condition ("Stop if making `describe()` supply real
  proof requires changing the port surface … routed to the contract owner") are both respected —
  because prove-then-describe resolves it **without** the surface change, this ADR does not route an
  async-port change to the contract owner.
- **Rationale for not flexing the port.** Making `describe()` async would ripple to every caller and
  reopen a merged, exercised contract for a need the async composition root already satisfies. The
  async change is authorized only if prove-then-describe genuinely fails; it does not, so it is not.

### 4. Proven confinement: `provenIsolationStrength` from an exercised check, and the failure-token discipline

This is P6-AC-2's core and the mechanical heart of the SEC-2 / DRIVE-3 / EARN-1/2 boundary. It
realizes at real altitude the "category is a claim, never sufficiency" distinction ADR 0021 decision 4
settled at reference altitude.

- **`reportedIsolationStrength` vs `provenIsolationStrength`.** The merged `CapabilityAttestation`
  carries both. The host **reports** a category (`reportedIsolationStrength`) and, from the exercised
  proof, **populates** `provenIsolationStrength`. The Fence judges autonomy on **proven** (fresh +
  positive), never on reported. `reported === proven` with `freshness: 'fresh'` and `positive: true`
  is the only shape that unlocks the reported category's autonomy.
- **The confinement-proof model** (an exercised check, not a declared constant), re-derived from
  prior-art lesson 10 at design altitude — the mechanisms are named, their field encodings deferred:
  - a **termination/prove-empty** step — signal → grace → force → reap → prove the containment scope
    is empty; a missing step yields an unproven proof;
  - a **negative-probe egress** step — the confined boundary is probed to confirm outbound access is
    blocked, matched against the declared egress policy;
  - a **containment mechanism** named from a catalog (e.g. `process-group` / `kernel-tree` /
    `job-object`) rather than a bare posture;
  - a **command binding** — the planned command bound to what actually ran — so "planned vs actually
    ran" is checkable, and process parentage is proven by a joint agent+host probe before any
    kill-dependent power unlocks.
    The proof is what sets `provenIsolationStrength`; the mechanisms above are how the host earns
    `strong`. jig **judges** the proof's freshness and sufficiency; the host **supplies** it and never
    decides its own proof is sufficient.
- **Failure tokens and the withholding rule.** When the proof is absent, stale, or overstated, the
  host records the matching `failureToken` and the reported category's autonomy is **not** unlocked —
  only fresh, positive proof unlocks it (this "declared rather than proven" case is itself a Phase-6
  stop condition, so it must be enforced, not modeled away):

  | Condition                                           | `failureToken`                  | Attestation shape                                                                             | Fence consequence                                                        |
  | --------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
  | Host cannot supply proof for the boundary it claims | `containment-unproven`          | `provenIsolationStrength` absent or `< reported`; `positive: false` or `freshness: 'missing'` | Autonomy withheld → request routed to the Doorbell (or denied by scope). |
  | Reported category exceeds what the proof supports   | `isolation-strength-overstated` | `reportedIsolationStrength > provenIsolationStrength`                                         | Autonomy withheld; only `proven` autonomy (if any) is available.         |
  | The per-story workspace boundary was violated       | `workspace-collision`           | recorded against the offending story                                                          | Duplicate/colliding launch refused (Decision 5 / P6-AC-4).               |

- **This never degrades SEC-2 to self-report.** A `strong` self-report with an absent, stale, or
  overstated proof is judged **unproven** and unlocks nothing; the token is recorded; SEC-2 posture is
  never claimed stronger than proven. This is the load-bearing distinction the conformance suite's
  host proof/self-report and overstated-isolation probes assert.

### 5. Per-story ISO-4 parallel-workspace isolation and duplicate-launch refusal

Extends the ADR 0020 §6 run-level workspace continuity and the `orchestration.md` ISO-4 named
extension point to **per-story** isolation, realizing P6-AC-4.

- **Isolated workspace per story.** Independent stories run at once, each in its own isolated
  workspace (a worktree-per-story recipe, re-derived from prior-art lesson 9), so parallel stories
  cannot corrupt each other's tree. The isolation boundary is a host-side property (Decision 4 / 6b):
  real containment is what makes per-story isolation enforceable rather than conventional.
- **Duplicate-launch refusal.** A second launch of the **same** task is refused, and the collision
  records the `workspace-collision` failure token (Decision 4). This extends the Phase-4 run-level
  workspace fingerprint (ADR 0020 §6) to a per-story workspace identity: launching the same story into
  an already-occupied workspace is a fail-closed, diagnosable refusal, never a silent overwrite.
- Golden fixtures continue to normalize workspace identity to a placeholder (per ADR 0020 §6), so
  goldens stay machine-independent.

### 6. Resume attestation persist/recover (Residual A / P6-AC-5)

Settles the exact thread ADR 0021 decision 4 deferred ("persist-and-recover of the attestation,
parallel to the launch binding, is deferred to the real-driver phase"). It is now due because a real
driver can drift or self-widen.

- **Persist at launch.** The launch `CapabilityAttestation` (Decision 4, captured by the composition
  root at compose time) is persisted alongside the launch binding, **parallel to the Phase-4 plan and
  policy snapshots** (ADR 0020 §3) — durable in the run directory (candidate: a
  `attestation.snapshot.json` sibling of `plan.snapshot.json`/`policy.snapshot.json`, or the launch
  attestation carried in the authoritative launch header of ADR 0020 §1). The persistence location and
  shape are settled at **design altitude only** — the meaning is fixed (a durable, launch-immutable
  record of the attestation the run was authorized under); the exact field encoding is deferred to
  schema freeze, consistent with ADR 0017 decision 5.
- **Recover on resume, adjudicate against launch — never re-derive.** On resume, bootstrap reads the
  persisted launch attestation back the same launch-immutable way it reads the plan and policy
  snapshots (`bootstrap.md` "Original-binding preservation rule"), and **every resumed request is
  adjudicated against that recorded launch attestation**. A run resumed after a real host would attest
  a **fresher, more permissive** capability is still judged against the launch-attested capability, and
  the launch attestation is **immutable across resume**. Recovery never re-solicits a live driver and
  never accepts a re-derived permissive attestation — the exact GUARD-1/FENCE-2 concern a drifting real
  driver introduces.
- This mirrors the Phase-4 binding mechanism; it mints no new event family and adds no new lifecycle
  state. It is the real-driver analogue of "resume rebuilds the recorded policy, not a permissive stub."

### 7. Provider manifest + load-time substrate authorization — **IN**, at design altitude, unfrozen

jig's composition root governs **code** trust (it is the sole importer of provider implementations),
but not **substrate** trust — what argv, credentials, egress, or hosts an adapter may _request at
runtime_. The org M7 kill assumption is "fails if a real driver can escalate its substrate
(argv/creds/egress) past what the attestation authorized," and P6-AC-6 puts **real credentials in
play in Phase 6** — so a real driver is exactly where substrate-escalation risk first appears, and it
cannot be punted to a later phase. **Decision: substrate authorization is IN Phase 6, settled as a
model, exercised, and kept unfrozen** (mirroring how ADR 0021 handled the manifest and the
capability-attestation gate: IN-the-model, OUT-the-freeze).

**This extends [ADR 0021](./0021-phase-5-integrated-provider-runs.md) decision 8, it does not
reinvent it.** Decision 8 already introduced the provider manifest — "a provider package declares what
it may do — runtimes, network, credentials," format design-owned, used only as a non-normative
fixture, and a reference adapter acting beyond its manifest is rejected by the conformance suite. That
is **declared + statically conformance-checked**. Phase 6 adds the delta a real driver makes
necessary: the same manifest is now **content-hashed and immutable-for-the-run** (like the binding and
the attestation) and **enforced at runtime** — each substrate request is validated against the frozen
tuple and an out-of-tuple request is refused live. The runtime-enforcement leg is genuinely
Phase-6-shaped because it only bites when a real driver makes real substrate requests, which is why it
rides the real-driver phase rather than Phase 5.

- **The manifest is an immutable, hashed, approved tuple.** A real provider declares its substrate
  scope — the runtimes, argv shape, credentials, and egress endpoints it may request. The declared
  tuple is content-hashed and approved at launch; the approved tuple is **immutable for the run**
  (GUARD-1, like the binding and the attestation), and widening it requires fresh owner approval
  (DRIVE-2, FENCE-2).
- **Runtime requests are validated against the approved tuple.** Every substrate request a real
  driver makes at runtime (an argv it wants to run, a credential it wants resolved, an egress endpoint
  it wants to reach) is validated against the deep-frozen approved tuple. A request **outside** the
  tuple is an escalation attempt: it is **refused** and surfaced as a diagnosable stop, never silently
  granted. This is the concrete boundary the M7 kill assumption and the Phase-6 substrate-escalation
  stop condition require; without it, "a real driver cannot escalate its substrate" is unenforceable.
- **Design altitude, non-normative fixture, no freeze.** The manifest **format is design-owned**
  (named in [`../contracts/providers.md`](../contracts/providers.md)); any manifest used by a driver
  in tests is a **non-normative fixture** and does not freeze a manifest schema through the fixtures
  directory (Contract-Preservation Rule). The invariant Phase 6 exercises: a driver's substrate
  authority is bounded by its declared, hashed, approved tuple, and an out-of-tuple runtime request is
  refused. A conformance-suite adversarial adapter that requests substrate beyond its manifest must be
  caught (Decision 8).
- **Not confused with capability attestation.** Capability attestation (Decision 4) proves _what the
  host confines_; the substrate manifest bounds _what the driver may request_. They are complementary
  boundaries, both immutable-for-the-run, both core-judged.

### 8. Real freshness clock, redaction activation, and the two regression anchors

- **Real freshness clock (P6-AC-3).** `CapabilityFreshness` (`fresh`/`stale`/`missing`) is decided by
  a **real clock** against real driver/host timestamps, replacing the deterministic reference
  constant. An attestation older than its policy-declared freshness window is recorded `stale` and
  treated as **non-fresh** by the Fence (dropping the request out of the auto-grantable set), without a
  stubbed constant. Determinism for goldens is preserved by injecting the clock (a fixed clock in
  tests, a stale-window fixture for the stale case), not by hard-coding the freshness state — the
  **decision procedure** is real; only the test clock is controlled. This is the real-driver
  realization of the freshness shape ADR 0021 decision 4 modeled deterministically. **The
  default-wiring byte-identity anchor is not threatened:** the reference path's `freshness` **enum**
  stays constant (a recent reference attestation is always `fresh`), and **no raw wall-clock timestamp
  enters default-wiring records** — the real clock decides the enum and governs the real-driver path
  only, so the Phase-0..4 goldens are untouched.
- **Redaction activation (P6-AC-6).** ADR 0020 §7 deferred real secret-scanning ("local dry-run has
  no real secrets yet"). Phase 6 is where it **turns on**: the moment real credentials first enter play
  (through the real agent or host — the 6a boundary), secrets (credentials, tokens, environment) are
  scanned and redacted in records. A **redaction ambiguity** — a value that cannot be confidently
  classified as safe — becomes an operator-visible **diagnosable stop**, extending the ADR 0020 §7
  `redaction-export-posture-ambiguous` fail-closed handling, rather than a silent leak. Records stay
  safe to keep and export by default (SEC-1, SEE-6).
- **The two regression anchors ride every Phase-6 sub-phase, not as their own phase:**
  1. **Default-wiring golden byte-identity.** The default (reference) wiring reproduces the
     Phase-0..4 record goldens **byte-identically**; real drivers are opt-in. Any real-driver record
     lands only in a real-driver-specific scenario with its own golden.
  2. **Conformance-suite fails closed.** The driver conformance suite still fails closed on a broken or
     non-conforming adapter, now including the Phase-6 adversarial additions (forbidden-method sweep,
     overstated isolation, substrate-escalation, drifted-resume-attestation).

## Contract and records posture

- **No v0 freeze.** The execution-plan and observability-records contracts stay v0 and unfrozen. The
  four ports remain internal `src/` seams; the manifest, the persisted-attestation shape, and the
  proof-mechanism encodings are design-owned, not fixtures-frozen. `describe()` stays synchronous
  (Decision 3) — no P5-pinned seam surface changes.
- **Additive records only, and default records are byte-identical.** Under the **default wiring** the
  records are unchanged from Phase 0–4. Any new named field — the persisted launch attestation, a
  host proof/failure-token report, a real-clock freshness state, a redaction-ambiguity stop, a
  substrate-refusal record — appears **only** in the Phase-6-specific real-driver scenarios that need
  it, and **each such scenario gets its own new golden**. Field meanings are fixed here; exact
  encoding is deferred (ADR 0017 decision 5). No event family is renamed, removed, or newly minted;
  redaction ambiguity and substrate refusal are surfaced through the existing diagnosable-stop /
  notice machinery, not a new family.

## Required doc updates (this design PR)

- **`providers.md`** — a "Phase 6 realization (ADR 0022)" section carries the real agent driver behind
  `AgentPort`, the proven-confinement model and `provenIsolationStrength`/failure-token discipline, the
  per-story ISO-4 isolation, the resume-attestation persist/recover, the substrate manifest, and the
  real freshness clock; the matching "Deferred and out of scope" bullets are retired. (Done in this PR.)
- **`authorization.md`** — a "Phase 6 realization" note: the Fence judges autonomy on
  `provenIsolationStrength` (not reported), the real freshness clock decides `stale`, and the substrate
  manifest bounds runtime requests. (Done in this PR.)
- **`bootstrap.md`** — a "Phase 6 realization" note: the composition root selects the real agent/host
  by name, runs prove-then-describe async at compose time so `describe()` stays sync, persists the
  launch attestation and the substrate manifest alongside the plan/policy snapshots, and recovers the
  attestation on resume. (Done in this PR.)
- **`orchestration.md`** — a "Phase 6 realization" note: per-story ISO-4 parallel-workspace isolation
  and duplicate-launch refusal at the named ISO-4 extension point. (Done in this PR.)
- **`plan-intake.md`** — a "Phase 6 realization" note: the Category-3 freshness decision is now a real
  clock, not a modeled constant. (Done in this PR.)
- **`records.md`** — a one-line correction to its redaction Note: real secret-scanning is no longer
  "deferred" but **activates for real-driver records at Phase 6** (Decision 8, P6-AC-6), with the
  default/reference path unchanged. The ambiguity → diagnosable-stop _contract statement_ itself
  already exists ([ADR 0020](./0020-phase-4-reliable-local-runs.md) §7); Phase 6 activates it rather
  than restating it. (Done in this PR.)
- No change to the execution-plan or observability-records v0 contracts, and no change to the
  fixtures-README convention snippets (`delivery:check` stays green).

## Consequences

- Phase 6 turns the agent and execution-host seams from reference adapters into **real drivers** —
  a Codex-first agent doing real edits behind the unchanged `AgentPort`, and a real host supplying a
  proven `provenIsolationStrength` behind the unchanged, still-synchronous `ExecutionHostPort`. The
  6a/6b split lands a `weak`-isolation real agent first (independently useful), then a `strong`
  proven-containment host.
- The change is **additive** to the runtime and records: the default (reference) wiring reproduces the
  Phase 0–4 dry-run and goldens exactly, and the conformance suite keeps failing closed. The real
  drivers are opt-in; real-driver records land only in their own scenarios with their own goldens.
- The load-bearing safety boundaries are all core-judged and immutable-for-the-run: proven-not-reported
  isolation (Decision 4), launch-immutable attestation across resume (Decision 6), and a hashed,
  approved substrate tuple that refuses out-of-tuple runtime requests (Decision 7). Redaction of real
  credentials activates at the boundary they first enter (Decision 8).
- Phase 6 implementation adds `src/providers/real/{agent,host}.ts` (or equivalent), an async
  real-host factory and real substrate-authorization module, threads the persisted launch attestation
  through resume, and adds a real freshness clock and real secret-scanning — see the Phase 6
  implementation brief
  ([`../../archive/delivery/m7-real-providers/implementation-briefs/phase-6-real-drivers.md`](../../delivery/m7-real-providers/implementation-briefs/phase-6-real-drivers.md)).
  It touches `src/bootstrap.ts`, `src/authorization.ts`, `src/resume.ts`, `src/harness.ts`, and the
  conformance suite; it does not change a port surface.
- No JSON Schema freeze, no TypeScript contract package, no public contract package, and no real
  Forge/GitHub landing (Phase 7), real work-source import (Phase 8), or records tamper-evidence and the
  active re-approval path (Phase 9). Hosted, multi-tenant, or remote operation stays org-deferred.

- Date: 2026-07-03
- Origin: Phase 6 real-driver-integration design closure (docs-only, pre-implementation), scoped to
  the agent + execution-host slice of M7 per the M7 real-providers repo plan.
