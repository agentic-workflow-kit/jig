declare module 'node:fs' {
  export const constants: { O_RDONLY: number; O_NOFOLLOW: number };
  export function closeSync(fd: number): void;
  export function fstatSync(fd: number): {
    isFile(): boolean;
    size: number;
    ino: number;
    dev: number;
    nlink: number;
    mtimeMs: number;
  };
  export function lstatSync(path: string): { isFile(): boolean; isSymbolicLink(): boolean; nlink: number; ino: number; dev: number };
  export function openSync(path: string, flags: number): number;
  export function readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position: number): number;
  export function realpathSync(path: string): string;
}
declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };
declare const TextDecoder: {
  new (label?: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array): string };
};
