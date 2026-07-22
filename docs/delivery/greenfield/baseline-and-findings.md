---
title: "Jig greenfield delivery — baseline and findings"
purpose: "Record the verified immutable design baseline, delivery-planning gaps, and explicit assumptions."
audience:
  - Jig owner
  - delivery planners
  - independent reviewers
status: verified planning baseline; not an implementation candidate
owner: Arye Kogan
last_verified: 2026-07-22
---

# Baseline and findings

## Verified baseline

| Fact                          | Verified value                                                     | Meaning                                                 |
| ----------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Passing readiness subject     | `1731251d866b15b63131a0c3c580e7b563226cf3`                         | exact commit reviewed twice independently               |
| Passing tree                  | `dcd0c1f8a5616283cafbcf54694fcd37dd4888c1`                         | exact tree bound to both `PASS` verdicts                |
| Normative corpus              | 67 files: 5 product, 48 design, 14 guidelines                      | byte-identical in the current baseline                  |
| Aggregate SHA-256 manifest    | `fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c` | path-sorted, newline-separated per-file digest manifest |
| Current post-archive baseline | `b860891d9102e0bdda1d23def81b1b974a4a26ac`                         | selected source-empty planning baseline                 |
| Current post-archive tree     | `763fa777c62999795fb679cc05a61be1190d93b6`                         | tree for the selected planning baseline                 |

The final readiness record confirms the 67 current normative files are byte-identical to the
passing subject and manifest. This delivery documentation is a new planning surface; it must not
claim that its authored candidate has a final commit, tree, manifest, or `PASS` verdict. The
[reviewer packet](./reviewer/README.md) defines how those values are frozen later.

## Source ledger

| Class                     | Source                                                                                                     | Role                                                      | Allowed use                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| Governing product         | [`docs/product/`](../../product/)                                                                          | intent, guarantees, boundaries, workflows                 | define outcome/value and product acceptance         |
| Governing design          | [`docs/redesign/design/`](../../redesign/design/)                                                          | IDs, authority, runtime, lifecycle, failures, conformance | define implementation constraints and proof routes  |
| Governing baseline record | [final readiness gate](../../archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md) | exact reviewed design subject and closure result          | establish immutable input only                      |
| Provenance only           | [generation manifest](../../archive/generations/jig-v0-pre-greenfield-2026-07-18.md)                       | archive identity and recovery policy                      | bounded lookup after a story is already specified   |
| Non-governing research    | [research ledger](./research-ledger.md)                                                                    | comparative implementation lessons                        | adopt only when compatible with governing contracts |

## Findings, gaps, contradictions, and assumptions

### Findings

1. The source tree is intentionally empty. No active package layout, provider implementation, test
   harness, or delivery track can be treated as a pre-existing implementation commitment.
2. The governing design closes architecture readiness but deliberately delegates bounded realization
   choices through `DR-*`; each applicable story must record its selected choice and evidence.
3. Real providers are planned only after semantic contracts and qualification gates. This makes
   provider evidence a prerequisite to reachability, not a final polish task.

### Gaps requiring story-level closure

- Concrete representation, package decomposition, and wire encoding must remain within their
  governing `DR-*` constraints and get owner-recorded selections before their story starts.
- Every provider needs its exact manifest, supported posture, qualification probes, expiry, and
  fallback outcome. A generic “adapter works” assertion is insufficient.
- The package includes all 45 story contracts. Before implementation, each contract must still be
  revalidated against then-current merged dependency evidence, applicable `DR-*` gates, provider
  qualification, and the selected exact baseline; completion of a planning contract is not start
  authorization by itself.

### Contradictions checked

- **Archive versus greenfield:** no contradiction. The archive is explicitly non-governing and was
  not used to select this track's architecture or sequence.
- **Readiness lock versus new docs:** no contradiction. The lock applies to the 67 normative files;
  this package describes a successor implementation process without changing those bytes.
- **Review before publication:** no contradiction. D15 permits a bounded draft, non-mergeable
  review-publication capability before acceptance; it grants neither landing nor finalization power.

### Planning assumptions

- The selected baseline remains the merge base until the coordinator verifies a newer approved
  baseline; any move requires a fresh baseline comparison and reviewer notice.
- Node/TypeScript/pnpm/Turbo, strict JSON initially, file-backed witnessed stores, local Git host,
  local verifier, Codex, GitHub, terminal/file notices, private CLI, and private MCP are owner
  selections recorded for this track, not new product promises.
- Unsupported provider modes and postures remain unconfigurable. A future provider expansion is a
  new qualified story, not a switch on an existing adapter.

## Candidate-freeze procedure

Before an independent review, the coordinator records the candidate commit, tree, merge base,
path set, per-file/aggregate digests, applied `DR-*` decisions, exact evidence bundle, and checks.
That immutable tuple is the review subject. Any content or metadata edit creates a new tuple and
requires re-review; do not retrospectively attach a verdict to a moving branch.
