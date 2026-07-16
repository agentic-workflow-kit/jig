---
title: "Product readiness gate — closures except SEC-2"
purpose: Identify the exact design amendment that closes every imported product-guarantee gap and upstream ownership question except SEC-2, record the owner selections, and define when its lock becomes effective.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers beginning greenfield implementation planning
scope: The 2026-07-16 product-readiness amendment, its exact candidate, gate requirements, verification state, and deliberate SEC-2 exclusion; it does not decide SEC-2 or merge the pull request.
state: current
status: owner-approved directions recorded; exact-candidate review and lock activation pending; SEC-2 deliberately open
owner: Arye Kogan
last_verified: 2026-07-16
sources_of_truth:
  - ./product-guarantee-import.md
  - ../product-guarantee-reconciliation.md
  - ./D13-envelope-production-boundary.md
  - ../../../product/guarantees.md
related:
  - ./layer2-gate-record.md
  - ../README.md
  - ../envelope-production.md
---

# Product readiness gate — closures except SEC-2

## Owner selections in this amendment

On 2026-07-16 Arye Kogan approved the following design directions for the readiness candidate:

1. all eleven in-boundary gaps recorded by the initial reconciliation are closed by the named
   schemas, events, Operations, bounds, projections, and conformance rules in this candidate;
2. Envelope Builder is a Jig product subsystem outside `SYS-JIG` active-Run control authority and
   owns tracks, floor composition, work-profile authoring, guided setup, presets, prompt strategy,
   provider selection, and the `PORT-SOURCE` Work Source seam;
3. replanning creates a successor envelope and successor Run, never an in-place mutation;
4. reusable provider proof is exact to build, suite/probe versions, authority manifest, and
   environment, every Run has fresh compose-time proof, and policy may impose maximum proof age;
5. SEC-2 is excluded from this closure and remains an explicit `gap` for owner discussion; and
6. the pull request carrying this candidate stays unmerged until the remaining discussion and
   normal review are complete.

## Exact amendment candidate

The lock candidate is the exact content of these files at the reviewed commit:

- `docs/redesign/design/envelope-production.md`;
- `docs/redesign/design/runtime.md`;
- `docs/redesign/design/components/control-plane.md`;
- `docs/redesign/design/data-and-identity.md`;
- `docs/redesign/design/lifecycle-catalogs.md`;
- `docs/redesign/design/scheduling-and-bounds.md`;
- `docs/redesign/design/mechanism-and-provider-contracts.md`;
- `docs/redesign/design/evidence-handling.md`;
- `docs/redesign/design/review-and-verification-execution.md`;
- `docs/redesign/design/forge-and-landing.md`;
- `docs/redesign/design/operations-and-observability.md`;
- `docs/redesign/design/architecture-conformance.md`;
- `docs/redesign/design/product-guarantee-reconciliation.md`;
- `docs/redesign/design/decisions/D13-envelope-production-boundary.md`;
- `docs/redesign/design/decisions/product-guarantee-import.md`;
- `docs/redesign/design/decisions/layer2-gate-record.md`; and
- `docs/redesign/design/decisions/product-readiness-gate-record.md`;
- `docs/redesign/design/README.md`; and
- `docs/redesign/design/decisions/README.md`.

A review verdict attaches to file digests at one commit, not merely to these names. Any byte change
after review invalidates that verdict and requires a fresh exact-candidate review.

## Gate requirements

| ID      | Requirement                                                                                                                                                    | Candidate evidence                                                                   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `PR-R1` | Every imported commitment except SEC-2 maps to `satisfied` or an explanatory `note`; no other `gap`, `upstream`, or `conflict` row remains.                    | Product guarantee reconciliation matrix and automated classification count.          |
| `PR-R2` | Every former upstream product promise has a named Jig subsystem owner and authority boundary.                                                                  | D13, Envelope Builder responsibilities, `PORT-SOURCE`, and V18.                      |
| `PR-R3` | Former semantic residuals are selected explicitly.                                                                                                             | ISO-2 successor-Run semantics and EARN-1 two-layer proof freshness.                  |
| `PR-R4` | SEC-2 remains visibly unresolved and no sandbox, attestation, or conformance wording overclaims closure.                                                       | SEC-2 matrix row, mechanism-contract limit, conformance warning, and this exclusion. |
| `PR-R5` | Locked Layer 1 bytes and decisions D1–D9 remain unchanged.                                                                                                     | Candidate diff and repository checks.                                                |
| `PR-R6` | The amendment is one coherent model with resolving IDs, links, schemas, events, Operations, bounds, and conformance paths.                                     | Cross-reference audit, formatting, and link checks.                                  |
| `PR-R7` | After this amendment, implementation can be planned greenfield from the design; remaining choices are implementation planning choices unless marked otherwise. | Reconciliation findings: SEC-2 only design gap.                                      |

## Gate state and lock semantics

The owner selections above are approved. The amendment is a **lock candidate**, not yet an active
architecture lock: the author may run deterministic completeness and repository checks but cannot
serve as the independent architecture reviewer of the same content. Lock activates only when an
independent reviewer returns `PASS` on the exact candidate and the reviewed file digests are
recorded here or in the pull-request review record. A blocking finding keeps the amendment
unlocked; a content correction creates a new exact candidate.

When that `PASS` is recorded, every approved direction in this candidate is locked except SEC-2.
SEC-2 cannot become locked by implication, and resolving it requires a separate explicit owner
decision and exact-candidate review. The pull request remains unmerged until the owner separately
authorizes merge.

## Verification record

### Author-side deterministic verification (2026-07-16)

The completed 19-file candidate passed the checks the author is authorized to perform:

- `git diff --check` — pass;
- `corepack pnpm format:check` — pass;
- `corepack pnpm links:check` — pass, 289 Markdown files scanned;
- imported-commitment audit — exactly 56 product IDs and 56 unique matrix rows: 53 `satisfied`,
  two explanatory `note`, one `gap` (`SEC-2`), zero `upstream`, zero `conflict`, with no missing,
  extra, or duplicate ID;
- exact-candidate scope audit — all 19 changed files are listed above, all are under
  `docs/redesign/design/`, none is under `raw/`, and no locked Layer 1 content or D1–D9 record
  changed; and
- SEC-2 non-overclaim audit — the matrix, mechanism contract, conformance contract, and gate all
  state that attestation and tested allowlists do not prove no-phone-home behavior.

These results satisfy the deterministic evidence side of PR-R1–PR-R6 and support PR-R7's planning
readiness claim except for the deliberately excluded SEC-2 decision. They do not constitute
architecture approval. The independent exact-candidate verdict remains pending and the pull
request must remain unmerged.
