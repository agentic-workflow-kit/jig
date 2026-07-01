---
id: w4-s5-agent-provider
wave: wave-4b-providers
status: designed
depends_on: [] # D-006: the shared providers.md is contention, not a logical dependency; serialize-vs-parallel is contingent on the OPEN DocStructurePlan split question, stated canonically in this story
design_targets: [docs/design/contracts/providers.md] # deepen in place (D-001): the Agent section — stub-vs-real-driver posture, structural no-privileged-method guarantee (INV-002, cited), attestation-claim shape supplied to w4-s2/w4-s3. The Agent port line Wave 3's w3-s1 seeded here is PRESERVED and CITED. author-technical-design may relocate via the OPEN DocStructurePlan split question
reconciles_to:
  [
    STACK-1,
    STACK-2,
    STACK-4,
    STACK-5,
    DRIVE-1,
    EARN-1,
    EARN-2,
    FENCE-1,
    FENCE-2,
    FENCE-3,
    MERGE-1,
    MERGE-2,
    ISO-1,
    INV-002,
  ]
---

# w4-s5-agent-provider — design the Agent provider (contained coding worker)

## Objective

Brief a future design session to author the **Agent provider** — the contained coding worker that
reads a work item, writes code, runs checks, and reports — deepening the **Agent section** of
`docs/design/contracts/providers.md` **in place** (D-001) from the port skeleton Wave 3's `w3-s1`
left it at into an authored, boundary-respecting provider design. This session moves from the
overview-altitude interface the stub already draws — "request work, produce code, run checks, report
progress"; "holds no credentials" — to the **adapter-level design behind the port**: the structural
(not merely policy) no-privileged-method guarantee, the **stub-vs-real-driver posture**, and the
capability-attestation **claim** the adapter supplies into the core evidence model.

Per **D-002** this part runs at `architecture_mode: ports-and-adapters`, `ddd_depth:
ports-and-adapters` — one rung below `w4-s6`'s `tactical-ddd`. Its central invariant, "no privileged
method," is already a **closed, numbered** invariant (`INV-002`, enforced as a compile-time type/
import rule `ENF-002` in `runtime-design-m5a.md`) — this session **cites** it, it does not re-mint it
as a candidate. Its only built adapter is the **scripted-worker stub**; the real agent driver and its
concurrency implications are a named extension point, so the tactical escalation Wave 3's D-002 keyed
on "concurrency (ISO-4) + real provider adapters" does **not** land here (it lands in `w4-s6`). This
is adapter-isolation work: the stub-vs-real-driver posture, the claim-supply relationship, and the
future conformance-suite hook.

Per D-001 this session **deepens the Agent section of `providers.md` in place**, preserving and
citing the existing Owns/Interface/Notes/Diagram — including the stub-allowance Note — as the seed
(STOP-003: re-project and cite, never overwrite; name any divergence explicitly). The **boundary
rule** is the spine (D-004): the Agent provider implements against Wave 3's Agent port and consumes
Wave 4a's core contracts (`w4-s2` evidence/attestation, `w4-s3` authority, `w4-s1` records)
**read-only** — it must **not** redefine core policy, evidence sufficiency, authorization, or state
semantics. It **supplies** a capability-attestation claim; `w4-s3` **judges** it (EARN-1/2) and
`w4-s1` records it — never the reverse.

## Inputs to read

- [`../frames/w4-s5-agent-provider.md`](../frames/w4-s5-agent-provider.md) — this part's frame: the
  source map, `InputResolution`, `AgreedSystemModel` (`architecture_mode` `ports-and-adapters`,
  `ddd_depth` `ports-and-adapters`), the entity model (Agent port / scripted-worker stub / real agent
  driver / capability-attestation claim), and the cross-part seams.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under
  (D-001 deepen in place, shared file; D-002 `ports-and-adapters`/`ports-and-adapters`; D-004 the
  boundary rule and the orphaned-ID owners — STACK-4/DRIVE-1/EARN-2 s5-secondary; D-005 `INV-002`
  cited not re-minted; D-006 `depends_on: []` and the open split question) and the confirmed safe
  assumptions.
- [`../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) and Wave 3's `w3-s1` — the Agent port's
  candidate anti-corruption stance ("the port surface exposes no privileged method... a structural,
  not a policy, guarantee"), the port shape this session deepens the adapter behind, preserving and
  citing the port line as the seed.
- The four Wave 4a committed frames, **cited read-only** —
  [`../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)
  (the evidence/attestation category model this session's claim is expressed against; MERGE-1
  observed-not-self-reported),
  [`../../wave-4a-core/frames/w4-s3-authority-spine.md`](../../wave-4a-core/frames/w4-s3-authority-spine.md)
  (the Fence's `authorize` classifier every worker request crosses; the capability-attestation gate
  that judges freshness, EARN-1/2), and
  [`../../wave-4a-core/frames/w4-s1-records-observability.md`](../../wave-4a-core/frames/w4-s1-records-observability.md)
  (the records/evidence surface the claim's outcome is an event into) — this session cites all three,
  it does not redesign any.
- `docs/design/contracts/providers.md` — the existing stub this session deepens in place: the Agent
  Owns row ("reads a work item, writes code, runs checks, reports; holds no credentials"), the Agent
  Interface row, the stub-allowance Note ("only the scripted-worker stub at the Agent port is built
  first; the real agent driver and the other three seams are named extension points"), the diagram,
  and the STACK/DRIVE reconciliation.
- `docs/product/guarantees.md` — STACK-1/2/4/5 (vendor independence; four swappable seams; attested-
  not-assumed; authority boundary), DRIVE-1 (conformance suite incl. adversarial probes), EARN-1/2
  (fresh, positive, driver-and-run-specific proof — judged by `w4-s3`), FENCE-1/2/3 (fail-closed
  authorization; re-approval to widen; worker never holds credentials), MERGE-1/2 (evidence observed
  not self-reported; push/PR/merge is runner authority), ISO-1 (dependency-aware eligibility) this
  provider reconciles to.
- `docs/product/concepts.md` — the runner/worker authority-boundary paragraph (the worker "never
  holds privileged credentials and cannot push, open a PR, merge, or widen its own authority") —
  grounds the structural anti-corruption stance.
- `docs/design/notes/runtime-design-m5a.md` — `INV-002`/`ENF-002` (the Agent port exposes no
  privileged method, a compile-time rule — **cited, not re-minted**), `SURF-003` (the scripted-stub
  adapter shape), `CTX-005`/`DEL-004` (the Agent port is the only seam with a built adapter) — kept a
  namespace distinct from `INV-*` and product IDs.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc at the design_target: the deepened **Agent section** of
   `docs/design/contracts/providers.md` — the structural no-privileged-method guarantee (cited from
   `INV-002`), the stub-vs-real-driver posture, and the capability-attestation-claim supply — preserving
   and citing the existing Agent Owns/Interface/Notes/Diagram as the seed.
2. Open questions, logged (never invented answers) — including the **`DocStructurePlan` split
   question** (below), which this story states canonically for the wave.
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting. This session
   **cites `INV-002`** (no privileged method) as the guarantee it preserves; it mints **no new
   candidate** (its central invariant is already closed and numbered). If a genuinely new invariant
   surfaces, it is a candidate for `INV-009`+, flagged for cross-wave reconciliation, never
   hard-numbered.
4. Risks and deferred decisions — including the real agent driver (a named extension point, its
   conformance-suite gate named per the Stub rule) and the open split question.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- How does the Agent port's adapter expose the contained worker's **request/observe** surface with
  **no privileged method** — a structural, compile-time guarantee (`INV-002`/`ENF-002`, cited), not a
  runtime policy check — so a violation should not compile, never merely be caught at runtime?
- What is the **stub-vs-real-driver posture**: the scripted-worker stub (M5a's `SURF-003`) is the one
  built adapter, **visibly and explicitly a stub** in the design record (the track's Stub rule — what
  is deferred, why, and the proof gate that ends the deferral), and the real agent driver is a
  **named extension point**, never mistakable for a real capability?
- What capability-attestation **claim** does the Agent adapter supply into `w4-s2`'s evidence/
  attestation category model — a **claim only** (what it asserts it can safely do), judged by `w4-s3`
  (EARN-1/2) and recorded by `w4-s1`? The provider **supplies**; core **judges** and **records** — the
  boundary rule (D-004); this session must not author the sufficiency or freshness rule.
- How is the **s6 ↔ s5 containment seam** stated: the Agent port's adapter **runs inside** the
  execution host (`w4-s6`); the host's isolation strength is what SEC-2's no-phone-home guarantee is
  verified against. State this seam wording **identically** to `w4-s6`'s story (the one seam shared
  between two provider parts); this story states only that containment exists, never how strong it is
  or how it is verified (that is `w4-s6`'s SEC-2 territory).
- **The canonical `DocStructurePlan` split question (stated here for the whole wave):** should the
  four provider designs remain in one shared `docs/design/contracts/providers.md` (four deepened
  sections), or split into `contracts/providers/agent.md`, `execution-host.md`, `forge.md`,
  `work-source.md` with `providers.md` reduced to an index? This is **OPEN** (D-006) — the author
  session decides via its own `DocStructurePlan`; the four stories do not decide it, and the choice
  also settles whether the four parts' authoring serializes (one shared file) or parallelizes (split).
  `w4-s6`/`w4-s7`/`w4-s8` cross-reference this statement rather than restating it.

## Invariants to preserve

- `INV-002` (the Agent-port worker seam exposes no privileged method — a type/import rule a violation
  should not compile, `ENF-002`) from `runtime-design-m5a.md` — the structural guarantee this
  provider preserves; **cited, never re-minted** as an `INV-009`+ candidate.
- `FENCE-1`, `FENCE-2`, `FENCE-3` — every worker request authorized before it executes (fail-closed);
  the worker cannot widen its own grant mid-run; the worker never holds privileged credentials. The
  adapter's request surface must not offer a path around any of these.
- `MERGE-1`, `MERGE-2` — evidence is observed by the runner directly, never taken from the worker's
  self-report; push/PR/merge is runner authority, never the worker's. The Agent port never invokes
  the Forge port (`w4-s7`).
- `STACK-1`, `STACK-2`, `STACK-4`, `STACK-5` — guarantees do not depend on the vendor; the Agent seam
  is one of four independently swappable; capabilities are attested not assumed; the seam is an
  authority boundary. `EARN-1`, `EARN-2` — autonomy requires fresh, positive, driver-and-run-specific
  proof, judged by `w4-s3` (cited). `ISO-1` — dependency-aware eligibility (Wave 2's territory, the
  work item the Agent port is driven for is already eligible).
- No new `INV-*` numbers are hard-numbered by this story, and it mints **no new candidate** (its
  central invariant is `INV-002`, already closed). If a genuinely new invariant surfaces it continues
  from `INV-009` (never resets) and records why in decisions.md.

## Must not decide

- **The boundary rule is absolute** (D-004): this session must **not** redefine core policy, evidence
  sufficiency, authorization, or state semantics. It consumes Wave 4a's `w4-s1`/`w4-s2`/`w4-s3`
  contracts read-only. It **supplies** a capability-attestation claim; `w4-s3` judges it, `w4-s1`
  records it. A finding that the Agent seam needs to originate a policy/evidence/state rule routes
  back to core (Wave 4a), never defined here.
- The **Fence classifier** — every worker request crosses `authorize(request, boundPolicy) → grant \|
deny \| route` (`w4-s3`, cited); this session does not redesign the classifier or the
  guard-outcome-to-transition mapping (Wave 2's, settled).
- The **execution host's containment model** — that is `w4-s6`. This session states only that its
  adapter runs inside the host (the s6 ↔ s5 seam, worded identically in both stories); it does not
  design how strongly it is contained or how confinement is proven (`w4-s6`'s SEC-2 territory).
- The **evidence/attestation category taxonomy or freshness rule** — that is `w4-s2`/`w4-s3`. This
  session supplies a claim expressed against that taxonomy; it does not author the taxonomy or the
  sufficiency/freshness judgment.
- Anything **Wave 3** settled: the Agent port **shape** and its owns/implements/must-not split. This
  session deepens the adapter **behind** the port, preserving and citing the port line as the seed.
- Anything **Wave 2** settled: the work-item state machine. The Agent port is invoked **at** the
  `started` state (Wave 2/Wave 3, cited); this session does not author the transition.
- The **`providers.md` split** — the `DocStructurePlan` question this story states canonically is
  **OPEN** (D-006); the author session decides it, not this brief.
- Concrete **agent implementation** — no real coding-model-backed worker is built or its internals
  designed; the real agent driver is a named extension point. The **conformance suite** a real driver
  must pass (DRIVE-1) is named as deferred, not designed (its mechanics are already deferred by
  `providers.md`).
- Field-level schema, TypeScript, JSON Schema, method signatures, or any frozen contract — deferred
  per `docs/design/README.md`.

## Exit criteria

- The deepened Agent section exists in `docs/design/contracts/providers.md`, stating the structural
  no-privileged-method guarantee (cited from `INV-002`, compile-time), the stub-vs-real-driver
  posture, and the capability-attestation-claim supply as the load-bearing properties.
- The existing Agent Owns/Interface/Notes/Diagram — including the stub-allowance Note — are
  **preserved and cited** as the seed, re-projected and extended rather than overwritten; any
  divergence is named explicitly (STOP-003).
- The **boundary-rule statement** is present: implements against Wave 3's Agent port, consumes Wave
  4a's core contracts read-only, never redefines core policy/evidence/authorization/state; supplies a
  claim, `w4-s3` judges, `w4-s1` records.
- The **s6 ↔ s5 containment seam** is worded **identically** to `w4-s6`'s story; the **canonical
  `DocStructurePlan` split question** is stated as OPEN for the wave.
- `INV-002` is **cited** (not re-minted); no new `INV-009`+ candidate is introduced by this part; the
  three ID namespaces are kept distinct.
- The real agent driver and the conformance suite are named as deferred extension points with their
  proof gate named (Stub rule).
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This part's frame ([`../frames/w4-s5-agent-provider.md`](../frames/w4-s5-agent-provider.md)).
- The authored design_target (the Agent section of `docs/design/contracts/providers.md`).
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story authors a real
jig provider seam (the Agent provider, the contained worker every control-and-trust guarantee is
built around), so the full frame → author → design-review pass applies, not the light method Wave 0
used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `ports-and-adapters`, `ddd_depth` `ports-and-adapters` per D-002). This part's
   build-time frame at [`../frames/w4-s5-agent-provider.md`](../frames/w4-s5-agent-provider.md) seeds
   it; the session confirms and extends the `AgreedSystemModel` rather than starting from nothing.
2. author-technical-design → the deepened Agent section of `docs/design/contracts/providers.md`,
   preserving and citing the existing Owns/Interface/Notes/Diagram (and the stub-allowance Note) as
   the seed; Wave 4a's core contracts cited read-only; the `DocStructurePlan` split question resolved
   here if the session's own frame settles it, else carried as an open question.
3. review-technical-design → three lenses (architecture-enforceability: no-privileged-method is
   structural/compile-time `INV-002`; the request/observe surface offers no path around the Fence,
   credentials, or the runner's push/PR/merge authority; the stub is visibly a stub. domain-
   correctness: the provider reconciles to STACK/DRIVE/EARN/FENCE/MERGE/ISO-1 and cites `INV-002`
   without redefining core policy/evidence/authorization/state — the boundary rule holds;
   agreement-integrity: nothing contradicts the part frame's `AgreedSystemModel`, Wave 3's Agent port
   shape, Wave 4a's evidence/authority contracts, or the s6 ↔ s5 containment seam wording).
   Dispositions recorded into this wave's [`../decisions.md`](../decisions.md); settled = zero open
   blocking suggestions.

Handoff: when settled, update status and note the resolved design_target in the track's future
traceability matrix; confirm the Agent provider's attestation-claim supply is consistent with
`w4-s2`'s evidence model and `w4-s3`'s judgment; carry the `DocStructurePlan` split resolution (or its
still-open status) forward for the sibling parts and the U9 nav-doc pass.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place, shared file), this story deepens the **Agent section** of
`docs/design/contracts/providers.md` directly — preserving and citing its existing Owns/Interface/
Notes/Diagram (including the stub-allowance Note) as the seed — rather than authoring a new sibling
doc. This is the STOP-003-compliant "re-project and cite." Whether the file later splits into
`contracts/providers/agent.md` and siblings is the **OPEN `DocStructurePlan` question** (D-006) this
story states canonically; the future `author-technical-design` session may relocate the target via
that plan. This brief records the resolved target, not a frozen path.
