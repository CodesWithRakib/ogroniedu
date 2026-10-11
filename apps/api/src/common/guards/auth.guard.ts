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

/** Claims we issue on access tokens, on top of the standard JWT payload. */
interface AccessTokenClaims extends JwtPayload {
  id?: string;
  email?: string;
  phone?: string;
  roles?: string[];
  preferredLocale?: 'bn' | 'en';
  isImpersonated?: boolean;
  impersonatorUserId?: string | null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;
}

function toAccessTokenClaims(decoded: string | JwtPayload): AccessTokenClaims {
  if (typeof decoded === 'string') return {};
  return {
    ...decoded,
    id: readString(decoded.id),
    email: readString(decoded.email),
    phone: readString(decoded.phone),
    roles: readStringArray(decoded.roles),
    isImpersonated: decoded.isImpersonated === true,
    impersonatorUserId: readString(decoded.impersonatorUserId) ?? null,
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  private jwtSecret =
    process.env.JWT_SECRET || 'ogroniedu-super-secure-jwt-secret-key-2026-bangladesh';

  constructor(@Optional() @Inject(Reflector) private readonly reflector?: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    // 2. Bearer Token Verification
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

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

      try {
        const claims = toAccessTokenClaims(jwt.verify(token, this.jwtSecret));
        request.user = {
          id: claims.sub || claims.id,
          email: claims.email,
          phone: claims.phone,
          roles: claims.roles || ['student'],
          preferredLocale: claims.preferredLocale || 'bn',
          isImpersonated: Boolean(claims.isImpersonated),
          impersonatorUserId: claims.impersonatorUserId || null,
        };
        return true;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'TokenExpiredError') {
          throw new UnauthorizedException('Authentication token has expired');
        }
        throw new UnauthorizedException('Invalid or malformed authentication token');
      }
    }

    throw new UnauthorizedException(
      'Authentication required. Missing Bearer token or authorization headers.',
    );
  }
}
