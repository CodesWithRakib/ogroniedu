import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const userIdHeader = request.headers['x-user-id'];
    const rolesHeader = request.headers['x-user-roles'];
    const localeHeader = request.headers['x-user-locale'];

    if (userIdHeader) {
      // Header-based authentication (for integration tests & internal gateway)
      const roles = rolesHeader ? String(rolesHeader).split(',') : ['guardian'];
      const user: AuthenticatedUser = {
        id: String(userIdHeader),
        roles,
        preferredLocale: (localeHeader === 'en' ? 'en' : 'bn') as 'bn' | 'en',
      };
      request.user = user;
      return true;
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Decode mock or JWT token payload: format "jwt.<userId>.<roles>"
      try {
        if (token.startsWith('mock:')) {
          const parts = token.split(':');
          request.user = {
            id: parts[1] || '00000000-0000-0000-0000-000000000001',
            roles: [parts[2] || 'guardian'],
            preferredLocale: 'bn',
          };
          return true;
        }
        // Basic JWT base64 parser for standard tokens
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          request.user = {
            id: payload.sub || payload.id,
            roles: payload.roles || ['guardian'],
            preferredLocale: payload.locale || 'bn',
          };
          return true;
        }
      } catch (err) {
        throw new UnauthorizedException('Invalid or malformed authentication token');
      }
    }

    throw new UnauthorizedException(
      'Authentication required. Missing Bearer token or authorization headers.',
    );
  }
}
