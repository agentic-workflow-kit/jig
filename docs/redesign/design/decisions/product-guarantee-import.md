---
title: "Imported promise — the five product guarantees"
purpose: Record the explicit owner import and 2026-07-16 re-import of the five product guarantees into the redesign under D1's import mechanism, with provenance, rationale, consequences, and affected decisions.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers reconciling the redesign with the product layer
scope: The import decision itself — what is imported, from where, why, at what cost, and which decisions it touches; the per-guarantee mapping and classifications live in the reconciliation matrix.
state: approved
status: owner-confirmed import and explicit product-correction re-import of 2026-07-16; exact-candidate review pending
owner: Arye Kogan
last_verified: 2026-07-16
sources_of_truth:
  - ./D1-source-scope.md
  - ./D14-agent-provider-permission-boundary.md
  - ../../../product/guarantees.md
  - Explicit owner reconciliation decision, 2026-07-16
related:
  - ./README.md
  - ../product-guarantee-reconciliation.md
  - ../invariants.md
---

# Imported promise — the five product guarantees

- **Status:** Owner-decided import and explicit re-import after product correction (2026-07-16);
  recorded here per the D1 import mechanism.
- **Owner:** Arye Kogan.
- **Related:** [D1 — source scope](./D1-source-scope.md),
  [reconciliation matrix](../product-guarantee-reconciliation.md).

## What is imported

The **five product guarantees** and every ID-bearing commitment they carry, exactly as stated in
[`docs/product/guarantees.md`](../../../product/guarantees.md) at the current provenance point
below:

| Guarantee                  | Imported ID families                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| 1. Control & trust         | `FENCE-1..3`, `EARN-1..2`, `GUARD-1..2`, `DOOR-1..3`, `MERGE-1..5`, `SEC-1..3` |
| 2. Configuration ownership | `CFG-1..10`                                                                    |
| 3. Resilience              | `RESUME-1..5`, `ISO-1..4`, `LIVE-1..2`                                         |
| 4. Stack portability       | `STACK-1..7`, `DRIVE-1..4`                                                     |
| 5. Full observability      | `SEE-1..6`                                                                     |

Fifty-six commitments in total. The exact statements are imported **by reference, not by copy**:
the product page owns the wording and the IDs, and duplicating fifty-six statements here would
create a second definition that drifts. The provenance digest below identifies the exact imported
byte content durably. The product's "Honest edge" paragraphs are imported together with their
families: they bound what each guarantee promises and are part of the imported statement, not
commentary around it.

## Current provenance — explicit product correction and re-import

On 2026-07-16 Arye Kogan explicitly replaced the earlier overreaching no-phone-home contract with
the provider-native permission boundary now stated by SEC-2. The same explicit correction also
revised FENCE-1/2, DOOR-1/2/3, CFG-10, DRIVE-3, and SEE-1 so the product consistently says:

- the owner selects an Agent provider's native execution and permission posture;
- the Agent provider, not Jig, performs built-in allow, auto-review, and rejection;
- only a request that needs a human crosses Jig's durable Doorbell, and the exact answer returns to
  the originating provider session;
- Jig does not independently reclassify the action or claim to prove the provider/host cannot
  communicate externally; and
- a future Jig-side middleman responder is deferred and carries no authority in this candidate.

That correction is a material product change, so it does not flow through the original import
silently. The owner explicitly re-imported all fifty-six commitments at the candidate provenance
below. The source-file digest is the durable content pin; the independent exact-candidate review
records the PR head commit to which the import and design mapping attach.

| Field     | Value                                                                |
| --------- | -------------------------------------------------------------------- |
| Source    | `docs/product/guarantees.md` in this repository                      |
| Candidate | PR #88 exact candidate; reviewed head recorded by the readiness gate |
| SHA-256   | `8900437a51d156c7e4f918336331e24c41c87715537eca4a0b27d4c1d91c9a8e`   |
| Re-import | Explicit owner decision, 2026-07-16                                  |

## Original import provenance — preserved history

| Field   | Value                                                              |
| ------- | ------------------------------------------------------------------ |
| Source  | `docs/product/guarantees.md` in this repository                    |
| Commit  | `e510ed773726b8e2cd683f89acef752acab33cf7` (2026-07-07, PR #82)    |
| SHA-256 | `8a6bd919e1f54dbb4863a7fa4cf64b12100879337c6920d9ed68ff192214f915` |

Per the product page's own ID contract, IDs are additive and never silently repurposed. The table
above records the initial import only; it is superseded for current governance by the explicit
product correction and re-import. Any later change to `guarantees.md` likewise does **not** flow
automatically: adopting revised statements requires another explicit owner import (D1, I1).

## Owner decision and rationale

On 2026-07-16 Arye Kogan explicitly decided that product reconciliation proceeds by **formally
importing the five guarantees** through D1's import mechanism and authoring a reconciliation
matrix from each guarantee ID to the redesign element that carries it, with genuine conflicts
surfaced as `OWNER_DECISION_REQUIRED` rather than resolved in place.

Rationale:

- The redesign was deliberately authored first-principles under D1, with no product material
  consulted or imported for the Layer 1 and Layer 2 candidates. That protected against anchoring;
  it also deferred the discovery of product/design divergence.
- The owner's selected implementation strategy is greenfield planning from the approved redesign,
  with current source retained only as archived reference. Starting from a design that silently
  diverges from the product promises would discover conflicts mid-delivery, at the highest cost.
- Importing now, at the closed Layer 2 gate, makes the guarantees a governing checklist against a
  stable design baseline: every commitment is either carried by a named element, named as a gap,
  located upstream of the system boundary, or escalated to the owner.

## Consequences

1. **The guarantees are now governing.** Under I1 and D1, each imported commitment is an
   Imported Promise: a later design change that cannot preserve it must surface
   `OWNER_DECISION_REQUIRED` — either the design changes or the owner explicitly revises the
   product statement. Silence is not reconciliation.
2. **The current matrix is the operative mapping.** The
   [reconciliation matrix](../product-guarantee-reconciliation.md) classifies all fifty-six
   re-imported commitments: 54 are `satisfied`, two carry explanatory `note`, and none remains a
   `gap`, `upstream`, or `conflict`.
3. **A maintenance obligation is accepted.** The matrix must be re-verified whenever either side
   changes materially: a product guarantee revision requires a fresh import decision, and a
   material Layer 2 change (which already requires renewed review under the
   [Layer 2 gate record](./layer2-gate-record.md)) must re-check the rows that cite the changed
   element.
4. **Point-in-time statements are superseded, not edited.** The locked Layer 1 pages record that
   no product material was imported "for this candidate" — for example the canonical model's
   Imported Promise row and D1's candidate note. Those statements remain true of the Layer 1
   candidate and stay byte-frozen; per the established record-keeping rule, the gate and decision
   records own current state, and as of 2026-07-16 this record is the current state: one import
   exists, defined here.

## Affected decisions

The fine-grained mapping is the matrix's job; at decision altitude the import touches:

| Decisions   | Touched by                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------- |
| D2, D3      | FENCE, DOOR, MERGE-2, SEC-3, and the CFG/STACK boundary questions (what lives outside `SYS-JIG`). |
| D4, D6      | ISO, MERGE-4 (Accepted versus Landed), finalization and dependency-release commitments.           |
| D5, D8, D11 | RESUME, LIVE, SEE-1 — durability, recovery, bounded liveness, and ledger authority.               |
| D7          | MERGE-1, MERGE-3, EARN — acceptance, evidence categories, and policy-selected verification.       |
| D9          | The invariant set the guarantees now cross-check; gap closure consumes its deferral categories.   |
| D10, D12    | STACK, DRIVE, FENCE-3 — ports, mechanism contracts, provider manifests, and conformance.          |
| D13         | CFG-2/3/5/6/8 and STACK-2 — Envelope Builder ownership and the Work Source boundary.              |
| D14         | FENCE-1/2, DOOR-1/2/3, SEC-2, CFG-10, DRIVE-3, and SEE-1 — provider permissions and the Doorbell. |

No imported commitment was found to contradict a locked decision or invariant; the matrix records
zero `conflict` rows. The readiness amendment adds D13 and D14 and elaborates Layer 2 without
changing D1–D12 or reopening the locked Layer 1 gate.

## Accepted negative consequence and trade-off

The import adds recurring reconciliation work (consequence 3) and constrains future design freedom:
elaborations that were previously judged only against the brief and the locked inputs must now also
preserve fifty-six product commitments or escalate. Arye accepted this in exchange for making
product/design divergence visible at a named seam instead of during implementation convergence.

## Alternatives not selected

- **Continued abstinence** (no import until after implementation convergence): rejected as
  maximizing late-discovery cost.
- **Import by copy** (restating all fifty-six statements in this record): rejected because it
  creates a drifting second definition; the digest-pinned reference identifies the exact imported
  content just as durably.
- **Informal comparison without import** (a Product Reference review only): rejected because under
  D1 an observation without import has no governing force, and the owner's intent is that the
  guarantees govern.
