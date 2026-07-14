---
title: Deterministic story orchestration proposal review
date: 2026-07-14
commit: 83256f5 (docs/deterministic-story-orchestration-proposal)
verdict: Foundation sound — eight findings block agreement of the draft layers
status: point-in-time record
---

# Deterministic story orchestration proposal review — 2026-07-14

> **Point-in-time record.** Every file and line reference in this document is pinned to commit
> `83256f5` on branch `docs/deterministic-story-orchestration-proposal`, reviewed 2026-07-14.
> Findings carry stable IDs DSO-1 to DSO-14 that later revisions cite when they close them. Do
> not renumber or reuse these IDs.

## 1. Scope and method

A design review of the complete standalone proposal at
[`docs/design/deterministic-story-orchestration/`](../deterministic-story-orchestration/README.md):
the overview, six layers marked agreed (inputs, events and runtime state, live state,
orchestration, story execution, delivery and operations), the three draft contract layers (port
boundaries, operations and results, evidence and artifacts), and the planning companion
(next-design-decisions).

**Method:** single-reviewer close read in two passes on 2026-07-14 — an initial pass over the
seven-file set as of `982916c` (findings DSO-1 to DSO-4 plus minors), then a full re-review of
the eleven-file set at `83256f5` after the live-state layer and three draft contract layers were
added (findings DSO-5 to DSO-10). Each pass cross-checked every layer against every other layer
for contradictions, unstated rules, and vocabulary drift, with specific attention to the lease
lifecycle, counter semantics, state-machine correspondence, event catalog coverage, and the
trigger/transition/operation model. All three Mermaid diagrams were validated with `mmdc` at
both passes (all render cleanly).

The proposal is deliberately self-contained; reconciliation with the current Jig product,
design, or implementation model was out of scope for this review, matching the proposal's own
adoption criterion.

## 2. Verdict

The functional spine is strong and internally disciplined: the layering holds, the core
invariants are restated consistently across files, and the deferred-decision lists are honest.
The new draft layers contain the best material in the package (effect certainty,
artifact-durability-before-result-acceptance, derived-not-stored live facts).

However, eight findings should be resolved before the draft layers are marked agreed. DSO-5 and
DSO-6 are contradictions between the drafts and the already-agreed live-state layer, DSO-1 to
DSO-4 are contradictions or unbounded paths inside agreed layers, DSO-7 is a missing primitive
the happy path depends on, and DSO-8 is an authority ambiguity between two agreed state models.
Most fixes are one to three sentences each; none require restructuring the design.

## 3. Findings register

| ID     | Severity               | Summary                                                                                                            |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| DSO-1  | contradiction (agreed) | Lease lifecycle does not cover the `Finalizing → Implementing` exit; queue starvation or unstated release.         |
| DSO-2  | gap (agreed)           | The verify-fail → reimplement → approve loop increments no counter and is unbounded.                               |
| DSO-3  | contradiction (agreed) | Preflight rejects policy exceeding capacity ceilings while the scheduler tolerates it via a lower effective limit. |
| DSO-4  | ambiguity (agreed)     | Rebase-review correction rounds (`FinalReview → PrepareLatest`) have no assigned counter.                          |
| DSO-5  | contradiction (agreed) | The SHA-bound finalization lease cannot authorize the rebase the target-refresh flow performs under it.            |
| DSO-6  | contradiction (draft)  | The core computes the replacement `OperationRegistry` but the runtime assigns `operationId`.                       |
| DSO-7  | gap (draft)            | No wait/timer trigger exists; `pending` remote-check results imply a tight poll loop or a stall.                   |
| DSO-8  | ambiguity (agreed)     | Two agreed story state machines (story-execution, live-state) differ with no stated mapping.                       |
| DSO-9  | minor                  | Two ports observe the target SHA; the finalization basis observation is not named.                                 |
| DSO-10 | minor                  | Orchestration's component model omits the artifact recorder/store the drafts introduce.                            |
| DSO-11 | minor                  | The event catalog has no finalization-queue or lease lifecycle events.                                             |
| DSO-12 | minor                  | `run.initialized` versus `preflight.failed` ordering and run-scope is ambiguous.                                   |
| DSO-13 | minor                  | The story-count versus session-count capacity mapping is undefined.                                                |
| DSO-14 | minor                  | `push-on-approval` checkpoint semantics collapse into delivery and are undefined for local targets.                |

## 4. Findings in detail

### DSO-1 (contradiction, agreed layer): lease unaccounted for on `Finalizing → Implementing`

[`story-execution.md:69`](../deterministic-story-orchestration/story-execution.md)
returns a story to `Implementing` when final local verification finds a code problem, but the
lease definition (`story-execution.md:164-166`) ends the lease only on confirmed landing or a
named blocked outcome — and this exit is neither. As written, the story holds the run's single
finalization lease through an entire re-implementation, re-check, and re-review cycle, starving
every other approved story. If the intent is to release the lease and re-enter the queue, no
document says so, nor whether the story rejoins at the back.

The live-state layer sharpens the problem: the lease is bound to the exact approved candidate
SHA (`live-state.md:59-60`), so the re-implemented candidate cannot reuse the old lease anyway.
Release-and-requeue is the only consistent answer and should be stated. Resolving DSO-1 and
DSO-5 together settles the whole lease lifecycle.

### DSO-2 (gap, agreed layer): unbounded verification-failure loop

The cycle _implement → checks pass → reviewer approves → final local verification finds a code
problem → back to implementing_ increments neither counter: the review-fix counter counts only
reviewer-requested correction rounds (the reviewer approved), and the target-refresh counter
counts only target movement. The blocking table
(`delivery-and-operations.md:106-116`) blocks only _non-recoverable_ verification failures, and
a code problem is explicitly the recoverable case (`delivery-and-operations.md:45-48`). The
deferred item covers _transient_ verification failures, which this is not. A story can loop here
indefinitely — the one judgment path with no bound in a design whose stated goal is bounded
loops everywhere. The live-state hierarchy has no edge for this return path, which makes the
omission easy to miss. It needs its own counter or an explicit assignment to an existing one.

### DSO-3 (contradiction, agreed layer): preflight versus scheduler concurrency

Preflight rejects the run when "policy does not exceed configured permissions or capacity
ceilings" (`inputs.md:220`), yet the scheduler "respects the lower effective limit"
(`story-execution.md:119-124`), and the inputs boundary-test example (policy permits three
concurrent stories, configuration has two session slots, `inputs.md:123-124`) presents that
combination as normal. Decide whether policy-max-active greater than configured capacity is a
preflight rejection or a runtime minimum; both documents cannot hold as written.

### DSO-4 (ambiguity, agreed layer): counter attribution for rebase-review corrections

`FinalReview → PrepareLatest: changes required` (`story-execution.md:62`) is a
reviewer-requested correction, which the rules say increments the review-fix counter — but it
occurs only because the target moved. If it consumes review-fix loops, target movement
indirectly consumes them, which `story-execution.md:191-192` explicitly forbids. If it consumes
the target-refresh counter, that contradicts the definition that refreshes count target
movement, not correction rounds. The operations layer now types assignments as initial /
review-fix / target-refresh (`operations-and-results.md:128-131`), which provides exactly the
hook needed; the counter rule itself is still unstated.

### DSO-5 (contradiction, agreed layer): SHA-bound lease versus target-refresh rebase

`live-state.md:59-60` binds the finalization lease to the exact approved candidate SHA ("a lease
cannot authorize a different or later candidate"), and invariant 5 (`live-state.md:195`) says a
candidate change invalidates every candidate-specific authorization. But the
`refreshing-target` states sit inside `finalizing` (`live-state.md:92-95`), which the same layer
says "is covered by the matching run-level finalization lease" (`live-state.md:107`) — and a
rebase there produces a new SHA by definition. The story rebases under a lease that, by the
layer's own rules, cannot authorize the result, and no rule re-binds the lease on refreshed
approval. Both statements are in an agreed layer, so this is an internal contradiction, not a
draft gap. The fix is one sentence: the lease's story ownership persists across a target
refresh, and its authorized SHA is updated atomically in the refreshed-approval transition.

### DSO-6 (contradiction, draft layer): operation identity ownership

`live-state.md:20-31` has the deterministic core calculate the complete replacement `LiveState`,
which includes `OperationRegistry` keyed by pending operations. But
`operations-and-results.md:15-17` and `operations-and-results.md:40-44` say the runtime controls
`operationId` and assigns trusted identity after the core produces the request. Both cannot
hold: either the core knows the IDs (so it can register the pending operations in the state it
returns), or the runtime assigns them (so the registry the core computed is incomplete and the
runtime must mutate it post-hoc, violating the atomic-replacement model). Parking identifier
generation in composition services (`ports.md:224-226`) defers the mechanism, not the ownership
question. The clean resolution is to supply pre-generated identifiers to the core as part of the
trigger context and state that explicitly.

### DSO-7 (gap, draft layer): no wait primitive in the trigger model

`operations-and-results.md:168-170` allows `delivery.observe-checks` to complete `pending`, with
the core requesting another observation "later" — but the trigger taxonomy
(`events-and-runtime-state.md:36-41`) has no time-based trigger, the clock is explicitly
excluded from the core, and the port "does not poll indefinitely." The `pending` result is
itself the only available trigger, so the core either re-requests immediately (a tight poll loop
appending `operation.requested`/`operation.succeeded` events while holding the finalization
lease) or never re-requests. This is not a timeout question; it is the absence of any
"wake me later" primitive, and it is load-bearing for the happy path of pull-request delivery.
The failure-and-liveness slice should name scheduling/timer triggers explicitly, and the policy
governance list should gain a remote-check wait budget.

### DSO-8 (ambiguity, agreed layers): two story state machines without a mapping

Story-execution's diagram has `Waiting / Eligible / Provisioning / … / FinalizationQueue /
Landed / Retiring / Closed`; live-state's hierarchy (`live-state.md:84-101`) has
`pending / executing{…, approved-and-waiting} / finalizing{…, confirming-landing} /
terminal{landed-cleanup, blocked}`. Some differences are principled — `Eligible` and the queue
become derived facts in live-state, `Closed` becomes deletion plus a landed-index entry — but
the documents never say so, and the granularity differs (`CheckTarget` and `confirming-landing`
each exist in only one model; `delivery-and-operations.md:97-100` still says a story "remains in
`retiring`", a state live-state calls `landed-cleanup` and classifies under `terminal`). Both
layers are marked agreed. Either declare live-state's hierarchy authoritative and annotate the
story-execution diagram as its coarse view, or add an explicit correspondence table.

### DSO-9 (minor): two observers of the target SHA

`workspace.refresh-target` and `delivery.observe-target` both observe "the target"
(`operations-and-results.md:134-139`, `operations-and-results.md:155-162`), and the pre-merge
basis check ("approved branch SHA and target SHA still match",
`delivery-and-operations.md:77-79`) never names which port's observation is the finalization
basis. A fetch race between the two makes this ambiguous exactly where exactness is the point.

### DSO-10 (minor): orchestration component model omits the artifact store

The agreed orchestration layer's diagram and responsibilities table still show four effect
interfaces and no artifact recorder/store, while the drafts make the artifact store a
first-class infrastructure port (`ports.md:53-67`). Accepting the drafts requires updating
`orchestration.md`; nothing currently flags that dependency.

### DSO-11 (minor): no finalization or lease lifecycle events

The catalog has `target-refresh.required` but nothing for queue entry, lease acquisition or
release, or the final-verification outcome as a semantic fact. The most contended resource in
the design leaves its audit trail only in `operation.*` payloads. Possibly intentional given the
deferred lease-persistence decision, but worth an explicit statement in
`events-and-runtime-state.md`.

### DSO-12 (minor): `run.initialized` versus `preflight.failed` ordering

The catalog lists `run.initialized` before the preflight events, but `inputs.md:231-234`
persists initialization events only after preflight succeeds. On a preflight failure, does a run
exist for the recorder's run-scoped context to record `preflight.failed` into? The
trusted-envelope contract depends on that scope.

### DSO-13 (minor): story-count versus session-count capacity mapping

Scheduling limits count stories, but each active story holds two sessions, and retiring stories'
sessions "may continue consuming capacity until closure." Live-state's "capacity usage is
derived from current live resource ownership" comes close but never states the mapping between
the policy's story concurrency and the configuration's session capacity.

### DSO-14 (minor): `push-on-approval` checkpoint semantics

Described as pushing "as part of delivery" (`delivery-and-operations.md:23`), which makes it
behaviorally identical to `local-only` whenever the delivery mode pushes anyway, and undefined
under direct local integration with no remote. One distinguishing sentence would resolve it.

## 5. Strengths worth preserving

- The plan/policy/configuration boundary test with its example table (`inputs.md:104-124`)
  should survive reconciliation intact.
- The producer-owned-facts versus trusted-envelope split cleanly solves attribution without
  giving agents event authority, and the drafts extend the same trusted-recorder pattern to
  artifacts consistently.
- The derived `dependency-blocked` outcome model (one real `story.blocked`, DAG-derived
  downstream outcomes, no synthetic events) is stated identically everywhere it appears.
- The completed-operation versus technical-failure split with effect certainty ("known not to
  have occurred / known to have occurred / uncertain",
  `operations-and-results.md:97-111`) is exactly the right contract for remote mutation and
  preempts a class of uncertain-merge bugs.
- Making required-artifact durability a precondition of result acceptance
  (`evidence-and-artifacts.md:94-115`) preserves the persistence-before-state invariant without
  adding staging state to the core.
- `workspace.retire` returning `refused` as a valid completed outcome, the no-generic-evidence-
  bag rule, and deriving eligibility, finalization ordering, and capacity instead of storing
  them are all decisions this review would defend at adoption.
- The drafts are honest about their own status, and `next-design-decisions.md` correctly routes
  their acceptance through an explicit review gate.

## 6. Recommendation

1. Fix DSO-1 to DSO-4 in the agreed layers (`story-execution.md`, `inputs.md`) — three of the
   four are one-to-three-sentence fixes and all predate the draft layers.
2. Resolve DSO-5 and DSO-6 before marking the port, operation-result, and evidence layers
   agreed; both are contradictions with the agreed live-state layer, not open questions.
3. Add timer/scheduling triggers (DSO-7) to the failure-and-liveness slice scope in
   `next-design-decisions.md` so the slice cannot close without them.
4. Add the state-machine correspondence (DSO-8) when the live-state layer is next touched.
5. Sweep the minors (DSO-9 to DSO-14) opportunistically during draft-layer revision; none block
   agreement individually.
