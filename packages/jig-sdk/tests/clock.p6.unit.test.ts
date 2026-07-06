import assert from 'node:assert';
import { test } from 'vitest';
import { decideFreshness, fixedClock } from '../src/clock.js';

test('P6-AC-3: a real-clock attestation past its window is stale and treated non-fresh', () => {
  const freshness = decideFreshness({
    observedAt: '2026-07-03T10:00:00.000Z',
    windowMs: 1_000,
    clock: fixedClock('2026-07-03T10:00:02.000Z'),
  });

  assert.strictEqual(freshness, 'stale');
});

test('P6-AC-3: missing or invalid clock inputs produce missing freshness', () => {
  assert.strictEqual(decideFreshness({ observedAt: null, windowMs: 1_000 }), 'missing');
  assert.strictEqual(decideFreshness({ observedAt: 'not-a-date', windowMs: 1_000 }), 'missing');
  assert.strictEqual(decideFreshness({ observedAt: '2026-07-03T10:00:00.000Z', windowMs: -1 }), 'missing');
});

test('P6-AC-3: an in-window real-clock attestation is fresh', () => {
  const freshness = decideFreshness({
    observedAt: new Date('2026-07-03T10:00:00.000Z'),
    windowMs: 1_000,
    clock: fixedClock('2026-07-03T10:00:00.500Z'),
  });

  assert.strictEqual(freshness, 'fresh');
});

test('P6-AC-3: fixedClock refuses to construct from an unparsable timestamp', () => {
  assert.throws(() => fixedClock('not-a-real-timestamp'), /Invalid fixed clock timestamp/);
});

test('P6-AC-3: omitting a clock falls back to the system clock and still evaluates freshness', () => {
  const freshness = decideFreshness({
    observedAt: new Date().toISOString(),
    windowMs: 60_000,
  });

  assert.strictEqual(freshness, 'fresh');
});

test('P6-AC-3: a clock that reports an invalid current time yields missing freshness rather than throwing', () => {
  const freshness = decideFreshness({
    observedAt: '2026-07-03T10:00:00.000Z',
    windowMs: 1_000,
    clock: { now: () => new Date(Number.NaN) },
  });

  assert.strictEqual(freshness, 'missing');
});
