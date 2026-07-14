---
title: "Deterministic story orchestration — evidence and artifacts"
status: proposal — draft for review, not yet agreed or adopted
---

# Evidence and artifacts

This layer defines how decision-bearing facts and their supporting content cross the boundaries in
[Operations and results](operations-and-results.md) and become durable without turning the event
store into a blob store or requiring the deterministic core to interpret project-specific output.

## Concept separation

The design distinguishes four concepts:

| Concept             | Meaning                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Decision fact       | Small typed fact consumed directly by validation or deterministic transitions                   |
| Evidence manifest   | Bounded structured claims showing that required evidence exists for an exact subject            |
| Artifact            | Immutable supporting content such as logs, reports, diffs, diagnostics, or transcripts          |
| Provider-local data | Raw SDK, transport, process, or tool data that remains behind an adapter unless safely promoted |

Only typed decision facts and evidence manifests can influence orchestration directly. An artifact
supports those facts but never becomes a hidden control message. The core validates presence,
provenance, outcome, identity binding, and integrity metadata; it does not parse logs, diffs, or
provider output to make project-specific judgments.

## Inline versus out-of-line rule

Information remains inline in a typed result or event when it is:

- required for deterministic control or later correlation;
- bounded and stable enough to version as part of the contract;
- safe to retain in the event trail; and
- meaningful without provider-specific parsing.

Content becomes an artifact when it is:

- large or unbounded;
- primarily diagnostic or human-readable;
- provider-shaped or media-oriented;
- sensitive enough to need separate access and retention controls; or
- useful as supporting proof but not as a direct transition input.

An event may include a bounded summary and an `ArtifactRef` to the full content. Moving content out
of line must not remove a decision fact required by the core.

## Evidence manifest

An evidence manifest is a closed typed collection bound to an exact subject. Depending on its kind,
that subject includes the story, operation, candidate SHA, target SHA, pull request, delivery
attempt, or check set to which the evidence applies.

Each required evidence item records conceptually:

- the policy or configuration requirement it satisfies;
- its evidence kind and factual outcome;
- the exact subject and observed identity;
- trusted producer attribution;
- bounded structured observations required by later validation; and
- zero or more immutable artifact references.

The manifest is complete only when every evidence item required for that stage is present and valid.
Additional diagnostics may be included but cannot replace a required item, silently add a new gate,
or weaken a failed required outcome.

Manifest structure is versioned by evidence kind. A generic key-value evidence bag is not part of
the first phase.

## Trusted artifact reference

Producers do not construct trusted artifact identities. A scoped artifact recorder validates and
stores content, then returns an opaque reference with at least these conceptual properties:

```text
ArtifactRef
- artifact identity
- artifact kind and media type
- run scope and true producer attribution
- recorded time
- byte size and content digest
- retention and access classification
```

The recorder controls artifact identity, run scope, producer attribution, recorded time, measured
size, and digest. Story, candidate, operation, target, and check correlation belongs in the evidence
manifest that uses the reference.

The reference contains no credential, raw filesystem path, temporary URL, or provider client
object. Consumers resolve it through an authorized artifact resolver. The digest is calculated over
the exact sanitized bytes stored durably; internal content addressing or deduplication remains an
implementation detail.

## Producer-to-event flow

Required artifacts must be durable before the runtime accepts the producer's completed result:

1. An agent or effect adapter produces typed facts and supporting raw content.
2. Its trusted, scoped artifact recorder validates kind, size, access class, and retention; applies
   required redaction; stores immutable content; and returns `ArtifactRef` values.
3. The adapter returns a typed result containing decision facts and the completed evidence
   manifest.
4. The runtime validates the result, manifest, attribution, subject binding, and artifact integrity.
5. The deterministic core calculates the transition.
6. The event recorder atomically persists events containing the bounded facts and references.
7. The runtime adopts live state and dispatches any newly requested operations.

If a required artifact cannot be stored or verified, the producing operation cannot return a valid
completed result. It returns an artifact-persistence or integrity failure instead. Therefore, an
accepted event never claims required evidence through a reference that was not durable at the time
of the transition.

Artifact writes are infrastructure activity inside the producing adapter's completion boundary,
not separate orchestrated operations. This preserves the agreed event-persistence ordering without
adding artifact-staging state to the core.

## Evidence by stage

| Stage                    | Inline decision facts                                                                 | Typical artifacts                                               |
| ------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Implementer checks       | Check IDs, configured check-set identity, exact candidate SHA, outcomes, completeness | Full stdout/stderr, test reports, coverage reports              |
| Candidate submission     | SHA, target basis, round, summary, changed-scope summary, evidence completeness       | Full diff or patch, generated reports, extended change manifest |
| Reviewer verdict         | Exact SHA, verdict, structured findings, unresolved count, evidence assessment        | Detailed diagnostics or supplementary review report             |
| Final local verification | Exact SHA, check-set identity, `passed` or `failed`, observed-content integrity       | Verification logs and machine reports                           |
| Remote checks            | Candidate SHA, required check IDs, pending/passed/failed snapshot                     | Provider check payloads and detailed logs when retained         |
| Integration and landing  | Source and target SHAs, PR or merge reference, factual outcome, confirmation method   | Sanitized provider receipt or landing proof                     |
| Agent transcript         | No control facts by default                                                           | Optional transcript under explicit retention policy             |

Changed paths may remain inline when bounded by the contract. An oversized list moves to an
artifact while the inline result retains its count, digest, scope summary, and reference. Pull
request title and body may remain inline when bounded; otherwise the approved immutable content is
stored as an artifact and the candidate package binds its digest. Delivery must use the exact
reviewed content in either case.

## Implementer evidence and reviewer reuse

The implementer owns assigned-check facts and evidence. Each submitted candidate includes a
complete manifest tied to the exact committed SHA and confirms that checked tracked content was not
changed before commit.

The reviewer receives the manifest and authorized read-only access to its artifacts. The reviewer
assesses sufficiency, provenance, and relevance but does not rerun the same checks merely to confirm
them. Reviewer-specific diagnostics are separate evidence and do not overwrite implementer facts.

Any candidate SHA change invalidates the current use of the prior manifest, review, approval, final
verification, and delivery authorization. Existing events and artifacts remain historical; the new
candidate requires a new current manifest.

## Evidence produced by effect ports

Workspace, verification, and delivery adapters own the factual evidence for effects they perform or
observe. They must report exact observed identities rather than echoing requested values as proof.

Examples include:

- workspace HEAD and cleanliness observations before safe retirement;
- pre- and post-verification candidate SHA;
- actual remote branch SHA after publication;
- actual pull-request head and target basis;
- remote-check identity and conclusion for the exact candidate;
- integration result against the expected target SHA; and
- configured landing proof from the resulting target.

The runtime validates these facts and their artifact references. It does not invent missing proof
or reinterpret raw provider responses.

## Missing, corrupt, or unavailable artifacts

Required artifact availability is fail-closed while it can still affect the run:

- a result with a missing, corrupt, mismatched, or unauthorized required artifact is rejected;
- review cannot approve without access to its required evidence;
- finalization cannot rely on evidence whose subject or integrity no longer matches; and
- landing cannot be confirmed from a missing required proof.

Whether the runtime retries evidence retrieval, retries the producing operation, or blocks the
story is decided later by failure-and-liveness policy. The artifact adapter reports the factual
failure only.

After policy-authorized retention expires, immutable events continue to show what evidence was
recorded and its digest, while read models report the artifact as expired or unavailable rather
than pretending it is still inspectable. Exact retention periods and archival tiers remain a later
decision.

## Redaction, integrity, and access

Durable evidence follows these rules:

- secrets, credentials, and disallowed personal data are removed before durable storage;
- the default path does not retain the unredacted original;
- digest and size describe the sanitized stored bytes;
- artifacts are immutable after their reference is issued;
- integrity is verified whenever a required artifact is consumed for a decision;
- access is scoped by run, role, artifact kind, and purpose;
- implementers and reviewers do not receive event-store, delivery, or unrestricted artifact-store
  credentials; and
- event payloads and summaries follow the same redaction rules as artifacts.

If redaction would destroy a fact required by the contract, the result fails closed rather than
storing unsafe content or claiming incomplete evidence as sufficient.

## Retention and live-state compaction

Artifact retention is independent of full `StoryState` retention. Removing a successfully landed
story from live state does not delete its events or artifacts.

Policy defines which evidence categories must be retained and the minimum retention behavior;
configuration supplies an artifact store capable of satisfying it. Preflight rejects a run whose
artifact capability cannot meet the policy.

At minimum, an artifact cannot be deleted while:

- it is required by an active candidate, review, approval, verification, or delivery attempt;
- it is needed to retire or preserve a directly blocked story; or
- the configured retention requirement remains active.

Optional transcripts and redundant diagnostic artifacts may use different configured retention
classes, but their absence cannot erase decision facts from events.

## First-phase invariants

1. Events store bounded typed facts and references, not unbounded evidence content.
2. Required artifacts are durable and integrity-checked before their result is accepted.
3. Evidence manifests bind facts and artifacts to an exact subject.
4. The core validates manifests but never parses project-specific artifacts for judgment.
5. Artifacts support typed facts and never act as hidden control messages.
6. Producer attribution is assigned by trusted scoped recorders, not self-asserted content.
7. Candidate mutation invalidates current use of all candidate-bound evidence and authorization.
8. Reviewer reuse of implementer evidence does not duplicate assigned checks.
9. Missing or corrupt required evidence fails closed while it can affect the run.
10. Live-state compaction never deletes durable evidence by implication.

## Deferred decisions

- Concrete manifest, artifact-reference, and access-token schemas.
- Artifact store implementation, encryption, archival tiers, and physical deletion.
- Exact size thresholds, content-type allowlists, and redaction implementation.
- Retention durations for each artifact class.
- Export packaging, transcript defaults, and completed-run artifact read APIs.
