import assert from 'node:assert';
import { test } from 'vitest';
import { askWhyFromEvents, ProjectionError, projectRunEvents, projectWatch } from '../src/projection.js';
import type { RunEvent, RunRecord } from '../src/types.js';

function launchHeader(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    family: 'run.started',
    actor: 'runner',
    timestamp: '2026-07-02T10:00:00.000Z',
    runId: 'run-plan-phase4-20260702-uuid',
    planId: 'plan-phase4',
    mode: 'local-dry-run',
    binding: {
      policyRef: 'policy:local-dry-run',
      configRef: 'mode=local-dry-run;recordDir=runs',
      workspace: {
        repoRoot: '/tmp/jig',
        head: '0123456789abcdef0123456789abcdef01234567',
        changeSetHash: 'workspace-clean',
      },
    },
    posture: {
      record: 'safe-for-owner-record',
      export: 'redacted',
    },
    planSnapshot: { ref: 'plan.snapshot.json' },
    policySnapshot: { ref: 'policy.snapshot.json' },
    ...overrides,
  };
}

function stringifyJsonl(events: RunEvent[]): string {
  return `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
}

function stoppedRunEvents(): RunEvent[] {
  return [
    launchHeader(),
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:01.000Z',
      storyId: 'STORY-1',
    },
    {
      family: 'authorization.requested',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:02.000Z',
      storyId: 'STORY-1',
      requestId: 'REQ-1',
      requestKind: 'edit-files',
    },
    {
      family: 'authorization.granted',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:03.000Z',
      storyId: 'STORY-1',
      requestId: 'REQ-1',
      requestKind: 'edit-files',
      basis: ['declared-request'],
    },
    {
      family: 'evidence.modeled',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:04.000Z',
      storyId: 'STORY-1',
      result: 'passed',
      changedFiles: ['src/projection.ts', 'tests/projection.unit.test.ts'],
    },
    {
      family: 'story.done',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:05.000Z',
      storyId: 'STORY-1',
      changedFiles: ['src/projection.ts', 'tests/projection.unit.test.ts'],
    },
    {
      family: 'runner-action.skipped-on-dry-run',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:06.000Z',
      storyId: 'STORY-1',
      action: 'push|open-pr|merge',
      reason: 'dry-run',
    },
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:07.000Z',
      storyId: 'STORY-2',
    },
    {
      family: 'authorization.requested',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:08.000Z',
      storyId: 'STORY-2',
      requestId: 'REQ-2',
      requestKind: 'edit-rule-governing-file',
    },
    {
      family: 'authorization.routed',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:09.000Z',
      storyId: 'STORY-2',
      requestId: 'REQ-2',
      requestKind: 'edit-rule-governing-file',
      basis: ['GUARD-2', 'rule-governing-surface'],
    },
    {
      family: 'story.parked',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:10.000Z',
      storyId: 'STORY-2',
      requestId: 'REQ-2',
      reason: 'owner-decision-required',
    },
    {
      family: 'run.stopped',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:11.000Z',
      reason: 'unattended-park',
      checkpoint: 'after:STORY-2.parked',
      unstarted: ['STORY-3'],
    },
  ];
}

function staleRunRecord(): RunRecord {
  return {
    run: {
      id: 'run-plan-phase4-20260702-uuid',
      attempt: 1,
      status: 'success',
      planId: 'plan-phase4',
      mode: 'local-dry-run',
      binding: {
        policyRef: 'policy:local-dry-run',
        configRef: 'mode=local-dry-run;recordDir=other-runs',
        workspace: {
          kind: 'git',
          repoRoot: '/tmp/jig',
          head: '0123456789abcdef0123456789abcdef01234567',
          changeSetHash: 'workspace-clean',
        },
      },
    },
    events: [launchHeader()],
  };
}

test('P4-AC-4: happy replay projects authoritative launch metadata, story states, checkpoint, notices, and changed files', () => {
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl(stoppedRunEvents()),
  });

  assert.strictEqual(projection.runId, 'run-plan-phase4-20260702-uuid');
  assert.strictEqual(projection.planId, 'plan-phase4');
  assert.strictEqual(projection.mode, 'local-dry-run');
  assert.deepStrictEqual(projection.binding, {
    policyRef: 'policy:local-dry-run',
    configRef: 'mode=local-dry-run;recordDir=runs',
    workspace: {
      repoRoot: '/tmp/jig',
      head: '0123456789abcdef0123456789abcdef01234567',
      changeSetHash: 'workspace-clean',
    },
  });
  assert.deepStrictEqual(projection.workspace, {
    repoRoot: '/tmp/jig',
    head: '0123456789abcdef0123456789abcdef01234567',
    changeSetHash: 'workspace-clean',
  });
  assert.deepStrictEqual(projection.posture, {
    record: 'safe-for-owner-record',
    export: 'redacted',
  });
  assert.strictEqual(projection.planSnapshotRef, 'plan.snapshot.json');
  assert.strictEqual(projection.policySnapshotRef, 'policy.snapshot.json');
  assert.strictEqual(projection.status, 'failure');
  assert.strictEqual(projection.lifecycleState, 'stopped');
  assert.strictEqual(projection.stopCause, 'unattended-park');
  assert.strictEqual(projection.safeCheckpoint, 'after:STORY-2.parked');
  assert.deepStrictEqual(projection.unstartedStoryIds, ['STORY-3']);
  assert.deepStrictEqual(projection.changedFiles, ['src/projection.ts', 'tests/projection.unit.test.ts']);
  assert.strictEqual(projection.stories['STORY-1']?.state, 'done');
  assert.deepStrictEqual(projection.stories['STORY-1']?.changedFiles, [
    'src/projection.ts',
    'tests/projection.unit.test.ts',
  ]);
  assert.strictEqual(projection.stories['STORY-2']?.state, 'parked');
  assert.deepStrictEqual(
    projection.notices.map((notice) => notice.code),
    ['unattended-park'],
  );
  assert.deepStrictEqual(projection.diagnostics, []);
});

test('P4-AC-5: valid launch-header posture allows events-only inspect projection without run.json', () => {
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl(stoppedRunEvents()),
    runRecord: null,
  });

  assert.strictEqual(projection.status, 'failure');
  assert.strictEqual(projection.safeCheckpoint, 'after:STORY-2.parked');
  assert.strictEqual(projection.posture.record, 'safe-for-owner-record');
  assert.strictEqual(projection.posture.export, 'redacted');
  assert.deepStrictEqual(projection.diagnostics, []);
});

test('P4-AC-4: stale run.json conflicts are diagnosed while events.jsonl still wins', () => {
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl(stoppedRunEvents()),
    runRecord: staleRunRecord(),
  });

  assert.strictEqual(projection.status, 'failure');
  assert.strictEqual(projection.stopCause, 'unattended-park');
  assert.ok(projection.diagnostics.find((diagnostic) => diagnostic.code === 'run.json-stale'));
});

test('P4-AC-4: matching run.json adds no stale diagnostic', () => {
  const events = stoppedRunEvents();
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl(events),
    runRecord: {
      run: {
        id: 'run-plan-phase4-20260702-uuid',
        attempt: 1,
        status: 'failure',
        planId: 'plan-phase4',
        mode: 'local-dry-run',
        binding: {
          policyRef: 'policy:local-dry-run',
          configRef: 'mode=local-dry-run;recordDir=runs',
          workspace: {
            repoRoot: '/tmp/jig',
            head: '0123456789abcdef0123456789abcdef01234567',
            changeSetHash: 'workspace-clean',
          },
        },
        posture: {
          record: 'safe-for-owner-record',
          export: 'redacted',
        },
        planSnapshot: { ref: 'plan.snapshot.json' },
        policySnapshot: { ref: 'policy.snapshot.json' },
      },
      events,
    },
  });

  assert.deepStrictEqual(projection.diagnostics, []);
});

test('P05 MERGE-4: replay accepts a held-merge story.done update without changing the story state', () => {
  const events = [
    ...stoppedRunEvents().slice(0, 7),
    {
      family: 'story.done',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:06.500Z',
      storyId: 'STORY-1',
      action: 'merge',
      landingKind: 'merge',
      outcome: 'done-not-landed',
      mergeability: 'held-by-review',
      targetRef: 'refs/heads/phase-7',
      targetHead: 'held-head',
    },
    ...stoppedRunEvents().slice(7),
  ];

  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl(events),
  });

  assert.strictEqual(projection.stories['STORY-1']?.state, 'done');
  assert.strictEqual(projection.stories['STORY-1']?.lastEventFamily, 'story.done');
});

test('P4-AC-4: stale run.json reports all conflicting immutable launch facts', () => {
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl(stoppedRunEvents()),
    runRecord: {
      run: {
        id: 'other-run',
        attempt: 1,
        status: 'success',
        planId: 'other-plan',
        mode: 'other-mode',
        binding: {
          policyRef: 'other-policy',
          configRef: 'mode=other',
          workspace: {
            repoRoot: '/tmp/other',
            head: 'other-head',
            changeSetHash: 'other-hash',
          },
        },
        planSnapshot: { ref: 'other-plan.snapshot.json' },
        policySnapshot: { ref: 'other-policy.snapshot.json' },
      },
      events: [],
    },
  });

  const stale = projection.diagnostics.find((diagnostic) => diagnostic.code === 'run.json-stale');
  assert.deepStrictEqual(stale?.details, [
    'run.id',
    'run.planId',
    'run.status',
    'run.mode',
    'run.planSnapshot.ref',
    'run.policySnapshot.ref',
    'run.binding.policyRef',
    'run.binding.configRef',
    'run.binding.workspace',
    'events',
  ]);
});

test('P4-AC-4: malformed events.jsonl line fails closed with line and offset context', () => {
  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: `${JSON.stringify(launchHeader())}\n{"family":\n`,
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'malformed-jsonl-line');
      assert.strictEqual(error.line, 2);
      assert.strictEqual(error.offset, JSON.stringify(launchHeader()).length + 1);
      return true;
    },
  );
});

test('P4-AC-4: empty and structurally invalid events.jsonl lines fail closed', () => {
  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: `${JSON.stringify(launchHeader())}\n\n`,
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'malformed-jsonl-line');
      assert.strictEqual(error.line, 2);
      return true;
    },
  );

  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: `${JSON.stringify(launchHeader())}\n[]\n`,
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'malformed-jsonl-line');
      assert.strictEqual(error.line, 2);
      return true;
    },
  );

  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: '',
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'missing-launch-metadata');
      return true;
    },
  );
});

test('P4-AC-4: missing actor fails closed before projection continues', () => {
  const events = stoppedRunEvents();
  events[1] = {
    ...events[1],
    actor: undefined,
  };

  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl(events),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'missing-actor');
      assert.strictEqual(error.line, 2);
      return true;
    },
  );
});

test('P4-AC-4: run.stopped without a checkpoint is a diagnosable projection defect', () => {
  const events = stoppedRunEvents();
  events[events.length - 1] = {
    ...events[events.length - 1],
    checkpoint: undefined,
  };

  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl(events),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'missing-stop-checkpoint');
      assert.strictEqual(error.line, events.length);
      return true;
    },
  );
});

test('P4-AC-4: illegal replay transitions fail closed instead of inventing a merged history', () => {
  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([
          launchHeader(),
          {
            family: 'story.done',
            actor: 'runner',
            timestamp: '2026-07-02T10:00:01.000Z',
            storyId: 'STORY-1',
          },
        ]),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'illegal-transition');
      assert.strictEqual(error.line, 2);
      return true;
    },
  );
});

test('P4-AC-4: replay rejects duplicate launches, unsupported families, and events after stop or completion', () => {
  for (const events of [
    [launchHeader(), launchHeader()],
    [
      launchHeader(),
      { family: 'story.started', actor: 'runner', storyId: 'STORY-1' },
      { family: 'unknown.event', actor: 'runner', storyId: 'STORY-1' },
    ],
    [...stoppedRunEvents(), { family: 'story.started', actor: 'runner', storyId: 'STORY-3' }],
    [
      launchHeader(),
      { family: 'run.completed', actor: 'runner' },
      { family: 'story.started', actor: 'runner', storyId: 'STORY-1' },
    ],
  ] as RunEvent[][]) {
    assert.throws(
      () =>
        projectRunEvents({
          eventsJsonl: stringifyJsonl(events),
        }),
      (error: unknown) => {
        assert.ok(error instanceof ProjectionError);
        assert.strictEqual(error.code, 'illegal-transition');
        return true;
      },
    );
  }
});

test('P4-AC-4: run resume and completion replay from a stopped checkpoint', () => {
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl([
      ...stoppedRunEvents(),
      {
        family: 'run.resumed',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:12.000Z',
        runId: 'run-plan-phase4-20260702-uuid',
        checkpoint: 'after:STORY-2.parked',
        stopCause: 'unattended-park',
      },
      {
        family: 'authorization.granted',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:13.000Z',
        storyId: 'STORY-2',
        requestId: 'REQ-2',
      },
      {
        family: 'evidence.modeled',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:15.000Z',
        storyId: 'STORY-2',
        changedFiles: ['src/projection.ts', 'src/projection.ts', 42] as unknown as string[],
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:16.000Z',
        storyId: 'STORY-2',
      },
      {
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:17.000Z',
      },
    ]),
  });

  assert.strictEqual(projection.status, 'success');
  assert.strictEqual(projection.lifecycleState, 'completed');
  assert.deepStrictEqual(projection.changedFiles, ['src/projection.ts', 'tests/projection.unit.test.ts']);
  assert.strictEqual(projection.stories['STORY-2']?.state, 'done');
});

test('P9-AC-2: projection accepts run-scope re-approval evidence before run.resumed', () => {
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl([
      ...stoppedRunEvents(),
      {
        family: 'authorization.granted',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:12.000Z',
        requestId: 'resume-changed-basis',
        requestKind: 'resume-changed-basis',
        reason: 'resume-changed-basis-approved',
        basis: ['owner-approval'],
      },
      {
        family: 'run.resumed',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:13.000Z',
        runId: 'run-plan-phase4-20260702-uuid',
        checkpoint: 'after:STORY-2.parked',
        stopCause: 'unattended-park',
      },
      {
        family: 'authorization.granted',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:14.000Z',
        storyId: 'STORY-2',
        requestId: 'REQ-2',
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:15.000Z',
        storyId: 'STORY-2',
      },
      {
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:16.000Z',
      },
    ]),
  });

  assert.strictEqual(projection.status, 'success');
  assert.strictEqual(projection.lifecycleState, 'completed');
  assert.strictEqual(projection.stories['STORY-2']?.state, 'done');
});

test('P4-AC-1: replay permits repeatable in-progress work to restart after run.resumed', () => {
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl([
      launchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:02.000Z',
        storyId: 'STORY-2',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:03.000Z',
        storyId: 'STORY-1',
        reason: 'worker-reported-failure',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:04.000Z',
        reason: 'work-item-blocked',
        checkpoint: 'after:STORY-1',
        unstarted: ['STORY-2'],
      },
      {
        family: 'run.resumed',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:05.000Z',
        runId: 'run-plan-phase4-20260702-uuid',
        checkpoint: 'after:STORY-1',
      },
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:06.000Z',
        storyId: 'STORY-2',
      },
      {
        family: 'evidence.modeled',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:07.000Z',
        storyId: 'STORY-2',
        result: 'passed',
      },
      {
        family: 'story.done',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:08.000Z',
        storyId: 'STORY-2',
      },
      {
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:09.000Z',
      },
    ]),
  });

  assert.strictEqual(projection.status, 'success');
  assert.strictEqual(projection.stories['STORY-2']?.state, 'done');
});

test('P4-AC-4: unsafe stop checkpoints and run-level resume from active state fail closed', () => {
  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([
          launchHeader(),
          {
            family: 'run.stopped',
            actor: 'runner',
            timestamp: '2026-07-02T10:00:01.000Z',
            reason: 'work-item-blocked',
            checkpoint: 'before:STORY-1',
          },
        ]),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'illegal-transition');
      return true;
    },
  );

  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([launchHeader(), { family: 'run.resumed', actor: 'runner' }]),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'illegal-transition');
      return true;
    },
  );
});

test('P4-AC-5: conflicting or ambiguous launch posture fails closed before inspect can project', () => {
  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([
          launchHeader({
            posture: {
              record: 'ambiguous',
              export: 'redacted',
            } as unknown as RunEvent['posture'],
          }),
        ]),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'invalid-posture');
      assert.strictEqual(error.line, 1);
      assert.match(error.message, /ambiguous|conflict/i);
      return true;
    },
  );
});

test('P4-AC-5: missing, unsupported, or ambiguous launch posture variants fail closed', () => {
  for (const posture of [
    { export: 'redacted' },
    { record: 'unknown', export: 'redacted' },
    { record: 'unsafe', export: 'redacted' },
    { record: 'safe-for-owner-record', export: 'ambiguous' },
    { record: 'safe-for-owner-record', export: 'plain' },
  ] as unknown as RunEvent['posture'][]) {
    assert.throws(
      () =>
        projectRunEvents({
          eventsJsonl: stringifyJsonl([
            launchHeader({
              posture,
            }),
          ]),
        }),
      (error: unknown) => {
        assert.ok(error instanceof ProjectionError);
        assert.match(error.code, /missing-launch-metadata|invalid-posture/);
        return true;
      },
    );
  }
});

test('P4-AC-4: launch header accepts snapshot refs from artifact objects', () => {
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl([
      launchHeader({
        binding: {
          policyRef: 'policy:local-dry-run',
          configRef: 'mode=local-dry-run;recordDir=runs',
          workspace: {
            kind: 'git',
            repoRoot: '/tmp/jig',
            head: '0123456789abcdef0123456789abcdef01234567',
            changeSetHash: 'workspace-clean',
          },
        },
        planSnapshot: { ref: 'record-artifact:run/plan.snapshot.json' },
        policySnapshot: { ref: 'record-artifact:run/policy.snapshot.json' },
      }),
    ]),
  });

  assert.strictEqual(projection.workspace.repoRoot, '/tmp/jig');
  assert.strictEqual(projection.planSnapshotRef, 'record-artifact:run/plan.snapshot.json');
  assert.strictEqual(projection.policySnapshotRef, 'record-artifact:run/policy.snapshot.json');
});

test('P4-AC-4: story-scoped events without storyId fail closed', () => {
  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([launchHeader(), { family: 'story.started', actor: 'runner' }]),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'missing-story-id');
      return true;
    },
  );
});

test('P4-AC-5: projection derives evidence, denial, and unattended-park notices from recorded facts only', () => {
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl([
      launchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:01.000Z',
        storyId: 'STORY-1',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:02.000Z',
        storyId: 'STORY-1',
        reason: 'evidence-gate-failed',
      },
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:03.000Z',
        storyId: 'STORY-2',
      },
      {
        family: 'authorization.denied',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:04.000Z',
        storyId: 'STORY-2',
        requestId: 'REQ-2',
        reason: 'policy denied request',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:05.000Z',
        storyId: 'STORY-2',
        reason: 'authorization-denied',
      },
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:06.000Z',
        storyId: 'STORY-3',
      },
      {
        family: 'story.parked',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:07.000Z',
        storyId: 'STORY-3',
        requestId: 'REQ-3',
        reason: 'owner-decision-required',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:08.000Z',
        reason: 'unattended-park',
        checkpoint: 'after:STORY-3.parked',
        unstarted: [],
      },
    ]),
  });

  assert.deepStrictEqual(
    projection.notices.map((notice) => notice.code),
    ['unattended-park', 'evidence-gate-failure', 'policy-authorization-denial'],
  );
  assert.ok(projection.notices.every((notice) => !notice.code.startsWith('resume-blocked-')));
});

test('P4-AC-4: legacy or incomplete run.started launch headers are rejected when replay metadata is missing', () => {
  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([
          {
            family: 'run.started',
            actor: 'runner',
            timestamp: '2026-07-02T10:00:00.000Z',
            runId: 'run-legacy',
          },
        ]),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'missing-launch-metadata');
      assert.match(error.message, /planId|binding|posture|planSnapshot/);
      return true;
    },
  );
});

test('P08-AC-1/2: watch groups story posture and reflects durable notice attention events', () => {
  const projection = projectWatch({
    eventsJsonl: stringifyJsonl([
      ...stoppedRunEvents(),
      {
        family: 'notice.snoozed',
        actor: 'owner',
        timestamp: '2026-07-02T10:00:10.000Z',
        noticeId: 'unattended-park',
        snoozedUntil: '2026-07-02T11:00:00.000Z',
      },
    ]),
  });

  assert.strictEqual(projection.signal, 'parked');
  assert.deepStrictEqual(
    projection.groups.done.map((story) => story.storyId),
    ['STORY-1'],
  );
  assert.deepStrictEqual(
    projection.groups.parked.map((story) => story.storyId),
    ['STORY-2'],
  );
  assert.strictEqual(projection.notices[0]?.id, 'unattended-park');
  assert.strictEqual(projection.notices[0]?.state, 'snoozed');
  assert.strictEqual(projection.notices[0]?.snoozedUntil, '2026-07-02T11:00:00.000Z');
});

test('P08-AC-1: watch shows never-started run.stopped.unstarted stories as waiting', () => {
  const projection = projectWatch({
    eventsJsonl: stringifyJsonl(stoppedRunEvents()),
  });

  assert.deepStrictEqual(
    projection.groups.waiting.map((story) => story.storyId),
    ['STORY-3'],
  );
  assert.strictEqual(projection.groups.waiting[0]?.state, 'unstarted');
  assert.strictEqual(projection.groups.waiting[0]?.lastEventFamily, 'run.stopped');
});

test('P08-AC-2: acknowledged notices persist as owner records without changing story state', () => {
  const projection = projectRunEvents({
    eventsJsonl: stringifyJsonl([
      ...stoppedRunEvents(),
      {
        family: 'notice.acknowledged',
        actor: 'owner',
        timestamp: '2026-07-02T10:00:10.000Z',
        noticeId: 'unattended-park',
      },
    ]),
  });

  assert.strictEqual(projection.stories['STORY-2']?.state, 'parked');
  assert.strictEqual(projection.notices[0]?.id, 'unattended-park');
  assert.strictEqual(projection.notices[0]?.state, 'acknowledged');
});

test('P09-AC-1/2: owner decision records replay without changing projected story state', () => {
  const eventsJsonl = stringifyJsonl([
    ...stoppedRunEvents(),
    {
      family: 'owner-decision.recorded',
      actor: 'owner',
      timestamp: '2026-07-02T10:00:10.000Z',
      storyId: 'STORY-2',
      outcome: 'approve',
      requestId: 'REQ-2',
      requestKind: 'edit-files',
    },
  ]);

  const projection = projectRunEvents({ eventsJsonl });
  const answer = askWhyFromEvents({ eventsJsonl, storyId: 'STORY-2' });

  assert.strictEqual(projection.stories['STORY-2']?.state, 'parked');
  assert.strictEqual(projection.lifecycleState, 'stopped');
  assert.ok(answer.citations.some((citation) => citation.family === 'owner-decision.recorded'));
});

test('P09-AC-1/2: owner decision records must be owner-scoped and story-scoped', () => {
  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([
          ...stoppedRunEvents(),
          {
            family: 'owner-decision.recorded',
            actor: 'runner',
            timestamp: '2026-07-02T10:00:10.000Z',
            storyId: 'STORY-2',
            outcome: 'approve',
          },
        ]),
      }),
    /owner-decision\.recorded on line \d+ must be recorded by actor owner/,
  );

  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([
          ...stoppedRunEvents(),
          {
            family: 'owner-decision.recorded',
            actor: 'owner',
            timestamp: '2026-07-02T10:00:10.000Z',
            outcome: 'approve',
          },
        ]),
      }),
    /owner-decision\.recorded on line \d+ is missing required storyId/,
  );
});

test('P08-AC-3: ask-why explains blocked, done, and parked stories from cited records', () => {
  const eventsJsonl = stringifyJsonl([
    launchHeader(),
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:01.000Z',
      storyId: 'STORY-DONE',
    },
    {
      family: 'evidence.modeled',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:02.000Z',
      storyId: 'STORY-DONE',
      result: 'passed',
      changedFiles: ['src/done.ts'],
    },
    {
      family: 'story.done',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:03.000Z',
      storyId: 'STORY-DONE',
      changedFiles: ['src/done.ts'],
    },
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:04.000Z',
      storyId: 'STORY-BLOCKED',
    },
    {
      family: 'story.blocked',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:05.000Z',
      storyId: 'STORY-BLOCKED',
      reason: 'evidence-gate-failed',
    },
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:06.000Z',
      storyId: 'STORY-PARKED',
    },
    {
      family: 'story.parked',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:07.000Z',
      storyId: 'STORY-PARKED',
      reason: 'owner-decision-required',
    },
    {
      family: 'run.stopped',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:08.000Z',
      reason: 'unattended-park',
      checkpoint: 'after:STORY-PARKED.parked',
      unstarted: [],
    },
  ]);

  const blocked = askWhyFromEvents({ eventsJsonl, storyId: 'STORY-BLOCKED' });
  assert.match(blocked.answer, /blocked because evidence-gate-failed/);
  assert.ok(blocked.citations.some((citation) => citation.family === 'story.blocked' && citation.line === 6));

  const done = askWhyFromEvents({ eventsJsonl, storyId: 'STORY-DONE' });
  assert.match(done.answer, /story.done transition completed/);
  assert.ok(done.citations.some((citation) => citation.family === 'evidence.modeled'));

  const parked = askWhyFromEvents({ eventsJsonl, storyId: 'STORY-PARKED' });
  assert.match(parked.answer, /parked waiting for owner attention/);
  assert.ok(parked.citations.some((citation) => citation.family === 'story.parked'));
});

test('P08-AC-1: watch emits finished, blocked, progressing, and idle signals from records', () => {
  const completed = projectWatch({
    eventsJsonl: stringifyJsonl([
      launchHeader(),
      {
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:01.000Z',
      },
    ]),
  });
  assert.strictEqual(completed.signal, 'finished');

  const blocked = projectWatch({
    eventsJsonl: stringifyJsonl([
      launchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:01.000Z',
        storyId: 'STORY-BLOCKED',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:02.000Z',
        storyId: 'STORY-BLOCKED',
        reason: 'worker-reported-failure',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:03.000Z',
        reason: 'work-item-blocked',
        checkpoint: 'after:STORY-BLOCKED',
        unstarted: [],
      },
    ]),
  });
  assert.strictEqual(blocked.signal, 'blocked');

  const progressing = projectWatch({
    eventsJsonl: stringifyJsonl([
      launchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:01.000Z',
        storyId: 'STORY-ACTIVE',
      },
    ]),
  });
  assert.strictEqual(progressing.signal, 'progressing');

  const idle = projectWatch({ eventsJsonl: stringifyJsonl([launchHeader()]) });
  assert.strictEqual(idle.signal, 'idle');
});

test('P08-AC-3: ask-why explains run-level terminal and non-terminal states', () => {
  const completed = askWhyFromEvents({
    eventsJsonl: stringifyJsonl([
      launchHeader(),
      {
        family: 'run.completed',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:01.000Z',
      },
    ]),
  });
  assert.match(completed.answer, /run completed/);
  assert.ok(completed.citations.some((citation) => citation.family === 'run.completed'));

  const stopped = askWhyFromEvents({
    eventsJsonl: stringifyJsonl([
      launchHeader(),
      {
        family: 'story.started',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:01.000Z',
        storyId: 'STORY-BLOCKED',
      },
      {
        family: 'story.blocked',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:02.000Z',
        storyId: 'STORY-BLOCKED',
        reason: 'worker-reported-failure',
      },
      {
        family: 'run.stopped',
        actor: 'runner',
        timestamp: '2026-07-02T10:00:03.000Z',
        reason: 'work-item-blocked',
        checkpoint: 'after:STORY-BLOCKED',
        unstarted: [],
      },
    ]),
  });
  assert.match(stopped.answer, /stopped at after:STORY-BLOCKED because work-item-blocked/);

  const running = askWhyFromEvents({ eventsJsonl: stringifyJsonl([launchHeader()]) });
  assert.match(running.answer, /run is started/);
});

test('P08-AC-3: ask-why covers landing, active, waiting, and unknown story cases', () => {
  const eventsJsonl = stringifyJsonl([
    launchHeader(),
    {
      family: 'story.blocked',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:01.000Z',
      storyId: 'STORY-WAITING',
      blockedBy: 'STORY-DONE',
    },
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:02.000Z',
      storyId: 'STORY-DONE',
    },
    {
      family: 'story.done',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:03.000Z',
      storyId: 'STORY-DONE',
    },
    {
      family: 'runner-action.merged',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:04.000Z',
      storyId: 'STORY-DONE',
      targetRef: 'main',
      targetHead: 'abc123',
    },
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:05.000Z',
      storyId: 'STORY-ACTIVE',
    },
  ]);

  const landed = askWhyFromEvents({ eventsJsonl, storyId: 'STORY-DONE' });
  assert.match(landed.answer, /recorded landing activity/);

  const active = askWhyFromEvents({ eventsJsonl, storyId: 'STORY-ACTIVE' });
  assert.match(active.answer, /is progressing/);

  const waiting = askWhyFromEvents({ eventsJsonl, storyId: 'STORY-WAITING' });
  assert.match(waiting.answer, /blocked because blocked by STORY-DONE/);

  assert.throws(() => askWhyFromEvents({ eventsJsonl, storyId: 'STORY-MISSING' }), /No recorded story/);
});

test('P08-AC-2: malformed notice attention records fail closed', () => {
  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([
          ...stoppedRunEvents(),
          {
            family: 'notice.acknowledged',
            actor: 'owner',
            timestamp: '2026-07-02T10:00:10.000Z',
          },
        ]),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'missing-notice-id');
      return true;
    },
  );

  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([
          ...stoppedRunEvents(),
          {
            family: 'notice.acknowledged',
            actor: 'runner',
            timestamp: '2026-07-02T10:00:10.000Z',
            noticeId: 'unattended-park',
          },
        ]),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'invalid-notice-actor');
      return true;
    },
  );

  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([
          ...stoppedRunEvents(),
          {
            family: 'notice.snoozed',
            actor: 'owner',
            timestamp: '2026-07-02T10:00:10.000Z',
            noticeId: 'unattended-park',
          },
        ]),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectionError);
      assert.strictEqual(error.code, 'missing-snoozed-until');
      return true;
    },
  );
});

test('P08-AC-3: blocked PR surfacing records remain explainable citations', () => {
  const eventsJsonl = stringifyJsonl([
    launchHeader(),
    {
      family: 'story.started',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:01.000Z',
      storyId: 'STORY-BLOCKED',
    },
    {
      family: 'story.blocked',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:02.000Z',
      storyId: 'STORY-BLOCKED',
      reason: 'worker-reported-failure',
    },
    {
      family: 'story.blocked',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:03.000Z',
      storyId: 'STORY-BLOCKED',
      reason: 'pr-surfacing-failed',
    },
    {
      family: 'runner-action.opened-pr',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:04.000Z',
      storyId: 'STORY-BLOCKED',
    },
    {
      family: 'runner-action.posted-status',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:05.000Z',
      storyId: 'STORY-BLOCKED',
    },
    {
      family: 'runner-action.posted-comment',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:06.000Z',
      storyId: 'STORY-BLOCKED',
    },
    {
      family: 'run.stopped',
      actor: 'runner',
      timestamp: '2026-07-02T10:00:07.000Z',
      reason: 'work-item-blocked',
      checkpoint: 'after:STORY-BLOCKED',
      unstarted: [],
    },
  ]);

  const projection = projectRunEvents({ eventsJsonl });
  assert.strictEqual(projection.stories['STORY-BLOCKED']?.lastEventFamily, 'runner-action.posted-comment');

  const why = askWhyFromEvents({ eventsJsonl, storyId: 'STORY-BLOCKED' });
  assert.match(why.answer, /blocked because pr-surfacing-failed/);
  assert.ok(why.citations.some((citation) => citation.family === 'runner-action.opened-pr'));
});
