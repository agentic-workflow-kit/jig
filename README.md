# jig

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status: early / walking skeleton](https://img.shields.io/badge/status-early%20%2F%20walking%20skeleton-f5a623.svg)](#status)

> The deterministic execution engine of the agentic-workflow-kit suite: give it an approved
> plan and a policy, and it turns that plan into reviewed, landed work — or a deliberate,
> inspectable stop.

`jig` is the tool you run (`jig`, shipping eventually as `@agentic-workflow-kit/jig` — not yet
published). You hand it an **execution plan** and a **policy**; it delivers the work as far as
the policy allows, pulls you in for the decisions only you should make, and lands changes
**only on evidence** — never on the agent's say-so. When work shouldn't continue, it stops in
a named, recoverable state.

It exists because long-running agentic delivery breaks at the seams — control, trust,
recovery, and integration. Jig keeps the parts only a human should own (direction, policy,
risky calls) and delegates the rest under guarantees you can inspect.

## Status

Early, and now runnable: M5b Phases 0–3 delivered a TypeScript walking skeleton with governed
local dry-runs. The product layer, the engineering design layer (contracts, state tables,
ADRs), and a delivery track are all live in this repo. The CLI can preview a plan without
allocating records, then execute plans in **local dry-run only** against a scripted-stub worker
with per-request authorization records. Real workers, resume, replay inspect, and Forge/GitHub
landing arrive in later phases — the delivery track README is the honest map of what exists
versus what is planned. This repository is the canonical home for Jig.

## Usage (current surface)

```bash
pnpm build   # emits dist/, which the CLI shim runs

# Preview a plan without allocating a run:
node bin/jig.js preview tests/fixtures/m5b-local-mvp/minimal-plan.json \
  --config tests/fixtures/m5b-local-mvp/local-config.json \
  --policy tests/fixtures/m5b-local-mvp/local-policy.json

# Execute a plan (local dry-run; scripted worker):
node bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json \
  --config tests/fixtures/m5b-local-mvp/local-config.json \
  --policy tests/fixtures/m5b-local-mvp/local-policy.json \
  --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-success.json

# Inspect the durable records the run produced:
node bin/jig.js inspect runs/<run-directory-from-the-output>
```

`jig run` validates the plan's minimal v0 shape at the plan-intake boundary (version, ids,
story structure, dependencies — not yet the full execution-plan-contract surface), applies the
local dry-run policy floor, adjudicates scripted-worker requests through the fixed local fence,
executes stories in dependency order, and writes `run.json` plus an append-only `events.jsonl`.
`jig inspect` renders a run's outcome, per-item results, diagnostics, and denial reasons from
those records.

## Development

```bash
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` is the required local and CI gate: biome (code format + lint), prettier
(Markdown/YAML), `tsc -b` (strict TypeScript; emits `dist/`), the delivery-foundation check,
and vitest with coverage thresholds enforced at 90%. The CI workflow exposes a job named
`check` for pull requests and pushes to `main`.

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

| Doc                                                      | What it covers                                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [docs/product/jig.md](docs/product/jig.md)               | **Product hub** — audience, job, promise, workflow, guarantee summary, boundaries. Start here. |
| [docs/product/guarantees.md](docs/product/guarantees.md) | The five guarantees in full, ID-bearing detail.                                                |
| [docs/product/use-cases.md](docs/product/use-cases.md)   | Worked scenarios that make each guarantee concrete.                                            |
| [docs/product/concepts.md](docs/product/concepts.md)     | Product concepts — starting with **tracks**.                                                   |
| [docs/design/](docs/design/)                             | Engineering design — the two v0 contracts, state tables, and the ADR log. Live.                |
| [docs/delivery/](docs/delivery/)                         | The delivery track: phase ladder, acceptance criteria, implementation briefs.                  |
| [docs/planning/](docs/planning/)                         | How the design authoring work was sequenced and traced.                                        |
| [docs/reviews/](docs/reviews/)                           | Point-in-time repository reviews and their findings.                                           |
| [skills/](skills/)                                       | Local agent runbooks. These are composition guidance, not runtime or CLI surfaces.             |

## Relationship to the suite

`jig` lives inside [`agentic-workflow-kit`](https://github.com/agentic-workflow-kit), a
polyrepo family of standalone, composable products spanning an agentic software-development
lifecycle. **Jig is the delivery/execution stage** — it runs where planning ends. The upstream
products (product definition, technical design, planning) are **peers** that produce Jig's
input; they're strong defaults, not prerequisites. Jig's one hard input boundary is a valid
execution plan.

```text
PRODUCT --------> DESIGN ----------> PLANNING --------> DELIVERY -------> LEARNING
define / PRD     technical-design   design-to-plan     jig (run)         planned loop
```

## Contributing

This repository is early. Small docs fixes and focused issue reports are welcome, but
substantial product or API proposals should start as an issue before a pull request. See the
org-wide [contribution guidelines](https://github.com/agentic-workflow-kit/.github/blob/main/CONTRIBUTING.md).

## License

MIT License. See [LICENSE](LICENSE).
