import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SslcommerzSandboxAdapter } from '../src/modules/payments/adapters/sslcommerz-sandbox.adapter';

describe('SslcommerzSandboxAdapter Unit & Credential Verification Tests', () => {
  let adapter: SslcommerzSandboxAdapter;

  beforeEach(() => {
    adapter = new SslcommerzSandboxAdapter();
  });

  it('should be configured with SSLCOMMERZ sandbox store ID and credentials', () => {
    expect(adapter.providerName).toBe('sslcommerz');
  });

  it('should generate checkout session URL with sandbox parameters', async () => {
    const session = await adapter.createCheckoutSession(
      '00000000-0000-4000-8000-000000000001',
      100000, // 1000.00 BDT
      'BDT',
      '01952879249',
    );

    expect(session.checkoutUrl).toBeDefined();
    expect(session.checkoutUrl).toContain('sandbox.sslcommerz.com');
    expect(session.providerOrderId).toBeDefined();
  });

  it('should cryptographically verify HMAC-SHA256 webhook signatures', () => {
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

    const isValid = adapter.verifyWebhookSignature(
      { 'x-sslcommerz-signature': validSignature },
      payload,
    );
    expect(isValid).toBe(true);

    const isInvalid = adapter.verifyWebhookSignature(
      { 'x-sslcommerz-signature': 'tampered_invalid_hex' },
      payload,
    );
    expect(isInvalid).toBe(false);
  });

  it('should verify IPN payload with status VALID in sandbox mode', () => {
    const validPayload = {
      status: 'VALID',
      tran_id: 'ord-1234',
      val_id: 'val-5678',
      amount: '1000.00',
    };

    const verified = adapter.verifyWebhookSignature({}, validPayload);
    expect(verified).toBe(true);
  });

  it('should reject invalid or tampered webhook payload with empty signature and failed status', () => {
    const invalidPayload = {
      status: 'FAILED',
      tran_id: 'ord-1234',
    };

    const verified = adapter.verifyWebhookSignature({}, invalidPayload);
    expect(verified).toBe(false);
  });

  it('should query server-to-server transaction status and return minor units', async () => {
    const result = await adapter.queryTransaction('val-5678');

    expect(result.status).toBe('succeeded');
    expect(result.amountMinor).toBe(100000);
    expect(result.currency).toBe('BDT');
  });

  it('should process operational refund in sandbox mode', async () => {
    const refund = await adapter.processRefund('val-5678', 50000, 'Student requested cancellation');

    expect(refund.status).toBe('succeeded');
    expect(refund.amountMinor).toBe(50000);
    expect(refund.providerRefundId).toContain('SSLCZ-REF-');
  });
});
