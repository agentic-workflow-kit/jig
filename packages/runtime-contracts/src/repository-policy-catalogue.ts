export const REPOSITORY_POLICY_CATALOGUE_VERSION = 'jig.repository-policy-catalogue.v1';

export const REPOSITORY_POLICY_CATALOGUE = Object.freeze({
  version: REPOSITORY_POLICY_CATALOGUE_VERSION,
  floors: Object.freeze({ review: 2, checks: 1 }),
});
