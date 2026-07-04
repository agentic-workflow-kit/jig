---
title: "Notes — archival design records"
status: archival — reference only
---

# Notes — archival design records

`notes/` is archival and reference material, not the main reading path. It preserves the M5a
slice's intake and design record as they were authored, for provenance and for mining detail
into the durable design as it deepens.

## Contents

- [`problem-frame.md`](./problem-frame.md) — the DDD intake frame the M5a design was framed
  from.
- [`n1a-transport-evidence-plan.md`](./n1a-transport-evidence-plan.md) — plan-only checklist for
  fresh Codex transport evidence capture before the N1b transport ADR.
- [`prior-art-workflow-kit.md`](./prior-art-workflow-kit.md) — reference-only lessons carried
  (never ported) from the retiring `workflow-kit` prototype.
- [`runtime-design-m5a.md`](./runtime-design-m5a.md) — the dense M5a runtime design record in
  handoff-contract format; the source to mine when deepening the [`../core/`](../core/) and
  [`../contracts/`](../contracts/) stubs. **This is also where the canonical `INV-001..018`
  invariant ledger lives** — see the tension named below before treating this folder as purely
  archival.
- `wave-*-execution-review.md` — build-time review-disposition logs for each design-track wave's
  execution pass.

The durable design lives in [`../core/`](../core/) and [`../contracts/`](../contracts/); this
folder preserves the M5a slice's intake and record.

## The archival-vs-canonical-ledger tension

This folder is described above, correctly, as "archival and reference material, not the main
reading path." That is true for `problem-frame.md`, the wave execution-review logs, and the
prior-art note. It is **not fully true** of `runtime-design-m5a.md`: that file also carries the
canonical `INV-001..018` invariant ledger — the numbered invariant IDs that `core/`, `contracts/`,
the domain docs, and the ADR log all cite as authoritative (e.g. INV-002, INV-006, INV-007,
INV-010 appear across [`../core/orchestration.md`](../core/orchestration.md),
[`../contracts/providers.md`](../contracts/providers.md), and ADRs 0020–0025). A ledger the
durable design depends on as authoritative is, by that fact, not merely archival — it is a live
dependency that happens to be homed in an archival-labeled folder.

This is a real tension, not a contradiction to paper over: the ledger is correctly _dense and
handoff-shaped_ (which is why ADR 0016 chose to preserve it here rather than shred it into the
stubs), but its location signals "don't read this first" to a reader who then cannot resolve an
`INV-*` citation without knowing to look here. Until the physical location changes (see the open
question below), the practical fix is discoverability, not a move: every `INV-*` citation should
be resolvable by following it here, and this README says so explicitly rather than leaving a new
reader to discover the ledger's true role by accident.

## Open questions

- **Should `runtime-design-m5a.md` (or at least its `INV-001..018` ledger) physically move out of
  `notes/` into the durable layer** — e.g. into `core/` or a dedicated invariants file — so a
  canonical, load-bearing ledger is not homed in a folder documented as archival? This is
  deliberately **not done in this pass**: the ledger is cited by ID (`INV-nnn`) from dozens of
  places across `core/`, `contracts/`, the domain docs, and the ADR log, so a physical move has a
  wide citation blast radius (link rewrites, and a judgment call on whether to leave a redirect
  stub behind). Relocating it is a genuine structural decision for a future pass, not an editorial
  consolidation; this README instead makes the ledger discoverable in place.
