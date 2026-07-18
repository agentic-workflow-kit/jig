---
title: Jig — documentation
status: active index
---

# Jig — documentation

The active documentation corpus is organized by authority: product owns what and why; the approved
redesign owns how. The implementation-readiness gate passed on 2026-07-18, and the repository is now
intentionally source-empty pending a separately planned greenfield implementation.

| Area                     | Owns                                                                                               | Status                  |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------- |
| [product/](./product/)   | Audience, promise, guarantees, workflows, and boundaries.                                          | governing product truth |
| [redesign/](./redesign/) | Approved architecture, decisions, contracts, conformance obligations, and design method.           | governing design truth  |
| [archive/](./archive/)   | Historical provenance, the final readiness record, and immutable generation recovery instructions. | non-governing reference |

There is no active `docs/delivery/` track. Creating the greenfield implementation track is the next
session's task and must start from the governing product/redesign corpus and the
[empty-repository readiness gate](./archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md).

The retired source and delivery track are not duplicated in the active tree. Use the
[generation manifest](./archive/generations/jig-v0-pre-greenfield-2026-07-18.md) only for an
already-specified active story.
