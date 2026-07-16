---
title: "Layer 1 review and approval record"
purpose: Preserve the Layer 1 review history, traceability, archive-evidence dispositions, and the current gate state after the 2026-07-15 structure revision.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
scope: Question traceability, archive reconciliation, gate evidence, prior review records, and the current approval state; decision content lives in the decision records and design pages.
state: current
status: historical Layer 1 gate record — PASS activated the 2026-07-15 lock; the owner explicitly reopened only the F1/F2/F4/F6/F13-affected contracts on 2026-07-17 for readiness remediation
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
- **Current state:** Approved and locked. On 2026-07-15 Arye directed a structure revision: the
  former two-artifact candidate was split into the connected view-based document set under
  [`design/`](../README.md). That instruction superseded the then-pending same-reviewer
  exact-candidate recheck. The required fresh independent review of the exact re-presented
  candidate set ran the same day and returned `PASS` (recorded below), which per the pre-recorded
  G-R10 effect makes the recorded Layer 1 approval and lock effective without a separate
  owner-selection step. The `PASS` approves faithful organization and re-expression only; it
  selected and changed no architecture.
- **2026-07-17 bounded reopen:** The final readiness review failed on 13 findings. Arye explicitly
  authorized the named F1, F2, F4, F6, and F13 corrections where they propagate through D4, D6,
  D8, I14, and dependent Layer 1 views. On 2026-07-17 Arye also recorded the controlling
  interpretation of D3's delegation language: grants are operational-only; product/architecture
  imports or approval, gate verdicts, and layer reopens are non-delegable. D3 bytes remain
  unchanged. All other Layer 1 decisions remain locked; the
  revised exact candidate requires renewed independent review under the product-readiness gate.
- **Post-verdict record-keeping:** Recording the verdict in this gate record and refreshing the
  [design index](../README.md) gate table are gate record-keeping over the unchanged reviewed
  content; the reviewed baseline and hashes below identify the exact locked candidate. Individual
  Layer 1 pages keep their reviewed frontmatter; this record owns current gate state. Any material
  change to a locked page still requires an explicit Layer 1 reopen (I21).
- **Layer 2:** Authoring authorized by the explicit owner continuation instruction of 2026-07-15,
  recorded below, against the approved and locked Layer 1, with D1–D9 and I1–I21 as fixed inputs.
  Layer 2 completed its own gate and was approved — not locked — by the explicit owner decision of
  2026-07-16; see the [Layer 2 gate record](./layer2-gate-record.md).

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
| G-R10 — owner explicitly approves and durably records the lock; later change requires reopen | Arye's established decisions and the owner-approved delegation pre-record the exact effect: an independent reviewer's `PASS` on the exact re-presented candidate approves only faithful re-expression and activates the lock; later material change still requires reopen. | Satisfied — the 2026-07-15 fresh independent review returned `PASS` (see below).  |

## Fresh independent review of the re-presented candidate set (2026-07-15)

- **Reviewer:** Independent, read-only reviewer session (Claude Opus 4.8), distinct from the
  candidate's authors; bounded editorial/fidelity delegation only.
- **Verdict:** `PASS` on the exact re-presented candidate set — the complete connected 23-file
  document set under `docs/redesign/design/` at the baseline below, including approval metadata.
- **Effect:** Per G-R10, the recorded Layer 1 approval and lock are now effective. D1–D9 and
  I1–I21 are locked; later material change requires an explicit reopen, impact statement, renewed
  owner decision, and exact-candidate review.
- **Fidelity evidence:** All 21 invariants byte-identical to the previously accepted two-artifact
  candidate; all nine D-records compared against `raw/design/decisions.md` with selected
  direction, rationale, accepted negative consequence, and rejected alternatives preserved; the
  13 deferral categories and six accepted burdens verified against the raw record; every diagram
  (system summary, V1–V5 including V3a–V3c, and the brief's landscape) inspected against the
  guide's communication-contract and legend rules; no ID collisions; no premature approval claim;
  no Layer 2 content smuggled into Layer 1 pages; `OWNER_DECISION_REQUIRED` findings: none.
- **Non-blocking notes (no gate item failed):**
  1. The `C#`/`CON#` driver labels cited by the invariants table are positional against the
     brief's bare numbered capability and constraint lists; counts and mapping are exact. The
     convention is inherited unchanged from the accepted two-artifact candidate.
  2. The `F-` prefix names fault scopes in V2 and finalization/outcome nodes in V4; no identical
     ID string carries two meanings, and each view's legend defines its own prefix.
  3. The record cites the historical author working file `/tmp/jig-layer1-fidelity.md`, which is
     explicitly non-canonical and no longer on disk.

### Fresh review baseline

Repository `HEAD` `056a39266773cce27dd2859b3fc8d8579db3e787`; merge base with `main`
`521ae0846e788ef91979dd4c273687ab22e6137e`; working tree clean.

Commit identifiers may not survive a squash-based landing, so the per-file SHA-256 digests below —
not the commit hash — are the durable identification of the exact reviewed content. After the
verdict, every reviewed file remains byte-identical to its digest except this gate record and the
two navigation indexes (`design/README.md` and `decisions/README.md`), whose later changes are
exactly the declared post-verdict record-keeping and additive Layer 2 navigation; their reviewed
digests below identify the locked baseline content.

| Reviewed file                                                           | SHA-256                                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/redesign/design/README.md`                                        | `8208fdf5aea4636e6f218a45316f49aa24eb90a6f3dc2b2db3487650f8170003` |
| `docs/redesign/design/acceptance-and-evidence.md`                       | `3af03ccf3807031d838c2c40dc34943b0b8f28bb7d7e7c6bf3094904489c6c94` |
| `docs/redesign/design/brief.md`                                         | `a78fdacaabf248c4bef7dadea08824326137041c7d5e4e2b3f2c4369ee666ba4` |
| `docs/redesign/design/concurrency-and-finalization.md`                  | `d017dd8a8a1df7892fcd85ffbdf27f9d3e2026acf45b0c709b647f4c114a3382` |
| `docs/redesign/design/context.md`                                       | `5f202c5b90a32339fdcc836409b318a003b858e340687e0eb8b9503e1df9e3db` |
| `docs/redesign/design/decisions/D1-source-scope.md`                     | `092ab5cb8852f63966c469eae90f13530a72bb0dec6114c8a84d35ebc041f2a5` |
| `docs/redesign/design/decisions/D2-system-boundary.md`                  | `f73b05d02268a5447723a41a211315b39be9694df992f7ee9d79ad442dacddb3` |
| `docs/redesign/design/decisions/D3-responsibilities-trust-authority.md` | `62a3691818547d5c039a9f787b7bd0f202288d9565c208c83d7420b4f100b9ce` |
| `docs/redesign/design/decisions/D4-lifecycle-and-information-flow.md`   | `56562171c402a503b075f2b34a87ab71babf30f54f4747c451a5fc14e1dbb42d` |
| `docs/redesign/design/decisions/D5-state-authority-and-recovery.md`     | `a786ec61b0cefef3260e46017a531b046e5b9317653444636ecae5179b9b54a0` |
| `docs/redesign/design/decisions/D6-concurrency-and-finalization.md`     | `303f8b85349da72b500714eb6f67ffc198978c837c6c019d72c0dd6721647d0e` |
| `docs/redesign/design/decisions/D7-acceptance-and-evidence.md`          | `84ebdc29c78e9fbbd6d3d5b1cfe34797c2fd5265eab807d2c8209e705d456d85` |
| `docs/redesign/design/decisions/D8-failure-and-liveness.md`             | `c604f8e7298fdee4dfeb12c1b4d911c99fb1aa36d09096ee1cd69bcafc9c2013` |
| `docs/redesign/design/decisions/D9-invariants-and-artifact-shape.md`    | `ea00a76a6cf196eaafcc7bf30b18fe1389216466b1bcedea5e79daecca907f4d` |
| `docs/redesign/design/decisions/README.md`                              | `088d32297e1ffa0731e48170666b35180bafb4acc5e14f87f8b4aa56b2cda31d` |
| `docs/redesign/design/decisions/review-and-approval-record.md`          | `0812e7a7035be32cb280b139f6643c4e39733415bbe2d96bfc8d0ac53e98670d` |
| `docs/redesign/design/failure-and-liveness.md`                          | `e64cda69753b821898854f42fee714c8bf73fd7dc64c8466bb331784061459d7` |
| `docs/redesign/design/flows/run-and-story-lifecycle.md`                 | `7a89da27c4944d591b6997d5b1ab8a91f39a0a93c23036009e9c183acc7b40dc` |
| `docs/redesign/design/flows/story-delivery.md`                          | `b46cdbc3ac6f6be92e7a033769c8365c862c8e27a42a2eb71d97837bfe3a430d` |
| `docs/redesign/design/invariants.md`                                    | `2cdc6bf0cb6480fef38d8374f16686c9816b9a8437ad1f69b76d7d4b21e4e658` |
| `docs/redesign/design/model.md`                                         | `b89123560c26b4ca77c68f23992a30d83267dcd078f9bb25f0aa1c046e52542b` |
| `docs/redesign/design/perspectives/authority-and-trust.md`              | `3bd0f7de399dcaa8bda8ca0b72ec9156aa497053f72ae9803dd5fa0dfd731a85` |
| `docs/redesign/design/state-and-recovery.md`                            | `65b14b60cf9776ff2dd470c66ff4d1590265d4aca1599939d29c25ddabce2e2c` |

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
