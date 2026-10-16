import { describe, it, expect, vi } from 'vitest';
import { OtpDeliveryService } from '../src/modules/auth/delivery/otp-delivery.service';
import { DevOtpProvider } from '../src/modules/auth/delivery/providers/dev-otp.provider';
import { classifyHttpStatus } from '../src/modules/auth/delivery/providers/http-gateway-otp.provider';
import {
  OtpDeliveryError,
  maskDestination,
  type OtpDeliveryProvider,
  type OtpMessage,
} from '../src/modules/auth/delivery/otp-delivery.types';

const MESSAGE: OtpMessage = {
  channel: 'sms',
  to: '+8801711000000',
  code: '123456',
  purpose: 'contact_verification',
  locale: 'bn',
};

function provider(
  name: string,
  behaviour: 'ok' | { code: OtpDeliveryError['code']; retryable: boolean },
): OtpDeliveryProvider {
  return {
    name,
    isConfigured: () => true,
    supports: () => true,
    send: vi.fn(async () => {
      if (behaviour === 'ok') return;
      throw new OtpDeliveryError(behaviour.code, 'simulated failure', behaviour.retryable);
    }),
  };
}

describe('OtpDeliveryService', () => {
  it('delivers through the configured primary provider', async () => {
    const primary = provider('http_gateway', 'ok');
    const fallback = provider('dev', 'ok');
    const service = new OtpDeliveryService([primary, fallback]);

    process.env.OTP_SMS_PRIMARY_PROVIDER = 'http_gateway';
    process.env.OTP_SMS_FALLBACK_PROVIDER = 'dev';

    const result = await service.deliver(MESSAGE);
    expect(result.delivered).toBe(true);
    expect(result.provider).toBe('http_gateway');
    expect(fallback.send).not.toHaveBeenCalled();
  });

  it('falls back to the configured provider on an eligible (retryable) failure', async () => {
    process.env.OTP_SMS_PRIMARY_PROVIDER = 'http_gateway';
    process.env.OTP_SMS_FALLBACK_PROVIDER = 'dev';
    const primary = provider('http_gateway', { code: 'provider_unavailable', retryable: true });
    const fallback = provider('dev', 'ok');
    const service = new OtpDeliveryService([primary, fallback]);

    const result = await service.deliver(MESSAGE);
    expect(result.delivered).toBe(true);
    expect(result.provider).toBe('dev');
    // Bounded retries: each provider is attempted at most the configured maximum.
    expect(
      (primary.send as unknown as { mock: { calls: unknown[] } }).mock.calls.length,
    ).toBeLessThanOrEqual(2);
  });

  it('NEGATIVE: does not fail over on an ineligible (invalid destination) failure', async () => {
    process.env.OTP_SMS_PRIMARY_PROVIDER = 'http_gateway';
    process.env.OTP_SMS_FALLBACK_PROVIDER = 'dev';
    const primary = provider('http_gateway', { code: 'invalid_destination', retryable: false });
    const fallback = provider('dev', 'ok');
    const service = new OtpDeliveryService([primary, fallback]);

    const result = await service.deliver(MESSAGE);
    expect(result.delivered).toBe(false);
    expect(result.failureCode).toBe('invalid_destination');
    expect(fallback.send).not.toHaveBeenCalled();
  });

  it('reports not_configured when no provider is eligible', async () => {
    process.env.OTP_SMS_PRIMARY_PROVIDER = 'http_gateway';
    process.env.OTP_SMS_FALLBACK_PROVIDER = '';
    const service = new OtpDeliveryService([]);
    const result = await service.deliver(MESSAGE);
    expect(result.delivered).toBe(false);
    expect(result.failureCode).toBe('not_configured');
  });

  it('classifies provider HTTP statuses safely', () => {
    expect(classifyHttpStatus(500)).toEqual({ code: 'provider_unavailable', retryable: true });
    expect(classifyHttpStatus(429)).toEqual({ code: 'rate_limited', retryable: true });
    expect(classifyHttpStatus(422)).toEqual({ code: 'invalid_destination', retryable: false });
    expect(classifyHttpStatus(403)).toEqual({ code: 'unknown_error', retryable: false });
  });

  it('masks destinations for logs and never exposes the code', () => {
    expect(maskDestination('+8801711000000')).toBe('+88****00');
    expect(maskDestination('learner@example.com')).toBe('l***@example.com');
  });
});

describe('DevOtpProvider production safety', () => {
  it('is configured outside production and records deliveries without logging the code', async () => {
    const dev = new DevOtpProvider({ NODE_ENV: 'test' });
    expect(dev.isConfigured()).toBe(true);
    await dev.send(MESSAGE);
    expect(dev.getDeliveredMessages()).toHaveLength(1);
    expect(dev.getDeliveredMessages()[0].code).toBe('123456');
  });

  it('NEGATIVE: refuses to operate in production (cannot become an insecure fallback)', async () => {
    const dev = new DevOtpProvider({ NODE_ENV: 'production' });
    expect(dev.isConfigured()).toBe(false);
    await expect(dev.send(MESSAGE)).rejects.toThrow(/disabled in production/i);
  });
});
