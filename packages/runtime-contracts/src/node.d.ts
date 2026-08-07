declare module 'node:fs' {
  export const constants: {
    O_WRONLY: number;
    O_CREAT: number;
    O_EXCL: number;
    O_NOFOLLOW: number;
  };
  export function closeSync(fd: number): void;
  export function fsyncSync(fd: number): void;
  export function lstatSync(path: string): { isFile(): boolean; isSymbolicLink(): boolean };
  export function mkdirSync(path: string, options?: { recursive?: boolean; mode?: number }): void;
  export function openSync(path: string, flags: number, mode?: number): number;
  export function readFileSync(path: string): Uint8Array;
  export function writeSync(fd: number, buffer: Uint8Array, offset: number, length: number): number;
}

declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };
declare const TextDecoder: {
  new (label?: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array): string };
};
