---
title: "Product readiness gate — complete lock candidate"
purpose: Identify the exact product and design amendment that closes every imported product-guarantee gap and upstream ownership question, record the owner selections, and define when its lock becomes effective.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers beginning greenfield implementation planning
scope: The complete 2026-07-16 product-readiness amendment, its exact candidate, gate requirements, verification state, and lock semantics; it does not merge the pull request or activate the lock without independent review.
state: current
status: owner-approved complete lock candidate; author checks pass; independent exact-candidate review pending
owner: Arye Kogan
last_verified: 2026-07-16
sources_of_truth:
  - ./product-guarantee-import.md
  - ../product-guarantee-reconciliation.md
  - ./D13-envelope-production-boundary.md
  - ./D14-agent-provider-permission-boundary.md
  - ../../../product/guarantees.md
related:
  - ./layer2-gate-record.md
  - ../README.md
  - ../envelope-production.md
---

# Product readiness gate — complete lock candidate

## Owner selections in this amendment

On 2026-07-16 Arye Kogan approved the following directions for the complete readiness candidate:

1. all eleven in-boundary gaps recorded by the initial reconciliation are closed by named schemas,
   events, Operations, bounds, projections, and conformance rules;
2. Envelope Builder is a Jig product subsystem outside `SYS-JIG` active-Run control authority and
   owns tracks, floor composition, work-profile authoring, guided setup, presets, prompt strategy,
   provider selection, and the `PORT-SOURCE` Work Source seam;
3. replanning creates a successor envelope and successor Run, never an in-place mutation;
4. reusable provider proof is exact to build, suite/probe versions, authority manifest, and
   environment, every Run has fresh compose-time proof, and policy may impose maximum proof age;
5. the former no-phone-home/proven-confinement wording was product overreach and SEC-2 plus its
   related permission, Doorbell, driver, and visibility commitments are explicitly corrected and
   re-imported around the provider-native execution-posture contract;
6. the owner selects an Agent provider's native manual/assisted/full-access posture; built-in
   allow, auto-review, and rejection stay inside the provider session, while a request that needs a
   human crosses Jig's durable Doorbell and the bound answer returns to that session;
7. Jig does not duplicate the provider's permission engine or independently prove the trusted
   provider or host cannot communicate externally; unsupported selected postures fail preflight
   and full access is never presented as confinement;
8. a future Jig-side middleman agent that could answer or approve provider requests is deferred and
   has no authority in this candidate; and
9. PR #88 may be marked ready for independent review but remains unmerged until the owner separately
   authorizes merge.

## Exact amendment candidate

The lock candidate is the exact content of these files at the reviewed PR head:

- `docs/product/concepts.md`;
- `docs/product/guarantees.md`;
- `docs/product/jig.md`;
- `docs/product/use-cases.md`;
- `docs/redesign/design/README.md`;
- `docs/redesign/design/architecture-conformance.md`;
- `docs/redesign/design/components/control-plane.md`;
- `docs/redesign/design/data-and-identity.md`;
- `docs/redesign/design/decisions/README.md`;
- `docs/redesign/design/decisions/D13-envelope-production-boundary.md`;
- `docs/redesign/design/decisions/D14-agent-provider-permission-boundary.md`;
- `docs/redesign/design/decisions/layer2-gate-record.md`;
- `docs/redesign/design/decisions/product-guarantee-import.md`;
- `docs/redesign/design/decisions/product-readiness-gate-record.md`;
- `docs/redesign/design/envelope-production.md`;
- `docs/redesign/design/evidence-handling.md`;
- `docs/redesign/design/forge-and-landing.md`;
- `docs/redesign/design/lifecycle-catalogs.md`;
- `docs/redesign/design/mechanism-and-provider-contracts.md`;
- `docs/redesign/design/operations-and-observability.md`;
- `docs/redesign/design/product-guarantee-reconciliation.md`;
- `docs/redesign/design/review-and-verification-execution.md`;
- `docs/redesign/design/runtime.md`; and
- `docs/redesign/design/scheduling-and-bounds.md`.

A review verdict attaches to file digests at one commit, not merely to these names. Any byte change
after review invalidates that verdict and requires a fresh exact-candidate review.

## Gate requirements

| ID      | Requirement                                                                                                                                                          | Candidate evidence                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `PR-R1` | All 56 explicitly re-imported commitments map to `satisfied` or an explanatory `note`; no `gap`, `upstream`, or `conflict` row remains.                              | Product guarantee reconciliation matrix and automated ID/classification audit.                                   |
| `PR-R2` | Every former upstream product promise has a named Jig subsystem owner and authority boundary.                                                                        | D13, Envelope Builder responsibilities, `PORT-SOURCE`, and V18.                                                  |
| `PR-R3` | Former semantic residuals are selected explicitly.                                                                                                                   | ISO-2 successor-Run semantics and EARN-1 two-layer proof freshness.                                              |
| `PR-R4` | The corrected Agent permission boundary states its trust root, human interaction path, visibility limit, and failure semantics without retaining the retired claim.  | Revised product guarantees, D14, `MC-PERMISSION`, `PORT-SESSION`, `CP-ESCALATION`, and `CF-PROVIDER-PERMISSION`. |
| `PR-R5` | Locked Layer 1 bytes and decisions D1–D9 remain unchanged.                                                                                                           | Candidate diff and scope audit.                                                                                  |
| `PR-R6` | The amendment is one coherent model with resolving IDs, links, schemas, events, Operations, bounds, and conformance paths.                                           | Cross-reference audit, formatting, link checks, and repository check.                                            |
| `PR-R7` | After an independent `PASS` activates the lock, implementation can be planned greenfield from the design; only explicitly deferred or implementation choices remain. | Reconciliation findings and the exact-candidate review requirement.                                              |

## Gate state and lock semantics

The owner selections above are approved. The amendment is a **complete lock candidate**, not yet an
active architecture lock: the author may run deterministic completeness and repository checks but
cannot serve as the independent architecture reviewer of the same content. Lock activates only
when an independent reviewer returns `PASS` on the exact candidate and the reviewed PR head is
recorded here or in the pull-request review record. A blocking finding keeps the amendment
unlocked; a content correction creates a new exact candidate.

When that `PASS` is recorded, the complete product-readiness amendment is locked. Marking PR #88
ready requests that review; it is not a `PASS`, a lock activation, or merge authorization. The pull
request remains unmerged until the owner separately authorizes merge.

## Verification record

### Author-side deterministic verification (2026-07-16)

The complete 24-file candidate passed the author checks permitted by the gate:

- `git diff --check` — pass;
- `corepack pnpm check` with the repository-required pnpm 11.9 shim — pass: lint, formatting,
  typecheck, package boundaries, documentation links, delivery foundation, and tests all passed;
- Markdown links — pass, 290 files scanned;
- tests — 55 files passed and five skipped; 673 tests passed and seven skipped;
- imported-commitment audit — exactly 56 product IDs and 56 unique matrix rows: 54
  `satisfied`, two explanatory `note`, zero `gap`, zero `upstream`, and zero `conflict`, with no
  missing, extra, or duplicate ID;
- current import provenance — the recorded SHA-256
  `8900437a51d156c7e4f918336331e24c41c87715537eca4a0b27d4c1d91c9a8e` matches the exact
  `docs/product/guarantees.md` bytes;
- exact-candidate scope audit — all 24 changed files are listed above; no raw-history page, locked
  Layer 1 page, or D1–D9 decision record changed; and
- stale-contract audit — no active product or candidate contract retains the retired universal
  no-phone-home claim, `CF-ASSISTED-AUTHORITY`, `EV-AUTHORITY-CLASSIFIED`, or the Jig-side
  manual/assisted action classifier. Historical notes and the struck-through compatibility anchor
  identify the retired wording explicitly rather than carrying it forward.

The local host reported Node 24 while the repository declares Node 26; all checks nevertheless
completed successfully, and the pull request's independent CI remains a separate environment.
These author checks do not constitute architecture approval. The independent exact-candidate
verdict remains pending, and the pull request must remain unmerged.
