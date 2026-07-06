---
title: "ADR 0032 - Export audit records are write-once JSON artifacts"
status: applied
---

# ADR 0032 - Export audit records are write-once JSON artifacts

## Context

Phase 10 implements the `SEE-6` commitment: a finished run can leave Jig as a write-once,
redacted-by-default audit record. The records design intentionally left three choices open before
implementation: the export surface, the export encoding, and the replay-drift surface when a run
cannot be exported honestly.

The authoritative run log must remain byte-identical after finalization. Adding an export event to
`events.jsonl` would make the exported basis depend on whether export had already happened, which
would weaken replay and golden checks. The audit event therefore needs a settled location outside
the finalized run log.

## Decision

`export` is an operator-control action exposed by the SDK and CLI as `jig export <run-directory>`.
It is a pure read of the run records plus one local write-once artifact.

The export encoding is JSON with format id `jig.audit-export.v0`. The artifact contains:

- a manifest with run id, plan id, lifecycle state, status, event counts, and redaction policy;
- integrity status for the source run, including honest `not-applicable` posture when no sidecar
  is expected;
- the replay projection;
- redacted exported events with line numbers; and
- visible withheld-event entries for unsupported, missing, or ambiguous export posture.

Export attempts write one audit event to the caller-visible audit file in the selected export
directory: `exports/export-audit.jsonl` by default, or `export-audit.jsonl` in the caller-provided
output directory. When a caller-provided output directory differs from `<runDir>/exports`, Jig also
mirrors the same event byte-for-byte into `<runDir>/exports/export-audit.jsonl` as the run-owned
discoverability sidecar that `inspect` and run-level `ask-why` read. Neither copy is written to the
run's authoritative `events.jsonl`.

- Successful attempts write `export.prepared` with artifact path and SHA-256.
- Refused attempts write `export.denied` with a reason.

Drift and integrity handling is fail-closed. If a run expects an integrity sidecar and verification
fails, export is refused as `export.denied`. If replay/projection fails, export is refused as
projection drift. If a run is still live, export is refused; only `completed` and `stopped` runs are
exportable.

Write-once means an export invocation never mutates an existing artifact. Re-export creates a new
timestamped artifact with a unique suffix and leaves prior artifacts intact.

## Consequences

- Export can satisfy `SEE-6` without changing replay semantics or mutating finalized run logs.
- Consumers have one authority split: the selected export directory is the returned export-local
  audit location, while `<runDir>/exports/export-audit.jsonl` is the canonical run-owned
  discoverability sidecar for later observation surfaces.
- Compliance handoff gets one self-contained JSON artifact plus a local audit trail of export
  attempts.
- Unknown or ambiguous export posture never silently leaks content; the artifact either withholds
  the affected event visibly or denies export for integrity/projection drift.
- The phase creates no upload target, retention policy, storage engine, public package promise, or
  event-schema freeze.
