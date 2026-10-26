'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  useGetPaymentOrderStatusQuery,
  type PaymentOrderStatusResponse,
} from '@/store/services/payments-api';

export interface UsePaymentStatusOptions {
  orderId?: string | null;
  enabled?: boolean;
  maxAttempts?: number;
  initialIntervalMs?: number;
  maxIntervalMs?: number;
  onSuccess?: (order: PaymentOrderStatusResponse) => void;
  onTerminalState?: (order: PaymentOrderStatusResponse) => void;
}

const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'expired']);

/**
 * Authoritative payment status polling hook.
 *
 * Implements bounded polling with backoff:
 * - Polls backend independently for the authoritative payment order status.
 * - Stops immediately when a terminal state is reached (succeeded, failed, cancelled, expired).
 * - Caps polling at maxAttempts (default: 15) to prevent uncontrolled background requests.
 * - Cleans up timers on unmount or orderId change.
 */
export function usePaymentStatus({
  orderId,
  enabled = true,
  maxAttempts = 15,
  initialIntervalMs = 2500,
  maxIntervalMs = 8000,
  onSuccess,
  onTerminalState,
}: UsePaymentStatusOptions) {
  const [attempts, setAttempts] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const queryEnabled = Boolean(orderId && enabled);
  const {
    data: envelope,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetPaymentOrderStatusQuery(orderId ?? '', {
    skip: !queryEnabled,
    refetchOnMountOrArgChange: true,
  });

  const order = envelope?.data ?? null;
  const status = order?.status ?? null;
  const isTerminal = Boolean(status && TERMINAL_STATUSES.has(status));
  const isSucceeded = status === 'succeeded';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';
  const isPending = Boolean(status && (status === 'pending' || status === 'created'));

  // Callback triggers on status change
  useEffect(() => {
    if (!order) return;
    if (isSucceeded && onSuccess) {
      onSuccess(order);
    }
    if (isTerminal && onTerminalState) {
      onTerminalState(order);
    }
  }, [order, isSucceeded, isTerminal, onSuccess, onTerminalState]);

  // Bounded polling schedule
  useEffect(() => {
    if (!queryEnabled || isTerminal || isTimedOut) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (attempts >= maxAttempts) {
      setIsTimedOut(true);
      return;
    }

    // Exponential backoff with jitter up to maxIntervalMs
    const nextInterval = Math.min(
      initialIntervalMs * Math.pow(1.3, attempts),
      maxIntervalMs,
    );

    timerRef.current = setTimeout(() => {
      setAttempts((prev) => prev + 1);
      void refetch();
    }, nextInterval);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    queryEnabled,
    isTerminal,
    isTimedOut,
    attempts,
    maxAttempts,
    initialIntervalMs,
    maxIntervalMs,
    refetch,
  ]);

  const restartPolling = useCallback(() => {
    setAttempts(0);
    setIsTimedOut(false);
    void refetch();
  }, [refetch]);

  return {
    order,
    status,
    isLoading: isLoading || (queryEnabled && !order && !error),
    isFetching,
    isTerminal,
    isSucceeded,
    isFailed,
    isCancelled,
    isPending,
    isTimedOut,
    attempts,
    error,
    refetch: restartPolling,
  };
}
