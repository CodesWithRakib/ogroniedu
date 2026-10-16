import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { RegisterDto, LoginDto, RequestCodeDto, VerifyCodeDto, ResetPasswordDto } from './dto';
import { RateLimiterService } from './rate-limiter.service';
import { StructuredLoggerService } from '../../common/logger/structured-logger.service';
import { generateTokenPair, hashToken } from './utils/token.utils';
import { normalizePhone, getPhoneSearchCandidates } from './utils/phone.utils';
import type { AuthMeta, AuthResponse } from './interfaces/auth-response.interface';

export type { TokenPayload, AuthResponse, AuthMeta } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  private jwtSecret =
    process.env.JWT_SECRET || 'ogroniedu-super-secure-jwt-secret-key-2026-bangladesh';
  private accessTokenExpirySeconds = 900; // 15 minutes
  private refreshTokenExpiryDays = 7;

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @Inject(RateLimiterService) private rateLimiter: RateLimiterService,
    @Inject(StructuredLoggerService) private logger: StructuredLoggerService,
  ) {}

  /**
   * Register a new user with validation, password hashing, and role assignment
   */
  async register(dto: RegisterDto, meta: AuthMeta = {}): Promise<AuthResponse> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('At least one contact method (email or phone) is mandatory.');
    }

    const normalizedEmail = dto.email ? dto.email.trim().toLowerCase() : null;
    const phone = dto.phone ? normalizePhone(dto.phone) : null;

    // Check duplicates
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

    // Password hashing (salt factor 12)
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const userId = crypto.randomUUID();
    const preferredLocale = dto.preferredLocale || 'bn';

    // Transactional account creation
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Insert User
      await queryRunner.query(
        `INSERT INTO users (id, email, phone_e164, password_hash, display_name, preferred_locale, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending_verification');`,
        [userId, normalizedEmail, phone, passwordHash, dto.displayName, preferredLocale],
      );

      // 2. Fetch target Role ID
      const roleRows = await queryRunner.query(
        'SELECT id, code FROM roles WHERE code = $1 LIMIT 1;',
        [dto.role],
      );
      if (roleRows.length === 0) {
        throw new BadRequestException(`Role '${dto.role}' not found in system.`);
      }
      const roleId = roleRows[0].id;

      // 3. Insert User Role
      await queryRunner.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2);`, [
        userId,
        roleId,
      ]);

      // 4. Create specialized domain profile row if tutor
      if (dto.role === 'tutor') {
        await queryRunner.query(
          `INSERT INTO tutor_profiles (user_id, headline) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [userId, `${dto.displayName} - Educator`],
        );
      }

      // 5. Generate and store session
      const { accessToken, refreshToken } = generateTokenPair({
        jwtSecret: this.jwtSecret,
        accessTokenExpirySeconds: this.accessTokenExpirySeconds,
        user: {
          id: userId,
          email: normalizedEmail,
          phone,
          roles: [dto.role],
          preferredLocale,
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

      this.logger.log(`New user registered: ${userId} (${dto.role})`, 'AuthService');

      return {
        user: {
          id: userId,
          displayName: dto.displayName,
          email: normalizedEmail,
          phone,
          roles: [dto.role],
          status: 'pending_verification',
          preferredLocale,
        },
        accessToken,
        refreshToken,
        expiresIn: this.accessTokenExpirySeconds,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * User login with rate limiting, password verification, and session creation
   */
  async login(dto: LoginDto, meta: AuthMeta = {}): Promise<AuthResponse> {
    const rateLimitKey = `login:${meta.ip || 'unknown'}:${dto.identifier.toLowerCase().trim()}`;
    this.rateLimiter.checkLimit(rateLimitKey, 5, 60000); // 5 attempts per minute

    const identifier = dto.identifier.trim();
    const isEmail = identifier.includes('@');

    let userRows: any[] = [];
    if (isEmail) {
      userRows = await this.dataSource.query(
        `SELECT u.id, u.email, u.phone_e164, u.password_hash, u.display_name, u.preferred_locale, u.status
         FROM users u
         WHERE lower(u.email) = lower($1)
           AND u.deleted_at IS NULL
         LIMIT 1;`,
        [identifier.toLowerCase()],
      );
    } else {
      const candidates = getPhoneSearchCandidates(identifier);
      userRows = await this.dataSource.query(
        `SELECT u.id, u.email, u.phone_e164, u.password_hash, u.display_name, u.preferred_locale, u.status
         FROM users u
         WHERE u.phone_e164 = ANY($1)
           AND u.deleted_at IS NULL
         LIMIT 1;`,
        [candidates],
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
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    if (user.status === 'suspended' || user.status === 'deactivated') {
      throw new UnauthorizedException(
        `Account is ${user.status}. Please contact platform support.`,
      );
    }

    // Fetch user roles
    const rolesRes = await this.dataSource.query(
      `SELECT r.code 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id = $1 AND ur.revoked_at IS NULL;`,
      [user.id],
    );
    const roles = rolesRes.map((r: { code: string }) => r.code);

    // Update last login
    await this.dataSource.query('UPDATE users SET last_login_at = now() WHERE id = $1;', [user.id]);

    // Create session
    const { accessToken, refreshToken } = generateTokenPair({
      jwtSecret: this.jwtSecret,
      accessTokenExpirySeconds: this.accessTokenExpirySeconds,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone_e164,
        roles: roles.length > 0 ? roles : ['student'],
        preferredLocale: user.preferred_locale,
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

    return {
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        phone: user.phone_e164,
        roles,
        status: user.status,
        preferredLocale: user.preferred_locale,
      },
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpirySeconds,
    };
  }

  /**
   * Rotate refresh token with Replay Attack Detection
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
    const userRows = await this.dataSource.query(
      `SELECT u.id, u.email, u.phone_e164, u.preferred_locale, u.status
       FROM users u
       WHERE u.id = $1 AND u.deleted_at IS NULL;`,
      [session.user_id],
    );
    if (userRows.length === 0 || userRows[0].status === 'suspended') {
      throw new UnauthorizedException('User account is invalid or suspended');
    }
    const user = userRows[0];

    const rolesRes = await this.dataSource.query(
      `SELECT r.code 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id = $1 AND ur.revoked_at IS NULL;`,
      [user.id],
    );
    const roles = rolesRes.map((r: { code: string }) => r.code);

    // Issue new pair
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair({
      jwtSecret: this.jwtSecret,
      accessTokenExpirySeconds: this.accessTokenExpirySeconds,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone_e164,
        roles: roles.length > 0 ? roles : ['student'],
        preferredLocale: user.preferred_locale,
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
   * Revoke individual session (logout)
   */
  async logout(refreshToken?: string): Promise<{ success: boolean; message: string }> {
    if (refreshToken) {
      const hash = hashToken(refreshToken);
      await this.dataSource.query(
        `UPDATE auth_sessions 
         SET revoked_at = now(), revoke_reason = 'user_logout' 
         WHERE refresh_token_hash = $1 AND revoked_at IS NULL;`,
        [hash],
      );
    }
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Revoke all sessions for a user
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
    return { success: true, message: 'All active sessions have been revoked' };
  }

  /**
   * Request 6-digit OTP verification code
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
  }> {
    const rateLimitKey = `otp:${meta.ip || 'unknown'}:${dto.contact.trim()}`;
    this.rateLimiter.checkLimit(rateLimitKey, 3, 120000); // 3 OTP requests per 2 minutes

    const contact = dto.contact.trim();
    const isEmail = contact.includes('@');
    const code = crypto.randomInt(100000, 999999).toString();
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Find user if exists
    const candidates = isEmail ? [contact.toLowerCase()] : getPhoneSearchCandidates(contact);
    const userRes = await this.dataSource.query(
      `SELECT id FROM users WHERE (lower(email) = lower($1) OR phone_e164 = ANY($2)) AND deleted_at IS NULL LIMIT 1;`,
      [contact.toLowerCase(), candidates],
    );
    const userId = userRes.length > 0 ? userRes[0].id : null;

    await this.dataSource.query(
      `INSERT INTO auth_verification_codes (user_id, contact, purpose, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5);`,
      [userId, contact, dto.purpose, codeHash, expiresAt],
    );

    this.logger.log(`Generated OTP code for ${contact} (${dto.purpose})`, 'AuthService');

    const isDevOrTest = process.env.NODE_ENV !== 'production';

    return {
      success: true,
      message: `Verification code sent to ${contact}`,
      contact,
      expiresInSeconds: 600,
      ...(isDevOrTest ? { debugCode: code } : {}),
    };
  }

  /**
   * Verify code for contact verification or password recovery
   */
  async verifyCode(dto: VerifyCodeDto): Promise<{ success: boolean; message: string }> {
    const contact = dto.contact.trim();
    const codeHash = hashToken(dto.code.trim());
    const isEmail = contact.includes('@');
    const candidates = isEmail
      ? [contact.toLowerCase(), contact]
      : getPhoneSearchCandidates(contact);

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

    if (rec.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts. This code is invalidated.');
    }

    if (rec.code_hash !== codeHash) {
      await this.dataSource.query(
        'UPDATE auth_verification_codes SET attempts = attempts + 1 WHERE id = $1;',
        [rec.id],
      );
      throw new BadRequestException('Incorrect verification code');
    }

    // Mark verified
    await this.dataSource.query(
      'UPDATE auth_verification_codes SET verified_at = now() WHERE id = $1;',
      [rec.id],
    );

    // If contact verification, mark user verified
    if (dto.purpose === 'contact_verification' && rec.user_id) {
      await this.dataSource.query(
        `UPDATE users 
         SET ${isEmail ? 'email_verified_at' : 'phone_verified_at'} = now(),
             status = CASE WHEN status = 'pending_verification' THEN 'active' ELSE status END
         WHERE id = $1;`,
        [rec.user_id],
      );
    }

    return { success: true, message: 'Verification successful' };
  }

  /**
   * Reset user password using verified recovery code
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
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.dataSource.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE (lower(email) = lower($2) OR phone_e164 = ANY($3));',
      [newPasswordHash, contact, candidates],
    );

    // Mark code as used
    await this.dataSource.query(
      'UPDATE auth_verification_codes SET verified_at = now() WHERE id = $1;',
      [rec.id],
    );

    // Revoke all existing sessions for user security
    if (rec.user_id) {
      await this.revokeAllSessions(rec.user_id, 'password_reset');
    }

    return {
      success: true,
      message: 'Password successfully reset. Please log in with your new credentials.',
    };
  }

  /**
   * Get user profile by ID
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
