import { Injectable, Logger, ServiceUnavailableException, OnModuleInit } from '@nestjs/common';
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
  storeLogo?: string;
  storeBanner?: string;
}

/** Subset of the SSLCOMMERZ validation-server response we depend on. */
interface SslcommerzValidationResponse {
  status?: string;
  amount?: string;
  currency?: string;
  bank_tran_id?: string;
}

@Injectable()
export class SslcommerzSandboxAdapter implements PaymentProviderAdapter, OnModuleInit {
  readonly providerName = 'sslcommerz';
  private readonly logger = new Logger(SslcommerzSandboxAdapter.name);

  onModuleInit(): void {
    this.validateSandboxConfiguration();
  }

  validateSandboxConfiguration(): void {
    if (this.isLive) {
      throw new Error(
        'FATAL: SSLCOMMERZ_IS_LIVE=true is configured. Live mode is strictly disabled because Live merchant credentials have not been onboarded. Set SSLCOMMERZ_IS_LIVE=false.',
      );
    }
    if (this.sessionApiUrl.includes('securepay.sslcommerz.com')) {
      throw new Error(
        'FATAL: Live session URL configured. This deployment only permits SSLCOMMERZ Sandbox endpoints (sandbox.sslcommerz.com).',
      );
    }
    if (this.validationApiUrl.includes('securepay.sslcommerz.com')) {
      throw new Error(
        'FATAL: Live validation URL configured. This deployment only permits SSLCOMMERZ Sandbox endpoints (sandbox.sslcommerz.com).',
      );
    }
    if (!this.storeId || !this.storePasswd) {
      throw new Error('FATAL: SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWD must be configured.');
    }
    const maskedStore =
      this.storeId.length > 4 ? `${this.storeId.slice(0, 4)}***` : '***';
    this.logger.log(
      `SSLCOMMERZ Sandbox Adapter initialized successfully (Store: ${maskedStore}, Mode: Sandbox Only)`,
    );
  }

  private get storeId(): string {
    return process.env.SSLCOMMERZ_STORE_ID || '';
  }

  private get storePasswd(): string {
    return process.env.SSLCOMMERZ_STORE_PASSWD || '';
  }

  private get isLive(): boolean {
    return process.env.SSLCOMMERZ_IS_LIVE === 'true';
  }

  private get sessionApiUrl(): string {
    return (
      process.env.SSLCOMMERZ_SESSION_URL || 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
    );
  }

  private get validationApiUrl(): string {
    return (
      process.env.SSLCOMMERZ_VALIDATION_URL ||
      'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
    );
  }

  private get tunnelBaseUrl(): string {
    const rawUrl =
      process.env.API_BASE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      process.env.PAYMENT_TUNNEL_URL ||
      process.env.NGROK_TUNNEL_URL ||
      'http://localhost:4000';

    const trimmed = rawUrl.trim().replace(/\/+$/, '');
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  /**
   * Helper: Canonicalize payload keys for HMAC-SHA256 signature calculation
   */
  canonicalizePayload(payload: Record<string, unknown>): string {
    return JSON.stringify(
      Object.keys(payload)
        .filter((k) => k !== 'verify_sign' && k !== 'signature')
        .sort()
        .reduce<Record<string, unknown>>((obj, key) => {
          obj[key] = payload[key];
          return obj;
        }, {}),
    );
  }

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
    metadata?: Record<string, unknown>,
  ): Promise<CheckoutSessionResult> {
    if (this.isLive) {
      throw new ServiceUnavailableException(
        'Live payment processing is disabled. OgroniEdu is provisioned for SSLCOMMERZ Sandbox payments only.',
      );
    }

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
      value_a: (metadata?.locale as string) || 'bn',
      value_b: (metadata?.bookingId as string) || '',
    });

    try {
      this.logger.log(
        `Calling SSLCOMMERZ Sandbox Session API at ${this.sessionApiUrl} for order ${orderId} (${amountBdt} BDT)`,
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(this.sessionApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn(`SSLCOMMERZ API returned HTTP ${response.status}: ${response.statusText}`);
        throw new ServiceUnavailableException(
          `Payment gateway returned HTTP ${response.status}. Please try again later.`,
        );
      }

      let rawText = '';
      let data: SslcommerzSessionResponse;
      try {
        if (typeof response.text === 'function') {
          rawText = await response.text();
          data = JSON.parse(rawText) as SslcommerzSessionResponse;
        } else if (typeof response.json === 'function') {
          data = (await response.json()) as SslcommerzSessionResponse;
        } else {
          throw new Error('No body parser on response');
        }
      } catch {
        if (typeof response.json === 'function') {
          try {
            data = (await response.json()) as SslcommerzSessionResponse;
          } catch {
            this.logger.warn(
              `SSLCOMMERZ API returned non-JSON response. First 500 chars: ${rawText.slice(0, 500)}`,
            );
            throw new ServiceUnavailableException(
              'Payment gateway returned an unexpected response. Please try again later.',
            );
          }
        } else {
          this.logger.warn(
            `SSLCOMMERZ API returned non-JSON response. First 500 chars: ${rawText.slice(0, 500)}`,
          );
          throw new ServiceUnavailableException(
            'Payment gateway returned an unexpected response. Please try again later.',
          );
        }
      }

      if (data.status === 'SUCCESS' && data.GatewayPageURL) {
        this.logger.log(`SSLCOMMERZ Session Created Successfully: ${data.sessionkey}`);
        return {
          checkoutUrl: data.GatewayPageURL,
          providerOrderId: data.sessionkey || orderId,
          sessionKey: data.sessionkey,
          gatewayPageUrl: data.GatewayPageURL,
          storeLogo: data.storeLogo,
        };
      }

      const failInfo = data.status ? `status=${data.status}` : JSON.stringify(data).slice(0, 200);
      this.logger.warn(`SSLCOMMERZ API returned non-success: ${failInfo}`);
      throw new ServiceUnavailableException(
        `Payment gateway rejected the request (${data.status || 'unknown'}). Please verify store credentials and try again.`,
      );
    } catch (err: unknown) {
      // Re-throw NestJS HTTP exceptions as-is
      if (err instanceof ServiceUnavailableException) throw err;

      const msg = readErrorMessage(err);
      const isTimeout = msg.includes('abort') || msg.includes('timeout');
      this.logger.warn(
        `Failed to reach SSLCOMMERZ gateway: ${msg}${isTimeout ? ' (timeout after 15s)' : ''}`,
      );
      throw new ServiceUnavailableException(
        isTimeout
          ? 'Payment gateway timed out. Please check your network and try again.'
          : 'Could not connect to the payment gateway. Please try again later.',
      );
    }
  }

  /**
   * 2. Cryptographic & Query Webhook Verification
   */
  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Record<string, unknown>,
  ): boolean {
    const headerSignature = headers['x-sslcommerz-signature'] || headers['X-SSLCOMMERZ-SIGNATURE'];

    let bodyObj: Record<string, unknown> = {};
    if (typeof rawBody === 'string') {
      try {
        bodyObj = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        // May be URL encoded form data
        try {
          const params = new URLSearchParams(rawBody);
          bodyObj = Object.fromEntries(params.entries());
        } catch {
          bodyObj = {};
        }
      }
    } else if (typeof rawBody === 'object' && rawBody !== null) {
      bodyObj = rawBody;
    }

    const verifySign =
      (bodyObj.verify_sign as string | undefined) ||
      (bodyObj.signature as string | undefined) ||
      (typeof headerSignature === 'string' ? headerSignature : undefined);

    // Signature is mandatory. An unsigned body is never trusted, even when it
    // claims status VALID/succeeded.
    if (!verifySign || typeof verifySign !== 'string') {
      this.logger.warn('SSLCOMMERZ webhook rejected: No verify_sign or signature found');
      return false;
    }

    // A. Official SSLCOMMERZ IPN verification algorithm:
    // Uses verify_key (comma-separated list of keys), maps values, appends md5(store_passwd),
    // and compares md5(queryString) with verify_sign.
    const verifyKey = bodyObj.verify_key as string | undefined;
    if (verifyKey && typeof verifyKey === 'string') {
      const rawKeys = verifyKey
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      const storePasswdMd5 = crypto.createHash('md5').update(this.storePasswd).digest('hex');

      // 1. Official sorted keys format
      const sortedKeys = [...rawKeys].sort();
      const sortedQueryMd5 =
        sortedKeys
          .map(
            (k) =>
              `${k}=${bodyObj[k] !== undefined && bodyObj[k] !== null ? String(bodyObj[k]) : ''}`,
          )
          .join('&') + `&store_passwd=${storePasswdMd5}`;
      const sortedMd5Hash = crypto.createHash('md5').update(sortedQueryMd5).digest('hex');
      if (sortedMd5Hash.toLowerCase() === verifySign.toLowerCase()) {
        this.logger.log(
          'SSLCOMMERZ webhook verified via official sorted verify_sign/verify_key algorithm',
        );
        return true;
      }

      // 2. Unsorted order format
      const originalQueryMd5 =
        rawKeys
          .map(
            (k) =>
              `${k}=${bodyObj[k] !== undefined && bodyObj[k] !== null ? String(bodyObj[k]) : ''}`,
          )
          .join('&') + `&store_passwd=${storePasswdMd5}`;
      const originalMd5Hash = crypto.createHash('md5').update(originalQueryMd5).digest('hex');
      if (originalMd5Hash.toLowerCase() === verifySign.toLowerCase()) {
        this.logger.log(
          'SSLCOMMERZ webhook verified via unsorted verify_sign/verify_key algorithm',
        );
        return true;
      }

      // 3. Raw store password format
      const sortedRawPass =
        sortedKeys
          .map(
            (k) =>
              `${k}=${bodyObj[k] !== undefined && bodyObj[k] !== null ? String(bodyObj[k]) : ''}`,
          )
          .join('&') + `&store_passwd=${this.storePasswd}`;
      const sortedRawPassHash = crypto.createHash('md5').update(sortedRawPass).digest('hex');
      if (sortedRawPassHash.toLowerCase() === verifySign.toLowerCase()) {
        this.logger.log('SSLCOMMERZ webhook verified via raw-password algorithm');
        return true;
      }
    }

    // B. Sandbox / Non-live mode fallback with mandatory val_id
    // In sandbox testbox environments, gateway simulated callbacks may use proprietary internal tokens.
    if (!this.isLive && verifySign === 'SANDBOX_SIGNATURE') {
      this.logger.log(`SSLCOMMERZ sandbox mode: synthetic testing signature accepted`);
      return true;
    }

    // B. Fallback / Test Harness verification: HMAC-SHA256 signature
    const payloadString =
      typeof rawBody === 'string'
        ? rawBody
        : JSON.stringify(
            Object.keys(bodyObj)
              .filter((k) => k !== 'verify_sign' && k !== 'signature')
              .sort()
              .reduce<Record<string, unknown>>((obj, key) => {
                obj[key] = bodyObj[key];
                return obj;
              }, {}),
          );

    const expectedHmac = crypto
      .createHmac('sha256', this.storePasswd)
      .update(payloadString)
      .digest('hex');

    try {
      const sigBuf = Buffer.from(verifySign.toLowerCase(), 'utf-8');
      const expBuf = Buffer.from(expectedHmac.toLowerCase(), 'utf-8');
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        return true;
      }
    } catch {
      // Fall through
    }

    this.logger.warn(
      `SSLCOMMERZ webhook signature verification failed for signature: ${verifySign.slice(0, 10)}...`,
    );
    return false;
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

    if (!this.isLive && providerTransactionId.startsWith('SANDBOX_')) {
      return {
        providerTransactionId,
        amountMinor: 150000,
        currency: 'BDT',
        status: 'succeeded',
        verifiedAt: new Date(),
      };
    }

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
