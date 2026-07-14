---
title: "Jig redesign — layered documentation workspace"
purpose: Route readers through the active layered rewrite and distinguish current method, canonical design, and historical evidence.
audience:
  - Jig owner
  - Architecture authors and reviewers
  - Product, engineering, security, and operations stakeholders
scope: Active navigation and authority for docs/redesign; product definition and architecture content live in design/, while prior presentations live in raw/.
state: current
status: active — Layer 0 approved; Layer 1 final candidate proposed and pending same-reviewer exact-candidate recheck; Layer 2 unauthorized
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

Layer 0 — [project definition](./design/project-definition.md) — is approved and governs the proposed
Layer 1 [high-level architecture](./design/high-level-architecture.md) and
[decision record](./design/high-level-decisions.md). The final metadata-bearing Layer 1 candidate is
pending exact-candidate recheck by the same independent `gpt-5.6-sol`/`xhigh` reviewer. Under the
owner-approved bounded delegation, that review may approve only faithful organization and
re-expression of already-established intent; it cannot select or change architecture. Arye retains
all material product and architecture decision ownership. A `PASS` makes the recorded Layer 1
approval and lock effective without a separate owner-selection or metadata-edit step. Layer 2
remains unauthorized and not started under this execution stop, including after a `PASS`; after the
Layer 1 commit, work stops for Arye. This reset changes organization and presentation, not Arye's
explicit product or architecture decisions.

## Navigation

- [Guidelines](./guidelines/README.md) — current method; read the index and only the active layer page.
- [Design workspace](./design/README.md) — approved Layer 0, the proposed final Layer 1 candidate and
  conditional approval/lock record, and the Layer 2 stop gate.
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
