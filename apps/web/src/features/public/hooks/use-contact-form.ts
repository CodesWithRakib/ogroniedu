'use client';

import React from 'react';
import { useSubmitSupportTicketMutation } from '@/store/services/support-api';
import { normalizeUnknownError } from '@/lib/api-error';
import type { Locale } from '@/lib/i18n';

/**
 * Contact form: validates locally, submits to POST /support/tickets,
 * surfaces backend validation/rate-limit errors. Success yields a
 * ticket reference id (never fabricated — only set from the response).
 */
export function useContactForm(locale: Locale) {
  const [submitted, setSubmitted] = React.useState(false);
  const [ticketRef, setTicketRef] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitTicket, { isLoading: isSubmitting }] = useSubmitSupportTicketMutation();
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    category: 'general',
    message: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message || isSubmitting) return;
    setSubmitError(null);
    try {
      const res = await submitTicket({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        category: formData.category as
          'general' | 'tutorHelp' | 'tutorVerification' | 'paymentSupport' | 'safetyIncident',
        message: formData.message.trim(),
      }).unwrap();
      setTicketRef(res.data.id.slice(0, 8).toUpperCase());
      setSubmitted(true);
    } catch (err) {
      setSubmitError(normalizeUnknownError(err, locale).message);
    }
  }

  function handleReset() {
    setSubmitted(false);
    setTicketRef(null);
    setSubmitError(null);
    setFormData({ name: '', email: '', phone: '', category: 'general', message: '' });
  }

  function updateField<K extends keyof typeof formData>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  return {
    submitted,
    ticketRef,
    submitError,
    isSubmitting,
    formData,
    handleSubmit,
    handleReset,
    updateField,
  };
}
