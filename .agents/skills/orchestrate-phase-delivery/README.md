# Orchestrate phase delivery

Repository-local operational skill for coordinating an explicitly owner-requested Jig delivery
phase. Its source of truth is the active product/design package, current implementation request,
delivery policy, story contract, and `track.json`. The external ledger records operational state;
the skill cannot change product/design authority, declared dependencies, or implement a scheduler
service.

Use it to start, resume, recover, or close a phase with one integration worktree, one registered
worktree and continuous independent pair per admitted story, bounded ready-set parallelism, and one
final phase PR. The pair also classifies implementer effort from semantic risk, forwards concise
read-only reviewer preparation before writes, records implementer proof in the normal handoff, and
returns all presently supportable candidate-bound blockers grouped by root cause without adding an
agent, gate, artifact, or ledger field.

The skill keeps detailed state and recovery rules in
[`references/phase-protocol.md`](./references/phase-protocol.md). Authored output and trigger evals
are under [`evals/`](./evals/).

Validate locally:

Prerequisite: set `OPEN_SKILL_CREATOR_DIR` to the installed `open-skill-creator` skill root.

```bash
pnpm delivery:check
python3 .agents/skills/orchestrate-phase-delivery/scripts/validate_evals.py
python3 "$OPEN_SKILL_CREATOR_DIR/scripts/validate_skill.py" .agents/skills/orchestrate-phase-delivery
```

Packaging is a release/readiness check, not a tracked artifact. Write any `.skill` archive to an
external temporary directory.
