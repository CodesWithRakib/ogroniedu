import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { TokenPayload } from '../interfaces/auth-response.interface';

export interface TokenPairUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  roles: string[];
  preferredLocale: string;
}

/** SHA-256 token hashing (refresh tokens, OTP codes, IP hashes). Pure — safe to unit-test. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Issue a JWT access token + opaque refresh token. Extracted from AuthService
 * (Phase 23 P1-4 slice) so credential flows share one issuance path.
 */
export function generateTokenPair(args: {
  jwtSecret: string;
  accessTokenExpirySeconds: number;
  user: TokenPairUser;
}): { accessToken: string; refreshToken: string } {
  const payload: TokenPayload = {
    sub: args.user.id,
    email: args.user.email,
    phone: args.user.phone,
    roles: args.user.roles,
    preferredLocale: args.user.preferredLocale,
  };
  const accessToken = jwt.sign(payload, args.jwtSecret, {
    expiresIn: args.accessTokenExpirySeconds,
  });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  return { accessToken, refreshToken };
}
