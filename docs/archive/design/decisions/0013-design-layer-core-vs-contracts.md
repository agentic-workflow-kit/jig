---
title: "ADR 0013 — Design layer organised by fixed logic vs. edge interfaces"
status: applied
---

# ADR 0013 — Design layer organised by fixed logic vs. edge interfaces

## Context

An earlier proposal grouped the design under a `runtime/` folder with a narrow `contracts/`
holding only the two data-shape files. The owner observed that "runtime" carves nothing (all of
jig is runtime) and that a contract is _any_ interface at jig's edge — not only the two data
shapes.

## Decision

Organise the design layer by one cut: **fixed logic (`core/`) vs. edge interfaces
(`contracts/`)**. `contracts/` holds all three boundary kinds — driving (CLI / MCP / SDK), data
(the execution-plan and observability-records shapes), and providers (the four swappable seams).
The `runtime/` grouping is dropped. This mirrors jig's product spine (a fixed runner governing
swappable seams) and makes the folder layout ports-and-adapters: contracts are the ports, core is
the logic behind them.

## Consequences

`runtime/README.md` became `core/README.md`; the two data contracts relocated into `contracts/`;
the narrow "two contracts" wording in `AGENTS.md` should be broadened to this meaning in a
follow-up.

- Date: 2026-07-01
- Origin: design-layer restructure
