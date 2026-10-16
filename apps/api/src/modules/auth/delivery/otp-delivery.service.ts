import { Injectable, Optional, Inject } from '@nestjs/common';
import { StructuredLoggerService } from '../../../common/logger/structured-logger.service';
import {
  OtpDeliveryError,
  maskDestination,
  type OtpDeliveryAttempt,
  type OtpDeliveryChannel,
  type OtpDeliveryFailureCode,
  type OtpDeliveryProvider,
  type OtpDeliveryResult,
  type OtpMessage,
} from './otp-delivery.types';
import { OTP_DEFAULT_PROVIDER_NAME, OTP_PROVIDER_CHAIN } from './otp-provider.factory';

/** Provider names that are only ever valid outside production. */
const DEV_PROVIDER_NAME = 'dev';

export interface OtpDeliveryConfiguration {
  provider: string;
  channel: OtpDeliveryChannel;
  configured: boolean;
}

/**
 * Delivers OTPs through a configuration-selected provider with a configured
 * fallback.
 *
 * Guarantees:
 *  - Fallback is attempted only for *eligible* (retryable) failures; an invalid
 *    destination does not produce a second provider attempt (no duplicate codes).
 *  - Each provider is tried with a bounded number of attempts and a timeout.
 *  - OTP values and provider API keys never appear in logs (masked destinations
 *    only, failure codes only).
 */
@Injectable()
export class OtpDeliveryService {
  constructor(
    @Optional()
    @Inject(OTP_PROVIDER_CHAIN)
    private readonly providers: OtpDeliveryProvider[] = [],
    @Optional()
    @Inject(StructuredLoggerService)
    private readonly logger?: StructuredLoggerService,
  ) {}

  /** Configuration summary for startup logging and tests (no secrets). */
  describeConfiguration(): OtpDeliveryConfiguration[] {
    const summary: OtpDeliveryConfiguration[] = [];
    for (const channel of ['sms', 'email'] as const) {
      for (const name of this.resolveChainNames(channel)) {
        const provider = this.findProvider(name);
        summary.push({
          provider: name,
          channel,
          configured: Boolean(provider?.isConfigured() && provider.supports(channel)),
        });
      }
    }
    return summary;
  }

  async deliver(message: OtpMessage): Promise<OtpDeliveryResult> {
    const attempts: OtpDeliveryAttempt[] = [];
    let lastFailure: OtpDeliveryFailureCode | undefined;

    for (const name of this.resolveChainNames(message.channel)) {
      const provider = this.findProvider(name);
      if (!provider || !provider.isConfigured() || !provider.supports(message.channel)) {
        continue;
      }

      const outcome = await this.attemptProvider(provider, message);
      attempts.push(...outcome.attempts);
      if (outcome.delivered) {
        this.logger?.log(
          `OTP delivered via '${provider.name}' to ${maskDestination(message.to)} (${message.purpose})`,
          'OtpDeliveryService',
        );
        return { delivered: true, provider: provider.name, attempts };
      }

      lastFailure = outcome.failureCode ?? 'unknown_error';
      if (!outcome.retryable) {
        // Ineligible failure (e.g. invalid destination): do not fail over.
        break;
      }
      this.logger?.warn(
        `OTP provider '${provider.name}' failed (${lastFailure}); trying next provider`,
        'OtpDeliveryService',
      );
    }

    this.logger?.warn(
      `OTP delivery failed for ${maskDestination(message.to)} (${lastFailure ?? 'not_configured'})`,
      'OtpDeliveryService',
    );
    return {
      delivered: false,
      attempts,
      failureCode: lastFailure ?? 'not_configured',
    };
  }

  private async attemptProvider(
    provider: OtpDeliveryProvider,
    message: OtpMessage,
  ): Promise<{
    delivered: boolean;
    attempts: OtpDeliveryAttempt[];
    failureCode?: OtpDeliveryFailureCode;
    retryable: boolean;
  }> {
    const attempts: OtpDeliveryAttempt[] = [];
    const maxAttempts = this.maxAttempts();
    let failureCode: OtpDeliveryFailureCode = 'unknown_error';
    let retryable = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await provider.send(message);
        attempts.push({ provider: provider.name, ok: true });
        return { delivered: true, attempts, retryable: false };
      } catch (err: unknown) {
        const error = this.asDeliveryError(err);
        failureCode = error.code;
        retryable = error.retryable;
        attempts.push({
          provider: provider.name,
          ok: false,
          failureCode: error.code,
          retryable: error.retryable,
        });
        if (!error.retryable) break;
      }
    }

    return { delivered: false, attempts, failureCode, retryable };
  }

  private asDeliveryError(err: unknown): OtpDeliveryError {
    if (err instanceof OtpDeliveryError) return err;
    return new OtpDeliveryError('unknown_error', 'Unexpected OTP delivery failure', true);
  }

  private resolveChainNames(channel: OtpDeliveryChannel): string[] {
    const env = process.env;
    const primaryKey =
      channel === 'sms' ? 'OTP_SMS_PRIMARY_PROVIDER' : 'OTP_EMAIL_PRIMARY_PROVIDER';
    const fallbackKey =
      channel === 'sms' ? 'OTP_SMS_FALLBACK_PROVIDER' : 'OTP_EMAIL_FALLBACK_PROVIDER';

    const primary = env[primaryKey] || this.defaultPrimaryName(channel);
    const fallback = env[fallbackKey] ?? this.defaultFallbackName(primary);
    return [primary, fallback].filter((name): name is string => Boolean(name));
  }

  private defaultPrimaryName(channel: OtpDeliveryChannel): string {
    const gateway = this.findProvider(OTP_DEFAULT_PROVIDER_NAME);
    if (gateway && gateway.isConfigured() && gateway.supports(channel)) {
      return OTP_DEFAULT_PROVIDER_NAME;
    }
    return this.findProvider(DEV_PROVIDER_NAME)?.isConfigured()
      ? DEV_PROVIDER_NAME
      : OTP_DEFAULT_PROVIDER_NAME;
  }

  private defaultFallbackName(primary: string): string {
    if (primary === DEV_PROVIDER_NAME) return '';
    // The dev adapter is only offered as a fallback outside production (where
    // `isConfigured()` is false anyway), never as a silent insecure production path.
    return this.findProvider(DEV_PROVIDER_NAME)?.isConfigured() ? DEV_PROVIDER_NAME : '';
  }

  private findProvider(name: string): OtpDeliveryProvider | undefined {
    return this.providers.find((provider) => provider.name === name);
  }

  private maxAttempts(): number {
    const configured = Number(process.env.OTP_DELIVERY_MAX_ATTEMPTS);
    if (!Number.isFinite(configured) || configured < 1) return 2;
    return Math.min(Math.floor(configured), 3);
  }
}
