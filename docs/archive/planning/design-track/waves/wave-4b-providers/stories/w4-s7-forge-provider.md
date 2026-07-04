---
id: w4-s7-forge-provider
wave: wave-4b-providers
status: designed
depends_on: [] # D-006: the shared providers.md is contention, not a logical dependency; serialize-vs-parallel is contingent on the OPEN DocStructurePlan split question (stated canonically in w4-s5's story)
design_targets: [docs/design/contracts/providers.md] # deepen in place (D-001): the Forge section — the runner-exclusive push/PR/merge adapter, respect for the forge's own protection/queue rules, the mechanical block-surfacing act (MERGE-5). The Forge port line Wave 3's w3-s1 seeded here is PRESERVED and CITED. author-technical-design may relocate via the OPEN DocStructurePlan split question
reconciles_to:
  [
    MERGE-1,
    MERGE-2,
    MERGE-3,
    MERGE-4,
    MERGE-5,
    FENCE-3,
    SEC-3,
    STACK-1,
    STACK-2,
    STACK-4,
    STACK-5,
  ]
---

# w4-s7-forge-provider — design the Forge provider (push / PR / merge target)

## Objective

Brief a future design session to author the **Forge provider** — the push / PR / merge target that
respects branch protection and merge rules — deepening the **Forge section** of
`docs/design/contracts/providers.md` **in place** (D-001) from the port skeleton Wave 3's `w3-s1`
left it at into an authored, boundary-respecting provider design. This session moves from the
overview-altitude interface the stub already draws — "the push / PR / merge target; respects branch
protection and merge queues" — to the **adapter-level design behind the port**: the runner-exclusive
landing adapter, the discipline of respecting a forge's own protection/queue rules rather than
overriding them, and the **mechanical block-surfacing act** (MERGE-5).

Per **D-002** this part runs at `architecture_mode: ports-and-adapters`, `ddd_depth:
ports-and-adapters` — matching `w4-s5`/`w4-s8`, one rung below `w4-s6`'s `tactical-ddd`. Its concern
is anti-corruption isolation: isolating core's done/landed and evidence-sufficiency semantics from a
concrete forge vendor's own branch-protection/merge-queue rules, which this adapter must **respect**,
never override. It authors no new consistency model, concurrency property, or fail-closed classifier
of its own — those belong to `w4-s6` (containment) and stay with core (`w4-s2`/`w4-s3`) for
evidence/authorization.

Per D-001 this session **deepens the Forge section of `providers.md` in place**, preserving and
citing the existing Owns/Interface/Notes/Diagram as the seed (STOP-003: re-project and cite, never
overwrite). The **boundary rule** from the governing plan, adopted for this wave by D-004, is the
spine: the Forge provider implements against Wave 3's Forge port and consumes Wave 4a's core
contracts read-only — it must **not** redefine evidence sufficiency (`w4-s2`'s Policy, MERGE-3), the
done-vs-landed semantics (Wave 1's D-003, Wave 2's closed table), or the authorization/GUARD-2 rules
(`w4-s3`). It executes the runner's landing action **after** those preconditions have cleared; it
does not re-evaluate them. `AGENTS.md` remains repo-contract context for the same guardrail.

## Inputs to read

- [`../frames/w4-s7-forge-provider.md`](../frames/w4-s7-forge-provider.md) — this part's frame: the
  source map, `InputResolution`, `AgreedSystemModel` (`architecture_mode` `ports-and-adapters`,
  `ddd_depth` `ports-and-adapters`), the entity model (Forge port / block-surfacing mechanism), and
  the cross-part seams.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under
  (D-002 `ports-and-adapters`/`ports-and-adapters`; D-004 the boundary rule; D-005 no new candidate
  minted; D-006 `depends_on: []` and the open split question) and the confirmed MERGE-5
  block-surfacing split safe assumption (`w4-s7` owns the mechanical act; Wave 2 owns the `blocked`
  transition; the cannot-safely-push fallback is a Records/`w4-s1` concern).
- [`../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) and Wave 3's `w3-s1` — the Forge port's
  candidate anti-corruption stance ("the port is invoked exclusively by the runner (never the worker/
  Agent port), preserving MERGE-2/FENCE-3/SEC-3"; "any redefinition of what 'done' or 'landed' means"
  is something the provider must not own), the port shape this session deepens the adapter behind,
  preserving and citing the port line as the seed.
- [`../wave-1-domain/frame.md`](../../wave-1-domain/frame.md) and Wave 1's settled story briefs — the
  done-vs-landed milestone distinction (Wave 1's D-003, deepened by Wave 2) this session's `land`
  action implements but never redefines.
- The Wave 4a committed frames, **cited read-only** —
  [`../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)
  (Policy owns the evidence-sufficiency rule, MERGE-3; GUARD-2's rule-governing-surface declaration
  gates the `done` transition this session's `land` follows) and
  [`../../wave-4a-core/frames/w4-s3-authority-spine.md`](../../wave-4a-core/frames/w4-s3-authority-spine.md)
  (the Fence/Doorbell's GUARD-2 enforcement, a precondition this session's `land` follows) — cited,
  not redesigned.
- `docs/design/contracts/providers.md` — the existing stub this session deepens in place: the Forge
  Owns row ("the push / PR / merge target; respects branch protection and merge queues"), the
  Interface row ("the code host a run pushes to, opens PRs against, and merges through"), the diagram,
  and the STACK reconciliation.
- `docs/design/core/orchestration.md` — the runner as the sole holder of "credentials and the sole
  authority to push, open a PR, and merge (FENCE-3, MERGE-2)"; "landing... is exclusively runner-
  owned" — the runner-side authority this Forge port is invoked from; Wave 2's settled territory,
  cited not re-authored.
- `docs/product/guarantees.md` — MERGE-1..5 (evidence gates landing; runner-exclusive push/PR/merge;
  explicit policy-bound done conditions; done≠landed as separate milestones; blocked work surfaces as
  a real PR with failure reasons, respecting merge queues and branch-protection rules), FENCE-3, SEC-3
  (worker never holds forge credentials), STACK-1/2/4/5 this provider reconciles to.
- `docs/design/notes/runtime-design-m5a.md` — `SURF-006` (`ForgePort` a named extension point, no
  adapter yet) — kept a namespace distinct from `INV-*` and product IDs.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc at the design_target: the deepened **Forge section** of
   `docs/design/contracts/providers.md` — the runner-exclusive push/PR/merge adapter, the discipline of
   respecting a forge's own protection/queue rules, and the mechanical block-surfacing act (MERGE-5) —
   preserving and citing the existing Owns/Interface/Notes/Diagram as the seed.
2. Open questions, logged (never invented answers) — cross-referencing `w4-s5`'s canonical
   `DocStructurePlan` split question.
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting. This session
   mints **no new candidate**: its central invariants (runner-exclusivity, done≠landed) are already
   Wave 1/2/3's closed or candidate-named territory. If a genuinely new invariant surfaces it is a
   candidate for `INV-009`+, flagged for cross-wave reconciliation, never hard-numbered.
4. Risks and deferred decisions — including the concrete forge-vendor integration (an implementation
   detail, not designed) and adapter-level idempotency for RESUME-3 (a contract-test concern).
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- How does the Forge port's adapter execute the runner's push/PR/merge as the runner's **exclusive**
  delegate — never the worker/Agent port (MERGE-2, FENCE-3, SEC-3) — with the worker never holding
  forge credentials? The Agent port (`w4-s5`) never invokes this port.
- How does the adapter **respect a forge's own branch-protection and merge-queue semantics** rather
  than overriding them, so `done` and `landed` stay separate milestones (MERGE-4) — a done story with
  a held PR is still done — and jig respects the forge's rules?
- How does the adapter perform the **mechanical block-surfacing act** (MERGE-5): when a run has a safe
  branch and push permission, open/update a real PR with the failure reasons in a comment and post its
  status; when it cannot safely do so, defer to the Records/`w4-s1` fallback ("the block is still
  recorded for you")? This part owns the **mechanical act**; Wave 2 (cited) owns the `blocked` state
  transition and its guard.
- How does the adapter execute landing **only after** its preconditions clear — Policy's evidence-
  sufficiency judgment (`w4-s2`, MERGE-3, cited) and any GUARD-2 rule-governing-surface pause
  (`w4-s2`/`w4-s3`, cited)? This session does **not** re-check sufficiency or detect/resolve GUARD-2;
  the runner checks sufficiency before calling, and re-approval must already be captured.
- How does the adapter's `land` operation satisfy RESUME-3's no-double-effect (Wave 2, cited) across a
  resume — a `land` already performed is not repeated? (Adapter-level idempotency, a contract-test
  concern at `ports-and-adapters` depth, not a new transactional boundary.)

## Invariants to preserve

- `MERGE-1`, `MERGE-2`, `MERGE-3`, `MERGE-4`, `MERGE-5` — evidence gates landing (observed, not
  self-reported); push/PR/merge is runner authority; done conditions are explicit and policy-bound;
  done and landed are separate milestones; blocked work surfaces as a real PR with failure reasons,
  respecting merge queues and branch-protection rules. This session implements these; it does not
  redefine what done or landed means (that is Wave 1/2, cited).
- `FENCE-3`, `SEC-3` — the worker never holds privileged/forge credentials; the runner performs the
  privileged action. The adapter's credentials stay runner-side, structurally.
- `STACK-1`, `STACK-2`, `STACK-4`, `STACK-5` — vendor-independent guarantees; four swappable seams;
  attested-not-assumed; the seam is an authority boundary.
- No new `INV-*` numbers are hard-numbered by this story, and it mints **no new candidate** (its
  central invariants are Wave 1/2/3 territory). If a genuinely new invariant surfaces it continues
  from `INV-009` (never resets) and records why in decisions.md.

## Must not decide

- **The boundary rule is absolute** (D-004): this session must **not** redefine evidence sufficiency
  (`w4-s2`'s Policy, MERGE-3), the done-vs-landed semantics (Wave 1's D-003, Wave 2's closed table),
  or the authorization/GUARD-2 rules (`w4-s3`). It consumes Wave 4a's core contracts read-only and
  executes landing after those preconditions clear.
- **Whether evidence is sufficient to land** — that is Policy's, `w4-s2`'s (MERGE-3). The runner
  checks sufficiency before calling this port; this session does not re-judge it.
- **GUARD-2 detection or re-approval capture** — that is `w4-s2`/`w4-s3`. This session executes
  landing only after any rule-governing-surface pause is resolved; it does not detect or resolve
  GUARD-2 itself.
- **Who may invoke the port** — settled by Wave 3: the runner only, never the worker. This session
  inherits and states that, it does not re-derive it.
- Anything **Wave 2** settled: the `done → landed` transition and the `blocked` state. This session is
  invoked **at** the `done → landed` transition and surfaces a block **from** the `blocked` state; it
  authors neither. The `blocked` transition's own guard stays Wave 2's.
- Anything **Wave 3** settled: the Forge port **shape** and its owns/implements/must-not split. This
  session deepens the adapter **behind** the port, preserving and citing the port line as the seed.
- The **`providers.md` split** — the `DocStructurePlan` question is OPEN (D-006), stated canonically in
  `w4-s5`; not decided here.
- Concrete **forge-vendor integration** (a specific forge product, its API shape, its status/comment
  posting) — an implementation detail, not this session's altitude; this session names the runner-
  exclusive adapter contract and the block-surfacing act, not a vendor integration.
- **Numbering** the consolidated invariant ledger — this part mints no candidate; if one surfaces it
  is coordinated at U9. Never reset `INV-001..008`.
- Field-level schema, TypeScript, JSON Schema, method signatures, or any frozen contract — deferred
  per `docs/design/README.md`.

## Exit criteria

- The deepened Forge section exists in `docs/design/contracts/providers.md`, stating the runner-
  exclusive push/PR/merge adapter, the respect-the-forge's-own-rules discipline, and the mechanical
  block-surfacing act (MERGE-5) as the load-bearing properties.
- The existing Owns/Interface/Notes/Diagram are **preserved and cited** as the seed, re-projected and
  extended rather than overwritten; any divergence is named explicitly (STOP-003).
- The **boundary-rule statement** is present: implements against Wave 3's Forge port, consumes Wave 4a
  read-only, never redefines evidence sufficiency / done-vs-landed / authorization; executes landing
  after the runner's evidence-sufficiency and any GUARD-2 pause have cleared.
- Runner-exclusivity (MERGE-2, FENCE-3, SEC-3), forge-protection respect (MERGE-4/5), and the
  mechanical block-surfacing act are stated; the done/landed semantics are **cited** from Wave 1/2,
  not redefined.
- The **canonical `DocStructurePlan` split question** is cross-referenced (not restated); no new
  `INV-009`+ candidate is minted by this part; the three ID namespaces are kept distinct.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This part's frame ([`../frames/w4-s7-forge-provider.md`](../frames/w4-s7-forge-provider.md)).
- The authored design_target (the Forge section of `docs/design/contracts/providers.md`).
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story authors a real
jig provider seam (the Forge provider, the seam every merge-on-evidence guarantee reaches the world
through), so the full frame → author → design-review pass applies, not the light method Wave 0 used
for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `ports-and-adapters`, `ddd_depth` `ports-and-adapters` per D-002). This part's
   build-time frame at [`../frames/w4-s7-forge-provider.md`](../frames/w4-s7-forge-provider.md) seeds
   it; the session confirms and extends the `AgreedSystemModel` rather than starting from nothing.
2. author-technical-design → the deepened Forge section of `docs/design/contracts/providers.md`,
   preserving and citing the existing Owns/Interface/Notes/Diagram as the seed; Wave 4a's core
   contracts cited read-only.
3. review-technical-design → three lenses (architecture-enforceability: push/PR/merge is
   runner-exclusive; the adapter respects the forge's own protection/queue rules; the block-surfacing
   act is mechanical and defers to Records when it cannot safely push. domain-correctness: the
   provider reconciles to MERGE-1..5 / FENCE-3 / SEC-3 / STACK and cites done/landed without
   redefining it — the boundary rule holds; agreement-integrity: nothing contradicts the part frame's
   `AgreedSystemModel`, Wave 3's Forge port shape, Wave 1/2's done-vs-landed semantics, or `w4-s2`/
   `w4-s3`'s evidence-sufficiency and GUARD-2 preconditions). Dispositions recorded into this wave's
   [`../decisions.md`](../decisions.md); settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved design_target in the track's future
traceability matrix; confirm the Forge provider's landing action respects the runner-exclusive and
evidence-sufficiency preconditions without re-owning them; carry the `DocStructurePlan` split status
forward for the U9 nav-doc pass.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place, shared file), this story deepens the **Forge section** of
`docs/design/contracts/providers.md` directly — preserving and citing its existing Owns/Interface/
Notes/Diagram as the seed — rather than authoring a new sibling doc. This is the STOP-003-compliant
"re-project and cite." Whether the file later splits into `contracts/providers/forge.md` and siblings
is the **OPEN `DocStructurePlan` question** (D-006) stated canonically in `w4-s5`'s story; the future
`author-technical-design` session may relocate the target via that plan. This brief records the
resolved target, not a frozen path.
