export interface CheckoutSessionResult {
  checkoutUrl: string;
  providerOrderId: string;
  sessionKey?: string;
  gatewayPageUrl?: string;
  storeLogo?: string;
}

export interface ProviderTransactionResult {
  providerTransactionId: string;
  amountMinor: number;
  currency: string;
  status: 'succeeded' | 'failed';
  verifiedAt: Date;
}

export interface ProviderRefundResult {
  providerRefundId: string | null;
  amountMinor: number;
  /**
   * `unsupported` means the merchant refund contract is not provisioned in this
   * environment. It is never success: the caller must complete the transfer
   * externally and record a real reference through the audited manual path.
   */
  status: 'succeeded' | 'failed' | 'unsupported';
  failureReason?: string;
}

/** Provider-agnostic, validated webhook payload. */
export interface NormalizedWebhookEvent {
  /** Stable provider event identifier used for durable dedupe. */
  eventId: string;
  eventType: string;
  /** Our payment order id. */
  orderReference: string;
  providerTransactionId: string;
  amountMinor: string;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  rawStatus: string;
}

export interface PaymentProviderAdapter {
  readonly providerName: string;

  createCheckoutSession(
    orderId: string,
    amountMinor: number,
    currency: string,
    payerPhone?: string,
    metadata?: Record<string, unknown>,
  ): Promise<CheckoutSessionResult>;

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Record<string, unknown>,
  ): boolean;

  /** Maps a provider-specific payload onto the normalized contract. */
  normalizeWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Record<string, unknown>,
  ): NormalizedWebhookEvent;

  queryTransaction(providerTransactionId: string): Promise<ProviderTransactionResult>;

  processRefund(
    providerTransactionId: string,
    amountMinor: number,
    reason: string,
  ): Promise<ProviderRefundResult>;
}
