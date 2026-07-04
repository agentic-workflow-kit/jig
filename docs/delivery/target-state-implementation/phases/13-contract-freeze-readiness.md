---
title: "Phase 13 - Contract v0 freeze readiness"
status: planned
---

# Phase 13 - Contract v0 freeze readiness

**Blocked:** requires P11 (evidence path) and an explicit contract-owner freeze decision.
Readiness work is in scope; the freeze itself is a decision this phase prepares, not one it
makes.

## Overview

Prepare the T14 freeze decision package for Jig's two versioned seams — the execution-plan
contract and the observability-records contract: field-level schema drafts, disposition of the
two delivery-owned v0 input restrictions, causality-field completeness against everything the
track shipped, golden migration analysis, and the evidence citations the contract owner needs
to decide freeze, partial freeze, or explicit deferral.

## Background

Both contracts are deliberately "v0 shape, not a frozen schema"; field encodings are design
detail "until schema freeze." ADR 0028's consequences keep T14 gated "on the transport
implementation/evidence path and the other recorded gates." Two v0 input restrictions are
explicitly delivery-owned and marked "to be relaxed or ratified at schema freeze": the
conservative path-safe story-ID charset and the topologically-ordered `dependsOn` requirement.
The observability contract phases in causality fields with the phases that introduce their
concepts — by this point P05, P08, P09, and P10 have added events whose basis/redaction
completeness must be checked. Freezing is a breaking-change commitment for every downstream
consumer, which is why the owner decides and this phase only prepares.

## What To Do

- Draft field-level schemas (JSON Schema and/or typed event constants — the form the contract
  owner prefers) for both contracts as they actually are after P01–P12, flagging every place
  the draft would diverge from shipped bytes.
- Disposition the two v0 input restrictions with evidence: ratify or relax the ID charset and
  the topological-`dependsOn` requirement, with the compatibility consequences of each option.
- Audit causality/redaction/basis field completeness across all event families the track added;
  list additive gaps.
- Produce the golden migration analysis: what freezing would change (ideally nothing — the
  goldens are the compatibility surface), and the versioning story for any divergence.
- Assemble the decision package citing the EVRUN-full record and the remaining open evidence
  gaps (Windows, remote, prompt-size) so the owner decides with the honest boundary in view.
- Present to the contract owner; record the outcome as an ADR (freeze, partial freeze, or
  explicit deferral with reasons). Implementation of a freeze (schema files in the repo,
  validation wiring, conformance against schema) happens only after and per that ADR.

## Why

- T14 is the recorded gate this track inherits (ADR 0028 Consequences); "changing their shape
  is a breaking change for downstream consumers" (`AGENTS.md`) is the reason freeze readiness
  is a deliverable, not a formality.
- The execution-plan contract is Jig's one hard input boundary (product: "The execution plan —
  Jig's one input"); the records contract is the product surface `SEE-2` promises tools can
  build on.
- Downstream suite tools (planning layer emitting plans; analyzers consuming records) need a
  freeze or an honest "not yet" — silence blocks them either way.

## Technical Requirements

- Nothing in this phase changes runtime behavior, goldens, or fixtures; it produces analysis,
  schema drafts, and a decision record.
- Schema drafts must be generated/checked against real record output and fixtures, not
  transcribed from prose.
- The v0 rule that additions are additive and no field is silently repurposed governs every
  recommendation.
- The decision ADR follows the ADR log conventions (flat log, next number, live index update).

## Reference Files

- [Execution-plan contract v0](../../../design/contracts/execution-plan-contract-v0.md) and
  [observability-records contract v0](../../../design/contracts/observability-records-contract-v0.md)
  (including their Deferred sections and the two delivery-owned restrictions)
- [ADR 0028](../../../design/decisions/0028-codex-app-server-transport.md) (T14 gate);
  [ADR 0026](../../../design/decisions/0026-conformance-self-report-only.md) (verdict
  vocabulary constraints)
- P11's evidence records; the golden files under `tests/fixtures/m5b-local-mvp/`
- Source of truth for shipped shapes: `src/plan-validator.ts`, `src/records.ts`,
  `src/projection.ts` (post-P02 package locations)

## Dependencies

- **Requires:** P11 (hard); a contract-owner decision to conclude (blocking).
- **Soft:** P05, P08, P09, P10 landed (their events are audit subjects; starting earlier means
  auditing a moving target).
- **Unlocks:** P14's closing claims about contract posture.
- **Parallel:** P12.

## Acceptance Criteria

1. Field-level schema drafts for both contracts exist, validated mechanically against current
   fixtures, goldens, and at least one real-run record.
2. Both v0 input restrictions have a written ratify/relax recommendation with compatibility
   consequences.
3. The causality/redaction field audit lists every event family the track added with its
   basis/posture completeness.
4. The decision package cites EVRUN-full and names the still-open evidence gaps.
5. A contract-owner decision is recorded as an ADR — freeze, partial freeze, or deferral with
   reasons. Any outcome closes the phase; only silence does not.

## Verification

- Mechanical schema-vs-artifact validation runs are shown in the PR (drafts actually match
  bytes).
- `pnpm check` (docs formatting; no runtime diffs expected).
- Reviewer axes: draft fidelity to shipped bytes, completeness of the restriction analysis,
  honesty of the evidence citations.

## Out Of Scope

- Implementing the freeze (schema files in the gate, validation wiring) — that is a follow-up
  authorized by the decision ADR.
- Any runtime, fixture, or golden change.
- New event families or contract-shape changes — this phase describes, it does not amend.
- Public schema publication (packaging posture unchanged).

## Stop Or Escalate If

- The audit finds shipped record output that contradicts the contract prose — that is a
  design/implementation conflict to route immediately (whichever landed it owns the fix), not a
  footnote in the freeze package.
- The owner wants a freeze that would break golden byte-stability — the migration/versioning
  question routes back through the records contract's own compatibility rules before any
  implementation is scheduled.
