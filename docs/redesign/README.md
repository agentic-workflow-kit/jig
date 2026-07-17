---
title: "Jig redesign — layered documentation workspace"
purpose: Route readers through the active redesign and distinguish current method, canonical design, and historical evidence.
audience:
  - Jig owner
  - Architecture authors and reviewers
  - Product, engineering, security, and operations stakeholders
scope: Active navigation and authority for docs/redesign; product definition and architecture content live in design/, while prior presentations live in raw/.
state: current
status: active — eighth readiness review failed with 11 blockers on 2026-07-17; owner-approved documentation remediation in progress; product-readiness lock inactive pending two consecutive independent exact-candidate PASS reviews after merge
owner: Arye Kogan (Jig owner)
last_verified: 2026-07-17
sources_of_truth:
  - Explicit owner reset and layered-authoring instruction, 2026-07-14
  - Explicit owner structure-revision instruction, 2026-07-15
  - ./architecture-design-and-documentation-guide.md
related:
  - ./design/README.md
  - ./raw/README.md
---

# Jig redesign

This is the active workspace for rebuilding Jig's redesign documentation from its established
decisions. The design is organized by abstraction level and view type following the
[architecture guide](./architecture-design-and-documentation-guide.md); approval still advances one
layer gate at a time.

## Current status

Layer 0 — the [project brief](./design/brief.md) — is approved. Layer 1 was approved and locked:
after the 2026-07-15 owner structure revision split the former two-artifact candidate into the
connected view-based document set mapped in the [design index](./design/README.md), a fresh
independent review of the exact re-presented candidate set returned `PASS` the same day, making the
recorded approval and lock effective at that baseline (see the
[review and approval record](./design/decisions/review-and-approval-record.md)). No owner decision,
invariant, accepted consequence, or deferral changed.

Arye retains all material product and architecture decision ownership. Layer 2 was authored under
the explicit owner continuation instruction of 2026-07-15 against the then-locked Layer 1, with D1–D9
and I1–I21 as fixed inputs, and closed its gate on 2026-07-16: independent review, the owner's
ten-finding PR review, four correction passes, a recorded verification recheck, and Arye's
explicit approval — approved, not locked (see the
[Layer 2 gate record](./design/decisions/layer2-gate-record.md)). The seventh remediation then merged
at `30129ea6148c1c81b30e27e291caecb85665ba55`. The eighth independent readiness review of that
exact baseline returned `FAIL` with eleven rubric blockers plus non-blocking rubric and editorial
items. Arye authorized the bounded documentation corrections, including the narrow D6
suspension-release clarification. The product-readiness lock remains inactive until two
consecutive independent sessions return `PASS` on the same exact merged candidate after this
remediation merges.

## Navigation

- [Design workspace](./design/README.md) — the canonical artifacts: project brief, model, views,
  invariants, decision records, and the gate record.
- [Comprehensive guide](./architecture-design-and-documentation-guide.md) — the method: layering,
  what belongs at each level, and the diagram rules the design pages follow.
- [Guidelines handbook](./guidelines/README.md) — the generalized operational handbook derived
  from the guide (abstraction levels and view types as the organizing axis), rewritten 2026-07-15
  per the owner continuation instruction; the source guide governs where they differ.
- [Raw provenance](./raw/README.md) — the complete pre-reset corpus and its source-role manifest.

## Authority boundary

The method defines how to author and review; it selects no design. New approved artifacts under
`design/` become canonical one layer gate at a time. The former proposal, reviews, goal, handoff,
execution plan, and Stage 1 presentation are preserved under `raw/` as historical evidence.

Archived presentation and status labels are not current authority. Prior explicit owner decisions
remain binding re-authoring inputs at their correct layer. See the [workspace contract](./AGENTS.md)
for source roles, delegated review limits, and stop conditions.
