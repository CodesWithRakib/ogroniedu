'use client';

import { use } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { ConversationsInboxView } from '@/features/messaging';
import type { Locale } from '@/lib/i18n';

export default function AdminMessagesRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const isBn = locale === 'bn';

  return (
    <AdminLayout
      locale={locale}
      title={
        isBn ? 'মাস্টার মেসেজিং ও সেফগার্ড মনিটরিং' : 'Omniscient Messaging & Safeguard Monitor'
      }
      subtitle={
        isBn
          ? 'শিক্ষার্থী, শিক্ষক ও অভিভাবকদের মধ্যকার সমস্ত রিয়েল-টাইম বার্তালাপ ও অফ-প্ল্যাটফর্ম যোগাযোগের চেষ্টা লাইভ পর্যবেক্ষণ করুন'
          : 'Live supervision of real-time participant communications and anti-circumvention safeguard violations'
      }
    >
      <ConversationsInboxView locale={locale} />
    </AdminLayout>
  );
}
