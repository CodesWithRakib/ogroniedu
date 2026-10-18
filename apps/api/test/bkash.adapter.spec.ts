import { describe, it, expect, beforeEach } from 'vitest';
import { BkashSandboxAdapter } from '../src/modules/payments/adapters/bkash-sandbox.adapter';

describe('BkashSandboxAdapter Unit & Sandbox Verification Tests', () => {
  let adapter: BkashSandboxAdapter;

  beforeEach(() => {
    adapter = new BkashSandboxAdapter();
  });

  it('should expose the bkash provider identity', () => {
    expect(adapter.providerName).toBe('bkash');
  });

  it('should generate a sandbox checkout URL with payment id, BDT amount, currency, and payer phone', async () => {
    const session = await adapter.createCheckoutSession(
      '00000000-0000-4000-8000-000000000001',
      100000, // 1000.00 BDT in poisha
      'BDT',
      '01952879249',
    );

    expect(session.providerOrderId).toMatch(/^BKASH-SBX-/);
    expect(session.checkoutUrl).toContain('sandbox.payment.bkash.com/checkout');
    expect(session.checkoutUrl).toContain('amount=1000.00');
    expect(session.checkoutUrl).toContain('currency=BDT');
    expect(session.checkoutUrl).toContain('phone=01952879249');
  });

  it('should default the payer phone to the sandbox placeholder when none is supplied', async () => {
    const session = await adapter.createCheckoutSession(
      '00000000-0000-4000-8000-000000000002',
      50000,
      'BDT',
    );

    expect(session.checkoutUrl).toContain('phone=01700000000');
  });

  it('should cryptographically verify an HMAC-SHA256 signature header', () => {
    const payload = { orderId: 'ord-1', status: 'succeeded', amount: '1000.00' };
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

  it('should verify a body-carried signature that excludes the signature field itself', () => {
    const base = { orderId: 'ord-2', status: 'succeeded', amount: '250.00' };
    const payloadString = JSON.stringify(
      Object.keys(base)
        .sort()
        .reduce<Record<string, string>>((acc, key) => {
          acc[key] = (base as Record<string, string>)[key];
          return acc;
        }, {}),
    );
    const signature = adapter.generateSignature(payloadString);

    expect(adapter.verifyWebhookSignature({}, { ...base, signature })).toBe(true);
    expect(adapter.verifyWebhookSignature({}, { ...base, signature: 'deadbeef' })).toBe(false);
  });

  it('should accept signature-less sandbox IPN payloads only when the status is verified', () => {
    expect(adapter.verifyWebhookSignature({}, { status: 'VALID' })).toBe(true);
    expect(adapter.verifyWebhookSignature({}, { status: 'VALIDATED' })).toBe(true);
    expect(adapter.verifyWebhookSignature({}, { status: 'succeeded' })).toBe(true);
    expect(adapter.verifyWebhookSignature({}, { status: 'FAILED' })).toBe(false);
    expect(adapter.verifyWebhookSignature({}, 'raw-string-body')).toBe(false);
  });

  it('should return a server-to-server verified transaction query result', async () => {
    const result = await adapter.queryTransaction('TRX-SBX-1');

    expect(result.providerTransactionId).toBe('TRX-SBX-1');
    expect(result.status).toBe('succeeded');
    expect(result.amountMinor).toBe(100000);
    expect(result.currency).toBe('BDT');
    expect(result.verifiedAt).toBeInstanceOf(Date);
  });

  it('should process an operational refund in sandbox mode', async () => {
    const refund = await adapter.processRefund('TRX-SBX-1', 40000, 'Duplicate charge');

    expect(refund.status).toBe('succeeded');
    expect(refund.amountMinor).toBe(40000);
    expect(refund.providerRefundId).toMatch(/^BKASH-REF-/);
  });
});
