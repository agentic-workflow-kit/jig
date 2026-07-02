import assert from 'node:assert';
import { test } from 'vitest';
import { ProjectionError, projectRunEvents } from '../src/projection.js';
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
    planSnapshotRef: 'plan.snapshot.json',
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
          root: '/tmp/jig',
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
    redaction: 'safe-for-owner-record',
    export: 'redacted',
  });
  assert.strictEqual(projection.planSnapshotRef, 'plan.snapshot.json');
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

test('P4-AC-5: conflicting or ambiguous launch posture fails closed before inspect can project', () => {
  assert.throws(
    () =>
      projectRunEvents({
        eventsJsonl: stringifyJsonl([
          launchHeader({
            posture: {
              record: 'safe-for-owner-record',
              redaction: 'ambiguous',
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
      assert.match(error.message, /planId|binding|posture|planSnapshotRef/);
      return true;
    },
  );
});
