---
title: "Jig — repo-local planning"
status: historical archive
---

# Jig — repo-local planning archive

This directory preserves Jig's historical repo-local **delivery and design planning** records. It
is not the suite Planning layer (`design-to-plan`) and does not produce Jig execution plans for
users.

These archived records organized work into waves, sessions, and stories. Product owns _what and
why_ (`docs/product/`); design owns _how_ (`docs/design/`); this archive records how prior work was
sequenced and should not override either active layer.

A planning finding that contradicts a product or design commitment is routed back to the owning
doc — named as feedback, not silently resolved here (this mirrors jig's own STOP-003: a v0
contract needing a breaking change is routed to the seam owner, not quietly mutated). Planning
records the conflict; it does not adjudicate it.

## What's here

| Track                                       | Purpose                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`design-track/`](./design-track/README.md) | Organizes the deep-design pass that deepens jig's design layer, wave by wave, from its current overview/stub altitude to an authored, review-settled design. |

## Related

- [Jig — design](../design/README.md) — the design layer this track deepened.
- [Jig — the execution engine](../../product/jig.md) — the product commitments design and planning
  reconcile to.
