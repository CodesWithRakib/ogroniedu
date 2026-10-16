import { DevOtpProvider } from './providers/dev-otp.provider';
import { HttpGatewayOtpProvider } from './providers/http-gateway-otp.provider';
import type { OtpDeliveryProvider } from './otp-delivery.types';

/** Nest injection token for the ordered provider chain. */
export const OTP_PROVIDER_CHAIN = Symbol('OTP_PROVIDER_CHAIN');

export const OTP_DEFAULT_PROVIDER_NAME = 'http_gateway';

/**
 * Resolve the provider chain from environment configuration.
 *
 * Order in the array is irrelevant: `OtpDeliveryService` selects the primary and
 * fallback providers *by name* per channel, so operators can re-point delivery
 * (for example to a second Bangladesh aggregator) without code changes.
 */
export function buildOtpProviderChain(env: NodeJS.ProcessEnv = process.env): OtpDeliveryProvider[] {
  const timeoutMs = Number(env.OTP_DELIVERY_TIMEOUT_MS) || 5000;

  const providers: OtpDeliveryProvider[] = [
    new HttpGatewayOtpProvider({
      name: env.OTP_HTTP_GATEWAY_NAME || OTP_DEFAULT_PROVIDER_NAME,
      smsUrl: env.OTP_HTTP_GATEWAY_SMS_URL,
      emailUrl: env.OTP_HTTP_GATEWAY_EMAIL_URL,
      apiKey: env.OTP_HTTP_GATEWAY_API_KEY,
      senderId: env.OTP_HTTP_GATEWAY_SENDER_ID,
      timeoutMs,
    }),
  ];

  // Optional second aggregator (contractual/local fallback).
  if (env.OTP_HTTP_GATEWAY_FALLBACK_SMS_URL || env.OTP_HTTP_GATEWAY_FALLBACK_EMAIL_URL) {
    providers.push(
      new HttpGatewayOtpProvider({
        name: env.OTP_HTTP_GATEWAY_FALLBACK_NAME || 'http_gateway_fallback',
        smsUrl: env.OTP_HTTP_GATEWAY_FALLBACK_SMS_URL,
        emailUrl: env.OTP_HTTP_GATEWAY_FALLBACK_EMAIL_URL,
        apiKey: env.OTP_HTTP_GATEWAY_FALLBACK_API_KEY || env.OTP_HTTP_GATEWAY_API_KEY,
        senderId: env.OTP_HTTP_GATEWAY_FALLBACK_SENDER_ID || env.OTP_HTTP_GATEWAY_SENDER_ID,
        timeoutMs,
      }),
    );
  }

  // Development/test adapter. `isConfigured()` is false in production, so it can
  // never be selected as a live delivery path there.
  providers.push(new DevOtpProvider(env));

  return providers;
}

/** Nest provider definition for the chain. */
export function buildOtpProviderChainProvider() {
  return {
    provide: OTP_PROVIDER_CHAIN,
    useFactory: () => buildOtpProviderChain(process.env),
  };
}
