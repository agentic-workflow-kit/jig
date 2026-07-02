---
title: "ADR 0020 — Phase 4 reliable local runs: replay, resume, no-double-effect, redaction, workspace"
status: applied
---

# ADR 0020 — Phase 4 reliable local runs

## Context

Phase 4 ([`docs/delivery/m5b-local-mvp-r2/phases.md`](../../delivery/m5b-local-mvp-r2/phases.md),
P4-AC-1..6) makes local runs reliable and recoverable: `inspect` that replays the event log,
`resume` from a durable checkpoint, no-double-effect on already-recorded actions, a
redaction/export posture, workspace continuity, and causal notices. The design layer already
seeds each of these — the run-lifecycle resume rules in
[`../core/orchestration.md`](../core/orchestration.md) (`stopped → resumed`, INV-009..018), the
replay/projection engine and redaction posture in [`../core/records.md`](../core/records.md), and
the resume re-entry procedure in [`../core/bootstrap.md`](../core/bootstrap.md). What is missing
is the set of concrete choices an implementer would otherwise have to invent. This ADR settles
them so two independent implementers produce compatible Phase 4 behavior.

The v0 contracts remain unfrozen (STOP-003 in
[`../notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md)); nothing here freezes a JSON
Schema, mints a public contract package, or introduces a real provider, Forge, or GitHub landing.
Where a record needs a field it does not yet carry, this ADR names the field's meaning and defers
its exact encoding to schema freeze, consistent with the phasing posture of
[ADR 0017](./0017-records-seam-reconciliation.md) decision 5.

### Delivered reality this ADR builds on

Established by Phase R and Phase 3, and confirmed against `src/` at authoring time:

- A run directory under `runs/` holds two files: `run.json` (a finalized record that currently
  **also embeds the full `events[]` array**) and an append-only `events.jsonl`.
- `jig inspect <run-dir>` today reads `run.json` and renders from its embedded `events[]`; it does
  **not** read or replay `events.jsonl`.
- `run.json` carries `run: { id, attempt, status, planId, mode, binding: { policyRef, configRef } }`.
  `id` is `run-<planId>-<timestamp>-<uuid>` (already distinct from the plan id); `attempt` is
  hard-coded `1`; `configRef` is the string `mode=<mode>;recordDir=<dir>`.
- `run.stopped` carries `reason` (`work-item-blocked` | `unattended-park`), `checkpoint`
  (`after:<story-id>` | `after:<story-id>.parked`), and `unstarted: string[]`.
- Owner decisions on a routed park are resolved by an in-process blocking Doorbell prompt
  (`authorization.granted` basis `["owner-approval"]` / `authorization.denied` basis
  `["owner-rejection"]`); the owner-decision source is `null` when stdin is non-interactive, which
  is what drives the `unattended-park` stop.
- No event currently carries a redaction/export posture field, and no workspace fingerprint is
  recorded. These are Phase 4 additions.

## Decision

Nine settlements, binding on Phase 4 and later phases. Each is a decision, not an open question.

### 1. Replay projection model

`events.jsonl` is the **authoritative** run history. `run.json` is a finalized/cached summary
only. Phase 4 introduces a pure **projection** — replaying `events.jsonl` into a run view — that is
the single source `inspect` and `resume` read from.

- **Input:** `events.jsonl` (authoritative). **Optional input:** `run.json` (cached/finalized
  summary; a convenience, never required).
- **Output:** a projected run view: run status, per-story states, stop cause, safe checkpoint, and
  the projected notices (§8).
- **Authority:** `events.jsonl` is authoritative for replay; `run.json` is never the only source
  `inspect` needs after Phase 4. Replay is deterministic (INV-006, `../core/records.md`
  "Projection purity and replay determinism").

Projection is pure: same log → same view. The projection reuses the closed transition tables in
[`../core/orchestration.md`](../core/orchestration.md) (run-lifecycle and work-item) as its
legality check while folding events into state.

**Failure posture (fail-closed, diagnosable — RESUME-4):**

| Condition                                                                                            | Projection behavior                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `events.jsonl` present, `run.json` missing                                                           | Replay from `events.jsonl`; the view is fully derivable without `run.json`. This is the crashed-run path P4-AC-4 requires.                                                                       |
| `run.json` present but conflicts with `events.jsonl`                                                 | `events.jsonl` wins. `inspect` renders the replayed view and surfaces a `run.json-stale` diagnostic notice; `run.json` is never trusted over the log.                                            |
| `events.jsonl` malformed (unparseable line)                                                          | Fail closed: the projection stops with a diagnosable error naming the offending line/offset. It does not guess past the corruption or silently truncate.                                         |
| An event is missing a required Phase R/3 field (`actor`, a `run.stopped` missing `checkpoint`, etc.) | Diagnosable projection defect. `inspect` surfaces the defect and renders what is derivable; `resume` refuses (§3/§4) because a safe checkpoint cannot be soundly computed.                       |
| Replay reaches an illegal (undrawn) transition                                                       | Correctness failure per `../core/records.md` "Failure posture": treat as replay drift. `inspect` surfaces a diagnosable stop; `resume` refuses. Never repair the log or invent a merged history. |

`run.json` **retains** its embedded `events[]` cache in Phase 4 for backward compatibility with the
Phase R/3 golden fixtures, but that copy is explicitly **non-authoritative**: the projection reads
`events.jsonl`. Slimming `run.json` to a lean summary is a later, separable change and is **not**
required by Phase 4 (it would churn the existing goldens for no Phase-4 benefit).

**Authoritative launch header — the log carries what replay needs.** For `events.jsonl` to be
authoritative in fact and not only in name, every value `inspect` and `resume` must recover
_without_ `run.json` has to live in the log. Phase 4 therefore records a durable **launch header**
as the first record of `events.jsonl`: the existing `run.started` event, extended to carry the
authoritative launch metadata — `run.id`, `planId`, the launch `binding`
(`policyRef`/`configRef`, the workspace fingerprint of §6, and the run-level redaction/export
posture of §7), and a reference to the validated-plan snapshot of §3. This is **additive**: today
`binding` is written only into `run.json` (`src/records.ts` `finalize`), so Phase 4 promotes it
into the log without reshaping any existing field, and `run.json` keeps the same fields as a
finalized cache. It reuses the existing `run.started` family, so **no new event family is minted**
(§8).

This settles decision **(a)** of the three the seam owner posed on this section, and it is the only
one consistent with the authority commitment this ADR already makes: a sidecar
authoritative-metadata file **(b)** would contradict "`events.jsonl` is authoritative" by creating a
second source of truth; splitting inspect-only replay from resume **(c)** would break the
crashed-run-without-`run.json` recovery that both P4-AC-4 (inspect) and resume depend on. Two
implementers must both find run id, plan id, binding, workspace fingerprint, redaction/export
posture, and the plan-snapshot reference in the log — not choose divergent storage models.

### 2. Inspect behavior

`jig inspect <run-dir>` **replays `events.jsonl` by default**. It uses `run.json` only as a
finalized/cache summary or a compatibility fallback. No separate `--replay` mode is added: replay
_is_ inspect, because the crashed-run case (P4-AC-4) must work with no finalized `run.json`, and a
default that silently prefers `run.json` would hide log/summary drift.

`inspect` explains, from the projection: why the run stopped (stop cause), the notice produced, and
the safe resume point (checkpoint). It works whether or not `run.json` exists.

### 3. Resume command and surface

The minimal local surface is:

```text
jig resume <run-dir> --scripted-output <output>
```

- `<run-dir>` is an existing run directory. Resume reads the durable evidence there (§below) and
  the projection (§1) to continue the **existing** run.
- `--scripted-output <output>` is a **live** input: it is the agent-seam (scripted-worker) source
  that drives the not-yet-terminal work resume continues. It is not run identity or binding — the
  worker's output is deliberately not durable in the records (SURF-003, INV-002).

**Binding is verification-only, never rebinding.** If `--config`/`--policy`/`--plan` are accepted
on resume, they are checked against the original recorded binding and are **verification-only**. A
mismatch fails closed (§8 `resume-blocked-binding-mismatch` preflight diagnostic); they never
rebind, widen, or swap the
launch binding (GUARD-1, INV-003, INV-010; `../core/bootstrap.md` "Original-binding preservation
rule").

Resume explicitly:

- **continues the existing run identity** — same `run.id`, same run directory
  (`../core/bootstrap.md` "Resume re-entry procedure": no second run identity);
- **does not allocate a fresh run id**;
- **does not increment `attempt`.** `attempt` denotes a _distinct run instance_ of the same plan
  (ADR 0017 decision 1); a resume preserves run identity, so it is not a new attempt. A
  resume-sequence marker, if wanted, rides on the existing `run.resumed` event family — no new
  attempt allocation and no new event family (resolving the run-lifecycle open question in
  `../core/orchestration.md`);
- **does not silently swap policy/config/work-profile/repo-floor** — that is the binding-verify
  gate above.

**Resume needs a durable plan.** A run directory currently holds only `run.json` + `events.jsonl`,
and the binding records the plan by _reference_ (`planId`), not the plan itself — but resume must
re-derive eligibility, dependency order, and each resumed story's declared `scope` (to authorize
resumed requests), all of which live in the plan. Therefore **bootstrap persists a validated-plan
snapshot into the run directory at launch** (e.g. `plan.snapshot.json`), and resume reads it back.
"Resume from records" is honest only if the plan is durable in the run directory; resume must not
depend on an external plan file the operator happened to keep unchanged. If `--plan` is also passed
on resume it is verified against the snapshot (verification-only, as above).

### 4. Checkpoint semantics

The projection interprets the recorded checkpoint as the last safe point orchestration may continue
from (`../core/bootstrap.md` "Last safe checkpoint"):

| Checkpoint value          | Meaning                                                                                                                       | Resume entry                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `after:<story-id>`        | Run halted after `<story-id>` reached a terminal outcome (delivery-configured stop-after-first-failure, ADR 0017 decision 2). | Continue _after_ that story: already-terminal work is not re-run; eligible work past it may proceed. |
| `after:<story-id>.parked` | Run halted because `<story-id>` parked unattended (`unattended-park`).                                                        | Re-enter at that park: the park is the thing resume must resolve before independent work continues.  |

**Per story-state resume behavior:**

| Story state at stop                                                    | Resume behavior                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `done` (evidence met)                                                  | Terminal; not re-run. Its `done`-vs-`landed` distinction is preserved (MERGE-4, INV-004).                                                                                                                 |
| `blocked` (denied / evidence-gate-failed / worker-failure)             | Terminal; not re-run. It and its downstream dependents stay `blocked` (ISO-3).                                                                                                                            |
| `parked` (routed, awaiting owner)                                      | Resolved per the parked-resume rule below.                                                                                                                                                                |
| unstarted (in `run.stopped.unstarted[]`, never reached)                | Eligible again on resume if its prerequisites are satisfied; it gets its first attempt.                                                                                                                   |
| `started` without a terminal event (interrupted mid-flight)            | Re-attempted as **repeatable** work: it had no durable terminal effect, so resume re-drives it from the agent seam. Any already-recorded irreversible action for it is recognized and not re-issued (§5). |
| `runner-action.skipped-on-dry-run` already recorded for a `done` story | Recognized from the log and **not re-issued** (§5).                                                                                                                                                       |

**Work-item-blocked resume (honors ADR 0017 decision 2 + ISO-3).** A `work-item-blocked` stop is a
resumable checkpoint like any other. On resume from `after:<story-id>`: the blocked story and its
downstream dependents stay at their terminal `blocked` outcome (not re-run), but **independent**
`unstarted` work becomes eligible again and proceeds. The delivered harness is stop-after-first-
failure and halts _everything_, including independent stories; resume is where that independent
work gets its chance. A resumed run may then reach `completed` (independent work finishes) or
`stopped` again (a new halt at a new safe checkpoint).

**Parked resume rule.** For an `after:<story-id>.parked` checkpoint, resume resolves the park by:

1. **Consuming a durable owner-decision if one already exists** for that request
   (`authorization.granted`/`authorization.denied` with an `owner-approval`/`owner-rejection`
   basis recorded before the stop). Resume applies it and does **not** re-ask — this is the
   no-double-effect rule for the decision itself.
2. Otherwise the park is genuinely unresolved. An **interactive** resume re-presents it through the
   same Phase-3 local Doorbell (blocking prompt) and records the fresh decision, then continues.
3. A **non-interactive** resume of an unresolved park **re-enters and then re-stops**: it appends
   `run.resumed`, lets any independent unstarted work progress (the checkpoint semantics above), and
   **fails closed again** by recording a new `run.stopped` with an `unattended-park` reason at the
   safe checkpoint. This is intended, not a loop to "fix": DOOR-1's closed door is the correct
   default when no decision is available. It **re-enters** rather than refusing at preflight —
   unlike the binding/workspace/approval gates (§3, §6, §9), which refuse before `run.resumed` —
   precisely so independent work can advance before hitting the still-unresolvable park, mirroring
   the `work-item-blocked` resume row above. Two implementers must not collapse this into a
   symmetric preflight refusal: that would observably starve independent work.

### 5. No-double-effect ledger (local MVP interpretation)

Local dry-run has no real Forge effects. Its only durable/irreversible artifacts are (a) the
append-only records themselves and (b) recorded runner-owned actions, which are _modeled_
(`runner-action.skipped-on-dry-run`), not performed. Phase 4's no-double-effect is therefore a
**record-idempotency and skip-recognition** property, proven from the replayed log — not
real-world effect suppression.

| Class                              | Examples (local MVP)                                                                                                                                                                                           | Resume rule                                                                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repeatable                         | evidence modeling, eligibility resolution, in-memory projection reconstruction, provider re-wiring (`../core/bootstrap.md` "No-double-effect rule")                                                            | May be redone freely on resume.                                                                                                                                                                                            |
| Safe to reconstruct in memory      | the projected state/summary/notices                                                                                                                                                                            | Rebuilt by replay each time; never a second durable narrative (INV-006).                                                                                                                                                   |
| Not repeatable / must not re-issue | the first binding-record append; any already-recorded story-**terminal** event (`story.done`/`blocked`/`rejected`); an already-recorded `runner-action.skipped-on-dry-run`; an already-recorded owner decision | Recognized from the replayed log and not appended or performed a second time (RESUME-3, INV-012, `../core/bootstrap.md` "No-double-effect rule": resume reads the binding record, never appends a second "first binding"). |
| Durable effects (deferred)         | real push / open-PR / merge / credential use                                                                                                                                                                   | Do not exist locally. Real irreversible Forge idempotency is deferred to Phase 5 / provider / Forge work and is **not** in Phase 4 scope.                                                                                  |

The concrete Phase-4 proof: the projection identifies, from `events.jsonl`, which work items are
already terminal and which runner-owned actions and owner decisions are already recorded; resume
consumes those facts and re-drives only genuinely non-terminal work.

### 6. Workspace continuity

Phase 4 records a minimal **run-level** workspace fingerprint in the launch **binding** and checks
it on resume. Chosen evidence (one, justified): **repo root path + git `HEAD` commit + a content
hash over the working-tree change set** — the hash covers `git status --porcelain` plus the tracked
and staged working-tree diff, and a clean tree hashes to a fixed sentinel. It is captured at launch
and stored in the binding block, which rides in the authoritative launch header of §1 — already the
launch-immutable, durable anchor — so no new durable store is introduced, and it stays
**recomputable with local git alone**.

A bare `dirty` boolean is deliberately **rejected as insufficient**: two materially different dirty
trees at the same `HEAD` both read `dirty=true`, so an equality check on a flag would pass and claim
continuity across a workspace that changed while the run was stopped — violating P4-AC-6 / RESUME-4.
Hashing the change set distinguishes them; the fingerprint is one opaque token for golden
normalization (below).

- At launch, bootstrap captures the fingerprint into `binding.workspace` (meaning fixed here;
  exact field encoding deferred, per §Context).
- On resume, bootstrap recomputes the current fingerprint and compares (`../core/bootstrap.md`
  storage-preflight sits alongside this as a workspace-continuity preflight).
- A **material** difference — different repo root, different `HEAD`, or a different change-set hash
  (including two distinct dirty trees at one `HEAD`) — is a fail-closed, diagnosable outcome: resume
  is **refused** with a `resume-blocked-workspace-mismatch` diagnostic (§8), never silently claimed
  continuous (P4-AC-6, RESUME-4).

This is run-level continuity only. Per-story parallel-workspace isolation (ISO-4) and any
remote-host or provider workspace proof stay **deferred** — Phase 4 does not overbuild them.
Golden fixtures normalize the fingerprint to a `<WORKSPACE>` placeholder so goldens stay
machine-independent (§ delivery brief).

### 7. Redaction / export posture

Phase 4 settles a **run-level local default posture** rather than freezing a field-level per-event
schema. The run record carries a default posture (`redacted` / `safe-for-owner-record`); records
stay safe to keep and export by default (SEC-1, SEE-6). Field-level per-event posture stays
**phased in with the concepts that introduce sensitive values** (ADR 0017 decision 5) — local
dry-run has no real secrets yet, so a run-level default plus fail-closed handling satisfies P4-AC-5
without a premature per-record schema freeze (STOP-003).

Because the run-level posture is part of the **launch header recorded in `events.jsonl`** (§1), a
crashed run with no finalized `run.json` still recovers its posture by replay. The fail-closed
handling below therefore triggers only when posture is **genuinely** absent or ambiguous — never
merely because `run.json` is missing; the events-only inspect path (P4-AC-4) is not denied for lack
of a cache.

`records.md` is updated in the same PR so its per-record posture language and this run-level default
do not ship in conflict (see § Required doc updates).

**Fail-closed behavior:**

- **Unknown redaction posture** on a record or run → `inspect`/export is denied or constrained and
  the ambiguity is surfaced as a diagnosable stop (`redaction-export-posture-ambiguous` notice, §8).
- **Export requested but posture is unsafe/ambiguous** → export is **denied**, not best-effort
  emitted. Records remain safe-by-default; an unsafe export never silently ships.
- **`inspect` attempting to surface sensitive raw data** → constrained: `inspect` surfaces the
  posture and the class of withheld value, never the raw sensitive value (`../core/records.md`
  "Redaction and evidence posture").

Redaction/export ambiguity becoming an operator-visible diagnosable **stop** — rather than a silent
degrade — is the core of P4-AC-5.

### 8. Causal notices

Notices are **projections** from records, not new persisted events (INV-006; `../core/records.md`
"Projection purity"). Each is derived from facts the log already carries; Phase 4 mints **no** new
event family. The minimum notices Phase 4 projects:

| Notice                                      | Projected from                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| run stopped — unattended park               | `run.stopped` `reason: unattended-park` + `checkpoint`                                        |
| run stopped — evidence-gate failure         | `story.blocked` `reason: evidence-gate-failed` + the `run.stopped` it drove                   |
| run stopped — policy / authorization denial | `authorization.denied` (+ run-scope denial per ADR 0017 decision 3) + the terminal run record |
| redaction / export posture ambiguous        | the posture check on a record or run, whose posture rides in the launch header (§1, §7)       |

**Resume-preflight diagnostics are not projections.** The three `resume-blocked-*` conditions —
binding mismatch (§3), workspace mismatch (§6), and missing approval evidence (§4/§9) — are
deliberately **excluded** from the table above, because none is a projection over the stopped run's
log. Each is computed **live at resume preflight** by comparing a resume-time input (passed
`--config`/`--policy`/`--plan`, the freshly recomputed workspace fingerprint, the presence of fresh
owner evidence) against the recorded launch header. A refused resume never enters the run: it does
**not** transition to `resumed`, appends **no** record, and moves no checkpoint. It surfaces as a
live diagnostic — a `resume-blocked-*` message plus a non-zero CLI exit (FAIL-004 in
`../core/bootstrap.md`) — recomputed deterministically from the recorded facts plus current
workspace state, and is **not** replayable from the stopped run by a later `inspect`.

This scoping is checked against the product guarantees and is safe: **no RESUME- or SEE- guarantee
requires a _refused resume attempt_ to be inspectable after the fact.** RESUME-4 and SEE-1/SEE-3
govern the run's own named states and the evidence Jig decides _from_ — the recorded facts a refusal
compares against, which stay inspectable — not a ledger of rejected resume commands. Recording
refused attempts as durable audit facts is a **named, deferred** enhancement (later provider / audit
work), not a Phase-4 obligation; an implementer must not invent a refusal event family to satisfy
these diagnostics. The lone case that _does_ append a fresh `run.stopped` is the unattended-park
re-stop in §4 step 3, where the run genuinely re-entered and re-halted.

### 9. Resume-integrity gate (safety-relevant change while stopped)

Distinct from a binding _mismatch_ (§3): if a safety-relevant assumption changed while the run was
stopped — a rule-governing surface, verification, or integration-safety input — resume requires
fresh owner re-approval and fresh evidence before continuing (RESUME-5, GUARD-2, INV-011;
`../core/orchestration.md` `stopped → resumed` guard). Absent that durable re-approval evidence,
resume is refused with the `resume-blocked-missing-approval` preflight diagnostic (§8). At Phase-4
local altitude
the _detection surface_ for "what changed while stopped" is scoped to what the run already records
plus the workspace fingerprint (§6); a richer change-detection surface stays deferred to later
provider/policy work and is named, not built, here.

## Consequences

- The observability-records contract is clarified (not frozen): a run-level default redaction/export
  posture at local altitude, `binding.workspace` as a named binding sub-field, and the launch
  binding/identity made recoverable from the event log itself (§1). `records.md`, `orchestration.md`,
  and `bootstrap.md` are updated surgically to name replay-derived inspect, the authoritative launch
  header, projected-checkpoint resume with independent-work re-eligibility, the no-double-effect
  handoff, resume re-entry with binding+workspace verification, and the run-level posture
  reconciliation.
- The change is **additive** to the records shape: Phase 4 promotes `binding` (today written only to
  `run.json`) into a durable `run.started` launch header at the head of `events.jsonl` — carrying
  run id, plan id, binding, the workspace fingerprint, the redaction/export posture, and the
  plan-snapshot reference — and appends a `run.resumed` continuation to the same log on resume. No
  existing field changes shape and no event family is renamed, removed, or newly minted; `run.json`
  keeps its embedded `events[]` cache non-authoritatively for Phase R/3 golden compatibility.
- Phase 4 implementation adds a projection path (replay `events.jsonl`), a `jig resume` surface, a
  launch-time validated-plan snapshot, a workspace fingerprint in the binding, and run-level
  redaction/export posture with fail-closed inspect/export. It touches `src/cli.ts`,
  `src/records.ts`, `src/harness.ts`, `src/types.ts`, and adds focused new modules (candidate
  `projection`, `resume`, `workspace`, `redaction`) — see the Phase 4 implementation brief.
- No JSON Schema freeze, no TypeScript contract package, no real providers, and no Forge/GitHub
  landing. Real irreversible-effect idempotency, ISO-4 parallel isolation, remote-host recovery, and
  field-level per-event redaction posture remain deferred.

- Date: 2026-07-02
- Origin: Phase 4 reliable-local-runs design closure (docs-only, pre-implementation)
