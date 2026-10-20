import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { BkashSandboxAdapter } from '../src/modules/payments/adapters/bkash-sandbox.adapter';

describe('BkashSandboxAdapter (fail-closed)', () => {
  let adapter: BkashSandboxAdapter;

  beforeEach(() => {
    vi.stubEnv('BKASH_WEBHOOK_SECRET', 'test-bkash-secret');
    adapter = new BkashSandboxAdapter();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exposes the bkash provider identity', () => {
    expect(adapter.providerName).toBe('bkash');
  });

  it('FAILS CLOSED when creating a checkout session without live credentials', async () => {
    await expect(
      adapter.createCheckoutSession('00000000-0000-4000-8000-000000000001', 100000, 'BDT'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('verifies an HMAC-SHA256 signature header', () => {
    const payload = { orderId: 'ord-1', status: 'COMPLETED', amount: '1000.00' };
    const payloadString = JSON.stringify(
      Object.keys(payload)
        .sort()
        .reduce<Record<string, string>>((acc, key) => {
          acc[key] = (payload as Record<string, string>)[key];
          return acc;
        }, {}),
    );

    const signature = adapter.generateSignature(payloadString);

    expect(adapter.verifyWebhookSignature({ 'x-bkash-signature': signature }, payload)).toBe(true);
    expect(
      adapter.verifyWebhookSignature({ 'x-bkash-signature': 'tampered_invalid_hex' }, payload),
    ).toBe(false);
  });

  it('REJECTS signature-less payloads regardless of the claimed status', () => {
    expect(adapter.verifyWebhookSignature({}, { status: 'COMPLETED' })).toBe(false);
    expect(adapter.verifyWebhookSignature({}, { status: 'succeeded' })).toBe(false);
    expect(adapter.verifyWebhookSignature({}, 'raw-string-body')).toBe(false);
  });

  it('rejects all webhooks when no webhook secret is configured', () => {
    vi.stubEnv('BKASH_WEBHOOK_SECRET', '');
    const unconfigured = new BkashSandboxAdapter();

    expect(unconfigured.verifyWebhookSignature({ 'x-bkash-signature': 'abc' }, {})).toBe(false);
  });

  it('normalizes a provider payload into the shared contract', () => {
    const event = adapter.normalizeWebhook(
      {},
      {
        eventId: 'EVT-1',
        merchantInvoiceNumber: '00000000-0000-4000-8000-000000000000',
        trxID: 'TRX-1',
        amount: '1000.00',
        transactionStatus: 'Completed',
        currency: 'BDT',
      },
    );

    expect(event).toEqual({
      eventId: 'EVT-1',
      eventType: 'bkash.succeeded',
      orderReference: '00000000-0000-4000-8000-000000000000',
      providerTransactionId: 'TRX-1',
      amountMinor: '100000',
      currency: 'BDT',
      status: 'succeeded',
      rawStatus: 'COMPLETED',
    });
  });

  it('normalizes failed and pending provider states', () => {
    expect(adapter.normalizeWebhook({}, { status: 'Failed' }).status).toBe('failed');
    expect(adapter.normalizeWebhook({}, { status: 'Pending' }).status).toBe('pending');
  });

  it('FAILS CLOSED for server-to-server transaction queries', async () => {
    const result = await adapter.queryTransaction('TRX-SBX-1');

    expect(result.providerTransactionId).toBe('TRX-SBX-1');
    expect(result.status).toBe('failed');
    expect(result.amountMinor).toBe(0);
    expect(result.currency).toBe('BDT');
    expect(result.verifiedAt).toBeInstanceOf(Date);
  });

  it('reports automated refunds as unsupported instead of fabricating success', async () => {
    const refund = await adapter.processRefund('TRX-SBX-1', 40000, 'Duplicate charge');

    expect(refund.status).toBe('unsupported');
    expect(refund.amountMinor).toBe(40000);
    expect(refund.providerRefundId).toBeNull();
    expect(refund.failureReason).toContain('not provisioned');
  });
});
