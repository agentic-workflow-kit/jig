---
title: "Wave 4b frame — w4-s8: the Work source provider (where work items originate)"
status: draft — frame (intake)
methodology: ddd
---

# Problem Frame — Wave 4b, s8: Work source provider

> Intake artifact for the DDD-first deep-design track's Wave 4b, part 4 of 4. It frames the
> **Work source provider** — where work items originate and may supply provenance/scheduling
> input — the fourth of four PROVIDER parts this wave deepens. Produced by applying the
> `technical-design` pack's `frame-technical-design` skill; the next stage is
> `author-technical-design`, gated on this frame's approval status. Authored alongside three
> sibling frames (`w4-s5-agent-provider.md`, `w4-s6-execution-host-provider.md`,
> `w4-s7-forge-provider.md`) in one pass for mutual coherence.
>
> This frame consumes [Wave 3's ports frame](../../wave-3-ports/frame.md) (the Work source port's
> candidate anti-corruption stance: "this port may supply provenance or import/sync behavior, but
> never bypasses `PlanValidator` — no work item reaches the runner except through the validated
> plan") and Wave 4a's committed [`w4-s2-plan-policy-evidence`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)
> frame (plan intake's parse/validate/reject mechanics this part's supplied instances must still
> pass through, cited not redesigned).

## 1. Scope and Goal

- **Source request:** deep-design track, Wave 4b, story 4 — deepen the **Work source port's**
  section of `docs/design/contracts/providers.md` in place: where work items originate, the
  provenance/scheduling input it may supply, and the **work-source-never-bypasses-plan**
  invariant — no work item reaches the runner except through the validated plan.
- **Goal:** produce an `AgreedSystemModel` for the Work source provider clean and citable enough to
  seed this wave's charter and story brief, coherent with the three sibling parts, and precise
  about the never-bypasses-plan invariant's relationship to Wave 3's own `PlanValidator` boundary.
- **Out of scope for this part:** the Work source port's method signature (Wave 3 already
  candidate-named it, cited not redesigned); the `PlanValidator` port's parse/validate/reject
  mechanics or the policy/evidence model (`w4-s2`, cited — this part supplies candidate work items
  or provenance, `w4-s2` owns validating and gating what becomes part of a plan); the scheduling
  decision itself — which validated work items are eligible to run next (Wave 2's Orchestration,
  cited, unchanged); any concrete origin-system integration choice (an external tracker's API
  shape, a file format) beyond naming the seam; field-level schema, TypeScript, or JSON Schema;
  package/module layout.

## 2. Source Map

| Source                                                                                                               | Authority                                                      | Establishes                                                                                                                                                                                                                                                                                                                                                                                                | Gaps / stale risk                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`docs/design/contracts/providers.md`](../../../../design/contracts/providers.md)                                    | authoritative — design stub (this part's shared design target) | `status: draft — stub`; the Work source port's Owns/Interface rows: "abstracts where work items originate. It may supply provenance or future import/sync behavior, but the validated execution plan remains jig's only runtime scheduling input; the Work source seam never bypasses the plan"                                                                                                            | Port-skeleton altitude only; the never-bypasses-plan sentence already exists verbatim in the stub — this part deepens the mechanism and candidate invariant behind that sentence, it does not invent the sentence itself |
| [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) + [`decisions.md`](../../wave-3-ports/decisions.md)     | authoritative — prior-wave frame (seed) and decision log       | The Work source port's candidate anti-corruption stance and candidate invariant: "the invariant that the Work source port never becomes a second, competing scheduling input alongside the plan; the requirement that anything it supplies still passes through plan validation"; Wave 3 explicitly names this as a **candidate invariant**, not yet numbered                                              | This part's own `INV-009`+ candidate is very likely the same candidate Wave 3 already named — this frame must flag the dedup risk explicitly, not silently mint a second, near-identical candidate                       |
| [`../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md) | authoritative — committed sibling-wave frame (seed)            | Plan intake's "parse/validate/reject mechanics... produces a `ValidatedPlan`"; "validation happens once, at the boundary; nothing downstream re-validates plan shape" (Wave 3, carried forward)                                                                                                                                                                                                            | Confirms this part's supplied work items or provenance must still cross `w4-s2`'s validation boundary — this part does not get a shortcut                                                                                |
| [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md)                                                       | authoritative — prior-wave frame (seed)                        | Work item's authored facts (identity, dependencies-as-declared, done-conditions-as-declared) as the plan-side view; Execution plan as jig's one hard input per track                                                                                                                                                                                                                                       | Grounds why a work-source-supplied item is only a _candidate_ until it is folded into and validated as part of the plan                                                                                                  |
| [`docs/product/guarantees.md`](../../../../product/guarantees.md)                                                    | authoritative — ID spec                                        | STACK-1/2/4/5 (vendor independence; four swappable seams; attested-not-assumed; authority boundary); CFG-4 ("the actual is computed, not hand-set... Jig derives what can safely run from policy and the plan's current eligible work" — the plan, not any work source, is the scheduling input); CFG-7 (open seams — "story sources" named explicitly as an extension point owners/tool builders may add) | Outcome-level commitments this part's never-bypasses-plan stance reconciles to                                                                                                                                           |
| [`docs/product/concepts.md`](../../../../product/concepts.md)                                                        | authoritative — product                                        | The track model: PRD → design → plan → policy → work profile per track — the plan is the one artifact the runtime consumes; work-item provenance is upstream of and optional relative to the plan (per `jig.md`'s framing of the plan as jig's one hard input)                                                                                                                                             | Confirms the work source sits upstream of jig's runtime boundary, never inside it                                                                                                                                        |
| [`AGENTS.md`](../../../../../AGENTS.md) (jig repo root)                                                              | authoritative — repo contract                                  | Jig owns the execution-plan contract as jig's one hard input boundary; the boundary rule                                                                                                                                                                                                                                                                                                                   | The work source must not become a second hard input competing with the plan                                                                                                                                              |

## 3. InputResolution

| Required input                                                                                                                                                                                         | Source evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Owner / impact                                                                                                                                       | Approval status                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Placement:** deepen `contracts/providers.md`'s Work source section in place, or relocate?                                                                                                            | Coordinator's brief assigns the same shared-file target as all four Wave 4b parts; Wave 4a's D-001 precedent                                                                                                                                                                                                                                                                                                                                                                                                                            | **provided** (not a fork) — deepen in place, preserving and citing the existing Owns/Interface (including the already-verbatim never-bypasses-plan sentence) as seed. The split-vs-single `DocStructurePlan` question is named identically to `w4-s5`'s frame (cross-referenced, not repeated here).                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `docs/design/contracts/providers.md` (Work source section) design_target                                                                             | approved                                          |
| **INV-009+ candidate dedup:** does this part mint its own new candidate for "work-source-never-bypasses-plan," or does it need to dedup against Wave 3's own candidate naming the identical invariant? | The coordinator's mandate explicitly asks this part to "carry the work-source-never-bypasses-plan invariant... as a candidate INV-009+ for this part." Wave 3's own committed frame already names, verbatim, an almost-identical candidate: "the invariant that the Work source port never becomes a second, competing scheduling input alongside the plan; the requirement that anything it supplies still passes through plan validation" — recorded in Wave 3's AgreedSystemModel for the Work source port entity, not yet numbered. | **requires approval, flagged not resolved** — this part names the candidate per the coordinator's mandate, but explicitly flags that it is very likely the **same candidate** Wave 3 already surfaced, not a second, independent one. This frame does **not** silently merge or silently duplicate; it records both citations side by side (Wave 3's wording and this part's restatement) and defers the dedup decision to whichever session consolidates `INV-009`+ numbering first (per the established cross-wave practice: Wave 2's `w2-s3`, Wave 3's own un-numbered candidates, Wave 4a's D-005 posture, and now this part) — consistent with the U9 traceability pass being the single place all un-numbered candidates from every wave get reconciled without collision. | The `INV-009`+ candidate ledger's eventual numbering; U9's reconciliation pass must treat Wave 3's and this part's wording as one candidate, not two | pending (flagged for U9, not blocking this frame) |
| **Provenance/import-sync scope:** how much of "may supply provenance or future import/sync behavior" does this part design now, versus name as a further-deferred extension point?                     | `providers.md`'s existing sentence already permits provenance/import-sync behavior at the port-skeleton level, but supplies no mechanism, format, or sync cadence. No source names a concrete work-source integration (no external tracker, no file format) as already decided.                                                                                                                                                                                                                                                         | **safe assumption** — this part names the _shape_ of the seam (a work source may supply candidate work items and/or provenance metadata, which the owner or an upstream planning process folds into the authored plan) without designing any concrete integration, sync mechanism, or format; those remain further-deferred extension points, consistent with the fact that even the Agent port — the wave's one seam with a built adapter — has no adapter built at the Work source seam. Risk: low, directly consistent with the existing stub's own deferred-extension-point posture and the track's Stub rule.                                                                                                                                                               | This part's Owns row; future extension-point content, not this wave's                                                                                | not required                                      |

### Blocking Questions

None. The dedup question is flagged, not blocking — it is explicitly deferred to a future
reconciliation pass, consistent with how every prior wave has treated its own un-numbered
`INV-009`+ candidates.

### Safe Assumptions

- Provenance/import-sync behavior is named at shape level only; no concrete integration or format
  is designed this wave.
- Placement (deepen `providers.md`'s Work source section in place) is settled, not reopened.

## 4. AgreedSystemModel

### Source Inputs Used

| Source                                                    | Establishes                                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/design/contracts/providers.md`                      | The existing stub this part deepens (Work source section): the already-verbatim never-bypasses-plan sentence, provenance/import-sync allowance |
| `../../wave-3-ports/frame.md`, `decisions.md`             | The candidate anti-corruption stance and Wave 3's own near-identical candidate invariant wording (flagged for dedup)                           |
| `../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md` | Plan intake's validate-once-at-the-boundary discipline this part's supplied items must still cross                                             |
| `../../wave-1-domain/frame.md`                            | Work item's authored facts; Execution plan as jig's one hard input                                                                             |
| `docs/product/guarantees.md`                              | STACK-1/2/4/5, CFG-4, CFG-7                                                                                                                    |
| `docs/product/concepts.md`                                | The track model; the plan's upstream-optional provenance                                                                                       |
| `AGENTS.md`                                               | The boundary rule; the plan as jig's one hard input                                                                                            |

### Unresolved Required Inputs

- INV-009+ candidate dedup against Wave 3's own near-identical candidate (flagged, deferred to U9 —
  see §3).

### High-Level System Entities

| Entity                                                           | Responsibilities                                                                                                                                                                                                   | Owns                                                                                                                                                                                                                                             | Reads                                                                                                                                                                   | Does Not Own                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Work source port (deepened)**                                  | Where work items originate: may supply candidate work items and/or provenance metadata, and may support future import/sync behavior, without ever becoming a second scheduling input alongside the validated plan. | The candidate origination/provenance surface; the structural discipline that anything it supplies must still cross `PlanValidator` before the runner ever sees it (the never-bypasses-plan invariant, candidate, flagged for dedup with Wave 3). | The execution plan's authored shape (Wave 1, cited) that any supplied item must ultimately be folded into; `PlanValidator`'s validate-once discipline (`w4-s2`, cited). | The scheduling decision itself (Orchestration's eligibility resolver, Wave 2, cited); the plan-validation act (`w4-s2`, cited); any direct handoff of a work item to the runner that skips the validated-plan boundary — structurally forbidden. |
| **Never-bypasses-plan invariant (candidate, flagged for dedup)** | The structural guarantee that no work item reaches the runner except through the validated plan, regardless of how many work sources exist or what provenance they supply.                                         | Nothing new by itself — this is a candidate invariant statement, not a mechanism; the mechanism is `PlanValidator`'s existing validate-once boundary (`w4-s2`, cited).                                                                           | —                                                                                                                                                                       | Its own numbering (deferred to U9 reconciliation with Wave 3's near-identical candidate).                                                                                                                                                        |

### Relations

| From             | Relation                        | To                                                                    | Notes                                                                                                                              |
| ---------------- | ------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Work source port | supplies (never bypasses)       | `PlanValidator` (`w4-s2`, cited)                                      | Candidate work items or provenance metadata still cross validate-once-at-the-boundary; no direct handoff to the runner             |
| `PlanValidator`  | produces                        | `ValidatedPlan` (Wave 1/Wave 2/Wave 3, cited)                         | Consumed by Orchestration; unchanged from prior waves                                                                              |
| Work source port | never competes with             | Execution plan as jig's one hard scheduling input (CFG-4, cited)      | The structural anti-corruption stance this part's candidate invariant states                                                       |
| Work source port | emits (candidate events, cited) | Records engine (`w4-s1`, if a supplied item's provenance is recorded) | This part does not define the log's consistency model; provenance-as-event is named as a plausible future shape, not designed here |

### Seams and External Boundaries

- **The Work source port** (Wave 3, candidate-named, cited) — this part deepens the candidate
  origination/provenance shape behind the port, not the port's own method signature.
- **The never-bypasses-plan boundary (s8 ↔ `w4-s2`'s `PlanValidator`)** — anything this port
  supplies must still cross plan validation; no shortcut. Flagged: this boundary's invariant
  wording is very likely identical to a candidate Wave 3 already named — recorded for U9
  reconciliation, not resolved here.
- **The scheduling boundary (s8 ↔ Wave 2)** — this part never decides what is eligible to run
  next; that stays Orchestration's, cited unchanged.
- **The provenance/import-sync extension point** — named at shape level only; no concrete
  integration, format, or sync mechanism designed this wave.

### Lifecycle and State Terms

This part introduces no new lifecycle states. Its only lifecycle-adjacent vocabulary, unchanged
from Wave 3, is the point at which a work source's supplied item (if any) must cross
`PlanValidator` before the plan's declared work-item set (Wave 1, cited) is available to
Orchestration's eligibility resolution (Wave 2, cited).

### Mode and Depth

- **architecture_mode:** `ports-and-adapters` (recommended, requires approval — see §3)
- **initial ddd_depth:** `ports-and-adapters` (recommended, requires approval — see §3)

### Open Questions and Approval

- Depth confirmation (`ports-and-adapters`, recommended — see §3, restated below).
- INV-009+ candidate dedup against Wave 3's own near-identical candidate — flagged, deferred to
  U9, not blocking.
- `DocStructurePlan` split-vs-single question, shared with `w4-s5`'s open item (not repeated here).
- **Approval status: pending (coordinator)** on depth; dedup flag noted for U9.

## 5. Assumptions and Blockers

(Restated from §3 for template completeness.)

### Safe Assumptions

- Provenance/import-sync behavior named at shape level only, no concrete integration designed.
- Placement settled, not reopened.

### Blocking Questions

None.

## 6. DDD Context Candidates

| Candidate context                    | Owns                                                                                                                                   | Reads                                                                                         | Does Not Own                                                                                                                   | Open ownership question                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Work source provider** (this part) | The candidate origination/provenance surface; the never-bypasses-plan structural discipline (candidate, flagged for dedup with Wave 3) | The execution plan's authored shape (cited); `PlanValidator`'s validate-once boundary (cited) | The scheduling decision (Wave 2); the plan-validation act (`w4-s2`); any concrete origin-system integration (further deferred) | INV-009+ dedup with Wave 3 (flagged for U9); depth confirmation (requires approval) |

## 7. Complexity Drivers

- **Invariants:** the never-bypasses-plan structural guarantee (candidate, flagged for dedup with
  Wave 3's own near-identical candidate — see §3); CFG-4 (the plan, not any work source, is the
  computed scheduling input); STACK-1/2/4/5; CFG-7 (open seams, story sources named as an explicit
  extension point). New candidates for `INV-009`+: work-source-never-bypasses-plan — this part's
  restatement, explicitly flagged as likely identical to Wave 3's own un-numbered candidate, not a
  second independent one; both wordings recorded for whichever session consolidates first.
- **State transitions:** none new — this part sits upstream of the plan-validation boundary Wave
  1/2/3 already established.
- **Integrations / anti-corruption:** the entire deliverable at this altitude — isolating the
  runtime's one hard scheduling input (the validated plan) from however many work sources exist or
  whatever provenance they supply, so none becomes a second, competing input.
- **Consistency / idempotency / replay / audit:** none new this part authors directly; if a
  supplied item's provenance is ever recorded, it is an event into `w4-s1`'s log (cited), whose
  consistency model this part does not define.
- **Security / authorization:** none new — this seam does not touch credentials, authorization, or
  containment; it is the wave's least security-sensitive part by construction (no execution, no
  push authority, no worker containment).
- **Migration / deploy:** none — docs-only frame; no schema freeze, no package layout, no concrete
  origin-system integration.
- **Observability:** if provenance is recorded, it is an event into the Records engine (`w4-s1`,
  cited); this part must not mint new event-family names beyond the v0 contract's list, and does
  not design the mechanism this wave.
- **Testing:** none at this altitude; the future story brief's `ports-and-adapters` depth carries
  forward a contract-test expectation (any work-source adapter, however many exist, must be held
  to the same never-bypasses-plan contract).

## 8. Architecture Mode and Initial DDD Depth

**Selected architecture_mode:** `ports-and-adapters` (recommended)

**Why this mode fits:** this part's deliverable is anti-corruption isolation over an
already-candidate-named port (Wave 3) — keeping the validated plan as jig's one hard scheduling
input regardless of how many work sources exist, exactly the ladder's discriminator for this mode.
It authors no new consistency model, concurrency property, or fail-closed classifier of its own —
it is, if anything, the wave's thinnest seam (no built adapter exists even at design-shape level
beyond the port-skeleton sentence already in `providers.md`).

**Selected depth:** `ports-and-adapters` (recommended)

**Why this depth fits:** the ladder's required elements — "adapter responsibilities, composition/
wiring boundary, contract tests or mocks that are held to the real seam" — describe this part's
deliverable precisely: the candidate origination/provenance shape and the future contract-test
expectation that any work-source adapter respects the never-bypasses-plan boundary. This part does
not escalate to `tactical-ddd`: Wave 3's D-002 keyed that escalation to concurrency (ISO-4,
`w4-s6`'s territory) and real provider adapters generally; this seam has no built adapter and no
provider-owned invariant beyond the structural guarantee it inherits from `PlanValidator`'s
existing validate-once discipline (`w4-s2`, cited).

**Where tactical depth is intentionally omitted:** no aggregate, value-object, or domain-event
ceremony for the Work source port; the never-bypasses-plan guarantee is enforced entirely by
`PlanValidator`'s existing boundary (`w4-s2`'s territory) — this part names the guarantee as a
candidate invariant for the port, it does not author a new mechanism or consistency model to
enforce it.

## 9. Handoff to Author

- **Design artifact target:** `docs/design/contracts/providers.md` (Work source section, deepen in
  place). Split question shared with `w4-s5`'s open `DocStructurePlan` item, not repeated here.
- **Required methodology profile:** `ddd`.
- **Approval status:** pending — one item requires coordinator resolution: depth confirmation
  (`ports-and-adapters`, recommended, matching `w4-s5`/`w4-s7`).
- **Delivery constraints to preserve:** continue the existing vocabulary — this part's candidate
  (work-source-never-bypasses-plan) is an **INV-009+ CANDIDATE**, explicitly flagged as likely
  identical to Wave 3's own un-numbered candidate of the same name — record both citations, do not
  silently merge or silently duplicate; resolve at the U9 pass. Keep the three ID namespaces
  distinct. Preserve and cite `providers.md`'s existing Work-source-section content (including the
  already-verbatim never-bypasses-plan sentence) as this part's seed. Do not design a concrete
  origin-system integration, format, or sync mechanism this wave — name it as a further-deferred
  extension point. Do not decide the `DocStructurePlan` split-vs-single question — it is recorded
  as open in `w4-s5`'s frame, shared across all four parts.
