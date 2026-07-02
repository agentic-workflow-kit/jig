---
name: orchestrate-jig
description: >-
  Local composition runbook for coordinating a Jig execution from an approved execution plan,
  policy, work profile, and repo floor. Use when asked to orchestrate Jig-shaped work beyond
  the current local CLI surface (`jig preview`, local dry-run `jig run`, and `jig inspect`;
  governed request decisions exist locally, but real workers and governed landing do not yet).
  Refuses missing or incompatible plan inputs, binds only current
  runtime facts, preserves the runner/worker authority boundary, requires recordable evidence
  before landing, and stops cleanly on unsupported paths.
---

# Orchestrate Jig

## Contract

Coordinate execution-shaped work from Jig's current design contracts. This skill is a local
composition runbook, not a Jig runtime implementation, CLI, provider adapter, or record store. It
may organize a human/Codex-assisted run only as far as the approved inputs, current tool surface,
policy posture, and recordability allow.

The execution plan owns scope. It must already carry the story set, dependencies, work boundaries,
done and evidence requirements, authority expectations, policy/work-profile/repo-floor references,
constraints, and compatibility posture described by
`docs/design/contracts/execution-plan-contract-v0.md`. This skill may reject, bind, schedule, stop,
or report. It must not invent stories, revise dependencies, weaken policy, add acceptance criteria,
choose done evidence, reinterpret out-of-scope surfaces, or convert missing plan facts into runtime
decisions.

Records are the evidence. Every governed decision, authorization, stop, evidence observation,
review outcome, and runner-owned action must be recordable under
`docs/design/contracts/observability-records-contract-v0.md` before it is treated as true. A
separate narrative, chat summary, checklist, or worker report never overrides the recordable
evidence packet.

## Reference Boundary

The retiring `workflow-kit` orchestrated-delivery skill is prior art only. Carry these lessons when
they preserve Jig's own contracts:

- preflight the execution input before dispatch;
- bind runtime facts after preflight, not during planning;
- keep worker-produced change separate from runner-owned privileged actions;
- require independent evidence before done or landed state;
- leave a recoverable, named stop rather than guessing through missing capability.

Do not import workflow-kit's execution-package paths, tracker schema, per-story prompt folders,
model-routing tables, provider package layout, `v-next` branch policy, old PR publication rules, or
old runtime claims. If a prior-art rule does not map to Jig's v0 plan or record properties, ignore
it and name the stop or design gap instead.

## Inputs

Require all of these before any worker dispatch or privileged action:

- an approved execution plan compatible with `execution-plan-contract-v0`;
- the policy reference, work-profile reference, and repo-floor reference the plan binds to;
- owner approval to start or preview at the requested boundary;
- current repo/worktree facts for the run location;
- for start, execution, or landing boundaries: current driver/seam facts for Agent, Execution Host,
  Forge, and Work Source, or an explicit stop if a required seam cannot be inspected;
- for preview-only boundaries: enough binding facts to record `run.previewed` without requiring a
  run identity, workspace allocation, provider wiring, or privileged side effects;
- current verification commands and evidence requirements from the plan and policy;
- a record path, record store, or durable record packet format that can preserve
  `observability-records-contract-v0` properties for this local run.

Unknown runtime facts stay unknown until inspected. Missing plan facts are not runtime facts; they
are plan-preflight failures.

## Preflight

Run this gate before dispatch, edits, push, PR, merge, status posting, or any claim that Jig has
started.

1. Confirm repo instructions and source-of-truth docs were read for the touched surface:
   `AGENTS.md`, `docs/product/jig.md`, `docs/product/guarantees.md`,
   `docs/product/concepts.md`, `docs/design/README.md`,
   `docs/design/contracts/execution-plan-contract-v0.md`,
   `docs/design/contracts/observability-records-contract-v0.md`,
   `docs/design/core/orchestration.md`, and `docs/design/core/records.md`.
2. Verify the plan is approved by the owner or owning planning step. If approval is absent,
   stop as `plan-not-approved`.
3. Verify the plan carries the v0 required properties:
   - plan identity and provenance;
   - track binding;
   - story set;
   - dependency and eligibility model;
   - done and evidence requirements;
   - authority and approval needs;
   - policy and work-profile references;
   - stack-seam requirements;
   - constraints and limits.
4. Verify the plan's version or compatibility marker is understood. If not, stop as
   `plan-format-unsupported`.
5. Verify every selected story has a stable ID, intended boundary, dependency list, evidence
   requirements, and authority expectations. If any selected story asks the runner or worker to infer
   scope, stop as `plan-scope-incomplete`.
6. Verify dependency order can be derived without rewriting the plan. If the graph is cyclic,
   contradictory, or needs invented ordering, stop as `plan-dependency-invalid`.
7. Verify policy, work-profile, and repo-floor references are present and compatible with the
   requested run. If they are missing, incompatible, or would weaken launch-time policy, stop as
   `binding-input-missing`.
8. Verify the requested boundary is supported: preview, local execution coordination, evidence
   collection, runner-owned publication, or stop. Preview is non-committing: it requires load,
   validate, bind, and a recordable `run.previewed` event, but no run identity, workspace, provider,
   or privileged side effect. If the user requests real Jig behavior that does not exist in the
   current repo, stop as `jig-runtime-unavailable`.

Preflight may produce a proposed execution sequence, a refusal, or a named stop. It must not repair
the plan.

## Runtime Binding

After preflight passes, bind current facts only:

- worktree path, repo root, branch, base, and cleanliness;
- policy, work-profile, and repo-floor references in force;
- selected stories and currently eligible stories from the plan graph;
- current verification commands, review requirements, and capability-proof requirements;
- current owner approval state and requested stop boundary;
- for start, execution, or landing boundaries: Agent, Execution Host, Forge, and Work Source driver
  availability and attestation posture;
- for preview-only boundaries: preview binding posture and the recordable `run.previewed` basis,
  without forcing provider wiring;
- record destination or record-packet location and its redaction/export posture;
- runner-owned actions available on the current surface, such as push, PR creation, status/comment
  posting, and merge.

Record these bindings before launch. Launch bindings are immutable across resume: a resume may
continue from a stopped run, but it may not silently swap policy, work-profile, repo-floor, plan, or
driver facts. Changed safety-relevant assumptions require fresh owner approval and fresh evidence
before continuing.

## Runner and Worker Boundary

Preserve the product authority boundary from `docs/product/concepts.md` and
`docs/design/core/orchestration.md`.

- The worker may read, edit, run non-privileged checks, produce a diff, produce evidence, and report
  blockers only inside the authorized story boundary.
- The worker must not push, open or update PRs, post statuses/comments, merge, widen authority, edit
  policy floors, mark stories landed, or author records as the authority of what happened.
- The runner coordinates eligibility, authorization, evidence evaluation, records, owner
  escalation, push, PR creation, status/comment posting, merge, stop, resume, and export.
- Privileged actions require runner authority plus policy/evidence basis. A worker self-report is
  never enough to mark a privileged action complete.
- A request outside declared authority fails closed or routes to the owner; it never becomes a
  broader implicit grant.

If the current surface cannot keep this split real, stop as `authority-boundary-unsupported`.

## Coordination Loop

Use the plan graph and Jig lifecycle terms without adding new states.

1. Start only stories whose prerequisites have landed according to the plan and current records.
2. Keep ineligible stories waiting; do not ask workers to make their own dependency decisions.
3. For an eligible story, dispatch the worker with the story boundary, plan references, authority
   expectations, evidence requirements, verification commands, non-goals, and mutation limits.
4. Treat worker output as proposed work and evidence, not as state authority.
5. Evaluate done only from policy-aligned evidence observed by the runner or delegated reviewer.
6. Preserve `done` and `landed` as separate milestones: a story can be done when evidence is met
   while merge remains held by review, branch protection, conflict, queue, or owner boundary.
7. Land only through runner-owned action after required evidence, owner/reviewer approval when
   required, and record append/packet preparation all succeed.
8. If a story blocks, record the reason and affected downstream stories; independent siblings may
   continue when policy and capability allow.

Do not add a tracker, story package, prompt package, or merge-back model unless a future Jig design
contract introduces one.

## Evidence and Records Gate

Before treating a state transition or governed decision as accepted, prepare a recordable packet with
the v0 properties that apply to the requested boundary:

- for committed start/resume/execution paths: run identity, attempt identity, plan reference, track
  reference, policy/work-profile/repo-floor references, and driver context;
- for preview-only paths: plan reference, track reference, policy/work-profile/repo-floor
  references, and the non-committing `run.previewed` basis, without inventing a run identity or
  driver context;
- event family and outcome using Jig's current event-family altitude;
- actor or component responsible: worker, runner, owner, delegated reviewer, or driver;
- basis: policy rule, evidence observation, approval, capability proof, prior event, or plan
  reference;
- story ID when applicable;
- redaction/export posture;
- ordering information sufficient for replay or resume;
- any block, stop, notice, resume checkpoint, or no-double-effect basis.

Automated checks, reviews, and capability attestations must be observed or independently verified.
If evidence is missing, stale, self-reported only, unverifiable, or not recordable, the story is not
done and must stop as `evidence-insufficient`.

## Stops

Prefer named stops over improvised execution. A stop report must include the stop name, affected run
or story, failed gate, recordable basis, safe resume checkpoint when available, and next owner action.

Use these stop names unless a more specific plan-owned name exists:

- `plan-not-approved` — no approved execution plan or start approval.
- `plan-format-unsupported` — plan compatibility marker or shape is unknown.
- `plan-scope-incomplete` — selected story scope, boundary, evidence, or authority needs are missing.
- `plan-dependency-invalid` — dependency graph cannot be executed as written.
- `binding-input-missing` — policy, work profile, repo floor, or compatibility references are absent
  or incompatible.
- `jig-runtime-unavailable` — the requested behavior requires Jig runtime capability beyond the
  current local dry-run CLI (`jig preview` / `jig run` / `jig inspect`).
- `driver-capability-unavailable` — a required Agent, Execution Host, Forge, or Work Source
  capability cannot be proven.
- `authority-boundary-unsupported` — the current surface cannot preserve runner-owned privileged
  actions and contained worker authority.
- `records-store-unavailable` — no durable record store or recordable packet can preserve v0 record
  properties.
- `evidence-insufficient` — required evidence is missing, unverifiable, stale, or self-reported only.
- `owner-decision-required` — policy routes a narrow decision to the owner.
- `safety-reapproval-required` — rule-governing or safety-relevant inputs changed before resume or
  landing.

Stopping is a valid outcome. Do not soften a stop into a warning when the missing condition is part
of Jig's control, evidence, recovery, or observability guarantees.

## Output

Return a compact run ledger, not a transcript dump:

- plan reference and selected story IDs;
- policy, work-profile, and repo-floor references bound;
- runtime facts inspected and unknown facts left unresolved;
- eligible, started, parked, blocked, done, landed, rejected, stopped, resumed, or completed states
  that are recordable;
- evidence observed and verification commands run;
- runner-owned actions taken or explicitly not taken;
- stop names, reasons, safe resume checkpoints, and next owner actions;
- record packet/store references and redaction posture;
- unsupported capability or design gaps routed back to the owning Jig design/planning surface.

If no recordable evidence exists for a claimed state, report the state as unverified and stop.
