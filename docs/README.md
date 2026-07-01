---
title: Jig — documentation
status: draft
---

# Jig — documentation

Jig owns its full artifact chain in this repo. Documentation is organized by **altitude**:
product (intent) above design (implementation), with planning and delivery sequencing below them.

| Layer                    | Owns                                                                                                      | Status  |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ------- |
| [product/](./product/)   | **What and why** — audience, problem, promise, guarantees, boundaries. The contract design reconciles to. | drafted |
| [design/](./design/)     | **How** — engineering reference: schemas, protocol mechanics, provider contracts, storage, gates.         | drafted |
| [planning/](./planning/) | **Work organization** — design-track waves, session scaffolds, traceability, and handoff structure.       | drafted |
| [delivery/](./delivery/) | **Delivery sequencing** — client-usable milestones, acceptance evidence, and stop conditions.             | drafted |

Suite-level framing (how Jig relates to the other products in the lifecycle) lives at the
[organization profile](https://github.com/agentic-workflow-kit), not here. This repo stays
scoped to **Jig the execution engine**.
