---
title: Post-Phase-2 repository review
date: 2026-07-02
commit: bcdf8ba (main after PR #16 squash-merge)
verdict: Ready after must-fix items
status: point-in-time record
---

# Post-Phase-2 repository review — 2026-07-02

> **Point-in-time record.** Every file and line reference in this document is pinned to
> commit `bcdf8ba` (main, after the PR #16 squash-merge). Paths and line numbers may have
> moved since — notably `test/` → `tests/` in the TypeScript migration that followed this
> review. Do not update paths in this document; it is a historical artifact, and its stale
> paths are part of the record.

## 1. The task

A deep repository review of `jig` after M5b Phase 2 merged (PR #16), requested by the repo
owner. `jig` is the delivery/execution engine of the agentic-workflow-kit suite: it executes
approved plans under explicit policy and records evidence. The review's job was to determine
whether the repository is ready to continue implementation from a strong foundation.

The governing theme, verbatim from the request: **product definition and technical design
clarity must be precise, consistent, implementable, and free of gray areas.** Not a code-style
pass — start from the docs, verify the implementation against them.

Constraints: source of truth is the current GitHub org (`agentic-workflow-kit`), not memory or
legacy repos; prescribed reading order (org `.github` docs → repo guidance → product → design →
planning → implementation → PR history); review-only (no file modifications, no commits, no
PRs); no inventing missing product/design facts; suite boundaries enforced (Product owns
what/why, Design owns how, Planning consumes approved facts, Jig executes plans under policy
and records evidence; evidence beats agent prose).

Six review questions were posed: product quality, design quality, consistency/traceability,
implementation correctness, repo configuration, and evidence quality. The required verdict was
exactly one of: Ready / Ready after must-fix items / Not ready.

## 2. Method

Five independent evidence passes, all convergent:

1. **Own first-hand read** in the prescribed order: org `ROADMAP.md`/`MILESTONES.md`; jig
   `AGENTS.md`/`README.md`/package and config files; all four product docs; design charter,
   README, both v0 contracts, orchestration state tables, ADRs, the M5a runtime-design note;
   all M5b delivery docs and all four implementation briefs; all six `src/` modules,
   `bin/jig.js`, the full test suite and fixtures; `skills/orchestrate-jig/SKILL.md`.
2. **Four scoped subagent reviews** with narrow mandates and mandatory file:line citations:
   implementation/tests, planning traceability, repo configuration/DX, and cross-repo seams.
   Their claims were cross-checked against my own reads wherever they overlapped — no
   contradictions found.
3. **Verification commands** on a pristine snapshot of merged `bcdf8ba`:
   `corepack pnpm install --frozen-lockfile`, `corepack pnpm check` (green, 42/42 tests),
   `corepack pnpm coverage` (93.23% statements aggregate; `cli.js` 82.5%; no thresholds
   configured), a real failing multi-item run plus `jig inspect` over its records, and a
   clean-directory CLI run (which fails on baked-in fixture paths — see finding S1).
4. **PR history** for #13–#16: bodies, reviews, and review-thread state via the GitHub API.
5. **Link integrity**: all 1451 relative doc links verified to resolve (1451/1451).

Premise note: the review was requested "after Phase 2 merged"; at start, PR #16 was still open
with a blocking review. The owner merged mid-review; the squash commit `bcdf8ba` is
byte-identical to the PR head already under review (empty diff), so evidence carried over. All
12 review threads on PR #16 were resolved before merge. Everything below is against merged
`main`.

## 3. Results — bottom line

The repository is **conditionally ready** to continue. The product layer and the
product→design→wave-planning chain are genuinely strong (47 ID'd guarantees, explicit
reconciliation, closed state tables, honest deferrals), the Phase 0–2 implementation is a
competent walking skeleton with green checks and 93% coverage, and suite boundaries hold — jig
depends on published contracts, not upstream internals.

What blocks a clean "ready" is one seam: the PR #13 delivery reframe re-sequenced M5b around
client milestones and, in doing so, silently deferred org-M5 exit criteria the milestone calls
non-negotiable (the authorization triad in dry-run, preview, the typecheck+coverage gate),
while the implementation minted record vocabulary the design layer explicitly closed
(`story.failed`, `story.skipped`, `run.denied`, `status: success/failure`, `run.stopped`
reused for failure-aborts) and its evidence layer is weaker than it looks (golden fixtures
asserted by nothing and contradicting actual output; the policy-denial CLI test vacuous).

These are reconciliation and evidence fixes, not a re-design — and they must land before
Phase 3, because Phase 3 (Governed Local Runs) builds directly on the policy and records seams
that carry the drift.

## 4. Solid parts

- **The product layer is the strongest artifact in the org.** Complete stable-ID scheme
  (FENCE/EARN/GUARD/DOOR/MERGE/SEC/CFG/RESUME/ISO/LIVE/STACK/DRIVE/SEE), honest-edge sections,
  explicit non-goals (`docs/product/jig.md`, `docs/product/guarantees.md`). Product
  deliberately declines an AC table and delegates AC issuance downstream
  (`docs/product/jig.md:185-193`) — a defensible, recorded choice.
- **Product→design traceability is real, not ceremonial.** The charter reconciles all 47
  guarantee IDs (`docs/design/charter.md:79-101`); both v0 contracts derive every required
  property from named product IDs and carry explicit "no conflict found" reconciliation
  sections; the INV-001..018 ledger cites product IDs per invariant.
- **Design discipline is high.** Closed transition tables with "any transition not in this
  table is illegal" (`docs/design/core/orchestration.md`), a stub rule requiring visible
  deferral records, contracts that deliberately refuse schema freeze — exactly the org's
  "don't freeze v0 too early" posture.
- **Delivery docs are structurally excellent.** Every phase has client value, requirements,
  acceptance, evidence, stop conditions, and non-goals (`docs/delivery/m5b-local-mvp/phases.md`);
  the Phase 2A brief's ISO-simplification note (phase-2a brief, lines 73-76) is the model for
  recording deliberate divergence.
- **Suite boundaries hold.** No dependency on upstream repo internals anywhere in jig
  docs/src/skills (verified by grep); jig's design docs consume technical-design's _published_
  handoff format; `skills/orchestrate-jig/SKILL.md` keeps the agent as executor with named
  stops and human-owned approvals.
- **Repo mechanics match the org template.** CI workflow, workspace/engines/supply-chain
  config byte-identical to `repo-template`; 1451/1451 doc links resolve; the review loop on
  PR #16 worked (Codex + owner review → blockers fixed, threads resolved before merge).
- **Implementation hygiene basics are clean.** No input mutation, no TODO/FIXME debris, no
  silent catch blocks, fail-closed validator posture, durable two-file records, worker held to
  a story-only interface.

## 5. Must fix before the next implementation phase

**MF1. Reconcile the M5b reframe with org M5 — and route it back to `.github/MILESTONES.md`.**

- Severity: highest (governance/derivation breach; drives every other gap).
- Evidence: org M5 requires, even in dry-run, the fence emitting
  `requested → authorized/denied → runner-owned` records — "the line between a meaningful
  slice and a hollow one" (`.github/MILESTONES.md:356-359`), plan **preview** (:354), and
  `check` growing to lint+typecheck+test with 90%+ coverage (:362-363). The delivered slice
  has none of these: the "fence" is one boolean (`allowLocalDryRun`, `src/harness.js:14-22`);
  no preview exists (`src/cli.js:13-20`); no typecheck/coverage gate exists (`package.json`).
  Wave 6 originally sequenced authorization and preview _before_ the runnable slice; PR #13
  inverted that without naming it. 4 of 7 org-"exercised" seams (fence, eligibility/DAG,
  preview, state machine) have no exercising code. The derivation contract explicitly forbids
  this: "repo plans… should not silently change org-owned seams… send that finding back"
  (`MILESTONES.md:83-85`). Zero references to org M5 exit criteria exist in `docs/delivery/**`.
- Why it matters: the next agent-driven phase will read `phases.md` as authority and cement
  the weakened bar; org M5 will be declared done against criteria it no longer meets.
- Fix: an org-M5 exit-criteria mapping in the delivery track README (criterion → phase that
  closes it → or "renegotiated, see org PR"), and the corresponding `.github` PR amending M5.
  Fix the two broken seam pointers while in there (`ROADMAP.md:47-48` cite
  `jig/docs/design/*.md`; actual paths are `jig/docs/design/contracts/*.md`).

**MF2. Stop the drift on the records seam — jig's own output contract — before more phases
write records.**

- Severity: high (broken contract on the org's Learning-facing seam; Phase 4 hazard).
- Evidence: (a) no run identity — `run.id = plan.id` (`src/records.js:33-36`); the committed
  golden fixture proves the original intent was a distinct id (`"run-minimal-local"` vs actual
  `"plan-minimal-local"`); the contract requires run ID + attempt identity
  (`observability-records-contract-v0.md:74-81`). (b) Every event omits contract-required
  `actor`, `basis`, and redaction posture (:88-94); `init()` receives config+policy and
  records neither. (c) The implementation mints `run.denied`, `story.failed`, `story.skipped`,
  `status: success/failure` — none in the contract's families; the design's work-item table
  says it "mints no new event-type string" and models a failed evidence gate as `blocked`; the
  dry-run was to emit `evidence.modeled`, not `evidence.observed` (`runtime-design-m5a.md`
  OBS-002). (d) `run.stopped` is emitted for failure-aborted runs, while design defines
  `stopped` as a _resumable checkpoint_ with `stopped → resumed` the only legal continuation
  (`docs/design/core/orchestration.md:126-133`) — when Phase 4 implements resume on that
  meaning, every Phase-2 failure record becomes semantically wrong.
- Why it matters: records are durable and downstream-consumed; every phase that ships on this
  vocabulary raises the cost of honoring the contract later.
- Fix: give runs a real id (the directory suffix already is one); add `actor: "runner"` and a
  run-level binding block (policy/config refs); record the vocabulary mapping in an ADR
  (each implemented family/status ↔ contract vocabulary), explicitly including
  `run.stopped`-on-failure vs resumable-stop, `failed/skipped` vs `blocked`, and `observed` vs
  `modeled`.

**MF3. Make the golden run-record fixtures real, or remove them.**

- Severity: high (misleading evidence; violates the design's own evidence rule).
- Evidence: no test or script references any golden fixture (repo-wide grep);
  `golden-run-record-success.json` contradicts actual output (`run.id`, missing `mode`); the
  two Phase-2A-promised goldens (`golden-run-record-multi-success.json`,
  `golden-run-record-dependent-blocked.json`, phase-2a brief lines 101-102) were never
  created; design OBS-004 says "a golden run-record fixture is the canonical output artifact"
  and the M5a note's §15 is "the canonical fixture M5b's golden integration test asserts" —
  that test does not exist. PR #15 listed goldens under "Fixtures", implying they were live.
- Why it matters: the record shape is the seam; with no golden assertion, shape drift (MF2)
  sails through green CI — which is precisely how it already happened.
- Fix: one integration test that runs the CLI and asserts the full event sequence + `run.json`
  shape against regenerated goldens (timestamps normalized); add the two promised multi-item
  goldens; note in the fixtures README that the §15 authorization-triad fixture arrives with
  Phase 3.

**MF4. Fix the vacuous policy-denial CLI test and the silent-pass assertion pattern.**

- Severity: high (misleading evidence; a claimed review fix is unverified).
- Evidence: `test/cli.test.js:225-240` declares `local-policy-denied.json` but actually passes
  `invalid-plan.json` as `--policy`, dies at `loadPolicy` before any run exists, and executes
  **zero assertions**; c8 confirms the denial-display branches (`src/cli.js:124-128`,
  `src/records.js:75-79`) are never executed by the suite. Several CLI tests use
  `if (match) { assert… }` with no `else assert.fail` (`test/cli.test.js:18-27, 65-76,
102-122, 216-222`) — delete `src/cli.js:123-128` and the suite stays green.
- Why it matters: PR #16's fix for the denial-display blocker is effectively unreviewed; the
  pattern lets future regressions pass silently.
- Fix: use `local-policy-denied.json` as intended, assert the denial reason appears in both
  summary and inspect output, and convert every conditional assert to hard-fail.

**MF5. Close the evidence gate properly — value, not just presence — or record the gap,
before Phase 3 builds on it.**

- Severity: high (unsafe seam posture entering the phase that makes policy meaningful).
- Evidence: `src/harness.js:58-69` fails only on _missing_ evidence; `evidence: {result: null}`
  or even `{result: "failed"}` with `outcome: "success"` still records `story.done` — the
  worker's self-report outranks the evidence value, the inverse of MERGE-1 and of the design's
  `started → done` guard ("never the worker's self-report"). The PR #16 owner review asked for
  "missing **or malformed**" to fail; only "missing" was implemented. Additionally,
  plan-declared `doneEvidence` is parsed by fixtures but never read by the engine (grep: no
  consumer) — the plan's done conditions are decorative, and no doc records that.
- Why it matters: Phase 3's decision records will sit on this gate; a gate that codifies
  "outcome wins" is the exact anti-pattern the product exists to prevent.
- Fix: treat non-string/failed `evidence.result` mismatching `outcome` as failure with
  diagnostics + regression tests; record that `doneEvidence` is carried-but-unenforced until
  Phase 3.

**MF6. Bring `AGENTS.md` and `README.md` up to reality before the next agent-driven phase.**

- Severity: high for this org specifically (agents implement phases; the front door lies to
  them).
- Evidence: `AGENTS.md:27-31` — "no exports or CLI yet… package decomposition intentionally
  empty"; `AGENTS.md:23` — "docs/design/ — being authored next"; README `:27-29` same claim,
  `:63` design "(Next step.)", `:76-78` lifecycle diagram omits the PLANNING stage (org
  `ROADMAP.md:21-22` has five stages), `:21` emoji vs the repo's own "No emojis anywhere"
  (`AGENTS.md:43`). The false "no CLI" claim is repeated in five files including
  `skills/README.md` and `SKILL.md`. AGENTS.md never mentions `docs/delivery/` — the layer
  that actually governs current work — nor how to run the CLI or tests.
- Why it matters: the next agent session is instructed to trust AGENTS.md; it would
  "discover" or re-implement surfaces that exist and would miss the delivery docs entirely.
- Fix: rewrite the Status section (CLI exists: `jig run`/`jig inspect`, scripted-stub posture,
  dry-run only), add delivery/planning rows to the Ground-truth table, add run/test commands,
  fix the README diagram (+ add PLANNING), drop the emoji, update the skill's "before a real
  Jig CLI exists" framing.

## 6. Should fix soon

- **S1 — CLI defaults bake test fixtures into the product surface.** `src/cli.js:36-38`
  defaults `--config/--policy/--scripted-output` to `test/fixtures/...`, including a
  _permissive policy_ and a _canned success worker_; outside the checkout the CLI hard-fails
  on those paths (verified empirically). Require the flags (fail closed) or resolve defaults
  deliberately — at latest before Phase 3.
- **S2 — Path-safety regex is wrong.** `/[/\\..]/` (`src/plan-validator.js:18,34`) is a
  character class that rejects any id containing a single `.` with a misleading "path
  traversal" error (`plan-v1.2` fails). Fix the pattern, add tests.
- **S3 — Record the `allowLocalDryRun` ↔ ADR-0002 divergence.** Design decided an
  assisted/CFG-10 category-boundary posture; a boolean gate is neither grant/deny/route nor a
  category boundary; the divergence is named nowhere.
- **S4 — Late-dependency rule narrows the contract.** The validator requires topologically
  pre-sorted story arrays (`src/plan-validator.js:50-54`); both jig's contract and
  design-to-plan's specify a _graph_. Either document as a v0 input restriction in the
  contract or relax. Also: a plan produced per design-to-plan's own docs today (markdown
  medium) is not machine-acceptable — org-acknowledged, but worth an explicit line in the d2p
  seam status.
- **S5 — Run-directory collision.** `run-${plan.id}-${Date.now()}` + `mkdirSync recursive`
  silently merges two same-millisecond runs into one interleaved record
  (`src/records.js:17-19`).
- **S6 — Orphaned fixtures and a missing promised test.** Six fixtures referenced by nothing
  (including `local-policy-denied.json` and `scripted-worker-missing-evidence.json`, the two
  most safety-relevant); the Phase 1 brief's promised worker-privilege regression test
  (phase-1 brief line 132) was never written.
- **S7 — Enforce the coverage floor and decide the toolchain question.** AGENTS.md's own 90%
  floor is unenforced; coverage never runs in CI. Separately, jig is `REPO-STRUCTURE.md`'s
  _named reference implementation_ for the engine archetype (biome/tsc/vitest/90%) while
  shipping plain JS with none of that tooling — the JS-first choice is recorded nowhere. Note
  `lint` at `bcdf8ba` checks **no `.js` files at all** (prettier over md/yml/json only).
- **S8 — Give delivery acceptance criteria stable IDs.** `phases.md` ACs are un-ID'd prose;
  zero product/design ID references exist in `src/` or `test/` (grep, all 18 prefixes). ID the
  phase ACs (e.g. `P3-AC-1`) and cite them in test names/comments so the AC→test chain is
  mechanical.
- **S9 — Scope or extend the traceability ledger.**
  `docs/planning/design-track/traceability.md` has no rows for M5b delivery or PRs #13–16;
  either state its scope ends at the design track or add the delivery rows.
- **S10 — Stale org-side status prose.** `ROADMAP.md:88-99` ("author docs/design fresh…
  intentionally empty"), `MILESTONES.md:312,352-353` ("entry criterion 3 unmet; M5a closes
  it" — M5a landed), `profile/README.md:29`.

## 7. Later hardening

- `inspect` reads the `run.json` snapshot, never replays `events.jsonl` — a crashed run's
  durable events are uninspectable ("run.json not found"); design INV-006/ENF-003
  (projections-by-replay) and the RunStore port remain unrealized. Natural Phase 4 work.
- Terminology triple-split: ADR-0012 chose "work item"; contracts, briefs, code, and
  design-to-plan say "story"; CLI/delivery prose says "item"; "track" vanishes entirely at
  implementation. Decide whether ADR-0012 exempts seam contracts, and record it.
- `getArg` treats a following flag as a value (`--config --policy x.json` → configPath
  `"--policy"`); no distinct exit-code taxonomy; `bin/jig.js` drops stack traces; `mode` is a
  free string, unvalidated; stdout diagnostic always appends "…"; `records.js` lacks a
  dedicated unit-test file; `validator.test.js` naming vs `plan-validator.js`;
  `track.policyRef` in fixtures is a file path never resolved (plan-declared vs actual policy
  binding can diverge silently); package name `@agentic-workflow-kit/jig-repo` vs docs
  claiming `@agentic-workflow-kit/jig`; `driving.md` names seven operator actions (start,
  preview, watch, inspect, ask-why, decide, stop) — the CLI realizes two; fine phased, but
  keep the action names aligned (`run` vs design's "start").

## 8. Per-area reviews

### Product/design clarity

**Product: strong, and specific enough to prevent invention.** Audience, job, non-fit,
workflow, and boundaries are all answered concretely; the five guarantees are fully ID'd with
honest edges; deferrals ("What Jig isn't (yet)") are explicit; the state vocabulary
(landed/done/rejected/blocked/parked per story, stopped per run) is clean and consistently
used. The one product-layer staleness: `docs/product/jig.md:200-202` still calls design
"Forthcoming", and `docs/product/concepts.md:57` says design "sometimes calls this unit a
task" (design actually chose "work item", ADR-0012).

**Design: disciplined and mostly implementable — the docs are not the source of the drift.**
The charter's boundary/stub/deliverable rules, the closed run and work-item transition tables,
the two v0 contracts with deliberate non-freeze, and the ADR log are all at correct altitude.
Implementers who read them were left _little_ room to guess — the implementation diverged from
them, not because of gray areas but because the delivery reframe didn't carry the design's
expectations forward. Real design-side gray areas worth closing: (1) `evidence.observed` vs
`evidence.modeled` — the contract example uses one, the M5a note reserves the other for
dry-runs; the design layer itself is split, which is exactly where the implementation picked
wrong; (2) the records contract demands actor/basis/redaction on "every governed event family"
at v0 while delivery treats them as later hardening — say which reading is correct; (3)
design's `blocked` covers failed-evidence-gates by explicit modeling decision, which no
delivery doc restates — the term collision with implementation-`blocked` (dependency-only)
started here.

### Planning traceability

Product→design→wave-6 phasing is a genuinely well-cited chain: the charter accounts for all
47 IDs; contracts derive properties from named guarantees; wave-6 forbade minting new
states/event strings and sequenced authorization and preview _before_ the runnable slice. The
break is the reframe seam (PR #13): it preserved Wave 5 gates as stop conditions (good) but
inverted Wave 6's ordering, dropped preview entirely (no feature-inventory row, no phase
requirement, no deferral note), and never mentions the org M5 exit criteria or the
seam-posture table it re-scopes. Below the reframe, briefs→code traceability is strong —
Phase 1/2A/2B code matches its briefs almost exactly, and the briefs' "must not decide"
sections were honored (no parallelism, no DAG optimizer, no design edits, no schema freeze).
Delivery-layer inventions are split: the well-recorded (stop-after-first-failure/ISO note —
exemplary; `failed/skipped` minting — named in the brief; late-dependency rule — named) and
the unrecorded (`run.denied`, `evidence.observed`-for-modeled, run-identity collapse, missing
causality fields, ADR-0002 policy-posture divergence, preview's disappearance). Deferred work
is otherwise captured properly in `feature-inventory.md` phase placements rather than code
TODOs (zero TODO/FIXME in source).

### Implementation

Correct for what the briefs asked: dependency-aware sequential execution, transitive blocking,
multi-output scripted worker with backward compatibility, durable two-file records,
inspect-from-records, clear validation diagnostics, all prior review blockers at least
code-fixed (see §10). Module altitude is sensible
(validator/harness/worker/records/loaders/cli), inputs are never mutated, errors are explicit,
and the fail-closed policy default in the harness is right. The test suite's 93% coverage
overstates its evidentiary value: happy-path harness tests assert only status strings against
no-op record managers, event assertions are existence checks (`find`) rather than sequence
assertions, golden fixtures are inert, six fixtures are orphaned, and two tests can pass with
zero assertions executed. The suite currently proves the code runs more than it proves the
documented behavior — the gap between those two is exactly where MF2–MF5 live.

### Repo configuration

Mechanically aligned with the org template (CI workflow byte-identical;
engines/devEngines/.nvmrc/supply-chain config exact; single required `pnpm check` gate wired
locally and in CI) and navigationally excellent (docs/README altitude index accurate;
1451/1451 links resolve). The failures are concentrated in the two front-door files and the
gate's teeth: `AGENTS.md`/`README.md` describe a pre-Phase-1 repo (no CLI, design "next") and
omit `docs/delivery`/`docs/planning` entirely; `lint` is prettier over md/yml/json only — no
`.js` file is checked by anything; no typecheck; the c8 `coverage` script has no thresholds
and never runs in CI, contradicting AGENTS.md's own stated 90% floor; `delivery:check`
validates only that a README contains convention prose. The skills are boundary-correct but
describe a pre-CLI world. Node/pnpm/corepack setup, fixture organization, and the worktree
scripts are all sound.

### Cross-repo seams

Boundary architecture holds: jig consumes only published contracts (technical-design handoff
format, define-product citations), design-to-plan cites jig's seam docs at their correct
paths, the skill preserves executor posture, and risky approvals stay human-owned. Three
seam-edge violations: (1) `.github/ROADMAP.md:47-48` — the org's pointers to _both_ jig-owned
seams cite paths that no longer exist; (2) the M5b reframe silently weakens org-owned M5 exit
criteria without the mandated route-back (the most serious governance breach found); (3) the
input seam is drifting in both directions — jig's validator enforces rules neither contract
names (topological ordering, dot-free ids) while accepting plans that violate both contracts
(no track, intent, scope, or evidence — jig's own shipped `multi-item-plan-success.json` fails
jig's own contract doc), and the output seam omits required binding/causality properties while
minting unnamed states. Terminology: `story` (contracts, code, d2p) vs `work item` (ADR-0012,
providers.md) vs `item` (CLI, delivery prose) is a live three-way split; other core terms
(plan, run, policy, evidence, dry-run) are used consistently across repos.

## 9. Org-M5 exit criteria at `bcdf8ba`

| Org M5 exit criterion (`.github/MILESTONES.md:353-363`)            | Status      | Evidence                                                                            |
| ------------------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------- |
| Validates **and previews** a plan                                  | **PARTIAL** | Validation real (`src/plan-validator.js`); no preview surface exists                |
| Dry-run executes without privileged action                         | MET         | Scripted worker only; no push/PR/merge paths in code                                |
| Fence emits `requested → authorized/denied → runner-owned` records | **NOT MET** | "Fence" is one boolean (`src/harness.js:14-22`); no triad events anywhere           |
| Records match the M1 shape                                         | **PARTIAL** | Two-file records exist; identity/vocabulary/causality drift (MF2)                   |
| Named, inspectable states                                          | MET         | `jig inspect` over durable records; states named in output                          |
| `check` grows to lint+typecheck+test, 90%+ TDD coverage            | **PARTIAL** | No typecheck; lint covers no `.js`; coverage has no thresholds and never runs in CI |

## 10. PR #16 blocker verification

The PR #16 owner review (blocking in substance) plus the Codex review raised 8 distinct
blockers across 12 review threads (all threads resolved before merge). Verification of each
against merged `bcdf8ba`:

| #   | Blocker                                                | Verified state at `bcdf8ba`                                                                                                                                               |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CI failing / PR-body validation claim false            | **Fixed** — CI green at merge; `corepack pnpm check` reproduced green (42/42)                                                                                             |
| 2   | Success recordable without evidence (harness)          | **Partially fixed** — missing evidence now fails; _malformed_ evidence still passes (`result: null`/`"failed"` with `outcome: "success"` → `story.done`). See MF5         |
| 3   | Duplicate story IDs accepted (validator)               | **Fixed and verified** — rejection + tests                                                                                                                                |
| 4   | Falsy non-array `dependsOn` accepted (validator)       | **Fixed and verified** — `Object.hasOwn` presence check + tests                                                                                                           |
| 5   | `jig inspect` hides run-level denial reasons           | **Code-fixed, unverified** — display branches exist (`src/cli.js:124-128`, `src/records.js:75-79`) but the covering test is vacuous and c8 shows them unexecuted. See MF4 |
| 6   | Test mutates/deletes a committed fixture               | **Fixed** — fixture no longer written/deleted by tests                                                                                                                    |
| 7   | Broken implementation-brief relative links             | **Fixed** — 1451/1451 links resolve                                                                                                                                       |
| 8   | Stop-after-first-failure needed an ISO-divergence note | **Fixed** — phase-2a brief lines 73-76; the model for recording deliberate divergence                                                                                     |

## 11. Remediation mapping

The findings above were converted into an approved remediation plan (this report is its first
deliverable). Mapping of each finding to its remediation home:

| Finding                                                                                                | Remediation home                                                                      |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| MF1 org-M5 reconciliation                                                                              | New delivery track README (exit-criteria map) + org `.github` PR                      |
| MF2 records-seam drift                                                                                 | ADR-0018 + contract amendments (docs); run identity/`actor`/binding fields → Phase R  |
| MF3 golden fixtures dead/stale/missing                                                                 | Phase R (golden-record integration test + regenerated goldens)                        |
| MF4 vacuous denial test + conditional asserts                                                          | TS-migration PR (the two mandated test-only repairs)                                  |
| MF5 evidence gate presence-only                                                                        | Phase R (value/shape validation + regression tests); gap recorded in contract docs    |
| MF6 stale front-door docs                                                                              | Front-door docs PR (AGENTS.md, README.md, skills)                                     |
| S1 CLI fixture defaults / S2 path regex / S5 run-dir collision / S6 orphaned fixtures + privilege test | Phase R                                                                               |
| S3 ADR-0002 divergence / S4 late-dependency contract note                                              | ADR-0018 + contract amendments                                                        |
| S7 coverage floor + toolchain decision                                                                 | TS-migration PR (engine archetype: biome + tsc + vitest with enforced 90% thresholds) |
| S8 AC IDs / S9 traceability ledger scope                                                               | New delivery track (stable AC IDs; ledger scope note)                                 |
| S10 stale org prose                                                                                    | Org `.github` PR                                                                      |

"Phase R" is the remediation phase that opens the recreated delivery track — behavior-visible
code fixes are deliberately routed there rather than mixed into the behavior-preserving TS
migration.

## 12. Final recommendation

**Ready after must-fix items.**

The foundation is real: product and design are precise, internally consistent, and traceable,
and the implementation honors its briefs. The must-fix list is about restoring the recording
discipline the repo's own rules demand — reconcile the reframe with org M5, stop the
records-seam drift, and make the evidence layer actually assert — plus contained code/test
fixes. None of it requires another product/design pass; all of it gets disproportionately more
expensive once Phase 3 starts writing decision records on top of the current seams.
