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
- [ ] The story contract is complete, internally consistent, and bounded to one cohesive semantic
      and authority subject.
- [ ] Product outcome/why and every governing design path/stable ID are traceable; no archive or
      non-governing research selected behavior.
- [ ] Dependencies and phase gate evidence are current, merged, and exact-subject-bound.
- [ ] Every `DR-*` selection has owner, constraints, evidence, fallback, and no material invention.

## Authority, data, and security

- [ ] Runtime units, ports, inputs, outputs, identities, durable facts, trust roots, and writer
      authority are explicit and conform to the design.
- [ ] No worker, reviewer, provider, projection, consumer, or evidence item gains lifecycle,
      acceptance, finalization, landing, or configuration authority it does not own.
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

## Evidence and acceptance

- [ ] Required unit/schema, contract, negative-authority, adversarial, replay, permutation/crash,
      fault, provider, and E2E evidence is present or validly inapplicable.
- [ ] Applicable `CF-*` suites/catalog entries, source/fixture identities, check results, build,
      manifest, environment, and probe digests bind to the exact candidate.
- [ ] The acceptance package is complete: independent reviewer identity/authority, exact Candidate,
      complete evidence/delivery metadata, findings state, and selected verification posture.
- [ ] Acceptance is not represented as landing; only authoritative target-content proof releases
      dependencies where the story reaches finalization.

## Verdict record

Record: candidate tuple; reviewer identity/independence; paths and IDs reviewed; all checks and
evidence; phase-gate status; verdict; and findings. Each finding states `F-NNN`, severity,
governing path/ID, exact evidence, affected observable behavior, required correction/result, and
whether re-review must cover the full candidate or a named subset.

Return `PASS` only when no blocking finding remains on the exact frozen subject. Return
`CHANGES_REQUIRED` for correctable defects. Return `OWNER_DECISION_REQUIRED` and stop when the
needed correction changes product intent, architecture, authority, guarantee, accepted cost, or
deliberate deferral beyond a recorded delegation.
