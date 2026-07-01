---
title: "w5-s2 findings and open questions"
status: draft
story: w5-s2-recovery-records-integration-red-team
---

# w5-s2 findings and open questions

## Source-backed findings

### F-001 — preview auditability versus non-committing identity is not fully closed across the read-only source set

**Finding.** The current read-only sources do not fully close how `previewed` should remain
auditable without implying a committed run identity before launch binding exists.

**Source basis.**

- Wave 2 says `run.previewed` is recorded-but-non-committing and allocates no run identity.
- Wave 4a bootstrap keeps preview non-committing and without run identity/workspace/providers.
- The observability-records contract lists `previewed` inside run-lifecycle event families while also
  requiring run identity and input-binding properties at v0 design altitude.

**Why this is a red-team issue.** A reader can infer two competing interpretations: preview is part
of the auditable run-lifecycle surface, yet preview also occurs before the durable run identity and
binding record exist.

**Route.** Wave 4a records/bootstrap owners.

**Local resolution.** None. This package does not choose a representation.

### F-002 — the stop/notice/resume causality chain is not fully explicit when a story-level park or liveness signal halts the run

**Finding.** The sources align that unattended parked or liveness-driven conditions can stop a run,
but the integrated causality chain from story-level condition to run-level stop, notice, and later
resume evidence is not fully explicit in one place.

**Source basis.**

- `docs/design/core/orchestration.md` owns the current lifecycle design for unattended `parked` or
  liveness-driven `run.stopped` behavior at a resumable checkpoint.
- The records contract requires structured stop reasons, liveness signals, notices, and resume
  support.
- records.md keeps notices as projections from the same append-only evidence base.

**Why this is a red-team issue.** The integrated behavior appears intended, but the current source
set leaves the causal reconstruction burden split across orchestration and Wave 4a records/bootstrap
sources.

**Route.** Wave 2 + Wave 4a owners.

**Local resolution.** None.

## Routed open questions

### OQ-001 — how is `RESUME-5` shown without loosening `GUARD-1`?

When safety-relevant inputs change while a run is stopped, which source-owned surface makes it
clear that:

- the original launch binding remains immutable;
- the resumed run is blocked pending fresh approval/evidence; and
- the record trail shows both facts without looking like a silent rebinding?

**Route.** Wave 2 + Wave 4a + product.

### OQ-002 — what durable record proves no-double-effect on resume?

The current sources require no-double-effect and a reconstructible records surface, but they do not
all say in one place what the operator should inspect to prove an irreversible action was recognized
as already done and not repeated.

**Route.** Wave 2 + Wave 4a.

### OQ-003 — what happens when redaction-posture requirements collide with stop-critical evidence?

records.md says governed appends with missing or ambiguous redaction/export posture are rejected.
Product and contract sources still require fail-closed diagnosable stop and visible notices.

What source-owned behavior guarantees operator-visible diagnostic evidence when the rejected append
itself is part of the needed stop/notice/resume trail?

**Route.** Wave 4a + product.

### OQ-004 — what source closes workspace isolation continuity on resume?

`ISO-4` requires isolated workspace per run. Bootstrap owns workspace setup and resume re-entry, but
the read-only source set does not close in one place how resume preserves the same run's safe
continuity without silently shifting to a materially different execution environment.

**Route.** Wave 4a + product.

## Candidate invariant exposure without numbering

No new `INV-*` row is assigned here. The probe pressure in this package may expose a missing
integration-level invariant around preview auditability or stop/notice/resume causality, but any
such invariant remains a routed candidate for the owning Wave 2 / Wave 4a / product surface or U9
collection.

## Deferred-to-U9 collection items

- Cross-wave reconciliation of preview auditability, if owners confirm that the issue spans both the
  records contract and bootstrap composition.
- Cross-wave reconciliation of stop/notice/resume causality if owners confirm the seam is broader
  than a single Wave 2 or Wave 4a design target.
