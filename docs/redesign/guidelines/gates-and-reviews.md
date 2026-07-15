---
title: "Gates, reviews, and change — approval you can trust later"
purpose: Define layer gates as artifact metadata, exact-candidate review semantics, and how proposals, decisions, locks, and reopens interact.
audience:
  - Decision owners
  - Independent reviewers
  - Architecture authors
scope: Generic gate and review semantics; artifact metadata mechanics live in the communication-contracts chapter.
state: current
status: active operational standard — generalized rewrite of 2026-07-15
owner: Architecture documentation owner
last_verified: 2026-07-15
sources_of_truth:
  - ../architecture-design-and-documentation-guide.md
related:
  - ./README.md
  - ./communication-contracts.md
  - ./maintenance.md
---

# Gates, reviews, and change — approval you can trust later

Approval is only useful if, months later, anyone can establish exactly what was approved, by whom,
under which delegation, and against which bytes. Everything in this chapter serves that test.

## Gates are metadata, not document structure

A gate is a recorded transition of specific artifacts between states (`proposed` → `approved`,
`approved` → `approved and locked`), governed by an explicit rule about who may move them and what
evidence the move requires. Gates therefore live in two places only:

- each artifact's `state`/`status` metadata, and
- a **gate record** — one artifact that owns review history, verdicts, baselines, and what remains
  open.

Do not encode gates as folder structure ("stage-2/"), document sequence, or a phase the whole
documentation set is "in". Artifacts at different states coexist in one connected set; the metadata
and the gate record say which is which. This keeps reorganization (renaming, splitting, regrouping
pages) from ever being confused with re-deciding.

A useful gate ladder for foundations: each layer's candidate set is authored → independently
reviewed → approved by the decision owner → **locked** as the next layer's fixed input. Locking is
what lets later work build without re-litigating; it is worth the ceremony exactly for the
artifacts other work will treat as ground truth (invariants, boundaries, decision records).

## Exact-candidate review semantics

The single most load-bearing rule: **a verdict applies only to the exact candidate reviewed.**

- Pin the candidate: an enumerated file set at a recorded baseline (commit hash), ideally with a
  content digest per file, recorded in the gate record.
- **Any edit after a PASS invalidates the PASS** — including metadata edits. The clean way to
  avoid a metadata-edit loop is to pre-record the gate's effect in the candidate itself ("a PASS
  on this exact set makes the recorded approval effective"), so the verdict activates the gate
  without requiring a subsequent edit. Recording the verdict afterwards in the gate record is
  record-keeping over unchanged reviewed content, and the record should say so.
- If the candidate is restructured while a review is pending, the pending review is **superseded**,
  not failed: the exact candidate no longer exists. Record the supersession and run a fresh review
  of the new candidate. Prior substantive findings remain evidence.

## Bounded review delegation

When the decision owner delegates review, delegate narrowly and in writing:

- The reviewer judges **faithful organization and re-expression of established intent** — never
  selects or changes an outcome, boundary, requirement, owner, risk, guarantee, decision,
  trade-off, consequence, or deferral.
- Verdicts are exactly three: `PASS`, `CHANGES_REQUIRED`, or `OWNER_DECISION_REQUIRED`. If faithful
  re-expression would require a material change, the verdict is `OWNER_DECISION_REQUIRED` and the
  question goes to the owner — the reviewer does not decide around it, and neither does the author.
- **Authors never review their own work.** Independence is per candidate: an author of any part of
  the candidate cannot be its reviewer.
- Bound the loop: after a small fixed number of unsuccessful author/reviewer cycles (three works),
  unresolved findings return to the owner. Unbounded review loops hide a disagreement that was the
  owner's to settle.
- Distinguish blocking findings (fail a gate item) from non-blocking notes (would be nice); only
  blocking findings force `CHANGES_REQUIRED`. Record both.

## The gate record

One artifact per gated layer or foundation, owning:

- current gate state, in plain language, including what remains before an approval is effective;
- the traceability tables that show every required question has an owning answer artifact;
- each review: reviewer identity/session, delegation bounds, verdict, findings and dispositions,
  and the exact reviewed baseline (commit, file list, digests);
- supersessions and reopens, with their owner instructions quoted or referenced by date.

The gate record is the one page that must never lie: when reality moves (an owner instruction, a
supersession, a verdict), update it in the same change set.

## Proposals, decisions, and locks

- **Explore future states in isolation.** A proposal is a coherent change set — affected views,
  flows, metadata, risks, rollout, rollback — forked from a stated current baseline and reviewed
  as one unit. Never let proposal content leak into `current` artifacts before approval.
- **Record decisions with their costs.** Context, drivers, options, the selected direction, and
  the accepted negative consequences. The accepted costs are the part future readers need most and
  authors omit most; a gate reviewer should treat a cost-free decision record as incomplete.
- **Reopen explicitly.** Changing a locked artifact requires a named reopen: the governing
  statement being changed, the proposed revision, the impact, and a renewed owner decision, then a
  fresh exact-candidate review. "The new page quietly says something else" is not a reopen; it is
  a defect.
- **Version at meaningful moments.** A frozen snapshot (tag, release, or recorded baseline) shows
  what the design said; the decision records say why. Keep both.

## Owner instructions are events

Direction from the decision owner — an authorization to proceed, a structure revision, a stop —
is itself gate-relevant history. Record it in the gate record with its date and exact effect, and
update the contracts that quoted the old direction in the same change. A documentation set whose
working agreements contradict the owner's latest instruction fails the trust test regardless of
how good its diagrams are.

## Where to go next

- The metadata fields gates read: [communication contracts](./communication-contracts.md).
- Keeping approved artifacts true afterwards: [maintenance](./maintenance.md).
- A complete gate history on a real project: [worked example — jig](./worked-example-jig.md).
