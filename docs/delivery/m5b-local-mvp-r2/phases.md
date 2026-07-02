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

Carried from the archived r1 Phase 5 unchanged in intent: provider conformance gates before
provider autonomy; the four seams stay behind their contracts; provider claims stay
provider-supplied but core-judged; SEC-2 posture requires proof; Forge actions stay
runner-invoked; Work Source stays provenance/import.

**Acceptance criteria** (ID'd from the archived list):

- **P5-AC-1** — Provider contract tests prove providers cannot redefine policy, evidence,
  authorization, or lifecycle semantics. Traces:
  [`STACK-2`](../../product/guarantees.md#4-stack-portability)–
  [`STACK-5`](../../product/guarantees.md#4-stack-portability).
- **P5-AC-2** — Execution-host tests distinguish self-report from confinement proof.
  Traces: [`SEC-2`](../../product/guarantees.md#16-security--no-leaks-no-phone-home),
  [`DRIVE-2`](../../product/guarantees.md#41-trusting-a-driver).
- **P5-AC-3** — Agent-provider tests preserve no privileged-method exposure. Traces:
  [`FENCE-3`](../../product/guarantees.md#11-the-fence--runtime-authorization).
- **P5-AC-4** — Forge tests prove push, PR, status, comment, and merge are runner-owned.
  Traces: [`MERGE-2`](../../product/guarantees.md#15-merge-on-evidence).
- **P5-AC-5** — Work-source tests route imported candidates through plan intake. Traces:
  [`plan-intake.md`](../../design/core/plan-intake.md).

**Everything else** (requirements, evidence, stop conditions, references, non-goals) as the
archived r1 Phase 5 section, which remains citable:
[`../m5b-local-mvp/phases.md`](../m5b-local-mvp/phases.md).
