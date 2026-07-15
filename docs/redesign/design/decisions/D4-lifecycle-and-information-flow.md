---
title: "D4 — canonical lifecycle and authoritative information flow"
purpose: Record the owner-selected recoverable hierarchical lifecycle with separate business-outcome and Retirement dimensions.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Future Layer 2 architecture authors after authorization
scope: The D4 selection, rationale, accepted consequence, rejected alternatives, and Layer 2 deferral; the canonical lifecycle content is owned by the lifecycle flow page.
state: proposed
status: established owner decision, re-presented 2026-07-15; lock pending the Layer 1 gate
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../brief.md
  - ../../raw/design/decisions.md
related:
  - ./README.md
  - ../flows/run-and-story-lifecycle.md
  - ../invariants.md
---

# D4 — canonical lifecycle and authoritative information flow

- **Status:** Owner-selected; lock pending the Layer 1 gate.
- **Owner:** Arye Kogan.
- **Related:** [Run and Story lifecycle](../flows/run-and-story-lifecycle.md),
  [invariants I5, I13–I14, I18–I19](../invariants.md).

## Question

What is the canonical Run and Story lifecycle, including outcomes, target authority, resources,
interruption, Recovery, escalation, and terminal completion?

## Owner-selected direction

Use a **recoverable hierarchical lifecycle with separate business-outcome and Retirement
dimensions**.

The Run progresses through Received, Preflighting, Active, optional Parked or
Interrupted/Recovering conditions, Settling, and Completed. A Story progresses through Pending,
Eligible, Preparing, Implementing, Reviewing, Accepted, Waiting for finalization, Finalizing,
business outcome, Retiring, and Closed.

Business outcomes are `Landed`, directly `Blocked`, and derived
`Not run — dependency blocked`. Landing immediately releases dependents; direct blocking immediately
makes transitive dependents ineligible while independent work may continue. Retirement follows both
Landed and Blocked. A Story closes only when outcome and obligations are final; a Run completes only
when every outcome is final and every obligation completes or has an owner-accepted residual handoff.

Accepted transitions and authorized Operation intents are recorded durably before live adoption or
dispatch. External results and owner decisions return as later validated triggers.

## Rationale and benefits

- Dependency consequences happen at the business event rather than cleanup.
- Cleanup failure cannot reverse landing.
- Blocked work remains preservable and recoverable.
- Finalization authority, interruption, and uncertain effects have explicit lifecycle ownership.
- The model resolves the archive's premature terminal `Blocked` contradiction.

## Accepted negative consequence and trade-off

The lifecycle is richer than one flat status, and later design must prevent invalid combinations
between outcome and Retirement. Arye accepted this modeling discipline in exchange for correct
cleanup, Recovery, and dependency behavior.

## Alternatives not selected

- One strictly linear lifecycle ending only after cleanup.
- Fully independent business and resource supervisors coordinated as separate workflows.

## Deliberate Layer 2 deferral

Exhaustive states, transitions, event types, counters, timer interfaces, and cleanup task mechanics
remain deferred. The named phases, authoritative ordering, and outcome/Retirement separation do not.
