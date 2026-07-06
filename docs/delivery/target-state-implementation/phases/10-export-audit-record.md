---
title: "Phase 10 - Export: write-once audit record"
status: "merged (#69)"
---

# Phase 10 - Export: write-once audit record

## Overview

Deliver `SEE-6`: a finished run exports as a write-once, redacted-by-default audit record — a
single durable artifact an owner can archive or hand to compliance. This phase also forces the
export surface placement and two deferred records-design decisions into the open (export
encoding; replay-drift handling surface) by routing them to the driving/records design owners
before implementation.

## Background

The records layer holds everything an export needs: the append-only event log, snapshots, the
integrity sidecar, per-event redaction posture, and pure projections. What is missing is the
export itself: no export action exists, and the design deliberately deferred the export file
encoding and the surface for handling replay drift (stop token vs. notice vs. export denial —
[`records.md`](../../../design/core/records.md) names both as undecided). `SEE-6` is the only
guarantee-5 commitment with no implementation trace at all.

## What To Do

- Route the deferred decisions first: propose export surface placement, export encoding, and a
  replay-drift handling surface to the driving/records design owners (a short ADR or a
  records.md deepening), then implement what is settled.
- Implement the settled export surface: given a finished run's directory, verify integrity
  (sidecar where present), replay/project to confirm internal consistency, apply export
  redaction posture per record (fail closed on unknown/ambiguous posture), and emit one
  write-once artifact.
- Write-once means the export is immutable once produced: re-export produces a new artifact
  (identifiable, timestamped), never a mutation of a prior one.
- Redacted-by-default: the default export applies the strictest recorded posture; anything
  whose posture is unknown is withheld and the withholding is itself visible in the export
  manifest.
- Surface export in inspect/ask-why vocabulary as appropriate ("this run was exported at …",
  attributable).

## Why

- `SEE-6` — the last unimplemented observability commitment
  ([guarantee 5](../../../product/guarantees.md#5-full-observability));
  [use-cases](../../../product/use-cases.md) "reconstructing a run after the fact."
- `SEC-1` — secrets stay out of exports; export is the highest-risk leak surface because it is
  designed to leave the machine.
- [`design/core/records.md`](../../../design/core/records.md) — export posture per record,
  fail-closed on unknown posture; the deferred decisions this phase forces.

## Technical Requirements

- Export is a pure read plus one new artifact: it never mutates run records, and it runs
  against finished (or stopped) runs only — exporting a live run is a recorded refusal.
- Integrity: where a sidecar exists, a failed verification refuses export (the drift surface
  decision governs the exact refusal shape); where none exists (reference runs), the export
  says so honestly.
- Redaction is applied at export time from recorded posture, not re-derived by scanning; an
  ambiguity is a diagnosable stop (consistent with the append-time rule).
- One export invocation, one audit event payload in the settled locations: the selected export
  directory keeps the returned export-local audit file, and when that directory differs from
  `<runDir>/exports`, Jig mirrors the same event byte-for-byte into
  `<runDir>/exports/export-audit.jsonl` as the run-owned discoverability sidecar for
  `inspect`/`ask-why`; goldens byte-identical (export reads records, it does not add
  reference-path events — no export audit event may land in the exported run's log after
  finalization).
- No upload, no external sink — export writes a local artifact (`CFG-7` consumers take it from
  there).

## Reference Files

- [`product/guarantees.md`](../../../product/guarantees.md) `SEE-6`, `SEC-1`
- [`design/core/records.md`](../../../design/core/records.md) (export posture, deferred
  decisions), [`design/domain/runtime-and-observation.md`](../../../design/domain/runtime-and-observation.md)
- [Observability-records contract v0](../../../design/contracts/observability-records-contract-v0.md)
  (export file format listed as deferred)
- [ADR 0032](../../../design/decisions/0032-export-audit-records.md) (settled P10 export
  encoding, audit-event location, and drift handling)
- Source: `src/records.ts`, `src/integrity.ts`, `src/redaction.ts`, `src/projection.ts`
- Tests: records/integrity/redaction unit tests

## Dependencies

- **Requires:** P01 (port to extend).
- **Soft:** after P02.
- **Unlocks:** feeds P14; strengthens P11's evidence packaging.
- **Parallel:** P03–P09.

## Acceptance Criteria

1. Exporting a finished fixture run produces one artifact from which the run's decisions,
   outcomes, and evidence trail are reconstructible without access to the original run
   directory (`SEE-6`, `SEE-1`).
2. A record with unknown/ambiguous redaction posture causes a diagnosable stop or a visible
   withholding, per the settled design — never silent inclusion (`SEC-1`).
3. A tampered event log (integrity sidecar mismatch) refuses export through the settled drift
   surface; the refusal is recorded and explained.
4. Re-export yields a new, distinguishable artifact; no path mutates an existing export.
5. Exporting a live run refuses with guidance; the export invocation carries one audit event
   payload in the settled export-local audit file and, when needed for discoverability, a
   byte-identical mirror in `<runDir>/exports/export-audit.jsonl`.
6. The encoding/drift decisions are recorded in the design layer (ADR or deepened records.md)
   before the implementing code merges; goldens byte-identical.

## Verification

- `pnpm check`; unit tests for redaction-posture matrix, integrity-refusal, write-once
  semantics; an integration round trip (run fixture → export → reconstruct).
- A redaction sweep of a sample export in review (no secrets, no withheld-content leaks).
- Reviewer axes: fail-closed completeness, immutability of prior exports, honesty of
  no-integrity-sidecar exports.

## Out Of Scope

- Retention policies, storage engines, or export upload targets.
- Dashboards/analyzers consuming exports (extension examples).
- Event-schema freeze (P13) — the export reads v0 as-is.
- Exporting across multiple runs (per-run only, per `SEE-6`'s "a finished run exports").

## Stop Or Escalate If

- The records design owner does not settle encoding or the drift surface from this phase's
  proposal — the phase stays blocked; do not implement against a guessed decision.
- Write-once semantics conflict with how `run.json`/finalization currently behaves — route the
  finalization question to the records owner rather than special-casing.
- Export requires posture data older records lack — settle the legacy-record stance (refuse vs.
  degrade-with-notice) with the records owner; "no silent legacy coping" applies.
