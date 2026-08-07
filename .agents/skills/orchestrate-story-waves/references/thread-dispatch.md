# Thread dispatch contract

Read this reference immediately before creating or steering a story or reviewer thread.

## Implementer thread

Create the thread only after the story is eligible and its registered worktree exists. Use an
isolated, self-contained prompt containing:

- exact repository, worktree, branch, target, base commit/tree, story ID, and delivery mode;
- governing product/design/tracker/story/delivery paths and authority precedence;
- exact scope, owned paths, non-goals, dependency evidence, and selected bounded choices;
- implementer model and effort, hard budget, expected output, verification ownership, and stop
  conditions;
- instruction that other work exists and must not be reverted;
- required local checks, candidate cleanliness/residue evidence, commit convention, and evidence
  binding;
- requirement to create the reviewer thread with the route and read-only boundary below;
- whether the thread must finish with a PR lifecycle or a reviewed candidate for integration.

The implementer owns executable verification. It must not ask the reviewer to run a test, build,
formatter, installer, evidence writer, or mutation.

## Reviewer thread

The implementation thread creates one reviewer thread with model `gpt-5.6-terra` and reasoning
`high`. The reviewer prompt must bind:

- the exact worktree, base, story authority, scope, and candidate when one exists;
- permanent read-only status;
- prohibition on tests, checks, builds, formatters, installers, evidence writers, file/Git/GitHub
  mutation, and self-repair of evidence;
- pre-write must-cover output when repository policy requires it;
- final output `PASS` or `CHANGES_REQUIRED`, exact findings, sibling-search surface, evidence gaps,
  and re-review range.

Use the same reviewer thread for every incremental candidate. A changed commit, target, binding, or
verification subject invalidates the earlier verdict.

## Coordinator records

Record for each thread:

```text
story_id, role, thread_id, host_id, model_class, planned_model, actual_model,
planned_effort, actual_effort, context_mode, worktree, branch, base,
status, fallback_reason
```

Read thread status without opening it. Send follow-up messages only to correct scope, supply a
verified producer packet, request the next governed step, or resume a non-terminal lifecycle.
Never send a message that authorizes invented scope or bypasses a failed gate.

If thread creation times out, query recent threads before retrying. Do not create duplicates while
the first request may still be provisioning.
