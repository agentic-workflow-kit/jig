import type { CapabilityFreshness } from './ports.js';

export interface Clock {
  now(): Date;
}

export interface FreshnessInput {
  observedAt?: Date | string | null;
  windowMs?: number | null;
  clock?: Clock;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export function fixedClock(isoTimestamp: string): Clock {
  const fixed = new Date(isoTimestamp);
  if (Number.isNaN(fixed.getTime())) {
    throw new Error(`Invalid fixed clock timestamp "${isoTimestamp}"`);
  }

  return {
    now: () => new Date(fixed),
  };
}

function parseObservedAt(observedAt: Date | string | null | undefined): Date | null {
  if (observedAt === undefined || observedAt === null) {
    return null;
  }

  const parsed = observedAt instanceof Date ? observedAt : new Date(observedAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function decideFreshness(input: FreshnessInput): CapabilityFreshness {
  const observedAt = parseObservedAt(input.observedAt);
  if (!observedAt) {
    return 'missing';
  }

  const windowMs = input.windowMs;
  if (typeof windowMs !== 'number' || !Number.isFinite(windowMs) || windowMs < 0) {
    return 'missing';
  }

  const now = input.clock?.now() ?? systemClock.now();
  if (Number.isNaN(now.getTime())) {
    return 'missing';
  }

  return now.getTime() - observedAt.getTime() <= windowMs ? 'fresh' : 'stale';
}
