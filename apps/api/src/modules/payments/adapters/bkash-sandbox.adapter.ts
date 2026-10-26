import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import crypto from 'node:crypto';
import { bdtToMinor } from '../../../common/money/money';
import {
  PaymentProviderAdapter,
  CheckoutSessionResult,
  ProviderTransactionResult,
  ProviderRefundResult,
  NormalizedWebhookEvent,
} from './payment-provider.interface';

/**
 * bKash adapter.
 *
 * No live bKash merchant credentials are configured in this environment, so
 * checkout creation and transaction verification fail closed. Returning a
 * synthetic checkout URL or a synthetic "succeeded" verification would
 * fabricate a payment.
 */
@Injectable()
export class BkashSandboxAdapter implements PaymentProviderAdapter {
  readonly providerName = 'bkash';
  private readonly logger = new Logger(BkashSandboxAdapter.name);
  private readonly secretKey = process.env.BKASH_WEBHOOK_SECRET || '';

  /** Helper used by provider-side test fixtures only. */
  generateSignature(payload: string): string {
    if (!this.secretKey) {
      throw new Error('BKASH_WEBHOOK_SECRET is not configured');
    }
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  async createCheckoutSession(
    _orderId: string,
    _amountMinor: number,
    _currency: string,
    _payerPhone?: string,
    _metadata?: Record<string, unknown>,
  ): Promise<CheckoutSessionResult> {
    throw new ServiceUnavailableException(
      'bKash checkout is not configured. Use SSLCOMMERZ or contact operations to provision bKash merchant credentials.',
    );
  }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Record<string, unknown>,
  ): boolean {
    if (!this.secretKey) {
      this.logger.warn('Rejected bKash webhook: BKASH_WEBHOOK_SECRET is not configured');
      return false;
    }

    const rawSignature =
      headers['x-bkash-signature'] ||
      headers['X-BKASH-SIGNATURE'] ||
      (typeof rawBody === 'object' ? (rawBody.signature as string | undefined) : undefined);

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
              .reduce<Record<string, unknown>>((obj, key) => {
                obj[key] = rawBody[key];
                return obj;
              }, {}),
          );

    const expected = crypto
      .createHmac('sha256', this.secretKey)
      .update(payloadString)
      .digest('hex');

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

  normalizeWebhook(
    _headers: Record<string, string | string[] | undefined>,
    rawBody: string | Record<string, unknown>,
  ): NormalizedWebhookEvent {
    let record: Record<string, unknown> = {};
    if (typeof rawBody === 'string') {
      try {
        record = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        record = {};
      }
    } else {
      record = rawBody;
    }

    const read = (...keys: string[]): string => {
      for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.length > 0) return value;
        if (typeof value === 'number') return String(value);
      }
      return '';
    };

    const rawStatus = read('transactionStatus', 'status', 'paymentStatus').toUpperCase();
    const status = /^(COMPLETED|SUCCESS|SUCCEEDED|VALID)$/.test(rawStatus)
      ? 'succeeded'
      : /^(FAILED|CANCELLED|CANCELED|EXPIRED|DECLINED)$/.test(rawStatus)
        ? 'failed'
        : 'pending';

    const providerTransactionId = read('trxID', 'transactionId', 'paymentID');
    const orderReference = read('merchantInvoiceNumber', 'orderId', 'paymentID');
    const amountText = read('amount', 'transactionAmount') || '0';

    let amountMinor = '0';
    try {
      amountMinor = bdtToMinor(amountText).toString();
    } catch {
      amountMinor = '0';
    }

    return {
      eventId: read('eventId', 'eventID') || `${providerTransactionId}:${rawStatus}`,
      eventType: `bkash.${status}`,
      providerTransactionId,
      orderReference,
      amountMinor,
      currency: (read('currency') || 'BDT').toUpperCase(),
      status,
      rawStatus,
    };
  }

  async queryTransaction(providerTransactionId: string): Promise<ProviderTransactionResult> {
    this.logger.warn(
      `bKash transaction verification requested (${providerTransactionId}) but no live credentials are configured; failing closed.`,
    );
    return {
      providerTransactionId,
      amountMinor: 0,
      currency: 'BDT',
      status: 'failed',
      verifiedAt: new Date(),
    };
  }

  async processRefund(
    _providerTransactionId: string,
    amountMinor: number,
    _reason: string,
  ): Promise<ProviderRefundResult> {
    return {
      status: 'unsupported',
      providerRefundId: null,
      amountMinor,
      failureReason:
        'bKash automated refunds are not provisioned. Complete the refund externally and record the reference.',
    };
  }
}
