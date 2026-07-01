---
title: "Wave 4b frame — w4-s6: the Execution host provider (isolation and honest containment)"
status: draft — frame (intake)
methodology: ddd
---

# Problem Frame — Wave 4b, s6: Execution host provider

> Intake artifact for the DDD-first deep-design track's Wave 4b, part 2 of 4. It frames the
> **Execution host provider** — where the worker runs, its isolation posture, and honest
> containment reporting — the second of four PROVIDER parts this wave deepens. Produced by
> applying the `technical-design` pack's `frame-technical-design` skill; the next stage is
> `author-technical-design`, gated on this frame's approval status. Authored alongside three
> sibling frames (`w4-s5-agent-provider.md`, `w4-s7-forge-provider.md`,
> `w4-s8-work-source-provider.md`) in one pass for mutual coherence.
>
> This frame consumes [Wave 3's ports frame](../../wave-3-ports/frame.md) (the Execution host
> port's candidate anti-corruption stance: "SEC-2's no-phone-home guarantee is a core-owned
> invariant this port must prove, not a provider's self-report") and Wave 4a's committed frames —
> especially [`w4-s1-records-observability`](../../wave-4a-core/frames/w4-s1-records-observability.md)
> (the records/evidence surface named there explicitly as this part's frame-time contract) and
> [`w4-s2-plan-policy-evidence`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md) (EARN-2's
> freshness/staleness judgment). This is the wave's sharpest risk part: SEC-2 (no-phone-home) is a
> three-way seam this frame must bound precisely against **Wave 5** (red team) and a future **U9**
> collector, without duplicating or orphaning either.

## 1. Scope and Goal

- **Source request:** deep-design track, Wave 4b, story 2 — deepen the **Execution host port's**
  section of `docs/design/contracts/providers.md` in place: where the worker is contained, the
  isolation-strength categories a host self-reports against, the containment-**proof** discipline
  (SEC-2: confinement is proven, not merely asserted), and the honest-reporting requirement
  (DRIVE-3).
- **Goal:** produce an `AgreedSystemModel` for the Execution host provider clean and citable
  enough to seed this wave's charter and story brief, coherent with the three sibling parts
  (especially the shared seam with `w4-s5`: the worker runs inside this host), and precise about
  the SEC-2 three-way boundary with Wave 5 and U9.
- **Out of scope for this part:** the Execution host port's method signature (Wave 3 already
  candidate-named it, cited not redesigned); the capability-attestation gate's freshness/staleness
  judgment (`w4-s3`, cited — this part supplies the proof, `w4-s3` judges it); the evidence/
  attestation category taxonomy (`w4-s2`, cited); the Records engine's consistency model (`w4-s1`,
  cited); the **full phone-home adversarial red-team scenario** (explicitly **Wave 5**'s
  territory — this part frames the design posture and the requirement/seed for a proof, not the
  adversarial probe itself, per the three-way boundary below); the Agent port's own request/observe
  shape (`w4-s5`, cited — this part only states that it contains the worker, not the worker's own
  behavior); concrete sandboxing technology choices (an implementation detail, not this frame's
  altitude); field-level schema, TypeScript, or JSON Schema; package/module layout.

## 2. Source Map

| Source                                                                                                                 | Authority                                                      | Establishes                                                                                                                                                                                                                                                                                                                                                                                                                                   | Gaps / stale risk                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/design/contracts/providers.md`](../../../../design/contracts/providers.md)                                      | authoritative — design stub (this part's shared design target) | `status: draft — stub`; the Execution host port's Owns/Interface rows ("where the worker is contained... provides isolation and reports its isolation strength honestly"); named a named extension point (no adapter yet, per the Notes and diagram); DRIVE-3 reconciliation                                                                                                                                                                  | Port-skeleton altitude only; no containment-proof discipline, no isolation-strength category catalog, no phone-home-verification posture — this part deepens exactly that gap                            |
| [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) + [`decisions.md`](../../wave-3-ports/decisions.md)       | authoritative — prior-wave frame (seed) and decision log       | The Execution host port's candidate anti-corruption stance verbatim: "SEC-2's no-phone-home guarantee is a core-owned invariant this port must prove, not a provider's self-report — confinement must be verified, never merely asserted by the host"; the host "contains" the Agent port (a named relation); Wave 3's D-002 forecast the tactical-ddd escalation "stays in Wave 4b," keyed on "real provider adapters + concurrency (ISO-4)" | This part is where Wave 3's own candidate stance and D-002's forecast both land — the frame must honor both without re-deriving them from scratch                                                        |
| [`../../wave-4a-core/decisions.md`](../../wave-4a-core/decisions.md)                                                   | authoritative — committed sibling-wave decision log            | D-002: Wave 4a's core parts escalated to `tactical-ddd` on a strict-invariants/consistency-model/fail-closed axis, explicitly **not** contradicting Wave 3's D-002 concurrency/adapter-axis forecast — "Wave 4b remains the escalation point for the concurrency/adapter axis"                                                                                                                                                                | This is the direct citation confirming this part is where the concurrency/adapter axis genuinely lands, per both prior waves' own reconciliation                                                         |
| [`../../wave-4a-core/frames/w4-s1-records-observability.md`](../../wave-4a-core/frames/w4-s1-records-observability.md) | authoritative — committed sibling-wave frame (seed)            | Named explicitly: "the execution-host's attestation/evidence record (capability event family: driver attested / capability missing / capability stale / autonomy reduced) must be framed against this part's event/projection shape" — this part's frame-time contract                                                                                                                                                                        | This part must design its attestation/evidence surface against `w4-s1`'s settled event/projection shape, not invent a parallel one                                                                       |
| [`../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)   | authoritative — committed sibling-wave frame (seed)            | The evidence/attestation model as this part's named frame-time contract for EARN-2; the freshness/staleness judgment rule this part's proof is judged against, not one this part defines                                                                                                                                                                                                                                                      | This part supplies proof; `w4-s2`/`w4-s3` judge it — never the reverse                                                                                                                                   |
| [`../../wave-4a-core/frames/w4-s3-authority-spine.md`](../../wave-4a-core/frames/w4-s3-authority-spine.md)             | authoritative — committed sibling-wave frame (seed)            | The capability-attestation gate: "gates autonomy on fresh, positive, driver-and-run-specific proof (EARN-1); missing/stale/failed proof means reduced autonomy, not a weaker guarantee (EARN-2)" — this part's host is a named future consumer this gate judges                                                                                                                                                                               | Confirms this part's proof is judged, never self-certifying                                                                                                                                              |
| [`docs/product/guarantees.md`](../../../../product/guarantees.md)                                                      | authoritative — ID spec                                        | **SEC-2**: "The worker cannot phone home. Outbound network access is confined, and the confinement is proven — Jig does not take the agent's word that it stayed put." DRIVE-3: "An execution host reports how strong its isolation actually is, and stronger-isolation powers unlock only when it is genuinely strong enough." ISO-4: parallel work cannot collide, each run works in its own isolated workspace. STACK-1/2/4/5; EARN-1/2    | The exact wording SEC-2 and DRIVE-3 use — this part's frame must reconcile to, not restate loosely                                                                                                       |
| [`docs/planning/design-track/README.md`](../../../../../planning/design-track/README.md)                               | authoritative — track charter                                  | The wave table: "Wave 5 — red team: Adversarially probe the design settled by Waves 1-4 for gaps, contradictions, and under-specified authority" — the only extant reference to the future red-team wave (no `wave-5-red-team/` directory or `review-and-red-team.md` file exists on disk yet)                                                                                                                                                | This part must name Wave 5 and a future U9 collector as **forward references to planned coordinator artifacts**, not assert their contents or existence beyond the wave-table's own one-line description |
| [`docs/design/notes/runtime-design-m5a.md`](../../../../design/notes/runtime-design-m5a.md)                            | authoritative — prior design record (M5a slice)                | `SURF-006`: `ExecutionHostPort` — "ports defined at design altitude; no adapters in M5b (named extension points)"; confirms no built adapter exists yet at this seam, unlike the Agent port's scripted stub                                                                                                                                                                                                                                   | This part frames the first real design content at a still-fully-unbuilt seam                                                                                                                             |
| [`AGENTS.md`](../../../../../AGENTS.md) (jig repo root)                                                                | authoritative — repo contract                                  | The boundary rule: providers must not redefine core policy, evidence, authorization, or state                                                                                                                                                                                                                                                                                                                                                 | The central discipline this part's tactical escalation must not violate — see the depth-escalation guardrail below                                                                                       |

## 3. InputResolution

| Required input                                                                                                                                                                                                                                                      | Source evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Owner / impact                                                                                                        | Approval status        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Placement:** deepen `contracts/providers.md`'s Execution host section in place, or relocate?                                                                                                                                                                      | Coordinator's brief assigns the same shared-file target as all four Wave 4b parts; Wave 4a's D-001 precedent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **provided** (not a fork) — deepen in place, preserving and citing the existing Owns/Interface/Notes as seed. The split-vs-single `DocStructurePlan` question is named identically to `w4-s5`'s (see that frame; not repeated in full here to avoid drift — cross-reference `w4-s5`'s InputResolution row).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `docs/design/contracts/providers.md` (Execution host section) design_target                                           | approved               |
| **SEC-2 three-way boundary:** does this part own the full phone-home adversarial scenario, or only the design posture and a proof requirement/seed?                                                                                                                 | The track's wave table names Wave 5 as the dedicated red-team wave ("adversarially probe the design... for gaps, contradictions, and under-specified authority"), separate from and later than Wave 4b. The coordinator's mandate states directly: "w4-s6 OWNS SEC-2 — it frames the no-phone-home design (proven-no-network-exfiltration posture) AND states the requirement/seed for a proof, but W5 (red-team wave) authors the full phone-home scenario and U9's review-and-red-team.md collects it." No red-team scenario content, and no `review-and-red-team.md`, exists anywhere in the repo today — both are forward references to planned coordinator artifacts, not yet authored.                                                                                                                                                                                                                                                                                                                                                                       | **provided / mandate — accepted as stated, three-way split:** **(1) `w4-s6` (this part) owns the design posture and the proof requirement/seed** — it states that outbound network access must be confined and that the confinement must be _proven_ (not self-reported), names the isolation-strength categories a host self-reports against, and seeds what a proof would need to demonstrate (e.g., a verifiable network-egress denial or monitoring claim the host supplies as an attestation claim into `w4-s2`'s evidence model). **(2) Wave 5 (red team, future)** authors the full adversarial phone-home scenario — the actual attack surface, probe sequence, and gap analysis that stress-tests whether this part's proof requirement is sufficient in practice. **(3) A future U9's `review-and-red-team.md`** collects Wave 5's findings alongside this part's design posture into one integration-level record. This frame names all three without asserting Wave 5's or U9's content — those files do not exist yet; this is a forward reference, consistent with how Wave 4a named `w4-s6` itself before Wave 4b existed.         | This part's SEC-2 section; the boundary the coordinator will mirror in `decisions.md`                                 | approved (as mandated) |
| **Depth escalation:** does the Execution host provider warrant `tactical-ddd`, and — the guardrail — does escalating stay inside the boundary rule (core owns evidence sufficiency/judging; the provider owns containment, proof-generation, and honest reporting)? | Wave 3's D-002 forecast the tactical-ddd escalation "stays in Wave 4b," keyed on "real provider adapters + concurrency (ISO-4)." This is the one Wave 4b part with a genuine, provider-owned invariant: the containment mechanism itself (a real transaction-boundary-like guarantee — network egress is either provably denied or it isn't) and ISO-4's collision-free isolated-workspace-per-run requirement, both properties the host itself must structurally guarantee, not merely assert. The altitude ladder's tactical trigger ("strict invariants... concurrency... consistency model... fail-closed needs") is met on the concurrency/adapter axis specifically, distinct from Wave 4a's strict-invariants/consistency-model axis (per Wave 4a's D-002 cross-wave reconciliation note). The guardrail: Wave 4a's `w4-s3` already owns _judging_ whether a capability claim is fresh/sufficient (EARN-1/2); this part must not re-own that judgment — it owns only the containment mechanism, the proof it generates, and the honesty of its self-report. | **requires approval, recommended** — select `architecture_mode: tactical-ddd`, `ddd_depth: tactical-ddd`, the wave's one part recommended at this depth (mirroring how Wave 4a held three of its four parts at `tactical-ddd` and one, `w4-s4`, one rung lower — here the pattern is inverted: three Wave 4b parts (`s5`/`s7`/`s8`) are recommended at `ports-and-adapters`, and this one escalates). Reasoning: the containment mechanism is a real invariant boundary a provider must structurally guarantee (network egress confined and _provably_ so, ISO-4's no-workspace-collision property), with a concrete failure-token catalog (containment unproven, isolation-strength overstated, workspace collision) — the ladder's own required elements for this rung. **Guardrail honored explicitly:** this escalation is _provider-owned_ (the host's own containment mechanism, proof-generation, and honest self-report) — it does **not** own or redefine `w4-s3`'s judgment of whether a given proof is fresh/sufficient, `w4-s2`'s evidence-category taxonomy, or `w4-s1`'s log consistency model. Those stay core's, cited read-only. | This part's `architecture_mode`/`ddd_depth` frontmatter — the wave's one part recommended to differ from its siblings | pending                |
| **ISO-4 concurrency ownership:** does this part own ISO-4 (parallel work cannot collide) in full, or only the execution-host's containment contribution to it?                                                                                                      | `guarantees.md` ISO-4: "Each run works in its own isolated workspace, and the same task cannot be launched twice — independent stories run at once without corrupting each other's tree or duplicating work." Wave 2's frame named parallel-workspace concurrency as a named extension point orchestration.md left undesigned; Wave 3's D-002 keyed the concurrency axis to this wave without assigning it solely to `w4-s6`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **safe assumption** — this part owns the **execution host's structural contribution** to ISO-4 (workspace isolation per run is a property the host must provide and honestly report), not the full guarantee (which also depends on the runner's own scheduling/eligibility discipline, Wave 2's territory, cited not redesigned here). Risk: low — this is the same "provider supplies the mechanism, core owns the scheduling decision" split already established for every other cross-cutting ID in this wave.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | This part's Owns row for ISO-4; Wave 2's orchestration scope (unchanged, cited)                                       | not required           |

### Blocking Questions

None. The one `requires approval` depth item and the SEC-2 boundary (already resolved by mandate)
are the only fork-shaped items; both resolve by the coordinator choosing among named, sourced
alternatives or accepting the stated mandate.

### Safe Assumptions

- ISO-4 ownership is split: this part owns the host's structural isolation contribution, Wave 2
  (cited, unchanged) owns the scheduling/eligibility discipline around it.
- Placement (deepen `providers.md`'s Execution host section in place) is settled by the
  coordinator's brief and prior-wave precedent; not reopened.

## 4. AgreedSystemModel

### Source Inputs Used

| Source                                                     | Establishes                                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/design/contracts/providers.md`                       | The existing stub this part deepens (Execution host section): containment/isolation Owns row, DRIVE-3 reconciliation                        |
| `../../wave-3-ports/frame.md`, `decisions.md`              | The candidate anti-corruption stance (SEC-2 as core-owned, proven not self-reported); D-002's concurrency/adapter-axis forecast for Wave 4b |
| `../../wave-4a-core/decisions.md`                          | D-002's cross-wave reconciliation: Wave 4b is where the concurrency/adapter axis lands                                                      |
| `../../wave-4a-core/frames/w4-s1-records-observability.md` | This part's records/evidence frame-time contract (capability event family)                                                                  |
| `../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`  | The evidence/attestation category model (cited, not redefined); EARN-2's judging rule                                                       |
| `../../wave-4a-core/frames/w4-s3-authority-spine.md`       | The capability-attestation gate that judges this part's proof (cited, not redefined)                                                        |
| `docs/product/guarantees.md`                               | SEC-2, DRIVE-3, ISO-4, STACK-1/2/4/5, EARN-1/2                                                                                              |
| `docs/planning/design-track/README.md`                     | Wave 5's existence and one-line scope (forward reference only)                                                                              |
| `docs/design/notes/runtime-design-m5a.md`                  | `SURF-006` — no built adapter yet at this seam                                                                                              |
| `AGENTS.md`                                                | The boundary rule and its guardrail on this part's tactical escalation                                                                      |

### Unresolved Required Inputs

- Depth escalation confirmation (`tactical-ddd`, recommended — see §3).

### High-Level System Entities

| Entity                                                 | Responsibilities                                                                                                                                                                                                                                                               | Owns                                                                                                                                                                                                                                                                                    | Reads                                                                                                                                                                                                                       | Does Not Own                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Execution host port (deepened)**                     | Where the worker (Agent port) runs; provides isolation/containment and reports its strength honestly. Candidate anti-corruption stance carried from Wave 3, deepened: SEC-2's no-phone-home guarantee is a core-owned invariant this port must **prove**, never merely assert. | The containment-verification contract (proving confinement, not trusting an assertion); the isolation-strength category catalog a host self-reports against; the honesty-of-reporting requirement (DRIVE-3); the host's structural contribution to ISO-4 (workspace isolation per run). | The Agent port's presence inside it (`w4-s5`, cited); the evidence/attestation category taxonomy its proof is expressed against (`w4-s2`, cited); the freshness/staleness judgment its proof is judged by (`w4-s3`, cited). | The decision of how much autonomy its containment strength earns (capability attestation's _judgment_, core-owned, `w4-s3`); whether its self-report is trusted without proof (DRIVE-3 forbids this structurally); the Agent port's own request/observe behavior (`w4-s5`); Wave 2's scheduling/eligibility discipline around ISO-4. |
| **Containment-proof discipline (new this part)**       | The mechanism by which the host demonstrates — not merely claims — that outbound network access is confined (SEC-2).                                                                                                                                                           | The proof-generation mechanism's requirement/seed (what a proof must demonstrate to count); the isolation-strength categories the proof is categorized against.                                                                                                                         | Nothing structurally required upstream; this is the host's own mechanism.                                                                                                                                                   | Judging whether a given proof is fresh/sufficient for the policy in force (`w4-s3`'s EARN-1/2 judgment, cited).                                                                                                                                                                                                                      |
| **SEC-2 boundary artifact (named, forward reference)** | The three-way split of SEC-2 ownership across this wave, Wave 5, and a future U9 collector.                                                                                                                                                                                    | This part's own design posture and proof requirement/seed only.                                                                                                                                                                                                                         | Nothing yet — Wave 5 and U9's `review-and-red-team.md` do not exist.                                                                                                                                                        | The adversarial phone-home scenario itself (Wave 5's, future); the integration-level collection of findings (U9's, future).                                                                                                                                                                                                          |

### Relations

| From                             | Relation                               | To                                                   | Notes                                                                                                                                                                                                                                           |
| -------------------------------- | -------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Execution host port              | contains                               | Agent port (`w4-s5`)                                 | **Stated identically in `w4-s5`'s frame**: the worker runs inside the execution host; the host's isolation strength is what SEC-2 is verified against — the one seam shared between two provider parts                                          |
| Execution host port              | supplies (proof, not judgment)         | Capability-attestation gate (`w4-s3`, cited)         | The host generates a containment proof; `w4-s3` judges its freshness/sufficiency (EARN-1/2); this part never self-certifies                                                                                                                     |
| Execution host port              | is categorized against                 | Evidence/attestation category model (`w4-s2`, cited) | The proof is expressed in `w4-s2`'s taxonomy, not a parallel one this part invents                                                                                                                                                              |
| Execution host port              | emits (candidate events, cited)        | Records engine (`w4-s1`)                             | Every containment-proof outcome is an event into the log this part does not define the consistency model for; `w4-s1`'s capability event family (driver attested / capability missing / capability stale / autonomy reduced) is the named shape |
| SEC-2 design posture (this part) | is red-team-tested by (future)         | Wave 5                                               | Named per the coordinator's mandate; Wave 5 does not exist yet — forward reference only                                                                                                                                                         |
| SEC-2 (this part + Wave 5)       | is collected by (future)               | U9's `review-and-red-team.md`                        | Named per the coordinator's mandate; this file does not exist yet — forward reference only                                                                                                                                                      |
| Execution host port              | contributes to (structural piece only) | ISO-4 (parallel work cannot collide)                 | Wave 2 (cited, unchanged) owns the scheduling/eligibility discipline; this part owns the host's isolated-workspace-per-run mechanism                                                                                                            |

### Seams and External Boundaries

- **The Execution host port** (Wave 3, candidate-named, cited) — this part deepens the containment-
  proof discipline and honest-reporting requirement behind the port, not the port's own method
  shape.
- **The execution-host containment seam (s6 ↔ s5)** — stated identically to `w4-s5`'s frame: the
  Agent port's adapter runs inside this host.
- **The SEC-2 three-way boundary (s6 ↔ Wave 5 ↔ U9)** — this part owns the design posture and proof
  requirement/seed; Wave 5 (future) authors the full adversarial phone-home scenario; a future U9's
  `review-and-red-team.md` collects both. Named as forward references to planned coordinator
  artifacts, not asserted content.
- **The attestation-judgment seam (s6 → w4-s2/w4-s3)** — this part supplies a containment proof;
  `w4-s2` owns the category taxonomy, `w4-s3` owns the freshness/sufficiency judgment. This part
  never redefines either — the explicit guardrail against re-owning core's judgment.
- **The ISO-4 split (s6 ↔ Wave 2)** — this part owns the host's structural isolated-workspace
  mechanism; Wave 2 (cited, unchanged) owns the scheduling/eligibility discipline around it.
- **The Records boundary** (cited, `w4-s1`, unchanged) — every containment-proof outcome is an
  event; this part does not define the log's consistency model.

### Lifecycle and State Terms

This part introduces no new lifecycle states — Wave 2's closed transitions stand. Its
lifecycle-adjacent vocabulary is the containment relationship: the Agent port's `started`-state
invocation (Wave 2/Wave 3, cited) occurs _inside_ this host for the run's duration; the host's
containment proof is generated and judged once per attestation cycle (the cycle's own cadence is
`w4-s3`'s freshness rule, cited, not this part's to define).

### Mode and Depth

- **architecture_mode:** `tactical-ddd` (recommended, requires approval — see §3)
- **initial ddd_depth:** `tactical-ddd` (recommended, requires approval — see §3)

### Open Questions and Approval

- Depth escalation confirmation, the wave's one part recommended at `tactical-ddd` (requires
  approval, recommended — see §3).
- The SEC-2 three-way boundary is resolved by mandate (approved), named here for the coordinator to
  mirror in `decisions.md`.
- **Approval status: pending (coordinator)** on depth; SEC-2 boundary already approved.

## 5. Assumptions and Blockers

(Restated from §3 for template completeness.)

### Safe Assumptions

- ISO-4 ownership split between this part (host mechanism) and Wave 2 (scheduling discipline,
  cited, unchanged).
- Placement settled, not reopened.

### Blocking Questions

None.

## 6. DDD Context Candidates

| Candidate context                       | Owns                                                                                                                                                                                               | Reads                                                                                                                           | Does Not Own                                                                                                                                                                                                     | Open ownership question                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Execution host provider** (this part) | The containment-proof discipline; isolation-strength category catalog; honest-reporting requirement; the host's structural ISO-4 contribution; the SEC-2 design posture and proof requirement/seed | The Agent port it contains (cited); the evidence/attestation category model (cited); the freshness/sufficiency judgment (cited) | Judging its own proof's sufficiency (`w4-s3`); the evidence category taxonomy (`w4-s2`); the Records engine (`w4-s1`); the full phone-home adversarial scenario (Wave 5, future); Wave 2's scheduling discipline | Depth escalation (requires approval, recommended) |

## 7. Complexity Drivers

- **Invariants:** SEC-2 (no-phone-home, proven not asserted — this part's central, provider-owned
  invariant); DRIVE-3 (honest containment reporting); ISO-4 (isolated workspace per run, host's
  structural contribution); STACK-1/2/4/5; EARN-1/2 (judged by `w4-s3`, cited). New candidates for
  `INV-009`+: containment-proven-not-asserted (SEC-2 as a structural, verifiable requirement, not
  a self-report); isolation-strength-honestly-reported (DRIVE-3 as an anti-gaming invariant on the
  host's own claim). Both flagged for cross-wave reconciliation at U9, un-numbered here.
- **State transitions:** none new — this part sits inside Wave 2's already-closed `started` state
  as the worker's containment environment.
- **Integrations / anti-corruption:** this part's entire deliverable at candidate depth — the
  containment mechanism's isolation from the Agent port's own behavior, and the proof-vs-judgment
  split with `w4-s3`.
- **Consistency / idempotency / replay / audit:** the containment proof must be generated
  per-attestation-cycle and durably recorded (`w4-s1`, cited); a stale proof must not be silently
  treated as fresh (`w4-s3`'s judgment, cited).
- **Security / authorization:** this part's central complexity driver — SEC-2's provable
  confinement, DRIVE-3's honest reporting, and the guardrail that this part must not re-own
  `w4-s3`'s sufficiency judgment.
- **Migration / deploy:** none — docs-only frame; no schema freeze, no package layout, no
  sandboxing technology choice.
- **Observability:** every containment-proof outcome is an event into the Records engine
  (`w4-s1`, cited); this part must not mint new event-family names beyond the v0 contract's
  capability-family list.
- **Testing:** none at this altitude; the future story brief's `tactical-ddd` depth carries
  forward a failure-token catalog (containment unproven, isolation-strength overstated, workspace
  collision) and a consistency-model test-seam expectation for the proof-generation mechanism.

## 8. Architecture Mode and Initial DDD Depth

**Selected architecture_mode:** `tactical-ddd` (recommended)

**Why this mode fits:** the Execution host provider is the wave's one genuinely provider-owned
tactical candidate — the containment mechanism is a real invariant boundary (network egress either
provably denied or not) with a concrete failure-token catalog, squarely inside the ladder's
"strict invariants... concurrency... fail-closed needs" trigger. This is the concurrency/
adapter-axis escalation both Wave 3's D-002 and Wave 4a's D-002 forecast lands in Wave 4b — this
part is where it lands, on ISO-4 and SEC-2 specifically.

**Selected depth:** `tactical-ddd` (recommended)

**Why this depth fits:** the ladder's required elements — "failure-token catalogs, consistency
model" — map onto the containment-proof discipline (a failure-token catalog: unproven, overstated,
collided) and the host's own generate-and-report cycle (a consistency/recovery-adjacent model: a
proof must not be stale when judged). The escalation is explicitly bounded by the boundary-rule
guardrail: this part owns the mechanism, the proof, and the honest report; it does not own or
redefine `w4-s3`'s freshness/sufficiency judgment, `w4-s2`'s category taxonomy, or `w4-s1`'s log
consistency model — all three stay cited, read-only.

**Where tactical depth is intentionally omitted:** no aggregate or domain-event ceremony beyond the
containment-proof discipline itself; this part does not claim ownership of the attestation gate's
judgment (that remains `w4-s3`'s transactional-consistency-adjacent territory) or of Wave 2's
scheduling/eligibility discipline around ISO-4 — both are cited, not re-authored here.

## 9. Handoff to Author

- **Design artifact target:** `docs/design/contracts/providers.md` (Execution host section, deepen
  in place). Split question shared with `w4-s5`'s open `DocStructurePlan` item, not repeated here.
- **Required methodology profile:** `ddd`.
- **Approval status:** pending — one item requires coordinator resolution: depth confirmation
  (`tactical-ddd`, recommended, the wave's one part at this depth). The SEC-2 three-way boundary is
  already resolved by mandate (approved) and ready for the coordinator to mirror in `decisions.md`.
- **Delivery constraints to preserve:** continue the existing vocabulary — this part's candidates
  (containment-proven-not-asserted, isolation-strength-honestly-reported) are **INV-009+
  CANDIDATES**, flagged for cross-wave reconciliation at the U9 pass alongside every prior wave's
  un-numbered candidates — never hard-numbered here. Keep the three ID namespaces distinct.
  Preserve and cite `providers.md`'s existing Execution-host-section content as this part's seed.
  State the execution-host containment seam identically to `w4-s5`'s frame. Name the SEC-2
  three-way boundary (this part / Wave 5 / U9's `review-and-red-team.md`) using this frame's exact
  wording wherever it recurs, including in the coordinator's `decisions.md`. Do not redefine
  `w4-s3`'s freshness/sufficiency judgment or `w4-s2`'s evidence-category taxonomy — cite both
  read-only.
