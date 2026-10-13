'use client';

import React from 'react';

/**
 * Shared submit state machine for the trust modals: pending flag, error and
 * success messages, and an optional delayed close on success.
 */
export function useModalSubmit<T>(opts: {
  successMessage: string;
  fallbackError: string;
  closeDelayMs: number;
  onClose: () => void;
  onSuccess?: (result: T) => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function run(action: () => Promise<T>): Promise<void> {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await action();
      setSuccessMsg(opts.successMessage);
      opts.onSuccess?.(result);
      timer.current = setTimeout(opts.onClose, opts.closeDelayMs);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : opts.fallbackError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, errorMsg, successMsg, setErrorMsg, run };
}
