import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmbeddedEasyCheckout } from '../src/features/payments/components/embedded-easy-checkout';
import { PaymentResultView } from '../src/features/payments/components/payment-result-view';

// Mock store service hooks for deterministic isolated testing
vi.mock('@/store/services/payments-api', () => ({
  useGetPaymentOrderStatusQuery: (orderId: string) => {
    if (orderId === 'ord-succeeded') {
      return {
        data: {
          data: {
            orderId: 'ord-succeeded',
            bookingId: 'book-1',
            status: 'succeeded',
            amountMinor: 100000,
            currency: 'BDT',
            verifiedAt: '2026-10-26T12:00:00Z',
            booking: {
              id: 'book-1',
              subjectName: 'Physics',
              tutorName: 'Nusrat Jahan',
              studentName: 'Zafir Rahman',
              rateMinor: 100000,
              status: 'confirmed',
            },
            receipt: {
              receiptId: 'REC-001',
              invoiceId: 'inv-1',
              invoiceNumber: 'INV-2026-000001',
              orderId: 'ord-succeeded',
              amountBdt: '1000.00',
              amountMinor: 100000,
              currency: 'BDT',
              status: 'succeeded',
              tutorName: 'Nusrat Jahan',
              subjectName: 'Physics',
            },
          },
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      };
    }

    if (orderId === 'ord-failed') {
      return {
        data: {
          data: {
            orderId: 'ord-failed',
            bookingId: 'book-1',
            status: 'failed',
            amountMinor: 100000,
            currency: 'BDT',
            failureReason: 'Transaction cancelled by customer',
          },
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      };
    }

    if (orderId === 'ord-cancelled') {
      return {
        data: {
          data: {
            orderId: 'ord-cancelled',
            bookingId: 'book-1',
            status: 'cancelled',
            amountMinor: 100000,
            currency: 'BDT',
          },
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      };
    }

    return {
      data: {
        data: {
          orderId: 'ord-pending',
          bookingId: 'book-1',
          status: 'pending',
          amountMinor: 100000,
          currency: 'BDT',
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  apiUrl: (path: string) => `http://localhost:4000${path}`,
}));

describe('SSLCOMMERZ Embedded Easy Checkout & Branded Result Suite', () => {
  it('renders EmbeddedEasyCheckout with official pay button, amount, and fallback', () => {
    const html = renderToStaticMarkup(
      React.createElement(EmbeddedEasyCheckout, {
        orderId: 'ord-test-1234',
        checkoutUrl: 'https://sandbox.sslcommerz.com/EasyCheckOut/testcde1234',
        amountMinor: 150000, // 1500.00 BDT
        locale: 'bn',
      }),
    );

    expect(html).toContain('data-testid="embedded-easy-checkout-container"');
    expect(html).toContain('data-testid="sslcommerz-embedded-pay-btn"');
    expect(html).toContain('data-testid="sslcommerz-fallback-pay-btn"');
    expect(html).toContain('১৫০০.০০');
    expect(html).toContain('এসএসএলকমার্জ');
    expect(html).toContain('Order #ord-test');
  });

  it('renders EmbeddedEasyCheckout with English locale correctly', () => {
    const html = renderToStaticMarkup(
      React.createElement(EmbeddedEasyCheckout, {
        orderId: 'ord-test-5678',
        checkoutUrl: 'https://sandbox.sslcommerz.com/EasyCheckOut/testcde5678',
        amountMinor: 200000, // 2000.00 BDT
        locale: 'en',
      }),
    );

    expect(html).toContain('SSLCOMMERZ Easy Checkout');
    expect(html).toContain('Pay ৳ 2000.00 Now');
    expect(html).toContain('128-bit SSL Encrypted Gateway');
    expect(html).toContain('Order #ord-test');
  });

  it('renders PaymentResultView in verified succeeded state with official invoice actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(PaymentResultView, {
        orderId: 'ord-succeeded',
        locale: 'bn',
        bookingId: 'book-1',
      }),
    );

    expect(html).toContain('data-testid="payment-result-view"');
    expect(html).toContain('পেমেন্ট সফল হয়েছে!');
    expect(html).toContain('যাচাইকৃত লেনদেন');
    expect(html).toContain('Nusrat Jahan');
    expect(html).toContain('Physics');
    expect(html).toContain('INV-2026-000001');
    expect(html).toContain('data-testid="result-download-invoice-btn"');
    expect(html).toContain('data-testid="result-print-btn"');
  });

  it('renders PaymentResultView in failed state with retry action', () => {
    const html = renderToStaticMarkup(
      React.createElement(PaymentResultView, {
        orderId: 'ord-failed',
        locale: 'en',
        bookingId: 'book-1',
      }),
    );

    expect(html).toContain('Payment Could Not Be Completed');
    expect(html).toContain('Transaction Failed');
    expect(html).toContain('Try Payment Again');
    expect(html).toContain('Contact Support');
    expect(html).toContain('Transaction cancelled by customer');
  });

  it('renders PaymentResultView in cancelled state with return to checkout', () => {
    const html = renderToStaticMarkup(
      React.createElement(PaymentResultView, {
        orderId: 'ord-cancelled',
        locale: 'bn',
        bookingId: 'book-1',
      }),
    );

    expect(html).toContain('পেমেন্ট বাতিল করা হয়েছে');
    expect(html).toContain('চেকআউটে ফিরুন');
  });

  it('renders PaymentResultView in pending state with verification indicator and refresh action', () => {
    const html = renderToStaticMarkup(
      React.createElement(PaymentResultView, {
        orderId: 'ord-pending',
        locale: 'en',
        bookingId: 'book-1',
      }),
    );

    expect(html).toContain('Verifying Your Payment…');
    expect(html).toContain('data-testid="result-check-status-btn"');
    expect(html).toContain('Check Status Now');
  });
});
