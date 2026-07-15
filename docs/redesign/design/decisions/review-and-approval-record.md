---
title: "Layer 1 review and approval record"
purpose: Preserve the Layer 1 review history, traceability, archive-evidence dispositions, and the current gate state after the 2026-07-15 structure revision.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
scope: Question traceability, archive reconciliation, gate evidence, prior review records, and the current approval state; decision content lives in the decision records and design pages.
state: proposed
status: gate record — prior exact-candidate recheck superseded by the 2026-07-15 owner structure revision; the re-presented candidate set requires a fresh independent review before the recorded approval and lock become effective
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../brief.md
  - ../../AGENTS.md
  - Explicit owner structure-revision instruction, 2026-07-15
related:
  - ./README.md
  - ../README.md
  - ../invariants.md
---

# Layer 1 review and approval record

## Current gate state

- **Product-conflict result:** None. No product reference or external product promise was imported;
  archived review references to outside product/design contracts remain non-governing evidence.
- **Architecture owner:** Arye Kogan. He retains all material product and architecture decision
  ownership; the bounded review delegation transfers no architecture-selection or change authority.
- **Current state:** Proposed. On 2026-07-15 Arye directed a structure revision: the former
  two-artifact candidate was split into the connected view-based document set under
  [`design/`](../README.md). That instruction superseded the then-pending same-reviewer
  exact-candidate recheck of the two-artifact candidate, because the exact candidate no longer
  exists in that form.
- **Required next gate:** An independent reviewer must review the exact re-presented candidate set
  under the same bounded editorial/fidelity delegation and return `PASS`, `CHANGES_REQUIRED`, or
  `OWNER_DECISION_REQUIRED`. A `PASS` confirms faithful organization and re-expression of the
  already-established decisions and makes the recorded Layer 1 approval and lock effective; it does
  not select or change architecture.
- **Layer 2:** Authoring authorized by the explicit owner continuation instruction of 2026-07-15,
  recorded below. Layer 2 is prepared against the proposed Layer 1 candidate and must treat D1–D9
  and I1–I21 as fixed inputs; the Layer 1 independent-review gate remains in force and must pass
  before Layer 1 is treated as locked. Layer 2 advances through its own gate: author, independent
  review, then owner stop.

## Owner continuation authorization (2026-07-15)

On 2026-07-15 Arye Kogan, the product and architecture decision owner, explicitly directed the
redesign work to continue past the previously recorded post-Layer 1 execution stop. The recorded
instruction:

1. keeps the Layer 1 fresh independent-review gate in force: it must run before the recorded
   Layer 1 approval and lock become effective, and its verdict is recorded in this document;
2. authorizes Layer 2 authoring, prepared against the proposed Layer 1 candidate, with D1–D9 and
   I1–I21 as fixed inputs; a genuine conflict with a fixed input returns to Arye as
   `OWNER_DECISION_REQUIRED` rather than being resolved in place;
3. keeps the per-layer gate for Layer 2 — author, then independent review, then owner stop — so
   Layer 2 approval remains Arye's; and
4. directs a subsequent rewrite of the `guidelines/` handbook as generalized, project-agnostic
   guidance derived from the source guide, with Jig used only as a marked worked example.

This authorization replaces the former "do not enter Layer 2, push, or open a PR" execution stop;
the redesign contract and the design index were updated in the same change. It alters no decision
content: D1–D9, I1–I21, all accepted consequences, and the consolidated deferrals are unchanged.

## Requirement and question traceability

### Ten Layer 1 questions

| Guideline question                                                   | Answer location                                                                                                                                                   |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-Q1 — system scope and external relationships                       | [System context](../context.md), including view V1.                                                                                                               |
| G-Q2 — major responsibilities and boundaries                         | [Design index overview](../README.md), [system context](../context.md), and the [authority matrix](../perspectives/authority-and-trust.md) with view V2.          |
| G-Q3 — trust, untrusted input, independent verification              | [Trust and compromise posture](../perspectives/authority-and-trust.md), [acceptance and evidence](../acceptance-and-evidence.md), and I7–I9/I15/I20.              |
| G-Q4 — authority for decisions, data, execution, effects, escalation | [Power vocabulary and authority matrix](../perspectives/authority-and-trust.md) and the [authoritative transition ordering](../flows/run-and-story-lifecycle.md). |
| G-Q5 — lifecycle and information flow                                | [Run and Story lifecycle](../flows/run-and-story-lifecycle.md), including views V3 and V3a–V3c, plus the [story delivery scenario](../flows/story-delivery.md).   |
| G-Q6 — durable, transient, and derived state                         | [State and recovery](../state-and-recovery.md), including view V4.                                                                                                |
| G-Q7 — concurrency and serialization                                 | [Concurrency and finalization](../concurrency-and-finalization.md) and view V4.                                                                                   |
| G-Q8 — acceptance and trustworthy evidence                           | [Acceptance and evidence](../acceptance-and-evidence.md).                                                                                                         |
| G-Q9 — failure, stop, liveness, interruption, Recovery               | [Failure and liveness](../failure-and-liveness.md) plus views V3/V4.                                                                                              |
| G-Q10 — later-layer invariants                                       | [Invariants](../invariants.md) and the [decision index](./README.md).                                                                                             |

### Nine approved Layer 0 handoff questions

| Handoff question                                                           | Architectural answer                                                                                                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L0-H1 — responsibilities/boundaries satisfy capabilities/scenarios         | The authority-and-proof boundary and Jig-owned responsibility list in the [system context](../context.md), with views V1/V2.                                                              |
| L0-H2 — claim-specific trust and trust failure                             | The [trust/compromise posture](../perspectives/authority-and-trust.md), [evidence roles](../acceptance-and-evidence.md), and the [failure-containment table](../failure-and-liveness.md). |
| L0-H3 — propose/perform/observe/approve/decide/recover ownership           | The [eight-power vocabulary and authority matrix](../perspectives/authority-and-trust.md). `Attest` is the canonical approval/judgment claim power.                                       |
| L0-H4 — complete progression/information flow                              | The [Run and Story lifecycles](../flows/run-and-story-lifecycle.md) plus view V3.                                                                                                         |
| L0-H5 — continuity, explanation, duplicate prevention                      | The [durable ledger, Transition/Operation identity, fencing, and reconciliation](../state-and-recovery.md).                                                                               |
| L0-H6 — isolation, deterministic order, progress, serialized target change | [Resource-class capacity, the immutable comparator, and single target authority](../concurrency-and-finalization.md).                                                                     |
| L0-H7 — independent exact-result acceptance/evidence                       | [Reviewer-principal acceptance and the exact-subject evidence model](../acceptance-and-evidence.md).                                                                                      |
| L0-H8 — failure/liveness/preservation/Recovery                             | [Smallest-safe containment, bounded paths, the liveness assumptions/guarantee, and Retirement](../failure-and-liveness.md).                                                               |
| L0-H9 — traceable invariants                                               | [I1–I21 and their decision/driver trace](../invariants.md).                                                                                                                               |

The approved Layer 0 outcomes O1–O9, capabilities C1–C14, and scenarios QS1–QS12 are also
accounted for in the exhaustive author evidence at `/tmp/jig-layer1-fidelity.md`; that working file
is not canonical architecture.

## Archived proposal and review reconciliation

The archive was audited only after the original 450-row binding-source inventory had frozen the
governing owner decisions. The corrected inventory adds the controlling active-gate row as binding
row 451. The exhaustive 39-row audit and exact source locations remain in
`/tmp/jig-layer1-fidelity.md`. The material Layer 1 dispositions are:

| Archived evidence                              | Material issue or useful direction                                                                                                                                                  | Disposition in this candidate                                                                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Proposal-wide direction                        | Approved-envelope intake, deterministic preflight, exact-Candidate review, concurrent work, serialized target change, landing proof, evidence binding, and safe cleanup.            | Preserved and reorganized under D2–D8.                                                                                                                                   |
| Proposal mechanisms                            | One branch/worktree, retained sessions, optional PR, exact loop counts, named ports, schemas, event/Operation catalogs, provider choices, checkpoint modes, and delivery mechanics. | Omitted as Layer 2 detail and included in the consolidated deferral categories.                                                                                          |
| In-memory authority and no resume              | Durable events could diverge from lost live state and could not support interruption Recovery.                                                                                      | Replaced by the already-selected D5 durable-ledger authority and D8 Recovery posture.                                                                                    |
| Commit-unknown append window                   | Atomic append lacked stable Transition identity, expected position, acknowledgement reconciliation, and readback.                                                                   | D5 requires stable identity plus committed/absent/indeterminate reconciliation; mechanics remain Layer 2.                                                                |
| Premature terminal `Blocked`                   | Mandatory preservation and resource Retirement had no legal post-outcome path.                                                                                                      | D4/D8 separate business outcome from Retirement.                                                                                                                         |
| Story-count capacity and review deadlock       | Retained sessions, review, Retirement, and progress capacity were not coherently represented.                                                                                       | D6 selects resource-class capacity and admitted-progress priority.                                                                                                       |
| Non-deterministic ties and incomplete blockers | Equal priorities and multi-root dependencies could depend on iteration or arrival order.                                                                                            | D6 selects the immutable total comparator and complete canonical reachable direct-root set.                                                                              |
| Finalization authority lifecycle               | Rework/refresh could retain stale Candidate-bound authority or starve other Stories.                                                                                                | D6 releases authority for ordinary rework and permits bounded refresh ownership only with renewed review and atomic rebinding.                                           |
| Unbounded rework and missing wake              | Verification/review/target waits could loop or stall without a bound or durable wake.                                                                                               | D8 bounds every path and requires durable reason, owner, wake/completion condition, and exhaustion action.                                                               |
| Uncertain remote effects                       | No required lookup/reconciliation before a new attempt.                                                                                                                             | D5/D8/I17 require effect certainty and reconciliation under stable Operation identity; provider realization is Layer 2.                                                  |
| External provider-seam review claim            | An archived review cited outside product/design contracts for fixed seams and host proof.                                                                                           | The cited contracts were not imported. Generic authorization, attestation, parking, and trust concerns are already satisfied by D2/D3/D8; concrete seams remain Layer 2. |
| External mandatory-check review claim          | An archived review cited an outside automated-check promise and recommended mandatory independent verification.                                                                     | The promise was not imported. D7 intentionally retains policy `none` and its explicitly accepted residual risk; no owner decision was changed.                           |

### Product-conflict result

There is **no imported product promise and no product conflict to resolve**. References in the
archived Codex review to repository product/design contracts are adversarial historical evidence,
not governing input. Applying them as requirements would violate D1 and materially change D7; this
candidate does neither.

### Owner-decision result

The archive exposed no unresolved conflict that requires a new owner choice. Every material
Layer 1 issue is already resolved by D1–D9/I1–I21, and every remaining mechanism question maps to
the consolidated Layer 2 deferrals. The author verdict is therefore **no
`OWNER_DECISION_REQUIRED` finding**. This is not architecture approval.

## Layer 1 review and lock-gate evidence

| Gate item                                                                                    | Candidate evidence                                                                                                                                                                                                                                                         | Current result                                                                    |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| G-R1 — every Layer 1 question is answered or explicitly inapplicable                         | The ten-question and nine-handoff traces above name the canonical answer page for each question.                                                                                                                                                                           | Satisfied in the re-presented candidate.                                          |
| G-R2 — model, views, flows, and decision records agree                                       | One vocabulary and collision-free stable-ID model is owned by [model.md](../model.md) and referenced by V1–V4, the decision records, and I1–I21.                                                                                                                           | Satisfied in the re-presented candidate.                                          |
| G-R3 — success, rejection, failure, interruption, and Recovery are possible and owned        | The lifecycle flow, authoritative ordering, V3, the containment table, and the recovery rules name every branch and authority.                                                                                                                                             | Satisfied in the re-presented candidate.                                          |
| G-R4 — trust and authority rely on no unnamed behavior                                       | The eight-power vocabulary, responsibility matrix, trust/compromise posture, V2, and fail-closed rules name every authority boundary.                                                                                                                                      | Satisfied in the re-presented candidate.                                          |
| G-R5 — concurrency/serialization has no obvious safety or liveness contradiction             | D6, resource-class capacity, admitted-progress priority, immutable total order, one target authority, and bounded liveness form one posture.                                                                                                                               | Satisfied in the re-presented candidate.                                          |
| G-R6 — acceptance is tied to trustworthy evidence                                            | D7 and the acceptance page bind reviewer judgment, Jig validation, evidence roles, final verification, and landing proof to exact subjects.                                                                                                                                | Satisfied in the re-presented candidate, including the accepted D7 residual risk. |
| G-R7 — product-contract conflicts have explicit owner decisions                              | No product promise was imported. Archived outside references remain non-governing under D1, so there is no conflict to decide.                                                                                                                                             | Explicitly none.                                                                  |
| G-R8 — alternatives and negative consequences are visible                                    | Every D1–D9 record includes rejected alternatives and its negative consequence; all six final accepted burdens are consolidated in the [decision index](./README.md).                                                                                                      | Satisfied in the re-presented candidate.                                          |
| G-R9 — no material high-level decision is hidden in Layer 2                                  | The thirteen deferral categories are paired with an explicit non-deferrable lock boundary and traced to I1–I21.                                                                                                                                                            | Satisfied in the re-presented candidate.                                          |
| G-R10 — owner explicitly approves and durably records the lock; later change requires reopen | Arye's established decisions and the owner-approved delegation pre-record the exact effect: an independent reviewer's `PASS` on the exact re-presented candidate approves only faithful re-expression and activates the lock; later material change still requires reopen. | Pending the fresh independent review of the re-presented candidate set.           |

## Prior review history (historical)

### First Layer 1 review of the two-artifact candidate

- Independent reviewer session `019f625e-f66e-7a40-a9cd-3a7d5abaae30`, using `gpt-5.6-sol` with
  `xhigh` reasoning, returned `CHANGES_REQUIRED` against the recorded baseline and hashes below.
- **F1 correction:** removed the superseded separate post-`PASS` Arye selection/approval and
  metadata-edit step; distinguished continuing material owner authority from bounded
  editorial/fidelity approval; finalized all metadata before recheck.
- **F2 correction:** added the controlling active-gate inventory row and reconciled U7, L0-AUTH2,
  and G-R10 so an exact `PASS` activates recorded approval/lock without transferring architecture
  selection.
- **F3 correction:** preserved the V2 target fault scope as `F-TARGET` and assigned the V4
  configured authoritative target external fact source the distinct stable ID `X-TARGET`.
- **Material decision impact:** none. D1–D9, I1–I21, all selected alternatives, accepted
  consequences, trade-offs, and Layer 2 deferrals were unchanged.
- **Corrected fidelity result:** 451 binding rows plus 39 archived-evidence dispositions: 490 total;
  426 preserved, 47 reorganized, 17 omitted as Layer 2 detail, zero unexplained omissions, and zero
  `OWNER_DECISION_REQUIRED`.
- **First reviewed baseline:** repository `HEAD` `a40df8974b50765e2be0c0b05bc4c512ceae1652`; merge
  base `521ae0846e788ef91979dd4c273687ab22e6137e`.

| First reviewed file                               | SHA-256                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/redesign/README.md`                         | `6dec47df653b063de9f62b330421b80879d96818849e534be04f45dcf2a5b5fa` |
| `docs/redesign/design/README.md`                  | `db3bf5fc250e738d41b8d4623a99689255a2416358e5ad85b4409c1016a1f400` |
| `docs/redesign/design/high-level-architecture.md` | `be95650de11d0e48bb43258c64a4107dd84b3ac2d4c713f1d99746d1322ea332` |
| `docs/redesign/design/high-level-decisions.md`    | `4491e4cd68dc64ab110752d0f8cfbe3204749118e009dde1742c5a1110512608` |
| `/tmp/jig-layer1-fidelity.md`                     | `d071bcee3deb72fdaabd97f96383a195bf2528e15c4ec90ba39108604ef3b228` |

### Superseded final recheck of the two-artifact candidate

The corrected two-artifact candidate remained proposed pending the same reviewer's exact-candidate
recheck, whose `PASS` would have activated the recorded approval and lock. On 2026-07-15 Arye
directed the structure revision recorded in
[D9](./D9-invariants-and-artifact-shape.md#owner-selected-direction); the two-artifact candidate no
longer exists in reviewable form, so that recheck is superseded rather than failed. The prior
reviewer's substantive acceptance of the architecture content and the F1–F3 corrections remain
recorded evidence.

### Review rules that continue to apply

- Authors do not review their own work; reviewers are independent and read-only.
- A `PASS` applies only to the exact final candidate, including approval metadata; any later edit
  requires re-review.
- After at most three unsuccessful author/reviewer loops, unresolved findings return to Arye and no
  later layer begins.
