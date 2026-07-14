---
title: "Deterministic story orchestration — story execution"
status: proposal — agreed design, not yet reconciled or adopted
---

# Story execution

This layer defines scheduling and the lifecycle of one story after the
[input envelope](inputs.md) has passed preflight and the
[orchestration core](orchestration.md) has recorded its resolved routes.

## Story lifecycle

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, ui-sans-serif, system-ui", "primaryTextColor": "#172033", "lineColor": "#65758b"}}}%%
stateDiagram-v2
    [*] --> Waiting

    state "Waiting for dependencies" as Waiting
    state "Eligible" as Eligible
    state "Provisioning worktree" as Provisioning
    state "Implement, check, and commit" as Implementing
    state "Review exact candidate" as Reviewing
    state "Approved at exact SHA" as Approved
    state "Waiting for target lease" as FinalizationQueue
    state "Landed" as Landed
    state "Retiring resources" as Retiring
    state "Closed" as Closed
    state "Blocked" as Blocked
    state "Blocked by dependency" as BlockedByDependency

    Waiting --> Eligible: all prerequisites landed
    Waiting --> BlockedByDependency: any prerequisite blocked

    Eligible --> Provisioning
    Provisioning --> Implementing: worktree and branch ready
    Provisioning --> Blocked: provisioning cannot complete

    Implementing --> Reviewing: checks passed and candidate committed
    Implementing --> Blocked: implementer session lost or budget exhausted

    Reviewing --> Implementing: changes required and fix loops remain
    Reviewing --> Blocked: review-fix limit exhausted
    Reviewing --> Blocked: reviewer blocks or session is lost
    Reviewing --> Approved: complete package approved

    Approved --> FinalizationQueue

    state "Finalizing with target lease" as Finalizing {
        [*] --> CheckTarget

        state "Check current target SHA" as CheckTarget
        state "Prepare against latest target" as PrepareLatest
        state "Review refreshed candidate" as FinalReview
        state "Optional deterministic local verification" as LocalVerify
        state "Push, PR or merge, and confirm" as Deliver

        CheckTarget --> LocalVerify: candidate still aligned
        CheckTarget --> PrepareLatest: target moved
        PrepareLatest --> FinalReview: rebase checks passed and candidate committed
        FinalReview --> PrepareLatest: changes required
        FinalReview --> CheckTarget: refreshed SHA approved
        LocalVerify --> Deliver: passed or policy mode is none
        Deliver --> CheckTarget: target moved again
        Deliver --> [*]: landing confirmed
    }

    FinalizationQueue --> Finalizing: acquire target lease
    Finalizing --> Implementing: local verification finds a code problem
    Finalizing --> Landed: landing confirmed
    Finalizing --> Blocked: limit exhausted or delivery cannot complete

    Landed --> Retiring: unlock dependents immediately
    Retiring --> Retiring: cleanup retry
    Retiring --> Closed: target updated, worktree removed, agents closed

    Closed --> [*]
    Blocked --> [*]
    BlockedByDependency --> [*]

    note right of Blocked
        Preserve committed branch and evidence
        Best-effort push-on-block by default
        Transitively block downstream stories
        Independent stories continue
    end note

    note right of Landed
        Dependency eligibility changes here,
        not after resource cleanup
    end note

    classDef waiting fill:#e8f1ff,stroke:#5a78a8,color:#172033;
    classDef active fill:#fff1cf,stroke:#a8781f,color:#172033;
    classDef complete fill:#e8f7ed,stroke:#4f8a63,color:#172033;
    classDef stopped fill:#fce8e6,stroke:#a7615b,color:#172033;
    class Waiting,Eligible,FinalizationQueue waiting;
    class Provisioning,Implementing,Reviewing,Approved,Finalizing,Retiring active;
    class Landed,Closed complete;
    class Blocked,BlockedByDependency stopped;
```

The diagram shows the logical states. A transition back from final local verification to
implementation invalidates the old approval if code changes and must return through the ordinary
implementer-check-commit-review sequence before finalization can resume.

## Eligibility and provisioning

The orchestrator computes eligibility from the plan's dependency graph and recorded landed or
blocked outcomes. When capacity is available, it dispatches workspace creation for an eligible
story and starts its implementer session in that worktree using the story's frozen route.

If an upstream story blocks, every transitive dependent becomes `blocked-by-dependency` with a
causal path to the originating block. Those downstream stories receive no worktrees or agent
sessions. Unrelated eligible stories continue.

## Scheduling and capacity

The first phase uses simple story-count concurrency rather than weighted scheduling:

- policy defines the maximum number of concurrently active stories;
- configuration declares actual available session capacity;
- the orchestrator respects the lower effective limit; and
- size and complexity influence routing, effort, and budget, but not a scheduling weight.

An implementation or initial review may proceed in parallel with work on independent stories.
Finalization is separately serialized through the target lease.

## Implementation and review rounds

For the initial candidate and after every reviewer-requested fix, the same sequence applies:

1. The implementer changes the worktree.
2. The implementer runs all checks assigned to its role.
3. If an assigned check fails, the implementer continues working and does not submit the
   candidate.
4. Once the assigned checks pass, the implementer makes no further content changes before commit.
5. The implementer commits and submits the exact candidate with its evidence.
6. The orchestrator validates the submission and assigns the exact SHA to the same reviewer.
7. The reviewer evaluates the code, requirements, evidence, and delivery metadata without
   repeating implementer checks by default.

`changes-required` findings return through the orchestrator to the same implementer. The same
reviewer assesses the next committed candidate. Reviewer-requested correction rounds increment the
review-fix counter. A successful review produces an approved delivery package.

The default maximum is five review-fix loops. Exhausting the fifth loop blocks the story with
`review-loop-limit-exceeded`, blocks all transitive dependents, preserves the branch and evidence,
and leaves independent work eligible.

The resolved implementer and reviewer routes remain fixed through all normal rounds. There is no
automatic model escalation, session replacement, or mid-story rerouting in the first phase.

## Finalization queue and lease

Approved stories enter a queue for the run's configured target. Only one story at a time may hold
the target's finalization lease. Other stories may continue implementation and initial review
while waiting, but no other orchestrated story may merge into that target during the lease.

The lease begins when a story starts final target alignment and ends when its landing is confirmed
or the story reaches a named blocked outcome. After a process interruption, the target must be read
again; an old lease is never assumed valid. Full session or run recovery remains deferred.

Waiting stories do not rebase after every preceding merge. They align once when their own
finalization turn begins. This avoids deterministic churn when several stories were developed in
parallel.

## Target alignment and refreshed review

When finalization starts, the orchestrator reads the current target SHA.

- If the approved story is already based on that SHA, it may proceed to the configured final local
  verification mode.
- If the target moved, the orchestrator asks the same implementer to rebase onto the exact target
  and resolve conflicts.
- Before committing the refreshed candidate, the implementer reruns every assigned check.
- The same reviewer reviews the complete refreshed package and approves its new exact SHA.
- Immediately before delivery, the orchestrator confirms both the approved branch SHA and target
  SHA still match the reviewed finalization basis.

A rebase rewrites branch history and invalidates the prior approval. If the branch already exists
remotely, its deterministic update uses guarded `force-with-lease` against the previously recorded
remote SHA. The implementer never performs that push.

Target movement after finalization has begun increments a separate target-refresh counter. The
initial alignment when a story reaches the front of the queue is not a retry. The default maximum
is five repeated target refreshes. Exhaustion blocks the story with
`target-refresh-limit-exceeded`; downstream blocking and preservation rules then apply normally.

Reviewer-requested fixes and target refreshes use independent counters. Target movement cannot
consume the five implementation review-fix loops merely because other work landed.

## Handoff to delivery

After the candidate remains aligned and approved, the story follows the configured final local
verification mode and the [delivery and operations flow](delivery-and-operations.md). Any later
code mutation invalidates the approved package and returns the story through implementer checks,
commit, and review.
