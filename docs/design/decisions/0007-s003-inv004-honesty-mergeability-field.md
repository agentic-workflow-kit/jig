---
title: "ADR 0007 — S-003 INV-004 honesty + mergeability field"
status: applied
---

# ADR 0007 — S-003 INV-004 honesty + mergeability field

## Context

S-003 (domain-integrity — done≠landed trivially satisfied; `mergeability` omitted).

## Decision

Accepted. Dry-run suppresses landing globally, so INV-004 is trivially true; the
mergeability-**held** form needs the Forge seam (deferred). The record must not silently omit a
contract-named field.

## Consequences

The fixture (runtime-design §15) states the trivial-satisfaction honestly; `story.done` carries
`mergeability: not-evaluated`. See [runtime-design](../notes/runtime-design-m5a.md).

- Date: 2026-07-01
- Origin: M5a design slice
