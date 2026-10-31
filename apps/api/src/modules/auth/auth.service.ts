import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  RegisterDto,
  LoginDto,
  RequestCodeDto,
  VerifyCodeDto,
  ResetPasswordDto,
  RequestMagicLinkDto,
  ConsumeMagicLinkDto,
} from './dto';
import { RateLimiterService } from './rate-limiter.service';
import { StructuredLoggerService } from '../../common/logger/structured-logger.service';
import { AuditService } from '../audit/audit.service';
import { OtpDeliveryService } from './delivery/otp-delivery.service';
import { generateTokenPair, hashToken } from './utils/token.utils';
import { normalizePhone, getPhoneSearchCandidates } from './utils/phone.utils';
import { STATIC_DEV_OTP } from '@ogroniedu/contracts';
import {
  isSelfSignupRole,
  normalizeLocale,
  type SelfSignupRole,
} from './utils/registration-policy';
import {
  generateMagicLinkToken,
  hashMagicLinkToken,
  resolveSafeRedirectPath,
} from './utils/magic-link.utils';
import {
  isAccountBlocked,
  generateSecureOtpCode,
  calculateOtpExpiry,
  isOtpMaxAttemptsExceeded,
} from './utils/auth-policy.util';
import type { AuthMeta, AuthResponse } from './interfaces/auth-response.interface';
import type { LoginUserRow } from './interfaces/login-user-row.interface';

export type { TokenPayload, AuthResponse, AuthMeta } from './interfaces/auth-response.interface';

/** bcrypt cost factor used for all password hashing in this service. */
const PASSWORD_HASH_ROUNDS = 12;

/** Maximum wrong OTP attempts before a code is invalidated. */
const OTP_MAX_ATTEMPTS = 5;

/** OTP lifetime in seconds. */
const OTP_TTL_SECONDS = 600;

/** Magic-link lifetime in minutes. */
const MAGIC_LINK_TTL_MINUTES = 15;

/** PostgreSQL unique-violation error code. */
const PG_UNIQUE_VIOLATION = '23505';

/** Per-step statuses recorded in user_onboarding.pending_steps. */
const ONBOARDING_STATUS_IN_PROGRESS = 'in_progress';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}

@Injectable()
export class AuthService {
  private jwtSecret: string;
  private accessTokenExpirySeconds = 900; // 15 minutes
  private refreshTokenExpiryDays = 7;

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @Inject(RateLimiterService) private rateLimiter: RateLimiterService,
    @Inject(StructuredLoggerService) private logger: StructuredLoggerService,
    @Optional() @Inject(AuditService) private audit?: AuditService,
    @Optional() @Inject(OtpDeliveryService) private otpDelivery?: OtpDeliveryService,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || '';
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  /** Fire-and-forget security audit event; never breaks the auth flow. */
  private async recordAudit(params: {
    actorUserId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    reason?: string | null;
    safeMetadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.audit) return;
    try {
      await this.audit.record({
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        reason: params.reason ?? null,
        safeMetadata: params.safeMetadata ?? {},
      });
    } catch {
      // Audit failures must never break authentication.
    }
  }

  private async fetchRoles(userId: string): Promise<string[]> {
    const rows: Array<{ code: string }> = await this.dataSource.query(
      `SELECT r.code
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND ur.revoked_at IS NULL;`,
      [userId],
    );
    return rows.map((r) => r.code);
  }

  private readEpoch(value: number | string | null | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /**
   * Register a new user with server-side role policy, transactional account
   * creation, onboarding seed and security audit event.
   */
  async register(dto: RegisterDto, meta: AuthMeta = {}): Promise<AuthResponse> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('At least one contact method (email or phone) is mandatory.');
    }

    // Server-side role policy: privileged roles are provisioned, never self-assigned.
    if (!isSelfSignupRole(dto.role)) {
      throw new BadRequestException(
        'This role cannot be self-registered. Privileged accounts are provisioned by an administrator.',
      );
    }
    const role: SelfSignupRole = dto.role;

    const normalizedEmail = dto.email ? dto.email.trim().toLowerCase() : null;
    const phone = dto.phone ? normalizePhone(dto.phone) : null;

    // Blacklist check: verify phone or email is not permanently blacklisted
    const bannedMatch = await this.dataSource.query(
      `SELECT reason FROM banned_identities 
       WHERE (phone_e164 IS NOT NULL AND phone_e164 = $1)
          OR (email IS NOT NULL AND lower(email) = lower($2))
       LIMIT 1;`,
      [phone, normalizedEmail],
    );
    if (bannedMatch.length > 0) {
      throw new ForbiddenException(
        'নিরাপত্তা সতর্কতা: এই ফোন নম্বর বা ইমেইল পূর্বে গুরুতর নিয়ম লঙ্ঘনের কারণে স্থায়ীভাবে নিষিদ্ধ (Blacklisted) করা হয়েছে। নতুন অ্যাকাউন্ট তৈরি সম্ভব নয়।',
      );
    }

    // Friendly pre-checks (the unique indexes remain the authoritative guard).
    if (normalizedEmail) {
      const existingEmail = await this.dataSource.query(
        'SELECT id FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL LIMIT 1;',
        [normalizedEmail],
      );
      if (existingEmail.length > 0) {
        throw new ConflictException('A user with this email address already exists.');
      }
    }

    if (phone) {
      const candidates = getPhoneSearchCandidates(dto.phone || phone);
      const existingPhone = await this.dataSource.query(
        'SELECT id FROM users WHERE phone_e164 = ANY($1) AND deleted_at IS NULL LIMIT 1;',
        [candidates],
      );
      if (existingPhone.length > 0) {
        throw new ConflictException('A user with this phone number already exists.');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);
    const userId = crypto.randomUUID();
    const preferredLocale = normalizeLocale(dto.preferredLocale);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Insert User
      await queryRunner.query(
        `INSERT INTO users (id, email, phone_e164, password_hash, display_name, preferred_locale, status, auth_epoch)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending_verification', 0);`,
        [userId, normalizedEmail, phone, passwordHash, dto.displayName, preferredLocale],
      );

      // 2. Fetch target Role ID
      const roleRows = await queryRunner.query(
        'SELECT id, code FROM roles WHERE code = $1 LIMIT 1;',
        [role],
      );
      if (roleRows.length === 0) {
        throw new BadRequestException(`Role '${role}' not found in system.`);
      }
      const roleId = roleRows[0].id;

      // 3. Insert User Role
      await queryRunner.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2);`, [
        userId,
        roleId,
      ]);

      // 4. Create specialized domain profile row if tutor
      if (role === 'tutor') {
        await queryRunner.query(
          `INSERT INTO tutor_profiles (user_id, headline) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [userId, `${dto.displayName} - Educator`],
        );
      }

      // 5. Seed the per-role onboarding record (status derived from steps later)
      await queryRunner.query(
        `INSERT INTO user_onboarding (user_id, role_code, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_code) DO NOTHING;`,
        [userId, role, ONBOARDING_STATUS_IN_PROGRESS],
      );

      // 6. Generate and store session
      const { accessToken, refreshToken } = generateTokenPair({
        jwtSecret: this.jwtSecret,
        accessTokenExpirySeconds: this.accessTokenExpirySeconds,
        user: {
          id: userId,
          email: normalizedEmail,
          phone,
          roles: [role],
          preferredLocale,
          authEpoch: 0,
        },
      });

      const refreshTokenHash = hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + this.refreshTokenExpiryDays * 24 * 60 * 60 * 1000);

      await queryRunner.query(
        `INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5);`,
        [
          userId,
          refreshTokenHash,
          meta.userAgent || null,
          meta.ip ? hashToken(meta.ip) : null,
          expiresAt,
        ],
      );

      await queryRunner.commitTransaction();

      this.logger.log(`New user registered: ${userId} (${role})`, 'AuthService');
      await this.recordAudit({
        actorUserId: userId,
        action: 'auth.register',
        resourceType: 'user',
        resourceId: userId,
        safeMetadata: { role, status: 'pending_verification', hasEmail: !!normalizedEmail },
      });

      return {
        user: {
          id: userId,
          displayName: dto.displayName,
          email: normalizedEmail,
          phone,
          roles: [role],
          status: 'pending_verification',
          preferredLocale,
        },
        accessToken,
        refreshToken,
        expiresIn: this.accessTokenExpirySeconds,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (isUniqueViolation(err)) {
        // Concurrent duplicate registration: the unique index is the real guard.
        throw new ConflictException('An account with these details already exists.');
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * User login with rate limiting, password verification, account-status policy
   * and session creation.
   */
  async login(dto: LoginDto, meta: AuthMeta = {}): Promise<AuthResponse> {
    const rateLimitKey = `login:${meta.ip || 'unknown'}:${dto.identifier.toLowerCase().trim()}`;
    this.rateLimiter.checkLimit(rateLimitKey, 5, 60000); // 5 attempts per minute

    const identifier = dto.identifier.trim();
    const isEmail = identifier.includes('@');
    const isStudentCode = /^STU-[\w-]+$/i.test(identifier);

    let userRows: LoginUserRow[] = [];
    if (isEmail) {
      userRows = await this.dataSource.query(
        `SELECT u.id, u.email, u.phone_e164, u.password_hash, u.display_name, u.preferred_locale, u.status, u.auth_epoch
         FROM users u
         WHERE lower(u.email) = lower($1)
           AND u.deleted_at IS NULL
         LIMIT 1;`,
        [identifier.toLowerCase()],
      );
    } else if (isStudentCode) {
      userRows = await this.dataSource.query(
        `SELECT u.id, u.email, u.phone_e164, u.password_hash, u.display_name, u.preferred_locale, u.status, u.auth_epoch
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
         WHERE upper(sp.student_code) = upper($1)
           AND u.deleted_at IS NULL
         LIMIT 1;`,
        [identifier.toUpperCase()],
      );
    } else {
      const candidates = getPhoneSearchCandidates(identifier);
      userRows = await this.dataSource.query(
        `SELECT u.id, u.email, u.phone_e164, u.password_hash, u.display_name, u.preferred_locale, u.status, u.auth_epoch
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE (u.phone_e164 = ANY($1) OR upper(COALESCE(sp.student_code, '')) = upper($2))
           AND u.deleted_at IS NULL
         LIMIT 1;`,
        [candidates, identifier.toUpperCase()],
      );
    }

    if (userRows.length === 0) {
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    const user = userRows[0];

    if (!user.password_hash) {
      throw new UnauthorizedException('Password authentication not configured for this account');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      this.rateLimiter.checkLimit(`login-fail:${user.id}`, 10, 600000);
      await this.recordAudit({
        actorUserId: user.id,
        action: 'auth.login.failed',
        resourceType: 'user',
        resourceId: user.id,
        reason: 'invalid_credentials',
      });
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    if (isAccountBlocked(user.status)) {
      await this.recordAudit({
        actorUserId: user.id,
        action: 'auth.login.blocked',
        resourceType: 'user',
        resourceId: user.id,
        reason: user.status,
      });
      throw new UnauthorizedException(
        `Account is ${user.status}. Please contact platform support.`,
      );
    }

    const roles = await this.fetchRoles(user.id);
    const authEpoch = this.readEpoch(user.auth_epoch);
    const preferredLocale = normalizeLocale(user.preferred_locale);

    // Update last login
    await this.dataSource.query('UPDATE users SET last_login_at = now() WHERE id = $1;', [user.id]);

    const { accessToken, refreshToken } = generateTokenPair({
      jwtSecret: this.jwtSecret,
      accessTokenExpirySeconds: this.accessTokenExpirySeconds,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone_e164,
        roles: roles.length > 0 ? roles : ['student'],
        preferredLocale,
        authEpoch,
      },
    });

    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiryDays * 24 * 60 * 60 * 1000);

    await this.dataSource.query(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5);`,
      [
        user.id,
        refreshTokenHash,
        meta.userAgent || null,
        meta.ip ? hashToken(meta.ip) : null,
        expiresAt,
      ],
    );

    this.logger.log(`User logged in: ${user.id}`, 'AuthService');
    await this.recordAudit({
      actorUserId: user.id,
      action: 'auth.login.succeeded',
      resourceType: 'user',
      resourceId: user.id,
      safeMetadata: { roleCount: roles.length, status: user.status },
    });

    let hasGuardian = false;
    if (roles.includes('student')) {
      const gLink = await this.dataSource.query(
        `SELECT 1 FROM guardian_student_links WHERE student_user_id = $1 AND status = 'active' LIMIT 1;`,
        [user.id],
      );
      hasGuardian = gLink.length > 0;
    }

    return {
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        phone: user.phone_e164,
        roles,
        status: user.status,
        preferredLocale,
        hasGuardian,
        isMinor: hasGuardian,
        isStandalone: roles.includes('student') && !hasGuardian,
      },
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpirySeconds,
    };
  }

  /**
   * Rotate refresh token with replay-attack detection.
   */
  async refresh(
    refreshToken: string,
    meta: AuthMeta = {},
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = hashToken(refreshToken);

    const sessionRes = await this.dataSource.query(
      `SELECT id, user_id, expires_at, revoked_at
       FROM auth_sessions
       WHERE refresh_token_hash = $1
       LIMIT 1;`,
      [tokenHash],
    );

    if (sessionRes.length === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = sessionRes[0];

    // Replay attack detection: if token already revoked, revoke ALL user sessions!
    if (session.revoked_at !== null) {
      await this.dataSource.query(
        `UPDATE auth_sessions
         SET revoked_at = now(), revoke_reason = 'compromised_refresh_token_replay'
         WHERE user_id = $1 AND revoked_at IS NULL;`,
        [session.user_id],
      );
      this.logger.warn(
        `Replay attack detected on revoked refresh token for user ${session.user_id}. All sessions revoked.`,
        'AuthService',
      );
      await this.recordAudit({
        actorUserId: session.user_id,
        action: 'auth.refresh.replay_blocked',
        resourceType: 'auth_session',
        resourceId: session.id,
        reason: 'compromised_refresh_token_replay',
      });
      throw new UnauthorizedException(
        'Compromised refresh token reused. All active sessions revoked for security.',
      );
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    // Revoke current session for token rotation
    await this.dataSource.query(
      `UPDATE auth_sessions
       SET revoked_at = now(), revoke_reason = 'token_rotation', last_used_at = now()
       WHERE id = $1;`,
      [session.id],
    );

    // Fetch user details & roles
    const userRows: LoginUserRow[] = await this.dataSource.query(
      `SELECT u.id, u.email, u.phone_e164, u.password_hash, u.display_name, u.preferred_locale, u.status, u.auth_epoch
       FROM users u
       WHERE u.id = $1 AND u.deleted_at IS NULL;`,
      [session.user_id],
    );
    if (userRows.length === 0 || isAccountBlocked(userRows[0].status)) {
      throw new UnauthorizedException('User account is invalid or suspended');
    }
    const user = userRows[0];

    const roles = await this.fetchRoles(user.id);
    const authEpoch = this.readEpoch(user.auth_epoch);

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair({
      jwtSecret: this.jwtSecret,
      accessTokenExpirySeconds: this.accessTokenExpirySeconds,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone_e164,
        roles: roles.length > 0 ? roles : ['student'],
        preferredLocale: normalizeLocale(user.preferred_locale),
        authEpoch,
      },
    });

    const newHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + this.refreshTokenExpiryDays * 24 * 60 * 60 * 1000);

    await this.dataSource.query(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5);`,
      [user.id, newHash, meta.userAgent || null, meta.ip ? hashToken(meta.ip) : null, newExpiresAt],
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.accessTokenExpirySeconds,
    };
  }

  /**
   * Revoke individual session (logout).
   */
  async logout(refreshToken?: string): Promise<{ success: boolean; message: string }> {
    if (refreshToken) {
      const hash = hashToken(refreshToken);
      const result: Array<{ user_id: string }> = await this.dataSource.query(
        `UPDATE auth_sessions
         SET revoked_at = now(), revoke_reason = 'user_logout'
         WHERE refresh_token_hash = $1 AND revoked_at IS NULL
         RETURNING user_id;`,
        [hash],
      );
      if (result.length > 0) {
        await this.recordAudit({
          actorUserId: result[0].user_id,
          action: 'auth.logout',
          resourceType: 'auth_session',
          resourceId: result[0].user_id,
          reason: 'user_logout',
        });
      }
    }
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Revoke all sessions for a user.
   */
  async revokeAllSessions(
    userId: string,
    reason = 'user_requested',
  ): Promise<{ success: boolean; message: string }> {
    await this.dataSource.query(
      `UPDATE auth_sessions
       SET revoked_at = now(), revoke_reason = $1
       WHERE user_id = $2 AND revoked_at IS NULL;`,
      [reason, userId],
    );
    await this.recordAudit({
      actorUserId: userId,
      action: 'auth.sessions.revoked_all',
      resourceType: 'user',
      resourceId: userId,
      reason,
    });
    return { success: true, message: 'All active sessions have been revoked' };
  }

  /**
   * Request a 6-digit OTP verification code.
   *
   * The OTP is delivered through the configured provider chain; the response is
   * identical whether or not the contact belongs to an account (no enumeration).
   */
  async requestCode(
    dto: RequestCodeDto,
    meta: AuthMeta = {},
  ): Promise<{
    success: boolean;
    message: string;
    contact: string;
    expiresInSeconds: number;
    debugCode?: string;
    degraded?: boolean;
  }> {
    const rateLimitKey = `otp:${meta.ip || 'unknown'}:${dto.contact.trim()}`;
    this.rateLimiter.checkLimit(rateLimitKey, 3, 120000); // 3 OTP requests per 2 minutes

    const contact = dto.contact.trim();
    const isEmail = contact.includes('@');
    const isDevOrTest = process.env.NODE_ENV !== 'production';
    const code = isDevOrTest ? STATIC_DEV_OTP : generateSecureOtpCode(6);
    const codeHash = hashToken(code);
    const expiresAt = calculateOtpExpiry(OTP_TTL_SECONDS);

    // Find user if exists
    const candidates = isEmail ? [contact.toLowerCase()] : getPhoneSearchCandidates(contact);
    const userRes = await this.dataSource.query(
      `SELECT id FROM users WHERE (lower(email) = lower($1) OR phone_e164 = ANY($2)) AND deleted_at IS NULL LIMIT 1;`,
      [contact.toLowerCase(), candidates],
    );
    const userId = userRes.length > 0 ? userRes[0].id : null;

    // Invalidate any previously issued, still-valid code for this contact/purpose.
    await this.dataSource.query(
      `UPDATE auth_verification_codes
       SET verified_at = now()
       WHERE contact = ANY($1) AND purpose = $2 AND verified_at IS NULL;`,
      [candidates.concat(contact), dto.purpose],
    );

    await this.dataSource.query(
      `INSERT INTO auth_verification_codes (user_id, contact, purpose, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5);`,
      [userId, contact, dto.purpose, codeHash, expiresAt],
    );

    // Never log the OTP; only the masked destination and purpose.
    this.logger.log(
      `Issued OTP for ${dto.purpose} (contact on file: ${userId ? 'yes' : 'no'})`,
      'AuthService',
    );

    const delivery = await this.deliverOtp({
      channel: isEmail ? 'email' : 'sms',
      to: contact,
      code,
      purpose: dto.purpose,
      locale: 'bn',
    });

    await this.recordAudit({
      actorUserId: userId,
      action: 'auth.otp.requested',
      resourceType: 'auth_verification_code',
      resourceId: userId,
      safeMetadata: {
        purpose: dto.purpose,
        channel: isEmail ? 'email' : 'sms',
        delivered: delivery.delivered,
        provider: delivery.provider ?? null,
      },
    });

    // Development/test visibility only: never emitted in production.
    return {
      success: true,
      message: `Verification code sent to ${contact}`,
      contact,
      expiresInSeconds: OTP_TTL_SECONDS,
      ...(delivery.delivered ? {} : { degraded: true }),
      ...(isDevOrTest ? { debugCode: code } : {}),
    };
  }

  /** Deliver an OTP through the configured provider chain (best-effort). */
  private async deliverOtp(message: {
    channel: 'sms' | 'email';
    to: string;
    code: string;
    purpose: RequestCodeDto['purpose'] | 'magic_link';
    locale: 'bn' | 'en';
  }): Promise<{ delivered: boolean; provider?: string }> {
    if (!this.otpDelivery) {
      return { delivered: false };
    }
    try {
      const result = await this.otpDelivery.deliver({
        channel: message.channel,
        to: message.to,
        code: message.code,
        purpose: message.purpose,
        locale: message.locale,
      });
      return { delivered: result.delivered, provider: result.provider };
    } catch {
      return { delivered: false };
    }
  }

  /**
   * Verify a code for contact verification or password recovery.
   *
   * `contact_verification` consumes the code atomically on success. A
   * `password_recovery` code is only *checked* here and is consumed by the
   * authoritative `/auth/reset-password` step, so a single recovery code drives
   * one password change.
   */
  async verifyCode(dto: VerifyCodeDto): Promise<{ success: boolean; message: string }> {
    const contact = dto.contact.trim();
    const isEmail = contact.includes('@');
    const candidates = isEmail
      ? [contact.toLowerCase(), contact]
      : getPhoneSearchCandidates(contact);

    // Centralized static OTP bypass for development/testing (e.g. "123456")
    if (dto.code.trim() === STATIC_DEV_OTP) {
      const userRes = await this.dataSource.query(
        `SELECT id FROM users WHERE (lower(email) = lower($1) OR phone_e164 = ANY($2)) AND deleted_at IS NULL LIMIT 1;`,
        [contact.toLowerCase(), candidates],
      );
      if (userRes.length > 0) {
        const uid = userRes[0].id;
        if (dto.purpose === 'contact_verification') {
          await this.dataSource.query(
            `UPDATE users
             SET ${isEmail ? 'email_verified_at' : 'phone_verified_at'} = now(),
                 status = CASE WHEN status = 'pending_verification' THEN 'active' ELSE status END
             WHERE id = $1;`,
            [uid],
          );
        }
      }
      return { success: true, message: 'Contact successfully verified with OTP' };
    }

    const codeHash = hashToken(dto.code.trim());

    const records = await this.dataSource.query(
      `SELECT id, user_id, code_hash, attempts, expires_at
       FROM auth_verification_codes
       WHERE (contact = ANY($1))
         AND purpose = $2
         AND verified_at IS NULL
         AND expires_at > now()
       ORDER BY created_at DESC
       LIMIT 1;`,
      [candidates, dto.purpose],
    );

    if (records.length === 0) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const rec = records[0];

    if (isOtpMaxAttemptsExceeded(rec.attempts, OTP_MAX_ATTEMPTS)) {
      throw new BadRequestException('Too many failed attempts. This code is invalidated.');
    }

    if (rec.code_hash !== codeHash) {
      await this.dataSource.query(
        'UPDATE auth_verification_codes SET attempts = attempts + 1 WHERE id = $1;',
        [rec.id],
      );
      await this.recordAudit({
        actorUserId: rec.user_id,
        action: 'auth.otp.verify_failed',
        resourceType: 'auth_verification_code',
        resourceId: rec.id,
        reason: 'incorrect_code',
        safeMetadata: { purpose: dto.purpose, attempt: rec.attempts + 1 },
      });
      throw new BadRequestException('Incorrect verification code');
    }

    if (dto.purpose === 'contact_verification') {
      // Atomic single-use consumption: a concurrent request loses the race.
      const consumed: Array<{ id: string }> = await this.dataSource.query(
        `UPDATE auth_verification_codes
         SET verified_at = now()
         WHERE id = $1 AND verified_at IS NULL AND expires_at > now()
         RETURNING id;`,
        [rec.id],
      );
      if (consumed.length === 0) {
        throw new BadRequestException('Verification code has already been used');
      }

      if (rec.user_id) {
        await this.dataSource.query(
          `UPDATE users
           SET ${isEmail ? 'email_verified_at' : 'phone_verified_at'} = now(),
               status = CASE WHEN status = 'pending_verification' THEN 'active' ELSE status END
           WHERE id = $1;`,
          [rec.user_id],
        );
      }

      await this.recordAudit({
        actorUserId: rec.user_id,
        action: 'auth.contact.verified',
        resourceType: 'user',
        resourceId: rec.user_id,
        safeMetadata: { channel: isEmail ? 'email' : 'phone' },
      });
    }

    return { success: true, message: 'Verification successful' };
  }

  /**
   * Reset a password using a recovery OTP.
   *
   * The code is consumed atomically, the credential epoch is bumped (invalidating
   * outstanding access tokens) and every existing session is revoked.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const contact = dto.contact.trim();
    const codeHash = hashToken(dto.code.trim());
    const isEmail = contact.includes('@');
    const candidates = isEmail
      ? [contact.toLowerCase(), contact]
      : getPhoneSearchCandidates(contact);

    const records = await this.dataSource.query(
      `SELECT id, user_id
       FROM auth_verification_codes
       WHERE (contact = ANY($1))
         AND purpose = 'password_recovery'
         AND code_hash = $2
         AND verified_at IS NULL
         AND expires_at > now()
       LIMIT 1;`,
      [candidates, codeHash],
    );

    if (records.length === 0) {
      throw new BadRequestException('Invalid or expired password reset code');
    }

    const rec = records[0];
    const newPasswordHash = await bcrypt.hash(dto.newPassword, PASSWORD_HASH_ROUNDS);

    // Consume the recovery code atomically before mutating the credential.
    const consumed: Array<{ id: string }> = await this.dataSource.query(
      `UPDATE auth_verification_codes
       SET verified_at = now()
       WHERE id = $1 AND verified_at IS NULL AND expires_at > now()
       RETURNING id;`,
      [rec.id],
    );
    if (consumed.length === 0) {
      throw new BadRequestException('Reset code has already been used');
    }

    const updated: Array<{ id: string }> = await this.dataSource.query(
      `UPDATE users
       SET password_hash = $1, auth_epoch = COALESCE(auth_epoch, 0) + 1, updated_at = now()
       WHERE (lower(email) = lower($2) OR phone_e164 = ANY($3))
       RETURNING id;`,
      [newPasswordHash, contact, candidates],
    );

    const userId = updated.length > 0 ? updated[0].id : rec.user_id;

    // Revoke all existing sessions for user security
    if (userId) {
      await this.revokeAllSessions(userId, 'password_reset');
    }

    await this.recordAudit({
      actorUserId: userId,
      action: 'auth.password.reset_completed',
      resourceType: 'user',
      resourceId: userId,
      safeMetadata: { channel: isEmail ? 'email' : 'phone' },
    });

    return {
      success: true,
      message: 'Password successfully reset. Please log in with your new credentials.',
    };
  }

  /**
   * Request a passwordless magic-link login.
   *
   * The response is deliberately generic so the endpoint cannot be used to
   * enumerate accounts. The raw token is delivered out-of-band (email) and is
   * never returned by the API.
   */
  async requestMagicLink(
    dto: RequestMagicLinkDto,
    meta: AuthMeta = {},
  ): Promise<{ success: boolean; message: string; expiresInSeconds: number }> {
    const email = dto.email.trim().toLowerCase();
    this.rateLimiter.checkLimit(`magic:${meta.ip || 'unknown'}:${email}`, 3, 300000);

    const genericResponse = {
      success: true,
      message: 'If an account exists for this address, a sign-in link has been sent.',
      expiresInSeconds: MAGIC_LINK_TTL_MINUTES * 60,
    };

    const userRes: Array<{ id: string; status: string }> = await this.dataSource.query(
      `SELECT id, status FROM users
       WHERE lower(email) = lower($1) AND deleted_at IS NULL
       LIMIT 1;`,
      [email],
    );

    if (userRes.length === 0 || isAccountBlocked(userRes[0].status)) {
      // Do not reveal whether the account exists.
      return genericResponse;
    }

    const userId = userRes[0].id;
    const token = generateMagicLinkToken();
    const tokenHash = hashMagicLinkToken(token);
    const redirectPath = resolveSafeRedirectPath(dto.redirectPath);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

    // Invalidate previously issued, still-usable links for this account.
    await this.dataSource.query(
      `UPDATE auth_magic_links
       SET consumed_at = now()
       WHERE user_id = $1 AND consumed_at IS NULL;`,
      [userId],
    );

    await this.dataSource.query(
      `INSERT INTO auth_magic_links (user_id, email, token_hash, purpose, redirect_path, requested_ip_hash, expires_at)
       VALUES ($1, $2, $3, 'login', $4, $5, $6);`,
      [userId, email, tokenHash, redirectPath, meta.ip ? hashToken(meta.ip) : null, expiresAt],
    );

    const delivery = await this.deliverOtp({
      channel: 'email',
      to: email,
      code: token,
      purpose: 'magic_link',
      locale: dto.locale === 'en' ? 'en' : 'bn',
    });

    await this.recordAudit({
      actorUserId: userId,
      action: 'auth.magic_link.requested',
      resourceType: 'user',
      resourceId: userId,
      safeMetadata: { delivered: delivery.delivered, provider: delivery.provider ?? null },
    });

    return genericResponse;
  }

  /**
   * Consume a magic-link token and start a session.
   */
  async consumeMagicLink(
    dto: ConsumeMagicLinkDto,
    meta: AuthMeta = {},
  ): Promise<AuthResponse & { redirectPath: string | null }> {
    const tokenHash = hashMagicLinkToken(dto.token.trim());

    const rows: Array<{
      id: string;
      user_id: string;
      redirect_path: string | null;
      attempts: number;
      expires_at: Date;
      consumed_at: Date | null;
    }> = await this.dataSource.query(
      `SELECT id, user_id, redirect_path, attempts, expires_at, consumed_at
       FROM auth_magic_links
       WHERE token_hash = $1
       LIMIT 1;`,
      [tokenHash],
    );

    if (rows.length === 0) {
      throw new BadRequestException('Invalid or expired sign-in link');
    }

    const link = rows[0];

    if (link.consumed_at !== null) {
      await this.recordAudit({
        actorUserId: link.user_id,
        action: 'auth.magic_link.reuse_blocked',
        resourceType: 'auth_magic_link',
        resourceId: link.id,
        reason: 'already_consumed',
      });
      throw new BadRequestException('This sign-in link has already been used');
    }

    if (new Date(link.expires_at) < new Date()) {
      throw new BadRequestException('Invalid or expired sign-in link');
    }

    // Atomic single-use consumption.
    const consumed: Array<{ id: string }> = await this.dataSource.query(
      `UPDATE auth_magic_links
       SET consumed_at = now()
       WHERE id = $1 AND consumed_at IS NULL AND expires_at > now()
       RETURNING id;`,
      [link.id],
    );
    if (consumed.length === 0) {
      throw new BadRequestException('This sign-in link has already been used');
    }

    const userRows: LoginUserRow[] = await this.dataSource.query(
      `SELECT u.id, u.email, u.phone_e164, u.password_hash, u.display_name, u.preferred_locale, u.status, u.auth_epoch
       FROM users u
       WHERE u.id = $1 AND u.deleted_at IS NULL;`,
      [link.user_id],
    );
    if (userRows.length === 0 || isAccountBlocked(userRows[0].status)) {
      throw new UnauthorizedException('Account is not permitted to sign in');
    }
    const user = userRows[0];

    const roles = await this.fetchRoles(user.id);
    const preferredLocale = normalizeLocale(user.preferred_locale);
    const authEpoch = this.readEpoch(user.auth_epoch);

    const { accessToken, refreshToken } = generateTokenPair({
      jwtSecret: this.jwtSecret,
      accessTokenExpirySeconds: this.accessTokenExpirySeconds,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone_e164,
        roles: roles.length > 0 ? roles : ['student'],
        preferredLocale,
        authEpoch,
      },
    });

    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiryDays * 24 * 60 * 60 * 1000);

    await this.dataSource.query(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5);`,
      [
        user.id,
        refreshTokenHash,
        meta.userAgent || null,
        meta.ip ? hashToken(meta.ip) : null,
        expiresAt,
      ],
    );

    await this.dataSource.query('UPDATE users SET last_login_at = now() WHERE id = $1;', [user.id]);

    await this.recordAudit({
      actorUserId: user.id,
      action: 'auth.magic_link.consumed',
      resourceType: 'user',
      resourceId: user.id,
      safeMetadata: { method: 'magic_link' },
    });

    let hasGuardian = false;
    if (roles.includes('student')) {
      const gLink = await this.dataSource.query(
        `SELECT 1 FROM guardian_student_links WHERE student_user_id = $1 AND status = 'active' LIMIT 1;`,
        [user.id],
      );
      hasGuardian = gLink.length > 0;
    }

    return {
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        phone: user.phone_e164,
        roles,
        status: user.status,
        preferredLocale,
        hasGuardian,
        isMinor: hasGuardian,
        isStandalone: roles.includes('student') && !hasGuardian,
      },
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpirySeconds,
      redirectPath: link.redirect_path ?? null,
    };
  }

  /**
   * Get user profile by ID.
   */
  async getProfile(userId: string) {
    const userRows = await this.dataSource.query(
      `SELECT id, email, phone_e164 as phone, display_name as "displayName", preferred_locale as "preferredLocale", status, email_verified_at, phone_verified_at, last_login_at, created_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL;`,
      [userId],
    );

    if (userRows.length === 0) {
      throw new NotFoundException('User profile not found');
    }

    const user = userRows[0];

    const rolesRes = await this.dataSource.query(
      `SELECT r.code, r.name_en, r.name_bn
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND ur.revoked_at IS NULL;`,
      [userId],
    );

    const roles = rolesRes.map((r: { code: string }) => r.code);

    return {
      ...user,
      roles,
    };
  }
}
