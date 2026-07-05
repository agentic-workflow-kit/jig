---
title: "M5b local MVP fixture conventions"
status: draft
---

# M5b local MVP fixture conventions

This directory is the repo-local home for M5b local MVP fixtures used by the local dry-run
runner, CLI, records, and validator tests.

These fixtures are illustrative examples for local implementation work, not normative schemas.
They preserve the v0 contract posture from the execution-plan and observability-records contract
docs: exact field names, nesting, enum values, event names, validation language, storage encoding,
and file layout remain unfrozen until a contract owner approves schema freeze.

## Fixture Families

The current fixture set includes the original Phase 1 fixture names plus the later multi-item,
failure, invalid-plan, and golden-record examples needed by the shipped TypeScript harness:

| Name or family                          | Category                       | Purpose                                                                   |
| --------------------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| `minimal-plan.json`                     | local execution-plan fixture   | Smallest valid local plan shape used by the local runner.                 |
| `local-config.json`                     | local config fixture           | Local-only runner configuration input for the terminal workflow.          |
| `local-config-owner-configuration.json` | owner-config fixture           | Track-scoped config that resolves a work profile plus repo-policy floors. |
| `local-policy.json`                     | simple local policy fixture    | Minimal policy posture for allowed local dry-run work.                    |
| `local-work-profile.json`               | work-profile fixture           | Realization artifact example bound alongside policy at launch.            |
| `local-repo-policy-floors.json`         | repo-floor fixture             | Repo-scoped floor example merged into the effective policy basis.         |
| `scripted-worker-output.json`           | scripted-worker output fixture | Historical name for the scripted-worker result fixture family.            |
| `scripted-worker-*.json`                | scripted-worker output fixture | Success, failure, and multi-story scripted worker result examples.        |
| `multi-item-plan-*.json`                | execution-plan fixtures        | Multi-story success and dependency-blocking scenarios.                    |
| `invalid-plan.json`                     | invalid execution-plan fixture | CLI validation failure fixture.                                           |
| `golden-run-record-*.json`              | golden run-record fixtures     | Normalized records asserted by integration tests.                         |
| `local-run-record.json`                 | local run-record fixture       | Historical name for inspectable local run-record examples.                |

JSON remains the default fixture extension because the current repo gate formats JSON already. A
future implementation PR may add supporting `.log`, `.jsonl`, or directory-shaped fixtures when
runtime behavior needs them, but it should keep those examples clearly non-normative.

## Contract-Preservation Rule

Fixture files in this directory may show one useful local example, but they must not freeze the
execution-plan or observability-records v0 contracts.

Do not add TypeScript interfaces, JSON Schema, event constants, provider manifests, package exports,
or package decomposition here. If a fixture starts requiring one of those decisions, stop the
implementation change and route the decision to the owning design or contract surface instead.

## Test Placement

Fixture-backed tests live under `tests/` next to the smallest repo-approved test harness for the
behavior they prove. `corepack pnpm check` verifies this convention text through
`delivery:check`, validates runtime behavior through Vitest, and keeps the golden run-record
fixtures connected to executable assertions.
