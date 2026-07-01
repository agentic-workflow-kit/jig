---
title: "ADR 0014 — Operator surface is a named jig-core entity"
status: applied
---

# ADR 0014 — Operator surface is a named jig-core entity

## Context

The operator / control surface (the CLI / MCP / SDK entry point) was implicit in the entity
model — only the `Owner → Runner` edge in the diagram.

## Decision

Promote the operator surface to a named jig-core entity. It is where every driving action enters
and it carries a load-bearing invariant: one command becomes one control-plane call and one audit
event, and the edge holds no run logic and imports no provider contracts. It appears as a box in
the [`core/README.md`](../core/README.md) structure diagram; its interface detail lives in
[`contracts/driving.md`](../contracts/driving.md) (by the fixed-logic-vs-interface cut, its spec
is a contract, while by ownership it is jig-core, not a swappable seam).

## Consequences

The core entity model and structure diagram include the operator surface; `contracts/driving.md`
details the CLI / MCP / SDK adapters over it.

- Date: 2026-07-01
- Origin: design-layer restructure
