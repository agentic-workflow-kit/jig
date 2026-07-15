---
title: "D12 — mechanism contract model"
purpose: Record the proposed Layer 2 selection of capability-scoped, attested, conformance-gated mechanism contracts for every configured external mechanism.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers realizing the Layer 2 design
scope: The D12 selection, rationale, accepted consequence, and rejected alternatives; the canonical contract content is owned by the mechanism-and-provider-contracts page.
state: proposed
status: proposed Layer 2 decision, authored 2026-07-15 under the owner continuation instruction; pending the Layer 2 independent review and owner stop
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../mechanism-and-provider-contracts.md
  - ../architecture-conformance.md
  - ./D3-responsibilities-trust-authority.md
  - ./D9-invariants-and-artifact-shape.md
related:
  - ./README.md
  - ../runtime.md
  - ../invariants.md
---

# D12 — mechanism contract model

- **Status:** Proposed Layer 2 selection; pending the Layer 2 gate and owner stop.
- **Owner:** Arye Kogan.
- **Related:** [Mechanism and provider contracts](../mechanism-and-provider-contracts.md),
  [architecture conformance](../architecture-conformance.md),
  [invariants I3, I7, I9, I17, I20](../invariants.md).

## Question

How are external mechanisms bound, trusted, and verified, consuming the D9 category 7 and 11
deferrals without weakening the validation posture of D3?

## Proposed direction

Use **capability-scoped, attested, conformance-gated mechanism contracts**:

- one common contract (`MC-*`) that every configured mechanism behind every port must satisfy:
  attributable identity, exact echo of the Operation identity and fence tuple, action only within
  the presented scope, structured attestations that separate observed facts from success claims,
  idempotency or lookup for irreversible effects, a reconciliation lookup interface, compensation
  only as new Jig-authorized Operations, session resume or attested loss, and honest posture
  attestation — a mechanism attests weakness rather than claiming strength it lacks;
- per-Operation capability bindings (`CB-*`) minted by the controller and validated on return,
  scoping each mechanism to subject, fence, operation class, and resource scope, so a result under
  a different binding fails closed;
- one recorded exception to mediator validation: the `PORT-LEDGER` commit primitive is not an
  Operation, so its `CB-STORE` binding is minted and validated by exactly one owner — the
  transition engine's commit protocol, through which `CP-RECOVERY` also performs its verified
  reads — under the ledger contract's `LG-*` clauses; the Operation-vocabulary `MC-*` clauses
  bind its storage mechanism through the recorded ledger-primitive substitutions (identity echo
  becomes the qualified Transition identity or store-line key; the binding is bound to store
  line, expected position, and proposing generation instead of an Operation identity and fence;
  lookup becomes the strict positional readback and its five-way classification; compensation is
  none on an append-only store; reconnection is not applicable to stateless store calls) —
  equivalent validation in one differently located component, selected to avoid the circularity
  of mediating the act that records mediation's own authorizations; and
- conformance gating: a provider becomes configurable behind a port only after its port's
  conformance suite passes, and the pass is recorded evidence with suite version and subject
  digest, never trust by assertion.

The canonical clauses, binding kinds, credential and sandbox posture, and per-port duties are
recorded in the [mechanism and provider contracts page](../mechanism-and-provider-contracts.md);
the gating suites in the [architecture conformance catalog](../architecture-conformance.md).

## Rationale and benefits

- Realizes D3's validation posture concretely: a mechanism's output cannot widen its power, and
  every return is checked against identity, subject, fence, and capability (I7).
- Honest posture attestation makes weak enforcement visible and policy-addressable instead of
  silently assumed strong, preserving the configuration-cannot-weaken-policy pattern of I9.
- Idempotency, lookup, and compensation-as-new-Operations give reconciliation a uniform surface,
  so no-double-effect behavior (I17) does not depend on per-provider goodwill.
- Conformance gating turns "the provider works" into recorded, versioned evidence, keeping
  provider replacement safe and the trusted core small.

## Accepted negative consequence and trade-off

Per-Operation binding minting and return validation add overhead to every mechanism interaction.
The conformance suites become a maintained product with versioning and recorded evidence of their
own. Honest-weak postures may be uncomfortable to see recorded, but they are visible and
policy-gateable rather than silently claimed strong. These costs are accepted in exchange for a
checkable trust boundary and replaceable providers.

## Alternatives not selected

- **Trust-by-configuration** (a configured provider is simply trusted): rejected because it
  contradicts the I7/I20 validation posture and D3 — configuration would become an authority
  grant, and a compromised or faulty provider could promote its claims into lifecycle facts.
- **Mandatory hardware or TEE attestation for all mechanisms:** rejected as disproportionate for
  a single-host tool and unavailable for many providers; policy may still require a stronger
  attested posture where a mechanism supports one.

## Deliberate deferrals

Wire formats, credential token mechanics, and per-provider sandbox implementations remain
realization detail decided with the affected provider work; they cannot change the contract
clauses, binding scoping, or conformance gating selected here.
