# Jig

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status: implementation-ready / greenfield](https://img.shields.io/badge/status-implementation--ready%20%2F%20greenfield-2f855a.svg)](#status)

> Jig is the deterministic execution engine for approved software plans: it runs work under
> policy, records evidence, and stops in inspectable states when autonomy is not allowed.

## Status

The approved product and redesign documents passed the final empty-repository implementation-
readiness gate on 2026-07-18. The active repository intentionally contains no product source and no
implementation delivery track. The replacement implementation must be planned greenfield in a
separate owner-authorized session.

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
| [Readiness gate](docs/archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md) | Exact reviewed subject, review coverage, findings, delegated choices, checks, and archive authorization. |
| [Archive](docs/archive/README.md)                                                                   | Historical provenance and the retired-generation recovery manifest.                                      |

## Repository checks

Requires Node `>=22.13.0` and pnpm `>=11.9.0`.

```bash
pnpm install --frozen-lockfile
pnpm check
```

The check validates formatting, lint, documentation links, the empty-source active-tree posture,
and the immutable archive recovery anchor.

## Next implementation prerequisite

The next session may create a greenfield implementation track only after it:

1. starts from current `main` after the archival PR is merged;
2. treats `docs/product/` and `docs/redesign/design/` as governing;
3. uses the readiness gate's 44 commitment routes, R1–R7 obligations, and constrained-choice
   register as planning inputs; and
4. avoids the retired generation unless an already-specified active story needs a bounded lookup.

No implementation source or replacement track is included in this transition.

## License

MIT License. See [LICENSE](LICENSE).
