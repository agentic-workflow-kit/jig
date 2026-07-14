---
title: "Jig redesign — canonical design workspace"
purpose: Route the new canonical layered artifacts and show which layer is active or approved.
audience:
  - Jig owner
  - Architecture authors and reviewers
  - Readers of the new redesign
scope: New canonical redesign artifacts under this directory; historical evidence and later-layer detail are excluded.
state: current
status: active index — Layer 0 planned, not authored
owner: Arye Kogan (Jig owner)
last_verified: 2026-07-14
sources_of_truth:
  - ../guidelines/README.md
  - Explicit owner reset and layered-authoring instruction, 2026-07-14
related:
  - ../README.md
  - ../raw/README.md
---

# Canonical design workspace

This directory holds the new canonical redesign, authored and approved one layer at a time. It is
currently empty apart from this index.

## Layer status

| Layer                             | Canonical artifact         | Status                                    |
| --------------------------------- | -------------------------- | ----------------------------------------- |
| Layer 0 — project definition      | `project-definition.md`    | Next planned artifact; not yet authored   |
| Layer 1 — high-level architecture | Future connected artifacts | Starts only after Layer 0 review approval |

Layer 0 will provide a complete project-level narrative without architecture detail. Layer 1 will
use that approved definition as its governing input and will choose the smallest connected artifact
set required by the Layer 1 guideline.

The [guidelines index](../guidelines/README.md) is the current method. The [raw provenance
manifest](../raw/README.md) identifies binding decisions and historical evidence; it does not make
the prior presentation canonical.
