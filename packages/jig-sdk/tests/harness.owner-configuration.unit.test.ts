import assert from 'node:assert';
import { test } from 'vitest';
import { createInMemoryStoryWorkspaceIsolation, LocalHarness } from '../src/harness.js';
import { validatePlanForScheduling } from '../src/intake.js';
import { bindOwnerConfiguration } from '../src/owner-configuration.js';
import type { ConfigDoc, PolicyDoc, RepoPolicyFloorsDoc, RunEvent, Story, WorkProfileDoc } from '../src/types.js';

function workProfile(): WorkProfileDoc {
  return {
    version: 'work-profile-v0',
    workProfile: {
      id: 'work-profile-owner-config',
      model: 'gpt-5',
      effort: 'high',
      promptStrategy: 'role-prompt',
      roleRealization: 'planner-executor',
    },
  };
}

function repoPolicyFloors(rules: RepoPolicyFloorsDoc['repoPolicyFloors']['rules'] = {}): RepoPolicyFloorsDoc {
  return {
    version: 'repo-policy-floors-v0',
    repoPolicyFloors: {
      id: 'repo-floor-owner-config',
      rules,
    },
  };
}

function config(
  track: NonNullable<ConfigDoc['track']> = {
    id: 'TRACK-P06',
    workProfile: workProfile(),
    repoPolicyFloors: repoPolicyFloors(),
  },
): ConfigDoc {
  return {
    runner: {
      mode: 'local-dry-run',
      recordDir: 'runs',
    },
    drivers: {},
    track,
  };
}

function policy(rules: NonNullable<PolicyDoc['policy']>['rules'] = {}): PolicyDoc {
  return {
    version: 'policy-v0',
    policy: {
      id: 'policy-owner-config',
      rules: {
        allowLocalDryRun: true,
        ...rules,
      },
    },
  };
}

function recordCollector(): {
  events: RunEvent[];
  sink: { init: () => void; recordEvent: (event: unknown) => void; finalize: () => Promise<void> };
} {
  const events: RunEvent[] = [];
  return {
    events,
    sink: {
      init: () => {},
      recordEvent: (event) => events.push(event as RunEvent),
      finalize: async () => {},
    },
  };
}

test('P06-AC-3: repo floors tighten merge behavior observably by forcing open-pr over merge', async () => {
  const { events, sink } = recordCollector();
  const bound = bindOwnerConfiguration(
    config({
      id: 'TRACK-P06',
      workProfile: workProfile(),
      repoPolicyFloors: repoPolicyFloors({
        mergeSpectrum: 'open-pr',
      }),
    }),
    policy({
      mergeSpectrum: 'merge',
    }),
  );
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'success',
        evidence: { result: 'passed' },
      }),
    },
    sink,
    null,
    {
      ownerConfiguration: bound,
      forge: {
        land: async (request) => ({
          family: 'runner-action.opened-pr',
          storyId: request.storyId,
          action: request.action,
          landingKind: request.action,
          targetRef: 'refs/heads/feature/p06',
          targetHead: 'deadbeef',
        }),
      },
    },
  );

  const status = await harness.run(
    validatePlanForScheduling({
      plan: { id: 'plan-merge-spectrum', version: 'execution-plan-shape-v0', stories: [{ id: 'S1', title: 't1' }] },
    }),
    config(),
    policy({ mergeSpectrum: 'merge' }),
  );

  assert.strictEqual(status, 'success');
  assert.ok(
    events.find(
      (event) => event.family === 'runner-action.opened-pr' && event.action === 'open-pr' && event.storyId === 'S1',
    ),
  );
});

test('P06-AC-5: changed rule-governing files pause completion for owner re-approval with fresh evidence', async () => {
  const { events, sink } = recordCollector();
  const decisions: string[] = [];
  const harness = new LocalHarness(
    {
      execute: async () => ({
        outcome: 'success',
        changedFiles: ['policies/local.json'],
        evidence: { result: 'passed' },
      }),
    },
    sink,
    {
      decide: async (request) => {
        decisions.push((request as { kind?: string }).kind ?? 'unknown');
        return 'approve';
      },
    },
    {
      ownerConfiguration: bindOwnerConfiguration(
        config({
          id: 'TRACK-P06',
          workProfile: workProfile(),
          repoPolicyFloors: repoPolicyFloors({
            ruleGoverningSurfaces: ['policies/**'],
          }),
        }),
        policy({
          gatingPosture: 'assisted',
          ruleGoverningSurfaces: ['policies/**'],
        }),
      ),
    },
  );

  const status = await harness.run(
    validatePlanForScheduling({
      plan: {
        id: 'plan-guard2-reapproval',
        version: 'execution-plan-shape-v0',
        stories: [{ id: 'S1', title: 't1', scope: ['src/**'], authority: { requests: ['edit-files'] } }],
      },
    }),
    config(),
    policy({
      gatingPosture: 'assisted',
      ruleGoverningSurfaces: ['policies/**'],
    }),
  );

  assert.strictEqual(status, 'success');
  assert.deepStrictEqual(decisions, ['guard-2-reapproval']);
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.routed' && event.storyId === 'S1' && event.requestKind === 'guard-2-reapproval',
    ),
  );
  assert.ok(events.find((event) => event.family === 'story.parked' && event.reason === 'guard-2-reapproval-required'));
  assert.ok(
    events.find(
      (event) =>
        event.family === 'authorization.granted' &&
        event.storyId === 'S1' &&
        event.requestKind === 'guard-2-reapproval',
    ),
  );
  assert.ok(events.find((event) => event.family === 'story.done' && event.storyId === 'S1'));
});

test('P06-AC-6: throughput-leaning ISO-2 continues independent work and records the posture on the blocked story', async () => {
  const { events, sink } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async (story: Story) => {
        if (story.id === 'BLOCKED') {
          return {
            outcome: 'failure',
            evidence: { result: 'failed' },
            exitCode: 1,
          };
        }

        return {
          outcome: 'success',
          evidence: { result: 'passed' },
        };
      },
    },
    sink,
    null,
    {
      ownerConfiguration: bindOwnerConfiguration(
        config({
          id: 'TRACK-P06',
          workProfile: workProfile(),
          repoPolicyFloors: repoPolicyFloors(),
        }),
        policy({
          blockResolution: 'continue-independent-work',
        }),
      ),
    },
  );

  const status = await harness.run(
    validatePlanForScheduling({
      plan: {
        id: 'plan-throughput',
        version: 'execution-plan-shape-v0',
        stories: [
          { id: 'BLOCKED', title: 'blocked story' },
          { id: 'INDEPENDENT', title: 'independent story' },
        ],
      },
    }),
    config(),
    policy({
      blockResolution: 'continue-independent-work',
    }),
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' &&
        event.storyId === 'BLOCKED' &&
        event.blockResolutionPosture === 'continue-independent-work' &&
        event.resolutionConsequence === 'continued-independent-work',
    ),
  );
  assert.ok(events.find((event) => event.family === 'story.done' && event.storyId === 'INDEPENDENT'));
});

test('P06-AC-6: prevention-leaning ISO-2 quarantine stops launching later independent work', async () => {
  const { events, sink } = recordCollector();
  const harness = new LocalHarness(
    {
      execute: async (story: Story) => {
        if (story.id === 'BLOCKED') {
          return {
            outcome: 'failure',
            evidence: { result: 'failed' },
            exitCode: 1,
          };
        }

        assert.fail(`worker should not execute ${story.id}`);
      },
    },
    sink,
    null,
    {
      ownerConfiguration: bindOwnerConfiguration(
        config({
          id: 'TRACK-P06',
          workProfile: workProfile(),
          repoPolicyFloors: repoPolicyFloors(),
        }),
        policy({
          blockResolution: 'quarantine-replan',
        }),
      ),
    },
  );

  const status = await harness.run(
    validatePlanForScheduling({
      plan: {
        id: 'plan-quarantine',
        version: 'execution-plan-shape-v0',
        stories: [
          { id: 'BLOCKED', title: 'blocked story' },
          { id: 'LATER', title: 'later story' },
        ],
      },
    }),
    config(),
    policy({
      blockResolution: 'quarantine-replan',
    }),
  );

  assert.strictEqual(status, 'failure');
  assert.ok(
    events.find(
      (event) =>
        event.family === 'story.blocked' &&
        event.storyId === 'BLOCKED' &&
        event.blockResolutionPosture === 'quarantine-replan' &&
        event.resolutionConsequence === 'quarantined-run',
    ),
  );
  assert.ok(
    events.find(
      (event) => event.family === 'run.stopped' && Array.isArray(event.unstarted) && event.unstarted.includes('LATER'),
    ),
  );
});

test('P06-AC-1: concurrency ceiling bounds parallel worker execution in the harness', async () => {
  const { sink } = recordCollector();
  let active = 0;
  let maxActive = 0;
  const harness = new LocalHarness(
    {
      execute: async (story: Story) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
        return {
          storyId: story.id,
          outcome: 'success',
          evidence: { result: 'passed' },
        };
      },
    },
    sink,
    null,
    {
      ownerConfiguration: bindOwnerConfiguration(
        config({
          id: 'TRACK-P06',
          workProfile: workProfile(),
          repoPolicyFloors: repoPolicyFloors(),
        }),
        policy({
          concurrencyCeiling: 2,
        }),
      ),
      workspaceIsolation: createInMemoryStoryWorkspaceIsolation('/tmp/jig-p06-ceiling'),
    },
  );

  const status = await harness.run(
    validatePlanForScheduling({
      plan: {
        id: 'plan-concurrency',
        version: 'execution-plan-shape-v0',
        stories: [
          { id: 'S1', title: 't1' },
          { id: 'S2', title: 't2' },
          { id: 'S3', title: 't3' },
        ],
      },
    }),
    config(),
    policy({
      concurrencyCeiling: 2,
    }),
  );

  assert.strictEqual(status, 'success');
  assert.strictEqual(maxActive, 2);
});
