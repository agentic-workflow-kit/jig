---
title: "Jig greenfield delivery — independent review checklist"
purpose: "Make PASS and finding criteria repeatable for a frozen delivery-package or implementation-candidate subject."
audience:
  - independent reviewers
status: mandatory review checklist
owner: Arye Kogan
last_verified: 2026-07-23
---

# Independent review checklist

Select either the delivery-package or implementation-candidate protocol in the
[reviewer packet](./README.md). Mark each applicable item `PASS`, `FINDING`, or `N/A with
evidence`; `N/A` never means “not yet considered.” Do not impose package-corpus checks on a
story implementation candidate.

## A. Delivery-package review

Use this section only when reviewing the delivery package itself.

### Subject and authority

- [ ] Immutable package tuple `P` is recorded: reviewed commit/tree, exact package-only path set,
      each path's bytes/type/mode, aggregate digest, `PASS`, content/evidence digests, and
      environment; all resolve exactly.
- [ ] The independent reviewer computes and records the unpinned digest of the exact package path
      set outside the candidate; no expected package digest is copied into `track.json`, validator
      constants, fixtures, or candidate-authored review prose. A different squash OID requires an
      external authoritative landing-equivalence record binding `P` to target ref and landed
      commit/tree and proving full-tree equality or complete package-path byte/type/mode equality
      reproducing `P`'s digest; it does not make that landed commit reviewed.
- [ ] The checkout and review scope are clean; no unrecorded path, generated residue, or moving
      branch changes the frozen subject.
- [ ] The live 67-file normative path set and aggregate SHA-256 manifest match the passed subject
      and current byte-identical corpus, rather than a copied baseline assertion. This is
      corpus-drift evidence only, not a candidate approval digest.
- [ ] Every brief front matter exactly matches its manifest fields; all stable IDs, `PC-*` routes,
      and imported commitments are literal, locally explained, and neither wildcard nor invented.
- [ ] Product outcome/why and every governing design path/stable ID are traceable; no archive or
      non-governing research selected behavior.
- [ ] Every `DR-*` selection has owner, constraints, evidence, fallback, and no material invention.

### Exact planning closure

- [ ] The manifest's exact story set, phases, dependencies, and declared critical path match the
      live DAG; all edges are topological and the critical path is the actual longest path.
- [ ] Every proof-route, import, and fixed inventory has the required forward and reverse occurrence;
      exact failure-class and identity catalogs use their literal defined values only.
- [ ] I13/I14 preserve only `Landed` dependency release and separate business outcome from
      retirement; pre-Run rejected acknowledgement remains separate from Story terminal selectors.
- [ ] Refresh retains authority only under its valid fence, mints a new `ID-CAND`, returns the
      changed candidate to full review, and atomically rebinds the target basis.
- [ ] Remote `PORT-DELIVERY` and local `PORT-VERIFY` remain separate authority/mechanism seams.

### Authority, evidence, and containment

- [ ] Runtime units, ports, inputs, outputs, identities, durable facts, trust roots, and writer
      authority are explicit and conform to design; evidence never confers authority.
- [ ] Every mandatory semantic-to-provider split is closed; a real provider remains unreachable and
      unconfigurable until its exact current qualification evidence admits its manifest.
- [ ] Required `CF-*` gates, product proof routes, imported-commitment disposition, reviewer
      identity/independence, and acceptance metadata are complete and exact-subject-bound.
- [ ] Changed paths match the package allowlist; no product source, product package scaffolding, or
      unrelated configuration is included.
- [ ] Adversarial validator tests cover malformed manifest/front matter, IDs, dependencies/cycles,
      stale mappings, split closure, and changed delegated-choice constraints. A stale result is
      reported, not weakened.

### Delivery-package verdict record

Record: protocol; original `P` (reviewed package commit/tree, package path set with per-path
bytes/type/mode, aggregate digest, and `PASS`); any required authoritative landing-equivalence
record; reviewer identity/independence; paths and IDs reviewed; checks/evidence; verdict; and
findings. Each finding
states `F-NNN`, severity, governing path/ID, exact evidence, affected observable behavior, required
correction/result, and re-review scope.

## B. Implementation-candidate review

Use this section only for one implementation attempt of one `GF-*` story whose exact external
owner-ratification/activation record is verified.
It permits the bounded story-owned source, configuration, test, and evidence paths. It does not
require a fresh package-digest computation, full delivery-corpus review, delivery-package path
allowlist, or a full package closure review.

### Subject, base, and authorization

- [ ] The exact external owner-ratification/activation record is recorded and independently
      verified: authenticated owner or explicitly named delegated principal, independently
      verifiable delegation/current validity, durable record ID/URL, original package tuple `P`,
      any required authoritative landing-equivalence record, immutable planning/authority provenance, activation
      target scope, realization tuple, and
      expiry/revocation. Generic authorization cannot pass. The observed target base ref, resolved
      base commit/tree, candidate commit/tree, clean scope, and owned path set also resolve exactly;
      planning provenance is not the presumed execution base.
- [ ] Original package tuple `P` is recorded and resolves exactly. Where a squash-produced landed
      OID differs, the authoritative landing-equivalence record binds `P` to target ref and landed
      commit/tree and proves full-tree equality or complete package-path byte/type/mode equality
      reproducing `P`'s digest. Add/remove/rename/mode/byte drift, or missing/ambiguous evidence,
      requires a new tuple and `PASS`; the landed commit is not itself treated as reviewed.
- [ ] `merge-base(candidate, base) == base` is recorded and holds. Target-content evidence proves
      every required predecessor landing is contained in that base; an unreviewed branch does not
      satisfy a dependency.
- [ ] A current path-by-path comparison shows the candidate's 67 normative authority files match
      immutable authority provenance; its recorded result binds to this candidate tuple.
- [ ] The changed paths are limited to the contract's bounded story ownership and may include
      product source/configuration. No unrelated authority, behavior, or configuration is smuggled
      into the candidate.
- [ ] A target-ref move, refresh, rebase, source/configuration/evidence change, or candidate change
      has produced a new tuple with refreshed merge-base/containment proof, normative-corpus
      comparison, affected evidence, CI, and review. A changed package tuple `P`, or missing,
      ambiguous, or drifting authoritative landing-equivalence evidence, has its own new independent package
      `PASS` before implementation review.

### Governing behavior and evidence

- [ ] The story contract is complete and traces the implemented outcome, authority, IDs, inputs,
      durable facts, failure/recovery behavior, provider reachability, and applicable `DR-*` bounds
      to active product/design authority.
- [ ] Required unit/schema, contract, negative-authority, adversarial, replay, crash/fault,
      timeout/reconciliation, provider, and E2E evidence is present or validly inapplicable and
      binds to the same base/candidate tuple.
- [ ] No boundary, provider, reviewer, evidence, timer, retry, cleanup, acceptance, landing, or
      dependency-release rule widens authority or violates the story's fail-closed contract.
- [ ] The selected final-verification posture binds to the immutable candidate. Pre-review hosted
      CI may be present, but review does not wait for verification selected to run after `Accepted`;
      that applicable check/evidence passes before finalization or landing. Publication used only
      D15's recorded `Reviewing` transition and fenced `OPC-REV-*` draft/non-mergeable review
      publication, never approval or a substitute owner-ratification/activation record.
- [ ] The reviewer is independent; findings, acceptance metadata, and final-verification posture
      bind exactly to this tuple. No partial, stale, or differently based verdict is accepted.

### Implementation-candidate verdict record

Record: protocol; story ID; exact external owner-ratification/activation record (authenticated
owner or explicitly named delegated principal, independently verifiable delegation/current
validity, durable record ID/URL, original package tuple `P`, any required authoritative landing-equivalence
record, immutable provenance, activation target scope, realization tuple, and expiry/revocation);
base ref/commit/tree; candidate commit/tree; merge-base equality and
predecessor-containment proof; current normative-corpus comparison; owned paths; selected
final-verification posture and checks/CI/evidence digests; reviewer identity/independence; verdict;
and findings. Do not require a fresh package-path-set digest computation for this protocol.

## Verdict rule

Return `PASS` only when no blocking finding remains on the selected exact frozen subject. Return
`CHANGES_REQUIRED` for correctable defects. Return `OWNER_DECISION_REQUIRED` and stop when the
needed correction changes product intent, architecture, authority, guarantee, accepted cost, or
deliberate deferral beyond a recorded delegation. A `PASS` neither authorizes a future base refresh
nor substitutes for the exact external owner-ratification/activation record, applicable exact-
candidate CI/evidence, approval, landing, finalization, or dependency release.
