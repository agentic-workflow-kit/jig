import { computeA } from '@gf-001-fixture/pkg-a';

export function computeB(val: number): number {
  return computeA(val) + 10;
}
