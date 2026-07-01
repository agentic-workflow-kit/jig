---
title: M5a prior art & reuse log — workflow-kit v-next
status: draft — reuse log (reference-only)
methodology: ddd
---

# Prior Art & Reuse Log — workflow-kit v-next

The retiring `workflow-kit` prototype (local at `~/repos/workflow-kit`, branch `v-next`) is
**reference-only** prior art. Per org rule, we harvest lessons and reusable engineering but never
port its architecture, and we re-derive every jig artifact from jig's own product commitments.

This log makes the reference-only boundary auditable: every lesson the M5a design carries is
listed here with its prototype source and why it survives re-derivation. The author design doc
cites these inline where they apply; this file is the index of record. Paths below are from the
three reuse surveys; the author stage re-reads a specific source before it actually carries that
pattern.

## Key finding — the dry-run is greenfield

The prototype does **not** separate a dry-run from a real execution run. Its one `previewRun`
command (`packages/sdk/.../edge/operator-command`) is a shallow Work-Source candidate-count
lookup: it never enters the run-lifecycle state machine and never touches workspace, worker, or
forge machinery. There is **no reusable dry-run execution pipeline** to harvest. jig's
dry-run-first vertical (Plan Intake -> Runner -> Fence -> Records, side-effect-free) is genuinely
new work — the prototype informs the _shapes around it_, not the pipeline itself.

## Carried lessons

| #   | Lesson (carry as a pattern, not a copy)                                                                                                                                                                                                                                                                            | workflow-kit source                                                                                                         | jig home / commitment                                          | Survives re-derivation because                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A **closed, test-enforced transition table**: illegal run/story transitions are a compile/test-time fact, not a runtime "shouldn't happen"; recovery edges require explicit authority + cited evidence.                                                                                                            | `sdk` run-lifecycle (`lifecycle-reducer`, `transition-table`, `transition-validator`); `projections-lifecycle-and-tests.md` | Run Orchestration FSM                                          | It is a property of any robust FSM. jig applies it to its own **two-level run/story** split — the prototype's single fused run FSM is _not_ carried.                                                                                               |
| 2   | **Event-sourced records**: append-only log; state/summary/metrics are pure projections replayed from it, never authored; a single leased writer with monotonic epoch fencing removes concurrent-recovery write races.                                                                                              | `sdk` `run-event-log`/`append-writer`; `event-log-and-state.md`; AD-6                                                       | Run Records & Observability; SEE-3, RESUME basis               | Directly serves "records ARE the evidence." jig re-derives its record shape from `observability-records-v0`, not the prototype's envelope.                                                                                                         |
| 3   | **Observation honesty tri-state**: never coerce unknown to zero/false; carry `available/partial/unavailable`.                                                                                                                                                                                                      | `sdk` observability records                                                                                                 | Run Records; SEE                                               | A record-quality discipline independent of architecture.                                                                                                                                                                                           |
| 4   | **Redaction as a recorded, policy-digested per-event posture** (a `redactionPolicyDigest`), not a one-off filter.                                                                                                                                                                                                  | `sdk` observability `records/*`, `artifact-ref-guard.ts`                                                                    | Run Records; SEC-1, SEE-6                                      | jig carries the discipline and defers real secret-scanning (named extension point).                                                                                                                                                                |
| 5   | **Structural authority boundary**: separate seam contracts so worker-side code literally cannot import push/merge; privileged actions go record-intent -> evidence-bound pure predicate -> runner-only execute.                                                                                                    | `sdk` `providers/{agent,forge,...}`; `runtime-flow.md`; AD-12                                                               | Runner/worker boundary; FENCE-3, SEC-3, MERGE-2                | This is jig's boundary invariant — but jig keeps the **Fence as its own bounded context** (the prototype fused it into Completion; not carried).                                                                                                   |
| 6   | **Authorization adjudicated in the control plane from the append path**; the worker/provider never gates; the request is durably appended as a **barrier before** any decision logic, so a crash mid-decision is recoverable.                                                                                      | `sdk` `decide-approval.ts`, `classify-approval-risk.ts`; `human-control-and-approvals.md`                                   | Policy & Authorization (Fence); FENCE-1 fail-closed            | Concrete fail-closed mechanic. jig chooses its own invocation shape (not necessarily an interceptor object).                                                                                                                                       |
| 7   | **Fixed-category, no-model policy** — independent convergence on CFG-10: control decisions are pure functions of recorded evidence; LLM adjudication is structurally deferred.                                                                                                                                     | `sdk` `posture-catalog.ts` (`orchestrator-decide` deferred); AD-14                                                          | Policy posture (assisted); CFG-10                              | Two independent designs landed here — validation, cited as prior-art support. The prototype's **axis** (command-allowlist + grant-scope-ladder + 3 tiers) is _not_ carried; jig keeps its binary reversibility/privilege/rule-governance boundary. |
| 8   | **CLI as a thin adapter**: one command -> one control-plane call -> one audit event, even on invalid input; the edge holds zero run logic and imports no provider contracts; run identity allocated only after the audit append succeeds.                                                                          | `command-surface-and-envelopes.md`; `cli` operator-smoke shims                                                              | Operator entry point                                           | The prototype has no real CLI to port (only the contract shape); the invariant is re-derivable.                                                                                                                                                    |
| 9   | **Closed-environment credential keeping** at the runner/host boundary: the host never resolves secrets; `environmentMode: "closed"` + a structural predicate (`party=worker & kind=forge` -> always false); worktree-per-task + commit-only-in-worktree + runner-does-push is a cheap, provable isolation pattern. | `fnd-04` credentials-and-secrets; AD-12; `.agents/skills/orchestrated-delivery`                                             | FENCE-3, SEC-3                                                 | This is the concrete recipe for the (deferred) real local worker — design-level lesson now.                                                                                                                                                        |
| 10  | **Honesty probes**: bind verification evidence to a precomputed `commandDigest`; prove the agent's spawned commands run inside the host's owned containment (`preservesHostProcessParentage`) rather than trusting self-report.                                                                                    | execution-host `contracts-and-conformance.md`; `capabilities-and-conformance.md`                                            | Execution Host / Agent seams (named extension points); DRIVE-3 | Design-level lessons for when those seams are exercised later.                                                                                                                                                                                     |

## Do not inherit — re-decide from jig's own constraints

- **AD-2** (TS/Node core + native containment helper) — jig picks its runtime stack from its own
  constraints, not because the prototype did.
- **AD-10** (day-one four providers, each with mock + conformance suite) — appropriate for a
  platform aiming at multi-provider day one; jig's M5a is a single local fixture. Committing to
  that seam/conformance machinery now would expand scope before the local path proves out (the M5
  "minimal expands into multi-driver portability" kill-assumption).
- **The 3-tier allowlist / grant-scope-ladder risk classifier** — heavier and differently-axised
  than jig's binary CFG-10; porting it would silently re-architect jig's category model.
- **The single fused run FSM** and **the 8-kind agent event taxonomy** — jig re-derives a coarser,
  two-level (run/story) model and only the event families its dry-run actually emits.
- **The experimental Codex app-server agent driver** — recommended on paper in the prototype but
  unproven (live conformance probes not run); not "proven machinery" to import.

## How this informs Q1 (worker posture)

The cost survey found a _thin real local worker_ (worktree workspace, closed-env subprocess,
process-group containment, runner-owned checks, diff as output) is light and buildable — its heavy
parts (live capability probes, kernel-level containment, egress negative-probes, persistent
approval-channel resume) are gated behind **autonomy**, not behind evidence-producing execution.
That makes the real local worker a **clean, bounded follow-on** with a known recipe (lessons 9-10),
which is exactly why M5b can safely defer it: see the frame's Q1 resolution.
