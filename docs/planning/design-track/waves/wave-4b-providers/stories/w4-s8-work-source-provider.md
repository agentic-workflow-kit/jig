---
id: w4-s8-work-source-provider
wave: wave-4b-providers
status: designed
depends_on: [] # D-006: the shared providers.md is contention, not a logical dependency; serialize-vs-parallel is contingent on the OPEN DocStructurePlan split question (stated canonically in w4-s5's story)
design_targets: [docs/design/contracts/providers.md] # deepen in place (D-001): the Work source section — the candidate origination/provenance surface and the never-bypasses-plan discipline. The Work source port line Wave 3's w3-s1 seeded here (incl. the already-verbatim never-bypasses-plan sentence) is PRESERVED and CITED. author-technical-design may relocate via the OPEN DocStructurePlan split question
reconciles_to: [STACK-1, STACK-2, STACK-4, STACK-5, CFG-4, CFG-7]
---

# w4-s8-work-source-provider — design the Work source provider (where work items originate)

## Objective

Brief a future design session to author the **Work source provider** — where work items originate and
may supply provenance/scheduling input — deepening the **Work source section** of
`docs/design/contracts/providers.md` **in place** (D-001) from the port skeleton Wave 3's `w3-s1`
left it at into an authored, boundary-respecting provider design. This session moves from the
overview-altitude interface the stub already draws — "abstracts where work items originate. It may
supply provenance or future import/sync behavior, but the validated execution plan remains jig's only
runtime scheduling input; the Work source seam never bypasses the plan" — to the **candidate
origination/provenance surface** behind the port and the **never-bypasses-plan discipline** the
existing sentence already asserts.

Per **D-002** this part runs at `architecture_mode: ports-and-adapters`, `ddd_depth:
ports-and-adapters` — matching `w4-s5`/`w4-s7`, one rung below `w4-s6`'s `tactical-ddd`. It is the
wave's **thinnest seam**: no built adapter exists even at design-shape level beyond the port-skeleton
sentence, and its only invariant is the structural guarantee it inherits from `PlanValidator`'s
existing validate-once boundary (`w4-s2`, cited). It authors no new consistency model, concurrency
property, or fail-closed classifier of its own.

Per D-001 this session **deepens the Work source section of `providers.md` in place**, preserving and
citing the existing Owns/Interface/Notes/Diagram — including the **already-verbatim** never-bypasses-
plan sentence — as the seed (STOP-003: re-project and cite, never overwrite; this session deepens the
mechanism and candidate invariant behind that sentence, it does not invent the sentence). The
**boundary rule** from the governing plan, adopted for this wave by D-004, is the spine: the Work
source provider implements against Wave 3's Work source port and consumes Wave 4a's core contracts
read-only; anything it supplies still crosses `PlanValidator` (`w4-s2`, cited) — no work item
reaches the runner except through the validated plan. `AGENTS.md` remains repo-contract context for
the same guardrail.

## Inputs to read

- [`../frames/w4-s8-work-source-provider.md`](../frames/w4-s8-work-source-provider.md) — this part's
  frame: the source map, `InputResolution`, `AgreedSystemModel` (`architecture_mode`
  `ports-and-adapters`, `ddd_depth` `ports-and-adapters`), the entity model (Work source port /
  never-bypasses-plan invariant), the **INV dedup flag**, and the cross-part seams.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under
  (D-002 `ports-and-adapters`/`ports-and-adapters`; D-004 the boundary rule; **D-005 the
  work-source-never-bypasses-plan candidate flagged as likely identical to Wave 3's own candidate,
  recorded side by side, dedup deferred to U9, NOT duplicated**; D-006 `depends_on: []` and the open
  split question) and the confirmed provenance/import-sync-at-shape-level-only safe assumption.
- [`../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) and Wave 3's `w3-s1` — the Work source
  port's candidate anti-corruption stance **and Wave 3's own un-numbered candidate invariant** of the
  same name ("the invariant that the Work source port never becomes a second, competing scheduling
  input alongside the plan; the requirement that anything it supplies still passes through plan
  validation") — the candidate this session's own must be **flagged as likely identical to**, not
  duplicated. The port shape this session deepens the surface behind, preserving and citing the port
  line as the seed.
- [`../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)
  — **cited read-only** — plan intake's "parse/validate/reject mechanics... produces a `ValidatedPlan`";
  "validation happens once, at the boundary" — the boundary this session's supplied items must still
  cross; this session does not redesign it.
- [`../wave-1-domain/frame.md`](../../wave-1-domain/frame.md) and Wave 1's settled story briefs — Work
  item's authored facts and Execution plan as jig's one hard input; why a work-source-supplied item is
  only a **candidate** until folded into and validated as part of the plan.
- `docs/design/contracts/providers.md` — the existing stub this session deepens in place: the Work
  source Owns/Interface rows (including the already-verbatim never-bypasses-plan sentence), the
  diagram, and the STACK reconciliation.
- `docs/product/guarantees.md` — STACK-1/2/4/5 (vendor-independent guarantees; four swappable seams;
  attested-not-assumed; authority boundary), CFG-4 ("the actual is computed, not hand-set... Jig
  derives what can safely run from policy and the plan's current eligible work" — the plan, not any
  work source, is the scheduling input), CFG-7 (open seams — story sources named as an explicit
  extension point) this provider reconciles to.
- `docs/product/concepts.md` — the track model (PRD → design → plan → policy → work profile per track;
  the plan is the one artifact the runtime consumes) — confirms the work source sits upstream of jig's
  runtime boundary.
- `docs/design/notes/runtime-design-m5a.md` — `SURF-006` (`WorkSourcePort` a named extension point, no
  adapter yet; consumers Plan Intake / Orchestration) — kept a namespace distinct from `INV-*` and
  product IDs.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc at the design_target: the deepened **Work source section** of
   `docs/design/contracts/providers.md` — the candidate origination/provenance surface and the
   never-bypasses-plan discipline — preserving and citing the existing Owns/Interface/Notes/Diagram
   (including the already-verbatim never-bypasses-plan sentence) as the seed.
2. Open questions, logged (never invented answers) — cross-referencing `w4-s5`'s canonical
   `DocStructurePlan` split question.
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting. This session
   carries **work-source-never-bypasses-plan** as a candidate for `INV-009`+ (per the coordinator's
   mandate) BUT **explicitly flags it as very likely identical to Wave 3's own un-numbered candidate**
   of the same name — both wordings recorded **side by side**, dedup **deferred to U9**, NOT silently
   merged and NOT silently duplicated. Never hard-numbered here.
4. Risks and deferred decisions — including provenance/import-sync (named at shape level only; a
   further-deferred extension point) and the INV dedup (deferred to U9).
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- How does the Work source port surface **candidate origination/provenance** — a work source may
  supply candidate work items and/or provenance metadata, folded into the authored plan — while the
  **never-bypasses-plan discipline** holds: anything it supplies still crosses `PlanValidator`
  (`w4-s2`, cited); no work item reaches the runner except through the validated plan?
- How is the **never-bypasses-plan** guarantee stated as a candidate invariant while being **flagged
  as likely identical** to Wave 3's own un-numbered candidate of the same name — both wordings
  recorded side by side, dedup deferred to U9, not silently merged and not silently duplicated? The
  guarantee is enforced entirely by `PlanValidator`'s existing boundary (`w4-s2`'s territory); this
  part names it as a candidate for the port, it does not author a new enforcement mechanism.
- How is the **provenance/import-sync** behavior named at **shape level only** — a work source may
  supply candidate items and/or provenance folded into the plan — without designing any concrete
  integration, format, or sync cadence (a further-deferred extension point, consistent with the fact
  that even the Agent port's seam has no adapter built at the Work source seam)?
- How does the plan stay jig's **one hard scheduling input** (CFG-4) regardless of how many work
  sources exist — no work source becomes a second, competing input alongside the validated plan (the
  structural anti-corruption stance)?

## Invariants to preserve

- The **never-bypasses-plan** structural guarantee — no work item reaches the runner except through
  the validated plan, regardless of how many work sources exist or what provenance they supply. Named
  as a candidate for `INV-009`+, **flagged as likely identical to Wave 3's own un-numbered candidate**
  of the same name (both wordings recorded side by side; dedup at U9; not merged, not duplicated).
- `STACK-1`, `STACK-2`, `STACK-4`, `STACK-5` — vendor-independent guarantees; four swappable seams;
  attested-not-assumed; the seam is an authority boundary.
- `CFG-4` — the actual is computed, not hand-set; jig derives what can safely run from policy and the
  plan's current eligible work — the plan, not any work source, is the scheduling input. `CFG-7` —
  open seams; story sources are an explicit extension point owners/tool builders may add without
  changing jig's core.
- No new `INV-*` numbers are hard-numbered by this story; its one candidate (never-bypasses-plan) is
  flagged for U9 dedup. It continues from `INV-009` (never resets) if numbered locally and records why
  in decisions.md.

## Must not decide

- **The boundary rule is absolute** (D-004): this session must **not** redefine core policy, evidence,
  authorization, or state semantics. It consumes Wave 4a's `w4-s2` `PlanValidator` boundary read-only;
  anything it supplies still crosses that boundary.
- **The plan-validation act** — that is `w4-s2`'s `PlanValidator`. This session supplies candidate
  items or provenance that still cross validate-once-at-the-boundary; it does not re-implement or
  weaken validation.
- **The scheduling decision** — which validated work items are eligible to run next is Orchestration's
  (Wave 2, cited). This session never decides eligibility; it never becomes a second scheduling input.
- The **INV dedup** — whether this part's candidate and Wave 3's are one invariant or two is
  **deferred to U9** (D-005). This session records both wordings side by side; it does not merge or
  renumber them, and does not silently duplicate.
- Anything **Wave 3** settled: the Work source port **shape** and its owns/implements/must-not split.
  This session deepens the surface **behind** the port, preserving and citing the port line (including
  the already-verbatim never-bypasses-plan sentence) as the seed.
- The **`providers.md` split** — the `DocStructurePlan` question is OPEN (D-006), stated canonically in
  `w4-s5`; not decided here.
- Concrete **origin-system integration** (an external tracker's API, a file format, a sync cadence) — a
  further-deferred extension point, not designed this session; this session names the seam's shape
  only.
- **Freezing** the execution-plan v0 contract — the plan-in seam this part's supplied items cross stays
  **cited and unfrozen** (via `w4-s2`, cited); no field names minted; a change routes back to the seam
  owner (STOP-003).
- **Numbering** the consolidated invariant ledger — this session names its one candidate and flags the
  dedup; numbering is coordinated at U9. Never reset `INV-001..008`.
- Field-level schema, TypeScript, JSON Schema, method signatures, or any frozen contract — deferred
  per `docs/design/README.md`.

## Exit criteria

- The deepened Work source section exists in `docs/design/contracts/providers.md`, stating the
  candidate origination/provenance surface and the never-bypasses-plan discipline as the load-bearing
  properties.
- The existing Owns/Interface/Notes/Diagram — including the already-verbatim never-bypasses-plan
  sentence — are **preserved and cited** as the seed, re-projected and extended rather than
  overwritten; any divergence is named explicitly (STOP-003).
- The **boundary-rule statement** is present: implements against Wave 3's Work source port, consumes
  Wave 4a's `PlanValidator` boundary read-only, never becomes a second scheduling input; anything it
  supplies still crosses plan validation.
- The **never-bypasses-plan candidate** is named for `INV-009`+ and **flagged as likely identical to
  Wave 3's own candidate**, recorded side by side, dedup deferred to U9 — not merged, not duplicated;
  the three ID namespaces are kept distinct.
- Provenance/import-sync is named at **shape level only**; no concrete integration, format, or sync
  cadence is designed; the canonical `DocStructurePlan` split question is cross-referenced (not
  restated).
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This part's frame ([`../frames/w4-s8-work-source-provider.md`](../frames/w4-s8-work-source-provider.md)).
- The authored design_target (the Work source section of `docs/design/contracts/providers.md`).
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story authors a real
jig provider seam (the Work source provider, the seam that keeps the validated plan jig's one hard
input), so the full frame → author → design-review pass applies, not the light method Wave 0 used for
its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `ports-and-adapters`, `ddd_depth` `ports-and-adapters` per D-002). This part's
   build-time frame at [`../frames/w4-s8-work-source-provider.md`](../frames/w4-s8-work-source-provider.md)
   seeds it; the session confirms and extends the `AgreedSystemModel` rather than starting from
   nothing.
2. author-technical-design → the deepened Work source section of `docs/design/contracts/providers.md`,
   preserving and citing the existing Owns/Interface/Notes/Diagram (including the already-verbatim
   never-bypasses-plan sentence) as the seed; `w4-s2`'s `PlanValidator` boundary cited read-only.
3. review-technical-design → three lenses (architecture-enforceability: no work item reaches the
   runner except through the validated plan; the port never becomes a second scheduling input;
   provenance/import-sync is named at shape level only. domain-correctness: the provider reconciles to
   STACK / CFG-4 / CFG-7 and names its never-bypasses-plan candidate — flagged for dedup — without
   redefining core policy/evidence/authorization/state; agreement-integrity: nothing contradicts the
   part frame's `AgreedSystemModel`, Wave 3's Work source port shape and its own candidate invariant,
   or `w4-s2`'s `PlanValidator` boundary; the dedup flag is preserved, not resolved). Dispositions
   recorded into this wave's [`../decisions.md`](../decisions.md); settled = zero open blocking
   suggestions.

Handoff: when settled, update status and note the resolved design_target in the track's future
traceability matrix; **hand the never-bypasses-plan candidate forward for U9 dedup with Wave 3's own
candidate of the same name** (both wordings side by side, one invariant not two); carry the
`DocStructurePlan` split status forward for the U9 nav-doc pass.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place, shared file), this story deepens the **Work source section** of
`docs/design/contracts/providers.md` directly — preserving and citing its existing Owns/Interface/
Notes/Diagram (including the already-verbatim never-bypasses-plan sentence) as the seed — rather than
authoring a new sibling doc. This is the STOP-003-compliant "re-project and cite." Whether the file
later splits into `contracts/providers/work-source.md` and siblings is the **OPEN `DocStructurePlan`
question** (D-006) stated canonically in `w4-s5`'s story; the future `author-technical-design` session
may relocate the target via that plan. This brief records the resolved target, not a frozen path.
