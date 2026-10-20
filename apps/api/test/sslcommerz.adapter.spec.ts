import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { SslcommerzSandboxAdapter } from '../src/modules/payments/adapters/sslcommerz-sandbox.adapter';

describe('SslcommerzSandboxAdapter', () => {
  let adapter: SslcommerzSandboxAdapter;

  beforeEach(() => {
    vi.stubEnv('SSLCOMMERZ_STORE_PASSWD', 'test-store-passwd');
    adapter = new SslcommerzSandboxAdapter();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('exposes the sslcommerz provider identity', () => {
    expect(adapter.providerName).toBe('sslcommerz');
  });

  it('creates a checkout session from a successful gateway response', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          status: 'SUCCESS',
          GatewayPageURL:
            'https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=pay&SESSIONKEY=TEST-SESSION-KEY',
          sessionkey: 'TEST-SESSION-KEY',
        }),
      } as any;
    });

    const session = await adapter.createCheckoutSession(
      '00000000-0000-4000-8000-000000000001',
      100000,
      'BDT',
      '01952879249',
    );

    expect(session.checkoutUrl).toContain('sandbox.sslcommerz.com');
    expect(session.providerOrderId).toBe('TEST-SESSION-KEY');
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('FAILS CLOSED when the gateway cannot be reached', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      throw new Error('Network timeout');
    });

    await expect(
      adapter.createCheckoutSession('00000000-0000-4000-8000-000000000002', 50000, 'BDT'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('verifies HMAC-SHA256 webhook signatures', () => {
    const payload = {
      tran_id: 'ord-1234',
      val_id: 'val-5678',
      amount: '1000.00',
    };

    const payloadString = JSON.stringify(
      Object.keys(payload)
        .sort()
        .reduce((acc: any, key: string) => {
          acc[key] = (payload as any)[key];
          return acc;
        }, {}),
    );

    const validSignature = adapter.generateSignature(payloadString);

    expect(
      adapter.verifyWebhookSignature({ 'x-sslcommerz-signature': validSignature }, payload),
    ).toBe(true);
    expect(
      adapter.verifyWebhookSignature({ 'x-sslcommerz-signature': 'tampered_invalid_hex' }, payload),
    ).toBe(false);
  });

  it('REJECTS signature-less payloads even when they claim VALID', () => {
    const validPayload = {
      status: 'VALID',
      tran_id: 'ord-1234',
      val_id: 'val-5678',
      amount: '1000.00',
    };

    expect(adapter.verifyWebhookSignature({}, validPayload)).toBe(false);
    expect(
      adapter.verifyWebhookSignature({}, { status: 'VALID', verify_sign: 'not-a-real-signature' }),
    ).toBe(false);
  });

  it('normalizes an IPN payload into the shared contract', () => {
    const event = adapter.normalizeWebhook(
      {},
      {
        status: 'VALID',
        event_id: 'EVT-1',
        tran_id: '00000000-0000-4000-8000-000000000000',
        val_id: 'VAL-1',
        amount: '1000.00',
        currency: 'BDT',
      },
    );

    expect(event).toEqual({
      eventId: 'EVT-1',
      eventType: 'sslcommerz.succeeded',
      orderReference: '00000000-0000-4000-8000-000000000000',
      providerTransactionId: 'VAL-1',
      amountMinor: '100000',
      currency: 'BDT',
      status: 'succeeded',
      rawStatus: 'VALID',
    });
  });

  it('queries the validation server and returns minor units', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          status: 'VALID',
          amount: '1000.00',
          currency: 'BDT',
          bank_tran_id: 'val-5678',
        }),
      } as any;
    });

    const result = await adapter.queryTransaction('val-5678');

    expect(result.status).toBe('succeeded');
    expect(result.amountMinor).toBe(100000);
    expect(result.currency).toBe('BDT');
  });

  it('FAILS CLOSED when the validation server cannot verify the transaction', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      throw new Error('Network timeout');
    });

    const result = await adapter.queryTransaction('val-timeout');
    expect(result.status).toBe('failed');
  });

  it('reports automated refunds as unsupported instead of fabricating success', async () => {
    const refund = await adapter.processRefund('val-5678', 50000, 'Student requested cancellation');

    expect(refund.status).toBe('unsupported');
    expect(refund.amountMinor).toBe(50000);
    expect(refund.providerRefundId).toBeNull();
    expect(refund.failureReason).toContain('not provisioned');
  });
});
