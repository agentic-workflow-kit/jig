---
title: "2026-07-06 - P05 held-merge and block-surfacing smoke"
status: applied - coordinator privileged run 2026-07-06
date: 2026-07-06
---

# 2026-07-06 - P05 Held-Merge and Block-Surfacing Smoke

## Probe

This record captures a real GitHub Forge held-merge and blocked-story surfacing run against the
disposable sandbox repository `agentic-workflow-kit/jig-smoke-target`. The sandbox `main` branch
was made public and protected before the run: one approving review is required, admins are
enforced, and no required status checks are configured. That posture is intentionally left in
place as the future fixture state.

The smoke used the opt-in scenario in
`packages/jig-sdk/tests/smoke/evrun-held-merge-resume.smoke.test.ts`. It first opened a sandbox PR
for a temporary branch, then attempted a real `merge` landing. GitHub refused the squash merge
because branch protection required review, and Jig recorded the landing as `done-not-landed` with
`mergeability: held-by-review`. The same run then exercised the real block-surfacing path and
verified that the PR, failed commit status, and PR comment were readable through GitHub.

## Tool Version Pins

| Tool              | Version                                    |
| ----------------- | ------------------------------------------ |
| Node.js           | `v26.4.0`                                  |
| pnpm              | `11.9.0`                                   |
| GitHub CLI (`gh`) | `2.87.2 (2026-02-20)`                      |
| Git               | `2.53.0`                                   |
| Host              | `Darwin 25.5.0 RELEASE_ARM64_T6000 arm64`  |
| Jig base checkout | `38c08da22563db6b06eb17315b9a46d81554f147` |
| Git transport     | HTTPS with token-backed environment config |

## Invocation

The operator supplied GitHub credentials and the records-integrity key via environment variables.
Secret values were not printed.

```bash
GITHUB_TOKEN="$(gh auth token)" \
EVRUN_HELD_MERGE_SMOKE=1 \
EVRUN_REAL_EFFECT_KEEP_ARTIFACTS=1 \
JIG_GITHUB_ISSUES_REPOSITORY=agentic-workflow-kit/jig-smoke-target \
JIG_GITHUB_ISSUES_LABEL=jig-candidate \
JIG_RECORDS_INTEGRITY_KEY="<operator-provided one-off key>" \
JIG_RECORDS_INTEGRITY_KEY_ID="held-merge-smoke" \
EVRUN_HELD_MERGE_EVIDENCE_OUT=/private/tmp/jig-held-merge-smoke-evidence.json \
corepack pnpm exec vitest run packages/jig-sdk/tests/smoke/evrun-held-merge-resume.smoke.test.ts
```

Result:

```text
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
Duration    10.59s
```

## Result Summary

| Field                     | Value                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Run ID                    | `run-p05-held-merge-smoke-1783358861177-61e9c545-37c3-4751-b058-bd58f594f7de`          |
| Run status                | `failure` (expected blocked-story tail after held merge)                               |
| Sandbox PR                | `https://github.com/agentic-workflow-kit/jig-smoke-target/pull/20`                     |
| Held story                | `HELD-MERGE`                                                                           |
| Held outcome              | `done-not-landed`                                                                      |
| Mergeability              | `held-by-review`                                                                       |
| Branch protection         | `enforceAdmins: true`, `requiredApprovingReviewCount: 1`, `requiredStatusChecks: null` |
| Block-surfacing story     | `BLOCK-SURFACE`                                                                        |
| Commit status observed    | `jig/block` / `failure`                                                                |
| PR block comment observed | `true`                                                                                 |
| Integrity status          | `verified`                                                                             |
| `run.json` hash           | `1b37e102440f23f4bd63a0bd9eae2fcaa3d64ce603adc8cc61e056aa7463b0b8`                     |
| `integrity` hash          | `b56ef34a5b309363324d5dbcef0a06ad969b085c8d7e5baa0d65a4f7b3e043c0`                     |

## Observed Live Classifier Fix

The first live attempts exposed two GitHub refusal strings that were not classified correctly by
the previous adapter:

- `the base branch policy prohibits the merge`
- `At least 1 approving review is required by reviewers with write access`

This PR pins both messages in `packages/jig-sdk/tests/providers.real-forge.p7.unit.test.ts` and
classifies them as `held-by-review`.

## Cleanup

The successful smoke-created sandbox pull request was closed after capture and its branch was
deleted: `https://github.com/agentic-workflow-kit/jig-smoke-target/pull/20`. Diagnostic sandbox
PRs from failed capture attempts were also closed and their branches deleted. Branch protection on
`main` was intentionally left in place.

## Redaction

No tokens or credentials appear in this record. The sandbox repository name and PR URL are
intentionally cited. The smoke asserts serialized run artifacts and emitted evidence facts do not
include GitHub tokens, `GH_TOKEN`, `GITHUB_TOKEN`, token-backed Git config values, credential
URLs, or the records-integrity key.

## Supported IDs

- Supports `MERGE-5` for real blocked-PR surfacing: the run observed the PR, commit-status, and
  comment legs against the disposable sandbox.
- Supports `MERGE-4` held-merge posture against a real protected branch: the run observed
  `done-not-landed` and `held-by-review` without forcing a merge.
- Supports the front-door claim that held-merge and block-surfacing are real-effect proven, not
  only unit-proven.

## Limitations

This is a scripted-agent smoke, not a real Codex app-server run. It does not prove SEC-2
no-phone-home behavior, hosted/remote execution, Windows behavior, or package-publication posture.
It uses a disposable sandbox repository only; no production repository was touched.
