'use client';

import React from 'react';
import type { Locale } from '@/lib/i18n';
import { normalizeUnknownError } from '@/lib/api-error';
import { fieldErrorsOf } from '@/lib/api/parse';
import type {
  PaymentOrderDetails,
  PaymentReceiptData,
  PaymentProvider,
} from '../types/payment-checkout.types';

export interface UseCheckoutFlowOptions {
  locale: Locale;
  initialOrder?: PaymentOrderDetails;
  receiptProp?: PaymentReceiptData | null;
  onPay?: (provider: PaymentProvider) => Promise<PaymentReceiptData>;
  onSimulateWebhook?: (orderId: string, provider: string) => Promise<void>;
}

function fieldErrorsFrom(err: unknown): Record<string, string> {
  if (typeof err === 'object' && err !== null && 'data' in err) {
    return fieldErrorsOf(err.data);
  }
  return fieldErrorsOf(err);
}

function displayMessage(err: unknown, locale: Locale): string {
  if (typeof err === 'string') {
    return err.trim() ? err : normalizeUnknownError(err, locale).message;
  }
  return normalizeUnknownError(err, locale).message;
}

/** Checkout interaction state: gateway pick, pay dispatch, receipt, errors. */
export function useCheckoutFlow({
  locale,
  initialOrder,
  receiptProp,
  onPay,
  onSimulateWebhook,
}: UseCheckoutFlowOptions) {
  const [order, setOrder] = React.useState<PaymentOrderDetails | null>(initialOrder ?? null);
  const [selectedGateway, setSelectedGateway] = React.useState<PaymentProvider>(
    initialOrder?.provider ?? 'sslcommerz',
  );
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [receipt, setReceipt] = React.useState<PaymentReceiptData | null>(receiptProp ?? null);
  const [payError, setPayError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setOrder(initialOrder ?? null);
  }, [initialOrder]);

  React.useEffect(() => {
    setReceipt(receiptProp ?? null);
  }, [receiptProp]);

  const handlePay = React.useCallback(async () => {
    if (!order) return;
    setIsProcessing(true);
    setPayError(null);
    setFieldErrors({});
    try {
      if (onPay) {
        const serverReceipt = await onPay(selectedGateway);
        setReceipt(serverReceipt);
        setOrder({
          ...order,
          status: 'succeeded',
          provider: selectedGateway,
          paidAt: serverReceipt.paidAt,
        });
      } else if (onSimulateWebhook) {
        await onSimulateWebhook(order.id, selectedGateway);
      } else {
        throw new Error(
          locale === 'bn' ? 'পেমেন্ট এখন উপলব্ধ নয়।' : 'Payment is unavailable right now.',
        );
      }
    } catch (err: unknown) {
      setPayError(displayMessage(err, locale));
      setFieldErrors(fieldErrorsFrom(err));
    } finally {
      setIsProcessing(false);
    }
  }, [locale, onPay, onSimulateWebhook, order, selectedGateway]);

  const handlePrint = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  return {
    order,
    selectedGateway,
    setSelectedGateway,
    isProcessing,
    receipt,
    payError,
    fieldErrors,
    handlePay,
    handlePrint,
  };
}

export type UseCheckoutFlowReturn = ReturnType<typeof useCheckoutFlow>;
