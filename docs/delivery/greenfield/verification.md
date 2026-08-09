---
title: "Jig greenfield delivery — verification accumulation"
purpose: "State the exact evidence that accumulates to each phase gate and the final product gate."
audience: ["delivery implementers", "independent reviewers"]
status: "planning baseline; no implementation authorized"
owner: "Arye Kogan"
---

# Verification accumulation

Every result is exact-subject evidence: realization build, provider build where applicable,
suite/probe versions, manifest digest, and environment fingerprint. Each phase's accumulated
evidence is a retained CI artifact bound to the exact candidate, not a permanent repo-resident
check. A passing baseline is not evidence for a later candidate.

| Phase | Accumulated evidence                                                                                                                                                                                                                                         | Exit condition                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Private graph/static boundary proof; canonical codec vectors; harness version and fault fixtures; kernel replay/illegal-edge corpus.                                                                                                                         | Hermetic graph and first deterministic replay; no effect path.                                                                                        |
| 1     | Scripted semantic-contract ledger/witness and artifact readback evidence, controller fencing/replay, registry race proof, mediated-operation crash/reconciliation corpus.                                                                                    | Durable truth and uncertainty containment; selected file providers remain unreachable.                                                                |
| 2     | Source/plan validation, policy/profile proof, exact two approvals, capability proofs, qualified local file ledger/registry/witness and artifact providers, intake retry/crash/second-winner matrix.                                                          | Witnessed accepted/rejected acknowledgement; rejected intake creates no Run.                                                                          |
| 3     | State/dependency tables, capacity/boundary/starvation probes, scripted workspace/session proof, candidate/rework/doorbell/obligation evidence, and the deferred local-workspace provider probe with restart-time fail-closed evidence.                       | Scripted intake-to-park path; GF-039 remains unconfigurable pending owner-authorized independent qualification evidence; no acceptance/landing claim. |
| 4     | Independent verdict package, review-publication proof, scripted verification/finalization/delivery/block/retirement E2E and crash matrix, local-verifier provider gate.                                                                                      | Landed/Blocked/Rejected/NotRun scripted E2E; cleanup cannot alter outcome.                                                                            |
| 5     | Every-position Stopped Settlement, projection rebuild parity, notice dedup/redaction, export/disposal guard corpus, SDK/CLI/MCP parity.                                                                                                                      | Stop/reconstruct/export/parity evidence.                                                                                                              |
| 6     | Qualified local file ledger/registry/witness, local file artifact, GF-057 GitHub review-publication, GF-060 Codex, and GF-061 GitHub final-delivery evidence; exact supported-profile manifest; and GF-062's retained audit of all 56 imported dispositions. | `CF-GATE-PRODUCT`: the 39 recorded suite results plus every named element of all 44 settled product proof routes.                                     |

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
individual provider configurable only after its matching exact mechanism-conformance pass.
`CF-GATE-PRODUCT` is the final pure conjunction of the 39 recorded suite results and every named
element of all 44 settled product proof routes, as defined by
[`architecture-conformance.md`](../../redesign/design/architecture-conformance.md) and the
[Round-6 route inventory](../../redesign/design/product-guarantee-reconciliation.md#round-6-minimal-route-audit).
GF-062 separately joins GF-057 review-publication and GF-061 final-delivery qualification, retains
and audits all 56 imported commitment dispositions, and records the supported-provider
gates/profile evidence for the broader supported-profile claim; none is an extra
`CF-GATE-PRODUCT` input.

## Mandatory verification rules

- Validate external input; unknown, stale, malformed, ambiguous, and unverifiable input fails
  closed.
- Record intent before an effect. Retry a same-effect identity only after confirmed absence and
  recorded reauthorization; otherwise reconcile or park.
- Provider evidence is not transferable across build, manifest, environment, posture, or suite
  version changes.
- Retain per-phase accumulated evidence as CI artifacts bound to the exact candidate. Do not turn
  delivery-process provenance into pinned repository checks; review it when the claim is made.
- The implementation owner commits before verification and works only in the registered story
  worktree. The external ledger records its candidate/base identity, declared-predecessor
  containment, exact required command/set, result, timestamp, durable log/reference, and clean
  status before/after review. It also records the minimal non-secret environment-name allowlist and
  exact `git ls-files --others --ignored --exclude-standard` inventory/allowlist decision before
  checks and after review. `.env`/credential files, external workspace links, unexplained generated
  output, or unlisted residue fail closed; dependencies require frozen-lockfile/link-containment
  proof and generated/cache output must be regenerated or exact-candidate-keyed.
  `git diff --check <base>...<candidate>` is required when applicable. Hosted CI independently
  executes required checks; the coordinator inspects bindings and the semantic reviewer reads
  evidence rather than rerunning it.
- A changed candidate or target needs evidence for every applicable required check and incremental
  read-only review by the same reviewer. Final evidence includes the required local checks, full
  `pnpm check` candidate and integration-gate results,
  CI, and independent review of the exact candidate. No custom seal, envelope, detached clone, or
  fresh-clone workspace is a gate. These documents do not claim any candidate passed.
