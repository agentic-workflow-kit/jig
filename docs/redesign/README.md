---
title: "Jig redesign — layered documentation workspace"
purpose: Route readers through the active redesign and distinguish current method, canonical design, and historical evidence.
audience:
  - Jig owner
  - Architecture authors and reviewers
  - Product, engineering, security, and operations stakeholders
scope: Active navigation and authority for docs/redesign; product definition and architecture content live in design/, while prior presentations live in raw/.
state: current
status: active — Layer 0 approved; the re-presented Layer 1 view set is proposed and pending a fresh independent review; Layer 2 unauthorized
owner: Arye Kogan (Jig owner)
last_verified: 2026-07-15
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

Layer 0 — the [project brief](./design/brief.md) — is approved and governs the proposed Layer 1
high-level architecture. On 2026-07-15 Arye directed a structure revision: the former two-artifact
Layer 1 candidate was split into a connected view-based document set (context, model, flows,
perspectives, supporting views, invariants, and per-decision records) mapped in the
[design index](./design/README.md). That instruction superseded the then-pending exact-candidate
recheck of the two-artifact set; the re-presented candidate set requires a fresh independent review
under the same owner-approved bounded delegation before the recorded Layer 1 approval and lock
become effective. No owner decision, invariant, accepted consequence, or deferral changed.

Arye retains all material product and architecture decision ownership. Layer 2 remains unauthorized
and not started under this execution stop, including after a Layer 1 `PASS`; after the Layer 1
commit, work stops for Arye.

## Navigation

- [Design workspace](./design/README.md) — the canonical artifacts: project brief, model, views,
  invariants, decision records, and the gate record.
- [Comprehensive guide](./architecture-design-and-documentation-guide.md) — the method: layering,
  what belongs at each level, and the diagram rules the design pages follow.
- [Guidelines handbook](./guidelines/README.md) — the earlier stage-gate distillation of the guide;
  scheduled for rewrite to the guide's abstraction-layer structure per the 2026-07-15 owner
  instruction. Until then the source guide governs where they differ.
- [Raw provenance](./raw/README.md) — the complete pre-reset corpus and its source-role manifest.

## Authority boundary

The method defines how to author and review; it selects no design. New approved artifacts under
`design/` become canonical one layer gate at a time. The former proposal, reviews, goal, handoff,
execution plan, and Stage 1 presentation are preserved under `raw/` as historical evidence.

Archived presentation and status labels are not current authority. Prior explicit owner decisions
remain binding re-authoring inputs at their correct layer. See the [workspace contract](./AGENTS.md)
for source roles, delegated review limits, and stop conditions.
