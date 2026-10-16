import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { TokenPayload } from '../interfaces/auth-response.interface';

/** Only HMAC-SHA256 access tokens are ever accepted or issued. */
export const ACCESS_TOKEN_ALGORITHM = 'HS256' as const;

/** Value of the `iss` claim expected on access tokens issued by this API. */
export const ACCESS_TOKEN_ISSUER = 'ogroniedu-api';

/** Value of the `aud` claim expected on access tokens issued by this API. */
export const ACCESS_TOKEN_AUDIENCE = 'ogroniedu-clients';

export interface TokenPairUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  roles: string[];
  preferredLocale: string;
  /** Monotonic credential epoch (users.auth_epoch) embedded in the access token. */
  authEpoch?: number;
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
    authEpoch: args.user.authEpoch ?? 0,
  };
  const accessToken = jwt.sign(payload, args.jwtSecret, {
    algorithm: ACCESS_TOKEN_ALGORITHM,
    expiresIn: args.accessTokenExpirySeconds,
    issuer: ACCESS_TOKEN_ISSUER,
    audience: ACCESS_TOKEN_AUDIENCE,
  });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  return { accessToken, refreshToken };
}
