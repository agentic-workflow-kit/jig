# Jig

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status: implementation-ready / greenfield](https://img.shields.io/badge/status-implementation--ready%20%2F%20greenfield-2f855a.svg)](#status)

> Jig is the deterministic execution engine for approved software plans: it runs work under
> policy, records evidence, and stops in inspectable states when autonomy is not allowed.

## Status

The approved product and redesign documents passed the final empty-repository implementation-
readiness gate on 2026-07-18. The active repository intentionally contains no product source. Its
documentation-only [greenfield delivery track](docs/delivery/README.md) now records 47 stories,
seven phase gates, fixed inventories, and review contract needed for a later owner-authorized
implementation phase.

The retired implementation generation is preserved at
`archive/jig-v0-pre-greenfield-2026-07-18`, which resolves to commit
`1731251d866b15b63131a0c3c580e7b563226cf3`. Its recovery and story-scoped lookup rules are in the
[generation archive manifest](docs/archive/generations/jig-v0-pre-greenfield-2026-07-18.md). It is
historical reference only and does not govern the next implementation.

## Governing documents

| Area                                                                                                | Purpose                                                                                                  |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [Product](docs/product/README.md)                                                                   | Audience, promise, workflows, guarantees, and boundaries.                                                |
| [Approved redesign](docs/redesign/design/README.md)                                                 | Authorities, runtime units, ports, lifecycle, data, failure, operations, and conformance contracts.      |
| [Greenfield delivery track](docs/delivery/README.md)                                                | Documentation-only sequencing, story contracts, fixed inventories, and independent review expectations.  |
| [Readiness gate](docs/archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md) | Exact reviewed subject, review coverage, findings, delegated choices, checks, and archive authorization. |
| [Archive](docs/archive/README.md)                                                                   | Historical provenance and the retired-generation recovery manifest.                                      |

## Repository checks

Requires Node `>=22.13.0` and pnpm `>=11.9.0`.

```bash
pnpm install --frozen-lockfile
pnpm check
```

The check validates formatting, lint, documentation links, the empty-source active-tree posture,
the active delivery track, and the immutable archive recovery anchor. Run `pnpm delivery:check` for
the focused delivery validator and its mutation tests.

## Next implementation prerequisite

The next owner-authorized implementation session must use the active greenfield delivery track and:

1. start from current `main` after the archival PR is merged;
2. treat `docs/product/` and `docs/redesign/design/` as governing;
3. use the readiness gate's 44 commitment routes, R1–R7 obligations, and constrained-choice
   register as planning inputs; and
4. avoid the retired generation unless an already-specified active story needs a bounded lookup.

No implementation source or product package scaffolding is included in this transition. The active
track is a planning stop line: it does not authorize implementation until a story's merged
predecessors, exact evidence, delegated-choice gate, and independent review requirements are met.

## License

MIT License. See [LICENSE](LICENSE).
