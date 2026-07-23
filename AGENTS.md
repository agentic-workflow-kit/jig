# AGENTS.md — jig

This is the governing contract for work in this repository. Read the document that owns the
surface you touch before planning non-trivial work.

## Current repository posture

Jig's approved product and architecture are implementation-ready. The active repository has entered
GF-001 (private Node/TypeScript/pnpm/Turbo workspace substrate). It remains product-runtime-empty:
no product package, runtime package, provider, adapter, controller, storage implementation, lifecycle
behavior, port implementation, CLI, MCP surface, credential, or real external effect is authorized or
implemented. GF-002 and later stories remain unimplemented. The greenfield delivery track remains
authoritative, while archive material remains non-governing provenance.

The retired implementation generation and its delivery track are recoverable through the immutable
archive described in
[`docs/archive/generations/jig-v0-pre-greenfield-2026-07-18.md`](docs/archive/generations/jig-v0-pre-greenfield-2026-07-18.md).
They are non-governing provenance. Consult them only for an already-specified active story, never to
choose the new architecture or plan. Any reused material must independently conform to the current
design and retain provenance.

## Ground truth

| Task                                                                                           | Read                                                                                |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Intent, audience, guarantees, workflows, and boundaries                                        | `docs/product/`                                                                     |
| Approved architecture, authority, runtime, lifecycle, data, failure, and conformance contracts | `docs/redesign/design/`                                                             |
| Architecture method and maintenance rules                                                      | `docs/redesign/guidelines/` and `docs/redesign/AGENTS.md`                           |
| Final empty-repository readiness gate                                                          | `docs/archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md` |
| Active greenfield delivery track                                                               | `docs/delivery/greenfield/`                                                         |
| Retired-generation recovery and lookup policy                                                  | `docs/archive/generations/jig-v0-pre-greenfield-2026-07-18.md`                      |

Product owns what and why. The approved redesign owns how. Historical material under
`docs/archive/` and `docs/redesign/raw/` is provenance, not current implementation instruction.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm typecheck
pnpm boundaries:check
pnpm test
pnpm format
pnpm worktree:new <branch>
pnpm worktree:clean <branch>
```

`pnpm check` validates GF-001 repository structure, typecheck, package boundaries, infrastructure tests,
the archive recovery anchor, the greenfield delivery track, formatting, lint, and documentation links.

## Gate and conventions

- Keep product and approved redesign documents authoritative and navigable.
- Do not use archived implementation details to fill a design or planning gap.
- Implementation remains a separate owner-authorized phase and must start from the active delivery
  track, approved design, and readiness gate, not from the archive.
- Use external sibling worktrees under `worktrees/jig/<branch>` for non-trivial changes.
- Branch from `main`, open PRs into `main`, require the `check` workflow, resolve review
  conversations, and squash-merge.
- Use conventional commit subjects. Do not add attribution footers.
- Preserve secrets and credentials outside tracked files and logs.
- Keep changes focused; do not weaken checks to make a change pass.
