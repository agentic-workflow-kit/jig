import { computeA } from '@workspace-fixture/pkg-a';

export function computeB(val: number): number {
  return computeA(val) + 10;
}
