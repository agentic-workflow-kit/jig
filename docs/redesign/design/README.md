---
title: "Jig redesign — canonical design workspace"
purpose: Route the new canonical layered artifacts and show which layer is active or approved.
audience:
  - Jig owner
  - Architecture authors and reviewers
  - Readers of the new redesign
scope: New canonical redesign artifacts under this directory; historical evidence and later-layer detail are excluded.
state: current
status: active index — Layer 0 approved with final exact-candidate recheck pending; Layer 1 is the next authorized active layer and begins only after that PASS
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

This directory holds the new canonical redesign, authored and approved one layer at a time. Layer 0
has an initial content `PASS`; its final metadata-bearing candidate is pending the same reviewer's
exact-candidate recheck. No Layer 1 artifacts have been authored.

## Layer status

| Layer                             | Approved or future artifact                     | Status                                                                                     |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Layer 0 — project definition      | [Project definition](./project-definition.md)   | Approved; final exact-candidate recheck pending before approval becomes effective          |
| Layer 1 — high-level architecture | Future smallest complete connected artifact set | Next authorized active layer; no artifacts yet; begins only after the final Layer 0 `PASS` |

The approved Layer 0 candidate provides a complete project-level narrative without architecture
detail. After the same reviewer passes this exact metadata-bearing candidate, Layer 1 may begin,
using the approved definition as its governing input and choosing the smallest connected artifact
set required by the Layer 1 guideline.

The [guidelines index](../guidelines/README.md) is the current method. The [raw provenance
manifest](../raw/README.md) identifies binding decisions and historical evidence; it does not make
the prior presentation canonical.
