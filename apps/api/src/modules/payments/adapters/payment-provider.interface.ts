export interface CheckoutSessionResult {
  checkoutUrl: string;
  providerOrderId: string;
}

export interface ProviderTransactionResult {
  providerTransactionId: string;
  amountMinor: number;
  currency: string;
  status: 'succeeded' | 'failed';
  verifiedAt: Date;
}

export interface ProviderRefundResult {
  providerRefundId: string;
  amountMinor: number;
  status: 'succeeded' | 'failed';
}

export interface PaymentProviderAdapter {
  readonly providerName: string;

  createCheckoutSession(
    orderId: string,
    amountMinor: number,
    currency: string,
    payerPhone?: string,
  ): Promise<CheckoutSessionResult>;

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Record<string, unknown>,
  ): boolean;

  queryTransaction(providerTransactionId: string): Promise<ProviderTransactionResult>;

  processRefund(
    providerTransactionId: string,
    amountMinor: number,
    reason: string,
  ): Promise<ProviderRefundResult>;
}
