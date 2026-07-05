---
title: Jig — documentation
status: active index
---

# Jig — documentation

Jig owns its full artifact chain in this repo. Documentation is organized by **altitude**:
product owns intent and promises; design owns the engineering target for satisfying them. Historical
planning, delivery, and review records are preserved under `archive/` for provenance.

| Area                     | Owns                                                                                                                      | Status            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| [product/](./product/)   | **What and why** — audience, problem, promise, guarantees, boundaries. The contract design reconciles to.                 | target truth      |
| [design/](./design/)     | **How** — engineering reference: schemas, protocol mechanics, provider contracts, storage, gates, ADRs.                   | target truth      |
| [delivery/](./delivery/) | **In what order** — active delivery planning: phased tracks from the current implementation to the product/design target. | active planning   |
| [archive/](./archive/)   | Historical delivery sequencing, repo-local planning, and point-in-time reviews. Not active operating docs.                | historical record |

Suite-level framing (how Jig relates to the other products in the lifecycle) lives at the
[organization profile](https://github.com/agentic-workflow-kit), not here. This repo stays
scoped to **Jig the execution engine**.

Preserve active design history in place:

- [design/decisions/](./design/decisions/) — living ADR index.
- [design/evidence/](./design/evidence/) — committed evidence records that inform ADRs and contract
  decisions.
