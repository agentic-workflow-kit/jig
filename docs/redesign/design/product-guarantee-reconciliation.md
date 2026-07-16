---
title: "Product guarantee reconciliation — imported commitments to redesign elements"
purpose: Map every imported product guarantee commitment to the redesign element that carries it, classify each mapping honestly, and enumerate the gaps and upstream items the redesign does not yet cover.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers reconciling the redesign with the product layer and planning gap closure
scope: The guarantee-to-design traceability matrix and its findings; the import decision itself lives in the import record, and no approved design content is changed by this page.
state: proposed
status: authored 2026-07-16 against the approved (not locked) Layer 2 baseline; classifications await owner confirmation on this page's review
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
**traceability artifact, not a view**: it changes nothing in the approved design, and closing a
`gap` row later is a material Layer 2 change that follows the renewed-review rule of the
[Layer 2 gate record](./decisions/layer2-gate-record.md).

## Classification vocabulary

| Classification | Meaning                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `satisfied`    | A named redesign element carries the commitment as stated.                                                                                                                    |
| `note`         | Carried in substance; the note records a vocabulary mapping or a bounded residual the owner should know when reading either side.                                             |
| `gap`          | Inside the designed system boundary, but no element carries it yet; closing it is design work under the renewed-review rule.                                                  |
| `upstream`     | The commitment lands outside `SYS-JIG` as bounded by [D2](./decisions/D2-system-boundary.md) — typically in envelope production — so a bridge artifact must assign its owner. |
| `conflict`     | The commitment contradicts an approved design element; surfaces as `OWNER_DECISION_REQUIRED`.                                                                                 |

**Result: zero `conflict` rows.** Nothing imported contradicts a locked decision, an invariant, or
approved Layer 2 content. The findings that need attention are the eleven `gap` rows and the
`upstream` cluster, summarized [after the matrix](#findings).

## Guarantee 1 — control and trust

### The fence (`FENCE`)

| ID      | Carried by                                                                                                                                                                                                                                                                     | Classification |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| FENCE-1 | Every effect is a Jig-authorized Operation under a per-Operation capability binding; an unbound or out-of-binding result fails closed and creates no fact (I3, I7; `CB-*` and `CP-MEDIATOR` in [mechanism contracts](./mechanism-and-provider-contracts.md), V2 `R-VALIDATE`). | `satisfied`    |
| FENCE-2 | Bindings confer no standing authority and cannot be reused across Operations or generations; changing policy or authority scope is on the explicit owner-required list in [failure and liveness](./failure-and-liveness.md), and the envelope is frozen per Run.               | `satisfied`    |
| FENCE-3 | Credentials resolve per configured mechanism and live only in controller and mechanism process memory; role sessions receive bounded inputs under `CB-SESSION`, never privileged credentials; privileged effects run only as finalizer-authorized delivery Operations.         | `satisfied`    |

### Earned trust (`EARN`)

| ID     | Carried by                                                                                                                                                                                                                                                                                      | Classification |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| EARN-1 | `CF-GATE-PROVIDER` in [architecture conformance](./architecture-conformance.md): a provider is configurable only after a recorded pass of its port suite against that exact provider; posture is additionally attested at compose time and an unmet policy minimum fails closed before effects. | `note`         |
| EARN-2 | Conformance evidence is exact-subject (I7): a changed provider re-gates; an honest `weak` posture is valid input and the response to insufficient proof is fail-closed preflight or a parked owner decision — the product's "more human checkpoints", not a weakened gate.                      | `note`         |

Notes: proof freshness in the redesign is subject-based (a changed provider or suite re-gates),
not time-based — a recorded pass has no expiry class. If the product's "fresh" intends time-bound
staleness, that is a small vocabulary delta to settle when conformance suites are realized.

### Anti-gaming (`GUARD`)

| ID      | Carried by                                                                                                                                                                                                                         | Classification |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| GUARD-1 | The Execution Envelope — plan, policy, configuration — is frozen per Run; configuration and providers may add or exceed but never remove, weaken, or silently change policy-required elements (I9 and its rule pattern).           | `satisfied`    |
| GUARD-2 | **Not carried.** No redesign element classifies a Candidate's changed surfaces as policy-, verification-, or integration-governing, and nothing pauses completion for owner re-approval plus fresh evidence when they are touched. | `gap`          |

GUARD-2 gap detail: the machinery it needs composes cleanly with approved content — a preflight- or
review-time classification of rule-governing paths, a lifecycle event that parks completion, and an
owner decision — but none of it is designed. This is the anti-gaming floor CFG-1 also references,
so the gap has two dependents.

### The doorbell (`DOOR`)

| ID     | Carried by                                                                                                                                                                                                               | Classification |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| DOOR-1 | Automatic fail-closed behavior for invalid or insufficient input, authority, evidence, or proof; ambiguity parks a named question rather than guessing ([failure and liveness](./failure-and-liveness.md), I15).         | `satisfied`    |
| DOOR-2 | A parked question is a durable ledger record with wake condition and bound; `BND-WAIT-DECISION` exhaustion re-escalates and never drops it; wake triggers are reconstructed on Recovery (I6, I16).                       | `satisfied`    |
| DOOR-3 | An owner decision identity binds the exact question, authorized responder, and scope; `CP-ESCALATION` validates responder identity and recorded delegation scope; a decision cannot manufacture facts or landing claims. | `satisfied`    |

### Merge-on-evidence (`MERGE`)

| ID      | Carried by                                                                                                                                                                                                                                                                                                                                   | Classification |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| MERGE-1 | Reviewer-principal acceptance of the exact package (I8, `RP-PACKAGE-DIGEST`); principal-level independence rejects self-review across sessions (`RP-INDEPENDENCE`, `ID-PRINCIPAL`); a bare success claim is never an observed fact (`MC-ATTEST`).                                                                                            | `satisfied`    |
| MERGE-2 | Publication and integration are delivery Operations authorized only by `CP-FINALIZER` under its fence through `PORT-DELIVERY`; implementer and reviewer are structurally excluded from delivery (V1/V2 limits).                                                                                                                              | `satisfied`    |
| MERGE-3 | Frozen policy declares required check classes and the final-verification posture; an unbound required class fails preflight; configuration may add checks but never weaken (I9, `RP-CHECKCLASS`, D7).                                                                                                                                        | `satisfied`    |
| MERGE-4 | Product "done" and "merged" map to the distinct durable states `Accepted` and `Landed`; a held integration is a durable named wait (`LP-HELD`) that does not erase acceptance; only confirmed landing releases dependencies (I13).                                                                                                           | `note`         |
| MERGE-5 | **Partially carried.** A blocked integration is a durable ledger fact surfaced through read models and `PORT-PUBLISH` — never a log line — but the product-required forge-side surfacing (a real pull request carrying the failure reasons in a comment, with status posted to the PR) has no designed delivery Operation or surfacing rule. | `gap`          |

MERGE-5 gap detail: closing it needs an explanation-publication delivery Operation class (the
Operation catalog's delivery set has no post-comment/post-status entry) and a rule selecting the
forge as a block-surfacing channel when a safe branch and push permission exist. The current
implementation already ships blocked-PR surfacing, so realizing the redesign without this row is a
product regression, not just a missing feature.

### Security (`SEC`)

| ID    | Carried by                                                                                                                                                                                                                                                                | Classification |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| SEC-1 | Source redaction plus controller-side secret scanning and quarantine (`EVR-REDACT`, `EVR-SCAN`, `EVR-QUARANTINE`); credential secrecy rules; landing-path redaction; export redaction (QS10 end to end).                                                                  | `satisfied`    |
| SEC-2 | Sessions run under least-privilege filesystem and network allowlists; `CB-VERIFY` defaults to zero egress; enforcement strength is attested at compose time (`MC-HONESTY`), policy can require a minimum posture, and an unmet minimum fails closed before Story effects. | `note`         |
| SEC-3 | As FENCE-3 for forge credentials: the delivery mechanism holds them, the finalizer authorizes the effect, and role sessions never see them.                                                                                                                               | `satisfied`    |

SEC-2 note: the product's "the confinement is proven" is realized as attested posture gated by
per-port conformance with recorded real-provider evidence — the agent never attests its own
confinement, so "not the agent's word" holds — but the proof strength is bounded by the host
mechanism's honesty clause and the adversarial depth of `CF-MECH-*` content. An independent
runtime egress witness is not designed. This residual should be weighed when conformance suites
are realized (see DRIVE-1's note).

## Guarantee 2 — configuration ownership

| ID     | Carried by                                                                                                                                                                                                                                | Classification |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| CFG-1  | Frozen policy supplies verification posture, required check classes, capacity maxima and progress reserve, bound and budget classes, mechanism posture minima, non-gating classes, and retention classes; changing policy is owner-gated. | `note`         |
| CFG-2  | **Not first-class.** The envelope's "configuration" is the nearest slot, and the safety split is echoed by configuration-cannot-weaken-policy — but the work profile as a named, freely tunable artifact does not exist in the redesign.  | `gap`          |
| CFG-3  | Per-track configuration and repo-policy floor composition happen before `PORT-INTAKE`: the redesign receives one already-composed frozen policy and never sees tracks or floors.                                                          | `upstream`     |
| CFG-4  | `CP-SCHEDULER` derives admission deterministically from durable facts, the plan's ordering facts, and declared capacity — the actual is computed, never hand-set (I4, I10, I11).                                                          | `satisfied`    |
| CFG-5  | Guided intent-to-configuration setup has no home inside `SYS-JIG`; it is an envelope-production and product-surface concern.                                                                                                              | `upstream`     |
| CFG-6  | Presets with reasoning: same locus as CFG-5.                                                                                                                                                                                              | `upstream`     |
| CFG-7  | Structured durable records, derived read models, position-stamped redacted exports over `PORT-PUBLISH`, and conformance-gated provider seams; influence re-enters only through `PORT-INTAKE`/`PORT-DECIDE` as a validated participant.    | `satisfied`    |
| CFG-8  | Prompt-strategy maturity is agent-mechanism and work-profile content; the redesign deliberately does not reach below the session port into prompting.                                                                                     | `upstream`     |
| CFG-9  | Staleness-aware setup ("run setup only when the workspace is stale") is not among the designed workspace-mechanism duties; it is a small realization-level behavior of the workspace provider.                                            | `gap`          |
| CFG-10 | **Not carried.** Escalation always parks for the owner or a recorded delegate; there is no policy vocabulary for a fixed, deterministic auto-grant category boundary (the assisted posture).                                              | `gap`          |

CFG-1 note: two declared policy elements have no redesign vocabulary yet — escalation postures
(the CFG-10 gap) and the anti-gaming floor (the GUARD-2 gap). CFG-10 gap detail: a frozen-policy
category rule that pre-answers low-risk escalations is deterministic and consistent with D3/I4 —
frozen policy deciding is not a model deciding, so the product's "never adjudicated by a model"
boundary is preservable — but the category classifier, its fixed boundary, and its policy
representation are undesigned, and its "rule-governing files always go to a human" edge depends on
GUARD-2's classifier.

Upstream cluster: the CFG family is where the product's promise surface extends furthest beyond
[D2](./decisions/D2-system-boundary.md)'s authority-and-proof boundary. The redesign deliberately
receives an already-approved envelope from `X-ENVELOPE`; configuration ownership, guidance,
presets, tracks, and floors live in whatever produces that envelope. That layer exists as product
promise and (partially) as current implementation, but no redesign-era artifact owns it — the
planned bridge artifacts must name its owner explicitly.

## Guarantee 3 — resilience

### Interruption resume (`RESUME`)

| ID       | Carried by                                                                                                                                                                                                                                           | Classification |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| RESUME-1 | Record-before-adopt/dispatch into the durable ordered ledger (I5); durable authority classification in [state and recovery](./state-and-recovery.md).                                                                                                | `satisfied`    |
| RESUME-2 | Recovery fences stale control, reconstructs from the ledger, and resumes from durable truth; admission and wake triggers are replayable/reconstructable (I4, I6).                                                                                    | `satisfied`    |
| RESUME-3 | One durable Operation identity per semantic effect; reconciliation before any second semantic attempt (I17); the five-way readback classification and `LG-WITNESS` currency make duplicates and rollback detectable.                                 | `satisfied`    |
| RESUME-4 | Indeterminate outcomes halt into Recovery or park with a named reason; every stop is a durable, named, inspectable state (I15, I16, I20).                                                                                                            | `satisfied`    |
| RESUME-5 | Recovery revalidates authorities before dispatch resumes; exact-subject and fence binding fail closed on any changed basis (I7); a moved target or changed package element re-enters full review; registry lineage is checked before target effects. | `note`         |

RESUME-5 note: the product states one general rule ("safety-relevant assumptions changed while
stopped → re-approval and fresh evidence"); the redesign realizes it piecewise through digest,
fence, lineage, and package-element checks. The piecewise checks appear to cover the safety-relevant
assumption classes; no single named "resume integrity" rule exists to cite.

### Failure isolation (`ISO`)

| ID    | Carried by                                                                                                                                                                                                                              | Classification |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| ISO-1 | Eligibility requires all prerequisites confirmed `Landed` and no durable direct blocker (I13, I14); a blocked Story's dependents derive `Not run — dependency blocked` while independent work continues (I15).                          | `satisfied`    |
| ISO-2 | Posture is expressed through frozen policy: bounds, budgets, non-gating classes, and exhaustion actions lean prevention or throughput.                                                                                                  | `note`         |
| ISO-3 | Blocks are durable facts carrying the complete canonically ordered direct-root set (I14), visible on `OBS-STORY-BOARD` and in exports.                                                                                                  | `satisfied`    |
| ISO-4 | One isolated workspace per active Story (`RC-ISOLATION`, `CB-WORKSPACE` pinning path, repository, and basis); admission commits its reservation Transition before any resource is touched; Operation identity prevents double dispatch. | `satisfied`    |

ISO-2 note: the product's "quarantine and re-plan" reads two ways. Within a Run the envelope is
frozen — there is no in-run re-planning; the redesign's own review protocol contemplates a
_re-planned Run_ presenting new frozen requirements, so re-planning produces a new envelope
upstream. The matrix classifies against that reading; if the product intends live in-run
re-planning, that would be a conflict with the frozen-envelope model and needs the owner.

### Liveness (`LIVE`)

| ID     | Carried by                                                                                                                                                                                                                           | Classification |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| LIVE-1 | **Partially carried.** Every wait is bounded and mechanism silence or overdue approval is detected, but no design element observes progress and idleness or classifies a worker as thinking, stuck, or dead as the product requires. | `gap`          |
| LIVE-2 | Exhaustion actions are explicit — block, park, escalate — never silent spend; alerts derive from durable bound facts (I16).                                                                                                          | `satisfied`    |

LIVE-1 gap detail: bounded waits preserve the fail-closed outcome, but they do not carry the exact
signal contract the product imports. Closing the gap requires a mechanism-facing liveness contract
for progress, idleness, silence, and overdue approval, plus a deterministic classification that
parks stuck or dead work instead of relying only on a fixed timeout.

## Guarantee 4 — stack portability

### Seams (`STACK`)

| ID      | Carried by                                                                                                                                                                                                                                                                      | Classification |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| STACK-1 | The `MC-*` contract and conformance gating make control, evidence, and recovery provider-independent; the boundary follows authority and proof, not packaging.                                                                                                                  | `satisfied`    |
| STACK-2 | Agent ↔ `PORT-SESSION`; Execution Host ↔ `PORT-WORKSPACE` plus the session sandbox posture; Forge ↔ `PORT-DELIVERY`. **Work Source has no port**: the envelope arrives already approved from `X-ENVELOPE`, so work-source swappability lives upstream, unowned by the redesign. | `note`         |
| STACK-3 | The agent mechanism is configured and swappable behind `PORT-SESSION`; the "work-profile choice" framing inherits the CFG-2 gap.                                                                                                                                                | `note`         |
| STACK-4 | `CF-GATE-PROVIDER` plus compose-time posture attestation; an unproven capability never becomes configurable or silently trusted.                                                                                                                                                | `satisfied`    |
| STACK-5 | Seams are ports crossed only under capability bindings and authority fences; credentials stay with the mechanism that needs them.                                                                                                                                               | `satisfied`    |
| STACK-6 | The boundary rule states it directly: a provider bundled with Jig still remains outside the decision-authority boundary; I2/I3 are enforced structurally and per-port suites apply to any provider equally.                                                                     | `satisfied`    |
| STACK-7 | Any exact provider that passes its port's `CF-MECH-*` suite becomes configurable — custom providers are in scope by construction.                                                                                                                                               | `satisfied`    |

STACK-2 note: the redesign decomposes to five mechanism ports plus storage rather than the
product's four seams; the mapping above preserves independent swappability for three of them. The
Work Source fragment joins the CFG upstream cluster as bridge-artifact work.

### Trusting a driver (`DRIVE`)

| ID      | Carried by                                                                                                                                                                                                                                                                                      | Classification |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| DRIVE-1 | **Partially carried.** Per-port suites with recorded real-provider evidence gate configurability, but the suite catalog does not require the product-promised adversarial probes.                                                                                                               | `gap`          |
| DRIVE-2 | **Partially carried.** Needs, scopes, posture, and configured providers are distributed across bindings, attestation, and the frozen envelope; no owner-approved authority manifest declares runtime, network, and credential authority or forces fresh approval when that declaration changes. | `gap`          |
| DRIVE-3 | `MC-HONESTY`: an honest `weak` attestation is valid input, a false `strong` one is a breach; policy sets the minimum posture and an unmet minimum fails closed.                                                                                                                                 | `satisfied`    |
| DRIVE-4 | **Partially carried.** Suites are versioned and reusable against exact providers, but their reusable contract does not require adversarial-probe coverage for bundled and future drivers.                                                                                                       | `gap`          |

DRIVE-1/DRIVE-4 gap detail: generic rejection paths do not make adversarial probes a required,
repeatable part of every port suite. Closing the gap requires named adversarial-probe obligations
in the conformance catalog and gated evidence for both bundled and future providers.

DRIVE-2 gap detail: closing the gap requires a digest-identified provider authority manifest that
declares runtime, network, and credential authority, records explicit owner approval, binds the
approved digest into configuration and conformance evidence, and requires fresh approval whenever
that digest changes.

## Guarantee 5 — full observability

| ID    | Carried by                                                                                                                                                                                                                                           | Classification |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| SEE-1 | The durable authority enumeration covers decisions, authorizations, fences, evidence references, approvals, transitions, waits, escalations, outcomes, and obligations (I5; [state and recovery](./state-and-recovery.md)).                          | `satisfied`    |
| SEE-2 | Records are structured durable facts; `OBS-*` read models and position-stamped exports over `PORT-PUBLISH` are the consumable surface.                                                                                                               | `satisfied`    |
| SEE-3 | The ledger facts and digest-verified evidence the decisions consumed are exactly what the owner inspects afterward; projections are derived, never a second story (I5, `EVR-*`, `OBS-EVIDENCE`).                                                     | `satisfied`    |
| SEE-4 | Operator verbs answer from recorded Transitions — "why is this Story here" is the recorded decision trail — with no extra tooling required beyond the operator interface (`RT-OPERATOR`).                                                            | `satisfied`    |
| SEE-5 | **Partially carried.** Separate Story, wait, obligation, and alert surfaces expose durable conditions, but no unified notice model guarantees that every parked, blocked, stale, or overdue condition has urgency and immediately available actions. | `gap`          |
| SEE-6 | **Partially carried.** Exports are durable, redacted, and position-stamped, but no export contract makes a finished audit record write-once or immutable.                                                                                            | `gap`          |

SEE-5 gap detail: closing the gap requires one derived notice model that covers every parked,
blocked, stale, and overdue condition and supplies a deterministic urgency class plus the actions
available at that point. Separate projections that a realization could compose do not require the
product-promised queue.

SEE-6 gap detail: closing the gap requires immutable or content-addressed export identity and
write-once persistence semantics for the finished audit record. A durable snapshot alone can still
be replaced or overwritten and therefore does not carry the exact product promise.

## Findings

### Conflicts — none

No imported commitment contradicts a locked decision, an invariant, or approved Layer 2 content.
No row carries `OWNER_DECISION_REQUIRED`. The nearest candidates were examined and resolved as
follows: GUARD-2, MERGE-5, and CFG-10 are absences, not contradictions — each composes with the
approved design; SEC-2 is carried with a named proof-strength residual; ISO-2 is compatible under
the re-planning-produces-a-new-envelope reading, with the alternative reading explicitly flagged
in its note for the owner to correct if intended.

### Gaps — design work inside the boundary (11)

| Gap     | What closing it needs                                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GUARD-2 | A rule-governing-surface classification, a completion-pause lifecycle event, and an owner re-approval path with fresh evidence.                                          |
| MERGE-5 | A block-explanation publication Operation class on `PORT-DELIVERY` and a rule selecting the forge as the surfacing channel when a safe branch and push permission exist. |
| CFG-2   | The work profile as a named envelope artifact with the policy/profile safety split made first-class.                                                                     |
| CFG-9   | A staleness-aware setup duty on the workspace provider (small; realization-level).                                                                                       |
| CFG-10  | Policy vocabulary for a fixed, deterministic escalation auto-grant category boundary; depends on GUARD-2's classifier for its always-human edge.                         |
| LIVE-1  | A liveness-signal contract for progress, idleness, silence, and overdue approval, with deterministic thinking/stuck/dead classification and parking.                     |
| DRIVE-1 | Required adversarial-probe obligations in every provider conformance suite.                                                                                              |
| DRIVE-2 | A digest-bound provider authority manifest covering runtime, network, and credentials, with owner approval and fresh approval on change.                                 |
| DRIVE-4 | Reusable adversarial-probe coverage for bundled and future providers under the same conformance bar.                                                                     |
| SEE-5   | A unified, actionable notice projection covering every parked, blocked, stale, and overdue condition with urgency and available actions.                                 |
| SEE-6   | Immutable or content-addressed, write-once persistence semantics for finished audit exports.                                                                             |

Each closure is a material Layer 2 change: renewed review and an explicit owner decision per the
[Layer 2 gate record](./decisions/layer2-gate-record.md), and the GUARD-2/MERGE-5 rows note where
the change lands. Until closed, the redesign does not fully cover the imported guarantee set.

### Upstream — needs an owning layer (4 full, 2 fragments)

CFG-3, CFG-5, CFG-6, CFG-8 in full, plus the work-profile authoring side of CFG-2 and the Work
Source seam fragment of STACK-2. All live in envelope production — the layer between the product's
promise surface and `PORT-INTAKE` that no redesign-era artifact owns. The planned bridge artifacts
(envelope schema versus the archived execution-plan contract, packaging versus `RT-*` units) must
assign this layer an owner; until then these commitments are carried only by the current
implementation.

### Residuals worth re-checking at realization (2)

- SEC-2: proof strength of confinement rests on attested posture plus conformance depth; no
  independent runtime egress witness is designed.
- EARN-1: conformance passes have no time-based freshness class; confirm subject-based re-gating
  matches product intent.

## Where to go next

- The import decision this matrix serves:
  [imported promise — the five product guarantees](./decisions/product-guarantee-import.md).
- The exact imported statements: [`docs/product/guarantees.md`](../../product/guarantees.md).
- The gate rule any gap closure follows:
  [Layer 2 gate record](./decisions/layer2-gate-record.md).
