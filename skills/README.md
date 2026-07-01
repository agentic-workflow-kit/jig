# Local skills

This directory holds Jig-local agent runbooks. They are composition guidance for working in this
repository; they are not shipped runtime APIs and do not imply a `jig` CLI surface exists.

## Available skills

- [`orchestrate-jig`](./orchestrate-jig/SKILL.md) — coordinates execution-shaped work from an
  approved Jig execution plan, policy, work profile, and repo floor while preserving Jig's current
  v0 plan and observability-record contracts.
