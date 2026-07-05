import assert from 'node:assert';
import { EventEmitter, once } from 'node:events';
import { PassThrough } from 'node:stream';
import { test } from 'vitest';
import { fixedClock } from '../src/clock.js';
import {
  createMacosProcessGroupConfinementProbe,
  exerciseConfinementProbe,
  localProcessGroupProbeCommand,
  localProcessGroupProbeSubstrateRequests,
  type ProcessGroupConfinementRuntime,
  type ProcessGroupProbeChildProcess,
  processGroupIsEmptyForTest,
  startLoopbackServerForTest,
} from '../src/providers/real/confinement.js';

interface FakeRuntimeOptions {
  exitCode?: number | null;
  emitPayload?: boolean;
  observedExecArgv?: string[];
  parentPid?: number;
  pid?: number | null;
  stderr?: string;
  isEmptySequence?: boolean[];
  killErrorCode?: string;
  loopbackReachable?: boolean;
}

function fakeChild(): ProcessGroupProbeChildProcess & EventEmitter {
  const child = new EventEmitter() as ProcessGroupProbeChildProcess & EventEmitter;
  child.handle = child;
  child.pid = 4242;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  return child;
}

function fakeRuntime(options: FakeRuntimeOptions = {}): {
  runtime: ProcessGroupConfinementRuntime;
  killSignals: string[];
  closeCalls(): number;
  spawnedCommands: string[][];
  spawnedEnvs: NodeJS.ProcessEnv[];
} {
  const child = fakeChild();
  child.pid = options.pid === undefined ? 4242 : options.pid;
  const killSignals: string[] = [];
  const spawnedCommands: string[][] = [];
  const spawnedEnvs: NodeJS.ProcessEnv[] = [];
  let closeCalls = 0;
  const emptySequence = [...(options.isEmptySequence ?? [false, true])];
  const runtime: ProcessGroupConfinementRuntime = {
    currentPid: 9001,
    execPath: '/usr/bin/node',
    delay: async () => {},
    isProcessGroupEmpty: () => emptySequence.shift() ?? true,
    killProcessGroup: (_processGroupId, signal) => {
      killSignals.push(signal);
      if (options.killErrorCode) {
        const error = new Error(options.killErrorCode) as Error & { code?: string };
        error.code = options.killErrorCode;
        throw error;
      }
    },
    spawnProbe: (command, env) => {
      spawnedCommands.push(command);
      spawnedEnvs.push(env);
      return child;
    },
    startLoopbackServer: async () => ({
      port: 31337,
      close: async () => {
        closeCalls += 1;
      },
    }),
    waitForClose: async () => {
      if (options.emitPayload !== false) {
        const payload = {
          observedAt: '2026-07-06T09:00:00.000Z',
          observedExecArgv: options.observedExecArgv ?? localProcessGroupProbeCommand('/usr/bin/node').slice(1),
          parentPid: options.parentPid ?? 9001,
          loopbackReachable: options.loopbackReachable ?? true,
        };
        (child.stdout as PassThrough).emit('data', Buffer.from(`${JSON.stringify(payload)}\n`, 'utf8'));
      }
      if (options.stderr) {
        (child.stderr as PassThrough).emit('data', Buffer.from(options.stderr, 'utf8'));
      }
      return options.exitCode ?? 0;
    },
  };

  return {
    runtime,
    killSignals,
    closeCalls: () => closeCalls,
    spawnedCommands,
    spawnedEnvs,
  };
}

test('P04-AC-1: the macOS process-group probe proves honest weak containment from an exercised local check', async () => {
  const previousSecret = process.env.AMBIENT_PROBE_SECRET;
  process.env.AMBIENT_PROBE_SECRET = 'do-not-forward';
  try {
    const state = fakeRuntime();
    const probe = createMacosProcessGroupConfinementProbe(state.runtime);
    const result = await probe.run();
    const spawnedEnv = state.spawnedEnvs[0];

    assert.deepStrictEqual(state.spawnedCommands, [localProcessGroupProbeCommand('/usr/bin/node')]);
    assert.deepStrictEqual(state.spawnedEnvs, [{ JIG_CONFINEMENT_PROBE_PORT: '31337' }]);
    assert.strictEqual(spawnedEnv?.AMBIENT_PROBE_SECRET, undefined);
    assert.deepStrictEqual(probe.substrateRequests, localProcessGroupProbeSubstrateRequests('/usr/bin/node'));
    assert.deepStrictEqual(state.killSignals, ['SIGTERM', 'SIGKILL']);
    assert.strictEqual(state.closeCalls(), 1);
    assert.strictEqual(result.reportedIsolationStrength, 'weak');
    assert.strictEqual(result.provenIsolationStrength, 'weak');
    assert.strictEqual(result.containmentMechanism, 'process-group');
    assert.strictEqual(result.commandBindingPassed, true);
    assert.strictEqual(result.parentageProbePassed, true);
    assert.strictEqual(result.terminationProvedEmpty, true);
    assert.strictEqual(result.negativeEgressProbePassed, false);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.AMBIENT_PROBE_SECRET;
    } else {
      process.env.AMBIENT_PROBE_SECRET = previousSecret;
    }
  }
});

test('P04-AC-2: the exercised probe fails closed when the child exits non-zero', async () => {
  const state = fakeRuntime({
    exitCode: 1,
    stderr: 'probe-child-failed',
  });

  await assert.rejects(() => createMacosProcessGroupConfinementProbe(state.runtime).run(), /probe-child-failed/);
  assert.strictEqual(state.closeCalls(), 1);
});

test('P04-AC-2: exercised weak proof is positive while stale proof remains containment-unproven', async () => {
  const probe = {
    run: async () => ({
      reportedIsolationStrength: 'weak' as const,
      observedAt: '2026-07-06T09:00:00.000Z',
      freshnessWindowMs: 1_000,
      terminationProvedEmpty: true,
      negativeEgressProbePassed: false,
      containmentMechanism: 'process-group' as const,
      commandBindingPassed: true,
      parentageProbePassed: true,
      provenIsolationStrength: 'weak' as const,
    }),
  };

  const fresh = await exerciseConfinementProbe(probe, fixedClock('2026-07-06T09:00:00.500Z'));
  const stale = await exerciseConfinementProbe(probe, fixedClock('2026-07-06T09:00:02.500Z'));

  assert.strictEqual(fresh.positive, true);
  assert.strictEqual(fresh.provenBy, 'exercised-confinement-proof');
  assert.strictEqual(stale.positive, false);
  assert.strictEqual(stale.failureToken, 'containment-unproven');
});

test('P04-AC-2: a strong claim without a passed negative-egress probe fails closed', async () => {
  const proof = await exerciseConfinementProbe(
    {
      run: async () => ({
        reportedIsolationStrength: 'strong',
        observedAt: '2026-07-06T09:00:00.000Z',
        freshnessWindowMs: 60_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'strong',
      }),
    },
    fixedClock('2026-07-06T09:00:00.500Z'),
  );

  assert.strictEqual(proof.positive, false);
  assert.strictEqual(proof.failureToken, 'containment-unproven');
});

test('P04-AC-1: the macOS process-group probe degrades to none when loopback reachability is not observed', async () => {
  const state = fakeRuntime({
    isEmptySequence: [true],
    killErrorCode: 'ESRCH',
    loopbackReachable: false,
  });
  const result = await createMacosProcessGroupConfinementProbe(state.runtime).run();

  assert.deepStrictEqual(state.killSignals, ['SIGTERM']);
  assert.strictEqual(result.reportedIsolationStrength, 'none');
  assert.strictEqual(result.provenIsolationStrength, 'none');
});

test('P04-AC-2: the exercised probe fails closed when the child omits a payload', async () => {
  const state = fakeRuntime({ emitPayload: false });

  await assert.rejects(() => createMacosProcessGroupConfinementProbe(state.runtime).run(), /returned no payload/);
  assert.strictEqual(state.closeCalls(), 1);
});

test('P04-AC-2: the exercised probe fails closed on missing process-group identity', async () => {
  const state = fakeRuntime({ pid: null });

  await assert.rejects(
    () => createMacosProcessGroupConfinementProbe(state.runtime).run(),
    /did not expose a process-group id/,
  );
  assert.strictEqual(state.closeCalls(), 1);
});

test('P04-AC-2: unexpected kill errors are not downgraded into proof success', async () => {
  const state = fakeRuntime({ killErrorCode: 'EPERM' });

  await assert.rejects(() => createMacosProcessGroupConfinementProbe(state.runtime).run(), /EPERM/);
  assert.strictEqual(state.closeCalls(), 1);
});

test('P04-AC-1: process-group emptiness keeps ESRCH distinct from other outcomes', () => {
  assert.strictEqual(
    processGroupIsEmptyForTest(42, () => {}),
    false,
  );
  assert.strictEqual(
    processGroupIsEmptyForTest(42, () => {
      const error = new Error('gone') as Error & { code?: string };
      error.code = 'ESRCH';
      throw error;
    }),
    true,
  );
  assert.strictEqual(
    processGroupIsEmptyForTest(42, () => {
      const error = new Error('blocked') as Error & { code?: string };
      error.code = 'EPERM';
      throw error;
    }),
    false,
  );
  assert.strictEqual(
    processGroupIsEmptyForTest(42, () => {
      throw new Error('unknown');
    }),
    true,
  );
});

test('P04-AC-1: loopback server startup and close honor the reported address shape', async () => {
  const server = new EventEmitter() as EventEmitter & {
    listen(port: number, host: string): void;
    address(): { address: string; family: string; port: number } | string | null;
    close(): void;
  };
  server.listen = () => {
    queueMicrotask(() => server.emit('listening'));
  };
  server.address = () => ({ address: '127.0.0.1', family: 'IPv4', port: 31337 });
  server.close = () => {
    queueMicrotask(() => server.emit('close'));
  };

  const loopback = await startLoopbackServerForTest(
    () => server as unknown as ReturnType<typeof import('node:net').createServer>,
    once,
  );
  assert.strictEqual(loopback.port, 31337);
  await loopback.close();

  const nullAddressServer = Object.assign(new EventEmitter(), {
    listen: () => {
      queueMicrotask(() => nullAddressServer.emit('listening'));
    },
    address: () => null,
    close: () => {
      queueMicrotask(() => nullAddressServer.emit('close'));
    },
  });
  await assert.rejects(
    () =>
      startLoopbackServerForTest(
        () => nullAddressServer as unknown as ReturnType<typeof import('node:net').createServer>,
        once,
      ),
    /could not determine loopback port/,
  );

  const stringAddressServer = Object.assign(new EventEmitter(), {
    listen: () => {
      queueMicrotask(() => stringAddressServer.emit('listening'));
    },
    address: () => '127.0.0.1:31337',
    close: () => {
      queueMicrotask(() => stringAddressServer.emit('close'));
    },
  });
  await assert.rejects(
    () =>
      startLoopbackServerForTest(
        () => stringAddressServer as unknown as ReturnType<typeof import('node:net').createServer>,
        once,
      ),
    /could not determine loopback port/,
  );
});

test('P04-AC-1: command-binding mismatches fail closed instead of reporting weak containment', async () => {
  const state = fakeRuntime({
    isEmptySequence: [true],
    observedExecArgv: ['--input-type=module', '--eval', 'different-script'],
  });
  const result = await createMacosProcessGroupConfinementProbe(state.runtime).run();

  assert.strictEqual(result.commandBindingPassed, false);
  assert.strictEqual(result.reportedIsolationStrength, 'none');
  assert.strictEqual(result.provenIsolationStrength, 'none');
});

test('P04-AC-1: parentage mismatches fail closed instead of reporting weak containment', async () => {
  const state = fakeRuntime({
    isEmptySequence: [true],
    parentPid: 1234,
  });
  const result = await createMacosProcessGroupConfinementProbe(state.runtime).run();

  assert.strictEqual(result.parentageProbePassed, false);
  assert.strictEqual(result.reportedIsolationStrength, 'none');
  assert.strictEqual(result.provenIsolationStrength, 'none');
});

test('P04-AC-2: missing base-proof elements keep exercised weak claims non-positive', async () => {
  const nonPositiveProofs = await Promise.all([
    exerciseConfinementProbe(
      {
        run: async () => ({
          reportedIsolationStrength: 'weak' as const,
          observedAt: '2026-07-06T09:00:00.000Z',
          freshnessWindowMs: 60_000,
          terminationProvedEmpty: false,
          negativeEgressProbePassed: false,
          containmentMechanism: 'process-group' as const,
          commandBindingPassed: true,
          parentageProbePassed: true,
          provenIsolationStrength: 'weak' as const,
        }),
      },
      fixedClock('2026-07-06T09:00:00.500Z'),
    ),
    exerciseConfinementProbe(
      {
        run: async () => ({
          reportedIsolationStrength: 'weak' as const,
          observedAt: '2026-07-06T09:00:00.000Z',
          freshnessWindowMs: 60_000,
          terminationProvedEmpty: true,
          negativeEgressProbePassed: false,
          containmentMechanism: undefined,
          commandBindingPassed: true,
          parentageProbePassed: true,
          provenIsolationStrength: 'weak' as const,
        }),
      },
      fixedClock('2026-07-06T09:00:00.500Z'),
    ),
    exerciseConfinementProbe(
      {
        run: async () => ({
          reportedIsolationStrength: 'weak' as const,
          observedAt: '2026-07-06T09:00:00.000Z',
          freshnessWindowMs: 60_000,
          terminationProvedEmpty: true,
          negativeEgressProbePassed: false,
          containmentMechanism: 'process-group' as const,
          commandBindingPassed: false,
          parentageProbePassed: true,
          provenIsolationStrength: 'weak' as const,
        }),
      },
      fixedClock('2026-07-06T09:00:00.500Z'),
    ),
    exerciseConfinementProbe(
      {
        run: async () => ({
          reportedIsolationStrength: 'weak' as const,
          observedAt: '2026-07-06T09:00:00.000Z',
          freshnessWindowMs: 60_000,
          terminationProvedEmpty: true,
          negativeEgressProbePassed: false,
          containmentMechanism: 'process-group' as const,
          commandBindingPassed: true,
          parentageProbePassed: false,
          provenIsolationStrength: 'weak' as const,
        }),
      },
      fixedClock('2026-07-06T09:00:00.500Z'),
    ),
  ]);

  for (const proof of nonPositiveProofs) {
    assert.strictEqual(proof.positive, false);
    assert.strictEqual(proof.failureToken, 'containment-unproven');
  }
});
