'use client';

import React, { use } from 'react';
import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { PaymentCheckoutView } from '@/components/payments/PaymentCheckoutView';
import { type Locale } from '@/lib/i18n';

interface PaymentsPageProps {
  params: Promise<{ locale: string }>;
}

export default function PaymentsPage({ params }: PaymentsPageProps) {
  const resolvedParams = use(params);
  const locale = (resolvedParams.locale === 'en' ? 'en' : 'bn') as Locale;

  const sampleOrder = {
    id: 'ord-8839-42b1',
    bookingId: 'book-7721-a490',
    payerName: 'Kazi Mahfuzur Rahman',
    studentName: 'Zafir Rahman',
    tutorName: 'Nusrat Jahan (BUET, CSE)',
    subjectName: 'Physics (Class 10 - SSC Prep)',
    amountMinor: 100000, // 1000.00 BDT
    currency: 'BDT',
    status: 'pending' as const,
    provider: 'bkash' as const,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar locale={locale} />
      <main className="flex-1 py-10">
        <PaymentCheckoutView locale={locale} initialOrder={sampleOrder} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
