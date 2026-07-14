---
title: "Layer 0 — Project definition"
status: active operational standard
state: current
purpose: Define the problem, outcomes, scope, constraints, and decision ownership before architecture work.
audience: Product owners, architects, engineering leads, and reviewers framing new work.
scope: Project and product context; solution architecture is excluded.
owner: Architecture documentation owner.
last_verified: 2026-07-14
sources_of_truth:
  - ./README.md
  - ../architecture-design-and-documentation-guide.md
related:
  - ./01-high-level-architecture.md
  - ./source-reference.md
---

# Layer 0 — Project definition

## Read this page when

Use this layer when a project, redesign, or material change does not yet have an approved definition
of why it exists and what success means.

Do not read later layer guidance to complete this work. Architecture choices are not substitutes for
a clear problem, outcome, boundary, or owner.

## Entry conditions and inputs

There is a need, opportunity, risk, or constraint worth addressing, but one or more of these remains
unclear:

- target users or stakeholders;
- desired outcomes and success measures;
- included and excluded scope;
- quality requirements or constraints;
- decision ownership;
- assumptions and unresolved questions.

Useful inputs include user evidence, business constraints, policy, incidents, current product
promises, and known technical or operational limits. Treat inferred needs as assumptions until an
owner confirms them.

## Questions this layer must answer

1. What problem or opportunity justifies the work?
2. Who experiences it, uses the outcome, operates it, or bears its risk?
3. What observable outcomes define success?
4. What capabilities are required without prescribing their implementation?
5. What is inside and outside scope?
6. Which quality requirements and constraints materially shape later design?
7. Which assumptions or unknowns could change the work?
8. Who owns product and architecture decisions?

## Required output

Produce the smallest approved project definition that contains:

- problem and motivation;
- users and stakeholders;
- outcomes and success measures;
- required capabilities;
- scope and non-goals;
- material quality requirements and constraints;
- assumptions and open questions;
- decision owners;
- sources and evidence.

A single goal or project-brief document is normally enough. Add a glossary only when conflicting
vocabulary would otherwise distort architecture decisions.

## Allowed artifacts and diagrams

Use:

- project brief or initiative goal;
- capability list;
- quality-requirement scenarios;
- glossary;
- optional landscape or ecosystem sketch when organizational context is otherwise unclear.

An optional landscape sketch may show people and external systems, but it must not propose internal
runtime units, components, databases, queues, deployment topology, or technology choices.

## Crafting flow

1. Declare the audience, question, enabled decision, scope, state, and owner.
2. Separate observed facts from assumptions and proposed outcomes.
3. Write outcomes before capabilities and capabilities before solution ideas.
4. Express quality needs as testable scenarios or explicit constraints where possible.
5. Name non-goals aggressively enough to prevent later scope drift.
6. Review the definition with the people who own value, risk, operation, and approval.
7. Record explicit approval and preserve unresolved questions for the next layer.

## Keep out of this layer

- service, component, port, adapter, database, or queue boundaries;
- state machines, APIs, schemas, and operation contracts;
- technology and hosting choices unless they are externally imposed constraints;
- implementation tasks, migration phases, rollout plans, and estimates;
- diagrams whose real purpose is to select architecture.

## Illustrative example

For a fictional `OrderHub` project:

- **Problem:** Small merchants manually coordinate payment and fulfillment.
- **Outcome:** Accepted orders receive a decision within one second and remain auditable.
- **Capability:** Accept, track, and fulfill an order.
- **Constraint:** Payment-card data remains with the payment provider.
- **Non-goal:** Carrier route optimization.

This is enough to begin architecture work. It does not decide whether OrderHub uses one service,
several workers, events, or synchronous calls.

## Review and approval gate

Approve this layer only when:

- the problem, users, outcomes, scope, and non-goals are explicit;
- success can be evaluated without knowing the eventual implementation;
- material constraints and quality requirements are visible;
- assumptions and open questions are not presented as facts;
- decision owners are named;
- no architecture choice is being smuggled in as a requirement.

## Handoff to Layer 1

The approved project definition becomes Layer 1's governing input. A Layer 1 session reads that
approved artifact, the [guidelines index](./README.md), and
[Layer 1 — High-level architecture](./01-high-level-architecture.md). It does not need to read this
guidance unless it is auditing or reopening the project definition.
