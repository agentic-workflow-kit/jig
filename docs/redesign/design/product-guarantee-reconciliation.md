---
title: "Product guarantee reconciliation — imported commitments to redesign elements"
purpose: Map every imported product guarantee commitment to the redesign element that carries it, classify each mapping honestly, and identify the one deliberately unresolved commitment.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers reconciling the redesign with the product layer and planning gap closure
scope: The guarantee-to-design traceability matrix and its findings; the import decision itself lives in the import record, and SEC-2 is deliberately excluded from this readiness closure.
state: approved
status: owner-approved readiness amendment of 2026-07-16; exact-candidate review and lock pending; SEC-2 deliberately open
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
**traceability artifact, not a view**. It traces the owner-approved readiness amendment that closes
every previously recorded gap and upstream ownership question except SEC-2. The exact amendment
candidate still follows the renewed-review rule of the
[Layer 2 gate record](./decisions/layer2-gate-record.md).

## Classification vocabulary

| Classification | Meaning                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `satisfied`    | A named redesign element carries the commitment as stated.                                                                                |
| `note`         | Carried in substance; the note records a vocabulary mapping or a bounded residual the owner should know when reading either side.         |
| `gap`          | Inside the designed system boundary, but no element carries it yet; closing it is design work under the renewed-review rule.              |
| `upstream`     | The commitment lands outside `SYS-JIG` as bounded by [D2](./decisions/D2-system-boundary.md) and still lacks a named product-layer owner. |
| `conflict`     | The commitment contradicts an approved design element; surfaces as `OWNER_DECISION_REQUIRED`.                                             |

**Result: zero `conflict` rows, zero `upstream` rows, and one `gap` row: SEC-2.** Nothing imported
contradicts a locked decision or invariant. Every other commitment is carried by the readiness
amendment summarized [after the matrix](#findings).

## Guarantee 1 — control and trust

### The fence (`FENCE`)

| ID      | Carried by                                                                                                                                                                                                                                                                     | Classification |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| FENCE-1 | Every effect is a Jig-authorized Operation under a per-Operation capability binding; an unbound or out-of-binding result fails closed and creates no fact (I3, I7; `CB-*` and `CP-MEDIATOR` in [mechanism contracts](./mechanism-and-provider-contracts.md), V2 `R-VALIDATE`). | `satisfied`    |
| FENCE-2 | Bindings confer no standing authority and cannot be reused across Operations or generations; changing policy or authority scope is on the explicit owner-required list in [failure and liveness](./failure-and-liveness.md), and the envelope is frozen per Run.               | `satisfied`    |
| FENCE-3 | Credentials resolve per configured mechanism and live only in controller and mechanism process memory; role sessions receive bounded inputs under `CB-SESSION`, never privileged credentials; privileged effects run only as finalizer-authorized delivery Operations.         | `satisfied`    |

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

| ID     | Carried by                                                                                                                                                                                                               | Classification |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| DOOR-1 | Automatic fail-closed behavior for invalid or insufficient input, authority, evidence, or proof; ambiguity parks a named question rather than guessing ([failure and liveness](./failure-and-liveness.md), I15).         | `satisfied`    |
| DOOR-2 | A parked question is a durable ledger record with wake condition and bound; `BND-WAIT-DECISION` exhaustion re-escalates and never drops it; wake triggers are reconstructed on Recovery (I6, I16).                       | `satisfied`    |
| DOOR-3 | An owner decision identity binds the exact question, authorized responder, and scope; `CP-ESCALATION` validates responder identity and recorded delegation scope; a decision cannot manufacture facts or landing claims. | `satisfied`    |

### Merge-on-evidence (`MERGE`)

| ID      | Carried by                                                                                                                                                                                                                                                                                                        | Classification |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| MERGE-1 | Reviewer-principal acceptance of the exact package (I8, `RP-PACKAGE-DIGEST`); principal-level independence rejects self-review across sessions (`RP-INDEPENDENCE`, `ID-PRINCIPAL`); a bare success claim is never an observed fact (`MC-ATTEST`).                                                                 | `satisfied`    |
| MERGE-2 | Publication and integration are delivery Operations authorized only by `CP-FINALIZER` under its fence through `PORT-DELIVERY`; implementer and reviewer are structurally excluded from delivery (V1/V2 limits).                                                                                                   | `satisfied`    |
| MERGE-3 | Frozen policy declares required check classes and the final-verification posture; an unbound required class fails preflight; configuration may add checks but never weaken (I9, `RP-CHECKCLASS`, D7).                                                                                                             | `satisfied`    |
| MERGE-4 | Product "done" and "merged" map to the distinct durable states `Accepted` and `Landed`; a held integration is a durable named wait (`LP-HELD`) that does not erase acceptance; only confirmed landing releases dependencies (I13).                                                                                | `note`         |
| MERGE-5 | [Forge and landing](./forge-and-landing.md) defines idempotent `OPC-DEL-STATUS` and `OPC-DEL-COMMENT`: when a safe branch and authority exist, Jig opens or reuses the real request and surfaces redacted reasons, urgency, and actions; failure preserves `Blocked` and creates a residual surfacing obligation. | `satisfied`    |

Forge surfacing is an effect with its own identity, reconciliation, and failure outcome; it never
becomes a second source of block truth and never erases the underlying failure.

### Security (`SEC`)

| ID    | Carried by                                                                                                                                                                                                                                                         | Classification |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| SEC-1 | Source redaction plus controller-side secret scanning and quarantine (`EVR-REDACT`, `EVR-SCAN`, `EVR-QUARANTINE`); credential secrecy rules; landing-path redaction; export redaction (QS10 end to end).                                                           | `satisfied`    |
| SEC-2 | **Deliberately unresolved.** The design can attest and conformance-test declared filesystem/network confinement, but it does not prove that an arbitrary provider has no undisclosed phone-home path. That stronger proof claim remains open for owner discussion. | `gap`          |
| SEC-3 | As FENCE-3 for forge credentials: the delivery mechanism holds them, the finalizer authorizes the effect, and role sessions never see them.                                                                                                                        | `satisfied`    |

SEC-2 is intentionally excluded from the readiness lock candidate. Existing least-privilege,
allowlist, attestation, and adversarial-test contracts remain useful defense in depth, but no page
may present them as proof of the imported no-phone-home guarantee.

## Guarantee 2 — configuration ownership

| ID     | Carried by                                                                                                                                                                                                                                               | Classification |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| CFG-1  | Frozen policy supplies verification posture, required check classes, anti-gaming rule surfaces, assisted/manual authority classes, capacity maxima and reserve, bounds, mechanism minima, non-gating classes, and retention; changing it is owner-gated. | `satisfied`    |
| CFG-2  | `SCH-WORK-PROFILE` is the named, digest-bound tunable artifact in the envelope. It owns agent/prompt/work preferences while frozen policy owns safety floors; profile composition cannot weaken policy.                                                  | `satisfied`    |
| CFG-3  | The [Envelope Builder](./envelope-production.md) owns named tracks and composes their policy with repository floors before owner approval and `PORT-INTAKE`.                                                                                             | `satisfied`    |
| CFG-4  | `CP-SCHEDULER` derives admission deterministically from durable facts, the plan's ordering facts, and declared capacity — the actual is computed, never hand-set (I4, I10, I11).                                                                         | `satisfied`    |
| CFG-5  | `EP-GUIDANCE` in [envelope production](./envelope-production.md) converts owner intent into an inspectable proposal and never submits it without exact-digest approval.                                                                                  | `satisfied`    |
| CFG-6  | Envelope Builder presets are named, versioned starting points whose proposal shows their reasoning and complete expansion before approval.                                                                                                               | `satisfied`    |
| CFG-7  | Structured durable records, derived read models, position-stamped redacted exports over `PORT-PUBLISH`, and conformance-gated provider seams; influence re-enters only through `PORT-INTAKE`/`PORT-DECIDE` as a validated participant.                   | `satisfied`    |
| CFG-8  | Prompt strategy is explicit, versioned work-profile content composed by Envelope Builder and executed only through the bounded session mechanism; it has no authority to weaken policy.                                                                  | `satisfied`    |
| CFG-9  | `SCH-SETUP-RECEIPT` keys freshness by setup-recipe digest, input digest, and host fingerprint; `OPC-WS-SETUP` executes only when that exact receipt is absent or stale.                                                                                  | `satisfied`    |
| CFG-10 | The frozen policy carries a deterministic manual/assisted classifier. Only explicitly reversible, non-privileged, credential-free, non-delivery, non-destructive, non-rule actions may auto-grant; every other or unknown class is human.                | `satisfied`    |

CFG-1's anti-gaming and escalation floors are now first-class through the frozen rule-surface
manifest and authority classifier. Configuration ownership, guidance, presets, tracks, floors,
work-profile authoring, and Work Source intake belong to Envelope Builder: part of the Jig product
but outside `SYS-JIG` runtime control authority. The owner approves the exact composed digest before
submission, preserving the frozen-envelope boundary.

## Guarantee 3 — resilience

### Interruption resume (`RESUME`)

| ID       | Carried by                                                                                                                                                                                                                                                                      | Classification |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| RESUME-1 | Record-before-adopt/dispatch into the durable ordered ledger (I5); durable authority classification in [state and recovery](./state-and-recovery.md).                                                                                                                           | `satisfied`    |
| RESUME-2 | Recovery fences stale control, reconstructs from the ledger, and resumes from durable truth; admission and wake triggers are replayable/reconstructable (I4, I6).                                                                                                               | `satisfied`    |
| RESUME-3 | One durable Operation identity per semantic effect; reconciliation before any second semantic attempt (I17); the five-way readback classification and `LG-WITNESS` currency make duplicates and rollback detectable.                                                            | `satisfied`    |
| RESUME-4 | Indeterminate outcomes halt into Recovery or park with a named reason; every stop is a durable, named, inspectable state (I15, I16, I20).                                                                                                                                       | `satisfied`    |
| RESUME-5 | `RC-RESUME-INTEGRITY` compares the frozen envelope, provider build/manifest/environment proof, rule surfaces, target basis, and fences before dispatch; any safety-relevant change invalidates dependent approval/evidence and parks for exact re-approval plus fresh evidence. | `satisfied`    |

The named resume-integrity rule unifies the digest, fence, lineage, environment, and package checks
under one fail-closed Recovery decision; a provider's assertion that nothing changed is not input.

### Failure isolation (`ISO`)

| ID    | Carried by                                                                                                                                                                                                                              | Classification |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| ISO-1 | Eligibility requires all prerequisites confirmed `Landed` and no durable direct blocker (I13, I14); a blocked Story's dependents derive `Not run — dependency blocked` while independent work continues (I15).                          | `satisfied`    |
| ISO-2 | Posture is expressed through frozen policy: bounds, budgets, non-gating classes, and exhaustion actions lean prevention or throughput. Replanning always creates a successor envelope and Run; it never mutates the active Run.         | `satisfied`    |
| ISO-3 | Blocks are durable facts carrying the complete canonically ordered direct-root set (I14), visible on `OBS-STORY-BOARD` and in exports.                                                                                                  | `satisfied`    |
| ISO-4 | One isolated workspace per active Story (`RC-ISOLATION`, `CB-WORKSPACE` pinning path, repository, and basis); admission commits its reservation Transition before any resource is touched; Operation identity prevents double dispatch. | `satisfied`    |

ISO-2's "quarantine and re-plan" has one explicit meaning: preserve and park the affected work,
then use Envelope Builder to produce an owner-approved successor Run linked to its predecessor.
The original Run remains immutable and auditable.

### Liveness (`LIVE`)

| ID     | Carried by                                                                                                                                                                                                                                                                  | Classification |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| LIVE-1 | `SCH-LIVENESS`, `EV-LIVENESS-OBSERVED`, `BND-IDLE`, and `BND-SILENCE` turn subject-bound progress, heartbeat, termination, repetition, and approval-wait facts into deterministic thinking/stuck/dead/approval-overdue classifications and explicit park/escalate outcomes. | `satisfied`    |
| LIVE-2 | Exhaustion actions are explicit — block, park, escalate — never silent spend; alerts derive from durable bound facts (I16).                                                                                                                                                 | `satisfied`    |

Message volume and provider self-classification do not count as progress; the controller derives
the classification from validated mechanism observations and frozen bound classes.

## Guarantee 4 — stack portability

### Seams (`STACK`)

| ID      | Carried by                                                                                                                                                                                                                                           | Classification |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| STACK-1 | The `MC-*` contract and conformance gating make control, evidence, and recovery provider-independent; the boundary follows authority and proof, not packaging.                                                                                       | `satisfied`    |
| STACK-2 | Work Source ↔ Envelope Builder `PORT-SOURCE`; Agent ↔ `PORT-SESSION`; Execution Host ↔ `PORT-WORKSPACE` plus the session sandbox posture; Forge ↔ `PORT-DELIVERY`. Each seam has identity, manifest, attestation, freshness, and conformance duties. | `satisfied`    |
| STACK-3 | The agent mechanism is configured and swappable behind `PORT-SESSION`; owner choice is recorded in the named `SCH-WORK-PROFILE` and provider-authority manifest.                                                                                     | `satisfied`    |
| STACK-4 | `CF-GATE-PROVIDER` plus compose-time posture attestation; an unproven capability never becomes configurable or silently trusted.                                                                                                                     | `satisfied`    |
| STACK-5 | Seams are ports crossed only under capability bindings and authority fences; credentials stay with the mechanism that needs them.                                                                                                                    | `satisfied`    |
| STACK-6 | The boundary rule states it directly: a provider bundled with Jig still remains outside the decision-authority boundary; I2/I3 are enforced structurally and per-port suites apply to any provider equally.                                          | `satisfied`    |
| STACK-7 | Any exact provider that passes its port's `CF-MECH-*` suite becomes configurable — custom providers are in scope by construction.                                                                                                                    | `satisfied`    |

`PORT-SOURCE` belongs to the product-layer Envelope Builder rather than active-Run control. This
keeps Work Source swappable without granting it lifecycle or effect authority.

### Trusting a driver (`DRIVE`)

| ID      | Carried by                                                                                                                                                                                                                          | Classification |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| DRIVE-1 | Every `CF-MECH-*` suite must execute the reusable shared adversarial-probe library plus port-specific hostile cases; a provider-specific waiver cannot open the gate.                                                               | `satisfied`    |
| DRIVE-2 | `SCH-PROVIDER-AUTHORITY` is digest-bound and owner-approved, declaring runtime, filesystem, network, credential, and effect authority; bindings may narrow it only, and any digest change requires a fresh pass and owner approval. | `satisfied`    |
| DRIVE-3 | `MC-HONESTY`: an honest `weak` attestation is valid input, a false `strong` one is a breach; policy sets the minimum posture and an unmet minimum fails closed.                                                                     | `satisfied`    |
| DRIVE-4 | Bundled and future providers are gated by the same versioned reusable conformance and adversarial-probe contracts against their exact build, manifest, and environment.                                                             | `satisfied`    |

Provider trust is therefore earned for an exact subject and explicit authority declaration, not
inherited from bundling, a provider name, or a previous build.

## Guarantee 5 — full observability

| ID    | Carried by                                                                                                                                                                                                                         | Classification |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| SEE-1 | The durable authority enumeration covers decisions, authorizations, fences, evidence references, approvals, transitions, waits, escalations, outcomes, and obligations (I5; [state and recovery](./state-and-recovery.md)).        | `satisfied`    |
| SEE-2 | Records are structured durable facts; `OBS-*` read models and position-stamped exports over `PORT-PUBLISH` are the consumable surface.                                                                                             | `satisfied`    |
| SEE-3 | The ledger facts and digest-verified evidence the decisions consumed are exactly what the owner inspects afterward; projections are derived, never a second story (I5, `EVR-*`, `OBS-EVIDENCE`).                                   | `satisfied`    |
| SEE-4 | Operator verbs answer from recorded Transitions — "why is this Story here" is the recorded decision trail — with no extra tooling required beyond the operator interface (`RT-OPERATOR`).                                          | `satisfied`    |
| SEE-5 | `SCH-NOTICE` and `OBS-NOTICES` form one complete projection: every parked, blocked, stale, overdue, uncertain, or residual condition has a stable identity, deterministic urgency, accountable owner, and currently valid actions. | `satisfied`    |
| SEE-6 | Terminal `SCH-AUDIT-EXPORT` bytes are canonical, redacted, content-addressed by `ID-EXPORT`, and create-once through immutable artifact storage; recovery can verify or complete the identical write but never overwrite it.       | `satisfied`    |

Notice acknowledgement changes presentation only; the underlying durable condition must resolve.
The terminal export includes the final ledger position and immutable store receipt, and a digest
mismatch remains an explicit integrity obligation.

## Findings

### Conflicts — none

No imported commitment contradicts a locked decision, an invariant, or approved Layer 2 content.
No row carries `OWNER_DECISION_REQUIRED`. The nearest candidates were examined and resolved as
follows: every prior gap composes with the approved foundation and is closed by this amendment;
ISO-2 uses the owner-selected successor-Run semantics; SEC-2 is an explicit absence, not a
contradiction, and remains outside the lock candidate.

### Open design work — SEC-2 only

SEC-2 remains the single `gap`: define what evidence can justify the imported claim that an agent
cannot phone home, including whether the trust model requires independently enforced egress
mediation, independent observation, a narrower product claim, or some combination. This PR does
not choose among those materially different security contracts.

### Upstream ownership — closed

D13 and [Envelope production](./envelope-production.md) assign the former upstream cluster to the
Jig product's Envelope Builder while keeping it outside `SYS-JIG` active-Run authority. No
commitment remains classified `upstream`.

### Other realization residuals — none

EARN-1 freshness, ISO-2 replanning semantics, and every previously listed in-boundary gap now have
an explicit contract and conformance path. Ordinary implementation choices remain, but no other
product commitment awaits a design decision.

## Where to go next

- The import decision this matrix serves:
  [imported promise — the five product guarantees](./decisions/product-guarantee-import.md).
- The exact imported statements: [`docs/product/guarantees.md`](../../product/guarantees.md).
- The exact readiness candidate and its SEC-2 exclusion:
  [Product readiness gate record](./decisions/product-readiness-gate-record.md).
