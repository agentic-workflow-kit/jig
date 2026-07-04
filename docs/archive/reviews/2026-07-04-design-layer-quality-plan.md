---
title: Design-layer quality pass - implementation plan
date: 2026-07-04
source_review: docs/reviews/2026-07-04-design-layer-quality-review.md
status: plan for docs-only quality pass
---

# Design-layer quality pass - implementation plan - 2026-07-04

> **Scope.** This plan turns the findings in
> [`2026-07-04-design-layer-quality-review.md`](./2026-07-04-design-layer-quality-review.md) into a
> docs-only quality pass over `docs/design/`. It is editorial, structural, and consolidation work
> only. It changes no runtime source, schema, golden record, provider manifest, or ADR history, and
> it invents no new design decision, product commitment, or invariant.

## 1. Guardrails (apply to every workstream)

- **No new decisions.** Consolidate and re-present existing design only. Anything that would require
  a genuine new decision is logged as an Open Question in the owning doc, not resolved.
- **Preserve all design content and IDs.** No invariant, product ID, ADR ID, or `SURF/CTX/DEL/...`
  reference is dropped or renumbered. Moving text is allowed; losing it is not.
- **Stay inside `docs/design/`.** Do not edit `docs/planning/`, `docs/product/`, `.github/`, `src/`,
  schemas, or golden records. Relocated bookkeeping goes to a clearly-marked appendix at the bottom
  of its own doc, or is deleted when it is pure authoring meta-narration with no durable information.
- **Keep it prettier-clean.** Run `pnpm format` (or `prettier --write`) on every edited/created file;
  the pass must pass `pnpm check`.
- **Deliberately out of scope this pass:** `charter.md` and `conventions.md` (design-process
  governance that is legitimately cited by waves - trimming them is higher-risk and deferred);
  physically relocating the `INV-*` ledger out of `notes/` (wide citation blast radius - see WS-4).

## 2. Workstreams (disjoint file ownership)

Each workstream owns a disjoint set of files so they can run concurrently without collision.

### WS-1 - Core cluster: de-scaffold, reorganize by subject, add the run-state diagram

Owns: `docs/design/core/*.md` (README, bootstrap, orchestration, authorization, plan-intake, records).

- De-scaffold `bootstrap.md`: the ~110 lines of planner-handoff scaffolding before `## Owns` (line 124) move to a bottom `## Appendix - authoring provenance` (or are deleted where pure meta), so the
  doc opens on design like its siblings.
- Reorganize the "Phase N realization" blocks in each core file so each subject's design reads in one
  place; keep the ADR citations.
- Add the missing **run-level state machine** Mermaid diagram to `orchestration.md`
  (`previewed -> started -> stopped / resumed / completed`), beside its existing transition table.
- Strip defensive / seed / wave meta-prose ("re-projection of the seed", "preserved seed remains
  authoritative", "this session/this wave") to system-facing prose. Keep the design claims.
- `core/README.md`: add the one-line pointer that the **operator surface** detail lives in
  `contracts/driving.md`.
- Fix frontmatter: `orchestration.md` `status: draft` (not `stub`).

### WS-2 - Contracts cluster: split providers, de-scaffold, fix/add diagrams

Owns: `docs/design/contracts/*.md` + new `docs/design/contracts/provider-realization-roadmap.md`.

- Split `providers.md`: keep the seam-organized contract (owns/implements/must-not for all four
  seams); move the chronological Phase 5-8 ADR-realization ledger to the new
  `provider-realization-roadmap.md`, linked from `providers.md`.
- **Redraw the stale providers seam diagram** so it matches the body (all four seams specified, with
  reference adapters), instead of labeling three "named extension point".
- `driving.md`: move the `SDK package reconciliation` / anti-corruption sections below the contract
  body; strip seed/wave narration.
- Add a **plan -> run -> records lifecycle diagram** to each data contract
  (`execution-plan-contract-v0.md`, `observability-records-contract-v0.md`).
- Consolidate the ~4x repeated "no public package/export/semver" product-posture echo to a single
  design-side pointer.
- Reorder `contracts/README.md` so the seam map/boundary list comes before the ADR-reconciliation
  caveats; fix frontmatter to `status: overview`.
- Fix `providers.md` frontmatter to a current status (drop "deepened for Phase 5").

### WS-3 - Navigation, domain discoverability, glossary

Owns: `docs/design/README.md`, `docs/design/domain/*.md`, new `docs/design/glossary.md`.

- Give `domain/` its own prose section in `README.md`, and state the overview-vs-deepening
  relationship with `core/README.md` explicitly; qualify the "Domain model" label (it covers the
  configuration and runtime/observation entity groups, not all four).
- Update the `README.md` status table to match corrected file statuses (orchestration -> draft,
  providers -> draft, contracts/README -> overview), and add rows/links for the new `glossary.md`,
  `contracts/provider-realization-roadmap.md`, and `security-model.md`.
- De-scaffold the domain docs: remove "Review evidence" session sections and wave/story coordinates;
  cut the defensive "does-not-own / not-re-homing-CTX-001 / so a future editor reads it here"
  narration to system-facing prose. Keep the entity model, relations, diagrams, and invariant
  citations.
- Create `glossary.md`: a one-page ubiquitous-language index (story = task = work item; track, plan,
  policy, work profile, repo-level floors, evidence, notice, run records, fence, doorbell, seams,
  ...), each term one line, cross-linked to the owning doc. Link it from `README.md`.

### WS-4 - Decisions index wayfinding + ADR diagrams + ledger discoverability

Owns: `docs/design/decisions/README.md`, `decisions/0027-*.md`, `decisions/0028-*.md`,
`docs/design/notes/README.md`, `docs/design/evidence/README.md`.

- `decisions/README.md`: add a **Date** column and **thematic grouping** (M5a seed 0001-0012;
  restructure 0013-0017; phase series 0018-0025; posture 0026-0028); make the cryptic titles
  legible in the index (index text only - do not rename ADR files). Do not move or renumber ADR
  files.
- Add a small Mermaid diagram to **ADR 0027** (the three-package dependency DAG) and **ADR 0028**
  (public `AgentPort` vs internal session-observable seam boundary). Consolidation of the ADR's own
  prose - no decision change.
- INV ledger: add a prominent pointer from the durable layer to the canonical `INV-*` ledger, and
  log the physical relocation as a deferred Open Question (blast radius: every `INV-*` citation).
  Do not physically move the ledger this pass.
- `notes/README.md`: name the archival-vs-live-ledger tension explicitly.

### WS-5 - Security / threat-model design view (new, consolidation only)

Owns: new `docs/design/security-model.md`.

- Consolidate the **existing** security design into one cross-cutting cut: the fence and fail-closed
  authorization, capability attestation / earned trust, anti-gaming floor, no-phone-home / isolation,
  credential ownership (runner-only), redaction, and the conformance "self-report is not proof"
  stance. Cite existing product IDs (`SEC-*`, `FENCE-*`, `GUARD-*`, `EARN-*`, `ISO-*`) and existing
  `core/` docs and ADRs (0026 especially). Invent no new control.
- Add a trust-boundary / threat-surface Mermaid diagram.
- `README.md` wiring is WS-3's job (WS-5 only creates the file).

## 3. Delegation and review

- Each workstream is implemented by a Sonnet 5 subagent (medium effort for mechanical edits, high
  effort for the reorganizations and the new security view). Workstreams run concurrently on disjoint
  files.
- The reviewer (this session) then: reads every diff, validates every new/changed Mermaid diagram,
  checks that no design content or ID was dropped and no guardrail was crossed, runs `pnpm check`,
  fixes anything, and only then opens the PR.

## 4. Done criteria

- Every finding in the review has a corresponding change or a logged deferral.
- `pnpm check` is green.
- No runtime/schema/golden/ADR-history change; no new design decision introduced.
- The design layer reads high-to-low, one subject per place, with process bookkeeping out of the
  durable docs and the missing views (glossary, security) and diagrams added.
