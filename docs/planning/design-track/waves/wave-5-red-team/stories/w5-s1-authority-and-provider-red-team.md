---
id: w5-s1-authority-and-provider-red-team
wave: wave-5-red-team
status: designed
depends_on: [] # D-004: split by probe surface, not a logical dependency on w5-s2
design_targets: [] # D-002/D-006: red-team/probe-only; no docs/design targets, only planning-track probe outputs and routed findings
reconciles_to:
  [
    FENCE-1,
    FENCE-2,
    FENCE-3,
    EARN-1,
    EARN-2,
    GUARD-2,
    DOOR-1,
    DOOR-2,
    DOOR-3,
    SEC-2,
    STACK-2,
    STACK-4,
    STACK-5,
    DRIVE-1,
    DRIVE-2,
    DRIVE-3,
    INV-002,
  ]
---

# w5-s1-authority-and-provider-red-team — probe authority, provider boundaries, and SEC-2

## Objective

Brief a future design session to author the **authority/provider red-team probe package** — a
planning-track-only adversarial pass over the authority spine and provider seams already settled by
Wave 4a and Wave 4b. This session moves from the approved Wave 5 frame's seam-level split to an
authored probe brief that pressure-tests fail-closed authorization, capability-attestation claims,
provider read-only consumption of core semantics, and the full **phone-home / SEC-2 adversarial
scenario** Wave 4b's D-003 and `w4-s6` explicitly deferred here. It does **not** author or deepen
`docs/design/**`; it produces routed findings, contradiction checks, open questions, and review
evidence only.

Per D-002 and D-006 this story stays **probe-only** and keeps the provider boundary rule intact. It
does not redesign `w4-s3`'s Fence/Doorbell/attestation judgment, `w4-s2`'s evidence taxonomy,
`w4-s1`'s records model, or any Wave 4b provider port shape. Its work is to ask whether those
already-authored seams survive adversarial pressure without contradiction, and to record the gaps
precisely when they do not. The sharpest case is SEC-2: this story owns the **full adversarial
scenario and gap analysis**, while preserving the exact three-way split from Wave 4b D-003 —
`w4-s6` owns the design posture and proof seed; this story owns the phone-home scenario; U9 collects
both.

## Inputs to read

- [`../frame.md`](../frame.md) — the approved Wave 5 frame: source map, `InputResolution`,
  `AgreedSystemModel`, the authority/provider probe surface, and the routed-finding posture this
  story inherits.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under:
  D-002 red-team/probe-only scope; D-003 preserve the SEC-2 three-way split; D-004 this story owns
  the authority/provider/SEC-2 probe surface; D-005 read-only invariant handling; D-006
  `contract/seam design` / `strategic-only` plus routed findings back to existing owners or U9.
- [`../../../README.md`](../../../README.md) and
  [`../../wave-4b-providers/decisions.md`](../../wave-4b-providers/decisions.md) — the durable
  pre-U9 statement that Wave 5 is the red-team wave and that SEC-2 ownership stays split across
  `w4-s6` posture/proof seed, this story's adversarial scenario, and later U9 collection.
- [`../../wave-4b-providers/decisions.md`](../../wave-4b-providers/decisions.md) — especially D-003
  (SEC-2 three-way split), D-004 (provider boundary rule and orphaned-ID ownership), and D-005
  (provider-side `INV-009`+ candidates).
- [`../../wave-4b-providers/frames/w4-s6-execution-host-provider.md`](../../wave-4b-providers/frames/w4-s6-execution-host-provider.md)
  and [`../../wave-4b-providers/stories/w4-s6-execution-host-provider.md`](../../wave-4b-providers/stories/w4-s6-execution-host-provider.md)
  — the execution-host containment-proof posture, honest-reporting stance, and the exact Wave 5
  handoff for SEC-2.
- [`../../wave-4b-providers/README.md`](../../wave-4b-providers/README.md),
  [`../../wave-4b-providers/stories/w4-s5-agent-provider.md`](../../wave-4b-providers/stories/w4-s5-agent-provider.md),
  [`../../wave-4b-providers/stories/w4-s7-forge-provider.md`](../../wave-4b-providers/stories/w4-s7-forge-provider.md),
  and [`../../wave-4b-providers/stories/w4-s8-work-source-provider.md`](../../wave-4b-providers/stories/w4-s8-work-source-provider.md)
  — the four provider seams this story probes for boundary compliance and contradiction.
- [`../../wave-4a-core/frames/w4-s3-authority-spine.md`](../../wave-4a-core/frames/w4-s3-authority-spine.md)
  and [`../../wave-4a-core/stories/w4-s3-authority-spine.md`](../../wave-4a-core/stories/w4-s3-authority-spine.md)
  — the Fence classifier, Doorbell escalation, capability-attestation judgment, and GUARD-2
  enforcement ownership this story pressure-tests.
- [`../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)
  and [`../../wave-4a-core/stories/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/stories/w4-s2-plan-policy-evidence.md)
  — the evidence/attestation taxonomy and GUARD-2 rule declaration this story checks provider claims
  against, read-only.
- [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) and
  [`../../wave-3-ports/stories/w3-s1-provider-port-skeleton.md`](../../wave-3-ports/stories/w3-s1-provider-port-skeleton.md)
  — the settled provider-port anti-corruption stance: providers implement against ports and never
  redefine core policy, evidence, authorization, or state semantics.
- `docs/product/guarantees.md` — exact IDs this story reconciles to: FENCE-1/2/3, EARN-1/2,
  GUARD-2, DOOR-1/2/3, SEC-2, STACK-2/4/5, DRIVE-1/2/3.
- `docs/product/concepts.md` — the runner/worker authority boundary this story must keep stable under
  adversarial pressure.
- `docs/design/contracts/providers.md`, `docs/design/core/authorization.md`, and
  `docs/design/notes/runtime-design-m5a.md` — the current design homes and existing invariant
  vocabulary this story cites but does not edit; `INV-002` is especially relevant as the structural
  no-privileged-method guarantee.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable planning-track probe artifact(s), not `docs/design/**`: the authored authority/provider
   red-team package consisting of the adversarial scenario set, contradiction matrix, routed
   findings, and review evidence produced from this brief. `design_targets` stays empty by design.
2. Open questions, logged (never invented answers) — especially where a probe exposes
   under-specified authority, ambiguous proof expectations, or a seam whose owner is unclear under
   adversarial pressure.
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting numbering.
   This story explicitly pressure-tests `INV-002` and the Wave 4b provider-side `INV-009`+
   candidates around containment and honest reporting, but it does **not** hard-number any newly
   exposed invariant locally; new invariants remain findings or candidates for the owning wave/U9.
4. Risks and deferred decisions — including any SEC-2 gaps that require routed design follow-up, any
   provider-boundary contradiction that belongs back in Wave 4a/4b, and any U9 collection risk.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- What is the full **phone-home / SEC-2 adversarial scenario** Wave 4b D-003 deferred here —
  attack surface, probe sequence, expected proof claims from `w4-s6`, contradiction checks against
  honest containment reporting (DRIVE-3), and the routed gaps when those claims are insufficient?
- Does the **authority boundary** actually hold across the authored seams: worker requests always
  cross fail-closed authorization (FENCE-1), provider packages do not silently widen authority
  (FENCE-2 / DRIVE-2), the worker never holds privileged methods or credentials (FENCE-3, `INV-002`),
  and human escalation stays narrow and durable (DOOR-1/2/3)?
- Do the provider stories and Wave 4a authority/evidence sources preserve the **read-only provider
  rule** end to end — providers supply claims or proofs, while core judges, records, and owns policy,
  evidence sufficiency, authorization, and state semantics?
- Where are the contradiction surfaces between **capability proof and capability judgment** —
  especially between Wave 4b's supplied claims and Wave 4a's EARN-1/2 freshness/sufficiency
  judgment — and what findings should route back if the seam is under-specified?
- Does the SEC-2 three-way split stay exact under red-team pressure — `w4-s6` posture/proof seed,
  this story's adversarial scenario, U9 collection — so the scenario does not duplicate `w4-s6`
  design or pre-author U9's collector?
- Which existing **Wave 4b invariant candidates** are actually being stress-tested by these probes —
  containment-proven-not-asserted, isolation-strength-honestly-reported, and the provider-boundary
  read-only posture — and where do newly exposed gaps route if they do not fit the current candidate
  set?

## Invariants to preserve

- `FENCE-1`, `FENCE-2`, `FENCE-3` — fail-closed authorization, no self-widening of runtime grants,
  and no worker-held privileged credentials. These are red-team probe surfaces, not rules this story
  redefines.
- `EARN-1`, `EARN-2` — autonomy requires fresh, positive, driver-and-run-specific proof, and stale or
  failed proof reduces autonomy rather than weakening guarantees.
- `GUARD-2` — rule-governing change forces a completion pause for fresh re-approval and evidence; the
  red-team story may expose seam gaps here, but it does not redesign the mechanism.
- `DOOR-1`, `DOOR-2`, `DOOR-3` — ambiguous or risky action routes to the owner; escalations are
  durable; human grants are narrow.
- `SEC-2` — outbound network access is confined and the confinement is proven, not taken on the
  agent's word.
- `STACK-2`, `STACK-4`, `STACK-5` — four swappable seams, capabilities attested rather than assumed,
  and seams as authority boundaries.
- `DRIVE-1`, `DRIVE-2`, `DRIVE-3` — drivers earn trust through adversarially meaningful proof, do not
  change scope silently, and report containment honestly.
- `INV-002` — the Agent seam exposes no privileged method; this is an existing invariant this story
  pressure-tests, not one it re-mints.
- Existing Wave 4b provider-side `INV-009`+ candidates remain **read-only** probe surfaces here:
  containment-proven-not-asserted and isolation-strength-honestly-reported are checked, not
  renumbered.

## Must not decide

- Any new provider, authority, policy, evidence, or lifecycle design rule. This story probes the
  authored seams and routes findings back; it does not resolve them locally.
- The **design posture** of `w4-s6` itself. This story owns the adversarial SEC-2 scenario and gap
  analysis, not the execution-host design or proof mechanism.
- U9's **collector role**. This story names U9 as the later collection point for SEC-2 posture plus
  Wave 5 findings; it does not author or pre-resolve `review-and-red-team.md`.
- Any `docs/design/**` updates, v0 contract mutations, runtime code, schema, TypeScript, or
  implementation tasking.
- Hard-numbering new `INV-*` values. Newly exposed invariants remain findings or candidate notes for
  the owning wave/U9.
- Any dependency on `w5-s2`. Per D-004 this story is split by probe surface, not logically dependent
  on the recovery/records story.

## Exit criteria

- The planning-track probe package is specific enough to launch a red-team session over authority,
  providers, and SEC-2 without inventing new design ownership or `docs/design/**` targets.
- The full phone-home / SEC-2 adversarial scenario is explicitly owned here and is clearly separated
  from `w4-s6`'s posture/proof seed and U9's later collector role.
- The brief states the provider boundary rule and the routed-finding posture explicitly: providers are
  probed against read-only core consumption, and any contradiction routes back to the owning design or
  product surface.
- `reconciles_to` remains exact and bounded to the IDs this probe surface actually stresses; no
  ranges, no invented product IDs, and no hard-numbered new invariants.
- design-review verdict settled (zero open blocking suggestions).

## Evidence required

- The wave frame at [`../frame.md`](../frame.md).
- This authored story brief and the later planning-track probe outputs it drives.
- The cited Wave 4b and Wave 4a frames, decisions, and story briefs listed above, especially
  `w4-s6`, `w4-s5`, `w4-s3`, and `w4-s2`.
- `docs/product/guarantees.md`, `docs/product/concepts.md`, `docs/design/contracts/providers.md`, and
  `docs/design/core/authorization.md`.
- The design-review report and this wave's [`../decisions.md`](../decisions.md) dispositions.

## Design review & handoff

This session runs the technical-design method itself:

1. frame-technical-design -> a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode`, `ddd_depth`). This wave's build-time frame at [`../frame.md`](../frame.md)
   seeds it.
2. author-technical-design -> the planning-track red-team probe package for authority/provider/SEC-2.
   Because `design_targets` is intentionally empty, the authored output is the probe set, routed
   findings, contradiction matrix, and session evidence this story prescribes, not a `docs/design/**`
   artifact.
3. review-technical-design -> three lenses (architecture-enforceability: the SEC-2 split is kept
   exact, the provider boundary rule is probed but not reauthored, and routed findings are clearly
   owned. domain-correctness: the probe set actually stresses FENCE / EARN / DOOR / SEC / STACK /
   DRIVE surfaces named in `reconciles_to`, plus `INV-002`, without inventing new entities or
   lifecycle states. agreement-integrity: nothing in the brief contradicts the approved Wave 5 frame,
   Wave 4b D-003/D-004, or the cited Wave 4a/4b story boundaries). Dispositions recorded into this
   wave's decisions.md; settled = zero open blocking suggestions.

Handoff: when settled, update status and hand the routed findings forward to the owning Wave 4a/4b
surfaces or the future U9 collector as appropriate; preserve the SEC-2 three-way split exactly in the
final probe outputs.
