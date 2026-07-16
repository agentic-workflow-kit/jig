---
title: "Product readiness gate — remediation candidate"
purpose: Record the failed final-readiness review, the owner-approved remediation decisions, and the renewed exact-candidate review required after remediation merges.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers awaiting an implementation-ready corpus
scope: The product-readiness amendment through baseline d5c785ce582d010b84274041c7826f4fb7130472 and the 2026-07-17 documentation-only remediation; implementation, archive, greenfield planning, merge authorization, and the renewed review verdict are excluded.
state: current
status: final readiness review failed with 13 findings; owner-approved remediation candidate in progress; readiness lock inactive pending merge and renewed independent exact-candidate review
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ./product-guarantee-import.md
  - ../product-guarantee-reconciliation.md
  - ./D13-envelope-production-boundary.md
  - ./D14-agent-provider-permission-boundary.md
  - ./D15-pre-acceptance-review-publication.md
  - ../../../product/guarantees.md
related:
  - ./layer2-gate-record.md
  - ../README.md
  - ../architecture-conformance.md
---

# Product readiness gate — remediation candidate

## Current gate state

The complete readiness amendment merged as baseline
`d5c785ce582d010b84274041c7826f4fb7130472`. A final independent empty-repository readiness review
on 2026-07-17 returned **FAIL**: seven blockers, three delegation gaps, and three traceability gaps.
That verdict means the product-readiness lock is **inactive**. It supersedes the earlier statement
that an exact-candidate review was merely pending on PR #88; PR #88 is the merged baseline, not the
current remediation request.

Arye Kogan approved the exact resolutions below. Those approvals authorize correction of the
named product and design contracts, including explicit reopen of affected previously locked Layer
1 text. They do not authorize unrelated Layer 1 changes, implementation, archive, greenfield
planning, merge, or self-certification of readiness.

| Finding | Owner-approved resolution carried by this candidate                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1      | Add durable resumable `Suspended`; keep `Stopped` terminal.                                                                                                                |
| F2      | Add terminal Story `Rejected`, tighten product `done`, and publish one canonical projection.                                                                               |
| F3      | Preserve D7 reviewer-principal acceptance; treat deterministic verification as additional, not an acceptance lane.                                                         |
| F4      | Add D15 and review-scoped, non-landing publication Operations.                                                                                                             |
| F5      | Key intake by envelope digest and give Work Source explicit request/result identity and bounded failure.                                                                   |
| F6      | Redispatch with the same Operation identity and basis under a freshly recorded current fence.                                                                              |
| F7      | Bind Doorbell answers to durable `ID-PARK` and principal, including replacement or cancel-and-reissue lineage.                                                             |
| F8      | Represent recorded per-Run delegation with `ID-GRANT` and `SCH-DELEGATION-GRANT` without changing D3's scope; keep the pre-existing D3/brief scope conflict owner-visible. |
| F9      | Prohibit side-effectful `PORT-VERIFY` checks in this generation.                                                                                                           |
| F10     | Give all eleven `BND-*` classes numeric or duration defaults and allowed ranges.                                                                                           |
| F11     | Extend reconciliation from the 56 imported guarantee IDs to every normative commitment in the four product documents.                                                      |
| F12     | Add private first-party `PORT-CONSUMER` with no controller, store, or mechanism bypass.                                                                                    |
| F13     | Add grant-aware Run-control and notice-action events through `PORT-DECIDE` and trace every remaining operator action.                                                      |

## Exact remediation candidate

The exact candidate is the commit reviewed after this remediation pull request merges, comprising
only changed files under `docs/product/` and `docs/redesign/`. A verdict attaches to the complete
file digests at that commit, not to this list or to a branch name. Any byte change after review
invalidates the verdict.

The candidate intentionally includes D4, D6, D8, I14, their dependent Layer 1 views, and the Layer
1 review record only where the approved F1, F2, F4, F6, and F13 resolutions require propagation.
D3's existing scope is unchanged while F8 makes grants representable. This is the explicit
owner-authorized reopen trail; the prior `PR-R5` requirement that
all D1–D9 bytes remain unchanged is therefore superseded for this remediation only.

## Renewed gate requirements

| ID      | Requirement                                                                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PR-R1` | All 56 imported guarantee IDs retain one honest `satisfied` or explanatory `note` mapping, with no `gap`, `upstream`, or `conflict`.                                                    |
| `PR-R2` | The product-commitment coverage inventory maps every normative commitment in `README.md`, `jig.md`, `concepts.md`, and `use-cases.md` to a named carrier or explicit owner-visible gap. |
| `PR-R3` | F1–F13 each meet their approved closed-when condition across states, events, Operations, schemas, ports, capabilities, conformance, decisions, perspectives, and reconciliation.        |
| `PR-R4` | Existing stable IDs and imported guarantee statements remain unchanged unless an approved finding explicitly adds a new ID or narrows product wording.                                  |
| `PR-R5` | The diff is documentation-only and confined to `docs/product/` and `docs/redesign/`; no implementation, archive, delivery, configuration, or greenfield artifact is included.           |
| `PR-R6` | Formatting, links, repository checks, scoped greps, and a finding-by-finding author acceptance pass succeed.                                                                            |
| `PR-R7` | After merge, a fresh independent reviewer examines the exact merged candidate from an empty-repository implementation-readiness posture and returns `PASS`.                             |

## Lock and review semantics

Author checks and the F1–F13 acceptance pass establish only that the remediation is ready for
review. They are not the readiness gate and cannot activate the lock. The remediation pull request
must remain unmerged until separately authorized. After it merges, the independent readiness gate
must be rerun on the exact merged commit; only its recorded `PASS` activates the product-readiness
lock. Any blocking finding keeps the lock inactive, and any correction creates a new exact
candidate.

### Owner-visible F8 authority-scope contradiction

F8's grant identity, schema, validation, event, and conformance cases are implemented without
selecting a new authority scope. Locked D3 permits Arye or a recorded delegate to decide imports,
approvals, stops, and reopens within recorded scope, while the locked brief and historical review
record reserve product/architecture decisions to Arye and describe delegation as bounded
operational authority. The remediation prompt did not select which locked statement controls.
Per its escalation rule, this candidate does not silently narrow or widen that authority; a renewed
review must return `OWNER_DECISION_REQUIRED` on F8 until Arye resolves the contradiction.

## Verification record

The previous 2026-07-16 verification remains historical evidence for the merged baseline. It does
not cover this remediation. The remediation pull request records its own deterministic author
checks and 13-finding acceptance evidence; the independent post-merge verdict remains deliberately
absent from this record.
