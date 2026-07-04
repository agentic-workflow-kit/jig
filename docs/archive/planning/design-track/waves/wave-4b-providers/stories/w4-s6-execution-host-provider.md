---
id: w4-s6-execution-host-provider
wave: wave-4b-providers
status: designed
depends_on: [] # D-006: the shared providers.md is contention, not a logical dependency; serialize-vs-parallel is contingent on the OPEN DocStructurePlan split question (stated canonically in w4-s5's story)
design_targets: [docs/design/contracts/providers.md] # deepen in place (D-001): the Execution host section — the containment-proof discipline (SEC-2), isolation-strength categories, honest reporting (DRIVE-3), the host's ISO-4 contribution. tactical-ddd depth (D-002) with the boundary-rule guardrail. The Execution host port line Wave 3's w3-s1 seeded here is PRESERVED and CITED. author-technical-design may relocate via the OPEN DocStructurePlan split question
reconciles_to:
  [SEC-2, DRIVE-3, ISO-4, STACK-1, STACK-2, STACK-4, STACK-5, EARN-1, EARN-2]
---

# w4-s6-execution-host-provider — design the Execution host provider (isolation and honest containment)

## Objective

Brief a future design session to author the **Execution host provider** — where the worker runs, its
isolation posture, and honest containment reporting — deepening the **Execution host section** of
`docs/design/contracts/providers.md` **in place** (D-001) from the port skeleton Wave 3's `w3-s1`
left it at into an authored, invariant-bearing provider design. This session moves from the
overview-altitude interface the stub already draws — "where the worker is contained... provides
isolation and reports its isolation strength honestly" — to the **containment-proof discipline**
beneath the port: how the host **proves** confinement rather than asserting it (SEC-2 no phone home),
the isolation-strength categories it self-reports against (DRIVE-3), and its structural contribution
to ISO-4 (an isolated workspace per run).

Per **D-002** this is the wave's **one escalated part**: it runs at `architecture_mode: tactical-ddd`,
`ddd_depth: tactical-ddd`, one rung above `w4-s5`/`w4-s7`/`w4-s8`. The containment mechanism is a
genuine **provider-owned** invariant boundary — network egress either provably denied or it is not —
with a concrete failure-token catalog (containment unproven, isolation-strength overstated, workspace
collision), the ladder's tactical trigger. This lands the concurrency / real-provider-adapter axis
that **Wave 3's D-002** and **Wave 4a's D-002** both explicitly deferred to Wave 4b — its
fulfillment, not a contradiction. **The escalation carries a boundary-rule guardrail** (D-002): this
part's tactical depth is **provider-owned** (its containment mechanism, proof-generation, honest
self-report) and does **not** re-own or redefine `w4-s3`'s freshness/sufficiency judgment (EARN-1/2),
`w4-s2`'s evidence-category taxonomy, or `w4-s1`'s log consistency model — all cited **read-only**.
The host **proves and reports**; core **judges and records**.

Per D-001 this session **deepens the Execution host section of `providers.md` in place**, preserving
and citing the existing Owns/Interface/Notes/Diagram (the seam is a named extension point, no adapter
yet — `SURF-006`) as the seed (STOP-003: re-project and cite, never overwrite). The **boundary rule**
from the governing plan, adopted for this wave by D-004, is the spine: the Execution host provider
implements against Wave 3's Execution host port and consumes Wave 4a's core contracts read-only; it
**supplies** a containment proof as an attestation claim; `w4-s3` **judges** it (EARN-1/2) and
`w4-s1` records it. `AGENTS.md` remains repo-contract context for the same guardrail.

## Inputs to read

- [`../frames/w4-s6-execution-host-provider.md`](../frames/w4-s6-execution-host-provider.md) — this
  part's frame: the source map, `InputResolution`, `AgreedSystemModel` (`architecture_mode`
  `tactical-ddd`, `ddd_depth` `tactical-ddd`), the entity model (Execution host port / containment-
  proof discipline / SEC-2 boundary artifact), the SEC-2 three-way boundary wording, and the
  cross-part seams.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under
  (D-002 `tactical-ddd`/`tactical-ddd` with the boundary-rule guardrail; D-003 the SEC-2 three-way
  boundary; D-004 the boundary rule and the orphaned-ID owners — SEC-2 s6-sole, DRIVE-3 s6-sole,
  STACK-4/DRIVE-1/EARN-2 s6-primary; D-005 the two `INV-009`+ candidates un-numbered) and the
  confirmed ISO-4 ownership split safe assumption.
- [`../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) and Wave 3's `w3-s1` — the Execution host
  port's candidate anti-corruption stance verbatim ("SEC-2's no-phone-home guarantee is a core-owned
  invariant this port must prove, not a provider's self-report — confinement must be verified, never
  merely asserted by the host") and the "contains the Agent port" relation, the port shape this
  session deepens the discipline behind, preserving and citing the port line as the seed.
- The Wave 4a committed frames, **cited read-only** —
  [`../../wave-4a-core/frames/w4-s1-records-observability.md`](../../wave-4a-core/frames/w4-s1-records-observability.md)
  (named explicitly there as this part's frame-time contract: the capability event family — driver
  attested / capability missing / capability stale / autonomy reduced — this part's proof is framed
  against),
  [`../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)
  (the evidence/attestation category model, named as this part's EARN-2 frame-time contract), and
  [`../../wave-4a-core/frames/w4-s3-authority-spine.md`](../../wave-4a-core/frames/w4-s3-authority-spine.md)
  (the capability-attestation gate that judges freshness/sufficiency, EARN-1/2) — this session cites
  all three, it does not redesign any (the guardrail).
- [`../../wave-4a-core/decisions.md`](../../wave-4a-core/decisions.md) — Wave 4a's D-002 cross-wave
  reconciliation ("Wave 4b remains the escalation point for the concurrency/adapter axis"), the direct
  confirmation this part is where that axis lands.
- `docs/design/contracts/providers.md` — the existing stub this session deepens in place: the
  Execution host Owns row ("where the worker runs; provides isolation and reports its isolation
  strength honestly"), the Interface row, the named-extension-point Note, the diagram, and the
  DRIVE-3 reconciliation.
- `docs/product/guarantees.md` — **SEC-2** ("The worker cannot phone home. Outbound network access is
  confined, and the confinement is proven — Jig does not take the agent's word that it stayed put"),
  DRIVE-3 (honest containment reporting; stronger-isolation powers unlock only when genuinely strong
  enough), ISO-4 (each run works in its own isolated workspace), STACK-1/2/4/5, EARN-1/2 this provider
  reconciles to.
- [`../../README.md`](../../../README.md) — the track charter's wave table: "Wave 5 — red team:
  Adversarially probe the design settled by Waves 1-4 for gaps, contradictions, and under-specified
  authority," plus the U9 collector that records scope/routing without inventing findings.
- `docs/design/notes/runtime-design-m5a.md` — `SURF-006` (`ExecutionHostPort` defined at design
  altitude, no adapter in M5b — a named extension point) — kept a namespace distinct from `INV-*` and
  product IDs.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc at the design_target: the deepened **Execution host section** of
   `docs/design/contracts/providers.md` — the containment-proof discipline (SEC-2, proven not
   asserted), the isolation-strength category catalog, the honest-reporting requirement (DRIVE-3), and
   the host's structural ISO-4 contribution — preserving and citing the existing Owns/Interface/Notes/
   Diagram as the seed.
2. Open questions, logged (never invented answers) — cross-referencing `w4-s5`'s canonical
   `DocStructurePlan` split question.
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting. This session
   names two **invariant candidates**: containment-proven-not-asserted (SEC-2 as a structural,
   verifiable requirement, not a self-report) and isolation-strength-honestly-reported (DRIVE-3 as an
   anti-gaming invariant on the host's own claim). It does **not** hard-number them: candidates for
   `INV-009`+, flagged for cross-wave reconciliation with Wave 2's `w2-s3`, Wave 3's, and Wave 4a's
   candidates at U9.
4. Risks and deferred decisions — including the concrete sandboxing technology (an implementation
   detail, not designed) and the SEC-2 red-team scenario (Wave 5's, not authored here).
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- How does the execution host **prove** confinement rather than assert it (SEC-2 no phone home):
  outbound network access confined, and the confinement **verifiable** — "Jig does not take the
  agent's word that it stayed put"? What must a proof demonstrate to count, supplied as an attestation
  claim into `w4-s2`'s evidence model?
- What **isolation-strength categories** does the host self-report against, and how does honest
  reporting (DRIVE-3) work — stronger-isolation powers unlock only when isolation is genuinely strong
  enough, never on an overstated claim?
- What is the host's **structural contribution to ISO-4** — an isolated workspace per run so parallel
  work cannot collide? (The scheduling/eligibility discipline around ISO-4 stays **Wave 2's**, cited
  unchanged — this part owns the host's workspace-isolation **mechanism**, not the scheduling
  decision. Confirmed safe assumption.)
- **The SEC-2 three-way boundary** (D-003, carried forward from the frame and decision log): **(1) `w4-s6` (this part)
  owns the design posture and the proof requirement/seed** — outbound network access must be confined
  and the confinement _proven_ (not self-reported); it names the isolation-strength categories a host
  self-reports against and seeds what a proof must demonstrate, supplied as an attestation claim into
  `w4-s2`'s evidence model. **(2) Wave 5 (red team)** authors the full adversarial phone-home
  scenario — the attack surface, probe sequence, and gap analysis stress-testing whether the proof
  requirement suffices. **(3) U9's `review-and-red-team.md`** collects Wave 5's findings alongside
  this part's design posture into one integration-level record. This session does **not** author the
  scenario or the collector, and it does not assert findings Wave 5 has not produced.
- How does the containment proof frame **against** `w4-s1`'s records/evidence surface (the capability
  event family) and `w4-s2`'s EARN-2 attestation model — as a **supplied claim** — while the
  **guardrail** holds: the host owns the mechanism, proof, and honest report, and does **not** own
  `w4-s3`'s freshness/sufficiency judgment, `w4-s2`'s taxonomy, or `w4-s1`'s log model?
- How is the **s6 ↔ s5 containment seam** stated: the Agent port's adapter (`w4-s5`) **runs inside**
  this execution host; the host's isolation strength is what SEC-2's no-phone-home guarantee is
  verified against. State this seam **consistently** with `w4-s5`'s story (the one seam shared
  between two provider parts).

## Invariants to preserve

- `SEC-2` — the worker cannot phone home; outbound network access is confined, and the confinement is
  **proven**, not taken on the worker's word. This part's central provider-owned invariant.
- `DRIVE-3` — containment is reported **honestly**; an execution host reports how strong its isolation
  actually is, and stronger-isolation powers unlock only when it is genuinely strong enough.
- `ISO-4` — parallel work cannot collide; each run works in its own isolated workspace (this part's
  host-mechanism contribution; Wave 2 owns the scheduling discipline, cited).
- `STACK-1`, `STACK-2`, `STACK-4`, `STACK-5` — vendor-independent guarantees; four swappable seams;
  attested-not-assumed; the seam is an authority boundary. `EARN-1`, `EARN-2` — autonomy requires
  fresh, positive, driver-and-run-specific proof, and missing/stale/failed proof means reduced
  autonomy, not a weaker guarantee (judged by `w4-s3`, cited).
- New **invariant candidates** for `INV-009`+ (un-numbered, flagged for U9): containment-proven-not-
  asserted; isolation-strength-honestly-reported. Continue from `INV-009` (never reset); record in
  decisions.md if numbered locally.

## Must not decide

- **The boundary rule is absolute** (D-004), and the **tactical-depth guardrail** enforces it: this
  session owns the containment mechanism, the proof, and the honest report — it must **not** re-own or
  redefine `w4-s3`'s freshness/sufficiency judgment (EARN-1/2), `w4-s2`'s evidence-category taxonomy,
  or `w4-s1`'s log consistency model. The host **proves and reports**; core **judges and records**.
- **The Wave 5 red-team scenario** — this part owns the SEC-2 design posture and proof requirement/
  seed only (D-003); the full adversarial phone-home scenario is **Wave 5**'s, and its collection is
  **U9** `review-and-red-team.md`'s concern. This session does not author the scenario or the
  collector.
- **ISO-4's scheduling/eligibility discipline** — that stays **Wave 2's**. This part owns the host's
  isolated-workspace-per-run **mechanism**, not which work is eligible to run in parallel.
- The **Agent port's own request/observe behavior** — that is `w4-s5`. This session states only that
  the host contains the worker (the s6 ↔ s5 seam, stated consistently in both stories).
- Anything **Wave 3** settled: the Execution host port **shape** and its owns/implements/must-not
  split. This session deepens the containment discipline **behind** the port, preserving and citing
  the port line as the seed.
- The **`providers.md` split** — the `DocStructurePlan` question is OPEN (D-006), stated canonically in
  `w4-s5`; not decided here.
- Concrete **sandboxing technology** (container, VM, local process, remote host) — an implementation
  detail, not this session's altitude; this session names the containment-proof discipline and the
  isolation-strength categories, not the concrete mechanism.
- **Freezing** the observability-records v0 contract — the capability event family this part's proof
  is recorded into stays **cited and unfrozen** (via `w4-s1`, cited); no field names or event-type
  strings minted; a change routes back to the seam owner (STOP-003).
- **Numbering** the consolidated invariant ledger — this part names candidates; numbering is
  coordinated at U9. Never reset `INV-001..008`.
- Field-level schema, TypeScript, JSON Schema, method signatures, or any frozen contract — deferred
  per `docs/design/README.md`.

## Exit criteria

- The deepened Execution host section exists in `docs/design/contracts/providers.md`, stating the
  containment-proof discipline (SEC-2, proven not asserted), the isolation-strength category catalog,
  honest reporting (DRIVE-3), and the host's ISO-4 contribution as the load-bearing properties.
- The existing Owns/Interface/Notes/Diagram are **preserved and cited** as the seed, re-projected and
  extended rather than overwritten; any divergence is named explicitly (STOP-003).
- This part is authored at **`tactical-ddd`** depth (D-002) with its **guardrail** explicit: it owns
  the containment mechanism, proof, and honest report; it does **not** re-own `w4-s3`'s judgment,
  `w4-s2`'s taxonomy, or `w4-s1`'s log model — all cited read-only.
- The **SEC-2 three-way boundary** (this part / Wave 5 / U9's `review-and-red-team.md`) is stated in
  a form consistent with D-003 and the frame, naming Wave 5 and the collector as current
  planning-track/U9 artifacts without asserting future findings.
- The **s6 ↔ s5 containment seam** is stated **consistently** with `w4-s5`'s story; the **boundary-rule
  statement** is present (implements against Wave 3's port; consumes Wave 4a read-only; supplies a
  proof, `w4-s3` judges, `w4-s1` records).
- The two invariant candidates (containment-proven-not-asserted; isolation-strength-honestly-reported)
  are named for `INV-009`+ and flagged for cross-wave reconciliation; the three ID namespaces are kept
  distinct.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This part's frame ([`../frames/w4-s6-execution-host-provider.md`](../frames/w4-s6-execution-host-provider.md)).
- The authored design_target (the Execution host section of `docs/design/contracts/providers.md`).
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story authors a real
jig provider seam (the Execution host provider, the wave's sharpest-risk part, where SEC-2's
no-phone-home guarantee is proven), so the full frame → author → design-review pass applies, not the
light method Wave 0 used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `tactical-ddd`, `ddd_depth` `tactical-ddd` per D-002). This part's build-time
   frame at [`../frames/w4-s6-execution-host-provider.md`](../frames/w4-s6-execution-host-provider.md)
   seeds it; the session confirms and extends the `AgreedSystemModel` rather than starting from
   nothing.
2. author-technical-design → the deepened Execution host section of `docs/design/contracts/providers.md`,
   preserving and citing the existing Owns/Interface/Notes/Diagram as the seed; Wave 4a's core
   contracts cited read-only (the guardrail); the SEC-2 three-way boundary stated consistently with
   the frame and D-003.
3. review-technical-design → three lenses (architecture-enforceability: containment is proven not
   asserted; the failure-token catalog — containment unproven, isolation-strength overstated,
   workspace collision — is stated; the guardrail holds, the host does not re-own core judgment.
   domain-correctness: the provider reconciles to SEC-2 / DRIVE-3 / ISO-4 / STACK / EARN and names its
   two `INV-009`+ candidates without redefining core policy/evidence/authorization/state — the
   boundary rule holds; agreement-integrity: nothing contradicts the part frame's `AgreedSystemModel`,
   Wave 3's Execution host port shape, Wave 4a's evidence/authority contracts, the SEC-2 three-way
   boundary semantics, or the s6 ↔ s5 containment seam semantics). Dispositions recorded into this wave's
   [`../decisions.md`](../decisions.md); settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved design_target in the track's future
traceability matrix; hand the two invariant candidates forward for `INV-009`+ consolidation;
**flag for the U9 pass** that a future `review-and-red-team.md` must collect this SEC-2 posture
alongside Wave 5's phone-home scenario, so SEC-2 neither duplicates Wave 5 nor orphans (D-003).

## Coordinator resolution (design_targets)

Per D-001 (deepen in place, shared file), this story deepens the **Execution host section** of
`docs/design/contracts/providers.md` directly — preserving and citing its existing Owns/Interface/
Notes/Diagram as the seed — rather than authoring a new sibling doc. This is the STOP-003-compliant
"re-project and cite." Whether the file later splits into `contracts/providers/execution-host.md` and
siblings is the **OPEN `DocStructurePlan` question** (D-006) stated canonically in `w4-s5`'s story;
the future `author-technical-design` session may relocate the target via that plan. This brief records
the resolved target, not a frozen path.
