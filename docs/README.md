---
title: Jig — documentation
status: active index
---

# Jig — documentation

Jig owns its full artifact chain in this repo. Documentation is organized by **altitude**:
product owns intent and promises; the redesign's design layer owns the engineering target for
satisfying them. The pre-redesign design reference and historical planning, delivery, and review
records are preserved under `archive/` for provenance. The current runtime binds owner
configuration at launch from four artifacts where configured: plan, policy, work profile, and
repo-policy floors.

| Area                     | Owns                                                                                                                                                                                         | Status            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| [product/](./product/)   | **What and why** — audience, problem, promise, guarantees, boundaries. The contract design reconciles to.                                                                                    | target truth      |
| [redesign/](./redesign/) | **How** — the live design layer: the approved layered architecture (brief, model, views, invariants, decisions), its method, and immutable proposal and review inputs.                       | target truth      |
| [delivery/](./delivery/) | **In what order** — active delivery planning: phased tracks from the current implementation to the product/design target.                                                                    | active planning   |
| [archive/](./archive/)   | Historical record: the pre-redesign design reference ([archive/design/](./archive/design/)), delivery sequencing, repo-local planning, and point-in-time reviews. Not active operating docs. | historical record |

Suite-level framing (how Jig relates to the other products in the lifecycle) lives at the
[organization profile](https://github.com/agentic-workflow-kit), not here. This repo stays
scoped to **Jig the execution engine**.

Current implementation truth includes a private setup command that emits validated owner
configuration, plus a private real GitHub Forge/GitHub Issues path with blocked-PR surfacing,
held-merge replay safety, landing-path redaction, and origin-bearing candidate provenance —
the success-path real Forge `open-pr`, protected-branch held merge, commit-status/comment
block-surfacing, and resume idempotency smokes have been captured on the current checkout;
phase-table PR-number status updates still live in delivery docs.

The pre-redesign ADR log and evidence records remain citation targets from their archived home:

- [archive/design/decisions/](./archive/design/decisions/) — ADR index (archived 2026-07-16).
- [archive/design/evidence/](./archive/design/evidence/) — committed evidence records that inform
  ADRs and contract decisions (archived 2026-07-16).
