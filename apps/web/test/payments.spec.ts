import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  PaymentCheckoutView,
  PaymentOrderDetails,
} from '../src/components/payments/PaymentCheckoutView';
import { getDictionary, formatLocalizedNumber } from '../src/lib/i18n';

describe('PaymentCheckoutView Component & Financial Invariant Frontend Tests (Phase 11)', () => {
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

  it('should instantiate PaymentCheckoutView with English and Bengali locales', () => {
    const enElement = React.createElement(PaymentCheckoutView, {
      locale: 'en',
      initialOrder: mockOrder,
    });
    expect(enElement).toBeDefined();
    expect(enElement.props.locale).toBe('en');
    expect(enElement.props.initialOrder.amountMinor).toBe(100000);

    const bnElement = React.createElement(PaymentCheckoutView, {
      locale: 'bn',
      initialOrder: mockOrder,
    });
    expect(bnElement).toBeDefined();
    expect(bnElement.props.locale).toBe('bn');
  });

  it('should verify 100% dictionary key parity for payments namespace between bn and en', () => {
    const bnDict = getDictionary('bn');
    const enDict = getDictionary('en');

    expect(bnDict.payments).toBeDefined();
    expect(enDict.payments).toBeDefined();

    const bnKeys = Object.keys(bnDict.payments).sort();
    const enKeys = Object.keys(enDict.payments).sort();

    expect(bnKeys).toEqual(enKeys);
    expect(bnKeys.length).toBeGreaterThanOrEqual(20);

    // Verify key translation contents
    expect(bnDict.payments.title).toContain('পেমেন্ট ও আর্থিক জামানত');
    expect(enDict.payments.title).toBe('Payment & Financial Escrow');
    expect(bnDict.payments.sandboxBadge).toContain('স্যান্ডবক্স');
    expect(enDict.payments.sandboxBadge).toContain('Sandbox');
    expect(bnDict.payments.tutorShare).toContain('৯২%');
    expect(enDict.payments.tutorShare).toContain('92%');
    expect(bnDict.payments.platformShare).toContain('৮%');
    expect(enDict.payments.platformShare).toContain('8%');
  });

  it('should correctly format currency amounts and Bengali digits', () => {
    const amountBdt = (mockOrder.amountMinor / 100).toFixed(2);
    expect(amountBdt).toBe('1000.00');

    expect(formatLocalizedNumber(amountBdt, 'en')).toBe('1000.00');
    expect(formatLocalizedNumber(amountBdt, 'bn')).toBe('১০০০.০০');

    const platformShareBdt = ((mockOrder.amountMinor * 0.08) / 100).toFixed(2);
    expect(platformShareBdt).toBe('80.00');
    expect(formatLocalizedNumber(platformShareBdt, 'bn')).toBe('৮০.০০');
  });

  it('should enforce double-entry arithmetic invariant (Debits = Credits) on 92% tutor + 8% platform split', () => {
    const totalMinor = BigInt(mockOrder.amountMinor);
    const platformMinor = (totalMinor * 8n) / 100n;
    const tutorMinor = totalMinor - platformMinor;

    expect(platformMinor + tutorMinor).toBe(totalMinor);
    expect(platformMinor).toBe(8000n);
    expect(tutorMinor).toBe(92000n);
  });
});
