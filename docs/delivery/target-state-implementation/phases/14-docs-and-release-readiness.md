---
title: "Phase 14 - Target-state audit, docs truth-up, and release posture"
status: planned
---

# Phase 14 - Target-state audit, docs truth-up, and release posture

## Overview

Close the track: audit every product commitment against shipped behavior, bring every
status-bearing doc to shipped truth, record the packaging/release posture explicitly (private,
no publish promise — unchanged unless the owner decides otherwise), and mark this track
complete. This phase is an audit-and-docs PR; finding implementation gaps is a success
condition of the audit, not something this phase fixes.

## Background

Per-phase docs updates keep status claims locally true, but drift accumulates: the repo already
carries small examples (`package.json`'s description and `skills/README.md` omit `jig resume`).
The product page defines counter-signals this phase exists to catch — "supporting docs cite
commitment IDs that no longer exist," "owners treat current design defaults as product truth."
And the product boundary requires that any change to the no-public-package posture be "a
deliberate, owner-visible decision rather than a quiet drift" — so the track must end with that
posture restated or deliberately changed, never ambiguous.

## What To Do

- **Guarantee-coverage audit:** walk every ID in
  [`guarantees.md`](../../../product/guarantees.md) (FENCE, EARN, GUARD, DOOR, MERGE, SEC, CFG,
  RESUME, ISO, LIVE, STACK, DRIVE, SEE) and map each to shipped behavior plus the tests or
  evidence records that prove it, or to an explicitly recorded deferral (remote hosts,
  triggers, Windows, ecosystem distribution, anything the owner deferred at P13). Commit the
  audit table in this track's directory.
- **Docs truth-up:** root `README.md` (status badge, Status section, CLI surface,
  documentation table), `AGENTS.md` (status, commands, ground-truth table), `docs/README.md`
  (delivery row), `docs/archive/design/README.md` status lines ("pre-split", "pre-session-observable"
  are false by now), `package.json` descriptions, `skills/README.md` surface list, and this
  track's own README/phase statuses.
- **Release posture record:** restate the packaging posture as shipped — three private
  workspace packages, no `@agentic-workflow-kit/jig` publication, no stability promise — and
  route the "publish or not" question to the owner as an explicit open decision with what a
  yes would require (org publication path, Changesets, semver, jig-testkit's open
  public/internal question). Do not publish; do not promise.
- **Housekeeping decisions:** propose (not unilaterally do) whether the completed track moves
  to `docs/archive/delivery/` per the archive convention, and whether gaps found by the audit
  seed a successor track.

## Why

- Product success/counter-signals ([`jig.md`](../../../product/jig.md#success-and-counter-signals));
  the boundary's no-quiet-drift rule for packaging posture
  ([Product Boundaries](../../../product/jig.md#product-boundaries)).
- The track's definition of delivered ([`verification.md`](../verification.md#definition-of-delivered))
  requires exactly this audit as its evidence.
- `SEE`-style honesty applied to the repo itself: the docs are the record readers inspect;
  they must not tell a story the code does not back.

## Technical Requirements

- Audit claims cite file paths, test names, or evidence records — no "implemented" without a
  pointer.
- Docs changes state shipped truth only; product promises and design decisions are not
  reworded (altitude discipline).
- A gap found is recorded as a gap with a routing note; this PR does not grow implementation
  scope.
- The publish question's outcome (owner says yes, no, or later) is recorded; a "yes" spawns
  work outside this track — it is not absorbed here.

## Reference Files

- [`product/jig.md`](../../../product/jig.md), [`product/guarantees.md`](../../../product/guarantees.md)
- Root `README.md`, `AGENTS.md`, `docs/README.md`, `docs/archive/design/README.md`,
  `docs/archive/README.md` (archive convention), `package.json`, `skills/README.md`
- [`verification.md`](../verification.md); every phase doc in this track; P11/P13 outcome
  records

## Dependencies

- **Requires:** all other phases (P01–P13) merged or explicitly closed (a P13 deferral
  decision counts as closed).
- **Unlocks:** track completion.
- **Parallel:** nothing; this is the closing gate.

## Acceptance Criteria

1. The committed audit maps every product ID to proof or recorded deferral; zero IDs are
   unaccounted for.
2. An independent reader following root `README.md` and `AGENTS.md` alone gets an accurate
   picture of surface, packaging, and evidence status (reviewer performs this read).
3. The known drift examples are fixed (`package.json` description, `skills/README.md`), and a
   sweep found no doc claiming unshipped behavior as shipped.
4. The packaging/release posture is restated with the owner's explicit disposition of the
   publish question recorded.
5. The track README's phase table shows final statuses; the archive/successor proposal is
   recorded with the owner's answer.

## Verification

- `pnpm format:check` and `pnpm check`.
- Reviewer performs the fresh-reader walk (criterion 2) and spot-checks five audit rows at
  random against the cited proof.
- Link spot-check across changed docs (no link-check tooling assumed; add it as a separate
  small PR if the sweep hurts).

## Out Of Scope

- Fixing implementation gaps the audit finds (routed, not absorbed).
- Publishing packages, changesets, versioning infrastructure.
- Rewriting product/design content beyond status lines that this track's shipped work made
  stale.
- Archiving the track within this same PR (proposed here, executed after owner sign-off).

## Stop Or Escalate If

- The audit finds a product ID that no shipped behavior, test, or recorded deferral covers and
  no phase owns — that is a track-planning miss; surface it to the owner with a proposed
  disposition (successor phase vs. product-layer edit) rather than quietly downgrading the
  guarantee.
- Truth-up requires changing a product promise (not just a status line) — product edits are
  the owner's; route with the exact sentence and the evidence for why it cannot stand.
