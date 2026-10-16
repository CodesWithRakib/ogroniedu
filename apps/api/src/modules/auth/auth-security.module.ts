import { Global, Module } from '@nestjs/common';
import { AccountAccessService } from './services/account-access.service';
import { OtpDeliveryService } from './delivery/otp-delivery.service';
import { buildOtpProviderChainProvider } from './delivery/otp-provider.factory';

/**
 * Global authentication-security providers.
 *
 * `AuthGuard` is applied per-route from many feature modules, and only some of
 * those modules import `AuthModule`. Registering these providers globally means
 * every `@UseGuards(AuthGuard)` instance resolves them, so account-status and
 * credential-epoch enforcement applies to every guarded route regardless of
 * which module owns the controller.
 */
@Global()
@Module({
  providers: [buildOtpProviderChainProvider(), OtpDeliveryService, AccountAccessService],
  exports: [OtpDeliveryService, AccountAccessService],
})
export class AuthSecurityModule {}
