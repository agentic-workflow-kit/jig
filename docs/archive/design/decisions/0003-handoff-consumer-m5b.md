---
title: "ADR 0003 — Handoff consumer reframed to jig's own M5b implementation"
status: applied
---

# ADR 0003 — Handoff consumer reframed to jig's own M5b implementation

## Context

Authoring adaptation: the pack assumes a Planning-layer consumer.

## Decision

Accepted. jig sits downstream of Planning, so this design hands off to jig's own M5b
implementation, not a separate Planning layer. The handoff rigor and stable IDs are preserved;
only the consumer differs.

## Consequences

The Planner Handoff Summary names M5b as the consumer. This is a dogfooding finding for the
`technical-design` pack — a delivery engine designing its own internals hands design →
implementation in-repo; flagged to the pack's lessons-ledger
([runtime-design §14](../notes/runtime-design-m5a.md)).

- Date: 2026-07-01
- Origin: M5a design slice
