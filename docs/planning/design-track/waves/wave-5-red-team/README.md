---
title: Wave 5 — red team
wave: 5
status: charter draft
depends_on_waves: [1, 2, 3, "4a", "4b"]
---

# Wave 5 — red team

## Purpose

Adversarially probe the design settled by Waves 1-4b without authoring new jig design surfaces.
Wave 5 is a **red-team / stress-probe** wave only (D-002): it introduces no new jig entities,
provider seams, runtime states, `docs/design/**` targets, implementation tasks, schemas, or code.
Its job is to pressure-test the seams already authored or framed by the prior waves for gaps,
contradictions, and under-specified authority, then route those findings back to the owning design
or product surfaces rather than resolving them locally.

Per the approved frame and D-004, this wave splits across two **probe surfaces**, not two design
subsystems:

- **`w5-s1` — authority/provider red team**: probes the authority spine and provider-boundary claims
  across Wave 4a and Wave 4b, including the full adversarial phone-home / SEC-2 scenario that Wave
  4b's `w4-s6` explicitly deferred here (D-003).
- **`w5-s2` — recovery/records integration red team**: probes the composed behavior of Wave 2's
  recovery/run-lifecycle semantics with Wave 4a's records and bootstrap surfaces, especially
  stop/resume, binding immutability, no-double-effect, notice, and records causality.

This wave authors **planning-track** artifacts only: the charter, the two story briefs, and later
the red-team session outputs those stories produce. Findings route back to existing owners or to the
future U9 collector; Wave 5 does not rewrite the design itself.

## Required input docs

- [`frame.md`](./frame.md) — the approved Wave 5 frame: source map, `InputResolution`,
  `AgreedSystemModel`, `architecture_mode: contract/seam design`, `ddd_depth: strategic-only`, the
  two probe surfaces, and the routed-finding posture this charter and both stories inherit.
- [`decisions.md`](./decisions.md) — the frame-gate record this wave is authored under: D-001
  authoring may proceed from the completed frame; D-002 red-team/probe-only scope; D-003 preserve
  the SEC-2 three-way split; D-004 the story split by probe surface; D-005 read-only invariant
  handling; D-006 `contract/seam design` + `strategic-only` and route findings back to existing
  owners or U9.
- [`../../session-template.md`](../../session-template.md) — the exact wave-charter and story
  skeletons this wave follows.
- [`../../README.md`](../../README.md) and [`../../session-template.md`](../../session-template.md)
  — the durable pre-U9 track scope for Wave 5: a light red-team wave with planning-track-only
  outputs and the standard charter/story artifact shape.
- [`../wave-4b-providers/decisions.md`](../wave-4b-providers/decisions.md) and
  [`../wave-4b-providers/stories/w4-s6-execution-host-provider.md`](../wave-4b-providers/stories/w4-s6-execution-host-provider.md)
  — the pre-U9 ownership carry-forward that makes Wave 5 responsible for the full phone-home /
  SEC-2 adversarial scenario deferred by Wave 4b.
- The immediate prior-wave authority for Wave 5's ownership split and boundary rule:
  [`../wave-4b-providers/decisions.md`](../wave-4b-providers/decisions.md),
  [`../wave-4b-providers/README.md`](../wave-4b-providers/README.md),
  [`../wave-4b-providers/frames/w4-s6-execution-host-provider.md`](../wave-4b-providers/frames/w4-s6-execution-host-provider.md),
  and [`../wave-4b-providers/stories/w4-s6-execution-host-provider.md`](../wave-4b-providers/stories/w4-s6-execution-host-provider.md).
- The Wave 4a frame-time contracts Wave 5 probes **read-only**:
  [`../wave-4a-core/frames/w4-s1-records-observability.md`](../wave-4a-core/frames/w4-s1-records-observability.md),
  [`../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../wave-4a-core/frames/w4-s2-plan-policy-evidence.md),
  [`../wave-4a-core/frames/w4-s3-authority-spine.md`](../wave-4a-core/frames/w4-s3-authority-spine.md),
  and [`../wave-4a-core/frames/w4-s4-bootstrap-composition-root.md`](../wave-4a-core/frames/w4-s4-bootstrap-composition-root.md).
- The earlier-wave seam and lifecycle sources the frame cites:
  [`../wave-2-state-machines/frame.md`](../wave-2-state-machines/frame.md),
  [`../wave-2-state-machines/stories/w2-s2-run-lifecycle-and-recovery.md`](../wave-2-state-machines/stories/w2-s2-run-lifecycle-and-recovery.md),
  [`../wave-3-ports/frame.md`](../wave-3-ports/frame.md),
  [`../wave-3-ports/stories/w3-s1-provider-port-skeleton.md`](../wave-3-ports/stories/w3-s1-provider-port-skeleton.md),
  [`../wave-1-domain/frame.md`](../wave-1-domain/frame.md), and the two Wave 1 story briefs.
- Product/design sources the frame cites for exact IDs and seam properties:
  `docs/product/guarantees.md`, `docs/product/concepts.md`,
  `docs/design/contracts/execution-plan-contract-v0.md`,
  `docs/design/contracts/observability-records-contract-v0.md`,
  `docs/design/core/records.md`, `docs/design/core/bootstrap.md`,
  `docs/design/contracts/providers.md`, and `docs/design/notes/runtime-design-m5a.md`.

## Required output docs

- This charter: `docs/planning/design-track/waves/wave-5-red-team/README.md`.
- `docs/planning/design-track/waves/wave-5-red-team/stories/w5-s1-authority-and-provider-red-team.md`
  — the authority/provider/SEC-2 red-team story brief.
- `docs/planning/design-track/waves/wave-5-red-team/stories/w5-s2-recovery-records-integration-red-team.md`
  — the recovery/records/bootstrap integration red-team story brief.
- The later story-session outputs these briefs prescribe: planning-track probe artifacts, routed
  findings, contradiction matrices, open questions, and review evidence. Because this wave is
  probe-only (D-002), these outputs do **not** deepen `docs/design/**` and do **not** become new
  design targets.
- This wave's existing [`decisions.md`](./decisions.md), which remains coordinator-owned and records
  frame-gate and later review dispositions.
- **No `story-dag.md` this wave.** Per D-004, the two stories are split by probe surface and are not
  currently logically dependent; sequencing may be recommended for convenience, but that is not a
  dependency DAG.

## Questions it must answer

- For **`w5-s1`**: where are the contradiction, under-specification, and anti-gaming surfaces across
  the authority spine and the provider seams, while preserving the settled boundary rule that
  providers implement against Wave 3 ports and consume Wave 4a core contracts read-only?
- For **`w5-s1`**: what is the full **adversarial phone-home / SEC-2 scenario** Wave 4b's D-003 and
  `w4-s6` deferred here — attack surface, probe sequence, expected proof claims, contradiction
  checks, and routed gaps — without rewriting `w4-s6`'s design posture or U9's collector role?
- For **`w5-s1`**: does the authority/provider story keep the three-way SEC-2 split exact — `w4-s6`
  posture and proof seed, Wave 5 adversarial scenario, U9 collection — so SEC-2 neither duplicates
  Wave 5 nor orphans?
- For **`w5-s2`**: where are the contradiction surfaces across Wave 2's recovery/run-lifecycle view,
  Wave 4a's records engine, and Wave 4a's bootstrap re-entry procedure — especially around
  `stopped` / `resumed`, binding immutability, no-double-effect, liveness/notices, and record
  causality?
- For **`w5-s2`**: do the records, bootstrap, and recovery claims stay coherent with
  `docs/design/contracts/observability-records-contract-v0.md` and the product guarantees
  RESUME/ISO/SEE/GUARD without inventing new lifecycle states or records schema?
- For **both stories**: how are findings logged and routed back to the owning design/product surfaces
  or U9 rather than silently resolved inside Wave 5, and which existing `INV-*` values or
  un-numbered `INV-009`+ candidates do the probes explicitly pressure-test?

## What it must not decide

- **No real design authoring.** This wave must not author or edit `docs/design/**`, the v0 contracts,
  runtime code, schemas, TypeScript, exports, or implementation tasks.
- **No new jig entities, seams, or lifecycle states.** Wave 5 reuses the settled vocabulary from
  Waves 1-4b and probes it; it does not add new domain nouns or runtime states.
- **No product re-litigation.** A found contradiction or gap routes back to the owning
  product/design surface as an open question or routed finding; this wave does not settle product
  disputes locally.
- **No local resolution of the SEC-2 split.** `w4-s6` keeps the design posture and proof seed; Wave 5
  authors the adversarial scenario; U9 collects both. This wave must not collapse those roles.
- **No hard-numbering new `INV-*` values.** Existing `INV-*` and `INV-009`+ candidates are cited
  read-only; any newly exposed invariant stays a finding or candidate for the owning wave/U9.
- **No story DAG unless earned by a real logical dependency.** D-004 currently says the probe
  surfaces are split, not dependent.

## Exit criteria

- Both story briefs exist and follow the session-template skeleton exactly, with `design_targets: []`
  and probe-only deliverables consistent with D-002/D-006.
- `w5-s1` clearly owns the authority/provider/SEC-2 red-team surface, including the full phone-home
  scenario deferred by Wave 4b D-003, without claiming ownership of `w4-s6`'s design posture or U9's
  collector.
- `w5-s2` clearly owns the recovery/records/bootstrap integration probe surface without introducing
  new states, schema, or bootstrap redesign beyond routed findings.
- Each story's `reconciles_to` frontmatter enumerates **exact** product IDs and existing invariant
  IDs where applicable; no ranges, no invented product IDs, and no hard-numbered new `INV-*`.
- The charter and both stories state the routed-finding posture explicitly: contradictions go back to
  the owning design/product surfaces or to U9 collection, never resolved locally.
- `story-dag.md` is absent unless real logical dependencies emerge during authoring; under the current
  approved frame and D-004, it is omitted.
- Build-time review should be able to confirm the wave remains planning-track-only and coherent with
  the approved frame, with zero open blocking findings after disposition.

## Evidence required

- [`frame.md`](./frame.md) and [`decisions.md`](./decisions.md) for the Wave 5 frame-time contract and
  frame-gate dispositions.
- The two authored story briefs under [`stories/`](./stories/).
- The cited prior-wave frames, decisions, and story briefs listed above, especially Wave 4b's
  `w4-s6` materials and Wave 4a's `w4-s1` / `w4-s2` / `w4-s3` / `w4-s4` frames.
- The product/design sources cited above for exact IDs, seam properties, and invariant vocabulary.
- The later design-review report plus any coordinator-recorded dispositions in this wave's
  [`decisions.md`](./decisions.md).

## Story order

- `w5-s1-authority-and-provider-red-team`
- `w5-s2-recovery-records-integration-red-team`

These two stories are **logically independent** under D-004: they split by probe surface and neither
consumes the other's authored output. The order above is recommended only because `w5-s1` carries the
explicit SEC-2 phone-home scenario Wave 4b deferred here, while `w5-s2` stays on the recovery/records
surface. That recommendation does **not** earn a `story-dag.md`.
