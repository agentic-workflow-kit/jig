---
title: "M5b phase details"
status: draft
---

# M5b phase details

Each phase below is named for the client-usable addition it enables. The internal design surfaces
remain cited because they own the mechanics.

## Phase 0 — Delivery Foundation

**Client value:** No direct client feature yet. The value is confidence that runtime work can grow
behind checks, fixtures, and contract-preservation gates.

**Goal:** Establish minimal repository, fixture, and verification foundations for later runtime
implementation.

**Requirements:**

- Keep `corepack pnpm check` as the local gate and grow it only through repo-approved tooling.
- Establish fixture conventions for local plan, local config, policy, and run-record examples.
- Preserve the execution-plan and observability-records v0 contracts as cited and unfrozen.
- Keep delivery docs separate from product and design authority.

**Acceptance criteria:**

- `corepack pnpm check` passes.
- Fixture conventions are documented before runtime behavior depends on them.
- No TypeScript interfaces, JSON Schema, provider manifests, exports, or package layout are frozen.
- No `docs/design/**` change is needed for this roadmap.

**Evidence/tests:**

- Local `corepack pnpm check` output.
- `git diff --check`.
- Changed-doc relative link scan.
- Contract-preservation review of changed files.

**Stop conditions:**

- Stop if Phase 0 needs schema freeze, provider manifests, final package decomposition, or new
  hard-numbered `INV-*` rows.
- Stop if a delivery doc starts deciding product or design facts.

**Relevant references:**

- [`../../design/README.md`](../../../design/README.md)
- [`../../design/contracts/execution-plan-contract-v0.md`](../../../design/contracts/execution-plan-contract-v0.md)
- [`../../design/contracts/observability-records-contract-v0.md`](../../../design/contracts/observability-records-contract-v0.md)
- [`../../planning/design-track/waves/wave-6-implementation-phasing/implementation-phasing.md`](../../planning/design-track/waves/wave-6-implementation-phasing/implementation-phasing.md)

**Explicit non-goals:**

- Runtime code.
- Package layout.
- Contract schema freeze.
- Provider manifests or conformance-suite shape.

## Phase 1 — Local Plan Runner

**Client value:** An operator can run one simple local plan from the terminal and inspect a durable
local record of what happened.

**Goal:** Deliver the smallest client-usable local run:

```text
local plan file
-> simple config
-> simple local policy
-> local engine
-> local dry-run harness
-> scripted-worker stub
-> structured local logs / run summary
```

**Requirements:**

- Provide a `jig run <plan>`-style local entry point.
- Read a local plan file and simple local config.
- Validate the plan through the plan-intake boundary and reject unknown, malformed, or incompatible
  input before a run exists.
- Bind simple local policy before execution.
- Drive the scripted-worker stub through a local dry-run harness.
- Execute one plan item sequentially.
- Capture worker exit code, stdout/stderr, and a structured event trail in a local run directory.
- Print a human-readable summary with final state and record location.

**Acceptance criteria:**

- A minimal valid local fixture runs successfully.
- An invalid plan fixture is rejected without creating a committed run.
- A worker failure fixture records the failed item, exit code, stdout/stderr, and final summary.
- The scripted-worker stub never receives privileged credentials or Forge authority.
- The local run record is durable enough for direct inspection without Learning-loop tooling.

**Evidence/tests:**

- CLI smoke test for valid run.
- Invalid-plan rejection test.
- Scripted-worker failure capture test.
- Golden local run directory fixture such as `run.json`, `events.jsonl`, `stdout.log`, and
  `stderr.log`, without freezing the v0 contract schema.
- `corepack pnpm check`.

**Stop conditions:**

- Stop if work-source provenance bypasses `PlanValidator`.
- Stop if a console-only run leaves no durable local record.
- Stop if the local dry-run harness is described as a real execution-host adapter, sandbox, or
  SEC-2-compliant host without proof.
- Stop if a real agent adapter, execution-host adapter, GitHub, Forge, remote host, resume, provider
  manifests, or Learning-loop integration becomes required for first MVP success.

**Relevant references:**

- [`../../product/jig.md`](../../../product/jig.md)
- [`../../product/guarantees.md`](../../../product/guarantees.md)
- [`../../design/core/plan-intake.md`](../../../design/core/plan-intake.md)
- [`../../design/core/bootstrap.md`](../../../design/core/bootstrap.md)
- [`../../design/core/orchestration.md`](../../../design/core/orchestration.md)
- [`../../design/contracts/driving.md`](../../../design/contracts/driving.md)

**Explicit non-goals:**

- Full observability projections.
- Resume.
- Real agent or execution-host adapters.
- Rich policy approval flows.
- Provider manifests.
- Forge/GitHub integration.
- Remote execution hosts.

## Phase 2 — Local Workflow Runner

**Client value:** An operator can run a small multi-step local workflow and inspect each item
outcome rather than only a single toy task.

**Goal:** Extend the local runner to multi-item sequential plans, basic dependency handling, better
diagnostics, and local inspection.

**Requirements:**

- Support multiple local plan items.
- Respect declared dependencies for simple sequential eligibility.
- Keep done, blocked, failed, and skipped/downstream-not-run outcomes inspectable.
- Provide an inspect path such as `jig inspect <run>` over local records.
- Capture changed files or workspace diff when safely available.
- Distinguish dry-run posture from local-run posture in summaries and records.

**Acceptance criteria:**

- A multi-item valid fixture runs in dependency order.
- A blocked or failed item prevents dependent items while independent eligible items remain
  representable for later phases.
- `inspect` reconstructs state from local records rather than from a separate mutable summary.
- Validation diagnostics identify the plan location and reason clearly enough for a user to fix it.

**Evidence/tests:**

- Multi-item fixture test.
- Dependency-order test.
- Downstream blocked/skipped fixture test.
- Inspect-from-records test.
- Changed-files capture test where supported.

**Stop conditions:**

- Stop if workflow state is maintained as a parallel narrative instead of replaying local records.
- Stop if dependency handling silently starts work before prerequisites are satisfied.
- Stop if this phase requires generalized parallel execution, rich DAG optimization, or Forge
  landing.

**Relevant references:**

- [`../../product/concepts.md`](../../../product/concepts.md)
- [`../../design/core/orchestration.md`](../../../design/core/orchestration.md)
- [`../../design/core/records.md`](../../../design/core/records.md)
- [`../../design/contracts/observability-records-contract-v0.md`](../../../design/contracts/observability-records-contract-v0.md)

**Explicit non-goals:**

- Parallel execution.
- Full stop/resume recovery.
- Runner-owned push, PR creation, or merge.
- Provider conformance gates.

## Phase 3 — Governed Local Runs

**Client value:** An operator can control local agent work through policy that actually grants,
denies, or routes requests instead of trusting the worker's narrative.

**Goal:** Make the local runner's policy and authorization path meaningful for local work.

**Requirements:**

- Implement local grant, deny, and route outcomes using the fixed category boundary from design.
- Record authorization decisions and their basis.
- Add a minimal local approval prompt for routed actions.
- Deny undeclared, out-of-scope, privileged, or ambiguous requests fail-closed.
- Route rule-governing or irreversible local actions to an owner decision.
- Keep human grants narrow and tied to the immediate request.

**Acceptance criteria:**

- A low-risk declared local request can proceed.
- An undeclared or out-of-scope request is denied and recorded.
- A routed request parks for owner approval or rejection and records the decision.
- Rule-governing change attempts cannot quietly complete without approval and fresh evidence.
- No model adjudicates the authority boundary.

**Evidence/tests:**

- Grant/deny/route fixture tests.
- Local approval approve/reject tests.
- Decision-record golden fixture.
- Rule-governing change guard test.
- Regression test that worker code cannot invoke privileged Forge methods.

**Stop conditions:**

- Stop if provider or worker claims become self-authorizing.
- Stop if host-reported isolation category unlocks autonomy without core judgment.
- Stop if a model-decided authority boundary is introduced.
- Stop if policy can be widened mid-run without owner approval.

**Relevant references:**

- [`../../design/core/authorization.md`](../../../design/core/authorization.md)
- [`../../design/core/plan-intake.md`](../../../design/core/plan-intake.md)
- [`../../design/core/records.md`](../../../design/core/records.md)
- [`../../planning/design-track/waves/wave-5-red-team/outputs/w5-s1-authority-and-provider-red-team/routed-findings.md`](../../planning/design-track/waves/wave-5-red-team/outputs/w5-s1-authority-and-provider-red-team/routed-findings.md)
- [`../../planning/design-track/waves/wave-6-implementation-phasing/prerequisite-triage.md`](../../planning/design-track/waves/wave-6-implementation-phasing/prerequisite-triage.md)

**Explicit non-goals:**

- Full provider capability conformance.
- Strong execution-host containment proof.
- Remote approvals or delegated reviewer workflows.
- Forge/GitHub landing.

## Phase 4 — Reliable Local Runs

**Client value:** An operator can recover from interruption and diagnose local runs from durable
records instead of guessing what the worker did.

**Goal:** Add local reliability: stop/resume, no-double-effect proof, causal notices, record-backed
diagnostics, redaction/export posture, and workspace continuity checks.

**Requirements:**

- Resume from the last safe checkpoint using durable local records.
- Preserve original launch binding across resume unless design-owned behavior explicitly allows a
  routed re-approval path.
- Prove already-recorded irreversible effects are not repeated.
- Reconstruct stop/notice/resume causality from records.
- Surface diagnosable stops when redaction/export posture prevents appending or surfacing
  stop-critical evidence.
- Detect materially different resumed workspaces instead of silently claiming same-run continuity.

**Acceptance criteria:**

- Interrupted local run resumes from a recorded checkpoint.
- Safety-relevant changes while stopped require fresh approval and evidence without loosening
  launch policy.
- Previously recorded irreversible effects are skipped or blocked on resume.
- Inspect can explain why a run stopped, what notice was produced, and what resume point is safe.
- Redaction/export ambiguity becomes an operator-visible diagnosable stop.

**Evidence/tests:**

- Resume-from-checkpoint test.
- Original-binding-preserved test.
- No-double-effect test.
- Stop/notice/resume causal-chain fixture.
- Redaction/export collision fixture.
- Workspace-continuity test.

**Stop conditions:**

- Stop if recovery depends on hidden runtime memory instead of records.
- Stop if resume silently rebinds policy, work profile, or repo floors.
- Stop if redaction posture can erase stop-critical evidence without a diagnosable stop.
- Stop if resume claims continuity over a materially different workspace.

**Relevant references:**

- [`../../design/core/bootstrap.md`](../../../design/core/bootstrap.md)
- [`../../design/core/orchestration.md`](../../../design/core/orchestration.md)
- [`../../design/core/records.md`](../../../design/core/records.md)
- [`../../design/contracts/observability-records-contract-v0.md`](../../../design/contracts/observability-records-contract-v0.md)
- [`../../planning/design-track/waves/wave-5-red-team/outputs/w5-s2-recovery-records-integration-red-team/findings-and-open-questions.md`](../../planning/design-track/waves/wave-5-red-team/outputs/w5-s2-recovery-records-integration-red-team/findings-and-open-questions.md)

**Explicit non-goals:**

- Remote-host recovery.
- Cross-provider resume.
- Full compliance export.
- Learning-loop analysis.
- GitHub/Forge recovery behavior.

## Phase 5 — Integrated Provider Runs

**Client value:** An operator can move beyond the scripted local stub while Jig preserves the same
authority, evidence, and recovery boundaries.

**Goal:** Introduce provider seam realizations only after local core semantics, records, policy, and
recovery have proven themselves.

**Requirements:**

- Add provider conformance gates before granting provider autonomy.
- Keep Agent, Execution Host, Forge, and Work Source behind the existing provider seams.
- Distinguish provider-supplied claims from core-judged sufficiency.
- Prove execution-host containment before claiming stronger SEC-2 posture.
- Keep Forge actions runner-invoked only.
- Keep Work Source as provenance/import, never a second runtime scheduling channel.

**Acceptance criteria:**

- Provider contract tests prove providers cannot redefine policy, evidence, authorization, or
  lifecycle semantics.
- Execution-host tests distinguish self-report from confinement proof.
- Agent provider tests preserve no privileged method exposure.
- Forge tests prove push, PR, status, comment, and merge are runner-owned.
- Work-source tests route imported candidates through plan intake.

**Evidence/tests:**

- Provider conformance fixtures.
- Execution-host containment proof fixture.
- Capability freshness/staleness tests.
- Forge runner-only regression tests.
- Work-source-to-plan-intake tests.

**Stop conditions:**

- Stop if provider manifests or conformance schemas must be frozen without design-owner approval.
- Stop if a provider redefines core semantics.
- Stop if GitHub/Forge integration requires weakening local policy, records, or authorization
  guarantees.
- Stop if SEC-2 claims depend on host self-report instead of proof.

**Relevant references:**

- [`../../design/contracts/providers.md`](../../../design/contracts/providers.md)
- [`../../design/core/authorization.md`](../../../design/core/authorization.md)
- [`../../design/core/records.md`](../../../design/core/records.md)
- [`../../planning/design-track/waves/wave-5-red-team/outputs/w5-s1-authority-and-provider-red-team/`](../../planning/design-track/waves/wave-5-red-team/outputs/w5-s1-authority-and-provider-red-team/)
- [`../../planning/design-track/waves/wave-6-implementation-phasing/prerequisite-triage.md`](../../planning/design-track/waves/wave-6-implementation-phasing/prerequisite-triage.md)

**Explicit non-goals:**

- Making every provider first-class at once.
- Learning-loop integration before representative local records exist.
- Dashboards or TUI.
- Replacing v0 contracts with final schemas.
