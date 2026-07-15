---
title: "Concurrency and finalization — capacity, deterministic order, and target authority"
purpose: Define how Jig admits concurrent work deterministically, avoids resource deadlock and starvation, serializes target change, and derives dependency consequences.
audience:
  - Architecture, engineering, and operations reviewers
  - Arye Kogan, Jig product and architecture decision owner
scope: Resource-class capacity, the deterministic total order, and target-scoped finalization authority; resource manifests, reservation algorithms, queue structures, fairness metrics, exact bounds, provider-capacity mapping, and authority APIs are excluded.
state: proposed
status: proposed Layer 1 content, re-presented 2026-07-15 under the owner-directed view-based structure; pending independent review of the new candidate set
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ./brief.md
  - ./model.md
  - ./decisions/D6-concurrency-and-finalization.md
related:
  - ./flows/run-and-story-lifecycle.md
  - ./acceptance-and-evidence.md
  - ./state-and-recovery.md
  - ./failure-and-liveness.md
---

# Concurrency and finalization — capacity, deterministic order, and target authority

## Resource-class capacity and progress

Capacity is modeled by actual scarce resource class, not an active-Story count alone. Relevant
classes may include isolation resources, retained session identities, active implementer or reviewer
turns, verification execution, delivery Operations, provider-specific execution capacity, and the
single target finalization authority. This list names high-level capacity classes, not concrete
provider pools or a resource schema.

Frozen policy defines allowed maxima and required progress reserve. Configuration declares hard
available capacity. An optional maximum resolves to the lower supported value. Preflight rejects a
Run when a mandatory class is unavailable, an explicit policy minimum is unsupported, or the
combination cannot preserve a path for admitted work to reach its next mandatory safe point.

When capacity is constrained, Jig advances or retires admitted work before admitting new Stories. A
maximum active-Story ceiling may supplement this posture but cannot replace the resource-class model.

## Deterministic total order

Every Story has three immutable, preflight-validated ordering facts:

1. approved plan priority;
2. immutable plan ordinal; and
3. unique Story identity.

The tuple is the total comparator for otherwise-equal admission, finalization, and blocker
attribution decisions. An admitted Story or current finalization authority holder is not preempted
by a later higher-priority Story.

## Target-scoped finalization authority

- Exactly one Story owns finalization authority for the configured target.
- Accepted Stories wait in deterministic order without authority and do not repeatedly refresh or
  mutate the target.
- The authority fence binds Story, controller generation, Candidate, target basis, and authority
  generation.
- A bounded target refresh may retain Story ownership; Candidate-changing refresh requires renewed
  full review and atomic authority rebinding.
- Ordinary implementation rework releases authority and returns through acceptance.
- Landing, reconciled block, explicit stop, or Recovery-driven transfer releases authority.
- Recovery reconstructs and reconciles authority and target state before resuming or reassigning.

Only confirmed landing releases dependencies. Direct blockers remain durable facts. A Story blocked
by multiple paths reports the complete, canonically ordered set of reachable direct blocker roots.

## Where to go next

- How these rules appear in the authority-and-proof chain: the
  [V4 relationship view](./state-and-recovery.md#view-v4--state-recovery-acceptance-concurrency-and-finalization).
- The bounded-progress and exhaustion rules that keep waits finite:
  [failure containment, bounded progress, and liveness](./failure-and-liveness.md).
- Why this concurrency posture was selected, with rejected alternatives:
  [D6 — concurrency and finalization](./decisions/D6-concurrency-and-finalization.md).
