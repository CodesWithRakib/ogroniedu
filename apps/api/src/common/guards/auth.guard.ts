import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { isTestAuthBypassEnabled } from '../auth/test-auth';
import {
  ACCESS_TOKEN_ALGORITHM,
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
} from '../../modules/auth/utils/token.utils';
import {
  AccountAccessService,
  isAccountAccessBlocked,
} from '../../modules/auth/services/account-access.service';

/** Claims we issue on access tokens, on top of the standard JWT payload. */
interface AccessTokenClaims extends JwtPayload {
  id?: string;
  email?: string;
  phone?: string;
  roles?: string[];
  preferredLocale?: 'bn' | 'en';
  authEpoch?: number;
  isImpersonated?: boolean;
  impersonatorUserId?: string | null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toAccessTokenClaims(decoded: string | JwtPayload): AccessTokenClaims {
  if (typeof decoded === 'string') return {};
  return {
    ...decoded,
    id: readString(decoded.id),
    email: readString(decoded.email),
    phone: readString(decoded.phone),
    roles: readStringArray(decoded.roles),
    authEpoch: readNumber(decoded.authEpoch),
    isImpersonated: decoded.isImpersonated === true,
    impersonatorUserId: readString(decoded.impersonatorUserId) ?? null,
  };
}

/**
 * Rejects `iss`/`aud` claims that do not match this API.
 *
 * Tokens issued before issuer/audience were adopted (and hand-signed test
 * fixtures) carry neither claim; they remain accepted for backward
 * compatibility, but any token that *does* carry a mismatching claim is
 * rejected outright.
 */
function assertIssuerAndAudience(claims: AccessTokenClaims): void {
  if (typeof claims.iss === 'string' && claims.iss !== ACCESS_TOKEN_ISSUER) {
    throw new UnauthorizedException('Invalid authentication token issuer');
  }
  const aud = claims.aud;
  if (typeof aud === 'string' && aud !== ACCESS_TOKEN_AUDIENCE) {
    throw new UnauthorizedException('Invalid authentication token audience');
  }
  if (Array.isArray(aud) && !aud.includes(ACCESS_TOKEN_AUDIENCE)) {
    throw new UnauthorizedException('Invalid authentication token audience');
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  private jwtSecret =
    process.env.JWT_SECRET || 'ogroniedu-super-secure-jwt-secret-key-2026-bangladesh';

  constructor(
    @Optional() @Inject(Reflector) private readonly reflector?: Reflector,
    @Optional()
    @Inject(AccountAccessService)
    private readonly accountAccess?: AccountAccessService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    if (this.reflector) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) {
        return true;
      }
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const userIdHeader = request.headers['x-user-id'];
    const rolesHeader = request.headers['x-user-roles'];
    const localeHeader = request.headers['x-user-locale'];
    const allowBypass = isTestAuthBypassEnabled();

    // 1. Direct header bypass — ONLY in test/development/opt-in harnesses.
    if (allowBypass && userIdHeader) {
      const roles = rolesHeader ? String(rolesHeader).split(',') : ['guardian'];
      const user: AuthenticatedUser = {
        id: String(userIdHeader),
        roles,
        preferredLocale: localeHeader === 'en' ? 'en' : 'bn',
      };
      request.user = user;
      return true;
    }

    // 2. Token Extraction: Bearer Header or HTTP-only Cookie fallback
    let token: string | undefined;
    if (typeof authHeader === 'string') {
      const match = authHeader.trim().match(/^bearer\s+(.+)$/i);
      if (match && match[1]) {
        token = match[1].trim();
      }
    }

    if (!token && request.cookies) {
      const cookieCandidate =
        request.cookies.access_token || request.cookies.accessToken || request.cookies.token;
      if (typeof cookieCandidate === 'string' && cookieCandidate.trim()) {
        token = cookieCandidate.trim();
      }
    }

    if (!token) {
      throw new UnauthorizedException(
        'Authentication required. Missing Bearer token or authorization headers.',
      );
    }

    // Mock test tokens are honoured only when the bypass is explicitly enabled.
    if (allowBypass && token.startsWith('mock:')) {
      const parts = token.split(':');
      request.user = {
        id: parts[1] || '00000000-0000-0000-0000-000000000001',
        roles: [parts[2] || 'guardian'],
        preferredLocale: 'bn',
      };
      return true;
    }

    let claims: AccessTokenClaims;
    try {
      // Algorithm pinning: only HS256 is accepted (blocks `alg` confusion).
      claims = toAccessTokenClaims(
        jwt.verify(token, this.jwtSecret, { algorithms: [ACCESS_TOKEN_ALGORITHM] }),
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Authentication token has expired');
      }
      throw new UnauthorizedException('Invalid or malformed authentication token');
    }

    assertIssuerAndAudience(claims);

    const userId = claims.sub || claims.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid authentication token subject');
    }

    request.user = {
      id: userId,
      email: claims.email,
      phone: claims.phone,
      roles: claims.roles || ['student'],
      preferredLocale: claims.preferredLocale || 'bn',
      isImpersonated: Boolean(claims.isImpersonated),
      impersonatorUserId: claims.impersonatorUserId || null,
    };

    // Without DI (direct construction in unit tests) the account-state check is
    // skipped; the running application always injects it.
    if (!this.accountAccess) {
      return true;
    }

    return this.enforceAccountAccess(userId, claims.authEpoch);
  }

  /**
   * Authoritative account-state check: the account must still exist, must not be
   * suspended/deactivated, and the token's credential epoch must match the row
   * (password change / forced revocation invalidates outstanding access tokens).
   */
  private async enforceAccountAccess(
    userId: string,
    tokenEpoch: number | undefined,
  ): Promise<boolean> {
    const snapshot = await this.accountAccess!.getSnapshot(userId);
    if (!snapshot) {
      throw new UnauthorizedException('Account is no longer active');
    }
    if (isAccountAccessBlocked(snapshot.status)) {
      throw new UnauthorizedException('Account is not permitted to access the platform');
    }
    if (typeof tokenEpoch === 'number' && tokenEpoch !== snapshot.authEpoch) {
      throw new UnauthorizedException('Session credentials are no longer valid');
    }
    return true;
  }
}
