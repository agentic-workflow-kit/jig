# Local skills

This directory holds Jig-local agent runbooks. They are composition guidance for working in this
repository; they are not shipped runtime APIs. The repo's actual CLI surface is currently
`jig preview`, `jig run`, and `jig inspect` for local dry-runs with governed per-request
authorization (see the repo README) — these runbooks cover the orchestration ground that surface
does not.

## Available skills

- [`orchestrate-jig`](./orchestrate-jig/SKILL.md) — coordinates execution-shaped work from an
  approved Jig execution plan, policy, work profile, and repo floor while preserving Jig's current
  v0 plan and observability-record contracts.
