/**
 * Swagger UI must never be mounted in production deployments (SEC-6): the
 * generated document maps the full route/DTO surface and is reachable without
 * authentication unless an operator blocks it at the proxy.
 *
 * Development, test and other non-production harnesses keep it for DX and QA.
 */
export function isSwaggerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ENABLE_SWAGGER === 'true') {
    return true;
  }
  return env.NODE_ENV !== 'production';
}
