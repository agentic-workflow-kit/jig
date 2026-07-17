---
title: "D15 — bounded pre-acceptance review publication"
purpose: Record the owner-selected capability for publishing an exact Candidate to a draft, non-mergeable review venue before acceptance without granting finalization or landing authority.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers implementing review and delivery providers
scope: The review-publication authority, exclusions, accepted cost, rejected alternatives, and realization deferrals; acceptance and landing authority remain owned by D7 and D6.
state: approved
status: owner-approved readiness-remediation direction of 2026-07-17; renewed exact-candidate review pending
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ../../../product/jig.md
  - ./D6-concurrency-and-finalization.md
  - ./D7-acceptance-and-evidence.md
related:
  - ./README.md
  - ../forge-and-landing.md
  - ../review-and-verification-execution.md
  - ../architecture-conformance.md
---

# D15 — bounded pre-acceptance review publication

- **Status:** Owner-approved readiness-remediation amendment; renewed exact-candidate review pending.
- **Owner:** Arye Kogan.
- **Related:** [Forge and landing](../forge-and-landing.md),
  [review and verification execution](../review-and-verification-execution.md),
  [D6 — concurrency and finalization](./D6-concurrency-and-finalization.md), and
  [D7 — acceptance and evidence](./D7-acceptance-and-evidence.md).

## Question

How can ordinary code review receive an exact Candidate branch and integration request before a
reviewer can accept it, without granting pre-acceptance merge, target-change, finalization, or
landing authority?

## Owner-selected direction

Add a bounded **review-publication capability** on `PORT-DELIVERY`:

- a Transition entering `Reviewing`, or recording and surfacing a `Blocked` Story, may authorize
  `OPC-REV-PUBLISH`, `OPC-REV-REQUEST`, `OPC-REV-STATUS`, and `OPC-REV-COMMENT`;
- `CP-TRANSITION` is the authorizer because every Operation intent exists only in a recorded
  Transition; `CP-MEDIATOR` narrows the provider manifest into `CB-REVIEW-PUBLICATION`, dispatches
  the Operation, and validates its result;
- the binding and fence name the exact Candidate content digest and target basis, current
  controller generation, dedicated review ref, draft request identity and markers, and provider
  manifest;
- review publication omits `ID-AUTH`, never involves `CP-FINALIZER`, and cannot create or touch the
  target lineage anchor, mutate the target ref, acquire or retain finalization authority, request
  merge, declare landing, or invoke an `OPC-DEL-*` Operation;
- the integration request is draft and non-mergeable by enforced contract; its stable identity and
  observed metadata join the review package's delivery metadata;
- publication, request creation, status, or explanation is neither acceptance nor landing and
  cannot release dependencies; and
- each external effect is idempotent or discoverable by its stable marker and reconciles under I17.

After acceptance, all target-changing and landing Operations are proposed only by `CP-FINALIZER`
while it holds sole target authority under D6 and D7; like every Operation, they are authorized
only inside a recorded `CP-TRANSITION` Transition. This decision adds no reviewer-less acceptance
mode and changes no D7 acceptance substance.

## Rationale and benefits

- Ordinary code review can judge the real branch and request before returning a verdict.
- Blocked work can be surfaced on the same bounded review venue without pretending it reached
  `Accepted`.
- Exact-Candidate fencing and a distinct capability keep publication useful without turning it
  into target authority.
- Separate status and explanation Operations preserve single-effect reconciliation.

## Accepted negative consequence and trade-off

Draft branches and requests may exist before acceptance. They create forge clutter, reconciliation
work, and later Retirement obligations even when a Story is rejected or blocked. Arye accepts that
cost to make ordinary code review possible without widening finalization or landing authority.

## Alternatives not selected

- Require acceptance before any review venue exists.
- Grant `CP-FINALIZER` or `ID-AUTH` before acceptance.
- Let the worker or reviewer hold forge credentials or publish autonomously.
- Reuse the landing capability without a distinct review scope.
- Create a mergeable request before acceptance.

## Deliberate Layer 2 realization deferrals

Provider-specific draft representation, branch naming, status wording, transport and credential
mechanics, and cleanup timing remain realization choices. None may relax the non-mergeable,
no-anchor, no-target-change, no-finalization-authority, or no-landing exclusions above.
