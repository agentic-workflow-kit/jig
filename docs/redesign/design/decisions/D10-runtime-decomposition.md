---
title: "D10 — runtime decomposition and port model"
purpose: Record the proposed Layer 2 selection of a modular single-authority runtime with named ports as the only boundary crossings.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers realizing the Layer 2 design
scope: The D10 selection, rationale, accepted consequence, and rejected alternatives; the canonical decomposition content is owned by the runtime page.
state: proposed
status: proposed Layer 2 decision, authored 2026-07-15 under the owner continuation instruction; pending the Layer 2 independent review and owner stop
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../runtime.md
  - ./D2-system-boundary.md
  - ./D3-responsibilities-trust-authority.md
  - ./D9-invariants-and-artifact-shape.md
related:
  - ./README.md
  - ../components/control-plane.md
  - ../invariants.md
---

# D10 — runtime decomposition and port model

- **Status:** Proposed Layer 2 selection; pending the Layer 2 gate and owner stop.
- **Owner:** Arye Kogan.
- **Related:** [Runtime architecture](../runtime.md),
  [control plane components](../components/control-plane.md), [invariants I2–I3, I5–I7](../invariants.md).

## Question

Into which runtime units, ports, and processes does `SYS-JIG` decompose, consuming the D2 and D9
category 1 deferrals without weakening the authority-and-proof boundary?

## Proposed direction

Use a **modular single-authority runtime with named ports**:

- four runtime units: a thin operator interface, one run controller process per Run, a passive
  per-Run ledger store, and a passive immutable evidence artifact store;
- nine named ports as the only crossings of the authority boundary, with one port per V1 external
  relationship (`X-STORE` split into the conditional-append ledger contract and the immutable
  artifact contract);
- all lifecycle authority concentrated in the controller process, fenced per Run by the durable
  controller generation; and
- mechanism sessions executed outside the controller as separate local processes or remote
  services, so mechanism faults arrive as attested failures rather than shared-memory corruption.

The controller's internal component decomposition is recorded in the
[control plane view](../components/control-plane.md); this decision selects the unit, port, and
process shape.

## Rationale and benefits

- Keeps the trusted computing base — the deterministic controller — small, single-process, and
  verifiable, as D3's accepted consequence requires.
- Makes the Layer 1 boundary mechanically checkable: every external interaction names its port, so
  an undeclared control path is a visible contract violation rather than a code-review surprise.
- One controller per Run gives interruption, fencing, and recovery a process-shaped reality that
  matches the Run-scoped ledger authority of D5.
- Passive stores keep authority in recorded content and ordering, letting storage technology remain
  a replaceable conforming mechanism.

## Accepted negative consequence and trade-off

A single controller process serializes each Run's control decisions and cannot scale one Run's
control plane horizontally; concurrency remains at the mechanism-session and multi-Run level. Port
mediation adds a validation hop to every external interaction. These costs are accepted in exchange
for a small verifiable authority core and a checkable boundary.

## Alternatives not selected

- **Distributed control services** (separate scheduler, finalizer, and recovery services with a
  shared database): rejected because federating lifecycle authority across processes contradicts
  I3's sole routine lifecycle authority and multiplies fencing and reconciliation seams.
- **Library-only embedding** (Jig as a library inside a host application's process, no process
  boundary of its own): rejected because the controller generation and smallest-safe containment
  would then depend on the host's discipline, weakening I6 and I15.
- **One controller process for all Runs:** rejected because unrelated Runs would share a fault and
  fencing domain, contradicting Run-scoped containment.

## Deliberate deferrals

Package and module layout inside each unit, transport and encoding per port, and provider
registration mechanics are realization detail decided with the affected mechanism contracts and
[operations](../operations-and-observability.md) pages; they cannot change the unit, port, or
single-authority shape selected here.
