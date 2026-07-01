---
title: "ADR 0005 — S-001 eligibility/DAG exercised; dry-run rule = strict ISO-1 hold"
status: applied
---

# ADR 0005 — S-001 eligibility/DAG exercised; dry-run rule = strict ISO-1 hold

## Context

S-001 (testability/scope — eligibility marked `exercised` but never traced/proven).

## Decision

Accepted. Eligibility must be genuinely exercised. The dry-run rule is **strict ISO-1**: a
dependent is eligible only once its prerequisite **lands**; since dry-run suppresses landing,
dependents are held `waiting`. The resolver is exercised in gate-and-hold mode (release-on-land
is unreachable in a dry-run by construction).

## Consequences

The fixture (runtime-design §15) gains STORY-B held behind done-but-unlanded STORY-A; §12 adds
an INV-005 proof row; VAL-001 names the eligibility evidence. See
[runtime-design](../notes/runtime-design-m5a.md).

- Date: 2026-07-01
- Origin: M5a design slice
