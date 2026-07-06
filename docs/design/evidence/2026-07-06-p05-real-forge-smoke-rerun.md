---
title: "2026-07-06 - P05 real Forge smoke rerun"
status: applied - coordinator privileged run 2026-07-06
date: 2026-07-06
---

# 2026-07-06 - P05 Real Forge Smoke Rerun

## Probe

This reruns the EVRUN-partial real-provider smoke against the disposable sandbox repository
`agentic-workflow-kit/jig-smoke-target` from the current post-PR #77 Jig checkout. The smoke
exercises the real GitHub Issues work-source, real GitHub Forge `open-pr` landing path, Jig run
records, and HMAC integrity sidecar with a scripted agent leg.

The coordinator supplied the GitHub token and a fresh integrity key only in the command
environment. The emitted evidence facts are the bounded, non-secret JSON written by
`packages/jig-sdk/tests/smoke/evrun-partial.smoke.test.ts` via `EVRUN_EVIDENCE_OUT`; local
`run.json` and `integrity.json` captures stayed under ignored temp directories and are cited by
content hash.

## Tool Version Pins

| Tool              | Version                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| Node.js           | `v26.4.0`                                                              |
| pnpm              | `11.9.0`                                                               |
| GitHub CLI (`gh`) | `2.87.2 (2026-02-20)`                                                  |
| Git               | `2.53.0`                                                               |
| Jig checkout      | `a78f67caad3c5826cfd02e59a16447c72467256f` (`main` after PR #77 merge) |

## Inputs

- Smoke repository: `agentic-workflow-kit/jig-smoke-target`
- Seed issue: `https://github.com/agentic-workflow-kit/jig-smoke-target/issues/1`
- Seed issue label: `jig-candidate`
- Changed file in the sandbox target: `evrun-partial-smoke.txt`
- Landing action: `open-pr`
- Opt-in command shape:

```bash
EVRUN_SMOKE=1 \
JIG_GITHUB_ISSUES_REPOSITORY=agentic-workflow-kit/jig-smoke-target \
JIG_GITHUB_ISSUES_LABEL=jig-candidate \
EVRUN_EVIDENCE_OUT=/private/tmp/jig-p05-real-forge-smoke-evidence.json \
corepack pnpm exec vitest run packages/jig-sdk/tests/smoke/evrun-partial.smoke.test.ts
```

Credential-bearing variables (`GITHUB_TOKEN`, `GH_TOKEN`, `JIG_RECORDS_INTEGRITY_KEY`) were
present only in the coordinator command environment and are intentionally omitted.

## Run Summary

| Field                     | Value                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Run ID                    | `run-evrun-partial-smoke-1783347978055-d5849612-3836-4fff-82ec-b6ef2cc77d18`               |
| Pull request URL          | `https://github.com/agentic-workflow-kit/jig-smoke-target/pull/12` (closed during cleanup) |
| Landing families observed | `runner-action.opened-pr`                                                                  |
| Final status              | `success`                                                                                  |
| Integrity verification    | `verified`                                                                                 |
| Test result               | `1` smoke test passed                                                                      |

## Content Hashes

| Artifact         | SHA-256                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `run.json`       | `4534c0e328bd875001c1584b318a9d7f3f4964d4fc8b0fd5f585b8c3c0aefa47` |
| `integrity.json` | `857069eb8ec7f7cd63cd252d7b45fd585f7d10bf72b8735ada3ec493d6ff1740` |

## Cleanup

The smoke-created sandbox pull request was closed after capture and its branch was deleted:
`https://github.com/agentic-workflow-kit/jig-smoke-target/pull/12`.

## Redaction

No tokens or credentials appear in this record. The sandbox repository name is intentionally
cited. The smoke asserts the serialized run artifacts and emitted evidence facts do not include
the GitHub token, `x-access-token`, the askpass path, or credential-bearing URLs. The integrity
key was supplied only as a coordinator environment variable; the integrity sidecar carries the
HMAC digest and the non-secret key id supplied for the run, not the raw key.

## Supported IDs

- Refreshes P05 real Forge/work-source success-path evidence on the current post-PR #77
  checkout.
- Supports that a real GitHub Issues candidate can reach scheduling, a real GitHub Forge
  `open-pr` landing effect can occur, and Jig records plus verifies the integrity sidecar.
- Supports the status-doc distinction that this path is real-effect evidence, not merely unit
  coverage.

## Limitations

This remains an EVRUN-partial-style smoke with a scripted agent leg. It does not prove
EVRUN-full, real Codex editing, real execution-host confinement, adversarial no-phone-home
behavior, branch-protection or merge-queue hold posture, commit-status/comment block surfacing,
or repeated landing idempotency against the live adapter. `MERGE-5` and held-merge real-effect
proof therefore remain open.
