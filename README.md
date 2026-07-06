# Jig

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status: source checkout / early tooling](https://img.shields.io/badge/status-source%20checkout%20%2F%20early%20tooling-f5a623.svg)](#status)

> Jig is the deterministic execution engine for approved software plans: it runs work under
> policy, records the evidence, and stops in inspectable states when autonomy is not allowed.

Jig is the delivery/execution stage of the `agentic-workflow-kit` suite. You give it an
execution plan, policy, and provider configuration; config can also bind a track work profile
plus repo-policy floors when the run needs owner-configuration control. Jig drives the work as
far as policy and evidence allow. Its hard input boundary is a valid execution plan. Its durable
output is a run record you can inspect, resume from, and audit.

## Status

Jig is early source-checkout tooling. The repo is a private pnpm workspace shell
`@agentic-workflow-kit/jig-repo` coordinating the private packages
`@agentic-workflow-kit/jig-sdk`, `@agentic-workflow-kit/jig-cli`, and
`@agentic-workflow-kit/jig-testkit`. There is still no published
`@agentic-workflow-kit/jig` package, public SDK/provider stability contract, or provider
ecosystem promise.

The current CLI surface is `jig setup`, `jig preview`, `jig run`, `jig inspect`, `jig resume`,
`jig watch`, `jig ask-why`, `jig notice-ack`, `jig notice-snooze`, `jig decide`, `jig stop`, and
`jig export`.
Launch binds the track policy plus any configured work profile and repo-policy floors, snapshots
them into the run record, and reconstructs the effective floor-merged policy basis on resume. The
fixture-backed commands below are the supported local way to exercise the repo from a fresh
checkout. The package split is now implementation fact inside this private workspace; Codex
app-server transport work remains future implementation, not a shipped public API, while the real
execution-host path now exercises a local macOS process-group probe and reports an honest `weak`
containment posture.

Current evidence proves a scoped real-provider path with a scripted agent leg
(`EVRUN-partial`). P11 also captured an EVRUN-full attempt: the narrow Codex app-server and
real-host smokes pass outside the Codex sandbox, but the combined real GitHub path could not run
without sandbox credentials and an integrity key. The current real GitHub Forge/GitHub Issues path
also carries blocked-PR surfacing, held-merge replay safety, landing-path redaction, and
per-candidate origin-bearing provenance. `EVRUN-full`, remote execution, public package
publication, and a full Codex-driven agent leg remain future work; strong/no-phone-home
execution-host evidence remains in that later proof step.

## Quick Start

Requires Node `>=22.13.0` and pnpm `>=11.9.0`.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

Create a track-local owner-configuration starting point:

```bash
node packages/jig-cli/bin/jig.js setup .jig/local-track \
  --track local-track \
  --template conservative-manual \
  --posture reference-scripted
```

Preview a plan without allocating a run:

```bash
node packages/jig-cli/bin/jig.js preview tests/fixtures/m5b-local-mvp/minimal-plan.json \
  --config tests/fixtures/m5b-local-mvp/local-config.json \
  --policy tests/fixtures/m5b-local-mvp/local-policy.json
```

Execute a local fixture-backed run:

```bash
node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json \
  --config tests/fixtures/m5b-local-mvp/local-config.json \
  --policy tests/fixtures/m5b-local-mvp/local-policy.json \
  --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-success.json
```

Or run with explicit owner-configuration artifacts resolved through config:

```bash
node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json \
  --config tests/fixtures/m5b-local-mvp/local-config-owner-configuration.json \
  --policy tests/fixtures/m5b-local-mvp/local-policy.json \
  --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-success.json
```

Inspect, watch, explain, or resume from the records the run produced:

```bash
node packages/jig-cli/bin/jig.js inspect runs/<run-directory-from-the-output>
node packages/jig-cli/bin/jig.js watch runs/<run-directory-from-the-output>
node packages/jig-cli/bin/jig.js ask-why runs/<run-directory-from-the-output> --story STORY-1
node packages/jig-cli/bin/jig.js notice-ack runs/<run-directory-from-the-output> unattended-park
node packages/jig-cli/bin/jig.js notice-snooze runs/<run-directory-from-the-output> unattended-park \
  --until 2026-07-03T12:00:00.000Z
node packages/jig-cli/bin/jig.js decide runs/<run-directory-from-the-output> --outcome approve
node packages/jig-cli/bin/jig.js stop runs/<run-directory-from-the-output> --reason owner-requested-pause
node packages/jig-cli/bin/jig.js export runs/<run-directory-from-the-output>
node packages/jig-cli/bin/jig.js resume runs/<run-directory-from-the-output> \
  --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-success.json
```

`jig run` validates the plan at the intake boundary, binds config and policy together with any
configured work profile and repo-policy floors, adjudicates worker requests through the local
authorization fence, executes eligible stories, and writes `run.json` plus append-only
`events.jsonl`. `jig inspect`, `jig watch`, `jig ask-why`, `jig resume`, and `jig export` read
those records rather than trusting terminal scrollback; notice acknowledge/snooze, out-of-band
decisions, and operator stops append owner/operator events to the same record. Export writes a
local write-once audit artifact plus an export-audit sidecar, not a remote upload.

## What Jig Promises

The product promise is captured in [`docs/product/jig.md`](docs/product/jig.md) and the
ID-bearing guarantee detail in [`docs/product/guarantees.md`](docs/product/guarantees.md):

1. **Control and trust** - workers only do what policy authorizes, earn autonomy by proof,
   and never ship on their own assertion.
2. **Configuration ownership** - policy expresses risk and safety; work profiles express how
   work gets done; neither can silently weaken the safety floor.
3. **Resilience** - progress survives interruption, resume is explicit, and one blocked story
   does not sink independent work.
4. **Stack portability** - agents, execution hosts, forges, and work sources sit behind
   replaceable seams.
5. **Full observability** - governed decisions and outcomes are captured in durable records.

## Documentation

| Doc                                                                | What it covers                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [docs/product/README.md](docs/product/README.md)                   | Product front door: audience, promise, guarantees, scenarios, concepts, and boundaries.     |
| [docs/product/jig.md](docs/product/jig.md)                         | Product hub: the core job, workflow, and what Jig is not yet.                               |
| [docs/product/guarantees.md](docs/product/guarantees.md)           | The five guarantees in ID-bearing detail.                                                   |
| [docs/design/README.md](docs/design/README.md)                     | Engineering design front door: contracts, core, providers, ADRs, and evidence records.      |
| [docs/design/contracts/README.md](docs/design/contracts/README.md) | Boundary map for driving, data, and provider contracts.                                     |
| [docs/design/decisions/README.md](docs/design/decisions/README.md) | Living ADR index. ADRs are preserved as active design history.                              |
| [docs/design/evidence/README.md](docs/design/evidence/README.md)   | Committed evidence records that inform ADRs and contract decisions.                         |
| [docs/delivery/README.md](docs/delivery/README.md)                 | Active delivery planning: the phased track from current state to the product/design target. |
| [docs/archive/README.md](docs/archive/README.md)                   | Historical delivery, planning, and review records. Not active implementation instructions.  |
| [skills/](skills/)                                                 | Local agent runbooks; composition guidance, not runtime or CLI surfaces.                    |

## Relationship To The Suite

`jig` lives in the [`agentic-workflow-kit`](https://github.com/agentic-workflow-kit) family of
standalone, composable products for an agentic software-development lifecycle. Jig runs where
planning ends. Upstream tools can help produce Jig's input, but Jig's required boundary is a
valid execution plan.

```text
PRODUCT --------> DESIGN ----------> PLANNING --------> DELIVERY -------> LEARNING
define / PRD     technical-design   design-to-plan     jig (run)         planned loop
```

## Development

`pnpm check` is the required local and CI gate. It runs Biome, Prettier, strict TypeScript,
workspace boundary enforcement, the delivery-foundation fixture check, and Vitest with coverage
thresholds enforced at 90%. Read [AGENTS.md](AGENTS.md) before non-trivial work in this repo.

## Contributing

Focused docs fixes, bug reports, and narrow patches are welcome. Product or API proposals
should start as an issue so the package/API boundary can be discussed before implementation.
See the org-wide
[contribution guidelines](https://github.com/agentic-workflow-kit/.github/blob/main/CONTRIBUTING.md).

## License

MIT License. See [LICENSE](LICENSE).
