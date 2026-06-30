# jig

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status: early / planned](https://img.shields.io/badge/status-early%20%2F%20planned-f5a623.svg)](#status)

> The productized face of the agentic-workflow-kit suite: a cohesive product surface for the main
> package, supporting products, and learning loop.

`jig` is planned as the approachable entry point for the broader agentic software-development
lifecycle. It will package the product experience around the suite: what to run, what artifacts to
expect, how the layers compose, and how learning from previous runs improves future work.

## Status

> 🚧 Early / planned. Real product content will arrive by porting in the product layer. This repository
> is intentionally scaffolded first so the public project shape, license, and contribution surfaces are
> ready before implementation begins.

## What It Will Become

`jig` is the product layer that makes the suite feel coherent rather than like a pile of independent
skills. It is expected to connect:

- product intent and PRD authoring;
- technical design through [`technical-design`](https://github.com/agentic-workflow-kit/technical-design);
- delivery planning and orchestrated implementation;
- a learning loop that turns run outcomes into better future guidance.

## Why It Exists

Agentic development workflows are most useful when they are explicit about stage, ownership, and
artifact boundaries. `jig` is where those pieces become a product: a guided surface that can help a
team move from intent to design to delivery without blurring the stages together.

## Relationship to the Org

`jig` lives inside [`agentic-workflow-kit`](https://github.com/agentic-workflow-kit), a polyrepo
ecosystem of standalone layers. Each repo should be useful on its own, while still composing into the
larger lifecycle.

```text
PRODUCT ---------> DESIGN ----------> DELIVERY --------> LEARNING
jig               technical-design   planned layer      planned loop
```

## Contributing

This repository is early. Small docs fixes and focused issue reports are welcome, but substantial
product or API proposals should start as an issue before a pull request.

## License

MIT License. See [LICENSE](LICENSE).
