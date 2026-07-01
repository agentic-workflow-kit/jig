---
title: "ADR 0001 — Worker posture: scripted-worker stub (modeled evidence)"
status: applied
---

# ADR 0001 — Worker posture: scripted-worker stub (modeled evidence)

## Context

Frame Q1: worker / execution-host posture in the dry-run.

## Decision

Accepted. Use a scripted-worker stub at the Agent seam: it makes the dry-run deterministic —
which is what enables the golden run-record fixture and TDD — keeps the unproven agent driver
out of the first slice, and loses nothing because a thin real local worker is a known, bounded
follow-on (reuse-log lessons 9-10). Honors the merged M5 posture table (Agent driver = named
extension point). The reuse surveys confirmed the prototype has no dry-run pipeline to harvest,
so this is greenfield either way.

## Consequences

Evidence is modeled, not executed. The real Agent and real local Execution Host stay named
extension points; promoting them is the next slice.

- Date: 2026-07-01
- Origin: M5a design slice
