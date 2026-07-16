---
title: "Product guarantee reconciliation — imported commitments to redesign elements"
purpose: Map every explicitly imported product guarantee commitment to the redesign element that carries it and classify each mapping honestly.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers reconciling the redesign with the product layer and planning gap closure
scope: The guarantee-to-design traceability matrix and its findings; the original import and the explicit 2026-07-16 product correction and re-import live in the import record.
state: approved
status: owner-approved 2026-07-17 remediation candidate; readiness lock inactive pending merge and renewed independent exact-candidate review
owner: Arye Kogan
last_verified: 2026-07-16
sources_of_truth:
  - ./decisions/product-guarantee-import.md
  - ../../product/guarantees.md
  - ./invariants.md
  - ./decisions/layer2-gate-record.md
related:
  - ./README.md
  - ./decisions/README.md
  - ./architecture-conformance.md
---

# Product guarantee reconciliation — imported commitments to redesign elements

This page is the reconciliation matrix required by the
[import record](./decisions/product-guarantee-import.md): every imported commitment from
[`docs/product/guarantees.md`](../../product/guarantees.md) (at the import's provenance digest)
maps to the redesign element that carries it, with an honest classification. It is a
**traceability artifact, not a view**. It traces the owner-approved readiness amendment, including
the explicit correction and re-import of the provider-permission commitments, and closes every
previously recorded gap and upstream ownership question. The exact amendment candidate still
follows the renewed-review rule of the
[Layer 2 gate record](./decisions/layer2-gate-record.md).

## Classification vocabulary

| Classification | Meaning                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `satisfied`    | A named redesign element carries the commitment as stated.                                                                                |
| `note`         | Carried in substance; the note records a vocabulary mapping or a bounded residual the owner should know when reading either side.         |
| `gap`          | Inside the designed system boundary, but no element carries it yet; closing it is design work under the renewed-review rule.              |
| `upstream`     | The commitment lands outside `SYS-JIG` as bounded by [D2](./decisions/D2-system-boundary.md) and still lacks a named product-layer owner. |
| `conflict`     | The commitment contradicts an approved design element; surfaces as `OWNER_DECISION_REQUIRED`.                                             |

**Imported-guarantee result: 54 `satisfied` rows, two explanatory `note` rows, and zero `gap`,
`upstream`, or `conflict` rows. Product-commitment result: 39 `satisfied` rows and zero explicit
gaps.** The final F11 inventory covers normative commitments in the four product documents beyond the
56 imported IDs. Every commitment is carried by the remediation candidate summarized
[after the matrices](#findings).

## Guarantee 1 — control and trust

### The fence (`FENCE`)

| ID      | Carried by                                                                                                                                                                                                                                                                                                   | Classification |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| FENCE-1 | Jig-authorized Operations remain capability-bound. Inside an Agent session, D14 and `MC-PERMISSION` make the selected provider-native permission posture authoritative: provider-internal allow, auto-review, and rejection stay inside the session; only a request that needs a human crosses the Doorbell. | `satisfied`    |
| FENCE-2 | The exact provider permission posture is frozen in the envelope and bound to the session. Provider-internal decisions do not change it; human answers bind the exact request, and changing posture requires a newly approved envelope rather than ambient or standing authority.                             | `satisfied`    |
| FENCE-3 | Credentials resolve per configured mechanism and live only in controller and mechanism process memory; role sessions receive bounded inputs under `CB-SESSION`, never privileged credentials; privileged effects run only as finalizer-authorized delivery Operations.                                       | `satisfied`    |

### Earned trust (`EARN`)

| ID     | Carried by                                                                                                                                                                                                                                                                                                    | Classification |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| EARN-1 | `CF-GATE-PROVIDER` in [architecture conformance](./architecture-conformance.md): a reusable pass binds the exact provider build, suite and probe versions, authority-manifest digest, and environment; every Run also requires fresh compose-time capability proof, and policy may impose a maximum pass age. | `satisfied`    |
| EARN-2 | Conformance evidence is exact-subject (I7): a changed provider re-gates; an honest `weak` posture is valid input and the response to insufficient proof is fail-closed preflight or a parked owner decision — the product's "more human checkpoints", not a weakened gate.                                    | `note`         |

Proof freshness has two layers: an exact-subject reusable conformance pass and a fresh per-Run
compose-time capability proof. A changed build, suite, probe set, manifest, or environment re-gates;
frozen policy may additionally expire an otherwise exact reusable pass by age.

### Anti-gaming (`GUARD`)

| ID      | Carried by                                                                                                                                                                                                                                                                   | Classification |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| GUARD-1 | The Execution Envelope — plan, policy, configuration — is frozen per Run; configuration and providers may add or exceed but never remove, weaken, or silently change policy-required elements (I9 and its rule pattern).                                                     | `satisfied`    |
| GUARD-2 | `SCH-RULE-SURFACE` freezes policy-, verification-, integration-, authority-, and configuration-governing paths. `EV-RULE-SURFACE-TOUCHED` parks the Run, invalidates acceptance and dependent evidence, and requires exact owner re-approval plus fresh evidence and review. | `satisfied`    |

The rule-surface manifest is itself governing: changing, renaming, or removing one of its entries
takes the same parked re-approval path, so a Candidate cannot evade the classifier by editing it.

### The doorbell (`DOOR`)

| ID     | Carried by                                                                                                                                                                                                                                            | Classification |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| DOOR-1 | Invalid or insufficient Jig inputs fail closed. When the Agent provider says a permission or question needs a human, `EV-SESSION-HUMAN-REQUEST` parks the exact request instead of Jig guessing or duplicating the provider's permission review.      | `satisfied`    |
| DOOR-2 | A Jig or provider-originated human request is a durable `ID-PARK` ledger record with originating principal/assignment, bound session provenance, wake condition, and `BND-WAIT-DECISION`; exhaustion re-escalates and Recovery reconstructs the wait. | `satisfied`    |
| DOOR-3 | A human answer binds the exact request, authorized responder, and scope. `OPC-SESSION-RESPOND` delivers it to the current same-principal session; attested loss records replacement provenance or closes through cancel-and-reissue lineage.          | `satisfied`    |

### Merge-on-evidence (`MERGE`)

| ID      | Carried by                                                                                                                                                                                                                                                       | Classification |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| MERGE-1 | Reviewer-principal acceptance of the exact package (I8, `RP-PACKAGE-DIGEST`); principal-level independence rejects self-review across sessions (`RP-INDEPENDENCE`, `ID-PRINCIPAL`); a bare success claim is never an observed fact (`MC-ATTEST`).                | `satisfied`    |
| MERGE-2 | Landing publication/integration remains exclusively `CP-FINALIZER`-authorized. D15 separately permits exact-Candidate review publication through `CB-REVIEW-PUBLICATION`, which cannot merge, touch the lineage anchor, acquire finalization authority, or land. | `satisfied`    |
| MERGE-3 | Frozen policy declares required check classes and the final-verification posture; an unbound required class fails preflight; configuration may add checks but never weaken (I9, `RP-CHECKCLASS`, D7).                                                            | `satisfied`    |
| MERGE-4 | Product `done` projects from `Finalizing` once the frozen final-verification requirement is satisfied — a required `deterministic` check passed, or the posture is `none` — delivery is authorized, and only landing remains; `landed` projects from `Landed`.   | `note`         |
| MERGE-5 | D15 `OPC-REV-*` can create or update the draft review venue and surface `Blocked`; post-acceptance `OPC-DEL-*` maintains the landing venue. Both use stable identities and preserve a residual obligation on surfacing failure.                                  | `satisfied`    |

Forge surfacing is an effect with its own identity, reconciliation, and failure outcome; it never
becomes a second source of block truth and never erases the underlying failure.

### Security (`SEC`)

| ID    | Carried by                                                                                                                                                                                                                                                                                            | Classification |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| SEC-1 | Source redaction plus controller-side secret scanning and quarantine (`EVR-REDACT`, `EVR-SCAN`, `EVR-QUARANTINE`); credential secrecy rules; landing-path redaction; export redaction (QS10 end to end).                                                                                              | `satisfied`    |
| SEC-2 | D14 and `MC-PERMISSION` carry the revised commitment: the owner selects an exact provider-native execution posture, the envelope freezes it, the provider enforces it, and preflight rejects a provider that cannot realize it. Full-access posture is visible and is never described as confinement. | `satisfied`    |
| SEC-3 | As FENCE-3 for forge credentials: the delivery mechanism holds them; the transition engine may authorize bounded D15 review publication and the finalizer alone authorizes landing effects; role sessions never see credentials.                                                                      | `satisfied`    |

The owner explicitly replaced SEC-2's earlier universal no-phone-home/proven-confinement statement
before this re-import. The selected contract trusts the Agent provider's own execution and
permission boundary; Jig records the selected posture and verifies compatible session realization,
but does not independently prove that the provider or host itself cannot communicate externally.

## Guarantee 2 — configuration ownership

| ID     | Carried by                                                                                                                                                                                                                                                             | Classification |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| CFG-1  | Frozen policy supplies verification posture, required check classes, anti-gaming rule surfaces, provider-permission floors, capacity maxima and reserve, bounds, mechanism minima, non-gating classes, and retention; changing it is owner-gated.                      | `satisfied`    |
| CFG-2  | `SCH-WORK-PROFILE` is the named, digest-bound tunable artifact in the envelope. It owns agent/prompt/work preferences while frozen policy owns safety floors; profile composition cannot weaken policy.                                                                | `satisfied`    |
| CFG-3  | The [Envelope Builder](./envelope-production.md) owns named tracks and composes their policy with repository floors before owner approval and `PORT-INTAKE`.                                                                                                           | `satisfied`    |
| CFG-4  | `CP-SCHEDULER` derives admission deterministically from durable facts, the plan's ordering facts, and declared capacity — the actual is computed, never hand-set (I4, I10, I11).                                                                                       | `satisfied`    |
| CFG-5  | `EP-GUIDANCE` in [envelope production](./envelope-production.md) converts owner intent into an inspectable proposal and never submits it without exact-digest approval.                                                                                                | `satisfied`    |
| CFG-6  | Envelope Builder presets are named, versioned starting points whose proposal shows their reasoning and complete expansion before approval.                                                                                                                             | `satisfied`    |
| CFG-7  | Structured durable records, derived read models, position-stamped redacted exports over `PORT-PUBLISH`, and conformance-gated provider seams; influence re-enters only through `PORT-INTAKE`/`PORT-DECIDE` as a validated participant.                                 | `satisfied`    |
| CFG-8  | Prompt strategy is explicit, versioned work-profile content composed by Envelope Builder and executed only through the bounded session mechanism; it has no authority to weaken policy.                                                                                | `satisfied`    |
| CFG-9  | `SCH-SETUP-RECEIPT` keys freshness by setup-recipe digest, input digest, and host fingerprint; `OPC-WS-SETUP` executes only when that exact receipt is absent or stale.                                                                                                | `satisfied`    |
| CFG-10 | The owner selects a provider-native manual/assisted posture. The provider performs any built-in auto-review and keeps allow/reject outcomes internal; requests needing a human use the Doorbell. Jig has no parallel classifier or middleman responder in this design. | `satisfied`    |

CFG-1's anti-gaming and escalation floors are now first-class through the frozen rule-surface
manifest and provider-permission posture. Configuration ownership, guidance, presets, tracks, floors,
work-profile authoring, and Work Source intake belong to Envelope Builder: part of the Jig product
but outside `SYS-JIG` runtime control authority. The owner approves the exact composed digest before
submission, preserving the frozen-envelope boundary.

## Guarantee 3 — resilience

### Interruption resume (`RESUME`)

| ID       | Carried by                                                                                                                                                                                                                                                                                              | Classification |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| RESUME-1 | Record-before-adopt/dispatch into the durable ordered ledger (I5); durable authority classification in [state and recovery](./state-and-recovery.md).                                                                                                                                                   | `satisfied`    |
| RESUME-2 | Recovery fences stale control, reconstructs from the ledger, and resumes from durable truth; admission and wake triggers are replayable/reconstructable (I4, I6).                                                                                                                                       | `satisfied`    |
| RESUME-3 | One durable Operation identity per semantic effect; reconciliation before any second semantic attempt (I17); the five-way readback classification and `LG-WITNESS` currency make duplicates and rollback detectable.                                                                                    | `satisfied`    |
| RESUME-4 | Indeterminate outcomes halt into Recovery or park with a named reason; every stop is a durable, named, inspectable state (I15, I16, I20).                                                                                                                                                               | `satisfied`    |
| RESUME-5 | Interruption recovery and operator resume from durable `Suspended` both acquire a new controller generation and run `RC-RESUME-INTEGRITY` over the frozen envelope, provider proof, rule surfaces, target basis, and fences; any safety-relevant change parks for exact re-approval and fresh evidence. | `satisfied`    |

The named resume-integrity rule unifies the digest, fence, lineage, environment, and package checks
under one fail-closed Recovery decision; a provider's assertion that nothing changed is not input.

### Failure isolation (`ISO`)

| ID    | Carried by                                                                                                                                                                                                                              | Classification |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| ISO-1 | Eligibility requires all prerequisites confirmed `Landed` and no durable direct `Blocked` or `Rejected` root; either outcome derives `Not run — dependency blocked` for dependents while independent work continues.                    | `satisfied`    |
| ISO-2 | Posture is expressed through frozen policy: bounds, budgets, non-gating classes, and exhaustion actions lean prevention or throughput. Replanning always creates a successor envelope and Run; it never mutates the active Run.         | `satisfied`    |
| ISO-3 | Blocks are durable facts carrying the complete canonically ordered direct-root set (I14), visible on `OBS-STORY-BOARD` and in exports.                                                                                                  | `satisfied`    |
| ISO-4 | One isolated workspace per active Story (`RC-ISOLATION`, `CB-WORKSPACE` pinning path, repository, and basis); admission commits its reservation Transition before any resource is touched; Operation identity prevents double dispatch. | `satisfied`    |

ISO-2's "quarantine and re-plan" has one explicit meaning: preserve and park the affected work,
then use Envelope Builder to produce an owner-approved successor Run linked to its predecessor.
The original Run remains immutable and auditable.

### Liveness (`LIVE`)

| ID     | Carried by                                                                                                                                                                                                                                                                  | Classification |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| LIVE-1 | `SCH-LIVENESS`, `EV-LIVENESS-OBSERVED`, `BND-IDLE`, and `BND-SILENCE` turn subject-bound progress, heartbeat, termination, repetition, and human-input-wait facts into deterministic thinking/stuck/dead/input-overdue classifications and explicit park/escalate outcomes. | `satisfied`    |
| LIVE-2 | Exhaustion actions are explicit — block, park, escalate — never silent spend; alerts derive from durable bound facts (I16).                                                                                                                                                 | `satisfied`    |

Message volume and provider self-classification do not count as progress; the controller derives
the classification from validated mechanism observations and frozen bound classes.

## Guarantee 4 — stack portability

### Seams (`STACK`)

| ID      | Carried by                                                                                                                                                                                                                                                  | Classification |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| STACK-1 | The `MC-*` contract and conformance gating make control, evidence, and recovery provider-independent; the boundary follows authority and proof, not packaging.                                                                                              | `satisfied`    |
| STACK-2 | Work Source ↔ `PORT-SOURCE` with `ID-SOURCE-REQ` and bounded exchange; Agent ↔ `PORT-SESSION`; Execution Host ↔ `PORT-WORKSPACE`; Forge ↔ disjoint `PORT-DELIVERY` review/finalization bindings. Each seam has identity, freshness, and conformance duties. | `satisfied`    |
| STACK-3 | The agent mechanism is configured and swappable behind `PORT-SESSION`; owner choice is recorded in the named `SCH-WORK-PROFILE` and provider-authority manifest.                                                                                            | `satisfied`    |
| STACK-4 | `CF-GATE-PROVIDER` plus compose-time posture attestation; an unproven capability never becomes configurable or silently trusted.                                                                                                                            | `satisfied`    |
| STACK-5 | Seams are ports crossed only under capability bindings and authority fences; credentials stay with the mechanism that needs them.                                                                                                                           | `satisfied`    |
| STACK-6 | The boundary rule states it directly: a provider bundled with Jig still remains outside the decision-authority boundary; I2/I3 are enforced structurally and per-port suites apply to any provider equally.                                                 | `satisfied`    |
| STACK-7 | Any exact provider that passes its port's `CF-MECH-*` suite becomes configurable — custom providers are in scope by construction.                                                                                                                           | `satisfied`    |

`PORT-SOURCE` belongs to the product-layer Envelope Builder rather than active-Run control. This
keeps Work Source swappable without granting it lifecycle or effect authority.

### Trusting a driver (`DRIVE`)

| ID      | Carried by                                                                                                                                                                                                                            | Classification |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| DRIVE-1 | Every `CF-MECH-*` suite must execute the reusable shared adversarial-probe library plus port-specific hostile cases; a provider-specific waiver cannot open the gate.                                                                 | `satisfied`    |
| DRIVE-2 | `SCH-PROVIDER-AUTHORITY` is digest-bound and owner-approved, declaring supported native permission modes, runtime, filesystem, network, credential, and effect authority; any digest change requires a fresh pass and owner approval. | `satisfied`    |
| DRIVE-3 | `MC-HONESTY`: the provider must report whether it can realize the exact selected posture and human-request loop; a mismatch or unsupported posture fails preflight rather than being relabeled as equivalent protection.              | `satisfied`    |
| DRIVE-4 | Bundled and future providers are gated by the same versioned reusable conformance and adversarial-probe contracts against their exact build, manifest, and environment.                                                               | `satisfied`    |

Provider trust is therefore earned for an exact subject and explicit authority declaration, not
inherited from bundling, a provider name, or a previous build.

## Guarantee 5 — full observability

| ID    | Carried by                                                                                                                                                                                                                                                                            | Classification |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| SEE-1 | Jig's durable authority enumeration covers Jig-governed decisions, authorizations, fences, evidence references, transitions, waits, escalations, outcomes, obligations, and every provider request/answer that crosses the Doorbell. Provider-internal review remains provider-local. | `satisfied`    |
| SEE-2 | Records are structured durable facts; `OBS-*` read models and position-stamped exports over `PORT-PUBLISH` are the consumable surface.                                                                                                                                                | `satisfied`    |
| SEE-3 | The ledger facts and digest-verified evidence the decisions consumed are exactly what the owner inspects afterward; projections are derived, never a second story (I5, `EVR-*`, `OBS-EVIDENCE`).                                                                                      | `satisfied`    |
| SEE-4 | Operator verbs answer from recorded Transitions — "why is this Story here" is the recorded decision trail — with no extra tooling required beyond the operator interface (`RT-OPERATOR`).                                                                                             | `satisfied`    |
| SEE-5 | `SCH-NOTICE` and `OBS-NOTICES` form one complete projection: every parked, blocked, stale, overdue, uncertain, or residual condition has a stable identity, deterministic urgency, accountable owner, and currently valid actions.                                                    | `satisfied`    |
| SEE-6 | Terminal `SCH-AUDIT-EXPORT` bytes are canonical, redacted, content-addressed by `ID-EXPORT`, and create-once through immutable artifact storage; recovery can verify or complete the identical write but never overwrite it.                                                          | `satisfied`    |

Notice acknowledgement changes presentation only; the underlying durable condition must resolve.
The terminal export includes the final ledger position and immutable store receipt, and a digest
mismatch remains an explicit integrity obligation.

## Canonical product projection

This table is the sole design-to-product outcome projection. Internal states not listed retain
their design names in diagnostic views and do not acquire a second product outcome.

| Product-visible outcome | Authoritative design facts                                                               | Projection rule                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `landed`                | Story `Landed`                                                                           | Confirmed target landing is recorded; this alone releases dependents.                                                                                                                         |
| `done`                  | Story `Finalizing`; frozen final-verification requirement satisfied; delivery authorized | Under `deterministic`, the required result passed. Under `none`, the requirement is vacuously satisfied once delivery is authorized and only landing remains. `Accepted` alone is not `done`. |
| `rejected`              | Story `Rejected`                                                                         | A validated Story-bound owner decision selected `reject-story`; the terminal record names request, responder, reason, and resulting blocker roots.                                            |
| `blocked`               | Story `Blocked`                                                                          | A terminal inability to proceed and its ordered direct-root blocker set are recorded.                                                                                                         |
| `parked`                | A non-terminal Story with a live Story-bound `ID-PARK`, or a Story held by Run `Parked`  | The projection names the pending request/wake condition; the underlying Story state remains inspectable.                                                                                      |
| `stopped`               | Run `Suspended`                                                                          | A validated operator suspend decision durably fences dispatch; Story states do not change and resume requires a new generation plus `RC-RESUME-INTEGRITY`.                                    |
| `ended`                 | Run `Stopped`                                                                            | Trust/liveness assumption failure or an explicit terminal-stop decision ended the Run; no resume transition exists.                                                                           |

## Product-commitment coverage beyond the 56 IDs

The inventory below normalizes every normative commitment in `docs/product/README.md`, `jig.md`,
`concepts.md`, and `use-cases.md` that is not merely a restatement of an imported guarantee ID.
Repeated prose is mapped once to its authoritative carrier; examples point to the same row rather
than creating a second contract.

| Commitment                                                                                                      | Product source                             | Carrying design element                                                                                                                 | Classification |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `PC-README-1` — product owns what/why and live design owns how/verification                                     | `README.md` contract paragraph             | D1 source scope, this reconciliation, and the Layer 1/2 gate records                                                                    | `satisfied`    |
| `PC-README-2` — upstream product/design/plan tools are peers, not Jig prerequisites                             | `README.md` suite position                 | D2 boundary and D13 Envelope Builder boundary                                                                                           | `satisfied`    |
| `PC-README-3` — a valid execution plan plus policy is Jig's only hard input                                     | `README.md` suite position                 | `SCH-ENVELOPE`, `PORT-INTAKE`, and `CP-INTAKE`                                                                                          | `satisfied`    |
| `PC-JIG-1` — approved plan and policy yield evidenced delivery or an inspectable named stop                     | `jig.md` spine/workflow                    | V3/V9 lifecycle, `SCH-TRANSITION`, evidence chain, and V4 recovery                                                                      | `satisfied`    |
| `PC-JIG-2` — envelope inputs freeze before Run execution and cannot be silently weakened                        | `jig.md` workflow                          | `SCH-ENVELOPE`, I9, `RC-RESUME-INTEGRITY`, and rule-surface handling                                                                    | `satisfied`    |
| `PC-JIG-3` — start and preview use validated intake without equating submission with preflight success          | `jig.md` driving a run                     | `PORT-CONSUMER` → `PORT-INTAKE`, `LG-INTAKE`, and `SCH-INTAKE-ACK`                                                                      | `satisfied`    |
| `PC-JIG-4` — watch, inspect, and ask why from recorded facts                                                    | `jig.md` driving a run                     | `PORT-CONSUMER` → `PORT-PUBLISH`, `OBS-*`, and transition explanations                                                                  | `satisfied`    |
| `PC-JIG-5` — approve, reject, override, decide, and handoff are authoritative operator actions                  | `jig.md` driving a run                     | `PORT-CONSUMER` → `PORT-DECIDE`; `EV-OWNER-DECISION`; grant-aware retirement/obligation handoff facts                                   | `satisfied`    |
| `PC-JIG-6` — stop, resume, terminal stop, notice acknowledge, and notice snooze are durable actions             | `jig.md` driving a run                     | `EV-RUN-SUSPEND-DECISION`, `EV-RUN-RESUME-DECISION`, `EV-RUN-TERMINAL-STOP-DECISION`, `EV-NOTICE-ACKNOWLEDGED`, and `EV-NOTICE-SNOOZED` | `satisfied`    |
| `PC-JIG-7` — plans carry Stories, dependencies, and owner-policy done conditions                                | `jig.md` execution plan                    | Approved-plan digest frozen in `SCH-ENVELOPE`, Story graph validation, frozen policy, and `RP-CHECKCLASS`                               | `satisfied`    |
| `PC-JIG-8` — Runner, Worker, Reviewer, and four mechanism roles remain authority-separated                      | `jig.md` run roles                         | V1/V2, I2/I3, `CB-*`, and per-port `CF-MECH-*` suites                                                                                   | `satisfied`    |
| `PC-JIG-9` — provider human requests follow the durable request and principal across session loss               | `jig.md` run roles                         | D14, `ID-PARK`, `OPC-SESSION-RESPOND`, `MC-RECONNECT`, and `CF-MECH-SESSION`                                                            | `satisfied`    |
| `PC-JIG-10` — acceptance is reviewer-principal; deterministic/none is the additional final-verification posture | `jig.md` acceptance                        | D7, `RP-INDEPENDENCE`, `SCH-VERDICT`, and `OPC-VERIFY-EXECUTE`                                                                          | `satisfied`    |
| `PC-JIG-11` — review may need a pushed branch or draft request before acceptance, without landing authority     | `jig.md` acceptance                        | D15, `CB-REVIEW-PUBLICATION`, `OPC-REV-*`, and `CF-REVIEW-PUBLICATION`                                                                  | `satisfied`    |
| `PC-JIG-12` — guidance may vary, but frozen safety, authority, evidence, and landing floors are enforced        | `jig.md` enforce vs guide                  | I9, `SCH-WORK-PROFILE`, provider posture proof, and capability bindings                                                                 | `satisfied`    |
| `PC-JIG-13` — supporting products, role mechanisms, and Jig-core stay on their declared boundaries              | `jig.md` product boundaries                | D2/D13, V1, runtime units, and port ownership                                                                                           | `satisfied`    |
| `PC-JIG-14` — first-party CLI/private-MCP/SDK consumers use one private stable boundary, not internals          | `jig.md` product boundaries                | `PORT-CONSUMER`, `RT-OPERATOR`, and `CF-CONSUMER`; posture change is owner-visible                                                      | `satisfied`    |
| `PC-JIG-15` — provider replaceability is contractual rather than packaging-dependent                            | `jig.md` product boundaries                | D10–D12, `MC-*`, `CF-GATE-PROVIDER`, and shared adversarial probes                                                                      | `satisfied`    |
| `PC-JIG-16` — conformance proof is reusable before trust even though testkit packaging is open                  | `jig.md` product boundaries/open questions | `CF-GATE-PROVIDER`, exact proof subject, suite/probe versions, and proof age                                                            | `satisfied`    |
| `PC-JIG-17` — no Jig-side middleman responder or public-package stability promise exists today                  | `jig.md` not-yet boundary                  | D14 exclusions and private `PORT-CONSUMER` lifecycle posture                                                                            | `satisfied`    |
| `PC-JIG-18` — v1 is local-first and ships no remote Execution Host expectation                                  | `jig.md` not-yet boundary                  | D2 external Execution Host boundary and `PORT-WORKSPACE`; no remote provider is assumed or required                                     | `satisfied`    |
| `PC-JIG-19` — runs are operator-initiated; webhook and scheduler triggers are deferred                          | `jig.md` not-yet boundary                  | `PORT-CONSUMER` → `PORT-INTAKE` is the only first-party start path; `CF-CONSUMER` rejects undeclared control paths                      | `satisfied`    |
| `PC-JIG-20` — v1 is a user-run tool, not a hosted multi-tenant service                                          | `jig.md` not-yet boundary                  | D2 deployment boundary and D10 runtime-process decomposition; no hosted control-plane authority is defined                              | `satisfied`    |
| `PC-JIG-21` — listed remote, permission, held-merge, Windows, and transport edges remain unproven               | `jig.md` not-yet boundary                  | Exact-subject `CF-GATE-PROVIDER`, per-port suites, and fail-closed preflight prevent unproven capabilities becoming configurable        | `satisfied`    |
| `PC-JIG-22` — unknown legacy configuration is rejected with guidance rather than guessed                        | `jig.md` not-yet boundary                  | Versioned `SCH-ENVELOPE`/configuration validation and fail-closed `CP-INTAKE` preflight                                                 | `satisfied`    |
| `PC-CONCEPTS-1` — track policy/profile are isolated while repository floors can only be tightened               | `concepts.md` tracks                       | D13 composition, `SCH-WORK-PROFILE`, frozen policy, and I9                                                                              | `satisfied`    |
| `PC-CONCEPTS-2` — dependency order blocks downstream roots without stopping independent Stories                 | `concepts.md` Stories                      | I13/I14, `CF-BLOCKERS`, and V3b `Blocked`/`Rejected` propagation                                                                        | `satisfied`    |
| `PC-CONCEPTS-3` — Worker, Reviewer, Runner, and mechanisms have the stated credential/effect limits             | `concepts.md` authority boundary           | V2 responsibility matrix, D3, `CB-SESSION`, and disjoint delivery bindings                                                              | `satisfied`    |
| `PC-CONCEPTS-4` — first-party consumers have a stable private boundary without a public API promise             | `concepts.md` SDK/providers                | `PORT-CONSUMER`, facade delegation table, and `CF-CONSUMER`                                                                             | `satisfied`    |
| `PC-CONCEPTS-5` — bundled and custom providers remain replaceable and prove exact authority before use          | `concepts.md` SDK/providers                | D12, provider manifest/proof, `CF-GATE-PROVIDER`, and `CF-MECH-*`                                                                       | `satisfied`    |
| `PC-CONCEPTS-6` — Forge review publication is not acceptance and cannot merge or land                           | `concepts.md` providers                    | D15, `CB-REVIEW-PUBLICATION`, and `CF-REVIEW-PUBLICATION`                                                                               | `satisfied`    |
| `PC-CONCEPTS-7` — landed/done/rejected/blocked/parked have one deterministic projection                         | `concepts.md` outcomes                     | [Canonical product projection](#canonical-product-projection) and V3/V9                                                                 | `satisfied`    |
| `PC-CONCEPTS-8` — product `stopped` is resumable suspension; terminal design `Stopped` projects as `ended`      | `concepts.md` outcomes                     | Run V3a, `EV-RUN-*` events, V4 resume integrity, and projection above                                                                   | `satisfied`    |
| `PC-USE-1` — overnight work preserves isolation, evidence, independent progress, and bounded waits              | `use-cases.md` overnight delivery          | I10–I19, V5 scheduling, evidence chain, and `BND-*` classes                                                                             | `satisfied`    |
| `PC-USE-2` — risky provider questions park durably and answer without widening posture                          | `use-cases.md` doorbell                    | D14, `ID-PARK`, `SCH-DECISION`, and request-follows-principal session contract                                                          | `satisfied`    |
| `PC-USE-3` — policy, work profile, provider posture, and repository floors do not blur                          | `use-cases.md` track posture               | D13, envelope composition, I9, and `SCH-WORK-PROFILE`                                                                                   | `satisfied`    |
| `PC-USE-4` — safe resume reconstructs durable truth and rechecks safety before dispatch                         | `use-cases.md` safe resume                 | V4, `RC-RESUME-INTEGRITY`, current-fence reauthorization, and `RESUME-1..5`                                                             | `satisfied`    |
| `PC-USE-5` — swapping a provider reuses the seam contract but requires exact proof for the new subject          | `use-cases.md` swapping your agent         | D10–D12, provider manifest, `CF-GATE-PROVIDER`, and `PORT-SESSION`                                                                      | `satisfied`    |
| `PC-USE-6` — after-the-fact reconstruction and write-once redacted export use recorded truth                    | `use-cases.md` reconstructing a run        | `PORT-CONSUMER` → `PORT-PUBLISH` for reads and `OPC-ART-GET` for retrieval; `SCH-AUDIT-EXPORT` and `ID-EXPORT`                          | `satisfied`    |

## Findings

### Conflicts — none

No imported commitment contradicts a locked decision, an invariant, or approved Layer 2 content.
No row carries `OWNER_DECISION_REQUIRED`. Every prior gap composes with the approved foundation and
is closed by this amendment; ISO-2 uses the owner-selected successor-Run semantics; and the owner
explicitly corrected and re-imported SEC-2, FENCE-1/2, DOOR-1/2/3, CFG-10, DRIVE-3, and SEE-1
before D14 carried the revised provider-permission boundary.

### Open design work — none

No imported product commitment remains a design `gap`. The provider-native trust boundary is an
accepted limitation, not an unproven hostile-provider security claim. A Jig-side middleman agent
that could answer or approve some provider requests is intentionally deferred and would require a
new explicit authority design; it is not needed to satisfy the current imported commitments.

### Upstream ownership — closed

D13 and [Envelope production](./envelope-production.md) assign the former upstream cluster to the
Jig product's Envelope Builder while keeping it outside `SYS-JIG` active-Run authority. No
commitment remains classified `upstream`.

### Other realization residuals — none

EARN-1 freshness, ISO-2 replanning semantics, the provider-permission boundary, and every
previously listed in-boundary gap now have an explicit contract and conformance path. Ordinary
implementation choices remain, but no product commitment awaits a design decision.

## Where to go next

- The import decision this matrix serves:
  [imported promise — the five product guarantees](./decisions/product-guarantee-import.md).
- The exact imported statements: [`docs/product/guarantees.md`](../../product/guarantees.md).
- The exact complete readiness candidate:
  [Product readiness gate record](./decisions/product-readiness-gate-record.md).
