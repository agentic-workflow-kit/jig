---
title: "Jig greenfield delivery — verification accumulation"
purpose: "State the exact evidence that accumulates to each phase gate and the final product gate."
audience: ["delivery implementers", "independent reviewers"]
status: "planning baseline; no implementation authorized"
owner: "Arye Kogan"
---

# Verification accumulation

Every result is exact-subject evidence: realization build, provider build where applicable,
suite/probe versions, manifest digest, and environment fingerprint. A passing baseline is not
evidence for a later candidate.

| Phase | Accumulated evidence                                                                                                                                                          | Exit condition                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 0     | Private graph/static boundary proof; canonical codec vectors; harness version and fault fixtures; kernel replay/illegal-edge corpus.                                          | Hermetic graph and first deterministic replay; no effect path.                             |
| 1     | Witnessed Run ledger and artifact readback, controller fencing/replay, registry race proof, mediated-operation crash/reconciliation corpus.                                   | Durable truth and uncertainty containment; no provider bypass.                             |
| 2     | Source/plan validation, policy/profile proof, exact two approvals, capability proofs, intake retry/crash/second-winner matrix.                                                | Witnessed accepted/rejected acknowledgement; rejected intake creates no Run.               |
| 3     | State/dependency tables, capacity/boundary/starvation probes, scripted workspace/session proof, candidate/rework/doorbell/obligation evidence, local-workspace provider gate. | Scripted intake-to-park path and qualified local workspace; no acceptance/landing claim.   |
| 4     | Independent verdict package, review-publication proof, scripted verification/finalization/delivery/block/retirement E2E and crash matrix, local-verifier provider gate.       | Landed/Blocked/Rejected/NotRun scripted E2E; cleanup cannot alter outcome.                 |
| 5     | Every-position Stopped Settlement, projection rebuild parity, notice dedup/redaction, export/disposal guard corpus, SDK/CLI/MCP parity.                                       | Stop/reconstruct/export/parity evidence.                                                   |
| 6     | Qualified Codex and GitHub real-provider evidence plus exact supported-profile manifest.                                                                                      | `CF-GATE-PRODUCT`: all 39 suites, 44 routes, 56 imports, and approved profile conjunction. |

## Fixed conformance accumulation

The 39 inputs to `CF-GATE-PRODUCT` are fixed; no provider waiver can remove one:

`CF-DETERMINISM`, `CF-ORDERING`, `CF-FENCE`, `CF-BINDING`, `CF-ACCEPTANCE`, `CF-POLICY`,
`CF-CAPACITY`, `CF-ORDER`, `CF-RELEASE`, `CF-BLOCKERS`, `CF-CONTAINMENT`, `CF-BOUNDS`,
`CF-DOUBLE-EFFECT`, `CF-SEPARATION`, `CF-PRESERVATION`, `CF-TRUST-STOP`,
`CF-RULE-SURFACE`, `CF-LIVENESS`, `CF-NOTICE-EXPORT`, `CF-OBSERVABILITY`,
`CF-RUN-CONTROL`, `CF-OPERATOR-ACTIONS`, `CF-EVIDENCE-LIFECYCLE`,
`CF-SECRET-ABSENCE`, `CF-DELEGATION`, `CF-CONSUMER`, `CF-ENVELOPE`,
`CF-PROVIDER-PERMISSION`, `CF-SETUP-FRESHNESS`, `CF-PROVIDER-AUTHORITY`,
`CF-BLOCK-SURFACING`, `CF-REVIEW-PUBLICATION`, `CF-MECH-LEDGER`,
`CF-MECH-ARTIFACT`, `CF-MECH-SESSION`, `CF-MECH-WORKSPACE`, `CF-MECH-SOURCE`,
`CF-MECH-VERIFY`, and `CF-MECH-DELIVERY`.

`CF-GATE-REALIZATION` is the exact realization-level conjunction. `CF-GATE-PROVIDER` makes an
individual provider configurable only after the matching exact `CF-MECH-*` pass. `CF-GATE-PRODUCT`
is the final 39-suite conjunction plus the fixed 44-route composition recorded in `track.json`.

## Mandatory verification rules

- Validate external input; unknown, stale, malformed, ambiguous, and unverifiable input fails
  closed.
- Record intent before an effect. Retry a same-effect identity only after confirmed absence and
  recorded reauthorization; otherwise reconcile or park.
- Provider evidence is not transferable across build, manifest, environment, posture, or suite
  version changes.
- Final evidence must include `pnpm check`, `git diff --check`, CI, and independent review of the
  exact candidate. These delivery documents do not claim that any implementation candidate passed.
