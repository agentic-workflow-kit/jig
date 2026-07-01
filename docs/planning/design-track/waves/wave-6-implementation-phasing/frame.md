---
title: "Wave 6 frame — implementation phasing"
status: draft — frame (intake)
methodology: ddd
---

# Problem Frame — Wave 6: Implementation phasing

> Intake artifact for the DDD-first deep-design track's Wave 6. It frames the
> **implementation-phasing / delivery-handoff** altitude ahead of the future Wave 6 story brief
> `w6-s1-implementation-phasing`. It records source evidence, `InputResolution`, the
> `AgreedSystemModel`, architecture mode, and initial DDD depth before authoring. Produced by
> applying the `technical-design` pack's `frame-technical-design` skill; the next stage is
> `author-technical-design`, but this pass stops at the frame.
>
> This wave is intentionally light, like Wave 5. It does **not** introduce new jig entities,
> provider seams, runtime states, schemas, or implementation trackers. It sequences the
> **already-settled design** into implementation-ready phases for a future delivery track. It is
> a handoff artifact, not code and not a delivery plan execution artifact.

## 1. Scope and Goal

- **Source request:** deep-design track, Wave 6 — frame a **light implementation-phasing wave**
  under `docs/planning/design-track/waves/wave-6-implementation-phasing/`, creating only this
  `frame.md`. The future story is `w6-s1-implementation-phasing`. The wave sequences settled
  design into implementation-ready phases, does not introduce entities, and does not author real
  design docs, delivery trackers, or implementation tasks.
- **Goal:** produce an `AgreedSystemModel` clean and citable enough to seed the future Wave 6
  charter and story brief, with a source-grounded phase model that orders implementation around
  settled contracts, core-before-provider dependency edges, stub-first local MVP posture, and
  later hardening gates from the red-team work.
- **Out of scope:** authoring `README.md`, story briefs, `decisions.md`, `story-dag.md`,
  `dependency-dag.md`, `traceability.md`, `review-and-red-team.md`, or discoverability edits;
  authoring or editing any `docs/design/**` file; runtime code, schemas, TypeScript, exports, or
  package work; creating a real implementation tracker; re-litigating product or design decisions;
  hard-numbering new `INV-*` values below `INV-009`.

## 2. Source Map

| Source                                                                                                                                | Authority                                                       | Establishes                                                                                                                                                                          | Gaps / stale risk                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [`../../README.md`](../../README.md)                                                                                                  | authoritative — track charter                                   | Wave 6's stated purpose: sequence the settled design into implementation-ready phases; handoff to a future delivery track, not code itself                                           | One-line scope only; this frame supplies the precise phasing posture beneath it                                                              |
| [`../../session-template.md`](../../session-template.md)                                                                              | authoritative — method/template                                 | The standard frame/charter/story structure this wave follows, including the single-story scaffold under the implementation-phasing charter                                           | Template source only; does not establish delivery ordering                                                                                   |
| [`../wave-5-red-team/README.md`](../wave-5-red-team/README.md) + [`../wave-5-red-team/decisions.md`](../wave-5-red-team/decisions.md) | authoritative — immediate prior-wave charter/decision log       | Wave 6 follows Wave 5, treats red-team outputs as later gate inputs, and inherits the sequencing-only posture after the probe wave                                                   | Prior-wave sources define the gate posture; they do not themselves author the Wave 6 phase model                                             |
| `git log --oneline` on branch `docs/design-track-planning`                                                                            | authoritative — live repo state                                 | Wave 5 is committed at `d85bc16`; current work is continuing from the settled planning track state                                                                                   | None material after live check                                                                                                               |
| [`../wave-5-red-team/frame.md`](../wave-5-red-team/frame.md)                                                                          | authoritative — immediate prior-wave frame                      | Wave 5's routed-finding posture, SEC-2 ownership split, and the light-frame pattern Wave 6 should preserve while changing altitude from probes to sequencing                         | Wave 5 probes and routes findings; it does not by itself decide implementation order                                                         |
| [`../wave-5-red-team/decisions.md`](../wave-5-red-team/decisions.md) + both Wave 5 stories                                            | authoritative — immediate prior-wave decisions and story briefs | Wave 5's approved split, the probe-only boundary, and the expectation that red-team findings stay routed to owners or U9 instead of being silently resolved                          | Story briefs prescribe future probe outputs, not the final findings themselves                                                               |
| [`../wave-4a-core/README.md`](../wave-4a-core/README.md)                                                                              | authoritative — settled core-wave charter                       | The fixed-logic implementation surfaces and their dependency edges: records, plan/policy/evidence, authority, bootstrap; plus Wave 4a's deepen-in-place and per-part ownership rules | Charters define design ownership and output targets, not delivery phase bars                                                                 |
| [`../wave-4b-providers/README.md`](../wave-4b-providers/README.md)                                                                    | authoritative — settled provider-wave charter                   | Providers implement against ports and consume Wave 4a contracts read-only; only the scripted-worker stub is built first, while other seams remain named extension points             | Charters define provider design posture, not implementation sequencing detail by themselves                                                  |
| `docs/design/README.md` + `docs/design/core/README.md`                                                                                | authoritative — current design-layer overview                   | The current design surfaces, stub status, fixed-logic vs edge-interface split, bootstrap/core flow, and the trusted-runner versus seam model the phases must respect                 | High altitude; implementation phase detail must be inferred from deeper sources                                                              |
| `docs/design/core/{plan-intake,records,authorization,bootstrap,orchestration}.md`                                                     | authoritative — current core design stubs                       | The core execution spine and its dependency shape: validate plan, append records, fail-closed authorization, bind/wire/bootstrap, and runner-owned orchestration/landing             | Stub altitude; precise code layout is intentionally deferred                                                                                 |
| `docs/design/contracts/{execution-plan-contract-v0,observability-records-contract-v0,providers,driving}.md`                           | authoritative — seam contracts and boundary stubs               | The one hard input, the durable output, thin operator surface, and four provider seams implementation phases must preserve                                                           | Contract shape is v0 and not frozen; phase work must avoid silent contract mutation                                                          |
| `docs/product/jig.md`, `docs/product/guarantees.md`, `docs/product/concepts.md`                                                       | authoritative — product contract                                | Outcome commitments, runner/worker boundary, story/run outcomes, track model, and the local-first/operator-initiated posture implementation phases must preserve                     | Product says what must hold, not how phases are grouped                                                                                      |
| `docs/design/notes/runtime-design-m5a.md` (§12-§15)                                                                                   | authoritative — prior delivery-oriented design record           | Existing candidate delivery slice areas, sequencing constraints (`SEQ-001`), validation posture (`VAL-001`), stop conditions (`STOP-001..004`), and the dry-run fixture expectations | M5a is a narrower local MVP record; Wave 6 must reuse its still-live sequencing facts without shrinking the broader settled design back down |

## 3. InputResolution

| Required input                                                                                           | Source evidence                                                                                                                                                                                                                                                                                      | Resolution                                                                                                                                                                                                                                             | Owner / impact                                                                                  | Approval status |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | --------------- |
| **Artifact scope for this pass:** does Wave 6 create only a frame, or also charter/stories/decisions?    | The committed Wave 6 directory shape, [`../../session-template.md`](../../session-template.md), and the current charter/story scaffold all separate the frame intake step from later charter/story authoring                                                                                         | **provided** — create only `frame.md`; do not author charter, story, `decisions.md`, or any integration docs                                                                                                                                           | Current file scope and downstream coordinator work                                              | approved        |
| **Wave purpose:** is Wave 6 implementation design, implementation sequencing, or a delivery tracker?     | [`../../README.md`](../../README.md), [`../wave-5-red-team/README.md`](../wave-5-red-team/README.md), and [`../wave-5-red-team/decisions.md`](../wave-5-red-team/decisions.md) all describe Wave 6 as implementation phasing and a handoff to a future delivery track, not code or tracker execution | **provided** — Wave 6 sequences settled design into implementation-ready phases only; it does not author code, delivery tickets, or runtime implementation artifacts                                                                                   | Governs every section of the frame and the future story's boundaries                            | approved        |
| **Should phase order follow wave chronology or implementation dependencies?**                            | Wave 4a and 4b charters define core-before-provider boundaries; `runtime-design-m5a.md` names `SEQ-001` scaffolding first, records/intake/fence before orchestration, entry point last                                                                                                               | **safe assumption** — order phases by implementation dependency and contract readiness, not by planning-wave chronology alone. The waves remain evidence sources, but phase order follows the executable spine they settled                            | Drives the future phase model and avoids a wave-shaped but dependency-blind implementation plan | not required    |
| **What is the first executable slice posture: full provider set or stub-first local spine?**             | `docs/design/contracts/providers.md` says only the scripted-worker stub is built first; product says local-first; `runtime-design-m5a.md` names real providers and richer isolation as deferred extension points                                                                                     | **provided** — the first executable slice remains stub-first and local-first: core spine plus scripted worker first, then richer provider realizations later                                                                                           | Shapes the earliest implementation phases and keeps scope aligned with current design truth     | approved        |
| **How should Wave 5 red-team work affect phasing?**                                                      | Wave 5 frame/decisions/stories say findings route to owners or U9, preserve SEC-2 split, and do not locally redesign the system                                                                                                                                                                      | **safe assumption** — treat Wave 5 outputs as hardening and gate inputs for later phases, not as a separate implementation phase that re-owns design. Wave 6 names where those findings bite implementation order, but does not collect or settle them | Keeps phasing connected to red-team evidence without collapsing Wave 5 or U9 boundaries         | not required    |
| **Does Wave 6 own contract edits, invariant numbering, or U9 collection work?**                          | The track README, Wave 5's settled gate posture, and the current wave scope all leave integration collection to a later sink and keep namespaces distinct                                                                                                                                            | **provided** — no contract mutation, no hard-numbered new invariants, no U9 collection work here. Phase sequencing cites those later obligations read-only                                                                                             | Preserves namespace discipline and avoids stealing U9's ownership                               | approved        |
| **What should the phase output optimize for: module/file layout or delivery gates?**                     | `docs/design/README.md` explicitly defers package/source layout; `runtime-design-m5a.md` provides validation, enforcement, and stop-condition inputs instead                                                                                                                                         | **provided** — Wave 6 optimizes for phase order, dependency edges, and delivery gates, not for final package decomposition or file layout                                                                                                              | Prevents the story from inventing implementation structure not yet owned by design              | approved        |
| **Lightest valid framing lens for implementation phasing:** which mode/depth fit a sequencing-only wave? | The track README, Wave 5 posture, and the settled design surfaces all point to seam ordering and handoff constraints rather than new entities, lifecycles, or tactical aggregates                                                                                                                    | **safe assumption** — `architecture_mode: contract/seam design`, `ddd_depth: strategic-only`. Wave 6 sequences contracts, ownership boundaries, and gating surfaces already settled elsewhere                                                          | Keeps the frame light and aligned with its handoff role                                         | not required    |

## 4. AgreedSystemModel

### Source Inputs Used

| Source                                                       | Establishes                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Track README, session template, and Wave 5 charter/decisions | Wave 6's file scope, light-frame posture, delivery-handoff purpose, and the gate posture it inherits after Wave 5 |
| Wave 5 frame, decisions, and stories                         | Red-team findings are routed/gating inputs, not locally re-owned implementation work                              |
| Wave 4a and 4b charters                                      | Core-before-provider dependency edges and provider read-only consumption of core semantics                        |
| Design README, core overview, and stub docs                  | The fixed-logic spine and the operator/contracts/provider surfaces implementation must realize                    |
| v0 contracts and provider/driving stubs                      | Input/output and seam boundaries phases must preserve                                                             |
| Product docs and runtime-design-m5a delivery inputs          | Outcome commitments, local-first posture, and prior sequencing/gate constraints reused as delivery inputs         |

### Unresolved Required Inputs

None. The wave's scope, lightness, and delivery-handoff posture are directly provided by source. The phase
ordering and red-team-to-hardening posture are narrow safe assumptions consistent with the settled
design and prior delivery-input notes.

### High-Level System Entities

Wave 6 introduces no new jig entities. Its system model therefore treats **implementation phase
surfaces** as the framing units for later authoring.

| Entity                                 | Responsibilities                                                                                                                                                          | Owns                                                                                                          | Reads                                                                                                       | Does Not Own                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Implementation sequencing surface**  | Define the phase order that turns the settled design into implementation-ready slices without reopening design ownership                                                  | The phase ordering logic, dependency rationale, and delivery-handoff posture for `w6-s1`                      | Track charter, prior-wave charters/frames/stories, and M5a delivery inputs                                  | Code, tracker rows, contract edits, or package structure decisions                      |
| **Core realization phase surface**     | Sequence the fixed-logic spine into the earliest executable slice: scaffolding, plan intake, records, authorization, bootstrap, orchestration, and their validation gates | The phase grouping and dependency edges for core implementation                                               | `docs/design/core/**`, the two v0 contracts, `runtime-design-m5a.md` sequencing and validation inputs       | Provider-owned adapter behavior, U9 collection work, or new core design decisions       |
| **Provider realization phase surface** | Sequence adapter realization against the already-settled ports and core contracts, preserving the read-only provider rule                                                 | The phase grouping for Agent / Execution host / Forge / Work source realization after the core spine is ready | `docs/design/contracts/providers.md`, Wave 4b charter, core contracts and records/evidence surfaces         | Redefining policy, evidence, authorization, lifecycle semantics, or core invariants     |
| **Hardening and gate surface**         | Turn red-team pressure, contract preservation, conformance expectations, and stop conditions into later implementation gates                                              | The sequencing role of validation, hardening, and red-team follow-through across phases                       | Wave 5 artifacts, v0 contracts, `runtime-design-m5a.md` testing/enforcement/stop inputs, product guarantees | Re-owning Wave 5 findings, collecting U9 artifacts, or shipping new product commitments |

### Relations

| From                               | Relation             | To                                                            | Notes                                                                                                                          |
| ---------------------------------- | -------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Implementation sequencing surface  | orders               | Core realization phase surface                                | Core implementation comes first because bootstrap, runner, records, authorization, and plan intake define the executable spine |
| Implementation sequencing surface  | orders after         | Provider realization phase surface                            | Provider realizations follow the core spine and consume its contracts read-only                                                |
| Implementation sequencing surface  | carries forward into | Hardening and gate surface                                    | Later phases convert red-team, contract, and proof expectations into delivery gates                                            |
| Core realization phase surface     | preserves            | Execution-plan and observability-records contract v0 surfaces | These are cited seam contracts, not locally frozen or redesigned                                                               |
| Provider realization phase surface | implements against   | Wave 3 ports + Wave 4a core contracts                         | Provider work must not redefine core policy/evidence/authorization/state semantics                                             |
| Hardening and gate surface         | pressure-tests       | Core and provider realizations                                | Uses Wave 5 red-team posture, contract checks, golden traces, and conformance expectations as gates                            |
| Future delivery track              | consumes             | Wave 6 story output                                           | Wave 6 hands off sequencing; it does not execute delivery itself                                                               |
| U9 collector                       | collects             | Traceability and review/red-team integration                  | Wave 6 keeps these obligations visible but does not author them                                                                |

### Seams and External Boundaries

- **Delivery-handoff boundary** — Wave 6 produces implementation-ready sequencing for a future
  delivery track; it does not produce the tracker or the code itself.
- **Core/provider boundary** — providers implement against ports and consume Wave 4a core
  semantics read-only; phase order must preserve that boundary rather than flatten it.
- **Contract boundary** — `execution-plan-contract-v0.md` and
  `observability-records-contract-v0.md` stay cited and unfrozen. Implementation phases may realize
  them, but Wave 6 does not authorize silent contract edits.
- **Red-team/U9 boundary** — Wave 5 owns adversarial probes and routed findings; U9 owns final
  cross-wave collection. Wave 6 only places those findings in the phase order as hardening inputs.
- **Stub-first boundary** — scripted worker and local-first runtime remain the first executable
  realization; richer providers and stronger proof surfaces follow later.

### Lifecycle and State Terms

Wave 6 introduces no new jig runtime lifecycle states. It reuses the already-settled terms only as
**sequencing vocabulary**:

- work-item outcomes: `parked`, `blocked`, `done`, `landed`, `rejected`;
- run outcomes: `previewed`, `started`, `stopped`, `resumed`, `completed`;
- phase-only handoff terms: foundation, core realization, provider realization, hardening, future
  delivery handoff.

The phase-only terms are delivery labels, not new runtime states or product concepts.

### Mode and Depth

- **architecture_mode:** `contract/seam design`
- **initial ddd_depth:** `strategic-only`

### Open Questions and Approval

- None at frame time. The wave's purpose, scope, stub-first posture, and contract-preserving phase
  model are settled by source or narrow safe assumption.
- **Approval status:** ready for authoring.

## 5. Assumptions and Blockers

### Safe Assumptions

- Phase order should follow **implementation dependency order**, not the wave chronology by itself:
  core spine first, providers second, hardening gates later.
- The earliest executable slice remains **local-first and stub-first**, centered on the scripted
  worker and the fixed core spine before richer provider realizations.
- Wave 5's red-team work influences implementation as **phase gates and hardening inputs**, not as a
  separate delivery-owned design surface.
- Phase authoring should optimize for **gates, sequencing, and ownership boundaries**, not package
  layout or tracker structure, because those remain deferred elsewhere.

### Blocking Questions

None.

## 6. DDD Context Candidates

| Candidate context              | Owns                                                                                                                               | Reads                                                                                               | Does Not Own                                            | Open ownership question |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------- |
| **Core realization**           | Delivery-phase ordering for plan intake, records, authorization, bootstrap, orchestration, and the earliest executable spine       | `docs/design/core/**`, v0 contracts, runtime-design delivery inputs                                 | Provider semantics, U9 collection, or contract mutation | None at frame time      |
| **Provider realization**       | Delivery-phase ordering for Agent / Execution host / Forge / Work source adapter realization after core readiness                  | `docs/design/contracts/providers.md`, Wave 4b charter, core contracts and records/evidence surfaces | Core policy/evidence/authorization/state ownership      | None at frame time      |
| **Verification and hardening** | Delivery-phase ordering for contract checks, golden traces, red-team follow-through, conformance expectations, and stop conditions | Wave 5 artifacts, `runtime-design-m5a.md`, product guarantees, v0 contracts                         | Re-owning Wave 5/U9 artifacts or creating new design    | None at frame time      |
| **Future delivery handoff**    | The authored implementation-phasing artifact that a later delivery track consumes                                                  | Wave 6 frame and later story output                                                                 | Executing the delivery work itself                      | None at frame time      |

## 7. Complexity Drivers

- **Invariants:** fail-closed authorization, policy fixed at launch, records-as-evidence,
  no-double-effect, provider read-only consumption of core semantics, never-bypasses-plan, and
  honest containment reporting all constrain phase order.
- **State transitions:** no new lifecycles are introduced, but implementation order must preserve
  the settled run/work-item states, preview/start/stop/resume behavior, and done-versus-landed
  split.
- **Integrations:** execution-plan input, observability-records output, operator surface,
  bootstrap/core flow, and four provider seams all create dependency edges across phases.
- **Consistency:** binding immutability, append-only records, replay purity, capability proof
  freshness, and contract preservation make early scaffolding and verification non-optional.
- **Security and authorization:** no worker-held credentials, no phone-home, fixed-category
  authorization, narrow human grants, and redaction/export posture all create phase gates rather
  than optional polish.
- **Migration/deploy:** local-first, stub-first, and unfrozen contract shape mean the first
  implementation phases must realize seams conservatively and avoid schema-freeze assumptions.
- **Observability:** the earliest phases must produce durable records, preview/binding visibility,
  and inspectable gates because later hardening and red-team validation depend on them.
- **Testing:** contract checks, golden run traces, conformance expectations, seeded architecture
  violations, and red-team follow-through shape the exit bars for later phases.

## 8. Architecture Mode and Initial DDD Depth

**Selected architecture_mode:** `contract/seam design`

**Selected depth:** `strategic-only`

**Why this depth fits:** Wave 6 is not authoring runtime behavior, providers, or delivery code. Its
job is to sequence implementation around already-settled contracts, ownership boundaries, and
hardening gates. The first useful lens is therefore seam ordering: what must exist before what, what
must stay read-only, which obligations become gates later, and where a future delivery track picks
up. Strategic DDD is sufficient because the artifact needs ownership, reads/does-not-own boundaries,
and phase relations, not new aggregates or transaction models.

**Where tactical depth is intentionally omitted:** everywhere. Tactical DDD would imply new
invariant-bearing implementation design, which Wave 6 does not own. `use-case-slices` is also
intentionally omitted at frame time: the future story may author concrete phase slices and exit
criteria, but this frame only needs the strategic ordering logic and boundary rules that constrain
them.

## 9. Handoff to Author

- **Design artifact target:** `docs/planning/design-track/waves/wave-6-implementation-phasing/README.md`
  and the future story brief `stories/w6-s1-implementation-phasing.md` are the next authoring
  targets, but this frame itself does not create them.
- **Required methodology profile:** `ddd`
- **Approval status:** ready for authoring
- **Delivery constraints to preserve:** keep the wave light and sequencing-only; do not introduce
  new jig entities, states, or design targets; preserve the core/provider boundary and the
  contract-preserving posture; keep product IDs, `INV-*`, and M5a handoff categories distinct;
  continue `INV-009`+ candidate handling without hard-numbering; do not author code, schemas,
  TypeScript, package layout, or a real implementation tracker; treat Wave 5 findings as hardening
  inputs and U9 as the later integration collector.
