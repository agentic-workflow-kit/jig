---
title: "Wave 4b frame — w4-s7: the Forge provider (push / PR / merge target)"
status: draft — frame (intake)
methodology: ddd
---

# Problem Frame — Wave 4b, s7: Forge provider

> Intake artifact for the DDD-first deep-design track's Wave 4b, part 3 of 4. It frames the
> **Forge provider** — the push / PR / merge target, respecting branch protection and merge
> rules — the third of four PROVIDER parts this wave deepens. Produced by applying the
> `technical-design` pack's `frame-technical-design` skill; the next stage is
> `author-technical-design`, gated on this frame's approval status. Authored alongside three
> sibling frames (`w4-s5-agent-provider.md`, `w4-s6-execution-host-provider.md`,
> `w4-s8-work-source-provider.md`) in one pass for mutual coherence.
>
> This frame consumes [Wave 3's ports frame](../../wave-3-ports/frame.md) (the Forge port's
> candidate anti-corruption stance: invoked exclusively by the runner, never the worker) and
> Wave 4a's committed frames — especially
> [`w4-s2-plan-policy-evidence`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md) (Policy
> owns merge-sufficiency content; this part respects, never redefines, it) and
> [`w4-s1-records-observability`](../../wave-4a-core/frames/w4-s1-records-observability.md) (the
> records surface this part's landing/block events feed).

## 1. Scope and Goal

- **Source request:** deep-design track, Wave 4b, story 3 — deepen the **Forge port's** section of
  `docs/design/contracts/providers.md` in place: the concrete code-host integration surface (push,
  open a PR, merge), respecting a forge's own branch-protection and merge-queue semantics, and how
  a block surfaces as a real PR with failure reasons (MERGE-5).
- **Goal:** produce an `AgreedSystemModel` for the Forge provider clean and citable enough to seed
  this wave's charter and story brief, coherent with the three sibling parts, and consistent with
  the runner-exclusive-invocation invariant Wave 3 already named.
- **Out of scope for this part:** the Forge port's method signature (Wave 3 already candidate-
  named it, cited not redesigned); whether evidence is sufficient to land — that is Policy's,
  `w4-s2`'s territory, cited; the done-vs-landed distinction's own definition (Wave 1's D-003,
  Wave 2's closed transition table — this part only implements the `land` operation those
  decisions already govern); who may invoke this port (Wave 3 already settled: the runner only,
  never the worker — this part inherits, does not re-derive); GUARD-2's rule-governing-surface
  detection (`w4-s2`/`w4-s3`, cited — this part does not detect rule-governing touches, it only
  executes the landing action once cleared); concrete forge-vendor API choices (an implementation
  detail); field-level schema, TypeScript, or JSON Schema; package/module layout.

## 2. Source Map

| Source                                                                                                                 | Authority                                                      | Establishes                                                                                                                                                                                                                                                                                                                                                                                           | Gaps / stale risk                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/design/contracts/providers.md`](../../../../design/contracts/providers.md)                                      | authoritative — design stub (this part's shared design target) | `status: draft — stub`; the Forge port's Owns/Interface rows ("the push / PR / merge target; respects branch protection and merge queues"; abstracts "the code host a run pushes to, opens PRs against, and merges through")                                                                                                                                                                          | Port-skeleton altitude only; no anti-corruption detail on the runner-exclusive invocation, no honest handling of a forge's own protection/queue semantics, no block-surfacing mechanics — this part deepens exactly that gap |
| [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) + [`decisions.md`](../../wave-3-ports/decisions.md)       | authoritative — prior-wave frame (seed) and decision log       | The Forge port's candidate anti-corruption stance verbatim: "the port is invoked exclusively by the runner (never the worker/Agent port), preserving MERGE-2/FENCE-3/SEC-3"; "the evidence-gates-landing precondition (MERGE-1/MERGE-3) the runner checks before calling this port"; "any redefinition of what 'done' or 'landed' means" is explicitly named as something the provider "must not own" | This part inherits, does not re-derive, Wave 3's runner-exclusive-invocation stance and the done/landed boundary                                                                                                             |
| [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md)                                                         | authoritative — prior-wave frame (seed)                        | Work item's done vs. landed milestone distinction (D-003's runtime facet, deepened by Wave 2) — this part implements the mechanical `land` action, never redefines the milestone semantics                                                                                                                                                                                                            | This part's `land` operation is downstream of, not a redefinition of, Wave 1/Wave 2's settled terms                                                                                                                          |
| [`../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)   | authoritative — committed sibling-wave frame (seed)            | Policy owns the evidence/attestation sufficiency rule (MERGE-3): "the owner decides what evidence is required before work may land"; GUARD-2's rule-governing-surface declaration, which gates the `done` transition this part's `land` action follows, cited not redesigned here                                                                                                                     | This part respects Policy's sufficiency judgment and GUARD-2's pause as preconditions it does not itself evaluate                                                                                                            |
| [`../../wave-4a-core/frames/w4-s3-authority-spine.md`](../../wave-4a-core/frames/w4-s3-authority-spine.md)             | authoritative — committed sibling-wave frame (seed)            | The Fence/Doorbell's GUARD-2 enforcement (detection + re-approval capture) as a precondition this part's `land` action follows, cited not redesigned                                                                                                                                                                                                                                                  | Confirms this part never re-implements the authorization or re-approval logic itself                                                                                                                                         |
| [`../../wave-4a-core/frames/w4-s1-records-observability.md`](../../wave-4a-core/frames/w4-s1-records-observability.md) | authoritative — committed sibling-wave frame (seed)            | The event log this part's landing/block outcomes feed as candidate events, cited not redesigned                                                                                                                                                                                                                                                                                                       | This part supplies events; it does not define the log's consistency model                                                                                                                                                    |
| [`docs/product/guarantees.md`](../../../../product/guarantees.md)                                                      | authoritative — ID spec                                        | MERGE-1..5 (evidence gates landing; push/PR/merge is runner authority; done conditions explicit and policy-bound; done≠landed as separate milestones; blocked work surfaces as a real PR with failure reasons, respecting merge queues and branch-protection rules); FENCE-3, SEC-3 (worker never holds credentials/forge credentials); STACK-1/2/4/5                                                 | Outcome-level commitments this part's block-surfacing and runner-exclusivity stance reconciles to, not restates                                                                                                              |
| [`docs/design/core/orchestration.md`](../../../../design/core/orchestration.md)                                        | authoritative — design stub (cited)                            | "Holding credentials and the sole authority to push, open a PR, and merge (FENCE-3, MERGE-2) — the thing that writes code is never the thing that ships it"; "landing... is exclusively runner-owned; no other component performs it"                                                                                                                                                                 | Confirms the runner-side authority this part's Forge port is invoked from, unchanged                                                                                                                                         |
| [`../../README.md`](../../README.md) + [`../README.md`](../README.md) + [`../decisions.md`](../decisions.md)           | authoritative — track charter + wave charter/decision log      | The planning-track provider boundary for Wave 4b: providers implement against ports and consume core contracts read-only                                                                                                                                                                                                                                                                              | Durable repo-local authority for the full Wave 4b boundary wording this frame applies                                                                                                                                        |
| [`../decisions.md`](../decisions.md)                                                                                   | authoritative — wave decision log                              | D-004 adopts that provider boundary for this wave and records the Wave 4b orphaned-ID posture the stories preserve                                                                                                                                                                                                                                                                                    | Wave-local authority for the specific Wave 4b boundary statement this part carries                                                                                                                                           |
| [`AGENTS.md`](../../../../../AGENTS.md) (jig repo root)                                                                | authoritative — repo contract/context                          | Repo-level guardrails and house conventions                                                                                                                                                                                                                                                                                                                                                           | Important context, but not the sole authority for the full Wave 4b provider-boundary wording                                                                                                                                 |

## 3. InputResolution

| Required input                                                                                                                                                     | Source evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Owner / impact                                                                | Approval status |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------- |
| **Placement:** deepen `contracts/providers.md`'s Forge section in place, or relocate?                                                                              | Coordinator's brief assigns the same shared-file target as all four Wave 4b parts; Wave 4a's D-001 precedent                                                                                                                                                                                                                                                                                                                                                                                                                                  | **provided** (not a fork) — deepen in place, preserving and citing the existing Owns/Interface as seed. The split-vs-single `DocStructurePlan` question is named identically to `w4-s5`'s frame (cross-referenced there, not repeated in full here).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `docs/design/contracts/providers.md` (Forge section) design_target            | approved        |
| **MERGE-5 block-surfacing mechanics:** does this part own how a block surfaces as a PR comment, or is that Wave 2's territory (the `blocked` state) restated here? | `guarantees.md` MERGE-5: "When a run has a safe branch and permission to push, a block surfaces as a real pull request with the failure reasons in a comment, and its status is posted to the PR... When it cannot safely do that, the block is still recorded for you." Wave 2's frame names `blocked` as a closed work-item terminal state (Wave 2's territory); this part's Forge port is the mechanism that _executes_ the PR-comment/status-post action once a work item reaches `blocked`, not the state transition itself.             | **safe assumption** — this part owns the **mechanical act** of surfacing a block through the forge (opening/updating a PR, posting a status, writing a failure-reasons comment) as a candidate Forge-port responsibility; Wave 2 (cited, unchanged) owns the `blocked` state transition and its guard. If the forge cannot safely push (e.g., no branch permission), the fallback ("the block is still recorded for you") is a Records/`w4-s1` concern (cited), not a new mechanism this part invents. Risk: low — this reading keeps the state-transition/mechanical-execution split consistent with every other provider part's posture (Wave 2 owns transitions, providers execute the invoked action).                                                                        | This part's Owns row for MERGE-5; Wave 2's `blocked` state (unchanged, cited) | not required    |
| **Depth:** does the Forge provider warrant `tactical-ddd`, or does it hold at `ports-and-adapters` (Wave 3's depth)?                                               | Wave 3's D-002 keyed the tactical-ddd escalation to Wave 4b on "concurrency (ISO-4) and real provider adapters." The Forge port's central concern — respecting a forge's own branch-protection/merge-queue semantics, executing push/PR/merge as the runner's exclusive delegate — is adapter-isolation work (isolating core's done/landed semantics from a concrete forge vendor's API), not a new provider-owned invariant boundary with its own consistency model or concurrency property (unlike `w4-s6`'s containment-proof discipline). | **requires approval, recommended** — hold this part at **`architecture_mode: ports-and-adapters`**, **`ddd_depth: ports-and-adapters`**, matching `w4-s5`'s and `w4-s8`'s recommended depth, one rung below `w4-s6`'s recommended `tactical-ddd`. Reasoning: this part's deliverable is anti-corruption isolation (respecting a forge's own protection rules without redefining done/landed or evidence sufficiency) and adapter responsibility (concrete forge-vendor integration), exactly the ladder's `ports-and-adapters` required elements. It does not introduce a new consistency model, concurrency property, or fail-closed classifier of its own — those distinctions belong to `w4-s6` (containment) and stay with core (`w4-s2`/`w4-s3`) for evidence/authorization. | This part's `architecture_mode`/`ddd_depth` frontmatter                       | pending         |

### Blocking Questions

None. The one `requires approval` depth item is resolvable by the coordinator choosing between
named, sourced alternatives.

### Safe Assumptions

- MERGE-5's mechanical block-surfacing act is this part's candidate responsibility; the `blocked`
  state transition itself stays Wave 2's, cited unchanged.
- Placement (deepen `providers.md`'s Forge section in place) is settled, not reopened.

## 4. AgreedSystemModel

### Source Inputs Used

| Source                                                     | Establishes                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `docs/design/contracts/providers.md`                       | The existing stub this part deepens (Forge section): push/PR/merge target, branch-protection/merge-queue respect    |
| `../../wave-3-ports/frame.md`, `decisions.md`              | The runner-exclusive-invocation anti-corruption stance; the done/landed boundary this part must not redefine        |
| `../../wave-1-domain/frame.md`                             | Work item's done-vs-landed milestone distinction (Wave 1's D-003)                                                   |
| `../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`  | Policy's evidence-sufficiency judgment (MERGE-3) as a precondition, cited; GUARD-2's pause as a precondition, cited |
| `../../wave-4a-core/frames/w4-s3-authority-spine.md`       | The Fence/Doorbell's GUARD-2 enforcement as a precondition, cited                                                   |
| `../../wave-4a-core/frames/w4-s1-records-observability.md` | The event log this part's landing/block outcomes feed, cited                                                        |
| `docs/product/guarantees.md`                               | MERGE-1..5, FENCE-3, SEC-3, STACK-1/2/4/5                                                                           |
| `docs/design/core/orchestration.md`                        | The runner's push/PR/merge authority, cited unchanged                                                               |
| `../../README.md`, `../README.md`, `../decisions.md`       | The durable repo-local provider-boundary rule for Wave 4b                                                           |
| `../decisions.md`                                          | D-004's Wave 4b boundary-rule adoption                                                                              |
| `AGENTS.md`                                                | Repo-contract context                                                                                               |

### Unresolved Required Inputs

- Depth confirmation (`ports-and-adapters`, recommended — see §3).

### High-Level System Entities

| Entity                                               | Responsibilities                                                                                                                                                                                                                                | Owns                                                                                                                                                                                                                           | Reads                                                                                                                                                                                                                                                          | Does Not Own                                                                                                                                                                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Forge port (deepened)**                            | The push / PR / merge target: executes the runner's landing action against a concrete code host, respecting that host's own branch-protection and merge-queue semantics; surfaces a block as a real PR with failure reasons when it safely can. | The concrete integration surface (push, open-PR, merge, post-status, post-comment) and the discipline of respecting the forge's own rules rather than overriding them; the candidate mechanical block-surfacing act (MERGE-5). | The runner's invocation (only the runner ever calls this port — Wave 3, cited); Policy's evidence-sufficiency clearance and any GUARD-2 pause resolution as preconditions (`w4-s2`/`w4-s3`, cited); the work item's done/landed status (Wave 1/Wave 2, cited). | Whether evidence is sufficient to land (`w4-s2`'s Policy); who may invoke it (settled: runner only, Wave 3); the meaning of done vs. landed (Wave 1's D-003, Wave 2's closed table); GUARD-2's detection or re-approval capture (`w4-s2`/`w4-s3`). |
| **Block-surfacing mechanism (candidate, this part)** | When a run has a safe branch and push permission, opens/updates a PR with failure reasons in a comment and posts status; when it cannot safely do so, defers to Records for the fallback recording.                                             | The mechanical surfacing act itself.                                                                                                                                                                                           | The `blocked` state (Wave 2, cited) that triggers it.                                                                                                                                                                                                          | The `blocked` transition's own guard (Wave 2); the durable fallback record (`w4-s1`, cited).                                                                                                                                                       |

### Relations

| From                          | Relation                        | To                                                          | Notes                                                                                                          |
| ----------------------------- | ------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Runner (Wave 2/Wave 3, cited) | invokes exclusively             | Forge port                                                  | Never the worker/Agent port — Wave 3's settled anti-corruption stance, unchanged                               |
| Forge port                    | executes after                  | Policy's evidence-sufficiency clearance (`w4-s2`, cited)    | The runner checks sufficiency before calling; this part does not re-check it                                   |
| Forge port                    | executes after                  | GUARD-2 pause resolution (`w4-s2`/`w4-s3`, cited)           | If a rule-governing surface was touched, re-approval must already be captured before landing proceeds          |
| Forge port                    | implements                      | Work item `done → landed` transition (Wave 1/Wave 2, cited) | This part is the mechanism, not the definition, of that transition                                             |
| Forge port                    | surfaces (candidate mechanism)  | Block, via a real PR with failure reasons                   | MERGE-5; falls back to Records (`w4-s1`, cited) when it cannot safely push                                     |
| Forge port                    | emits (candidate events, cited) | Records engine (`w4-s1`)                                    | Every push/PR/merge/block outcome is an event into the log this part does not define the consistency model for |

### Seams and External Boundaries

- **The Forge port** (Wave 3, candidate-named, cited) — this part deepens the adapter-level
  detail behind the port (concrete forge integration, block-surfacing mechanics), not the port's
  own method shape or who may invoke it.
- **The runner-exclusivity boundary** (Wave 3, cited, unchanged) — only the runner ever invokes
  this port; the Agent port never does.
- **The evidence-sufficiency precondition (s7 ← w4-s2)** — this part executes landing only after
  Policy's sufficiency judgment clears; it never re-judges sufficiency itself.
- **The GUARD-2 precondition (s7 ← w4-s2/w4-s3)** — this part executes landing only after any
  rule-governing-surface pause is resolved; it never detects or resolves GUARD-2 itself.
- **The done/landed boundary** (Wave 1/Wave 2, cited, unchanged) — this part implements the
  mechanical `land` action; it never redefines what done or landed means.
- **The Records boundary** (cited, `w4-s1`, unchanged) — every landing/block outcome is an event;
  this part does not define the log's consistency model.

### Lifecycle and State Terms

This part introduces no new lifecycle states — Wave 2's closed `done → landed` transition and
`blocked` terminal state stand unchanged. Its only lifecycle-adjacent vocabulary is the
port-invocation point Wave 3 already named: the `done → landed` transition is where the Forge
port is invoked, runner-owned only (MERGE-2).

### Mode and Depth

- **architecture_mode:** `ports-and-adapters` (recommended, requires approval — see §3)
- **initial ddd_depth:** `ports-and-adapters` (recommended, requires approval — see §3)

### Open Questions and Approval

- Depth confirmation, matching `w4-s5`/`w4-s8`, one rung below `w4-s6` (requires approval,
  recommended — see §3).
- `DocStructurePlan` split-vs-single question, shared with `w4-s5`'s open item (not repeated here).
- **Approval status: pending (coordinator).**

## 5. Assumptions and Blockers

(Restated from §3 for template completeness.)

### Safe Assumptions

- MERGE-5's mechanical block-surfacing act is this part's candidate responsibility; the state
  transition itself stays Wave 2's.
- Placement settled, not reopened.

### Blocking Questions

None.

## 6. DDD Context Candidates

| Candidate context              | Owns                                                                                              | Reads                                                                                                                                               | Does Not Own                                                                                                                                                                              | Open ownership question                |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Forge provider** (this part) | The concrete push/PR/merge integration surface; the candidate block-surfacing mechanism (MERGE-5) | The runner's invocation (cited); Policy's sufficiency clearance and GUARD-2 resolution as preconditions (cited); the done/landed definition (cited) | Evidence sufficiency (`w4-s2`); who may invoke the port (Wave 3, settled); done/landed's meaning (Wave 1/2); GUARD-2 detection/resolution (`w4-s2`/`w4-s3`); the Records engine (`w4-s1`) | Depth confirmation (requires approval) |

## 7. Complexity Drivers

- **Invariants:** MERGE-1..5 (evidence gates landing; runner-exclusive push/PR/merge; explicit
  policy-bound done conditions; done≠landed; block-as-PR); FENCE-3, SEC-3 (worker never holds
  forge credentials — structural, inherited from Wave 3, not re-derived here); STACK-1/2/4/5. New
  candidates for `INV-009`+: none minted directly by this part — its central invariants (runner-
  exclusivity, done≠landed) are already Wave 1/2/3's closed or candidate-named territory; this
  part's contribution is adapter-level citation discipline, not new invariant content.
- **State transitions:** none new — this part sits at the `done → landed` invocation point Wave
  2/Wave 3 already named.
- **Integrations / anti-corruption:** the entire deliverable at this altitude — isolating core's
  done/landed and evidence-sufficiency semantics from a concrete forge vendor's own branch-
  protection/merge-queue rules, which this part must respect, never override.
- **Consistency / idempotency / replay / audit:** RESUME-3's no-double-effect requirement (Wave 2,
  cited) constrains this part's landing action across a resume — a `land` already performed must
  not be repeated; this part's adapter must be idempotent with respect to that guard, cited not
  newly authored here.
- **Security / authorization:** FENCE-3/SEC-3 (worker never holds forge credentials); this part's
  credentials stay runner-side, structurally.
- **Migration / deploy:** none — docs-only frame; no schema freeze, no package layout, no forge-
  vendor API choice.
- **Observability:** every push/PR/merge/block outcome is an event into the Records engine
  (`w4-s1`, cited); this part must not mint new event-family names beyond the v0 contract's list.
- **Testing:** none at this altitude; the future story brief's `ports-and-adapters` depth carries
  forward contract-test/mock-held-to-the-real-seam expectations (a mock forge adapter held to the
  same runner-exclusive-invocation and branch-protection-respecting contract a real vendor
  integration must satisfy).

## 8. Architecture Mode and Initial DDD Depth

**Selected architecture_mode:** `ports-and-adapters` (recommended)

**Why this mode fits:** this part's deliverable is adapter-level anti-corruption isolation over an
already-candidate-named port (Wave 3) — isolating core's done/landed and evidence-sufficiency
semantics from a concrete forge vendor's own protection/queue rules, exactly the ladder's
discriminator for this mode. It authors no new consistency model, concurrency property, or
fail-closed classifier of its own.

**Selected depth:** `ports-and-adapters` (recommended)

**Why this depth fits:** the ladder's required elements — "adapter responsibilities, composition/
wiring boundary, contract tests or mocks held to the real seam" — describe this part's deliverable
precisely: the concrete forge integration, the block-surfacing mechanism, and the future
contract-test expectation that any forge adapter respects runner-exclusivity and the forge's own
protection rules. This part does not escalate to `tactical-ddd`: Wave 3's D-002 keyed that
escalation on concurrency (ISO-4, `w4-s6`'s territory) and real adapters generally, but this
part's own concern — respecting an external system's rules rather than authoring a new invariant
boundary of its own — does not meet the tactical trigger the way `w4-s6`'s containment-proof
discipline does.

**Where tactical depth is intentionally omitted:** no aggregate, value-object, or domain-event
ceremony for the Forge port itself; RESUME-3's no-double-effect requirement is a real complexity
driver but is satisfied by adapter-level idempotency discipline (a contract-test concern at
`ports-and-adapters` depth), not a new transactional consistency boundary this part must author.

## 9. Handoff to Author

- **Design artifact target:** `docs/design/contracts/providers.md` (Forge section, deepen in
  place). Split question shared with `w4-s5`'s open `DocStructurePlan` item, not repeated here.
- **Required methodology profile:** `ddd`.
- **Approval status:** pending — one item requires coordinator resolution: depth confirmation
  (`ports-and-adapters`, recommended, matching `w4-s5`/`w4-s8`).
- **Delivery constraints to preserve:** continue the existing vocabulary — do not mint new `INV-*`
  numbers below `INV-009`; this part mints no new candidates directly (see §7). Keep the three ID
  namespaces distinct. Preserve and cite `providers.md`'s existing Forge-section content as this
  part's seed. Keep the runner-exclusive-invocation stance and the done/landed boundary cited from
  Wave 1/2/3, never redefined. Keep the evidence-sufficiency and GUARD-2 preconditions cited from
  `w4-s2`/`w4-s3`, never re-implemented. Do not decide the `DocStructurePlan` split-vs-single
  question — it is recorded as open in `w4-s5`'s frame, shared across all four parts.
