import { resolve } from 'node:path';

// Guard binaries live at <repo>/tools/repo-guard/bin, and every gate reasons about the repository
// root rather than the working directory Turbo happens to run the package task from.
export const repoRoot = resolve(import.meta.dirname, '../../..');
