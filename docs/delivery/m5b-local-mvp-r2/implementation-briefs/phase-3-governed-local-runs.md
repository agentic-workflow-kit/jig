---
title: "Phase 3 implementation brief — Governed Local Runs"
status: active
---

# Phase 3 implementation brief — Governed Local Runs

## Context and goal

Phases 1–2 gated a run on a single policy boolean (`allowLocalDryRun`), recorded as a named,
deliberate walking-skeleton simplification in
[ADR 0018](../../../design/decisions/0018-policy-gate-simplification.md) — not the fence
[ADR 0002](../../../design/decisions/0002-policy-posture-assisted.md) requires. This phase
replaces the boolean with the per-request fence: the scripted worker declares requests, the
Fence adjudicates each against the fixed CFG-10 category boundary, and the run emits durable
`authorization.*` records for every decision instead of a single run-level allow/deny. It also
adds `jig preview <plan>` — validate and bind without allocating a run — and a minimal local
approval prompt for routed requests.

**Dependency: Phase R must land first.** This phase's `authorization.*` events extend the
run-level `binding` block, `actor`, and stop-record shape Phase R introduces (ADR 0017); do not
start this phase against pre-Phase-R records shape.

Read, in order: [`../phases.md`](../phases.md) (Phase 3 section, authoritative AC list),
[`../README.md`](../README.md) (org-M5 map — this phase closes the fence and preview exit
criteria), [ADR 0018](../../../design/decisions/0018-policy-gate-simplification.md),
[ADR 0002](../../../design/decisions/0002-policy-posture-assisted.md),
[ADR 0008](../../../design/decisions/0008-s004-denied-in-canonical-fixture.md),
[`../../../design/core/authorization.md`](../../../design/core/authorization.md),
[`../../../design/core/bootstrap.md`](../../../design/core/bootstrap.md), and §15 of
[`../../../design/notes/runtime-design-m5a.md`](../../../design/notes/runtime-design-m5a.md).
Also read the [Phase R brief](./phase-r-remediation.md) for the records shape this phase
extends.

This brief is implementation-ready to the extent the design allows. Where a detail is genuinely
design-owned rather than a local implementation choice, this brief says so explicitly and names
where the missing piece will come from — do not fill those gaps by invention; route them back to
design per this phase's stop conditions.

## References

- [`../phases.md`](../phases.md) — Phase 3 requirements and P3-AC-1..6.
- [`../README.md`](../README.md) — org-M5 exit-criteria map (this phase closes the preview and
  fence-triad rows), terminology guard.
- [`../../../design/core/authorization.md`](../../../design/core/authorization.md) — the Fence
  classifier, the fixed CFG-10 category boundary, the Fence decision rules (four-step order),
  the Doorbell escalation model, GUARD-2's enforcement leg.
- [`../../../design/core/bootstrap.md`](../../../design/core/bootstrap.md) — the `preview` vs.
  `start` boundary (Preview walks load → validate → bind → emit `run.previewed`; it does not
  allocate a run identity, workspace, or provider wiring — see "Preview vs Start Boundary").
- [ADR 0002](../../../design/decisions/0002-policy-posture-assisted.md) — assisted posture,
  CFG-10 fixed category boundary is the accepted minimum policy posture.
- [ADR 0018](../../../design/decisions/0018-policy-gate-simplification.md) — names the boolean
  gate as scaffolding this phase replaces.
- [ADR 0008](../../../design/decisions/0008-s004-denied-in-canonical-fixture.md) — the canonical
  fixture must evidence a `denied` outcome, not just `granted`/`routed`.
- [`../../../design/notes/runtime-design-m5a.md`](../../../design/notes/runtime-design-m5a.md)
  §15 — the canonical five-story dry-run trace this phase's golden integration test asserts.
- [Phase R brief](./phase-r-remediation.md) — the records shape (`binding` block, `actor`,
  `run.stopped` reason/checkpoint/`unstarted`) this phase's events extend.

## What to build

### P3-AC-1 — `jig preview <plan>`

**New CLI command**, alongside the existing `run`/`inspect` commands in `src/cli.ts`
(`run()`'s command dispatch, currently lines 10–22).

**Target behavior**, per `bootstrap.md`'s "Preview vs Start Boundary": `jig preview <plan>`
walks load → validate → bind (policy/config) → report the would-run story set, then emits/renders
the `previewed` posture. It must:

- Load and validate the plan through the existing `PlanValidator` (no new validation logic —
  reuse `src/plan-validator.ts` exactly as `handleRun` does today).
- Load and bind config/policy (reuse `loadConfig`/`loadPolicy` from `src/loaders.ts`).
- Report the bound plan/policy and the would-run story set (story ids in plan order is
  sufficient — this is a report, not a scheduler).
- **Allocate no run identity, create no run directory, and write no `run.json`/`events.jsonl`.**
  This is the load-bearing constraint: `bootstrap.md` is explicit that preview "commits no run:
  no run identity is allocated and no workspace, provider, or privileged side effects occur."
  Do not reuse `RecordManager.init` (which unconditionally calls `mkdirSync`) for preview's
  reporting path — preview needs a separate, non-allocating code path, even though it shares
  plan/config/policy loading with `run`.
- Emit a `run.previewed` audit event. **Where this event is durably recorded is a design-owned
  question `bootstrap.md` does not fully resolve for the no-run-directory case** — the doc says
  preview "is always recorded" and emits its own audit event, but does not specify a storage
  target once no run directory exists yet (the binding record, which normally anchors a run's
  durable evidence, is explicitly a `start`-only artifact per bootstrap.md's Launch Sequence
  step 7). Reasonable default: print the `previewed` report to stdout (mirroring `handleRun`'s
  and `handleInspect`'s existing console-output pattern) and treat that as this phase's
  recording surface, since no records store exists to write into pre-run. If a durable,
  file-backed preview record is required, that needs a design decision on where it lives; flag
  this rather than inventing a new preview-record file location.
- A subsequent `jig run` is unaffected by whether a preview happened — trivially true if preview
  allocates nothing, but write the regression test anyway (see below) since it is the AC's
  explicit acceptance bar.

**Tests to write** (new `tests/preview.unit.test.ts` and/or `tests/cli.int.test.ts` additions):

- `P3-AC-1: preview reports the bound plan and would-run story set`.
- `P3-AC-1: preview creates no run directory` — assert no new directory appears under the
  configured `recordDir` after a preview call.
- `P3-AC-1: a subsequent run is unaffected by a prior preview` — preview then run the same plan,
  assert the run behaves identically to a run with no prior preview.

### P3-AC-2, P3-AC-3, P3-AC-6 — Per-request fence replacing the boolean gate

**Files:** new `src/authorization.ts` (or similarly named module — this is new code, no
existing file owns this), `src/harness.ts` (replace the boolean check at lines 18–27 with
per-request adjudication inside the story loop), `src/types.ts` (new `AuthorizationRequest`,
`AuthorizationDecision` types), fixture format extension for `src/worker.ts`'s scripted-output
shape.

**Current behavior:** `harness.ts` lines 18–27 check `policy.policy?.rules?.allowLocalDryRun`
once, for the whole run, before any story executes. There is no per-request concept anywhere in
the current worker/harness/fixture shapes — `WorkerResult` (`types.ts`) has no `requests` field.

**Target behavior:**

- **Request declarations in scripted-worker fixtures.** Extend the scripted-worker output
  fixture shape (consumed by `src/worker.ts`'s `ScriptedWorker.execute`) so a story's scripted
  result can declare a `requests: AuthorizationRequest[]` array — each request naming an action
  (e.g. `edit-files`, `run-checks`, `edit-rule-governing-file`, an out-of-scope edit) the worker
  wants to make before or as part of producing its outcome. This is additive to the existing
  `WorkerResult` shape (`outcome`, `evidence`, `changedFiles`, etc. all remain); it does not
  replace anything Phase 1–2 fixtures rely on.
- **The Fence adjudicates each declared request** against the fixed CFG-10 category boundary
  from `authorization.md`'s "Fixed category boundary" table and its four-step decision order
  ("Fence decision rules" section): (1) declared and in scope → else `deny`; (2) touches
  credentials/push/merge/rule-governing/irreversible/ambiguous/unproven → `route`; (3) low-risk
  and bound-policy-allowed → `grant`; (4) otherwise → `route` (uncertainty never defaults to
  `grant`). **The category boundary itself (what counts as "reversible," "rule-governing," or
  "out of declared scope") is the one piece this brief treats as still needing a concrete,
  code-level definition** — `authorization.md` names the boundary conceptually (CFG-10) but does
  not enumerate a machine-checkable category list. For this phase, encode a minimal, explicit
  category map covering exactly the request shapes the §15 fixture and the AC tests need (edit
  within declared scope → reversible/grantable; edit of a file matching a
  policy-declared-rule-governing pattern → route; edit outside the plan's declared file scope →
  deny). Do not build a general-purpose classifier or anything model-adjudicated (P3-AC-6 forbids
  this explicitly) — a fixed, explicit lookup/pattern match is correct and sufficient.
- **Emit the triad.** For every declared request: `authorization.requested` →
  `authorization.granted` (with `basis` naming the policy rule and category), or
  `authorization.denied` (with `basis` naming why — fail-closed, out of scope), or
  `authorization.routed` (with `basis` naming the routing trigger — see P3-AC-4 for what happens
  next). These events carry `actor: 'runner'` (per Phase R's `actor` requirement) and `storyId`,
  and land in the same `events.jsonl`/`run.json` records path Phase R's `RecordManager`
  produces — no new records file or storage engine.
- **Denied requests fail closed and block the item.** A `deny` outcome means that story records
  `story.blocked` (reusing Phase R's PR-AC-4 vocabulary — do not invent a separate
  "authorization-blocked" family) with a reason naming the denial.
- **Grants are narrow and tied to the immediate request** — do not implement any session-level
  or story-level standing grant; each request is adjudicated independently, per `authorization.md`'s
  "Human approval is narrow" principle (which applies to owner grants but the same narrowness
  applies to Fence auto-grants by the fixed-category design).
- **No model adjudicates the boundary (P3-AC-6).** The category check must be a deterministic,
  fixed lookup — no LLM call, no confidence scoring, no heuristic scoring function. If a future
  request shape does not fit the fixed categories this phase encodes, the correct behavior is
  `route` (per decision rule 4), never an inferred `grant`.

**Tests to write** (new `tests/authorization.unit.test.ts`, extending `tests/harness.unit.test.ts`):

- `P3-AC-2: a declared low-risk request is granted and recorded` — assert
  `authorization.requested` → `authorization.granted` with a `basis` field.
- `P3-AC-3: an undeclared or out-of-scope request is denied fail-closed` — assert
  `authorization.denied` with `basis`, and that the owning story records `blocked`.
- `P3-AC-6: the classifier is a fixed lookup, not a runtime judgment call` — this is best proven
  structurally: assert the categorization function is pure/deterministic (same input always
  produces the same grant/deny/route outcome) and contains no call to any agent/LLM provider
  (grep-level review note, not just a unit test, since "no model adjudicates" is partly a code-
  shape property).

### P3-AC-4 — Rule-governing request routes to the owner; minimal approval prompt

**Files:** the same `src/authorization.ts` module (routing leg), new minimal approval-prompt
handling (likely a small addition to `src/cli.ts` or a new `src/approval.ts` — this is new
surface, name it whatever fits the existing module altitude), `src/harness.ts` (park the item
pending the decision).

**Target behavior:**

- A request matching the routing category (rule-governing touch, per GUARD-2's enforcement leg
  in `authorization.md`, "GUARD-2 enforcement leg" section: "when a request touches a declared
  rule-governing surface, the Fence must not auto-grant it, and the Doorbell must route it to an
  owner decision") emits `authorization.routed`.
- The owning story parks: record `story.parked` (already a named family in the observability
  contract's event-family list — this is not a new invention) with an `outcome`/`notice` shape
  the owner can act on. The item parks **durably** — it must survive process interruption, which
  in this local-only phase means it is durable simply by virtue of being written to
  `events.jsonl` before the process waits for input, not by any special persistence mechanism.
- **Minimal local approval prompt.** Since this phase is local-only (no remote approvals — an
  explicit non-goal), the "minimal" bar is a synchronous CLI prompt: when a run hits a routed
  request, `jig run` should stop and print the routed request's detail, then read an
  approve/reject decision from stdin (or via a simple re-invocation flag — e.g. rerun with a
  `--approve <storyId>` flag against the parked run directory). **Which of these two interaction
  shapes (blocking-stdin-prompt vs. re-invocation-flag) is the intended UX is not settled by any
  design doc read for this brief** — `authorization.md` names the Doorbell's durability and
  narrowness requirements but not a CLI interaction shape, and `driving.md`'s operator-action
  list (referenced in the review's "later hardening" section) is outside this phase's reading
  set. Recommendation for this phase: implement the blocking-stdin-prompt form, since it needs
  no new run-resumption mechanic (Phase 4 owns resume) and keeps the local single-process
  invocation model Phases 1–2 already use — but flag this as a design-adjacent choice made
  locally rather than handed down, and note it in the PR body.
- **The owner's approve/reject decision is recorded and narrow.** On approve, emit an
  owner-approval event (the contract's event-family list names "owner approved" —
  use `authorization.granted` with `basis` citing the owner decision, or a distinct family if the
  contract intends one; the contract text says "owner approved" as a descriptive family name, not
  a literal string — pick `authorization.granted` with `basis: ['owner-approval']` for
  consistency with the Fence-granted case, since both are grants, just from different
  authorities) and let the story proceed narrowly (only the specific requested action, not
  broader standing permission). On reject, emit `authorization.denied` with
  `basis: ['owner-rejection']` and block the story.
- **Rule-governing change attempts route to the owner (GUARD-2)** is the requirement this AC
  operationalizes — the routing category match itself is defined in the shared fence module from
  P3-AC-2/3/6; this AC is about what happens after `routed`, not a separate classifier.

**Tests to write:**

- `P3-AC-4: a rule-governing request routes to the owner and the item parks durably`.
- `P3-AC-4: owner approval is recorded and narrow` — approve, assert the story proceeds and the
  recorded grant cites the owner-approval basis, not a broader policy grant.
- `P3-AC-4: owner rejection is recorded and blocks the item`.

### P3-AC-5 — The §15 canonical fixture as the golden integration test

**Files:** new fixtures under `tests/fixtures/m5b-local-mvp/` for the five-story plan, new
golden run-record fixture, new integration test (e.g.
`tests/canonical-triad.int.test.ts`).

Read [`runtime-design-m5a.md`](../../../design/notes/runtime-design-m5a.md) §15 in full before
building this — the story table, the eligibility note, and the illustrative record excerpt are
all load-bearing for what this test must assert.

**What §15 actually specifies:** five stories (STORY-A through STORY-E) under an assisted
policy with `maxParallelStories: 1`. STORY-A's stub declares reversible requests
(`edit-files`, `run-checks`) → both `granted`; STORY-A reaches `done` (evidence modeled-met) but
is **not landed** (landing/Forge is out of scope — see non-goals below), so its runner-owned
push/PR/merge is recorded `runner-action.skipped-on-dry-run` (INV-008b) rather than attempted.
STORY-C's stub declares a rule-governing edit → `routed` → `parked`. STORY-D's stub declares an
out-of-scope edit → `denied` → `blocked`. STORY-B depends on STORY-A; STORY-E depends on
STORY-D. The run ends `run.stopped` with `reason: 'unattended-park'` because STORY-C parked
without a decision.

**This test genuinely proves what P3-AC-5 asks for even without STORY-B's full mechanism** — the
AC's own text scopes the assertion to "the full triad (granted, routed, denied), the runner-owned
skip, and the `stopped` terminal with an unattended-park reason." STORY-A (`granted`/`done`/
skipped-landing), STORY-C (`routed`/`parked`), and STORY-D (`denied`/`blocked`) cover the triad,
the runner-skip, and the terminal reason completely. Build the fixture and the golden test around
that asserted surface.

**Design gap — flag, do not build: STORY-B's `story.waiting` state.**

STORY-B depends on STORY-A, which reaches `done` but is explicitly **not landed** in a dry-run
(landing is globally suppressed). Per §15's "Eligibility under dry-run" note (decision D-005,
citing strict ISO-1): a dependent is eligible only once its prerequisite **lands**, not merely
`done`s — so STORY-B must be held ineligible and recorded `story.waiting`, a family
[ADR 0017](../../../design/decisions/0017-records-seam-reconciliation.md) decision 3 explicitly
says "remains that note's dry-run-scoped rendering; it is still not imported" into the
implementation's vocabulary. Building STORY-B's hold correctly requires an eligibility resolver
that understands the done-vs-landed distinction (INV-004/INV-005) — machinery this phase's
non-goals explicitly exclude ("Full provider capability conformance," no Forge/landing seam
exists yet, and landing is out of scope for local-only Phase 3). **Do not build the eligibility
resolver or import `story.waiting` to make STORY-B "work."** Two paths, and this brief
recommends the first:

1. **Build the five-story fixture without STORY-B and STORY-E as literally specified**, or
   substitute a request shape for what STORY-B/E were demonstrating that this phase's existing
   vocabulary already covers. Concretely: STORY-E (depends on **denied, blocked** STORY-D) maps
   cleanly onto Phase R's existing transitive-blocking behavior — `story.blocked` with a
   dependency reason, no new vocabulary needed — so keep STORY-E. STORY-B (depends on
   **done-but-unlanded** STORY-A) is the one that needs `story.waiting`; if the fixture is built
   without it, the test still proves the full asserted triad, the runner-skip, and the stopped-
   unattended-park terminal — everything P3-AC-5 names — using a four-story plan (A, C, D, E)
   instead of five.
2. **If the five-story shape is required as literally specified**, this needs a design decision
   first: whether `story.waiting` is imported into the v0 vocabulary now (contradicting ADR
   0017's current "not imported" framing) or whether STORY-B's hold is modeled some other way
   that does not require it. Route this back to design before building; do not decide it locally
   — this is exactly what this phase's own stop conditions call for ("Stop if the triad's record
   shape needs contract changes ADR 0017 and the v0 contract do not cover — route back to
   design").

**Tests to write:**

- `P3-AC-5: the canonical fixture run evidences granted, routed, and denied` (the triad).
- `P3-AC-5: STORY-A's landing is recorded runner-action.skipped-on-dry-run`.
- `P3-AC-5: the run ends stopped with an unattended-park reason`.
- Golden-record deep-equal assertion (reusing Phase R's PR-AC-6 timestamp-normalization helper)
  against a committed `golden-run-record-canonical-triad.json`, built from the illustrative
  record excerpt in §15 as a starting shape (adjusted for whichever of the two paths above is
  taken).

### Runner-owned skip recording (INV-008b)

**File:** `src/harness.ts`, after a story reaches `story.done`.

**Target behavior:** for any story that reaches `done` in a dry-run, record
`runner-action.skipped-on-dry-run` (naming the skipped action, e.g. `push|open-pr|merge`, and
`reason: 'dry-run'`) instead of silently doing nothing. This is a small, self-contained addition
— it does not require the Forge seam to exist; it is a records-only assertion that the runner
recognized a landing action was due and chose not to perform it, which is exactly what INV-008b
requires as evidence.

**Tests to write:**

- `P3-AC-5: a done story that is not landed records runner-action.skipped-on-dry-run`.

## Fixtures

| Fixture                                                                                             | Purpose                                                                    |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `scripted-worker-with-requests.json` (or similar)                                                   | Per-request declarations for P3-AC-2/3 unit tests                          |
| `local-policy-assisted.json` (extends `local-policy.json`)                                          | Assisted-posture policy with a declared rule-governing pattern for P3-AC-4 |
| Canonical five-story (or four-story, per the STORY-B decision above) plan + scripted-worker fixture | P3-AC-5 golden integration test                                            |
| `golden-run-record-canonical-triad.json`                                                            | P3-AC-5 golden assertion target                                            |

## Tests and evidence

- Grant/deny/route fixture tests named per AC ID.
- Preview no-side-effects test (P3-AC-1).
- The §15 (or its adjusted-scope equivalent) golden integration test (P3-AC-5).
- Approval approve/reject tests; rule-governing guard test (P3-AC-4).
- `corepack pnpm check` green, coverage thresholds holding.

## Must not decide

- **No provider or worker claim becomes self-authorizing.** The worker declares requests; it
  never grants itself authority. Every grant, deny, or route decision is made by the Fence
  module, never inferred from the worker's own outcome/evidence report.
- **No model adjudicates the authority boundary (P3-AC-6).** The category classifier is a fixed,
  deterministic lookup. Do not wire an LLM call, confidence score, or heuristic into the
  grant/deny/route decision at any point, even as a fallback.
- **No mid-run policy widening without owner approval.** The bound policy loaded at launch does
  not change during a run; an owner's routed-request approval only widens authority for that one
  narrow request, never the run's standing policy.
- **No eligibility resolver, no `story.waiting`, no landing/Forge implementation.** These are
  Phase 4/5 territory and this phase's own non-goals ("Full provider capability conformance...
  Forge/GitHub landing"). If the §15 fixture's STORY-B case is pursued, it needs a design
  decision first (see P3-AC-5 above) — do not build the resolver to make the test pass.
- **No resume.** The parked/routed durability this phase requires is "survives being written to
  the record before the process blocks on input," not "survives process restart and resumes
  correctly" — that is Phase 4's `stopped → resumed` mechanics.
- **Stop if the triad's record shape needs contract changes ADR 0017 and the v0 contract do not
  cover** — route back to design rather than deciding a new event family or field locally. This
  is this phase's own stop condition from [`../phases.md`](../phases.md) and directly governs
  the STORY-B/`story.waiting` gap flagged above.
- **Stop if provider or worker claims become self-authorizing**, or **if policy can be widened
  mid-run without owner approval** — both are explicit phase stop conditions, restated here
  because they are easy to violate accidentally while wiring the approval-prompt flow (P3-AC-4).
