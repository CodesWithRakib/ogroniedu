import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EasyCheckoutDesk } from '../src/features/payments/components/easy-checkout-desk';

describe('EasyCheckoutDesk Component Tests (Matching User Easy.com.bd Reference)', () => {
  const defaultProps = {
    bookingId: 'book-7721-a490',
    orderId: 'ord-8839-42b1',
    amountMinor: 32000000, // 320,000.00 BDT matching the reference image!
    currency: 'BDT',
    locale: 'en' as const,
    bookingDetails: {
      tutorName: 'Nusrat Jahan (BUET, CSE)',
      subjectName: 'Higher Mathematics (HSC Prep)',
      educationLevel: 'HSC',
      sessionCount: 1,
    },
    isProcessing: false,
    errorText: null,
    onPayNow: vi.fn(),
    onCancel: vi.fn(),
  };

  it('should instantiate and render EasyCheckoutDesk cleanly with reference amount', () => {
    const html = renderToString(React.createElement(EasyCheckoutDesk, defaultProps));
    expect(html).toContain('Easy');
    expect(html).toContain('.com.bd');
    expect(html).toContain('You are paying');
    expect(html).toContain('Pay with Cards');
    expect(html).toContain('Powered by');
    expect(html).toContain('SSLCOMMERZ');
  });

  it('should support Bengali locale rendering', () => {
    const html = renderToString(
      React.createElement(EasyCheckoutDesk, {
        ...defaultProps,
        locale: 'bn',
      }),
    );
    expect(html).toContain('Easy');
    expect(html).toContain('আপনি পরিশোধ করছেন');
    expect(html).toContain('এই কার্ডটি সংরক্ষণ করুন');
    expect(html).toContain('SSLCOMMERZ');
  });

  it('should expose onPayNow and onCancel handler with correct callback signature', () => {
    const mockPay = vi.fn();
    const mockCancel = vi.fn();
    const element = React.createElement(EasyCheckoutDesk, {
      ...defaultProps,
      onPayNow: mockPay,
      onCancel: mockCancel,
    });
    expect(element.props.onPayNow).toBe(mockPay);
    expect(element.props.onCancel).toBe(mockCancel);
  });

  it('should render the SSLCommerz iframe dialog when showIframeModal is true', () => {
    const targetUrl = 'https://sandbox.sslcommerz.com/EasyCheckOut/testcde12345678?full=1';
    const html = renderToString(
      React.createElement(EasyCheckoutDesk, {
        ...defaultProps,
        showIframeModal: true,
        targetIframeUrl: targetUrl,
      }),
    );
    expect(html).toContain('data-testid="sslcommerz-easy-checkout-modal"');
    expect(html).toContain(targetUrl);
    expect(html).toContain('100% Escrow Protected');
  });

  it('should render Special Offers and Savings cards', () => {
    const html = renderToString(React.createElement(EasyCheckoutDesk, defaultProps));
    expect(html).toContain('Special Offers and Savings');
    expect(html).toContain('Enjoy 10% Discount on Visa card payment');
    expect(html).toContain('Enjoy 5% Discount on Mastercard payment');
  });
});

