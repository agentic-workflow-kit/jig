# Orchestrate phase delivery

Repository-local operational skill for coordinating an already-approved Jig delivery phase. Its
source of truth is the active product/design package, delivery policy, story contract,
`track.json`, and external ledger; it cannot authorize work, change declared dependencies, or
implement a scheduler service.

Use it to start, resume, recover, or close a phase with one integration worktree, one registered
worktree and continuous independent pair per admitted story, bounded ready-set parallelism, and one
final phase PR.

The skill keeps detailed state and recovery rules in
[`references/phase-protocol.md`](./references/phase-protocol.md). Authored output and trigger evals
are under [`evals/`](./evals/).

Validate locally:

```bash
python3 .agents/skills/orchestrate-phase-delivery/scripts/validate_evals.py
python3 <open-skill-creator>/scripts/validate_skill.py .agents/skills/orchestrate-phase-delivery
```

Packaging is a release/readiness check, not a tracked artifact. Write any `.skill` archive to an
external temporary directory.
