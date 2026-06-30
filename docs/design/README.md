---
title: Jig — design
status: seeded — contract design v0
---

# Jig — design

This is where Jig's **engineering design** lives: the implementation reference for _how_
the product commitments in [`docs/product/jig.md`](../product/jig.md) are satisfied.

The design layer is now seeded with Jig's two shared contract seams:

- [Execution-plan contract v0](./execution-plan-contract-v0.md) — the high-level shape of
  Jig's hard input boundary. Planning produces to this seam.
- [Observability records contract v0](./observability-records-contract-v0.md) — the high-level
  shape of Jig's durable output boundary. Learning consumes this seam.

These documents are design-altitude v0 contract shapes. They name what the seams must carry
so downstream design can proceed without reading Jig internals, but they are not frozen
field-level schemas. Exact field names, validation details, storage layout, API surfaces, and
implementation packages remain later design and implementation decisions.

## Product Reconciliation

Design reconciles _to_ the product layer. Product owns what and why; design owns how those
promises are implemented and verified. The current v0 seam docs map back to the ID-bearing
commitments in [the five guarantees](../product/guarantees.md) and explicitly name product
conflicts where found.

No product conflicts are known in this seeded design layer.

## Deferred

The following design topics are intentionally outside this M1 seed:

- field-level JSON Schema or TypeScript interfaces;
- CLI, API, package, or source-code layout;
- provider driver protocols beyond the product-level seam obligations;
- Technical Design handoff contracts owned by the `technical-design` repo;
- M5 MVP implementation planning.
