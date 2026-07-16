---
title: "ADR 0006 — S-002 blocked / ISO-3 downstream halt exercised"
status: applied
---

# ADR 0006 — S-002 blocked / ISO-3 downstream halt exercised

## Context

S-002 (testability — `blocked`/ISO-3 asserted but never produced).

## Decision

Accepted. The `blocked` state and downstream halt are product-load-bearing and must appear in
the canonical trace.

## Consequences

The fixture (runtime-design §15) gains STORY-D (out-of-scope request → `denied` → `blocked`) and
STORY-E (held behind the blocked prerequisite, ISO-3); §12 adds a FAIL-003/ISO-3 proof row;
VAL-001 covers it. See [runtime-design](../notes/runtime-design-m5a.md).

- Date: 2026-07-01
- Origin: M5a design slice
