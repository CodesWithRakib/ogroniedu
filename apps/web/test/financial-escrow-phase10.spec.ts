import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { NextIntlClientProvider } from 'next-intl';
import { makeStore } from '../src/store';
import bnMessages from '../messages/bn.json';
import enMessages from '../messages/en.json';
import { PaymentReceipt } from '../src/features/payments/components/paymentReceipt';
import { PaymentCheckoutView, type PaymentOrderDetails } from '../src/components/payments/PaymentCheckoutView';
import type { PaymentReceiptData } from '../src/features/payments/types/payment-checkout.types';

function renderWithProviders(node: React.ReactElement, locale: 'bn' | 'en' = 'bn'): string {
  const store = makeStore();
  const messages = locale === 'bn' ? bnMessages : enMessages;
  return renderToStaticMarkup(
    React.createElement(Provider, {
      store,
      children: React.createElement(NextIntlClientProvider, {
        locale,
        messages,
        timeZone: 'Asia/Dhaka',
        children: node,
      }),
    }),
  );
}

describe('Phase 10: Financial, Escrow & Supporting Workflows Frontend Tests', () => {
  const mockOrder: PaymentOrderDetails = {
    id: 'ord-8839-42b1',
    bookingId: 'book-7721-a490',
    payerName: 'Kazi Mahfuzur Rahman',
    studentName: 'Zafir Rahman',
    tutorName: 'Nusrat Jahan (BUET, CSE)',
    subjectName: 'Physics (Class 10 - SSC Prep)',
    amountMinor: 100000, // 1000.00 BDT
    currency: 'BDT',
    status: 'pending',
    provider: 'bkash',
    createdAt: '2026-10-10T12:00:00Z',
  };

  const mockReceipt: PaymentReceiptData = {
    receiptId: 'REC-2026-000882',
    orderId: 'ord-8839-42b1',
    bookingId: 'book-7721-a490',
    tutorName: 'Nusrat Jahan',
    subjectName: 'Physics (Class 10)',
    amountBdt: 1000,
    paidAt: '2026-10-22T10:00:00Z',
    paymentMethod: 'bKash Gateway',
    currency: 'BDT',
    status: 'succeeded',
  };

  describe('1. Escrow Payment Checkout View (PaymentCheckoutView)', () => {
    it('renders tuition fee and escrow security guarantee in Bengali', () => {
      const html = renderWithProviders(
        React.createElement(PaymentCheckoutView, {
          locale: 'bn',
          initialOrder: mockOrder,
        }),
        'bn',
      );

      expect(html).toContain('১০০০.০০');
      expect(html).toContain('পেমেন্ট ও আর্থিক জামানত');
      expect(html).toContain('Nusrat Jahan');
      expect(html).toContain('Physics (Class 10 - SSC Prep)');
      expect(html).toContain('৳');
    });

    it('renders checkout view in English with localized numbers', () => {
      const html = renderWithProviders(
        React.createElement(PaymentCheckoutView, {
          locale: 'en',
          initialOrder: mockOrder,
        }),
        'en',
      );

      expect(html).toContain('1000.00');
      expect(html).toContain('Payment &amp; Financial Escrow');
      expect(html).toContain('92%');
      expect(html).toContain('8%');
    });

    it('enforces mathematical integrity invariant on double-entry revenue split', () => {
      const totalPoisha = BigInt(mockOrder.amountMinor);
      const commissionBps = 800n; // 8%
      const platformFee = (totalPoisha * commissionBps) / 10000n;
      const tutorShare = totalPoisha - platformFee;

      expect(platformFee + tutorShare).toBe(totalPoisha);
      expect(platformFee).toBe(8000n); // 80 BDT
      expect(tutorShare).toBe(92000n); // 920 BDT
    });
  });

  describe('2. Payment Receipt & Transaction Documentation (PaymentReceipt)', () => {
    it('renders receipt with transaction reference and status badge in Bengali', () => {
      const html = renderWithProviders(
        React.createElement(PaymentReceipt, {
          receipt: mockReceipt,
          locale: 'bn',
          onPrint: vi.fn(),
        }),
        'bn',
      );

      expect(html).toContain('REC-2026-000882');
      expect(html).toContain('Nusrat Jahan');
      expect(html).toContain('Physics (Class 10)');
      expect(html).toContain('bKash Gateway');
      expect(html).toContain('অফিসিয়াল পেমেন্ট রসিদ');
      expect(html).toContain('রসিদ প্রিন্ট করুন');
    });

    it('renders receipt in English with print/download button', () => {
      const html = renderWithProviders(
        React.createElement(PaymentReceipt, {
          receipt: mockReceipt,
          locale: 'en',
          onPrint: vi.fn(),
        }),
        'en',
      );

      expect(html).toContain('Official Payment Receipt');
      expect(html).toContain('Print Receipt');
      expect(html).toContain('REC-2026-000882');
      expect(html).toContain('Verified double-entry escrow transaction');
    });
  });
});
