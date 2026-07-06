---
title: "2026-07-06 - RESUME-3 real-effect idempotency smoke"
status: applied - coordinator privileged run 2026-07-06
date: 2026-07-06
---

# 2026-07-06 - RESUME-3 Real-Effect Idempotency Smoke

## Probe

This record captures a real repeated-effect idempotency smoke against the disposable sandbox
repository `agentic-workflow-kit/jig-smoke-target`. The first pass created one real GitHub
`open-pr` landing for a temporary branch, then stopped at a safe unattended-park checkpoint on the
second story. The resume pass re-read the hosted branch head, recorded
`runner-action.skipped-repeated-effect` with `reason: already-landed`, and verified that the
sandbox still had exactly one PR for the branch.

The smoke used the opt-in scenario in
`packages/jig-sdk/tests/smoke/evrun-held-merge-resume.smoke.test.ts`.

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
EVRUN_RESUME_IDEMPOTENCY_SMOKE=1 \
EVRUN_REAL_EFFECT_KEEP_ARTIFACTS=1 \
JIG_GITHUB_ISSUES_REPOSITORY=agentic-workflow-kit/jig-smoke-target \
JIG_GITHUB_ISSUES_LABEL=jig-candidate \
JIG_RECORDS_INTEGRITY_KEY="<operator-provided one-off key>" \
JIG_RECORDS_INTEGRITY_KEY_ID="resume-idempotency-smoke" \
EVRUN_RESUME_IDEMPOTENCY_EVIDENCE_OUT=/private/tmp/jig-resume-idempotency-smoke-evidence.json \
corepack pnpm exec vitest run packages/jig-sdk/tests/smoke/evrun-held-merge-resume.smoke.test.ts
```

Result:

```text
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
Duration    10.52s
```

## Result Summary

| Field                         | Value                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------- |
| Run ID                        | `run-resume-idempotency-smoke-1783358911285-0e28c7f6-35de-462a-b1e8-7dac141d3b7d` |
| Final run status              | `failure` (expected parked second story after repeated-effect check)              |
| Branch                        | `resume-idempotency-smoke-1783358904804-7f3f44a7`                                 |
| First-pass status             | `failure`                                                                         |
| First-pass stop reason        | `unattended-park`                                                                 |
| First-pass checkpoint         | `after:RESUME-PARKED.parked`                                                      |
| First-pass PR count           | `1`                                                                               |
| Resume status                 | `failure`                                                                         |
| Resume repeated-effect reason | `already-landed`                                                                  |
| Repeated action               | `open-pr`                                                                         |
| Target ref                    | `refs/heads/resume-idempotency-smoke-1783358904804-7f3f44a7`                      |
| Target head                   | `9e5a8daa86f6672cb4549ef076b3dcc79a04201d`                                        |
| Open-PR events for story      | `1`                                                                               |
| Post-resume PR count          | `1`                                                                               |
| Integrity status              | `verified`                                                                        |
| `run.json` hash               | `627d7840fe76ea20edf26263f6a24865e580231de6159e45a5737ec2c6749f53`                |
| `integrity` hash              | `03ad8aafbc7fe069bc4ea028776cfa253e036b6b43c07c0aeb75c76a4863b053`                |

## Cleanup

The smoke-created sandbox pull request was closed after capture and its branch was deleted:
`https://github.com/agentic-workflow-kit/jig-smoke-target/pull/22`. Branch protection on sandbox
`main` was left in place.

## Redaction

No tokens or credentials appear in this record. The sandbox repository name and temporary branch
name are intentionally cited. The smoke asserts serialized run artifacts and emitted evidence facts
do not include GitHub tokens, `GH_TOKEN`, `GITHUB_TOKEN`, token-backed Git config values,
credential URLs, or the records-integrity key.

## Supported IDs

- Supports `RESUME-3`: resume against a previously landed real `open-pr` effect recorded
  `runner-action.skipped-repeated-effect` with `reason: already-landed`.
- Supports the no-double-effect claim for this real Forge path: only one PR existed for the branch
  before and after resume, and the run record contains one `open-pr` landing event for the landed
  story.
- Supports P11-AC-2 for the repeated-effect idempotency leg.

## Limitations

This is a scripted-agent smoke, not a real Codex app-server run. It proves repeated-effect
idempotency for a real GitHub `open-pr` landing, not for every possible landing action. The second
story intentionally parks to satisfy the resume precondition, so the final run status is
`failure`. It does not prove SEC-2 no-phone-home behavior, hosted/remote execution, Windows
behavior, or package-publication posture. It uses a disposable sandbox repository only; no
production repository was touched.
