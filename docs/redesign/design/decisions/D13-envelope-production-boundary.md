---
title: "D13 — envelope production and Work Source boundary"
purpose: Record the owner-selected realization of product-owned setup, track configuration, and the Work Source seam as a bounded Jig front end outside the run controller's authority core.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers planning the greenfield Jig realization
scope: The envelope-production boundary, its authority limits, accepted cost, and rejected alternatives; the canonical behavior lives in the envelope-production view.
state: approved
status: owner-approved direction of 2026-07-16; lock pending exact-candidate review; SEC-2 excluded
owner: Arye Kogan
last_verified: 2026-07-16
sources_of_truth:
  - ../envelope-production.md
  - ./D2-system-boundary.md
  - ./product-guarantee-import.md
  - ../../../product/guarantees.md
related:
  - ./README.md
  - ./product-readiness-gate-record.md
  - ../runtime.md
  - ../data-and-identity.md
---

# D13 — envelope production and Work Source boundary

- **Status:** Owner-approved product-readiness amendment; lock pending exact-candidate review.
- **Owner:** Arye Kogan.
- **Related:** [Envelope production](../envelope-production.md),
  [D2 — system boundary](./D2-system-boundary.md), and the
  [product reconciliation](../product-guarantee-reconciliation.md).

## Question

Where do track composition, repo-policy floors, work profiles, guided setup, presets, prompt
strategy, and the product-level Work Source seam live without moving mutable authoring behavior or
provider judgment into the deterministic per-Run authority core?

## Owner-selected direction

Ship a bounded **Envelope Builder** as part of the Jig product while keeping it external to
`SYS-JIG`'s run decision-authority boundary:

- the builder realizes `X-ENVELOPE`, the already-named external authority in D2/V1;
- it accepts candidate work through the independently swappable `PORT-SOURCE` Work Source seam,
  validates provenance and plan shape, and never bypasses owner approval;
- it composes repo-policy floors with one track's policy, work profile, provider authority
  manifests, setup declaration, and target/configuration facts into one immutable proposed
  Execution Envelope;
- it supplies versioned presets and guidance with reasons, but a preset is only authored input and
  confers no authority;
- an owner approves the exact composition digest before the envelope may cross `PORT-INTAKE`; and
- after intake, neither the builder nor a Work Source can mutate the frozen Run. Re-planning creates
  a successor envelope and successor Run with recorded lineage, never an in-place Run mutation.

The builder may share a command-line process with `RT-OPERATOR` or run separately; that packaging
choice cannot give it lifecycle, evidence-sufficiency, finalization, landing, or ledger-write power.
`RT-CONTROLLER` remains the sole routine lifecycle authority under D2/D3/I3.

## Rationale and benefits

- Satisfies CFG-2/3/5/6/8 and the Work Source fragment of STACK-2 without enlarging the trusted
  controller or weakening the frozen-envelope boundary.
- Keeps the plan as Jig's hard approved input: a Work Source proposes candidate work and
  provenance, while deterministic validation and explicit owner approval produce the envelope.
- Makes policy floors and the policy/work-profile split mechanically inspectable before a Run.
- Lets setup and prompt guidance evolve without becoming mutable control state inside an active
  Run.

## Accepted negative consequence and trade-off

Jig now owns a second architectural subsystem and a versioned composition contract in addition to
the execution core. Operators see an explicit proposal-and-approval step before launch, and a
changed input creates a new envelope digest instead of being silently inherited. This added
surface and ceremony are accepted in exchange for keeping mutable setup concerns outside the
authority core while still fulfilling the Jig product promise.

## Alternatives not selected

- **Put setup and Work Source behavior inside `RT-CONTROLLER`:** rejected because mutable authoring,
  provider discovery, and presets would enter the trusted per-Run control path and blur D2/I3.
- **Leave envelope production to an unnamed upstream product:** rejected because guided Jig setup,
  per-track configuration, and the Work Source seam are imported Jig product commitments.
- **Accept raw ambient configuration at launch:** rejected because repo floors, authority manifests,
  and owner approval would be conventional rather than digest-bound and fail-closed.
- **Allow in-run plan amendment:** rejected because it contradicts the frozen Run definition and
  invalidates exact-subject review, evidence, and recovery assumptions. A successor Run preserves
  the intent without rewriting history.

## Validation and revisit triggers

The decision is valid when the product-readiness candidate proves that all envelope inputs have one
owner, one digest path, and one validation point; `PORT-SOURCE` cannot reach the controller; and a
successor Run is the only re-plan path. Revisit only if the product explicitly moves setup or
Work Source outside Jig, or if a later owner decision permits mutable in-run envelopes.
