---
title: "w5-s2 recovery/records/bootstrap integration red-team package"
status: draft
story: w5-s2-recovery-records-integration-red-team
wave: wave-5-red-team
---

# w5-s2 recovery/records/bootstrap integration red-team package

## Objective

This package is the planning-track-only red-team output for
`w5-s2-recovery-records-integration-red-team`. It probes the composed behavior of Wave 2 recovery,
Wave 4a records, Wave 4a bootstrap re-entry, and the observability-records contract without
rewriting any `docs/design/**` surface locally.

This package does not settle contradictions. It identifies pressure points, records source-backed
findings or open questions, and routes each item back to the owning Wave 2, Wave 4a, product, or U9
surface.

## Scope guardrails

- Probe only the integrated surface across recovery, records, bootstrap, and product/contract
  commitments.
- Do not redesign lifecycle states, bootstrap sequencing, records schema, event names, or log
  consistency model.
- Do not edit Wave 5 story briefs, Wave 5 `w5-s1` outputs, or any `docs/design/**` file.
- Cite existing `INV-*` and existing unnumbered candidates read-only.
- If a missing invariant is exposed, log it as a routed candidate or finding outside the numbered
  ledger.

## Read-only source set

Primary story and wave governance:

- [`../../frame.md`](../../frame.md)
- [`../../decisions.md`](../../decisions.md)
- [`../../stories/w5-s2-recovery-records-integration-red-team.md`](../../stories/w5-s2-recovery-records-integration-red-team.md)

Recovery and lifecycle inputs:

- [`../../../wave-2-state-machines/stories/w2-s2-run-lifecycle-and-recovery.md`](../../../wave-2-state-machines/stories/w2-s2-run-lifecycle-and-recovery.md)

Records and bootstrap inputs:

- [`../../../wave-4a-core/stories/w4-s1-records-observability.md`](../../../wave-4a-core/stories/w4-s1-records-observability.md)
- [`../../../wave-4a-core/stories/w4-s4-bootstrap-composition-root.md`](../../../wave-4a-core/stories/w4-s4-bootstrap-composition-root.md)

Current read-only contract and design sources:

- [`../../../../../../design/contracts/observability-records-contract-v0.md`](../../../../../../design/contracts/observability-records-contract-v0.md)
- [`../../../../../../design/core/records.md`](../../../../../../design/core/records.md)
- [`../../../../../../design/core/bootstrap.md`](../../../../../../design/core/bootstrap.md)
- [`../../../../../../design/core/orchestration.md`](../../../../../../design/core/orchestration.md)
- [`../../../../../../design/notes/runtime-design-m5a.md`](../../../../../../design/notes/runtime-design-m5a.md)

Product sources:

- [`../../../../../../product/guarantees.md`](../../../../../../../product/guarantees.md)
- [`../../../../../../product/concepts.md`](../../../../../../../product/concepts.md)

## Probe surface boundaries

This package probes four source-owned surfaces together:

1. Wave 2 recovery semantics: `stopped`, `resumed`, safe checkpoint, no-double-effect, resume
   integrity, and liveness-driven stop.
2. Wave 4a records semantics: append-only evidence, pure projections, redaction/export posture, and
   durable notice surfaces.
3. Wave 4a bootstrap re-entry semantics: launch binding, storage preflight, binding-record
   ordering, and resume re-entry preserving original binding.
4. Product and contract commitments: `RESUME-*`, `GUARD-*`, `SEE-*`, `LIVE-*`, `SEC-1`, `ISO-4`,
   `INV-003`, `INV-006`, and existing unnumbered candidates.

## Scenario families

### 1. Resume from durable checkpoint with unchanged binding

Probe whether Wave 2 `RESUME-1..4`, Wave 4a binding-record ordering, and the records contract's
run/input-binding posture remain coherent when a run stops and resumes without any governing-input
change.

### 2. Resume after irreversible action already recorded

Probe whether no-double-effect stays reconstructible from records alone when bootstrap re-enters and
orchestration must not repeat a prior irreversible runner action.

### 3. Resume after safety-relevant governing-input change

Probe whether `RESUME-5` and `GUARD-2` are durably visible across the combined recovery/records/
bootstrap surface without mutating the original launch binding.

### 4. Parked or liveness-driven stop becoming run-level recovery evidence

Probe whether story-level parked/stale/overdue conditions become the required run-level stop,
notice, and resume surfaces with enough causality to reconstruct what halted and what unblocks it.

### 5. Preview, launch binding, and run identity boundary

Probe whether the non-committing preview path, the later binding record, and the contract's run
identity/input-binding requirements stay coherent without inventing a new identity model locally.

### 6. Redaction/export under stopped and resumed runs

Probe whether records remain safe to keep and diagnostically sufficient when a run stops or resumes,
especially where stop/notice/resume evidence intersects with redaction posture and exportability.

## Contradiction-check method

- Use [`contradiction-matrix.md`](./contradiction-matrix.md) as the row-based pressure map.
- For each row, compare source claims, note whether the seam is coherent, under-specified, or
  contradictory, and route any issue to the owning surface.
- Record only source-backed findings in
  [`findings-and-open-questions.md`](./findings-and-open-questions.md).
- Keep unresolved or ambiguous items as routed open questions rather than local resolutions.

## Finding-routing rules

- Route run-state or recovery-authority issues to Wave 2 owners.
- Route records, projection, redaction/export, or binding-record ordering issues to Wave 4a owners.
- Route product-commitment ambiguity to product owners.
- Route cross-wave collection and unresolved integration carry-forward to U9.

## Invariant handling

- Read-only invariant citations in scope: `INV-003`, `INV-006`.
- Read-only candidate surfaces in scope include the existing Wave 2 / Wave 4a candidates around
  binding-record-append-precedes-run-readiness, resume-re-entry-preserves-original-binding,
  write-conflict-rejected, and replay-determinism.
- This package does not assign a new `INV-*` row and does not use `INV-019`.

## Risks and deferred decisions

- Risk: the probe could drift into local redesign if a contradiction is explained instead of routed.
- Risk: recovery and records evidence can appear coherent in pairwise reads but become ambiguous only
  when all four surfaces are composed.
- Deferred decision: whether current source-backed gaps become design changes belongs to the routed
  owner, not to this package.

## Review evidence

Review evidence for this package is tracked in [`review-evidence.md`](./review-evidence.md). That
file records the settled verdict, finding dispositions, and Wave 5 decision-log linkage for the
package.
