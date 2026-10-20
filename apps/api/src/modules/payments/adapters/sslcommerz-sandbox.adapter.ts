import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import crypto from 'node:crypto';
import { bdtToMinor } from '../../../common/money/money';
import { readErrorMessage } from '../../../common/errors/error-message';
import {
  PaymentProviderAdapter,
  CheckoutSessionResult,
  ProviderTransactionResult,
  ProviderRefundResult,
  NormalizedWebhookEvent,
} from './payment-provider.interface';

/** Subset of the SSLCOMMERZ session-initiation response we depend on. */
interface SslcommerzSessionResponse {
  status?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
}

/** Subset of the SSLCOMMERZ validation-server response we depend on. */
interface SslcommerzValidationResponse {
  status?: string;
  amount?: string;
  currency?: string;
  bank_tran_id?: string;
}

@Injectable()
export class SslcommerzSandboxAdapter implements PaymentProviderAdapter {
  readonly providerName = 'sslcommerz';
  private readonly logger = new Logger(SslcommerzSandboxAdapter.name);

  private readonly storeId = process.env.SSLCOMMERZ_STORE_ID || 'ogron6ac9fcef6d321';
  private readonly storePasswd = process.env.SSLCOMMERZ_STORE_PASSWD || 'ogron6ac9fcef6d321@ssl';
  private readonly isLive = process.env.SSLCOMMERZ_IS_LIVE === 'true';
  private readonly sessionApiUrl =
    process.env.SSLCOMMERZ_SESSION_URL || 'https://sandbox.sslcommerz.com/gwprocess/v4/process.php';
  private readonly validationApiUrl =
    process.env.SSLCOMMERZ_VALIDATION_URL ||
    'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';
  private readonly tunnelBaseUrl =
    process.env.PAYMENT_TUNNEL_URL ||
    process.env.NGROK_TUNNEL_URL ||
    'https://undone-unsure-twisting.ngrok-free.dev';

  /**
   * Helper: Generate a valid signature for webhook validation and testing
   */
  generateSignature(payload: string): string {
    return crypto.createHmac('sha256', this.storePasswd).update(payload).digest('hex');
  }

  /**
   * 1. Create SSLCOMMERZ Sandbox Transaction Session
   */
  async createCheckoutSession(
    orderId: string,
    amountMinor: number,
    currency: string,
    payerPhone?: string,
  ): Promise<CheckoutSessionResult> {
    const amountBdt = (amountMinor / 100).toFixed(2);
    const callbackUrl = `${this.tunnelBaseUrl}/api/v1/payments/webhook/sslcommerz`;

    const payload = new URLSearchParams({
      store_id: this.storeId,
      store_passwd: this.storePasswd,
      total_amount: amountBdt,
      currency: currency || 'BDT',
      tran_id: orderId,
      success_url: callbackUrl,
      fail_url: callbackUrl,
      cancel_url: callbackUrl,
      ipn_url: callbackUrl,
      cus_name: 'OgroniEdu Learner',
      cus_email: 'learner@ogroniedu.com',
      cus_add1: 'Dhaka, Bangladesh',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: payerPhone || '01700000000',
      shipping_method: 'NO',
      product_name: 'Tutoring Session Fee',
      product_category: 'Education',
      product_profile: 'non-physical-goods',
    });

    try {
      this.logger.log(
        `Calling SSLCOMMERZ Sandbox Session API for order ${orderId} (${amountBdt} BDT)`,
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(this.sessionApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as SslcommerzSessionResponse;
        if (data.status === 'SUCCESS' && data.GatewayPageURL) {
          this.logger.log(`SSLCOMMERZ Session Created Successfully: ${data.sessionkey}`);
          return {
            checkoutUrl: data.GatewayPageURL,
            providerOrderId: data.sessionkey || orderId,
          };
        }
        this.logger.warn(`SSLCOMMERZ API returned non-success: ${JSON.stringify(data)}`);
      }
    } catch (err: unknown) {
      this.logger.warn(`Failed to reach SSLCOMMERZ gateway directly (${readErrorMessage(err)}).`);
      throw new ServiceUnavailableException(
        'The payment gateway could not create a checkout session. Please try again later.',
      );
    }

    throw new ServiceUnavailableException(
      'The payment gateway rejected the checkout session request. Please try again later.',
    );
  }

  /**
   * 2. Cryptographic & Query Webhook Verification
   */
  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Record<string, unknown>,
  ): boolean {
    const rawSignature =
      headers['x-sslcommerz-signature'] ||
      headers['X-SSLCOMMERZ-SIGNATURE'] ||
      (typeof rawBody === 'object' &&
        ((rawBody.verify_sign as string | undefined) || (rawBody.signature as string | undefined)));

    // Signature is mandatory. An unsigned body is never trusted, even when it
    // claims status VALID/succeeded.
    if (!rawSignature || typeof rawSignature !== 'string') {
      return false;
    }

    const payloadString =
      typeof rawBody === 'string'
        ? rawBody
        : JSON.stringify(
            Object.keys(rawBody)
              .filter((k) => k !== 'verify_sign' && k !== 'signature')
              .sort()
              .reduce<Record<string, unknown>>((obj, key) => {
                obj[key] = rawBody[key];
                return obj;
              }, {}),
          );

    const expectedHmac = crypto
      .createHmac('sha256', this.storePasswd)
      .update(payloadString)
      .digest('hex');

    try {
      const sigBuf = Buffer.from(rawSignature.toLowerCase(), 'utf-8');
      const expBuf = Buffer.from(expectedHmac.toLowerCase(), 'utf-8');
      return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  /**
   * Normalize an SSLCOMMERZ IPN/redirect payload. `tran_id` is our payment
   * order id; `val_id` is the validation reference used for the mandatory
   * server-to-server check.
   */
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

    const rawStatus = read('status', 'status_code').toUpperCase();
    const status = /^(VALID|VALIDATED|SUCCESS|SUCCEEDED)$/.test(rawStatus)
      ? 'succeeded'
      : /^(FAILED|FAIL|CANCELLED|CANCELED|EXPIRED)$/.test(rawStatus)
        ? 'failed'
        : 'pending';

    const valId = read('val_id', 'valId');
    const bankTranId = read('bank_tran_id', 'bankTranId');
    const providerTransactionId = valId || bankTranId || read('tran_id');
    const orderReference = read('tran_id', 'tranId');
    const amountText = read('amount', 'currency_amount') || '0';
    const eventId =
      read('event_id', 'eventId') || `${valId || bankTranId || orderReference}:${rawStatus}`;

    let amountMinor = '0';
    try {
      amountMinor = bdtToMinor(amountText).toString();
    } catch {
      amountMinor = '0';
    }

    return {
      eventId,
      eventType: `sslcommerz.${status}`,
      providerTransactionId,
      orderReference,
      amountMinor,
      currency: (read('currency') || 'BDT').toUpperCase(),
      status,
      rawStatus,
    };
  }

  /**
   * 3. Server-to-Server Validation Query
   */
  async queryTransaction(providerTransactionId: string): Promise<ProviderTransactionResult> {
    this.logger.log(`Validating SSLCOMMERZ transaction server-to-server: ${providerTransactionId}`);

    try {
      const validationUrl = `${this.validationApiUrl}?val_id=${encodeURIComponent(providerTransactionId)}&store_id=${encodeURIComponent(this.storeId)}&store_passwd=${encodeURIComponent(this.storePasswd)}&format=json`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(validationUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as SslcommerzValidationResponse;
        if (data.status === 'VALID' || data.status === 'VALIDATED') {
          // Parse the gateway decimal string directly; no float arithmetic.
          let amountMinor = 0;
          try {
            amountMinor = Number(bdtToMinor(data.amount || '0'));
          } catch {
            amountMinor = 0;
          }
          return {
            providerTransactionId: data.bank_tran_id || providerTransactionId,
            amountMinor,
            currency: data.currency || 'BDT',
            status: 'succeeded',
            verifiedAt: new Date(),
          };
        }
      }
    } catch (err: unknown) {
      this.logger.warn(`SSLCOMMERZ validation server query failed: ${readErrorMessage(err)}`);
    }

    // Never fabricate success. If the validation server cannot verify the
    // transaction, the webhook processor must reject it.
    return {
      providerTransactionId,
      amountMinor: 0,
      currency: 'BDT',
      status: 'failed',
      verifiedAt: new Date(),
    };
  }

  /**
   * 4. Refund support
   *
   * The merchant refund contract is not provisioned in this environment. Never
   * fabricate a provider reference: the caller must complete the transfer
   * externally and record it through the audited manual-confirmation path.
   */
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
        'SSLCOMMERZ automated refunds are not provisioned. Complete the refund externally and record the reference.',
    };
  }
}
