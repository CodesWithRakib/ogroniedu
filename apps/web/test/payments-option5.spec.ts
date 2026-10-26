import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PaymentReceipt } from '../src/features/payments/components/paymentReceipt';
import { CheckoutMethodPicker } from '../src/features/payments/components/checkoutMethodPicker';
import { CheckoutSummary } from '../src/features/payments/components/checkoutSummary';
import { CheckoutLedger } from '../src/features/payments/components/checkoutLedger';
import type {
  PaymentReceiptData,
  PaymentOrderDetails,
} from '../src/features/payments/types/payment-checkout.types';

describe('Option 5 — Tuition Fees, Escrow Checkout & Invoice Receipt Tests', () => {
  const mockReceipt: PaymentReceiptData = {
    receiptId: 'INV-2026-000001',
    invoiceId: 'f0000000-0000-4000-a000-000000000001',
    invoiceNumber: 'INV-2026-000001',
    orderId: 'ord-0000-0001',
    bookingId: '0301ea0c-a499-448f-90bf-ea0849b8b2fe',
    payerName: 'Tanvir Ahmed (Guardian)',
    tutorName: 'Farhan Ahmed',
    studentName: 'Abrar Ahmed',
    subjectName: 'Bangla (1st & 2nd Paper)',
    amountBdt: '500',
    amountMinor: 50000,
    currency: 'BDT',
    paymentMethod: 'SSLCOMMERZ',
    provider: 'sslcommerz',
    paidAt: '2026-10-24T16:46:35Z',
    status: 'succeeded',
  };

  const mockOrder: PaymentOrderDetails = {
    id: 'ord-test-001',
    bookingId: '0301ea0c-a499-448f-90bf-ea0849b8b2fe',
    payerName: 'Tanvir Ahmed (Guardian)',
    studentName: 'Abrar Ahmed',
    tutorName: 'Farhan Ahmed',
    subjectName: 'Bangla (1st & 2nd Paper)',
    amountMinor: 50000, // 500.00 BDT
    currency: 'BDT',
    status: 'pending',
    provider: 'sslcommerz',
    createdAt: '2026-10-25T12:00:00Z',
  };

  it('TC-PAY-001: should render PaymentReceipt with official invoice button and print button (bn)', () => {
    const html = renderToStaticMarkup(
      React.createElement(PaymentReceipt, {
        receipt: mockReceipt,
        locale: 'bn',
      }),
    );

    expect(html).toContain('INV-2026-000001');
    expect(html).toContain('Farhan Ahmed');
    expect(html).toContain('Bangla (1st &amp; 2nd Paper)');
    expect(html).toContain('৫০০');
    expect(html).toContain('SSLCOMMERZ');
    expect(html).toContain('data-testid="print-receipt-btn"');
    expect(html).toContain('data-testid="download-official-invoice-btn"');
    expect(html).toContain('অফিশিয়াল ইনভয়েস দেখুন / ডাউনলোড');
    expect(html).toContain('বাংলাদেশ ব্যাংক ও এসক্রো নীতিমালার অধীনে সুরক্ষিত');
  });

  it('TC-PAY-002: should render PaymentReceipt with English locale strings and invoice button', () => {
    const html = renderToStaticMarkup(
      React.createElement(PaymentReceipt, {
        receipt: mockReceipt,
        locale: 'en',
      }),
    );

    expect(html).toContain('INV-2026-000001');
    expect(html).toContain('500');
    expect(html).toContain('data-testid="download-official-invoice-btn"');
    expect(html).toContain('Official Invoice (HTML/PDF)');
    expect(html).toContain('Verified double-entry escrow transaction');
  });

  it('TC-PAY-003: should render CheckoutMethodPicker with SSLCOMMERZ, bKash and Nagad options', () => {
    const html = renderToStaticMarkup(
      React.createElement(CheckoutMethodPicker, {
        order: mockOrder,
        locale: 'bn',
        selectedGateway: 'sslcommerz',
        onSelectGateway: () => {},
        onPay: () => {},
        isProcessing: false,
        payError: null,
      }),
    );

    expect(html).toContain('data-testid="gateway-picker-sslcommerz"');
    expect(html).toContain('data-testid="gateway-picker-bkash"');
    expect(html).toContain('data-testid="gateway-picker-nagad"');
    expect(html).toContain('data-testid="pay-submit-btn"');
    expect(html).toContain('৫০০');
    expect(html).toContain('পরিশোধ করুন');
  });

  it('TC-PAY-004: should render CheckoutSummary with status and party details', () => {
    const html = renderToStaticMarkup(
      React.createElement(CheckoutSummary, {
        order: mockOrder,
        locale: 'bn',
      }),
    );

    expect(html).toContain('0301ea0c-a499-448f-90bf-ea0849b8b2fe');
    expect(html).toContain('Farhan Ahmed');
    expect(html).toContain('Abrar Ahmed');
    expect(html).toContain('৫০০');
  });

  it('TC-PAY-005: should render CheckoutLedger with 92% tutor and 8% platform breakdown', () => {
    const html = renderToStaticMarkup(
      React.createElement(CheckoutLedger, {
        order: mockOrder,
        locale: 'bn',
      }),
    );

    // 500 * 0.92 = 460
    expect(html).toContain('৪৬০');
    // 500 * 0.08 = 40
    expect(html).toContain('৪০');
  });
});
