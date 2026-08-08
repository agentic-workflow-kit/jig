declare module 'node:child_process' {
  export function execFileSync(
    file: string,
    args: readonly string[],
    options: { cwd?: string; encoding: 'utf8'; stdio: readonly ['ignore', 'pipe', 'pipe'] },
  ): string;
}

declare module 'node:crypto' {
  export function createHash(algorithm: 'sha256'): {
    update(input: string | Uint8Array): { digest(encoding: 'hex'): string };
  };
}

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function lstatSync(path: string): {
    isDirectory(): boolean;
    isFile(): boolean;
    isSymbolicLink(): boolean;
  };
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function mkdtempSync(prefix: string): string;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function realpathSync(path: string): string;
  export function rmSync(path: string, options: { force: boolean; recursive: boolean }): void;
  export function writeFileSync(path: string, data: string): void;
}

declare const TextEncoder: {
  new (): { encode(input?: string): Uint8Array };
};

declare class TextDecoder {
  decode(input?: Uint8Array): string;
}

declare module 'node:os' {
  export function homedir(): string;
  export function tmpdir(): string;
  export function platform():
    | 'aix'
    | 'android'
    | 'darwin'
    | 'freebsd'
    | 'haiku'
    | 'linux'
    | 'openbsd'
    | 'sunos'
    | 'win32';
}

declare module 'node:path' {
  export function basename(path: string): string;
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
}
