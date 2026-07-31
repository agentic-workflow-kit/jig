export type QualificationClaims = Readonly<{
  subject: Readonly<Record<string, unknown>>;
  resourceDigest: string;
  capability: string;
  policyMinimum: string;
}>;
export const certificateClaims = new WeakMap<object, QualificationClaims>();
export const executionClaims = new WeakMap<object, QualificationClaims>();
