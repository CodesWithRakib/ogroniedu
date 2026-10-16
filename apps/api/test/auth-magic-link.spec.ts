import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { RateLimiterService } from '../src/modules/auth/rate-limiter.service';
import { StructuredLoggerService } from '../src/common/logger/structured-logger.service';
import { OtpDeliveryService } from '../src/modules/auth/delivery/otp-delivery.service';
import type { OtpMessage } from '../src/modules/auth/delivery/otp-delivery.types';
import { hashToken } from '../src/modules/auth/utils/token.utils';

interface QueryRoute {
  match: string;
  result: unknown[] | ((params: unknown[]) => unknown[]);
}

function createDataSource(routes: QueryRoute[]) {
  return {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      for (const route of routes) {
        if (sql.includes(route.match)) {
          return typeof route.result === 'function' ? route.result(params) : route.result;
        }
      }
      return [];
    }),
    createQueryRunner: vi.fn(),
  };
}

function createService(dataSource: ReturnType<typeof createDataSource>) {
  const logger = new StructuredLoggerService();
  vi.spyOn(logger, 'log').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  const delivered: OtpMessage[] = [];
  const otpDelivery = {
    deliver: vi.fn(async (message: OtpMessage) => {
      delivered.push(message);
      return { delivered: true, provider: 'dev', attempts: [] };
    }),
  } as unknown as OtpDeliveryService;

  const service = new AuthService(
    dataSource as never,
    new RateLimiterService(),
    logger,
    undefined,
    otpDelivery,
  );
  return { service, delivered };
}

const ACTIVE_USER = {
  id: 'user-1',
  status: 'active',
  email: 'learner@example.com',
  phone_e164: '+8801711000000',
  password_hash: null,
  display_name: 'Learner',
  preferred_locale: 'bn',
  auth_epoch: 0,
};

describe('magic-link request', () => {
  it('returns a generic response and stores nothing for an unknown account', async () => {
    const dataSource = createDataSource([{ match: 'lower(email) = lower($1)', result: [] }]);
    const { service } = createService(dataSource);

    const result = await service.requestMagicLink(
      { email: 'nobody@example.com' },
      { ip: '1.1.1.1' },
    );
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/if an account exists/i);

    const inserted = dataSource.query.mock.calls.some(([sql]) =>
      String(sql).includes('INSERT INTO auth_magic_links'),
    );
    expect(inserted).toBe(false);
  });

  it('stores only a hashed token and delivers the raw token out-of-band', async () => {
    const dataSource = createDataSource([
      { match: 'lower(email) = lower($1)', result: [{ id: 'user-1', status: 'active' }] },
      { match: 'UPDATE auth_magic_links', result: [] },
      { match: 'INSERT INTO auth_magic_links', result: [] },
    ]);
    const { service, delivered } = createService(dataSource);

    const result = await service.requestMagicLink(
      { email: 'learner@example.com', redirectPath: 'https://evil.example.com' },
      { ip: '1.1.1.2' },
    );

    expect(result.success).toBe(true);
    expect(result).not.toHaveProperty('token');
    expect(result).not.toHaveProperty('debugToken');

    const insertCall = dataSource.query.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO auth_magic_links'),
    );
    expect(insertCall).toBeDefined();
    const insertParams = (insertCall?.[1] ?? []) as unknown[];
    const tokenHash = String(insertParams[2]);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    // Untrusted redirect paths are dropped, not persisted.
    expect(insertParams[3]).toBeNull();

    expect(delivered).toHaveLength(1);
    expect(delivered[0].channel).toBe('email');
    expect(delivered[0].purpose).toBe('magic_link');
    // The delivered raw token hashes to the stored hash (the raw token is never stored).
    expect(hashToken(delivered[0].code)).toBe(tokenHash);
    expect(tokenHash).not.toBe(delivered[0].code);
  });

  it('never reveals account existence when the account is suspended', async () => {
    const dataSource = createDataSource([
      { match: 'lower(email) = lower($1)', result: [{ id: 'user-1', status: 'suspended' }] },
    ]);
    const { service } = createService(dataSource);
    const result = await service.requestMagicLink(
      { email: 'learner@example.com' },
      { ip: '1.1.1.3' },
    );
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/if an account exists/i);
  });
});

describe('magic-link consumption', () => {
  function consumeRoutes(link: Record<string, unknown>) {
    return createDataSource([
      { match: 'FROM auth_magic_links', result: [link] },
      { match: 'UPDATE auth_magic_links', result: [{ id: 'link-1' }] },
      { match: 'FROM users u', result: [ACTIVE_USER] },
      { match: 'FROM user_roles', result: [{ code: 'student' }] },
      { match: 'INSERT INTO auth_sessions', result: [] },
      { match: 'UPDATE users SET last_login_at', result: [] },
    ]);
  }

  it('issues a session and consumes the token atomically on success', async () => {
    const dataSource = consumeRoutes({
      id: 'link-1',
      user_id: 'user-1',
      redirect_path: '/dashboard/student',
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000),
      consumed_at: null,
    });
    const { service } = createService(dataSource);

    const result = await service.consumeMagicLink({ token: 'a'.repeat(43) }, { ip: '1.1.1.4' });
    expect(result.user.id).toBe('user-1');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.redirectPath).toBe('/dashboard/student');

    const consumeCall = dataSource.query.mock.calls.find(([sql]) =>
      String(sql).includes('consumed_at IS NULL AND expires_at > now()'),
    );
    expect(consumeCall).toBeDefined();
  });

  it('NEGATIVE: rejects a token that was already consumed', async () => {
    const dataSource = consumeRoutes({
      id: 'link-1',
      user_id: 'user-1',
      redirect_path: null,
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000),
      consumed_at: new Date(Date.now() - 1000),
    });
    const { service } = createService(dataSource);
    await expect(service.consumeMagicLink({ token: 'b'.repeat(43) })).rejects.toThrow(
      /already been used/i,
    );
  });

  it('NEGATIVE: rejects an expired token', async () => {
    const dataSource = consumeRoutes({
      id: 'link-1',
      user_id: 'user-1',
      redirect_path: null,
      attempts: 0,
      expires_at: new Date(Date.now() - 1000),
      consumed_at: null,
    });
    const { service } = createService(dataSource);
    await expect(service.consumeMagicLink({ token: 'c'.repeat(43) })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('NEGATIVE: rejects an unknown token', async () => {
    const dataSource = createDataSource([{ match: 'FROM auth_magic_links', result: [] }]);
    const { service } = createService(dataSource);
    await expect(service.consumeMagicLink({ token: 'd'.repeat(43) })).rejects.toThrow(
      /invalid or expired/i,
    );
  });

  it('NEGATIVE: rejects a concurrent-consumption race when the atomic update matches nothing', async () => {
    const dataSource = createDataSource([
      {
        match: 'FROM auth_magic_links',
        result: [
          {
            id: 'link-1',
            user_id: 'user-1',
            redirect_path: null,
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
            consumed_at: null,
          },
        ],
      },
      { match: 'UPDATE auth_magic_links', result: [] },
    ]);
    const { service } = createService(dataSource);
    await expect(service.consumeMagicLink({ token: 'e'.repeat(43) })).rejects.toThrow(
      /already been used/i,
    );
  });
});

describe('OTP flow delivery + recovery semantics', () => {
  it('delivers the OTP through the configured provider chain', async () => {
    const dataSource = createDataSource([
      { match: 'SELECT id FROM users WHERE (lower(email)', result: [] },
      { match: 'UPDATE auth_verification_codes', result: [] },
      { match: 'INSERT INTO auth_verification_codes', result: [] },
    ]);
    const { service, delivered } = createService(dataSource);

    const result = await service.requestCode(
      { contact: '+8801711000000', purpose: 'contact_verification' },
      { ip: '1.1.1.5' },
    );
    expect(result.success).toBe(true);
    expect(delivered).toHaveLength(1);
    expect(delivered[0].channel).toBe('sms');
    expect(delivered[0].to).toBe('+8801711000000');
  });

  it('invalidates previously issued codes for the same contact/purpose', async () => {
    const dataSource = createDataSource([
      { match: 'SELECT id FROM users WHERE (lower(email)', result: [] },
      { match: 'UPDATE auth_verification_codes', result: [] },
      { match: 'INSERT INTO auth_verification_codes', result: [] },
    ]);
    const { service } = createService(dataSource);
    await service.requestCode(
      { contact: '+8801711000000', purpose: 'contact_verification' },
      { ip: '1.1.1.6' },
    );

    const invalidate = dataSource.query.mock.calls.find(
      ([sql]) =>
        String(sql).includes('SET verified_at = now()') && String(sql).includes('contact = ANY'),
    );
    expect(invalidate).toBeDefined();
  });

  it('checks (but does not consume) a password-recovery code so reset-password owns the single use', async () => {
    const codeHash = hashToken('123456');
    const dataSource = createDataSource([
      {
        match: 'FROM auth_verification_codes',
        result: [
          {
            id: 'code-1',
            user_id: 'user-1',
            code_hash: codeHash,
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
          },
        ],
      },
    ]);
    const { service } = createService(dataSource);

    await expect(
      service.verifyCode({
        contact: '+8801711000000',
        code: '123456',
        purpose: 'password_recovery',
      }),
    ).resolves.toEqual({ success: true, message: 'Verification successful' });

    const consumed = dataSource.query.mock.calls.some(([sql]) =>
      String(sql).includes('UPDATE auth_verification_codes'),
    );
    expect(consumed).toBe(false);
  });
});
