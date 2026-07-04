---
title: "Phase R implementation brief — Remediation"
status: active
---

# Phase R implementation brief — Remediation

## Context and goal

Phases 0–2 shipped a working local dry-run engine, but the post-Phase-2 review
([`../../../reviews/2026-07-02-post-phase-2-repo-review.md`](../../../reviews/2026-07-02-post-phase-2-repo-review.md))
found the records seam drifted from the design's closed vocabulary with no recorded mapping
(MF2), golden fixtures asserted by nothing (MF3), an evidence gate that trusts the worker's
self-report over the evidence value (MF5), and several contained safety gaps (S1, S2, S5, S6).
[ADR 0017](../../../design/decisions/0017-records-seam-reconciliation.md) records the
reconciliation; this phase implements it. No new operator-facing feature — every change here
makes an already-shipped behavior honest against the contract it claims to follow. Phase 3
(governed local runs) builds directly on the records shape this phase fixes, so this must land
first.

Read, in order: [`../phases.md`](../phases.md) (Phase R section, authoritative AC list),
[`../README.md`](../README.md) (org-M5 map, preserved gates, terminology guard),
[ADR 0017](../../../design/decisions/0017-records-seam-reconciliation.md), the review sections
on MF2/MF3/MF5/S1/S2/S5/S6, and the current source: `src/harness.ts`, `src/records.ts`,
`src/cli.ts`, `src/plan-validator.ts`, `src/types.ts`.

**Source-line references below are verified against the current TypeScript** (not the review's
pinned `bcdf8ba` JS-era line numbers, which have moved — `test/` is now `tests/`, `.js` is now
`.ts`). Re-grep before trusting a line number if the file has changed since this brief was
written.

## References

- [`../phases.md`](../phases.md) — Phase R requirements and PR-AC-1..11.
- [`../README.md`](../README.md) — org-M5 exit-criteria map, preserved gates.
- [ADR 0017](../../../design/decisions/0017-records-seam-reconciliation.md) — the five
  reconciliations this phase implements.
- [`../../../design/contracts/observability-records-contract-v0.md`](../../../design/contracts/observability-records-contract-v0.md) —
  the v0 record shape, event families, and the v0 phasing-of-causality-fields note.
- [`../../../design/core/orchestration.md`](../../../design/core/orchestration.md) — the closed
  run and work-item transition tables; the `started → stopped` guard set (line ~126) and the
  work-item table's `blocked`/`parked` semantics.
- [`../../../design/core/records.md`](../../../design/core/records.md) — records-store seam.
- [`../../../reviews/2026-07-02-post-phase-2-repo-review.md`](../../../reviews/2026-07-02-post-phase-2-repo-review.md) —
  MF2, MF3, MF5, S1, S2, S5, S6 (evidence, historical line numbers only).

## What to build

### PR-AC-1 — Evidence gate validates value, not just presence

**File:** `src/harness.ts`, the worker-result handling inside the story loop (currently
lines 60–104).

**Current behavior:** line 64 checks only `!result.evidence || result.evidence.result ===
undefined`. Once evidence is present at all, line 84 branches purely on
`result.outcome === 'success'` — a worker reporting `outcome: "success"` with
`evidence.result: null` or `evidence.result: "failed"` still reaches `story.done` (line 84–90).
The worker's self-report outranks the evidence value, which is exactly the anti-pattern
[`MERGE-1`](../../../product/guarantees.md#15-merge-on-evidence) and the design's
`started → done` guard forbid.

**Target behavior — the exact predicate:** the gate passes if and only if
`result.evidence.result === 'passed'` (strict string equality; `'passed'` is the only passing
value at this phase, and the only passing value the fixtures emit). Anything else — a missing
`evidence` object, a missing/`null`/`undefined` `result`, or any other value including
`"failed"` — fails the gate regardless of `outcome`. A gate failure records the item `blocked`
(not `failed` — see PR-AC-4) with reason `evidence-gate-failed` and diagnostics naming what
evidence was actually seen (`result: null`, `result: "failed"`, etc.). Concretely: after the
existing missing-evidence check, add the equality check; a non-`'success'` `outcome` keeps its
existing failure path. Do not invent a new evidence-result vocabulary beyond what the
scripted-worker fixtures already emit (`"passed"` / `"failed"` strings, `null`); this is a
value check, not a new schema.

**Tests to write** (in `tests/harness.unit.test.ts`):

- `PR-AC-1: success outcome with null evidence result is blocked` — worker returns
  `{ outcome: 'success', evidence: { result: null } }`; assert a `story.blocked` event with
  `reason: 'evidence-gate-failed'`, not `story.done`.
- `PR-AC-1: success outcome with failed evidence result is blocked` — worker returns
  `{ outcome: 'success', evidence: { result: 'failed' } }`; same assertion.
- Keep/adapt the existing missing-evidence regression test to assert the new `blocked` +
  `evidence-gate-failed` shape instead of whatever family it currently asserts.

### PR-AC-2 — Run identity distinct from plan id, plus attempt

**Files:** `src/records.ts` (`init`, `finalize`), `src/types.ts` (`RunRecord`).

**Current behavior:** `RecordManager.init` (records.ts:23–30) already mints a unique directory
suffix (`run-<plan.id>-<Date.now()>`, line 28) — but `finalize` (line 38–57) throws that
identity away: `run.json`'s `run.id` is hardcoded to `plan.id` (line 47: `id: plan.id`). The
committed golden fixture (`tests/fixtures/m5b-local-mvp/golden-run-record-success.json`) still
shows the originally intended distinct id (`"run-minimal-local"` vs. the actual
`"plan-minimal-local"`), confirming the drift.

**Target behavior:** capture the directory-suffix-derived run id at `init` time (store it on the
instance alongside `runDir`, or derive it once and reuse), and write that value — not `plan.id`
— into `run.json`'s `run.id`. Add an `attempt` field (start at `1`; this phase does not need
multi-attempt tracking, just the field, per ADR 0017 decision 1 — "Phase R promotes it into the
record and adds `attempt`"). `RunRecord.run` in `types.ts` gains `id: string` (already present,
just now populated correctly) and `attempt: number | string`.

**Tests to write** (in a new or extended `tests/records.unit.test.ts` — the review noted
`records.js` "lacks a dedicated unit-test file"; consider adding one here since Phase R touches
`records.ts` heavily):

- `PR-AC-2: run.json id differs from plan id` — run twice against the same plan, assert both
  runs' `run.json` have `run.id !== plan.id` and `run.id` differs between the two runs.
- `PR-AC-2: run.json carries an attempt field`.

### PR-AC-3 — `actor` on every event; run-level binding block

**Files:** `src/harness.ts` (every `recordEvent` call site), `src/records.ts` (`recordEvent`,
`finalize`), `src/types.ts` (`RunEvent`, `RunRecord`).

**Current behavior:** no event carries `actor`; `RecordManager.init` receives `config` and
`policy` (records.ts:23–26) and stores `policy` on the instance (currently marked with a
`biome-ignore lint/correctness/noUnusedPrivateClassMembers` comment at line 12 noting it is
"held for the records seam; run-level binding records consume it from Phase R (ADR 0017)") but
never writes either into `run.json`.

**Target behavior:**

- Add `actor` to every event. Simplest correct approach per ADR 0017 decision 5 (v0 minimum
  set): stamp `actor: 'runner'` centrally in `RecordManager.recordEvent` (records.ts:32–36)
  rather than at every call site in `harness.ts` — this is a one-line addition inside the
  `timestampedEvent` construction and guarantees no call site is missed. Do not add per-actor
  variation (worker/owner distinctions) — that is phased in later per the contract's "v0 phasing
  of causality fields" note; `'runner'` is correct for every v0 event today.
- Add a run-level `binding` block to `run.json`, naming the policy and config in force at
  launch. Populate it in `finalize` from the `this.policy`/`this.config` already held on the
  instance (records.ts:12, 13, 60). Minimum fields: `policyRef` (the policy doc's
  `policy.id` — read via `loadPolicy`'s existing validation, `src/loaders.ts:22–28`, which
  already requires `policy.policy.id` to exist) and `configRef` (there is no equivalent id field
  on `ConfigDoc` today — use the resolved `recordDir`/`mode` pair, or the literal config file
  path if that is more useful; pick one and document the choice in the PR body's records-diff
  note, since the config contract has no `id` field to point to).

**Tests to write:**

- `PR-AC-3: every event carries actor` — run a multi-item plan, assert every event in
  `events.jsonl`/`run.json` has `actor` set.
- `PR-AC-3: run.json carries a binding block naming policy and config` — assert
  `run.json.run.binding.policyRef` matches the loaded policy's `policy.id`.

### PR-AC-4 — Alias renames land

Four sub-changes, all in `src/harness.ts` plus their sibling readers in `src/records.ts` and
`src/cli.ts`. **This AC is two structural changes and two renames, not four string swaps** —
`story.skipped`'s removal and the run-denial rename both change control flow and record shape,
not just a label.

**(a) `story.failed` → `story.blocked` with a recorded reason.**

- **Current:** `harness.ts` emits `story.failed` at three sites — missing evidence (line 68,
  soon replaced by PR-AC-1's `evidence-gate-failed` path), worker-reported non-success outcome
  (line 94), and an execution exception (line 110).
- **Target:** all three become `story.blocked` with a `reason` field distinguishing the cause.
  **The reason vocabulary is closed** — Phase R mints exactly these three strings and nothing
  else (a fourth cause routes back to design per the phase's stop conditions):
  `evidence-gate-failed`, `worker-reported-failure`, `worker-execution-error`.
  Dependency-caused blocks are distinguished structurally, not by a reason string: they keep
  the existing `blockedBy: <storyId>` field and carry no `reason`. This aligns with the
  design's work-item table, which
  models an unmet evidence gate — and, by extension, any non-proceeding worker outcome — as
  `blocked`, not a separate `failed` state that does not exist in the contract's event-family
  list.
- **Sibling readers to update or the reason prints blank:** `src/records.ts` line 5
  (`ITEM_FAMILIES` array — replace `'story.failed'` with the already-present `'story.blocked'`,
  now carrying two different `blockedBy`-style reasons: dependency-caused vs. worker-caused),
  and the display logic at `records.ts` lines 75–79 and `cli.ts` lines 111–113, both of which
  currently special-case `story.blocked` display only for the dependency-blocked case
  (`details = ' (blocked by ${item.blockedBy})'`). Extend both to also render the new
  worker-caused `reason` when `blockedBy` is absent.

**(b) `story.skipped` is retired — no terminal event for a never-started item; the run-level
stop record names the unstarted set.**

- **Current:** `harness.ts` lines 48–54 emit `story.skipped` (`reason: 'run stopped after
failure'`) for every story that is not transitively blocked by a failure. `records.ts` line 5
  and `cli.ts` line 104 both include `'story.skipped'` in their item-family filters; both
  display layers (`records.ts:77-79`, `cli.ts:112-114`) special-case its `reason` rendering.
- **Target:** remove the `story.skipped` event emission entirely. Collect the ids of stories
  that never started (the `else` branch at harness.ts:48–54, after subtracting the
  transitively-`blocked` set) into an `unstarted: string[]` array, and thread it into
  `recordManager.finalize` so it lands on the `run.stopped` record (see PR-AC-4d below for the
  stop record's shape). Remove `'story.skipped'` from `ITEM_FAMILIES` (records.ts:5) and the
  CLI's item-family filter (cli.ts:104); remove the now-dead `story.skipped` display branches in
  both `records.ts` and `cli.ts`.

**(c) `run.denied` → `authorization.denied` at run scope, followed by the terminal run record.**

- **Current:** `harness.ts` lines 18–27 — on `allowLocalDryRun !== true`, emits a single
  `run.denied` event then finalizes with `'failure'`. Two silent sibling readers depend on the
  exact string `'run.denied'`: `records.ts:83` (`printSummary`'s no-items fallback, which prints
  the denial reason) and `cli.ts:130` (`handleInspect`'s equivalent). **Both must be updated in
  the same change or the denial reason silently stops printing** — this is not optional
  follow-up.
- **Target:** rename the emitted family to `authorization.denied` (run-scoped: no `storyId`),
  keep the `reason` field, and update both `records.ts:83` and `cli.ts:130` to look for
  `'authorization.denied'` instead of `'run.denied'`. This is a fence decision at run scope, not
  a new run state — the run still finalizes via the existing `stopped`/`failure` path (see
  PR-AC-4d).

**(d) `run.stopped` carries reason and checkpoint posture.**

- **Current:** `harness.ts` line 122 emits a bare `{ family: 'run.stopped' }` with no reason
  or checkpoint field, on the failure-halt path only. (Verified against a live run: the
  policy-denial path emits no `run.stopped` — it records the denial and finalizes. Keep that:
  after PR-AC-4c the denial path is `authorization.denied` + the terminal run record; whether
  a denied run also records a stop event is a Phase 3 fence-design question, not this AC.)
- **Target:** the `run.stopped` emission carries `reason: 'work-item-blocked'` — **the only
  stop reason Phase R mints** (Phase 3 adds `unattended-park` per the design's run table; a
  new reason here routes back to design) — and a `checkpoint` field with the exact format
  `after:<storyId>`, where `<storyId>` is the last story that reached a terminal event before
  the halt. Phase 4 is what actually implements resume; this phase only needs the field
  present and accurate enough to be meaningful evidence, not a resume-ready mechanism. Also
  attach the `unstarted` set from PR-AC-4b here, per ADR 0017 decision 3's "the run-level stop
  record names the unstarted set."
  Note ADR 0017 decision 2's framing: a failure-halted `run.stopped` **keeps** the `stopped`
  family — it does not become a different state — it just needs these fields, which is exactly
  what was missing.

**Tests to write** (in `tests/harness.unit.test.ts` and `tests/cli.unit.test.ts` /
`tests/cli.int.test.ts`):

- `PR-AC-4: failed story records story.blocked with a worker-failure reason`.
- `PR-AC-4: dependent of a failed story records story.blocked with a dependency reason`.
- `PR-AC-4: non-dependent story after a failure has no terminal event and appears in the
unstarted set`.
- `PR-AC-4: policy denial records authorization.denied at run scope`.
- `PR-AC-4: run.stopped carries reason and checkpoint`.
- `PR-AC-4: CLI summary and inspect still print the denial reason after the rename` — this is
  the regression test for the sibling-reader fix; MF4 already flagged this exact display path as
  under-tested (a vacuous denial test existed at the review's pinned commit), so make this
  assertion hard-fail (no `if (match) { assert }` — assert directly, per the review's S-pattern
  warning about conditional asserts).

### PR-AC-5 — Dry-run evidence uses `evidence.modeled`

**File:** `src/harness.ts` line 78.

**Current behavior:** the dry-run's scripted-worker evidence is recorded as `evidence.observed`
unconditionally.

**Target behavior:** since the scripted-worker stub is dry-run-only in this phase (no genuinely
observed evidence source exists yet — see the terminology guard in
[`../README.md`](../README.md), "Local dry-run harness"), rename this single emission site to
`evidence.modeled`. Do not build a genuine/observed-vs-modeled branch — there is no observed
evidence path in this phase, so a single rename is the complete, correct fix. `evidence.observed`
remains reserved in the contract for a future genuinely-observed source; do not remove it from
`types.ts` or the contract, just stop emitting it here.

**Tests to write:**

- `PR-AC-5: dry-run evidence is recorded as evidence.modeled` — assert the emitted event family
  directly; grep the golden fixture (PR-AC-6) to confirm no `evidence.observed` event appears in
  any regenerated golden.

### PR-AC-6 — Golden-record integration test

**Files:** new integration test (likely `tests/records-golden.int.test.ts` or extending
`tests/cli.int.test.ts`), plus regenerated/added fixtures under
`tests/fixtures/m5b-local-mvp/`.

**Current behavior:** no test references any golden fixture — verified by grep across
`tests/*.ts` for every `golden-*.json` basename; all zero hits. `golden-run-record-success.json`
and `golden-run-record-failure.json` are present but dead. The two multi-item goldens the
archived Phase 2A brief promised
(`../../m5b-local-mvp/implementation-briefs/phase-2a-local-workflow-runner.md`, "Fixtures to
add") — `golden-run-record-multi-success.json` and `golden-run-record-dependent-blocked.json` —
were never created.

**Target behavior — golden fixture plan:**

- **Regenerate** `golden-run-record-success.json` against the post-Phase-R output shape (real
  run id, `attempt`, `binding` block, `actor` on every event, `evidence.modeled` not
  `.observed`).
- **Add** `golden-run-record-multi-success.json` — a multi-item plan where every story
  succeeds, asserting event ordering across items.
- **Add** `golden-run-record-dependent-blocked.json` — a multi-item plan where one story fails
  and a dependent is transitively blocked, asserting the `story.blocked` (dependency reason),
  the `unstarted` set on the stop record (any independent, non-dependent stories in the fixture
  should exercise the `unstarted` array being non-empty if the fixture has 3+ stories, or empty
  if all remaining stories are transitively blocked — pick a plan shape that exercises the
  non-empty case, since that is the behavior this AC is actually protecting).
- Retire or repurpose `golden-run-record-failure.json` — fold its intent into
  `golden-run-record-dependent-blocked.json` if it covers the same shape, or regenerate it
  separately if it is testing a distinct single-item failure case worth keeping.
- **Timestamp normalization:** every event and the run record carry `timestamp`/similar
  ISO-8601 fields that will never byte-match between runs. Normalize before comparison — either
  strip `timestamp` fields recursively before the deep-equal assertion, or replace them with a
  fixed sentinel (e.g. `"<TIMESTAMP>"`) via a small normalization helper shared by the golden
  test. Do not compare raw timestamps.
- **Regeneration discipline:** goldens are regenerated from the engine's actual output and
  then hand-verified event-by-event against ADR 0017's mapping before committing — never
  hand-authored from scratch. Event order in a golden is the engine's deterministic sequential
  order; the reason strings and the `checkpoint` format are the closed vocabulary fixed in
  PR-AC-1/PR-AC-4 above, so two implementers regenerating the same golden produce identical
  files (post timestamp-normalization).
- **The test must assert the full event sequence and `run.json` shape** — a deep-equal (or
  ordered-sequence-plus-shape) assertion against the regenerated golden, not an existence check
  (`find`) as the review found the Phase 2 suite doing. Read the golden fixture from disk, run
  the CLI (or the harness directly, if that keeps the test faster and equally faithful) against
  the corresponding plan/config/policy/scripted-output fixtures, normalize timestamps on both
  sides, and assert deep equality.
- **A golden that no test reads may not exist** — after wiring the three (or however many)
  goldens above, grep to confirm zero orphaned `golden-*.json` files remain in
  `tests/fixtures/m5b-local-mvp/`.

**Before/after sketch — illustrative only, not a frozen schema** (per the contract's "v0 Not
Frozen Schema" section and this brief's stop conditions below):

Before (current `run.json` shape, `plan-minimal-local` example):

```json
{
  "run": {
    "id": "plan-minimal-local",
    "status": "success",
    "planId": "plan-minimal-local",
    "mode": "dry-run"
  },
  "events": [
    { "family": "run.started", "timestamp": "..." },
    { "family": "story.started", "storyId": "STORY-1", "timestamp": "..." },
    {
      "family": "evidence.observed",
      "storyId": "STORY-1",
      "result": "passed",
      "timestamp": "..."
    },
    { "family": "story.done", "storyId": "STORY-1", "timestamp": "..." },
    { "family": "run.completed", "timestamp": "..." }
  ]
}
```

After (Phase R shape):

```json
{
  "run": {
    "id": "run-plan-minimal-local-1719900000000",
    "attempt": 1,
    "status": "success",
    "planId": "plan-minimal-local",
    "mode": "dry-run",
    "binding": {
      "policyRef": "policy-local-allow",
      "configRef": "dry-run"
    }
  },
  "events": [
    { "family": "run.started", "actor": "runner", "timestamp": "..." },
    {
      "family": "story.started",
      "storyId": "STORY-1",
      "actor": "runner",
      "timestamp": "..."
    },
    {
      "family": "evidence.modeled",
      "storyId": "STORY-1",
      "actor": "runner",
      "result": "passed",
      "timestamp": "..."
    },
    {
      "family": "story.done",
      "storyId": "STORY-1",
      "actor": "runner",
      "timestamp": "..."
    },
    { "family": "run.completed", "actor": "runner", "timestamp": "..." }
  ]
}
```

Stop-record sketch (dependent-blocked golden):

```json
{
  "family": "run.stopped",
  "actor": "runner",
  "reason": "work-item-blocked",
  "checkpoint": "after:STORY-1.blocked",
  "unstarted": ["STORY-3"],
  "timestamp": "..."
}
```

### PR-AC-7 — CLI flags fail closed

**File:** `src/cli.ts`, `handleRun` (lines 30–41).

**Current behavior:** lines 37–40 default `--config`, `--policy`, and `--scripted-output` to
`tests/fixtures/m5b-local-mvp/local-config.json` / `local-policy.json` /
`scripted-worker-success.json` when the flag is absent. Outside the checkout, or once those
fixtures move/change, this silently loads a permissive policy and a canned success worker
instead of failing.

**Target behavior:** remove the three `|| 'tests/fixtures/...'` fallbacks. If any of
`--config`, `--policy`, or `--scripted-output` is missing, print usage guidance (extend
`printUsage`, lines 24–28, to name the three required flags explicitly) and exit non-zero —
mirror the existing `if (!args[0])` pattern at line 31.

**Tests to write** (in `tests/cli.int.test.ts` or `tests/cli.unit.test.ts`):

- `PR-AC-7: jig run without --config fails closed with usage guidance`.
- `PR-AC-7: jig run without --policy fails closed with usage guidance`.
- `PR-AC-7: jig run without --scripted-output fails closed with usage guidance`.
- Update every existing CLI test that currently relies on the fixture-path defaults to pass the
  three flags explicitly — at the time of writing, at least nine invocations in
  `tests/cli.int.test.ts` omit `--config` (several also omit `--policy` or
  `--scripted-output`) and will break when the defaults are removed. Grep
  `tests/cli.*.test.ts` for CLI invocations lacking one of the three flags and fix them in the
  same change; this AC is not done while any test depends on a default.

### PR-AC-8 — Plan-ID path-safety pattern corrected

**File:** `src/plan-validator.ts`, lines 21 (`plan.id`) and 37 (`story.id`).

**Current behavior:** `/[/\\..]/` is a character class, not the intended "reject `..` or a path
separator" pattern — it matches any single occurrence of `/`, `\`, or `.`, so a legitimate id
like `plan-v1.2` is rejected with a misleading "path traversal" error. The regex is used at
**two** sites: `plan.id` (line 21) and `story.id` (line 37).

**Target behavior:** replace with a pattern that actually detects traversal — reject path
separators (`/`, `\`) and the literal `..` sequence, while allowing single dots. For example,
`/[/\\]|\.\./` (separator OR literal double-dot), or equivalently check
`id.includes('/') || id.includes('\\') || id.includes('..')`. **PR-AC-8 names only the plan-ID
case** — the story-ID site (line 37) has the identical bug and the identical fix is a direct
sibling occurrence. Fix both in this change and say so explicitly in the PR body; do not silently
patch only line 21 while leaving line 37 with the same wrong regex.

**Tests to write** (in `tests/validator.unit.test.ts`):

- `PR-AC-8: plan id with a dot (plan-v1.2) is accepted`.
- `PR-AC-8: plan id containing .. is rejected`.
- `PR-AC-8: plan id containing a path separator is rejected`.
- `PR-AC-8: story id with a dot is accepted` (sibling coverage for the story.id site).
- `PR-AC-8: story id containing .. is rejected` (sibling coverage).

### PR-AC-9 — Run-directory collision prevented

**File:** `src/records.ts`, `init` (lines 23–30).

**Current behavior:** `init` builds the run directory from `recordBaseDir` plus
`run-<plan.id>-<Date.now()>` (line 28), then calls `mkdirSync(this.runDir, { recursive: true })`
(line 29). Two runs of the same plan started in the same millisecond produce the same directory
name; `recursive: true` means the second `mkdirSync` call silently succeeds into the same
directory, interleaving two runs' `events.jsonl` files.

**Target behavior:** make the suffix collision-proof. Options, pick one and note the choice in
the PR body: (a) append a short random component (e.g. `crypto.randomUUID()` or a few random hex
bytes) to the directory name in addition to the timestamp; (b) use `mkdirSync` without
`recursive` and catch `EEXIST` to retry with a fresh suffix. Prefer (a) for simplicity — it also
naturally becomes the run-id source consumed by PR-AC-2, so implement PR-AC-2 and PR-AC-9
together against the same suffix value.

**Tests to write:**

- `PR-AC-9: two runs started in the same millisecond do not share a run directory` — this needs
  either mocking `Date.now()` to return a fixed value across two `init()` calls, or starting two
  `RecordManager` instances back-to-back and asserting their `runDir` values differ even when
  `Date.now()` is stubbed constant.

### PR-AC-10 — Orphaned fixtures wired in or removed; worker-privilege regression test

**Files:** `tests/fixtures/m5b-local-mvp/*.json`, `tests/harness.unit.test.ts` (or a new test
file for the privilege regression).

**Current behavior (verified fresh against `tests/*.ts`, not the review's stale JS-era list):**
grepping every fixture basename against `tests/*.ts` shows these fixtures are referenced by
zero tests today: `golden-run-record-failure.json`, `golden-run-record-success.json`,
`invalid-plan-duplicate-story-id.json`, `invalid-plan-late-dependency.json`,
`invalid-plan-self-dependency.json`, `invalid-plan-unknown-dependency.json`,
`scripted-worker-missing-evidence.json`. (`local-policy-denied.json` and
`multi-item-plan-success.json` **are** already referenced — the review's S6 list is pre-TS-
migration and no longer fully accurate; re-verify with a fresh grep before treating any fixture
as orphaned, since the golden ones are addressed by PR-AC-6 above and should not be double-
counted here.)

**Target behavior:**

- The four `invalid-plan-*.json` fixtures duplicate coverage that
  `tests/validator.unit.test.ts` currently provides via inline plan objects (see e.g. the
  `PlanValidator rejects unknown dependency` test, which builds its plan inline rather than
  loading a fixture file). Either wire these fixtures into a parallel fixture-driven test (e.g.
  loop over the four files and assert each throws) or remove them — removal is simpler and the
  inline tests already give equivalent coverage; if removed, say so in the PR body's fixture
  note.
- `scripted-worker-missing-evidence.json` — wire this into a PR-AC-1 regression test (the
  "missing evidence" case) if its content matches; if it duplicates an inline fixture already in
  `harness.unit.test.ts`, remove it and note the duplication.
- The `golden-run-record-*.json` orphans are resolved by PR-AC-6's golden-fixture plan; do not
  fix them again here.
- **Worker-privilege regression test:** the archived Phase 1 brief promised a test proving the
  worker surface exposes no push/PR/merge capability (review S6); grep confirms
  `tests/harness.unit.test.ts` has no such test today (no `push`/`merge`/`forge`/`pull-request`
  hits). Add one: assert the `Worker` interface (`src/types.ts`) and `ScriptedWorker`
  (`src/worker.ts`) expose only `execute(story): Promise<WorkerResult>` — no method or property
  that could push, open a PR, post a status/comment, or merge. A type-level assertion plus a
  runtime check that `Object.getOwnPropertyNames(ScriptedWorker.prototype)` contains no such
  method name is sufficient; this does not require Forge/landing code to exist (it does not,
  yet) — it is a regression guard against ever adding such a method to the worker surface
  without a design change, per
  [`FENCE-3`](../../../product/guarantees.md#11-the-fence--runtime-authorization) and INV-002 in
  [`runtime-design-m5a.md`](../../../design/notes/runtime-design-m5a.md).

**Tests to write:**

- `PR-AC-10: worker surface exposes no push, PR, or merge capability`.
- Fixture-driven or removed coverage for the four orphaned `invalid-plan-*.json` files (choose
  one path per fixture, do both consistently, note the choice).

### PR-AC-11 — Fixtures README updated without breaking `delivery:check`

**File:** `tests/fixtures/m5b-local-mvp/README.md`.

**Current behavior:** `scripts/check-delivery-foundation.mjs` asserts these 14 literal snippets
appear verbatim in this file (grep-checked, not markdown-parsed — substring match only):

```
minimal-plan
local-config
local-policy
scripted-worker-output
local-run-record
illustrative examples
not normative schemas
contract owner approves schema freeze
Do not add TypeScript interfaces
JSON Schema
event constants
provider manifests
package exports
package decomposition
```

The README's current prose is pre-toolchain (written before the TypeScript migration and before
Phase 1/2 fixtures existed — e.g. line 8's "Phase 1 should add fixture files here before
runtime behavior depends on them" is now historical, and the "Intended Fixture Names" table
(lines 16–28) only lists the original five Phase-1 names, not the full current fixture set).

**Target behavior:** update the prose to describe the fixture set as it exists after Phase R
(mention the multi-item, golden, and invalid-plan fixture families; drop the "Phase 1 should
add" framing since Phase 1 is long done) **while preserving every one of the 14 snippets above
verbatim, in some sentence, somewhere in the file.** The safest approach: edit around the
snippets rather than rewriting the sentences that contain them — e.g. the "Contract-Preservation
Rule" section (lines 33–40) already contains 6 of the 14 snippets in one paragraph; touch its
surrounding prose but leave that paragraph's key phrases intact. After editing, run
`node scripts/check-delivery-foundation.mjs` (or `corepack pnpm check`, which should invoke it)
locally and confirm it still passes before considering PR-AC-11 done — do not rely on visual
inspection alone.

**Tests to write:** none new — `delivery:check` (via `corepack pnpm check`) is the existing
regression test for this AC; running it green is the evidence.

## Fixtures — summary

| Fixture                                                                                     | Action                                                                                          |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `golden-run-record-success.json`                                                            | Regenerate (PR-AC-6)                                                                            |
| `golden-run-record-multi-success.json`                                                      | Add (PR-AC-6)                                                                                   |
| `golden-run-record-dependent-blocked.json`                                                  | Add (PR-AC-6)                                                                                   |
| `golden-run-record-failure.json`                                                            | Retire or regenerate — decide during PR-AC-6                                                    |
| `invalid-plan-{duplicate-story-id,late-dependency,self-dependency,unknown-dependency}.json` | Wire in or remove (PR-AC-10)                                                                    |
| `scripted-worker-missing-evidence.json`                                                     | Wire in or remove (PR-AC-10)                                                                    |
| `local-policy-denied.json`                                                                  | Already referenced — no action, but its display-path test must be hardened for PR-AC-4's rename |

## Tests and evidence

- Every new/changed test names its AC ID in the test description, per the track convention
  (e.g. `PR-AC-1: success with null evidence is blocked`).
- The golden-record integration test (PR-AC-6) is the shape anchor other ACs' record-shape
  assertions can lean on, but each AC still needs its own targeted unit test — don't rely on the
  golden test alone to prove PR-AC-2/3/4/5.
- `corepack pnpm check` green, with the existing 90% coverage thresholds holding.
- A records-diff note in the PR body: old vocabulary → new (`run.denied` →
  `authorization.denied`, `story.failed` → `story.blocked`, `story.skipped` → removed +
  `unstarted` set, `evidence.observed` → `evidence.modeled` for dry-run), citing ADR 0017 —
  downstream consumers read records; this change must be legible without reading the diff.

## Must not decide

- **No contract freeze.** Do not add TypeScript interfaces, JSON Schema, or event-name constants
  for the records or execution-plan contracts. The `types.ts` changes in this brief are
  implementation types for the current engine, not a schema freeze — they stay as permissive
  interfaces matching the existing style (see `types.ts`'s own header comment).
- **No fence, preview, or approval work.** The boolean `allowLocalDryRun` gate stays a boolean
  gate in this phase (renamed denial event aside) — do not build per-request adjudication,
  categories, or the `granted`/`routed` legs of the triad. That is Phase 3, gated on ADR 0018.
- **No resume.** The `checkpoint` field on `run.stopped` (PR-AC-4d) is evidence, not a resume
  mechanism — do not implement `stopped → resumed` transitions or replay-based inspect. That is
  Phase 4.
- **No new event vocabulary beyond ADR 0017's mapping.** Every event family this brief adds or
  renames — `story.blocked` (extended reason), `authorization.denied`, `evidence.modeled`, the
  `unstarted` field on `run.stopped` — is named by ADR 0017 or the observability-records
  contract's event-family list. If an AC seems to need a family not in that mapping, stop and
  route the gap back to design rather than inventing one locally.
- **Stop if `delivery:check` snippets cannot be preserved** through the PR-AC-11 README update —
  route back to design/track owner rather than trimming the required-snippets list in
  `scripts/check-delivery-foundation.mjs` to make the gate pass.
- **Stop if a reconciliation gap surfaces that ADR 0017 does not already cover** — do not
  improvise a mapping locally; record the gap and route it back to design, per the phase's stop
  conditions in [`../phases.md`](../phases.md).
