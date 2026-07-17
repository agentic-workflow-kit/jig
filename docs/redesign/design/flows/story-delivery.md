---
title: "Flow — single Story delivery scenario"
purpose: Show, in message order, how one admitted Story moves from bounded assignment through independent review, serialized finalization, and confirmed landing.
audience:
  - Product, architecture, engineering, security, and operations readers
  - Arye Kogan, Jig product and architecture decision owner
scope: One Story's primary success scenario and the review-changes branch; Run-level phases, parking, interruption, capacity mechanics, and all Layer 2 protocol detail are excluded.
state: proposed
status: established Layer 1 baseline; no semantic change in the 2026-07-17 readiness-remediation candidate
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ../brief.md
  - ../model.md
  - ./run-and-story-lifecycle.md
  - ../acceptance-and-evidence.md
  - ../concurrency-and-finalization.md
related:
  - ../context.md
  - ../state-and-recovery.md
  - ../failure-and-liveness.md
---

# Flow — single Story delivery scenario

This scenario plays one Story through the structural model: the participants are those of the
[system context](../context.md), the phases are those of the
[Run and Story lifecycle](./run-and-story-lifecycle.md), and every message uses a relationship that
exists there. It adds message order and branching; it defines no new facts.

- **Trigger:** One Story is admitted within resource-class capacity in an Active Run.
- **Preconditions:** The Run definition is frozen; the Story's prerequisites are confirmed `Landed`;
  isolated resources and a bounded implementer assignment exist.
- **Outcome:** The Story records `Landed` and dependent Stories are released — or the Candidate
  returns through bounded rework.
- **Participants:** Jig Control, the implementer, the independent reviewer, and the delivery system
  and target.

## View V5 — Story delivery scenario

- **Question:** What happens, in order, when one Story goes from assignment to confirmed landing,
  and where does the review-changes branch return?
- **View type:** Scenario sequence view over the structural model.
- **Audience and purpose:** All readers; verify the primary success narrative and the acceptance
  gate in time order.
- **Scope and exclusions:** One Story's messages between Jig and its participants. Run intake,
  parking, interruption, Retirement mechanics, and provider protocols are excluded.
- **State:** Proposed.
- **Owner:** Arye Kogan.
- **Sources:** D3, D4, D6, D7; I5, I7–I9, I12–I13.
- **Related views:** [V3](./run-and-story-lifecycle.md) owns the full phase flow with all branches;
  [V4](../state-and-recovery.md) owns the authority-and-proof chain these messages traverse.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, ui-sans-serif, system-ui", "primaryTextColor": "#172033", "lineColor": "#65758b"}}}%%
sequenceDiagram
    participant Jig as Jig Control
    participant Impl as Implementer
    participant Rev as Independent reviewer
    participant Del as Delivery system and target

    Jig->>Impl: Assigns bounded implementation for one admitted Story
    Impl-->>Jig: Proposes committed exact Candidate, self-report, and evidence
    Note over Jig: Validates identity, role, exact subject, and evidence.<br/>Records the durable transition before any dispatch.
    opt Review mode requires a forge venue
        Jig->>Del: Publishes the exact Candidate and opens/updates a draft non-mergeable request under D15
        Del-->>Jig: Attests the stable review ref and request metadata; no finalization authority exists
    end
    Jig->>Rev: Assigns the exact Candidate and complete delivery package
    alt Reviewer approves the exact Candidate
        Rev-->>Jig: Attests full-package approval verdict
        Note over Jig: Validates the verdict and evidence and records Accepted.<br/>The Story waits in deterministic order without authority.
        Note over Jig: Acquires the sole target-scoped finalization authority.<br/>Runs the policy-selected final verification.
        Jig->>Del: Authorizes the delivery effect under the authority fence
        Del-->>Jig: Reports effect certainty
        Jig->>Del: Requests the post-effect target observation
        Del-->>Jig: Confirms the target contains the Accepted result
        Note over Jig: Records Landed and releases dependent Stories immediately.<br/>Retirement follows separately and cannot reverse the outcome.
    else Reviewer requires changes
        Rev-->>Jig: Attests changes-required verdict with findings
        Jig->>Impl: Authorizes separately bounded rework
    end
```

**V5 legend:** Solid arrows are Jig-authorized assignments or requests; dashed arrows are the
attributable results and attestations participants return. Notes over Jig Control mark the durable
lifecycle decisions it records; per the
[authoritative transition ordering](./run-and-story-lifecycle.md#view-v3c--authoritative-transition-ordering),
every recorded decision commits before the next dispatch. The `alt` block separates the approval
path from the changes-required path. There are no abbreviations.

## What this scenario deliberately omits

- **Failure and uncertainty:** a bounded failure, exhausted rework, reconciled finalization failure,
  or uncertain effect leaves this scenario through the branches in
  [V3](./run-and-story-lifecycle.md) and the reconciliation rules in
  [state and recovery](../state-and-recovery.md); an indeterminate delivery effect never triggers a
  second semantic attempt before reconciliation.
- **Waiting detail:** the deterministic order and the single finalization authority are defined in
  [concurrency and finalization](../concurrency-and-finalization.md).
- **Evidence rules:** what the reviewer judges and what Jig validates are defined in
  [acceptance and evidence](../acceptance-and-evidence.md).
