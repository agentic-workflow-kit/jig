---
title: "Deterministic story orchestration — operations and results"
status: proposal — draft for review, not yet agreed or adopted
---

# Operations and results

This layer defines the first-phase semantic contracts exchanged between the deterministic core,
runtime coordinator, and the effect ports in [Port boundaries](ports.md). It refines the
`OperationRegistry` described by [Live state](live-state.md). The contracts are conceptual closed
unions; concrete serialization schemas remain deferred.

## Operation boundary

An operation is a requested external effect whose completion occurs after the transition that
requested it. The deterministic core produces the request, while the runtime assigns trusted
identity, persists the request event, adopts the new live state, and only then dispatches it.

Event append and artifact recording are not ordinary orchestrated operations:

- event append is the atomic commit boundary that must succeed before state adoption and dispatch;
- required artifacts are made durable by the producing adapter before its completed result is
  accepted; and
- neither storage action enters `OperationRegistry` or changes domain state by itself.

## Closed request union

Every operation belongs to a closed, versioned union. Conceptually, the runtime dispatches:

```text
OperationRequest<TPayload>
- operationId
- schemaVersion
- kind
- runId
- owner: run | storyId
- payload
```

The runtime controls the common envelope:

- `operationId` is unique within the run and is the dispatch idempotency key;
- `schemaVersion` comes from the registered contract for the operation kind;
- `runId` comes from the runtime's scoped run context;
- `owner` identifies the run or exact story whose state may consume the result; and
- `kind` selects exactly one payload type and one effect port.

Session references, workspace references, candidate and target SHAs, check-set identities,
delivery mode, expected remote state, and other semantic basis belong in the typed payload for the
specific operation. Credentials, provider clients, ambient environment objects, and raw policy or
configuration do not cross the request boundary.

## Closed result union

Every dispatched request produces at most one accepted terminal result:

```text
OperationResult<TResult>
- operationId
- kind
- outcome
  - completed: TResult
  - failed: OperationFailure
```

The result does not choose its run, owner, producer attribution, or expected basis. The runtime
looks those facts up from `OperationRegistry` and the scoped adapter binding. A completed payload
must report the identities it actually observed, such as session ID, workspace HEAD, candidate SHA,
target SHA, remote branch SHA, or pull-request ID, so the runtime can compare facts with the
request.

An accepted terminal result settles the operation. Duplicate results are recognized from the
settled-operation tombstone and rejected without another state change.

## Completed operation versus positive domain outcome

`completed` means that the port executed the request and returned a valid, reliable observation.
It does not mean the story should advance.

Examples:

- final verification completed and reported `failed` checks;
- remote-check observation completed and reported a failing required check;
- integration completed and reported `target-moved` or `conflict`;
- landing confirmation completed and reported `not-landed`; or
- an agent assignment completed with an explicit inability-to-continue report.

These produce `operation.succeeded` because the external operation itself completed. The same
transition emits the relevant semantic event and lets the deterministic core choose the lifecycle
outcome.

`failed` means the port could not execute or reliably observe the requested operation. It produces
`operation.failed`; retry, block, or best-effort continuation remains a core decision under policy.

## Failure contract

An `OperationFailure` contains factual technical information rather than a lifecycle decision:

- a stable failure code and operation stage;
- a sanitized human-readable summary;
- whether the effect is known not to have occurred, known to have occurred, or is uncertain;
- the observed identities available at failure time; and
- optional immutable diagnostic artifact references.

The operation stage distinguishes dispatch, execution, observation, and required-artifact
persistence failures. Effect certainty is essential for remote mutation: an adapter must not label
an uncertain merge, push, or PR creation as safely unapplied.

The adapter does not return `retryable`, `blocking`, or `best-effort` as a domain decision. Later
failure-and-liveness design maps the stable failure code, effect certainty, operation kind, policy,
and current live state to the next deterministic action.

## First-phase operation catalog

### Agent-session operations

| Kind                       | Required basis                                                                 | Completed result                                              |
| -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `agent.open-session`       | Role, resolved route, authority scope, and workspace when role access needs it | Stable opaque session reference and confirmed role            |
| `agent.run-implementation` | Implementer session, story assignment, round, target basis, findings, evidence | Candidate submission or explicit inability-to-continue report |
| `agent.run-review`         | Reviewer session, exact candidate package, criteria, responsibilities          | Structured verdict for the exact reviewed SHA                 |
| `agent.close-session`      | Exact retained session reference                                               | Confirmed closed or already-closed observation                |

Opening implementer and reviewer sessions remains separate so the reviewer need not exist before a
candidate is ready. Subsequent implementation fixes and target refreshes use the same implementer
session; subsequent reviews use the same reviewer session.

An implementation assignment distinguishes initial implementation, review-fix, and target-refresh
work in its typed payload. A review assignment distinguishes initial and refreshed review while
preserving the same result contract.

### Workspace operations

| Kind                       | Required basis                                                       | Completed result                                                        |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `workspace.provision`      | Story, branch identity, repository, and exact target basis           | Workspace reference, branch identity, and observed initial HEAD         |
| `workspace.inspect`        | Workspace reference and expected story or cleanup context            | HEAD, branch, cleanliness, untracked-work, and preservation observation |
| `workspace.refresh-target` | Configured target identity and current known target basis            | Updated local target reference and exact observed SHA                   |
| `workspace.retire`         | Workspace, branch, and required clean and preservation preconditions | Removed, already-removed, or refused-with-observed-reason result        |

`workspace.retire` completing with `refused` is a valid safety outcome. The adapter must not remove
a workspace when its typed preconditions are not proven.

### Local-verification operation

| Kind                     | Required basis                                           | Completed result                                                            |
| ------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `verification.run-final` | Workspace, exact candidate SHA, and configured check set | `passed` or `failed`, observed SHA, check manifest, and evidence references |

The operation cannot return `passed` if candidate identity changed, required evidence could not be
recorded, or tracked content was mutated by verification.

### Delivery operations

| Kind                       | Required basis                                                                 | Completed result                                                          |
| -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `delivery.observe-target`  | Configured repository and target identity                                      | Exact observed target SHA                                                 |
| `delivery.publish-branch`  | Story branch, exact SHA, purpose, remote ref, and guarded update expectation   | Published remote ref and exact remote SHA                                 |
| `delivery.create-pr`       | Published source SHA, target, exact approved metadata, and no existing PR      | Stable PR reference, recorded head SHA, base target, title, and body hash |
| `delivery.observe-checks`  | PR or delivery candidate, exact SHA, and required check identities             | `pending`, `passed`, or `failed` snapshot with check evidence             |
| `delivery.integrate`       | Delivery mode, exact approved source SHA, expected target SHA, and optional PR | `integrated`, `target-moved`, `conflict`, or `rejected` observation       |
| `delivery.confirm-landing` | Configured target, approved candidate, and required confirmation method        | `landed`, `not-landed`, or `indeterminate` with proof evidence            |

`delivery.publish-branch` identifies its purpose as checkpoint or delivery. A checkpoint result
never creates approval or authorizes later delivery. Guarded force-with-lease publication includes
the exact previously observed remote SHA in its basis.

`delivery.observe-checks` may complete with `pending`. If policy still permits waiting, the core
may later request another observation as a new operation. The port does not poll indefinitely or
decide when waiting is exhausted.

`delivery.integrate` does not imply landing. Only a later `delivery.confirm-landing` result of
`landed` can cause `story.landed`.

## Agent result contracts

### Candidate submission

A completed implementation result returns either a candidate submission or an explicit inability
to continue. A candidate submission contains:

- story, branch, worktree, implementer session, and exact candidate SHA;
- the target SHA on which the candidate is based;
- implementation round and whether it is initial, review-fix, or target-refresh work;
- implementation summary and changed-scope evidence;
- the complete assigned-check evidence manifest bound to the candidate;
- confirmation that checked tracked content did not change before commit;
- proposed delivery metadata when required; and
- durable references for required supporting artifacts.

The runtime rejects a candidate whose observed workspace identity, session, story, branch, target
basis, check manifest, or artifact integrity does not match the requested operation.

### Review verdict

A completed review result contains:

- story, reviewer session, exact reviewed candidate SHA, and review round;
- `approved`, `changes-required`, or `blocked`;
- structured findings and unresolved-finding count;
- assessment of required implementer evidence;
- assessment of delivery-metadata accuracy and completeness; and
- durable references for required review artifacts.

An approval with unresolved findings, missing required evidence, a different SHA, or altered
delivery metadata is invalid input rather than a weaker approval.

An explicit agent inability-to-continue or reviewer `blocked` verdict is a completed semantic
result. The core decides whether and how the story blocks.

## Result validation and rejection

Before a result can trigger a transition, the runtime validates:

1. the operation exists and remains pending;
2. the result kind matches the request kind and registered schema;
3. the result arrived through the adapter bound to that operation;
4. the owner and current story phase may still consume it;
5. all returned session, workspace, branch, candidate, target, PR, and remote identities match the
   expected basis;
6. every required artifact reference exists and passes integrity validation; and
7. the semantic payload satisfies its kind-specific invariants.

An unknown, duplicate, stale, malformed, or mismatched result does not change domain state. The
runtime records `message.rejected` when possible. Rejection alone does not fabricate a failure or
settle a still-valid pending operation; timeout and abandoned-operation behavior belongs to later
failure-and-liveness design.

## Idempotency and attempts

`operationId` is the idempotency identity for one requested external effect.

- Redispatch after an uncertain transport handoff uses the same operation ID and identical payload.
- A policy-authorized new semantic attempt receives a new operation ID.
- When causality matters, the new request or its `operation.requested` event names the prior
  operation it supersedes; no generic transition identifier is introduced.
- A settled operation keeps a minimal tombstone until the active run no longer needs duplicate or
  late-result recognition.

Adapters must use provider idempotency mechanisms when available and report effect certainty when
they are not sufficient. The first phase does not promise recovery after process loss.

## Event mapping

Requesting an operation emits `operation.requested` with the operation identity, kind, owner, exact
semantic basis, and a safe representation or digest of its payload.

An accepted completed result emits `operation.succeeded`; an accepted technical failure emits
`operation.failed`. The same transition emits any relevant semantic event, such as
`candidate.submitted`, `review.verdict-submitted`, `target-refresh.required`, or `story.landed`.

Secrets, credentials, raw provider responses, and unbounded artifacts are never copied into these
events.

## First-phase invariants

1. Every operation has one trusted identity, owner, kind, typed payload, and effect port.
2. Every accepted terminal result settles exactly one pending operation.
3. A completed operation may carry a negative domain observation.
4. Technical failure and semantic negative outcome remain distinct.
5. Ports report facts and effect certainty; the core decides retry, block, or continuation.
6. Candidate-sensitive requests and results identify the exact SHA they affect.
7. Unknown, duplicate, stale, malformed, or mismatched results never advance state.
8. Provider-specific objects and credentials do not enter operation contracts or events.
9. A new semantic attempt uses a new operation ID; duplicate-safe redispatch uses the same ID.
10. Event and artifact persistence are not disguised as ordinary story operations.

## Deferred decisions

- Concrete serialized schemas and compatibility mechanics.
- Exhaustive stable failure-code taxonomy and policy mapping.
- Timeout, cancellation, retry budget, and abandoned-operation transitions.
- Provider-specific idempotency implementation and uncertain-effect reconciliation.
- Operation tombstone bounds after a run terminates.
