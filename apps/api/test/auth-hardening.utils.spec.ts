import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_ALGORITHM,
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
  generateTokenPair,
} from '../src/modules/auth/utils/token.utils';
import {
  isPrivilegedProvisionedRole,
  isSelfSignupRole,
  normalizeLocale,
} from '../src/modules/auth/utils/registration-policy';
import {
  generateMagicLinkToken,
  hashMagicLinkToken,
  resolveSafeRedirectPath,
} from '../src/modules/auth/utils/magic-link.utils';

describe('access token hardening', () => {
  it('issues HS256 tokens with iss/aud and the credential epoch', () => {
    const { accessToken } = generateTokenPair({
      jwtSecret: 'unit-test-secret-value-16ch',
      accessTokenExpirySeconds: 900,
      user: {
        id: 'u-1',
        email: null,
        phone: null,
        roles: ['tutor'],
        preferredLocale: 'bn',
        authEpoch: 2,
      },
    });

    const decoded = jwt.decode(accessToken, { complete: true });
    expect(decoded?.header.alg).toBe(ACCESS_TOKEN_ALGORITHM);

    const payload = jwt.verify(accessToken, 'unit-test-secret-value-16ch') as Record<
      string,
      unknown
    >;
    expect(payload.iss).toBe(ACCESS_TOKEN_ISSUER);
    expect(payload.aud).toBe(ACCESS_TOKEN_AUDIENCE);
    expect(payload.authEpoch).toBe(2);
  });

  it('defaults the credential epoch to 0 when not supplied', () => {
    const { accessToken } = generateTokenPair({
      jwtSecret: 'unit-test-secret-value-16ch',
      accessTokenExpirySeconds: 60,
      user: { id: 'u-2', roles: ['student'], preferredLocale: 'bn' },
    });
    const payload = jwt.verify(accessToken, 'unit-test-secret-value-16ch') as Record<
      string,
      unknown
    >;
    expect(payload.authEpoch).toBe(0);
  });
});

describe('registration role policy', () => {
  it('allows only student/guardian/tutor self-signup', () => {
    expect(isSelfSignupRole('student')).toBe(true);
    expect(isSelfSignupRole('guardian')).toBe(true);
    expect(isSelfSignupRole('tutor')).toBe(true);
  });

  it('NEGATIVE: privileged roles are never self-signup roles', () => {
    for (const role of [
      'admin',
      'super_admin',
      'support_agent',
      'compliance_reviewer',
      'organization_owner',
      'organization_staff',
    ]) {
      expect(isSelfSignupRole(role)).toBe(false);
      expect(isPrivilegedProvisionedRole(role)).toBe(true);
    }
  });

  it('normalizes unknown locales to Bengali', () => {
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('bn')).toBe('bn');
    expect(normalizeLocale('fr')).toBe('bn');
    expect(normalizeLocale(undefined)).toBe('bn');
  });
});

describe('magic-link utilities', () => {
  it('generates high-entropy, URL-safe single-use tokens', () => {
    const token = generateMagicLinkToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateMagicLinkToken()).not.toBe(token);
    expect(hashMagicLinkToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('accepts only internal allow-listed destinations', () => {
    expect(resolveSafeRedirectPath('/dashboard/tutor')).toBe('/dashboard/tutor');
    expect(resolveSafeRedirectPath('/bn/onboarding')).toBe('/bn/onboarding');
    expect(resolveSafeRedirectPath('/admin/users')).toBe('/admin/users');
  });

  it('NEGATIVE: rejects open-redirect and malformed destinations', () => {
    for (const candidate of [
      'https://evil.example.com',
      '//evil.example.com',
      '/\\evil.example.com',
      'javascript:alert(1)',
      '/etc/passwd',
      '../../secret',
      'dashboard', // relative without leading slash
      '/dashboard\nX-Injected: 1',
      '',
    ]) {
      expect(resolveSafeRedirectPath(candidate)).toBeNull();
    }
    expect(resolveSafeRedirectPath(undefined)).toBeNull();
    expect(resolveSafeRedirectPath(12345)).toBeNull();
    expect(resolveSafeRedirectPath('/' + 'a'.repeat(300))).toBeNull();
  });
});
