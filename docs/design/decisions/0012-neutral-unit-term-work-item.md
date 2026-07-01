---
title: "ADR 0012 — Neutral unit term: work item"
status: applied
---

# ADR 0012 — Neutral unit term: work item

## Context

Product calls the unit of work a **story**; the earlier design draft called it a **task**. The
owner wants the design not to couple to any one tracker's vocabulary.

## Decision

The design layer uses the neutral term **work item**. The owner configures their own label —
story, task, ticket, whatever fits their tracker — and they are the same unit jig schedules,
runs, and lands. Product altitude still owns the name _story_; this is a deliberate, recorded
design-layer naming choice, not a silent divergence. The reconciliation note lives in
[`core/README.md`](../core/README.md).

## Consequences

All design docs use "work item"; "story"/"task" appear only in the reconciliation note and in
product-doc cross-references.

- Date: 2026-07-01
- Origin: design-layer restructure
