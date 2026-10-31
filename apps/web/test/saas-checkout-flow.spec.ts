import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SaasCheckoutFlow } from '../src/features/payments/components/saas-checkout-flow';

describe('SaasCheckoutFlow Component Tests (Matching User 3-Step Reference)', () => {
  const defaultProps = {
    bookingId: 'book-7721-a490',
    orderId: 'ord-8839-42b1',
    amountMinor: 150000, // 1,500.00 BDT matching the reference image!
    currency: 'BDT',
    locale: 'en' as const,
    bookingDetails: {
      tutorName: 'Nusrat Jahan (BUET, CSE)',
      subjectName: 'Higher Mathematics & Physics Prep',
      educationLevel: 'HSC',
      sessionCount: 1,
      studentPhone: '01712345678',
    },
    isProcessing: false,
    errorText: null,
    onInitiatePayment: vi.fn(),
  };

  it('should instantiate and render Step 1 Checkout cleanly', () => {
    const html = renderToString(React.createElement(SaasCheckoutFlow, defaultProps));
    expect(html).toContain('Checkout');
    expect(html).toContain('Payment');
    expect(html).toContain('Confirmation');
    expect(html).toContain('Choose Payment Method');
    expect(html).toContain('bKash');
    expect(html).toContain('Nagad');
    expect(html).toContain('Rocket');
    expect(html).toContain('Card Payment');
    expect(html).toContain('Continue to Payment');
    expect(html).toContain('SSLCOMMERZ');
  });

  it('should support Bengali locale rendering', () => {
    const html = renderToString(
      React.createElement(SaasCheckoutFlow, {
        ...defaultProps,
        locale: 'bn',
      }),
    );
    expect(html).toContain('চেকআউট');
    expect(html).toContain('পেমেন্ট');
    expect(html).toContain('পেমেন্ট মাধ্যম বেছে নিন');
    expect(html).toContain('সর্বমোট প্রদেয়');
    expect(html).toContain('পেমেন্টে এগিয়ে যান');
  });

  it('should render Step 3 Confirmation with success indicator when verifiedSuccess is true', () => {
    const html = renderToString(
      React.createElement(SaasCheckoutFlow, {
        ...defaultProps,
        verifiedSuccess: true,
        transactionId: 'SSLC-20261016123456789',
      }),
    );
    expect(html).toContain('Payment Successful!');
    expect(html).toContain('SSLC-20261016123456789');
    expect(html).toContain('Go to Dashboard');
    expect(html).toContain('View Receipt');
  });
});

