---
title: "Jig redesign — canonical design workspace"
purpose: Route the new canonical layered artifacts and show which layer is active or approved.
audience:
  - Jig owner
  - Architecture authors and reviewers
  - Readers of the new redesign
scope: New canonical redesign artifacts under this directory; historical evidence and later-layer detail are excluded.
state: current
status: active index — Layer 0 approved; Layer 1 final candidate proposed and pending same-reviewer exact-candidate recheck; Layer 2 unauthorized
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
is approved. The final metadata-bearing Layer 1 candidate is proposed and pending exact-candidate
recheck by the same independent `gpt-5.6-sol` architecture reviewer using `xhigh` reasoning. Arye
retains all material product and architecture decision ownership. The reviewer may approve only
faithful organization and re-expression under the owner-approved bounded delegation; an exact
`PASS` makes the recorded Layer 1 approval and lock effective without another owner-selection or
file-edit step. Layer 2 is unauthorized and not started under this execution stop.

## Layer status

| Layer                             | Canonical or proposed artifact                                                                                | Status                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer 0 — project definition      | [Project definition](./project-definition.md)                                                                 | Approved; governing input for Layer 1                                                                                                          |
| Layer 1 — high-level architecture | [High-level architecture](./high-level-architecture.md) and [high-level decisions](./high-level-decisions.md) | Proposed final candidate; same-reviewer exact-candidate recheck pending; recorded approval and lock become effective on that reviewer's `PASS` |
| Layer 2 — detailed architecture   | No artifact authorized                                                                                        | Unauthorized and not started under this execution stop; a Layer 1 `PASS` does not authorize Layer 2                                            |

The approved Layer 0 definition provides the complete project-level input contract. The proposed
Layer 1 set implements the established D9 two-artifact shape: its primary document is reader-complete
for the high-level model, while the connected decision record preserves owner selections,
alternatives, accepted consequences, deliberate deferrals, invariant traceability, and the final
conditional approval/lock metadata.

The Layer 1 author cannot review or approve the candidate. The independent reviewer may judge only
faithful organization and re-expression and may return `PASS`, `CHANGES_REQUIRED`, or
`OWNER_DECISION_REQUIRED`. Arye remains the product and architecture decision owner; the bounded
review delegation transfers no architecture-selection power. All approval metadata is final before
the recheck. The same reviewer's exact `PASS` therefore activates the recorded approval and lock
without another edit. Any later change requires the applicable reopen and exact-candidate review.
After the Layer 1 commit, stop for Arye; Layer 2 must not begin.

The [guidelines index](../guidelines/README.md) is the current method. The [raw provenance
manifest](../raw/README.md) identifies binding decisions and historical evidence; it does not make
the prior presentation canonical.
