import assert from 'node:assert';
import { test } from 'vitest';
import { bindOwnerConfiguration, createDefaultOwnerConfiguration } from '../src/owner-configuration.js';
import type {
  BoundOwnerConfiguration,
  ConfigDoc,
  PolicyDoc,
  RepoPolicyFloorsDoc,
  WorkProfileDoc,
} from '../src/types.js';

function config(overrides: Partial<ConfigDoc> = {}): ConfigDoc {
  return {
    runner: {
      mode: 'local-dry-run',
      recordDir: 'runs',
    },
    drivers: {},
    track: {
      id: 'TRACK-P06',
    },
    ...overrides,
  };
}

function policy(overrides: Partial<PolicyDoc> = {}): PolicyDoc {
  const mergedRules = {
    allowLocalDryRun: true,
    gatingPosture: 'assisted',
    mergeSpectrum: 'merge',
    concurrencyCeiling: 4,
    retryBudget: 3,
    requiredReviews: ['owner'],
    escalationRules: {
      pauseOnOwnerDecision: 'required',
    },
    blockResolution: 'continue-independent-work',
    ruleGoverningSurfaces: ['policies/**'],
    ...overrides.policy?.rules,
  } satisfies NonNullable<NonNullable<PolicyDoc['policy']>['rules']>;

  return {
    version: 'policy-v0',
    policy: {
      id: 'policy-p06',
      ...overrides.policy,
      rules: mergedRules,
    },
  };
}

function workProfile(overrides: Partial<WorkProfileDoc> = {}): WorkProfileDoc {
  return {
    version: 'work-profile-v0',
    workProfile: {
      id: 'work-profile-p06',
      model: 'gpt-5',
      effort: 'high',
      promptStrategy: 'role-prompt',
      roleRealization: 'planner-executor',
      ...overrides.workProfile,
    },
  };
}

function repoPolicyFloors(overrides: Partial<RepoPolicyFloorsDoc> = {}): RepoPolicyFloorsDoc {
  const mergedRules = {
    gatingPosture: 'manual',
    mergeSpectrum: 'open-pr',
    concurrencyCeiling: 2,
    blockResolution: 'quarantine-replan',
    ruleGoverningSurfaces: ['.github/**'],
    ...overrides.repoPolicyFloors?.rules,
  } satisfies NonNullable<RepoPolicyFloorsDoc['repoPolicyFloors']['rules']>;

  return {
    version: 'repo-policy-floors-v0',
    repoPolicyFloors: {
      id: 'repo-floor-p06',
      ...overrides.repoPolicyFloors,
      rules: mergedRules,
    },
  };
}

function effective(bound: BoundOwnerConfiguration): PolicyDoc {
  return bound.effectivePolicy;
}

test('P06-AC-1: binding policy + work profile + repo floors yields an effective floor-merged policy basis', () => {
  const bound = bindOwnerConfiguration(
    config({
      track: {
        id: 'TRACK-P06',
        workProfile: workProfile(),
        repoPolicyFloors: repoPolicyFloors(),
      },
    }),
    policy(),
  );

  assert.strictEqual(bound.trackRef, 'TRACK-P06');
  assert.strictEqual(bound.policy.policy?.id, 'policy-p06');
  assert.strictEqual(bound.workProfile?.workProfile.id, 'work-profile-p06');
  assert.strictEqual(bound.repoPolicyFloors?.repoPolicyFloors.id, 'repo-floor-p06');
  assert.deepStrictEqual(effective(bound).policy?.rules, {
    allowLocalDryRun: true,
    gatingPosture: 'manual',
    mergeSpectrum: 'open-pr',
    concurrencyCeiling: 2,
    retryBudget: 3,
    requiredReviews: ['owner'],
    escalationRules: {
      pauseOnOwnerDecision: 'required',
    },
    blockResolution: 'quarantine-replan',
    ruleGoverningSurfaces: ['policies/**', '.github/**'],
  });
  assert.deepStrictEqual(effective(bound).policy?.basis?.tightenedByRepoFloors, [
    'gatingPosture',
    'mergeSpectrum',
    'concurrencyCeiling',
    'blockResolution',
    'ruleGoverningSurfaces',
  ]);
  assert.deepStrictEqual(effective(bound).policy?.basis?.inertDimensions, [
    { dimension: 'retryBudget', followUp: 'retry-execution-engine' },
    { dimension: 'requiredReviews', followUp: 'required-review-evidence' },
    { dimension: 'escalationRules', followUp: 'doorbell-escalation-policy-surface' },
  ]);
});

test('P06-AC-2: a work profile cannot carry policy-owned fields that would weaken the safety floor', () => {
  assert.throws(
    () =>
      bindOwnerConfiguration(
        config({
          track: {
            id: 'TRACK-P06',
            workProfile: workProfile({
              workProfile: {
                id: 'work-profile-invalid',
                model: 'gpt-5',
                effort: 'medium',
                gatingPosture: 'assisted',
              } as WorkProfileDoc['workProfile'] & { gatingPosture: 'assisted' },
            }),
          },
        }),
        policy({
          policy: {
            rules: {
              gatingPosture: 'manual',
            },
          },
        }),
      ),
    /workProfile\.gatingPosture.*policy-owned.*gatingPosture/i,
  );
});

test('P06-AC-7: default owner configuration remains explicit and non-governing when the extra artifacts are absent', () => {
  const bound = createDefaultOwnerConfiguration(config({ track: undefined }), policy());

  assert.strictEqual(bound.trackRef, undefined);
  assert.strictEqual(bound.workProfile, undefined);
  assert.strictEqual(bound.repoPolicyFloors, undefined);
  assert.strictEqual(bound.persistExtendedBindings, false);
  assert.deepStrictEqual(bound.effectivePolicy.policy?.basis?.tightenedByRepoFloors, []);
});

test('P06-AC-3: repo floors can tighten allowLocalDryRun and capability isolation', () => {
  const bound = bindOwnerConfiguration(
    config({
      track: {
        id: 'TRACK-P06',
        workProfile: workProfile(),
        repoPolicyFloors: repoPolicyFloors({
          repoPolicyFloors: {
            id: 'repo-floor-p06',
            rules: {
              allowLocalDryRun: false,
              capabilityIsolation: {
                'filesystem-edit': 'strong',
              },
            },
          },
        }),
      },
    }),
    policy({
      policy: {
        rules: {
          allowLocalDryRun: true,
          capabilityIsolation: {
            'filesystem-edit': 'weak',
          },
        },
      },
    }),
  );

  assert.strictEqual(bound.effectivePolicy.policy?.rules?.allowLocalDryRun, false);
  assert.deepStrictEqual(bound.effectivePolicy.policy?.rules?.capabilityIsolation, {
    'filesystem-edit': 'strong',
  });
  assert.ok(bound.effectivePolicy.policy?.basis?.tightenedByRepoFloors?.includes('allowLocalDryRun'));
  assert.ok(bound.effectivePolicy.policy?.basis?.tightenedByRepoFloors?.includes('capabilityIsolation'));
});

test('P06-AC-7: policy validation refuses malformed policy dimensions with field-specific guidance', () => {
  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        version: 'policy-v0',
        policy: {
          id: 'invalid-policy',
          rules: {
            allowLocalDryRun: true,
            gatingPosture: 'autonomous',
          },
        },
      } as unknown as PolicyDoc),
    /policy\.policy\.rules\.gatingPosture/,
  );
});

test('P06-AC-7: policy validation requires a known document version and non-empty policy id', () => {
  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        policy: {
          id: 'invalid-policy',
          rules: {
            allowLocalDryRun: true,
          },
        },
      } as unknown as PolicyDoc),
    /policy\.version/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        version: 'policy-v9',
        policy: {
          id: 'invalid-policy',
          rules: {
            allowLocalDryRun: true,
          },
        },
      } as unknown as PolicyDoc),
    /policy\.version/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        version: 'policy-v0',
        policy: {
          rules: {
            allowLocalDryRun: true,
          },
        },
      } as unknown as PolicyDoc),
    /policy\.policy\.id/,
  );
});

test('P06-AC-7: work-profile validation refuses malformed versions and prompt-strategy values', () => {
  assert.throws(
    () =>
      bindOwnerConfiguration(
        config({
          track: {
            id: 'TRACK-P06',
            workProfile: {
              version: 'work-profile-v9',
              workProfile: {
                id: 'bad-profile',
                model: 'gpt-5',
                effort: 'high',
              },
            },
          },
        }),
        policy(),
      ),
    /workProfile\.version/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(
        config({
          track: {
            id: 'TRACK-P06',
            workProfile: {
              version: 'work-profile-v0',
              workProfile: {
                id: 'bad-profile',
                model: 'gpt-5',
                effort: 'high',
                promptStrategy: 'magic',
              } as WorkProfileDoc['workProfile'] & { promptStrategy: 'magic' },
            },
          },
        }),
        policy(),
      ),
    /workProfile\.workProfile\.promptStrategy/,
  );
});

test('P06-AC-7: repo-floor validation refuses malformed versions and partial type errors', () => {
  assert.throws(
    () =>
      bindOwnerConfiguration(
        config({
          track: {
            id: 'TRACK-P06',
            workProfile: workProfile(),
            repoPolicyFloors: {
              version: 'repo-policy-floors-v9',
              repoPolicyFloors: {
                id: 'bad-floor',
                rules: {},
              },
            },
          },
        }),
        policy(),
      ),
    /repoPolicyFloors\.version/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(
        config({
          track: {
            id: 'TRACK-P06',
            workProfile: workProfile(),
            repoPolicyFloors: {
              version: 'repo-policy-floors-v0',
              repoPolicyFloors: {
                id: 'bad-floor',
                rules: {
                  concurrencyCeiling: 0,
                },
              },
            },
          },
        }),
        policy(),
      ),
    /repoPolicyFloors\.repoPolicyFloors\.rules\.concurrencyCeiling/,
  );
});

test('P06-AC-1: default owner configuration keeps the track binding when present without forcing extra snapshots', () => {
  const bound = createDefaultOwnerConfiguration(config(), policy());

  assert.strictEqual(bound.trackRef, 'TRACK-P06');
  assert.strictEqual(bound.persistExtendedBindings, false);
  assert.strictEqual(bound.effectivePolicy.policy?.basis?.trackRef, 'TRACK-P06');
  assert.strictEqual(bound.effectivePolicy.policy?.basis?.repoPolicyFloorsRef, undefined);
});

test('P06-AC-7: repo-floor validation refuses missing rules and work-profile setup validates explicitly', () => {
  assert.throws(
    () =>
      bindOwnerConfiguration(
        config({
          track: {
            id: 'TRACK-P06',
            workProfile: workProfile(),
            repoPolicyFloors: {
              version: 'repo-policy-floors-v0',
              repoPolicyFloors: {
                id: 'bad-floor',
              },
            },
          },
        }),
        policy(),
      ),
    /repoPolicyFloors\.repoPolicyFloors\.rules/,
  );

  const bound = bindOwnerConfiguration(
    config({
      track: {
        id: 'TRACK-P06',
        workProfile: {
          version: 'work-profile-v0',
          workProfile: {
            id: 'profile-with-setup',
            model: 'gpt-5',
            effort: 'high',
            setup: {
              command: 'pnpm install --frozen-lockfile',
              freshnessCheck: '.pnpm-state',
            },
          },
        },
      },
    }),
    policy(),
  );

  assert.strictEqual(bound.workProfile?.workProfile.setup?.command, 'pnpm install --frozen-lockfile');
});

test('P06-AC-7: policy validation refuses malformed arrays and retry budgets', () => {
  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        version: 'policy-v0',
        policy: {
          id: 'invalid-policy',
          rules: {
            allowLocalDryRun: true,
            requiredReviews: ['owner', ''],
          },
        },
      } as unknown as PolicyDoc),
    /requiredReviews/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        version: 'policy-v0',
        policy: {
          id: 'invalid-policy',
          rules: {
            allowLocalDryRun: true,
            retryBudget: -1,
          },
        },
      } as unknown as PolicyDoc),
    /retryBudget/,
  );
});

test('P06-AC-7: policy validation refuses missing required rules and malformed policy scalars', () => {
  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        version: 'policy-v0',
        policy: {
          id: 'invalid-policy',
        },
      } as unknown as PolicyDoc),
    /policy\.policy\.rules/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        version: 'policy-v0',
        policy: {
          id: 'invalid-policy',
          rules: {
            mergeSpectrum: 'ship-it',
            allowLocalDryRun: true,
          },
        },
      } as unknown as PolicyDoc),
    /mergeSpectrum/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        version: 'policy-v0',
        policy: {
          id: 'invalid-policy',
          rules: {
            blockResolution: 'wing-it',
            allowLocalDryRun: true,
          },
        },
      } as unknown as PolicyDoc),
    /blockResolution/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        version: 'policy-v0',
        policy: {
          id: 'invalid-policy',
          rules: {
            allowLocalDryRun: 'sometimes',
          },
        },
      } as unknown as PolicyDoc),
    /allowLocalDryRun/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(config({ track: undefined }), {
        version: 'policy-v0',
        policy: {
          id: 'invalid-policy',
          rules: {
            allowLocalDryRun: true,
            escalationRules: {
              pauseOnOwnerDecision: 'optional',
            },
          },
        },
      } as unknown as PolicyDoc),
    /pauseOnOwnerDecision/,
  );
});

test('P06-AC-7: work-profile validation refuses malformed roots, strings, role realization, and setup keys', () => {
  assert.throws(
    () =>
      bindOwnerConfiguration(
        config({
          track: {
            id: 'TRACK-P06',
            workProfile: [] as unknown as WorkProfileDoc,
          },
        }),
        policy(),
      ),
    /workProfile: expected an object/,
  );

  assert.throws(
    () =>
      createDefaultOwnerConfiguration(
        config({
          track: {
            id: '',
          },
        }),
        policy(),
      ),
    /config\.track\.id/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(
        config({
          track: {
            id: 'TRACK-P06',
            workProfile: {
              version: 'work-profile-v0',
              workProfile: {
                id: 'bad-profile',
                model: 'gpt-5',
                effort: 'turbo',
              } as WorkProfileDoc['workProfile'] & { effort: 'turbo' },
            },
          },
        }),
        policy(),
      ),
    /workProfile\.workProfile\.effort/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(
        config({
          track: {
            id: 'TRACK-P06',
            workProfile: {
              version: 'work-profile-v0',
              workProfile: {
                id: 'bad-profile',
                model: 'gpt-5',
                effort: 'high',
                roleRealization: 'swarm',
              } as WorkProfileDoc['workProfile'] & { roleRealization: 'swarm' },
            },
          },
        }),
        policy(),
      ),
    /roleRealization/,
  );

  assert.throws(
    () =>
      bindOwnerConfiguration(
        config({
          track: {
            id: 'TRACK-P06',
            workProfile: {
              version: 'work-profile-v0',
              workProfile: {
                id: 'bad-profile',
                model: 'gpt-5',
                effort: 'high',
                setup: {
                  command: 'pnpm install',
                  freshnessCheck: '.done',
                  cacheKey: 'oops',
                },
              } as WorkProfileDoc['workProfile'] & {
                setup: { command: string; freshnessCheck: string; cacheKey: string };
              },
            },
          },
        }),
        policy(),
      ),
    /workProfile\.workProfile\.setup: unknown field .*cacheKey/i,
  );
});

test('P06-AC-3: effective policy keeps non-tightened values stable and accepts floor-only tightening inputs', () => {
  const floorOnly = bindOwnerConfiguration(
    config({
      track: {
        id: 'TRACK-P06',
        repoPolicyFloors: repoPolicyFloors({
          repoPolicyFloors: {
            id: 'repo-floor-p06',
            rules: {
              mergeSpectrum: 'open-pr',
              concurrencyCeiling: 2,
              capabilityIsolation: {
                'network-access': 'none',
              },
            },
          },
        }),
      },
    }),
    {
      version: 'policy-v0',
      policy: {
        id: 'policy-floor-only',
        rules: {
          allowLocalDryRun: true,
        },
      },
    },
  );

  assert.strictEqual(floorOnly.effectivePolicy.policy?.rules?.mergeSpectrum, 'open-pr');
  assert.strictEqual(floorOnly.effectivePolicy.policy?.rules?.concurrencyCeiling, 2);
  assert.deepStrictEqual(floorOnly.effectivePolicy.policy?.rules?.capabilityIsolation, {
    'network-access': 'none',
  });

  const notTightened = bindOwnerConfiguration(
    config({
      track: {
        id: 'TRACK-P06',
        repoPolicyFloors: repoPolicyFloors({
          repoPolicyFloors: {
            id: 'repo-floor-p06',
            rules: {
              mergeSpectrum: 'merge',
              blockResolution: 'continue-independent-work',
              ruleGoverningSurfaces: ['policies/**'],
              capabilityIsolation: {
                'filesystem-edit': 'weak',
              },
            },
          },
        }),
      },
    }),
    policy({
      policy: {
        rules: {
          mergeSpectrum: 'push',
          blockResolution: 'continue-independent-work',
          ruleGoverningSurfaces: ['policies/**'],
          capabilityIsolation: {
            'filesystem-edit': 'strong',
            'network-access': 'weak',
          },
        },
      },
    }),
  );

  assert.strictEqual(notTightened.effectivePolicy.policy?.rules?.mergeSpectrum, 'push');
  assert.strictEqual(notTightened.effectivePolicy.policy?.rules?.blockResolution, 'continue-independent-work');
  assert.deepStrictEqual(notTightened.effectivePolicy.policy?.rules?.ruleGoverningSurfaces, ['policies/**']);
  assert.deepStrictEqual(notTightened.effectivePolicy.policy?.rules?.capabilityIsolation, {
    'filesystem-edit': 'strong',
    'network-access': 'weak',
  });
  assert.ok(!notTightened.effectivePolicy.policy?.basis?.tightenedByRepoFloors?.includes('mergeSpectrum'));
  assert.ok(!notTightened.effectivePolicy.policy?.basis?.tightenedByRepoFloors?.includes('blockResolution'));
  assert.ok(!notTightened.effectivePolicy.policy?.basis?.tightenedByRepoFloors?.includes('ruleGoverningSurfaces'));
  assert.ok(!notTightened.effectivePolicy.policy?.basis?.tightenedByRepoFloors?.includes('capabilityIsolation'));
});
