---
title: "ADR 0002 — Minimum policy posture: assisted (CFG-10 fixed category)"
status: applied
---

# ADR 0002 — Minimum policy posture: assisted (CFG-10 fixed category)

## Context

Frame Q2: minimum policy posture for v0.

## Decision

Accepted. Assisted posture lets the unattended dry-run exercise a genuine
authorize / deny / route decision end-to-end (manual would mostly produce "parked" records).
Independently corroborated by the prototype, which also structurally defers model-adjudicated
autonomy (reuse-log lesson 7).

## Consequences

The policy fixture encodes CFG-10's fixed category boundary; manual posture and any
model-adjudicated autonomy are deferred (STOP-004).

- Date: 2026-07-01
- Origin: M5a design slice
