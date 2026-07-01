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
design reconciles to; where they conflict, name it rather than silently resolving.

| Task                                                   | Read                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| Intent, audience, the five guarantees, boundaries      | `docs/product/jig.md` (hub)                                 |
| Guarantees in ID detail / scenarios / concepts         | `docs/product/guarantees.md`, `use-cases.md`, `concepts.md` |
| How a promise is met (schemas, protocol, seams, gates) | `docs/design/` — being authored next                        |

## Status

Early. Tooling-only package: it validates docs and metadata; it does not publish
`@agentic-workflow-kit/jig` and has no exports or CLI yet. The package decomposition is
design-owned and **intentionally empty** — do not invent packages before `docs/design/` defines
them. `docs/design/` is authored fresh here; the retiring `workflow-kit` prototype is a
reference for lessons only, never an authority.

## Gate and conventions

- **`pnpm check`** before claiming any change done; show its output as evidence, don't assert
  success. Today it runs prettier over Markdown/YAML/JSON; it grows as source lands. Once code
  exists, work is test-driven — 90% coverage minimum, aim 95%.
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
