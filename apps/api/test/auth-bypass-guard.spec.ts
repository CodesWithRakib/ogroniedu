import { describe, it, expect, vi, afterEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { isTestAuthBypassEnabled } from '../src/common/auth/test-auth';

function contextFor(headers: Record<string, string>) {
  const request: { headers: Record<string, string>; user?: unknown } = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
    request,
  } as never;
}

describe('Auth bypass hardening (test/development only)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('enables the escape hatch in test and development, but never production', () => {
    expect(isTestAuthBypassEnabled({ NODE_ENV: 'test' })).toBe(true);
    expect(isTestAuthBypassEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(isTestAuthBypassEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(
      isTestAuthBypassEnabled({ NODE_ENV: 'production', ALLOW_TEST_AUTH_BYPASS: 'true' }),
    ).toBe(true);
    expect(isTestAuthBypassEnabled({})).toBe(false);
  });

  it('rejects an x-user-id impersonation header in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const guard = new AuthGuard();
    expect(() =>
      guard.canActivate(contextFor({ 'x-user-id': 'any-user', 'x-user-roles': 'super_admin' })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a mock bearer token in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const guard = new AuthGuard();
    expect(() =>
      guard.canActivate(contextFor({ authorization: 'Bearer mock:any-user:super_admin' })),
    ).toThrow(UnauthorizedException);
  });

  it('still honours the bypass when running under NODE_ENV=test', () => {
    vi.stubEnv('NODE_ENV', 'test');
    const guard = new AuthGuard();
    const ctx = contextFor({ 'x-user-id': 'test-user', 'x-user-roles': 'tutor' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect((ctx as unknown as { request: { user: { id: string } } }).request.user.id).toBe(
      'test-user',
    );
  });
});
