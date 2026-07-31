declare module 'node:fs' {
  export const constants: { O_RDONLY: number; O_WRONLY: number; O_CREAT: number; O_EXCL: number; O_NOFOLLOW: number };
  export function closeSync(fd: number): void;
  export function existsSync(path: string): boolean;
  export function fstatSync(fd: number): {
    isFile(): boolean;
    size: number;
    ino: number;
    dev: number;
    nlink: number;
    mtimeMs: number;
  };
  export function lstatSync(path: string): {
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    nlink: number;
    ino: number;
    dev: number;
  };
  export function fsyncSync(fd: number): void;
  export function mkdirSync(path: string, options: { recursive: boolean; mode: number }): void;
  export function openSync(path: string, flags: number, mode?: number): number;
  export function readFileSync(path: string): Uint8Array;
  export function readSync(fd: number, buffer: Uint8Array, offset: number, length: number, position: number): number;
  export function realpathSync(path: string): string;
  export function unlinkSync(path: string): void;
  export function writeSync(fd: number, buffer: Uint8Array, offset: number, length: number, position: number): number;
}
declare const Buffer: { compare(left: Uint8Array, right: Uint8Array): number };
declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };
declare const TextDecoder: {
  new (label?: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array): string };
};
declare function structuredClone<T>(value: T): T;
