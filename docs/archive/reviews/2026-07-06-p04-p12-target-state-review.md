---
title: P04-P12 target-state implementation review
date: 2026-07-06
commit: a239986 (main, after PR #71 squash-merge)
verdict: Not ready — blocking findings open
status: point-in-time record
---

# P04-P12 target-state implementation review — 2026-07-06

> **Point-in-time record.** Every file, line, and commit reference in this document is pinned to
> commit `a239986` (main, after the PR #71 squash-merge), audited 2026-07-06. This record is the
> verification baseline for a remediation program: findings carry stable IDs F1-F12 that later
> PRs cite when they close them. Do not renumber or reuse these IDs.

## 1. Scope and method

A point-in-time review of merged phases P04-P12 of the target-state implementation track (jig
PRs #63-#71), audited against
[`docs/delivery/target-state-implementation/`](../../delivery/target-state-implementation/README.md)
— the tracker, [`verification.md`](../../delivery/target-state-implementation/verification.md),
and phase docs 04 through 12.

**Method:** coordinator gate/CI/PR-state verification plus five bounded per-phase evidence
readers. The coordinator independently re-ran `corepack pnpm check` / `corepack pnpm test`
locally against `a239986`, read source and test files directly, walked `git log`/`git show`/
`git diff` across the PR range, and cross-checked GitHub Actions run state and PR-body claims
against what the readers reported. Per-phase readers were scoped to one phase each (P04, P05,
P08/P09 jointly for record-vocabulary coordination, P10, P11/P12 jointly) and required to cite
file:line or commit evidence for every claim.

## 2. Findings register

| ID  | Severity                          | Summary                                                                                                                                      |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | blocking (correctness/gate)       | Gate red on main since PR #69: branch coverage below the enforced 90% floor.                                                                 |
| F2  | blocking (correctness/compliance) | P09 live-decide unmet: `decide()` refuses live parked runs, contradicting the phase's own stated intent.                                     |
| F3  | blocking (compliance/evidence)    | P05 (#64) merged past its own unmet merge gate; MERGE-5 end-to-end proof remains open and unqualified in front-door docs.                    |
| F4  | blocking-docs + evidence owed     | P11's numbered Acceptance Criteria still specify a successful EVRUN-full demonstration the phase doc's own prose now disclaims.              |
| F5  | docs/status                       | Track front page and P11/P12 frontmatter claim less progress than `main` (status-flip daisy-chain).                                          |
| F6  | docs drift                        | `driving.md` enumerates 8 operator verbs; the shipped port and ADR 0033 define 10.                                                           |
| F7  | docs drift                        | Track README's open-questions ledger says resume placement is unsettled; ADR 0033 already resolved it.                                       |
| F8  | code                              | P04's required negative-egress probe is hardcoded to always report failure, with no recorded escalation.                                     |
| F9  | code (latent)                     | `createRealExecutionHost` skips substrate validation when no manifest is supplied; latent because the shipped CLI always supplies one.       |
| F10 | code (non-AC obligation)          | P10's "surface export in inspect/ask-why vocabulary" obligation has no wiring.                                                               |
| F11 | test                              | P08's named integration test (watching a run from a second process) was never added; the stalled-worker signal is not live threshold-driven. |
| F12 | process                           | Rules requiring recorded human acts were approximated while mechanically-gated rules held.                                                   |

### F1 (blocking, correctness/gate)

Gate red on main since PR #69 (commit `95f5fd8`): branch coverage fails the enforced 90% floor
configured in `vitest.config.ts` (`thresholds: { statements: 90, branches: 90, functions: 90,
lines: 90 }`, confirmed at `a239986`).

Per coordinator audit evidence, GitHub Actions `check` runs `28761508259` (95f5fd8), `28762086569`
(e5d1557), and `28763469413` (a239986) all report conclusion `failure`; the last green `main` run
was `28760840067` (506d3d2). The coordinator's own audit ran `corepack pnpm check` twice on
`a239986` and recorded branch coverage 89.94% (2479/2756) — below the floor — attributing the
failure to jitter in v8's branch-coverage counting: PR bodies record 90.13% on #66, 90.24% on
#68, and 90.09% on #69, all riding the floor with effectively zero headroom.

Per-file culprits at `a239986` (statement/branch/function percentages verified against a local
coverage run in this worktree): `export.ts` 84.61% branches, `harness.ts` 82.16% branches,
`jig-mcp/src/server.ts` 85.71% branches, `jig-mcp/src/stdio.ts` 0% statements, `confinement.ts`
70% functions. This violates [`verification.md`](../../delivery/target-state-implementation/verification.md#the-gate)
"The gate" and ["Definition of delivered"](../../delivery/target-state-implementation/verification.md#definition-of-delivered)
item 2.

**Limitations note:** four independent local runs of `corepack pnpm test` in this worktree on
`a239986` (macOS, this review's environment) produced branch coverage 90.02% (2481/2756), exit
code 0 — passing, not failing — with the same set of per-file culprits (export.ts, harness.ts,
jig-mcp/server.ts, stdio.ts, confinement.ts all identically weak). This local number sits exactly
one branch above the 90% floor (90% of 2756 = 2480.4, so 2480/2756 = 89.98% still fails; 2481/2756
= 90.02% passes) — a two-branch spread from the coordinator's reported 2479/2756. This is
consistent with the floor-riding/cross-platform-jitter mechanism the finding describes (the CI
runners are Linux; this review's local runs are macOS) rather than a refutation of it: the gate
has effectively zero headroom, and three consecutive red CI runs on `main` are the operative
fact this finding rests on. The CI run IDs, PR-body percentages, and the "two local runs at
89.94%" figure are per coordinator audit evidence and were not independently reproduced in this
review's environment.

### F2 (blocking, correctness/compliance)

P09 live-decide unmet. [`phases/09-owner-decision-and-run-control.md`](../../delivery/target-state-implementation/phases/09-owner-decision-and-run-control.md)
"What To Do" states that a decision on a live run unblocks it, and a decision on an interrupted
run is picked up by resume (DOOR-2). The shipped `decide()` instead refuses live parked runs
with `no-routed-decision`.

Verified in this worktree: `packages/jig-sdk/src/projection.ts` derives `safeCheckpoint` in
exactly one place, the `run.stopped` handling branch (line 670, `safeCheckpoint =
parsedEvent.event.checkpoint;`); every other branch either leaves it `undefined` or explicitly
resets it to `undefined` (lines 611, 637). `packages/jig-sdk/src/harness.ts`'s
`latestStopRequest()` (~line 302) only tracks `operator-action.requested`/
`operator-action.refused` stop records, polled during live batched and sequential execution
(~lines 600, 635) and during resume (~line 873) — it never observes `owner-decision.recorded`
events (emitted at harness.ts line ~292). `packages/jig-sdk/src/sdk.ts`'s `decide()` (line 602)
refuses with `no-routed-decision` whenever `projection.lifecycleState !== 'stopped'` — i.e.,
whenever the run has not already halted via `run.stopped`. The shared test fixture
`writeObservationRun` (`packages/jig-sdk/tests/sdk.unit.test.ts`, lines 108-155) that every
`decide()` test in that file builds on pre-seeds a `run.stopped` event before any decision is
attempted, so no test exercises a live-parked decide.

Per coordinator audit evidence: PR #68 merged 2026-07-06T00:48:07Z (this review confirms
`506d3d2`'s recorded commit time as 2026-07-06T03:48:04+03:00 = 00:48:04Z, consistent within
commit-vs-merge-button granularity), three minutes before its single automatic Codex review
(00:51:02Z); that review's P2 finding (`discussion_r3525960759` on `packages/jig-sdk/src/sdk.ts`
~602) identified exactly this and remains unresolved. Undisclosed in ADR 0031 and all status
docs. Violates [`verification.md`](../../delivery/target-state-implementation/verification.md#merge-checklist)
merge-checklist item 8 (threads resolved) and the phase's own stated intent.

### F3 (blocking, compliance/evidence)

P05 (#64) merged past its own unmet merge gate. Per coordinator audit evidence, the PR body
records: real PR creation and commenting succeeded against
`agentic-workflow-kit/jig-smoke-target`; commit-status write/read failed HTTP 403; held-merge
posture unproven (the target repo merged immediately — no branch protection); and the PR body
declares this phase "needs either a status-capable token plus protected/merge-queue target
rerun, or explicit phase-owner acceptance of the remaining smoke gaps recorded here." Neither
disjunct occurred: per coordinator audit evidence, zero PR comments exist on #64, all three
review threads address unrelated code findings, and the phase doc records no escalation.

Verified locally in this worktree: no committed evidence record exists under
`docs/design/evidence/` for the P05 smoke (only `2026-07-04-evrun-partial-smoke.md` and
`2026-07-06-evrun-full-capture-attempt.md` exist there). Root `README.md` (line 42), `AGENTS.md`
(lines 47-48), and `docs/README.md` (lines 26-27) all assert "blocked-PR surfacing, held-merge
replay safety, landing-path redaction, and origin-bearing work-source provenance" unqualified.
The track README's known-conflicts section still carries the MERGE-5 entry verbatim: "The product
guarantees blocked-PR surfacing; the EVRUN-partial record explicitly does not claim `MERGE-5`,
and only unit-level coverage exercises the forge adapter's block-surfacing primitives — no
end-to-end real-effect proof exists. P05 owns closing or explicitly re-scoping this gap" (line
341-344) — unchanged since P05 merged. MERGE-5 end-to-end proof therefore remains open. Violates
[`verification.md`](../../delivery/target-state-implementation/verification.md#merge-checklist)
merge-checklist item 3 and the evidence-record convention.

### F4 (blocking-docs + evidence owed)

P11 internal contradiction. Verified via `git diff 90126c0 e5d1557 --
docs/delivery/target-state-implementation/phases/11-evrun-full-evidence.md`: PR #70 honestly
re-scoped the phase doc's frontmatter status (`planned` to `"pr #70 — blocked evidence record"`),
Overview ("The implemented P11 record is an honest blocked capture attempt..."), Why ("Attempts
the EVRUN-full gate" rather than "Closes"; "The implemented blocked capture attempt does not
unlock P13..."), and Dependencies ("Would unlock: P13 (hard) and P14 status claims only after
EVRUN-full evidence or an explicit owner deferral decision" rather than "Unlocks: P13 (hard);
authorizes P14's status claims") — conservative, no P13/P14 overclaim. The diff stops exactly at
the `## Acceptance Criteria` heading: that numbered block received zero edits and still specifies
a successful EVRUN-full demonstration (item 2: "real Codex editing through the owned app-server
transport; real, exercised confinement with honest strength; an adversarial no-phone-home
observation; and multi-run idempotency against a real landed effect").

The committed evidence record
`docs/design/evidence/2026-07-06-evrun-full-capture-attempt.md` is conventions-§6-complete: dated
header (`date: 2026-07-06`), exact tool versions (Node v26.4.0, pnpm 11.9.0, gh 2.87.2, Git
2.53.0, Codex CLI 0.142.5, host Darwin 25.5.0), a transcript SHA-256
(`7162927f31dfbbda7a1508e4e9116fc2d942c7d8c251070d0fd8cc4af7e93515`) that this review
independently recomputed against the committed file
`docs/design/evidence/raw/evrun-full-p11/2026-07-06-capture-transcript.md` and confirmed matches
exactly, a `## Limitations` section, a `## Redaction` section, and citations to the
guarantee/AC IDs it does and does not support (`SEC-2`, `RESUME-3`, `MERGE-2`/`FENCE-3`
explicitly disclaimed). The record explicitly does not claim EVRUN-full. EVRUN-full capture is
still owed.

### F5 (docs/status)

Track front page claims less progress than `main`. Verified in this worktree at `a239986`:
`docs/delivery/target-state-implementation/README.md` line 9 reads "P12 is open in PR #71" and
the phase-table P12 row reads `pr #71` (line 294); `phases/11-evrun-full-evidence.md` frontmatter
reads `status: "pr #70 — blocked evidence record"` while the table row reads
`merged (#70; blocked evidence)`; `phases/12-mcp-adapter.md` frontmatter reads `status: "pr #71"`.

Root cause verified per-commit via `git show <sha> --
docs/delivery/target-state-implementation/README.md`: every PR in the batch wrote
`implemented (#N)` (or `PR #N`) on its own phase-table row and relied on the next phase's PR to
flip it to `merged` — a daisy-chain that violates
[`verification.md`](../../delivery/target-state-implementation/verification.md#docs-checks)'s
same-PR status-flip rule and left the tail stale:

- `ec82f32` (P04, #63) wrote `implemented (#63)`
- `3b35eee` (P05, #64) wrote `implemented (#64)`
- `84ff7e0` (P06, #65) wrote `implemented (#65)`
- `1c1b9ff` (P07, #66) flipped P04/P05/P06 to `merged` and wrote P07 as `implemented (#66)`
- `f594e00` (P08, #67) flipped P07 to `merged` and wrote P08 as `implemented (#67)`
- `506d3d2` (P09, #68) flipped P08 to `merged` and wrote P09 as `PR #68`
- `95f5fd8` (P10, #69) flipped P09 to `merged` and wrote P10 as `PR #69`
- `e5d1557` (P11, #70) flipped P10 to `merged` and wrote P11 as `PR #70 (blocked evidence)`
- `a239986` (P12, #71) flipped P11 to `merged (#70; blocked evidence)` — but nothing flips P12,
  leaving it, the README header, and both P11/P12 frontmatter lines stale.

### F6 (docs drift)

Verified in this worktree: `docs/design/contracts/driving.md` line 17 ("The deliberate driving
actions: start, preview, watch, inspect, ask-why, decide, stop, export.") and line 133 ("The
driving action set is: start, preview, watch, inspect, ask-why, decide, stop, and export.") both
enumerate exactly 8 verbs. The shipped `JigOperatorControlPort`
(`packages/jig-sdk/src/sdk.ts`, lines 153-164) defines 10: `preview`, `start`, `inspect`,
`watch`, `askWhy`, `acknowledgeNotice`, `snoozeNotice`, `decide`, `stop`, `export` — ADR 0033
(`docs/design/decisions/0033-mcp-adapter-package.md`) confirms this 10-verb surface. P12's MCP
adapter correctly followed the real port; `driving.md` is stale (missing notice-ack and
notice-snooze).

### F7 (docs drift)

Verified in this worktree: `docs/delivery/target-state-implementation/README.md` lines 359-363
still read "Resume placement is also unsettled at the driving boundary... P01 and P12 must route
whether resume is a driving action, recovery API, or CLI-only recovery surface before exposing it
as an operator-control port verb." ADR 0033 already resolved this — its own text states (line 38)
"...expose `resume` in this phase because resume is on the SDK recovery surface, not the
[operator-control port]." The code enforces the split: `packages/jig-sdk/src/sdk.ts` defines
`JigOperatorControlPort` (lines 153-164, no `resume`) and a separate `JigRecoverySurface`
interface (lines 166-168, `resume` only), composed together in `JigSession` (lines 170-173).

### F8 (code)

Verified in this worktree: P04's phase doc required "a negative-probe egress check" (per
coordinator audit evidence). `createMacosProcessGroupConfinementProbe`
(`packages/jig-sdk/src/providers/real/confinement.ts`, function starting line 224) has a single
code path — one `try` block with one `return` statement (the object spans lines 274-284) — that
hardcodes `negativeEgressProbePassed: false` (line 279) unconditionally; the value cannot be
`true` under any input to this function. The capability was silently no-oped with no recorded
escalation found in the phase doc or ADR log. Also needed for EVRUN-full's no-phone-home leg (see
F4).

### F9 (code, latent)

Verified in this worktree: `createRealExecutionHost` (`packages/jig-sdk/src/providers/real/host.ts`,
function starting line 42) validates the probe substrate request only inside `if
(options.substrateManifest) { validateSubstrateRequest(options.substrateManifest, request); }`
(lines 46-47) — calling it directly without a manifest bypasses validation entirely.
`packages/jig-sdk/src/bootstrap.ts` (lines 205-211) shows the shipped CLI composition path always
resolves and passes a `substrateManifest` before calling the execution-host selector, so the hole
is latent (unreachable from the shipped CLI), not live.

### F10 (code, non-AC obligation)

Per coordinator audit evidence, `phases/10-export-audit-record.md`'s "What To Do" asks to surface
export in inspect/ask-why vocabulary, attributably. Verified in this worktree: `askWhy`'s
implementation (`packages/jig-sdk/src/sdk.ts`, line 554) contains no reference to export records
or export events, and no `inspect`-path code references export state. No wiring exists in the
inspect/ask-why paths.

### F11 (test)

Verified in this worktree: `phases/08-observation-surfaces.md` "## Verification" (lines 109-112)
names "an integration test driving a run and watching it from a second process." No such test
exists — a repo-wide search for a dedicated watch integration test or a `spawn`/`child_process`/
`fork` pattern in `packages/jig-sdk/tests/*.int.test.ts` or `packages/jig-cli/tests/*.int.test.ts`
found none. Separately, the phase doc's Acceptance Criteria item 1 (line 95-96) requires `watch`
to classify "a stalled worker via the LIVE-1 signals"; no string `stalled` appears anywhere in
`packages/jig-sdk/src/` or its tests — the mechanism that exists is a projection-computed
liveness/threshold classification, not a live-observed, threshold-driven "stalled" signal
matching the phase doc's own vocabulary.

### F12 (process)

Per coordinator audit evidence and this review's own findings above: rules requiring recorded
human acts were approximated while mechanically-gated rules held. #68 merged before its hosted
review arrived (F2); three consecutive red main CI runs went unnoticed with no post-merge watch
(F1); coverage merged with no headroom above the floor (F1); the status-flip rule as written
("flip to merged pre-merge... open the PR first, then push a status commit citing the exact
number") drove agents to invent the "implemented" daisy-chain rather than waiting for the next
phase (F5). `verification.md` needs enforceable teeth: a review-arrival gate before merge, a
post-merge main-branch CI watch, an enforced coverage-headroom margin above the floor (not just
the floor itself), and a rewritten status-flip rule that does not depend on a future PR to close
the loop.

## 3. Per-phase scorecard

Clarity: how precisely the phase doc states its obligations. Match: how faithfully the shipped
PR fulfills those obligations. Both on a 1-5 scale; justification derived from the findings
above.

| Phase | Clarity | Match | Justification                                                                                                                                                                                                                                                               |
| ----- | ------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P04   | 4/5     | 3/5   | Honest weak-posture reporting (`weak`/`none`, never overclaimed), but the required negative-egress probe is silently hardcoded to always fail with no recorded escalation (F8); the substrate-manifest validation gap is latent but real (F9).                              |
| P05   | 4/5     | 2/5   | Real forge/work-source wiring landed, but the phase's own PR-body-declared merge gate went unmet and unescalated, and MERGE-5 remains unqualified in front-door docs (F3).                                                                                                  |
| P06   | 4/5     | 5/5   | No findings raised against this phase in this review.                                                                                                                                                                                                                       |
| P07   | 5/5     | 5/5   | No findings raised against this phase in this review.                                                                                                                                                                                                                       |
| P08   | 3/5     | 4/5   | The named second-process watch integration test was never written and the "stalled" vocabulary in the AC does not match the shipped liveness mechanism (F11); the shipped surface itself is otherwise sound.                                                                |
| P09   | 3/5     | 3/5   | The phase doc's own stated intent (live-run decisions unblock in place) is contradicted by the shipped `decide()`, which only accepts decisions on already-stopped runs (F2); merged ahead of its own hosted review.                                                        |
| P10   | 4/5     | 5/5   | No findings raised against the export mechanism itself; F10 is a doc-vocabulary wiring gap (inspect/ask-why attribution), not a defect in export.                                                                                                                           |
| P11   | 3/5     | 3/5   | The re-scoping of Overview/Why/Dependencies to an honest "blocked capture attempt" is a model of conservative disclosure, but the numbered Acceptance Criteria were left describing the unmet full demonstration, an internal contradiction within the same phase doc (F4). |
| P12   | 4/5     | 5/5   | Correctly implements the real 10-verb operator-control port; the status-flip daisy-chain (F5) and stale `driving.md` (F6) are track-level and pre-existing docs debt, not P12 defects.                                                                                      |

## 4. What held

- **Golden-record byte-stability.** Verified via `git log --oneline c151331..a239986 -- <file>`
  for all four golden fixtures under `tests/fixtures/m5b-local-mvp/`
  (`golden-run-record-success.json`, `golden-run-record-dependent-blocked.json`,
  `golden-run-record-canonical-triad.json`, `golden-run-record-multi-success.json`): zero commits
  touched any of them across the full P04-P12 range. Byte-identical confirmed.
- **Hosted Codex reviews caught real pre-merge bugs.** Per coordinator audit evidence
  (PR #69 review threads), an export redaction leak of event-derived diagnostics into audit
  artifacts and a run-id path-traversal issue were both found and fixed. Verified locally from
  reachable squash commit `95f5fd8` (PR #69): it introduces
  `redactedProjectionForExport()` in [`packages/jig-sdk/src/export.ts`](../../../packages/jig-sdk/src/export.ts#L182)
  and `filenameSafeRunId()` in the same file
  ([lines 186-193](../../../packages/jig-sdk/src/export.ts#L186)), and the reachable tests at
  [`packages/jig-sdk/tests/sdk.unit.test.ts`](../../../packages/jig-sdk/tests/sdk.unit.test.ts#L536)
  and [line 616](../../../packages/jig-sdk/tests/sdk.unit.test.ts#L616) verify projection redaction
  and sanitized artifact paths. Per coordinator audit evidence (PR #63 thread), a compose-time
  substrate-denial recording gap was found and fixed; verified locally from reachable phase commit
  `ec82f32` and the current tree: `createJigSession()` now routes
  `SubstrateAuthorizationError` through `recordComposeTimeSubstrateFailure()` in
  [`packages/jig-sdk/src/sdk.ts`](../../../packages/jig-sdk/src/sdk.ts#L376), and the reachable
  regression test
  [`P04-AC-3: compose-time real-host substrate rejection is recorded as a diagnosable stopped run`](../../../packages/jig-sdk/tests/sdk.unit.test.ts#L807)
  proves the blocked-story / `run.stopped` record path.
- **ADRs recorded in the same PRs as their implementations.** Verified: ADRs 0029-0033
  (`docs/design/decisions/0029-guided-setup-placement.md` through
  `0033-mcp-adapter-package.md`) all exist at `a239986`, aligned with P07/P08/P09/P10/P12
  respectively.
- **P04-P12 delivery worktrees cleaned up post-merge.** Per coordinator audit evidence; not
  independently re-verified by this review (the worktrees active at review time belong to a
  separate, later remediation effort, not the P04-P12 delivery phases this record audits).
- **EVRUN-full language conservative everywhere it was checked** (F4's Overview/Why/Dependencies
  re-scope; the evidence record's explicit non-claims).
- **P04's smoke asserts observed success, not a refusal envelope** — per coordinator audit
  evidence, the P03-remediation lesson (that a fail-closed refusal must not be accepted as
  proof of the asserted outcome, per
  [`verification.md`](../../delivery/target-state-implementation/verification.md#conformance-and-testkit-posture))
  held for P04.

## 5. Pattern lesson

Obligations enforced by the gate were honored: lint, format, typecheck, boundary checks, and
link checks all pass cleanly at `a239986` (verified during this review's local checks), and the coverage floor,
while breached (F1), was breached by a hair rather than abandoned. Obligations requiring recorded
human decisions were approximated instead of met: a merge proceeding before its own review
arrived (F2), a merge proceeding past its own stated unmet gate with no escalation (F3), and a
status-flip convention that depends on a future actor closing the loop rather than the current
PR closing it (F5). Prose promises stated outside the numbered Acceptance Criteria blocks were
the ones most often dropped: P09's live-decide intent (F2), P04's negative-egress probe (F8),
P10's inspect/ask-why export wiring (F10), and P08's second-process watch test (F11) were all
stated in "What To Do," "Background," or "Verification" prose rather than in a numbered AC, and
all four were not delivered.

## 6. Limitations

- **Point-in-time.** This record is pinned to `main` at commit `a239986` (2026-07-06). Paths,
  line numbers, and status claims may have moved since; do not update this document to match a
  later state — open a new dated review instead.
- **Reader claims re-verified selectively.** Five bounded per-phase evidence readers supplied the
  initial claims; the coordinator re-verified the file:line, commit, and diff evidence cited
  above directly against the repository, but did not re-derive every reader observation from
  first principles.
- **PR-branch CI coverage numbers taken from PR bodies.** The 90.13%/90.24%/90.09% branch-coverage
  figures for PRs #66/#68/#69 (F1) are per coordinator audit evidence from PR body text, not
  independently reproduced by this review (the PR branches no longer exist as checkable refs
  after squash-merge).
- **GitHub-hosted state not independently observable.** CI run IDs and conclusions (F1), PR-body
  quotes (F3, F1), and review-thread/discussion IDs (F2, F3, F12) were not fetched live by this
  review and are attributed to coordinator audit evidence throughout.
- **F1's local reproduction diverges from the coordinator's reported number.** See the
  Limitations note embedded in the F1 write-up above: this review's environment (macOS, this
  worktree) produced a passing branch-coverage number one branch above the floor, not the
  coordinator's reported failing number two branches below it. Both are consistent with a gate
  that has effectively zero headroom; neither number should be treated as the authoritative
  figure without a fresh CI run.

## 7. Closure resolution log (current `main` after PR #79)

> **Added 2026-07-06 as a separated closeout log.** The audit above stays pinned to
> `a239986`. This section records the later remediation state verified on current `main` at
> `98993ff` (`test: capture evrun full smoke evidence (#79)`), using only post-audit repo
> evidence now present on `main`.

| ID  | Status | Current-main closure evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | fixed  | PR #72 / `0dfb9d0` (`test: restore branch-coverage headroom above the gate floor`) added the missing branch-coverage headroom back into the test corpus, and current [`verification.md`](../../delivery/target-state-implementation/verification.md) now codifies both the 90.5% headroom rule and the post-merge watch that this finding said were missing.                                                                                                                                       |
| F2  | fixed  | PR #74 / `81d5664` (`fix: support live parked decisions`) rewired the live parked decision path in `sdk.ts`, `harness.ts`, `projection.ts`, and `resume.ts`; current tests include `P09-F2: decide routes a live parked run instead of refusing` in `packages/jig-sdk/tests/sdk.unit.test.ts`.                                                                                                                                                                                                     |
| F3  | fixed  | This follow-up added [`docs/design/evidence/2026-07-06-p05-held-merge-smoke.md`](../design/evidence/2026-07-06-p05-held-merge-smoke.md), which records a real protected-branch `done-not-landed` / `held-by-review` merge plus readable PR/status/comment block surfacing against `agentic-workflow-kit/jig-smoke-target`. The earlier PR #78 / `dcffa56` success-path `open-pr` rerun remains provenance for the first half of the evidence gap. `MERGE-5` is now backed by real-effect evidence. |
| F4  | fixed  | PR #79 / `98993ff` updated P11 from an internally contradictory blocked-capture posture to a reconciled combined-smoke posture in [`phases/11-evrun-full-evidence.md`](../../delivery/target-state-implementation/phases/11-evrun-full-evidence.md), with per-AC current dispositions that distinguish what is now met from what remains stronger-probe debt. The finding's contradiction is closed without overclaiming no-phone-home or idempotency.                                             |
| F5  | fixed  | PR #77 / `a78f67c` (`docs: harden target-state delivery tracking`) corrected the stale track header, phase-table rows, and P11/P12 status lines on current `main`, and tightened the delivery-foundation/status-flip checks so the daisy-chain failure mode is no longer the documented workflow.                                                                                                                                                                                                  |
| F6  | fixed  | PR #77 / `a78f67c` updated [`docs/design/contracts/driving.md`](../design/contracts/driving.md) to the shipped 10-verb operator-control vocabulary (`start`, `preview`, `watch`, `inspect`, `ask-why`, `notice-ack`, `notice-snooze`, `decide`, `stop`, `export`), matching ADR 0033 and the current `JigOperatorControlPort`.                                                                                                                                                                     |
| F7  | fixed  | PR #77 / `a78f67c` removed the stale "resume placement is unsettled" posture from the track README and now states the settled split directly: resume lives on `JigRecoverySurface`, not on the operator-control port or MCP surface.                                                                                                                                                                                                                                                               |
| F8  | fixed  | PR #75 / `1e23b5f` (`fix: exercise negative egress probe`) replaced the hardcoded `negativeEgressProbePassed: false` behavior with an exercised probe result path in `packages/jig-sdk/src/providers/real/confinement.ts`; current Phase 04 post-merge notes record that remediation explicitly.                                                                                                                                                                                                   |
| F9  | fixed  | PR #75 / `1e23b5f` also closed the latent substrate-validation hole: current `createRealExecutionHost()` now refuses probe substrate requests when no approved manifest is supplied and validates every declared request before exercising the probe.                                                                                                                                                                                                                                              |
| F10 | fixed  | PR #76 / `a66747d` (`feat: surface export attribution in observations`) added export attribution to inspect/ask-why and covered it with current CLI and SDK tests, including `P10-F10: custom-dir export remains attributable from inspect and run-level ask-why`.                                                                                                                                                                                                                                 |
| F11 | fixed  | PR #76 / `a66747d` added the missing second-process watch integration test (`P08-F11: watch observes a live run from a second process and then the finished record`) and updated the phase doc to state the shipped watch vocabulary honestly: LIVE posture is projected into snapshot signals rather than a literal `stalled` status string.                                                                                                                                                      |
| F12 | fixed  | PR #77 / `a78f67c` added the missing process teeth to current delivery rules: explicit review-arrival gate, post-merge main-branch check watch, 90.5% coverage headroom, and a rewritten same-PR `merged (#N)` status-flip rule in [`verification.md`](../../delivery/target-state-implementation/verification.md). The historical incidents remain part of the audit record, but the process gap identified by F12 is now addressed in the governing docs.                                        |

### Remaining open debt after the remediation wave

- SEC-2 strong no-phone-home remains open. Current P11 docs, evidence index, root `README.md`,
  repo `AGENTS.md`, and track `verification.md` continue to treat adversarial no-phone-home as open
  evidence or owner-deferral work, so this closeout does not advance P13/P14 beyond that remaining
  gate.
- RESUME-3 repeated-effect idempotency is now backed by
  [`docs/design/evidence/2026-07-06-resume-idempotency-smoke.md`](../design/evidence/2026-07-06-resume-idempotency-smoke.md)
  for the real `open-pr` path.
