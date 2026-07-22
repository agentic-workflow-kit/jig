---
title: "Jig greenfield delivery — independent review checklist"
purpose: "Make PASS and finding criteria repeatable for a frozen greenfield candidate."
audience:
  - independent reviewers
status: mandatory review checklist
owner: Arye Kogan
last_verified: 2026-07-22
---

# Independent review checklist

Use this against the frozen tuple defined in the [reviewer packet](./README.md). Mark each item
`PASS`, `FINDING`, or `N/A with evidence`; `N/A` never means “not yet considered.”

## Subject and authority

- [ ] Candidate commit, tree, merge base, path set, content/evidence digests, and environment are
      recorded and resolve exactly.
- [ ] The checkout and review scope are clean; no unrecorded path, generated residue, or moving
      branch changes the frozen subject.
- [ ] The live 67-file normative path set and aggregate SHA-256 manifest match the passed subject
      and current byte-identical corpus, rather than a copied baseline assertion.
- [ ] The story contract is complete, internally consistent, and bounded to one cohesive semantic
      and authority subject.
- [ ] Every brief front matter exactly matches its 16 `track.json` fields; all stable IDs,
      `PC-*` routes, and imported commitments are literal, locally explained, and neither wildcard
      nor invented.
- [ ] Product outcome/why and every governing design path/stable ID are traceable; no archive or
      non-governing research selected behavior.
- [ ] Dependencies and phase gate evidence are current, merged, and exact-subject-bound.
- [ ] Every `DR-*` selection has owner, constraints, evidence, fallback, and no material invention.

## Exact planning closure

- [ ] The manifest has exactly 47 IDs in seven phases; the phase-2 topological sequence is
      GF-019, GF-020, GF-021, GF-022, GF-025, GF-026, GF-023, GF-024.
- [ ] Every DAG edge is topological and the declared critical path is the real longest path over
      live dependency edges, not a plausible-looking hand-drawn route.
- [ ] All 44 proof-route texts exactly match the product-guarantee reconciliation table in both
      directions: route-to-carrier/proof and carrier/proof-to-route.
- [ ] All 56 imported commitments and every fixed inventory have the required forward and reverse
      story occurrence; no inventory uses a wildcard or invented ID.
- [ ] The exact 12 failure classes and 22 identities appear only as their cataloged literals.

## Authority, data, and security

- [ ] Runtime units, ports, inputs, outputs, identities, durable facts, trust roots, and writer
      authority are explicit and conform to the design.
- [ ] No worker, reviewer, provider, projection, consumer, or evidence item gains lifecycle,
      acceptance, finalization, landing, or configuration authority it does not own.
- [ ] I13/I14 preserve only `Landed` dependency release and separate business outcome from
      retirement; a pre-Run rejected acknowledgement is not a Story `NotRun`, `Rejected`, or
      `Stopped` selector.
- [ ] Boundary validation rejects malformed, unknown, stale, ambiguous, oversized, duplicate, and
      cross-scope input as applicable; evidence never confers authority.
- [ ] Credentials are in-memory named references only; logs, records, exports, fixtures, and review
      material are redacted and hostile-input limits are tested.
- [ ] A real adapter/provider is unreachable and unconfigurable until exact current qualification
      evidence admits its manifest; fallback does not widen authority.

## Lifecycle, effects, and recovery

- [ ] Success, terminal/non-delivery outcomes, durable transitions, and dependency-release rules are
      observable and distinguish acceptance, landing, business outcome, and retirement.
- [ ] Intent is durable before dispatch; every effect has a stable identity, fence, result
      validation, and deterministic reconciliation route.
- [ ] No uncertain effect is blindly retried. Same-effect retry requires confirmed absence and
      recorded reauthorization; otherwise the candidate parks/preserves/escalates.
- [ ] All applicable `FC-*`, `BND-*`, timeout, retry, recovery, resume, settlement, cleanup, and
      residual-obligation outcomes are finite, typed, and tested from durable facts.
- [ ] Timers only wake work; they do not decide state. Cleanup preserves uncertain resources and
      cannot alter outcome or release dependents.
- [ ] Refresh retains the authorized holder only under its valid fence, mints a new `ID-CAND`,
      returns the changed candidate to full review, and atomically rebinds the target basis.
- [ ] Remote `PORT-DELIVERY` and local `PORT-VERIFY` remain separate authority/mechanism seams.

## Evidence and acceptance

- [ ] Required unit/schema, contract, negative-authority, adversarial, replay, permutation/crash,
      fault, provider, and E2E evidence is present or validly inapplicable.
- [ ] Applicable `CF-*` suites/catalog entries, source/fixture identities, check results, build,
      manifest, environment, and probe digests bind to the exact candidate.
- [ ] Each mandatory split is closed: GF-019→020 source, GF-010→025 ledger/registry/witness,
      GF-013→026 artifact, GF-033→039 workspace, and GF-042→047 verifier. Each provider is
      unreachable until its exact gate; GF-025/GF-026 establish qualified local file-store closure.
- [ ] `DR-*` owners exactly match the delegation register; Arye approval is separately evidenced
      and never inferred from an engineering or configuration selection.
- [ ] `CF-GATE-PRODUCT` contains exactly 39 recorded suite results plus every named
      element/governance record of all 44 settled `PC-*` proof routes—no import or provider gate
      is added as a product-gate input.
- [ ] The broader supported-profile coverage claim separately passes the 56-import
      matrix-plus-suite disposition audit; provider/profile evidence supports admission only.
- [ ] The acceptance package is complete: independent reviewer identity/authority, exact Candidate,
      complete evidence/delivery metadata, findings state, and selected verification posture.
- [ ] Acceptance is not represented as landing; only authoritative target-content proof releases
      dependencies where the story reaches finalization.

## Verdict record

Record: candidate tuple; reviewer identity/independence; paths and IDs reviewed; all checks and
evidence; phase-gate status; verdict; and findings. Each finding states `F-NNN`, severity,
governing path/ID, exact evidence, affected observable behavior, required correction/result, and
whether re-review must cover the full candidate or a named subset.

## Track containment and adversarial validation

- [ ] The changed paths match the exact `docs/delivery/` allowlist for this documentation package;
      no product source, product package scaffolding, or unrelated configuration is included.
- [ ] Archive material, ignored remnants, and comparative research were not used as governing
      input; any permitted story-scoped archive lookup is explicitly recorded as provenance only.
- [ ] Adversarial validator tests cover malformed manifest/front matter, missing/duplicate IDs,
      unknown dependencies/cycles, stale route/import/inventory mappings, absent split closure, and
      changed delegated-choice constraints. A stale validator result is reported, not weakened.

Return `PASS` only when no blocking finding remains on the exact frozen subject. Return
`CHANGES_REQUIRED` for correctable defects. Return `OWNER_DECISION_REQUIRED` and stop when the
needed correction changes product intent, architecture, authority, guarantee, accepted cost, or
deliberate deferral beyond a recorded delegation.
