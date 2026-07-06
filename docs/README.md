---
title: Jig — documentation
status: active index
---

# Jig — documentation

Jig owns its full artifact chain in this repo. Documentation is organized by **altitude**:
product owns intent and promises; design owns the engineering target for satisfying them. Historical
planning, delivery, and review records are preserved under `archive/` for provenance. The current
runtime binds owner configuration at launch from four artifacts where configured: plan, policy,
work profile, and repo-policy floors.

| Area                     | Owns                                                                                                                      | Status            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| [product/](./product/)   | **What and why** — audience, problem, promise, guarantees, boundaries. The contract design reconciles to.                 | target truth      |
| [design/](./design/)     | **How** — engineering reference: schemas, protocol mechanics, provider contracts, storage, gates, ADRs.                   | target truth      |
| [delivery/](./delivery/) | **In what order** — active delivery planning: phased tracks from the current implementation to the product/design target. | active planning   |
| [archive/](./archive/)   | Historical delivery sequencing, repo-local planning, and point-in-time reviews. Not active operating docs.                | historical record |

Suite-level framing (how Jig relates to the other products in the lifecycle) lives at the
[organization profile](https://github.com/agentic-workflow-kit), not here. This repo stays
scoped to **Jig the execution engine**.

Current implementation truth includes a private setup command that emits validated owner
configuration, plus a private real GitHub Forge/GitHub Issues path with blocked-PR surfacing,
held-merge replay safety, landing-path redaction, and origin-bearing candidate provenance —
the success-path real Forge `open-pr` smoke has been rerun on the current checkout, while
held-merge and commit-status/comment block-surfacing legs remain unit-proven with real-effect
evidence still owed;
phase-table PR-number status updates still live in delivery docs.

Preserve active design history in place:

- [design/decisions/](./design/decisions/) — living ADR index.
- [design/evidence/](./design/evidence/) — committed evidence records that inform ADRs and contract
  decisions.
