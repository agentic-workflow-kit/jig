---
title: "M5b phase details (r2)"
status: active
---

# M5b phase details (r2)

Remaining phases only — Phases 0–2 are delivered and documented in the archived track
([`../m5b-local-mvp/phases.md`](../m5b-local-mvp/phases.md)). Every acceptance criterion has a
stable ID and cites the product/design IDs it traces to. Tests cite the AC IDs they prove.

## Phase R — Remediation (delivered)

**Client value:** No new operator feature. The value is that everything already shipped
becomes trustworthy: records match the contract mapping, the evidence gate actually gates,
the golden fixtures actually assert, and the CLI fails closed — so Phase 3 builds on seams
that hold. Provenance: the post-Phase-2 review
([`../../reviews/2026-07-02-post-phase-2-repo-review.md`](../../reviews/2026-07-02-post-phase-2-repo-review.md),
MF2, MF3, MF5, S1, S2, S5, S6) and
[ADR 0017](../../design/decisions/0017-records-seam-reconciliation.md).

**Goal:** Implement ADR 0017's five reconciliations in the engine and records, close the
evidence gate, and land the contained safety fixes — behavior-visible by design, allowed
because the records contract is v0 and unfrozen and the mapping is recorded.

**Requirements:**

- Records-contract convergence per ADR 0017: distinct run identity plus attempt; `actor` on
  every event; a run-level binding block naming the policy and config in force; stop records
  carrying reason and checkpoint posture; the alias renames (`story.failed`,
  `story.skipped`, `run.denied`, dry-run `evidence.observed`) retired per the ADR's mapping.
- Evidence gate validates value and shape, not just presence: a worker self-report of
  success never outranks the evidence value.
- One golden-record integration test asserting the full event sequence and `run.json` shape
  against regenerated golden fixtures (timestamps normalized), including the two multi-item
  goldens the archived Phase 2A brief promised.
- CLI flags fail closed: no fixture-path defaults for `--config`, `--policy`,
  `--scripted-output`.
- Safety fixes: plan-ID path-safety pattern corrected; run-directory collision prevented;
  orphaned fixtures wired into tests or removed; the promised worker-privilege regression
  test written.
- `jig inspect` and the run summary render the converged vocabulary.

**Acceptance criteria:**

- **PR-AC-1** — A worker result with `outcome: "success"` whose evidence `result` is not the
  string `"passed"` (missing, null, or any other value) records the item as `blocked` with
  reason `evidence-gate-failed`
  and diagnostics; regression tests cover `result: null` and
  `outcome: "success"` + `result: "failed"`. Traces:
  [`MERGE-1`](../../product/guarantees.md#15-merge-on-evidence), the `started → done` guard
  in [`orchestration.md`](../../design/core/orchestration.md), ADR 0017 decision 3.
- **PR-AC-2** — `run.json` carries a run id distinct from the plan id (the unique
  run-directory suffix) plus an `attempt` field; two runs of the same plan are
  distinguishable by record content alone. Traces: the records contract's "Run Identity and
  Input Binding", ADR 0017 decision 1.
- **PR-AC-3** — Every event carries `actor`; the run record carries a binding block naming
  the policy and config in force at launch. Traces: the records contract's "Event Causality"
  v0 phasing note, ADR 0017 decision 5,
  [`GUARD-1`](../../product/guarantees.md#13-anti-gaming).
- **PR-AC-4** — The alias renames land: a failed item records `story.blocked` with a reason;
  an item the run never started has no story-terminal event and is named in the run-level
  stop record's unstarted set; whole-run policy denial records `authorization.denied` at run
  scope; `run.stopped` carries reason and checkpoint posture. Traces: ADR 0017 decisions 2–3,
  [`ISO-3`](../../product/guarantees.md#32-work-level-failure-isolation).
- **PR-AC-5** — Dry-run evidence events use `evidence.modeled`; `evidence.observed` is
  reserved for genuinely observed evidence. Traces: ADR 0017 decision 4, OBS-002 in
  [`runtime-design-m5a.md`](../../design/notes/runtime-design-m5a.md).
- **PR-AC-6** — A golden-record integration test runs the CLI and asserts the full event
  sequence and `run.json` shape against regenerated goldens (success, multi-item success,
  dependent-blocked), timestamps normalized; a golden that no test reads may not exist.
  Traces: OBS-004, [`SEE-3`](../../product/guarantees.md#5-full-observability), review MF3.
- **PR-AC-7** — `jig run` without `--config`/`--policy`/`--scripted-output` fails closed
  with usage guidance instead of loading fixture defaults. Traces: fail-closed posture in
  [`FENCE-1`](../../product/guarantees.md#11-the-fence--runtime-authorization), review S1.
- **PR-AC-8** — Plan-ID validation accepts dotted ids (e.g. `plan-v1.2`) while rejecting
  genuine traversal (`..`, path separators), with tests. Traces: review S2, the
  execution-plan contract's "v0 Input Restrictions".
- **PR-AC-9** — Two runs started in the same millisecond cannot merge into one record
  directory. Traces: review S5, the records contract's run-identity requirement.
- **PR-AC-10** — Every committed fixture is referenced by at least one test or is removed;
  the worker-privilege regression test exists (worker surface exposes no push/PR/merge
  capability). Traces: review S6,
  [`FENCE-3`](../../product/guarantees.md#11-the-fence--runtime-authorization), INV-002 in
  [`runtime-design-m5a.md`](../../design/notes/runtime-design-m5a.md).
- **PR-AC-11** — The fixtures README's pre-toolchain prose is updated without breaking the
  `delivery:check` gate (it asserts required snippets from that file verbatim). Traces:
  review doc-fallout caution.

**Evidence/tests:**

- Regression tests named per AC ID (e.g. `PR-AC-1: success with null evidence is blocked`).
- The golden-record integration test (PR-AC-6) as the shape anchor for PR-AC-2..5.
- `corepack pnpm check` green with the enforced 90% coverage thresholds.
- A records-diff note in the PR body: old vocabulary → new, citing ADR 0017 (downstream
  consumers read records; the change must be legible).

**Stop conditions:**

- Stop if any fix requires freezing the record schema or adding TypeScript contract types —
  contract freeze is design-owned.
- Stop if convergence needs a mapping ADR 0017 does not already record — route back to
  design, do not decide locally.
- Stop if `delivery:check` snippets cannot be preserved through the fixtures-README update.

**Relevant references:**

- [`../../reviews/2026-07-02-post-phase-2-repo-review.md`](../../reviews/2026-07-02-post-phase-2-repo-review.md)
- [ADR 0017](../../design/decisions/0017-records-seam-reconciliation.md)
- [`../../design/contracts/observability-records-contract-v0.md`](../../design/contracts/observability-records-contract-v0.md)
- [`../../design/core/orchestration.md`](../../design/core/orchestration.md)
- [`../../design/core/records.md`](../../design/core/records.md)

**Explicit non-goals:**

- Resume, replay-based inspect (Phase 4).
- Real providers or Forge/GitHub landing.

## Phase 3 — Governed Local Runs (delivered)

**Client value:** An operator can preview what a run would do before starting it, and control
local agent work through policy that actually grants, denies, or routes requests instead of
trusting the worker's narrative.

**Goal:** Replace the Phase 1–2 boolean policy gate with the per-request fence
([ADR 0018](../../design/decisions/0018-policy-gate-simplification.md) names the boolean as
scaffolding), add plan preview, and make authorization decisions durable records.

**Requirements:**

- `jig preview <plan>`: validate, bind config/policy, and report what would run — allocating
  no run identity, workspace, or side effects (the `previewed` edge state in
  [`bootstrap.md`](../../design/core/bootstrap.md)).
- Per-request fence: the scripted worker declares requests; the fence adjudicates each
  against the fixed category boundary (CFG-10, assisted posture per
  [ADR 0002](../../design/decisions/0002-policy-posture-assisted.md)), emitting
  `authorization.requested` → `granted`/`denied`/`routed`.
- Denied requests fail closed and block the item; routed requests park the item for a
  minimal local approval prompt; grants are narrow and tied to the immediate request.
- Runner-owned actions recorded as `runner-action.skipped-on-dry-run` at landing (INV-008b).
- The adjusted four-story canonical triad fixture from
  [ADR 0019](../../design/decisions/0019-phase-3-local-governance-scope.md) becomes the golden
  integration test, evidencing the full triad
  ([ADR 0008](../../design/decisions/0008-s004-denied-in-canonical-fixture.md)).
- Rule-governing change attempts route to the owner (GUARD-2).

**Acceptance criteria:**

- **P3-AC-1** — `jig preview <plan>` reports the bound plan/policy and would-run story set,
  creates no run directory or records, and emits/renders the `previewed` posture; a
  subsequent `jig run` is unaffected by whether a preview happened. Traces: org-M5
  "validates and previews", [`bootstrap.md`](../../design/core/bootstrap.md),
  [`SEE-1`](../../product/guarantees.md#5-full-observability).
- **P3-AC-2** — A declared, low-risk request is granted and recorded
  (`authorization.requested` → `authorization.granted` with basis). Traces:
  [`FENCE-1`](../../product/guarantees.md#11-the-fence--runtime-authorization), CFG-10,
  ADR 0002.
- **P3-AC-3** — An undeclared or out-of-scope request is denied fail-closed, recorded with
  basis, and the item records `blocked`. Traces:
  [`FENCE-1`](../../product/guarantees.md#11-the-fence--runtime-authorization), FAIL-002.
- **P3-AC-4** — A rule-governing request routes to the owner; the item parks durably; the
  owner's approve/reject decision is recorded and narrow. Traces:
  [`GUARD-2`](../../product/guarantees.md#13-anti-gaming),
  [`DOOR-1`](../../product/guarantees.md#14-the-doorbell--approval-and-escalation)–
  [`DOOR-3`](../../product/guarantees.md#14-the-doorbell--approval-and-escalation).
- **P3-AC-5** — The adjusted canonical triad fixture runs end-to-end and its golden record
  evidences the full triad (granted, routed, denied), the runner-owned skip, and the `stopped`
  terminal with an unattended-park reason. Traces: INV-008, OBS-002, ADR 0008, ADR 0019.
- **P3-AC-6** — No model adjudicates the authority boundary; the classifier is the fixed
  category boundary. Traces: ADR 0002, review of
  [`authorization.md`](../../design/core/authorization.md).

**Evidence/tests:**

- Grant/deny/route fixture tests named per AC ID.
- Preview no-side-effects test (P3-AC-1).
- The §15 golden integration test (P3-AC-5).
- Approval approve/reject tests; rule-governing guard test.
- `corepack pnpm check` green.

**Stop conditions:**

- Stop if provider or worker claims become self-authorizing.
- Stop if a model-decided authority boundary is introduced.
- Stop if policy can be widened mid-run without owner approval.
- Stop if the triad's record shape needs contract changes ADR 0017 and the v0 contract do
  not cover — route back to design.

**Relevant references:**

- [`../../design/core/authorization.md`](../../design/core/authorization.md)
- [`../../design/core/bootstrap.md`](../../design/core/bootstrap.md)
- [`../../design/notes/runtime-design-m5a.md`](../../design/notes/runtime-design-m5a.md) (§15, INV-008, OBS-002)
- [ADR 0002](../../design/decisions/0002-policy-posture-assisted.md),
  [ADR 0008](../../design/decisions/0008-s004-denied-in-canonical-fixture.md),
  [ADR 0018](../../design/decisions/0018-policy-gate-simplification.md)
- Archived r1 Phase 3 section:
  [`../m5b-local-mvp/phases.md`](../m5b-local-mvp/phases.md)

**Explicit non-goals:**

- Full provider capability conformance; strong execution-host containment proof.
- Remote approvals or delegated reviewer workflows.
- Forge/GitHub landing.

## Phase 4 — Reliable Local Runs

**Client value:** An operator can recover from interruption and diagnose local runs from
durable records instead of guessing what the worker did.

**Goal:** Stop/resume from records, no-double-effect proof, causal notices, record-backed
diagnostics, redaction/export posture, workspace continuity — and inspection that replays the
event log.

**Requirements:** as the archived r1 Phase 4, plus:

- `jig inspect` reconstructs state by replaying `events.jsonl` (projections), so a crashed
  run without a finalized `run.json` is still inspectable (INV-006/ENF-003 in
  [`runtime-design-m5a.md`](../../design/notes/runtime-design-m5a.md); review "later
  hardening").
- Resume honors ADR 0017 decision 2: a failure-halted `run.stopped` is a resumable
  checkpoint like any other stop.

**Acceptance criteria:**

- **P4-AC-1** — An interrupted run resumes from the recorded checkpoint; launch bindings are
  immutable across resume. Traces:
  [`RESUME-2`](../../product/guarantees.md#31-interruption-resume),
  [`GUARD-1`](../../product/guarantees.md#13-anti-gaming), INV-003.
- **P4-AC-2** — Previously recorded irreversible effects are not repeated on resume.
  Traces: [`RESUME-3`](../../product/guarantees.md#31-interruption-resume), INV-006.
- **P4-AC-3** — Safety-relevant changes while stopped require fresh approval and evidence
  before resuming. Traces: [`RESUME-5`](../../product/guarantees.md#31-interruption-resume),
  [`GUARD-2`](../../product/guarantees.md#13-anti-gaming).
  - _Phase 4 local realization
    ([ADR 0020](../../design/decisions/0020-phase-4-reliable-local-runs.md)):_ satisfied by
    preserving **launch-policy immutability across resume** — bootstrap persists the resolved launch
    **policy snapshot** (alongside the plan snapshot) and resume adjudicates resumed work from that
    snapshot, never a permissive stub, so the rules cannot silently loosen. `resume-blocked-missing-approval`
    remains a **named seam with no active local trigger** (every locally detectable change is already
    caught by the binding and workspace gates); the active re-approval affordance and record/snapshot
    tamper-evidence are deferred to the post-Phase-5 records-integrity phase.
- **P4-AC-4** — `inspect` explains why a run stopped, the notice produced, and the safe
  resume point, by replaying the event log — including for a run with no finalized
  `run.json`. Traces: [`LIVE-2`](../../product/guarantees.md#33-liveness--noticing-a-stuck-run),
  [`SEE-4`](../../product/guarantees.md#5-full-observability), INV-006.
- **P4-AC-5** — Redaction/export ambiguity becomes an operator-visible diagnosable stop;
  records stay safe to keep and export by default. Traces:
  [`SEC-1`](../../product/guarantees.md#16-security--no-leaks-no-phone-home)–
  [`SEC-3`](../../product/guarantees.md#16-security--no-leaks-no-phone-home).
- **P4-AC-6** — A materially different resumed workspace is detected rather than silently
  claimed continuous. Traces:
  [`RESUME-4`](../../product/guarantees.md#31-interruption-resume).

**Evidence/tests:** resume-from-checkpoint, binding-preserved, no-double-effect,
stop/notice/resume causal-chain fixture, redaction/export collision fixture,
workspace-continuity test, replay-inspect test — named per AC ID; `corepack pnpm check`.

**Stop conditions:** as archived r1 Phase 4 (no hidden runtime memory; no silent rebinding;
no redaction-erased stop evidence; no continuity claims over changed workspaces).

**Relevant references:** archived r1 Phase 4 section and its design/red-team citations;
[`../../design/core/records.md`](../../design/core/records.md).

**Explicit non-goals:** remote-host recovery, cross-provider resume, full compliance export,
Learning-loop analysis, GitHub/Forge recovery behavior.

## Phase 5 — Integrated Provider Runs

Re-scoped for r2 after Phase 4 and settled by
[ADR 0021](../../design/decisions/0021-phase-5-integrated-provider-runs.md). The archived r1 Phase 5
bundled the four seams, real drivers, Forge/GitHub, work-source, and hardening into one phase; this
section carries only what the P5 acceptance criteria require and splits the rest into named later
phases (below). The r1 intent is preserved: provider conformance gates before provider autonomy; the
four seams stay behind their contracts; provider claims stay provider-supplied but core-judged; SEC-2
posture requires proof; Forge actions stay runner-invoked; Work Source stays provenance/import.

**Client value:** An operator can plug a driver into any of the four seams and trust that Jig's
authority, evidence, and recovery boundaries hold — because every seam is exercised behind its port,
a driver must pass a conformance suite before it is trusted, and a driver's isolation or capability
claim never becomes autonomy without core-judged proof.

**Goal:** Turn the four provider seams from design-only into **exercised jig-internal ports** with a
composition root, a capability-attestation input to the Fence, and a reusable conformance suite —
proven with **reference adapters**, not shipped drivers. Every P5 acceptance criterion is a contract
test proving an invariant holds.

**Scope (ADR 0021):** seams + conformance harness + reference adapters. **Not** a real agent driver,
real execution host, real Forge/GitHub landing, real work-source integration, or a TUI — those are
[Phase 6 and beyond](#phase-6-and-beyond--the-deferred-tail). The reference adapters run in local
dry-run only; the default wiring reproduces the Phase 0–4 dry-run and its goldens exactly.

**Requirements:**

- The four ports as jig-internal interfaces (`AgentPort` formalizing `Worker`; `ExecutionHostPort`;
  `ForgePort`; `WorkSourcePort`), with the runner and CLI depending on the interfaces, never a concrete
  adapter (ADR 0021 decision 2).
- A composition root that selects and wires adapters from `config.drivers`, defaulting to the
  reference adapters, as the one importer of provider implementations; unknown driver names fail closed
  (ADR 0021 decision 3).
- A positive-only, core-judged capability-attestation input to the Fence; a reported isolation category
  or capability claim is input to core's judgment, never a substitute for it (ADR 0021 decision 4).
- An execution-host isolation-strength catalog (`none`/`weak`/`strong`) with host-supplied proof and
  the failure tokens `containment-unproven`, `isolation-strength-overstated`, `workspace-collision`
  (ADR 0021 decision 5).
- Runner-invoked Forge landing (modeled, `skipped-on-dry-run`, idempotent) and a Work-source seam
  whose candidates cross `PlanValidator` (ADR 0021 decisions 6–7).
- A provider manifest at design altitude plus a reusable conformance suite that asserts the cross-port
  invariants, including the Wave 5 adversarial probes, and fails closed on a broken adapter (ADR 0021
  decision 8).

**Acceptance criteria:**

- **P5-AC-1** — Provider contract tests prove a driver cannot redefine policy, evidence,
  authorization, or lifecycle semantics; the reference adapters pass the conformance suite and an
  intentionally broken adapter fails it closed. Traces:
  [`STACK-2`](../../product/guarantees.md#4-stack-portability)–
  [`STACK-5`](../../product/guarantees.md#4-stack-portability),
  [`DRIVE-1`](../../product/guarantees.md#41-trusting-a-driver), ADR 0021 decision 8.
- **P5-AC-2** — Execution-host tests distinguish self-report from confinement proof: a host reporting
  a `strong` category with an absent, stale, or overstated proof does **not** unlock the autonomy that
  category would grant; only fresh, positive proof does, and the failure token is recorded. Traces:
  [`SEC-2`](../../product/guarantees.md#16-security--no-leaks-no-phone-home),
  [`DRIVE-3`](../../product/guarantees.md#41-trusting-a-driver),
  [`EARN-1`](../../product/guarantees.md#12-earned-trust--capability-attestation)–
  [`EARN-2`](../../product/guarantees.md#12-earned-trust--capability-attestation), ADR 0021
  decisions 4–5.
- **P5-AC-3** — Agent-provider tests preserve no privileged-method exposure: the `AgentPort` exposes no
  push/PR/merge/credential path, and only the composition root imports adapters. Traces:
  [`FENCE-3`](../../product/guarantees.md#11-the-fence--runtime-authorization), INV-002, ADR 0021
  decisions 2–3.
- **P5-AC-4** — Forge tests prove push, PR, status, comment, and merge are runner-owned: `ForgePort` is
  invoked only by the runner at `done → landed`, stays `skipped-on-dry-run`, and is idempotent across
  resume/retry. Traces: [`MERGE-2`](../../product/guarantees.md#15-merge-on-evidence),
  [`MERGE-5`](../../product/guarantees.md#15-merge-on-evidence), ADR 0021 decision 6.
- **P5-AC-5** — Work-source tests route imported candidates through plan intake: a candidate is
  admitted only via a validated plan and is rejected or held otherwise; source input never reaches
  runtime scheduling without `PlanValidator`. Traces:
  [`plan-intake.md`](../../design/core/plan-intake.md), INV-007, ADR 0021 decision 7.

**Evidence/tests:**

- Conformance-suite fixtures (reference adapters pass; a broken adapter fails closed), named per AC ID.
- An execution-host proof/self-report distinguishing test and a host-overstated-isolation test
  (P5-AC-2).
- A no-privileged-method import/boundary test and a composition-root sole-importer test (P5-AC-3).
- A forge-runner-only test and a forge idempotency-on-resume test (P5-AC-4).
- A work-source-to-plan-intake test and a bypass-attempt stop test (P5-AC-5).
- The Phase 0–4 goldens still pass under the default wiring (regression anchor); `corepack pnpm check`
  green with 90% coverage thresholds.

**Stop conditions:**

- Stop if a provider redefines core policy, evidence, authorization, or lifecycle semantics.
- Stop if any AC would require a **real** driver, real network/containment, or real Forge/GitHub
  landing to pass — that is Phase 6+, not Phase 5.
- Stop if a manifest, capability-proof, or records field must be **frozen** (JSON Schema / event
  constants / TypeScript contract package) — freeze is contract-owner-owned.
- Stop if SEC-2 posture would depend on host self-report instead of proof, or if a reported isolation
  category would unlock autonomy without core-judged proof.
- Stop if work-source/provenance input can reach runtime scheduling without `PlanValidator` — route to
  design (`w4-s8`/`w4-s2`), do not decide locally.

**Relevant references:**

- [ADR 0021](../../design/decisions/0021-phase-5-integrated-provider-runs.md)
- [`../../design/contracts/providers.md`](../../design/contracts/providers.md)
- [`../../design/core/authorization.md`](../../design/core/authorization.md),
  [`../../design/core/bootstrap.md`](../../design/core/bootstrap.md),
  [`../../design/core/orchestration.md`](../../design/core/orchestration.md),
  [`../../design/core/plan-intake.md`](../../design/core/plan-intake.md)
- Wave 5 red-team:
  [`w5-s1`](../../planning/design-track/waves/wave-5-red-team/outputs/w5-s1-authority-and-provider-red-team/routed-findings.md);
  Wave 6 triage:
  [`prerequisite-triage.md`](../../planning/design-track/waves/wave-6-implementation-phasing/prerequisite-triage.md)
- Phase 5 implementation brief:
  [`./implementation-briefs/phase-5-integrated-provider-runs.md`](./implementation-briefs/phase-5-integrated-provider-runs.md)
- Archived r1 Phase 5 section (period-accurate history):
  [`../m5b-local-mvp/phases.md`](../m5b-local-mvp/phases.md)

**Explicit non-goals:**

- Any **real** driver — agent, execution host, forge, or work source.
- Real network access, real containment/sandboxing, or real Forge/GitHub push/PR/merge.
- Freezing the execution-plan, observability-records, manifest, or capability-proof schemas.
- A TUI/dashboard, Learning-loop integration, or record/snapshot tamper-evidence.

## Phase 6 and beyond — the deferred tail

Split out of the r1 Phase 5 bucket by ADR 0021, this tail is now a track of its own. Phases 6-9 (real
agent/host drivers, real Forge/GitHub landing, real work-source intake, and records-integrity) derive
from org milestone **M7 — Real Provider Integration** and are defined, with ID-bearing acceptance
criteria, in the [M7 real-providers track](../m7-real-providers/README.md) and its
[phase details](../m7-real-providers/phases.md). The TUI/dashboard, Learning loop (M6), policy
analyzer, and v0 contract freeze live there as "beyond this track / checkpoints." They are not
re-defined here, so the ladder stays single-sourced.
