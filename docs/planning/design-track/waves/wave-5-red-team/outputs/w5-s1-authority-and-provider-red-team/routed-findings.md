---
title: "w5-s1 routed findings"
status: draft
story: w5-s1-authority-and-provider-red-team
---

# w5-s1 routed findings

## Source-backed findings

### F-1 — SEC-2 proof and host-reported isolation strength remain distinct but easy to blur under adversarial reading

- Evidence:
  `w4-s6` consistently says the host supplies proof and honest reporting, while
  core judges freshness/sufficiency; `providers.md` also states proof-not-trust.
- Why this is a gap surface:
  The sources agree directionally, but a red-team scenario can still exploit any
  reading that treats reported isolation strength as equivalent to sufficient
  proof.
- Route:
  `w4-s6` for posture/proof-seed clarity if needed, `w4-s3` for judgment
  boundary clarity, U9 for collection.
- Local non-resolution:
  Wave 5 records the ambiguity surface; it does not rewrite SEC-2 posture.

### F-2 — Provider claim versus core judgment needs explicit preservation across all authority/provider probes

- Evidence:
  `w4-s2` owns evidence taxonomy and `w4-s3` owns freshness/sufficiency
  judgment; provider surfaces supply claims against those core-owned rules.
- Why this is a gap surface:
  Adversarial scenarios can succeed if capability claims are operationally
  treated as self-certifying.
- Route:
  `w4-s2`, `w4-s3`
- Local non-resolution:
  No local seam rewrite; only routed clarification if later authoring needs it.

### F-3 — Work-source provenance remains a likely second-channel authority pressure point

- Evidence:
  Wave 3 and `providers.md` say work source may originate candidates or
  provenance but must not bypass validated plan intake.
- Why this is a gap surface:
  Import/sync or provenance language can drift into implicit runtime authority if
  left adversarially untested.
- Route:
  `w4-s8`, `w4-s2`
- Local non-resolution:
  Wave 5 does not resolve provenance/import shape.

## Open questions

- What minimum proof characteristics must an adversarial reviewer be able to
  observe before SEC-2 is meaningfully distinguishable from honest self-report.
  Route: `w4-s6`, `w4-s3`
- Should any future cross-wave collector explicitly restate the difference
  between host-reported isolation category and core-judged proof sufficiency.
  Route: U9
- Is current work-source provenance language sufficiently explicit that imported
  candidate work can never be read as runtime authorization input.
  Route: `w4-s8`, `w4-s2`

## Candidate invariant gaps

These are read-only candidate gaps only. No new numbered `INV-*` row is minted.

- `INV-002` remains pressure-tested, not revised: the Agent seam must expose no
  privileged method.
- Wave 4b execution-host candidates remain pressure-tested, not renumbered:
  `containment-proven-not-asserted` and
  `isolation-strength-honestly-reported`.
- Potential missing invariant surface exposed by red-team framing:
  host-reported isolation category must never be consumed as a substitute for
  core-judged proof sufficiency.
  Route: `w4-s6`, `w4-s3`, U9

## Route map

| Finding or question                                | Route target |
| -------------------------------------------------- | ------------ |
| SEC-2 posture/proof-seed clarity                   | `w4-s6`      |
| Capability freshness/sufficiency judgment boundary | `w4-s3`      |
| Evidence taxonomy / claim vocabulary boundary      | `w4-s2`      |
| Agent seam privileged-method boundary              | `w4-s5`      |
| Forge runner-only authority boundary               | `w4-s7`      |
| Work-source never-bypasses-plan boundary           | `w4-s8`      |
| Cross-wave collection or reconciliation            | U9           |
