---
title: Jig — documentation
status: active index
---

# Jig — documentation

The active documentation corpus is organized by authority: product owns what and why; the approved
redesign owns how. The implementation-readiness gate passed on 2026-07-18. The repository remains
intentionally source-empty, with an active documentation-only greenfield delivery track for a later
owner-authorized implementation phase.

| Area                     | Owns                                                                                               | Status                  |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------- |
| [product/](./product/)   | Audience, promise, guarantees, workflows, and boundaries.                                          | governing product truth |
| [redesign/](./redesign/) | Approved architecture, decisions, contracts, conformance obligations, and design method.           | governing design truth  |
| [delivery/](./delivery/) | 45-story, seven-phase documentation-only delivery track and mandatory story contract.              | active planning track   |
| [archive/](./archive/)   | Historical provenance, the final readiness record, and immutable generation recovery instructions. | non-governing reference |

The active track starts from the governing product/redesign corpus and the
[empty-repository readiness gate](./archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md).
It plans delivery only; it does not authorize product source or scaffolding.

The retired source and delivery track are not duplicated in the active tree. Use the
[generation manifest](./archive/generations/jig-v0-pre-greenfield-2026-07-18.md) only for an
already-specified active story.
