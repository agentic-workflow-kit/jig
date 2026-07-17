---
title: "Readiness closure rubric — stable pass criteria for empty-repository implementation review"
purpose: Define the fixed blocker standard and chained-ratchet procedure for the product-readiness gate.
audience:
  - Independent product-readiness reviewers
  - Architecture authors and implementers
  - Arye Kogan, Jig product and architecture decision owner
scope: Readiness-gate closure criteria and review procedure; architecture selection and implementation verification are excluded.
state: current
status: owner-approved round-6 remediation standard, amended by owner ruling on 2026-07-17, further amended by the 2026-07-17 R5.1 wait/derived-structural-ineligibility clarification and the R6.1 settling ruling recorded in the twelfth gate-record review; applies to future product-readiness reviews
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ./gates-and-reviews.md
  - ../design/decisions/product-readiness-gate-record.md
  - ../design/delegation-register.md
---

# Readiness closure rubric — stable pass criteria for empty-repository implementation review

## Purpose

Defines what PASS means for the empty-repository implementability gate, so the standard is fixed
across reviewer sessions instead of re-derived by each one. A gate finding is a **blocker** only
when it cites a violated rubric clause against the exact candidate bytes. A finding that does not
fit any clause is recorded as a **rubric-amendment proposal** (owner ruling required before it can
block) or a **delegation-register candidate** — never an automatic blocker.

## Closure clauses

### R1 — Catalog closure

- R1.1 Every `EV-*` event names exactly one producer, its ingress port or internal deriver, its
  subject kind, and its validation basis.
- R1.2 Every trigger consumed by a cataloged lifecycle or administrative Transition is a cataloged
  event. Every cataloged event names at least one consuming Transition or an explicit named
  non-Transition consumer; every event that advances lifecycle state appears as a trigger on at
  least one state-changing Transition.
- R1.3 Every `OPC-*` Operation names its port, effect class, reconciliation obligation, and at
  least one authorizing transition; every externally effectful act crosses a cataloged Operation
  or the commit primitive.
- R1.4 Every lifecycle state has a cataloged entry and exit; every terminal state enumerates its
  legal post-terminal appends. No state can strand.

### R2 — Schema closure

- R2.1 Every `SCH-*` family names its producer(s) and at least one consumer or validator; a field-level producer is named only where one family's fields have different producers.
- R2.2 Every artifact another contract freezes, binds, or hashes has a named carrier schema.
- R2.3 Every identity is deterministically mintable from stated inputs, and no digest covers a
  record that must itself reference that digest (no self-referential binding).

### R3 — Authority closure

- R3.1 Every authority (approve, accept, land, dispose, export, stop, delegate) names its
  principal kind, ingress port, and validating record.
- R3.2 Every principal kind the product permits for a role has a design-level ingress contract.
- R3.3 A release of held authority names what proves the holder's in-flight effects are
  reconciled, provably fenced, or parked before another holder can act on the same subject.

### R4 — Durability closure

- R4.1 Every store whose loss or rollback could forge, duplicate, or silently retire authority is
  witness-covered, or its restore path is a deliberate stop.
- R4.2 Every cross-Run shared resource (target, artifact store, intake index) names one authority
  of record and a cross-Run guard for destructive or duplicating actions.

### R5 — Liveness closure

- R5.1 Every wait names accountable owner, durable reason, wake condition, bound class, and
  explicit exhaustion action (existing D8 rule, restated as a gate clause). A **wait** is a
  bounded, owner-held pause with a wake condition, a bound class, and an exhaustion action;
  **derived structural ineligibility** — no timer, no owner-held bound, resolving by derived
  eligibility or by a terminal dependency disposition — is not a wait. The finite wait inventory
  enumerates waits and need not enumerate derived ineligibility. Story `Pending` (dependency
  eligibility awaiting prerequisite `Landed`) is the recorded example.
- R5.2 Every state with completion duties has a trigger that fires when the last duty completes,
  regardless of the order in which duties complete.
- R5.3 Every Run phase path reaches a terminal-settlement position or an explicitly cataloged
  no-settlement disposition, with export and disposition rules stated for each.

### R6 — Traceability closure

- R6.1 The 44 `PC-*` proof routes are covered per the recorded resolution in the reconciliation
  minimal-route table, as corrected through round 12: each route names the set of elements that
  jointly covers its commitment's complete compound promise. Reviewers verify each route against
  that recorded resolution and confirm R6.2's deterministic `CF-GATE-PRODUCT` composition; they do
  not re-derive per-route minimal-complete sets or apply a per-route deletion/completeness ratchet.
  Reopening a specific route requires explicit Arye authorization; it is not a reviewer preference.
- R6.2 `CF-GATE-PRODUCT` composition is deterministic: it enumerates its inputs and its
  conjunction rule; no judgment step decides which routes count.
- R6.3 The 56 imported guarantee IDs are covered per the recorded rounds-3–5 resolution
  (reconciliation matrix plus conformance suites). OD-3 retains that resolution and excludes a
  per-ID minimal-route ratchet unless Arye explicitly reopens it; it is not a reviewer preference.

### R7 — Policy-surface closure

- R7.1 Every policy-selectable classification — the non-gating Operation classes, required check
  classes, integration modes, and final-verification posture; this list is exhaustive — has a
  validation rule, a design-owned forbidden set where safety-relevant, and a default; a required
  explicit selection whose omission fails preflight closed satisfies the default requirement. An
  unknown or forbidden value fails preflight closed.

## Out of rubric by definition

Governed by the [delegation register](../design/delegation-register.md), never blockers: wire
encodings and serialization, package layout below fixed boundaries, internal algorithms, port
transports, concrete provider implementations after qualification, physical storage techniques
satisfying the recorded contracts, UI details, test-harness selection, and numeric tuning within
declared ranges.

## Gate procedure (chained and ratcheted)

1. The reviewer receives the exact candidate commit, this rubric at its recorded version, the
   delegation register, and the previous gate record with its resolution table — all normative.
2. Every blocker cites the rubric clause it violates and the exact anchor.
3. A finding that contradicts a previously settled resolution must demonstrate that resolution
   wrong on the current bytes; a stricter standard alone reopens nothing.
4. Findings outside the rubric are recorded as amendment proposals or register candidates in a
   separate section of the gate record.
5. PASS: zero in-rubric blockers plus green formatting/link verification. The readiness lock
   activates only after **two consecutive independent sessions** return PASS on the **same exact
   commit**. The lock binds to that reviewed commit, tree, and normative-subject manifest.
   Post-PASS record and archival commits are administrative appends: within the normative set they
   may only add the gate-record entry and archive manifest and update navigation/status pointers,
   each enumerated and diff-verified against the reviewed commit; any other normative change
   invalidates the dual PASS and requires a fresh dual review of the changed candidate.
6. After lock, further discoveries route to the implementation track as ordinary issues; they do
   not reopen the gate unless the owner rules a rubric clause was violated at lock time.
7. Rubric changes are owner-ruled amendments recorded with the same bounded-reopen discipline as
   decision records.
