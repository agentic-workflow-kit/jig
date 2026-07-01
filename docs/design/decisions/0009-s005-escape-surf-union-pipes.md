---
title: "ADR 0009 — S-005 escape SURF union-type pipes"
status: applied
---

# ADR 0009 — S-005 escape SURF union-type pipes

## Context

S-005 (handoff-readiness — raw `|` in SURF-002/004/005 breaks the table).

## Decision

Accepted. The handoff summary is machine-consumed; broken rows defeat fact extraction.

## Consequences

SURF-002/004/005 union/option types reworded to avoid raw `|`. See
[runtime-design](../notes/runtime-design-m5a.md).

- Date: 2026-07-01
- Origin: M5a design slice
