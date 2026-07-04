// Proves the hermetic guard's setupFiles wiring actually fires in the `integration` lane too,
// not just `unit`. tests/hermetic/no-real-effects.unit.test.ts only runs under the `unit`
// project; without a distinct positive check here, `integration` and `conformance` would pass
// whether or not the guard's setupFile is installed for them (cli.int.test.ts self-invokes the
// allowlisted `node` binary, and the conformance tests never touch a real child_process/fetch
// at all). This one assertion closes that gap for `integration`; both real lanes reference the
// identical tests/hermetic/no-real-effects.setup.ts entry in vitest.config.ts.
//
// Deliberately imports only the side-effect-free ./violation.ts: importing the setup module
// here would install the guard via import side effects and keep this test green even if the
// lane's setupFiles wiring were dropped — the exact failure this test exists to catch.
import { assert, test } from 'vitest';
import { HermeticGuardViolation } from './violation.js';

test('integration lane: hermetic guard blocks a real fetch to a non-local host', async () => {
  let caught: unknown;
  try {
    await fetch('https://api.github.com/repos/example/example/issues');
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof HermeticGuardViolation, `expected HermeticGuardViolation, got ${String(caught)}`);
  assert.match((caught as Error).message, /blocked real fetch/);
});
