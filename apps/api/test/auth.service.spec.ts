import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService } from '../src/modules/auth/auth.service';
import { RateLimiterService } from '../src/modules/auth/rate-limiter.service';
import { StructuredLoggerService } from '../src/common/logger/structured-logger.service';

describe('AuthService Unit Tests', () => {
  let authService: AuthService;
  let mockDataSource: any;
  let mockRateLimiter: RateLimiterService;
  let mockLogger: StructuredLoggerService;
  let mockQueryRunner: any;

  beforeEach(() => {
    mockQueryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      query: vi.fn(),
    };

    mockDataSource = {
      query: vi.fn(),
      createQueryRunner: vi.fn(() => mockQueryRunner),
    };

    mockRateLimiter = new RateLimiterService();
    mockLogger = new StructuredLoggerService();
    vi.spyOn(mockLogger, 'log').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'warn').mockImplementation(() => {});

    authService = new AuthService(mockDataSource, mockRateLimiter, mockLogger);
  });

  describe('User Registration', () => {
    it('should successfully register student with email and hash password', async () => {
      mockQueryRunner.query
        .mockResolvedValueOnce([]) // Insert user
        .mockResolvedValueOnce([{ id: 'role-uuid-1', code: 'student' }]) // Role query
        .mockResolvedValueOnce([]) // Insert user_roles
        .mockResolvedValueOnce([]); // Insert auth_sessions

      mockDataSource.query.mockResolvedValue([]); // Check duplicates

      const res = await authService.register({
        displayName: 'Rahim Ahmed',
        email: 'rahim@example.com',
        password: 'Password123!',
        role: 'student',
        preferredLocale: 'bn',
      });

      expect(res.user.displayName).toBe('Rahim Ahmed');
      expect(res.user.email).toBe('rahim@example.com');
      expect(res.user.roles).toContain('student');
      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('NEGATIVE TEST: should reject registration when neither email nor phone provided', async () => {
      await expect(
        authService.register({
          displayName: 'No Contact User',
          password: 'Password123!',
          role: 'guardian',
        }),
      ).rejects.toThrow('At least one contact method (email or phone) is mandatory.');
    });

    it('NEGATIVE TEST: should reject registration if email already exists', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([]) // banned identities check: not banned
        .mockResolvedValueOnce([{ id: 'existing-id' }]); // duplicate email found

      await expect(
        authService.register({
          displayName: 'Duplicate User',
          email: 'duplicate@test.com',
          password: 'Password123!',
          role: 'student',
        }),
      ).rejects.toThrow('A user with this email address already exists.');
    });

    it('NEGATIVE TEST: should reject registration if email is blacklisted', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ reason: 'Violations' }]); // blacklisted match

      await expect(
        authService.register({
          displayName: 'Banned User',
          email: 'banned@test.com',
          password: 'Password123!',
          role: 'student',
        }),
      ).rejects.toThrow('স্থায়ীভাবে নিষিদ্ধ');
    });
  });

  describe('User Login', () => {
    it('should successfully log in with valid email and password', async () => {
      const hashed = await bcrypt.hash('Secret123!', 10);
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            id: 'user-123',
            email: 'test@example.com',
            phone_e164: null,
            password_hash: hashed,
            display_name: 'Test User',
            preferred_locale: 'bn',
            status: 'active',
          },
        ]) // user lookup
        .mockResolvedValueOnce([{ code: 'guardian' }]) // roles lookup
        .mockResolvedValueOnce([]) // update last_login
        .mockResolvedValueOnce([]); // insert session

      const res = await authService.login({
        identifier: 'test@example.com',
        password: 'Secret123!',
      });

      expect(res.user.id).toBe('user-123');
      expect(res.user.roles).toContain('guardian');
      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
    });

    it('NEGATIVE TEST: should reject login with incorrect password', async () => {
      const hashed = await bcrypt.hash('CorrectPassword123!', 10);
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'user-123',
          email: 'test@example.com',
          password_hash: hashed,
          status: 'active',
        },
      ]);

      await expect(
        authService.login({
          identifier: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow('Invalid email/phone or password');
    });

    it('NEGATIVE TEST: should reject login for suspended account', async () => {
      const hashed = await bcrypt.hash('Secret123!', 10);
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'user-suspended',
          email: 'suspended@example.com',
          password_hash: hashed,
          status: 'suspended',
        },
      ]);

      await expect(
        authService.login({
          identifier: 'suspended@example.com',
          password: 'Secret123!',
        }),
      ).rejects.toThrow('Account is suspended');
    });
  });

  describe('Token Rotation & Replay Attack Detection', () => {
    it('should rotate valid refresh token into a new session', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            id: 'session-1',
            user_id: 'user-123',
            expires_at: new Date(Date.now() + 100000),
            revoked_at: null,
          },
        ]) // session lookup
        .mockResolvedValueOnce([]) // revoke old session
        .mockResolvedValueOnce([
          {
            id: 'user-123',
            email: 'test@example.com',
            preferred_locale: 'bn',
            status: 'active',
          },
        ]) // user lookup
        .mockResolvedValueOnce([{ code: 'tutor' }]) // roles
        .mockResolvedValueOnce([]); // insert new session

      const res = await authService.refresh('valid-refresh-token-abc');
      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
    });

    it('SECURITY REPLAY ATTACK DETECTION: should revoke ALL user sessions when an already-revoked refresh token is reused', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            id: 'session-revoked',
            user_id: 'victim-user-id',
            expires_at: new Date(Date.now() + 100000),
            revoked_at: new Date(Date.now() - 5000), // already revoked!
          },
        ]) // session lookup
        .mockResolvedValueOnce([]); // update query to revoke all sessions

      await expect(authService.refresh('replayed-stolen-token')).rejects.toThrow(
        /Compromised refresh token reused. All active sessions revoked/,
      );

      // Verify that revocation query was triggered across all sessions of this user
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE auth_sessions'),
        expect.arrayContaining(['victim-user-id']),
      );
    });
  });

  describe('OTP Contact Verification & Password Reset', () => {
    it('should request and generate 6-digit verification code', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([]) // user check
        .mockResolvedValueOnce([]); // insert code

      const res = await authService.requestCode({
        contact: '+8801712345678',
        purpose: 'contact_verification',
      });

      expect(res.success).toBe(true);
      expect(res.contact).toBe('+8801712345678');
      expect(res.expiresInSeconds).toBe(600);
      expect(res.debugCode).toBeDefined();
      expect(res.debugCode).toMatch(/^\d{6}$/);
    });

    it('NEGATIVE TEST: should reject verifyCode when code is incorrect', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'code-rec-1',
          user_id: 'user-123',
          code_hash: 'different-hash',
          attempts: 1,
          expires_at: new Date(Date.now() + 100000),
        },
      ]);

      await expect(
        authService.verifyCode({
          contact: '+8801712345678',
          code: '999999',
          purpose: 'contact_verification',
        }),
      ).rejects.toThrow('Incorrect verification code');
    });
  });
});
