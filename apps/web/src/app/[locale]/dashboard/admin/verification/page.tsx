'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';

export default function AdminVerificationRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = resolved.locale === 'en' ? 'en' : 'bn';
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${locale}/dashboard/admin/users/tutors?tab=kyc`);
  }, [locale, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner />
    </div>
  );
}
