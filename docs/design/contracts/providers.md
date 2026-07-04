---
title: "Provider contracts — the four seams"
status: active — deepened for Phase 5 (ADR 0021)
---

# Provider contracts — the four seams

The provider boundary is jig's stack-portability seam: four swappable ports behind which
drivers plug in. Swapping a driver moves no control, evidence, or recovery boundary — those stay
governed in [`../core/`](../core/README.md).

## Owns

- The **Agent** port — the contained worker: reads a work item, writes code, runs checks,
  reports; holds no credentials.
- The **Execution host** port — where the worker runs; provides isolation and reports its
  isolation strength honestly.
- The **Forge** port — the push / PR / merge target; respects branch protection and merge
  queues.
- The **Work source** port — where work items originate.
- The posture that seams are authority boundaries: credentials and irreversible authority stay
  where the fence and runner govern them, never with a provider.
- The posture that capabilities are attested, not assumed: a driver proves what it can do before
  jig grants it autonomy.

These seed statements remain the governing overview for this file and are deepened below rather
than replaced. The boundary split they imply is the load-bearing rule for all four seams: core owns
the port contract, its invariants, and its semantics; a provider implements behind the port; a
provider must not redefine policy, evidence, authorization, or state semantics the core already
owns. This follows the boundary map in [`README.md`](./README.md), the Fence authority model in
[`../core/authorization.md`](../core/authorization.md), the runner authority split in
[`../core/orchestration.md`](../core/orchestration.md), the composition-root wiring point in
[`../core/bootstrap.md`](../core/bootstrap.md), the product guarantees in
[`../../product/guarantees.md`](../../product/guarantees.md), and the existing runtime seam
inventory in [`../notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md).

## Interface

- **Agent port** — abstracts the coding worker: request work, produce code, run checks, report
  progress.
- **Execution host port** — abstracts where the worker is contained.
- **Forge port** — abstracts the code host a run pushes to, opens PRs against, and merges
  through.
- **Work source port** — abstracts where work items originate. It may supply provenance or
  future import/sync behavior, but the validated execution plan remains jig's only runtime
  scheduling input; the Work source seam never bypasses the plan.

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Inter, Arial, sans-serif",
    "primaryTextColor": "#2b2b2b",
    "lineColor": "#8a8882",
    "edgeLabelBackground": "#ffffff",
    "clusterBkg": "#fbfaf7",
    "clusterBorder": "#b8b8b1",
    "clusterTextColor": "#2b2b2b"
  },
  "flowchart": {
    "htmlLabels": false,
    "curve": "linear",
    "nodeSpacing": 40,
    "rankSpacing": 45,
    "defaultRenderer": "elk"
  }
}}%%
flowchart TB

  core("`**Jig-core**`")
  agent("`**Agent port**
scripted-worker stub built`")
  host("`**Execution host port**
named extension point`")
  forge("`**Forge port**
named extension point`")
  source("`**Work source port**
named extension point`")

  core --> agent
  core --> host
  core --> forge
  core --> source

  classDef coreBox fill:#e3f6f0,stroke:#007a62,stroke-width:2px,color:#003f34,rx:16,ry:16;
  classDef seamBox fill:#fff0ea,stroke:#a43f22,stroke-width:2px,color:#4d1f12,rx:16,ry:16;
  class core coreBox;
  class agent,host,forge,source seamBox;
```

The four one-line interface statements above and the diagram are preserved as the seed for the
port contracts below. The sections that follow re-project that seed into core-owned seam
responsibilities without changing the interface names, seam set, or boundary direction.

## Contract stance

The provider boundary is anti-corruption first, not adapter-definition first. Core owns the seam
names, the authority split, the guarantee-bearing invariants, and the meaning of the lifecycle
terms already settled elsewhere. A provider implements a concrete adapter behind one of these
ports, but it does not get to redefine:

- what counts as authorization or escalation;
- what counts as evidence or completion;
- what `done`, `landed`, `blocked`, or `parked` mean;
- where credentials and irreversible authority live;
- how work becomes eligible to run.

This file therefore describes each seam as an owns / implements / must-not contract, while leaving
adapter mechanics, schemas, and manifest detail for later work.

## Port invocation points

Wave 3 adds no new states or transitions. It names only the settled invocation points and source
relationships these seams participate in:

- The **Agent** port is invoked from the runner when a work item reaches `started`, with worker
  requests crossing the Fence's `authorize(request, boundPolicy) → grant | deny | route` decision
  from [`../core/authorization.md`](../core/authorization.md).
- The **Forge** port is invoked by the runner at the `done → landed` boundary named in
  [`../core/orchestration.md`](../core/orchestration.md); the worker does not invoke it.
- The **Work source** port may supply provenance or import/sync behavior before runtime execution,
  but it does not bypass validated plan intake; the validated execution plan remains jig's only
  runtime scheduling input.
- The **Execution host** port contains the worker environment the Agent port runs inside; its
  confinement posture is what carries the no-phone-home guarantee from
  [`../../product/guarantees.md`](../../product/guarantees.md).
- [`../core/bootstrap.md`](../core/bootstrap.md) is the composition root that wires provider
  implementations to these four seams; this file frames the ports it wires, not the wiring rules.

## Port contracts

### Agent port

Seed interface preserved: **Agent port** — abstracts the coding worker: request work, produce code,
run checks, report progress.

This section deepens the existing Agent seed in place rather than replacing it. The preserved port
line above, the file-level Owns / Interface / Notes / diagram, and the port-invocation points
remain the governing seed statements for this seam. The Agent provider implements behind that
port, consuming core contracts read-only: the Fence's authorization decision from
[`../core/authorization.md`](../core/authorization.md), the runner-owned lifecycle/orchestration
surface from [`../core/orchestration.md`](../core/orchestration.md), the capability/evidence model
framed in [`../core/plan-intake.md`](../core/plan-intake.md), and the records surface in
[`../core/records.md`](../core/records.md). It does not redefine policy, evidence sufficiency,
authorization, or state semantics those core surfaces already own.

**Core owns**

- The meaning of the worker seam as a contained, non-privileged actor.
- The rule that every worker request is authorized before execution, fail-closed, through the Fence.
- The rule that the worker holds no forge credentials and no privileged landing authority.
- The semantics of work-item and run lifecycle terms the worker reports against.
- The structural no-privileged-method guarantee already recorded as
  [`INV-002`](../notes/runtime-design-m5a.md): the Agent seam exposes request / observe behavior
  only, and a privileged push / PR / merge / credential path is outside the seam rather than merely
  disallowed by policy.
- The stub posture recorded in [`SURF-003`](../notes/runtime-design-m5a.md),
  [`CTX-005`](../notes/runtime-design-m5a.md), and
  [`DEL-004`](../notes/runtime-design-m5a.md): the scripted-worker stub is the one built adapter at
  this seam, while any real agent driver remains a named extension point behind the same port.

**Provider implements**

- A concrete worker adapter that can carry out coding work, run checks, and report progress through
  the port.
- The request and observation behavior needed for the runner to drive a work item through this seam.
- Capability proof specific to the driver and run context before greater autonomy is granted.
- A contained worker surface that runs inside the Execution host seam while staying only on the
  Agent side of that boundary: this seam assumes the worker is contained by the host, but it does
  not define the host's containment model, proof mechanism, or isolation-strength categories.
- A capability-attestation claim about what the adapter can safely do in the current driver/run
  context. The provider supplies the claim; core judges freshness and sufficiency before autonomy is
  widened, in line with [`EARN-1`](../../product/guarantees.md) and
  [`EARN-2`](../../product/guarantees.md).
- The visible stub-vs-real-driver posture of the seam: the scripted-worker stub may satisfy the
  port with predetermined request / observe behavior, while a future real driver must satisfy the
  same seam without changing its authority boundary.

**Provider must not**

- Expose or smuggle a privileged push, PR, merge, or credential-bearing path through the seam.
- Self-authorize a request or redefine what counts as grant, deny, or route.
- Treat self-report as sufficient evidence for completion or landing.
- Redefine lifecycle meaning or widen authority mid-run.
- Present capability attestation as self-certifying proof; freshness and sufficiency are judged by
  core, not by the provider.
- Recast the scripted-worker stub as a general-capability driver or blur the seam between the built
  stub and a future real adapter.
- Define the execution host's containment mechanism, no-phone-home proof, or isolation taxonomy from
  the Agent side of the seam.

### Execution host port

Seed interface preserved: **Execution host port** — abstracts where the worker is contained.

This section deepens the existing Execution-host seed in place rather than replacing it. The
preserved port line above, the file-level Owns / Interface / Notes / diagram, and the
port-invocation point that the Agent port runs inside this host remain the governing seed
statements for this seam. The Execution host provider implements behind that port, consuming the
Wave 4a core contracts read-only: the records/evidence surface from
[`../core/records.md`](../core/records.md), the evidence/attestation model from
[`../core/plan-intake.md`](../core/plan-intake.md), and the freshness/sufficiency judgment from
[`../core/authorization.md`](../core/authorization.md). It supplies containment proof and honest
reporting into those core-owned surfaces; it does not redefine policy, evidence taxonomy,
authorization, or log semantics they already own.

**Core owns**

- The guarantee that confinement is real enough to preserve the no-phone-home boundary: outbound
  network access is confined, and the confinement is proven rather than taken on the worker's or
  host's word.
- The containment-proof discipline this seam is held to: the host must supply evidence that the
  declared boundary actually held for the run context it is claiming, not merely report a posture.
- The meaning of isolation-strength reporting and the policy consequences of weaker, missing, stale,
  or overstated proof.
- The rule that stronger autonomy unlocks only when containment is proven, not asserted; the host
  supplies proof, while core judges whether that proof is fresh and sufficient.
- The fact that credentials and irreversible authority stay outside the worker environment.
- The host-side structural contribution to ISO-4: the worker runs in a run-scoped isolated
  workspace whose boundary prevents parallel runs from colliding through shared execution
  environment state.

**Provider implements**

- A concrete containment environment for the worker that contains the Agent port from the host side
  of the shared seam: the worker runs inside this host, but the host does not redefine the Agent
  port's request/observe behavior.
- A containment-proof discipline that produces a host-supplied claim rather than a self-certifying
  assertion. The proof must demonstrate the confinement boundary the host claims, for the run and
  driver context it claims, in a form the core evidence model can judge.
- An isolation-strength category catalog the host reports against honestly, with categories stated
  as host-reported strength claims rather than as automatic grants of autonomy. At minimum the seam
  must distinguish between: no meaningful confinement proof, confinement present but weaker than
  the strongest available boundary, and confinement strong enough to support the highest autonomy
  posture core may later allow.
- Honest reporting about the isolation posture the environment actually provides, including when the
  host can only prove a weaker category than requested or cannot prove confinement at all.
- The host-side behavior needed to let the runner and worker operate within the declared boundary,
  including the run-scoped workspace isolation this seam contributes to ISO-4.
- The supplied-claim side of the SEC-2 / EARN-2 boundary: the host emits proof and honest report
  into the evidence model; core decides how that changes autonomy and records the outcome.
- The design posture side of the SEC-2 three-way boundary: this seam owns the requirement that the
  no-phone-home boundary be provable and honestly reported; later red-team adversarial probing and
  later integration collection remain outside this section.
- Candidate-only invariant rows, kept outside the numbered ledger and flagged for U9
  reconciliation: `containment-proven-not-asserted` and `isolation-strength-honestly-reported`.
- A tactical failure-token catalog the host can produce/report without judging policy consequence:
  `containment unproven`, `isolation-strength overstated`, and `workspace collision`. The host
  reports the condition it encountered or could prove; core judges freshness/sufficiency and
  records the outcome through its own evidence and records surfaces.

**Provider must not**

- Treat self-report as proof that confinement held, or blur the distinction between claimed
  isolation strength and proved isolation strength.
- Redefine the no-phone-home guarantee as best-effort or informational only.
- Decide for itself that its proof is fresh enough or sufficient enough; that judgment stays with
  core.
- Invent its own evidence taxonomy, log model, or policy consequence model to compensate for weaker
  isolation.
- Move privileged credentials into the worker environment.
- Reinterpret policy, evidence, or authorization semantics to compensate for weaker isolation.
- Collapse the SEC-2 ownership split by authoring the future red-team scenario or claiming
  collection findings that belong to later integration work.

### Forge port

Seed interface preserved: **Forge port** — abstracts the code host a run pushes to, opens PRs
against, and merges through.

This section deepens the existing Forge seed in place rather than replacing it. The preserved port
line above, the file-level Owns / Interface / Notes / diagram, and the port-invocation point that
the runner invokes this seam at the `done -> landed` boundary remain the governing seed statements
for this seam. The Forge provider implements behind that port, consuming the runner-owned
orchestration surface from [`../core/orchestration.md`](../core/orchestration.md), the
evidence-sufficiency and GUARD-2 preconditions from [`../core/plan-intake.md`](../core/plan-intake.md)
and [`../core/authorization.md`](../core/authorization.md), and the records/log surface from
[`../core/records.md`](../core/records.md) read-only. It does not redefine evidence sufficiency,
GUARD-2 detection or re-approval, done-versus-landed semantics, blocked-state ownership, or log
consistency those core and prior-wave surfaces already own.

**Core owns**

- The rule that push, PR creation, and merge are runner authority, never worker authority.
- The meaning of `done` versus `landed`, and the evidence gate that must already be satisfied before
  landing is attempted.
- The decision that branch protection, merge queues, and other forge-side controls are respected as
  governing constraints, not bypass targets.
- The record/evidence boundary for what is attempted, blocked, or landed.
- The runner-only invocation point for this seam at the `done -> landed` boundary, including the
  rule that the worker never invokes landing authority directly and a forge adapter does not become
  a second caller of the transition.
- The GUARD-2 precondition that rule-governing-surface pauses and re-approval are cleared before
  landing is attempted; this seam consumes that cleared precondition and does not detect or resolve
  it.
- The blocked-transition ownership split: Wave 2 owns when a work item becomes `blocked`; this seam
  owns only the forge-side act of surfacing that already-blocked condition when the runner can do
  so safely.
- The records fallback and log-consistency posture: when a forge-side action cannot be completed
  safely, the durable fallback record remains a Records concern rather than a local reinvention by
  this seam.

**Provider implements**

- A concrete integration to the code host behind the runner-owned seam.
- The mechanics needed for the runner to push, open PRs, and merge through the forge.
- Truthful surfacing of forge-side constraints and outcomes back to the core.
- A runner-exclusive landing adapter that executes push / PR / merge only as the runner's delegate,
  never as worker-held authority and never as an alternate policy or lifecycle owner.
- Respect for forge-side branch protection, merge queues, and related controls as real governing
  constraints the adapter must observe and surface, not bypass or locally reinterpret.
- The mechanical MERGE-5 block-surfacing act at the forge seam: when the runner has a safe branch
  and permission to act, the adapter must open or update the PR-side surface, post status, and
  surface failure reasons through the forge without changing what `blocked` means; when it cannot
  safely do so, the durable fallback record remains a Records concern rather than a local
  reinvention by this seam.
- Adapter-level idempotency as a seam contract: a resume or retry must not silently double-apply a
  push, PR, or merge side effect the runner already recorded or completed. This is a contract-test
  concern for adapters at this seam, not a new lifecycle or ledger surface.

**Provider must not**

- Let the worker invoke landing authority directly.
- Redefine what counts as evidence-met, done, or landed.
- Hide forge-side blockers or silently widen authority around branch protection or queues.
- Become a second policy or state authority for merge decisions.
- Re-judge evidence sufficiency, capability freshness, or completion readiness that core already
  judged before invoking the seam.
- Detect, classify, or capture GUARD-2 rule-governing-surface re-approval on its own; that remains
  with the plan/policy/evidence and authority-spine surfaces this seam consumes.
- Redefine blocked-state ownership, invent a second records fallback, or treat forge-surface
  reporting as the source of truth for log consistency.
- Treat resume/retry as permission to repeat irreversible forge effects without checking whether the
  runner has already completed or recorded them.

### Work source port

Seed interface preserved: **Work source port** — abstracts where work items originate. It may
supply provenance or future import/sync behavior, but the validated execution plan remains jig's
only runtime scheduling input; the Work source seam never bypasses the plan.

**Core owns**

- The rule that the validated execution plan is jig's only runtime scheduling input.
- The `PlanValidator` boundary (`w4-s2`) that every source-supplied candidate still crosses before
  any work reaches runtime execution.
- The meaning of plan-bound eligibility and dependency order once work enters runtime execution.
- The authority boundary between provenance/import behavior and runtime orchestration.
- The decision to reject unknown or incompatible plan shapes at the plan boundary, not guess.
- The plan-intake judgment about what becomes part of a validated plan, rather than treating source
  material as already accepted work.

**Provider implements**

- A shape-level source seam that can surface candidate work items and/or provenance to planning or
  intake upstream of runtime execution.
- The behavior needed to surface source context to planning or intake without becoming the runner
  or a second scheduling input.
- Honest representation of what came from the source versus what jig validated, accepted into the
  plan, and later scheduled.
- A provenance/origination surface that keeps imported or source-derived material explicitly in the
  candidate stage until plan intake validates it.

**Provider must not**

- Hand work directly to the runner in a way that bypasses plan validation.
- Become a competing runtime scheduler or redefine dependency/eligibility semantics.
- Freeze contract fields locally to fit one source's needs.
- Reinterpret imported work as already authorized, eligible, or complete.
- Decide scheduling order, readiness, or runtime eligibility; those remain Orchestration concerns
  once a plan is validated.
- Invent a concrete import format, sync cadence, or source-specific contract freeze inside this
  seam.

**Candidate invariant (unnumbered, dedup deferred)**

- **work-source-never-bypasses-plan** — anything the Work source seam supplies remains candidate
  input until it crosses `PlanValidator`; no work item reaches the runner except through the
  validated plan. This wording is very likely identical to Wave 3's own unnumbered candidate for
  the same boundary; both citations should stand side by side and any dedup stays deferred to U9.

## Cross-port invariant candidates

These provider-boundary invariants are named here as unnumbered candidates only. They are not added
to the invariant ledger in this pass. If future numbering is needed, the next available slot is
`INV-019`.

- **Providers hold no privileged credentials.** Credentials and irreversible authority stay with the
  Fence and runner, never with a provider seam.
- **Agent seam exposes no privileged landing path.** The worker seam carries request/observe
  behavior only; landing authority stays runner-owned.
- **Execution-host confinement is proven, not trusted by self-report.** The no-phone-home guarantee
  is a core-owned boundary the host must substantiate.
- **Forge is runner-invoked only.** Push, PR, and merge pass through a runner-owned seam after
  policy-bound evidence gates, never directly from the worker.
- **Work source never bypasses validated plan intake.** Provenance can enter; runtime scheduling
  does not.
- **Capabilities are attested, not assumed.** Missing, stale, or failed proof reduces autonomy
  rather than weakening guarantees.
- **Core depends on ports, not adapters.** Provider implementations plug in behind core-owned seam
  contracts and do not redefine their vocabulary.

## Phase 5 realization (ADR 0021)

[ADR 0021](../decisions/0021-phase-5-integrated-provider-runs.md) realizes these seams as
**jig-internal ports with reference adapters and a conformance suite** — the machinery, not shipped
drivers. It settles the concretizations this file previously deferred, at design altitude; field-level
schema freeze and real adapters stay deferred below. The port shapes here are the settled starting
point, not a frozen contract.

- **The four ports as jig-internal interfaces.** `AgentPort` formalizes the existing `Worker`
  interface (`execute` — request/observe only, no privileged method); `ExecutionHostPort.describe()`
  returns a `HostAttestation` (the merged [`../../../src/ports.ts`](../../../src/ports.ts) shape:
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
  verified conformance.

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
- **`LandingRequest.action` union (Residual B).** The merged
  [`../../../src/ports.ts`](../../../src/ports.ts) types `action` as the single literal
  `'push|open-pr|merge'`; Phase 7 repairs it to the union `'push' | 'open-pr' | 'merge'` so the real
  adapter can discriminate, and an unknown action **fails closed**. This is a jig-internal port-type fix
  that freezes nothing.
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
  [`../../../src/ports.ts`](../../../src/ports.ts) types `provenance` as the single literal
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

## Notes

- A seam is not a shipped driver. In Phase 5 each port is exercised by a **reference adapter** and the
  conformance suite; the **real** agent and execution-host drivers arrive in Phase 6
  ([ADR 0022](../decisions/0022-phase-6-real-driver-integration.md)), the **real** forge driver arrives
  in Phase 7 ([ADR 0023](../decisions/0023-phase-7-real-forge-landing.md)), and the **real** work-source
  importer arrives in Phase 8 ([ADR 0024](../decisions/0024-phase-8-real-work-source.md)).
- Until a driver proves a capability, expect reduced autonomy, not a weaker guarantee.
- Realized in Phase 5 (ADR 0021): the reusable conformance suite, the provider-manifest shape at design
  altitude, the capability-proof model, and reference adapters for all four seams.

## Deferred and out of scope

- **Real** (production) adapters for the **Agent** and **Execution host** seams are realized in
  Phase 6 ([ADR 0022](../decisions/0022-phase-6-real-driver-integration.md), "Phase 6 realization"
  above), real **Forge**/GitHub push/PR/merge in Phase 7
  ([ADR 0023](../decisions/0023-phase-7-real-forge-landing.md), "Phase 7 realization" above), and real
  **Work source** import in Phase 8
  ([ADR 0024](../decisions/0024-phase-8-real-work-source.md), "Phase 8 realization" above); all four
  seams now have realized real drivers.
- Freezing a manifest JSON Schema or a capability-proof field-level schema (design owns the shape,
  including the Phase-6 substrate manifest and persisted-attestation shape; freeze stays with the
  contract owner).
- JSON Schema, event constants, or frozen field-level contract shapes for the execution-plan or
  observability-records v0 contracts.
- New lifecycle states, transition tables, or state-machine redesign.
- Record/snapshot tamper-evidence — the post-Phase-5 records-integrity phase
  ([ADR 0020](../decisions/0020-phase-4-reliable-local-runs.md)).
- Any change to the execution-plan or observability-records v0 contracts.

## Reconciles to

- `STACK-1` — guarantees do not depend on the vendor.
- `STACK-2` — Agent, Execution host, Forge, Work source as the four independently swappable
  seams.
- `STACK-3` — bring-your-own agent remains a work-profile choice behind the Agent seam rather than a
  change to core authority semantics.
- `STACK-5` — seams are authority boundaries; credentials and irreversible authority stay where
  policy and evidence gates govern them.
- `STACK-4` — capabilities are attested, not assumed.
- `DRIVE-1` — a driver earns its place via a conformance suite, not assertion.
- `DRIVE-2` — a provider manifest declares its scope; changes require fresh approval.
- `DRIVE-3` — execution hosts report containment strength honestly.
- `SEC-1` — secrets stay out of records, logs, artifacts, and exports; providers do not redefine
  that redaction boundary by moving sensitive material into seam traffic or provider-owned traces.
- `SEC-2` — no phone-home is a proven containment boundary, not a provider assertion.
- `SEC-3` — the worker never holds forge credentials.
- `FENCE-2` — a provider cannot widen its authority mid-run.
- `FENCE-3` — privileged actions remain runner-held, not worker-held.
- `EARN-1` and `EARN-2` — autonomy follows fresh capability proof, not assumption.
- `MERGE-2` — push, PR creation, and merge remain runner authority.
- `INV-002` — the Agent seam exposes no privileged method; landing authority remains outside the
  worker-facing port.
- `INV-007` — the Work source seam never bypasses validated plan intake, so unknown or incompatible
  plan shapes are rejected at the boundary rather than guessed through a provider path.
- `SURF-003` — the Agent port remains the worker seam for request/observe behavior only, with no
  privileged method added here.
- `SURF-006` — ExecutionHostPort, ForgePort, and WorkSourcePort remain design-level seams in this
  doc, without adapter implementation detail.
- `CTX-005` — the four driver seams are treated as ports, with only the Agent seam previously
  exercised by the scripted stub and the others remaining named extension points.
- `DEL-004` — this port contract surface matches the runtime slice that couples orchestration to the
  scripted-stub Agent seam while leaving real provider adapters out of scope.
- `ENF-004` — core depends on these seam contracts, not concrete adapters; provider implementations
  plug in behind the ports rather than redefining them.
