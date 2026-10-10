import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import {
  PaymentProviderAdapter,
  CheckoutSessionResult,
  ProviderTransactionResult,
  ProviderRefundResult,
} from './payment-provider.interface';

@Injectable()
export class BkashSandboxAdapter implements PaymentProviderAdapter {
  readonly providerName = 'bkash';
  private readonly logger = new Logger(BkashSandboxAdapter.name);
  private readonly secretKey = process.env.BKASH_WEBHOOK_SECRET || 'bkash_sandbox_secret_2026';

  /**
   * Helper: Generate a valid signature for testing or mocking
   */
  generateSignature(payload: string): string {
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  async createCheckoutSession(
    orderId: string,
    amountMinor: number,
    currency: string,
    payerPhone?: string,
  ): Promise<CheckoutSessionResult> {
    const providerOrderId = `BKASH-SBX-${orderId.slice(0, 8)}-${Date.now()}`;
    const amountBdt = (amountMinor / 100).toFixed(2);
    const checkoutUrl = `https://sandbox.payment.bkash.com/checkout?paymentID=${providerOrderId}&amount=${amountBdt}&currency=${currency}&phone=${payerPhone || '01700000000'}`;

    this.logger.log(`Generated bKash sandbox checkout session: ${providerOrderId}`);
    return {
      checkoutUrl,
      providerOrderId,
    };
  }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Record<string, unknown>,
  ): boolean {
    const rawSignature =
      headers['x-bkash-signature'] ||
      headers['X-BKASH-SIGNATURE'] ||
      (typeof rawBody === 'object' && (rawBody as any)?.signature);

    if (!rawSignature || typeof rawSignature !== 'string') {
      return false;
    }

    const payloadString =
      typeof rawBody === 'string'
        ? rawBody
        : JSON.stringify(
            Object.keys(rawBody)
              .filter((k) => k !== 'signature')
              .sort()
              .reduce((obj: any, key: string) => {
                obj[key] = (rawBody as any)[key];
                return obj;
              }, {}),
          );

    const expected = crypto.createHmac('sha256', this.secretKey).update(payloadString).digest('hex');

    try {
      const sigBuf = Buffer.from(rawSignature.toLowerCase(), 'utf-8');
      const expBuf = Buffer.from(expected.toLowerCase(), 'utf-8');
      if (sigBuf.length !== expBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  async queryTransaction(providerTransactionId: string): Promise<ProviderTransactionResult> {
    this.logger.log(`Querying bKash sandbox transaction server-to-server: ${providerTransactionId}`);
    // Simulate server-to-server verified query
    return {
      providerTransactionId,
      amountMinor: 100000,
      currency: 'BDT',
      status: 'succeeded',
      verifiedAt: new Date(),
    };
  }

  async processRefund(
    providerTransactionId: string,
    amountMinor: number,
    reason: string,
  ): Promise<ProviderRefundResult> {
    const providerRefundId = `BKASH-REF-${Date.now()}`;
    this.logger.log(
      `Executed bKash sandbox refund for ${providerTransactionId}: ${amountMinor} poisha (${reason})`,
    );

    return {
      providerRefundId,
      amountMinor,
      status: 'succeeded',
    };
  }
}
