# jig

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status: early / planned](https://img.shields.io/badge/status-early%20%2F%20planned-f5a623.svg)](#status)

> The deterministic execution engine of the agentic-workflow-kit suite: give it an approved
> plan and a policy, and it turns that plan into reviewed, landed work — or a deliberate,
> inspectable stop.

`jig` is the tool you run (`jig`, the package `@agentic-workflow-kit/jig`). You hand it an
**execution plan** and a **policy**; it delivers the work as far as the policy allows, pulls
you in for the decisions only you should make, and lands changes **only on evidence** — never
on the agent's say-so. When work shouldn't continue, it stops in a named, recoverable state.

It exists because long-running agentic delivery breaks at the seams — control, trust,
recovery, and integration. Jig keeps the parts only a human should own (direction, policy,
risky calls) and delegates the rest under guarantees you can inspect.

## Status

> 🚧 Early. The **product layer is drafted** (see [`docs/product/`](docs/product/)); the
> engineering design and implementation are being built **fresh in this repo** next. This
> repository is the canonical home for Jig going forward.

## What Jig promises

Five guarantees, in plain terms — the full contract is in
[`docs/product/jig.md`](docs/product/jig.md):

1. **Control & trust** — the worker only does what you authorized, earns autonomy by proof,
   can't weaken its own guardrails, and never ships on its own assertion.
2. **You own the configuration** — policy expresses risk and safety; the work profile
   expresses how work gets done; both are per-track and legible.
3. **Never lose work; resume safely** — progress survives interruption, irreversible actions
   aren't repeated, and one blocked story doesn't sink independent work.
4. **Runs against your stack** — agents, execution hosts, forges, and work sources sit behind
   swappable seams; weak drivers reduce autonomy rather than weakening guarantees.
5. **See everything** — every governed decision and outcome is captured in durable, structured
   records you and your tools can inspect.

## Documentation

| Doc | What it covers |
|---|---|
| [docs/product/jig.md](docs/product/jig.md) | **Product hub** — audience, job, promise, workflow, guarantee summary, boundaries. Start here. |
| [docs/product/guarantees.md](docs/product/guarantees.md) | The five guarantees in full, ID-bearing detail. |
| [docs/product/use-cases.md](docs/product/use-cases.md) | Worked scenarios that make each guarantee concrete. |
| [docs/product/concepts.md](docs/product/concepts.md) | Product concepts — starting with **tracks**. |
| [docs/design/](docs/design/) | Engineering design — *how* the promises are met. _(Next step.)_ |

## Relationship to the suite

`jig` lives inside [`agentic-workflow-kit`](https://github.com/agentic-workflow-kit), a
polyrepo family of standalone, composable products spanning an agentic software-development
lifecycle. **Jig is the delivery/execution stage** — it runs where planning ends. The upstream
products (product definition, technical design, planning) are **peers** that produce Jig's
input; they're strong defaults, not prerequisites. Jig's one hard input boundary is a valid
execution plan.

```text
PRODUCT ---------> DESIGN ----------> DELIVERY --------> LEARNING
define / PRD      technical-design   jig (run)          planned loop
```

## Contributing

This repository is early. Small docs fixes and focused issue reports are welcome, but
substantial product or API proposals should start as an issue before a pull request. See the
org-wide [contribution guidelines](https://github.com/agentic-workflow-kit/.github/blob/main/CONTRIBUTING.md).

## License

MIT License. See [LICENSE](LICENSE).
