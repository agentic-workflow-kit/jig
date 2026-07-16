---
title: "Canonical model — vocabulary and stable identities"
purpose: Define the one canonical Layer 1 vocabulary, object identities, and binding rules that every other design page references without redefining.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Product, engineering, security, and operations leads
  - Future Layer 2 architecture authors after authorization
scope: Source/authority vocabulary, runtime vocabulary, and the identity and binding model; identity representation, schemas, and all mechanisms are excluded.
state: proposed
status: proposed Layer 1 content, re-presented 2026-07-15 under the owner-directed view-based structure; pending independent review of the new candidate set
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ./brief.md
  - ../AGENTS.md
  - ../raw/design/README.md
  - ../raw/design/decisions.md
  - Explicit owner structure-revision instruction, 2026-07-15
related:
  - ./README.md
  - ./context.md
  - ./decisions/D1-source-scope.md
  - ./decisions/D2-system-boundary.md
---

# Canonical model — vocabulary and stable identities

Every design page uses these definitions by reference. A term or identity defined here is not
redefined elsewhere; a view that needs a subset selects from this model rather than inventing its
own vocabulary.

## Source and authority vocabulary

| Term                               | Canonical meaning                                                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture Authority**         | The approved project brief plus explicit owner decisions.                                                                                                                                         |
| **Owner Decision**                 | An explicit selection, import, approval, rejection, stop, exception, or reopen by Arye, or a bounded operational decision by a recorded delegate within scope; never silence or a document label. |
| **Working Contract**               | The applicable `AGENTS.md` and explicit author instructions. It governs behavior and source scope without selecting architecture.                                                                 |
| **Architecture Method**            | The active documentation method. It defines how artifacts are authored, reviewed, approved, and locked without selecting design.                                                                  |
| **Directional Source**             | The immutable standalone proposal: evidence to preserve, test, reorganize, or reject, not approved architecture.                                                                                  |
| **Review Evidence**                | Immutable archived findings used as adversarial scenarios and questions, not automatic fixes.                                                                                                     |
| **Product Reference**              | A targeted observation that may inform discussion but has no governing force. None was consulted for this candidate.                                                                              |
| **Imported Promise or Constraint** | An exact external statement made governing only by explicit owner import with provenance, rationale, consequences, and affected decisions. None was imported.                                     |
| **Proposed Architecture**          | This coherent candidate set. It becomes the approved, locked Layer 1 foundation only when its exact candidate passes independent review under the owner-approved bounded delegation.              |

## Runtime vocabulary

| Term                    | Canonical meaning                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Execution Envelope**  | The already-approved plan, policy, and configuration submitted to Jig as one run basis.                                                                                           |
| **Run**                 | One finite, stably identified evaluation of a frozen Execution Envelope.                                                                                                          |
| **Story**               | One stably identified unit within a Run, with approved requirements, dependencies, ordering facts, and an independent business outcome.                                           |
| **Jig Control**         | The logical authority that validates triggers, makes deterministic lifecycle decisions, authorizes operations, records durable truth, and reconciles interruption or uncertainty. |
| **Transition**          | One stably identified deterministic decision over the current authoritative state and one ordered, validated trigger.                                                             |
| **Operation**           | One stably identified, Jig-authorized request for a scoped external effect or observation.                                                                                        |
| **Candidate**           | One exact committed Story result, bound to its target basis, evidence, and delivery metadata.                                                                                     |
| **Accepted**            | Jig's durable lifecycle decision after valid reviewer approval of the exact Candidate and Jig's structural, identity, authority, evidence, findings, and lifecycle validation.    |
| **Landed**              | The durable business outcome recorded only after the authoritative target is observed to contain the Accepted result.                                                             |
| **Rejected**            | The durable Story business outcome after an authorized owner decision declines an exact Story-bound parked request; dependents treat it as a direct non-delivery root.            |
| **Suspended**           | A durable, resumable Run phase entered by validated operator stop; dispatch ceases while every unfinished Story keeps its underlying state.                                       |
| **Stopped**             | A terminal Run non-delivery outcome after trust/liveness failure or an explicit terminal-stop decision; projects as product-visible `ended`, never resumable `stopped`.           |
| **Retirement**          | Settlement, fencing, preservation, cleanup, release, or explicit handoff of resources and proof obligations after a business outcome.                                             |
| **Residual Obligation** | A durable, owner-assigned Retirement or proof obligation that could not be completed automatically.                                                                               |

## Identity and binding model

| Stable identity         | Parent scope                                           | What it binds at Layer 1                                                                                                                            |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run identity            | Architecture-controlled run scope                      | The frozen Execution Envelope, controller generation, ordered history, outcomes, and obligations.                                                   |
| Story identity          | Run                                                    | Requirements, dependencies, immutable ordering facts, Candidate history, business outcome, and Retirement.                                          |
| Transition identity     | Run and expected prior ledger position                 | One deterministic decision and the operation intents it authorizes; it survives an unknown commit acknowledgement.                                  |
| Operation identity      | Run or Story                                           | One semantic effect, its payload basis, authority fence, external result, and effect certainty.                                                     |
| Candidate identity      | Story                                                  | Exact committed content, target basis, reviewed evidence, delivery metadata, acceptance, and Candidate-sensitive effects.                           |
| Controller generation   | Run                                                    | Current control authority and the rejection of stale pre-interruption dispatchers.                                                                  |
| Finalization authority  | Configured target and Story                            | The sole current right to align, verify, and request target change for the bound Candidate basis.                                                   |
| Evidence subject        | Run, Story, Candidate, Operation, or target fact       | The exact claim to which attributable evidence may contribute.                                                                                      |
| Owner decision identity | Run, Story, parked request, notice, or authority scope | The exact subject, authorized responder or grant, selected action and reason, and later continuation, suspension, stop, acknowledgement, or snooze. |

Identity representation and schemas are Layer 2 decisions. The binding rule is already fixed: a
stale, duplicate, late, wrong-role, wrong-subject, wrong-basis, or wrong-fence result cannot advance
state.

## Where the model is used

- [System context](./context.md) locates the participants and systems these terms name.
- [Authority and trust](./perspectives/authority-and-trust.md) allocates powers over them.
- [Run and Story lifecycle](./flows/run-and-story-lifecycle.md) orders their progression.
- [State and recovery](./state-and-recovery.md) classifies their durable authority.
- [Acceptance and evidence](./acceptance-and-evidence.md) and
  [concurrency and finalization](./concurrency-and-finalization.md) apply the binding rules.
- [Invariants](./invariants.md) states the rules later design must preserve.
