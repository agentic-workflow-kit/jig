---
title: "Jig greenfield delivery — baseline and findings"
purpose: "Record the verified immutable design baseline, delivery-planning gaps, and explicit assumptions."
audience:
  - Jig owner
  - delivery planners
  - independent reviewers
status: verified planning baseline; not an implementation candidate
owner: Arye Kogan
last_verified: 2026-07-23
---

# Baseline and findings

## Verified baseline

| Fact                             | Verified value                                                     | Meaning                                                                     |
| -------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Passing readiness subject        | `1731251d866b15b63131a0c3c580e7b563226cf3`                         | exact commit reviewed twice independently                                   |
| Passing tree                     | `dcd0c1f8a5616283cafbcf54694fcd37dd4888c1`                         | exact tree bound to both `PASS` verdicts                                    |
| Normative corpus                 | 67 files: 5 product, 48 design, 14 guidelines                      | byte-identical in immutable planning/authority provenance                   |
| Aggregate SHA-256 manifest       | `fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c` | path-sorted, newline-separated per-file digest manifest                     |
| Post-archive planning provenance | `b860891d9102e0bdda1d23def81b1b974a4a26ac`                         | immutable source-empty planning/authority provenance; not an execution base |
| Planning provenance tree         | `763fa777c62999795fb679cc05a61be1190d93b6`                         | tree for that immutable planning provenance                                 |

The final readiness record confirms the 67 current normative files are byte-identical to the
passing subject and manifest. This delivery documentation is a new planning surface; it must not
claim that its authored candidate has an approved package `P` or `PASS` verdict. The
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
- The package includes the manifest's exact story set. Before implementation, each contract must
  still be revalidated against then-current merged dependency evidence, applicable `DR-*` gates,
  provider qualification, its approved delivery package `P`, and observed implementation-candidate
  base; completion of a planning contract is not start authorization by itself.

### Contradictions checked

- **Archive versus greenfield:** no contradiction. The archive is explicitly non-governing and was
  not used to select this track's architecture or sequence.
- **Readiness lock versus new docs:** no contradiction. The lock applies to the 67 normative files;
  this package describes a successor implementation process without changing those bytes.
- **Review and hosted CI:** no contradiction. D15 permits the recorded transition into `Reviewing`
  and its bounded `OPC-REV-*` draft/non-mergeable review publication before independent review or
  acceptance. Those actions are neither acceptance nor finalization, landing, or dependency
  release. Hosted CI may run before review; the selected final-verification posture binds the
  exact candidate. After `Accepted`, its intent is recorded on authorized entry into `Finalizing`;
  under `deterministic`, every policy-selected required check class must have a passing,
  subject-matching `EV-CHECK-OBSERVATION`, and the complete required set must be satisfied there
  before any target-changing Operation. `none` is an explicit no-op. Those post-`Accepted`
  observations are authorized continuation evidence, not a review-invalidating edit, while the
  reviewed candidate, posture, required class set, verification configuration/environment, and
  subject binding remain unchanged. Independent review and applicable checks/evidence bind that
  same candidate.

### Planning assumptions

- `b860891d9102e0bdda1d23def81b1b974a4a26ac` remains immutable planning/authority provenance;
  it is never presumed to be a future story's merge base. Each story resolves its current target
  base ref and records that ref's commit/tree outside this package. Every implementation tuple also
  records a current comparison of the 67 normative authority files against that provenance.
- Node/TypeScript/pnpm/Turbo, strict JSON initially, local Git host, local verifier, Codex, disjoint
  GitHub review-publication and final-delivery providers/credentials, terminal/file notices,
  private CLI, and private MCP are planning defaults only, not product promises or implementation
  authorization. They remain inactive and unconfigured until the
  applicable story has the exact external owner-ratification/activation record and current
  qualification. D11's single-host append-only
  file reference realization is instead owner-approved design authority; only its segment sizing,
  batching, and directory layout remain deferred.
- Unsupported provider modes and postures remain unconfigurable. A future provider expansion is a
  new qualified story, not a switch on an existing adapter.

## Candidate-freeze procedure

The protocol depends on the subject:

- **Delivery package:** before review, the coordinator records delivery-package candidate identity `Q`: the exact
  candidate commit/tree to be reviewed; exact package-only path set; each path's bytes/type/mode; and aggregate
  computed unpinned digest. The coordinator supplies `Q` and available checks/evidence separately,
  without a verdict. The independent reviewer writes external review record `R`: protocol; reviewer
  identity/independence; exact `Q`; checked scope; checks/evidence; findings; verdict; and a durable
  external record identifier. Only `R` with `PASS` creates approved package
  `P = Q + durable R identifier + PASS`. A later squash OID differs without fresh review only through an
  authoritative landing-equivalence record binding approved `P` (and therefore exact `Q`) to the
  target ref and landed commit/tree and proving full-tree equality or complete `Q` path-set
  byte/type/mode equality reproducing `Q`'s digest; it does not make the landed commit reviewed.
- **Implementation candidate:** before a story review, record the exact external
  owner-ratification/activation record: authenticated owner or explicitly named delegated
  principal with independently verifiable delegation and current validity; durable record ID/URL;
  approved package `P`; any required authoritative landing-equivalence record; immutable planning/authority
  provenance; activation target scope; selected realization tuple; and expiry/revocation. Also
  record story ID; observed target base ref;
  resolved base commit/tree; candidate commit/tree; proof that
  `merge-base(candidate, base) == base`; target-content proof that required predecessor landings
  are contained in the base; approved delivery package `P` and any required
  authoritative landing-equivalence record; a current 67-file normative-corpus comparison against
  immutable authority provenance; the story-owned source/config/test/evidence path set; applied
  `DR-*` choices; pre-review check/CI/evidence digests; and the selected final-verification
  posture, policy-selected required check-class set, verification configuration/environment, and
  subject binding, including every check deferred until `Accepted`. This tuple does not require
  fresh package digest computation or a full package corpus review.

Any candidate/source/configuration/pre-acceptance-evidence edit, target-ref movement, rebase, changed
posture, required check-class set, verification configuration/environment, subject binding, or
delivery-package identity creates a new tuple. Resolve the new base, re-prove merge-base equality
and containment, recompute the normative-corpus comparison, and rerun affected proof and CI. If
`Q` changes, obtain a fresh external `R` and approved `P`; never retrospectively attach a verdict to
a moving branch. A different squash OID is the narrow exception only when the required
authoritative landing-equivalence record proves approved `P`/`Q` unchanged; otherwise obtain a new
`R` and `P`. Recording after `Accepted` only the subject-matching final-verification observations
already authorized by the unchanged reviewed candidate, posture, required class set,
configuration/environment, and binding is continuation evidence and does not create another review
loop. Neither identity grants the external owner-ratification/activation record, approval, landing,
finalization, or dependency release.
