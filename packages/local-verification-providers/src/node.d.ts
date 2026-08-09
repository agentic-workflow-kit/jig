declare module 'node:child_process' {
  export function execFileSync(
    file: string,
    args: readonly string[],
    options: {
      cwd: string;
      env: Readonly<Record<string, string>>;
      encoding: 'utf8';
      maxBuffer: number;
      shell: false;
      stdio: readonly ['ignore', 'pipe', 'pipe'];
      timeout: number;
    },
  ): string;
}

declare module 'node:crypto' {
  export function createHash(algorithm: 'sha256'): {
    update(input: string | Uint8Array): { digest(encoding: 'hex'): string };
  };
}

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function lstatSync(path: string): { isDirectory(): boolean; isSymbolicLink(): boolean };
  export function mkdtempSync(prefix: string): string;
  export function mkdirSync(path: string, options: { recursive: boolean }): void;
  export function readFileSync(path: string): Uint8Array;
  export function realpathSync(path: string): string;
  export function rmSync(path: string, options: { force: boolean; recursive: boolean }): void;
}

declare module 'node:os' {
  export function platform(): 'darwin' | 'linux' | 'win32' | string;
  export function tmpdir(): string;
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
}

declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };
declare const TextDecoder: {
  new (label?: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array): string };
};
