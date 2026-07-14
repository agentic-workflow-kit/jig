---
title: "Deterministic story orchestration — delivery and operations"
status: proposal — agreed design, not yet reconciled or adopted
---

# Delivery and operations

This layer begins after a candidate has passed the implementation-review flow and holds the
target's finalization lease described in [story execution](story-execution.md).

## Remote checkpointing

Checkpointing is independent of delivery. A remote checkpoint never creates a pull request,
changes approval, lands a story, or unlocks dependents.

Supported policy modes are:

| Mode               | Behavior                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `local-only`       | Keep committed candidates local until delivery requires a push.                                                  |
| `push-on-block`    | Push the latest committed candidate when the story blocks, without creating a pull request. This is the default. |
| `push-each-round`  | Push after each committed implementer round.                                                                     |
| `push-on-approval` | Push only the final approved candidate as part of delivery.                                                      |

Checkpoint enforcement is independently `best-effort` or `required`. The default is best-effort.
A best-effort failure is recorded and local work continues. A required checkpoint failure blocks
the story.

Implementers never push. The runtime dispatches a deterministic branch-push operation through
the delivery interface and records the exact pushed SHA. Ordinary checkpoint pushes are
fast-forward-only. A remote update after an explicit target rebase may use guarded
`force-with-lease` against the previously recorded remote SHA.

## Final local verification

After reviewer approval and target alignment, policy selects one of two modes:

- **`deterministic`**, the default: the runtime dispatches the configured final check set once
  through the local-verification interface against the exact approved candidate.
- **`none`:** the system trusts the implementer's check evidence and proceeds to delivery.

The core does not run project commands or interpret their output. The runtime validates the typed
result and the exact candidate identity returned by the interface.

A failed deterministic verification does not let delivery proceed. If the failure indicates a
code problem, the story returns to the same implementer. Any code mutation invalidates approval,
and the ordinary implementer-check-commit-review sequence runs again. Classification of transient
verification failures and their retry policy remains deferred.

Remote continuous integration is separate. When a pull request is the configured delivery
mechanism, its normal remote checks run after PR creation regardless of whether local deterministic
verification was enabled. They must reach the configured acceptable state before merge.

## Deterministic delivery

The runtime dispatches delivery only for the current approved package. Policy and
configuration determine:

- whether delivery pushes only, creates a pull request, or integrates directly;
- the concrete target branch and remote environment;
- whether independent local verification runs before delivery;
- the merge method;
- required remote check states when a pull request exists; and
- remote checkpoint requirements.

For the first phase, a pull request is a delivery mechanism, not another review stage. The
implementer proposes its title and body, and the reviewer approves their factual accuracy and
completeness as part of the package. The runtime creates the pull request through the delivery
interface, observes its normal remote checks, and requests the configured merge. Hosted review is
not part of this phase.

Immediately before a merge or direct integration, the runtime confirms that the approved
branch SHA and target SHA still match the reviewed finalization basis. If the target moved, the
story returns through target alignment and refreshed review. Transient delivery failures may be
retried deterministically; a non-recoverable failure blocks the story with a recorded reason.

## Landing and dependency unlock

The story becomes `landed` only after the configured target is confirmed to contain the delivered
result. That transition immediately makes dependent stories eligible. PR creation, branch push,
check success, or a merge request without landing confirmation does not unlock dependents.

Resource retirement is separate:

1. Update the local target view.
2. Confirm the story worktree has no uncommitted work.
3. Confirm the branch is preserved in every location required by policy.
4. Remove the worktree.
5. Close implementer and reviewer sessions.
6. Release the story's resource slot.

A cleanup failure does not reverse landing or block dependents. The landed story remains in
`retiring`, cleanup retries independently, and its resources may continue consuming capacity until
closure.

## Blocking semantics

The first phase uses fail-closed story outcomes:

| Cause                                                    | Story outcome                            | Downstream effect                                   | Independent work              |
| -------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------- | ----------------------------- |
| Five unsuccessful review-fix loops                       | `blocked: review-loop-limit-exceeded`    | Transitive dependents remain permanently ineligible | Continues                     |
| Five repeated target refreshes                           | `blocked: target-refresh-limit-exceeded` | Transitive dependents remain permanently ineligible | Continues                     |
| Reviewer explicitly cannot approve                       | `blocked` with structured reason         | Transitive dependents remain permanently ineligible | Continues                     |
| Implementer or reviewer session is irrecoverably lost    | `blocked: agent-session-lost`            | Transitive dependents remain permanently ineligible | Continues                     |
| Resolved agent route or budget cannot complete the story | `blocked` with structured reason         | Transitive dependents remain permanently ineligible | Continues                     |
| Required checkpoint cannot be persisted                  | `blocked: checkpoint-failed`             | Transitive dependents remain permanently ineligible | Continues                     |
| Best-effort checkpoint fails                             | No state change; record failure          | None                                                | Continues                     |
| Non-recoverable verification or delivery failure         | `blocked` with structured reason         | Transitive dependents remain permanently ineligible | Continues                     |
| Cleanup fails after landing confirmation                 | Remains `landed` and `retiring`          | Dependents remain eligible                          | Continues subject to capacity |

Only the story that directly encounters a blocking condition emits `story.blocked`. Transitive
dependents remain pending and emit no synthetic block events. At normal completion, the
`run.completed` event derives their outcome as `not-run: dependency-blocked` and names the
originating blocked story. A run may therefore finish with a mixed result: landed stories,
directly blocked stories, and derived dependency-blocked outcomes.

Invalid or unresolved input is different: it rejects the entire run during preflight before story
states or side effects exist.

## Retirement after a block

After the original story blocks, the runtime retires its resources without discarding work:

1. Confirm that the latest candidate is committed and record its branch and SHA.
2. Apply the configured checkpoint policy, including a no-PR remote push when required.
3. Preserve the candidate, review history, findings, check evidence, and effect evidence.
4. Close the implementer and reviewer sessions.
5. Remove the worktree only after confirming it has no uncommitted work and the branch is preserved
   in every policy-required location.

Dependency ineligibility does not wait for this retirement sequence. Downstream stories stop being
eligible immediately without emitting another event, and independent work may continue subject to
available capacity.

## Agreed first-phase defaults

| Setting                       | Default                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Run scope                     | One repository, one integration target, one delivery environment               |
| Input lifecycle               | Plan, policy, configuration, and resolved routes are immutable after preflight |
| Story classification          | Required size and complexity, each with three levels                           |
| Route lifecycle               | Fixed before execution; no mid-story escalation or replacement                 |
| Scheduling                    | Simple maximum active-story count bounded by configured capacity               |
| Story work unit               | One branch, one worktree, one implementer, one reviewer, zero or one PR        |
| Implementer validation        | Assigned checks before commit and submission in every round                    |
| Reviewer validation           | Consume implementer evidence; do not repeat implementer checks by default      |
| Final local verification      | `deterministic`; configurable to `none`                                        |
| Review-fix limit              | 5                                                                              |
| Target-refresh retry limit    | 5, separate from review fixes                                                  |
| Checkpoint mode               | `push-on-block`                                                                |
| Checkpoint enforcement        | `best-effort`                                                                  |
| Hosted PR review              | Disabled                                                                       |
| Finalization concurrency      | One active lease for the run's target branch                                   |
| Dependency unlock point       | Confirmed landing                                                              |
| Lost agent session            | Block story; recovery deferred                                                 |
| Cleanup failure after landing | Retry without reversing landing                                                |
| Runtime state                 | In memory only; no first-phase resume                                          |
| Durable run data              | Append-only events; no persisted current-state snapshot                        |

## Extension points

The design intentionally leaves the following additions possible without assigning new judgment
to the core:

- **Routing dimensions:** add approved plan characteristics such as risk, security sensitivity,
  domain, or required capabilities and extend the uniform policy's deterministic routing rules.
- **Route escalation:** add policy-defined fallback chains and typed escalation causes.
- **Hosted pull-request review:** add a post-PR acceptance stage that returns structured feedback
  to the same implementer and reviewer.
- **Specialist review:** add policy-selected reviewers that each emit a verdict against the same
  candidate package.
- **Alternative delivery:** implement the delivery interface for another forge, a local
  integration branch, a patch export, or another deterministic target.
- **Alternative workspace:** implement the workspace interface with another isolation substrate.
- **Agent providers:** implement the agent-session interface without exposing provider-specific
  protocol objects to the runtime or core.
- **Verification providers:** replace the local-verification implementation while preserving its
  exact-candidate and typed-result contract.
- **Metadata assistance:** add a low-cost, unprivileged copywriting helper that proposes text; the
  reviewer still approves it and the helper gains no delivery authority.
- **Recovery:** add an explicit snapshot, projection, or replay model and reconstruct or replace
  agent sessions in a later phase.

## Deferred decisions

- Exact payload schemas for the agreed event catalog and the remaining input, route, assignment,
  submission, verdict, package, and effect contracts.
- Concrete event storage, indexing, retention, artifact storage, and any future projection model.
- Input production, story classification, and upstream approval workflow.
- Additional routing dimensions and deterministic escalation rules.
- Session recovery, agent replacement, and replay after process interruption.
- Hosted review states, feedback ingestion, and review-loop interaction.
- Exact lease persistence, timeout, and stale-holder rules.
- Verification and delivery retry classification beyond target refreshes.
- Merge-method-specific proof that the approved candidate is what landed.
- Security gates required before remote checkpointing unapproved intermediate work.
- Run-level completion semantics when cleanup remains pending.
- Adoption, reconciliation, migration, and compatibility with any current implementation.
