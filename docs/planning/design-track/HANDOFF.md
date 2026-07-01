# Continuation handoff — jig deep-design planning track

A working handoff for the next agent (Codex) to continue this track **in the same git tree, on the
same branch, under the same policy**. This file is a runbook, not a design artifact; delete or
supersede it once the track reaches U9.

---

## 0. Immediate next action

**Run the Wave 4b per-unit review — it was NOT run before commit** (the user asked to stop and hand
off). Everything through Wave 4b authoring is committed; the 4b build-time QA review is the one
skipped step. **Resume at the review agent, then spawn an implementer and reuse it to fix the
findings, and finish the full review → fix → re-verify → commit loop BEFORE proceeding to Wave 5.**
Then continue with Waves 5 → 6 → U9. Full runbook in §7.

---

## 1. Where to work

- **Repo:** `/Users/aryekogan/repos/agentic-workflow-kit/jig` (a git repository).
- **Branch:** `docs/design-track-planning` (already checked out). Work here.
- **Local only: no push, no PR.** One `docs:` commit per approved unit. Conventional commit subjects
  (`docs:`), no attribution footers, no emojis anywhere.
- **Docs-only.** This track writes planning scaffolding under `docs/planning/design-track/`; it does
  **not** author the real design docs, code, schemas, or TypeScript.

## 2. The governing plan (authoritative — do not re-expand)

`/Users/aryekogan/.claude/plans/enumerated-kindling-raccoon.md` is the source of truth for the wave
list, roles, orchestration protocol, and commit protocol. Read it; do not re-derive or re-scope it.
It governs. This handoff summarizes state and policy but the plan wins on any conflict.

## 3. Orchestration policy (the per-unit loop)

Per wave/unit, in DAG order:

1. **Frame** — an implementer (sonnet, high effort) runs the `frame-technical-design` skill for the
   wave's part(s), reading jig sources + prior waves' committed frames, writing `frame.md` (or, for
   Wave 4, one frame per part under `frames/`) and returning an `InputResolution`. Wave 4 is framed
   **per part**; earlier waves used one `frame.md`.
2. **Frame gate (coordinator)** — resolve each `InputResolution` item from source where one narrow
   reading holds; **escalate only genuine forks to the user**; record every disposition as `D-###` in
   the wave's **coordinator-owned** `decisions.md`.
3. **Author** — SendMessage the **same** implementer to author the wave charter (`README.md`,
   `status: charter draft`) + story briefs (`status: designed`) seeded by the frame(s). A
   `story-dag.md` is written **only where internal author-time `depends_on` earn it** (Wave 4a had
   one; Wave 4b did not).
4. **Per-unit review (build-time QA)** — an **independent** reviewer (sonnet, xhigh) applies the
   `review-technical-design` skill's three lenses (architecture-enforceability, domain-correctness,
   agreement-integrity) **at scaffold/frame altitude** + the plan's planning checklist. It returns
   structured findings (blocking / recommended / nit) + a verdict.
5. **Disposition + fix** — coordinator records findings as `D-###` in `decisions.md`. Any **blocking**
   finding is fixed by routing through the **same implementer** via SendMessage, then re-verified by
   the **same reviewer**. APPROVE = zero open blocking findings. 5-round cap → block + escalate.
6. **Commit** — on APPROVE, coordinator commits the unit (`docs:` subject), one unit per commit.

**Coordinator boundary (critical):** the implementer authors `frame`/charter/stories; the coordinator
authors **only** `decisions.md` and does **git only**. The coordinator **never hand-edits authored
content** — even a one-word/mechanical fix routes back through the implementer. (Running `pnpm format`
over the tree is a mechanical gate step, not authoring, and is fine.)

**Roles / sizing:** implementer = sonnet/high; per-unit reviewer = sonnet/xhigh; milestone reviewer =
opus/xhigh (U9 only — see §4). Background sub-agents give an `agentId` for SendMessage continuity; they
go idle after reporting and can be resumed with SendMessage (a fresh `Agent` call starts a new context).

## 4. Gates: which run, which are skipped

- **Per-unit review runs every wave.** (Wave 4b's is the one outstanding — §7.)
- **Milestone opus gates after W1 / W2 / W3 are SKIPPED** (user instruction). Do not run them.
- **Only U9 keeps its opus/xhigh review.** Cross-wave coherence is therefore checked **once, at U9** —
  the U9 owner reconstructs from every wave's `decisions.md`. The U9 open-items ledger is §9.

## 5. Conventions (hard rules)

- No emojis. House voice, terse. Diagrams in Mermaid, fenced ` ```mermaid `, with a `%%{init}%%`
  theme block, colored subgraphs, and `classDef` category colors; no committed image assets.
- Source references are inline-code repo-relative paths (e.g. `docs/design/core/records.md`). Markdown
  links **only** for sibling `../wave-N-*/…` frames/decisions and same-directory files.
- Escape `|` inside markdown table code spans as `\|`.
- **`INV-*` ledger continues from `INV-009`** — never reset, never reuse `INV-001..008` (from
  `docs/design/notes/runtime-design-m5a.md`). New invariants across Waves 2-4 are **`INV-009`+
  CANDIDATES, un-numbered** — they are reconciled and hard-numbered **once, at U9**, settled by
  `docs/design/conventions.md`'s continuation rule. ADRs continue from 0017.
- **Three ID namespaces kept distinct:** product IDs (`docs/product/guarantees.md`) / `INV-*` /
  M5a handoff categories (`SURF/DEL/CTX/ENF/FAIL/OBS/SEQ/VAL`). Never invent new product IDs.
- **`D-###` IDs are wave-scoped:** a cross-wave reference names the wave ("Wave 3's D-002",
  "Wave 4a's D-005"), never a bare `D-###`.
- **STOP-003 deepen-in-place:** design targets that are existing `status: draft — stub` docs are
  deepened **in place** by the future author session (re-project and cite the existing seed, never
  overwrite). The two v0 contracts (`execution-plan-contract-v0.md`,
  `observability-records-contract-v0.md`, `status: draft — contract shape`) are **cited, unfrozen** —
  never a design target, never edited.
- `reconciles_to` frontmatter must enumerate the **exact** product IDs a story owns — no `..N` ranges
  that imply unowned IDs (this was Wave 4a's F-1 finding; Wave 4b applied the lesson).

## 6. Committed state (branch `docs/design-track-planning`)

| Commit    | Unit                                                               |
| --------- | ------------------------------------------------------------------ |
| `86f9ffc` | U0 scaffold + Wave 0 charter/stories                               |
| `60fca2a` | Wave 1 domain (frame + charter + 2 stories)                        |
| `c81bead` | Wave 2 state-machines (frame + charter + 3 stories)                |
| `fae42fc` | Wave 3 ports (frame + charter + 2 stories)                         |
| `0451f4b` | Wave 4a core (4 per-part frames + charter + 4 stories + story-dag) |
| `85e9405` | Wave 4b providers (4 per-part frames + charter + 4 stories)        |

Waves 0-4a went through the full loop (framed, gated, authored, per-unit-reviewed, committed). **Wave
4b was framed, gated, authored, and committed but NOT per-unit-reviewed** — see §7.

Modes/depths so far: W1 `system-entity-model`/`strategic-only`; W2 `lifecycle/state-machine`/
`use-case-slices`; W3 `ports-and-adapters`/`ports-and-adapters`; W4a s1/s2/s3 `tactical-ddd`/
`tactical-ddd`, s4 `control-plane/runtime`/`ports-and-adapters`; W4b s5/s7/s8 `ports-and-adapters`/
`ports-and-adapters`, s6 `tactical-ddd`/`tactical-ddd` (the one escalated provider — closes Wave 3's
and Wave 4a's forecast that the concurrency/provider-adapter tactical axis lands in Wave 4b).

## 7. IMMEDIATE PENDING — Wave 4b per-unit review (resume here)

Not run before commit, at the user's instruction. **This is exactly where you (Codex) pick up: start
at the review agent, then spawn-and-reuse an implementer to fix findings, and complete the whole
review → fix → re-verify loop BEFORE proceeding to Wave 5.** Do not start W5/W6/U9 until Wave 4b is
APPROVE (zero open blocking findings).

Note on agent reuse: this session's sub-agents are gone — you spawn your **own** reviewer and your
**own** implementer. The reuse discipline is about a single continuous agent context within this fix
loop, not the original author. So:

1. **Reviewer (spawn one).** Dispatch an **independent** reviewer (sonnet, xhigh) over
   `docs/planning/design-track/waves/wave-4b-providers/` — the charter (`README.md`), the four stories,
   and the four `frames/`, checked against the four frames, `wave-4b-providers/decisions.md`
   (D-001..D-006), and the cited jig sources.
2. **Lenses + checks.** Apply the three `review-technical-design` lenses at scaffold altitude + the
   planning checklist. Verify specifically: depths match D-002 (s5/s7/s8 `ports-and-adapters`, s6
   `tactical-ddd`) and are valid `frame-technical-design/SKILL.md` enums; the **boundary rule** is
   stated in every story (providers consume Wave 4a contracts read-only, never redefine core
   policy/evidence/authorization/state); the **SEC-2 three-way boundary** (D-003) is worded identically
   in s6's frame and story, with Wave 5 / U9 named as forward references; the **s6↔s5 containment seam**
   is worded identically; the **s8 INV dedup flag** (D-005: work-source-never-bypasses-plan likely ==
   Wave 3's candidate, recorded side-by-side, not merged/duplicated) is present; `depends_on: []` on all
   four with the D-006 contention rationale; **no `story-dag.md`** (correct per D-006); `reconciles_to`
   uses exact IDs (no ranges); `INV-002` cited not re-minted (s5); three ID namespaces distinct; house
   conventions.
3. **Disposition (coordinator = you).** Record findings as `D-007`+ in `wave-4b-providers/decisions.md`
   (replace the "PENDING — deferred" note at the bottom of that file with the actual dispositions).
   `blocking` → fix; `recommended`/`nit` → fix if cheap else `defer` with rationale (Wave 4a's F-1 is a
   worked example of dispositioning a recommended finding).
4. **Implementer (spawn ONE, then REUSE it).** For every fix — blocking or accepted-recommended — spawn
   a single implementer (sonnet, high) and **reuse that same agent** (SendMessage / `resumedAgentId`)
   for all fix rounds this loop. **You (coordinator) never hand-edit authored content** — the reviewer
   found it, the implementer fixes it, you only edit `decisions.md` and run git. Give the implementer
   the finding + file/line + the exact resolved intent; have it return a before/after.
5. **Re-verify.** Resume the **same reviewer** (not a fresh one) to re-check just the changed content →
   APPROVE. Loop 3→5 until zero open blocking (5-round cap → block + escalate to the user).
6. **Commit.** `eval "$(fnm env)" && corepack pnpm format && corepack pnpm check` green, then commit as
   a follow-up `docs:` unit (e.g. `docs: apply Wave 4b per-unit review fixes`). If the review is clean
   (zero blocking, nothing to fix), just record APPROVE in `decisions.md` and commit that log update.
   **Only after this commit do you move to Wave 5.**

## 8. Remaining waves (after the 4b review)

Per the plan (§ "Waves and stories") — frame → gate → author → per-unit review → commit each:

- **Wave 5 — red team** (`waves/wave-5-red-team/`): stories `w5-s1-authority-and-provider-red-team`,
  `w5-s2-recovery-records-integration-red-team`. Light frame (stresses/probes the design settled by
  Waves 1-4; introduces no new entities). **Wave 5 authors the full phone-home / SEC-2 adversarial
  scenario** that Wave 4b's `w4-s6` deliberately deferred to it (Wave 4b's D-003).
- **Wave 6 — implementation phasing** (`waves/wave-6-*/`): story `w6-s1-implementation-phasing`. Light
  frame (sequences, does not introduce entities).
- **U9 — integration** (the final unit): author `docs/planning/design-track/dependency-dag.md`,
  `waves.md`, `traceability.md` (product-ID ↔ design file ↔ owning story ↔ invariant-ID matrix — the
  orphan check), `review-and-red-team.md` (checklists + red-team scenarios, **collects Wave 5's SEC-2
  findings**), plus the light discoverability edits (`docs/README.md` planning row;
  `docs/design/README.md` pointer). **U9 keeps its opus/xhigh review** (the only surviving milestone
  gate) and reconstructs cross-wave coherence from every wave's `decisions.md`.

## 9. U9 open-items ledger (things deliberately deferred to the integration pass)

Reconcile all of these at U9 — they are recorded across the wave `decisions.md` files:

- **`INV-009`+ hard-numbering.** Every wave from W2 on minted un-numbered candidates. Collect and number
  them once, settled by `docs/design/conventions.md`'s continuation rule. Known candidates: W2 (`w2-s3`
  catalog); W3 (port-boundary candidates); W4a — s1 write-conflict-rejected, replay-determinism; s2
  evidence-observed-not-self-reported, rule-governing-surface-forces-pause; s3
  fail-closed-on-undeclared-request, category-boundary-fixed-not-adjudicated,
  escalation-survives-interruption; s4 binding-record-append-precedes-run-readiness,
  resume-re-entry-preserves-original-binding; W4b — s6 containment-proven-not-asserted,
  isolation-strength-honestly-reported; s8 work-source-never-bypasses-plan **(dedup: likely identical to
  Wave 3's own candidate of the same name — treat as ONE, not two)**.
- **GUARD-2 thread (Wave 4a D-003).** GUARD-2's `done`-guard pause point was newly named in Wave 4a
  (owned s2 rule / s3 enforcement / Wave 2 lifecycle pause point), but Wave 2's committed
  `w2-s1-work-item-lifecycle` story predates it — U9 traceability must thread it (or a future Wave 2
  re-projection adds the guard check). The residual "distinct re-approval-pending sub-state vs. reuse
  `parked`" question is an author-session decision, left open.
- **SEC-2 collection (Wave 4b D-003).** Ensure `review-and-red-team.md` actually collects `w4-s6`'s
  SEC-2 design posture **and** Wave 5's phone-home scenario, so SEC-2 neither duplicates W5 nor orphans.
- **Provider file split (Wave 4b D-006).** The four provider designs currently share
  `docs/design/contracts/providers.md`; whether they later split into
  `contracts/providers/{agent,execution-host,forge,work-source}.md` is an open `DocStructurePlan`
  question left to the future author session — not a planning-track decision.
- **Nav-doc reconciliation (Wave 4a D-006).** The `wave-4a-core/` + `wave-4b-providers/` two-directory
  split diverges from any single "Wave 4" row; U9 owns finalizing `waves.md` and `dependency-dag.md`.
- **Orphaned-ID owners (Wave 4b D-004).** STACK-2/4, DRIVE-1/3, SEC-2, EARN-2 were assigned owners
  across s5-s8; U9 traceability confirms none orphan.

## 10. Gate mechanics

- Gate command: **`pnpm check`** (prettier over `**/*.{md,yml,yaml,json}`). Node is via `fnm`, pnpm via
  corepack:
  ```
  eval "$(fnm env)" && corepack pnpm check
  ```
  `corepack pnpm format` writes fixes. Run `format` then `check` before every commit; show the green
  output as evidence.
- The `technical-design` skill pack lives at
  `~/repos/agentic-workflow-kit/technical-design/skills/{frame,author,review}-technical-design/` —
  frames use `frame-technical-design`; per-unit reviews use `review-technical-design`.
