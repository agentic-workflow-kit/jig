---
title: "M5b local MVP fixture conventions"
status: draft
---

# M5b local MVP fixture conventions

This directory is the first repo-local home for M5b local MVP fixtures. Phase 1 should add
fixture files here before runtime behavior depends on them.

These fixtures are illustrative examples for local implementation work, not normative schemas.
They preserve the v0 contract posture from the execution-plan and observability-records contract
docs: exact field names, nesting, enum values, event names, validation language, storage encoding,
and file layout remain unfrozen until a contract owner approves schema freeze.

## Intended Fixture Names

Use these names for the first Phase 1 fixture set unless the Phase 1 PR records a narrower reason
to adjust them:

| Name                          | Category                       | Purpose                                                                |
| ----------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| `minimal-plan.json`           | local execution-plan fixture   | Smallest valid local plan shape needed by the Phase 1 local runner.    |
| `local-config.json`           | local config fixture           | Local-only runner configuration input for the first terminal workflow. |
| `local-policy.json`           | simple local policy fixture    | Minimal policy posture for allowed local dry-run work.                 |
| `scripted-worker-output.json` | scripted-worker output fixture | Captured stub-worker result data for success and later failure cases.  |
| `local-run-record.json`       | local run-record fixture       | Example inspectable run record produced by the local runner path.      |

JSON is the default starting extension because the current repo gate formats JSON already. A future
implementation PR may add supporting `.log`, `.jsonl`, or directory-shaped fixtures when runtime
behavior needs them, but it should keep those examples clearly non-normative.

## Contract-Preservation Rule

Fixture files in this directory may show one useful local example, but they must not freeze the
execution-plan or observability-records v0 contracts.

Do not add TypeScript interfaces, JSON Schema, event constants, provider manifests, package exports,
or package decomposition here. If a fixture starts requiring one of those decisions, stop the
implementation change and route the decision to the owning design or contract surface instead.

## Phase 1 Test Placement

When Phase 1 introduces runtime code, put fixture-backed tests next to the smallest repo-approved
test harness available at that time. Until a test framework is chosen, `corepack pnpm check` only
verifies this convention and repository formatting; it does not validate fixture schema semantics
or runtime behavior.
