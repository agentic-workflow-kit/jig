---
title: Jig — design
status: draft — design layer
---

# Jig — design

This is where Jig's **engineering design** lives: the implementation reference for _how_ the
product commitments in [`docs/product/`](../product/) are satisfied. Product owns _what_ and
_why_; design owns _how_ and reconciles to product — where they conflict, design names it rather
than silently resolving.

The design is organised by one cut: **fixed logic vs. edge interfaces.**

## Status — what's ready, what's WIP

The scaffold is complete; the per-area detail is the work in progress. Legend: **overview** =
agreed at this altitude, ready to read; **stub** = skeleton only (purpose, responsibilities,
interface, one diagram) — the detailed design is pending; **draft** = deepened design doc at its
current wave altitude; **contract v0** = an agreed v0 seam shape, not a frozen schema; **log /
archive** = decision records and reference material.

| Area                | Files                                                                                                                                                | Status      | Pending                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------- |
| Layer index         | `README.md`                                                                                                                                          | overview    | —                                                  |
| Design charter      | [`charter.md`](./charter.md)                                                                                                                         | overview    | —                                                  |
| Conventions         | [`conventions.md`](./conventions.md)                                                                                                                 | overview    | —                                                  |
| Core overview       | `core/README.md`                                                                                                                                     | overview    | —                                                  |
| Domain model        | [`domain/configuration-and-work.md`](./domain/configuration-and-work.md), [`domain/runtime-and-observation.md`](./domain/runtime-and-observation.md) | **draft**   | later hardening / downstream waves                 |
| Core lifecycle      | [`core/bootstrap.md`](./core/bootstrap.md), [`core/orchestration.md`](./core/orchestration.md)                                                       | **draft**   | later hardening / Wave 4a bootstrap internals      |
| Core authorization  | [`core/authorization.md`](./core/authorization.md)                                                                                                   | **stub**    | Wave 4a authorization deepening                    |
| Core data ports     | [`core/plan-intake.md`](./core/plan-intake.md), [`core/records.md`](./core/records.md)                                                               | **draft**   | implementation planning / later core-parts pass    |
| Contracts overview  | `contracts/README.md`                                                                                                                                | overview    | —                                                  |
| Data contracts      | `contracts/{execution-plan, observability-records}-contract-v0.md`                                                                                   | contract v0 | field-level schema (intentionally not frozen)      |
| Driving / providers | [`contracts/driving.md`](./contracts/driving.md), [`contracts/providers.md`](./contracts/providers.md)                                               | **draft**   | provider adapters and conformance details deferred |
| Decisions           | `decisions/*`                                                                                                                                        | log         | grows as decisions are made                        |
| Notes               | `notes/*`                                                                                                                                            | archive     | —                                                  |

A stub is deepened **in place**; new sub-files are added only if an area outgrows a single file
(none are planned yet). Per-file `status:` frontmatter mirrors this table.

## [`core/`](./core/) — jig's fixed logic

The trusted part that never swaps. Start at the **[system overview](./core/README.md)** — the
entity model, the structure diagram, and the bootstrap→core flow. Then the per-area files:

- [`bootstrap.md`](./core/bootstrap.md) — the launch / composition root: load, validate, bind,
  wire, identify, ready.
- [`plan-intake.md`](./core/plan-intake.md) — parse + validate a plan instance; reject unknown
  formats.
- [`orchestration.md`](./core/orchestration.md) — the runner: run/work-item state machines,
  eligibility, runner-only actions.
- [`authorization.md`](./core/authorization.md) — the fence, doorbell, and capability attestation
  (the fail-closed spine).
- [`records.md`](./core/records.md) — the append-only event log, pure projections, and export.

## [`contracts/`](./contracts/) — jig's edge interfaces

Every interface at jig's boundary — what others call or implement — in three kinds. See the
**[boundary map](./contracts/README.md)**.

- [`driving.md`](./contracts/driving.md) — how consumers drive jig: CLI, MCP, SDK.
- the two **data contracts** —
  [`execution-plan-contract-v0.md`](./contracts/execution-plan-contract-v0.md) (input) and
  [`observability-records-contract-v0.md`](./contracts/observability-records-contract-v0.md)
  (output).
- [`providers.md`](./contracts/providers.md) — the four swappable provider seams.

## [`decisions/`](./decisions/) — the decision log

One ADR per design decision; see the [decision index](./decisions/README.md). Seeded from the
M5a slice.

## [`notes/`](./notes/) — intake and reference

Archival material, not the main reading path: the DDD intake frame, the reference-only
workflow-kit reuse log, and the dense M5a runtime-design record. See the
[notes index](./notes/README.md).

## Product reconciliation

Design reconciles _to_ the product layer. The current design maps back to the ID-bearing
commitments in [the five guarantees](../product/guarantees.md) and names product conflicts where
found. No product conflicts are known.

## Planning track

The deep-design pass is organized under
[the planning design track](../planning/design-track/README.md). That planning layer sequences the
authoring work and records traceability; it does **not** mean the stubbed design files below are
already complete.

## Deferred

- field-level JSON Schema or TypeScript interfaces;
- package or source-code layout;
- provider driver protocols beyond the product-level seam obligations;
- the implementation code itself.
