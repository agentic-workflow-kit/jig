---
title: "Wave 5 frame — red team"
status: draft — frame (intake)
methodology: ddd
---

# Problem Frame — Wave 5: Red team

> Intake artifact for the DDD-first deep-design track's Wave 5. It frames the **red-team /
> stress-probe** altitude ahead of the two future Wave 5 story briefs:
> `w5-s1-authority-and-provider-red-team` and
> `w5-s2-recovery-records-integration-red-team`. It records source evidence, `InputResolution`,
> the `AgreedSystemModel`, architecture mode, and initial DDD depth before authoring. Produced by
> applying the `technical-design` pack's `frame-technical-design` skill; the next stage is
> `author-technical-design`, but this pass stops at the frame.
>
> This wave is intentionally lighter than Waves 1-4. It does **not** introduce new jig entities,
> provider seams, runtime states, or design targets. It adversarially probes the design already
> settled by Waves 1-4b for contradiction, under-specified authority, missing evidence,
> cross-wave seam drift, and recovery/records gaps. In particular, it picks up the SEC-2
> phone-home scenario that Wave 4b's `w4-s6` explicitly deferred here.

## 1. Scope and Goal

- **Source request:** deep-design track, Wave 5 — frame a **light red-team wave** under
  `docs/planning/design-track/waves/wave-5-red-team/`, creating only this `frame.md`. The wave's
  two future stories are `w5-s1-authority-and-provider-red-team` and
  `w5-s2-recovery-records-integration-red-team`. The wave stresses the design settled by Waves
  1-4b, introduces no new entities, and does not author real design docs or implementation tasks.
- **Goal:** produce an `AgreedSystemModel` clean and citable enough to seed the future Wave 5
  charter and the two story briefs, with a source-grounded split between (a) authority/provider
  adversarial probes and (b) recovery/records integration adversarial probes. The model must keep
  the provider boundary rule intact, keep the three ID namespaces distinct, and route any revealed
  gaps back to their owning design surfaces as findings rather than silently resolving them.
- **Out of scope for this wave:** authoring `README.md`, story briefs, `decisions.md`,
  `story-dag.md`, `dependency-dag.md`, `traceability.md`, `review-and-red-team.md`, or
  discoverability edits; authoring or editing any `docs/design/**` file; runtime code, schemas,
  TypeScript, exports, or package work; redefining core policy, evidence, authorization, state,
  or provider-port shapes already settled by Waves 1-4b; hard-numbering new `INV-*` values below
  `INV-009`.

## 2. Source Map

| Source                                                                                                                                                                                                                                                                | Authority                                           | Establishes                                                                                                                                                                                          | Gaps / stale risk                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`../wave-4b-providers/decisions.md`](../wave-4b-providers/decisions.md)                                                                                                                                                                                              | authoritative — immediate prior-wave decision log   | Wave 4b's settled boundary rule, SEC-2 three-way split (D-003), attestation direction, orphaned-ID ownership map, and `INV-009`+ candidate posture for provider work                                 | None material; this is the wave-local authority Wave 5 must preserve                                                                  |
| [`../wave-4b-providers/frames/w4-s6-execution-host-provider.md`](../wave-4b-providers/frames/w4-s6-execution-host-provider.md)                                                                                                                                        | authoritative — immediate prior-wave frame (seed)   | The execution-host containment-proof discipline, the SEC-2 design posture/proof seed, and the explicit forward reference that the full adversarial phone-home scenario belongs to Wave 5             | Confirms the Wave 5 handoff, but does not itself define the adversarial scenario                                                      |
| [`../wave-4b-providers/stories/w4-s6-execution-host-provider.md`](../wave-4b-providers/stories/w4-s6-execution-host-provider.md)                                                                                                                                      | authoritative — settled prior-wave story brief      | The exact author-time carry-forward for SEC-2: `w4-s6` owns design posture and proof seed, Wave 5 owns the full phone-home scenario, U9 collects both                                                | Story brief, not authored design; used here as the intended seam contract                                                             |
| [`../wave-4b-providers/README.md`](../wave-4b-providers/README.md)                                                                                                                                                                                                    | authoritative — settled prior-wave charter          | Wave 4b's provider-boundary rule and the four-part provider scope Wave 5 now stress-tests                                                                                                            | No material gap; Wave 5 probes this rather than re-slicing it                                                                         |
| [`../wave-4a-core/frames/w4-s1-records-observability.md`](../wave-4a-core/frames/w4-s1-records-observability.md)                                                                                                                                                      | authoritative — prior-wave frame (seed)             | The records/evidence surface, append-only/projection-purity invariants, and the explicit note that Wave 4b `w4-s6` frames its attestation against this surface                                       | Wave 5 must probe consistency and integration, not redesign the records engine                                                        |
| [`../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)                                                                                                                                                        | authoritative — prior-wave frame (seed)             | The policy/evidence model, EARN-1/2 freshness and sufficiency vocabulary, and GUARD-2's rule-level ownership                                                                                         | Wave 5 may find gaps here, but must route them back instead of redefining them                                                        |
| [`../wave-4a-core/frames/w4-s3-authority-spine.md`](../wave-4a-core/frames/w4-s3-authority-spine.md)                                                                                                                                                                  | authoritative — prior-wave frame (seed)             | Fence/Doorbell fail-closed mechanics, capability-attestation judgment, and GUARD-2 enforcement ownership                                                                                             | Wave 5 probes under-specified authority and contradiction across these rules                                                          |
| [`../wave-4a-core/frames/w4-s4-bootstrap-composition-root.md`](../wave-4a-core/frames/w4-s4-bootstrap-composition-root.md)                                                                                                                                            | authoritative — prior-wave frame (seed)             | Bootstrap launch binding, storage preflight, binding-record ordering, and resume re-entry preserving original binding                                                                                | Critical for `w5-s2`; the frame settles composition-root re-entry but does not itself test contradictions across recovery and records |
| [`../wave-2-state-machines/frame.md`](../wave-2-state-machines/frame.md) + [`stories/w2-s2-run-lifecycle-and-recovery.md`](../wave-2-state-machines/stories/w2-s2-run-lifecycle-and-recovery.md)                                                                      | authoritative — prior-wave frame and story brief    | The run-lifecycle and recovery semantics Wave 5 must probe: `previewed → started → stopped \| resumed \| completed`, RESUME-1..5, GUARD-1 across resume, and the explicit seam to bootstrap re-entry | Wave 2 owns state-machine terms; Wave 5 checks that later-wave records/bootstrap/provider claims do not contradict them               |
| [`../wave-3-ports/frame.md`](../wave-3-ports/frame.md) + [`stories/w3-s1-provider-port-skeleton.md`](../wave-3-ports/stories/w3-s1-provider-port-skeleton.md)                                                                                                         | authoritative — prior-wave frame and story brief    | The provider-port shapes and anti-corruption stance Wave 5 must treat as settled: providers implement against ports and never redefine core semantics                                                | Wave 5 probes whether later waves honor this, not whether the port shapes change                                                      |
| [`../wave-1-domain/frame.md`](../wave-1-domain/frame.md) + its two story briefs                                                                                                                                                                                       | authoritative — prior-wave frame and story briefs   | The baseline domain vocabulary: Run, Work item/story, Policy, Work profile, Repo floors, Evidence, Notice; keeps Wave 5 from inventing new nouns                                                     | No material gap; used to prevent vocabulary drift                                                                                     |
| [`../../README.md`](../../README.md)                                                                                                                                                                                                                                  | authoritative — track charter                       | Wave 5's stated purpose: adversarially probe the design settled by Waves 1-4 for gaps, contradictions, and under-specified authority; the boundary rule and deliverable rule                         | One-line wave purpose only; this frame supplies the precise scope beneath it                                                          |
| [`../../HANDOFF.md`](../../HANDOFF.md)                                                                                                                                                                                                                                | authoritative — continuation runbook                | The immediate Wave 5 scope, the file path, and the requirement that Wave 5 stay a light red-team wave while owning the full phone-home scenario deferred by Wave 4b                                  | The handoff's commit inventory predates `526c807`; Wave 5 scope was rechecked against current git history and current Wave 4b files   |
| `/Users/aryekogan/.claude/plans/enumerated-kindling-raccoon.md`                                                                                                                                                                                                       | authoritative — governing plan                      | The wave list, story IDs, per-wave framing method, and the explicit Wave 5 role in the overall planning track                                                                                        | External to the repo; cited here as governing plan context                                                                            |
| `/Users/aryekogan/.codex/attachments/988f1259-87d6-45e5-a852-467e967a351a/pasted-text.txt`                                                                                                                                                                            | authoritative — user brief                          | The current pass constraints: Wave 5 frame only, no charter or stories yet, no new entities, no design docs, keep `INV-*` handling conservative                                                      | External local input, not a repo artifact                                                                                             |
| `docs/product/guarantees.md`                                                                                                                                                                                                                                          | authoritative — product ID spec                     | The product commitments Wave 5 stress-tests: FENCE, EARN, GUARD, DOOR, MERGE, SEC, RESUME, ISO, STACK, DRIVE, SEE                                                                                    | Product says what must hold, not how contradictions should be resolved                                                                |
| `docs/product/concepts.md`                                                                                                                                                                                                                                            | authoritative — product concepts                    | Runner/worker authority boundary and the product-visible run/story outcomes Wave 5 must keep consistent with its probes                                                                              | Product altitude only                                                                                                                 |
| [`../../../../design/contracts/observability-records-contract-v0.md`](../../../../design/contracts/observability-records-contract-v0.md) + [`../../../../design/contracts/execution-plan-contract-v0.md`](../../../../design/contracts/execution-plan-contract-v0.md) | authoritative — seam contracts v0                   | The record properties and plan-declared authority/evidence expectations Wave 5 checks for contradiction across Waves 2-4b                                                                            | v0 contract shape, not frozen schema; Wave 5 must not mutate it                                                                       |
| [`../../../../design/core/records.md`](../../../../design/core/records.md), [`../../../../design/core/bootstrap.md`](../../../../design/core/bootstrap.md), [`../../../../design/contracts/providers.md`](../../../../design/contracts/providers.md)                  | authoritative — current design stubs/surfaces       | The current design homes the red-team findings will route back to if gaps are found                                                                                                                  | These remain design-owned targets; Wave 5 does not author them                                                                        |
| [`../../../../design/notes/runtime-design-m5a.md`](../../../../design/notes/runtime-design-m5a.md)                                                                                                                                                                    | authoritative — prior design record and live ledger | `INV-001..008`, `SURF-*`, `CTX-*`, `STOP-*`, and the three-namespace discipline Wave 5 must continue without resetting                                                                               | The M5a slice is narrower than the full planning track; Wave 5 cites its ledger, not its scope boundary                               |
| `/Users/aryekogan/repos/agentic-workflow-kit/technical-design/skills/frame-technical-design/SKILL.md`, its template, and [`../../session-template.md`](../../session-template.md)                                                                                     | authoritative — method/template                     | Required frame shape, approval semantics, and the planning-track skeleton later authoring will copy                                                                                                  | Method-only sources, not domain sources                                                                                               |

## 3. InputResolution

| Required input                                                                                                                     | Source evidence                                                                                                                                                                                                          | Resolution                                                                                                                                                                                                                                        | Owner / impact                                                           | Approval status |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------- |
| **Artifact scope for this pass:** does Wave 5 create only a frame, or also charter/stories/decisions?                              | User brief and pasted text explicitly limit this pass to `docs/planning/design-track/waves/wave-5-red-team/frame.md` only; handoff and governing plan describe later authoring separately                                | **provided** — create only `frame.md`; do not author charter, stories, `decisions.md`, or any integration docs                                                                                                                                    | Current file scope and downstream coordinator work                       | approved        |
| **Wave purpose:** is Wave 5 design-authoring or stress/probe-only?                                                                 | Governing plan, track README, handoff, and user brief all describe Wave 5 as a red-team wave that stresses settled design and introduces no new entities                                                                 | **provided** — Wave 5 is a stress/probe wave only; any gaps become findings, contradiction checks, or routed questions, never new design ownership                                                                                                | Governs the whole wave and prevents design-creep                         | approved        |
| **SEC-2 ownership split:** who owns the full phone-home scenario versus the design posture and the later collector?                | Wave 4b `decisions.md` D-003, `w4-s6` frame, and `w4-s6` story all say: `w4-s6` owns design posture/proof seed; Wave 5 owns the full adversarial phone-home scenario; U9 collects both                                   | **provided** — preserve the three-way split exactly; Wave 5 owns the adversarial scenario and its gap analysis only                                                                                                                               | `w5-s1` scope and later U9 collection                                    | approved        |
| **Story split inside Wave 5:** how should the two future stories divide work without inventing new entities?                       | Story IDs in governing plan and user brief, plus prior-wave seams: authority/provider issues cluster around `w4-s3` + Wave 4b; recovery/records issues cluster around `w2-s2` + `w4-s1` + `w4-s4` + the records contract | **safe assumption** — `w5-s1` probes authority/provider/SEC-2 contradictions; `w5-s2` probes recovery/records/bootstrap integration contradictions. This is the only narrow split consistent with the existing story IDs and prior-wave ownership | Later story authoring and charter story order                            | not required    |
| **Invariant handling in a red-team wave:** should Wave 5 mint or hard-number new invariants?                                       | User brief says continue from `INV-009` candidates and do not hard-number new invariants unless a source already did; prior waves keep candidate status and defer numbering to U9                                        | **provided** — cite existing `INV-*` and `INV-009`+ candidates read-only; if a missing invariant is exposed, log it as a finding or candidate, never hard-number it here                                                                          | Keeps the ledger stable and U9 reconcilable                              | approved        |
| **Where do Wave 5 findings land?**                                                                                                 | Track dependency rule, STOP-003 posture in prior waves, and user brief forbid product/design re-litigation inside this wave                                                                                              | **provided** — findings route back to the owning wave/design/product doc as open questions, contradiction notes, or U9 collection items; Wave 5 does not resolve them locally                                                                     | Governs handoff and prevents local override of settled design            | approved        |
| **Lightest valid framing lens:** what `architecture_mode` and `ddd_depth` fit a stress/probe wave that introduces no new entities? | The skill's mode/depth ladder, the track's Wave 5 description, and the user brief all point to cross-wave seam stress rather than new entities, states, ports, or tactical domain machinery                              | **safe assumption** — `architecture_mode: contract/seam design`, `ddd_depth: strategic-only`. Wave 5 probes seams and ownership boundaries already defined elsewhere; it does not author new runtime behavior or infrastructure isolation rules   | Drives the author's later framing and keeps the wave intentionally light | not required    |
| **Does Wave 5 own new design targets under `docs/design/**`?**                                                                     | User brief says red-team work must not author real design docs; prior-wave SEC-2 split says U9 collects and existing owners retain their design surfaces                                                                 | **provided** — no new `design_targets`; later stories will author planning-track artifacts only and route substantive findings back to existing design homes                                                                                      | Later story brief shape and stop conditions                              | approved        |

## 4. AgreedSystemModel

### Source Inputs Used

| Source                                                   | Establishes                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Wave 4b `decisions.md`, `w4-s6` frame, and `w4-s6` story | SEC-2 three-way boundary, provider boundary rule, and the specific Wave 5 handoff for the phone-home scenario |
| Wave 4a `w4-s1` / `w4-s2` / `w4-s3` / `w4-s4` frames     | The core surfaces Wave 5 probes: records, evidence/policy, authority, bootstrap/re-entry                      |
| Wave 2 run-lifecycle frame/story                         | The recovery/resume terms and guards that Wave 5 checks against later-wave records/bootstrap claims           |
| Wave 3 ports frame/story                                 | The settled port and anti-corruption posture Wave 5 checks provider designs against                           |
| Product guarantees and concepts                          | The outcome-level commitments and runner/worker boundary the probes must preserve                             |
| v0 contracts + current design stubs                      | The seam properties and current design homes findings route back to                                           |

### Unresolved Required Inputs

None. The framing choices above are either provided directly by source or narrow safe assumptions
that do not change ownership beyond the two already-named Wave 5 stories.

### High-Level System Entities

Wave 5 introduces no new jig entities. Its system model therefore treats **probe surfaces** as the
framing units for later authoring.

| Entity                                         | Responsibilities                                                                                                                                                                                                                                  | Owns                                                                                                                                          | Reads                                                                                                                                                          | Does Not Own                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Authority/provider probe surface**           | Stress-test the authority boundary and provider seam claims already authored across Wave 4a and Wave 4b, especially fail-closed authorization, capability proof, provider read-only consumption of core semantics, and SEC-2's phone-home posture | The adversarial probe set for `w5-s1`; contradiction checks across `w4-s3` + Wave 4b; the full SEC-2 phone-home scenario and its gap analysis | `w4-s3` authority spine; Wave 4b provider frames/stories; Wave 3 provider-port boundary; product guarantees FENCE/EARN/GUARD/DOOR/SEC/STACK/DRIVE              | Any new provider seam, policy rule, evidence taxonomy, or attestation judgment; the U9 collector |
| **Recovery/records integration probe surface** | Stress-test whether run-lifecycle recovery claims, records semantics, bootstrap re-entry, and notices/export remain coherent when composed, including stop/resume, no-double-effect, binding immutability, and record causality                   | The adversarial probe set for `w5-s2`; contradiction checks across Wave 2 + `w4-s1` + `w4-s4` + the records contract                          | Wave 2 run-lifecycle frame/story; `w4-s1` records surface; `w4-s4` bootstrap frame; observability-records contract v0; product guarantees RESUME/ISO/SEE/GUARD | New run states, new records schema, or a redesigned resume procedure                             |
| **Routed-finding surface**                     | Carry exposed gaps, contradictions, and under-specified authority back to the right owners without resolving them locally                                                                                                                         | Wave 5's finding posture: route to existing wave/design/product owners or U9 collection                                                       | The owning wave/design/product docs and the track dependency rule                                                                                              | Closing the finding by rewriting the design itself inside Wave 5                                 |

### Relations

| From                                       | Relation                       | To                                                         | Notes                                                                                                           |
| ------------------------------------------ | ------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Authority/provider probe surface           | adversarially probes           | `w4-s3` authority spine + Wave 4b provider parts           | Cross-checks that providers implement against ports and consume core read-only, with SEC-2 as the sharpest seam |
| Authority/provider probe surface           | expands into full scenario for | SEC-2 design posture from `w4-s6`                          | `w4-s6` supplies proof seed; Wave 5 supplies the adversarial phone-home scenario                                |
| Recovery/records integration probe surface | contradiction-checks           | Wave 2 run lifecycle + `w4-s1` records + `w4-s4` bootstrap | Cross-checks stop/resume, checkpoint, binding, no-double-effect, notice, and evidence-record consistency        |
| Recovery/records integration probe surface | validates against              | Observability-records contract v0                          | Ensures the composed claims still fit the stated seam properties                                                |
| Both probe surfaces                        | route findings to              | Existing design/product owners and future U9 collector     | Wave 5 identifies gaps; it does not resolve them locally                                                        |
| Future U9 collector                        | collects                       | `w4-s6` SEC-2 posture + Wave 5 phone-home findings         | Forward reference only; not authored here                                                                       |

### Seams and External Boundaries

- **SEC-2 three-way boundary** — `w4-s6` owns design posture and proof seed; Wave 5 owns the full
  adversarial phone-home scenario; U9 collects both. This seam is fixed by Wave 4b's D-003 and is
  not re-sliced here.
- **Provider boundary rule** — providers implement against Wave 3 ports and consume Wave 4a core
  contracts read-only; Wave 5 probes compliance with that rule rather than rewriting it.
- **Recovery/records integration seam** — Wave 2 owns run-lifecycle states and resume guards,
  `w4-s1` owns records semantics, `w4-s4` owns re-entry procedure, and the records contract owns the
  seam properties; Wave 5 probes whether those four surfaces stay coherent together.
- **Routed-finding boundary** — any contradiction found by Wave 5 routes back to the owning
  design/product surface or to U9 collection; no local design override.

### Lifecycle and State Terms

Wave 5 introduces no new lifecycle states. It reuses the already-settled terms as **probe
vocabulary only**:

- authorization outcomes: `grant`, `deny`, `route`;
- story outcomes: `parked`, `blocked`, `done`, `landed`, `rejected`;
- run outcomes: `previewed`, `started`, `stopped`, `resumed`, `completed`;
- capability posture: attested, missing, stale, autonomy reduced;
- recovery/records terms: safe checkpoint, binding record, no double effect, notice, export.

### Mode and Depth

- **architecture_mode:** `contract/seam design`
- **initial ddd_depth:** `strategic-only`

### Open Questions and Approval

- None at frame time. The wave's purpose, file scope, SEC-2 split, and routed-finding posture are
  all settled by source. The story split and light mode/depth are narrow safe assumptions that do
  not alter ownership beyond the already-named story IDs.
- **Approval status:** ready for authoring.

## 5. Assumptions and Blockers

### Safe Assumptions

- `w5-s1` takes the authority/provider/SEC-2 probe set and `w5-s2` takes the
  recovery/records/bootstrap probe set; this is the only narrow split that matches the story IDs
  and prior-wave deferrals.
- Wave 5 later authors planning-track artifacts only; any substantive gap it finds routes back to
  the owning design surface rather than becoming a new design target in Wave 5 itself.
- The lightest valid framing is seam-focused and strategic rather than lifecycle, ports, or
  tactical domain design, because this wave probes settled seams instead of defining new ones.

### Blocking Questions

None.

## 6. DDD Context Candidates

| Candidate context                             | Owns                                                                                                                                                                                | Reads                                                                                                                            | Does Not Own                                                                      | Open ownership question                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Authority and provider red team**           | Adversarial probe design over the authority spine and provider seams; the full SEC-2 phone-home scenario; contradiction checks for read-only provider consumption of core semantics | `w4-s3`, Wave 4b provider frames/stories, Wave 3 provider ports, product FENCE/EARN/GUARD/DOOR/SEC/STACK/DRIVE guarantees        | Any new provider contract, policy rule, evidence category, or authority mechanism | None at frame time                                      |
| **Recovery and records integration red team** | Adversarial probe design over stop/resume, record causality, binding immutability, no-double-effect, notices, and export/integrity interactions                                     | Wave 2 recovery/run-lifecycle sources, `w4-s1`, `w4-s4`, observability-records contract, product RESUME/ISO/SEE/GUARD guarantees | Any new run state, records schema, or rewritten bootstrap procedure               | None at frame time                                      |
| **U9 collector (forward reference only)**     | Integration-level collection of red-team findings alongside the Wave 4b SEC-2 posture                                                                                               | Wave 5 outputs and `w4-s6` posture                                                                                               | Performing the Wave 5 adversarial work itself                                     | Not a Wave 5 ownership question; forward reference only |

## 7. Complexity Drivers

- **Invariants:** SEC-2, DRIVE-3, FENCE-1..3, EARN-1/2, GUARD-1/2, RESUME-1..5, ISO-4, SEE-3,
  INV-002, INV-003, INV-006, and the un-numbered `INV-009`+ candidates from Waves 2-4b that Wave 5
  must probe without renumbering.
- **State transitions:** no new states; the complexity is cross-wave coherence among already-settled
  transitions and guards (`grant/deny/route`, `done` versus `landed`, `stopped` versus `resumed`,
  unattended park, notice creation).
- **Integrations:** Wave 4a core contracts with Wave 4b providers; Wave 2 run-lifecycle semantics
  with Wave 4a records/bootstrap; seam contracts with planning-track story ownership.
- **Consistency:** proof versus judgment, records versus projections, binding immutability across
  resume, no-double-effect, and provider claims versus recorded evidence.
- **Security and authorization:** phone-home containment, authority widening, capability staleness,
  GUARD-2 pause/re-approval, and provider inability to redefine core judgment.
- **Migration/deploy:** none — docs-only planning frame.
- **Observability:** record causality, capability events, notice surfaces, stop reasons, export and
  redaction posture as contradiction-check surfaces.
- **Testing:** later story authoring should produce adversarial probe sets, contradiction matrices,
  and routed findings; no runtime or schema tests are in scope for this wave.

## 8. Architecture Mode and Initial DDD Depth

**Selected architecture_mode:** `contract/seam design`

**Selected depth:** `strategic-only`

**Why this depth fits:** Wave 5 is not authoring new entities, states, ports, or tactical domain
machinery. Its job is to pressure-test seams that already exist: core versus provider ownership,
proof versus judgment, lifecycle versus records semantics, and deferred SEC-2/U9 collection
boundaries. That makes seam framing the first useful lens, and a strategic depth sufficient: the
wave needs ownership, contradiction surfaces, routing rules, and scenario families, not new command
models or transaction boundaries.

**Where tactical depth is intentionally omitted:** everywhere. Tactical DDD would imply new
invariant-bearing design machinery, which this wave explicitly does not own. `use-case-slices` is
also intentionally omitted at frame time: the later stories may author probe sequences, but this
frame only needs the strategic split and the ownership/routing rules that constrain those stories.
`lifecycle/state-machine` and `ports-and-adapters` are likewise omitted because those shapes were
already settled by Waves 2 and 3-4b; Wave 5 probes them rather than reframing them.

## 9. Handoff to Author

- **Design artifact target:** `docs/planning/design-track/waves/wave-5-red-team/README.md` and the
  two future story briefs under `stories/` are the next authoring step, but this frame itself does
  not create them.
- **Required methodology profile:** `ddd`
- **Approval status:** ready for authoring
- **Delivery constraints to preserve:** keep the wave light and red-team-only; do not introduce new
  jig entities or design targets; preserve the SEC-2 three-way split exactly; keep findings routed
  to existing owners or future U9 collection; keep product IDs, `INV-*`, and M5a handoff
  categories distinct; continue `INV-009`+ candidate handling without hard-numbering; do not author
  implementation tasks, schemas, TypeScript, or `docs/design/**` changes from this wave.
