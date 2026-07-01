---
id: w3-s1-provider-port-skeleton
wave: 3
status: designed
depends_on: []
design_targets: [docs/design/contracts/providers.md] # deepen in place (D-001); preserve+cite the existing four one-line port interfaces and the Mermaid diagram as the seed; author-technical-design may relocate via DocStructurePlan
reconciles_to:
  [
    STACK-1,
    STACK-2,
    STACK-3,
    STACK-4,
    STACK-5,
    DRIVE-1,
    DRIVE-2,
    DRIVE-3,
    SEC-1,
    SEC-2,
    SEC-3,
    FENCE-2,
    FENCE-3,
    EARN-1,
    EARN-2,
    MERGE-2,
    INV-002,
    INV-007,
    SURF-003,
    SURF-006,
    CTX-005,
    DEL-004,
    ENF-004,
  ]
---

# w3-s1-provider-port-skeleton — design the four provider ports

## Objective

Brief a future design session to author the **provider-port skeleton**: the boundary contracts for
the four swappable driver seams — **Agent**, **Execution Host**, **Forge**, **Work Source** — each
stated as an owns / implements / must-not split. This session moves from the overview-altitude
one-line interfaces `docs/design/contracts/providers.md` already draws (Agent = contained worker,
no credentials; Execution host = isolation, honest reporting; Forge = push / PR / merge target;
Work source = where work items originate, never bypasses the plan) to an authored port skeleton
that, for each port, names what CORE owns (the contract, the invariants, the semantics), what the
PROVIDER implements (the concrete adapter), and what the provider must **not** do (redefine core
policy, evidence, authorization, or state semantics). It authors the port contracts adapters
implement against; it does not author any adapter (that is Wave 4b).

The **boundary rule is this story's spine.** Each of the four ports' anti-corruption stance — a
provider implements behind the port but never redefines what core governs — is the load-bearing
correctness property this session must make explicit per port, not an afterthought. Concretely:
the Agent port surface exposes **no** privileged method (no push / PR / merge / credential access —
FENCE-3 / SEC-3 / INV-002); the Execution Host port must **prove** its confinement (SEC-2
no-phone-home is a core-owned invariant the port verifies, never a value it trusts from a provider
self-report — DRIVE-3 honest containment reporting); the Forge port is invoked **only** by the
runner, never the worker (MERGE-2); the Work source port never becomes a second scheduling input
alongside the validated plan.

Per D-001 this session **deepens `docs/design/contracts/providers.md` in place**: the existing four
one-line interfaces and the Mermaid diagram are the seed it preserves and cites, re-projecting and
extending each into an owns / implements / must-not contract (STOP-003: re-project and cite, never
silently overwrite; name any divergence explicitly). Per the confirmed Fence-as-port scope safe
assumption, this session **cites** the Fence's `authorize(request, boundPolicy) → grant \| deny \|
route` decision from `docs/design/core/authorization.md` as the guard every provider request
crosses — it does not redesign the classifier (Wave 4a deepens `authorization.md`).

## Inputs to read

- [`../frame.md`](../frame.md) — this wave's frame: the `AgreedSystemModel`, the provider-port-skeleton
  context candidate, the per-port owns / implements / must-not table (§4), the port-boundary
  invariant candidates (§7), and the InputResolution rows D-001..D-003 settle.
- [`../decisions.md`](../decisions.md) — the three dispositions this story is authored under (D-001
  deepen in place, no rename; D-002 mode `ports-and-adapters`, depth `ports-and-adapters`; D-003
  parallel, no dependency on `w3-s2`) and the confirmed safe assumptions (INV-numbering coordination;
  Fence-as-port scope).
- [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md) and Wave 1's settled story briefs —
  the runner / worker authority-boundary (Wave 1's `concepts.md`): the worker is the Agent seam,
  contained, holds no credentials, cannot push / PR / merge or widen its own authority; the runner is
  jig-core, holds credentials — the shapes the Agent and Forge ports' anti-corruption stances must
  structurally enforce, and which a provider must not redefine.
- [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md) and Wave 2's settled
  story briefs — the state-machine transitions that **invoke** the provider ports: the runner drives
  the Agent port at `started`, and lands through the Forge port at `done → landed` (runner-only,
  MERGE-2). This session names the port-invocation points, not the transitions themselves.
- `docs/design/contracts/providers.md` — the four existing one-line interfaces, the Mermaid diagram,
  the seams-as-authority-boundaries and capabilities-attested postures, and the deferred conformance
  suite / manifest format this session preserves, cites, and deepens into an owns / implements /
  must-not contract per port.
- `docs/design/contracts/README.md` — the three-part edge taxonomy (driving / data / providers) and
  the boundary rule (core governs the seams; core is not a seam) this port skeleton sits inside.
- `docs/design/core/authorization.md` — the Fence's `authorize → grant \| deny \| route` decision
  this session **cites** as the guard every provider (chiefly Agent-port) request crosses; its
  classifier internals (CFG-10 category boundary, escalation routing) stay that stub's own (Wave 4a).
- `docs/design/core/orchestration.md` — the runner as the sole caller of the Forge port (push / PR /
  merge authority, MERGE-2 / FENCE-3) and the driver of the Agent port; cited as the port caller,
  not re-authored.
- `docs/design/core/bootstrap.md` — the composition root that wires the four provider ports ("the one
  place that imports provider implementations"); cited as the wiring point this port skeleton is wired
  by, not deepened (bootstrap's internal wiring rules are Wave 4a's).
- `docs/product/guarantees.md` — STACK-1..5 (guarantees do not depend on vendor; four independently
  swappable seams; BYO-agent as a work-profile choice; capabilities attested; seams are authority
  boundaries), DRIVE-1..3 (prove a driver by conformance; nothing escalates silently; containment
  reported honestly), SEC-1/SEC-2/SEC-3 (no leaks; no phone-home; no forge credentials), FENCE-2/FENCE-3
  (no self-widening; no worker credentials), EARN-1/EARN-2 (autonomy requires fresh capability proof),
  MERGE-2 (push / PR / merge is runner authority).
- `docs/design/notes/runtime-design-m5a.md` — CTX-005 (the driver seams are ports; M5b built only the
  Agent scripted stub; all real adapters are named extension points), SURF-003 (`AgentPort`:
  request / observe only, no privileged method), SURF-006 (`ExecutionHostPort` / `ForgePort` /
  `WorkSourcePort` defined at design altitude, no adapters), ENF-004 (core depends only on ports, not
  adapters), DEL-004 (orchestration + the scripted-stub Agent adapter), INV-002 (structural authority
  separation: the Agent-seam port exposes no privileged method) this session preserves — kept a
  namespace distinct from `INV-*` and product IDs.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc(s) at the design_targets: the deepened four provider ports in
   `docs/design/contracts/providers.md`, each with its owns / implements / must-not split.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting numbering.
   This session names its **port-boundary invariant candidates** (providers-hold-no-credentials;
   no-phone-home / SEC-2 at the Execution Host port, proven-not-trusted; the runner-only Forge port;
   the Work-source-never-bypasses-the-plan boundary; capabilities-attested-not-assumed). It does
   **not** hard-number them: they are candidates for `INV-009`+, flagged for cross-wave coordination
   with Wave 2's own not-yet-numbered `INV-009`+ candidates (reconciled at consolidation / U9;
   settled by `docs/design/conventions.md`'s continuation rule). If it must number one locally, it
   continues from `INV-009` (never resets) and records why in decisions.md.
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- For each of the four ports (Agent, Execution Host, Forge, Work Source): what does CORE own (the
  contract, the invariants, the semantics), what does the PROVIDER implement (the concrete adapter),
  and what must the provider **not** do (redefine core policy / evidence / authorization / state
  semantics)? State this owns / implements / must-not split as the load-bearing anti-corruption
  property, preserving and citing each port's existing one-line interface as the seed.
- How does the **Agent port** surface expose **no** privileged method (no push / PR / merge /
  credential access — FENCE-3 / SEC-3 / INV-002), so that a provider cannot widen its own authority
  (FENCE-2), and how does every Agent-port request cross the Fence's `authorize → grant \| deny \|
route` decision (cited from `authorization.md`) before executing?
- How is **SEC-2 no-phone-home** a core-owned invariant the **Execution Host port must prove**, not
  a value it trusts from a provider self-report — with the port's honest containment reporting
  (DRIVE-3) and the isolation-strength categories a host reports against, so stronger-isolation
  powers unlock only when confinement is genuinely proven?
- How is the **Forge port** invoked **only** by the runner (never the worker / Agent port), carrying
  push / PR / merge authority (MERGE-2), respecting branch protection and merge queues, and where a
  block surfaces as a real PR — without the provider redefining what "done" or "landed" means (Wave
  1 / Wave 2's territory)?
- How does the **Work source port** supply provenance or import/sync behavior **without** becoming a
  second scheduling input — everything it originates still reaching the runner only through a
  validated plan (never a direct handoff that skips `PlanValidator`)?
- How does capability attestation (EARN-1 / EARN-2 / STACK-4 / DRIVE-1) gate autonomy across all four
  ports — a provider proves what it can do before jig grants it autonomy; missing / stale / failed
  proof means more human checkpoints, not a weakened guarantee — as a core-owned gate a provider
  cannot self-certify around?

## Invariants to preserve

- `STACK-1` through `STACK-5` — guarantees do not depend on the vendor; four independently swappable
  seams; BYO-agent is a work-profile choice; capabilities are attested; seams are authority
  boundaries. Swapping a driver must move no control, evidence, or recovery boundary.
- `DRIVE-1`, `DRIVE-2`, `DRIVE-3` — a driver earns its place by a conformance suite (not assertion);
  a provider manifest declares its scope and a change requires fresh approval; containment strength is
  reported honestly. The port contracts carry the shape these guard, without designing the conformance
  suite or manifest format (both deferred by `providers.md`).
- `SEC-1`, `SEC-2`, `SEC-3` — secrets stay out of records; the worker cannot phone home and the
  confinement is proven (SEC-2 is the Execution Host port's core-owned, proven-not-trusted invariant);
  the worker never holds forge credentials.
- `FENCE-2`, `FENCE-3` — permission cannot widen mid-run; the worker holds no privileged credentials.
  The Agent port surface must expose no privileged method.
- `EARN-1`, `EARN-2` — autonomy requires fresh, positive capability proof specific to the driver and
  run context; missing / stale / failed proof means less autonomy, not a weaker guarantee.
- `MERGE-2` — push / PR / merge is runner authority; the thing that writes code is not the thing that
  ships it. The Forge port is invoked only by the runner.
- `INV-002` (structural authority separation: the Agent-seam port exposes no privileged method) from
  `runtime-design-m5a.md` — the already-live invariant the Agent-port contract must preserve;
  `INV-007` (validate-once at the boundary) is cited where the Work source port defers to
  `PlanValidator` (owned by `w3-s2`).
- No new `INV-*` numbers are hard-numbered by this story; it **names port-boundary invariant
  candidates** for `INV-009`+, flagged for cross-wave coordination with Wave 2's own not-yet-numbered
  candidates. If this session must number one locally, it continues from `INV-009` (never resets) and
  records why in decisions.md.

## Must not decide

- The Fence's `authorize → grant \| deny \| route` **classifier internals** — the CFG-10 fixed
  category boundary and escalation routing stay `authorization.md`'s own; this session **cites** the
  Fence as the worked core-owned-port example every provider request crosses, and does not redesign
  it. `authorization.md` is not a target (Wave 4a deepens it).
- The **data ports** (`PlanValidator`, `RunStore`) and the **driving port** (operator-control) — that
  is `w3-s2-data-and-driving-ports` (parallel, D-003). This session cites the Work source port's
  deference to `PlanValidator` and the runner's emission into `RunStore`, but owns neither.
- Bootstrap's **internal** provider-wiring rules — how the composition root selects and wires each
  adapter — are Wave 4a's core-parts territory; this session cites bootstrap as the wiring point and
  frames the port shapes it wires, not the wiring rules.
- Any concrete **provider adapter** — an Agent implementation, an execution-host sandbox, a forge
  integration, a work-source connector — is Wave 4b. This session frames the port contracts adapters
  implement against, not the adapters. The conformance suite and provider-manifest format
  (`providers.md`'s own deferrals) are not claimed here.
- The work-item and run **state machines** — Wave 2's settled territory. This session names only the
  port-invocation points within them (the Agent port at `started`; the Forge port at `done →
landed`), not the transitions.
- The **entity shapes** a provider must not redefine (Work item, Run, Policy / Work profile /
  Repo-floors) — Wave 1's settled territory; this session cites them as the semantics providers must
  respect, and does not re-open them.
- **Numbering** the consolidated invariant ledger — this session names port-boundary invariant
  candidates; numbering from `INV-009` is coordinated with Wave 2's candidates at consolidation.
- Field-level schema, TypeScript interfaces, JSON Schema, method signatures, or any frozen port
  contract — deferred per `docs/design/README.md`; no adapter code; the v0 contracts stay unfrozen.

## Exit criteria

- The deepened four provider ports exist in `docs/design/contracts/providers.md`, each stating its
  owns / implements / must-not split, with the anti-corruption stance (a provider must not redefine
  core policy / evidence / authorization / state semantics) framed as the load-bearing correctness
  property, not an afterthought.
- The existing four one-line interfaces and the Mermaid diagram are **preserved and cited** as the
  seed, re-projected and extended into per-port contracts rather than overwritten; any divergence
  from the seed is named explicitly (STOP-003).
- SEC-2 no-phone-home is stated at the Execution Host port as a core-owned invariant the port
  **proves** (not trusts from a self-report), with honest containment reporting (DRIVE-3); the Agent
  port exposes **no** privileged method (FENCE-3 / SEC-3 / INV-002); the Forge port is invoked **only**
  by the runner (MERGE-2); the Work source port never bypasses the validated plan.
- The Fence's `authorize → grant \| deny \| route` decision is **cited** as the guard every provider
  request crosses, with `authorization.md`'s classifier internals left untouched; capability
  attestation (EARN-1/2 / STACK-4 / DRIVE-1) is stated as the core-owned autonomy gate a provider
  cannot self-certify around.
- The port-boundary invariant candidates this session names are handed forward for `INV-009`+
  consolidation, flagged for cross-wave coordination with Wave 2's candidates; the three ID namespaces
  (product IDs / `INV-*` / handoff categories) are kept distinct.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This wave's [`../frame.md`](../frame.md) — the frame that seeds this story's frame step.
- The authored design_targets.
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story authors real
jig port contracts (the four provider seams' owns / implements / must-not skeleton), the boundary
the whole wave exists to make enforceable, so the full frame → author → design-review pass applies,
not the light method Wave 0 used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `ports-and-adapters`, `ddd_depth` `ports-and-adapters` per D-002). This wave's
   build-time frame at [`../frame.md`](../frame.md) seeds it; the session confirms and, where it
   deepens the candidate owns / implements / must-not splits into authored port contracts, extends the
   `AgreedSystemModel` rather than starting from nothing.
2. author-technical-design → the deepened four provider ports at design_targets, preserving and citing
   the existing one-line interfaces and diagram as its seed.
3. review-technical-design → three lenses (architecture-enforceability: each port's anti-corruption
   stance is stated so a provider cannot redefine core policy / evidence / authorization / state
   semantics, the Agent port exposes no privileged method, the Forge port is runner-only, and SEC-2
   no-phone-home is proven-not-trusted at the Execution Host port; domain-correctness: each port's
   owns / implements / must-not split reconciles to its STACK / DRIVE / SEC / FENCE / EARN / MERGE IDs
   and preserves INV-002, and the Fence guard cites `authorization.md` correctly; agreement-integrity:
   nothing contradicts the wave frame's `AgreedSystemModel`, Wave 1's entity model, Wave 2's
   state-machine port-invocation points, or `w3-s2`'s data/driving-port seam). Dispositions recorded
   into this wave's [`../decisions.md`](../decisions.md); settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved design_targets path in the track's future
traceability matrix; hand the named port-boundary invariant candidates forward for `INV-009`+
consolidation, coordinated with Wave 2's candidates.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place, no rename), the provider-port skeleton deepens
`docs/design/contracts/providers.md` directly — preserving and citing the existing four one-line
port interfaces and the Mermaid diagram as its seed and extending each into an owns / implements /
must-not contract — rather than authoring a new sibling ports doc. This is the STOP-003-compliant
"re-project and cite": the stub's existing content is the deepened doc's seed, not something
overwritten. The future `author-technical-design` session may relocate the target via its
`DocStructurePlan` if its own frame finds a better home; this brief records the resolved target, not
a frozen path. `docs/design/core/authorization.md` (the Fence) is **cited, not edited**; no
provider adapter is authored (Wave 4b).
