---
title: "Jig delivery planning"
status: draft
---

# Jig delivery planning

Delivery planning sequences implementation work after product and design have named the promises,
boundaries, and current contract posture. Product owns what and why. Design owns how Jig satisfies
those promises. Delivery planning owns the order of usable increments, acceptance evidence, and
stop conditions without inventing product or design facts.

Current delivery planning:

- [M5b local MVP roadmap, r2](./m5b-local-mvp-r2/) — the live track: delivered state,
  org-M5 exit-criteria map, and the remaining Phase 4/5 ladder. Its provider tail (Phases 6-9) now
  lives in the M7 track below.
- [M7 real-providers track](./m7-real-providers/) — derives org milestone M7 (Real Provider
  Integration) into Phases 6-9: real agent/host drivers, real Forge/GitHub landing, real
  work-source intake, and records-integrity, behind the P5-pinned ports.

Historical:

- [M5b local MVP roadmap (r1)](./m5b-local-mvp/) — superseded; the archived record of the
  track that delivered Phases 0-2.

## Planning Rules

- Keep the execution-plan and observability-records v0 contracts cited and unfrozen.
- Treat examples and fixtures as illustrative until a contract owner approves schema freeze.
- Do not introduce TypeScript interfaces, JSON Schema, provider manifests, package layout, exports,
  implementation trackers, or runtime code from delivery planning.
- Do not edit `docs/design/**` from a delivery roadmap unless the owning source explicitly requires
  a design change.
- Carry Wave 5 red-team findings as stop conditions, evidence/test requirements, routed-owner work,
  or already-resolved design facts.
- Prefer client-usable milestone names over internal proof-surface names.

## Source Boundaries

Delivery roadmaps derive from:

- product commitments in [`../product/jig.md`](../product/jig.md),
  [`../product/guarantees.md`](../product/guarantees.md), and
  [`../product/concepts.md`](../product/concepts.md);
- design status and contracts in [`../design/README.md`](../design/README.md),
  [`../design/contracts/execution-plan-contract-v0.md`](../design/contracts/execution-plan-contract-v0.md),
  and
  [`../design/contracts/observability-records-contract-v0.md`](../design/contracts/observability-records-contract-v0.md);
- Wave 5 red-team output and Wave 6 implementation phasing under
  [`../planning/design-track/waves/`](../planning/design-track/waves/).
