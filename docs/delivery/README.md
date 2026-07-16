---
title: "Jig — delivery"
status: active index
---

# Jig — delivery

This is the **active delivery layer**: the planning artifacts that turn the target product and
design docs into sequenced, reviewable implementation work. Product owns _what and why_
([`../product/`](../product/)); design owns _how_ — the live layer is
[`../redesign/design/`](../redesign/design/README.md), while the phase docs in this track cite
the archived pre-redesign reference ([`../archive/design/`](../archive/design/README.md)) they
were authored against; delivery owns _in what order, in what slices, and with what acceptance
and verification_. Delivery docs cite product and design; they do not rewrite either layer.

Historical delivery, planning, and review records live under
[`../archive/`](../archive/README.md) — including the completed M5b and M7 delivery tracks under
[`../archive/delivery/`](../archive/delivery/README.md). Those records are **provenance only**:
they explain how Jig reached its current state and are not instructions for new work. Do not
start work from an archived track.

## Active tracks

| Track                                                                   | Goal                                                                                                                                                                      | Status      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [target-state-implementation/](./target-state-implementation/README.md) | Transform the current single-package, fixture-backed implementation into the target state described by `docs/product/` and the archived `docs/archive/design/` reference. | in progress |

## Rules for delivery docs

- Treat `docs/product/` as target truth. The phase docs in the current track cite the archived
  `docs/archive/design/` reference they were authored against; the live design layer is
  `docs/redesign/design/`. Where a delivery doc finds a conflict between layers, it names the
  conflict and routes it back to the owning layer rather than resolving it silently.
- Delivery planning does not mint TypeScript interfaces, JSON Schemas, event constants,
  provider manifests, package exports, or runtime code; those belong to implementation PRs
  governed by the design layer.
- Phase acceptance criteria cite product guarantee IDs, design invariants, and ADRs by ID.
  Delivery-level acceptance criteria live here, not in the product layer
  ([`../product/jig.md`](../product/jig.md#open-questions)).
- Every phase preserves the repo gate (`pnpm check`) at full strength; see each track's
  `verification.md`.
