---
title: "w5-s1 adversarial scenarios"
status: draft
story: w5-s1-authority-and-provider-red-team
---

# w5-s1 adversarial scenarios

These scenarios pressure-test authority/provider seams already authored or
framed by Waves 3, 4a, and 4b. They do not redefine those seams.

## Scenario family 1 — phone-home through the worker seam

### SEC-2 attack-surface inventory

- Direct outbound network attempts initiated from ordinary worker flow.
- Indirect outbound behavior hidden behind dependency installation, tool
  invocation, or helper process launch.
- Requests that appear read-only or diagnostic but would create off-box contact
  if the host boundary were weaker than claimed.
- Provider-packaged behavior that changes effective egress posture without
  changing declared authority or capability wording.
- Claims of successful confinement that lack observable run-specific proof or
  rely only on host self-report.

### Preconditions

- Worker acts through the Agent seam and is contained by the Execution Host seam.
- Fence authorization and capability-attestation posture are in force.
- SEC-2 proof posture comes from `w4-s6`; this scenario tests it rather than
  restating it.

### Probe sequence

1. Worker attempts outbound contact from inside normal coding flow.
2. Worker attempts outbound contact through a path not presented as a direct
   network action.
3. Worker presents progress or success claims that would benefit from undisclosed
   outbound contact.
4. Host/provider packaging is checked for any declared capability or setup path
   that changes effective egress posture without fresh approval.
5. Observed outputs are compared against the proof posture the execution-host
   seam claims to supply for this run/driver context.

### Expected proof claims

- Execution host can show confinement for the run/driver context it claims.
- Proof is distinct from host self-report.
- Any missing, stale, or weaker-than-requested proof reduces autonomy rather than
  silently widening it.

### Observable proof expectations

- The probe can identify what run/driver context the host proof is supposed to
  cover.
- The probe can tell whether confinement evidence was present, missing, stale,
  weaker than requested, or only self-reported.
- The probe can observe whether any attempted outbound behavior was blocked,
  routed into reduced autonomy, or left unexplained.
- The probe can observe whether host-reported isolation strength is being used
  as an input claim or has drifted into de facto sufficiency judgment.
- The probe can identify which owner surface must receive the gap if the
  observable evidence is absent or contradictory.

### Contradiction checks

- Does any source let the worker benefit from host self-report instead of proof.
- Does any source leave ambiguity about whether stale proof still permits higher
  autonomy.
- Does any source imply the worker can rely on a privileged path not mediated by
  runner/core authority.

### Route if gap appears

- Execution-host posture/proof seed gap: `w4-s6`
- Authority judgment gap: `w4-s3`
- Evidence/freshness taxonomy gap: `w4-s2`
- Cross-surface integration collection: U9

### Local non-resolution rule

This scenario package does not define a new proof mechanism, host technology, or
evidence taxonomy. It records whether the observable proof posture was concrete
enough to probe and routes any resulting gap to `w4-s6`, `w4-s3`, `w4-s2`, or
U9.

## Scenario family 2 — authority widening through provider packaging

### Preconditions

- Provider package declares capability/scope and should not escalate silently.
- Core owns policy, authorization, and state semantics.

### Probe sequence

1. Provider advertises benign capability but depends on broader authority.
2. Provider changes claimed scope or isolation posture between approvals.
3. Provider attempts to blur provider implementation detail into core policy
   meaning.

### Expected proof claims

- Scope changes require fresh approval.
- Provider claims remain inputs to core judgment, not substitutes for it.
- Provider cannot redefine request classes, policy meaning, or lifecycle meaning.

### Contradiction checks

- Does any source imply provider manifests or scope changes can alter authority
  without fresh approval.
- Does any source let provider-defined capability vocabulary drift into policy or
  evidence judgment.

### Route if gap appears

- Provider-boundary seam gap: Wave 4b owner
- Authority-spine gap: `w4-s3`
- U9 if the gap is cross-wave and collector-oriented

## Scenario family 3 — privileged action leakage across seams

### Preconditions

- Runner holds privileged authority.
- Worker does not hold forge credentials or merge authority.

### Probe sequence

1. Worker requests a path functionally equivalent to push, PR, merge, or secret
   use.
2. Provider exposes convenience behavior that collapses runner and worker roles.
3. Forge behavior is framed as if it were worker-side authority rather than
   runner-side authority.

### Expected proof claims

- Agent seam exposes no privileged method.
- Forge seam remains runner-invoked only.
- Authorization still mediates privileged requests.

### Contradiction checks

- Does any source blur agent, runner, and forge authority boundaries.
- Does any source imply privileged action can be carried inside normal worker
  request flow.

### Route if gap appears

- Agent seam gap: `w4-s5`
- Forge seam gap: `w4-s7`
- Authority-spine gap: `w4-s3`

## Scenario family 4 — work-source bypass of plan-validated authority

### Preconditions

- Work source may originate candidates or provenance.
- Validated plan remains the only runtime scheduling input.

### Probe sequence

1. Work source supplies candidate work shaped as if already authorized to run.
2. Imported provenance is treated as if it modified plan authority or policy.
3. Source-originated content pressures the runner to skip plan-bound checks.

### Expected proof claims

- Work source never bypasses validated plan intake.
- Provenance/import behavior does not become a second authority channel.

### Contradiction checks

- Does any source allow work origin to function as runtime authorization.
- Does any source leave unclear whether provenance can alter policy/evidence
  expectations.

### Route if gap appears

- Work-source seam gap: `w4-s8`
- Plan/policy boundary gap: `w4-s2`
- U9 if cross-wave reconciliation is needed
