---
title: "ADR 0008 — S-004 `denied` in the canonical fixture"
status: applied
---

# ADR 0008 — S-004 `denied` in the canonical fixture

## Context

S-004 (testability — golden fixture never emits `denied`).

## Decision

Accepted. The M5 exit criterion names the full `requested → granted/denied/routed` triad; the
canonical record artifact must evidence all three.

## Consequences

The fixture (runtime-design §15) STORY-D emits an out-of-declared-scope request →
`authorization.denied` (FENCE-1 fail-closed), completing the triad. See
[runtime-design](../notes/runtime-design-m5a.md).

- Date: 2026-07-01
- Origin: M5a design slice
