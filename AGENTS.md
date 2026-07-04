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

Altitude: `docs/product/` owns _what & why_; `docs/design/` owns _how_; `docs/delivery/` owns
_what ships when_ and governs current implementation work. Product is the contract design
reconciles to; where they conflict, name it rather than silently resolving.

| Task                                                    | Read                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| Intent, audience, the five guarantees, boundaries       | `docs/product/jig.md` (hub)                                 |
| Guarantees in ID detail / scenarios / concepts          | `docs/product/guarantees.md`, `use-cases.md`, `concepts.md` |
| How a promise is met (contracts, state tables, seams)   | `docs/design/` (live; start at its README and the ADR log)  |
| What ships in which phase; the brief for the next phase | `docs/delivery/` (the current track README and `phases.md`) |
| How the design work itself was sequenced                | `docs/planning/design-track/`                               |
| Point-in-time repo reviews and their findings           | `docs/reviews/`                                             |
| The engine source and its tests                         | `src/`, `tests/` (fixtures at `tests/fixtures/`)            |
| Local agent runbooks                                    | `skills/`                                                   |

## Status

M5b Phases 0–3 are delivered in the current track: a TypeScript walking skeleton with a real CLI —
`jig preview <plan>` validates and binds without allocating a run; `jig run <plan>` runs a plan
through a scripted-stub worker in **local dry-run only**, adjudicates declared worker requests
through the fixed local fence, and writes durable records (`run.json` + `events.jsonl` under
`runs/`); `jig inspect <run-dir>` renders them. Phase R closed the records vocabulary, identity,
evidence gate, and golden-record drift mapped in ADR 0017. Phase 3 added preview, the local
authorization triad, local Doorbell approve/reject, and the adjusted canonical triad golden.
The package is private tooling — it does not publish `@agentic-workflow-kit/jig` yet, and the
package decomposition remains design-owned.

## Commands

```bash
pnpm install --frozen-lockfile   # setup (or: pnpm dev:setup)
pnpm check                       # the full gate: lint, format:check, typecheck, delivery:check, test
pnpm build                       # tsc -b — emits dist/; required before running the CLI directly
node bin/jig.js run tests/fixtures/m5b-local-mvp/minimal-plan.json \
  --config tests/fixtures/m5b-local-mvp/local-config.json \
  --policy tests/fixtures/m5b-local-mvp/local-policy.json \
  --scripted-output tests/fixtures/m5b-local-mvp/scripted-worker-success.json
node bin/jig.js preview tests/fixtures/m5b-local-mvp/minimal-plan.json \
  --config tests/fixtures/m5b-local-mvp/local-config.json \
  --policy tests/fixtures/m5b-local-mvp/local-policy.json
node bin/jig.js inspect <runs/run-dir-from-output>
```

`pnpm test` builds first (`tsc -b`, incremental) and then runs vitest with enforced 90%
coverage thresholds, so it works standalone from a fresh checkout. Only invoking the CLI
directly requires an explicit `pnpm build` beforehand.

## Gate and conventions

- **`pnpm check`** before claiming any change done; show its output as evidence, don't assert
  success. It runs biome (code format+lint), prettier (Markdown/YAML), `tsc -b`, the delivery
  foundation check, and vitest with coverage thresholds enforced at 90% (aim 95%). Work is
  test-driven.
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
