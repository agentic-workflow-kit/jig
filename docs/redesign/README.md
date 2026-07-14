---
title: "Jig redesign — layered documentation workspace"
purpose: Route readers through the active layered rewrite and distinguish current method, canonical design, and historical evidence.
audience:
  - Jig owner
  - Architecture authors and reviewers
  - Product, engineering, security, and operations stakeholders
scope: Active navigation and authority for docs/redesign; product definition and architecture content live in design/, while prior presentations live in raw/.
state: current
status: active — Layer 0 approved with final exact-candidate recheck pending; Layer 1 is the next authorized active layer and begins only after that PASS
owner: Arye Kogan (Jig owner)
last_verified: 2026-07-14
sources_of_truth:
  - Explicit owner reset and layered-authoring instruction, 2026-07-14
  - ./guidelines/README.md
related:
  - ./design/README.md
  - ./raw/README.md
  - ./architecture-design-and-documentation-guide.md
---

# Jig redesign

This is the active workspace for rebuilding Jig's redesign documentation from its established
decisions, organized one reader-complete layer at a time.

## Current status

Layer 0 — [project definition](./design/project-definition.md) — records approval after an initial
content `PASS` and is pending the same reviewer's final exact-candidate recheck. Layer 1 is the next
authorized active layer, with no Layer 1 artifacts authored yet, and may begin only after that final
`PASS`. This reset changes the organization and presentation, not Arye's explicit product or
architecture decisions.

## Navigation

- [Guidelines](./guidelines/README.md) — current method; read the index and only the active layer page.
- [Design workspace](./design/README.md) — the approved Layer 0 candidate and Layer 1 activation status.
- [Raw provenance](./raw/README.md) — the complete pre-reset corpus and its source-role manifest.
- [Comprehensive guide](./architecture-design-and-documentation-guide.md) — optional rationale and
  background for the method.

## Authority boundary

The guidelines define how to author and review; they select no design. New approved artifacts under
`design/` become canonical one layer at a time. The former proposal, reviews, goal, handoff,
execution plan, and Stage 1 presentation are preserved under `raw/` as historical evidence.

Archived presentation and status labels are not current authority. Prior explicit owner decisions
remain binding re-authoring inputs at their correct layer. See the [workspace contract](./AGENTS.md)
for source roles, delegated review limits, and stop conditions.
