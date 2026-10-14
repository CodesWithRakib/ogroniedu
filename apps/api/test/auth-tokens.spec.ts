import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateTokenPair, hashToken } from '../src/modules/auth/utils/token.utils';
import { assertGuardianConsent } from '../src/modules/guardians/utils/guardian-consent.util';

describe('auth token utils (Phase 23 P1-4 slice)', () => {
  it('hashToken is deterministic SHA-256 hex', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  it('generateTokenPair issues a verifiable JWT + opaque refresh token', () => {
    const secret = 'test-secret-16-chars-min';
    const { accessToken, refreshToken } = generateTokenPair({
      jwtSecret: secret,
      accessTokenExpirySeconds: 900,
      user: { id: 'u-1', email: null, phone: '+8801', roles: ['student'], preferredLocale: 'bn' },
    });
    const decoded = jwt.verify(accessToken, secret) as Record<string, unknown>;
    expect(decoded.sub).toBe('u-1');
    expect(decoded.roles).toEqual(['student']);
    expect(typeof decoded.exp).toBe('number');
    expect(typeof decoded.iat).toBe('number');
    expect((decoded.exp as number) - (decoded.iat as number)).toBe(900);
    expect(refreshToken).toMatch(/^[0-9a-f]{80}$/);
  });
});

describe('guardian consent gate (Phase 23 P1-4 slice)', () => {
  const POLICY = 'v1.0-bd-minor-consent';

  it('accepts a matching policy version with explicit affirmation', () => {
    expect(() =>
      assertGuardianConsent({ consentPolicyVersion: POLICY, consentAgreed: true }, POLICY),
    ).not.toThrow();
  });

  it('rejects wrong policy versions and missing affirmation', () => {
    expect(() =>
      assertGuardianConsent({ consentPolicyVersion: 'v9', consentAgreed: true }, POLICY),
    ).toThrow(/consent policy version/i);
    expect(() =>
      assertGuardianConsent({ consentPolicyVersion: POLICY, consentAgreed: false }, POLICY),
    ).toThrow(/consent affirmation/i);
  });
});
