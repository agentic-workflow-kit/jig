---
title: "ADR 0018 — Phase-2 policy gate is a recorded simplification of the assisted posture"
status: applied
---

# ADR 0018 — Phase-2 policy gate is a recorded simplification of the assisted posture

## Context

[ADR 0002](./0002-policy-posture-assisted.md) fixed the minimum policy posture at **assisted**
with CFG-10's fixed category boundary, and INV-008 /
[ADR 0008](./0008-s004-denied-in-canonical-fixture.md) require the fence triad
(`requested → granted/denied/routed`) even in dry-run. The M5b Phase 1–2 implementation gates
a run on a single policy boolean (`allowLocalDryRun`) instead: no per-request adjudication,
no categories, no triad. The divergence was recorded nowhere
([review](../../reviews/2026-07-02-post-phase-2-repo-review.md), finding S3).

## Decision

The boolean gate is accepted as a named Phase 1–2 walking-skeleton simplification — a
run-level fail-closed check, not the fence. It does not supersede ADR 0002: the assisted
posture and the CFG-10 category boundary remain the design commitment, and Phase 3 (governed
local runs) replaces the boolean with per-request adjudication emitting the full triad per
INV-008 and the canonical fixture in
[`../notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md) §15.

## Consequences

Delivery docs present the boolean as pre-fence scaffolding; the org-M5 fence exit criterion
remains open until Phase 3; the criterion-to-phase mapping lives in the delivery track README.

- Date: 2026-07-02
- Origin: post-Phase-2 repository review (S3)
