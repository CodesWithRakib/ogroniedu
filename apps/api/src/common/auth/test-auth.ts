/**
 * Central gate for the development/test authentication escape hatches
 * (`x-user-id` headers, `mock:` bearer tokens, socket `userId` handshakes).
 *
 * These shortcuts exist so integration tests and local tooling can act as an
 * arbitrary user without minting a real JWT. They MUST never be reachable in a
 * deployed environment: an unauthenticated caller could otherwise impersonate
 * any user (including privileged roles) by header alone.
 *
 * The escape hatch is enabled only when the runtime is explicitly `test` or
 * `development`, or when an operator opts in via `ALLOW_TEST_AUTH_BYPASS=true`
 * for an isolated staging harness. Production is always denied — the opt-in
 * flag cannot re-enable it there (SEC-1 hardening).
 */
export function isTestAuthBypassEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') {
    return false;
  }
  if (env.NODE_ENV === 'test' || env.NODE_ENV === 'development') {
    return true;
  }
  return env.ALLOW_TEST_AUTH_BYPASS === 'true';
}
