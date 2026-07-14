---
title: "Deterministic story orchestration — live state"
status: proposal — agreed design, not yet reconciled or adopted
---

# Live state

This layer defines the entities and ownership boundaries of the first-phase in-memory control
state. It refines the live-state model introduced by [Events and runtime state](events-and-runtime-state.md)
without defining field-level schemas, persistence, replay, or distributed ownership.

## Centralized management, separate entities

`RunState` and `StoryState` are separate domain entities with different responsibilities. The
first-phase runtime manages them centrally as one atomic consistency boundary; central management
does not make story state part of the run entity or combine their transition logic.

Conceptually, the runtime holds:

```text
LiveState
- run: RunState
- stories: StoryId -> StoryState
- landedStoryIds: set of StoryId
- operations: OperationRegistry
```

`LiveState` is a runtime-owned transactional container rather than another domain entity. For one
accepted trigger, the deterministic core calculates one replacement `LiveState`, its event drafts,
and requested operations. The runtime adopts that replacement atomically only after the event batch
is durably appended.

This preserves a later extension path in which a coordinator owns `RunState` and separate workers
own individual `StoryState` instances. Such distribution would require a separate communication and
consistency design; it does not require combining the entities in the first phase.

## Immutable definition versus live state

The approved plan, policy, configuration, resolved routes, dependency graph, and other immutable
input facts form the run definition. They are supplied to transitions as immutable context rather
than copied into mutable `RunState` or each `StoryState`.

Live state contains only facts that change while the run executes. References into the immutable
definition use stable identifiers.

## Run state

`RunState` owns run-wide domain facts:

- the run lifecycle and terminal outcome;
- preflight or run-level failure state;
- the single finalization lease; and
- other counters or decisions that genuinely apply to the whole run.

It does not own implementation, review, workspace, or delivery details for individual stories.
It also does not duplicate values that can be derived deterministically from the immutable run
definition, current story states, landed-story index, or operation registry.

The finalization lease identifies both its owning story and the exact approved candidate SHA. A
lease cannot authorize a different or later candidate.

## Story state

Each plan story has an independently understandable `StoryState` while it remains pending, active,
finalizing, directly blocked, or temporarily retained for post-landing cleanup. It owns that story's:

- lifecycle;
- branch and worktree references;
- retained implementer and reviewer session references;
- current candidate and its evidence references;
- current review or approval;
- review-fix and target-refresh counters;
- delivery and cleanup progress; and
- direct blocking reason, when blocked.

Story state does not own run-wide capacity, dependency, finalization-selection, or completion
decisions.

## Hierarchical story lifecycle

The story lifecycle is a closed hierarchical state machine rather than a flat status plus a large
set of optional fields:

```text
pending
executing
  preparing
  implementing
  reviewing
  approved-and-waiting
finalizing
  refreshing-target
    implementing-rebase
    reviewing-rebased-candidate
  final-verification
  delivering
  confirming-landing
terminal
  landed-cleanup
  blocked
```

Each variant carries only the facts valid in that state. In particular:

- a reviewing state has an exact candidate and retained reviewer session;
- an approved state has an approval tied to the current candidate SHA;
- a finalizing state is covered by the matching run-level finalization lease;
- a landed-cleanup state has confirmed landing evidence and only the resources still needed for
  cleanup; and
- a blocked state contains a direct blocking reason rather than a derived downstream outcome.

The model must make contradictory combinations unrepresentable or reject them before a transition
is accepted. A story cannot be both landed and blocked, review without a candidate, or finalize a
candidate that does not match its approval and lease.

## Candidate, review, and approval

A candidate identifies an exact commit SHA, the target revision on which it is based, and the
implementer's submitted evidence. A review and approval apply only to that exact candidate.

Whenever the candidate SHA changes, the prior current review, approval, final-verification result,
and unfinished delivery authorization are invalidated. Their historical facts remain in the event
store, but they cannot authorize the new candidate. This rule applies equally to an implementation
fix and a target-refresh rebase.

## Operation registry

`OperationRegistry` is separate runtime coordination state, not part of either domain entity. It
owns the authoritative live record used to:

- match an external result to its requested operation;
- identify whether the operation belongs to the run or a story;
- bind candidate-sensitive operations to an exact SHA and relevant session or resource;
- reject unknown, duplicate, stale, late, or mismatched results; and
- retain the minimal settled-operation identity needed to recognize duplicates during the active
  run.

A `StoryState` may reference an operation it is waiting for when the lifecycle requires that
relationship. It does not duplicate the operation's full record. A transition may atomically settle
an operation, advance a story, and update a run-wide fact such as the finalization lease.

The draft [operation and result contracts](operations-and-results.md) propose the exact conceptual
operation kinds, validation boundary, and idempotency rules. Concrete schemas, failure-policy
mapping, and retention bounds remain deferred.

## Landed and blocked retention

Full successfully completed story states do not accumulate for the lifetime of the run.

When landing is confirmed:

1. the transition records `story.landed` and immediately adds the story identifier to
   `landedStoryIds`;
2. dependency eligibility may change immediately, without waiting for cleanup;
3. the full story state is retained only as `landed-cleanup` while required session, worktree, or
   branch cleanup concludes; and
4. after cleanup concludes, the full story state and settled operation details beyond the minimal
   duplicate-recognition tombstones are removed.

The compact `landedStoryIds` index is the explicit live fact used to satisfy dependency checks. It
avoids treating an absent story as an ambiguous implicit success. Detailed candidate, review,
delivery, cleanup, and landing history remains in durable events.

A directly blocked story remains represented because its root cause is still needed for dependency
ineligibility and the terminal run outcome. After its cleanup concludes, it is compacted to the
minimal blocked state: story identity, direct reason, and originating failure reference. Its
downstream stories remain pending and ineligible; the runtime does not create synthetic blocked
states for them.

## Owned and derived facts

The live model owns only facts that cannot be safely recomputed from its current authoritative
inputs. In the first phase:

- story lifecycle, direct blocking reason, counters, current candidate, approval, resource
  references, finalization lease, landed-story identifiers, and pending-operation identity are
  owned;
- eligibility is derived from the immutable plan DAG, current story states, and landed-story index;
- downstream dependency-blocked outcomes are derived from the DAG and directly blocked stories;
- finalization candidates and their deterministic ordering are derived rather than stored as a
  mutable queue; and
- capacity usage is derived from current live resource ownership rather than maintained as a second
  counter that could drift.

## First-phase invariants

The live-state model preserves these invariants:

1. One centralized runtime owns the atomic `LiveState` replacement in the first phase.
2. `RunState`, each `StoryState`, and `OperationRegistry` retain separate responsibilities.
3. Every accepted operation result matches one known live operation and its expected owner and
   context.
4. Review, approval, final verification, delivery authorization, and the finalization lease all
   refer to the exact current candidate where applicable.
5. A candidate change invalidates every candidate-specific authorization for the previous SHA.
6. At most one story owns the run's finalization lease.
7. Landing satisfies dependencies immediately; cleanup cannot reverse landing or delay newly
   eligible stories.
8. A successfully landed story's full state is removed after cleanup, while its compact landed
   identity remains.
9. Only directly blocked stories retain blocked state; downstream ineligibility is derived.
10. Derived values are not duplicated as independently mutable control state.

## Deferred decisions

- Field-level entity and value-object schemas.
- Concrete operation, message, and result schemas; the conceptual draft is in
  [Operations and results](operations-and-results.md).
- Concrete port interfaces and provider-specific reference shapes; the conceptual draft is in
  [Port boundaries](ports.md).
- Operation tombstone bounds and detailed failure or timeout behavior.
- State snapshots, replay, interrupted-run recovery, and distributed state ownership.
