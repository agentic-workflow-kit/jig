# AGENTS.md — jig

The contract for working in this repo. **Self-contained:** act on it with only this repo
checked out (including Claude or Codex cloud runs). Don't work from memory — read the doc here
that owns your subject, then plan before non-trivial work.

`jig` is the deterministic delivery engine of the agentic-workflow-kit suite: it takes an
approved **execution plan** plus a **policy** and turns it into reviewed, landed work — or a
deliberate, inspectable stop. It owns two contracts other tools build on: the **execution-plan
contract** (its one hard input boundary) and the **observability / event records** (its durable
output). Treat both as versioned seams — changing their shape is a breaking change for
downstream consumers.

## Ground truth — read what your task touches

Altitude: `docs/product/` owns _what & why_; `docs/design/` owns _how_. Product is the contract
design reconciles to; where they conflict, name it rather than silently resolving. Historical
delivery, planning, and review records live under `docs/archive/`; treat them as provenance, not
current implementation instructions.

| Task                                                  | Read                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Intent, audience, the five guarantees, boundaries     | `docs/product/jig.md` (hub)                                                    |
| Guarantees in ID detail / scenarios / concepts        | `docs/product/guarantees.md`, `use-cases.md`, `concepts.md`                    |
| How a promise is met (contracts, state tables, seams) | `docs/design/` (live; start at its README and the ADR log)                     |
| Active delivery phasing toward the target state       | `docs/delivery/` (start at its README)                                         |
| Historical delivery sequencing and phase ladders      | `docs/archive/delivery/`                                                       |
| Historical design-work sequencing                     | `docs/archive/planning/design-track/`                                          |
| Point-in-time repo reviews and their findings         | `docs/archive/reviews/`                                                        |
| The engine source and its tests                       | `packages/*/src`, `packages/*/tests`, `tests/` (fixtures at `tests/fixtures/`) |
| Local agent runbooks                                  | `skills/`                                                                      |

## Status

Jig is early source-checkout tooling. The CLI exposes `jig preview`, `jig run`, `jig inspect`, and
`jig resume`; fixture-backed local runs are the supported way to exercise the repo from a fresh
checkout. The repo is a private pnpm workspace shell (`@agentic-workflow-kit/jig-repo`,
`"private": true`) coordinating the private packages `@agentic-workflow-kit/jig-sdk`,
`@agentic-workflow-kit/jig-cli`, and `@agentic-workflow-kit/jig-testkit`. Nothing in the workspace
publishes `@agentic-workflow-kit/jig` or makes a public SDK/provider stability promise. EVRUN-partial
is recorded; EVRUN-full remains future work.

## Commands

```bash
pnpm install --frozen-lockfile   # setup (or: pnpm dev:setup)
pnpm check                       # the full gate: lint, format:check, typecheck, boundaries:check, delivery:check, test
pnpm build                       # tsc -b — emits dist/; required before running the CLI directly
node packages/jig-cli/bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json \
  --config tests/fixtures/m5b-local-mvp/local-config.json \
  --policy tests/fixtures/m5b-local-mvp/local-policy.json \
  --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-success.json
node packages/jig-cli/bin/jig.js preview tests/fixtures/m5b-local-mvp/minimal-plan.json \
  --config tests/fixtures/m5b-local-mvp/local-config.json \
  --policy tests/fixtures/m5b-local-mvp/local-policy.json
node packages/jig-cli/bin/jig.js inspect <runs/run-dir-from-output>
node packages/jig-cli/bin/jig.js resume <runs/run-dir-from-output> \
  --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-success.json
```

`pnpm test` builds first (`tsc -b`, incremental) and then runs vitest with enforced 90%
coverage thresholds, so it works standalone from a fresh checkout. Only invoking the CLI
directly requires an explicit `pnpm build` beforehand.

## Gate and conventions

- **`pnpm check`** before claiming any change done; show its output as evidence, don't assert
  success. It runs biome (code format+lint), prettier (Markdown/YAML), `tsc -b`, package-boundary
  enforcement, the delivery foundation check, and vitest with coverage thresholds enforced at 90%
  (aim 95%). Work is test-driven.
- **Gate integrity:** do not skip steps, adjust thresholds, or widen exclusion lists to make
  `pnpm check` green — fix the cause, or raise it instead of routing around it.
- **`main`-based:** branch from `main`, PR into it, green `check` required, review conversations
  resolved, squash-merge. Conventional commit subjects (`feat:`/`fix:`/`docs:`/…); no
  attribution footers. Worktrees for non-trivial work are external siblings of this checkout under
  `worktrees/jig/<branch>` — never nested inside it. Use `pnpm worktree:new <branch>` to create one
  and `pnpm worktree:clean <branch>` after merge.
- **No emojis** anywhere. **Immutability** — return new values, don't mutate inputs. Handle
  errors explicitly and validate external input at boundaries. Diagrams in Mermaid, inline — styled with a `%%{init}%%` theme block, colored `subgraph`
  regions, and `classDef` category colors (no committed image assets). No
  hardcoded secrets — credentials via environment only; redact secrets, tokens, and PII in logs;
  if you find an exposed secret, stop and rotate it.
