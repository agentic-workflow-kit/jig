// The hermetic guard's error identity, in a side-effect-free module.
//
// Tests must import the class from here, never from ./no-real-effects.setup.ts: the setup
// module's import side effects (vi.mock of node:child_process plus the globalThis.fetch patch)
// would install the guard even in a lane whose setupFiles wiring was accidentally dropped,
// silently turning the lane's wiring-proof test vacuous.
export class HermeticGuardViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HermeticGuardViolation';
  }
}
