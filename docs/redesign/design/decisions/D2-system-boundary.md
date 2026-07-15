---
title: "D2 — system boundary and external relationships"
purpose: Record the owner-selected authority-and-proof boundary that defines what Jig is responsible for end to end.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Future Layer 2 architecture authors after authorization
scope: The D2 selection, rationale, accepted consequence, rejected alternatives, and Layer 2 deferral; the canonical boundary content is owned by the context page.
state: proposed
status: established owner decision, re-presented 2026-07-15; lock pending the Layer 1 gate
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../brief.md
  - ../../raw/design/decisions.md
related:
  - ./README.md
  - ../context.md
  - ../invariants.md
---

# D2 — system boundary and external relationships

- **Status:** Owner-selected; lock pending the Layer 1 gate.
- **Owner:** Arye Kogan.
- **Related:** [System context](../context.md), [invariant I2](../invariants.md).

## Question

What is Jig responsible for end to end, and which people, judgment providers, mechanisms, stores,
repositories, and delivery systems remain external?

## Owner-selected direction

Use an **authority-and-proof boundary**. Jig owns semantic capability boundaries, deterministic
preflight sufficiency, request identity and validation, authoritative recording, lifecycle and
Operation authorization, interruption and uncertain-effect reconciliation, and proof obligations
for acceptance, delivery, landing, outcomes, and Retirement.

Configured mechanisms perform effects and report attributable observations or effect certainty.
“External” means outside Jig's decision authority, not necessarily outside its repository,
installation, deployment, or process.

## Rationale and benefits

- Makes end-to-end guarantees Jig responsibilities rather than adapter assumptions.
- Keeps judgment and effect mechanisms replaceable.
- Gives Recovery, no-double-effect behavior, landing proof, and escalation clear ownership.
- Preserves the useful separation between deterministic control and mechanisms.

## Accepted negative consequence and trade-off

Jig must establish and verify stronger contracts for persistence, effects, evidence, and
reconciliation. Arye accepted a larger responsibility than a thin scheduler in exchange for strong
end-to-end accountability and proof.

## Alternatives not selected

- A thin coordinator owning only scheduling and live state.
- An integrated platform absorbing agents, workspaces, verification, delivery, and storage into one
  authority boundary.

## Deliberate Layer 2 deferral

Port count, component boundaries, packages, processes, provider registration, APIs, and deployment
topology remain deferred. The authority-and-proof boundary does not.
