// Hermetic guard: fails loudly on genuinely external effects inside non-smoke lanes.
//
// The `unit`, `integration`, and `conformance` lanes must never touch a real network host
// or perform a real push/publish-shaped side effect, even though some tests legitimately
// exercise real local subprocesses (git in a temp workspace, self-invoking the built CLI).
// This setupFile intercepts the concrete effect surfaces the source actually uses today
// (src/workspace.ts spawnSync('git', ...), src/providers/real/forge.ts execFile('git'|'gh', ...),
// src/providers/real/work-source.ts fetch(...)) and draws the allow/block line from those real
// call sites rather than a general theory:
//
// - allowed: local, non-mutating-remote `git` subcommands (init/add/commit/config/rev-parse/
//   status/diff), and self-invocation of `node` (the built jig CLI runs as `node bin/jig.js`).
// - blocked: `git push`, any `gh` invocation, any `codex` process, and any `fetch` to a
//   non-local host.
//
// A leaked forbidden effect throws/rejects with `HermeticGuardViolation` so a seeded-violation
// test can assert on the guard's specific error identity rather than an incidental failure
// (a DNS error or ENOENT from a missing `gh` binary would otherwise look like "blocked").
// The class lives in the side-effect-free ./violation.ts; tests import it from there, never
// from this module, so a lane whose setupFiles wiring is dropped genuinely loses the guard
// and its wiring-proof test fails instead of being reinstalled via import side effects.
import { promisify } from 'node:util';
import { vi } from 'vitest';
import { HermeticGuardViolation } from './violation.js';

const ALLOWED_GIT_SUBCOMMANDS = new Set(['init', 'add', 'commit', 'config', 'rev-parse', 'status', 'diff']);
const BLOCKED_COMMAND_FILES = new Set(['gh', 'codex']);

function isBlockedArgvCall(file: string, args: readonly unknown[]): boolean {
  if (BLOCKED_COMMAND_FILES.has(file)) return true;
  if (file !== 'git') return false;

  const subcommand = args.find((arg): arg is string => typeof arg === 'string' && !arg.startsWith('-'));
  return subcommand === undefined || !ALLOWED_GIT_SUBCOMMANDS.has(subcommand);
}

function isBlockedCommandString(command: string): boolean {
  if (/(^|[\s/])gh(\s|$)/.test(command)) return true;
  if (/(^|[\s/])codex(\s|$)/.test(command)) return true;
  if (/git\s+push/.test(command)) return true;

  const gitSubcommandMatch = /(^|[\s/])git\s+([a-z-]+)/.exec(command);
  if (gitSubcommandMatch && !ALLOWED_GIT_SUBCOMMANDS.has(gitSubcommandMatch[2])) return true;

  return false;
}

function violation(kind: string, detail: string): HermeticGuardViolation {
  return new HermeticGuardViolation(`hermetic-guard: blocked real ${kind}(${detail})`);
}

type PromisifiedCommandResult = Promise<{ stdout: string; stderr: string }>;

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();

  // Node's real execFile/exec carry util.promisify.custom, so promisify(execFile) resolves to
  // { stdout, stderr }. A plain wrapper function drops that symbol, and promisify would fall
  // back to callback-style promisification that resolves the bare stdout string — breaking
  // allowed calls at consumers like src/providers/real/forge.ts:17 (promisify(execFile)) before
  // the guard could ever see a later blocked effect. The execFile/exec wrappers therefore
  // re-attach a promisify.custom that applies the same block check and delegates allowed calls
  // to the real promisified form; blocked calls reject with HermeticGuardViolation on the
  // promise path too. Of the wrapped functions only execFile and exec carry the symbol in Node
  // (spawn and the sync variants do not), so no other wrapper needs this.
  const realExecFileAsync = promisify(actual.execFile) as unknown as (...args: unknown[]) => PromisifiedCommandResult;
  const realExecAsync = promisify(actual.exec) as unknown as (...args: unknown[]) => PromisifiedCommandResult;

  const wrappedExecFile = ((file: string, ...rest: unknown[]) => {
    const args = Array.isArray(rest[0]) ? (rest[0] as unknown[]) : [];
    if (isBlockedArgvCall(file, args)) {
      const err = violation('execFile', `"${file}", ${JSON.stringify(args)}`);
      const callback = rest.find((entry): entry is (error: Error) => void => typeof entry === 'function');
      if (callback) {
        callback(err);
        return undefined as never;
      }
      throw err;
    }
    // @ts-expect-error passthrough to the real implementation for allowed calls
    return actual.execFile(file, ...rest);
  }) as typeof actual.execFile;
  Object.defineProperty(wrappedExecFile, promisify.custom, {
    configurable: true,
    value: (file: string, ...rest: unknown[]): PromisifiedCommandResult => {
      const args = Array.isArray(rest[0]) ? (rest[0] as unknown[]) : [];
      if (isBlockedArgvCall(file, args)) {
        return Promise.reject(violation('execFile', `"${file}", ${JSON.stringify(args)}`));
      }
      return realExecFileAsync(file, ...rest);
    },
  });

  const wrappedExec = ((command: string, ...rest: unknown[]) => {
    if (isBlockedCommandString(command)) {
      const err = violation('exec', `"${command}"`);
      const callback = rest.find((entry): entry is (error: Error) => void => typeof entry === 'function');
      if (callback) {
        callback(err);
        return undefined as never;
      }
      throw err;
    }
    // @ts-expect-error passthrough to the real implementation for allowed calls
    return actual.exec(command, ...rest);
  }) as typeof actual.exec;
  Object.defineProperty(wrappedExec, promisify.custom, {
    configurable: true,
    value: (command: string, ...rest: unknown[]): PromisifiedCommandResult => {
      if (isBlockedCommandString(command)) {
        return Promise.reject(violation('exec', `"${command}"`));
      }
      return realExecAsync(command, ...rest);
    },
  });

  return {
    ...actual,
    execFile: wrappedExecFile,
    exec: wrappedExec,
    execFileSync: ((file: string, ...rest: unknown[]) => {
      const args = Array.isArray(rest[0]) ? (rest[0] as unknown[]) : [];
      if (isBlockedArgvCall(file, args)) {
        throw violation('execFileSync', `"${file}", ${JSON.stringify(args)}`);
      }
      // @ts-expect-error passthrough to the real implementation for allowed calls
      return actual.execFileSync(file, ...rest);
    }) as typeof actual.execFileSync,
    spawnSync: ((file: string, args?: unknown, ...rest: unknown[]) => {
      const argv = Array.isArray(args) ? args : [];
      if (isBlockedArgvCall(file, argv)) {
        throw violation('spawnSync', `"${file}", ${JSON.stringify(argv)}`);
      }
      // @ts-expect-error passthrough to the real implementation for allowed calls
      return actual.spawnSync(file, args, ...rest);
    }) as typeof actual.spawnSync,
    spawn: ((file: string, args?: unknown, ...rest: unknown[]) => {
      const argv = Array.isArray(args) ? args : [];
      if (isBlockedArgvCall(file, argv)) {
        throw violation('spawn', `"${file}", ${JSON.stringify(argv)}`);
      }
      // @ts-expect-error passthrough to the real implementation for allowed calls
      return actual.spawn(file, args, ...rest);
    }) as typeof actual.spawn,
    execSync: ((command: string, ...rest: unknown[]) => {
      if (isBlockedCommandString(command)) {
        throw violation('execSync', `"${command}"`);
      }
      // @ts-expect-error passthrough to the real implementation for allowed calls
      return actual.execSync(command, ...rest);
    }) as typeof actual.execSync,
  };
});

const originalFetch = globalThis.fetch;
type FetchArgs = Parameters<typeof fetch>;

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function requestUrl(input: FetchArgs[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return (input as { url: string }).url;
}

if (typeof originalFetch === 'function') {
  globalThis.fetch = (async (...args: FetchArgs) => {
    const [input, init] = args;
    const url = requestUrl(input);
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = '';
    }

    if (!isLocalHostname(hostname)) {
      throw violation('fetch', `"${url}"`);
    }

    return originalFetch(input, init);
  }) as typeof fetch;
}
