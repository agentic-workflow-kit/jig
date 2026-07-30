# Jig

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status: implementation-ready / greenfield](https://img.shields.io/badge/status-implementation--ready%20%2F%20greenfield-2f855a.svg)](#status)

> Jig is the deterministic execution engine for approved software plans: it runs work under
> policy, records evidence, and stops in inspectable states when autonomy is not allowed.

## Status

The approved product and redesign documents passed the final empty-repository implementation-
readiness gate on 2026-07-18. Phase 0 is merged and landed as four private, pure packages: the canonical
identity and boundary codec; the runtime topology and semantic port contracts; the private conformance
harness; and the pure authority kernel. That landing does not activate Phase 1 or establish acceptance or
release. No provider, adapter, storage
or ledger implementation, controller process, transport, CLI, MCP surface, credential, real external
effect, or public package is authorized or implemented. The [greenfield delivery track](docs/delivery/README.md)
remains authoritative and its active delivery-track stop line remains in force, while archive material
remains non-governing.

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

Requires Node `>=22` and pnpm `>=11.9.0`.

```bash
pnpm install --frozen-lockfile
pnpm check
```

The check is a single Turbo run: every workspace package builds, lints, and tests itself, and the
`tools/repo-guard` package runs the repository-level gates — structure, package boundaries, runtime
topology, delivery track, documentation links, and formatting. Use `pnpm check:affected` to restrict
the same graph to what the current branch changed — a local convenience whose selection is only as
complete as the comparison base, so `pnpm check` stays the gate — and `pnpm delivery:check` for the
focused delivery validator and its mutation tests.

## Next implementation prerequisite

The next owner-authorized implementation session must use the active greenfield delivery track and:

1. resolve the approved delivery package `P = Q + durable R identifier + PASS` and verify that package's
   landing on the target ref; when landing produced
   a different commit, verify the authoritative landing-equivalence record without treating the
   landed commit as the reviewed subject;
2. resolve the target ref's then-current commit/tree as the story execution base rather than
   treating immutable planning provenance as a rolling base;
3. independently verify the exact external owner-ratification/activation record binding `P`,
   planning/authority provenance, target scope, selected realization tuple, and expiry/revocation;
4. freeze the final-verification posture, policy-selected required check-class set, verification
   configuration/environment, and candidate binding for independent implementation review; after
   `Accepted`, `deterministic` requires a passing, subject-matching `EV-CHECK-OBSERVATION` for every
   required class and the complete set inside `Finalizing` before any target-changing Operation,
   while `none` is an explicit no-op. Those unchanged-binding observations are authorized
   continuation evidence, not a new review subject; drift requires a fresh tuple and review;
5. treat `docs/product/` and `docs/redesign/design/` as governing;
6. use the readiness gate's 44 commitment routes, R1–R7 obligations, and constrained-choice
   register as planning inputs; and
7. avoid the retired generation unless an already-specified active story needs a bounded lookup.

The four landed private packages establish only Phase 0; they do not activate a Phase 1 story or authorize
downstream implementation. The active track remains a planning stop line until a story's merged
predecessors, exact evidence, delegated-choice gate, external activation, and independent review
requirements are met.

## License

MIT License. See [LICENSE](LICENSE).
