---
title: "Layer 4 — Current state and maintenance"
status: active operational standard
state: current
purpose: Publish verified current architecture and keep it aligned with changing implementation and operations.
audience: Architecture owners, maintainers, operators, reviewers, and people relying on current documentation.
scope: Current-state publication, evidence links, ownership, versions, staleness detection, and change routing.
owner: Architecture documentation owner.
last_verified: 2026-07-14
sources_of_truth:
  - ./README.md
  - ../architecture-design-and-documentation-guide.md
related:
  - ./03-implementation-and-operations.md
  - ./source-reference.md
---

# Layer 4 — Current state and maintenance

## Read this page when

Use this layer after implementation and verification, or whenever current architecture documentation
may have drifted from reality.

Read the [guidelines index](./README.md), this page, the current documentation entry point, and the
implementation or operational evidence relevant to the maintenance event. Earlier crafting guidance
is not required unless the change becomes a new proposal.

## Entry conditions and inputs

One of these is true:

- approved architecture has been implemented and verified;
- implementation, deployment, ownership, or external dependencies changed;
- an incident contradicted a documented assumption;
- a link, schema, dashboard, runbook, or implementation path moved;
- a reader reported an inaccuracy;
- a periodic or compliance review requires a current baseline.

Required inputs are current primary evidence: code, configuration, schemas, infrastructure,
telemetry, service catalogs, tests, runbooks, or verified operational state.

## Questions this layer must answer

1. What architecture is implemented and verified now?
2. Which proposal or approved design became current, and what remains unimplemented?
3. Do model identities, responsibilities, relationships, ownership, and lifecycle still match
   evidence?
4. Which views or links are stale, missing, or misleading?
5. What version or historical record preserves the prior state and rationale?
6. Does an observed difference represent documentation drift, an implementation defect, or a new
   architecture proposal?
7. Who owns the next verification event?

## Required output

Maintain the smallest navigable current-state set that enables readers to move from purpose to
architecture to implementation and operations. Update, as applicable:

- current documentation entry point and audience routes;
- model identities, responsibilities, relationships, ownership, and lifecycle;
- current structural, behavioral, deployment, and operational views;
- links to code, schemas, infrastructure, telemetry, tests, and runbooks;
- last-verified dates and evidence basis;
- version notes and historical records;
- inaccuracies, open maintenance items, and owners.

Current-state documentation reports verified reality. It must not silently incorporate unapproved
future ideas.

## Maintenance flow

1. Identify the event that triggered review.
2. Inspect primary current evidence before trusting narrative summaries.
3. Compare evidence with the canonical model and affected views.
4. Classify each difference:
   - documentation inaccuracy;
   - implementation defect against approved architecture;
   - approved but incomplete implementation;
   - material new architecture proposal;
   - harmless implementation detail outside maintained documentation.
5. Correct current facts and links without rewriting historical decisions.
6. Route implementation defects to delivery work and architecture proposals to the owning layer.
7. Create a meaningful version when the baseline changes materially.
8. Record evidence, owner, last-verified date, and next review trigger.

## Review triggers

Review current documentation when:

- a system, runtime unit, store, topic, external dependency, or owner changes;
- an API, event, data, trust, or authority contract changes materially;
- deployment topology changes in a way represented by maintained views;
- an incident or test contradicts a documented assumption;
- a proposal is approved, implemented, or superseded;
- linked evidence disappears;
- readers repeatedly misunderstand the same boundary or flow.

Periodic review may complement these triggers but should not replace change-driven verification.

## Keep out of this layer

- future ideas presented as current facts;
- editing an approved decision record to hide a later change;
- manually copying volatile source, schema, or topology detail that can be linked or generated;
- updating dates without verifying evidence;
- treating a documentation fix as proof that implementation conforms;
- solving a material architectural difference without routing it to Layers 0, 1, or 2.

## Illustrative example

Suppose OrderHub's fulfillment worker moves to a new deployment environment while retaining the same
logical responsibility and contracts.

- Update the relevant deployment view and evidence links.
- Keep the logical runtime identity and responsibility unchanged.
- Record the verification date and new infrastructure source.
- Preserve the old deployment snapshot when it matters historically.

If the worker's responsibility or trust boundary changes, this is not merely maintenance. Route the
change to the architecture layer that owns that decision.

## Review and completion gate

Complete maintenance only when:

- current claims are supported by current primary evidence;
- proposed, approved, implemented, current, and historical states remain distinguishable;
- affected model objects and views agree;
- links resolve to the correct implementation and operational evidence;
- meaningful prior baselines and decisions remain preserved;
- material differences are routed to the correct layer rather than silently reconciled;
- ownership, last verification, and future review triggers are explicit.
