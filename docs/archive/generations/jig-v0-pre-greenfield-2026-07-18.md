---
title: Jig v0 pre-greenfield generation archive
status: immutable historical reference
archived: 2026-07-18
---

# Jig v0 pre-greenfield generation archive

## Archive identity

| Field                       | Value                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| Generation                  | Jig v0 / pre-greenfield implementation                                                               |
| Immutable Git ref           | `archive/jig-v0-pre-greenfield-2026-07-18`                                                           |
| Annotated tag object        | `1834c58c1485d2be13e32f6e437a2625e6043042`                                                           |
| Peeled commit               | `1731251d866b15b63131a0c3c580e7b563226cf3`                                                           |
| Commit tree                 | `dcd0c1f8a5616283cafbcf54694fcd37dd4888c1`                                                           |
| Archive date                | 2026-07-18                                                                                           |
| Prior active delivery track | `docs/delivery/target-state-implementation/` — in progress; P01–P12 merged, P13 blocked, P14 planned |

The ref was pushed before any active-tree removal. A remote `ls-remote` resolved the annotated tag
and its peeled commit to the values above. Representative source, test, fixture, delivery, and
runbook paths were then resolved successfully through the tag.

## What the archive contains

The tag is the complete repository snapshot immediately before the greenfield transition. The
generation-specific material removed from the active tree includes:

- the private `jig-sdk`, `jig-cli`, `jig-mcp`, and `jig-testkit` packages;
- package unit, integration, conformance, and smoke tests;
- repository hermetic tests and `m5b-local-mvp` fixtures/golden records;
- the active `target-state-implementation` delivery track and its P01–P14 phase records;
- the `orchestrate-jig` local runbook and N1A transport probe;
- implementation-only TypeScript, Vitest, package-boundary, and delivery-foundation configuration;
  and
- the pre-transition workspace/index/status surfaces that presented that generation as active.

Ignored local build outputs, coverage, dependency directories, and run directories were never
tracked by the archived commit. They are reproducible or local runtime artifacts, not part of the
durable Git archive.

## Why it was archived

The approved product and redesign corpus passed the final empty-repository implementation-readiness
gate. The existing generation and delivery track were based on superseded implementation
boundaries, so leaving them active would bias the required greenfield plan. The archive preserves
recovery and provenance without duplicating the old source inside the active repository.

This archive is non-governing reference only. `docs/product/` and `docs/redesign/design/` govern the
next implementation.

## Inspection and recovery

Inspect one file without checking out the archived generation:

```bash
git show archive/jig-v0-pre-greenfield-2026-07-18:packages/jig-sdk/src/sdk.ts
git show archive/jig-v0-pre-greenfield-2026-07-18:docs/delivery/target-state-implementation/README.md
```

List the archived tree:

```bash
git ls-tree -r --name-only archive/jig-v0-pre-greenfield-2026-07-18
```

Create a detached inspection worktree without changing active design state:

```bash
git worktree add --detach ../jig-v0-archive archive/jig-v0-pre-greenfield-2026-07-18
```

If full recovery is ever explicitly authorized, create a separate recovery branch:

```bash
git switch -c recovery/jig-v0 archive/jig-v0-pre-greenfield-2026-07-18
```

## Lookup and reuse policy

- Do not consult this archive while selecting architecture, package boundaries, technology, or
  delivery sequencing for the greenfield implementation.
- Lookup is allowed only after an active story is already specified from the governing product and
  design contracts, and only for the bounded subject that story names.
- Reused material must independently pass current conformance and acceptance obligations; archive
  existence is not evidence of compliance.
- Record the source ref/path as provenance whenever archived material influences an active change.
- Never restore the archived delivery track as the new active track.
