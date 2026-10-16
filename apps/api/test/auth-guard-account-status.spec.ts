import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { generateTokenPair } from '../src/modules/auth/utils/token.utils';
import type { AccountAccessService } from '../src/modules/auth/services/account-access.service';

const SECRET = 'ogroniedu-super-secure-jwt-secret-key-2026-bangladesh';

function contextFor(headers: Record<string, string>): ExecutionContext {
  const request: { headers: Record<string, string>; user?: unknown } = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function tokenFor(authEpoch = 0): string {
  return generateTokenPair({
    jwtSecret: SECRET,
    accessTokenExpirySeconds: 900,
    user: { id: 'user-1', roles: ['student'], preferredLocale: 'bn', authEpoch },
  }).accessToken;
}

function guardWith(snapshot: unknown): AuthGuard {
  const accountAccess = {
    getSnapshot: vi.fn().mockResolvedValue(snapshot),
  } as unknown as AccountAccessService;
  return new AuthGuard(undefined, accountAccess);
}

describe('AuthGuard account-state enforcement', () => {
  it('accepts a token for an active, matching-epoch account', async () => {
    const guard = guardWith({ id: 'user-1', status: 'active', authEpoch: 0 });
    await expect(
      guard.canActivate(contextFor({ authorization: `Bearer ${tokenFor(0)}` })),
    ).resolves.toBe(true);
  });

  it('NEGATIVE: rejects access for a suspended account even with a valid JWT', async () => {
    const guard = guardWith({ id: 'user-1', status: 'suspended', authEpoch: 0 });
    await expect(
      guard.canActivate(contextFor({ authorization: `Bearer ${tokenFor(0)}` })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('NEGATIVE: rejects access for a deactivated account', async () => {
    const guard = guardWith({ id: 'user-1', status: 'deactivated', authEpoch: 0 });
    await expect(
      guard.canActivate(contextFor({ authorization: `Bearer ${tokenFor(0)}` })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('NEGATIVE: rejects a token whose credential epoch is stale (password change)', async () => {
    const guard = guardWith({ id: 'user-1', status: 'active', authEpoch: 3 });
    await expect(
      guard.canActivate(contextFor({ authorization: `Bearer ${tokenFor(0)}` })),
    ).rejects.toThrow(/credentials are no longer valid/i);
  });

  it('NEGATIVE: rejects a token for an account that no longer exists', async () => {
    const guard = guardWith(null);
    await expect(
      guard.canActivate(contextFor({ authorization: `Bearer ${tokenFor(0)}` })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('SECURITY: only HS256-signed access tokens are accepted', () => {
    const guard = new AuthGuard();
    const hs512 = jwt.sign({ sub: 'user-1', roles: ['student'] }, SECRET, {
      algorithm: 'HS512',
      expiresIn: 900,
    });
    expect(() => guard.canActivate(contextFor({ authorization: `Bearer ${hs512}` }))).toThrow(
      UnauthorizedException,
    );
  });

  it('SECURITY: rejects a token with a mismatched issuer claim', () => {
    const guard = new AuthGuard();
    const token = jwt.sign({ sub: 'user-1', roles: ['student'], iss: 'evil-issuer' }, SECRET, {
      algorithm: 'HS256',
      expiresIn: 900,
    });
    expect(() => guard.canActivate(contextFor({ authorization: `Bearer ${token}` }))).toThrow(
      /issuer/i,
    );
  });

  it('keeps the synchronous no-DI path working (backward compatibility)', () => {
    const guard = new AuthGuard();
    const canActivate = guard.canActivate(contextFor({ authorization: `Bearer ${tokenFor(0)}` }));
    expect(canActivate).toBe(true);
  });
});
